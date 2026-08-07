// plugins/missile-command/tests/render-palette.test.ts
//
// Story mc9-2 — RED phase (Han Solo / TEA). AC1/AC3: the shell (src/shell/render.ts,
// drawFrame) draws the field through the per-wave 8-colour palette — the background
// (sky), incoming ICBMs, structures and blasts pull their colour from
// paletteForWave(wave), NOT from the hard-coded functional hexes mc3 shipped.
//
// ─── THE WAVE SEAM (Delivery Finding, mc9-2 session) ─────────────────────────────
// `wave` does not reach render today: GameState has no wave field and nothing feeds
// one. The RED contract grows drawFrame with an OPTIONAL trailing `wave?` (the cp2-12
// render-arg precedent), defaulting to INITIAL_WAVE so the existing 4-arg callers stay
// green. Until GREEN adds it, drawFrame runs its old 4-arg body (wave ignored → the
// old hardcoded hue), so the palette assertions redden.
//
// tsc STAYS GREEN in RED: drawFrame is called through a wave-aware type alias, and the
// palette module symbols are read via a namespace cast (both `undefined` at runtime in
// RED → a test failure, never a compile error).

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { drawFrame } from '../src/shell/render.js'
import { createGame, type GameState } from '../src/core/game.js'
import * as palette from '../src/shell/palette'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// Same canvas the sibling render tests use, so projection lands identically.
const W = 256
const H = 231

// mc9-2 grows drawFrame's signature with a trailing `wave` (the cp2-12 render-arg
// precedent). `as unknown as` is the deliberate RED seam: the real body is still
// 4-arg, so a plain 5-arg call would be a tsc error until GREEN widens it.
type DrawWithWave = (c: CanvasRenderingContext2D, s: GameState, w: number, h: number, wave?: number) => void
const draw = drawFrame as unknown as DrawWithWave

// The palette surface, all-optional so a missing export is `undefined` (a RED test
// failure) rather than a TS2305 compile error.
interface Rgb {
  r: number
  g: number
  b: number
}
type Mc9_2 = {
  paletteForWave?: (wave: number) => readonly Rgb[]
  rgbCss?: (c: Rgb) => string
}
const p = palette as unknown as Mc9_2
function req<T>(v: T | undefined, name: string): T {
  if (v === undefined || v === null) {
    throw new Error(`palette.${name} is not implemented yet — GREEN (Yoda) adds it (mc9-2).`)
  }
  return v
}
/** The canvas-ready colour string for a wave's slot, computed from the module. */
const slotCss = (wave: number, slot: number): string => {
  const css = req(p.rgbCss, 'rgbCss')
  const pal = req(p.paletteForWave, 'paletteForWave')
  return css(pal(wave)[slot])
}

// Legend slot indices (W3DSUP.MAC:1706), COL000..COL111.
const SKY = 0
const ICBMS = 2

