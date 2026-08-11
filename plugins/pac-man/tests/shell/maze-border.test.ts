// tests/shell/maze-border.test.ts
//
// Story pm4-12 (bug) — the maze's BOTTOM border wall was invisible: the maze
// looked open at the bottom. The playfield reserves HUD bands via `isHudRow`
// (render.ts), and it blanked THREE bottom rows (33-35) while the maze's bottom
// border wall is row 33 (`maze-topology.generated.ts` row 33 = all '#'). The TOP
// border (row 3) renders because the top band is only rows 0-2 — an asymmetry.
// Authentic Pac-Man is 3 top HUD rows + 2 bottom rows, so row 33 must render.
//
// These tests drive `drawMaze` through a mock ctx and count the wall tiles it
// paints per row (a wall is a `putImageData` at `py = row * TILE_PX`). The bottom
// border (row 33, y=264) must paint the SAME wall-tile row as the top border
// (row 3, y=24) — both are full `#` rows. RED before the fix: row 33 paints 0.

import { describe, it, expect } from 'vitest'
import { drawMaze } from '../../src/shell/render'
import { MAZE } from '../../src/core/maze'

const TILE_PX = 8
const TOP_BORDER_Y = 3 * TILE_PX // row 3 — the rendered top border (24)
const BOTTOM_BORDER_Y = (MAZE.rows - 3) * TILE_PX // row 33 — the maze's bottom border (264)

interface Put {
  x: number
  y: number
}

function fakeCtx(): { ctx: CanvasRenderingContext2D; puts: Put[] } {
  const puts: Put[] = []
  const ctx = {
    fillStyle: '',
    fillRect: () => {},
    createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: (_img: unknown, dx: number, dy: number) => puts.push({ x: dx, y: dy }),
  } as unknown as CanvasRenderingContext2D
  return { ctx, puts }
}

/** Wall/pellet tiles `drawMaze` painted on the tile-row whose top pixel is `y`. */
function tilesAtRow(puts: Put[], y: number): number {
  return puts.filter((p) => p.y === y).length
}

describe('pm4-12 maze bottom border (drawMaze)', () => {
  it('renders the bottom border wall row (row 33) — the maze must be closed at the bottom', () => {
    const { ctx, puts } = fakeCtx()
    drawMaze(ctx)
    expect(tilesAtRow(puts, BOTTOM_BORDER_Y)).toBeGreaterThan(0)
  })

  it('renders the bottom border symmetrically with the top border (both full # rows)', () => {
    const { ctx, puts } = fakeCtx()
    drawMaze(ctx)
    const top = tilesAtRow(puts, TOP_BORDER_Y)
    const bottom = tilesAtRow(puts, BOTTOM_BORDER_Y)
    expect(top, 'top border (row 3) must render as a positive control').toBeGreaterThan(0)
    expect(bottom, 'bottom border (row 33) must render the same full wall row as the top').toBe(top)
  })

  it('still blanks the two-row bottom HUD band (rows 34-35) for the drawHud icon rows', () => {
    // The fix narrows the bottom band to 2 rows (34-35); those stay black so drawHud
    // has clean space for its bottom-band content — the reserve-life and fruit-row
    // sprites since pm4-11 (formerly the LIVES/LEVEL text). A regression that blanked
    // nothing would fail this.
    const { ctx, puts } = fakeCtx()
    drawMaze(ctx)
    expect(tilesAtRow(puts, (MAZE.rows - 2) * TILE_PX)).toBe(0) // row 34
    expect(tilesAtRow(puts, (MAZE.rows - 1) * TILE_PX)).toBe(0) // row 35
  })
})
