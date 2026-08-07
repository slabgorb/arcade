// src/shell/wsg.ts
//
// Story pm2-2 — the Namco WSG voice: a pure-param 3-channel wavetable synth on
// @shared/synth. This is the INSTRUMENT, not the score: it understands waveform
// indices (0–7 into the baked PROM tables), 20-bit frequency words and 4-bit
// volumes — it has NO knowledge of game events. The events → cue mapping is
// pm2-3's audio driver, which will call this module with values it decodes
// from the ROM's effect tables under the citation gate.
//
// Rendering model (glossary.md § Sound (Namco WSG)): the real chip is a 20-bit
// phase accumulator per voice whose top 5 bits index a 32-sample PROM table at
// a 96 kHz tick, i.e. the table loops at f_out = f × 96000 / 2^20 Hz. Here each
// voice is an `AudioBufferSourceNode` looping the 32-sample table (the
// wavetable, byte-baked from sound.json in ./wsg-data.ts) with
// `playbackRate = f_out × 32 / sampleRate`, through a gain carrying the 4-bit
// volume. Same table, same pitch mapping — a wavetable source, not an
// approximating oscillator.
//
// All Web Audio impurity lives HERE, in src/shell/. The engine skeleton —
// gesture gate, no-throw contract, context recovery — is @shared/synth's
// (SH2-18); this module adds only the WSG's numbers and never touches
// src/core/.
import { createSynthEngine, type SynthEngine, type SynthTarget } from '@shared/synth'
import {
  WSG_WAVEFORMS,
  WSG_WAVE_SAMPLES,
  WSG_CLOCK_HZ,
  WSG_ACCUMULATOR_STEPS,
  WSG_VOLUME_MAX,
} from './wsg-data'

/**
 * One WSG register triple — everything the hardware knows about a sound.
 * pm2-3/4 decode each ROM effect into one (or a stream) of these.
 */
export interface WsgEffect {
  /** 3-bit waveform-select: index into the eight PROM wavetables. */
  waveform: number
  /** The 20-bit frequency word f; pitch is f × 96000 / 2^20 Hz. */
  frequency: number
  /** 4-bit volume, 0 (silent) … 15 (full). */
  volume: number
  /** Optional one-shot cutoff; omitted = plays until replaced or stopped. */
  durationMs?: number
}

/** The chip's three channels. One-shots default to channel 0. */
export type WsgVoice = 0 | 1 | 2

export interface Wsg {
  /** Unlock/build the audio context. Idempotent — wire to any gesture. */
  resume(): void
  /** Fire a one-shot on a channel (default 0), replacing what it was playing. */
  play(effect: WsgEffect, opts?: { voice?: WsgVoice }): void
  /** Start (or restart) the continuous background siren. */
  startSiren(effect: WsgEffect): void
  /** Retune the running siren's frequency word; no-op when it is not running. */
  setSirenPitch(frequency: number): void
  /** Silence every channel and the siren. */
  stopAll(): void
}

/** The glossary pitch mapping: a frequency word to output Hz. */
export function wsgToneHz(frequency: number): number {
  return (frequency * WSG_CLOCK_HZ) / WSG_ACCUMULATOR_STEPS
}

/** A 32-frame buffer at native rate loops at sampleRate/32 Hz; scale to f_out. */
function playbackRateFor(frequency: number, sampleRate: number): number {
  return (wsgToneHz(frequency) * WSG_WAVE_SAMPLES) / sampleRate
}

/** 4-bit volume register → unit gain (clamped like the hardware's 4 bits). */
function volumeGain(volume: number): number {
  return Math.min(WSG_VOLUME_MAX, Math.max(0, Math.floor(volume))) / WSG_VOLUME_MAX
}

/** Build the 32-sample wavetable buffer for a waveform-select (3-bit, masked). */
function wavetable(context: AudioContext, waveform: number): AudioBuffer {
  const samples = WSG_WAVEFORMS[waveform & 0x7]
  const buffer = context.createBuffer(1, WSG_WAVE_SAMPLES, context.sampleRate)
  const data = buffer.getChannelData(0)
  // Signed nibble −8…+7 normalised by the 4-bit half-range to −1…+0.875.
  for (let i = 0; i < WSG_WAVE_SAMPLES; i++) data[i] = samples[i] / 8
  return buffer
}

/** One running channel: the nodes to retune or tear down. */
interface Channel {
  readonly source: AudioBufferSourceNode
  readonly gain: GainNode
}

function buildChannel({ context, out }: SynthTarget, effect: WsgEffect): Channel {
  const gain = context.createGain()
  gain.gain.setValueAtTime(volumeGain(effect.volume), context.currentTime)
  gain.connect(out)
  const source = context.createBufferSource()
  source.buffer = wavetable(context, effect.waveform)
  source.loop = true
  source.playbackRate.setValueAtTime(
    playbackRateFor(effect.frequency, context.sampleRate),
    context.currentTime,
  )
  source.connect(gain)
  return { source, gain }
}

function stopChannel(channel: Channel): void {
  channel.source.onended = null
  channel.source.stop()
  channel.gain.disconnect()
}

export function createWsg(synth: SynthEngine<never> = createSynthEngine()): Wsg {
  // The three one-shot channels. Handles, not raw truth: a context recovery
  // orphans these nodes, but every touch runs inside synth.withAudio's guard,
  // so a stale stop() is swallowed and the slot simply refills on the next play.
  const channels: Array<Channel | null> = [null, null, null]

  // The siren is engine-owned (persistentVoice) so a context recovery rebuilds
  // its controller instead of leaving a handle into the dead context.
  const siren = synth.persistentVoice(({ context, out }: SynthTarget) => {
    let running: Channel | null = null
    return {
      start(effect: WsgEffect): void {
        if (running !== null) stopChannel(running)
        running = buildChannel({ context, out }, effect)
        running.source.start()
      },
      setPitch(frequency: number): void {
        if (running === null) return
        running.source.playbackRate.setValueAtTime(
          playbackRateFor(frequency, context.sampleRate),
          context.currentTime,
        )
      },
      stop(): void {
        if (running === null) return
        stopChannel(running)
        running = null
      },
    }
  })

  function play(effect: WsgEffect, opts?: { voice?: WsgVoice }): void {
    const voice = opts?.voice ?? 0
    synth.withAudio((target) => {
      const previous = channels[voice]
      channels[voice] = null
      if (previous !== null) stopChannel(previous)
      const channel = buildChannel(target, effect)
      channels[voice] = channel
      // A natural end (durationMs elapsing) frees the slot and its gain.
      channel.source.onended = () => {
        if (channels[voice] === channel) channels[voice] = null
        channel.gain.disconnect()
      }
      channel.source.start()
      // Scheduled AFTER start(): stop() on a never-started source throws.
      if (effect.durationMs !== undefined) {
        channel.source.stop(target.context.currentTime + effect.durationMs / 1000)
      }
    })
  }

  function startSiren(effect: WsgEffect): void {
    siren.control((c) => c.start(effect))
  }

  function setSirenPitch(frequency: number): void {
    siren.control((c) => c.setPitch(frequency))
  }

  function stopAll(): void {
    synth.withAudio(() => {
      for (let voice = 0; voice < channels.length; voice++) {
        const channel = channels[voice]
        channels[voice] = null
        if (channel !== null) stopChannel(channel)
      }
    })
    siren.control((c) => c.stop())
  }

  return { resume: () => synth.resume(), play, startSiren, setSirenPitch, stopAll }
}
