// src/core/game.ts
//
// Story mc1-1 (GREEN, Yoda) — the deterministic core seed for Missile Command.
// mc1-3 added the trackball crosshair; mc1-4 adds the player ABMs in flight and
// the blasts they leave. The core/shell boundary and the one-way data flow exist
// before most behaviour does: the shell steps this once per video frame, feeds it
// input, and paints the result.
//
// PURE: no wall clock, no ambient entropy, no browser surface, no shell import.
// The shell steps this; the core never reads the time or schedules itself.

import { INITIAL_CURSOR, type Cursor } from './cursor.js'
import { stepAbm, type Abm } from './abm.js'
import { startExplosion, stepExplosion, isExplosionDone, type Explosion } from './explosion.js'

/** The whole game state. Grows as later epics add enemies, scoring and waves. */
export interface GameState {
  /** Video frames advanced since boot. The sim's only clock is this counter. */
  readonly frame: number
  /** The trackball crosshair, clamped to the play area (mc1-3). */
  readonly cursor: Cursor
  /** Player ABMs currently in flight (mc1-4). The shell appends on a fire key. */
  readonly abms: readonly Abm[]
  /** Blasts currently expanding/collapsing (mc1-4). */
  readonly explosions: readonly Explosion[]
}

/** The initial state. Deterministic — same result every boot. */
export function createGame(): GameState {
  return { frame: 0, cursor: INITIAL_CURSOR, abms: [], explosions: [] }
}

/**
 * Advance exactly one video frame: fly every ABM one tick; each that ARRIVES this
 * frame detonates a fresh blast at its target and leaves the flight list; advance
 * every blast and drop the ones that have finished collapsing. Referentially
 * transparent.
 */
export function stepGame(state: GameState): GameState {
  const flown = state.abms.map(stepAbm)
  const inFlight = flown.filter((a) => !a.arrived)
  const detonations = flown
    .filter((a) => a.arrived)
    .map((a) => startExplosion(a.target.h, a.target.v))
  const explosions = [...state.explosions.map(stepExplosion), ...detonations].filter(
    (e) => !isExplosionDone(e),
  )
  return { ...state, frame: state.frame + 1, abms: inFlight, explosions }
}
