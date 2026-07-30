// src/core/sim.ts
//
// Story bz1-10 — stepGame: the one pure step the shell drives. Mode dispatch
// frames the run (attract → playing → gameover → attract); the battle step
// integrates the per-system cores the earlier stories built (movement,
// firing, enemies, saucer) and adds what this story owns: the difficulty
// ratchet feeding the enemy side, lives/respawn, the extra-tank award, and
// the high-score check at run end.
//
// Attract is a SELF-PLAYING demo (story AC): the same battle step, driven by
// a scripted autopilot instead of the player, off the boot seed — identical
// trajectory on every entry, immune to everything but `start`. Nothing
// quarter-shaped anywhere: a run begins with a plain start input.
//
// PURE and deterministic. No DOM, no time, no randomness.

import { initGame, SPAWN_POSE, type GameState } from './state'
import type { GameEvent } from './events'
import type { Input } from './input'
import { stepTank } from './movement'
import { stepFiring } from './firing'
import { stepEnemies, radarContacts } from './enemies'
import { stepSaucer, saucerContacts } from './saucer'
import { stepRadar } from './radar'
import { isMotionBlocked, isEnemyInRange } from './alerts'
import { GAME_FRAME_HZ } from './timebase'
import { initVolcano, stepVolcano, VOLCANO_SEED_SALT } from './volcano'
import {
  aggression,
  extraTanksEarned,
  ENEMY_SCORE_PER_PLAYER_DEATH,
} from './difficulty'
// SH-6: the qualify/insert table logic now comes from @shared/highscore
// (the extracted contract the lobby + every sibling game share). Both are
// domain-agnostic — they read only `.score` — so battlezone's domainless board
// drops straight in.
import { insertHighScore, qualifiesForHighScore } from '@shared/highscore'
import { stepNameEntry } from '@shared/name-entry'

/**
 * Seconds the game-over screen holds before the cabinet cycles back to
 * attract on its own (the arcade auto-cycle; no input required). Sits inside
 * the TEA-pinned bounds: ≥ 1 s so the screen exists, ≤ 30 s so the loop
 * cannot stall.
 */
export const GAME_OVER_SECONDS = 3

/**
 * Seconds the initials-entry screen waits for typing before committing the
 * current buffer on its own (SH2-13). The cabinet's whole run loop stays
 * input-free (the bz1-10 TEA bound: back to attract within 30 s of no input,
 * entry included — 3 s card + this sits well inside it).
 */
export const ENTRY_SECONDS = 15

/** Initials the entry screen collects — the 3-char arcade convention. One of
 * battlezone's per-cabinet NUMBERS; the entry VERB itself is the cabinet-wide
 * shared reducer (SH2-13). */
const MAX_INITIALS = 3

function clampAxis(v: number): number {
  return v < -1 ? -1 : v > 1 ? 1 : v
}

/**
 * The attract autopilot: a lazy patrol arc with occasional pot-shots, a pure
 * function of the demo clock. Deliberately NOT derived from player input —
 * the demo cannot be steered (story AC).
 */
function demoInput(t: number): Input {
  return {
    leftTread: clampAxis(0.75 + 0.25 * Math.sin(t * 0.7)),
    rightTread: clampAxis(0.75 + 0.25 * Math.sin(t * 0.9 + 1.3)),
    fire: Math.sin(t * 1.7) > 0.93,
    start: false,
  }
}

/**
 * Begin a fresh run. The run's seed word is drawn from the boot seed plus the
 * demo clock at the moment start was pressed: pure (no wall clock), but real
 * players get varied battles while a test that starts at tick zero replays
 * exactly.
 */
function startRun(s: GameState): GameState {
  const runSeed = (s.seed + Math.round(s.modeAge * 60)) >>> 0
  return {
    ...initGame(runSeed),
    mode: 'playing',
    highScores: s.highScores,
    seed: s.seed,
    // bz3-11: frameCount is free-running — a mode transition must not reset
    // the enemy-alert flash phase back to frame 0.
    frameCount: s.frameCount,
  }
}

/** End of a NON-qualifying run: rebuild attract from the boot seed — the demo
 *  replays identically; only the board survives the run. (A qualifying run
 *  goes through the entry screen and commitEntry instead — SH2-13.) */
