// tests/shell/pm6-5-cutscene-playtest.test.ts
//
// Story pm6-5 — RED phase (Julia is Dev; O'Brien/TEA writes this). The pm6 VISUAL
// PLAYTEST capstone: the "eyes" that prove the between-level intermission cutscenes
// modelled in pm6-2/pm6-3 actually REACH the frame a player screenshots at
// http://127.0.0.1:5270/pac-man/ . It mirrors the other games' playtest capstones
// (defender's df4-6/df5-7): core built the scene, this story proves the pixels land.
//
// ─── SCOPE (trimmed) ──────────────────────────────────────────────────────────────
// pm6-4 (the level-256 kill screen) was CANCELED 2026-08-19 (user directive: not
// reproducing authentic bugs). So this playtest is CUTSCENE-ONLY — there is no kill
// screen to render or screenshot, and this file asserts nothing about one.
//
// ─── THE SEAM ───────────────────────────────────────────────────────────────────────
// `overlays.draw(ctx, game)` — the per-frame presentation call main.ts already makes
// every frame (main.ts: `overlays.draw(logicalCtx, game)`), and the home pm4-9 chose
// for phase-gated screen drawing (the attract "PUSH START BUTTON" prompt). The
// coffee-break is a phase-gated scene in exactly the same sense, so its render belongs
// on the same wired seam. Testing `overlays.draw` therefore proves INTEGRATION, not an
// isolated helper: whatever Dev factors into render.ts, the contract is that a frame
// drawn while `phase === 'intermission'` with a live `game.cutscene` paints the actors.
//
// ─── WHY THIS IS RED ────────────────────────────────────────────────────────────────
// `grep -rn cutscene|intermission plugins/pac-man/src/shell/` is EMPTY: the shell has
// no cutscene render path at all. main.ts draws the maze / ghosts / Pac / HUD every
// frame but never the `game.cutscene` actors, and `overlays.draw` ignores
// `game.cutscene`. So during `intermission` the coffee-break plays SILENTLY — the
// scripted Pac/Blinky the core steps never reach a pixel. Every assertion below fails
// until GREEN wires the cutscene actors into `overlays.draw`.
//
// ─── THE CONTRACT GREEN (Dev) BUILDS ─────────────────────────────────────────────────
//   • `overlays.draw(ctx, game)`, when `game.phase === 'intermission'` && `game.cutscene`,
//     blits the cutscene actors (pac + blinky) as sprites. No cutscene, or any other
//     phase → it draws none of them (the canonical-serve lesson: the scene must DIFFER
//     from a control, not paint the same bytes everywhere).
//   • Each actor's screen position derives from its `col` (the ROM tile byte), so as the
//     core steps the actor across, the on-screen sprite moves with it.
//   • The sprites READ CORRECTLY against the ROM scene: big-Pac (`bigPacActive`) blits a
//     visibly larger Pac than the small one; a `frightened` Blinky blits the blue
//     frightened sprite; a `ripped` Blinky blits the torn-sheet / worm sprite — each
//     DISTINCT from the plain ghost, so the act reads as the ROM's act.
//   • ACCESSIBILITY (Decision B — the standing Pac-Man ruling, accessibility OUTRANKS ROM
//     fidelity): the cutscene is small-area sprite motion only. Across a whole scripted
//     act it NEVER paints a full-screen high-luminance fill (the pm4-1 hazard). PURE
//     small-area animation, never a strobe.

import { describe, it, expect } from 'vitest'
import { createOverlays } from '../../src/shell/overlays'
import { createGameState, type GameState } from '../../src/core/game'
import {
  createAct1Cutscene,
  createAct2Cutscene,
  createAct3Cutscene,
  createCutsceneForLevel,
  stepCutscene,
  type CutsceneState,
} from '../../src/core/cutscene'
import { LOGICAL_W, LOGICAL_H } from '../../src/shell/layout'

const SPRITE_PX = 16 // pacman.5f's native sprite size (render.ts) — big-Pac tiles a 32x32

