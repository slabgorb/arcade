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
import { initRoster, type Roster } from './enemies/roster'
import { newDdtTable, ddtPlace, ddtRestore, type DdtTable } from './ddt'
import { initialBonusTarget } from './bonus'
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
  /** The seed the world was built from — a fresh game re-derives from it. */
  seed: number
  /** The interrupt/frame counter — drives subsystem cadences and audio masks. */
  frame: number
  rng: Rng
  /** The PLYFLD mushroom field (stamp bytes; bit 7 is the grey-background bit). */
  field: Uint8Array
  player: PlayerState
  shot: Shot
  segments: Segment[]
  /** The enemy cast — spiders, bees, beetles, dragonflies, mosquitoes, earwigs, inchworms. */
  roster: Roster
  /** The four-entry DDTADD bomb bank (DDTS/DDTS2, ddt.ts). Stamped into `field`. */
  ddt: DdtTable
  score: number
  lives: number
  wave: number
  /** OPTNS1 — the DIP option-switch shadow the bonus/select logic reads. */
  optns1: number
  /** BONUSL/BONUSM — the next extra-life score threshold, BCD hundreds (bonus.ts). */
  bonusL: number
  bonusM: number
  /** DELAY (MLDEF.MAC:286) — the inter-wave pause; 0 is idle, armed to WAVE_DELAY
   *  when the millipede is cleared and counted down by CHKEND (waves.ts). */
  delay: number
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

/** The default DIP option shadow: bonus-index 0 → the 12,000-point extra-life
 *  increment (BONUS_INCREMENTS[0], the standard millipede first bonus). */
const DEFAULT_OPTNS1 = 0x00

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
  // DDTS then DDTS2 (ddt.ts): place the four bombs and stamp them into the
  // field. Runs AFTER the mushroom scatter so the bombs win their cells
  // (ddtRestore overwrites a mushroom, as the ROM does — DD-24).
  const ddt = newDdtTable()
  ddtPlace(ddt, false)
  ddtRestore(ddt, field)
  const bonus = initialBonusTarget(DEFAULT_OPTNS1) // seed BONUSL/BONUSM (MLSUB.MAC:393-398)
  return {
    phase: opts?.phase ?? 'attract',
    seed,
    frame: 0,
    rng,
    field,
    player: createPlayer(),
    shot: { active: false, h: 0, v: 0 },
    segments: createMillipede({ headingSign: 1 }),
    roster: initRoster(),
    ddt,
    score: 0,
    lives: opts?.lives ?? START_LIVES,
    wave: 0,
    optns1: DEFAULT_OPTNS1,
    bonusL: bonus.bonusL,
    bonusM: bonus.bonusM,
    delay: 0,
    deathTimer: 0,
    events: [],
  }
}
