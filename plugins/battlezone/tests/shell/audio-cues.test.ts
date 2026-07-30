// tests/shell/audio-cues.test.ts
//
// Story bz3-10 — RED phase (O'Brien / TEA). Cluster C10 (U-008/009/010/012/014):
// the five ROM POKEY synth cues that are missing or incomplete. This file pins
// the SYNTHESIS side — that each cue exists as a one-shot `play()` target and
// carries the ROM's ENVELOPE TIMING. The trigger wiring is pinned separately in
// audio-cue-triggers.test.ts.
//
// WHY TIMING, NOT WAVEFORM. src/shell/audio.ts is runtime SYNTHESIS, not sample
// playback (memory: "battlezone audio is synthesis"). The cabinet mixed POKEY's
// four voices with discrete analog circuits; the cannon/explosion/engine hum are
// the DISCRETE circuits (no ROM data — approximated to recordings). But these
// FIVE cues are the POKEY-DRIVEN sequences, and POKEY sequences DO have exact ROM
// byte tables (BZSOUN.MAC) — so their DURATION is a genuine ROM fact and is the
// thing we pin. We assert envelope SHAPE/TIMING (a tonal oscillator exists; the
// sound lasts the ROM's duration), never a waveform byte.
//
// ─── THE ROM ENVELOPE TABLES (all HEX — BZSOUN.MAC is `.RADIX 16`) ───────────
// Record format (BZSOUN.MAC:62-65): STVAL / FRCNT / CHANGE / NUMBER, where
// NUMBER is the count of CHANGES. Duration per record is NUMBER x FRCNT
// sound-frames — NOT (NUMBER+1) x FRCNT (review round 2: the RED-phase draft
// over-counted by one whole extra FRCNT-frame per record). MODSND, the
// sound-continue engine (BZSOUN.MAC:301-348), walks NUMBER FRCNT-frame holds
// per record then falls straight into the next record's own STVAL — no extra
// hold. The file's own EX2 (BZSOUN.MAC:79, `0,45,0,1`) confirms it: NUMBER=1,
// FRCNT=0x45=69, documented to play ~0x46=70 frames ≈ FRCNT, NOT 2xFRCNT. ONE
// sound-frame is ONE NMI = 4 ms (250 Hz), NOT the 15.625 Hz game frame (bz3-1
// timebase; getting this wrong inflates every duration ~16x). So per
// sub-record: NUMBER x FRCNT x 4 ms.
//
//   WARNG  WG3  BZSOUN.MAC:167-169  40,2,-1,18  x3 records
//          = 3 x (24 values x 2 frames) = 144 frames  -> 576 ms  (descending warble, 3 passes)
//   RBEEP  BE3  BZSOUN.MAC:175       23,10,0,1
//          = 1 value x 16 frames     = 16 frames   -> 64 ms  (steady tick, CHANGE=0)
//   BOING  WP1  BZSOUN.MAC:187-196   0C0,1,0F6,6 + 9 records of ...,0C
//          = 6 + 9x12 = 114 frames -> 456 ms by Σ NUMBERxFRCNT (all FRCNT=1)
//   BONER  BO3  BZSOUN.MAC:204       10,70,0,2
//          = 2 values x 112 frames   = 224 frames  -> 896 ms (bell; BO4 gives the bong tremolo)
//   DISINT DS1  BZSOUN.MAC:217-218   30,1,0FC,0C x2 records
//          = 2 x (12 values x 1 frame) = 24 frames -> 96 ms by Σ NUMBERxFRCNT
//
// bz4-4 ruling: the NUMBER×FRCNT formula is PER RECORD, so it corrects every
// record — including the FRCNT=1 cues, once per record, not once total. MODSND
// preempts each record's final conceptual value (the (NUMBER+1)th), so BOING
// (10 records) drops 10 frames = 40 ms (496 -> 456) and DISINT (2 records)
// drops 2 frames = 8 ms (104 -> 96). Both now match Σ NUMBERxFRCNT. Bands
// below stay well clear of the 16x timebase blunder either way.
//
// src/shell/audio.ts EXISTS (bz1-11) but has no `cueEnvelope` and no tonal cue
// today — so the RED signal is: `cueEnvelope` is undefined (its guard throws),
// and `play('<cue>')` currently falls through to the noise-burst EXPLOSION branch
// (audio.ts:207-213), which builds NO oscillator. Both are pinned below.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ── recording fake Web Audio surface (time-capturing) ────────────────────────
// Modelled on audio.test.ts's fake, extended to record the scheduled TIME of
// every param change / stop — so we can prove the SOUND actually lasts the ROM
// duration, not just that a descriptor claims it does.

