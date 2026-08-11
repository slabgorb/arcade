// plugins/missile-command/tests/mc7-4-ladder-display.test.ts
//
// Story mc7-4 — RED phase (Han Solo / TEA). ROM-faithful high-score ladder
// DISPLAY: render the five seeded rungs INTO the attract high-score slot (the
// container mc6-5 reserved but left empty). Render/layout only — the table, the
// depth and the seeded default values already landed in core (mc7-1) and are NOT
// re-declared or re-pinned here. Ground truth is REV-01 (035820-01).
//
// ─── GROUND TRUTH the TEA measured against the vendored source ────────────────
// The attract screen paints a FIVE-rung ladder: the display-processor command
// `CDLADR =1C ;DISPLAY 5 HI LADDER` (W3COMN.MAC:97). Each rung is a SCORE column
// and an INITIALS column — SCLDRV/SCLDRH are the score-ladder coordinates
// (W3COMN.MAC:163/165) and INTLV the initials-ladder vertical (W3COMN.MAC:169).
// The ladder is stored ascending (best last, INIINI/SCOINI) and presented
// best-first — the descending order @shared/highscore maintains and the order
// core/highscore.DEFAULT_HIGH_SCORES already exposes (DFT 7500 … MJP 6950).
//
// ─── FREE-PLAY / DISPLAY-SCALE (inherited Design Deviation) ───────────────────
// The browser cabinet has no coin mechanism and a different aspect than the raster
// tube, so the ROM's absolute ladder pixel coordinates (SCLDRH=080 …) are not
// reproduced; mc6-5 already reserved the ladder REGION as highScoreSlot(w,h) under
// this same deviation. mc7-4 fills that region. The tests therefore pin the
// BEHAVIOUR (rungs painted inside the slot, best-first, score+initials, read from
// state) structurally — a node canvas cannot read the drawn glyphs — not exact px.
//
// ─── WHY THIS IS RED ──────────────────────────────────────────────────────────
// drawAttract paints the title, the HIGH SCORES header and the scroll banner but
// nothing INSIDE the highScoreSlot region (mc6-5 render.ts:367 — "the slot's rungs
// are mc7-4's to fill"). Every AC1–AC4 assertion below inspects that empty region
// and fails until the ladder is drawn from state.highScores. AC5 (the seeded
// default table is untouched) and AC6-depth are green-on-arrival LOCKS.
//
// ─── SUPERSEDES an mc6-5 lock (see this story's Delivery Findings) ────────────
// mc6-5 AC3 asserted the slot is a CONTAINER ONLY (swapping the lower rungs left
// the painted marks identical). mc7-4 renders those rungs, so that assertion is
// obsolete by design — mc6-5's own comment says "mc7-4 fills the slot". It is
// retired in tests/mc6-5-attract-presentation.test.ts as part of this RED (the
// ladder region is now owned by the tests below).

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { drawFrame } from '../src/shell/render.js'
import { createGame, type GameState } from '../src/core/game.js'
import {
  DEFAULT_HIGH_SCORES,
  MC_HIGH_SCORE_DEPTH,
  type MissileCommandHighScore,
} from '../src/core/highscore.js'
import { highScoreSlot } from '../src/shell/attract.js'

// ─── The vendored source (physical lines; the .MAC carry a stray byte so read as
//     utf8 — a plain grep false-empties; the tree is gitignored so this SKIPs on CI) ──
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const W3COMN = join(root, 'reference', 'source', 'W3COMN.MAC')
const sourceAvailable = existsSync(W3COMN)
const lineAt = (file: string, n: number): string => readFileSync(file, 'utf8').split('\n')[n - 1] ?? ''

// ─── A 2D context that records every drawn primitive's op + X/Y (mirrors mc6-5) ──
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
const slot = highScoreSlot(W, H)

const paint = (state: GameState): Mark[] => {
  const { ctx, marks } = recCtx()
  drawFrame(ctx, state, W, H, state.wave)
  return marks
}
// An attract frame at frame 0 (the sim's only clock is state.frame). Fresh game =
// the seeded default ladder in state.highScores.
const attractFrame = (): GameState => ({ ...createGame(1), phase: 'attract', frame: 0 })

