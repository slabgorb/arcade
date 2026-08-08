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
import { createCities, createBases, START_CITIES, type City, type Base } from './field.js'
import { spawnIcbms, NICBMS, type SpawnResult } from './spawn.js'
import { killIcbmsInBlasts, resolveGroundImpacts } from './damage.js'
import { scoreKills, scoreMultiplier } from './score.js'
import { nextPhase, nextWavePhase, resumePlay, type Phase } from './state.js'
import {
  INITIAL_WAVE,
  waveSchedule,
  isWaveOver,
  waveEndBonus,
  regenerateCities,
  refillAmmo,
  nextWaveBudget,
  bonusInterval,
  bonusCitiesEarned,
} from './wave.js'
import type { SoundEvent } from './sound-events.js'
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
  /** 1-based wave number (mc4-4). Seeds the mc4-1 difficulty schedule (ICBM count +
   *  descent velocity) and the mc4-3 score multiplier; advanced at each wave-end. */
  readonly wave: number
  /** This wave's score multiplier — `scoreMultiplier(wave)` (mc4-3), surfaced on the
   *  state so the HUD reads it verbatim rather than re-deriving it (the HUD-figure rule). */
  readonly multiplier: number
  /** Cities destroyed since the game began (mc4-5) — the ROM's CIDOWN. The city
   *  reserve fed to REGEN is `START_CITIES − citiesLost + bonus cities earned`, so a
   *  destroyed city stays lost until a score threshold (CHEKBO/BONINL) recovers it. */
  readonly citiesLost: number
  /** The seeded PRNG (mutable seed word, threaded through state — the sole entropy). */
  readonly rng: Rng
  /** The sound moments this frame produced, for the audio shell to voice (mc8-2).
   *  Rebuilt fresh every step (never accumulated), so it is pure per-frame data —
   *  a fixed seed yields an identical stream. Empty on a fresh game and on every
   *  frozen `'over'` frame. The fire reducer (shell/input.fireFromKey) appends
   *  `launched`/`ammoEmpty` between frames on the same channel. */
  readonly soundEvents: readonly SoundEvent[]
}

/** A fresh game: 6 live cities, 3 live bases at full ammo, no enemies, phase 'play',
 *  score 0, the full per-wave budget, the opening wave and its multiplier, and a PRNG
 *  seeded from `seed` (default 1). */
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
    wave: INITIAL_WAVE,
    multiplier: scoreMultiplier(INITIAL_WAVE),
    citiesLost: 0,
    rng: createRng(seed),
    soundEvents: [],
  }
}

/**
 * Advance exactly one video frame through the seven-step order above, then — when
 * this wave's ICBM budget is spent and the screen is clear — run the mc4-2 END OF
 * WAVE resolution (bonus → regenerate → refill → advance to the next wave). When the
 * game is over, only the frame counter moves — no spawn, no flight, no damage.
 * Referentially transparent over the durable state (the seeded `Rng`'s in-place
 * cursor advance is the sanctioned exception; determinism holds per-seed).
 */