class FakeAudioParam {
  readonly values: number[] = []
  private v = 0
  get value(): number {
    return this.v
  }
  set value(next: number) {
    this.v = next
    this.values.push(next)
  }
  setValueAtTime(v: number, t = 0): this {
    this.value = v
    FakeAudioContext.scheduled.push(t)
    return this
  }
  linearRampToValueAtTime(v: number, t = 0): this {
    this.value = v
    FakeAudioContext.scheduled.push(t)
    return this
  }
  exponentialRampToValueAtTime(v: number, t = 0): this {
    this.value = v
    FakeAudioContext.scheduled.push(t)
    return this
  }
  setTargetAtTime(v: number, t = 0): this {
    this.value = v
    FakeAudioContext.scheduled.push(t)
    return this
  }
  cancelScheduledValues(): this {
    return this
  }
}

class FakeNode {
  connect<T>(target: T): T {
    return target
  }
  disconnect(): void {}
}

class FakeOscillator extends FakeNode {
  type = 'sine'
  readonly frequency = new FakeAudioParam()
  readonly detune = new FakeAudioParam()
  onended: (() => void) | null = null
  start(t = 0): void {
    FakeAudioContext.scheduled.push(t)
  }
  stop(t = 0): void {
    FakeAudioContext.scheduled.push(t)
  }
  setPeriodicWave(): void {}
}

class FakeGain extends FakeNode {
  readonly gain = new FakeAudioParam()
}

class FakeBiquadFilter extends FakeNode {
  type = 'lowpass'
  readonly frequency = new FakeAudioParam()
  readonly detune = new FakeAudioParam()
  readonly Q = new FakeAudioParam()
  readonly gain = new FakeAudioParam()
}

class FakeBuffer {
  constructor(
    readonly numberOfChannels: number,
    readonly length: number,
    readonly sampleRate: number,
  ) {}
  get duration(): number {
    return this.length / this.sampleRate
  }
  getChannelData(): Float32Array {
    return new Float32Array(this.length)
  }
  copyToChannel(): void {}
}

class FakeBufferSource extends FakeNode {
  buffer: FakeBuffer | null = null
  loop = false
  readonly playbackRate = new FakeAudioParam()
  readonly detune = new FakeAudioParam()
  onended: (() => void) | null = null
  start(t = 0): void {
    FakeAudioContext.scheduled.push(t)
  }
  stop(t = 0): void {
    FakeAudioContext.scheduled.push(t)
  }
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = []
  /** Every scheduled TIME any node/param ever received, across the context. */
  static scheduled: number[] = []
  readonly oscillators: FakeOscillator[] = []
  readonly gains: FakeGain[] = []
  readonly sources: FakeBufferSource[] = []
  currentTime = 0
  sampleRate = 48_000
  state = 'running'
  readonly destination = new FakeNode()
  constructor() {
    FakeAudioContext.instances.push(this)
  }
  resume(): Promise<void> {
    return this.state === 'closed'
      ? Promise.reject(new Error('InvalidStateError: context is closed'))
      : Promise.resolve()
  }
  suspend(): Promise<void> {
    return Promise.resolve()
  }
  close(): Promise<void> {
    this.state = 'closed'
    return Promise.resolve()
  }
  private assertOpen(): void {
    if (this.state === 'closed') throw new Error('InvalidStateError: context is closed')
  }
  createOscillator(): FakeOscillator {
    this.assertOpen()
    const o = new FakeOscillator()
    this.oscillators.push(o)
    return o
  }
  createGain(): FakeGain {
    this.assertOpen()
    const g = new FakeGain()
    this.gains.push(g)
    return g
  }
  createBiquadFilter(): FakeBiquadFilter {
    this.assertOpen()
    return new FakeBiquadFilter()
  }
  createBuffer(channels: number, length: number, sampleRate: number): FakeBuffer {
    this.assertOpen()
    return new FakeBuffer(channels, length, sampleRate)
  }
  createBufferSource(): FakeBufferSource {
    this.assertOpen()
    const s = new FakeBufferSource()
    this.sources.push(s)
    return s
  }
  createStereoPanner(): FakeNode {
    return new FakeNode()
  }
  createDelay(): FakeNode {
    return new FakeNode()
  }
  createWaveShaper(): FakeNode {
    return new FakeNode()
  }
  createDynamicsCompressor(): FakeNode {
    return new FakeNode()
  }
  createChannelMerger(): FakeNode {
    return new FakeNode()
  }
  createChannelSplitter(): FakeNode {
    return new FakeNode()
  }
  createPeriodicWave(): Record<string, never> {
    return {}
  }
}

