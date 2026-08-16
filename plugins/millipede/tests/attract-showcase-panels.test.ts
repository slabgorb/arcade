// tests/attract-showcase-panels.test.ts
//
// Story ml11-2 — RED phase (TEA). The attract ENEMY-SHOWCASE draws each creature
// sprite onto a solid BLACK per-cell panel, matching attract-mame-reference.png.
// Deferred from ml9-3 (its Delivery Finding): the black-boxes decision is ALREADY
// PINNED in ml9-3's Design Deviations — this story IMPLEMENTS it, no re-decision.
//
// GROUND TRUTH (SM-verified at develop=734ecf3f): renderShowcase (main.ts:195)
// fills the whole screen with SHOWCASE_BACKGROUND (blue), prints the ml9-3 text
// stamps (white HIGH SCORES + red creature labels), then blits each creature
// sprite via drawSpritePx — with NO black rectangle behind any cell. The fix is a
// black rect per showcase cell, drawn inside the showcaseSprites() loop BEFORE the
// sprite blit, so the creature sits ON a black panel, not on the blue background.
//
// ─── WHY BEHAVIOURAL, NOT A SOURCE GREP (lang-review #15/#25) ─────────────────
// main.ts already calls fillRect (the blue background) and sets fillStyle, so a
// grep of the source for "fillRect"/"#000" is satisfied by code that predates this
// story and cannot tell a per-cell panel from the full-screen fill, nor prove the
// panel lands BEHIND the sprite. These tests BOOT the real shell
// (helpers/boot-shell.ts), drive attract into the showcase sub-window, and read
// the ACTUAL draw calls the renderer emitted onto the logical backbuffer: the
// fill COLOUR and the Z-ORDER asserted are the ones that landed, never re-derived.
//
// ─── WHAT GREEN (Dev) MUST SHIP ──────────────────────────────────────────────
//   src/main.ts renderShowcase — before blitting each showcase sprite, draw a
//   solid BLACK rect (a per-creature panel) covering that cell. The exact panel
//   SIZE / placement is the human VISUAL PLAYTEST (AC3) against
//   sprint/planning/ml9-playthrough-refs/attract-mame-reference.png; these tests
//   pin the checkable core — a black, non-full-screen panel behind EACH of the
//   eight showcase creature cells, drawn before its sprite, steady across frames,
//   with the blue background and the ml9-3 text stamps unregressed.

import { describe, it, expect, beforeAll } from 'vitest'
import {
  bootMillipedeShell,
  type DrawRecord,
  type DrawFill,
  type ShellHarness,
} from './helpers/boot-shell'
import { showcaseSprites, type ShowcaseSprite } from '../src/core/attract-showcase'

// The attract cycle (main.ts:184-185): the DEMO shows first, then the showcase for
// the last SHOWCASE_FRAMES of every ATTRACT_CYCLE_FRAMES window.
const ATTRACT_CYCLE_FRAMES = 720
const SHOWCASE_FRAMES = 300
const SHOWCASE_START = ATTRACT_CYCLE_FRAMES - SHOWCASE_FRAMES // 420

const LOGICAL_W = 240
const LOGICAL_H = 256

// A showcase sprite is drawn by drawSpritePx as TWO 8x8 stamps (top at x, bottom
// at x+8), so its footprint is 16 wide x 8 tall (main.ts:169-171, 208-210).
const SPRITE_W = 16
const SPRITE_H = 8

/** The logical-screen top-left of a showcase creature's sprite (main.ts:209). */
function cellXY(sprite: ShowcaseSprite): [number, number] {
  return [sprite.col * 8, (0x1f - sprite.row) * 8 - 18]
}

/** Parse a canvas fillStyle into [r,g,b], covering the forms the shell emits:
 *  `rgb(r, g, b)` (decodeColourByte's output, main.ts:197), `#000`/`#000000`
 *  (the entry/default black, main.ts:223,230), and the named `black`. Returns
 *  null for anything else so an unexpected style is never silently read as black. */
function parseRgb(style: string): [number, number, number] | null {
  const s = style.trim().toLowerCase()
  const rgb = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
  const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/)
  if (hex) {
    const h = hex[1]
    if (h.length === 3) {
      return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)]
    }
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
  }
  if (s === 'black') return [0, 0, 0]
  return null
}

