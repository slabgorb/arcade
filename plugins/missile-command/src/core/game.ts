// src/core/game.ts
//
// Story mc1-1 (GREEN, Yoda) — the deterministic core seed for Missile Command.
// The skeleton owns no gameplay yet (field, cursor and ABM flight are mc1-2..4);
// this is the pure state + step the shell drives once per video frame, so the
// core/shell boundary and the one-way data flow exist before any behaviour does.
//
// PURE: no wall clock, no ambient entropy, no browser surface, no shell import.
// The shell steps this; the core never reads the time or schedules itself.

/** The whole game state. Grows as mc1-2.. add field, cursor and missiles. */
export interface GameState {
  /** Video frames advanced since boot. The sim's only clock is this counter. */
  readonly frame: number
}

/** The initial state. Deterministic — same result every boot. */
export function createGame(): GameState {
  return { frame: 0 }
}

/** Advance exactly one video frame. Referentially transparent. */
export function stepGame(state: GameState): GameState {
  return { frame: state.frame + 1 }
}
