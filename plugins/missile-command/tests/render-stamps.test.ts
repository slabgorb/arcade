// plugins/missile-command/tests/render-stamps.test.ts
//
// Story mc9-1 — RED phase (Han Solo / TEA). "Authentic city and base stamps
// (retire the fillRect blocks and triangles)." mc3-5 shipped functional stand-ins
// on purpose — a live city is one `fillRect` block, a live base is a plain
// 3-vertex triangle — and deferred authentic geometry to mc9. This file reddens
// that placeholder and stays green once Dev ports the W3DSUP stamp layer:
//   • WRITE A STAMP        (W3DSUP.MAC:587)  — the 8-row glyph blitter
//   • DRAW ALL LIVING CITIES (W3DSUP.MAC:1067) — ALLCIT → DACITY, 3 stamps/city
//
// ─── PIXELS ARE THE REVIEWER'S JOB; WIRING IS OURS ───────────────────────────
// Exactly the division render-field.test.ts drew for mc1-2. Whether the drawn
// glyph *looks* like the cabinet's city is an owner/reviewer screenshot check at
// /missile-command/ — no node test can make it. What a node test CAN pin, without
// a real canvas, is the set of ways this silently goes wrong:
//   (a) the placeholder survives — a live city stays a single solid block, a live
//       base stays a plain triangle (behavioural: per-structure mark deltas);
//   (b) the geometry is hardcoded in render.ts instead of a cited src/shell data
//       module the way the story asks (wiring + citation scans);
//   (c) the authentic shapes leak into src/core, breaking the boundary (guard).
// The exact glyph and sub-pixel placement are deliberately NOT asserted here.
//
// ─── WHY EACH GROUP IS RED TODAY ─────────────────────────────────────────────
//   A. render.ts imports only ../core/*; no src/shell stamp-data module exists.
//   B. neither W3DSUP.MAC:587 nor :1067 appears in the render source.
//   C. a live city is one fillRect and its dead rubble is one fillRect → the live
//      vs dead mark delta is 0 (multi-part stamp geometry would make it > 0).
//   D. a live base is moveTo+lineTo+lineTo = 3 marks over a 1-mark rubble → delta
//      2 (a plain triangle exactly); authentic base stamp geometry exceeds it.
// All four go green when Dev replaces the placeholders with W3DSUP-derived stamp
// geometry sourced from a cited src/shell module.

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { drawFrame } from '../src/shell/render.js'
import { createGame, type GameState } from '../src/core/game.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const shellDir = join(root, 'src', 'shell')
const coreDir = join(root, 'src', 'core')

// A canvas comfortably larger than the cabinet's 8-bit space (H 0..255, V 0..222).
const W = 256
const H = 231

// The shell modules that predate mc9-1. A stamp-geometry module is a NEW file
// beyond these three — the "src/shell data module" the story requires.
const PREEXISTING_SHELL = new Set(['render.ts', 'input.ts', 'timebase.ts'])