// ─── A recording ctx that SNAPSHOTS the active fill/stroke style at each draw ────
// The sibling render mocks drop the style (they only pin geometry). The palette is
// exactly a claim ABOUT the style, so this mock records `fillStyle`/`strokeStyle` as
// they stand at the moment of each primitive.
interface Mark {
  op: string
  x: number
  y: number
  w?: number
  text?: string
  fill: string
  stroke: string
}
function recordingCtx(): { ctx: CanvasRenderingContext2D; marks: Mark[] } {
  const marks: Mark[] = []
  const api: Record<string, unknown> = { fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, globalAlpha: 1, font: '' }
  const snap = (): { fill: string; stroke: string } => ({
    fill: String(api.fillStyle),
    stroke: String(api.strokeStyle),
  })
  const xy =
    (op: string) =>
    (x: number, y: number, w?: number): void => {
      marks.push({ op, x, y, w, ...snap() })
    }
  const text =
    (op: string) =>
    (t: string, x: number, y: number): void => {
      marks.push({ op, x, y, text: String(t), ...snap() })
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
    fillText: text('fillText'),
    strokeText: text('strokeText'),
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
  draw(ctx, state, W, H, wave)
  return marks
}

/** The full-canvas background clear (fillRect at 0,0 spanning the width). */
const backgroundMark = (marks: Mark[]): Mark | undefined =>
  marks.find((m) => m.op === 'fillRect' && m.x === 0 && m.y === 0 && m.w === W)

const projectX = (h: number): number => (h / 0x100) * W

// Park the crosshair away from the structure columns (mirrors render-battle.test.ts).
const AWAY = { h: 5, v: 210 }
const withCursor = (s: GameState): GameState => ({ ...s, cursor: AWAY })

describe('mc9-2 AC1 — the background (sky) is the wave palette COL000, not a hardcoded hex', () => {
  it.each([1, 9, 17])('at wave %i the full-canvas clear uses rgbCss(paletteForWave(wave)[SKY])', (wave) => {
    const bg = backgroundMark(paintAtWave(withCursor(createGame(1)), wave))
    expect(bg, 'drawFrame must clear the field with a full-canvas fillRect').toBeDefined()
    expect((bg as Mark).fill, `wave ${wave} sky must be the palette COL000`).toBe(slotCss(wave, SKY))
  })

  it('the background CHANGES between a CBLACK-sky wave (1) and a CWHITE-sky wave (17)', () => {
    // WV1COL sky = CBLACK; WVCCOL (wave 17) sky = CWHITE — visibly different backdrops.
    const bg1 = backgroundMark(paintAtWave(withCursor(createGame(1)), 1))
    const bg17 = backgroundMark(paintAtWave(withCursor(createGame(1)), 17))
    expect((bg1 as Mark).fill, 'wave 1 and wave 17 skies must differ (the palette is per-wave)').not.toBe(
      (bg17 as Mark).fill,
    )
  })
})

describe('mc9-2 AC1 — incoming ICBMs pull their colour from the wave palette (COL010)', () => {
  const bare = withCursor(createGame(1))
  const icbm = { origin: { h: 100, v: 222 }, target: { h: 100, v: 16 }, pos: { h: 100, v: 120 }, arrived: false }
  const oneIcbm: GameState = { ...bare, icbms: [icbm] }

  it.each([1, 9])('at wave %i some ICBM mark carries the palette ICBM colour', (wave) => {
    const want = slotCss(wave, ICBMS)
    const hx = projectX(icbm.pos.h)
    const drawn = paintAtWave(oneIcbm, wave)
      .filter((m) => m.text === undefined && !(m.op === 'fillRect' && m.x === 0 && m.y === 0))
      .filter((m) => Math.abs(m.x - hx) <= 12)
    const colours = new Set(drawn.flatMap((m) => [m.fill, m.stroke]))
    expect(
      colours.has(want),
      `wave ${wave} ICBM must be drawn in the palette COL010 (${want}); got ${[...colours].join(', ')}`,
    ).toBe(true)
  })
})

describe('mc9-2 AC1 — drawFrame without a wave defaults to wave 1 (existing 4-arg callers unaffected)', () => {
  it('draw(ctx, state, W, H) renders identically to draw(ctx, state, W, H, 1)', () => {
    const state = withCursor(createGame(1))
    const noWave = paintAtWave(state) // 4-arg call
    const wave1 = paintAtWave(state, 1)
    expect(noWave.map((m) => [m.op, m.fill, m.stroke])).toEqual(wave1.map((m) => [m.op, m.fill, m.stroke]))
  })
})

describe('mc9-2 AC1 — render.ts sources colours from the palette, not inline element hexes', () => {
  const renderSrc = readFileSync(join(root, 'src', 'shell', 'render.ts'), 'utf8')

  it('imports the palette module', () => {
    expect(renderSrc, "render.ts must import from './palette'").toMatch(/from ['"]\.\/palette(?:\.js)?['"]/)
  })

  it('selects a colour per wave (references paletteForWave / paletteCodesForWave)', () => {
    expect(renderSrc, 'render.ts must look the palette up by wave').toMatch(/palette(?:Codes)?ForWave/)
  })

  // The mc3 functional element hexes that AC1 retires — each element now pulls from the
  // palette, so its inline literal must be gone. (Crosshair/HUD '#fff' are NOT palette
  // slots and legitimately remain, so they are not scanned.)
  const RETIRED: ReadonlyArray<{ hex: string; element: string }> = [
    { hex: '#f80', element: 'ICBM (enemy) orange' },
    { hex: '#f44', element: 'ABM (player) red' },
    { hex: '#9f9', element: 'city top green' },
    { hex: '#6f6', element: 'city bottom green' },
    { hex: '#4cf', element: 'base blue' },
    { hex: '#ff0', element: 'blast yellow' },
  ]
  it.each(RETIRED)('the hardcoded $element ($hex) is gone — that element draws from the palette', ({ hex }) => {
    expect(renderSrc.includes(hex), `${hex} must no longer be a hardcoded literal in render.ts`).toBe(false)
  })
})