function returnToAttract(s: GameState): GameState {
  return { ...initGame(s.seed), highScores: s.highScores, frameCount: s.frameCount }
}

/** Commit the entry screen's typed initials VERBATIM — '' if nothing was
 *  typed, never an auto-tagged constant (SH2-13 retires bz1-10's 'AAA') —
 *  then rebuild attract from the boot seed. Only reachable from 'entry',
 *  which only a qualifying score enters, so the insert is unconditional. */
function commitEntry(s: GameState): GameState {
  const table = insertHighScore(s.highScores, {
    name: s.entry?.initials ?? '',
    score: s.score,
  })
  return { ...initGame(s.seed), highScores: table, frameCount: s.frameCount }
}

/**
 * One battle step — shared by real play and the attract demo. In demo mode
 * the tank is immortal and earns nothing permanent: deaths and extra tanks
 * are run-framing, not demo-framing.
 */
function stepBattle(s: GameState, driver: Input, dt: number, demo: boolean): GameState {
  const modeAge = s.modeAge + dt

  // The player side: dual-tread drive, then the one-shell cannon.
  const player = stepTank(s.player, driver, dt)
  let playerShell = stepFiring(s.playerShell, player, driver, dt)

  // The ratchet (findings §5): player-minus-enemy differential, tempered by
  // the current hostile's spawn age — fed to the enemy side as ONE parameter.
  const differential = s.score - s.enemyScore
  const ratchet = aggression(differential, s.enemies.hostile.phaseAge)

  // The enemy side gets first claim on the player's shell (bz1-9 precedence);
  // the saucer only sees a shell the hostile didn't consume this frame. The
  // spawn arc (bz3-2 / E-009) keys on the same differential as the ratchet —
  // NOT the raw score also passed here (that stays the missile DIP check's
  // absolute-score signal, findings §9).
  const enemyStep = stepEnemies(s.enemies, player, playerShell, dt, s.score, ratchet, differential)
  if (enemyStep.playerShellConsumed) playerShell = null

  const saucerStep = stepSaucer(s.saucer, player, playerShell, dt, s.score)
  if (saucerStep.playerShellConsumed) playerShell = null

  // The step's gameplay moments (bz1-11) — derived from the transitions this
  // step just produced, FRESH each step. Every return path below carries
  // `events`; leaking the previous step's list would replay its cues.
  const events: GameEvent[] = []

  // The cannon: cue on the slot filling, judged AFTER consumption so the cue
  // and the observable slot transition can never disagree (TEA's 600-step
  // invariant). A point-blank shell eaten the frame it spawns loses its
  // report — the kill's blast owns that frame anyway.
  if (s.playerShell === null && playerShell !== null) events.push({ type: 'shot-fired' })

  // Kills: the award is non-zero exactly once per death (bz1-7/9 contract),
  // so it IS the kill-step edge. The hostile's kind is read from the state
  // that died, not the replacement.
  if (enemyStep.scoreAward > 0) {
    events.push({ type: 'enemy-destroyed', kind: s.enemies.hostile.kind })
  }
  if (saucerStep.scoreAward > 0) events.push({ type: 'enemy-destroyed', kind: 'saucer' })

  // The visitor's lifecycle: present on arrival; gone the moment it stops
  // being ALIVE (killed → exploding, or departed → null) — the warble spans
  // exactly the alive window, not the blast.
  const prevSaucer = s.saucer.saucer
  const nextSaucer = saucerStep.state.saucer
  if (prevSaucer === null && nextSaucer !== null) events.push({ type: 'saucer-present' })
  if (prevSaucer?.phase === 'alive' && nextSaucer?.phase !== 'alive') {
    events.push({ type: 'saucer-gone' })
  }

  // The no-gap replacement (findings §2): the exploding→alive flip is the
  // one step the new hostile enters the field.
  if (s.enemies.hostile.phase === 'exploding' && enemyStep.state.hostile.phase === 'alive') {
    events.push({ type: 'hostile-spawn', kind: enemyStep.state.hostile.kind })
  }

  // bz3-10 (U-008/U-010): the two HUD-alert conditions (core/alerts.ts), each
  // latched so its cue fires once on the 0→1 entry — the ROM's OBJCOL/EIRNGE
  // rising edges — never every frame the condition keeps holding.
  const motionBlocked = isMotionBlocked(driver, s.player, player)
  if (motionBlocked && !s.motionBlockedLatch) events.push({ type: 'motion-blocked' })

  // bz3-9 (M-009): BOUNCE resets to its ROM max on the SAME OBJCOL rising edge
  // that fires BOING (BZONE.MAC:2681-2682, `LDA I,3F / STA BOUNCE`) — first
  // contact only; a tank still jammed against the wall next step (latch
  // already armed) does not re-trigger it, exactly like BOING itself. Once
  // set, it decays on its own via `advanceRadar`'s game-frame loop below —
  // never reset here on a later step, free-running like `frameCount`.
  const bounce = motionBlocked && !s.motionBlockedLatch ? 0x3f : s.bounce

  const enemyInRange = isEnemyInRange(player, enemyStep.state.hostile)
  if (enemyInRange && !s.enemyInRangeLatch) events.push({ type: 'enemy-in-range' })

  // Scoring, and the extra-tank CROSSING award (never a standing balance).
  const before = s.score
  const score = before + enemyStep.scoreAward + saucerStep.scoreAward
  const tanksEarned = extraTanksEarned(before, score)
  const lives = demo ? s.lives : s.lives + tanksEarned

  // bz3-10 (U-012): BONER's trigger, the crossing itself (BZONE.MAC:2560-2564
  // INC LIVES) — pushed before the player-hit early-returns below so it
  // survives a same-step death, exactly like every other moment above. Demo
  // tanks earn nothing permanent (stepBattle's own rule), so no cue either.
  if (!demo && tanksEarned > 0) events.push({ type: 'bonus-tank' })

  // The duel's consequence — this story's addition to bz1-8's signal.
  if (!demo && enemyStep.playerHit) {
    events.push({ type: 'player-hit' })
    const enemyScore = s.enemyScore + ENEMY_SCORE_PER_PLAYER_DEATH
    const livesLeft = lives - 1
    // bz4-1 (M-009 sibling): a lethal hit writes BOUNCE to the FULL BYTE 0xFF,
    // overriding whatever obstacle-ram value (0x3F) was decaying. The ROM does
    // this on the player-death / windshield-crack path (BZONE.MAC:2337-2338,
    // `LDA I,-1 / STA BOUNCE`) BEFORE `DEC LIVES` (:2339) — so it fires on
    // EVERY life lost, game-over included — and again in the mutual-kill branch
    // (:3363-3364), which is just this same `playerHit` block on a step that
    // also scored the enemy (so it is NOT gated on `scoreAward`).
    const deathBounce = 0xff
    if (livesLeft <= 0) {
      return {
        ...s,
        mode: 'gameover',
        modeAge: 0,
        player,
        playerShell,
        enemies: enemyStep.state,
        saucer: saucerStep.state,
        score,
        enemyScore,
        lives: 0,
        motionBlockedLatch: motionBlocked,
        enemyInRangeLatch: enemyInRange,
        bounce: deathBounce,
        events,
      }
    }
    // Respawn: a fresh tank at the origin; the battlefield fights on. The
    // respawn WIPES the shell slot, so a shot fired on this same fatal step
    // never shows in the returned state — drop its cue too, keeping the
    // cue↔slot invariant exact (the player's own blast owns this frame).
    //
    // bz2-9 R2: the survivor gets a FRESH post-spawn fire grace when the player
    // respawns — the ROM's rez_protect resets on respawn as well as on enemy
    // spawn ("don't be unfair", dis65 $5215/$5222). Without this the carried-
    // forward, still-aimed tank re-fires on the next frame and re-kills the
    // fresh spawn (the ~3 s-of-life playtest bug). Reset only an ALIVE tank's
    // clock; an exploding one is mid-blast and owns its EXPLOSION_DURATION timer.
    const survivor = enemyStep.state
    const respawnedEnemies =
      survivor.hostile.phase === 'alive'
        ? { ...survivor, hostile: { ...survivor.hostile, phaseAge: 0 } }
        : survivor
    return {
      ...s,
      player: SPAWN_POSE,
      playerShell: null,
      enemies: respawnedEnemies,
      saucer: saucerStep.state,
      score,
      enemyScore,
      lives: livesLeft,
      modeAge,
      // Review round 2 (MEDIUM): `motionBlocked`/`enemyInRange` above were
      // computed against the PRE-hit player pose, but the player teleports to
      // SPAWN_POSE this same step. A stale `true` latch carried through would
      // suppress WARNG/BOING on the fresh spawn's very next edge even when
      // it's born right back in danger — reset both so the next step judges
      // the new pose on its own, from a clean 0.
      motionBlockedLatch: false,
      enemyInRangeLatch: false,
      // bz4-1: the respawn carries the death's full-byte 0xFF forward — never
      // silently zeroed, never clamped back to the obstacle 0x3F (see above).
      bounce: deathBounce,
      events: events.filter((e) => e.type !== 'shot-fired'),
    }
  }

  return {
    ...s,
    player,
    playerShell,
    enemies: enemyStep.state,
    saucer: saucerStep.state,
    score,
    lives,
    motionBlockedLatch: motionBlocked,
    enemyInRangeLatch: enemyInRange,
    bounce,
    modeAge,
    events,
  }
}

