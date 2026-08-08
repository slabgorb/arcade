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
// background-stage siren, the frightened warble, or (suppressed) silence during
// the death cue. One ambient at a time, exactly as voice 2 behaves.
//
// The ambient WARBLES: a WSG siren voice-def is a fast repeating pitch sweep
// (the "woop-woop"), not a flat tone. The driver realises it by retuning
// `setSirenPitch` every frame across the voice's `periodFrames`, riding on a
// `frequency` base that rises with the game state. Rendering only the base gives
// a sustained drone (the bug this fixes).
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
  type SirenVoice,
} from './wsg-effects'
import { createTunePlayer } from './tune'

export interface AudioDriver {
  /** Voice one frame's worth of gameplay events (the `events.ts` seam). */
  onEvents(events: readonly GameEvent[]): void
  /** Poll `GameState` for the continuous ambient siren (stage / frightened). */
  onFrame(state: GameState): void
}

/** Frames to hold the ambient siren silent after a death, so the death cue is
 *  heard (there is no death `phase` in `GameState` to poll — the pac-died event
 *  is the only signal — so the driver counts the hold itself). Matches DEATH's
 *  own length: (0x86 & 0x7f) × 0x1c segments. */
const DEATH_HOLD_FRAMES = (0x86 & 0x7f) * 0x1c

export function createAudioDriver(wsg: Wsg): AudioDriver {
  let munchPhaseA = true
  // The base voice currently on the siren channel (a stable singleton from
  // SIREN_STAGES / FRIGHTENED, so reference identity == "same ambient"), and
  // where we are in its warble cycle.
  let ambient: SirenVoice | null = null
  let warbleFrame = 0
  let deathHold = 0
  // pm2-4: the start-of-game theme. The ROM writes sound #1 at game start
  // (`pacman.asm:066d`); the clone's equivalent moment is the first
  // playing-phase frame of a fresh game — POLLED off `GameState` (the driver's
  // birth, or a game-over → playing restart), never a new core event.
  const theme = createTunePlayer(wsg)
  let themeArmed = true

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
          ambient = null
          deathHold = DEATH_HOLD_FRAMES
          wsg.play(DEATH)
          break
        case 'game-over':
          // Re-arm the start theme for the next game (main.ts stops polling
          // onFrame once the phase is game-over, so the event is the signal).
          themeArmed = true
          wsg.stopAll()
          ambient = null
          break
        case 'level-cleared':
          wsg.stopAll()
          ambient = null
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
      themeArmed = true // the next game gets its start theme again
      if (ambient !== null) {
        wsg.stopAll()
        ambient = null
      }
      return
    }

    // Start-of-round: fire the theme once per fresh game, and hold the ambient
    // siren while it plays (the real cabinet is silent under the jingle — the
    // deathHold precedent).
    if (themeArmed) {
      themeArmed = false
      theme.playTheme()
    }
    if (theme.playing()) {
      theme.tick()
      return
    }

    const target: SirenVoice =
      state.mode.frightenedTimer > 0
        ? FRIGHTENED
        : SIREN_STAGES[sirenStageFor(state.dotsEaten)]

    if (target !== ambient) {
      // New ambient (first frame, a stage change, or entering/leaving fright):
      // (re)start the siren channel on the new base and restart its warble.
      wsg.startSiren(target)
      ambient = target
      warbleFrame = 0
    }

    // Animate the woop: sweep up from the base by depthWord across periodFrames,
    // snapping back — the repeating siren warble.
    const period = Math.max(1, target.periodFrames)
    const phase = (warbleFrame % period) / period
    wsg.setSirenPitch(target.frequency + Math.round(target.depthWord * phase))
    warbleFrame++
  }

  return { onEvents, onFrame }
}
