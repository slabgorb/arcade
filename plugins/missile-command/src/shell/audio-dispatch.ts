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
        audio.play('launch') // LA — SABLAU (W3MAIN launch)
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