/** The radar's own frame quantum — DRADAR runs once per ROM game frame
 *  (BZONE.MAC:510), decoupled from the shell's 60 Hz physics sub-step. Ticking
 *  `stepRadar` off the sub-step directly would sweep at the ruled-out 388 ms/
 *  rev (bz3-7 / D-001); this accumulator holds the 1489 ms/rev rate steady. */
const RADAR_FRAME_SECONDS = 1 / GAME_FRAME_HZ

/**
 * Drive the radar's DRADAR analog off however much of `dt` has accumulated,
 * at the ROM's 15.625 Hz cadence — never more than once per whole 64 ms frame,
 * carrying any remainder in `radarClock` (the shell's loop hands `dt` in fixed
 * 1/60 s sub-steps, so this fires roughly every third or fourth call). Reads
 * the contacts off `state`'s already-stepped enemy/saucer sides, so the radar
 * sees this frame's battlefield.
 *
 * bz3-10 (U-009): appends `radar-blip` to the events this step already carries
 * (from `stepBattle`) whenever a game-frame tick re-lights a contact to peak —
 * RBEEP's trigger. No extra latch: `stepRadar`'s own decay makes each re-light
 * inherently edge-like (see its `litThisFrame` doc).
 *
 * bz3-11: this loop already IS the 15.625 Hz game-frame boundary (the ROM's
 * `INC FRAME`, BZONE.MAC:439), so it is also where `state.frameCount` —
 * `alerts.ts`'s flash-gate counter — ticks. Incrementing it anywhere else
 * (e.g. the shell's ~60 Hz render sub-step) would blink the enemy alerts at
 * 15 Hz instead of the ROM's 3.9 Hz (the C-001 trap).
 *
 * bz3-9 (M-009): the SAME boundary is BOUND's own cadence (BZONE.MAC:2132-
 * 2134, `LSR BOUNCE` once per game frame) — `state.bounce` decays here, never
 * on the ~60 Hz render sub-step (the same C-001 trap `frameCount` avoids).
 * `>> 1` unconditionally is exactly LSR (BOUND's `BEQ` is only a hardware
 * short-circuit for the already-zero case: 0 >> 1 is still 0).
 */
