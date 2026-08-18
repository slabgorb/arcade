// src/core/terrain.ts
//
// Story df2-5 (GREEN, Yoda) — the terrain render seam. The generated terrain data
// (terrain-data.ts, transcribed from defender/BLK71.SRC by scripts/transcribe-terrain.mjs)
// plus a PURE `decodeAltitudes` that turns TDATA's bit-stream into a height profile
// and a PURE `blitTerrain` that stamps a STATIC planet surface into the core
// framebuffer as palette INDICES. Data lands INERT — a static still only; no scroll,
// no scheduler, no animation (those are df3/df4/df5).
//
// PURE src/core: no shell import, no canvas, no RGBA, no clock, no entropy — the
// purity sweep (tests/purity.test.ts) scans this file. Core hands the shell indices;
// the shell (render.ts) decodes an index to colour.
//
// ─── THE ALTITUDE DECODE (BGALT, defender/BLK71.SRC:374-399) ───────────────────
// BGALT builds the terrain altitude table from TDATA's packed bit-stream: base
// offset ROFF = $E0 (:380), then a ±1 walk — a SET bit steps UP (DEC ROFF, :387), a
// CLEAR bit steps DOWN (INC ROFF, :389) — storing one altitude per TWO bits until the
// table holds 4*TLEN entries (:397). This is the STATIC base+step decode. BGALT's own
// next-bit routine is RFONR1 (:435), which advances FORWARD through TDATA and wraps
// forward (TDATA+TLEN → TDATA); the MSB-first walk here approximates it. The exact
// bidirectional SCROLL order — LFONR1's backward-wrapping scan (:481-506) plus the
// flavor tables — is df3's scroll seam, not this static still (see the session's
// TEA/Dev deviations). The bytes are the ROM's; the surface is derived, never invented.

import type { Framebuffer } from './framebuffer.js'
import { TERRAIN, type TerrainBlockData } from './terrain-data.js'

export { TERRAIN }
export type TerrainBlock = TerrainBlockData

/** BGALT base offset ROFF (LDA #$E0, defender/BLK71.SRC:380; STA ROFF :381) — the
 *  surface starts near the bottom of the 240-row screen. */
const BASE_OFFSET = 0xe0
/** BGALT stores one altitude per TWO bit-steps (loop body ALTT1..ALTT5, defender/BLK71.SRC:383-396). */
const BITS_PER_ENTRY = 2
/** The framebuffer holds 4-bit palette indices; a colour is one of 16 CRAM entries. */
const MAX_PALETTE_INDEX = 15

/**
 * Decode a 'bitstream' terrain block (TDATA) into an altitude profile — one screen
 * row per column, following BGALT. Bits are consumed MSB-first; each entry is two ±1
 * steps from the running offset (base $E0), so consecutive altitudes differ by at
 * most 2. Returns 4 entries per source byte (8 bits ÷ 2 bits/entry). Pure and
 * deterministic. Refuses a non-'bitstream' block LOUD — MTERR is the scanner
 * triple-stream, not a height profile, and walking it as bits would fabricate a surface.
 */
export function decodeAltitudes(block: TerrainBlock): number[] {
  if (block.encoding !== 'bitstream') {
    throw new Error(`decodeAltitudes refuses a non-bitstream block: ${block.name} (encoding ${block.encoding})`)
  }
  const entries = (block.bytes.length * 8) / BITS_PER_ENTRY
  const altitudes: number[] = []
  let offset = BASE_OFFSET
  let bitIndex = 0
  const bitAt = (i: number): number => (block.bytes[i >> 3] >> (7 - (i & 7))) & 1 // MSB-first
  for (let e = 0; e < entries; e++) {
    altitudes.push(offset)
    for (let s = 0; s < BITS_PER_ENTRY; s++) {
      // SET bit → UP (toward row 0); CLEAR bit → DOWN. ROFF is a byte (6809 STA ROFF).
      offset = (bitAt(bitIndex++) ? offset - 1 : offset + 1) & 0xff
    }
  }
  return altitudes
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
): void {
  if (!Number.isInteger(colorIndex) || colorIndex < 0 || colorIndex > MAX_PALETTE_INDEX) {
    throw new Error(`blitTerrain: colour index ${colorIndex} is not a palette entry 0-${MAX_PALETTE_INDEX}`)
  }
  // df5-9: scroll the surface under the camera. Each screen column x shows the world column
  // `x + cameraCol`, wrapped over the surface's own length so the planet is a cylinder (the
  // camera-relative twin of the entity blits — both shift by cameraCol screen columns).
  const n = altitudes.length
  if (n === 0) return
  const shift = ((cameraCol % n) + n) % n
  const columns = cameraCol === 0 ? Math.min(n, fb.width) : fb.width
  for (let x = 0; x < columns; x++) {
    const row = altitudes[(x + shift) % n]
    if (!Number.isInteger(row)) {
      // NaN/Infinity/fractional are all non-rows: fb.data[non-integer] silently writes
      // nowhere, so fail LOUD rather than drop the column (lang-review #21).
      throw new Error(`blitTerrain: altitude ${row} at column ${x} is not an integer row`)
    }
    if (row < 0 || row >= fb.height) continue // clip off-screen
    fb.data[row * fb.width + x] = colorIndex
  }
}
