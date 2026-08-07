// tests/shell/wsg.test.ts
//
// Story pm2-2 — the WSG voice (the INSTRUMENT, not the score). createWsg() is a
// pure-param 3-channel Namco WSG wavetable synth on @shared/synth: it knows
// waveform indices, 20-bit frequency words and 4-bit volumes — never a game
// event. (The event→cue mapping is pm2-3's driver.)
//
// WHAT THIS SUITE PINS: the TRANSCRIPTION, not the audio. Vitest cannot hear;
// what it CAN prove is that the baked wavetables are byte-equal to the
// citation-gated `docs/rom-study/claims/sound.json` (pm2-1) and that the pitch
// mapping is the glossary's `f_out = f × 96000 / 2^20` (Namco WSG: 96 kHz chip
// clock, 20-bit phase accumulator, 32-sample tables). Expected values are read
// STRAIGHT from sound.json at test time, so a drift in the gate reddens here.
//
// NOTE (honest gap, not an invention): sound.json deliberately contains NO
// per-effect frequency/waveform values — the glossary defers decoding each
// effect's bytes to the task that voices it (Task 3/4). So there is no cited
// "munch frequency word" to assert against yet; this suite feeds arbitrary
// words through the instrument and pins that whatever word goes in is rendered
// through the cited mapping and the cited wavetables.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PersistentVoice, SynthEngine, SynthTarget, Voice } from '@shared/synth'
import {
  WSG_WAVEFORMS,
  WSG_WAVE_SAMPLES,
  WSG_CLOCK_HZ,
  WSG_ACCUMULATOR_STEPS,
} from '../../src/shell/wsg-data'
import { createWsg, wsgToneHz, type WsgEffect } from '../../src/shell/wsg'

// ── The gate: expected values come from sound.json itself ────────────────────
const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

interface WaveformClaim {
  waveform: number
  samples: number[]
}

const claims = JSON.parse(
  readFileSync(join(pluginRoot, 'docs', 'rom-study', 'claims', 'sound.json'), 'utf8'),
) as Array<Record<string, unknown>>

const waveformClaims = claims
  .filter((c) => typeof c.waveform === 'number')
  .map((c) => c as unknown as WaveformClaim)
  .sort((a, b) => a.waveform - b.waveform)

// ── Minimal fake Web Audio rig behind the @shared/synth SynthTarget seam ─────
// The engine hands cabinets a SynthTarget; faking the ENGINE (always-live,
// no-guard) plus the few nodes wsg.ts builds is the whole seam — no jsdom.

class FakeParam {
  value = 0
  /** Every linear ramp scheduled on this param: {to, at}. */
  readonly ramps: Array<{ to: number; at: number }> = []
  setValueAtTime(v: number, _t: number): this {
    this.value = v
    return this
  }
  linearRampToValueAtTime(v: number, at: number): this {
    this.ramps.push({ to: v, at })
    return this
  }
}

class FakeBuffer {
  private readonly data: Float32Array
  constructor(length: number) {
    this.data = new Float32Array(length)
  }
  getChannelData(_channel: number): Float32Array {
    return this.data
  }
}

class FakeNode {
  readonly connectedTo: unknown[] = []
  connect(node: unknown): unknown {
    this.connectedTo.push(node)
    return node
  }
  disconnect(): void {}
}

class FakeGain extends FakeNode {
  readonly gain = new FakeParam()
}

class FakeSource extends FakeNode {
  buffer: FakeBuffer | null = null
  loop = false
  readonly playbackRate = new FakeParam()
  readonly startedAt: number[] = []
  readonly stoppedAt: number[] = []
  onended: (() => void) | null = null
  start(when = 0): void {
    this.startedAt.push(when)
  }
  stop(when = 0): void {
    this.stoppedAt.push(when)
    this.onended?.()
  }
}

class FakeContext {
  readonly sampleRate = 48000
  currentTime = 0
  readonly sources: FakeSource[] = []
  readonly gains: FakeGain[] = []
  createBuffer(_channels: number, length: number, _rate: number): FakeBuffer {
    return new FakeBuffer(length)
  }
  createBufferSource(): FakeSource {
    const s = new FakeSource()
    this.sources.push(s)
    return s
  }
  createGain(): FakeGain {
    const g = new FakeGain()
    this.gains.push(g)
    return g
  }
}

