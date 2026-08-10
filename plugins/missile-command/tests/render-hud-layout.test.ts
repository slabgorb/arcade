// plugins/missile-command/tests/render-hud-layout.test.ts
//
// Story mc10-3 — RED phase (Tyr One-Handed / TEA). "Rebuild the HUD to the authentic
// layout." mc9-4 shipped the byte-exact ROM STAMP font (glyphs.ts == W3DSUP NUMBER
// :3552 / LETTER :3574, verified) but wired it into an INVENTED layout: three
// left-aligned readouts — `SCORE {score}`, `AMMO {a b c}`, `WAVE {w}  X{mult}` — drawn
// oversized (gp = height/120) in the top-left corner (render.ts:252-268). The owner's
// side-by-side against the cabinet (2026-08-09) shows this is wrong. mc10-3 strips it to
// the authentic layout:
//   • the score is CENTERED numeric (no `SCORE` label), with a high-score readout;
//   • the AMMO readout is DELETED — ammo is already shown by the mc9-1 base stacks;
//   • the WAVE readout (and the `X1` multiplier text) is DELETED from the top-left;
//   • the multiplier moves to the BOTTOM-CENTER, drawn as `nX` (digit then X);
//   • the oversized `gp = height/120` scale is reduced.
// The ROM font (glyphs.ts) is kept UNCHANGED — this is a layout/scale story, not a font
// story (block F locks the glyph bytes).
//
// ─── WHAT A NODE TEST CAN PIN — and what is the reviewer's screenshot ────────────────
// As in mc9-4: the drawn text STRING is gone the moment the HUD stops calling fillText
// (it draws real stamp glyphs as fillRect pixels), so a node test cannot READ the digits
// or judge whether the glyphs LOOK authentic or sit at pixel-exact positions — that is an
// owner/reviewer screenshot at /missile-command/. What a mark-recording mock CAN pin,
// without hard-coding the layout math the story is free to choose, is BEHAVIOUR:
//   A. the retired readouts are inert — varying ammo / varying wave no longer changes any
//      HUD pixel (AMMO / WAVE readouts deleted);
//   B. a high-score readout EXISTS and is drawn from the ladder (a longer top score paints
//      more marks), in the top band;
//   C. the score is CENTERED, not left-aligned under a label — its pixel centroid is
//      INVARIANT to digit count (a left-anchored block shifts right as it grows; a centered
//      one grows symmetrically and does not);
//   D. the multiplier is relocated to the BOTTOM band (not top-left), still drawn from
//      state.multiplier, roughly horizontally centered;
//   E. the glyph scale is strictly SMALLER than the oversized height/120;
//   F. the ROM glyph bytes are UNCHANGED (a lock, not a driver).
// Every geometric assertion DISCOVERS the layout from the marks (centroid, band, inferred
// glyph pitch) rather than asserting a hard-coded x/y/gp, so any faithful GREEN passes.
//
// ─── LAYOUT ASSUMPTION (recorded, not silently baked in) ─────────────────────────────
// "centered numeric score + high score" (story title + epic mc10 item 3, Architect
// diagnosis verified against primary source) is read here as: the SCORE is horizontally
// centered. If a faithful reading of the cabinet turns out to place the score elsewhere
// (e.g. score-left / hi-centre), that is a design deviation for Dev/reviewer to raise —
// the centroid-invariance test (block C) is the one place this assumption has teeth, and
// it is deliberately gross (a whole-band centroid within a few % of invariant), not a
// pixel check.

import { describe, it, expect } from 'vitest'
import { drawFrame } from '../src/shell/render.js'
import { glyphRows } from '../src/shell/glyphs.js'
import { createGame, type GameState } from '../src/core/game.js'
import type { MissileCommandHighScore } from '../src/core/highscore.js'

// ─── A 2D context that records every drawn primitive's op + X/Y (mirrors render-hud) ──
interface HudMark {
  op: string
  x: number
  y: number
  isText: boolean
}
const Y_ARG: Readonly<Record<string, number>> = { fillText: 2, strokeText: 2, drawImage: 2, putImageData: 2 }
const X_ARG: Readonly<Record<string, number>> = { fillText: 1, strokeText: 1, drawImage: 1, putImageData: 1 }

