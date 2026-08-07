// tests/shell/maze-tilemap.test.ts
// pm3-8 — the authentic maze tilemap. Half 1 (here): the baked module equals a
// fresh unpack of maze-vram.bin. Half 2 (Task 6): the semantic oracle.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { mazeCellOffset } from '../../src/shell/gfx-rom'
import { MAZE_TILEMAP } from '../../src/shell/maze-tilemap-data'
import { MAZE } from '../../src/core/maze'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const vram = new Uint8Array(readFileSync(join(root, 'reference', 'graphics', 'maze-vram.bin')))

describe('maze tilemap (pm3-8)', () => {
  it('is a 36x28 grid of {tileIndex, colorCode}', () => {
    expect(MAZE_TILEMAP.length).toBe(MAZE.rows) // 36
    for (const row of MAZE_TILEMAP) {
      expect(row.length).toBe(MAZE.cols) // 28
      for (const cell of row) {
        expect(cell.tileIndex).toBeGreaterThanOrEqual(0)
        expect(cell.tileIndex).toBeLessThanOrEqual(255)
        expect(cell.colorCode).toBeGreaterThanOrEqual(0)
        expect(cell.colorCode).toBeLessThanOrEqual(0x1f)
      }
    }
  })

  it('equals a fresh unpack of the vendored video+colour RAM', () => {
    for (let sy = 0; sy < MAZE.rows; sy++)
      for (let sx = 0; sx < MAZE.cols; sx++) {
        const off = mazeCellOffset(sx, sy)
        expect(MAZE_TILEMAP[sy][sx]).toEqual({
          tileIndex: vram[off],
          colorCode: vram[0x400 + off] & 0x1f,
        })
      }
  })
})