// Marks whose Y falls inside the reserved slot region [slot.y, slot.y+slot.h) — the
// rungs live here; the HUD BEST figure and the HIGH SCORES header sit OUTSIDE it, so
// this band isolates the ladder from the rest of the attract screen.
//
// The self-playing attract demo (mc6-4) runs UNDER the presentation, so the slot band
// is not empty even before the ladder exists — at frame 0 it holds a stray vector
// shape (moveTo/lineTo). That shape is state.highScores-INDEPENDENT, so it cancels out
// of every diff below; the only presence check (AC1) filters to fillRect, the op the
// stamp-font glyphs paint with (drawGlyphText → ctx.fillRect), which the demo's vector
// primitives never produce inside the band.
const slotMarks = (marks: Mark[]): Mark[] =>
  marks.filter((m) => Number.isFinite(m.y) && m.y >= slot.y && m.y < slot.y + slot.h)
// Glyph (stamp-font) marks only — the ladder text, isolated from the demo's vectors.
const slotGlyphs = (marks: Mark[]): Mark[] => slotMarks(marks).filter((m) => m.op === 'fillRect')

const keyOf = (m: Mark): string => `${Math.round(m.x)},${Math.round(m.y)}`
const signature = (marks: Mark[]): string =>
  marks
    .map(keyOf)
    .sort()
    .join('|')

// The slot-band marks that DIFFER between two renders (present in exactly one), and
// the mean Y of that changed set — used to locate which rung a mutation touched.
function changedSlot(a: GameState, b: GameState): { keys: string[]; meanY: number } {
  const ka = new Set(slotMarks(paint(a)).map(keyOf))
  const kb = new Set(slotMarks(paint(b)).map(keyOf))
  const keys = [...new Set([...ka, ...kb])].filter((k) => ka.has(k) !== kb.has(k))
  const ys = keys.map((k) => Number(k.split(',')[1]))
  const meanY = ys.length ? ys.reduce((s, y) => s + y, 0) / ys.length : NaN
  return { keys, meanY }
}

// A copy of the default ladder with rung `i` replaced (render reads state.highScores
// VERBATIM — it does not re-sort — so rung `i` stays rung `i`).
const withRung = (i: number, entry: MissileCommandHighScore): GameState => ({
  ...attractFrame(),
  highScores: DEFAULT_HIGH_SCORES.map((e, j) => (j === i ? entry : e)),
})

describe('mc7-4 AC1 — the ladder is RENDERED into the slot (mc6-5 left it empty)', () => {
  it('drawFrame in attract paints stamp-font glyphs INSIDE the highScoreSlot region', () => {
    // fillRect glyphs only — the empty-slot demo vectors (moveTo/lineTo) do not count.
    expect(slotGlyphs(paint(attractFrame())).length).toBeGreaterThan(0)
  })

  it('the painted rungs read state.highScores — swapping the LOWER rungs changes the slot render', () => {
    // The direct inverse of the retired mc6-5 AC3 container-only lock: a container-only
    // slot left these identical; a filled ladder must differ. Rung 0 (BEST) is held
    // fixed so the HUD BEST figure — which legitimately reads highScores[0] — is not
    // what moves; only the lower rungs (1-4) change, and only in the slot band.
    const normal = slotMarks(paint(attractFrame()))
    const swapped = slotMarks(
      paint({
        ...attractFrame(),
        highScores: DEFAULT_HIGH_SCORES.map((e, i) => (i === 0 ? e : { name: 'ZZZ', score: 1234 })),
      }),
    )
    expect(signature(swapped)).not.toBe(signature(normal))
  })
})

describe('mc7-4 AC2 — one row per rung, best-first (CDLADR: 5 HI LADDER, best on top)', () => {
  it('every one of the five rungs is painted from its own data, stacked best→worst top→bottom', () => {
    // Mutating rung i in isolation must (a) change something in the slot — so that rung
    // is actually rendered from its entry — and (b) do so strictly lower on screen than
    // rung i-1. Strictly-increasing mean-Y across i=0..4 proves five DISTINCT rows in
    // best-first order without assuming the exact inter-rung pitch.
    const ys: number[] = []
    for (let i = 0; i < MC_HIGH_SCORE_DEPTH; i++) {
      const { keys, meanY } = changedSlot(attractFrame(), withRung(i, { name: 'ZZZ', score: 4321 }))
      expect(keys.length, `rung ${i} must be painted from its own entry`).toBeGreaterThan(0)
      ys.push(meanY)
    }
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i], `rung ${i} must sit below rung ${i - 1} (best-first order)`).toBeGreaterThan(ys[i - 1])
    }
  })
})

