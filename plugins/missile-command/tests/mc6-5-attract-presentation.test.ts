// plugins/missile-command/tests/mc6-5-attract-presentation.test.ts
//
// Story mc6-5 — RED phase (Han Solo / TEA). The attract-presentation layer:
// scrolling attract messages + the "THE END" screen, rendered in the SHELL, plus
// the high-score display SLOT that story mc7-4 later fills with the ladder. The
// pure state machine and the 'attract' phase already exist (mc6-1/6-4); this
// story is render/layout only. Ground truth is REV-01 (035820-01).
//
// ─── GROUND TRUTH the SM + TEA measured against the vendored source ───────────
// The message-display LOGIC is W3MAIN.MAC — REFRESH (:5277) selects/holds the
// scroll message and SCROLL (:5331) shifts it across the bottom; the refresh gate
// `LDA FRAME / LSR / IFCC / JSR SCROLL` (W3MAIN.MAC:5313-5319) fires SCROLL on
// every SECOND frame (bit 0 of FRAME clear) — the scroll cadence.
//
// The message CONTENT, however, is NOT in W3MAIN.MAC. `ATRMSG`/`PRSCRO` are
// `.GLOBL` externals (W3MAIN.MAC:63) defined in W3DSUP.MAC, and the strings are
// the English literals at W3DSUP.MAC:3324-3390:
//   EPRESS  'PRESS START'   :3328   ETHEEND 'THE END'     :3338
//   EMISIL  'MISSILE'       :3384   ECOMAN  'COMMAND'     :3386
//   EHISCR  'HIGH SCORES'   :3368   EGAMOV  'GAME OVER'   :3326
// "THE END" is displayed in the game-over explosion (W3MAIN.MAC:4719 `LDA I,
// MTHEEND ;DISPLAY "THE END" IN EXPLOSION`), i.e. during phase 'over'.
//
// ─── FREE-PLAY DECISION (TEA, recorded as a Design Deviation) ─────────────────
// The arcade fleet is browser-based with no backend (CLAUDE.md) — no coin mechanism.
// The coin-op scroll table (W3DSUP.MAC MESDAT: INSERT COINS / CREDITS: / coin
// mode) is therefore inapplicable; the faithful free-play attract shows PRESS
// START + the MISSILE COMMAND title + the HIGH SCORES slot. This story pins the
// individual ROM string CONSTANTS (unambiguous ground truth, each cited) and
// asserts the shell USES them; the exact scroll ORDER is left to GREEN and
// checked loosely (must CONTAIN 'PRESS START'), not over-specified.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// src/shell/attract.ts is an empty `export {}` stub (its exports are undefined),
// and drawFrame renders no attract presentation / no THE END overlay. Every new
// surface is reached through a dynamic-import namespace cast so `tsc --noEmit`
// stays green; each assertion fails as "not implemented", not as a compile error.
// The MC-ATTRACT-* claims are unfiled, so the citation coverage assertions redden.
// AC4 (the seeded ladder is untouched) is a green-on-arrival LOCK, not a driver.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { drawFrame } from '../src/shell/render.js'
import { createGame, type GameState } from '../src/core/game.js'
import { DEFAULT_HIGH_SCORES, MC_HIGH_SCORE_DEPTH } from '../src/core/highscore.js'
import { loadClaims, claimCovers } from './helpers/claims.js'

// ─── Dynamic-import namespace cast: keeps tsc green while attract.ts is a stub ──
const ATTRACT_SPECIFIER = '../src/shell/attract.js'
async function loadAttract(): Promise<Record<string, unknown>> {
  return (await import(/* @vite-ignore */ ATTRACT_SPECIFIER)) as Record<string, unknown>
}
const str = (v: unknown): string => (typeof v === 'string' ? v : `__missing:${String(v)}__`)
const num = (v: unknown): number => (typeof v === 'number' ? v : NaN)