function advanceRadar(state: GameState, dt: number): GameState {
  let clock = state.radarClock + dt
  let radar = state.radar
  let radarBlips = state.radarBlips
  let frameCount = state.frameCount
  let bounce = state.bounce
  const contacts = [...radarContacts(state.enemies), ...saucerContacts(state.saucer)]
  const events = [...state.events]
  while (clock >= RADAR_FRAME_SECONDS) {
    const step = stepRadar(radar, state.player, contacts)
    radar = step.state
    radarBlips = step.blips
    if (step.litThisFrame) events.push({ type: 'radar-blip' })
    frameCount += 1
    bounce = bounce >> 1
    clock -= RADAR_FRAME_SECONDS
  }
  return { ...state, radar, radarBlips, radarClock: clock, frameCount, bounce, events }
}

/**
 * bz4-2: drive the volcano's SEEDED-STOCHASTIC VOLCNO emitter (`volcano.ts`) at
 * the ROM's 15.625 Hz game-frame rate — the `enemies.ts:804` floor-diff idiom
 * (a running total age, diffed against its prior value each call), not
 * `advanceRadar`'s remainder clock, since the emitter needs a comparable "how
 * many whole frames since last time" count rather than a fixed tick.
 *
 * `stepVolcano` is now the ROM-faithful per-rock independent respawn: each of
 * NOROCK=5 rocks rolls its OWN 1/8-per-frame relaunch gate and draws its OWN
 * random YSPD (BZONE.MAC:1391-1407). The old bz3-6 synchronised
 * relaunch-on-retire volley (a single burst clock) is retired — the emitter
 * self-manages its continuous, staggered eruption from the carried seed.
 *
 * Guards `dt` itself: a non-finite (or negative) `dt` must not spin the
 * frame-count loop, so it bails out untouched rather than hang or corrupt the
 * carried `volcanoAge`. The `?? initVolcano(...)` fallback keeps pre-bz3-6
 * fixtures (no `volcano` field) deterministic off their own run seed.
 */
