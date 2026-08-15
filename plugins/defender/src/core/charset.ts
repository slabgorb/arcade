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
// ─── THE CELL DECODE (COLUMN-MAJOR — settled by df2-6's visual playtest) ─────────
// A cell is width×height bytes. It is stored COLUMN-MAJOR: the bytes are `width`
// vertical strips of `height` bytes each, so the byte for strip `col`, scanline `row`
// is bytes[col*height + row] (defender/MESS0.SRC:558 LETTRD — its 24 bytes only spell
// a 'D' read column-first, never row-first). Each byte still packs two horizontal
// pixels as nibbles — high nibble the left pixel, low nibble the right — and a non-zero
// nibble is a foreground pixel (the ROM font is a 1-bit mask the text routine colours;
// here the caller's index is that colour). A glyph is therefore width×2 pixels wide by
// height tall. df2-6 settled the row-major-vs-column-major orientation by rendering
// "DEFENDER" both ways: row-major is noise, column-major is legible (the charset-blit
// suite is packing-agnostic and stayed green across the fix).

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

/** The glyph the ROM substitutes for an unsupported character (TEXT7A, MESS0.SRC:803). */
const QUESTION: GlyphData = (() => {
  const q = CHARSET.find((g) => g.name === 'QUESMK')
  if (!q) throw new Error("charset.ts: CHARSET is missing 'QUESMK' (the ROM's invalid-char glyph)")
  return q
})()

/** The glyph that renders `ch`, or undefined if the charset has none (writeText → '?'). */
export function glyphForChar(ch: string): GlyphData | undefined {
  return byChar.get(ch)
}

/**
 * Stamp a glyph's foreground pixels into `fb` as `colorIndex`, with the cell's
 * top-left at (x, y). Pure: mutates fb in place, clips to the framebuffer, and
 * writes nothing outside it. Fails LOUD on a malformed glyph or position rather
 * than mis-rendering silently — blitGlyph is exported and df2-4/df2-5 reuse it, so
 * a short `bytes` array (undefined→0→background) or a NaN position (fb.data[NaN] is
 * a silent no-op) must throw here, not paint a truncated glyph or drop a message.
 * Refuses a non-raster block (streams are not rasters).
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
  if (glyph.bytes.length !== glyph.width * glyph.height) {
    throw new Error(
      `blitGlyph: glyph ${glyph.name} has ${glyph.bytes.length} bytes for a ${glyph.width}×${glyph.height} cell`,
    )
  }
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error(`blitGlyph: non-finite position (${x}, ${y}) for glyph ${glyph.name}`)
  }
  for (let row = 0; row < glyph.height; row++) {
    for (let col = 0; col < glyph.width; col++) {
      const byte = glyph.bytes[col * glyph.height + row] // COLUMN-major (df2-6)
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
