// src/core/sim.ts
//
// Story ml7-2 — stepGame, the ORCHESTRATOR. One pure function threads the owning
// GameState through the pure subsystems each frame, reusing the done pieces
// (phase.ts advancePhase, input.ts stepPlayer, millipede.ts) and building the
// per-frame event stream the shell audio/render read. Mirrors centipede's stepSim.
//
// TWO LAWS (centipede's): the event array is rebuilt every frame, and ATTRACT IS
// SILENT (its branch returns events: []). Collisions resolve against the
// pre-march segment positions so a shot hits where the segment currently is.
//
// This increment wires the player↔millipede vertical + phase dispatch. The enemy
// roster, DDT, mushroom regen and waves are layered on in follow-up increments,
// each adding its own event emission at the sites marked below.

import { createGame, type GameState, type Shot } from './game-state'
import { stepPlayer } from './input'
import {
  stepMillipede,
  createMillipede,
  checkPlayerCollision,
  VACANT_COLOR,
  type Segment,
} from './millipede'
import { WAVE_DELAY, stepWaveDelay } from './waves'
import { advancePhase, type PhaseSignals } from './phase'
import { event, type GameEvent, type GameEventKind } from './events'
import { score1Of, score2Of } from './score'
import { awardBonus } from './bonus'
import { stepRoster, shootRoster, type Roster } from './enemies/roster'
import { resolveShot } from './shot'
import {
  ddtExplosionStep,
  ddtPlace,
  ddtRestore,
  ddtScrollDown,
  ddtScrollUp,
  anyDdtExploding,
} from './ddt'
import { obstacOffset, obstacleAt, FULL_MUSHROOM, TOP_MIN } from './mushroom'
import { initConway, masterStep } from './conway'
import { scrollDispatch, scrollDown, scrollUp, type ScrollGate } from './scroll'
import { INCHWORM_SLOW } from './inchworm'
import { nextInt } from '@shared/rng'
import type { EnemyView } from './enemies/contract'

/** One frame of input: the trackball bytes, fire, and the start/coin button. */
export interface GameInput {
  dh: number
  dv: number
  fire: boolean
  start: boolean
}

/** Pixels the shot climbs per frame (higher V = up). */
const SHOT_SPEED = 8
/** The shot expires past the top of the field. */
const SHOT_MAX_V = 0xf8
/** Player-death animation hold (PLAYER_EXPLODE_TIMER, millipede.ts). */
const DEATH_HOLD = 0x60
/** The "GAME OVER" message hold before attract returns (MLSUB.MAC:161-162
 *  "LDA I,80 / STA DELAY" — the ROM reuses DELAY for the end-of-game pause). */
const GAME_OVER_DELAY = 0x80
/** Provisional segment score — refined when full scoring lands. */
const SEGMENT_PTS = 10

const isLive = (s: Segment): boolean => s.color !== VACANT_COLOR

/** Live slots (colour ≠ 0) in a creature's slot band. */
const liveSlots = (slots: ReadonlyArray<{ color: number }>): number =>
  slots.reduce((n, s) => (s.color !== 0 ? n + 1 : n), 0)

/** MUSH+2 — the count of full mushrooms near the TOP of the field (rows ≥
 *  TOP_MIN). The ROM keeps a running MUSH register (musher INC / mushdc DEC);
 *  this port recomputes the same quantity from the field each frame (ml7-8). */
function countTopMushrooms(field: Uint8Array): number {
  let n = 0
  for (let addr = 0; addr < field.length; addr++) {
    if ((field[addr] & 0x7f) === FULL_MUSHROOM && (addr & 0x1f) >= TOP_MIN) n++
  }
  return n
}

/** Each creature's roster band and its PRESENCE-voice root (ml7-8): the sim
 *  edge-signals `${root}-start` on the vacant→live edge and `${root}-stop` on
 *  the live→vacant edge, one sustained voice per creature on its own CHAN slot. */
const PRESENCE_VOICES: ReadonlyArray<readonly [keyof Roster, string]> = [
  ['spiders', 'spider'],
  ['bees', 'bee'],
  ['beetles', 'beetle'],
  ['dragonflies', 'dragonfly'],
  ['mosquitoes', 'mosquito'],
  ['earwigs', 'earwig'],
  ['inchworms', 'inchworm'],
]

