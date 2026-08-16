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

import { INITIAL_CURSOR, moveCursor, type Cursor } from './cursor.js'
import { stepAbm, launchAbm, type Abm } from './abm.js'
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
  sputnikInFireBounds,
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
import { nextPhase, nextWavePhase, resumePlay, advanceOverTimeout, INITIAL_PHASE, type Phase } from './state.js'
import {
  DEFAULT_HIGH_SCORES,
  qualifiesForHighScore,
  insertHighScore,
  type MissileCommandHighScore,
} from './highscore.js'
import { stepNameEntry } from '@shared/name-entry'
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
  /** Coarse phase: `'play'` until every city is dead, then `'over'`; a qualifying
   *  game-over routes to `'entry'` for the initials buffer (mc7-2), and mc6-6
   *  auto-returns `'over'` to `'attract'` after the game-over hold (see `overFrames`). */
  readonly phase: Phase
  /** Frames elapsed in phase `'over'` (mc6-6). Counts up while frozen at game-over; at
   *  `OVER_TIMEOUT_FRAMES` the MAINLINE loop closes back to the attract demo. Held at 0
   *  in every non-over phase (only the `'over'` branch of `stepGame` advances it). */
  readonly overFrames: number
  /** The cabinet high-score ladder (the mc7-1 table). Seeded to the ROM default at
   *  boot; commit inserts into it; the shell loads/saves it on boot/commit (mc7-3 —
   *  src/main.ts + shell/highscore.ts, one-origin localStorage). */
  readonly highScores: readonly MissileCommandHighScore[]
  /** The in-flight initials buffer collected during `'entry'` (mc7-2). Empty except
   *  while entering a new high score; driven by @shared/name-entry.stepNameEntry. */
  readonly initials: string
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

/** A fresh, fully-defended game in phase `'play'`: 6 live cities, 3 live bases at
 *  full ammo, no enemies, score 0, the full per-wave budget, the opening wave and
 *  its multiplier, and a PRNG seeded from `seed` (default 1). This is the playable
 *  board — createGame's OLD contract. The SETUP NEWGAM reseed (startGame) and the
 *  attract demo's setup->play auto-advance both build a fresh game HERE, the one
 *  place the field is defined, so the demo board and the playable board never drift. */
export function createPlayGame(seed = 1): GameState {
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
    overFrames: 0,
    highScores: DEFAULT_HIGH_SCORES,
    initials: '',
    remaining: waveSchedule(INITIAL_WAVE).count,
    wave: INITIAL_WAVE,
    multiplier: scoreMultiplier(INITIAL_WAVE),
    citiesLost: 0,
    rng: createRng(seed),
    soundEvents: [],
  }
}

// Ground truth: cold start writes S.SETU and CLEARS ATRACT to attract mode — the
// ATRACT byte is ";ATTRACT (0)/GAME (-1) FLAG" (W3MAIN.MAC:135), and PREGM1 enters
// attract by zeroing it (:3761 LDA I,0 / STA ATRACT); INITIAL_PHASE (state.ts) is our
// boolean-true = attract reading. The MC-STATE-INIT claim pins the boot (W3MAIN.MAC:491).
// ROM line numbers live in // comments, never JSDoc — the un-cited-literal scanner
// strips // but not /** */.
/** The cabinet COLD START (mc6-4): the same fully-defended field but in phase
 *  `'attract'` (INITIAL_PHASE), where the AUTCUR smart cursor plays the field by
 *  itself until a player presses anything. Only the phase differs from
 *  createPlayGame, so the demo board is byte-for-byte a real game board. */
export function createGame(seed = 1): GameState {
  return { ...createPlayGame(seed), phase: INITIAL_PHASE }
}

