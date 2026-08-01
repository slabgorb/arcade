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
 *
 * The return type is a closed union on purpose — it is what gives the switch
 * below a `never` arm that the compiler can actually reach a verdict on.
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
    // WHERE THE EXHAUSTIVENESS GUARANTEE ACTUALLY LIVES — and it is not here.
    // `EVENT_SOUND` is typed `Record<GameEventKind, SoundName>`, so a kind added
    // to core/events.ts without a cue is a compile error at its DECLARATION, in
    // shell/audio.ts (mutation-checked: TS2741 on the object literal). This
    // lookup cannot add to that — `event.type` is already a `GameEventKind`, so
    // TS proves the result is a `SoundName` and has nothing left to narrow.
    //
    // REWORK (Reviewer round 1, MEDIUM): the comment that stood here claimed the
    // failure fired "HERE" and that a `never` cast below carried a second,
    // independent guarantee. Both halves were false — deleting the cast produced
    // zero tsc errors. What remains is a plain RUNTIME check, worth keeping for
    // the one case the type system cannot see: a caller reaching this function
    // from untyped data (the shell's own event stream is typed, but the record
    // could also be widened to `Record<string, …>` by a later edit).
    const sound: SoundName | undefined = EVENT_SOUND[event.type]
    if (sound === undefined) throw new Error(`unhandled GameEvent kind: ${String(event.type)}`)

    // THIS `never` is real: `effectFor` returns a three-member union, the arms
    // below narrow it to nothing, and the binding needs no cast to prove it.
    // Drop an arm and the build fails — verified by mutation.
    const effect = effectFor(event.type)
    switch (effect) {
      case 'startLoop':
        audio.startLoop(sound)
        break
      case 'stopLoop':
        audio.stopLoop(sound)
        break
      case 'play':
        audio.play(sound)
        break
      default: {
        const unreachable: never = effect
        throw new Error(`unhandled cue effect: ${String(unreachable)}`)
      }
    }
  }
}
