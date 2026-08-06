// src/core/game.ts
//
// Story mc1-1 (GREEN, Yoda) — the deterministic core seed for Missile Command.
// mc1-3 adds the trackball crosshair to the state the shell drives once per video
// frame; ABM flight and enemies are mc1-4.. The core/shell boundary and the
// one-way data flow exist before most behaviour does.
//
// PURE: no wall clock, no ambient entropy, no browser surface, no shell import.
// The shell steps this; the core never reads the time or schedules itself.

import { INITIAL_CURSOR, type Cursor } from './cursor.js'

/** The whole game state. Grows as mc1-4.. add missiles and enemies. */
export interface GameState {
  /** Video frames advanced since boot. The sim's only clock is this counter. */
  readonly frame: number
  /** The trackball crosshair, clamped to the play area (mc1-3). */
  readonly cursor: Cursor
}

/** The initial state. Deterministic — same result every boot. */
export function createGame(): GameState {
  return { frame: 0, cursor: INITIAL_CURSOR }
}

/** Advance exactly one video frame. Referentially transparent. */
export function stepGame(state: GameState): GameState {
  return { ...state, frame: state.frame + 1 }
}
