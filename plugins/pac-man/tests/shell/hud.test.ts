// tests/shell/hud.test.ts
//
// Story pm4-9 — the HUD layout. `maze.ts` reserves two black HUD bands the playfield
// never uses: the TOP band (rows 0-2, y < 24) and the BOTTOM band (rows 33-35,
// y >= 264). pm4-9 moved the readouts to the ROM-authentic arrangement so no HUD text
// bleeds onto the maze and the bottom band carries lives/level (where Pac-Man shows
// them):
//   • SCORE       — top band, left
//   • HIGH SCORE  — top band, centre (pacman.asm:36a5), value = persisted top (or 0)
//   • LIVES/LEVEL — BOTTOM band (lives left, level right)
//
// These tests pin the BAND each readout lands in (a y-coordinate assertion), which is
// exactly the regression the playtest caught: HIGH SCORE was bleeding onto the
// playfield and lives/level were missing from the bottom.

import { describe, it, expect } from 'vitest'
import { drawHud } from '../../src/shell/render'
import { LOGICAL_H } from '../../src/shell/layout'

// The reserved bands, in logical pixels (TILE_PX = 8; maze rows 0-35).
const TOP_BAND_MAX_Y = 24 // rows 0-2
const BOTTOM_BAND_MIN_Y = LOGICAL_H - 24 // rows 33-35 (264)

interface TextCall {
  text: string
  x: number
  y: number
}

function fakeCtx(): { ctx: CanvasRenderingContext2D; texts: TextCall[] } {
  const texts: TextCall[] = []
  const ctx = {
    fillStyle: '',
    font: '',
    textBaseline: 'alphabetic',
    textAlign: 'start',
    fillText: (text: string, x: number, y: number) => texts.push({ text, x, y }),
    fillRect: () => {},
    // pm4-11 makes drawHud blit sprites (lives + fruit) into the bottom band via
    // drawPacman/drawFruit; the ctx must answer these or the top-band tests crash.
    createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: () => {},
  } as unknown as CanvasRenderingContext2D
  return { ctx, texts }
}

const inTopBand = (c: TextCall): boolean => c.y < TOP_BAND_MAX_Y
const inPlayfield = (c: TextCall): boolean => c.y >= TOP_BAND_MAX_Y && c.y < BOTTOM_BAND_MIN_Y

describe('pm4-9 HUD layout (drawHud)', () => {
  it('draws the HIGH SCORE label in the TOP band, never bleeding onto the playfield', () => {
    const { ctx, texts } = fakeCtx()
    drawHud(ctx, 1440, 31415, 3, 1)
    const highScoreLabel = texts.find((c) => c.text === 'HIGH SCORE')
    expect(highScoreLabel, 'HIGH SCORE label must be drawn').toBeDefined()
    expect(inTopBand(highScoreLabel as TextCall), 'HIGH SCORE must sit in the top band (y < 24)').toBe(true)
  })

  it('shows the HIGH SCORE value (the persisted top score) in the top band', () => {
    const { ctx, texts } = fakeCtx()
    drawHud(ctx, 1440, 31415, 3, 1)
    const value = texts.find((c) => c.text === '31415')
    expect(value, 'the high-score value must be rendered').toBeDefined()
    expect(inTopBand(value as TextCall)).toBe(true)
  })

  it('renders a real 0 for an empty high score (no fabricated default)', () => {
    const { ctx, texts } = fakeCtx()
    drawHud(ctx, 0, 0, 3, 1)
    expect(texts.some((c) => c.text === '0')).toBe(true)
  })

  it('draws SCORE in the top band', () => {
    const { ctx, texts } = fakeCtx()
    drawHud(ctx, 1440, 0, 3, 1)
    const score = texts.find((c) => c.text.startsWith('SCORE'))
    expect(score, 'SCORE readout must be drawn').toBeDefined()
    expect(inTopBand(score as TextCall)).toBe(true)
  })

  // pm4-9 drew LIVES/LEVEL as text in the bottom band. pm4-11 replaces both with
  // real sprites (life icons + a fruit row) — so the bottom band carries NO text
  // any more. The sprite behaviour itself is pinned in hud-icons.test.ts; here we
  // re-baseline pm4-9's two text guards to the new spec: the text must be gone.
  it('no longer draws LIVES as text — pm4-11 renders lives as Pac-life sprites (see hud-icons.test.ts)', () => {
    const { ctx, texts } = fakeCtx()
    drawHud(ctx, 1440, 0, 3, 1)
    expect(texts.some((c) => c.text.includes('LIVES')), 'the procedural "LIVES n" text is retired').toBe(false)
  })

  it('no longer draws LEVEL as text — pm4-11 renders the level as a fruit row (see hud-icons.test.ts)', () => {
    const { ctx, texts } = fakeCtx()
    drawHud(ctx, 1440, 0, 3, 7)
    expect(texts.some((c) => c.text.includes('LEVEL')), 'the procedural "LEVEL n" text is retired').toBe(false)
  })

  it('bleed guard: NO HUD text is drawn in the playfield band (24 <= y < 264)', () => {
    // The exact defect the playtest surfaced — HIGH SCORE painted at y=24/34, over the
    // maze. Every readout must land in a reserved band, never the playfield.
    const { ctx, texts } = fakeCtx()
    drawHud(ctx, 999990, 31415, 3, 7)
    const bleeding = texts.filter(inPlayfield)
    expect(bleeding, `HUD text bled onto the playfield: ${JSON.stringify(bleeding)}`).toEqual([])
  })
})