// ─── The recording fake ctx (mirrors overlays.test.ts / attract-screen.test.ts) ──────
interface RecordedCall {
  method: 'putImageData' | 'drawImage' | 'fillText' | 'fillRect'
  x: number
  y: number
  w?: number
  h?: number
  /** FNV-1a hash of a putImageData sprite's pixels — lets a comparison tell two
   *  same-SIZE sprites apart (a frightened vs a normal ghost blit at the same
   *  spot), which x/y/w/h alone cannot. */
  sig?: number
  /** The raw RGBA of a putImageData sprite — kept so a fidelity test can assert an
   *  actual COLOUR reached the frame (a wrong colour-code keeps the sprite index, so
   *  `sig` alone would still differ from a plain body — see the frightened test). */
  data?: Uint8ClampedArray
  text?: string
  fillStyle?: string
}
interface FakeCtx {
  calls: RecordedCall[]
}

/** FNV-1a over the sprite's RGBA bytes — a cheap content fingerprint. */
function hashPixels(data: Uint8ClampedArray): number {
  let h = 0x811c9dc5
  for (let i = 0; i < data.length; i++) {
    h ^= data[i]
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

function fakeCtx(): CanvasRenderingContext2D & FakeCtx {
  const calls: RecordedCall[] = []
  const ctx = {
    calls,
    fillStyle: '',
    font: '',
    textBaseline: 'alphabetic',
    textAlign: 'start',
    fillRect: (x: number, y: number, w: number, h: number) =>
      calls.push({ method: 'fillRect', x, y, w, h, fillStyle: String(ctx.fillStyle) }),
    fillText: (text: string, x: number, y: number) => calls.push({ method: 'fillText', x, y, text }),
    putImageData: (img: { width: number; height: number; data: Uint8ClampedArray }, dx: number, dy: number) =>
      calls.push({ method: 'putImageData', x: dx, y: dy, w: img.width, h: img.height, sig: hashPixels(img.data), data: img.data }),
    // Sprites may be blitted from an offscreen canvas via drawImage — record both so
    // the contract is not coupled to one blit primitive. The 9-arg form is the common
    // one; capture the destination x/y/w/h (last four args) when present.
    drawImage: (...a: number[]) => {
      const [dx, dy, dw, dh] = a.length >= 8 ? a.slice(4) : a.slice(1)
      calls.push({ method: 'drawImage', x: dx ?? 0, y: dy ?? 0, w: dw, h: dh })
    },
    createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    clearRect: () => {},
    beginPath: () => {},
    arc: () => {},
    fill: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    scale: () => {},
    drawFocusIfNeeded: () => {},
  } as unknown as CanvasRenderingContext2D & FakeCtx
  return ctx
}

/** Sprite blits — the actor draws, by either primitive (putImageData / drawImage). */
function spriteBlits(ctx: ReturnType<typeof fakeCtx>): RecordedCall[] {
  return ctx.calls.filter((c) => c.method === 'putImageData' || c.method === 'drawImage')
}

/** The blit destination positions, as a stable signature for "did the picture move?". */
function blitPositions(ctx: ReturnType<typeof fakeCtx>): string {
  return spriteBlits(ctx)
    .map((c) => `${c.x},${c.y}`)
    .sort()
    .join('|')
}

/** A stable signature of the WHOLE blit set (positions + sizes) — for "did the picture
 *  change?" comparisons (a bigger Pac, a different ghost sprite). */
function blitSignature(ctx: ReturnType<typeof fakeCtx>): string {
  return spriteBlits(ctx)
    .map((c) => `${c.x},${c.y},${c.w ?? '?'},${c.h ?? '?'},${c.sig ?? '?'}`)
    .sort()
    .join('|')
}

/** The pixel bounding box of every sprite blit — max extent minus min origin, per axis.
 *  Lets a test assert the on-screen FOOTPRINT (a big-Pac must cover a bigger area than a
 *  small one), which `blitSignature`'s "just differs" comparison never checks. */
function blitFootprint(ctx: ReturnType<typeof fakeCtx>): { w: number; h: number } {
  const blits = spriteBlits(ctx)
  if (blits.length === 0) return { w: 0, h: 0 }
  const minX = Math.min(...blits.map((c) => c.x))
  const minY = Math.min(...blits.map((c) => c.y))
  const maxX = Math.max(...blits.map((c) => c.x + (c.w ?? 0)))
  const maxY = Math.max(...blits.map((c) => c.y + (c.h ?? 0)))
  return { w: maxX - minX, h: maxY - minY }
}

/** How many opaque pixels of exactly (r,g,b) appear across every putImageData sprite in
 *  `ctx`. Proves a specific COLOUR reached the frame in QUANTITY (a frightened body is
 *  mostly blue; a plain red Blinky has only a few blue eye-pupils) — which a
 *  sprite-index-driven hash comparison cannot, since a wrong colour keeps the index. */
function countColor(ctx: ReturnType<typeof fakeCtx>, r: number, g: number, b: number): number {
  let n = 0
  for (const c of ctx.calls) {
    if (c.method !== 'putImageData' || !c.data) continue
    const d = c.data
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] !== 0 && d[i] === r && d[i + 1] === g && d[i + 2] === b) n++
    }
  }
  return n
}

