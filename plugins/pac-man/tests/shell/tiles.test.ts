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
import { MAZE_TILEMAP } from '../../src/shell/maze-tilemap-data'
import { tileAt } from '../../src/core/maze'
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

  // pm3-8 rewrite: drawMaze now blits the AUTHENTIC baked tilemap
  // (maze-tilemap-data.ts, unpacked straight from the cabinet's own video +
  // colour RAM) instead of the retired pm3-4 heuristic autotiler, so this
  // test's premise changed along with it — see the finding below.
  //
  // pm3-4's "never a pellet-peach pixel on any wall blit" guard was true
  // ONLY because that story's autotiler deliberately hand-picked tiles using
  // a single ink plane (pv3) to sidestep exactly this colour-bleed risk (see
  // the retired file header this test used to cite). The authentic tilemap
  // has no such constraint: the ENTIRE 30-row playfield shares ONE colour
  // attribute (code 16 — `pacman.asm:24df`/`24e1`, cited in
  // maze-tilemap-data.ts's header) for BOTH the wall line art and the dots,
  // and this hardware's colour PROM assigns that one attribute's
  // pixel-value-1 to the exact warm-pink/peach RGB the dots render in
  // (HARDWARE_PALETTE[14], [255,184,174]) and pixel-value-3 to the wall's
  // blue (HARDWARE_PALETTE[11], [33,33,255]). MEASURED directly against this
  // baked table: every one of the 420 real playfield wall blits that paints
  // blue ALSO paints that exact peach RGB somewhere in the same 8x8 tile —
  // a genuine decorative highlight baked into the authentic corner/line art
  // (classic Pac-Man's maze corners really do carry small pink accents), not
  // a rendering defect. A "peach never appears on any wall" sweep would
  // therefore assert something FALSE of the authentic renderer, so it is
  // retired along with the heuristic it was guarding. What replaces it: pin
  // that a real playfield wall cell paints the CABINET's own wall ink (read
  // via colourLookup off the real colour PROM), not the old fabricated
  // BLUE constant this test used to hardcode.
  it('a playfield wall-tile blit contains the authentic hardware wall ink', () => {
    const ctx = fakeCtx()
    drawMaze(ctx, new Set())
    const calls = (ctx as unknown as { calls: RecordedCall[] }).calls

    // (1,3): a genuine playfield line-art wall cell (tileIndex 218, colour
    // code 16) — not a HUD-band cell, not the border corner at (0,3) (that
    // one, tileIndex 208, is itself one of the peach-accented tiles above).
    expect(tileAt(1, 3)).toBe('wall')
    const wallCell = MAZE_TILEMAP[3][1]
    const wallInk = HARDWARE_PALETTE[colourLookup(wallCell.colorCode, 3)] // pv3 = wall ink

    const call = calls.find(
      (c) => c.method === 'putImageData' && c.x === 1 * TILE_PX && c.y === 3 * TILE_PX && c.w === 8 && c.h === 8,
    )
    expect(call).toBeDefined()
    const data = (call as RecordedCall).data as Uint8ClampedArray

    let sawInk = false
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] === wallInk[0] && data[i + 1] === wallInk[1] && data[i + 2] === wallInk[2]) sawInk = true
    }
    expect(sawInk).toBe(true)
  })
})