// mc6-2/mc6-4: the SETUP -> PLAY reseed. The SETUP task chain that begins at NEWGAM
// — SETUP1: .WORD NEWGAM-1 (W3MAIN.MAC:583) -> NEWGAM (:3835), which sets the
// skill/lives and wave 1 then requests NEWWV1 (:3903); NEWWV1 refills the magazines
// (:4021 LDA I,MAXMIS) and seeds the wave-1 ICBM schedule. We reuse createPlayGame,
// the one place that whole field is defined, so the reseed and the boot field can
// never drift.
//
// mc6-4 REPOINT: this reseed now fires from `'over'` (restart after game over —
// mc6-2's reachable edge) and from `'setup'` (the attract demo's auto-advance:
// attract -(any input)-> setup -(stepGame)-> this reseed -> play). `'attract'` is
// NO LONGER a start phase for startGame — the demo leaves via input to SETUP first
// (shell/input.beginSetupOnInput; the ROM writes S.SETU on start, W3MAIN.MAC:740-757),
// not by a direct attract->play jump. Every other phase (a running/paused/between
// game) is a NO-OP: a stray start must not wipe the board. Pure — no clock, no
// entropy; the incoming seed is threaded through so the reseed stays deterministic.
/**
 * Reseed a fresh, fully-defended game in `'play'` when `state.phase` is `'over'` or
 * `'setup'` (the NEWGAM->NEWWV1 SETUP chain), reusing createPlayGame so the field
 * matches a cold boot exactly: every city and base live, magazines full, no enemies
 * in flight, a cleared score, the opening wave and its full ICBM budget, a zeroed
 * frame counter. For every other phase return `state` unchanged.
 */
export function startGame(state: GameState): GameState {
  // mc7-2: the high-score ladder is cabinet-persistent — a restart reseeds the
  // battle but CARRIES the ladder forward (createPlayGame's default is only the
  // boot seed; mc7-3's shell reload overwrites it on boot). The initials buffer
  // resets (createPlayGame seeds it empty).
  return state.phase === 'over' || state.phase === 'setup'
    ? { ...createPlayGame(state.rng.seed), highScores: state.highScores }
    : state
}

// ─── mc7-2 (GREEN, Yoda): the name-entry 'entry' phase + initials buffer ──────
// The ROM's TAKE INITIALS FOR NEW HIGH SCORE task (W3DSUP.MAC:4064): after game
// over, IF the final score qualifies for the ladder the machine takes the player's
// initials, INSERTs and returns to attract. A start-switch press or a 30-second
// timeout ABORTS with no insert (W3DSUP.MAC:4076 ";ABORT IF EITHER START SWITCH
// PRESS" / :4086-:4088 ";TOO MUCH TIME?" -> "ABORT INITIALS"; the timeout seed is
// UCVTAB = 0x84, ":RESET TIMEOUT TO 30 SEC", :4180). The 3-char buffer is the
// cabinet-wide @shared/name-entry verb (A-Z uppercased, Backspace); the ROM's
// trackball letter cursor over its 26-letter charset (LDA I,26., :4128; ASCII
// offset ADC I,41, :4158) is DELIBERATELY not ported — the fleet keyboard ruling
// (joust jt10-7, asteroids …). MC owns only the buffer field + these transitions.
// All pure: no clock, no entropy. (// line cites, never /** */ — the AC3 un-cited-
// literal scanner strips // per line but leaks a digit inside a multi-line JSDoc.)

// MC-INITIALS-LEN — three initials. INTLHS holds the horiz display coord of each of
// the three initials being entered (W3DSUP.MAC:4060 .BYTE 82,78,6E — three coords).
// Claim MC-INITIALS-LEN.
export const MC_INITIALS_LEN = 3

/** Route a finished game into name entry: from `'over'`, when the final score
 *  qualifies for the ladder, enter `'entry'` with an empty initials buffer. A
 *  non-qualifying score — or any non-`'over'` phase — is returned unchanged (the
 *  `'over'`->`'attract'` timeout is mc6's edge). Pure. */
