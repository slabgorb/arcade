// plugins/missile-command/tests/render-stamps.test.ts
//
// Story mc9-1 — RED phase (Han Solo / TEA). "Authentic city and base stamps
// (retire the fillRect blocks and triangles)." mc3-5 shipped functional stand-ins
// on purpose — a live city is one `fillRect` block, a live base is a plain
// 3-vertex triangle — and deferred authentic geometry to mc9. This file reddens
// that placeholder and stays green once Dev ports the W3DSUP stamp layer:
//   • WRITE A STAMP        (W3DSUP.MAC:587)  — the 8-row glyph blitter
//   • DRAW ALL LIVING CITIES (W3DSUP.MAC:1067) — ALLCIT → DACITY, 4 stamps/city
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
import { NCITY, NMISBA } from '../src/core/field.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const shellDir = join(root, 'src', 'shell')
const coreDir = join(root, 'src', 'core')

// A canvas comfortably larger than the cabinet's 8-bit space (H 0..255, V 0..222).
const W = 256
const H = 231

// The shell modules that predate mc9-1. A stamp-geometry module is a NEW file
// beyond these three — the "src/shell data module" the story requires.
const PREEXISTING_SHELL = new Set(['render.ts', 'input.ts', 'timebase.ts'])

// ─── A 2D context that COUNTS every coordinate-bearing primitive ─────────────
// Named apart from render-field/render-battle's `recordingCtx` on purpose: those
// siblings record structured `Mark[]`; this one's datum is the op-name COUNT
// (string[]) — a live structure's authentic geometry emits more marks than a
// placeholder, and diffing two otherwise-identical frames isolates one structure.
function markCountingCtx(): { ctx: CanvasRenderingContext2D; marks: string[] } {
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
  const { ctx, marks } = markCountingCtx()
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

const NC = NCITY
const NB = NMISBA
const noneAlive = (n: number): boolean[] => Array(n).fill(false)
/** Toggle index `i` true in an otherwise all-dead array of length `n`. */
const onlyAt = (n: number, i: number): boolean[] => noneAlive(n).map((_, j) => j === i)

// Everything dead — the shared baseline both single-structure frames diff against.
const ALL_DEAD = fieldState(noneAlive(NC), noneAlive(NB))

// ─── Which shell module render.ts draws its stamp geometry from ──────────────
// The story requires the stamp geometry to live in its OWN cited src/shell data
// module that render.ts consumes — not baked into render.ts. We resolve that
// module structurally: the sibling './…' import in render.ts that pulls in the
// real stamp symbols. Naming those symbols (not "any ./ import") is what makes
// the wiring assertion enforce the wiring; scoping the citation scan to THIS
// module (not the whole shell dir) is what makes the citation guard bite —
// dropping a cite from the stamp module reddens even though render.ts keeps its
// own copy.
const STAMP_SYMBOLS = ['CITY_STAMPS', 'MISSILE_STACK'] as const

/** The sibling shell module render.ts imports the stamp geometry from — the `./…`
 *  import that pulls in every STAMP_SYMBOL. `file` is '' (and `imported` empty)
 *  when render.ts imports no such module. */
function stampModule(): { file: string; imported: readonly string[] } {
  const renderSrc = readFileSync(join(shellDir, 'render.ts'), 'utf8')
  for (const m of renderSrc.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+['"]\.\/([^'"]+\.js)['"]/g)) {
    const imported = m[1].split(',').map((s) => s.trim().replace(/^type\s+/, ''))
    if (STAMP_SYMBOLS.every((s) => imported.includes(s))) {
      return { file: m[2].replace(/\.js$/, '.ts'), imported }
    }
  }
  return { file: '', imported: [] }
}

/** Source text of that stamp module — the scope the citation guards police. */
function stampModuleText(): string {
  const { file } = stampModule()
  expect(file, 'render.ts imports no shell module exporting CITY_STAMPS + MISSILE_STACK').not.toBe('')
  return readFileSync(join(shellDir, file), 'utf8')
}

// ─────────────────────────────────────────────────────────────────────────────
// A. AC1/AC2 — stamp geometry lives in a NEW src/shell DATA MODULE that render.ts
//    consumes BY NAME (CITY_STAMPS + MISSILE_STACK), not a literal baked into
//    render.ts. RED before mc9-1: the only shell modules are render/input/timebase
//    and render.ts imports no such geometry.
// ─────────────────────────────────────────────────────────────────────────────
describe('mc9-1 AC1/AC2 — stamp geometry is a src/shell data module render consumes', () => {
  it('render.ts imports the real stamp symbols from a NEW sibling shell module', () => {
    const { file, imported } = stampModule()
    expect(
      file,
      'render.ts must import the stamp geometry (CITY_STAMPS + MISSILE_STACK) from a sibling src/shell module',
    ).not.toBe('')
    expect(
      PREEXISTING_SHELL.has(file),
      `the stamp geometry must live in its OWN new module, not a pre-existing one (${file})`,
    ).toBe(false)
    for (const sym of STAMP_SYMBOLS) {
      expect(imported, `render.ts must import ${sym} from ${file}`).toContain(sym)
    }
  })

  it('the imported stamp module actually exports that geometry', () => {
    const src = stampModuleText()
    for (const sym of STAMP_SYMBOLS) {
      expect(src, `the stamp module must export ${sym}`).toMatch(new RegExp(`export\\s+const\\s+${sym}\\b`))
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// B. AC2 — the stamp module render.ts consumes CITES the two W3DSUP routines.
//    Scoped to that module (not the whole shell dir): removing a cite from the
//    stamp module reddens even though render.ts carries its own copy.
//    RED before mc9-1: no stamp module exists to cite them.
// ─────────────────────────────────────────────────────────────────────────────
describe('mc9-1 AC2 — the stamp module cites the W3DSUP stamp routines', () => {
  it('cites WRITE A STAMP at W3DSUP.MAC:587', () => {
    expect(stampModuleText(), 'the stamp module must cite WRITE A STAMP (W3DSUP.MAC:587)').toMatch(/W3DSUP\.MAC:587\b/)
  })

  it('cites DRAW ALL LIVING CITIES at W3DSUP.MAC:1067', () => {
    expect(stampModuleText(), 'the stamp module must cite DRAW ALL LIVING CITIES (W3DSUP.MAC:1067)').toMatch(
      /W3DSUP\.MAC:1067\b/,
    )
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