// The hardware colours the cutscene ghost sprites resolve to (render.ts colour codes →
// HARDWARE_PALETTE): a FRIGHTENED body is blue, a plain Blinky body is red. Asserting the
// blue reaches the frame (and the plain body carries none) verifies the COLOUR, not just
// that the sprite differs. Sourced from render.ts's own anchored colour-code comments.
const FRIGHTENED_BLUE: readonly [number, number, number] = [33, 33, 255] // colourLookup(9,1) = HARDWARE_PALETTE[11]
const BLINKY_RED: readonly [number, number, number] = [255, 0, 0] // colourLookup(1,3) = HARDWARE_PALETTE[1]

/** fillRect calls covering (at least) the whole 224×288 logical buffer — a full-screen
 *  fill, exactly the level-clear strobe pm4-1 removed. Copied from overlays.test.ts. */
function fullScreenFills(ctx: ReturnType<typeof fakeCtx>): RecordedCall[] {
  return ctx.calls.filter(
    (c) => c.method === 'fillRect' && c.x <= 0 && c.y <= 0 && (c.w ?? 0) >= LOGICAL_W && (c.h ?? 0) >= LOGICAL_H,
  )
}

function isHighLuminance(fillStyle: string | undefined): boolean {
  if (!fillStyle) return false
  const hex = fillStyle.trim().replace(/^#/, '')
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return false
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return 0.299 * r + 0.587 * g + 0.114 * b >= 128
}

/** An `intermission`-phase game carrying the given cutscene — the state a player sees
 *  during a coffee break. `phase`/`cutscene` are public mutable fields (game.ts). */
function intermissionGame(cutscene: CutsceneState | null): GameState {
  const g = createGameState(1)
  g.phase = 'intermission'
  g.cutscene = cutscene
  return g
}

/** Draw one frame of the given game through a FRESH overlays + ctx (no latched popups,
 *  no cross-test state). Returns the recording ctx. */
function drawFrame(game: GameState): ReturnType<typeof fakeCtx> {
  const ctx = fakeCtx()
  createOverlays().draw(ctx, game)
  return ctx
}

// ─── 1. The cutscene reaches the live frame, gated on intermission (wiring) ───────────
describe('pm6-5 — the intermission cutscene reaches the live frame (pm6-2/pm6-3)', () => {
  it('draws the cutscene actors during intermission — the coffee break is not silent', () => {
    const ctx = drawFrame(intermissionGame(createAct1Cutscene(1)))
    expect(
      spriteBlits(ctx).length,
      'overlays.draw painted no actor sprite during intermission — the cutscene never reaches the screen (RED: no shell cutscene render path exists)',
    ).toBeGreaterThan(0)
  })

  it('draws NOTHING extra outside a coffee break — the scene is gated (canonical-serve control)', () => {
    // The render-layer analogue of tests/canonical-serve: the intermission frame must
    // DIFFER from a control, not paint actors everywhere. A `playing` frame (same seed,
    // no cutscene, no events) is the control — it must carry none of the actor blits.
    const playing = createGameState(1)
    playing.phase = 'playing'
    const control = drawFrame(playing)
    const intermission = drawFrame(intermissionGame(createAct1Cutscene(1)))
    expect(spriteBlits(control).length, 'the control (playing, no cutscene) drew actor sprites — the scene is not gated').toBe(0)
    expect(
      blitSignature(intermission),
      'the intermission frame is byte-identical to the no-cutscene control — the cutscene is invisible',
    ).not.toBe(blitSignature(control))
  })

  it('a null cutscene during intermission draws no actors — gated on the cutscene, not just the phase', () => {
    // A forced-null coffee break (the pm6-2 no-cutscene path) still enters `intermission`
    // but has no scene: overlays must draw no actors, or the gate is on the phase alone
    // and would paint stale/garbage actors for a break that has none.
    const ctx = drawFrame(intermissionGame(null))
    expect(
      spriteBlits(ctx).length,
      'overlays drew actor sprites for a null cutscene — the render must gate on game.cutscene, not on the phase alone',
    ).toBe(0)
  })

  it('the picture MOVES within a FIXED-state window — genuine per-frame traversal, not the big-Pac size flip', () => {
    // Each actor is placed from its own faithful traversal coordinate `x`, so the on-screen
    // positions must sweep as the core steps. CRITICAL: sample only within sub-state 1 (the
    // chase — bigPacActive stays FALSE and both actors move the whole time). A whole-act
    // sweep is NOT enough here: the mid-act bigPacActive false->true flip changes Pac's blit
    // OFFSET (small 16x16 vs big 32x32), so a completely STATIC render (cutsceneScreenX
    // severed from x) still yields 2 layouts across the act. Confining the window to one
    // sub-state removes that size-flip, so >1 distinct layout can ONLY come from real motion.
    const s = createAct1Cutscene(1)
    const layouts = new Set<string>()
    let sampledInS1 = 0
    for (let f = 0; f < 4000 && !s.done; f++) {
      if (s.substate === 1) {
        expect(s.bigPacActive, 'precondition: sub-state 1 is before the big-Pac gate (size flip cannot confound)').toBe(false)
        layouts.add(blitPositions(drawFrame(intermissionGame(s))))
        sampledInS1++
      }
      stepCutscene(s)
    }
    expect(s.done, 'precondition: act 1 reached its final gate within the frame budget').toBe(true)
    expect(sampledInS1, 'precondition: sub-state 1 (the chase) was sampled across many frames').toBeGreaterThan(2)
    expect(
      layouts.size,
      'the layout never changed across sub-state 1 with bigPacActive fixed — the actors are STATIC, not positioned from the live traversal coordinate (a severed cutsceneScreenX passes only if this fails)',
    ).toBeGreaterThan(1)
  })
})

// ─── 2. The actors READ CORRECTLY against the ROM (AC1) ───────────────────────────────
describe('pm6-5 — the cutscene actors read correctly against the ROM (AC1)', () => {
  it('big-Pac (act 1 sub-state 5) blits a LARGER Pac than the small chase Pac', () => {
    // ROM act 1: a giant Pac-Man chases the fleeing Blinky (pacman.asm:15e9 arms big-Pac,
    // four 16x16 sprites tiling a 32x32). The frame must actually show a BIGGER Pac — a
    // "just renders differently" check would pass even if the four quads stacked at one
    // spot, so assert the on-screen FOOTPRINT grows. Pac/Blinky share the cutscene row, so
    // the scene HEIGHT is the sprite height: 16px small, 32px for the big-Pac.
    const small = createAct1Cutscene(1)
    const big = createAct1Cutscene(1)
    big.bigPacActive = true
    const smallCtx = drawFrame(intermissionGame(small))
    const bigCtx = drawFrame(intermissionGame(big))
    expect(spriteBlits(smallCtx).length, 'precondition: the small scene drew actors').toBeGreaterThan(0)
    const smallFp = blitFootprint(smallCtx)
    const bigFp = blitFootprint(bigCtx)
    expect(bigFp.h, 'big-Pac is not 32px tall — the four quads are not tiled into a 32x32 (they may be stacked)').toBeGreaterThanOrEqual(2 * SPRITE_PX)
    expect(
      bigFp.h,
      'the big-Pac scene is no taller than the small one — the giant chaser does not read as bigger on screen',
    ).toBeGreaterThan(smallFp.h)
    // WIDTH too (round-2 #2): a height-only check passes even if the giant Pac is only half
    // as wide (e.g. it failed to scale on one axis). big-Pac is a single 32x32 blit (the
    // 2x-scaled sprite), so assert ONE blit is genuinely 32x32 in BOTH dimensions — a giant
    // Pac that stayed 16x16, or lost a dimension, reddens. (Checking the blit itself, not the
    // whole-scene footprint, avoids Blinky inflating the measured width.)
    const has32 = spriteBlits(bigCtx).some((c) => (c.w ?? 0) >= 2 * SPRITE_PX && (c.h ?? 0) >= 2 * SPRITE_PX)
    expect(
      has32,
      'no 32x32 big-Pac blit — the giant chaser is not drawn at 2x (width or height is missing)',
    ).toBe(true)
  })

  it('each actor is positioned from its OWN traversal coordinate — Blinky tracks its x, not Pac (round-2 #1)', () => {
    // The rework's central behavior: both actors are placed from core's per-actor `x`, so
    // Blinky's on-screen X must move when ONLY Blinky's x changes and Pac holds still. This
    // isolates Blinky — a render that hardcoded Blinky's position (or read only Pac) would
    // leave it fixed. Small-Pac scene draws Blinky first, then Pac (drawCutscene order), so
    // the two sprite blits are [Blinky, Pac]; comparing the SAME index across two scenes
    // that differ only in blinky.x proves Blinky (not Pac) tracked the change.
    const base = createAct1Cutscene(1)
    const moved = createAct1Cutscene(1)
    moved.blinky.x = base.blinky.x + 40 // shift ONLY Blinky's traversal coord (Pac untouched)
    const baseBlits = spriteBlits(drawFrame(intermissionGame(base)))
    const movedBlits = spriteBlits(drawFrame(intermissionGame(moved)))
    expect(baseBlits.length, 'precondition: the small-Pac scene blits Blinky then Pac (2 sprites)').toBe(2)
    expect(movedBlits.length, 'precondition: the moved scene also blits two sprites').toBe(2)
    // Pac (blit index 1) is unchanged — nothing about Pac's state varied.
    expect(movedBlits[1].x, 'precondition: Pac stays put when only Blinky.x varies').toBe(baseBlits[1].x)
    // Blinky (blit index 0) tracks its own larger x → a larger screen X.
    expect(
      movedBlits[0].x,
      'the Blinky blit did not follow its own core x — its position is not derived from Blinky (hardcoding it passes only if this fails)',
    ).toBeGreaterThan(baseBlits[0].x)
  })

  it('a FRIGHTENED Blinky renders BLUE (the blue flee), an ordinary Blinky does not', () => {
    // ROM act 1: Blinky turns blue and flees — the frighten-all routine #1a70 sets image
    // #1c (pacman.asm:1aa1 `ld (ix+#02),#1c`) and colour #11 (pacman.asm:1ab1 `ld (ix+#03),#11`).
    // Assert the actual COLOUR, not just "a different sprite" — a wrong colour-code keeps
    // the frightened sprite index, so a sig-only diff would still pass. The blue must reach
    // the frame, and the plain (red) Blinky must carry none of it (the colour is gated).
    const plain = createAct1Cutscene(1)
    const scared = createAct1Cutscene(1)
    scared.blinky.frightened = true
    const scaredCtx = drawFrame(intermissionGame(scared))
    const plainCtx = drawFrame(intermissionGame(plain))
    expect(spriteBlits(plainCtx).length, 'precondition: the plain scene drew actors').toBeGreaterThan(0)
    // The plain Blinky is red-bodied with a few blue eye-pupils; the frightened Blinky is a
    // blue BODY — so it carries markedly MORE blue than the plain one. A wrong colour-code
    // (drawing the frightened sprite red) would collapse its blue count to the plain's.
    const scaredBlue = countColor(scaredCtx, ...FRIGHTENED_BLUE)
    const plainBlue = countColor(plainCtx, ...FRIGHTENED_BLUE)
    expect(scaredBlue, 'the frightened Blinky is not substantially blue — the blue flee body did not reach the frame').toBeGreaterThan(20)
    expect(
      scaredBlue,
      'the frightened Blinky is not markedly bluer than the plain (red) Blinky — the flee colour is not gated on the frightened flag',
    ).toBeGreaterThan(plainBlue * 3)
    expect(
      countColor(plainCtx, ...BLINKY_RED),
      'precondition: the plain Blinky renders in its red body colour',
    ).toBeGreaterThan(0)
  })

  it('a RIPPED Blinky (act 2 tear / act 3 worm) blits a different sprite than an intact ghost', () => {
    // ROM act 2 nails Blinky's sheet (sprite #32/#33, pacman.asm:1642/164d); act 3's worm
    // is that torn ghost. The torn/worm sprite must read distinctly from the intact ghost.
    const intact = createAct2Cutscene(1) // act 2 opens intact, then rips
    const torn = createAct2Cutscene(1)
    torn.blinky.ripped = true
    const intactCtx = drawFrame(intermissionGame(intact))
    const tornCtx = drawFrame(intermissionGame(torn))
    expect(spriteBlits(intactCtx).length, 'precondition: the intact scene drew actors').toBeGreaterThan(0)
    expect(
      blitSignature(tornCtx),
      'a ripped Blinky renders identically to an intact ghost — the torn sheet / worm does not read on screen',
    ).not.toBe(blitSignature(intactCtx))
  })

  it('each act (1/2/3) renders — every coffee break the cadence schedules reaches the frame', () => {
    // pm6-2/pm6-3 build acts 1 (round 2), 2 (round 5), 3 (rounds 9/13/17). All three must
    // render; a shell that only handled act 1 would leave acts 2 and 3 as silent breaks.
    for (const level of [2, 5, 9]) {
      const cutscene = createCutsceneForLevel(level, 1)
      expect(cutscene, `precondition: level ${level} schedules a cutscene`).not.toBeNull()
      const ctx = drawFrame(intermissionGame(cutscene))
      expect(
        spriteBlits(ctx).length,
        `the act for level ${level} drew no actors — that coffee break is silent on screen`,
      ).toBeGreaterThan(0)
    }
  })
})

// ─── 3. ACCESSIBILITY — Decision B: small-area animation, NEVER a strobe ──────────────
describe('pm6-5 — the cutscene never strobes the screen (Decision B)', () => {
  it('runs a whole act to completion with actors on screen and NO full-screen high-luminance fill', () => {
    // Step act 1 (the longest script) frame by frame to `done`, drawing every frame.
    // Two things must hold together: (a) the scene actually animates — at least one actor
    // blit is recorded across the run (else the safety check below is vacuous, the repo's
    // zero-canvas-guard trap); and (b) NO frame ever paints a full-screen bright fill.
    const cutscene = createAct1Cutscene(1)
    let sawActorBlit = false
    let sawStrobe = false
    for (let f = 0; f < 4000 && !cutscene.done; f++) {
      const ctx = drawFrame(intermissionGame(cutscene))
      if (spriteBlits(ctx).length > 0) sawActorBlit = true
      if (fullScreenFills(ctx).some((c) => isHighLuminance(c.fillStyle))) sawStrobe = true
      stepCutscene(cutscene)
    }
    expect(cutscene.done, 'precondition: act 1 reached its final gate within the frame budget').toBe(true)
    expect(sawActorBlit, 'no actor sprite was drawn across the whole act — the no-strobe check below would be vacuous').toBe(true)
    expect(sawStrobe, 'the cutscene painted a full-screen high-luminance fill — Decision B forbids it (the owner has photosensitive epilepsy)').toBe(false)
  })

  it('the full-screen-strobe guard has teeth — a real white flash IS flagged', () => {
    // Non-vacuity for the guard above: a synthetic full-frame white fillRect must trip
    // fullScreenFills + isHighLuminance, or the "no strobe" proof means nothing.
    const ctx = fakeCtx()
    ;(ctx as CanvasRenderingContext2D).fillStyle = '#ffffff'
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H)
    expect(
      fullScreenFills(ctx).some((c) => isHighLuminance(c.fillStyle)),
      'the guard let a full-frame white fill through — the no-strobe proof above is vacuous',
    ).toBe(true)
  })
})

// ─── 4. Act 3 opens already-torn (the worm) — the pm6-3 tableau reaches the frame ─────
describe('pm6-5 — act 3 opens as the worm (pm6-3)', () => {
  it('act 3 renders a torn/worm ghost from its first frame (it opens `ripped`)', () => {
    // createAct3Cutscene opens with blinky.ripped === true (the torn sheet from act 2 now
    // crawling). Its opening frame must already read as the worm, distinct from an intact
    // Blinky in the same opening pose.
    const worm = createAct3Cutscene(1)
    expect(worm.blinky.ripped, 'precondition: act 3 opens with a ripped ghost').toBe(true)
    const intact = createAct3Cutscene(1)
    intact.blinky.ripped = false
    const intactCtx = drawFrame(intermissionGame(intact))
    expect(spriteBlits(intactCtx).length, 'precondition: the intact scene drew actors').toBeGreaterThan(0)
    expect(
      blitSignature(drawFrame(intermissionGame(worm))),
      "act 3's opening worm renders identically to an intact ghost — the tattered ghost does not read on screen",
    ).not.toBe(blitSignature(intactCtx))
  })
})
