// src/shell/audio-dispatch.ts
//
// Story ml6-2 — the core→shell audio ROUTER, the SH4-5 standalone-dispatch
// convention (documented at src/shared/audio.ts and pinned by the orchestrator
// suite's audio-dispatch-convention test):
//   1. wiring lives here, pure, node-importable, no module state / DOM;
//   2. it narrows the engine to a same-file Pick slice, never the whole engine;
//   3. exhaustiveness is compile-time via an explicit never-typed binding;
//   4. the runtime DEGRADES, never throws (this runs on the frame path);
//   5. the cue map (EVENT_SOUND) is millipede's own, cited to MLIRQ/MLDEF.
//
// One call == one machine frame: tick() is called first and unconditionally.

import { type GameEvent, isLoopStart, isLoopStop } from '../core/events'
import { EVENT_SOUND, type AudioEngine, type EffectName } from './audio'

/** The slice the router touches — NOT the whole engine (SH4-5 clause 2). */
type SoundSurface = Pick<AudioEngine, 'play' | 'startLoop' | 'stopLoop' | 'tick'>

/** Which method a kind drives, as a CLOSED union so the switch reaches `never`. */
function effectFor(event: GameEvent): 'play' | 'startLoop' | 'stopLoop' {
  if (isLoopStart(event.type)) return 'startLoop'
  if (isLoopStop(event.type)) return 'stopLoop'
  return 'play'
}

/** Turn a frame's events into engine calls. Silent no-op per unmapped kind. */
export function playEventSounds(audio: SoundSurface, events: readonly GameEvent[]): void {
  audio.tick() // first, unconditionally — one call is one machine frame
  for (const event of events) {
    const sound: EffectName | undefined = EVENT_SOUND[event.type]
    if (sound === undefined) continue // degrade, never throw (clause 4)
    const effect = effectFor(event)
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
        const unreachable: never = effect // compile-time exhaustiveness (clause 3)
        void unreachable
        break
      }
    }
  }
}
