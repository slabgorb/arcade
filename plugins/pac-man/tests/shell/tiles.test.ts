// tests/shell/tiles.test.ts
//
// Story pm3-4 — pins the MAME `charlayout` decode of the 8x8 tile ROM
// (pacman.5e, pm3-1's citation-gated reference/graphics/) and proves
// drawMaze blits real tile pixels instead of a solid fillRect per wall tile.

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { decodeTilePixel, decodeColourLookupFromProm } from '../../src/shell/gfx-rom'
import { TILES } from '../../src/shell/tile-data'
import { drawMaze } from '../../src/shell/render'
import { colourLookup, HARDWARE_PALETTE } from '../../src/shell/palette-data'
import { tileAt, MAZE } from '../../src/core/maze'
import { TILE_PX } from '../../src/core/actor'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const rom = new Uint8Array(readFileSync(join(root, 'reference', 'graphics', 'pacman.5e')))
const lookupProm = new Uint8Array(readFileSync(join(root, 'reference', 'graphics', '82s126.4a')))

describe('tile decode (pm3-4)', () => {
  it('decodes 256 tiles, every pixel a 2-bit value', () => {
    expect(TILES.length).toBe(256)
    for (const t of TILES) {
      expect(t.length).toBe(64)
      for (const px of t) {
        expect(px).toBeGreaterThanOrEqual(0)
        expect(px).toBeLessThanOrEqual(3)
      }
    }
  })

  it('the baked tiles equal a fresh decode of the vendored ROM', () => {
    const fresh = Array.from({ length: 256 }, (_, i) =>
      Uint8Array.from({ length: 64 }, (_, k) => decodeTilePixel(rom, i, k % 8, (k / 8) | 0)),
    )
    expect(TILES.map((t) => [...t])).toEqual(fresh.map((t) => [...t]))
  })
})

describe('colourLookup (pm3-3 direct coverage)', () => {
  it('colourLookup(1, k) returns the byte at COLOUR_LOOKUP[4 + k], for every pixel value', () => {
    const lookup = decodeColourLookupFromProm(lookupProm)
    for (let k = 0; k < 4; k++) {
      expect(colourLookup(1, k)).toBe(lookup[4 + k])
    }
  })
})

// Each recorded call is TAGGED by which ctx method produced it, so the test
// below can tell a real ctx.putImageData tile blit apart from a ctx.fillRect
// solid rectangle even though both happen to be called with an 8x8 w/h —
// an untagged {x,y,w,h} shape (the pre-fix version of this fake) could not
// distinguish them, and so passed against BOTH a real tile-blit drawMaze and
// a reverted-to-fillRect one.
interface RecordedCall {
  method: 'fillRect' | 'putImageData'
  x: number
  y: number
  w: number
  h: number
  data?: Uint8ClampedArray
}

function fakeCtx() {
  const puts: RecordedCall[] = []
  return {
    calls: puts,
    fillStyle: '',
    fillRect: (x: number, y: number, w: number, h: number) => puts.push({ method: 'fillRect', x, y, w, h }),
    // real render uses putImageData for tiles; record its dimensions AND its
    // pixel data, so a test can check not just "8x8 blit happened" but
    // "the right COLOURS came out" (round-1's bug: correctly-shaped 8x8
    // blits whose pixels were still the wrong colour).
    putImageData: (img: { width: number; height: number; data: Uint8ClampedArray }, dx: number, dy: number) =>
      puts.push({ method: 'putImageData', x: dx, y: dy, w: img.width, h: img.height, data: img.data }),
    createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    clearRect: () => {},
    beginPath: () => {},
    arc: () => {},
    fill: () => {},
    save: () => {},
    restore: () => {},
  } as unknown as CanvasRenderingContext2D
}

