// tests/shell/maze-tilemap.test.ts
// pm3-8 — the authentic maze tile-index grid. Half 1 (here): the baked module
// equals a fresh unpack of maze-vram.bin. Half 2 (Task 6): the semantic oracle.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { mazeCellOffset } from '../../src/shell/gfx-rom'
import { MAZE_TILES } from '../../src/shell/maze-tilemap-data'
import { MAZE, tileAt, isWalkable, ENERGIZER_TILES, TUNNEL_ROW } from '../../src/core/maze'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const vram = new Uint8Array(readFileSync(join(root, 'reference', 'graphics', 'maze-vram.bin')))

describe('maze tile-index grid (pm3-8)', () => {
  it('is a 36x28 grid of tile indices (0..255)', () => {
    expect(MAZE_TILES.length).toBe(MAZE.rows) // 36
    for (const row of MAZE_TILES) {
      expect(row.length).toBe(MAZE.cols) // 28
      for (const t of row) {
        expect(t).toBeGreaterThanOrEqual(0)
        expect(t).toBeLessThanOrEqual(255)
      }
    }
  })

  it('equals a fresh unpack of the vendored video RAM', () => {
    for (let sy = 0; sy < MAZE.rows; sy++)
      for (let sx = 0; sx < MAZE.cols; sx++)
        expect(MAZE_TILES[sy][sx]).toBe(vram[mazeCellOffset(sx, sy)])
  })
})

const DOT_TILE = 16 // 0x10, pacman.asm:2463
const ENERGIZER_TILE = 20 // 0x14
const SPACE_TILE = 0x40 // Pac-Man blank/background tile

describe('maze tilemap oracle — authentic layout agrees with core (pm3-8)', () => {
  it('every core dot cell carries the dot tile (0x10) in the authentic map', () => {
    for (let ty = 0; ty < 36; ty++)
      for (let tx = 0; tx < 28; tx++)
        if (tileAt(tx, ty) === 'dot')
          expect(MAZE_TILES[ty][tx], `dot expected at ${tx},${ty}`).toBe(DOT_TILE)
  })

  it('the four core energizer cells carry the energizer tile (0x14)', () => {
    expect(ENERGIZER_TILES.length).toBe(4)
    for (const { x, y } of ENERGIZER_TILES)
      expect(MAZE_TILES[y][x], `energizer at ${x},${y}`).toBe(ENERGIZER_TILE)
  })

  it('the authentic map places exactly four energizer tiles', () => {
    let n = 0
    for (const row of MAZE_TILES) for (const t of row) if (t === ENERGIZER_TILE) n++
    expect(n).toBe(4)
  })

  it('the tunnel row is open (background tiles) edge-to-edge at both ends', () => {
    expect(MAZE_TILES[TUNNEL_ROW][0]).toBe(SPACE_TILE)
    expect(MAZE_TILES[TUNNEL_ROW][27]).toBe(SPACE_TILE)
  })

  it('core marks a contiguous ghost house that holds no dots (hollow interior)', () => {
    // The attract capture over-paints the house with GAME OVER, so we cannot
    // assert the capture shows background inside the house. Instead assert the
    // structural fact: core's house region is a real enclosed house — a block of
    // >10 'house' cells, none of which is a dot/energizer (a house is hollow of
    // pellets), all pac-man-impassable. pm3-9: house is ROM-geometry-stamped.
    let houseCells = 0
    for (let ty = 0; ty < 36; ty++)
      for (let tx = 0; tx < 28; tx++)
        if (tileAt(tx, ty) === 'house') {
          houseCells++
          expect(isWalkable(tx, ty, 'pac-man'), `pac-man barred at house ${tx},${ty}`).toBe(false)
          expect(isWalkable(tx, ty, 'ghost'), `ghost allowed in house ${tx},${ty}`).toBe(true)
        }
    expect(houseCells).toBeGreaterThan(10)
  })
})
