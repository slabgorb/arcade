// plugins/defender/src/shell/audio-dispatch.ts
//
// Story df6-1 (GREEN) — the event -> cue wiring, as a pure importable function
// rather than a switch buried in `main.ts`, so the map is unit-testable against a
// recording fake without booting a canvas or an AudioContext. The
// tempest/asteroids/joust shape; the SH4-5 dispatch convention pins it
// (tests/audio-dispatch-convention.test.mjs).
//
// The `never` in the default branch is the point of the file: every `GameEvent`
// discriminant is handled above it, so the parameter narrows to `never` there. Add
// a kind to `core/events.ts` without a case here and this stops compiling — a new
// moment cannot ship silently.
//
// Defender's cues are ALL one-shots, and that is a fact about the machine, not a
// simplification: every SOUND TABLE entry (DEFA7.SRC:665-691) is a priority byte
// followed by bounded (REPCNT, SNDTMR, SND#) triples terminated by REPCNT=0 (the
// format header at :660). A table runs for its own duration and stops itself; there
// is no ring-until-told-otherwise voice among the df6-1 cues, so `startLoop`/
// `stopLoop` would be an invention. The two stateful repeat cues the machine does
// have — thrust (held-loop) and LSKSND (lander suck) — are df6-2, not here.
import type { GameEvent } from '../core/events.js'
import type { AudioEngine, SoundName } from './audio.js'

/** Just the slice of the engine this dispatch needs — Defender never loops (df6-1). */
type SoundPlayer = Pick<AudioEngine, 'play'>

/**
 * The cue each moment sounds. Module-private: `playEventSounds` is the only seam the
 * shell uses, and an exported second entry point would be a second thing to keep in
 * step with the union for no caller's benefit. Every df6-1 cue is a payload-free
 * one-shot, so this is a plain kind -> name map with no branching on payload.
 */
function cueFor(event: GameEvent): SoundName | null {
  switch (event.type) {
    case 'laser-fire':
      return 'laserFire'
    case 'lander-hit':
      return 'landerHit'
    case 'mutant-hit':
      return 'mutantHit'
    case 'baiter-hit':
      return 'baiterHit'
    case 'pod-hit':
      return 'podHit'
    case 'bomber-hit':
      return 'bomberHit'
    case 'swarmer-hit':
      return 'swarmerHit'
    case 'lander-shoot':
      return 'landerShoot'
    case 'mutant-shoot':
      return 'mutantShoot'
    case 'baiter-shoot':
      return 'baiterShoot'
    case 'swarmer-shoot':
      return 'swarmerShoot'
    case 'lander-pickup':
      return 'landerPickup'
    case 'enemy-appear':
      return 'enemyAppear'
    case 'smart-bomb':
      return 'smartBomb'
    case 'player-death':
      return 'playerDeath'
    case 'extra-man':
      return 'extraMan'
    case 'wave-start':
      return 'waveStart'
    case 'astro-catch':
      return 'astroCatch'
    case 'astro-land':
      return 'astroLand'
    case 'astro-hit':
      return 'astroHit'
    case 'astro-scream':
      return 'astroScream'
    default: {
      // Exhaustiveness guard: every kind is handled above, so `event` narrows to
      // `never` here and a new kind without a case is a COMPILE error. At runtime
      // the branch stays SILENT — a stale or typo'd kind falling through onto some
      // other cue would be audibly wrong, which is worse than quiet.
      const _exhaustive: never = event
      void _exhaustive
      return null
    }
  }
}

/**
 * Play one cue per moment the core emitted this frame, in the order given.
 *
 * Nothing is de-duplicated: two landers can die on one tick, and the engine's own
 * per-channel voice-stealing is what keeps the pile-up bounded (the single-voice
 * fence in audio.ts). This DEGRADES rather than throwing — it runs on the frame
 * path, where a throw would freeze the game and a missing sound is the lesser harm.
 */
export function playEventSounds(audio: SoundPlayer, events: readonly GameEvent[]): void {
  for (const event of events) {
    const cue = cueFor(event)
    if (cue !== null) audio.play(cue)
  }
}