export function stepGame(state: GameState): GameState {
  // Terminal phase: freeze the battle, only the clock ticks on — and the sound
  // channel goes quiet (no spawn/flight/damage happens, so nothing to voice).
  if (state.phase === 'over') return { ...state, frame: state.frame + 1, soundEvents: [] }

  // END OF WAVE, phase 2 (mc4-2): the previous frame entered the 'between' beat with
  // the wave's final damage on screen. Now resolve it — tally the surviving-city +
  // unused-missile bonus (at this wave's base rate; the ×-multiplier bonus ramp is
  // mc4-6), regenerate destroyed cities up to the cabinet entitlement, refill live
  // magazines, re-seed the next wave's ICBM budget from the mc4-1 schedule, advance
  // the wave + its multiplier, and resume play. Regeneration is a BETWEEN-wave event:
  // a city destroyed during a wave stays dead until here (the mc3-4 "dead never
  // resurrect" invariant holds within a wave).
  //
  // mc4-5: the reserve fed to REGEN is the ROM's PLIVES = START_CITIES − citiesLost
  // (CIDOWN) + bonus cities earned from the running score (CHEKBO/BONINL at the shipped
  // default DIP), capped at NCITY by regenerateCities. So a lost city stays lost until
  // a score threshold recovers it, a bonus earned while full is banked against a later
  // loss, and the same threshold is never double-counted (bonusCitiesEarned is
  // cumulative). OPTIO2 is not modelled yet, so the DIP byte is the bits-clear default.
  if (state.phase === 'between') {
    const survivingCities = state.cities.filter((c) => c.alive).length
    const unusedMissiles = state.bases.reduce((n, b) => (b.alive ? n + b.ammo : n), 0)
    const nextWave = state.wave + 1
    const bonusCities = bonusCitiesEarned(state.score, bonusInterval(0))
    const cityReserve = START_CITIES - state.citiesLost + bonusCities
    return {
      ...state,
      frame: state.frame + 1,
      cities: regenerateCities(state.cities, cityReserve),
      bases: refillAmmo(state.bases),
      score: state.score + waveEndBonus(survivingCities, unusedMissiles),
      phase: resumePlay(state.phase), // 'between' → 'play'
      remaining: nextWaveBudget(state.wave),
      wave: nextWave,
      multiplier: scoreMultiplier(nextWave),
      soundEvents: [],
    }
  }

  // (1) spawn — only ever against structures that are still alive. Each launch
  // descends at THIS wave's schedule velocity (mc4-1), so the swarm ramps by wave.
  const liveTargets = [
    ...state.cities.filter((c) => c.alive).map((c) => c.pos),
    ...state.bases.filter((b) => b.alive).map((b) => b.pos),
  ]
  const spawned: SpawnResult = spawnIcbms(
    state.icbms,
    liveTargets,
    state.remaining,
    state.rng,
    waveSchedule(state.wave).velocity,
  )

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

  // (5) damage: blasts kill ICBMs (scored at THIS wave's multiplier); then ARRIVED
  // survivors destroy structures.
  const { survivors, killed } = killIcbmsInBlasts(flownIcbms, explosions)
  const impact = resolveGroundImpacts(survivors, state.cities, state.bases)

  // (7) resolve the score and the phase from the frame's outcome. (state.phase is
  // 'play' here — 'over' froze and 'between' resolved in their own branches above.)
  const score = scoreKills(state.score, killed.length, state.wave)
  const phase = nextPhase(state.phase, impact.cities)

  // Voice this frame's moments, in the frame's own order: each ABM that arrived
  // banged (detonated), each ICBM the blasts caught died (icbmKilled — silent at
  // the shell, but real data), and each structure an arrived warhead just
  // destroyed fell (structureDestroyed). Rebuilt fresh — never carried over.
  const cityDeaths = impact.cities.filter((c, i) => state.cities[i].alive && !c.alive).length
  const baseDeaths = impact.bases.filter((b, i) => state.bases[i].alive && !b.alive).length
  const destroyed = cityDeaths + baseDeaths
  // mc4-5: accumulate the ROM's CIDOWN — a city lost this frame lowers the REGEN
  // reserve until a bonus recovers it (see the 'between' branch above).
  const citiesLost = state.citiesLost + cityDeaths
  const soundEvents: SoundEvent[] = [
    ...detonations.map(() => ({ type: 'detonated' }) as const),
    ...killed.map(() => ({ type: 'icbmKilled' }) as const),
    ...Array.from({ length: destroyed }, () => ({ type: 'structureDestroyed' }) as const),
  ]

  // (8) END OF WAVE, phase 1 (mc4-2): the budget is spent AND the screen is now clear.
  // Enter the between-wave beat with THIS frame's final damage still on screen — the
  // bonus/regen/advance is resolved on the NEXT frame (the 'between' branch above), so
  // a city destroyed by the wave's last ICBM is visibly dead before it regenerates. A
  // wave-end with every city dead is game-over (phase === 'over') and never enters the
  // beat — nextWavePhase returns 'over', the game ends, the wave is frozen.
  if (phase !== 'over' && isWaveOver(spawned.remaining, impact.icbms)) {
    return {
      ...state,
      frame: state.frame + 1,
      abms: flownAbms.filter((a) => !a.arrived),
      icbms: impact.icbms, // empty — isWaveOver guarantees the screen is clear
      explosions,
      cities: impact.cities, // final damage stays VISIBLE; regeneration is next frame
      bases: impact.bases,
      score,
      phase: nextWavePhase(impact.cities), // 'between' — a survivor keeps play going
      remaining: spawned.remaining, // 0; the next wave's budget is seeded on resolve
      wave: state.wave, // not advanced yet
      multiplier: state.multiplier,
      citiesLost, // a city lost on the final frame still lowers the reserve
      soundEvents, // this frame's destruction cues still fire
    }
  }

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
    wave: state.wave,
    multiplier: state.multiplier,
    citiesLost,
    soundEvents,
  }
}
