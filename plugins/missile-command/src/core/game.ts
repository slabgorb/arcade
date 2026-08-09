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
//   (0) planes fly/activate + fire   (sputnik.ts — BEFORE the spawner, which then
//       counts the salvo in its roster, so planeActive is accurate and plane +
//       swarm hold the joint NICBMS ceiling; mc5-2 rework)
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
// cited sub-module (NICBMS, ICBM_KILL_POINTS, …); the citation sweep stays
// green.

import { INITIAL_CURSOR, type Cursor } from './cursor.js'
import { stepAbm, type Abm } from './abm.js'
import { stepAnyIcbm, type Icbm } from './icbm.js'
import { startExplosion, stepExplosion, isExplosionDone, type Explosion } from './explosion.js'
import { createCities, createBases, START_CITIES, type City, type Base } from './field.js'
import { spawnIcbms, spawnCruise, cruiseBudget, NICBMS, type SpawnResult } from './spawn.js'
import { mirvEligible, mirvSplit, MIRV_EXPLOSION_SUPPRESS } from './mirv.js'
import {
  spawnSputnik,
  stepSputnik,
  offscreen,
  readyToFire,
  reload,
  sputnikActivationSep,
  sputnikFireCadence,
  sputnikFireCount,
  sputnikLaunch,
  SPUTNIK_WAVE,
  SPUTNIK_SCORE_MULT,
  type Sputnik,
} from './sputnik.js'
import { killIcbmsInBlasts, resolveGroundImpacts, killSputniksInBlasts } from './damage.js'
import { scoreKills, scoreMultiplier, CRUISE_SCORE_MULT } from './score.js'
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
  /** Fly-across Sputnik/bomber planes currently crossing the field (mc5-2). A distinct
   *  entity from the ICBM family; `length > 0` is the `sputnikActive` drone signal
   *  mc5-3's droneRequest reads. Empty until wave SPUTNIK_WAVE, cleared at wave end. */
  readonly sputniks: readonly Sputnik[]
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
  /** ICBMs still to launch this wave — this wave's ICBWAV launch budget
   *  (`waveSchedule(wave).count`), drawn down by spawns. NOT the NICBMS on-screen cap. */
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
    sputniks: [],
    explosions: [],
    cities: createCities(),
    bases: createBases(),
    score: 0,
    phase: 'play',
    remaining: waveSchedule(INITIAL_WAVE).count,
    wave: INITIAL_WAVE,
    multiplier: scoreMultiplier(INITIAL_WAVE),
    citiesLost: 0,
    rng: createRng(seed),
    soundEvents: [],
  }
}

// mc6-2: the SETUP -> PLAY start-of-game edge. A start action (press fire) taken
// while the cabinet is in attract or after game over runs the SETUP task chain
// that begins at NEWGAM — SETUP1: .WORD NEWGAM-1 (W3MAIN.MAC:583) -> NEWGAM
// (:3835), which sets the skill/lives and wave 1 then requests the next task
// NEWWV1 (:3903); NEWWV1 refills the magazines (:4021 LDA I,MAXMIS) and seeds the
// wave-1 ICBM schedule. So NEWGAM begins the reseed and NEWWV1 completes it. We
// reuse createGame, the one place that whole field is defined, so the reseed and
// the boot field can never drift. From any other phase (a running/paused/between/
// setup game) a stray start is a NO-OP: it must not wipe the board. Pure — no
// clock, no entropy; the incoming seed is threaded through so the reseed stays
// deterministic.
/**
 * Start a new game from a start action: when `state.phase` is `'attract'` or
 * `'over'`, return a fresh, fully-defended game in `'play'` — the reseed the
 * NEWGAM->NEWWV1 SETUP chain performs, reusing createGame so the field matches a
 * cold boot exactly: every city and base live, magazines full, no enemies in
 * flight, a cleared score, the opening wave (INITIAL_WAVE) and its full ICBM
 * budget, a zeroed frame counter. For every other phase return `state` unchanged.
 */
