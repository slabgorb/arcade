// plugins/missile-command/tests/render-ground.test.ts
//
// Story mc10-2 — RED phase (Han Solo / TEA). The shell (src/shell/render.ts,
// drawFrame) must draw the GROUND landmass — the yellow terrain band along the
// field bottom that cities and bases sit ON — instead of leaving them floating
// on the black backdrop. The GROUND legend slot is COL001 (W3DSUP.MAC:1706),
// already present in the per-wave palette (SLOT.GROUND, palette.ts); wave 1's
// GROUND code is CYELLO. render.ts CURRENTLY SKIPS this slot — its module header
// says so verbatim ("The legend's GROUND slot (COL001) has no on-screen element
// in this clone, so it is not drawn").
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// drawFrame paints sky, cities, bases, ICBMs, ABMs, blasts, crosshair and HUD,
// but nothing in the GROUND colour and nothing as a bottom-of-field band. So:
//   • no fillRect carries the GROUND-slot colour            → the "drawn" tests redden
//   • no wide mark spans the bottom band                    → the extent test reddens
//   • render.ts (code, comments stripped) never names SLOT.GROUND → the wiring guard reddens
// All go green when Dev draws the GROUND band from hue(SLOT.GROUND), behind the
// structures. NO signature change and NO palette change are needed — drawFrame is
// already wave-aware and SLOT.GROUND already resolves — so this file imports the
// real symbols and fails on BEHAVIOUR, never on types (tsc stays green in RED).
//
// ─── WHAT WE PIN vs WHAT WE DON'T ────────────────────────────────────────────
// Pixel-exact terrain shape is the Reviewer's screenshot at /missile-command/, not
// a node test's job. We pin only: the GROUND colour is drawn, it reaches across the
// field near the bottom, it is sourced PER WAVE from the palette (not a hardcoded
// yellow), and it is painted UNDER the structures so they read as sitting on it.
// The band may be one wide rect or many tiled rects — the assertions accept both.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { drawFrame } from '../src/shell/render.js'
import { createGame, type GameState } from '../src/core/game.js'
import { paletteForWave, rgbCss, SLOT } from '../src/shell/palette'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// Same canvas the sibling render tests use, so projection lands identically.
const W = 256
const H = 231

// ─── A recording ctx that SNAPSHOTS the active fill/stroke at each primitive ──
// (mirrors render-palette.test.ts). The GROUND is a claim about BOTH colour and
// position, so we need the fill style live at the moment of each fillRect.
interface Mark {
  op: string
  x: number
  y: number
  w?: number
  fill: string
  stroke: string
}
function recordingCtx(): { ctx: CanvasRenderingContext2D; marks: Mark[] } {
  const marks: Mark[] = []
  const api: Record<string, unknown> = { fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, globalAlpha: 1, font: '' }
  const snap = (): { fill: string; stroke: string } => ({ fill: String(api.fillStyle), stroke: String(api.strokeStyle) })
  const xy =
    (op: string) =>
    (x: number, y: number, w?: number): void => {
      marks.push({ op, x, y, w, ...snap() })
    }
  const noop = (): void => {}
  Object.assign(api, {
    fillRect: xy('fillRect'),
    strokeRect: xy('strokeRect'),
    rect: xy('rect'),
    moveTo: xy('moveTo'),
    lineTo: xy('lineTo'),
    arc: xy('arc'),
    ellipse: xy('ellipse'),
    fillText: (t: string, x: number, y: number): void => void marks.push({ op: 'fillText', x, y, ...snap() }),
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
  })
  return { ctx: api as unknown as CanvasRenderingContext2D, marks }
}

/** Draw a state at a wave to a fresh recording ctx and return the marks. */
function paintAtWave(state: GameState, wave?: number): Mark[] {
  const { ctx, marks } = recordingCtx()
  drawFrame(ctx, state, W, H, wave)
  return marks
}

/** The canvas-ready colour of the GROUND slot (COL001) for a wave — from the module. */
const groundCss = (wave: number): string => rgbCss(paletteForWave(wave)[SLOT.GROUND])

/** The full-canvas background clear (fillRect at 0,0 spanning the width) — excluded
 *  from GROUND detection so a wave whose sky equals its ground can't be mistaken. */
const isBackgroundClear = (m: Mark): boolean => m.op === 'fillRect' && m.x === 0 && m.y === 0 && (m.w ?? 0) === W

/** Every fillRect painted in this wave's GROUND colour (minus the background clear). */
const groundMarks = (marks: Mark[], wave: number): Mark[] =>
  marks.filter((m) => m.op === 'fillRect' && m.fill === groundCss(wave) && !isBackgroundClear(m))

/** Horizontal span covered by a set of marks (rightmost edge − leftmost x). */
const horizontalReach = (ms: Mark[]): number =>
  Math.max(...ms.map((m) => m.x + (m.w ?? 0))) - Math.min(...ms.map((m) => m.x))

// Park the crosshair away from the structure columns (mirrors render-palette.test.ts).
const AWAY = { h: 5, v: 210 }
const withCursor = (s: GameState): GameState => ({ ...s, cursor: AWAY })
const freshField = (): GameState => withCursor(createGame(1)) // all six cities + three bases alive

