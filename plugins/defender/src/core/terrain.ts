// src/core/terrain.ts
//
// Story df2-5 (render seam) + df5-11 (corrected decode). The generated terrain data
// (terrain-data.ts, transcribed from defender/BLK71.SRC by scripts/transcribe-terrain.mjs)
// plus a PURE `decodeScrollSurface` that turns TDATA's bit-stream into the SCROLLED height
// profile and a PURE `blitTerrain` that stamps the planet surface into the core framebuffer
// as palette INDICES. composeFrame (df5-9) scrolls it under the camera; composeStaticFrame
// draws it at camera 0.
//
// PURE src/core: no shell import, no canvas, no RGBA, no clock, no entropy — the
// purity sweep (tests/purity.test.ts) scans this file. Core hands the shell indices;
// the shell (render.ts) decodes an index to colour.
//
// ─── THE ALTITUDE DECODE (the SCROLL walk, defender/BLK71.SRC) ─────────────────
// The scroll generators ADDR01/ADDL01 (:307,236) walk TDATA via RFONR1/LFONR1 (:435,487),
// consuming ONE bit per world column from base $E0: a SET bit steps UP, a CLEAR bit steps
// DOWN. That is 2048 columns over TDATA's 2048 bits = the whole $10000 world at $20/column,
// sampled to WORLD_COLS for the port's $100/pixel lap. This is NOT BGALT/ALTTBL (:372): that
// table is filled but NEVER read in the ROM — decoding it (as the original df2-5 code did)
// rendered a quarter of the planet at half resolution. See
// docs/adr/0006-defender-terrain-world-coordinate-reconciliation.md. Bytes are the ROM's;
// the surface is derived, never invented.

import type { Framebuffer } from './framebuffer.js'
import { TERRAIN, type TerrainBlockData } from './terrain-data.js'
import { WORLD_COLS } from './world.js'

export { TERRAIN }
export type TerrainBlock = TerrainBlockData

/** BGINIT base offset (LDA #$E0, defender/BLK71.SRC:107) — the surface starts near the
 *  bottom of the 240-row screen. Both the scroll (LOFF/ROFF) and BGALT (ROFF) start here. */
const BASE_OFFSET = 0xe0
/** The framebuffer holds 4-bit palette indices; a colour is one of 16 CRAM entries. */
const MAX_PALETTE_INDEX = 15

/**
 * Decode the SCROLLING planet surface from a 'bitstream' terrain block (TDATA) the way
 * the ROM's scroll actually generates it — NOT the write-only BGALT/ALTTBL table.
 *
 * The scroll generators ADDR01/ADDL01 (defender/BLK71.SRC:307,236) walk TDATA via
 * RFONR1/LFONR1 (:435,:487), which consume exactly ONE bit per world column: a SET bit
 * steps the offset UP (toward row 0), a CLEAR bit steps it DOWN, from base $E0. That is
 * a ±1 walk over all `bytes.length*8` bits of TDATA — 2048 columns = the whole $10000
 * world at $20/column (1 pixel = $20; BGINIT's screen span ADDD #$2610 over 304px, and
 * ANDB #$E0's $20 pixel granularity). BGALT (:372) instead stores one entry per TWO bits
 * into ALTTBL, which nothing ever reads (referenced only at :70/:382/:397) — decoding it
 * rendered only a quarter of the planet at half resolution (see
 * docs/adr/0006-defender-terrain-world-coordinate-reconciliation.md).
 *
 * The 2048-column walk is sampled down to `worldCols` columns at stride
 * `fullLen/worldCols` — the port's coherent $100/pixel ($10000>>8 = 256) zoom-out, i.e.
 * the terrain height at each $100 boundary — so one camera lap shows the whole planet
 * once. Pure/deterministic, MSB-first (matching RFONR1's ASLA). Refuses a non-'bitstream'
 * block, and a `worldCols` that does not divide the bit count, LOUD.
 */