export function startGame(state: GameState): GameState {
  return state.phase === 'attract' || state.phase === 'over'
    ? createGame(state.rng.seed)
    : state
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
      sputniks: [], // enemies clear at wave end (like ICBMs); next wave re-activates
      soundEvents: [],
    }
  }

  // Live targets first — both the plane's salvo and the normal spawner aim only
  // at structures that are still alive.
  const liveTargets = [
    ...state.cities.filter((c) => c.alive).map((c) => c.pos),
    ...state.bases.filter((b) => b.alive).map((b) => b.pos),
  ]

  // SPUTNIK (mc5-2 rework): from SPUTWV a plane crosses the field on the WSPLAU
  // activation cadence, fires ICBMs downward on the WSPFIR cadence (folded into
  // the ICBM stream), and is worth SPUTNIK_SCORE_MULT× when a blast catches it.
  // A distinct entity with its own array — cruise/MIRV are the ICBM family, this
  // is not. Planes step + activate BEFORE the normal spawner so `planeActive` is
  // accurate THIS frame, and a ready plane fires FIRST — the ROM checks the
  // SPUTFIR path ahead of the normal launch (JMP SPUTFIR, W3MAIN.MAC:2543) — but
  // its salvo is then FOLDED INTO the roster the spawner counts, so plane salvo +
  // normal swarm can never pierce the NICBMS(8) on-screen ceiling: the salvo
  // occupies real slots, it is not budget-priority stacked on top of them.
  // Functional only (pixel-authentic motion is mc9): speed 1 makes the crossing
  // (HMAX = 247 ticks) outlast the deepest WSPFIR reload (128), so the plane
  // BECOMES fire-ready in flight — and at speed 1 the per-tick `fireTimer − 1`
  // decrement equals distance travelled, the ROM's SPUTDS "DISTANCE SPUTNIK
  // MUST GO BETWEEN FIRES" (W3MAIN.MAC:285).
  const SPUTNIK_SPEED = 1 // cabinet units/tick — functional cross speed (mc9 pins the ROM velocity)
  let planes = state.sputniks.map((p) => stepSputnik(p, SPUTNIK_SPEED)).filter((p) => !offscreen(p))
  if (
    state.wave >= SPUTNIK_WAVE &&
    planes.length === 0 &&
    state.frame > 0 &&
    state.frame % sputnikActivationSep(state.wave) === 0
  ) {
    // The activation GATE above is WSPLAU; the fire timer seeds from the FIRE
    // cadence — WSPFIR = SPUTDS, "DISTANCE BETWEEN SPUTNIK FIRES"
    // (W3MAIN.MAC:285 decl, :4133 use) — the mc5-2 firing-rework root cause (a
    // WSPLAU seed outlasted the crossing, so the shipped plane never became
    // ready in play).
    planes = [spawnSputnik(state.rng, sputnikFireCadence(state.wave))]
  }
  // A ready plane launches its clamped salvo (cruiseOnScreen is 0 until mc5-3)
  // against the PRE-spawn on-screen count and reloads. The salvo headroom is
  // MXICON-based — the −1 below NICBMS is the aloft plane's OWN reservation
  // (ICNORM's PLCPV borrow, W3MAIN.MAC:2447-2453): it fires only when the swarm
  // has dipped, never into a full-at-seven swarm.
  let sputBudget = state.remaining
  const sputnikShots: Icbm[] = []
  planes = planes.map((p) => {
    if (!readyToFire(p)) return p
    const count = sputnikFireCount(0, state.icbms.length + sputnikShots.length, sputBudget)
    const shots = sputnikLaunch(p, liveTargets, count, waveSchedule(state.wave).velocity, state.rng)
    sputnikShots.push(...shots)
    sputBudget -= shots.length
    return reload(p, state.wave)
  })

  // (1) spawn — the plane's salvo rides in the roster the spawner counts (so the
  // NICBMS ceiling holds jointly this frame), the budget is the plane-reduced
  // one, and an aloft plane reserves one further launch slot (spawn.ts'
  // planeActive term). Each launch descends at THIS wave's schedule velocity
  // (mc4-1), so the swarm ramps by wave.
  const spawned: SpawnResult = spawnIcbms(
    [...state.icbms, ...sputnikShots],
    liveTargets,
    sputBudget,
    state.rng,
    waveSchedule(state.wave).velocity,
    { planeActive: planes.length > 0 },
  )

  // CRUISE (mc5-3): from wave 6 the CRMWAV budget caps how many cruise missiles may
  // be on screen; release one (into the ICBM-family roster) whenever the field is
  // below that cap. A cruise descends along its CMANGL angle (stepAnyIcbm), not toward
  // a target, and never MIRV-splits (mirvEligible excludes 'cruise'). Waves 1-5 have
  // budget 0, so nothing releases and the rng is untouched (the mc5-3 wave-5 control).
  const cruiseCap = cruiseBudget(state.wave)
  const cruiseOnScreen = spawned.icbms.filter((i) => i.kind === 'cruise').length
  const roster =
    cruiseOnScreen < cruiseCap
      ? [...spawned.icbms, spawnCruise(state.rng, waveSchedule(state.wave).velocity)]
      : spawned.icbms

  // (2)(3) fly the enemy warheads and the player missiles one tick each. stepAnyIcbm
  // routes each warhead on its kind — ballistics home on target, cruise fly the angle.
  const flownIcbms = roster.map(stepAnyIcbm)
  const flownAbms = state.abms.map(stepAbm)

  // MIRV (mc5-1): at most ONE in-band ballistic warhead MIRVs per frame — the ROM keeps a
  // single MIRVIX slot, so only one ICBM splits per tick. We pick the last eligible in
  // array order (a deterministic choice); we do NOT reproduce the ROM's exact slot-scan
  // survivor: ICPOSI counts DOWN from the highest slot so ITS survivor is the lowest slot,
  // and our array index is not the ROM slot index. The faithful, tested invariants are
  // one-per-frame + the NICBMS(8) on-screen ceiling (W3COMN.MAC:35 — MIRVER shares the
  // 8-slot POTENT/ICOPEN loop, W3MAIN.MAC:2705): children fill only OPEN slots
  // (NICBMS - count), so the roster can never exceed NICBMS and cannot avalanche.
  // Suppressed while >= MIRV_EXPLOSION_SUPPRESS explosions are live (EXPLCT, W3MAIN.MAC:1531),
  // read BEFORE this frame's new blasts, so it keys off state.explosions (pre-aging count).
  const openSlots = Math.max(0, NICBMS - flownIcbms.length)
  let mirvAt = -1
  if (state.explosions.length < MIRV_EXPLOSION_SUPPRESS && openSlots > 0) {
    for (let i = 0; i < flownIcbms.length; i++) if (mirvEligible(flownIcbms[i])) mirvAt = i // one per frame
  }
  const withMirvs =
    mirvAt < 0
      ? flownIcbms
      : [...flownIcbms, ...mirvSplit(flownIcbms[mirvAt], liveTargets, state.rng).slice(0, openSlots)]

  // (The plane's salvo is already inside spawned.icbms — folded into the roster
  // before the spawn — so withMirvs carries it; no re-add here.)

  // (4) each ABM that arrived this frame detonates a fresh blast at its target.
  const detonations = flownAbms
    .filter((a) => a.arrived)
    .map((a) => startExplosion(a.target.h, a.target.v))
  // (6) age the existing blasts and add the new ones; drop any that have collapsed.
  const explosions = [...state.explosions.map(stepExplosion), ...detonations].filter(
    (e) => !isExplosionDone(e),
  )

  // (5) damage: blasts kill ICBMs (scored at THIS wave's multiplier); a blast also
  // catches any plane it overlaps, worth SPUTNIK_SCORE_MULT×; then ARRIVED survivors
  // destroy structures.
  const { survivors, killed } = killIcbmsInBlasts(withMirvs, explosions)
  const { survivors: livePlanes, killed: killedPlanes } = killSputniksInBlasts(planes, explosions)
  const impact = resolveGroundImpacts(survivors, state.cities, state.bases)

  // (7) resolve the score and the phase from the frame's outcome. (state.phase is
  // 'play' here — 'over' froze and 'between' resolved in their own branches above.)
  // A downed plane scores SPUTNIK_SCORE_MULT× and a downed cruise CRUISE_SCORE_MULT×
  // the ICBM value at this wave's multiplier; ordinary (ballistic) kills score ×1. The
  // three enemy classes ride the SAME scoreKills scorer with their per-enemy multiple
  // {icbm:1, sputnik:4, cruise:5}, so the wave-multiplier math stays in one place.
  const cruiseKilled = killed.filter((i) => i.kind === 'cruise').length
  const ballisticKilled = killed.length - cruiseKilled
  const scoreAfterIcbms = scoreKills(state.score, ballisticKilled, state.wave)
  const scoreAfterPlanes = scoreKills(scoreAfterIcbms, killedPlanes.length * SPUTNIK_SCORE_MULT, state.wave)
  const score = scoreKills(scoreAfterPlanes, cruiseKilled * CRUISE_SCORE_MULT, state.wave)
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
      sputniks: livePlanes, // survivors visible this frame; cleared on the between resolve
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
    sputniks: livePlanes,
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