export function stepGame(state: GameState, input: GameInput): GameState {
  switch (state.phase) {
    case 'attract':
      return stepAttract(state, input)
    case 'play':
      return stepPlay(state, input)
    case 'death':
      return stepDeath(state)
    case 'game-over':
      return stepGameOver(state)
    case 'entry':
      return { ...state, frame: state.frame + 1, events: [] }
  }
}

/** Attract: the train self-plays over the field, silent, until start. */
function stepAttract(state: GameState, input: GameInput): GameState {
  const phase = advancePhase('attract', { startRequested: input.start })
  let segments = stepMillipede(state.segments, state.frame, state.field)
  if (segments.some((s) => isLive(s) && s.v < 0x08)) {
    segments = state.segments // (respawn handled by createMillipede in a later pass)
  }
  if (phase === 'play') {
    // Begin a NEW game: rebuild a clean starting world from the seed — the
    // millipede enters from the top, the player spawns at the bottom, a fresh
    // field. (Keeping the sunk attract train would kill the player instantly.)
    return { ...createGame(state.seed, { phase: 'play' }), events: [] }
  }
  return { ...state, phase, frame: state.frame + 1, segments, events: [] }
}

function stepPlay(state: GameState, input: GameInput): GameState {
  const events: GameEvent[] = []

  // 1. Player move. MOVE consults OBSTAC with LDY I,0 at each candidate cell
  //    (MILLI.MAC:1662-1668 horizontal, :1694-1700 vertical): any nonzero stamp
  //    there blocks the step, so the ship cannot walk through a mushroom/rock.
  const blocked = (h: number, v: number): boolean =>
    obstacleAt(state.field, obstacOffset(h, v, 0)) !== 0
  const player = stepPlayer(state.player, { dh: input.dh, dv: input.dv, fire: input.fire }, blocked)

  // 2. Shot: spawn on fire (single shot at a time).
  let shot: Shot = state.shot
  if (!shot.active && input.fire) {
    shot = { active: true, h: player.h, v: player.v }
    events.push(event('shot-fired'))
  }

  // 3. Shot hits at its CURRENT position (before climbing). SHOOT1 resolves the
  //    PLAYFIELD first — a DDT bomb or a mushroom in the shot's cell (shot.ts) —
  //    then, if the shot passed through, the millipede segments.
  let segments = state.segments
  let score = state.score
  // HITDDT (MLDEF.MAC:373) — a persistent flag; carry the prior value forward and
  // set/clear it at the ROM's sites this frame (SC-9, suppresses the scroll arm below).
  let hitDdt = state.hitDdt
  if (shot.active) {
    const field = resolveShot(state.ddt, state.field, shot.h, shot.v)
    if (field.kind === 'ddt') {
      score += field.points // +80 (DDT_HIT_POINTS)
      shot = { active: false, h: 0, v: 0 }
      hitDdt = true // INC HITDDT — the shot detonated a bomb (MILLI.MAC:2060, DD-213)
      events.push(event('ddt-exploded'))
    } else if (field.kind === 'mushroom') {
      score += field.points // +1 only on a destroying chip
      shot = { active: false, h: 0, v: 0 }
      events.push(event('mushroom-hit'))
    } else if (field.kind === 'stop') {
      shot = { active: false, h: 0, v: 0 } // a letter/ROCK stops the shot, no score
    }
  }
  if (shot.active) {
    const hit = segments.findIndex((s) => isLive(s) && checkPlayerCollision(s, { h: shot.h, v: shot.v }))
    if (hit >= 0) {
      segments = segments.filter((_, i) => i !== hit)
      score += SEGMENT_PTS
      shot = { active: false, h: 0, v: 0 }
      events.push(event('segment-killed'))
    }
  }

  // 4. Step the enemy roster (spawn/move/plant/player-contact), then resolve the
  //    shot against it. The view shares state.field/state.rng so the pure
  //    subsystems plant mushrooms and draw randomness deterministically.
  //    The secondary ROM inputs (ml7-8) ride on the view: SCORE1, DEAD (=
  //    remaining segments), the SLOW critter-freeze timer, the MUSH+2 top tally
  //    and the active-beetle count, all from real state instead of ml7-2 zeros.
  const liveSegments = state.segments.filter(isLive).length
  const view: EnemyView = {
    frame: state.frame,
    score2: score2Of(state.score),
    player: { h: player.h, v: player.v, alive: player.alive },
    centin: liveSegments,
    hard: false,
    score1: score1Of(state.score),
    dead: liveSegments, // DEAD = remaining live centipede segments (MLDEF.MAC:295)
    slow: state.slow,
    mushTop: countTopMushrooms(state.field),
    beetles: liveSlots(state.roster.beetles),
    rng: state.rng,
    field: state.field,
  }
  // Snapshot each creature's live-state BEFORE stepRoster — the reducers mutate
  // the slot arrays IN PLACE and return the same references, so state.roster and
  // the stepped roster alias; the presence edges must compare against this.
  const presenceBefore = PRESENCE_VOICES.map(([key]) => liveSlots(state.roster[key]) > 0)
  const stepped = stepRoster(state.roster, view)
  let roster = stepped.roster
  // SCROLC sources accumulate here through the frame; SCROLL consumes them below.
  let scrollQueued = 0
  // A live inchworm count BEFORE the shot resolves — a drop across shootRoster
  // is a SHOT kill (an offscreen exit already happened in stepRoster), which is
  // what arms SLOW (IW-34/37); an exit does not.
  const inchwormsAfterStep = liveSlots(roster.inchworms)
  if (shot.active) {
    const rs = shootRoster(roster, { h: shot.h, v: shot.v })
    if (rs.killed) {
      roster = rs.roster
      score += rs.scoreDelta
      shot = { active: false, h: 0, v: 0 }
      scrollQueued += rs.scroll // beetle DEC / mosquito INC (MILLI.MAC:2090/:2127)
      events.push(event('enemy-killed'))
    }
  }
  const inchwormShotKilled = liveSlots(roster.inchworms) < inchwormsAfterStep

  // Presence voices (ml7-8): edge-signal every creature that appeared or left
  // the field this frame — comparing the pre-step snapshot to the final roster
  // (post-step, post-shot).
  PRESENCE_VOICES.forEach(([key, root], i) => {
    const now = liveSlots(roster[key]) > 0
    if (!presenceBefore[i] && now) events.push(event(`${root}-start` as GameEventKind))
    if (presenceBefore[i] && !now) events.push(event(`${root}-stop` as GameEventKind))
  })

  // SLOW: an inchworm kill sets the critter-freeze timer to 0xE0; otherwise it
  // counts down one per frame (0 = not slowed).
  const slow = inchwormShotKilled ? INCHWORM_SLOW : Math.max(0, state.slow - 1)

  // 5. Surviving shot climbs; expire past the top of the field.
  if (shot.active) {
    const v = shot.v + SHOT_SPEED
    shot = v >= SHOT_MAX_V ? { active: false, h: 0, v: 0 } : { ...shot, v }
  }

  // 6. DDT — animate any exploding bombs' clouds (FRAME & 7 gated inside).
  //    Mutates state.field in place, as the ROM draws into playfield RAM. Its mush
  //    deltas feed the MushCounts threading, folded into the scroll block below.
  const ddtBoom = ddtExplosionStep(state.ddt, state.field, state.frame)

  // 7. Player death — a segment or any enemy touching the player this frame.
  let lives = state.lives
  let alive = player.alive
  let playerDied = false
  const touchedBySegment = segments.some((s) => isLive(s) && checkPlayerCollision(s, player))
  if (alive && (touchedBySegment || stepped.playerHit)) {
    alive = false
    playerDied = true
    lives -= 1
    hitDdt = true // INC HITDDT — a player-collision death (MILLI.MAC:1805, PLAY routine)
    events.push(event('player-died'))
  }

  // 8. March the surviving segments.
  segments = stepMillipede(segments, state.frame, state.field)

  // 9. Wave loop (MILLI.MAC:1912-1915 clear→arm, CHKEND countdown, next wave).
  //    A cleared millipede with no DELAY pending WINS the wave: arm WAVE_DELAY.
  //    CHKEND then counts it down, holding while beetles are still present
  //    (MLSUB.MAC:56); mushroom-restoring (conway) is item 4's blocker, still
  //    false here. When DELAY reaches 0 a fresh train marches in.
  let wave = state.wave
  let delay = state.delay
  let conway = state.conway
  const millipedeCleared = !segments.some(isLive)
  if (millipedeCleared && delay === 0) {
    delay = WAVE_DELAY // arm the inter-wave pause (edge: DELAY was idle)
    conway = initConway() // start between-wave mushroom growth/death (INICON)
  }
  // SCROLL (MILLI.MAC:46) reads CDONE *before* MASTER (:49) runs, and masterStep
  // can complete the metamorphosis and clear `active` within one call (conway.ts,
  // "TIMER RAN OUT, END CONWAY"). So the scroll gate must see CDONE as it stood
  // BEFORE this frame's MASTER — snapshot it here, or a scroll would unlock one
  // frame early on the completion frame (SC-6).
  const conwayActiveForScroll = conway.active
  // MASTER runs every frame while CONWAY is active (MILLI.MAC:47-49), a
  // background process that grows/kills mushrooms in place; a no-op while idle.
  // (The ROM's CENTIN==9 gating of *which* wave-clears start it is a documented
  // deviation — here every clear seeds it; harmless as a background process.)
  conway = masterStep(state.field, conway)
  const beetlesPresent = roster.beetles.some((b) => b.color !== 0)
  const chkend = stepWaveDelay(delay, {
    mushroomsRestoring: false, // TODO(item 4): conway growth still running
    playerExploding: playerDied || state.deathTimer > 0,
    beetlesPresent,
  })
  delay = chkend.delay
  if (chkend.waveReady) {
    // The inter-wave pause elapsed: start the next wave (new train + fresh
    // bombs re-stamped, DDTS/DDTS2). Difficulty ramps via the wave counter.
    segments = createMillipede({ headingSign: 1 })
    scrollQueued -= 1 // CENTPC re-lays the train and scrolls DOWN (MILLI.MAC:503)
    ddtPlace(state.ddt, false)
    ddtRestore(state.ddt, state.field)
    hitDdt = false // CLEAR HITDDT when the new wave starts (CENTPC, MILLI.MAC:508)
    wave += 1
  }

  // 9b. SCROLL (MILLI.MAC:46) — consume SCROLC and dispatch the field scroll.
  //     Runs after every SCROLC source this frame (the continuous arm inside
  //     scrollDispatch, the beetle/mosquito kills, the CENTPC re-lay). The
  //     conwayActive gate is snapshotted PRE-masterStep above (see there for the
  //     one-frame ordering hazard); the field ordering vs masterStep IS immaterial
  //     because SCROLL gates OFF exactly when CONWAY is active, and masterStep is a
  //     no-op otherwise.
  let scrolc = state.scrolc + scrollQueued
  // Death STAs SCROLC before SCROLL would run (MILLI.MAC:1812 "STOP ANY EXISTING
  // SCROLLING") — a pending scroll is cancelled, not carried into the animation.
  if (playerDied) scrolc = 0
  let mushLower = state.mushCounts.lower + ddtBoom.mush
  let mushTop = state.mushCounts.top + ddtBoom.mushTop
  const liveSegs = segments.filter(isLive).length
  const scrollGate: ScrollGate = {
    attract: false, // MODE bit 7 is clear in play (SC-5)
    conwayActive: conwayActiveForScroll, // CDONE, pre-masterStep — waits for metamorphosis (SC-6)
    ddtExploding: anyDdtExploding(state.ddt), // OR of the bomb hi bytes (SC-7)
    playerDead: !alive, // PLAYP/PEXPLD (SC-8)
    // HITDDT (SC-9) suppresses the continuous arm. The ROM sets it at TWO sites —
    // a shot detonating a bomb (:2060) and a player-collision death (:1805) — and
    // clears it at wave start (:508); all three are wired above (ml7-12), so this
    // reads the register as it stands AFTER this frame's set/clear, matching the
    // ROM's INC-before-SCROLL order (:29/:1805 then :46). The death path's SCROLC=0
    // cancel (:1812) is still reproduced above and is orthogonal to this flag.
    hitDdt,
    segmentsRemaining: liveSegs, // DEAD (SC-2/10)
    centin: liveSegs, // CENTIN (SC-3/11) — the continuous arm's length-4 gate
    frame: state.frame, // the arm's 128-frame phase input (SC-13)
  }
  const disp = scrollDispatch(scrolc, scrollGate)
  scrolc = disp.scrolc // post-arm counter
  if (disp.action === 'down') {
    const d = scrollDown(state.field, scrolc, state.rng)
    scrolc = d.scrolc
    mushLower += d.mush
    mushTop += d.mushTop
    // The SCROLD DDT half (SC-49): step the bomb bank down and seed a top-row bomb.
    const dd = ddtScrollDown(state.ddt, state.field, nextInt(state.rng, 0x100), nextInt(state.rng, 0x100))
    mushTop += dd.mushTop
  } else if (disp.action === 'up') {
    const u = scrollUp(state.field, scrolc)
    scrolc = u.scrolc
    mushLower += u.mush
    mushTop += u.mushTop
    ddtScrollUp(state.ddt) // the SCROLU DDT half (SC-50): step the bank up, no seeding
  }

  // 10. Bonus life — the SCORNG tail (bonus.ts awardBonus), run once per frame
  //     the score advanced (the ROM runs it after every award). The band
  //     comparator fires inside the [threshold, +9,999] window, adds a life
  //     (capped at 6) and advances the threshold so it never re-fires.
  let { bonusL, bonusM } = state
  if (score > state.score) {
    const b = awardBonus({
      score1: score1Of(score),
      score2: score2Of(score),
      bonusL,
      bonusM,
      lives,
      optns1: state.optns1,
    })
    bonusL = b.bonusL
    bonusM = b.bonusM
    if (b.awarded) {
      lives = b.lives
      events.push(event('bonus-life'))
    }
  }

  // 11. Phase transition. Losing the last life goes straight to game-over; arm
  //     the "GAME OVER" hold (MLSUB.MAC:161-162) so it times out to attract.
  const signals: PhaseSignals = { playerDied, livesRemaining: lives }
  const phase = advancePhase('play', signals)
  if (phase === 'game-over') delay = GAME_OVER_DELAY

  // 12. March loop edges — start/stop the feet voice on the audible transition.
  //     A fresh wave's train marching in is a start edge, so this also voices
  //     the wave transition (no separate wave-clear cue in the ROM's CHAN set).
  const wasMarching = state.phase === 'play' && state.segments.some(isLive)
  const nowMarching = phase === 'play' && segments.some(isLive)
  if (nowMarching && !wasMarching) events.push(event('march-start'))
  if (!nowMarching && wasMarching) events.push(event('march-stop'))

  return {
    ...state,
    phase,
    frame: state.frame + 1,
    player: { ...player, alive },
    shot,
    segments,
    roster,
    score,
    lives,
    wave,
    delay,
    conway,
    bonusL,
    bonusM,
    scrolc,
    hitDdt,
    mushCounts: { lower: mushLower, top: mushTop },
    slow,
    deathTimer: playerDied ? DEATH_HOLD : state.deathTimer,
    events,
  }
}

/**
 * Game-over: hold the "GAME OVER" message (the ROM's DELAY countdown), then
 * return to a fresh attract world. Silent hold. The qualifying-score route to
 * name entry (scoreQualifies → 'entry', ml5 highscore) is deferred; for now the
 * attract-return timeout is the only exit, matching the display timeout.
 */
function stepGameOver(state: GameState): GameState {
  const delay = Math.max(0, state.delay - 1)
  const phase = advancePhase('game-over', { overExpired: delay === 0 })
  if (phase === 'attract') {
    // Rebuild a clean attract world from the seed (fresh score/lives/field).
    return { ...createGame(state.seed), events: [] }
  }
  return { ...state, phase, frame: state.frame + 1, delay, events: [] }
}

/** Death: hold the explosion animation, then respawn to play. Silent hold. */
function stepDeath(state: GameState): GameState {
  const deathTimer = Math.max(0, state.deathTimer - 1)
  const phase = advancePhase('death', { deathExpired: deathTimer === 0 })
  const respawned = phase === 'play'
  return {
    ...state,
    phase,
    frame: state.frame + 1,
    deathTimer,
    player: respawned ? { ...state.player, alive: true } : state.player,
    events: [],
  }
}
