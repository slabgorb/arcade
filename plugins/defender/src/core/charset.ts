// src/core/charset.ts
//
// Story df2-3 (GREEN, Yoda) — the raster CHARSET render seam. The generated cell
// data (charset-data.ts, transcribed from defender/MESS0.SRC by
// scripts/transcribe-charset.mjs) plus a PURE `blitGlyph` that stamps a glyph's
// foreground pixels into the core framebuffer as palette INDICES, and a `writeText`
// that lays a message out left-to-right. Raster charset — the ROM cell pixels, not
// @shared/font vector glyphs.
//
// PURE src/core: no shell import, no canvas, no RGBA, no clock, no entropy — the
// purity sweep (tests/purity.test.ts) scans this file. Core hands the shell indices;
// the shell (render.ts) decodes an index to colour. blitGlyph writes only the colour
// INDEX its caller passes — colours are never invented here.
//
// ─── THE CELL DECODE (derived; the byte gate owns the BYTES, this owns the pixels)─
// A cell is width×height bytes, row-major (defender/MESS0.SRC:441-640). Each byte
// packs two horizontal pixels as nibbles — high nibble the left pixel, low nibble the
// right — and a non-zero nibble is a foreground pixel (the ROM font is a 1-bit mask
// the text routine colours; here the caller's index is that colour). A glyph is
// therefore width×2 pixels wide by height tall. The exact nibble ORDER and the
// Williams screen rotation are an orientation question df2-6's visual playtest
// settles; this decode is internally consistent and every charset test is
// packing-agnostic by design.

import type { Framebuffer } from './framebuffer.js'
import { CHARSET, type GlyphData } from './charset-data.js'

export { CHARSET }
export type Glyph = GlyphData

/** Two 4-bit pixels per cell byte: a byte spans this many horizontal pixels. */
const PIXELS_PER_BYTE = 2
/** ROM default horizontal gap between characters (CHARSP, defender/MESS0.SRC:747). */
const DEFAULT_SPACING = 1

const byChar: ReadonlyMap<string, GlyphData> = new Map(
  CHARSET.filter((g) => g.char !== null).map((g) => [g.char as string, g]),
)

/** The glyph the ROM substitutes for an unsupported character (TEXT7A, MESS0.SRC:786). */
const QUESTION: GlyphData = CHARSET.find((g) => g.name === 'QUESMK') as GlyphData

/** The glyph that renders `ch`, or undefined if the charset has none (writeText → '?'). */
export function glyphForChar(ch: string): GlyphData | undefined {
  return byChar.get(ch)
}

/**
 * Stamp a glyph's foreground pixels into `fb` as `colorIndex`, with the cell's
 * top-left at (x, y). Pure: mutates fb in place, clips to the framebuffer, and
 * writes nothing outside it. Refuses a non-raster block (streams are not rasters).
 */
export function blitGlyph(
  fb: Framebuffer,
  glyph: Glyph,
  x: number,
  y: number,
  colorIndex: number,
): void {
  if (glyph.encoding !== 'raster') {
    throw new Error(`blitGlyph refuses a non-raster glyph: ${glyph.name} (encoding ${glyph.encoding})`)
  }
  for (let row = 0; row < glyph.height; row++) {
    for (let col = 0; col < glyph.width; col++) {
      const byte = glyph.bytes[row * glyph.width + col]
      const nibbles = [(byte >> 4) & 0x0f, byte & 0x0f] // [left pixel, right pixel]
      for (let half = 0; half < PIXELS_PER_BYTE; half++) {
        if (nibbles[half] === 0) continue // background — leave the framebuffer be
        const fx = x + col * PIXELS_PER_BYTE + half
        const fy = y + row
        if (fx < 0 || fy < 0 || fx >= fb.width || fy >= fb.height) continue // clip
        fb.data[fy * fb.width + fx] = colorIndex
      }
    }
  }
}

/**
 * Lay `text` across `fb` starting at (x, y): each character's glyph is blitted and
 * the cursor advances by the glyph width (in pixels) plus `spacing`. A space draws
 * nothing but still advances; an unsupported character renders the '?' glyph.
 */
export function writeText(
  fb: Framebuffer,
  text: string,
  x: number,
  y: number,
  colorIndex: number,
  spacing: number = DEFAULT_SPACING,
): void {
  let cursor = x
  for (const ch of text) {
    const glyph = glyphForChar(ch) ?? QUESTION
    blitGlyph(fb, glyph, cursor, y, colorIndex)
    cursor += glyph.width * PIXELS_PER_BYTE + spacing
  }
}
