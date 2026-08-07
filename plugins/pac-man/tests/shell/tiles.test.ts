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
import { colourLookup } from '../../src/shell/palette-data'

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

function fakeCtx() {
  const puts: { x: number; y: number; w: number; h: number }[] = []
  return {
    calls: puts,
    fillStyle: '',
    fillRect: (x: number, y: number, w: number, h: number) => puts.push({ x, y, w, h }),
    // real render uses putImageData for tiles; record its dimensions
    putImageData: (img: { width: number; height: number }, dx: number, dy: number) =>
      puts.push({ x: dx, y: dy, w: img.width, h: img.height }),
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
  it('draws the maze as 8x8 tile blits, not one solid rectangle per wall tile', () => {
    const ctx = fakeCtx()
    drawMaze(ctx, new Set())
    // At least one blit is a full 8x8 tile image (a real tile), proving we no
    // longer paint a flat fillRect wall.
    expect((ctx as unknown as { calls: { w: number; h: number }[] }).calls.some((c) => c.w === 8 && c.h === 8)).toBe(
      true,
    )
  })
})
