// src/shell/render.ts
//
// Story jt1-6 (GREEN, Julia) — the render shell. SHELL, not core: it owns the
// canvas, the palette-to-RGBA decode and the offscreen atlas. Core emits frame
// indices and positions; nothing here ever reaches back across the boundary.
//
// ─── COLOURS ARE NEVER INVENTED ──────────────────────────────────────────────
// Every colour drawn comes from COLOR1, the transcribed 1982 palette. A pixel
// nibble is a LITERAL palette index — never a lookup into a "close enough"
// modern palette, and never a hard-coded hex literal. The suite scans this file
// for colour literals precisely because a plausible-looking substitute is the
// easiest way to lose fidelity while everything still renders.
//
// ─── STREAMS ARE NOT RASTERS ─────────────────────────────────────────────────
// COMCL5 and ASH1R/ASH1L carry COMPRESSED bytes, not pixel grids. Blitting them
// as rasters produces convincing noise, so `buildAtlas` consults each block's
// `encoding` discriminant and refuses to pack a stream. COMCL5 reaches the
// screen only through `expandComcl5`, and its rows are RAGGED (each ends at its
// own end-of-line token), so they must be reshaped into a rectangle before they
// can be indexed as one — otherwise every row after the first shears left.

import { PALETTES, PIXEL_BLOCKS, expandAshFrames, type PixelBlock, type Palette } from '../core/pictures.js'

/** The visible raster: 292x240 (MAME williams driver, schema-only claim). */
export const LOGICAL_WIDTH = 292
export const LOGICAL_HEIGHT = 240

export interface Rgba {
  r: number
  g: number
  b: number
  a: number
}

export interface Atlas {
  width: number
  height: number
  blocks: Record<string, { x: number; y: number; width: number; height: number }>
  data: Uint8ClampedArray
}

/**
 * Decode one 1982 palette byte. The hardware packs BBGGGRRR — two bits of blue,
 * three of green, three of red — into one byte, and each field is scaled up to
 * eight bits for display. The STORED byte is never altered; this is a
 * presentation transform only.
 */
export function paletteToRgba(paletteByte: number): Rgba {
  if (!Number.isInteger(paletteByte) || paletteByte < 0 || paletteByte > 255) {
    throw new RangeError(`paletteToRgba expects a byte 0..255, got ${paletteByte}`)
  }
  const red = paletteByte & 0x07
  const green = (paletteByte >> 3) & 0x07
  const blue = (paletteByte >> 6) & 0x03
  const widen = (value: number, bits: number): number =>
    Math.round((value / ((1 << bits) - 1)) * 255)
  return { r: widen(red, 3), g: widen(green, 3), b: widen(blue, 2), a: 255 }
}

/** A whole 16-entry palette decoded in index order. */
export function rgbaPalette(palette: Palette): Rgba[] {
  return palette.bytes.map(paletteToRgba)
}

/**
 * Integer scaling with letterboxing. The raster is scaled by the largest WHOLE
 * factor that fits both axes and centred in the leftover space; a fractional
 * scale would resample the 1982 pixels into a blur, which is the whole reason
 * image smoothing is disabled at the blit.
 */
export function viewport(vw: number, vh: number): { scale: number; offsetX: number; offsetY: number } {
  const fit = Math.min(Math.floor(vw / LOGICAL_WIDTH), Math.floor(vh / LOGICAL_HEIGHT))
  const scale = Math.max(1, fit)
  return {
    scale,
    // Clamped: on a viewport smaller than one logical frame (shrunk window,
    // pre-layout) the centring offsets go negative (jt1-6 review addendum).
    offsetX: Math.max(0, Math.floor((vw - LOGICAL_WIDTH * scale) / 2)),
    offsetY: Math.max(0, Math.floor((vh - LOGICAL_HEIGHT * scale) / 2)),
  }
}

/**
 * Reshape a ragged expansion into a full width x height rectangle, padding each
 * short row with index 0 (transparent).
 *
 * `expandComcl5` returns pixels in DRAW order, and its rows end early at their
 * own end-of-line tokens — the packed length (5773) is less than width x height
 * (6138). Indexing that flat array as `y * width + x` slides every row after
 * the first leftwards by the accumulated shortfall, which renders as a sheared
 * island. Reshaping first is what keeps each row's leading pixels at column 0.
 */
export function reshapeRagged(
  pixels: readonly number[],
  width: number,
  height: number,
  rowLengths: readonly number[],
): number[] {
  // Row boundaries are NOT recoverable from the flat stream — consuming a fixed
  // `width` per row is arithmetically identical to pixels[y*width+x], the exact
  // shear this function exists to prevent (jt1-6 review addendum: the bottom
  // island skewed ~18px by its last row). The decoder now reports each row's
  // real length; consume exactly that many, pad the remainder with 0.
  if (rowLengths.length !== height) {
    throw new Error(`reshapeRagged: ${rowLengths.length} row lengths for height ${height}`)
  }
  const grid = new Array<number>(width * height).fill(0)
  let source = 0
  for (let row = 0; row < height; row++) {
    const len = rowLengths[row]
    for (let column = 0; column < len && source < pixels.length; column++) {
      grid[row * width + column] = pixels[source++]
    }
  }
  return grid
}

