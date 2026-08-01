// src/shell/audio-dispatch.ts
//
// Story jt5-1 (GREEN, Bicycle Repair Man / Dev) — the event -> cue wiring, as a
// pure importable function rather than a switch buried in `main.ts`, so the map
// is unit-testable against a recording fake without booting a canvas or an
// AudioContext. The tempest/asteroids/battlezone shape; star-wars dispatches
// inline and its map cannot be tested at all.
//
// The `never` in the default branch is the point of the file: every `GameEvent`
// discriminant is handled above it, so the parameter narrows to `never` there.
// Add a kind to `core/events.ts` without a case here and this stops compiling —
// a new moment cannot ship silently.
//
// joust's cues are ALL one-shots, and that is a fact about the machine rather
// than a simplification. Every one of its 38 sound tables is a priority byte
// followed by bounded (code, duration) pairs, and the format header names the
// only three escapes: `!N$00` extends the timer, `!N$FF` kills the sound,
// `!N$xx` (01-3E) sends one (JOUSTRV4.SRC:8045-8049). A table runs for its own
// duration and stops itself; there is no ring-until-told-otherwise voice here,
// so `startLoop`/`stopLoop` would be an invention. The nearest thing to a stop
// is the `!N$FF` KILL table, and all three of those belong to the skid/fall
// chain this story does not wire.
import type { GameEvent } from '../core/events.js'
import type { AudioEngine, SoundName } from './audio.js'

/** Just the slice of the engine this dispatch needs — joust never loops. */
type SoundPlayer = Pick<AudioEngine, 'play' | 'tick'>

/**
 * The cue each moment sounds. Module-private: `playEventSounds` is the only
 * seam the shell uses, and an exported second entry point would be a second
 * thing to keep in step with the union for no caller's benefit.
 */
function cueFor(event: GameEvent): SoundName | null {
  switch (event.type) {
    case 'enemy-death':
      return 'enemyDeath'
    case 'player-death':
      return 'playerDeath'
    case 'egg-collected':
      return 'eggCollected'
    case 'egg-hatched':
      return 'eggHatched'
    case 'ptero-arrives':
      return 'pteroArrives'
    case 'ptero-death':
      return 'pteroDeath'
    case 'player-materialise':
      return 'playerMaterialise'
    case 'enemy-materialise':
      return 'enemyMaterialise'
    case 'extra-man':
      return 'extraMan'
    case 'wave-bounty':
      return 'waveBounty'
    case 'cliff-destroyed':
      return 'cliffDestroyed'
    case 'player-wing-down':
      return 'playerWingDown'
    case 'player-wing-up':
      return 'playerWingUp'
    case 'enemy-wing-down':
      return 'enemyWingDown'
    case 'enemy-wing-up':
      return 'enemyWingUp'
    case 'player-thud':
      return 'playerThud'
    case 'enemy-thud':
      return 'enemyThud'
    default: {
      // Exhaustiveness guard: every kind is handled above, so `event` narrows to
      // `never` here and a new kind without a case is a COMPILE error. At
      // runtime the branch stays SILENT — a stale or typo'd kind falling through
      // onto some other cue would be audibly wrong, which is worse than quiet.
      const _exhaustive: never = event
      void _exhaustive
      return null
    }
  }
}

/**
 * Play one cue per moment the core emitted this frame, in the order given, and
 * carry the sound voice's frame clock (jt5-5).
 *
 * The tick comes FIRST, and unconditionally — even on a frame that emitted
 * nothing. That is the machine's order, not a convenience: `EXECST`
 * (SYSTEM.SRC:173-187) decrements `STMR` at the top of every frame, and only
 * afterwards does game logic reach `SND` (:761-773) to queue a sound. Ticking
 * after the cues would give every one of them an extra frame of window, and
 * skipping the tick on a silent frame would stop the voice expiring at all
 * during a quiet stretch. This function is called once per STEPPED frame from
 * `pumpFrames` in `src/main.ts`, so one call is exactly one machine frame.
 */
export function playEventSounds(audio: SoundPlayer, events: readonly GameEvent[]): void {
  audio.tick()
  for (const event of events) {
    // Nothing is de-duplicated: two buzzards can die on one frame, and the
    // engine's own voice-stealing is what keeps the pile-up bounded.
    const cue = cueFor(event)
    if (cue !== null) audio.play(cue)
  }
}
