// tests/decode-orientation.test.ts
//
// Story cp1-6 — RED phase (O'Brien / TEA). CARRY-FORWARD (1) from cp1-3: ONE
// hand-derived pixel-grid golden that locks decodeStamp's orientation — MSB-first
// column order AND top-to-bottom row order — against a SILENT flip. cp1-3 gated
// the ROM bytes byte-for-byte and by SHA-256, but a decode that read LSB-first or
// bottom-up would still pass a byte gate while rendering every glyph mirrored /
// upside-down. The atlas cp1-6 builds is only as correct as this orientation, so
// it is pinned here with a grid derived BY HAND from the ROM bytes on paper.
//
// ── HAND DERIVATION of DIGIT_7 (offset 0x338, tile, lower plane all 0x00) ──────
// Rule (docs/rom-study/pictures.md, claims 05): colour = (upperBit<<1)|lowerBit,
// pixel x=0 is the MSB (0x80), row r reads byte[offset+r] top-to-bottom.
// The upper-plane bytes, expanded MSB→LSB (a set bit → colour 2, lower=0):
//   r0 0x06 = 0000_0110 → . . . . . 2 2 .
//   r1 0x06 = 0000_0110 → . . . . . 2 2 .
//   r2 0xE2 = 1110_0010 → 2 2 2 . . . 2 .
//   r3 0xF2 = 1111_0010 → 2 2 2 2 . . 2 .
//   r4 0x1A = 0001_1010 → . . . 2 2 . 2 .
//   r5 0x0E = 0000_1110 → . . . . 2 2 2 .
//   r6 0x06 = 0000_0110 → . . . . . 2 2 .
//   r7 0x00 = 0000_0000 → . . . . . . . .
// A "7": the shape is asymmetric BOTH ways, so a horizontal mirror (LSB-first) OR
// a vertical flip (bottom-up rows) yields a different grid and reddens this test.
//
// ── PLANE-COMBINATION lock: MUSHROOM_FULL row 3 (offset 0x3F8) ────────────────
// This row uses BOTH planes, so it also pins that decode combines them as
// (upper<<1)|lower and not the reverse. lo=0x6E=0110_1110, up=0x91=1001_0001:
//   x0 lo0 up1 → 2   x1 lo1 up0 → 1   x2 lo1 up0 → 1   x3 lo0 up1 → 2
//   x4 lo1 up0 → 1   x5 lo1 up0 → 1   x6 lo1 up0 → 1   x7 lo0 up1 → 2
//   → [2,1,1,2,1,1,1,2] (reversed → [2,1,1,1,2,1,1,2], swapped planes → 1 at x0).
//
// decodeStamp already exists (cp1-3), so these assertions are GREEN today — they
// are a permanent regression fence for the atlas work, not a RED driver. (Every
// value is hand-typed from the ROM bytes above, never read back from the code.)

import { describe, it, expect } from 'vitest'
import { decodeStamp, STAMPS, type Stamp } from '../src/core/pictures'

function stamp(name: string): Stamp {
  const s = STAMPS.find((x) => x.name === name)
  if (!s) throw new Error(`no stamp named ${name}`)
  return s
}

describe('cp1-6 carry-forward (1) — decodeStamp orientation golden', () => {
  it('DIGIT_7 decodes to the hand-derived grid (MSB-first columns, top-down rows)', () => {
    const grid = decodeStamp(stamp('DIGIT_7'))
    expect(grid).toEqual([
      [0, 0, 0, 0, 0, 2, 2, 0],
      [0, 0, 0, 0, 0, 2, 2, 0],
      [2, 2, 2, 0, 0, 0, 2, 0],
      [2, 2, 2, 2, 0, 0, 2, 0],
      [0, 0, 0, 2, 2, 0, 2, 0],
      [0, 0, 0, 0, 2, 2, 2, 0],
      [0, 0, 0, 0, 0, 2, 2, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ])
  })

  it('a horizontal mirror of the golden would NOT match (proves MSB-first, not LSB-first)', () => {
    const grid = decodeStamp(stamp('DIGIT_7'))
    const mirrored = grid.map((row) => [...row].reverse())
    expect(mirrored).not.toEqual(grid)
  })

  it('a vertical flip of the golden would NOT match (proves top-down row order)', () => {
    const grid = decodeStamp(stamp('DIGIT_7'))
    const flipped = [...grid].reverse()
    expect(flipped).not.toEqual(grid)
  })

  it('MUSHROOM_FULL row 3 locks the (upper<<1)|lower plane combination', () => {
    const grid = decodeStamp(stamp('MUSHROOM_FULL'))
    expect(grid[3]).toEqual([2, 1, 1, 2, 1, 1, 1, 2])
  })

  it('a sprite decodes 16 rows, a tile decodes 8 (geometry the atlas packs by)', () => {
    expect(decodeStamp(stamp('GUN'))).toHaveLength(16)
    expect(decodeStamp(stamp('DIGIT_7'))).toHaveLength(8)
    for (const row of decodeStamp(stamp('GUN'))) expect(row).toHaveLength(8)
  })
})