describe('mc7-4 AC3 — each rung shows BOTH its score and its initials (SCLDR + INTLV columns)', () => {
  it('changing only a rung score, and only its initials, each changes the slot render', () => {
    const baseSig = signature(slotMarks(paint(attractFrame())))
    // rung 0 is DFT / 7500. Vary ONE field at a time.
    const scoreOnly = signature(slotMarks(paint(withRung(0, { name: 'DFT', score: 1111 }))))
    const initsOnly = signature(slotMarks(paint(withRung(0, { name: 'ZZZ', score: 7500 }))))
    expect(scoreOnly, 'the rung score must be drawn').not.toBe(baseSig)
    expect(initsOnly, 'the rung initials must be drawn').not.toBe(baseSig)
  })
})

describe('mc7-4 AC4 — reads state.highScores VERBATIM (no re-seed, deterministic, clock-free)', () => {
  it('renders whatever table is in state, not a hard-coded default', () => {
    const custom: MissileCommandHighScore[] = Array.from({ length: MC_HIGH_SCORE_DEPTH }, (_, i) => ({
      name: 'AAA',
      score: 9000 - i * 100,
    }))
    const def = signature(slotMarks(paint(attractFrame())))
    const cus = signature(slotMarks(paint({ ...attractFrame(), highScores: custom })))
    expect(cus).not.toBe(def)
  })

  it('the same attract frame renders the ladder identically twice (no hidden entropy)', () => {
    expect(signature(slotMarks(paint(attractFrame())))).toBe(signature(slotMarks(paint(attractFrame()))))
  })

  it('iterates the actual table length — a shorter ladder paints fewer rungs and never throws', () => {
    // lang-review TS #4: the render must walk state.highScores, not blindly index
    // [0..4] (which would read `undefined` on a short table and crash on `.score` /
    // `.name`). The seeded table is always five deep, but a defensive render tolerates
    // fewer. A 2-rung table must paint STRICTLY FEWER glyphs than the full five.
    const two: MissileCommandHighScore[] = [DEFAULT_HIGH_SCORES[0], DEFAULT_HIGH_SCORES[1]]
    const full = () => slotGlyphs(paint(attractFrame())).length
    const short = () => slotGlyphs(paint({ ...attractFrame(), highScores: two })).length
    expect(() => short()).not.toThrow()
    expect(short()).toBeLessThan(full())
  })

  it.skipIf(!existsSync(join(root, 'src', 'shell', 'attract.ts')))(
    'attract.ts uses no wall clock or entropy (Date / performance.now / requestAnimationFrame / Math.random)',
    () => {
      const src = readFileSync(join(root, 'src', 'shell', 'attract.ts'), 'utf8')
      const code = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
      expect(code).not.toMatch(/\bDate\b|performance\.now|requestAnimationFrame|Math\.random/)
    },
  )
})

describe('mc7-4 AC5 — the seeded default ladder is UNTOUCHED (lock; mc7-1 owns the values)', () => {
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

describe('mc7-4 AC6 — the ladder ground truth: 5 rungs, score + initials columns', () => {
  it('MC_HIGH_SCORE_DEPTH matches the "DISPLAY 5 HI LADDER" ground truth', () => {
    expect(MC_HIGH_SCORE_DEPTH).toBe(5)
    expect(DEFAULT_HIGH_SCORES.length).toBe(MC_HIGH_SCORE_DEPTH)
  })

  it.skipIf(!sourceAvailable)('CDLADR is the "DISPLAY 5 HI LADDER" command (W3COMN.MAC:97)', () => {
    expect(lineAt(W3COMN, 97)).toContain('CDLADR')
    expect(lineAt(W3COMN, 97)).toContain('DISPLAY 5 HI LADDER')
  })

  it.skipIf(!sourceAvailable)('a rung is a score column + an initials column (W3COMN.MAC:163/165/169)', () => {
    expect(lineAt(W3COMN, 163)).toContain('SCLDRV')
    expect(lineAt(W3COMN, 163)).toContain('VERTICAL COORDINATE OF SCORE LADDER')
    expect(lineAt(W3COMN, 165)).toContain('SCLDRH')
    expect(lineAt(W3COMN, 169)).toContain('INTLV')
    expect(lineAt(W3COMN, 169)).toContain('VERTICAL COORDINATE OF INITIALS LADDER')
  })
})