function advanceVolcano(state: GameState, dt: number): GameState {
  const seeded = state.volcano ?? initVolcano((state.seed ^ VOLCANO_SEED_SALT) >>> 0)
  if (!Number.isFinite(dt) || dt <= 0) return { ...state, volcano: seeded }
  const priorAge = state.volcanoAge ?? 0
  const priorFrames = Math.floor(priorAge * GAME_FRAME_HZ)
  const volcanoAge = priorAge + dt
  const nowFrames = Math.floor(volcanoAge * GAME_FRAME_HZ)
  let volcano = seeded
  for (let f = priorFrames; f < nowFrames; f++) {
    volcano = stepVolcano(volcano)
  }
  return { ...state, volcano, volcanoAge }
}

/**
 * Advance the whole game one step: identical-in → identical-out.
 *
 *  - attract : `start` begins a fresh run; anything else steps the demo.
 *  - playing : the battle, driven by the player. `start` is inert mid-run.
 *  - gameover: the battlefield holds frozen; after GAME_OVER_SECONDS a
 *              QUALIFYING score moves to the initials-entry screen (SH2-13)
 *              and anything else cycles back to attract by itself.
 *  - entry   : the typed-initials screen. `start` with the buffer complete
 *              commits; otherwise the screen times out after ENTRY_SECONDS
 *              and commits the current buffer verbatim — the whole loop
 *              stays input-free (no input, no coin).
 */
export function stepGame(state: GameState, input: Input, dt: number): GameState {
  if (state.mode === 'attract') {
    if (input.start) return startRun(state)
    return advanceVolcano(advanceRadar(stepBattle(state, demoInput(state.modeAge), dt, true), dt), dt)
  }

  if (state.mode === 'gameover') {
    const modeAge = state.modeAge + dt
    if (modeAge >= GAME_OVER_SECONDS) {
      if (qualifiesForHighScore(state.highScores, state.score)) {
        return { ...state, mode: 'entry', entry: { initials: '' }, modeAge: 0, events: [] }
      }
      return returnToAttract(state)
    }
    // The hold is SILENT: the death step's cues must not replay each frame.
    return { ...state, modeAge, events: [] }
  }

  if (state.mode === 'entry') {
    // The player's own confirm: the shell-latched one-shot `start` with the
    // buffer COMPLETE. An arrival-frame latch with a short buffer is inert —
    // the bz1-10 held-press 'AAA' regression class stays dead.
    if (input.start && state.entry !== null && state.entry.initials.length === MAX_INITIALS) {
      return commitEntry(state)
    }
    const modeAge = state.modeAge + dt
    if (modeAge >= ENTRY_SECONDS) return commitEntry(state)
    return { ...state, modeAge, events: [] }
  }

  return advanceVolcano(advanceRadar(stepBattle(state, input, dt, false), dt), dt)
}

/** One initials keydown on the entry screen (SH2-13). A PURE core event
 * function the shell calls per keydown — typed letters are edge events, not
 * per-frame held state, so they never ride on Input. The shared reducer
 * (@shared/name-entry) appends A–Z uppercased up to MAX_INITIALS and
 * deletes on Backspace (never past empty); every other key is inert. Inert
 * outside 'entry' mode; a no-op returns the same state. */
export function enterInitial(state: GameState, key: string): GameState {
  if (state.mode !== 'entry' || state.entry === null) return state
  const initials = stepNameEntry(state.entry.initials, key, MAX_INITIALS)
  if (initials === state.entry.initials) return state
  return { ...state, entry: { initials } }
}
