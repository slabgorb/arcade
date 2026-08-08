// tests/shell/maze-tile-rotation.test.ts
//
// Story pm3-9 Task 4b — pins the ROT90 correction the maze wall-tile blit
// needs but was missing. Task 4's Playwright visual caught fragmented
// (90°-rotated) wall line art despite the full suite and the pm3-8 oracle
// being green: `mazeTileImageData` was reading `TILES` (tile-data.ts, baked
// with NO rotation — raw ROM coordinates) directly, but Pac-Man's cabinet is
// ROT90 (portrait monitor), so directional wall-art tiles point the wrong
// way and don't connect (see render.ts's `rotatedTilePixel`, which already
// solves this identical problem for the digit-glyph path).
//
// Tile 219 is the asymmetric proof case: it fills the maze's top *horizontal*
// border (screen row 3 of the maze, all 8 columns), but its RAW art (as
// decoded straight off pacman.5e, no rotation) is a left-VERTICAL band —
// column 0-3 filled, every row. Only after applying the same 90°-clockwise
// correction `rotatedTilePixel` already ships (x'=y, y'=(7-x)) does reading
// tile 219 in screen-upright (x,y) order produce a top-horizontal band.

import { describe, it, expect } from 'vitest'
import { rotatedTilePixel } from '../../src/shell/render'

describe('rotatedTilePixel (pm3-9 Task 4b — maze ROT90 fix)', () => {
  it('tile 219 rotates from a raw left-vertical band into a screen top-horizontal band', () => {
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 8; x++) {
        expect(rotatedTilePixel(219, x, y), `expected ink at (${x},${y})`).not.toBe(0)
      }
    }
    for (let y = 4; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        expect(rotatedTilePixel(219, x, y), `expected no ink at (${x},${y})`).toBe(0)
      }
    }
  })
})