// ─── The vendored source (physical lines; the .MAC carry a stray byte so read as
//     utf8 — a plain grep false-empties; the tree is gitignored so this SKIPs on CI) ──
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const W3DSUP = join(root, 'reference', 'source', 'W3DSUP.MAC')
const W3MAIN = join(root, 'reference', 'source', 'W3MAIN.MAC')
const sourceAvailable = existsSync(W3DSUP) && existsSync(W3MAIN)
const lineAt = (file: string, n: number): string => readFileSync(file, 'utf8').split('\n')[n - 1] ?? ''
/** Parse the text of a `.ASCIN /LITERAL/` (or `.ASCII`) assembler line. */
const ascinLiteral = (line: string): string => {
  const m = line.match(/\.ASCI[NI]\s*\/([^/]*)\//)
  return m ? m[1] : `__no-ascin:${line}__`
}

// ─── A 2D context that records every drawn primitive's op + X/Y (mirrors render-hud) ──
interface Mark {
  op: string
  x: number
  y: number
}
const Y_ARG: Readonly<Record<string, number>> = { fillText: 2, strokeText: 2, drawImage: 2 }
const X_ARG: Readonly<Record<string, number>> = { fillText: 1, strokeText: 1, drawImage: 1 }
function recCtx(): { ctx: CanvasRenderingContext2D; marks: Mark[] } {
  const marks: Mark[] = []
  const coord = (args: unknown[], i: number): number => (typeof args[i] === 'number' ? (args[i] as number) : NaN)
  const rec =
    (op: string) =>
    (...args: unknown[]): void => {
      marks.push({ op, x: coord(args, X_ARG[op] ?? 0), y: coord(args, Y_ARG[op] ?? 1) })
    }
  const noop = (): void => {}
  const api: Record<string, unknown> = {
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    globalAlpha: 1,
    font: '',
    fillRect: rec('fillRect'),
    strokeRect: rec('strokeRect'),
    rect: rec('rect'),
    moveTo: rec('moveTo'),
    lineTo: rec('lineTo'),
    arc: rec('arc'),
    ellipse: rec('ellipse'),
    fillText: rec('fillText'),
    strokeText: rec('strokeText'),
    drawImage: rec('drawImage'),
    beginPath: noop,
    closePath: noop,
    fill: noop,
    stroke: noop,
    save: noop,
    restore: noop,
    translate: noop,
    scale: noop,
    setTransform: noop,
    clip: noop,
  }
  return { ctx: api as unknown as CanvasRenderingContext2D, marks }
}

const W = 256
const H = 222
const paint = (state: GameState): Mark[] => {
  const { ctx, marks } = recCtx()
  drawFrame(ctx, state, W, H, state.wave)
  return marks
}
// An attract frame at a given frame-count (the sim's only clock is state.frame).
const attractAt = (frame: number): GameState => ({ ...createGame(1), phase: 'attract', frame })
// A game-over frame vs an otherwise-identical play frame (isolates the THE END overlay).
const base = (): GameState => {
  const g = createGame(1)
  return { ...g, icbms: [], abms: [], explosions: [] }
}
const overFrame = (): GameState => ({ ...base(), phase: 'over' })
const playFrame = (): GameState => ({ ...base(), phase: 'play' })

// Marks in the vertical band [y0, y1) of a canvas of height H.
const inBand = (marks: Mark[], y0: number, y1: number): Mark[] =>
  marks.filter((m) => Number.isFinite(m.y) && m.y >= y0 && m.y < y1)
const xSignature = (marks: Mark[]): string =>
  marks
    .map((m) => Math.round(m.x))
    .sort((a, b) => a - b)
    .join(',')

describe('mc6-5 AC1 — scrolling attract messages (W3MAIN.MAC:5277/5331 logic, W3DSUP strings)', () => {
  it('SCROLL_FRAMES_PER_STEP is 2 — the REFRESH LDA FRAME/LSR/IFCC gate fires SCROLL every 2nd frame', async () => {
    const m = await loadAttract()
    expect(num(m.SCROLL_FRAMES_PER_STEP)).toBe(2)
  })

  it.skipIf(!sourceAvailable)('the cadence citation resolves: W3MAIN.MAC:5313-5319 is the FRAME/LSR/IFCC/SCROLL gate', () => {
    expect(lineAt(W3MAIN, 5313)).toContain('LDA FRAME')
    expect(lineAt(W3MAIN, 5317)).toContain('IFCC')
    expect(lineAt(W3MAIN, 5319)).toContain('JSR SCROLL')
  })

  it('scrollStepsAt is a pure, deterministic function of the frame counter — one step per 2 frames', async () => {
    const m = await loadAttract()
    const stepsAt = m.scrollStepsAt as (f: number) => number
    expect(typeof stepsAt).toBe('function')
    // determinism
    expect(stepsAt(40)).toBe(stepsAt(40))
    // advances every 2nd frame, not every frame
    expect(stepsAt(0)).toBe(stepsAt(1))
    expect(stepsAt(2)).toBe(stepsAt(0) + 1)
    expect(stepsAt(10)).toBe(stepsAt(0) + 5)
  })

  it('ATTRACT_SCROLL_MESSAGES contains the ROM PRESS START literal', async () => {
    const m = await loadAttract()
    const msgs = m.ATTRACT_SCROLL_MESSAGES as readonly string[]
    expect(Array.isArray(msgs)).toBe(true)
    expect(msgs).toContain('PRESS START')
    expect(msgs).toContain(str(m.MSG_PRESS_START))
  })

  it('the attract screen actually SCROLLS — drawn marks in the bottom band move as the frame advances', () => {
    // The scroll cadence is 2 frames/step, so 0 vs 40 is ~20 steps apart: the bottom
    // message band must paint a DIFFERENT set of x-positions. A static (non-scrolling)
    // render would produce identical signatures.
    const early = inBand(paint(attractAt(0)), H - 40, H)
    const later = inBand(paint(attractAt(40)), H - 40, H)
    expect(early.length).toBeGreaterThan(0) // something is drawn in the message band at all
    expect(xSignature(later)).not.toBe(xSignature(early))
  })
})

describe('mc6-5 AC2 — "THE END" screen (ETHEEND W3DSUP.MAC:3338, shown in the over explosion W3MAIN.MAC:4719)', () => {
  it('MSG_THE_END is the exact ROM literal', async () => {
    const m = await loadAttract()
    expect(str(m.MSG_THE_END)).toBe('THE END')
  })

  it.skipIf(!sourceAvailable)('MSG_THE_END re-derives from W3DSUP.MAC:3338 (source double-entry)', async () => {
    const m = await loadAttract()
    expect(ascinLiteral(lineAt(W3DSUP, 3338))).toBe('THE END')
    expect(str(m.MSG_THE_END)).toBe(ascinLiteral(lineAt(W3DSUP, 3338)))
  })

  it('drawFrame paints a THE END overlay during phase over that is ABSENT during play', () => {
    // Same quiet field; the only difference is the phase. THE END is a centre-band
    // overlay, so 'over' must paint centre-band marks that 'play' does not.
    const centreOver = inBand(paint(overFrame()), H / 2 - 30, H / 2 + 30)
    const centrePlay = inBand(paint(playFrame()), H / 2 - 30, H / 2 + 30)
    expect(centreOver.length).toBeGreaterThan(centrePlay.length)
  })
})

describe('mc6-5 AC3 — high-score display SLOT (the mc7-4 container; sized for the 5-rung ladder)', () => {
  it('highScoreSlot(width,height) reserves a region within bounds, one row per ladder rung', async () => {
    const m = await loadAttract()
    const slotFn = m.highScoreSlot as (w: number, h: number) => { x: number; y: number; w: number; h: number; rows: number }
    expect(typeof slotFn).toBe('function')
    const slot = slotFn(W, H)
    // one row per default rung — accommodates DEFAULT_HIGH_SCORES without re-seeding it
    expect(slot.rows).toBe(MC_HIGH_SCORE_DEPTH)
    expect(slot.rows).toBe(DEFAULT_HIGH_SCORES.length)
    // the region sits inside the canvas
    expect(slot.x).toBeGreaterThanOrEqual(0)
    expect(slot.y).toBeGreaterThanOrEqual(0)
    expect(slot.w).toBeGreaterThan(0)
    expect(slot.h).toBeGreaterThan(0)
    expect(slot.x + slot.w).toBeLessThanOrEqual(W)
    expect(slot.y + slot.h).toBeLessThanOrEqual(H)
  })

  it('MSG_HIGH_SCORES is the exact ROM header literal (EHISCR)', async () => {
    const m = await loadAttract()
    expect(str(m.MSG_HIGH_SCORES)).toBe('HIGH SCORES')
  })

  it('the slot is a CONTAINER only — drawFrame in attract does NOT paint the lower ladder rungs', () => {
    // mc7-4 fills the slot; this story must not render the ladder entries. The default
    // initials (DFT/DLS/SRC/RDA/MJP) are glyph fillRects, not readable text, so we assert
    // the structural invariant instead. The HUD's BEST figure (mc10-3) legitimately reads
    // highScores[0], so we keep rung 0 FIXED and mutate only the LOWER rungs (1-4): if the
    // attract render painted the full ladder, those marks would move; a container-only slot
    // leaves the painted marks identical.
    const normal = paint(attractAt(0))
    const swappedLower = paint({
      ...attractAt(0),
      highScores: DEFAULT_HIGH_SCORES.map((e, i) => (i === 0 ? e : { name: 'ZZZ', score: 1234 })),
    })
    expect(xSignature(normal)).toBe(xSignature(swappedLower))
  })
})

describe('mc6-5 AC4 — the seeded default ladder is UNTOUCHED (lock; mc7-1/mc7-4 own it)', () => {
  it('DEFAULT_HIGH_SCORES still decodes to the five REV-01 rungs, best-first', () => {
    expect(DEFAULT_HIGH_SCORES.map((e) => ({ name: e.name, score: e.score }))).toEqual([
      { name: 'DFT', score: 7500 },
      { name: 'DLS', score: 7495 },
      { name: 'SRC', score: 7330 },
      { name: 'RDA', score: 7005 },
      { name: 'MJP', score: 6950 },
    ])
  })
})

describe('mc6-5 AC5 — core boundary stays clean (attract render is clock-free, deterministic)', () => {
  it.skipIf(!existsSync(join(root, 'src', 'shell', 'attract.ts')))(
    'attract.ts uses no wall clock or entropy (Date / performance.now / requestAnimationFrame / Math.random)',
    () => {
      const src = readFileSync(join(root, 'src', 'shell', 'attract.ts'), 'utf8')
      // strip line + block comments so the header prose above does not trip the scan
      const code = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
      expect(code).not.toMatch(/\bDate\b|performance\.now|requestAnimationFrame|Math\.random/)
    },
  )

  it('the same attract frame renders identically twice (no hidden entropy in the render path)', () => {
    expect(xSignature(paint(attractAt(12)))).toBe(xSignature(paint(attractAt(12))))
  })
})

describe('mc6-5 AC6 — every cited ROM string/cadence is pinned by a committed claim', () => {
  it.skipIf(!sourceAvailable)('the ROM string literals sit at their cited physical lines (source second entry)', () => {
    expect(ascinLiteral(lineAt(W3DSUP, 3328))).toBe('PRESS START') // EPRESS
    expect(ascinLiteral(lineAt(W3DSUP, 3338))).toBe('THE END') // ETHEEND
    expect(ascinLiteral(lineAt(W3DSUP, 3368))).toBe('HIGH SCORES') // EHISCR
    expect(ascinLiteral(lineAt(W3DSUP, 3384))).toBe('MISSILE') // EMISIL
    expect(ascinLiteral(lineAt(W3DSUP, 3386))).toBe('COMMAND') // ECOMAN
  })

  it('a committed claim covers each cited attract string line in W3DSUP.MAC', () => {
    const claims = loadClaims()
    for (const line of [3328, 3338, 3368, 3384, 3386]) {
      expect(claimCovers(claims, 'W3DSUP.MAC', line, line)).toBe(true)
    }
  })

  it('a committed claim covers the scroll-cadence gate in W3MAIN.MAC (5313-5319)', () => {
    const claims = loadClaims()
    expect(claimCovers(claims, 'W3MAIN.MAC', 5313, 5319)).toBe(true)
  })
})
