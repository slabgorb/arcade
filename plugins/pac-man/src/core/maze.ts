// src/core/maze.ts
//
// Story pm1-3 (GREEN, Julia) — the maze model. Pure data + pure lookups only:
// no DOM, no clock, no Math.random, no shell import (the core/shell boundary
// the purity sweep — tests/purity.test.ts — arms the moment this file lands).
//
// ─── WHAT IS BYTE-CITED AND WHAT IS NOT ──────────────────────────────────────
// `pacman.asm` (0000-3fff) is the 16 KB PROGRAM ROM disassembly. The maze's
// WALL/DOT/ENERGIZER LAYOUT is not program-ROM data at all — it lives in the
// tile/colour GFX ROMs (not vendored here) and in the video hardware's tile
// RAM, written once at boot from that graphics data. There is no `pacman.asm`
// line that IS "wall at column 3, row 7" the way `pacman.asm:2b17` IS the dot's
// score. Per the pm1-3 task brief, the ROW TABLE below is therefore encoded
// as a faithful-style reconstruction of the arcade's maze shape (28x36 tiles,
// symmetric, one ghost house, one tunnel row) and its individual tiles are
// NOT byte-cited — that is stated here, not hidden.
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
//
// ─── GPL FIREWALL ─────────────────────────────────────────────────────────
// This table was authored fresh for this repo, from the well-known public
// shape of the arcade maze (Dossier ch.3 "The Maze") — no line, table, or
// structure was copied from shaunlebron/pacman (GPL v3; see brief.md's
// firewall clause).

/** The `pacman.asm:20e6` literal: 240 dots + 4 energizers. Not itself a
 *  TileKind count — see DOT_COUNT below, which is derived from this minus
 *  the energizers the table actually places. */
import { TILE_PX } from './actor'

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
// One character per tile, 28 characters per row, 36 rows.
//   '#' wall        '.' dot          'o' energizer
//   ' ' path (no dot, e.g. plaza/tunnel-row floor)
//   '=' gate (ghost-house door)      'H' house interior
//   'T' tunnel exit (the wrap tile, tunnel row only)
//
// Rows 0-2 and 33-35 are the scoreboard/lives HUD bands (no dots, no
// gameplay tiles — 'wall' throughout, matching the reserved rows every other
// game in this repo treats as non-playable). Rows 3-32 are the 30-row maze.
const HUD_ROW = '############################'

const MAZE_ROWS: readonly string[] = [
  '############################',
  '#............##............#',
  '#.##########.##.##########.#',
  '#o##########.##.##########o#',
  '#.##########.##.##########.#',
  '#..........................#',
  '#.####.#####.##.#####.####.#',
  '#.####.#####.##.#####.####.#',
  '#......##....##....##......#',
  '######.##### ## #####.######',
  '######.##### ## #####.######',
  '######.##..........##.######',
  '######.## ###==### ##.######',
  '######.## #HHHHHH# ##.######',
  'T                          T',
  '######.## #HHHHHH# ##.######',
  '######.## ######## ##.######',
  '######.##.        .##.######',
  '######.## ######## ##.######',
  '######.## ######## ##.######',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#o..##................##..o#',
  '###.##.##.########.##.##.###',
  '###.##.##.########.##.##.###',
  '#......##....##....##......#',
  '#.##########.##.##########.#',
  '#.##########.##.##########.#',
  '#..........................#',
  '############################',
]

const ROWS: readonly string[] = [HUD_ROW, HUD_ROW, HUD_ROW, ...MAZE_ROWS, HUD_ROW, HUD_ROW, HUD_ROW]

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
