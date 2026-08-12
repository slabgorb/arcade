// src/shell/gfx-rom.ts
//
// Story ml2-2 — the PURE 8x8 stamp decode seam: picture-ROM bytes in, plain
// pixel data out. The millipede half of pac-man's pure gfx-rom shape
// (plugins/pac-man/src/shell/gfx-rom.ts): no fetch, no DOM, no canvas, no
// clock, no entropy — the ml1-1 purity scanner sweeps this file's source
// (tests/gfx-rom.test.ts AC-4) even though it lives in src/shell, because
// BOTH consumers run outside a browser: vitest's node environment today, and
// tools/bake-graphics.mjs (ml2-4) importing this .ts file directly under
// Node's type stripping — so everything here stays erasable-syntax-only.
//
// THE DECODE LAW (derived, cited in prose — GPL: never copied): Millipede's
// picture region is two bitplanes, one per picture EPROM (368X1.DOC:22-23
// ledgers the pair; the preserved bytes are the MAME `milliped` set's
// 136013-106/107 — ml1 OQ-3). There is no CENPIC-style vendored picture
// source for Millipede, so the law is stated in our own words, from
// centipede's in-tree CENPIC decode (plugins/centipede/src/core/pictures.ts,
// decodeStamp — the story's named model) corroborated by the milliped tile
// decode in MAME's centiped driver family (named as a citation; no MAME code
// transcribed):
//
//   • the region splits in HALF — first half the low bitplane, second the
//     high; which CHIP is which half is the vendor/bake side's business
//     (ml2-1/ml2-4, where the visual playtest catches an inversion)
//   • a stamp's row r is one byte per plane at `offset + r` (offset is a
//     per-plane BYTE offset: tile n sits at n*8, and a CENPIC-style label
//     offset addresses rows directly)
//   • within a row byte, x = 0 is the most significant bit
//   • a pixel's colour index is (highBit << 1) | lowBit — 0..3

/**
 * Decode one 8x8 stamp from a two-plane picture region into 8 rows of 8
 * 2-bit colour indices (0..3). Pure: no I/O beyond the `rom` bytes passed in.
 * Throws RangeError on a region that cannot split into two planes (empty or
 * odd length) and on an offset that is not an integer in 0..planeSize-8 —
 * an out-of-window offset would silently read the other plane's bytes as
 * rows and return a plausible-looking wrong grid.
 */
export function decodeStamp(rom: Uint8Array, offset: number): number[][] {
  if (rom.length === 0 || rom.length % 2 !== 0) {
    throw new RangeError(`picture region must be non-empty and even-length to split into two planes, got ${rom.length} bytes`)
  }
  const planeSize = rom.length / 2
  if (!Number.isInteger(offset) || offset < 0 || offset + 8 > planeSize) {
    throw new RangeError(`stamp offset must be an integer in 0..${planeSize - 8}, got ${offset}`)
  }
  const grid: number[][] = []
  for (let r = 0; r < 8; r++) {
    const low = rom[offset + r]
    const high = rom[planeSize + offset + r]
    const row: number[] = []
    for (let x = 0; x < 8; x++) {
      const mask = 0x80 >> x // x = 0 is the MSB
      row.push((high & mask ? 2 : 0) | (low & mask ? 1 : 0))
    }
    grid.push(row)
  }
  return grid
}