export function enterNameEntry(state: GameState): GameState {
  if (state.phase !== 'over' || !qualifiesForHighScore(state.highScores, state.score)) return state
  return { ...state, phase: 'entry', initials: '' }
}

/** One initials keydown during `'entry'`: advance the buffer via
 *  @shared/name-entry.stepNameEntry (A-Z uppercased, Backspace, capped at
 *  MC_INITIALS_LEN). A no-op key returns the SAME state; any non-`'entry'` phase is
 *  returned unchanged. Pure — reuse, not a re-implemented buffer. */
export function stepInitials(state: GameState, key: string): GameState {
  if (state.phase !== 'entry') return state
  const initials = stepNameEntry(state.initials, key, MC_INITIALS_LEN)
  return initials === state.initials ? state : { ...state, initials }
}

/** Commit a completed entry: with a FULL MC_INITIALS_LEN buffer during `'entry'`,
 *  insert `{ name, score }` into the ladder via the mc7-1 insert, clear the buffer
 *  and return to attract. An incomplete buffer or any non-`'entry'` phase is
 *  returned unchanged. Pure — neither the state nor the table is mutated. */
export function commitNameEntry(state: GameState): GameState {
  if (state.phase !== 'entry' || state.initials.length !== MC_INITIALS_LEN) return state
  return {
    ...state,
    highScores: insertHighScore(state.highScores, { name: state.initials, score: state.score }),
    initials: '',
    phase: 'attract',
  }
}

// abortNameEntry — the shared result of BOTH ROM abort triggers (a start-switch
// press, W3DSUP.MAC:4076; or the timeout, :4086-:4088): return to attract with the
// buffer cleared and the ladder UNCHANGED. The shell decides WHEN to call it; the
// per-frame countdown wiring is the deferred O-7b input-mapping item.
/** Abort name entry: return to attract, clear the buffer, and leave the ladder
 *  UNCHANGED — no insert, even from a full buffer (a timeout on the last letter
 *  discards it). Any non-`'entry'` phase is returned unchanged. Pure. */
export function abortNameEntry(state: GameState): GameState {
  if (state.phase !== 'entry') return state
  return { ...state, initials: '', phase: 'attract' }
}

// mc6-4: the SMART CURSOR MOVER (ATTRACT) — AUTCUR, W3MAIN.MAC:895 (.SBTTL :891,
// the MC-ANCH-W3MAIN-891 anchor). During the attract demo a pure, DETERMINISTIC
// auto-player drives the crosshair: it targets an active (descending) ICBM, chases
// it, and — once on target with the AUTCUR fire gate open — launches an ABM from the
// nearest loaded base. No entropy of its own (the "seeded" demo is deterministic
// because the ICBM SPAWNS draw state.rng); no clock. The exact ROM lead (a ~0x0E-dot
// V offset and an Hvel>>4 H prediction) and its fixed-point AUTSPD*ADCURS step are
// mc9-level pixel fidelity; here the cursor chases the warhead directly at AUTSPD.
//
// AUTSPD — the attract cursor's per-frame step, =2 (W3COMN.MAC:233). Like abm.ts's
// ABM_SPEED base, 2 is trivial-exempt from the un-cited-literal guard; pinned here by
// comment (// lines, not JSDoc — the citation scanner strips // but not /** */).
const AUTSPD = 2

/**
 * Advance the attract auto-player one frame: when `state.phase` is `'attract'` and a
 * descending ICBM exists, step the crosshair toward the nearest one by at most AUTSPD
 * per axis (clamped to the play area), and when the crosshair is within one step of
 * that warhead — with fewer than 2 ABMs aloft AND (ABMs + explosions) below the
 * incoming-ICBM count (the AUTCUR gate) — launch one ABM from the nearest live,
 * loaded base and spend a round. With no active target the crosshair holds; outside
 * `'attract'` the state is returned unchanged. Pure and deterministic.
 */
