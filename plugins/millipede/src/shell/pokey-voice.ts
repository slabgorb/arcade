// src/shell/pokey-voice.ts
//
// Story ml6-2 — the PURE bridge from the ml6-1 sound driver (sound-rom.ts) to a
// playable tone schedule. sound-rom.ts hands us AUDF (frequency divisor) and
// AUDC (control/volume) bytes already in PLAY order; this module turns a CHAN
// slot into the sequence of { freq, gain } steps the Web Audio voice schedules,
// plus the per-step frame cadence (the slot's MASK). THE SWEEP IS THE SOUND: a
// slot with a real FREQ table produces a MOVING schedule; a static render is the
// silent-feature trap (playbook §4).
//
// This file is pure (no AudioContext, no DOM) so the schedule is unit-testable
// under vitest's node env. shell/audio.ts wraps it with @shared/synth.
//
// POKEY math (approximate, but the SHAPE of the sweep is exact — that is what
// carries the effect):
//   • Frequency: a POKEY channel divides its audio clock by 2*(AUDF+1). We use
//     the 64 kHz clock (the ROM's default divider); the absolute pitch is an
//     approximation but the relative sweep is faithful.
//   • Volume: AUDC low nibble (bits 0-3) is the 0-15 volume; 0 is a rest. The
//     high nibble is distortion, not modelled here (a pure-ish tone).

import { MASK, freqSweep, contSweep, NCHAN } from './sound-rom'

/** The POKEY audio clock we divide (the "64 kHz" clock, ROM default). */
export const POKEY_CLOCK_HZ = 63920

/** One step of a voice's sweep. */
export interface VoiceStep {
  readonly freq: number
  readonly gain: number
}

/** A slot's full playable envelope. */
export interface VoiceSchedule {
  /** Ordered tone steps (empty for a program-stuffed slot). */
  readonly steps: readonly VoiceStep[]
  /** Frames each step is held — the slot's MASK+1 (mask 3 → every 4th frame). */
  readonly framesPerStep: number
}

/** AUDF divisor → Hz. Bigger AUDF ⇒ bigger divisor ⇒ lower pitch. */
export function audfToHz(audf: number): number {
  return POKEY_CLOCK_HZ / (2 * (audf + 1))
}

/** AUDC → linear gain 0..1 from the low-nibble volume (0-15). 0 is a rest. */
export function audcToGain(audc: number): number {
  return (audc & 0x0f) / 15
}

/** Build the tone schedule for CHAN slot `index`. Empty steps for a
 *  program-stuffed slot (dragonfly 4, bee 7 — the game supplies their frequency
 *  at runtime via the dragonfly audioOffset, not a stored table). */
export function pokeyVoiceSchedule(index: number): VoiceSchedule {
  const framesPerStep = MASK[index] + 1
  if (index < 0 || index > NCHAN) return { steps: [], framesPerStep }

  const freqs = freqSweep(index)
  if (freqs.length === 0) return { steps: [], framesPerStep }

  const conts = contSweep(index)
  const steps: VoiceStep[] = freqs.map((audf, i) => ({
    freq: audfToHz(audf),
    // contSweep already repeats a constant volume once per freq step; guard the
    // length in case a table pairs unevenly (fall back to the last gain).
    gain: audcToGain(conts[i] ?? conts[conts.length - 1] ?? 0),
  }))
  return { steps, framesPerStep }
}
