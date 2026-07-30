// src/shell/audio-dispatch.ts
//
// The shell's event→sound wiring as a PURE, importable function (story
// bz1-11) — tempest's audio-dispatch extraction, deliberately NOT
// star-wars's inline-in-main.ts switch, so the map is unit-testable against
// a recording fake without booting a canvas. No module state, no DOM: the
// only effect is calling the injected audio surface, once per event, in
// core order.
//
// Two channels, mirroring the cabinet's hardware split:
//  - ONE-SHOT cues ride the `GameEvent` stream (`playEventSounds`) — the
//    discrete circuits: cannon report, blast; plus the warble's start/stop.
//  - CONTINUOUS sounds are re-read from live state every render frame
//    (`updateContinuousSounds`) — the engine hum tracks the treads, the
//    hostile's track rattle tracks its liveness. Continuous, not one-shot
//    (story rule): they have no trigger moment to ride.
import type { GameEvent } from '../core/events'
import type { GameState } from '../core/state'
import type { Input } from '../core/input'
import type { AudioEngine } from './audio'

// Just the slice of the engine the dispatch needs — decoupled from resume(),
// so tests pass a recording fake (tempest's SoundPlayer narrowing).
type SoundSurface = Pick<AudioEngine, 'play' | 'startLoop' | 'stopLoop' | 'setEngine' | 'stopEngine'>

/**
 * Play one cue per gameplay event the core emitted this step, in order.
 * `play()` is a no-op until the gesture gate opens, so pre-interaction
 * events are silently skipped.
 */
export function playEventSounds(audio: SoundSurface, events: readonly GameEvent[]): void {
  for (const event of events) {
    switch (event.type) {
      case 'shot-fired':
        audio.play('cannon')
        break
      case 'enemy-destroyed':
        audio.play('explosion')
        // bz3-10 (U-014): the saucer kill LAYERS the DISINT zap over the
        // generic blast (BZONE.MAC:2483-2492 — DISINT via SNDON, then the
        // EXPCNT=0A0 explosion). Tank/super-tank/missile kills stay
        // explosion-ONLY; DISINT is the saucer-only distinction.
        if (event.kind === 'saucer') audio.play('disint')
        break
      case 'player-hit':
        // The same discrete blast circuit as an enemy kill — the cabinet had
        // one explosion generator, not a per-side pair.
        audio.play('explosion')
        break
      case 'saucer-present':
        audio.startLoop('saucer')
        break
      case 'saucer-gone':
        audio.stopLoop('saucer')
        break
      case 'hostile-spawn':
        // Silent: the track rattle is continuous state (below), not a sting —
        // no spawn sound exists in the story's inventory.
        break
      // bz3-10 — cluster C10 (U-008/009/010/012): four rising-edge core
      // moments (sim.ts), each mapped to its ROM cue.
      case 'enemy-in-range':
        audio.play('warng')
        break
      case 'radar-blip':
        audio.play('rbeep')
        break
      case 'motion-blocked':
        audio.play('boing')
        break
      case 'bonus-tank':
        audio.play('boner')
        break
      default: {
        // Exhaustiveness guard (tempest pattern): add a GameEvent kind without
        // wiring a case and this line becomes a COMPILE error.
        const _exhaustive: never = event
        void _exhaustive
        break
      }
    }
  }
}

/**
 * Drive the continuous sounds from live state, once per render frame.
 *
 * Engine hum: |tread| effort mapped to [0, 1] — reverse works as hard as
 * forward on a dual-tread drive. Only a LIVE run hums. Outside `playing` the
 * hum is stopped OUTRIGHT via `stopEngine()` (review round 1): `setEngine(0)`
 * is the audible in-run idle by design, so it can never mean silence.
 *
 * Track rattle: runs exactly while the hostile is alive mid-run — its
 * wreckage (and the attract demo's phantom hostile) makes no tread noise.
 *
 * Saucer warble: STARTED by the `saucer-present` event, but stopped here
 * state-wise whenever no live visitor exists (review round 1). Mode resets
 * (`startRun`/`returnToAttract`) rebuild the world without closing events,
 * so the event channel alone leaks the loop across run boundaries — the
 * state check is the suspenders to the event channel's belt.
 */
export function updateContinuousSounds(audio: SoundSurface, state: GameState, input: Input): void {
  const playing = state.mode === 'playing'

  if (playing) {
    const effort = (Math.abs(input.leftTread) + Math.abs(input.rightTread)) / 2
    audio.setEngine(effort > 1 ? 1 : effort)
  } else {
    audio.stopEngine()
  }

  if (playing && state.enemies.hostile.phase === 'alive') {
    audio.startLoop('track') // idempotent while already running
  } else {
    audio.stopLoop('track') // idempotent while already stopped
  }

  if (state.saucer.saucer?.phase !== 'alive') {
    audio.stopLoop('saucer') // idempotent — the common no-visitor frame is a cheap no-op
  }
}
