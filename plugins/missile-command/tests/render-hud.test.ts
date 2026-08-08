// plugins/missile-command/tests/render-hud.test.ts
//
// Story mc9-4 — RED phase (Tyr One-Handed / TEA). "Authentic stroke-font HUD and
// screen layout." Retire the monospace HUD. Today render.ts:208-213 paints the
// SCORE / AMMO / WAVE·xMULT readouts with `ctx.font = `${hud}px monospace`` and three
// `fillText` calls — the browser font. mc9-4 replaces those native text calls with the
// cabinet's own alphanumeric glyphs at the authentic top layout, keeping the
// HUD-figure rule intact (the score drawn is `state.score` VERBATIM, never re-derived).
//
// ─── FIDELITY NOTE (measured against the vendored ROM; see session Delivery Findings)
// Missile Command is a RASTER cabinet. Its alphanumerics are STAMPS, not vector
// strokes: an ASCII byte is mapped to a stamp address (CONVERT AN ASCII VALUE TO ITS
// STAMP ADDRESS, W3DSUP.MAC:1754) and blitted by WRITE A STAMP (W3DSUP.MAC:587) — the
// very stamp engine mc9-1 already ported into src/shell/stamps.ts. The score is a
// 3-byte BCD shown by DISPLAY 6 DIGITS / DSPNUM "WITH LEADING ZERO SUPPRESSION"
// (W3DSUP.MAC:2202). The story's "stroke-font / reuse @shared/font" wording is loose:
// @shared/font is TEMPEST's VECTOR font, a different alphabet. The AC's either/or lets
// Dev choose; the FAITHFUL choice is a missile-command-only STAMP glyph module (extend
// stamps.ts), NOT @shared/font. These tests are deliberately SOURCE-AGNOSTIC — every
// behavioural assertion below passes for a stamp GREEN OR a vector GREEN — so the
// fidelity call stays Dev's. The recommendation is recorded upstream, not enforced here.
//
// ─── PIXELS ARE THE REVIEWER'S JOB; MECHANISM + CONTENT-LINKAGE IS OURS ─────────
// The moment the HUD stops calling fillText, the drawn text STRING is gone — a node
// test with no real canvas can no longer read the digits, and whether the glyphs LOOK
// like the cabinet's font (and their exact placement) is an owner/reviewer screenshot
// at /missile-command/. So render-battle.test.ts's old `texts(...).toContain('90210')`
// checks are IMPOSSIBLE under the new mechanism (they are relocated here). What a node
// test CAN still pin, against a mark-recording mock, is:
//   A. the HUD abandons the browser font entirely (no fillText/strokeText, no
//      `monospace`) — the actual RED driver;
//   B. the score is drawn FROM state.score: a longer score paints strictly more HUD
//      marks (a content-blind fillText is one mark regardless), and each added digit
//      adds an IDENTICAL mark quantum — one glyph per character of String(state.score),
//      the verbatim / HUD-figure linkage. (Assumes DSPNUM's leading-zero suppression;
//      a zero-PADDED readout would keep the count constant and is correctly reddened.)
//   C. the score readout lives in the TOP band (authentic score-at-top layout);
//   D. the ammo and wave readouts are each content-driven; the multiplier readout is
//      guarded structurally (a value capped at one digit exposes no mark-count signal a
//      stamp font could carry);
//   E. the text path CITES the real ROM routines, verified against the vendored source
//      (byte-gated — skips on CI, the mc1 degradation pattern);
//   F. no premature src/shared extraction, and no glyph geometry leaks into src/core.
//
// The recording mock is content-BLIND to fillText (it counts one mark per call, whatever
// the string) — which is exactly why every "more digits → more marks" assertion is RED
// under today's monospace fillText and GREEN once real per-character glyphs are drawn.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { drawFrame } from '../src/shell/render.js'
import { createGame, type GameState } from '../src/core/game.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const shellDir = join(root, 'src', 'shell')
const coreDir = join(root, 'src', 'core')
const renderSrc = (): string => readFileSync(join(shellDir, 'render.ts'), 'utf8')

// A canvas comfortably larger than the 8-bit cabinet space (matches the sibling
// render-*.test.ts harnesses so the projection lands identically).
const W = 256
const H = 231

