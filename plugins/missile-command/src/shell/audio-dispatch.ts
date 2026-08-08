// src/shell/audio-dispatch.ts
//
// Story mc8-2 (GREEN, Julia) — the shell's event->POKEY wiring as PURE, importable
// functions (battlezone's audio-dispatch.ts extraction, not star-wars's inline
// switch), so the map is unit-testable against a recording fake without a canvas
// or a real AudioContext. No module state, no DOM: the only effect is calling the
// injected audio surface, once per event, in core order.
//
// Two channels, mirroring the cabinet's split:
//  - ONE-SHOT cues ride the `SoundEvent` stream (`playEventSounds`) — launch,
//    explosion, the can't-fire klaxon, the bonus tick.
//  - SUSTAINED voices are re-read from live state every frame
//    (`updateSustainedSounds`) — the cruise/Sputnik drone. Continuous, not
//    one-shot: it has no trigger moment to ride, and must be SILENCED at the
//    pause/game-over edge, not left to ring (the mc8-2 edge-driven-voices AC).

import type { SoundEvent } from '../core/sound-events.js'
import type { GameState } from '../core/game.js'
import { bonusCitiesEarned, bonusInterval } from '../core/wave.js'
import type { AudioEngine } from './audio.js'

// Just the slice of the engine the dispatch needs — decoupled from resume(), so
// tests pass a recording fake (tempest's SoundPlayer narrowing).
type SoundSurface = Pick<AudioEngine, 'play' | 'startLoop' | 'stopLoop'>

// Play one cue per gameplay event the core emitted this step, in order. `play()`
// is a no-op until the gesture gate opens, so pre-interaction events are silently
// skipped. Mapping = the mc8-1 spike event map (W3MAIN call sites).
export function playEventSounds(audio: SoundSurface, events: readonly SoundEvent[]): void {
  for (const event of events) {
    switch (event.type) {
      case 'launched':
        // mc8-4: a launch from a base at its LOW count sounds the LOW variant (LO,
        // SLOABM) instead of the normal launch (LA, SABLAU) — W3MAIN:1385 CMP I,4/IFEQ.
        audio.play(event.baseLow ? 'low' : 'launch')
        break
      case 'detonated':
        audio.play('explosion') // EX — EXSNON "BANG ON"
        break
      case 'structureDestroyed':
        audio.play('explosion') // EX — SOHNO is an alias of SEXPLO
        break
      case 'ammoEmpty':
        audio.play('no-fire') // NS — SNSHOT "NO FIRE NOISE"
        break
      case 'bonusTick':
        audio.play('bonus-tick') // TK — SUNABM
        break
      case 'icbmKilled':
        // SILENT by design: the ABM detonation that opened the fireball already
        // banged (the `detonated` event); the ROM plays no per-catch cue. Voicing
        // a second explosion here would double every kill (a fidelity regression).
        break
      default: {
        // Exhaustiveness guard (tempest/battlezone pattern): a new SoundEvent kind
        // without a wired case becomes a COMPILE error here.
        const _exhaustive: never = event
        void _exhaustive
        break
      }
    }
  }
}

// Drive the sustained voices from live state, once per render frame.
//
// The edge-driven-voices gotcha: the cruise/Sputnik drone is a continuous voice
// with no closing event when the game simply ENDS with the threat still on screen.
// A stop keyed only on a "drone-gone" event would therefore leak it across the
// terminal edge. So — exactly as battlezone forces stopEngine at 'gameover' — this
// re-reads phase each frame and silences the drone outright once the game is over
// (mc6's pause will extend the same seam). `stopLoop` is idempotent, so a frame
// where nothing is running is a cheap no-op.
export function updateSustainedSounds(audio: SoundSurface, state: GameState): void {
  if (state.phase === 'over') {
    audio.stopLoop('drone')
  }
}

// mc8-4: the EDGE cues — one-shots that fire on a state TRANSITION, not on a per-frame
// SoundEvent. whoop (new wave), end-game (game over) and bonus-city (a bonus city earned)
// all resolve in stepGame's 'between'/'over' branches, both of which hardcode
// soundEvents:[] — so they cannot ride the event stream. Instead the shell compares the
// PREVIOUS render frame's state with the current one and voices the crossing exactly once.
// Pure and side-effect-only-through-`audio`; main.ts keeps `prev` and calls this per frame.
export function playEdgeCues(audio: SoundSurface, prev: GameState, curr: GameState): void {
  // WHOOP — WP, SNEWAV (W3MAIN:3911): the wave counter advanced.
  if (curr.wave > prev.wave) audio.play('whoop')

  // END-GAME — XX "THE END", SENDGA (W3MAIN:4647): the play field just went terminal.
  if (prev.phase !== 'over' && curr.phase === 'over') audio.play('end-game')

  // BONUS CITY — BN, SBONUS (W3MAIN:4845): the cumulative bonus-city count (mc4-5's
  // bonusCitiesEarned at the shipped default DIP) crossed another threshold this frame.
  const interval = bonusInterval(0)
  if (bonusCitiesEarned(curr.score, interval) > bonusCitiesEarned(prev.score, interval)) {
    audio.play('bonus-city')
  }
}
