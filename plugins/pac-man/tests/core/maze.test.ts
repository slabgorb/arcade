// tests/core/maze.test.ts
//
// Story pm1-3 (RED, TEA) — the maze model's failing test, written BEFORE
// src/core/maze.ts exists. Per the task brief, the Step-1 stand-in
// (`ENERGIZER_TILES[0].y`) is replaced with a REAL tunnel-wrap assertion: the
// tunnel row must wrap left<->right through tileAt, not merely return
// `defined`. 240 dots + 4 energizers is glossary.md §Maze (derived from the
// real ROM literal `pacman.asm:20e6` — TOTAL_PELLETS=244 — minus the 4
// energizers; see glossary.md and docs/rom-study/claims/maze.json).

import { describe, it, expect } from 'vitest'
import { MAZE, tileAt, isWalkable, DOT_COUNT, ENERGIZER_TILES, TUNNEL_ROW, wrapThroughTunnel, type Tile } from '../../src/core/maze'
import { TILE_PX } from '../../src/core/actor'

describe('maze (glossary.md §Maze)', () => {
  it('is a 28x36 grid with 240 dots and 4 energizers', () => {
    expect(MAZE.cols).toBe(28)
    expect(MAZE.rows).toBe(36)
    expect(DOT_COUNT).toBe(240) // cite: glossary.md §Maze (pacman.asm:20e6 minus 4 energizers)
    expect(ENERGIZER_TILES).toHaveLength(4)
  })

  it('places every energizer on a real energizer tile', () => {
    for (const t of ENERGIZER_TILES) {
      expect(tileAt(t.x, t.y)).toBe('energizer')
    }
  })

  it('marks the tunnel row as wrapping left<->right through tileAt', () => {
    // One step left of column 0 on the tunnel row must land on the tunnel
    // tile at the FAR (right) edge, and vice versa — a real wrap, not just a
    // defined value.
    expect(tileAt(0, TUNNEL_ROW)).toBe('tunnel')
    expect(tileAt(MAZE.cols - 1, TUNNEL_ROW)).toBe('tunnel')
    expect(tileAt(-1, TUNNEL_ROW)).toBe(tileAt(MAZE.cols - 1, TUNNEL_ROW))
    expect(tileAt(MAZE.cols, TUNNEL_ROW)).toBe(tileAt(0, TUNNEL_ROW))
  })

  it('does NOT wrap on a non-tunnel row (wrap is row-specific)', () => {
    const otherRow = TUNNEL_ROW === 0 ? 1 : 0
    expect(tileAt(-1, otherRow)).toBe('wall')
    expect(tileAt(MAZE.cols, otherRow)).toBe('wall')
  })

  it('walls are never walkable by either actor', () => {
    // Scan the whole grid: every 'wall' tile must be unwalkable for both.
    for (let y = 0; y < MAZE.rows; y++) {
      for (let x = 0; x < MAZE.cols; x++) {
        if (tileAt(x, y) === 'wall') {
          expect(isWalkable(x, y, 'pac-man')).toBe(false)
          expect(isWalkable(x, y, 'ghost')).toBe(false)
        }
      }
    }
  })

  it('the house is walkable only by a ghost, and the gate only by a ghost', () => {
    let sawHouse = false
    let sawGate = false
    for (let y = 0; y < MAZE.rows; y++) {
      for (let x = 0; x < MAZE.cols; x++) {
        const kind = tileAt(x, y)
        if (kind === 'house') {
          sawHouse = true
          expect(isWalkable(x, y, 'ghost')).toBe(true)
          expect(isWalkable(x, y, 'pac-man')).toBe(false)
        }
        if (kind === 'gate') {
          sawGate = true
          expect(isWalkable(x, y, 'ghost')).toBe(true)
          expect(isWalkable(x, y, 'pac-man')).toBe(false)
        }
      }
    }
    expect(sawHouse, 'the maze must contain at least one house tile').toBe(true)
    expect(sawGate, 'the maze must contain at least one gate tile').toBe(true)
  })

  it('DOT_COUNT equals the number of dot tiles actually in the table', () => {
    let count = 0
    for (let y = 0; y < MAZE.rows; y++) {
      for (let x = 0; x < MAZE.cols; x++) {
        if (tileAt(x, y) === 'dot') count++
      }
    }
    expect(count).toBe(DOT_COUNT)
  })
})

