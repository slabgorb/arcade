// src/core/cabinet.ts
//
// Story jt10-2 — the THIRD core tier: the cabinet lifecycle mode machine.
//
// Joust's core has two tiers already — the sim (frame.ts) wrapped by the session
// (game.ts: scores, lives, the GOVER tri-state). This module adds a pure tier
// ABOVE the session that WRAPS createGame / stepGame the same way game.ts wraps
// the sim — mirroring tempest's Mode layer (plugins/tempest/src/core/state.ts).
// It pins the machine only: the six lifecycle modes, the GOVER-driven transitions,
// and the game-over -> high-score value gate. Screens/rendering are jt10-3..jt10-7.
//
//   sim (frame.ts) ⊂ session (game.ts) ⊂ cabinet (cabinet.ts)   ← this tier
//
// The hinge is game.ts's existing GOVER tri-state (jt4-4): $7F attract / -1 running
// / 0 over. The cabinet does not re-model it — modeForGover maps the session's rung
// to the mode a stepped session dictates, and the GOVER_* constants are re-exported
// from game.ts (never re-defined here, so they cannot drift).

import {
  createGame,
  stepGame,
  GOVER_OVER,
  GOVER_RUNNING,
  GOVER_ATTRACT,
  type GameState,
} from './game.js'
import type { PlayerInput } from './flight.js'
import { qualifiesForHighScore, type HighScoreEntryBase } from '@shared/highscore'

// Re-export game.ts's own GOVER rungs so cabinet consumers read the hinge values
// from one place — the cabinet never mints its own copies.
export { GOVER_OVER, GOVER_RUNNING, GOVER_ATTRACT }

/**
 * The six cabinet-lifecycle modes (design spec §"The mode set"). A union type, not
 * a string enum — enums carry a runtime cost and this set is closed.
 */
export type CabinetMode = 'attract' | 'title' | 'select' | 'playing' | 'gameover' | 'highscore'

/**
 * The cabinet tier state: the current `mode` plus the WRAPPED session `game`.
 * Every session fact (players, gover, wave, sim, events) lives in the wrapped
 * `game` — `mode` is the only new concern. Both fields readonly: transitions
 * return a NEW state, never mutate.
 */
export interface CabinetState {
  readonly mode: CabinetMode
  readonly game: GameState
}

/**
 * Boot the cabinet: mode 'attract', wrapping a fresh `createGame(seed,
 * playerCount)`. Deterministic — same inputs, same state. Pure.
 */
export function createCabinet(seed: number, playerCount?: number): CabinetState {
  return { mode: 'attract', game: createGame(seed, playerCount) }
}

/**
 * The GOVER hinge — the pure map from a session's settled `gover` rung to the mode
 * a stepped/playing session dictates. The three rungs are the only values GOVER
 * ever holds (game.ts settleGameOver / createGame / the attract GAMSIM rung), so
 * an out-of-range value is a programming error, not a mode. Pure.
 */
export function modeForGover(gover: number): CabinetMode {
  if (gover === GOVER_ATTRACT) return 'attract'
  if (gover === GOVER_RUNNING) return 'playing'
  if (gover === GOVER_OVER) return 'gameover'
  throw new Error(`modeForGover: unexpected GOVER value ${gover} (expected the three rungs)`)
}

/** attract -> title: the attract sub-cycle's title page (the page scheduler is
 *  jt10-4). Preserves the wrapped game. Pure. */
export function toTitle(cab: CabinetState): CabinetState {
  return { ...cab, mode: 'title' }
}

/** attract/title -> select: coin-up to the 1P/2P start select (no coin economy).
 *  Preserves the wrapped game. Pure. */
export function toSelect(cab: CabinetState): CabinetState {
  return { ...cab, mode: 'select' }
}

/**
 * select -> playing: begin a real game wrapping a FRESH `createGame(seed,
 * playerCount)` (so the wrapped game is at GOVER_RUNNING and seeded
 * deterministically). Pure.
 */
export function startPlaying(cab: CabinetState, seed: number, playerCount?: number): CabinetState {
  return { mode: 'playing', game: createGame(seed, playerCount) }
}

/**
 * Step ONE frame of a playing cabinet: delegate to the session's `stepGame` (no
 * second stepping path — the wrapped game stays bit-identical to a raw stepGame),
 * then RE-DERIVE the mode from the stepped game's settled GOVER — so an
 * all-players-out frame lands in 'gameover'. Pure.
 */
export function stepPlaying(cab: CabinetState, inputs?: Record<number, PlayerInput>): CabinetState {
  const game = stepGame(cab.game, inputs)
  return { mode: modeForGover(game.gover), game }
}

/**
 * gameover -> the routed next mode: 'highscore' iff the best player's score
 * qualifies for `table` (qualifiesForHighScore — a value check), else 'attract'.
 * Preserves the wrapped game (the fresh-attract reset is toAttract / jt10-4). Pure.
 */
export function afterGameOver(cab: CabinetState, table: readonly HighScoreEntryBase[]): CabinetState {
  const best = cab.game.players.reduce((max, p) => Math.max(max, p.score), 0)
  return { ...cab, mode: qualifiesForHighScore(table, best) ? 'highscore' : 'attract' }
}

/**
 * -> attract: start a fresh attract cycle wrapping a new `createGame(seed,
 * playerCount)`. The return edge from 'highscore' (jt10-7 owns the entry trigger)
 * and the reset after a non-qualifying gameover. Pure.
 */
export function toAttract(cab: CabinetState, seed: number, playerCount?: number): CabinetState {
  return { mode: 'attract', game: createGame(seed, playerCount) }
}