// ── the audio module, loaded DEFENSIVELY (radar-sweep.test.ts pattern) ────────
// tsconfig includes `tests`, so this file must type-check against TODAY's
// audio.ts, which has neither `cueEnvelope` nor the new cue names. A locally
// declared optional-member module type keeps tsc clean; a missing member becomes
// a loud runtime failure naming exactly what DEV must add — the RED contract.

interface CueEnvelope {
  /** Total envelope length in seconds = (Σ per-record NUMBERxFRCNT) / 250. */
  readonly durationSec: number
}
interface LooseEngine {
  resume(): void
  play(name: string): void
  startLoop(name: string): void
  stopLoop(name: string): void
  setEngine(t: number): void
  stopEngine(): void
}
type AudioModule = {
  createAudioEngine?: () => LooseEngine
  cueEnvelope?: (name: string) => CueEnvelope | undefined
}

let mod: AudioModule = {}

const makeEngine = (): LooseEngine => {
  if (!mod.createAudioEngine) throw new Error('audio.ts must export createAudioEngine()')
  return mod.createAudioEngine()
}
const envelopeOf = (name: string): CueEnvelope => {
  if (typeof mod.cueEnvelope !== 'function') {
    throw new Error('audio.ts must export cueEnvelope(name) returning the ROM envelope')
  }
  const env = mod.cueEnvelope(name)
  if (!env || typeof env.durationSec !== 'number') {
    throw new Error(`cueEnvelope(${JSON.stringify(name)}) must return { durationSec: number }`)
  }
  return env
}

/** Furthest audio event scheduled so far (0 if none) — the sound's tail. */
const furthestScheduled = (): number =>
  FakeAudioContext.scheduled.length > 0 ? Math.max(...FakeAudioContext.scheduled) : 0

