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
// Most of Defender's cues are one-shots, and that is a fact about the machine: every
// SOUND TABLE entry (DEFA7.SRC:665-691) is a priority byte followed by bounded (REPCNT,
// SNDTMR, SND#) triples terminated by REPCNT=0 (the format header at :660) — a table runs
// for its own duration and stops itself. df6-2 adds the two cues that DON'T: the thrust
// held-loop (THFLG $16/$0F) and the lander-suck repeat (LSKSND, sounded as a held loop
// across the abduction ascent). Those ring until told otherwise, so this dispatch is now a
// ROUTER: a one-shot kind → `play`, a `-start` edge → `startLoop`, a `-stop` → `stopLoop`.
import type { GameEvent } from '../core/events.js'
import type { AudioEngine, SoundName } from './audio.js'

/** Just the slice of the engine this dispatch needs — one-shots plus the df6-2 loop seam. */
type SoundPlayer = Pick<AudioEngine, 'play' | 'startLoop' | 'stopLoop'>

/** What a moment does to the engine: play a one-shot, or start/stop a held loop. */
type Cue =
  | { readonly verb: 'play'; readonly name: SoundName }
  | { readonly verb: 'startLoop'; readonly name: SoundName }
  | { readonly verb: 'stopLoop'; readonly name: SoundName }

/**
 * The action each moment sounds. Module-private: `playEventSounds` is the only seam the
 * shell uses, and an exported second entry point would be a second thing to keep in step
 * with the union for no caller's benefit. The 21 one-shots map to a `play`; the four df6-2
 * loop EDGES map to a `startLoop`/`stopLoop` on the cue's own channel.
 */
function cueFor(event: GameEvent): Cue | null {
  switch (event.type) {
    case 'laser-fire':
      return { verb: 'play', name: 'laserFire' }
    case 'lander-hit':
      return { verb: 'play', name: 'landerHit' }
    case 'mutant-hit':
      return { verb: 'play', name: 'mutantHit' }
    case 'baiter-hit':
      return { verb: 'play', name: 'baiterHit' }
    case 'pod-hit':
      return { verb: 'play', name: 'podHit' }
    case 'bomber-hit':
      return { verb: 'play', name: 'bomberHit' }
    case 'swarmer-hit':
      return { verb: 'play', name: 'swarmerHit' }
    case 'lander-shoot':
      return { verb: 'play', name: 'landerShoot' }
    case 'mutant-shoot':
      return { verb: 'play', name: 'mutantShoot' }
    case 'baiter-shoot':
      return { verb: 'play', name: 'baiterShoot' }
    case 'swarmer-shoot':
      return { verb: 'play', name: 'swarmerShoot' }
    case 'lander-pickup':
      return { verb: 'play', name: 'landerPickup' }
    case 'enemy-appear':
      return { verb: 'play', name: 'enemyAppear' }
    case 'smart-bomb':
      return { verb: 'play', name: 'smartBomb' }
    case 'player-death':
      return { verb: 'play', name: 'playerDeath' }
    case 'extra-man':
      return { verb: 'play', name: 'extraMan' }
    case 'wave-start':
      return { verb: 'play', name: 'waveStart' }
    case 'astro-catch':
      return { verb: 'play', name: 'astroCatch' }
    case 'astro-land':
      return { verb: 'play', name: 'astroLand' }
    case 'astro-hit':
      return { verb: 'play', name: 'astroHit' }
    case 'astro-scream':
      return { verb: 'play', name: 'astroScream' }
    // df6-2 — the two stateful cues, keyed on their on/off EDGE (core/events.ts).
    case 'thrust-start':
      return { verb: 'startLoop', name: 'thrust' }
    case 'thrust-stop':
      return { verb: 'stopLoop', name: 'thrust' }
    case 'lander-suck-start':
      return { verb: 'startLoop', name: 'landerSuck' }
    case 'lander-suck-stop':
      return { verb: 'stopLoop', name: 'landerSuck' }
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
    if (cue === null) continue
    switch (cue.verb) {
      case 'play':
        audio.play(cue.name)
        break
      case 'startLoop':
        audio.startLoop(cue.name)
        break
      case 'stopLoop':
        audio.stopLoop(cue.name)
        break
    }
  }
}