describe('mc10-2 — the GROUND landmass is drawn along the field bottom in the GROUND-slot colour', () => {
  it('wave 1: at least one fillRect carries the GROUND (COL001) colour — today none does', () => {
    const g = groundMarks(paintAtWave(freshField(), 1), 1)
    expect(g.length, 'drawFrame must paint the GROUND band (render.ts currently skips COL001)').toBeGreaterThan(0)
  })

  it('wave 1: the GROUND colour is CYELLO, taken from the existing palette (no palette change)', () => {
    // Pins AC2: the wave-1 GROUND code is CYELLO → rgb(255,255,0). A regression to the
    // palette table (or a wrong slot) would move this value and redden here.
    expect(groundCss(1)).toBe('rgb(255, 255, 0)')
  })

  it('wave 1: the GROUND reaches across the field near the bottom (a landmass, not a speck)', () => {
    const g = groundMarks(paintAtWave(freshField(), 1), 1)
    expect(g.length, 'GROUND band must be drawn before its extent can be asserted').toBeGreaterThan(0)
    expect(
      g.some((m) => m.y >= H * 0.5),
      'some GROUND mark must sit in the bottom half of the field (the terrain is at the field bottom)',
    ).toBe(true)
    expect(
      horizontalReach(g),
      'the GROUND must span at least half the field width so cities/bases sit on land, not on a sliver',
    ).toBeGreaterThanOrEqual(W * 0.5)
  })
})

describe('mc10-2 — the GROUND colour is sourced PER WAVE from the palette, not a hardcoded yellow', () => {
  // The GROUND slot recolours with the wave like every other element (mc9-2). A
  // hardcoded rgb(255,255,0) would satisfy wave 1 but MISS wave 5 (GROUND=CBLUE) and
  // wave 13 (GROUND=CGREEN), so those two waves are the trap the hardcode falls into.
  it('sanity: the GROUND colour actually differs across waves 1, 5 and 13', () => {
    expect(groundCss(5), 'wave 5 GROUND must differ from wave 1 (else this test proves nothing)').not.toBe(groundCss(1))
    expect(groundCss(13), 'wave 13 GROUND must differ from wave 1').not.toBe(groundCss(1))
  })

  it.each([1, 5, 13])('wave %i draws a GROUND band in that wave\'s own COL001 colour', (wave) => {
    const g = groundMarks(paintAtWave(freshField(), wave), wave)
    expect(
      g.length,
      `wave ${wave} must draw the GROUND in its per-wave palette colour ${groundCss(wave)} (not a fixed yellow)`,
    ).toBeGreaterThan(0)
  })
})

describe('mc10-2 — cities and bases sit ON the ground: the GROUND is painted UNDER the structures', () => {
  it('wave 1: every GROUND mark is drawn after the background clear and before the first structure mark', () => {
    const marks = paintAtWave(freshField(), 1)
    const g = groundMarks(marks, 1)
    expect(g.length, 'GROUND must be drawn before draw-order can be asserted').toBeGreaterThan(0)

    // Structure fills at wave 1: CITY(TOP)=COL111, CITY(BOTTOM)=COL011, ABMS=COL110.
    const structureColours = new Set(
      [SLOT.CITY_TOP, SLOT.CITY_BOTTOM, SLOT.ABMS].map((slot) => rgbCss(paletteForWave(1)[slot])),
    )
    const firstStructureIdx = marks.findIndex((m) => m.op === 'fillRect' && structureColours.has(m.fill))
    expect(firstStructureIdx, 'the cities/bases must still be drawn').toBeGreaterThan(-1)

    const bgIdx = marks.findIndex(isBackgroundClear)
    const groundIdxs = marks.map((m, i) => (m.op === 'fillRect' && m.fill === groundCss(1) && !isBackgroundClear(m) ? i : -1)).filter((i) => i >= 0)

    expect(Math.min(...groundIdxs), 'the GROUND must be painted OVER the cleared field, not before it').toBeGreaterThan(bgIdx)
    expect(
      Math.max(...groundIdxs),
      'the GROUND must be painted UNDER the structures (all GROUND marks precede the first city/base), so they read as sitting on it',
    ).toBeLessThan(firstStructureIdx)
  })
})

describe('mc10-2 — render.ts is actually wired to the GROUND slot (not just commented about)', () => {
  const renderSrc = readFileSync(join(root, 'src', 'shell', 'render.ts'), 'utf8')
  // Strip comments first (mc9-2 review precedent): the module header NAMES the GROUND
  // slot in prose ("COL001", "GROUND slot") while explaining it is NOT drawn, so a
  // whole-file match would pass on that comment alone. Anchor to real CODE only.
  const code = renderSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

  it('references SLOT.GROUND on the paint path (a real expression, not a comment)', () => {
    expect(code, 'render.ts must read the GROUND colour via SLOT.GROUND to draw the landmass').toMatch(/\bSLOT\.GROUND\b/)
  })
})
