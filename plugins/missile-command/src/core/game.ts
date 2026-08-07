// src/core/game.ts
//
// Story mc3-4 (GREEN, Yoda) — the COMPOSED combat loop. mc1 seeded the pure core
// (cursor, ABM flight, blasts); mc3-1/2/3 added the enemy ICBM, the spawner, the
// damage reducers, scoring and the play->over phase — each as its own pure module.
// This file wires them into one per-frame reducer: `stepGame` runs the whole
// battle for one video frame, and `createGame` seeds a fresh, fully-defended game.
//
// PURE: no wall clock, no ambient entropy, no browser surface, no shell import.
// The ONLY randomness is the seeded `Rng` carried in state (the battlezone
// local-cursor pattern — `nextInt` advances `rng.seed` in place, and the durable
// seed word is threaded through GameState, so same-seed runs replay identically).
// The shell steps this once per frame, feeds it input, and paints the result.
//
// Frame order (the ROM's per-tick sequence; each step is one already-cited module):
//   (1) spawn against LIVE targets   (spawn.ts)
//   (2) fly ICBMs                     (icbm.ts)
//   (3) fly ABMs                      (abm.ts)
//   (4) detonate ABM arrivals         (explosion.ts)
//   (5) damage: blasts kill ICBMs (scored), arrived ICBMs kill structures
//                                     (damage.ts + score.ts)
//   (6) age blasts                    (explosion.ts)
//   (7) resolve score + phase         (score.ts + state.ts)
// Once `phase === 'over'` the loop only advances the frame counter.
//
// This module introduces NO new numeric game constant — every value comes from a
// cited sub-module (NICBMS, MXICON, ICBM_KILL_POINTS, …); the citation sweep stays
// green.

import { INITIAL_CURSOR, type Cursor } from './cursor.js'
import { stepAbm, type Abm } from './abm.js'
import { stepIcbm, type Icbm } from './icbm.js'
import { startExplosion, stepExplosion, isExplosionDone, type Explosion } from './explosion.js'
import { createCities, createBases, type City, type Base } from './field.js'
import { spawnIcbms, NICBMS, type SpawnResult } from './spawn.js'
import { killIcbmsInBlasts, resolveGroundImpacts } from './damage.js'
import { scoreKills } from './score.js'
import { nextPhase, type Phase } from './state.js'
import { createRng, type Rng } from '@shared/rng'

/** The whole game state — grown from mc1's seed to carry the full combat model. */
export interface GameState {
  /** Video frames advanced since boot. The sim's only clock is this counter. */
  readonly frame: number
  /** The trackball crosshair, clamped to the play area (mc1-3). */
  readonly cursor: Cursor
  /** Player ABMs currently in flight (mc1-4). The shell appends on a fire key. */
  readonly abms: readonly Abm[]
  /** Enemy ICBMs currently descending (mc3-1). */
  readonly icbms: readonly Icbm[]
  /** Blasts currently expanding/collapsing (mc1-4). */
  readonly explosions: readonly Explosion[]
  /** The six defended cities — each can die, never resurrects (mc3-1). */
  readonly cities: readonly City[]
  /** The three missile bases — destroyable, each with its ABM magazine (mc3-1). */
  readonly bases: readonly Base[]
  /** Running score; +ICBM_KILL_POINTS per downed ICBM (mc3-3). */
  readonly score: number
  /** Coarse phase: `'play'` until every city is dead, then terminal `'over'` (mc3-3). */
  readonly phase: Phase
  /** ICBMs still to launch this wave — the NICBMS budget, drawn down by spawns. */
  readonly remaining: number
  /** The seeded PRNG (mutable seed word, threaded through state — the sole entropy). */
  readonly rng: Rng
}

/** A fresh game: 6 live cities, 3 live bases at full ammo, no enemies, phase 'play',
 *  score 0, the full per-wave budget, and a PRNG seeded from `seed` (default 1). */
export function createGame(seed = 1): GameState {
  return {
    frame: 0,
    cursor: INITIAL_CURSOR,
    abms: [],
    icbms: [],
    explosions: [],
    cities: createCities(),
    bases: createBases(),
    score: 0,
    phase: 'play',
    remaining: NICBMS,
    rng: createRng(seed),
  }
}

/**
 * Advance exactly one video frame through the seven-step order above. When the
 * game is over, only the frame counter moves — no spawn, no flight, no damage.
 * Referentially transparent over the durable state (the seeded `Rng`'s in-place
 * cursor advance is the sanctioned exception; determinism holds per-seed).
 */
export function stepGame(state: GameState): GameState {
  // Terminal phase: freeze the battle, only the clock ticks on.
  if (state.phase === 'over') return { ...state, frame: state.frame + 1 }

  // (1) spawn — only ever against structures that are still alive.
  const liveTargets = [
    ...state.cities.filter((c) => c.alive).map((c) => c.pos),
    ...state.bases.filter((b) => b.alive).map((b) => b.pos),
  ]
  const spawned: SpawnResult = spawnIcbms(state.icbms, liveTargets, state.remaining, state.rng)

  // (2)(3) fly the enemy warheads and the player missiles one tick each.
  const flownIcbms = spawned.icbms.map(stepIcbm)
  const flownAbms = state.abms.map(stepAbm)

  // (4) each ABM that arrived this frame detonates a fresh blast at its target.
  const detonations = flownAbms
    .filter((a) => a.arrived)
    .map((a) => startExplosion(a.target.h, a.target.v))
  // (6) age the existing blasts and add the new ones; drop any that have collapsed.
  const explosions = [...state.explosions.map(stepExplosion), ...detonations].filter(
    (e) => !isExplosionDone(e),
  )

  // (5) damage: blasts kill ICBMs (scored); then ARRIVED survivors destroy structures.
  const { survivors, killed } = killIcbmsInBlasts(flownIcbms, explosions)
  const impact = resolveGroundImpacts(survivors, state.cities, state.bases)

  // (7) resolve the score and the phase from the frame's outcome.
  const score = scoreKills(state.score, killed.length)
  const phase = nextPhase(state.phase, impact.cities)

  return {
    ...state,
    frame: state.frame + 1,
    abms: flownAbms.filter((a) => !a.arrived),
    icbms: impact.icbms,
    explosions,
    cities: impact.cities,
    bases: impact.bases,
    score,
    phase,
    remaining: spawned.remaining,
  }
}
