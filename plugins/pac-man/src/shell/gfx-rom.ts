// src/shell/gfx-rom.ts
//
// Story pm3-3 — shared PURE decode primitives for the pac-man graphics ROMs
// and colour PROMs vendored under reference/graphics/ (citation-gated by
// pm3-1, docs/rom-study/claims/graphics.json). This module has no fetch, no
// DOM and no canvas dependency — every function here takes bytes in and
// returns plain data out, so it runs unchanged under vitest's `node`
// environment and under tools/bake-graphics.mjs (a plain Node script).
//
// Structure: one decode primitive per ROM "shape" the cabinet has. Today
// that's the palette PROM (82s123.7f). pm3-4 adds decodeTilePixel (the
// 4-bit-planar 8x8 tile ROM, pacman.5e/5f) and pm3-5 adds decodeSpritePixel
// (the 16x16 sprite ROM) alongside this one — same file, same "pure function
// over a Uint8Array" shape, so a later task appends rather than restructures.
//
// THE RESISTOR-DAC DECODE (decodePaletteFromProm): Pac-Man's colour PROM
// drives three resistor ladders per byte — R and G each 3 bits through
// {1000, 470, 220} ohm resistors, B only 2 bits (PROM bits 6,7) through
// {470, 220} ohm resistors. This is MAME's `compute_resistor_weights` /
// `pacman_palette` decode (mame/src/mame/pacman/pacman.cpp, the
// PALETTE_INIT_MEMBER(pacman_state, pacman)) — cited here in prose, per this
// story's "cite, don't copy" constraint; nothing below is pasted from MAME.
// The weights are normalised so all-bits-on saturates a channel to 255 and
// all-bits-off floors it at 0 (the two endpoints the palette test pins).

/** Convert a set of pull-up resistances (ohms) to normalised per-bit weights:
 *  each bit's fraction of a channel's full-scale conductance. */
function weights(res: number[]): number[] {
  const cond = res.map((r) => 1 / r)
  const total = cond.reduce((a, b) => a + b, 0)
  return cond.map((c) => c / total)
}

const RG = weights([1000, 470, 220]) // bits 0,1,2 (R) and 3,4,5 (G)
const B = weights([470, 220]) // bits 6,7 (B) — only two resistors on this ladder

/** Sum weighted bits and scale to an 8-bit channel value, 0..255. */
function chan(bits: number[], w: number[]): number {
  return Math.round(255 * bits.reduce((s, b, i) => s + b * w[i], 0))
}

/**
 * Decode a Pac-Man 82s123.7f-shaped colour PROM to RGB triples, one per byte
 * (MAME `pacman_palette`). Pure: no I/O, no ROM lookup beyond the bytes
 * passed in — callers supply the vendored PROM contents.
 */
export function decodePaletteFromProm(prom: Uint8Array): [number, number, number][] {
  return Array.from(prom, (byte) => {
    const bit = (n: number) => (byte >> n) & 1
    const r = chan([bit(0), bit(1), bit(2)], RG)
    const g = chan([bit(3), bit(4), bit(5)], RG)
    const b = chan([bit(6), bit(7)], B)
    return [r, g, b] as [number, number, number]
  })
}

/**
 * Decode the colour-lookup PROM (82s126.4a): 256 bytes, low nibble only,
 * mapping (colorCode * 4 + pixelValue) -> a palette index into
 * HARDWARE_PALETTE. MAME's pacman colortable decode reads the same low
 * nibble (`pacman.cpp`, `PALETTE_INIT_MEMBER` colortable loop); this is the
 * lookup half of that same routine, the palette decode above is the RGB half.
 */
export function decodeColourLookupFromProm(prom: Uint8Array): number[] {
  return Array.from(prom, (byte) => byte & 0x0f)
}

// ─── TILE ROM DECODE (pm3-4) ───────────────────────────────────────────────
// MAME pacman charlayout (src/mame/pacman/pacman.cpp): 8x8, 2 planes at bit
// offsets {0,4}; each tile is 16 bytes; xoffs/yoffs below reproduce the
// split-nibble layout exactly. Bit 0 of an offset is the MSB of byte 0. Cited
// here in prose per this story's "cite, don't copy" constraint — nothing
// below is pasted from MAME.

const TILE_BYTES = 16

/** The two bit-plane offsets a tile's 2bpp pixel is drawn from. Shared with
 *  pm3-5's sprite decode (16x16, same plane split), so it lives here rather
 *  than tile-private. */
export const TILE_PLANES = [0, 4]

const TILE_X = [8 * 8 + 0, 8 * 8 + 1, 8 * 8 + 2, 8 * 8 + 3, 0, 1, 2, 3]
const TILE_Y = [0 * 8, 1 * 8, 2 * 8, 3 * 8, 4 * 8, 5 * 8, 6 * 8, 7 * 8]

/** Read a single bit out of `rom` at `byteBase + (bitPos >> 3)`, MSB-first
 *  (bit 0 of an offset is the MSB of that byte). Shared with pm3-5's sprite
 *  decode — the same "planar ROM, MSB-first bit addressing" shape. */