describe('drawMaze tile blit (pm3-4)', () => {
  it('draws the maze as 8x8 tile blits via putImageData, never a solid fillRect wall tile', () => {
    const ctx = fakeCtx()
    drawMaze(ctx, new Set())
    const calls = (ctx as unknown as { calls: RecordedCall[] }).calls

    // At least one blit is a real 8x8 tile image via putImageData — proves
    // the maze IS drawn with tile-ROM pixels, not just that SOMETHING is 8x8.
    expect(calls.some((c) => c.method === 'putImageData' && c.w === 8 && c.h === 8)).toBe(true)

    // No fillRect paints a full 8x8 wall tile — proves drawMaze did NOT fall
    // back to (or regress to) the old flat solid-rectangle wall. A reverted
    // drawMaze that fillRect's every wall tile at TILE_PX x TILE_PX fails
    // this line.
    expect(calls.some((c) => c.method === 'fillRect' && c.w === 8 && c.h === 8)).toBe(false)
  })

  // Round-2 fix regression guard: round 1 passed every test above (correct
  // 8x8 putImageData shape) while still rendering PEACH pixels into the
  // maze walls (the controller's visual-playtest defect — the chosen wall
  // tiles mixed two ink planes, and the wall colour code resolves one of
  // them to peach). Shape-only assertions can never catch a wrong-colour
  // regression like that; this test reads the actual blitted pixel bytes.
  it('wall-tile blits contain the authentic blue and never the pellet peach', () => {
    const ctx = fakeCtx()
    drawMaze(ctx, new Set())
    const calls = (ctx as unknown as { calls: RecordedCall[] }).calls

    // pm3-8: the maze is monochrome-by-type. Wall cells paint HARDWARE_PALETTE[11]
    // (blue) on every ink pixel; the pellet peach must never appear on a wall.
    const BLUE = HARDWARE_PALETTE[11]
    const PEACH = HARDWARE_PALETTE[14]

    const wallBlits = calls.filter(
      (c) => c.method === 'putImageData' && c.data && tileAt(c.x / TILE_PX, c.y / TILE_PX) === 'wall',
    )
    expect(wallBlits.length).toBeGreaterThan(0)

    let sawBlue = false
    for (const call of wallBlits) {
      const data = call.data as Uint8ClampedArray
      for (let i = 0; i < data.length; i += 4) {
        const rgb = [data[i], data[i + 1], data[i + 2]]
        if (rgb[0] === PEACH[0] && rgb[1] === PEACH[1] && rgb[2] === PEACH[2]) {
          throw new Error(`wall tile at (${call.x},${call.y}) painted a pellet-peach pixel`)
        }
        if (rgb[0] === BLUE[0] && rgb[1] === BLUE[1] && rgb[2] === BLUE[2]) sawBlue = true
      }
    }
    expect(sawBlue).toBe(true)
  })

  // Round-3 fix regression guard: rounds 1-2 both passed every test above
  // (real 8x8 putImageData blits, correct blue/no-peach colour) while the
  // maze still rendered as ~20 full-width horizontal stripes — every INTERIOR
  // wall cell (walls on all four orthogonal sides, e.g. inside a 2-3-cell-
  // thick block or an all-'#' HUD row) fell through to the horizontal-line
  // default instead of painting nothing. Locate one real interior wall cell
  // and one real corridor-edge wall cell directly from the maze table (not
  // hardcoded coordinates, so this stays correct if the table is ever
  // edited), and assert drawMaze treats them oppositely.
  function findWallCell(wantInterior: boolean): { tx: number; ty: number } {
    for (let ty = 3; ty < MAZE.rows - 3; ty++) {
      for (let tx = 0; tx < MAZE.cols; tx++) {
        if (tileAt(tx, ty) !== 'wall') continue
        const up = tileAt(tx, ty - 1) === 'wall'
        const down = tileAt(tx, ty + 1) === 'wall'
        const left = tileAt(tx - 1, ty) === 'wall'
        const right = tileAt(tx + 1, ty) === 'wall'
        const isInterior = up && down && left && right
        if (isInterior === wantInterior) return { tx, ty }
      }
    }
    throw new Error(`no ${wantInterior ? 'interior' : 'edge'} wall cell found in the maze table`)
  }

  it('an interior wall cell draws nothing; a corridor-edge wall cell draws a tile', () => {
    const interior = findWallCell(true)
    const edge = findWallCell(false)

    const ctx = fakeCtx()
    drawMaze(ctx, new Set())
    const calls = (ctx as unknown as { calls: RecordedCall[] }).calls

    const paintsAt = (tx: number, ty: number) =>
      calls.some((c) => c.x === tx * TILE_PX && c.y === ty * TILE_PX && c.w === 8 && c.h === 8)

    expect(paintsAt(interior.tx, interior.ty)).toBe(false) // black background, no blit at all
    expect(paintsAt(edge.tx, edge.ty)).toBe(true) // a line/corner tile facing the open side
  })

  it('the top and bottom HUD bands never paint wall line art', () => {
    const ctx = fakeCtx()
    drawMaze(ctx, new Set())
    const calls = (ctx as unknown as { calls: RecordedCall[] }).calls

    for (let ty = 0; ty < MAZE.rows; ty++) {
      if (ty >= 3 && ty < MAZE.rows - 3) continue // real 30-row maze, not the HUD bands
      for (let tx = 0; tx < MAZE.cols; tx++) {
        // Only per-TILE paints (w===8, h===8) count — clearField's initial
        // full-canvas fillRect(0, 0, 224, 288) also lands at x=0,y=0 and
        // must not be mistaken for a wall-tile blit at cell (0,0).
        const hit = calls.some((c) => c.x === tx * TILE_PX && c.y === ty * TILE_PX && c.w === 8 && c.h === 8)
        expect(hit).toBe(false)
      }
    }
  })
})
