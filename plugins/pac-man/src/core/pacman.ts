// src/core/pacman.ts
//
// Story pm1-4 (Julia) — Pac-Man's own kinematics: cornering (a queued turn
// opens at the next grid-aligned tile centre, glossary.md §Movement),
// input-latching (the newest held direction is remembered as `pending` until
// it can be applied), the speed-pattern-driven per-frame move/skip (glossary.md
// §Speeds, actor.ts's speedPattern), and the eat-pause (glossary.md §Speeds:
// Pac-Man freezes 1 frame eating a dot, 3 frames eating an energizer). PURE:
// no DOM, no clock, no Math.random, no shell import.

import { tileAt, isWalkable, wrapThroughTunnel, type TileKind } from './maze'
import { TILE_PX, DIR_DELTA, speedPattern, type Actor, type Dir } from './actor'

// Re-exported so callers building a PacmanState don't need a second import
// from actor.ts for this one helper.
export { speedPattern }

/** Frames Pac-Man freezes (no movement, no pattern advance) after eating a
 *  regular dot. glossary.md §Speeds. */
export const EAT_PAUSE_DOT = 1

/** Frames Pac-Man freezes after eating an energizer. glossary.md §Speeds. */
export const EAT_PAUSE_ENERGIZER = 3

/** Pac-Man's level-1 speed, as a percentage of the 1px/frame reference rate.
 *  glossary.md §Speeds (Pac-Man Dossier Table A.1, level 1: Pac-Man normal
 *  80%). */
export const PACMAN_SPEED_PCT_LEVEL_1 = 80

/** A dot/energizer tile's grid coordinate, as the `"x,y"` key `eaten` uses. */
function tileKey(tx: number, ty: number): string {
  return `${tx},${ty}`
}

/**
 * Pac-Man's full movement state: its kinematic `actor`, the precomputed
 * `pattern` (from `speedPattern`) driving which frames actually move,
 * `frame` — the running index into that pattern (only advances on frames
 * that are not eat-paused) — `pauseFrames` — frames of eat-pause remaining
 * (0 = free to move) — and `eaten`, the set of dot/energizer tiles already
 * consumed (so re-entering an eaten tile never re-triggers the pause).
 */
export interface PacmanState {
  actor: Actor
  pattern: boolean[]
  frame: number
  pauseFrames: number
  eaten: Set<string>
}

/** Build a fresh PacmanState at a grid-aligned pixel position. */
export function createPacmanState(tx: number, ty: number, dir: Dir, speedPct: number): PacmanState {
  return {
    actor: { xPx: tx * TILE_PX, yPx: ty * TILE_PX, dir, pending: 'none' },
    pattern: speedPattern(speedPct),
    frame: 0,
    pauseFrames: 0,
    eaten: new Set(),
  }
}

/** This frame's player/AI input: the direction currently held, or 'none' if
 *  no direction is held (in which case the existing `pending` is left alone —
 *  a real joystick keeps reporting the last direction it was pushed toward
 *  until either it opens or a new direction is pushed). */
export interface PacmanInput {
  dir: Dir
}

/** Is (xPx,yPx) grid-aligned — i.e. sitting exactly at a tile centre, the
 *  only place cornering and eating can happen? */
function atTileCentre(xPx: number, yPx: number): boolean {
  return xPx % TILE_PX === 0 && yPx % TILE_PX === 0
}

/** The eatable kinds and the pause each awards. Walls/paths/tunnel/house/gate
 *  award none (0) and are simply skipped by the `eaten` check below. */
function eatPauseFor(kind: TileKind): number {
  if (kind === 'dot') return EAT_PAUSE_DOT
  if (kind === 'energizer') return EAT_PAUSE_ENERGIZER
  return 0
}

/**
 * Advance Pac-Man by exactly one frame:
 *  1. Latch a held input direction into `pending`.
 *  2. If eat-paused, count the pause down and do nothing else this frame.
 *  3. At a tile centre, try to corner onto `pending` (glossary.md §Movement);
 *     rejected turns (into a wall) leave `dir` unchanged.
 *  4. If the speed pattern says this frame moves, and the tile ahead is
 *     walkable, step one pixel; a wall ahead simply holds Pac-Man in place
 *     (dir unchanged, no movement) without consuming a pattern frame's worth
 *     of eat/eaten bookkeeping.
 *  5. On arriving at a new tile centre, eat any dot/energizer there once
 *     (glossary.md §Speeds pause counts), marking it `eaten` so re-crossing
 *     never re-triggers the pause.
 */
export function stepPacman(state: PacmanState, input: PacmanInput): void {
  if (input.dir !== 'none') {
    state.actor.pending = input.dir
  }

  if (state.pauseFrames > 0) {
    state.pauseFrames -= 1
    return
  }

  const { actor } = state
  const tx = actor.xPx / TILE_PX
  const ty = actor.yPx / TILE_PX

  if (atTileCentre(actor.xPx, actor.yPx)) {
    if (actor.pending !== 'none' && actor.pending !== actor.dir) {
      const { dx, dy } = DIR_DELTA[actor.pending]
      if (isWalkable(tx + dx, ty + dy, 'pac-man')) {
        actor.dir = actor.pending
      }
      // Rejected: pending stays latched (it may open a tile later, or the
      // player may issue a new direction that overwrites it).
    }
  }

  const moveThisFrame = state.pattern[state.frame % state.pattern.length]
  state.frame += 1
  if (!moveThisFrame) return

  const { dx, dy } = DIR_DELTA[actor.dir]
  if (dx === 0 && dy === 0) return // dir === 'none': nothing to step toward

  const nextXPx = actor.xPx + dx
  const nextYPx = actor.yPx + dy
  // Only need to gate on wall crossings AT a tile boundary — mid-tile pixel
  // steps can never cross into a different tile than the one already
  // occupied and checked when this tile was entered.
  if (atTileCentre(actor.xPx, actor.yPx)) {
    if (!isWalkable(tx + dx, ty + dy, 'pac-man')) return // blocked: hold position
  }

  actor.xPx = nextXPx
  actor.yPx = nextYPx
  wrapThroughTunnel(actor)

  if (atTileCentre(actor.xPx, actor.yPx)) {
    const newTx = actor.xPx / TILE_PX
    const newTy = actor.yPx / TILE_PX
    const key = tileKey(newTx, newTy)
    if (!state.eaten.has(key)) {
      const kind = tileAt(newTx, newTy)
      const pause = eatPauseFor(kind)
      if (pause > 0) {
        state.eaten.add(key)
        state.pauseFrames = pause
      }
    }
  }
}