const isBlack = (style: string): boolean => {
  const c = parseRgb(style)
  return c !== null && c[0] === 0 && c[1] === 0 && c[2] === 0
}
const isBlue = (style: string): boolean => {
  const c = parseRgb(style)
  return c !== null && c[0] === 0 && c[1] === 0 && c[2] === 255
}

/** The full-screen background fill (main.ts:198) — never a per-cell panel. */
const isFullScreen = (f: DrawFill): boolean =>
  f.x <= 0 && f.y <= 0 && f.w >= LOGICAL_W && f.h >= LOGICAL_H

/** Does a recorded rect overlap the box (x0,y0,w0,h0)? */
function overlaps(f: DrawFill, x0: number, y0: number, w0: number, h0: number): boolean {
  return f.x < x0 + w0 && f.x + f.w > x0 && f.y < y0 + h0 && f.y + f.h > y0
}

/**
 * Drive the booted shell from attract into the showcase sub-window WITHOUT emitting
 * any gesture (so the cabinet never leaves attract). Each frame() folds up to
 * MAX_CATCHUP_STEPS (5) fixed 60 Hz steps (frame-clock.ts), so ~90 frames reach
 * frame 420. The first frame() sets no delta (lastTs starts null → 0 steps), so we
 * PRIME once before reading sim(). Returns the next timestamp to continue from.
 */
async function driveToShowcase(shell: ShellHarness, startTs: number): Promise<number> {
  let ts = startTs
  ts += 100
  shell.frame(ts) // prime: establishes lastTs; elapsed 0 → 0 steps
  for (let guard = 0; guard <= 2000; guard++) {
    ts += 100
    shell.frame(ts) // ~5 fixed steps each
    const s = shell.sim()
    const inCycle = s.frame % ATTRACT_CYCLE_FRAMES
    // Break comfortably inside the window (margin on both ends) so the ONE extra
    // frame the caller renders after this is still a showcase frame.
    if (s.phase === 'attract' && inCycle >= SHOWCASE_START + 15 && inCycle <= ATTRACT_CYCLE_FRAMES - 30) {
      return ts
    }
  }
  throw new Error('never reached the showcase sub-window within 2000 frames')
}

/** The black, non-full-screen fills recorded in one frame's draws, as a stable key. */
function blackPanels(draws: readonly DrawRecord[]): string[] {
  return draws
    .filter((r): r is DrawFill => r.kind === 'fillRect' && !isFullScreen(r) && isBlack(r.style))
    .map((r) => `${r.x},${r.y},${r.w},${r.h}`)
    .sort()
}

// main.ts is a singleton module with module-scope side effects (mountCanvas, the
// first requestAnimationFrame), so it can be BOOTED ONCE per test file — a second
// bootMillipedeShell() gets the cached module and a dead rAF loop. So we boot once
// here and capture the TWO consecutive showcase frames every group needs.
let showcaseDraws: readonly DrawRecord[]
let showcaseDrawsNext: readonly DrawRecord[]
let capturedFrame: number

/** Capture exactly one render frame's worth of logical draws. */
function captureFrame(shell: ShellHarness, ts: number): readonly DrawRecord[] {
  const before = shell.draws('logical').length
  shell.frame(ts)
  return shell.draws('logical').slice(before)
}

beforeAll(async () => {
  const shell = await bootMillipedeShell()
  let ts = await driveToShowcase(shell, 0)
  // The break-frame already rendered a showcase frame; capture two FRESH ones
  // cleanly so each slice holds exactly one renderShowcase() call's draws. Both
  // are still inside the window (driveToShowcase leaves a >=30-frame upper margin).
  ts += 100
  showcaseDraws = captureFrame(shell, ts)
  capturedFrame = shell.sim().frame
  ts += 100
  showcaseDrawsNext = captureFrame(shell, ts)
})