function harness() {
  const context = new FakeContext()
  const out = new FakeGain()
  const target: SynthTarget = {
    context: context as unknown as AudioContext,
    out: out as unknown as GainNode,
  }
  const voices = new Map<string, Voice>()
  const engine: SynthEngine<never> = {
    resume(): void {},
    withAudio(effect: (t: SynthTarget) => void): void {
      effect(target)
    },
    persistentVoice<C>(build: (t: SynthTarget) => C): PersistentVoice<C> {
      let controller: C | null = null
      return {
        control(effect: (c: C) => void): void {
          if (controller === null) controller = build(target)
          effect(controller)
        },
      }
    },
    startVoice(name: never, build: (t: SynthTarget) => Voice): void {
      if (!voices.has(name)) voices.set(name, build(target))
    },
    stopVoice(name: never): void {
      const v = voices.get(name)
      voices.delete(name)
      v?.stop()
    },
    isVoiceActive(name: never): boolean {
      return voices.has(name)
    },
    ready(): boolean {
      return true
    },
  }
  return { context, out, wsg: createWsg(engine) }
}

/** The glossary mapping, restated independently: f_out = f × 96000 / 2^20. */
const expectedHz = (word: number): number => (word * 96000) / 2 ** 20

/** A 32-frame buffer at sampleRate loops at rate·sampleRate/32 Hz. */
const expectedRate = (word: number, sampleRate: number): number =>
  (expectedHz(word) * 32) / sampleRate

describe('wsg-data — the baked wavetables track the citation gate', () => {
  it('bakes exactly the eight cited waveforms', () => {
    expect(waveformClaims).toHaveLength(8)
    expect(WSG_WAVEFORMS).toHaveLength(8)
    expect(WSG_WAVE_SAMPLES).toBe(32)
  })

  it.each(waveformClaims.map((c) => [c.waveform, c] as const))(
    'waveform %i is byte-equal to its sound.json claim',
    (_n, claim) => {
      expect([...WSG_WAVEFORMS[claim.waveform]]).toEqual(claim.samples)
      expect(claim.samples).toHaveLength(32)
    },
  )

  it('pins the glossary pitch constants: 96 kHz clock, 20-bit accumulator', () => {
    expect(WSG_CLOCK_HZ).toBe(96000)
    expect(WSG_ACCUMULATOR_STEPS).toBe(2 ** 20)
  })
})

describe('wsgToneHz — the glossary frequency-word mapping', () => {
  it('maps a 20-bit frequency word by f × 96000 / 2^20', () => {
    // A full-scale word wraps the accumulator once per tick: 96 kHz.
    expect(wsgToneHz(2 ** 20)).toBeCloseTo(96000, 10)
    // An arbitrary mid-range word.
    expect(wsgToneHz(0x0c00)).toBeCloseTo(expectedHz(0x0c00), 10)
    expect(wsgToneHz(0)).toBe(0)
  })
})

