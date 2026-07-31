// src/shell/audio-dispatch.ts
//
// Story cp5-1 — the event->sound wiring as a PURE, importable function.
//
// This is tempest's audio-dispatch extraction, deliberately NOT star-wars's
// inline-in-main.ts switch, so the map is unit-testable against a recording
// fake without booting a canvas. No module state, no DOM: the only effect is
// calling the injected audio surface, once per event, in core order.
//
// Two kinds of cue ride the one `GameEvent` stream:
//  - ONE-SHOTS (`play`) — the discrete moments: a shot, a kill, a bonus life.
//  - SUSTAINED voices (`startLoop`/`stopLoop`) — the marching tick and each
//    creature's presence. The core emits their EDGES, so a loop is started
//    once and stopped once; it is never re-triggered per frame.
import { type GameEvent } from '../core/events'
import { EVENT_SOUND, type AudioEngine, type SoundName } from './audio'

/** Just the slice of the engine the dispatch needs — decoupled from resume(),
 *  so tests can pass a recording fake without an AudioContext. */
type SoundSurface = Pick<AudioEngine, 'play' | 'startLoop' | 'stopLoop'>

/**
 * How one event kind reaches the engine.
 *
 * Derived from the kind's NAME rather than listed per-kind: `-start` opens its
 * cue's loop, `-stop` closes it, everything else is a one-shot. The naming
 * convention is the contract (`core/events.ts` pins the pairs), so a new
 * sustained voice cannot be wired up as a one-shot by accident.
 */
function effectFor(type: GameEvent['type']): 'play' | 'startLoop' | 'stopLoop' {
  if (type.endsWith('-start')) return 'startLoop'
  if (type.endsWith('-stop')) return 'stopLoop'
  return 'play'
}

/**
 * Play one cue per gameplay moment the core emitted this step, in order.
 *
 * Every engine method is a no-op until the gesture gate opens, so events that
 * land before the player's first interaction are silently skipped.
 */
export function playEventSounds(audio: SoundSurface, events: readonly GameEvent[]): void {
  for (const event of events) {
    // The exhaustiveness guard. `EVENT_SOUND` is typed
    // `Record<GameEventKind, SoundName>`, so a kind added to core/events.ts
    // without a cue fails to compile HERE — and the `never` below makes the
    // same omission fail if the record is ever widened. A missing cue must be a
    // build error, not a sound nobody notices is absent.
    const sound: SoundName | undefined = EVENT_SOUND[event.type]
    if (sound === undefined) {
      const unreachable: never = event.type as never
      throw new Error(`unhandled GameEvent kind: ${String(unreachable)}`)
    }

    switch (effectFor(event.type)) {
      case 'startLoop':
        audio.startLoop(sound)
        break
      case 'stopLoop':
        audio.stopLoop(sound)
        break
      case 'play':
        audio.play(sound)
        break
    }
  }
}