// ─── A 2D context that COUNTS every drawn primitive and records its Y + text-ness ──
// One datum per drawing op: its name, the Y coordinate it drew at, and whether it is a
// native-text op (fillText/strokeText). Y lets us prove WHERE the score is drawn; the
// text flag lets us prove the browser font is gone. Ops that carry no Y record NaN
// (excluded from the top-band filter, never counted as "in the top band").
interface HudMark {
  op: string
  y: number
  isText: boolean
}

// Which positional arg carries the Y coordinate, per op. Text ops are (text, x, y);
// bitmap blits are (img, dx, dy, ...); everything else records (x, y, ...).
const Y_ARG: Readonly<Record<string, number>> = {
  fillText: 2,
  strokeText: 2,
  drawImage: 2,
  putImageData: 2,
}

function hudCtx(): { ctx: CanvasRenderingContext2D; marks: HudMark[] } {
  const marks: HudMark[] = []
  const isTextOp = (op: string): boolean => op === 'fillText' || op === 'strokeText'
  const rec =
    (op: string) =>
    (...args: unknown[]): void => {
      const yi = Y_ARG[op] ?? 1
      const y = typeof args[yi] === 'number' ? (args[yi] as number) : NaN
      marks.push({ op, y, isText: isTextOp(op) })
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
    // Bitmap paths, counted too, so a stamp-based GREEN is not boxed out.
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

/** Marks for one frame. drawFrame is called with NO `wave` argument on purpose: the
 *  per-wave palette then stays fixed at INITIAL_WAVE while `state.wave` varies, so a
 *  frame differs ONLY in its HUD when we change score/wave/multiplier/ammo. */
function paint(state: GameState): HudMark[] {
  const { ctx, marks } = hudCtx()
  drawFrame(ctx, state, W, H)
  return marks
}
const total = (state: GameState): number => paint(state).length
const textMarks = (state: GameState): HudMark[] => paint(state).filter((m) => m.isText)
const topBandCount = (state: GameState, frac: number): number =>
  paint(state).filter((m) => m.y < H * frac).length

/** A "quiet" field: every city and base DEAD (so structures draw an ammo-independent
 *  rubble mark apiece), no enemies, default cursor. The only thing that varies between
 *  two quiet frames is the HUD — so a mark delta isolates a single readout. Dead bases
 *  matter: the mc9-1 base pyramid scales with ammo, so only a DEAD base makes the HUD
 *  the sole ammo-sensitive draw. */
function quiet(over: {
  score?: number
  wave?: number
  multiplier?: number
  ammo?: readonly number[]
} = {}): GameState {
  const g = createGame(1)
  return {
    ...g,
    score: over.score ?? 0,
    wave: over.wave ?? g.wave,
    multiplier: over.multiplier ?? g.multiplier,
    cities: g.cities.map((c) => ({ ...c, alive: false })),
    bases: g.bases.map((b, i) => ({ ...b, alive: false, ammo: over.ammo?.[i] ?? b.ammo })),
    icbms: [],
    abms: [],
    explosions: [],
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// A. AC1 — the HUD abandons the browser font (cabinet glyphs, not `${hud}px monospace`).
//    RED today: drawFrame calls fillText 3× with a monospace font (render.ts:210-213).
// ─────────────────────────────────────────────────────────────────────────────
describe('mc9-4 AC1 — the HUD abandons the browser font (cabinet glyphs, not monospace)', () => {
  it('draws NO native text (no fillText/strokeText) for a fully-populated HUD', () => {
    const drawn = textMarks(quiet({ score: 123456, wave: 17, multiplier: 6, ammo: [10, 10, 10] }))
    expect(
      drawn.length,
      'the HUD must render the cabinet alphanumerics, not the browser font — today render.ts draws it ' +
        'with `ctx.font = `${hud}px monospace`` + fillText (render.ts:210-213); mc9-4 retires that path',
    ).toBe(0)
  })

  it('render.ts no longer selects a monospace browser font', () => {
    expect(renderSrc(), 'the `${hud}px monospace` HUD font must be gone from render.ts').not.toMatch(/monospace/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// B. AC1 — the score is drawn FROM state.score, one glyph per character (HUD-figure
//    rule). The recording mock is content-blind to fillText (one mark per call), so
//    both assertions are RED under today's monospace HUD and GREEN once each digit is
//    a real glyph. Same-digit scores hold glyph SHAPE constant, isolating COUNT.
// ─────────────────────────────────────────────────────────────────────────────
describe('mc9-4 AC1 — the score is drawn from state.score, one glyph per digit (HUD-figure rule)', () => {
  it('a longer score paints strictly more HUD marks (a content-blind fillText cannot)', () => {
    expect(
      total(quiet({ score: 123456 })),
      'the HUD score must be drawn from state.score — a 6-digit score paints more glyph marks than a ' +
        '1-digit one; a re-derived or content-blind readout would not grow',
    ).toBeGreaterThan(total(quiet({ score: 0 })))
  })

  it('each added digit adds an identical mark quantum — one glyph per character of String(state.score)', () => {
    const c1 = total(quiet({ score: 1 }))
    const c2 = total(quiet({ score: 11 }))
    const c3 = total(quiet({ score: 111 }))
    const c4 = total(quiet({ score: 1111 }))
    const d1 = c2 - c1
    const d2 = c3 - c2
    const d3 = c4 - c3
    expect(
      d1,
      'a repeated-digit score must grow the HUD mark count (real glyphs, not one content-blind fillText)',
    ).toBeGreaterThan(0)
    expect(d2, 'each identical added digit must add the SAME number of marks (one glyph per char)').toBe(d1)
    expect(d3, 'each identical added digit must add the SAME number of marks (one glyph per char)').toBe(d1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// C. AC1 — the score readout lives in the TOP band (authentic score-at-top layout).
//    Differencing two scores cancels every fixed mark (rubble, crosshair), leaving only
//    the extra score glyphs; asserting they are ALL in the top band pins the score to
//    the top of the screen, not mid/bottom. 0.4·H is generous (a glyph a few dozen px
//    tall near the top still clears it) so this is a gross-placement guard, not a
//    pixel check — exact placement is the reviewer's screenshot.
// ─────────────────────────────────────────────────────────────────────────────
describe('mc9-4 AC1 — the score readout is drawn in the TOP band (authentic layout)', () => {
  const FRAC = 0.4
  it('the extra glyphs of a longer score all fall in the top band', () => {
    const topDelta = topBandCount(quiet({ score: 123456 }), FRAC) - topBandCount(quiet({ score: 0 }), FRAC)
    const totalDelta = total(quiet({ score: 123456 })) - total(quiet({ score: 0 }))
    expect(topDelta, 'the score glyphs must be drawn in the top band (score sits at the top of the screen)').toBeGreaterThan(0)
    expect(
      topDelta,
      'EVERY extra score glyph must be in the top band — the score readout is at the top, not mid/bottom screen',
    ).toBe(totalDelta)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// D. AC1 — every readout survives the font swap. Score (above), ammo and wave are
//    content-driven (RED today — fillText is content-blind); the multiplier readout is
//    guarded structurally because its value is capped at one digit (min((wave+1)>>1,6)),
//    so a stamp font — one stamp per glyph regardless of which digit — exposes no
//    mark-count signal to isolate it behaviourally. The reviewer eyeballs the `x4`.
// ─────────────────────────────────────────────────────────────────────────────
describe('mc9-4 AC1 — ammo and wave readouts are content-driven; the multiplier is present', () => {
  it('the per-base ammo readout is content-driven (more ammo digits → more HUD marks)', () => {
    // Bases are DEAD in `quiet`, so the mc9-1 base pyramid draws ammo-independent
    // rubble; the only ammo-sensitive marks left are the HUD ammo readout.
    const few = total(quiet({ ammo: [1, 1, 1] })) //  "1 1 1"    — 3 digit glyphs
    const many = total(quiet({ ammo: [10, 10, 10] })) // "10 10 10" — 6 digit glyphs
    expect(
      many,
      'the HUD ammo readout must be drawn from each base ammo — a content-blind fillText cannot grow with the digit count',
    ).toBeGreaterThan(few)
  })

  it('the wave readout is content-driven and tracks state.wave', () => {
    const w1 = total(quiet({ wave: 1 })) //  "WAVE 1"  — 1 digit
    const w17 = total(quiet({ wave: 17 })) // "WAVE 17" — 2 digits
    expect(
      w17,
      'the HUD wave readout must be drawn from state.wave — a 2-digit wave paints more marks than a 1-digit one',
    ).toBeGreaterThan(w1)
  })

  it('the multiplier readout is still present in the HUD path (guarded structurally)', () => {
    expect(
      renderSrc(),
      'the HUD must still show the score multiplier (state.multiplier) after the font swap',
    ).toMatch(/multiplier/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// E. AC2 — the text path CITES the real ROM routines. RED today: render.ts cites the
//    stamp/palette/trail routines (587, 1067, 1221, 925, 1583, 1706) but none of the
//    text-draw path (1712 / 1754 / 2202).
// ─────────────────────────────────────────────────────────────────────────────
describe('mc9-4 AC2 — the HUD text path cites the real ROM routines', () => {
  it('cites CLEAR SCREEN (W3DSUP.MAC:1712)', () => {
    expect(renderSrc(), 'the HUD/clear path must cite CLEAR SCREEN (W3DSUP.MAC:1712)').toMatch(/W3DSUP\.MAC:1712\b/)
  })

  it('cites the alphanumeric-draw path — :1754 (ASCII→stamp) and/or :2202 (DISPLAY 6 DIGITS)', () => {
    expect(
      renderSrc(),
      'the HUD glyph path must cite the cabinet alphanumeric draw — CONVERT AN ASCII VALUE TO ITS STAMP ' +
        'ADDRESS (W3DSUP.MAC:1754) and/or DISPLAY 6 DIGITS / DSPNUM (W3DSUP.MAC:2202)',
    ).toMatch(/W3DSUP\.MAC:(1754|2202)\b/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// F. AC2 — the SECOND entry of the citation double-entry: the lines the story hands us
//    really ARE those routines in the vendored source, so a citation cannot be a
//    real-looking-but-wrong line. Byte-gated: the reference tree is gitignored, so this
//    skips on CI (the mc1/jt1-3 degradation pattern) and runs locally.
// ─────────────────────────────────────────────────────────────────────────────
const W3DSUP = join(root, 'reference', 'source', 'W3DSUP.MAC')
const sourceAvailable = existsSync(W3DSUP)
const romLine = (n: number): string => (readFileSync(W3DSUP, 'utf8').split('\n')[n - 1] ?? '').replace(/\r$/, '')

describe.skipIf(!sourceAvailable)('mc9-4 AC2 — the cited ROM lines really are those routines (byte-gated)', () => {
  it('W3DSUP.MAC:1712 is `.SBTTL CLEAR SCREEN`', () => {
    expect(romLine(1712)).toMatch(/\.SBTTL\s+CLEAR SCREEN/)
  })
  it('W3DSUP.MAC:1754 is `.SBTTL CONVERT AN ASCII VALUE TO ITS STAMP ADDRESS` (the alphanumeric draw)', () => {
    expect(romLine(1754)).toMatch(/\.SBTTL\s+CONVERT AN ASCII VALUE TO ITS STAMP ADDRESS/)
  })
  it('W3DSUP.MAC:2202 is `.SBTTL DISPLAY 6 DIGITS` (DSPNUM — the score display)', () => {
    expect(romLine(2202)).toMatch(/\.SBTTL\s+DISPLAY 6 DIGITS/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// G. AC2 — no premature src/shared extraction. The glyph source may reuse the EXISTING
//    @shared/font or be a missile-command-only src/shell module; it may NOT mint a new
//    @shared/* library (CLAUDE.md: extract to src/shared only once a SECOND game proves
//    the duplication). Passes today (render imports no @shared); reddens on a premature
//    @shared glyph module.
// ─────────────────────────────────────────────────────────────────────────────
describe('mc9-4 AC2 — no premature src/shared extraction', () => {
  it('render.ts imports no @shared module other than the pre-existing @shared/font', () => {
    const shared = [...renderSrc().matchAll(/from ['"](@shared\/[^'"]+)['"]/g)].map((m) => m[1].replace(/\.js$/, ''))
    const disallowed = shared.filter((s) => s !== '@shared/font')
    expect(
      disallowed,
      'a new missile-command glyph module belongs in src/shell, not a fresh src/shared library; only the ' +
        'existing @shared/font may be reused',
    ).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// H. AC3 — glyph geometry is SHELL render data; it must not land in src/core.
//    purity.test.ts guards the render→core direction generally; this names the intent
//    for the HUD glyphs directly. Passes today and after a correct GREEN.
// ─────────────────────────────────────────────────────────────────────────────
describe('mc9-4 AC3 — glyph geometry stays in src/shell, never src/core', () => {
  it('no src/core module carries HUD/font/glyph geometry', () => {
    const hits = readdirSync(coreDir).filter((f) => /font|glyph|hud/i.test(f))
    expect(hits, `glyph/HUD geometry is shell render data; found in core: ${hits.join(', ')}`).toEqual([])
  })
})
