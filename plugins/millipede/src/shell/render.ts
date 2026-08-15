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
import type { HudPlacement } from '../core/hud'

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
  const palette = flatPalette()
  for (let i = 0; i < STAMPS.length; i++) {
    blit(ctx, stampImage(ctx, i, palette), (i % 16) * 8, (i >> 4) * 8)
  }
}

type Palette = readonly ReturnType<typeof decodeColourByte>[]

/** The census/default palette — the ml2-4 diagnostic ramp (max-distinct inks). */
const flatPalette = (): Palette => PLAYFIELD_COLOUR_BYTES.map((b) => decodeColourByte(b))

// Composite an 8x8 stamp onto ctx at (x, y) HONOURING the transparent pen 0.
// putImageData REPLACES pixels (it never alpha-blends), so a pen-0 hole would
// punch through the background instead of showing it. In the browser we stage on
// one reused 8x8 scratch canvas and drawImage it (which does blend). Under node
// (the render tests: no `document`) we fall back to putImageData, which the
// fake-ctx recorders observe as before.
let scratchCtx: CanvasRenderingContext2D | null = null
function blit(ctx: CanvasRenderingContext2D, img: ImageData, x: number, y: number): void {
  if (typeof document === 'undefined') {
    ctx.putImageData(img, x, y)
    return
  }
  if (!scratchCtx) {
    const sc = document.createElement('canvas')
    sc.width = 8
    sc.height = 8
    scratchCtx = sc.getContext('2d')
  }
  if (!scratchCtx) {
    ctx.putImageData(img, x, y)
    return
  }
  scratchCtx.putImageData(img, 0, 0)
  ctx.drawImage(scratchCtx.canvas, x, y)
}

/** One stamp as an opaque 8x8 ImageData, pixel value v painted as palette[v]. */
function stampImage(ctx: CanvasRenderingContext2D, stampIndex: number, palette: Palette): ImageData {
  const img = ctx.createImageData(8, 8)
  const stamp = STAMPS[stampIndex]
  for (let r = 0; r < 8; r++) {
    for (let x = 0; x < 8; x++) {
      const v = stamp[r][x]
      const { r: red, g: green, b: blue } = palette[v]
      const off = (r * 8 + x) * 4
      img.data[off] = red
      img.data[off + 1] = green
      img.data[off + 2] = blue
      // Pen 0 is the transparent pen (MAME transpen/transmask 0): leave the
      // background showing through instead of stamping an opaque black box.
      img.data[off + 3] = v === 0 ? 0 : 255
    }
  }
  return img
}

/**
 * Playfield CHAR CODE -> sheet tile, per MAME's milliped_get_tile_info
 * (centiped_v.cpp:35-43): tile = (code & 0x3f) + 0x40 + bank*0x80, where
 * bank = ((code >> 6) & 1) | (gfx_bank << 1). With gfx_bank 0:
 *   • bit 6 CLEAR (ALPHANUMERICS: A-Z, DIGITZ, ship) -> $40-$7F.
 *   • bit 6 SET   (PLAYFIELD GRAPHICS: mushrooms, DDT, rocks, bonus numbers)
 *     -> $C0-$FF  (NOT $00-$3F — those are the MOTION-OBJECT sprite tiles).
 * The earlier `code ^ 0x40` sent bit-6-set mushroom codes to $00-$3F, i.e. into
 * the segment/creature sprite tiles, so the field drew sprite fragments where
 * mushrooms belong (the ml7-6 "mushrooms at $3C-$3F" reading was those sprite
 * tiles, not the real $FC-$FF mushrooms).
 */
export const charTile = (code: number): number => ((code & 0x40) === 0 ? 0x40 : 0xc0) | (code & 0x3f)

/**
 * The second half of the same measurement: every tile is stored ROTATED for
 * the vertical monitor. The grid->pixel law below is the whole-frame rotation
 * (display x = ROM tile-row, display y = mirrored ROM tile-column), so each
 * tile's own pixels must rotate WITH the frame — 90° CCW: the stored left
 * column becomes the displayed bottom row. Verified on the font: tile $61
 * stores a '1' lying on its side (a horizontal stroke), $5F stores the
 * archer pointing right; CCW stands both upright.
 */
function rotatedStampImage(ctx: CanvasRenderingContext2D, stampIndex: number, palette: Palette): ImageData {
  const img = ctx.createImageData(8, 8)
  const stamp = STAMPS[stampIndex]
  for (let r = 0; r < 8; r++) {
    for (let x = 0; x < 8; x++) {
      // out(row r, col x) <- stored(row x, col 7-r): the 90° CCW turn.
      const v = stamp[x][7 - r]
      const { r: red, g: green, b: blue } = palette[v]
      const off = (r * 8 + x) * 4
      img.data[off] = red
      img.data[off + 1] = green
      img.data[off + 2] = blue
      img.data[off + 3] = v === 0 ? 0 : 255
    }
  }
  return img
}

/**
 * Story ml7-3 — the ROUTING half of "routing != geometry": blit exactly the
 * placements core geometry computed (src/core/hud.ts), one 8x8 stamp per
 * placement, at the ONE grid->pixel law of the 30x32 portrait playfield:
 * x = col*8, y = (0x1F - row)*8 — column 0 at the LEFT edge, row 0 at the
 * BOTTOM, so the reserved HUD row $1F is the top line (the centipede cp2-14
 * family orientation). Placement stamps are ROM CHAR CODES (the core's
 * vocabulary); charTile + the CCW tile rotation translate them to the sheet.
 * Pinned by tests/hud-render.test.ts; this function adds no geometry of its
 * own.
 */
export function drawGridStamps(
  ctx: CanvasRenderingContext2D,
  placements: readonly HudPlacement[],
  palette: Palette = flatPalette(),
): void {
  for (const p of placements) {
    // Every placement is a PLAYFIELD CHAR (charTile -> $40-$FF): text, mushrooms,
    // DDT, ship, digits. Playfield chars are stored rotated for the vertical
    // monitor, so all of them take the CCW turn. (Motion-object SPRITES, tiles
    // $00-$3F / $80-$BF, are stored upright and are drawn by drawStampAtPx
    // without rotation.)
    blit(ctx, rotatedStampImage(ctx, charTile(p.stamp), palette), p.col * 8, (0x1f - p.row) * 8)
  }
}

/**
 * One sheet tile at a raw pixel position — the motion-object path (the demo
 * train draws at MOBJH/MOBJV pixel precision, not grid cells). Takes a RAW
 * sheet index (sprite tiles live outside the char window, so charTile does
 * not apply); the CCW rotation does — sprites turn with the frame like
 * everything else.
 */
export function drawStampAtPx(
  ctx: CanvasRenderingContext2D,
  stamp: number,
  x: number,
  y: number,
  palette: Palette = flatPalette(),
  rotate = false,
): void {
  // Motion-object graphics (millipede segments, enemies, bonus-score numbers)
  // come from the upright playfield-graphics bank and must NOT be rotated; only
  // the ship — an ALPHANUMERICS-bank picture ($5F) — needs the CCW turn, so the
  // caller opts in. (See drawGridStamps for why the banks differ.)
  const img = rotate ? rotatedStampImage(ctx, stamp, palette) : stampImage(ctx, stamp, palette)
  blit(ctx, img, x, y)
}
