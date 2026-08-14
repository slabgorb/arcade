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
import { event, type GameEvent } from './events'
import { score2Of } from './score'
import { stepRoster, shootRoster } from './enemies/roster'
import { resolveShot } from './shot'
import { ddtExplosionStep, ddtPlace, ddtRestore } from './ddt'
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
/** Provisional segment score — refined when full scoring lands. */
const SEGMENT_PTS = 10

const isLive = (s: Segment): boolean => s.color !== VACANT_COLOR

export function stepGame(state: GameState, input: GameInput): GameState {
  switch (state.phase) {
    case 'attract':
      return stepAttract(state, input)
    case 'play':
      return stepPlay(state, input)
    case 'death':
      return stepDeath(state)
    case 'game-over':
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

  // 1. Player move (obstruction wiring lands with the mushroom-collision pass).
  const player = stepPlayer(state.player, { dh: input.dh, dv: input.dv, fire: input.fire })

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
  if (shot.active) {
    const field = resolveShot(state.ddt, state.field, shot.h, shot.v)
    if (field.kind === 'ddt') {
      score += field.points // +80 (DDT_HIT_POINTS)
      shot = { active: false, h: 0, v: 0 }
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
  const view: EnemyView = {
    frame: state.frame,
    score2: score2Of(state.score),
    player: { h: player.h, v: player.v, alive: player.alive },
    centin: state.segments.filter(isLive).length,
    hard: false,
    rng: state.rng,
    field: state.field,
  }
  const stepped = stepRoster(state.roster, view)
  let roster = stepped.roster
  if (shot.active) {
    const rs = shootRoster(roster, { h: shot.h, v: shot.v })
    if (rs.killed) {
      roster = rs.roster
      score += rs.scoreDelta
      shot = { active: false, h: 0, v: 0 }
      events.push(event('enemy-killed'))
    }
  }

  // 5. Surviving shot climbs; expire past the top of the field.
  if (shot.active) {
    const v = shot.v + SHOT_SPEED
    shot = v >= SHOT_MAX_V ? { active: false, h: 0, v: 0 } : { ...shot, v }
  }

  // 6. DDT — animate any exploding bombs' clouds (FRAME & 7 gated inside).
  //    Mutates state.field in place, as the ROM draws into playfield RAM. The
  //    returned mush deltas feed the MushCounts threading (TODO(ml7-2 fidelity)).
  ddtExplosionStep(state.ddt, state.field, state.frame)

  // 7. Player death — a segment or any enemy touching the player this frame.
  let lives = state.lives
  let alive = player.alive
  let playerDied = false
  const touchedBySegment = segments.some((s) => isLive(s) && checkPlayerCollision(s, player))
  if (alive && (touchedBySegment || stepped.playerHit)) {
    alive = false
    playerDied = true
    lives -= 1
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
  const millipedeCleared = !segments.some(isLive)
  if (millipedeCleared && delay === 0) delay = WAVE_DELAY // arm (edge: DELAY was idle)
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
    ddtPlace(state.ddt, false)
    ddtRestore(state.ddt, state.field)
    wave += 1
  }

  // 10. Phase transition.
  const signals: PhaseSignals = { playerDied, livesRemaining: lives }
  const phase = advancePhase('play', signals)

  // 11. March loop edges — start/stop the feet voice on the audible transition.
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
    deathTimer: playerDied ? DEATH_HOLD : state.deathTimer,
    events,
  }
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
