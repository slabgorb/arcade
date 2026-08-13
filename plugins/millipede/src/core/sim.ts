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

import type { GameState, Shot } from './game-state'
import { stepPlayer } from './input'
import {
  stepMillipede,
  checkPlayerCollision,
  VACANT_COLOR,
  type Segment,
} from './millipede'
import { advancePhase, type PhaseSignals } from './phase'
import { event, type GameEvent } from './events'

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
    // Begin a fresh life: the player takes control, the demo train stays.
    return {
      ...state,
      phase,
      frame: state.frame + 1,
      player: { ...state.player, alive: true },
      shot: { active: false, h: 0, v: 0 },
      events: [], // the transition frame itself is silent; play sounds start next frame
    }
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

  // 3. Collisions against the PRE-march segments — the shot hits at its CURRENT
  //    position, THEN climbs, so a shot placed on a segment kills it this frame.
  let segments = state.segments
  let score = state.score
  if (shot.active) {
    const hit = segments.findIndex((s) => isLive(s) && checkPlayerCollision(s, { h: shot.h, v: shot.v }))
    if (hit >= 0) {
      segments = segments.filter((_, i) => i !== hit)
      score += SEGMENT_PTS
      shot = { active: false, h: 0, v: 0 }
      events.push(event('segment-killed'))
    }
  }
  // Surviving shot climbs; expire past the top of the field.
  if (shot.active) {
    const v = shot.v + SHOT_SPEED
    shot = v >= SHOT_MAX_V ? { active: false, h: 0, v: 0 } : { ...shot, v }
  }

  let lives = state.lives
  let alive = player.alive
  let playerDied = false
  if (alive && segments.some((s) => isLive(s) && checkPlayerCollision(s, player))) {
    alive = false
    playerDied = true
    lives -= 1
    events.push(event('player-died'))
  }

  // 4. March the survivors.
  segments = stepMillipede(segments, state.frame, state.field)

  // 5. Phase transition.
  const signals: PhaseSignals = { playerDied, livesRemaining: lives }
  const phase = advancePhase('play', signals)

  // 6. March loop edges — start/stop the feet voice on the audible transition.
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
    score,
    lives,
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
