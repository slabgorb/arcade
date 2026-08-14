// src/shell/audio.ts
//
// Story ml6-2 — the shell AUDIO ENGINE. Maps every core event kind (core/events.ts)
// to one of the twelve CHAN sound slots (sound-rom.ts) and plays that slot's ml6-1
// sweep through @shared/synth as a moving oscillator envelope (pokey-voice.ts).
// THE SWEEP IS THE SOUND. This is a BROWSER file (it drives @shared/synth's
// AudioContext) — never imported by core (purity.test.ts fences it).
//
// The engine mirrors centipede's shell/audio.ts surface (resume/play/startLoop/
// stopLoop/ready/tick) so shell/audio-dispatch.ts can stay a shared-shape,
// game-agnostic router. Every method obeys @shared/synth's no-throw contract:
// with no live context they are silent no-ops, never exceptions in the frame loop.

import { createSynthEngine, type SynthTarget, type Voice } from '@shared/synth'
import { EFFECT_NAMES } from './sound-rom'
import { pokeyVoiceSchedule, type VoiceSchedule } from './pokey-voice'
import type { GameEventKind } from '../core/events'

/** The twelve CHAN slot names, index = CHAN number (re-exported for tests/callers). */
export const EFFECT_SLOTS: readonly string[] = EFFECT_NAMES

/** A CHAN sound slot the dispatcher may ask the engine to play. */
export type EffectName =
  | 'beetle'
  | 'centipede'
  | 'explosion'
  | 'spider'
  | 'dragonfly'
  | 'mosquito'
  | 'shot'
  | 'bee'
  | 'inchworm'
  | 'earwig'
  | 'player-explosion'
  | 'bonus-life'

/** Every core event kind → its CHAN slot. Exhaustive (the compile-time anchor)
 *  and cited to the driver: destruction shares CHAN2 explosion; the marching
 *  train is CHAN1; the ship's death is CHAN10; the extra life is CHAN11. Fine
 *  mapping is playtest-refined (AC3), but every kind resolves to a real slot. */
export const EVENT_SOUND: Record<GameEventKind, EffectName> = {
  'shot-fired': 'shot', // CHAN6
  'mushroom-hit': 'explosion', // CHAN2
  'segment-killed': 'explosion', // CHAN2
  'enemy-killed': 'explosion', // CHAN2
  'ddt-exploded': 'explosion', // CHAN2
  'player-died': 'player-explosion', // CHAN10
  'bonus-life': 'bonus-life', // CHAN11
  'march-start': 'centipede', // CHAN1 feet
  'march-stop': 'centipede',
  // ── per-creature PRESENCE voices (ml7-8): both edges drive the creature's
  //    own CHAN slot — the shell turns the loop on at -start, off at -stop. ──
  'spider-start': 'spider', // CHAN3
  'spider-stop': 'spider',
  'bee-start': 'bee', // CHAN7
  'bee-stop': 'bee',
  'beetle-start': 'beetle', // CHAN0
  'beetle-stop': 'beetle',
  'dragonfly-start': 'dragonfly', // CHAN4
  'dragonfly-stop': 'dragonfly',
  'mosquito-start': 'mosquito', // CHAN5
  'mosquito-stop': 'mosquito',
  'earwig-start': 'earwig', // CHAN9
  'earwig-stop': 'earwig',
  'inchworm-start': 'inchworm', // CHAN8
  'inchworm-stop': 'inchworm',
}

/** The playback surface the dispatcher uses — the frame-path methods only. */
export interface AudioEngine {
  /** Build/unlock the AudioContext. Idempotent; wire to the first gesture. */
  resume(): void
  /** Fire a one-shot CHAN sweep. No-op until resumed. */
  play(name: EffectName): void
  /** Start a sustained CHAN voice (idempotent). */
  startLoop(name: EffectName): void
  /** Stop a sustained CHAN voice (harmless if not running). */
  stopLoop(name: EffectName): void
  /** True once a live context exists. */
  ready(): boolean
  /** Advance one frame — reserved for cue arbitration; a no-op here. */
  tick(): void
}

// ── Playback tunables (approximate; the AC3 browser playtest is the arbiter) ──
/** Seconds per driver frame (POKEY interrupt). Sets sweep pace. */
const FRAME_SEC = 1 / 200
/** Per-voice headroom below the synth master so overlaps don't clip. */
const VOICE_GAIN = 0.5
/** How many times a loop voice repeats its sweep before needing a re-start —
 *  large enough to read as continuous until stopLoop cuts it. */
const LOOP_REPS = 64

/** Schedule a slot's sweep onto a fresh oscillator+gain against the live rig.
 *  Returns the teardown. Empty (program-stuffed) schedules make a silent voice. */
function scheduleSweep(target: SynthTarget, sched: VoiceSchedule, loop: boolean): Voice {
  const { context, out } = target
  const osc = context.createOscillator()
  const gain = context.createGain()
  osc.connect(gain)
  gain.connect(out)

  const stepDur = FRAME_SEC * sched.framesPerStep
  let t = context.currentTime
  const reps = loop ? LOOP_REPS : 1
  if (sched.steps.length > 0) {
    for (let r = 0; r < reps; r++) {
      for (const step of sched.steps) {
        osc.frequency.setValueAtTime(step.freq, t)
        gain.gain.setValueAtTime(step.gain * VOICE_GAIN, t)
        t += stepDur
      }
    }
  }
  gain.gain.setValueAtTime(0, t) // silence the tail
  osc.start(context.currentTime)
  osc.stop(t + 0.02)

  return {
    stop: () => {
      try {
        osc.stop()
      } catch {
        /* already stopped */
      }
      osc.disconnect()
      gain.disconnect()
    },
  }
}

export function createAudio(): AudioEngine {
  const synth = createSynthEngine<EffectName>()
  const slotIndex = (name: EffectName): number => EFFECT_NAMES.indexOf(name)

  return {
    resume: () => synth.resume(),
    ready: () => synth.ready(),
    tick: () => {
      /* no cue arbitration in this engine — kept for the dispatch convention */
    },
    play: (name) => {
      synth.withAudio((target) => {
        const v = scheduleSweep(target, pokeyVoiceSchedule(slotIndex(name)), false)
        // one-shot: nothing holds the handle; the scheduled osc.stop() reclaims it
        void v
      })
    },
    startLoop: (name) => {
      synth.startVoice(name, (target) =>
        scheduleSweep(target, pokeyVoiceSchedule(slotIndex(name)), true),
      )
    },
    stopLoop: (name) => synth.stopVoice(name),
  }
}