export function attractDriver(state: GameState): GameState {
  if (state.phase !== 'attract') return state
  const targets = state.icbms.filter((i) => !i.arrived) // NEWTAR: active warheads only
  if (targets.length === 0) return state // no target -> the crosshair holds

  const { cursor } = state
  const dist = (i: Icbm): number => Math.hypot(i.pos.h - cursor.h, i.pos.v - cursor.v)
  const target = targets.reduce((best, i) => (dist(i) < dist(best) ? i : best))

  // Chase the warhead by at most AUTSPD/axis — a gradual step, snapping onto it when
  // already within one step (no overshoot). moveCursor clamps to the play area.
  const stepToward = (from: number, to: number): number => {
    const d = to - from
    return Math.abs(d) <= AUTSPD ? d : Math.sign(d) * AUTSPD
  }
  const moved = moveCursor(cursor, { dh: stepToward(cursor.h, target.pos.h), dv: stepToward(cursor.v, target.pos.v) })

  // The AUTCUR fire gate: on target (within one step in both axes) AND < 2 ABMs on
  // screen AND ABMONS+EXPLCT < ICBONS (W3MAIN.MAC:1035-1047). Fire from the base
  // nearest the crosshair that is alive and loaded, spending one round (LAUABM).
  const onTarget =
    Math.abs(target.pos.h - cursor.h) <= AUTSPD && Math.abs(target.pos.v - cursor.v) <= AUTSPD
  const gateOpen =
    onTarget && state.abms.length < 2 && state.abms.length + state.explosions.length < state.icbms.length
  if (!gateOpen) return { ...state, cursor: moved }

  const loaded = state.bases.map((b, idx) => ({ b, idx })).filter(({ b }) => b.alive && b.ammo > 0)
  if (loaded.length === 0) return { ...state, cursor: moved } // no base can fire
  const best = loaded.reduce((a, c) => (Math.abs(c.b.pos.h - moved.h) < Math.abs(a.b.pos.h - moved.h) ? c : a))
  const abm = launchAbm(best.b.pos, moved)
  const bases = state.bases.map((b, i) => (i === best.idx ? { ...b, ammo: b.ammo - 1 } : b))
  return { ...state, cursor: moved, abms: [...state.abms, abm], bases }
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
  // GAME-OVER, then CLOSE THE LOOP (mc6-6): freeze the battle — only the clock and the
  // over-frame counter tick on, the sound channel stays quiet (no spawn/flight/damage to
  // voice). After the ENDGM2 final-bang hold (OVER_TIMEOUT_FRAMES frames), the MAINLINE
  // loop returns to the attract demo — the ROM's ENDGM1 flips ATRACT and ENDGM2 hands to
  // SETUPC=CDLADR, i.e. a fresh cold-start attract board (createGame), continuing the
  // seed stream so the demo stays deterministic. The high-score ladder (mc7-1/mc7-2)
  // PERSISTS across the loop-back — the ROM's HSTD table survives the return to attract,
  // so a non-qualifying game timing out must not wipe a score committed earlier this session.
  if (state.phase === 'over') {
    const overFrames = state.overFrames + 1
    if (advanceOverTimeout('over', overFrames) === 'attract') {
      return { ...createGame(state.rng.seed), highScores: state.highScores }
    }
    return { ...state, frame: state.frame + 1, overFrames, soundEvents: [] }
  }

  // mc7-3: FREEZE the name-entry screen exactly as 'over' does. mc7-2 landed the
  // 'entry' phase pure but unreachable; now that the PLAY branch below routes a
  // qualifying game-over into 'entry', a step during entry must NOT fall through to
  // stepCombat (which would run the battle and let nextPhase flip 'entry' away,
  // dropping the screen + initials buffer). Advance only the clock, keep the sound
  // channel quiet, and hold every game field — including the initials buffer —
  // byte-identical while the shell drives stepInitials/commitNameEntry over it.
  if (state.phase === 'entry') return { ...state, frame: state.frame + 1, soundEvents: [] }

  // mc6-3: while paused, freeze the battle exactly as 'over' does — advance only the
  // clock, keep the sound channel quiet, hold every game field byte-identical, and
  // resume from the exact frozen state. This mirrors the MECHANISM of the ROM's PAUSE
  // handler, which (dispatched by MAINLINE's IFMI -> JSR PAUSE when STATE is S.PAUS,
  // W3MAIN.MAC:517; .SBTTL PAUSE STATE, :615) steps NO simulation, only a PAUST display
  // timer. NB the ROM enters that state automatically for scripted delays, never by a
  // player control; mc6-3 repurposes the slot for a player toggle (see state.ts
  // togglePause). Guarded BEFORE the combat path (else nextPhase flips 'pause' to 'play').
  if (state.phase === 'pause') return { ...state, frame: state.frame + 1, soundEvents: [] }

  // mc6-4: SETUP auto-advances to a fresh, fully-defended PLAY game — the NEWGAM
  // reseed (startGame). The attract demo reaches 'setup' on any input; one frame
  // later the real game begins. (mc6-5 replaces this instant beat with the rendered
  // PLAYER-select/countdown SETUP screen.) Guarded before the combat path.
  if (state.phase === 'setup') return startGame(state)

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
      // mc11-2: the bonus count-up cue (TK, SUNABM). The ROM tallies the bonus one
      // PHYSICAL unit at a time, firing SUNABM per drawn unit: ENDWV4 draws each
      // surviving city (W3MAIN.MAC:4463) and ENDWV2 draws each unused ABM
      // (W3MAIN.MAC:4277). So one `bonusTick` per unit — survivingCities +
      // unusedMissiles — NOT per point: SMULTI scales the points added per tick
      // (ICMUL2/ABMADD), never the tick count. The whole beat resolves this frame.
      soundEvents: Array.from(
        { length: survivingCities + unusedMissiles },
        () => ({ type: 'bonusTick' }) as const,
      ),
    }
  }

  // mc6-4: the ATTRACT demo. The AUTCUR smart cursor plays the field first, then the
  // SAME combat sim runs (MIRVs suppressed — the ROM disables them in attract,
  // W3MAIN.MAC:1519). The demo NEVER leaves 'attract' on its own; only input
  // (shell/input.beginSetupOnInput -> 'setup') does — so whatever coarse phase the
  // combat produces ('play'/'over'/'between'), force it back to 'attract'.
  if (state.phase === 'attract') {
    return { ...stepCombat(attractDriver(state), { suppressMirv: true }), phase: 'attract' }
  }

  // PLAY: run the battle and let nextPhase decide the outcome ('play'/'over'/'between').
  // mc7-3: on the play->over transition (all cities dead), route a QUALIFYING final
  // score into name entry (W3DSUP.MAC:4064 TAKE INITIALS) instead of stopping at
  // 'over'. enterNameEntry is a no-op for a non-qualifying score, so it stays 'over';
  // it only acts on phase 'over', so a between/still-play frame is untouched.
  const stepped = stepCombat(state, {})
  return stepped.phase === 'over' ? enterNameEntry(stepped) : stepped
}

