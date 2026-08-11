// src/core/attract.ts
//
// Story pm4-8 (Korben / Dev) — the SELF-PLAYING ATTRACT DEMO's auto-player. A
// pure, deterministic router that drives Pac-Man during phase `attract` so the
// maze plays itself. Design reference: mc6-4's SMART CURSOR MOVER
// (missile-command/src/core/game.ts:279-334) — an auto-player with "no entropy of
// its own": it is a deterministic function of the board, so the same board always
// produces the same demo, and the seeded variety of the demo enters ONLY through
// the frightened-ghost random turn (mode.ts). PURE: no DOM, no clock, no
// Math.random, no shell import — `tests/purity.test.ts` scans this file.
//
// The routing is a breadth-first search over Pac-walkable tiles to the nearest
// remaining pellet, returning the first STEP of that shortest path. Energizers are
// targeted first (so the demo reliably reaches a power pellet and shows the
// frightened-ghost chase), then ordinary dots. A BFS — not a greedy straight-line
// chase — is what keeps the demo out of the maze's dead ends: it never stalls Pac
// against a wall, because every step it returns is walkable and provably on a path
// to food.

import { tileAt, isWalkable, ENERGIZER_TILES, MAZE, TUNNEL_ROW } from './maze'
import { DIR_DELTA, TILE_PX, type Dir } from './actor'
import { type PacmanState } from './pacman'

/** Deterministic tie-break order for BFS expansion — a fixed order makes the
 *  whole demo reproducible from the board alone. */
const SEARCH_DIRS: readonly Dir[] = ['up', 'down', 'left', 'right']

function tileKey(x: number, y: number): string {
  return `${x},${y}`
}

/** The walkable tile one step in `dir` from (x,y), or `null` if that step hits a
 *  wall / the ghost house. The single tunnel row wraps horizontally (mirroring
 *  `wrapThroughTunnel`), so the demo can path through the tunnel like a player. */
function neighbour(x: number, y: number, dir: Dir): { x: number; y: number } | null {
  const { dx, dy } = DIR_DELTA[dir]
  let nx = x + dx
  const ny = y + dy
  if (ny === TUNNEL_ROW) nx = ((nx % MAZE.cols) + MAZE.cols) % MAZE.cols
  if (!isWalkable(nx, ny, 'pac-man')) return null
  return { x: nx, y: ny }
}

/** First-step direction of the shortest Pac-walkable path from (sx,sy) to the
 *  nearest tile satisfying `isGoal`, or 'none' if no such tile is reachable. */
function firstStepToward(
  sx: number,
  sy: number,
  isGoal: (x: number, y: number) => boolean,
): Dir {
  const seen = new Set<string>([tileKey(sx, sy)])
  const queue: { x: number; y: number; first: Dir }[] = []

  for (const dir of SEARCH_DIRS) {
    const n = neighbour(sx, sy, dir)
    if (!n) continue
    const key = tileKey(n.x, n.y)
    if (seen.has(key)) continue
    seen.add(key)
    if (isGoal(n.x, n.y)) return dir
    queue.push({ x: n.x, y: n.y, first: dir })
  }

  while (queue.length > 0) {
    const cur = queue.shift() as { x: number; y: number; first: Dir }
    for (const dir of SEARCH_DIRS) {
      const n = neighbour(cur.x, cur.y, dir)
      if (!n) continue
      const key = tileKey(n.x, n.y)
      if (seen.has(key)) continue
      seen.add(key)
      if (isGoal(n.x, n.y)) return cur.first
      queue.push({ x: n.x, y: n.y, first: cur.first })
    }
  }

  return 'none'
}

/**
 * The auto-player's chosen direction for THIS frame. Pac only makes a turn
 * decision at a tile centre (see `stepPacman`), so off-centre this returns 'none'
 * — leaving the last decision latched as `pending` while Pac slides to the next
 * centre. At a centre it BFS-routes to the nearest remaining energizer (first
 * choice, so the demo grabs a power pellet), else the nearest remaining dot.
 * Deterministic in `pac` alone; no seed, no clock.
 */
export function autoPlayDir(pac: PacmanState): Dir {
  const { xPx, yPx } = pac.actor
  if (xPx % TILE_PX !== 0 || yPx % TILE_PX !== 0) return 'none'

  const sx = xPx / TILE_PX
  const sy = yPx / TILE_PX

  const remaining = (kind: 'dot' | 'energizer') => (x: number, y: number): boolean =>
    tileAt(x, y) === kind && !pac.eaten.has(tileKey(x, y))

  // Nothing to chase if the board is a corner case with no energizers placed;
  // ENERGIZER_TILES is read only to keep this a cheap no-op then.
  if (ENERGIZER_TILES.length > 0) {
    const toEnergizer = firstStepToward(sx, sy, remaining('energizer'))
    if (toEnergizer !== 'none') return toEnergizer
  }
  return firstStepToward(sx, sy, remaining('dot'))
}