describe('ml11-2 — drive precondition (the captured frame really is the showcase)', () => {
  it('captured a non-empty showcase frame (frame % 720 in the last 300)', () => {
    expect(capturedFrame % ATTRACT_CYCLE_FRAMES).toBeGreaterThanOrEqual(SHOWCASE_START)
    expect(showcaseDraws.length, 'renderShowcase painted nothing').toBeGreaterThan(0)
  })

  it('showcaseSprites() yields the eight MOBJ creatures (GROWTH/DDT BOMB have no pic)', () => {
    // A population floor (lang-review #19): if this ever drops below 8 the per-cell
    // loops below would silently cover fewer creatures than the reference shows.
    expect(showcaseSprites().length).toBe(8)
  })
})

describe('ml11-2 AC1 — a black per-cell panel behind every creature, before its sprite', () => {
  for (const sprite of showcaseSprites()) {
    const [x, y] = cellXY(sprite)
    it(`draws a black, non-full-screen panel behind the cell at (${x}, ${y}) before its sprite blit`, () => {
      // Locate the creature: drawSpritePx blits two 8x8 stamps at (x,y) and (x+8,y).
      const spriteBlitIdx = showcaseDraws.findIndex(
        (r) => r.kind === 'blit' && r.y === y && (r.x === x || r.x === x + 8) && r.w === 8 && r.h === 8,
      )
      expect(
        spriteBlitIdx,
        `no sprite blit at the showcase cell (${x}, ${y}) — the creature never rendered, so the panel check cannot run`,
      ).toBeGreaterThanOrEqual(0)

      // A qualifying panel: a black, non-full-screen fill that overlaps the sprite
      // footprint AND was drawn BEFORE the sprite (earlier index = painted behind).
      const panel = showcaseDraws.find(
        (r, i): r is DrawFill =>
          r.kind === 'fillRect' &&
          i < spriteBlitIdx &&
          !isFullScreen(r) &&
          isBlack(r.style) &&
          overlaps(r, x, y, SPRITE_W, SPRITE_H),
      )
      expect(
        panel,
        `no black per-cell panel behind (${x}, ${y}) before its sprite — renderShowcase blits the ` +
          `creature straight onto the blue background (ml11-2 is unshipped)`,
      ).toBeDefined()
    })
  }
})

describe('ml11-2 AC2 — no regression to ml9-3 (these stay green through the change)', () => {
  it('still fills the whole screen with the blue attract background', () => {
    const bg = showcaseDraws.find((r): r is DrawFill => r.kind === 'fillRect' && isFullScreen(r))
    expect(bg, 'the full-screen blue background fill is gone').toBeDefined()
    expect(bg !== undefined && isBlue(bg.style), `background fill is not blue: ${bg?.style}`).toBe(true)
  })

  it('still blits all eight showcase creature sprites', () => {
    for (const sprite of showcaseSprites()) {
      const [x, y] = cellXY(sprite)
      const blit = showcaseDraws.find(
        (r) => r.kind === 'blit' && r.y === y && (r.x === x || r.x === x + 8),
      )
      expect(blit, `the creature at cell (${x}, ${y}) stopped rendering`).toBeDefined()
    }
  })

  it('still prints grid text stamps (the ml9-3 HIGH SCORES + creature labels)', () => {
    // Text stamps blit at grid rows (y a multiple of 8, drawGridStamps); sprites sit
    // at y ≡ 6 (mod 8) (the -18 offset), so a blit on a grid row is a text stamp.
    const textBlits = showcaseDraws.filter((r) => r.kind === 'blit' && r.y % 8 === 0)
    expect(textBlits.length, 'no grid text stamps drew — the ml9-3 labels/scores vanished').toBeGreaterThan(0)
  })
})

describe('ml11-2 AC3 — the panels are static (no strobe/flash — ml7-4 accessibility)', () => {
  it('renders identical black panels on two consecutive showcase frames', () => {
    const panels1 = blackPanels(showcaseDraws)
    const panels2 = blackPanels(showcaseDrawsNext)
    // Non-vacuity: a no-strobe guard that compares two EMPTY panel sets passes for
    // free. Require panels to exist first (RED today), THEN require them steady.
    expect(panels1.length, 'no black per-cell panels drew at all (ml11-2 unshipped)').toBeGreaterThan(0)
    expect(panels2, 'the black panels changed between showcase frames — a strobe/flash').toEqual(panels1)
  })
})