export function decodeScrollSurface(block: TerrainBlock, worldCols: number = WORLD_COLS): number[] {
  if (block.encoding !== 'bitstream') {
    throw new Error(`decodeScrollSurface refuses a non-bitstream block: ${block.name} (encoding ${block.encoding})`)
  }
  const fullLen = block.bytes.length * 8 // one column per bit — the scroll's rate (RFONR1)
  if (!Number.isInteger(worldCols) || worldCols <= 0 || fullLen % worldCols !== 0) {
    throw new Error(`decodeScrollSurface: ${fullLen} columns do not divide evenly into worldCols ${worldCols}`)
  }
  const stride = fullLen / worldCols
  const bitAt = (i: number): number => (block.bytes[i >> 3] >> (7 - (i & 7))) & 1 // MSB-first
  const surface: number[] = []
  let offset = BASE_OFFSET
  for (let j = 0; j < fullLen; j++) {
    // Sample the height at each $100 boundary (every `stride` columns), then take the
    // next ±1 step. push-then-step: surface[0] = the base $E0 (0 steps walked).
    if (j % stride === 0) surface.push(offset)
    offset = (bitAt(j) ? offset - 1 : offset + 1) & 0xff // SET → UP, CLEAR → DOWN (ROFF is a byte)
  }
  return surface
}

/**
 * Stamp a STATIC planet surface into `fb`: for each supplied column, light the
 * surface pixel at row = altitudes[x] AS the palette index `colorIndex`, CLIPPED to
 * the framebuffer. Pure: mutates fb in place, writes nothing outside it. Colours are
 * never invented — the caller's index is the colour (as blitGlyph takes a caller
 * colour), so `colorIndex` must be a real 4-bit palette entry (0-15) and every altitude
 * must be an integer row. Fails LOUD rather than mis-rendering: a non-integer altitude
 * (NaN, Infinity or a fractional value — none is a valid row index, and
 * fb.data[non-integer] is a silent no-op) or a colour index outside the 16-entry palette
 * (a Uint8Array would truncate it into an invented colour) each throws. An off-screen
 * INTEGER row (negative or ≥ height) is clipped, not an error — the surface simply runs
 * off the frame.
 */
export function blitTerrain(
  fb: Framebuffer,
  altitudes: readonly number[],
  colorIndex: number,
  cameraCol = 0,
  period?: number,
): void {
  if (!Number.isInteger(colorIndex) || colorIndex < 0 || colorIndex > MAX_PALETTE_INDEX) {
    throw new Error(`blitTerrain: colour index ${colorIndex} is not a palette entry 0-${MAX_PALETTE_INDEX}`)
  }
  if (altitudes.length === 0) return
  // df5-9: scroll the surface under the camera. Each screen column x shows the world column
  // `x + cameraCol`, wrapped over the CYLINDER `period` (the world column count) so the planet
  // tiles at the same period the camera cycles at — otherwise the surface snaps once per lap
  // (see df5-9-R1). A caller that passes an explicit `period` opts into CYLINDER tiling and
  // fills the full framebuffer width (the title still and the live scroll both do). A caller
  // that omits it (the synthetic terrain-blit unit tests) keeps the legacy "paint
  // min(len, width) columns, no wrap" contract — the distinction is the presence of `period`,
  // not `period === length` (which now coincides with WORLD_COLS and can't discriminate).
  const cylinder = period !== undefined
  const p = cylinder && period! > 0 ? Math.trunc(period!) : altitudes.length
  const shift = ((cameraCol % p) + p) % p
  const columns = cylinder ? fb.width : Math.min(altitudes.length, fb.width)
  for (let x = 0; x < columns; x++) {
    const row = altitudes[(x + shift) % p]
    if (!Number.isInteger(row)) {
      // NaN/Infinity/fractional are all non-rows: fb.data[non-integer] silently writes
      // nowhere, so fail LOUD rather than drop the column (lang-review #21).
      throw new Error(`blitTerrain: altitude ${row} at column ${x} is not an integer row`)
    }
    if (row < 0 || row >= fb.height) continue // clip off-screen
    fb.data[row * fb.width + x] = colorIndex
  }
}
