// tests/shell/maze-scan.test.ts
// pm3-8 — pins MAME's pacman_scan_rows mapper (pacman_v.cpp:170) that maps a
// (col,row) in the 36x28 tilemap to a video/colour-RAM offset.
import { describe, it, expect } from 'vitest'
import { pacmanScanRows, mazeCellOffset } from '../../src/shell/gfx-rom'

describe('pacmanScanRows (MAME pacman_v.cpp:170)', () => {
  it('playfield cells use the else branch: col + (row<<5)', () => {
    expect(pacmanScanRows(2, 0)).toBe(64) // col-2=0, row+2=2 -> 0 + (2<<5)
    expect(pacmanScanRows(3, 0)).toBe(65) // col-2=1 -> 1 + (2<<5)
    expect(pacmanScanRows(2, 1)).toBe(96) // row+2=3 -> 0 + (3<<5)
  })
  it('the two score/credit columns use the col&0x20 branch', () => {
    expect(pacmanScanRows(0, 0)).toBe(962) // col-2=-2 -> 2 + ((-2 & 0x1f)<<5) = 2 + (30<<5)
    expect(pacmanScanRows(34, 0)).toBe(2) // col-2=32 -> 2 + ((32 & 0x1f)<<5) = 2 + 0
    expect(pacmanScanRows(35, 27)).toBe(61) // col-2=33 -> 29 + ((33 & 0x1f)<<5) = 29 + 32
  })
  it('mazeCellOffset stays within the 0x400-byte RAM window for every screen cell', () => {
    for (let sy = 0; sy < 36; sy++)
      for (let sx = 0; sx < 28; sx++) {
        const off = mazeCellOffset(sx, sy)
        expect(off).toBeGreaterThanOrEqual(0)
        expect(off).toBeLessThan(0x400)
      }
  })
  it('mazeCellOffset maps distinct screen cells to distinct offsets (a bijection over the 28x36 grid)', () => {
    const seen = new Set<number>()
    for (let sy = 0; sy < 36; sy++)
      for (let sx = 0; sx < 28; sx++) seen.add(mazeCellOffset(sx, sy))
    expect(seen.size).toBe(28 * 36)
  })
})