// ─── A recording 2D context that COUNTS every coordinate-bearing primitive ───
// Same shape as render-field.test.ts's harness, but here the datum is the count:
// a live structure's authentic geometry emits more marks than a placeholder, and
// diffing two otherwise-identical frames isolates a single structure's marks.
function recordingCtx(): { ctx: CanvasRenderingContext2D; marks: string[] } {
  const marks: string[] = []
  const mark =
    (op: string) =>
    (..._args: unknown[]): void => {
      marks.push(op)
    }
  const noop = (): void => {}
  const api: Record<string, unknown> = {
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    globalAlpha: 1,
    font: '',
    fillRect: mark('fillRect'),
    strokeRect: mark('strokeRect'),
    rect: mark('rect'),
    moveTo: mark('moveTo'),
    lineTo: mark('lineTo'),
    arc: mark('arc'),
    ellipse: mark('ellipse'),
    fillText: mark('fillText'),
    strokeText: mark('strokeText'),
    // Bitmap paths, counted too, so Dev is not boxed into a single primitive.
    drawImage: mark('drawImage'),
    putImageData: mark('putImageData'),
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

/** Total marks drawn for one frame of the given state. */
function markCount(state: GameState): number {
  const { ctx, marks } = recordingCtx()
  drawFrame(ctx, state, W, H)
  return marks.length
}

/** A field state with exactly the given cities/bases alive; no enemies, default
 *  cursor/score — so any two such frames differ ONLY in the toggled structures. */
function fieldState(cityAlive: readonly boolean[], baseAlive: readonly boolean[]): GameState {
  const g = createGame()
  return {
    ...g,
    cities: g.cities.map((c, i) => ({ ...c, alive: cityAlive[i] })),
    bases: g.bases.map((b, i) => ({ ...b, alive: baseAlive[i] })),
  }
}

const NC = 6 // NCITY
const NB = 3 // NMISBA
const noneAlive = (n: number): boolean[] => Array(n).fill(false)
/** Toggle index `i` true in an otherwise all-dead array of length `n`. */
const onlyAt = (n: number, i: number): boolean[] => noneAlive(n).map((_, j) => j === i)

// Everything dead — the shared baseline both single-structure frames diff against.
const ALL_DEAD = fieldState(noneAlive(NC), noneAlive(NB))

// The render source = render.ts plus any NEW src/shell modules it draws from.
function renderSourceText(): string {
  const shellFiles = readdirSync(shellDir).filter((f) => f.endsWith('.ts'))
  return shellFiles.map((f) => readFileSync(join(shellDir, f), 'utf8')).join('\n')
}

// ─────────────────────────────────────────────────────────────────────────────
// A. AC1/AC2 — stamp geometry lives in a cited src/shell DATA MODULE that
//    render.ts consumes (not a literal baked into render.ts).
//    RED: the only shell modules are render/input/timebase, and render.ts imports
//    nothing shell-local.
// ─────────────────────────────────────────────────────────────────────────────
describe('mc9-1 AC1/AC2 — stamp geometry is a src/shell data module render consumes', () => {
  it('a NEW src/shell module (beyond render/input/timebase) holds the stamp geometry', () => {
    const newModules = readdirSync(shellDir)
      .filter((f) => f.endsWith('.ts'))
      .filter((f) => !PREEXISTING_SHELL.has(f))
    expect(
      newModules.length,
      'the story requires the city/base stamp geometry to live in its own src/shell data module',
    ).toBeGreaterThan(0)
  })

  it('render.ts imports the stamp geometry from a shell-local module', () => {
    const renderSrc = readFileSync(join(shellDir, 'render.ts'), 'utf8')
    expect(
      renderSrc,
      "render.ts must import stamp geometry from a sibling src/shell module (a './…' import), " +
        'not hardcode the shapes and not reach into core for them',
    ).toMatch(/import\s+[^;]*from\s+['"]\.\/[^'"]+['"]/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// B. AC2 — the render source CITES the two W3DSUP stamp routines.
//    RED: neither citation exists in any src/shell module today.
// ─────────────────────────────────────────────────────────────────────────────
describe('mc9-1 AC2 — the render source cites the W3DSUP stamp routines', () => {
  it('cites WRITE A STAMP at W3DSUP.MAC:587', () => {
    expect(
      renderSourceText(),
      'the shell render source must cite WRITE A STAMP (W3DSUP.MAC:587)',
    ).toMatch(/W3DSUP\.MAC:587\b/)
  })

  it('cites DRAW ALL LIVING CITIES at W3DSUP.MAC:1067', () => {
    expect(
      renderSourceText(),
      'the shell render source must cite DRAW ALL LIVING CITIES (W3DSUP.MAC:1067)',
    ).toMatch(/W3DSUP\.MAC:1067\b/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// C. AC1/AC3 — a LIVE city is multi-part stamp geometry, not a single solid
//    block, and it is drawn differently from its dead rubble.
//    Isolation: frame with ONLY city[0] alive vs the all-dead baseline differ in
//    exactly one structure, so the mark delta is city[0]'s (live − rubble).
//    RED: placeholder live city = 1 fillRect, rubble = 1 fillRect → delta 0.
// ─────────────────────────────────────────────────────────────────────────────
describe('mc9-1 AC1/AC3 — a live city is authentic stamp geometry, not a solid block', () => {
  const deadBaseline = markCount(ALL_DEAD)

  it('every live city draws strictly more marks than its dead rubble (multi-part stamp)', () => {
    for (let i = 0; i < NC; i++) {
      const liveOne = markCount(fieldState(onlyAt(NC, i), noneAlive(NB)))
      const delta = liveOne - deadBaseline
      expect(
        delta,
        `city ${i}: a live city must be drawn as multi-part stamp geometry (≥2 marks over its ` +
          `1-mark rubble), not the same single block — live−dead delta was ${delta}`,
      ).toBeGreaterThanOrEqual(2)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// D. AC1/AC3 — a LIVE base is stamp geometry, not a plain 3-vertex triangle.
//    RED: placeholder live base = moveTo+lineTo+lineTo = 3 marks over a 1-mark
//    rubble → delta 2 (a plain triangle, exactly). Authentic stamp exceeds it.
// ─────────────────────────────────────────────────────────────────────────────
describe('mc9-1 AC1/AC3 — a live base is authentic stamp geometry, not a plain triangle', () => {
  const deadBaseline = markCount(ALL_DEAD)

  it('every live base draws more marks than a plain triangle over its rubble', () => {
    for (let i = 0; i < NB; i++) {
      const liveOne = markCount(fieldState(noneAlive(NC), onlyAt(NB, i)))
      const delta = liveOne - deadBaseline
      expect(
        delta,
        `base ${i}: a live base must be authentic stamp geometry (a plain triangle is 3 marks over ` +
          `1-mark rubble → delta 2; authentic exceeds it) — live−dead delta was ${delta}`,
      ).toBeGreaterThanOrEqual(3)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// E. AC3 — a dead structure still draws (as rubble), and the whole live field is
//    richer than the whole dead field. A sanity floor that keeps a future
//    "draw nothing when dead" regression honest.
// ─────────────────────────────────────────────────────────────────────────────
describe('mc9-1 AC3 — dead structures still draw as rubble; live field is richer', () => {
  it('a fully-dead field still emits a rubble mark for each of the nine structures', () => {
    // All nine dead → at least nine rubble marks (plus crosshair/HUD). Never zero:
    // a dead city/base is rubble, not blank.
    expect(markCount(ALL_DEAD), 'nine rubble marks must survive when every structure is dead').toBeGreaterThanOrEqual(
      NC + NB,
    )
  })

  it('the fully-live field draws strictly more marks than the fully-dead field', () => {
    const live = markCount(fieldState(Array(NC).fill(true), Array(NB).fill(true)))
    const dead = markCount(ALL_DEAD)
    expect(live, 'live stamps must be richer than dead rubble across the whole field').toBeGreaterThan(dead)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// F. AC2 boundary — stamp geometry is SHELL render data; it must not land in
//    src/core (purity.test.ts guards the reverse direction; this names the intent
//    directly). Passes today and after a correct GREEN; reddens only if the
//    authentic shapes are put in core.
// ─────────────────────────────────────────────────────────────────────────────
describe('mc9-1 AC2 — stamp geometry stays in src/shell, never src/core', () => {
  it('no src/core module carries stamp geometry', () => {
    const coreStamp = readdirSync(coreDir).filter((f) => /stamp/i.test(f))
    expect(coreStamp, `stamp geometry is shell render data; found in core: ${coreStamp.join(', ')}`).toEqual([])
  })
})