beforeEach(async () => {
  vi.resetModules()
  FakeAudioContext.instances = []
  FakeAudioContext.scheduled = []
  vi.stubGlobal('AudioContext', FakeAudioContext)
  vi.stubGlobal('webkitAudioContext', FakeAudioContext)
  try {
    mod = (await import('../../src/shell/audio')) as AudioModule
  } catch {
    mod = {}
  }
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// The five ROM cues and their NUMBER×FRCNT-decoded envelope length in
// seconds. Bands are generous enough for synthesis rounding yet clear of the
// 15.625 Hz timebase blunder (which would multiply each by ~16).
const CUES = [
  { name: 'warng', romMs: 576, lo: 0.43, hi: 0.75, cite: 'WG3 BZSOUN.MAC:167-169  40,2,-1,18 x3' },
  { name: 'rbeep', romMs: 64, lo: 0.045, hi: 0.1, cite: 'BE3 BZSOUN.MAC:175  23,10,0,1' },
  { name: 'boing', romMs: 456, lo: 0.42, hi: 0.48, cite: 'WP1 BZSOUN.MAC:187-196  0C0,1,0F6,6 +9' },
  { name: 'boner', romMs: 896, lo: 0.65, hi: 1.15, cite: 'BO3 BZSOUN.MAC:204  10,70,0,2' },
  { name: 'disint', romMs: 96, lo: 0.085, hi: 0.101, cite: 'DS1 BZSOUN.MAC:217-218  30,1,0FC,0C x2' },
] as const

describe('bz3-10 — cueEnvelope: ROM envelope timing (NMIs @250 Hz, not game frames)', () => {
  it.each(CUES)('$name lasts ~$romMs ms per its ROM table ($cite)', ({ name, lo, hi }) => {
    const env = envelopeOf(name)
    expect(env.durationSec, `${name}: ROM-derived duration`).toBeGreaterThanOrEqual(lo)
    expect(env.durationSec, `${name}: ROM-derived duration`).toBeLessThanOrEqual(hi)
  })

  it('DISINT is ~96 ms (Σ NUMBER×FRCNT, bz4-4 ruling) — NOT 104 ms and NOT ~1.66 s (the 15.625 Hz blunder)', () => {
    // DS1 = 2 records × (12 values × 1 frame) = 24 sound-frames. 24/250 = 0.096 s
    // (source-correct); the old 0.104 s counted NUMBER+1=13 vals/record (26 fr),
    // which MODSND preempts. 24/15.625 = 1.536 s would be the wrong-timebase blunder.
    const env = envelopeOf('disint')
    expect(env.durationSec).toBeCloseTo(0.096, 3)
    expect(env.durationSec, 'a game-frame timebase would put this near 1.5 s').toBeLessThan(0.3)
  })

  it('WARNG outlasts DISINT (a 3-pass warble is far longer than a 2-segment zap)', () => {
    // Relative-timing sanity: even if a Dev fudged both, the ROM ordering
    // (600 ms warble >> 96 ms zap) must survive.
    expect(envelopeOf('warng').durationSec).toBeGreaterThan(envelopeOf('disint').durationSec)
  })
})

describe('bz3-10 — play(cue): each cue synthesizes a DISTINCT tonal one-shot', () => {
  it.each(CUES)('play("$name") builds a tonal oscillator after the gate (not the noise-burst fallthrough)', ({
    name,
  }) => {
    const engine = makeEngine()
    engine.resume()
    const ctx = FakeAudioContext.instances[0]
    const before = ctx.oscillators.length // resume() already built the hum oscillator
    engine.play(name)
    // These POKEY cues are TONAL sweeps/tones — a real cue adds an oscillator.
    // In RED, play() falls through to the EXPLOSION branch (a noise buffer, no
    // oscillator), so this stays flat and fails — the exact bug, reproduced.
    expect(
      ctx.oscillators.length,
      `play("${name}") must synthesize a tonal cue, not default to the explosion noise burst`,
    ).toBeGreaterThan(before)
  })

  it.each(CUES)('play("$name") schedules its tail ~cueEnvelope("$name").durationSec out (descriptor binds the sound)', ({
    name,
  }) => {
    const dur = envelopeOf(name).durationSec
    const engine = makeEngine()
    engine.resume()
    FakeAudioContext.scheduled = [] // ignore the hum built at resume()
    engine.play(name)
    const tail = furthestScheduled()
    // The synthesis must actually LAST about as long as the descriptor claims —
    // a stop/ramp scheduled near durationSec. Ties cueEnvelope to the real sound
    // so a correct descriptor can't front a 16x-too-long (or instant) cue.
    expect(tail, `${name}: sound tail vs ROM duration ${dur}s`).toBeGreaterThanOrEqual(dur * 0.4)
    expect(tail, `${name}: sound tail vs ROM duration ${dur}s`).toBeLessThanOrEqual(dur * 2.5)
  })
})

describe('bz3-10 — the new cues honour the engine contract (no throw, pre-gate silent)', () => {
  it('every cue is a silent no-op before the gesture gate — builds no context', () => {
    const engine = makeEngine()
    expect(() => {
      for (const { name } of CUES) engine.play(name)
    }).not.toThrow()
    expect(FakeAudioContext.instances, 'no cue may open the context before a gesture').toHaveLength(0)
  })

  it('every cue is fire-and-forget after the gate — repeated plays never throw', () => {
    const engine = makeEngine()
    engine.resume()
    expect(() => {
      for (const { name } of CUES) {
        engine.play(name)
        engine.play(name)
      }
    }).not.toThrow()
  })
})