/**
 * Pack every RASTER block into one RGBA atlas, laid out in rows.
 *
 * Stream-encoded blocks are skipped: COMCL5's Elias-gamma bits and ASH1R/L's
 * run-length pairs are not pixel grids, and packing them would put believable
 * noise on the sheet.
 *
 * CSRC5L is the one block whose data and record disagree — it holds FOURTEEN
 * rows of 8 while CLIF5's sub-record draws THIRTEEN (jt1-3 claims JT5-021/022
 * cover this). The transcription keeps all 112 bytes because truncating would
 * drop real source bytes; the atlas packs all 14 rows and the DRAW step takes
 * the record's height, so the fourteenth row is carried but never shown.
 */
export function buildAtlas(blocks: readonly PixelBlock[], palette: Palette): Atlas {
  const rasters = blocks.filter((b) => b.encoding === 'raster')
  const colours = rgbaPalette(palette)

  const width = Math.max(1, ...rasters.map((b) => b.width * 2))
  const height = rasters.reduce((total, b) => total + b.height, 0) || 1
  const data = new Uint8ClampedArray(width * height * 4)
  const placed: Atlas['blocks'] = {}

  let cursorY = 0
  for (const block of rasters) {
    placed[block.name] = { x: 0, y: cursorY, width: block.width * 2, height: block.height }
    for (let i = 0; i < block.bytes.length; i++) {
      const byte = block.bytes[i]
      const row = Math.floor(i / block.width)
      const column = (i % block.width) * 2
      // 4bpp, two pixels per byte, HIGH nibble is the LEFT pixel.
      const nibbles = [(byte >> 4) & 0x0f, byte & 0x0f]
      for (let half = 0; half < 2; half++) {
        const nibble = nibbles[half]
        const x = column + half
        if (x >= width) continue
        const offset = ((cursorY + row) * width + x) * 4
        // Nibble 0 is transparent; every other nibble is a LITERAL index into
        // the transcribed palette, never a nearest match.
        if (nibble === 0) continue
        const colour = colours[nibble]
        data[offset] = colour.r
        data[offset + 1] = colour.g
        data[offset + 2] = colour.b
        data[offset + 3] = colour.a
      }
    }
    cursorY += block.height
  }

  return { width, height, blocks: placed, data }
}

/** The atlas for the real game data, built once from the transcribed tables. */
export function buildGameAtlas(): Atlas {
  return buildAtlas(PIXEL_BLOCKS, PALETTES.COLOR1)
}

/**
 * Configure a 2D context for 1982 pixels: no resampling anywhere in the chain.
 */
export function configureContext(context: CanvasRenderingContext2D): void {
  context.imageSmoothingEnabled = false
}

/**
 * Paint one ptero/baiter DISSOLVE frame (jt3-7 B1 — the last shell mile).
 *
 * ASH1R is a `runlength` stream, so `buildAtlas` (raster-only) excludes it and
 * the shipped `blitOp` silently `return`s on the missing atlas slot — the
 * dissolve op paints ZERO pixels. This is the ASH equivalent of the COMCL5
 * island path: decode the three-frame ASH animation with `expandAshFrames`, pick
 * the op's `frame` (the `DissolveState.frame` carried onto the draw op), reshape
 * its ragged rows out of their end-of-line shear, and `fillRect` every
 * non-transparent pixel at the op's position — exactly the `drawIsland` idiom.
 *
 * Colours are the transcribed COLOR1 palette passed in; a pixel nibble is a
 * LITERAL index (nibble 0 is transparent and never painted). No colour is ever
 * invented here.
 */
export function paintDissolve(
  context: Pick<CanvasRenderingContext2D, 'fillStyle' | 'fillRect'>,
  op: { x: number; y: number; frame?: number; facing?: number },
  colours: readonly Rgba[],
): void {
  const ash = PIXEL_BLOCKS.find((b) => b.name === 'ASH1R' || b.aliases.includes('ASH1R'))
  if (!ash) return
  const frames = expandAshFrames(ash.bytes)
  if (frames.length === 0) return
  // Index by the op's DissolveState.frame (default 0), clamped into range — a
  // later frame paints its OWN visible-pixel count, never frozen on frame 0.
  const index = Math.min(Math.max(op.frame ?? 0, 0), frames.length - 1)
  const image = frames[index]
  // Reshape the ragged ASH rows before indexing (the same shear COMCL5 hit) so
  // each row's leading pixels stay at column 0; padding is index 0 (transparent).
  const grid = reshapeRagged(image.pixels, image.width, image.height, image.rowLengths)
  for (let row = 0; row < image.height; row++) {
    for (let column = 0; column < image.width; column++) {
      const nibble = grid[row * image.width + column]
      if (nibble === 0) continue
      const colour = colours[nibble]
      context.fillStyle = `rgb(${colour.r} ${colour.g} ${colour.b})`
      context.fillRect(op.x + column, op.y + row, 1, 1)
    }
  }
}
