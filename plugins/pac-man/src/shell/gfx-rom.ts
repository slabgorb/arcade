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