describe('pm4-4: the ghost-house gate is a door set in a wall, not a barrier across a corridor', () => {
  // The reported bug (boss playtest; static reference screenshots in
  // sprint/demos/pm4-4/reference/): the gate is stamped one row too high — into
  // the OPEN lateral corridor above the house, with NO house-top wall flanking
  // it — so it bars Pac-Man's left<->right passage across that corridor. Blocking
  // Pac-Man from *entering* the house is correct and stays (covered above); it is
  // the lateral block that is the bug.
  //
  // Authentic Pac-Man (Dossier ch.3 "The Maze") recesses the 2-tile gate into the
  // house's TOP WALL, with a clear lateral lane directly above it. This maze is a
  // faithful *reconstruction*, not a byte-cited tile-by-tile transcription
  // (glossary.md §Maze; src/core/maze.ts header), so these assertions pin the
  // gate's STRUCTURE relative to its own neighbours — derived from the table, no
  // hardcoded row numbers — rather than an invented absolute coordinate.
  const gateTiles: Tile[] = []
  for (let y = 0; y < MAZE.rows; y++) {
    for (let x = 0; x < MAZE.cols; x++) {
      if (tileAt(x, y) === 'gate') gateTiles.push({ x, y })
    }
  }
  const gateRow = Math.min(...gateTiles.map((t) => t.y))
  const gateColL = Math.min(...gateTiles.map((t) => t.x))
  const gateColR = Math.max(...gateTiles.map((t) => t.x))

  it('is a contiguous run of gate tiles on one row (premise for the door/corridor checks)', () => {
    expect(gateTiles.length).toBeGreaterThanOrEqual(1)
    expect(new Set(gateTiles.map((t) => t.y)).size, 'all gate tiles must share one row').toBe(1)
    // contiguous columns, no gaps
    expect(gateColR - gateColL + 1).toBe(gateTiles.length)
  })

  it('is flanked left and right by tiles Pac-Man cannot enter (a door in a wall, not a lane)', () => {
    // If the tiles immediately beside the gate are open path, the gate is a
    // barrier dropped into a corridor and blocks lateral travel — the bug.
    expect(
      isWalkable(gateColL - 1, gateRow, 'pac-man'),
      `the tile left of the gate (${gateColL - 1},${gateRow}) must be an impassable wall, not open path`,
    ).toBe(false)
    expect(
      isWalkable(gateColR + 1, gateRow, 'pac-man'),
      `the tile right of the gate (${gateColR + 1},${gateRow}) must be an impassable wall, not open path`,
    ).toBe(false)
  })

  it('has an open lateral corridor directly above it that Pac-Man can traverse left<->right', () => {
    // The row directly above the gate is the lane Pac-Man crosses. Across the
    // gate's own columns AND the flanking shaft columns it must be continuously
    // walkable — Pac-Man passes over the top of the house, never into the gate.
    const corridorRow = gateRow - 1
    for (let x = gateColL - 1; x <= gateColR + 1; x++) {
      expect(
        isWalkable(x, corridorRow, 'pac-man'),
        `corridor tile (${x},${corridorRow}) above the gate must be walkable so Pac-Man can pass laterally`,
      ).toBe(true)
    }
  })
})

describe('wrapThroughTunnel (pm3-2) — position-wrap, not just tileAt lookup wrap', () => {
  const W = MAZE.cols * TILE_PX // 224

  it('wraps an actor stepping off the left edge on the tunnel row to the right edge', () => {
    const a = { xPx: -1, yPx: TUNNEL_ROW * TILE_PX, dir: 'left' as const, pending: 'none' as const }
    wrapThroughTunnel(a)
    expect(a.xPx).toBe(W - 1) // 223
  })

  it('wraps an actor stepping off the right edge to the left edge', () => {
    const a = { xPx: W, yPx: TUNNEL_ROW * TILE_PX, dir: 'right' as const, pending: 'none' as const }
    wrapThroughTunnel(a)
    expect(a.xPx).toBe(0)
  })

  it('does NOT wrap on any non-tunnel row', () => {
    const a = { xPx: -1, yPx: (TUNNEL_ROW + 1) * TILE_PX, dir: 'left' as const, pending: 'none' as const }
    wrapThroughTunnel(a)
    expect(a.xPx).toBe(-1) // untouched — only the tunnel row wraps
  })
})