export function bitAt(rom: Uint8Array, byteBase: number, bitPos: number): number {
  return (rom[byteBase + (bitPos >> 3)] >> (7 - (bitPos & 7))) & 1
}

/**
 * Decode one pixel (0..3, a 2bpp palette-group index) of tile `tileIndex`
 * at (x,y) in an 8x8 tile, from a pacman.5e/5f-shaped tile ROM (MAME
 * charlayout: 16 bytes/tile, planes at bit offsets {0,4}). Pure: no I/O
 * beyond the `rom` bytes passed in.
 */
export function decodeTilePixel(rom: Uint8Array, tileIndex: number, x: number, y: number): number {
  const base = tileIndex * TILE_BYTES
  let v = 0
  for (let p = 0; p < 2; p++) v |= bitAt(rom, base, TILE_PLANES[p] + TILE_X[x] + TILE_Y[y]) << p
  return v
}

// ─── SPRITE ROM DECODE (pm3-5) ─────────────────────────────────────────────
// MAME pacman spritelayout (src/mame/pacman/pacman.cpp): 16x16, 2 planes at
// bit offsets {0,4} (TILE_PLANES, reused above); each sprite is 64 bytes.
// xoffs/yoffs below reproduce that layout exactly — cited here in prose per
// this story's "cite, don't copy" constraint; nothing below is pasted from
// MAME. This IS the byte-cited half of pm3-5 (verified: tests/shell/
// sprites.test.ts re-derives SPRITES from this function and asserts byte
// equality against the baked module). What tile-data.ts's MAZE_TILEMAP is to
// pm3-4 — an AUTHORED table sitting on top of a byte-cited decode — sprite-
// data.ts's row-major assembly (tools/bake-graphics.mjs's bakeSprites) is to
// this function: see that tool's header for the authored 90°-rotation
// correction applied when assembling this function's raw (x,y) pixels into a
// screen-upright 16x16 image (this function's OWN (x,y) contract is exactly
// MAME's spritelayout coordinate, unmodified).
const SPR_BYTES = 64
const SPR_X = [
  8 * 8,
  8 * 8 + 1,
  8 * 8 + 2,
  8 * 8 + 3,
  16 * 8 + 0,
  16 * 8 + 1,
  16 * 8 + 2,
  16 * 8 + 3,
  24 * 8 + 0,
  24 * 8 + 1,
  24 * 8 + 2,
  24 * 8 + 3,
  0,
  1,
  2,
  3,
]
const SPR_Y = [
  0 * 8,
  1 * 8,
  2 * 8,
  3 * 8,
  4 * 8,
  5 * 8,
  6 * 8,
  7 * 8,
  32 * 8,
  33 * 8,
  34 * 8,
  35 * 8,
  36 * 8,
  37 * 8,
  38 * 8,
  39 * 8,
]

/**
 * Decode one pixel (0..3) of sprite `spriteIndex` at (x,y) in a 16x16 sprite,
 * from a pacman.5f-shaped sprite ROM (MAME spritelayout: 64 bytes/sprite,
 * planes at bit offsets {0,4} — same TILE_PLANES/bitAt primitives as
 * decodeTilePixel). Pure: no I/O beyond the `rom` bytes passed in.
 */
export function decodeSpritePixel(rom: Uint8Array, spriteIndex: number, x: number, y: number): number {
  const base = spriteIndex * SPR_BYTES
  let v = 0
  for (let p = 0; p < 2; p++) v |= bitAt(rom, base, TILE_PLANES[p] + SPR_X[x] + SPR_Y[y]) << p
  return v
}

// ─── VIDEO-RAM OFFSET MAPPER (pm3-8) ───────────────────────────────────────
// MAME `pacman_v.cpp:170` `pacman_scan_rows`: maps a (col,row) in Pac-Man's
// 36x28 tilemap to a video/colour-RAM offset. Re-implemented from the driver
// arithmetic, cited here in prose per this story's "cite, don't copy"
// constraint; nothing below is pasted from MAME.

/** MAME `pacman_v.cpp:170` `pacman_scan_rows`: maps a (col,row) in Pac-Man's
 *  36x28 tilemap to a video/colour-RAM offset (0..0x3ff). Re-implemented from
 *  the driver arithmetic (`row += 2; col -= 2; if (col & 0x20) ...`), cited not
 *  copied. `col` 0..35, `row` 0..27. */
export function pacmanScanRows(col: number, row: number): number {
  const r = row + 2
  const c = col - 2
  if (c & 0x20) return r + ((c & 0x1f) << 5)
  return c + (r << 5)
}

/** Screen cell (sx: column 0..27, sy: row 0..35) -> RAM offset. Pac-Man's tube
 *  is ROT90, so a screen row is a tilemap column: col=sy, row=sx. (If Task 6's
 *  oracle rejects this orientation, it is one of exactly four candidates —
 *  see that task.) */
export function mazeCellOffset(sx: number, sy: number): number {
  return pacmanScanRows(sy, sx)
}
