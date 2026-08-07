// src/shell/audio.ts
//
// Story pm2-3 — the audio DRIVER: the score, not the instrument. It subscribes
// to the `events.ts` seam pm1 built and left idle and turns each `GameEvent`
// into a call on pm2-2's WSG voice (`wsg.ts`), plus a per-frame poll for the
// continuous background siren (the one cue that is a function of state, not an
// event — mirroring how `render.ts` already polls `GameState`). All impurity is
// the voice's; this module is a pure mapping over cited effect params
// (`wsg-effects.ts`), so it unit-tests against a spy voice.
//
// Channel model (the ROM's, faithfully): the three `play()` channels carry the
// mutually-exclusive one-shots (munch / ghost-eaten / fruit / extra-life), and
// the single retunable siren channel carries whichever AMBIENT is current —
// background-stage siren, the frightened warble, or (suppressed to it) silence
// during the death cue. One ambient at a time, exactly as voice 2 behaves.
import type { Wsg } from './wsg'
import type { GameEvent } from '../core/events'
import type { GameState } from '../core/game'
import {
  MUNCH_A,
  MUNCH_B,
  GHOST_EATEN,
  FRUIT_EATEN,
  EXTRA_LIFE,
  DEATH,
  FRIGHTENED,
  SIREN_STAGES,
  sirenStageFor,
} from './wsg-effects'

export interface AudioDriver {
  /** Voice one frame's worth of gameplay events (the `events.ts` seam). */
  onEvents(events: readonly GameEvent[]): void
  /** Poll `GameState` for the continuous ambient siren (stage / frightened). */
  onFrame(state: GameState): void
}

/** The current ambient on the siren channel — a stage index, the warble, or none. */
type Ambient = { kind: 'stage'; stage: number } | { kind: 'fright' } | { kind: 'none' }

/** Frames to hold the ambient siren silent after a death, so the death cue is
 *  heard (there is no death `phase` in `GameState` to poll — the pac-died event
 *  is the only signal — so the driver counts the hold itself). DEATH's own
 *  length in frames: (0x86 & 0x7f) × 0x1c segments. */
const DEATH_HOLD_FRAMES = (0x86 & 0x7f) * 0x1c

export function createAudioDriver(wsg: Wsg): AudioDriver {
  let munchPhaseA = true
  let ambient: Ambient = { kind: 'none' }
  let deathHold = 0

  function setAmbient(next: Ambient): void {
    const same =
      (next.kind === 'none' && ambient.kind === 'none') ||
      (next.kind === 'fright' && ambient.kind === 'fright') ||
      (next.kind === 'stage' && ambient.kind === 'stage' && next.stage === ambient.stage)
    if (same) return
    if (next.kind === 'none') {
      // handled by the caller's stopAll — just drop our record
    } else if (next.kind === 'fright') {
      wsg.startSiren(FRIGHTENED)
    } else if (ambient.kind === 'stage') {
      // Same channel, new pitch — retune rather than restart (no wavetable click).
      wsg.setSirenPitch(SIREN_STAGES[next.stage].frequency)
    } else {
      wsg.startSiren(SIREN_STAGES[next.stage])
    }
    ambient = next
  }

  function onEvents(events: readonly GameEvent[]): void {
    for (const event of events) {
      switch (event.type) {
        case 'dot-eaten':
          wsg.play(munchPhaseA ? MUNCH_A : MUNCH_B)
          munchPhaseA = !munchPhaseA
          break
        case 'ghost-eaten':
          wsg.play(GHOST_EATEN)
          break
        case 'fruit-eaten':
          wsg.play(FRUIT_EATEN, { voice: 1 })
          break
        case 'extra-life':
          wsg.play(EXTRA_LIFE, { voice: 1 })
          break
        case 'pac-died':
          wsg.stopAll()
          ambient = { kind: 'none' }
          deathHold = DEATH_HOLD_FRAMES
          wsg.play(DEATH)
          break
        case 'level-cleared':
        case 'game-over':
          wsg.stopAll()
          ambient = { kind: 'none' }
          break
        // energizer-eaten drives frightened mode, voiced by onFrame's poll; the
        // remaining events (fruit-spawned/expired, high-score-qualified) have no
        // sound in this cabinet and fall through deliberately.
        default:
          break
      }
    }
  }

  function onFrame(state: GameState): void {
    if (deathHold > 0) {
      deathHold--
      return // let the death cue play out; the siren resumes after.
    }
    if (state.phase === 'game-over') {
      setAmbient({ kind: 'none' })
      return
    }
    if (state.mode.frightenedTimer > 0) {
      setAmbient({ kind: 'fright' })
    } else {
      setAmbient({ kind: 'stage', stage: sirenStageFor(state.dotsEaten) })
    }
  }

  return { onEvents, onFrame }
}