describe('createWsg().play — renders the cited waveform at the mapped pitch', () => {
  const effect: WsgEffect = { waveform: 5, frequency: 0x0c00, volume: 12 }

  it('loops a 32-sample buffer holding waveform 5 from sound.json (signed nibble / 8)', () => {
    const { context, wsg } = harness()
    wsg.play(effect)
    expect(context.sources).toHaveLength(1)
    const source = context.sources[0]
    expect(source.loop).toBe(true)
    expect(source.startedAt).toHaveLength(1)
    const claim = waveformClaims.find((c) => c.waveform === 5)!
    expect(Array.from(source.buffer!.getChannelData(0))).toEqual(claim.samples.map((s) => s / 8))
  })

  it('sets the playback rate so the table loops at f × 96000 / 2^20 Hz', () => {
    const { context, wsg } = harness()
    wsg.play(effect)
    expect(context.sources[0].playbackRate.value).toBeCloseTo(
      expectedRate(0x0c00, context.sampleRate),
      10,
    )
  })

  it('applies the 4-bit volume as volume/15 gain into the shared out bus', () => {
    const { context, out, wsg } = harness()
    wsg.play(effect)
    expect(context.gains[0].gain.value).toBeCloseTo(12 / 15, 10)
    // source → gain → engine out
    expect(context.sources[0].connectedTo).toContain(context.gains[0])
    expect(context.gains[0].connectedTo).toContain(out)
  })

  it('clamps volume to the 4-bit range', () => {
    const { context, wsg } = harness()
    wsg.play({ waveform: 0, frequency: 0x0100, volume: 99 })
    wsg.play({ waveform: 0, frequency: 0x0100, volume: -3 }, { voice: 1 })
    expect(context.gains[0].gain.value).toBe(1)
    expect(context.gains[1].gain.value).toBe(0)
  })

  it('schedules a stop when durationMs is given', () => {
    const { context, wsg } = harness()
    context.currentTime = 2
    wsg.play({ ...effect, durationMs: 250 })
    expect(context.sources[0].stoppedAt).toContain(2.25)
  })

  it('chirps: ramps the playback rate to frequencyEnd over durationMs (the munch sweep)', () => {
    const { context, wsg } = harness()
    context.currentTime = 1
    // start word 0x1800 (562 Hz), end word 0x0600 (140 Hz) over 100ms — a downward chirp.
    wsg.play({ waveform: 0, frequency: 0x1800, volume: 12, durationMs: 100, frequencyEnd: 0x0600 })
    const rate = context.sources[0].playbackRate
    // Held at the START rate, then ramped to the END rate at now + duration.
    expect(rate.value).toBeCloseTo(expectedRate(0x1800, context.sampleRate), 10)
    expect(rate.ramps).toHaveLength(1)
    expect(rate.ramps[0].to).toBeCloseTo(expectedRate(0x0600, context.sampleRate), 10)
    expect(rate.ramps[0].at).toBeCloseTo(1 + 0.1, 10)
  })

  it('a one-shot with no frequencyEnd stays a flat tone (no ramp)', () => {
    const { context, wsg } = harness()
    wsg.play(effect)
    expect(context.sources[0].playbackRate.ramps).toHaveLength(0)
  })

  it('is 3-voice: distinct voices mix, replaying a voice replaces its sound', () => {
    const { context, wsg } = harness()
    wsg.play(effect, { voice: 0 })
    wsg.play(effect, { voice: 1 })
    wsg.play(effect, { voice: 2 })
    expect(context.sources).toHaveLength(3)
    expect(context.sources.every((s) => s.stoppedAt.length === 0)).toBe(true)
    wsg.play(effect, { voice: 1 })
    expect(context.sources).toHaveLength(4)
    expect(context.sources[1].stoppedAt.length).toBeGreaterThan(0)
    expect(context.sources[0].stoppedAt).toHaveLength(0)
    expect(context.sources[2].stoppedAt).toHaveLength(0)
  })
})

describe('the siren — a continuous voice with live pitch', () => {
  const siren: WsgEffect = { waveform: 0, frequency: 0x0400, volume: 8 }

  it('startSiren loops the cited waveform continuously at the mapped pitch', () => {
    const { context, wsg } = harness()
    wsg.startSiren(siren)
    const source = context.sources[0]
    expect(source.loop).toBe(true)
    expect(source.startedAt).toHaveLength(1)
    expect(source.stoppedAt).toHaveLength(0)
    const claim = waveformClaims.find((c) => c.waveform === 0)!
    expect(Array.from(source.buffer!.getChannelData(0))).toEqual(claim.samples.map((s) => s / 8))
    expect(source.playbackRate.value).toBeCloseTo(expectedRate(0x0400, context.sampleRate), 10)
  })

  it('setSirenPitch retunes the RUNNING siren through the same word mapping', () => {
    const { context, wsg } = harness()
    wsg.startSiren(siren)
    wsg.setSirenPitch(0x0900)
    const source = context.sources[0]
    expect(source.stoppedAt).toHaveLength(0) // retuned, not restarted
    expect(source.playbackRate.value).toBeCloseTo(expectedRate(0x0900, context.sampleRate), 10)
  })

  it('setSirenPitch before startSiren is a harmless no-op', () => {
    const { context, wsg } = harness()
    wsg.setSirenPitch(0x0900)
    expect(context.sources).toHaveLength(0)
  })

  it('restarting the siren replaces the previous one', () => {
    const { context, wsg } = harness()
    wsg.startSiren(siren)
    wsg.startSiren({ ...siren, frequency: 0x0800 })
    expect(context.sources).toHaveLength(2)
    expect(context.sources[0].stoppedAt.length).toBeGreaterThan(0)
    expect(context.sources[1].stoppedAt).toHaveLength(0)
  })
})

describe('stopAll', () => {
  it('silences every one-shot voice and the siren', () => {
    const { context, wsg } = harness()
    wsg.play({ waveform: 1, frequency: 0x0200, volume: 10 }, { voice: 0 })
    wsg.play({ waveform: 2, frequency: 0x0300, volume: 10 }, { voice: 1 })
    wsg.startSiren({ waveform: 0, frequency: 0x0400, volume: 8 })
    wsg.stopAll()
    expect(context.sources).toHaveLength(3)
    expect(context.sources.every((s) => s.stoppedAt.length > 0)).toBe(true)
  })
})
