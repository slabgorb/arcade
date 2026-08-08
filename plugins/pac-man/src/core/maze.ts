// src/core/maze.ts
//
// Story pm1-3 (GREEN, Julia) — the maze model. Pure data + pure lookups only:
// no DOM, no clock, no Math.random, no shell import (the core/shell boundary
// the purity sweep — tests/purity.test.ts — arms the moment this file lands).
//
// The one number that DOES have a real ROM anchor is the total pellet count.
// `pacman.asm:20e6` loads the literal `#f4` = 244 = 240 dots + 4 energizers,
// in the fruit-bonus threshold routine (the dossier's "first fruit at 70
// dots eaten, second at 170" logic subtracts the running dot-eaten count from
// this same 244). See docs/rom-study/glossary.md §Maze and
// docs/rom-study/claims/maze.json (claim MAZE-TOTAL-PELLETS). DOT_COUNT below
// is TOTAL_PELLETS minus the energizers this table actually contains — a
// derived value, re-checked against the table itself by
// tests/core/maze.test.ts, never hardcoded independent of the table.

import { TILE_PX } from './actor'
// The authentic per-cell topology, baked byte-for-byte from the MAME video-RAM
// capture by tools/bake-core-maze.mjs (pm3-9). Replaces pm1-3's non-byte-cited
// reconstruction; re-derivation is pinned by tests/core/maze-topology.test.ts.
// GPL firewall: source is the capture + ROM geometry, not shaunlebron/pacman.
import { MAZE_ROWS } from './maze-topology.generated'

/** The `pacman.asm:20e6` literal: 240 dots + 4 energizers. Not itself a
 *  TileKind count — see DOT_COUNT below, which is derived from this minus
 *  the energizers the table actually places. */
const TOTAL_PELLETS = 244 // pacman.asm:20e6 (claims/maze.json MAZE-TOTAL-PELLETS)

export type TileKind = 'wall' | 'path' | 'dot' | 'energizer' | 'tunnel' | 'house' | 'gate'

export interface Tile {
  readonly x: number
  readonly y: number
}

export interface MazeSpec {
  readonly cols: number
  readonly rows: number
}

/** 28x36 tiles at 8px/tile => the cabinet's 224x288 logical resolution
 *  (brief.md; layout.ts's LOGICAL_W/LOGICAL_H are derived from these, not a
 *  second hardcoded pair). */
export const MAZE: MazeSpec = { cols: 28, rows: 36 }

/** Which actor is asking `isWalkable` — the house/gate rule (pac-man may not
 *  enter the ghost house or its gate; a ghost may) is the one place the two
 *  actors' passable tiles differ. */
export type Actor = 'pac-man' | 'ghost'

// ─── THE ROW TABLE ────────────────────────────────────────────────────────
// One character per tile, 28 characters per row, 36 rows. MAZE_ROWS comes
// from maze-topology.generated (pm3-9) and already carries the HUD bands
// (rows 0-2, 33-35) as all-'#'; no HUD spread needed here.
//   '#' wall        '.' dot          'o' energizer
//   ' ' path (no dot, e.g. plaza/tunnel-row floor)
//   '=' gate (ghost-house door)      'H' house interior
//   'T' tunnel exit (the wrap tile, tunnel row only)
const ROWS: readonly string[] = MAZE_ROWS

if (ROWS.length !== MAZE.rows) {
  throw new Error(`maze row table has ${ROWS.length} rows, expected ${MAZE.rows}`)
}
for (const [i, row] of ROWS.entries()) {
  if (row.length !== MAZE.cols) {
    throw new Error(`maze row ${i} has ${row.length} columns, expected ${MAZE.cols}`)
  }
}

/** The one row in the table carrying tunnel tiles ('T'), where tileAt wraps
 *  horizontally. Computed from the table itself, never hardcoded, so a row
 *  edit that moves the tunnel keeps this in sync automatically. */
export const TUNNEL_ROW: number = ROWS.findIndex((row) => row.includes('T'))
if (TUNNEL_ROW < 0) throw new Error('maze row table has no tunnel row (no "T" tile)')