function hudCtx(): { ctx: CanvasRenderingContext2D; marks: HudMark[] } {
  const marks: HudMark[] = []
  const isTextOp = (op: string): boolean => op === 'fillText' || op === 'strokeText'
  const coord = (args: unknown[], i: number): number => (typeof args[i] === 'number' ? (args[i] as number) : NaN)
  const rec =
    (op: string) =>
    (...args: unknown[]): void => {
      marks.push({ op, x: coord(args, X_ARG[op] ?? 0), y: coord(args, Y_ARG[op] ?? 1), isText: isTextOp(op) })
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
    putImageData: rec('putImageData'),
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

// A descending high-score ladder whose BEST (index 0) is `top`, so the render reads the
// same value whether it shows highScores[0] or max(state.score, highScores[0]).
function ladder(top: number): MissileCommandHighScore[] {
  const names = ['AAA', 'BBB', 'CCC', 'DDD', 'EEE']
  return names.map((name, i) => ({ name, score: Math.max(0, top - i) }))
}

interface FieldOver {
  score?: number
  wave?: number
  multiplier?: number
  ammo?: readonly number[]
  highTop?: number
}

// A "quiet" field: every city and base DEAD (so structures draw an ammo-INDEPENDENT rubble
// mark apiece — the mc9-1 base pyramid scales with ammo only while ALIVE), no enemies,
// default cursor. The ONLY thing that varies between two quiet frames is the HUD, so a
// mark delta isolates a single readout. drawFrame is called with NO `wave` arg, so the
// palette stays fixed at INITIAL_WAVE while state.wave varies — a wave change then touches
// the HUD alone (its removal is fully observable).
function field(over: FieldOver = {}): GameState {
  const g = createGame(1)
  return {
    ...g,
    score: over.score ?? 0,
    wave: over.wave ?? g.wave,
    multiplier: over.multiplier ?? g.multiplier,
    highScores: over.highTop !== undefined ? ladder(over.highTop) : g.highScores,
    cities: g.cities.map((c) => ({ ...c, alive: false })),
    bases: g.bases.map((b, i) => ({ ...b, alive: false, ammo: over.ammo?.[i] ?? b.ammo })),
    icbms: [],
    abms: [],
    explosions: [],
  }
}

function paint(state: GameState, w: number, h: number): HudMark[] {
  const { ctx, marks } = hudCtx()
  drawFrame(ctx, state, w, h)
  return marks
}
const total = (state: GameState, w: number, h: number): number => paint(state, w, h).length
const keySet = (state: GameState, w: number, h: number): Set<string> =>
  new Set(paint(state, w, h).map((m) => `${m.op}:${Math.round(m.x)}:${Math.round(m.y)}`))
const sameKeys = (a: Set<string>, b: Set<string>): boolean => a.size === b.size && [...a].every((k) => b.has(k))
const symDiff = (a: Set<string>, b: Set<string>): string[] =>
  [...a].filter((k) => !b.has(k)).concat([...b].filter((k) => !a.has(k)))
const yOf = (key: string): number => Number(key.split(':')[2])
const xOf = (key: string): number => Number(key.split(':')[1])

// Sibling render-*.test.ts harness size for band/relocation checks.
const W = 256
const H = 231
// A production-scale surface for the centroid + glyph-pitch checks (round(H/120) needs
// headroom, and a left-aligned block must be unambiguously off-centre).
const BIG_W = 960
const BIG_H = 720

// ─────────────────────────────────────────────────────────────────────────────
// A. The retired top-left readouts are INERT — the AMMO and WAVE lines are deleted.
//    RED today: render.ts draws `AMMO {a b c}` and `WAVE {w} …`, so both vary the HUD.
// ─────────────────────────────────────────────────────────────────────────────
describe('mc10-3 — the top-left AMMO and WAVE readouts are deleted', () => {
  it('varying per-base ammo no longer changes any HUD pixel (ammo is shown by the base stacks, mc9-1)', () => {
    // Bases are DEAD, so ammo has no effect on the base pyramid either — after mc10-3 the
    // frame is byte-identical regardless of ammo. Today the `AMMO {a b c}` line makes it
    // differ (a 2-digit ammo paints more glyphs), so this is RED until the readout is gone.
    expect(
      sameKeys(keySet(field({ ammo: [1, 1, 1] }), W, H), keySet(field({ ammo: [10, 10, 10] }), W, H)),
      'the HUD must not draw an AMMO readout — ammo is shown by the base stacks (mc9-1); changing ammo ' +
        'must leave every HUD pixel identical',
    ).toBe(true)
  })

  it('varying state.wave no longer changes any HUD pixel (the WAVE readout is deleted)', () => {
    // The palette is pinned at INITIAL_WAVE (no `wave` arg to drawFrame) and the multiplier
    // is held fixed, so state.wave touches ONLY the (now-deleted) WAVE readout. Today the
    // `WAVE {w}` line grows with the wave's digit count → RED until removed.
    expect(
      sameKeys(keySet(field({ wave: 1 }), W, H), keySet(field({ wave: 17 }), W, H)),
      'the HUD must not draw a WAVE readout — changing state.wave must leave every HUD pixel identical',
    ).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// B. A HIGH-SCORE readout is added and drawn from the ladder, in the top band.
//    RED today: drawFrame never reads state.highScores, so the high score is invisible.
// ─────────────────────────────────────────────────────────────────────────────
describe('mc10-3 — a high-score readout is drawn from the ladder (top band)', () => {
  it('a longer top high-score paints strictly more HUD marks (the readout is drawn from highScores[0])', () => {
    // score is 0 in both frames, so the shown high score is highScores[0] under either the
    // "show BEST" or "show max(score, BEST)" reading. A 1-digit vs 7-digit BEST must differ.
    expect(
      total(field({ highTop: 7 }), W, H),
      'the HUD must draw a high-score readout from the ladder — a 7-digit BEST paints more glyph marks ' +
        'than a 1-digit one; today no high score is drawn at all',
    ).toBeLessThan(total(field({ highTop: 7_777_777 }), W, H))
  })

  it('every extra high-score glyph falls in the top band', () => {
    const topFrac = 0.5
    const inTop = (state: GameState): number => paint(state, W, H).filter((m) => m.y < H * topFrac).length
    const totalDelta = total(field({ highTop: 7_777_777 }), W, H) - total(field({ highTop: 7 }), W, H)
    const topDelta = inTop(field({ highTop: 7_777_777 })) - inTop(field({ highTop: 7 }))
    expect(totalDelta, 'the high-score readout must exist and grow with the ladder BEST').toBeGreaterThan(0)
    expect(
      topDelta,
      'the high-score readout is drawn in the top band — every extra glyph of a longer BEST must land there',
    ).toBe(totalDelta)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// C. The score is CENTERED, not left-aligned under a `SCORE` label. A centered block
//    grows symmetrically, so the drawn-pixel CENTROID is invariant to the score's digit
//    count; a left-anchored block (today's `SCORE {score}`) shifts right as it grows.
//    We difference nothing — we compare the whole top-band centroid across two score
//    lengths (everything else is byte-identical), so the shift isolates the score.
// ─────────────────────────────────────────────────────────────────────────────
describe('mc10-3 — the score readout is horizontally centered (not left-aligned under a label)', () => {
  const centroidX = (state: GameState): number => {
    const top = paint(state, BIG_W, BIG_H).filter((m) => m.op === 'fillRect' && Number.isFinite(m.x) && m.y < BIG_H * 0.5)
    return top.reduce((s, m) => s + m.x, 0) / top.length
  }
  it('the score centroid is invariant to digit count (a centered block, not a left-anchored one)', () => {
    const short = centroidX(field({ score: 1 })) //      "1"      centered → centroid ≈ W/2
    const long = centroidX(field({ score: 666_666 })) // "666666" centered → centroid ≈ W/2
    expect(
      Math.abs(long - short),
      'a centered numeric score keeps its pixel centroid fixed as it lengthens; today the left-aligned ' +
        '`SCORE {score}` block shifts right with each digit — so this delta is large until the score is centered',
    ).toBeLessThan(BIG_W * 0.03)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// D. The multiplier is relocated to the BOTTOM band as `nX`, still drawn from state.
//    Toggling ONLY state.multiplier between two values whose glyphs differ leaves every
//    fixed mark alone; the differing pixels ARE the multiplier digit. RED today: that
//    digit is drawn top-left (`WAVE {w}  X{mult}`), so it is nowhere near the bottom band.
// ─────────────────────────────────────────────────────────────────────────────
describe('mc10-3 — the multiplier is drawn bottom-center, still from state.multiplier', () => {
  it('the multiplier digit is drawn in the bottom band and stays value-driven', () => {
    const diff = symDiff(keySet(field({ multiplier: 1 }), W, H), keySet(field({ multiplier: 6 }), W, H))
    expect(
      diff.length,
      'the multiplier must still be drawn from state.multiplier — multiplier 1 vs 6 must paint different pixels',
    ).toBeGreaterThan(0)
    const belowBottom = diff.filter((k) => yOf(k) > H * 0.6)
    expect(
      belowBottom.length,
      'the multiplier readout must live in the BOTTOM band (bottom-center `nX`), not the top-left — every ' +
        'multiplier-sensitive pixel must fall below 0.6·H',
    ).toBe(diff.length)
  })

  it('the multiplier is roughly horizontally centered', () => {
    // Gross-placement guard (exact centering is the reviewer's screenshot): the centroid of
    // the multiplier-sensitive pixels sits in the central third of the width.
    const diff = symDiff(keySet(field({ multiplier: 1 }), W, H), keySet(field({ multiplier: 6 }), W, H))
    const midX = diff.reduce((s, k) => s + xOf(k), 0) / diff.length
    expect(midX, 'the multiplier is bottom-CENTER — its glyphs sit near the horizontal middle').toBeGreaterThan(W * 0.3)
    expect(midX, 'the multiplier is bottom-CENTER — its glyphs sit near the horizontal middle').toBeLessThan(W * 0.7)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// E. The oversized HUD scale is reduced. Today gp = max(1, round(height/120)); the glyph
//    pitch (the smallest vertical gap between adjacent lit stamp rows) equals that gp. We
//    DISCOVER the pitch from the marks and require it to be strictly smaller than the
//    legacy round(H/120) — any reduction passes; the exact authentic size is the reviewer's.
// ─────────────────────────────────────────────────────────────────────────────
describe('mc10-3 — the HUD glyph scale is smaller than the oversized height/120', () => {
  it('the inferred glyph pitch is strictly less than round(height/120)', () => {
    // '8' lights adjacent stamp rows, so the minimum top-band fillRect y-gap is exactly gp.
    const ys = [
      ...new Set(
        paint(field({ score: 888_888 }), BIG_W, BIG_H)
          .filter((m) => m.op === 'fillRect' && Number.isFinite(m.y) && m.y < BIG_H * 0.5)
          .map((m) => Math.round(m.y)),
      ),
    ].sort((a, b) => a - b)
    let pitch = Infinity
    for (let i = 1; i < ys.length; i++) {
      const d = ys[i] - ys[i - 1]
      if (d > 0 && d < pitch) pitch = d
    }
    const legacy = Math.round(BIG_H / 120)
    expect(pitch, 'the glyph pitch must be measurable (score glyphs drawn in the top band)').toBeLessThan(Infinity)
    expect(
      pitch,
      `the HUD scale must be reduced below the oversized gp = round(height/120) = ${legacy}px; today it equals it`,
    ).toBeLessThan(legacy)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// F. The ROM glyph font is UNCHANGED (a lock for the "keep glyphs.ts UNCHANGED" clause).
//    Green today; reddens only if a glyph byte is edited. glyphs.ts is byte-exact to the
//    ROM (verified against W3DSUP by render-hud.test.ts block F, byte-gated) — this is the
//    CI-safe regression lock that runs everywhere, so a layout change cannot quietly
//    reshape the font. Sampled glyphs: the digits the score/high-score use and the 'X' the
//    multiplier uses.
// ─────────────────────────────────────────────────────────────────────────────
describe('mc10-3 — the ROM glyph bytes are unchanged (font lock)', () => {
  const expected: Readonly<Record<string, readonly number[]>> = {
    '0': [0x00, 0x38, 0x44, 0xc6, 0xc6, 0xc6, 0x44, 0x38],
    '1': [0x00, 0x30, 0x70, 0x30, 0x30, 0x30, 0x30, 0xfc],
    '8': [0x00, 0x78, 0xc4, 0xe4, 0x78, 0x9e, 0x86, 0x7c],
    X: [0x00, 0xc6, 0xee, 0x7c, 0x38, 0x7c, 0xee, 0xc6],
  }
  for (const [ch, rows] of Object.entries(expected)) {
    it(`glyphRows('${ch}') is the verbatim ROM stamp (unchanged by the HUD relayout)`, () => {
      expect(Array.from(glyphRows(ch)), `glyphs.ts must not be reshaped by mc10-3 — '${ch}' bytes must hold`).toEqual(
        rows,
      )
    })
  }
})
