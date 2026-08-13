// src/core/game-state.ts
//
// Story ml7-2 — the owning GameState. Millipede's sixteen pure subsystems each
// take an *Env bag + a *Slot and return a structured result; none of them owns
// the player, the shot, the score, the phase, or the RNG. This module is where
// all of that lives, so stepGame (core/sim.ts) can thread one state through them.
//
// PURE: seeded @shared/rng only (like core/attract.ts). The purity sweep covers
// this file automatically.

import { createRng, nextInt, type Rng } from '@shared/rng'
import { PLYFLD_SIZE } from './conway'
import { musher, type MushCounts } from './mushroom'
import { createMillipede, type Segment } from './millipede'
import { createPlayer, type PlayerState } from './input'
import type { GamePhase } from './phase'
import type { GameEvent } from './events'

/** The single player shot (millipede fires one at a time). */
export interface Shot {
  active: boolean
  h: number
  v: number
}

/** Everything the simulation owns for one game. */
export interface GameState {
  phase: GamePhase
  /** The interrupt/frame counter — drives subsystem cadences and audio masks. */
  frame: number
  rng: Rng
  /** The PLYFLD mushroom field (stamp bytes; bit 7 is the grey-background bit). */
  field: Uint8Array
  player: PlayerState
  shot: Shot
  segments: Segment[]
  score: number
  lives: number
  wave: number
  /** Frames remaining in the death-animation hold (0 outside it). */
  deathTimer: number
  /** Rebuilt every frame, never appended across frames; attract clears it. */
  events: readonly GameEvent[]
}

/** Mushrooms scattered at boot — a starting field for the march to weave through
 *  (a dressing choice, like attract.ts; musher rejects the reserved rows). */
const START_MUSHROOM_TRIES = 96

/** Standard millipede lives. */
const START_LIVES = 3

export interface CreateGameOpts {
  /** Start phase (default 'attract'). */
  phase?: GamePhase
  /** Starting lives (default 3). */
  lives?: number
}

export function createGame(seed: number, opts?: CreateGameOpts): GameState {
  const rng = createRng(seed)
  const field = new Uint8Array(PLYFLD_SIZE)
  const counts: MushCounts = { lower: 0, top: 0 }
  for (let i = 0; i < START_MUSHROOM_TRIES; i++) {
    musher(field, nextInt(rng, PLYFLD_SIZE), counts)
  }
  return {
    phase: opts?.phase ?? 'attract',
    frame: 0,
    rng,
    field,
    player: createPlayer(),
    shot: { active: false, h: 0, v: 0 },
    segments: createMillipede({ headingSign: 1 }),
    score: 0,
    lives: opts?.lives ?? START_LIVES,
    wave: 0,
    deathTimer: 0,
    events: [],
  }
}