// mc6-4: the per-frame combat simulation — the seven-step order above. Extracted
// from stepGame so BOTH play and the attract demo run the IDENTICAL battle; the only
// knob is `suppressMirv` (the ROM disables MIRVs in attract, W3MAIN.MAC:1519). The
// caller owns the coarse phase: play lets nextPhase decide, attract forces 'attract'.
// over/pause/setup/between are handled by stepGame and never reach here.
function stepCombat(state: GameState, opts: { readonly suppressMirv?: boolean } = {}): GameState {
  // Live targets first — both the plane's salvo and the normal spawner aim only
  // at structures that are still alive.
  const liveTargets = [
    ...state.cities.filter((c) => c.alive).map((c) => c.pos),
    ...state.bases.filter((b) => b.alive).map((b) => b.pos),
  ]

  // SPUTNIK (mc5-2 + mc5-8 arbitration): from SPUTWV a plane crosses the field on
  // the WSPLAU activation cadence, and — when its distance timer has run AND it is
  // in the ±0x30 in-bounds band — fires ICBMs downward, worth SPUTNIK_SCORE_MULT×
  // when a blast catches it. A distinct entity with its own array (cruise/MIRV are
  // the ICBM family, this is not). Planes step + activate BEFORE the normal spawner
  // so `planeActive` is accurate THIS frame. mc5-8 makes the launch cycle EITHER/OR:
  // the ROM takes JMP SPUTFIR when the plane fires and SKIPS the normal FROMTOP
  // launch that cycle (W3MAIN.MAC:2543) — so the plane's salvo IS this cycle's
  // launch, not an addition the spawner tops up. The joint on-screen count stays
  // under the NICBMS(8) ceiling because the salvo clamp is MXICON-based.
  // Motion is FUNCTIONAL only (pixel-authentic velocity is mc9): SPUTNIK_SPEED = 1
  // dot/tick, and the fire timer counts DISTANCE MOVED (HORFIR/SPUTDS,
  // W3MAIN.MAC:2523-2527/:5883), so the fire spacing stays correct when mc9 raises
  // the velocity — at speed 1 the crossing (HMAX ticks) outlasts the deepest WSPFIR.
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
  // A ready, IN-BOUNDS plane launches its clamped salvo against the PRE-spawn
  // on-screen count — cruise missiles included, each borrowing two salvo slots
  // (the PLCPV cruise-borrow). Cruise missiles have existed since mc5-3, but this
  // caller passed a hardcoded 0 until mc11-1 wired the live count in below, so the
  // −2·cruise branch only started biting in mc11-1. The fire gate is the
  // ROM's SPUTFIR guard: HORFIR ≥ SPUTDS (readyToFire) AND PLCPH in the ±0x30 band
  // (sputnikInFireBounds, W3MAIN.MAC:2529-2537). The salvo headroom is MXICON-based
  // — the −1 below NICBMS is the aloft plane's OWN reservation (ICNORM's PLCPV
  // borrow, W3MAIN.MAC:2447-2453): it fires only when the swarm has dipped, never
  // into a full-at-seven swarm.
  const cruiseOnScreenPreSpawn = state.icbms.filter((i) => i.kind === 'cruise').length
  let sputBudget = state.remaining
  const sputnikShots: Icbm[] = []
  planes = planes.map((p) => {
    if (!readyToFire(p) || !sputnikInFireBounds(p.pos.h)) return p
    const count = sputnikFireCount(cruiseOnScreenPreSpawn, state.icbms.length + sputnikShots.length, sputBudget)
    const shots = sputnikLaunch(p, liveTargets, count, waveSchedule(state.wave).velocity, state.rng)
    sputnikShots.push(...shots)
    sputBudget -= shots.length
    return reload(p, state.wave)
  })

  // (1) spawn — EITHER/OR (mc5-8): the ROM's launch arbiter takes JMP SPUTFIR when
  // the plane fires and SKIPS the normal FROMTOP launch that cycle (W3MAIN.MAC:2543),
  // so run the normal spawner ONLY when NO plane fired this frame. When a plane
  // fired, its salvo IS this cycle's launch — folded into the roster, budget already
  // reduced. When none fired, the spawner runs with the plane-reduced budget and an
  // aloft plane reserving one launch slot (spawn.ts' planeActive term); each launch
  // descends at THIS wave's schedule velocity (mc4-1), so the swarm ramps by wave.
  const planeFired = sputnikShots.length > 0
  const spawned: SpawnResult = planeFired
    ? { icbms: [...state.icbms, ...sputnikShots], remaining: sputBudget }
    : spawnIcbms(
        state.icbms,
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
  if (!opts.suppressMirv && state.explosions.length < MIRV_EXPLOSION_SUPPRESS && openSlots > 0) {
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
