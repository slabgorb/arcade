// src/core/ghost.ts
//
// Story pm1-5 (Julia) — ghost kinematics: at each tile centre a ghost picks
// the walkable, non-reversing direction that minimizes straight-line
// (squared, no sqrt) distance to a target tile, tie-breaking by the ROM tile
// preference up>left>down>right, and is barred from turning up in the
// house's red-zone tiles. glossary.md §Ghost movement. Targeting (the four
// ghosts' individual personality logic) is Task 6 — this file's `stepGhost`
// takes an already-computed `target` tile, so Blinky's direct-chase-to-Pac-Man
// stand-in (or any other personality) can be swapped in without touching this
// file. PURE: no DOM, no clock, no Math.random, no shell import — the purity
// sweep (tests/purity.test.ts) scans this file's source text.

import { type Tile, isWalkable } from './maze'
import { type Actor, type Dir, DIR_DELTA, TILE_PX } from './actor'

export type GhostId = 'blinky' | 'pinky' | 'inky' | 'clyde'

/** A ghost's identity plus its shared kinematic state (reusing actor.ts's
 *  `Actor` — same xPx/yPx/dir shape Pac-Man uses; `pending` is unused by
 *  ghosts, which decide their own direction rather than latching player
 *  input, but the field costs nothing to carry for type reuse). */
export interface Ghost {
  readonly id: GhostId
  actor: Actor
}

/** Per-step signal from the caller. `forceReverse` is Task 7's mode-change
 *  hook (scatter<->chase forces every ghost to reverse for exactly one step,
 *  the sole exception glossary.md §Ghost movement documents to "never
 *  reverse") — this task only wires the seam, not the mode logic itself. */
export interface GhostStepState {
  forceReverse?: boolean
}

const REVERSE: Readonly<Record<Dir, Dir>> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
  none: 'none',
}

/** The ROM tile-preference tie-break order, glossary.md §Ghost movement
 *  "Tie-break order" — Dossier-sourced, no isolable ROM literal (stated
 *  there, not hidden). Also the order candidate directions are evaluated in,
 *  which is what makes the tie-break work: a strict "smaller distance wins"
 *  scan naturally keeps the first-seen minimum on a tie. */
const TILE_PREFERENCE: readonly Dir[] = ['up', 'left', 'down', 'right']

/** The two red-zone tiles: the pair of intersections flanking the ghost
 *  house, one tile left and one tile right of the house wall, in the row
 *  directly above the house (`src/core/maze.ts`'s row table). Each is the
 *  foot of the narrow vertical shaft a ghost could otherwise use to cut
 *  straight up past the house — 'up' is walkable there (unlike the tiles
 *  directly over the gate itself, which are walled above), so the rule has
 *  real work to do. glossary.md §Ghost movement "Red-zone tiles" explains
 *  why only this pair (of the Dossier's larger documented set) has an
 *  unambiguous analogue in this reconstructed maze. */
export const RED_ZONE_TILES: readonly Tile[] = [
  { x: 12, y: 14 },
  { x: 15, y: 14 },
]

function isRedZone(tx: number, ty: number): boolean {
  return RED_ZONE_TILES.some((t) => t.x === tx && t.y === ty)
}

function atTileCentre(xPx: number, yPx: number): boolean {
  return xPx % TILE_PX === 0 && yPx % TILE_PX === 0
}

function squaredDistance(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx
  const dy = ay - by
  return dx * dx + dy * dy
}

/** Choose the direction a ghost standing at tile (tx,ty), currently heading
 *  `currentDir`, should take toward `target`. Reversing `currentDir` is
 *  excluded (the "never reverse" rule) unless `currentDir` is 'none' (not
 *  yet moving — nothing to reverse from). 'up' is excluded outright from a
 *  red-zone tile. Among what remains, the walkable candidate closest to
 *  `target` wins; ties resolve by evaluation order, which is
 *  `TILE_PREFERENCE` (up>left>down>right). Falls back to `currentDir` if
 *  every candidate is blocked (a dead end never truly occurs in this maze,
 *  but the fallback keeps the function total). */
function chooseDirection(tx: number, ty: number, currentDir: Dir, target: Tile): Dir {
  const forbiddenReverse = currentDir === 'none' ? null : REVERSE[currentDir]
  let best: Dir | null = null
  let bestDist = Infinity
  for (const dir of TILE_PREFERENCE) {
    if (dir === forbiddenReverse) continue
    if (dir === 'up' && isRedZone(tx, ty)) continue
    const { dx, dy } = DIR_DELTA[dir]
    const nx = tx + dx
    const ny = ty + dy
    if (!isWalkable(nx, ny, 'ghost')) continue
    const dist = squaredDistance(nx, ny, target.x, target.y)
    if (dist < bestDist) {
      bestDist = dist
      best = dir
    }
  }
  return best ?? currentDir
}

/**
 * Advance one ghost by exactly one frame:
 *  1. At a tile centre, either force a one-step reversal (mode signal) or
 *     choose the target-seeking direction (`chooseDirection`).
 *  2. Step one pixel in `dir`, gated on the destination tile being walkable
 *     when crossing a tile boundary (mid-tile pixel steps stay inside the
 *     tile already checked when it was entered).
 */
export function stepGhost(ghost: Ghost, target: Tile, state: GhostStepState = {}): void {
  const { actor } = ghost
  const tx = actor.xPx / TILE_PX
  const ty = actor.yPx / TILE_PX

  if (atTileCentre(actor.xPx, actor.yPx)) {
    actor.dir = state.forceReverse ? REVERSE[actor.dir] : chooseDirection(tx, ty, actor.dir, target)
  }

  const { dx, dy } = DIR_DELTA[actor.dir]
  if (dx === 0 && dy === 0) return // dir === 'none': nothing to step toward

  if (atTileCentre(actor.xPx, actor.yPx)) {
    if (!isWalkable(tx + dx, ty + dy, 'ghost')) return // blocked: hold position
  }

  actor.xPx += dx
  actor.yPx += dy
}