function kindOf(ch: string): TileKind {
  switch (ch) {
    case '#':
      return 'wall'
    case '.':
      return 'dot'
    case 'o':
      return 'energizer'
    case ' ':
      return 'path'
    case '=':
      return 'gate'
    case 'H':
      return 'house'
    case 'T':
      return 'tunnel'
    default:
      throw new Error(`maze row table: unrecognised tile character ${JSON.stringify(ch)}`)
  }
}

/** The tile at grid coordinate (tx,ty), wrapping horizontally ONLY on the
 *  tunnel row — the real cabinet's single left<->right wrap point. Any other
 *  out-of-range coordinate (including out-of-range tx on a non-tunnel row,
 *  and any out-of-range ty) is 'wall': there is nothing to walk onto off the
 *  edge of the cabinet. */
export function tileAt(tx: number, ty: number): TileKind {
  if (ty < 0 || ty >= MAZE.rows) return 'wall'
  if (tx < 0 || tx >= MAZE.cols) {
    if (ty !== TUNNEL_ROW) return 'wall'
    const wrapped = ((tx % MAZE.cols) + MAZE.cols) % MAZE.cols
    return kindOf(ROWS[ty][wrapped])
  }
  return kindOf(ROWS[ty][tx])
}

/** Can `actor` occupy (tx,ty)? Walls are never walkable. The ghost house and
 *  its gate are walkable only by a ghost (the brief's "gate passable only by
 *  house logic" rule) — pac-man never enters either. Every other kind (path,
 *  dot, energizer, tunnel) is walkable by both; eating a dot/energizer is a
 *  later task's concern, not a walkability one. */
export function isWalkable(tx: number, ty: number, actor: Actor): boolean {
  const kind = tileAt(tx, ty)
  switch (kind) {
    case 'wall':
      return false
    case 'house':
    case 'gate':
      return actor === 'ghost'
    default:
      return true
  }
}

/** Every energizer tile in the table, in row-major scan order. Computed from
 *  the table, not hand-transcribed, so it can never silently drift from what
 *  tileAt actually reports. */
export const ENERGIZER_TILES: readonly Tile[] = ROWS.flatMap((row, y) =>
  [...row].flatMap((ch, x) => (ch === 'o' ? [{ x, y }] : [])),
)

/** Regular dots in the table. Derived two ways, cross-checked at module load
 *  (never two independent literals that could drift): the direct scan, and
 *  TOTAL_PELLETS (the one real `pacman.asm:20e6` anchor) minus the
 *  energizers this table actually places. */
const DOT_COUNT_FROM_TABLE: number = ROWS.reduce(
  (n, row) => n + [...row].filter((ch) => ch === '.').length,
  0,
)
const DOT_COUNT_FROM_ROM: number = TOTAL_PELLETS - ENERGIZER_TILES.length

if (DOT_COUNT_FROM_TABLE !== DOT_COUNT_FROM_ROM) {
  throw new Error(
    `maze row table has ${DOT_COUNT_FROM_TABLE} dots, but pacman.asm:20e6's TOTAL_PELLETS(${TOTAL_PELLETS}) ` +
      `minus ${ENERGIZER_TILES.length} energizers expects ${DOT_COUNT_FROM_ROM}`,
  )
}

/** Regular (non-energizer) dot count. glossary.md §Maze: derived from the
 *  real ROM literal `pacman.asm:20e6` (TOTAL_PELLETS=244) minus the 4
 *  energizers — 244 - 4 = 240. Cross-checked against the table itself above. */
export const DOT_COUNT: number = DOT_COUNT_FROM_TABLE

/** Wrap an actor's horizontal position through the tunnel: on the tunnel row
 *  ONLY (the cabinet's single left<->right wrap point, TUNNEL_ROW), an actor
 *  whose xPx has stepped past either edge reappears at the opposite edge,
 *  modulo the maze pixel width. Off the tunnel row this is a no-op — the walls
 *  make an off-edge xPx unreachable there anyway. Mirrors tileAt's wrap, but
 *  for POSITION: tileAt wraps kind LOOKUPS, this wraps the actor. Call it after
 *  every actor step (pacman.ts / ghost.ts). Pure. */
export function wrapThroughTunnel(actor: { xPx: number; yPx: number }): void {
  if (actor.yPx !== TUNNEL_ROW * TILE_PX) return
  const width = MAZE.cols * TILE_PX
  actor.xPx = ((actor.xPx % width) + width) % width
}
