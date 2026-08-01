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
    // zero tsc errors. What remains is a plain RUNTIME check for the one case
    // the type system cannot see: a caller reaching this function from untyped
    // data (the shell's own stream is typed, but the record could be widened to
    // `Record<string, …>` by a later edit).
    //
    // ─── IT DEGRADES. IT DOES NOT THROW. (cp5-2, user ruling 2026-08-01) ──────
    // Until cp5-2 this line threw, and that was safe only because nothing called
    // this function. cp5-2 puts it inside `requestAnimationFrame`: an uncaught
    // throw there skips main.ts's trailing `requestAnimationFrame(frame)`, the
    // rAF chain ends, and the game FREEZES on the last drawn frame — a total
    // failure for a defect whose honest cost is one missing sound. So an
    // unmapped kind is skipped and the rest of the frame plays.
    //
    // Skipping is also why this must not fall through onto a neighbouring cue:
    // a stale or typo'd kind that played SOME sound would be audibly wrong with
    // nothing anywhere reporting a fault, and wrong is worse than quiet. joust
    // says the same thing in its own default arm (shell/audio-dispatch.ts:71-74).
    //
    // Nothing is given up at compile time — see above, the guarantee was never
    // in the throw. All five games that shipped this seam first degrade the same
    // way: tempest:111-118, asteroids:33-37, battlezone:74-80, red-baron:68-74,
    // joust:70-78. centipede was the outlier.
    const sound: SoundName | undefined = EVENT_SOUND[event.type]
    if (sound === undefined) continue

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
        // The COMPILE-time guard, and the whole reason this arm exists: drop a
        // case above and `effect` no longer narrows to `never`, so the build
        // fails. Verified by mutation (cp5-1).
        //
        // At RUNTIME it stays silent, for the same reason the lookup above
        // skips: this is on the frame path, and a throw inside
        // requestAnimationFrame freezes the game. The arm is unreachable anyway
        // — `effectFor` returns a closed three-member union and all three are
        // cased — so the throw could only ever have fired for a caller that had
        // already cast its way around the compiler. This is the house form
        // (`void _exhaustive` + no throw) all five sibling games use.
        const unreachable: never = effect
        void unreachable
        break
      }
    }
  }
}
