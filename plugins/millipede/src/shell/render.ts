// src/shell/render.ts
//
// Story ml2-4 — the STATIC PLAYFIELD OF STAMPS: every baked 8x8 stamp blitted
// once onto a 16x16 sheet (128x128 px), coloured through the ml2-3 colour-RAM
// seam. This page exists for the VISUAL playtest that catches the
// ROT/orientation trap before any physics lands (playbook §4 — byte-equality
// decode tests pass while the screen is visibly wrong; only eyes catch it).
// tests/playfield.test.ts pins the grid coordinates and the colour wiring.
//
// The ink bytes are drawn from the ROM's own colour vocabulary — CLRCH, the
// COLOR RAM INITIALIZATION routine (MLIRQ.MAC:242): $1F is the routine's own
// "RED" (MLIRQ.MAC:294), $00 its "WHITE" (MLIRQ.MAC:297), and $E7 appears in
// the per-wave 99$ colour table (MLIRQ.MAC:304-351) and decodes to the
// wiring's pure green — three maximally distinct inks so a plane inversion in
// the bake is visible at a glance (value 1 = low plane only, 2 = high only,
// 3 = both). $FF drives no output line at all (active-low wiring,
// src/core/palette.ts) — the black background.

import { decodeColourByte } from '../core/palette'
import { STAMPS } from './stamp-data'

/**
 * One colour-RAM byte per 2-bit pixel value 0..3. Index 0 (both planes clear)
 * is the background and decodes to black; 1..3 decode to red / green / white.
 */
export const PLAYFIELD_COLOUR_BYTES: readonly [number, number, number, number] = [0xff, 0x1f, 0xe7, 0x00]

/** The sheet is 16x16 stamps of 8x8 pixels. */
export const SHEET_PX = 128

/**
 * Blit all 256 stamps, stamp i at ((i % 16) * 8, (i >> 4) * 8) — unscaled;
 * the caller scales the sheet up for visibility.
 */
export function drawStampPlayfield(ctx: CanvasRenderingContext2D): void {
  const palette = PLAYFIELD_COLOUR_BYTES.map((b) => decodeColourByte(b))
  for (let i = 0; i < STAMPS.length; i++) {
    const img = ctx.createImageData(8, 8)
    const stamp = STAMPS[i]
    for (let r = 0; r < 8; r++) {
      for (let x = 0; x < 8; x++) {
        const { r: red, g: green, b: blue } = palette[stamp[r][x]]
        const off = (r * 8 + x) * 4
        img.data[off] = red
        img.data[off + 1] = green
        img.data[off + 2] = blue
        img.data[off + 3] = 255
      }
    }
    ctx.putImageData(img, (i % 16) * 8, (i >> 4) * 8)
  }
}
