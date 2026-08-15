// src/core/objects.ts
//
// Story df2-4 (GREEN, Yoda) — the object-image render seam. The generated cell data
// (objects-data.ts, transcribed from defender/DEFB6.SRC by scripts/transcribe-objects.mjs)
// plus a PURE `blitObject` that stamps a transcribed object cell into the core
// framebuffer as palette INDICES. Data lands INERT — a static gallery blit only; no
// animation, no collision, no scheduler (those are df3/df4).
//
// PURE src/core: no shell import, no canvas, no RGBA, no clock, no entropy — the
// purity sweep (tests/purity.test.ts) scans this file. Core hands the shell indices;
// the shell (render.ts) decodes an index to colour.
//
// ─── THE CELL DECODE (COLUMN-MAJOR — settled by df2-6's visual playtest) ─────────
// A raster cell is width×height bytes, stored COLUMN-MAJOR like the charset: `width`
// vertical strips of `height` bytes, so the byte for strip `col`, scanline `row` is
// bytes[col*height + row]. Unlike the charset (a 1-bit mask the caller colours), an
// OBJECT byte packs two 4-bit palette INDICES — high nibble the left pixel, low nibble
// the right — and a non-zero nibble is a foreground pixel drawn AS its own index
// (object images carry their own colour; blitObject invents none). A cell is therefore
// width×2 pixels wide by height tall. df2-6 settled the orientation visually: UFOP1 and
// PLAPIC only read as a saucer and a ship column-first (row-first is scatter), the same
// Williams convention the charset uses.

import type { Framebuffer } from './framebuffer.js'
import { OBJECTS, type ObjectImageData } from './objects-data.js'

export { OBJECTS }
export type ObjectImage = ObjectImageData

/** Two 4-bit pixels per cell byte: a byte spans this many horizontal pixels. */
const PIXELS_PER_BYTE = 2

/**
 * Stamp an object's cell into `fb`, top-left at (x, y). Each non-zero nibble is drawn
 * AS its own palette index (objects carry their own colour — none is invented here);
 * a zero nibble is transparent. Pure: mutates fb in place, clips to the framebuffer,
 * writes nothing outside it. Fails LOUD rather than mis-rendering silently — a
 * non-raster block (streams are not rasters), a cell whose byte count is not
 * width×height, or a non-finite position each throws, because a short `bytes` array
 * (undefined→0→background) or a NaN position (fb.data[NaN] is a silent no-op) would
 * otherwise paint a truncated object or drop it with no error.
 */
export function blitObject(fb: Framebuffer, obj: ObjectImage, x: number, y: number): void {
  if (obj.encoding !== 'raster') {
    throw new Error(`blitObject refuses a non-raster block: ${obj.name} (encoding ${obj.encoding})`)
  }
  if (obj.bytes.length !== obj.width * obj.height) {
    throw new Error(
      `blitObject: object ${obj.name} has ${obj.bytes.length} bytes for a ${obj.width}×${obj.height} cell`,
    )
  }
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error(`blitObject: non-finite position (${x}, ${y}) for object ${obj.name}`)
  }
  for (let row = 0; row < obj.height; row++) {
    for (let col = 0; col < obj.width; col++) {
      const byte = obj.bytes[col * obj.height + row] // COLUMN-major (df2-6)
      const nibbles = [(byte >> 4) & 0x0f, byte & 0x0f] // [left pixel, right pixel]
      for (let half = 0; half < PIXELS_PER_BYTE; half++) {
        const index = nibbles[half]
        if (index === 0) continue // transparent — leave the framebuffer be
        const fx = x + col * PIXELS_PER_BYTE + half
        const fy = y + row
        if (fx < 0 || fy < 0 || fx >= fb.width || fy >= fb.height) continue // clip
        fb.data[fy * fb.width + fx] = index
      }
    }
  }
}
