// tests/shell/audio.test.ts
//
// Story bz1-11 — RED phase (Furiosa / TEA). The shell's WebAudio synthesis
// engine, tested against a recording fake AudioContext (AC: "unit-tested in
// the shell against a mocked/stub AudioContext — no real audio hardware
// needed in CI").
//
// The contract pinned here (context-story-bz1-11.md, sibling AudioEngine
// convention from tempest/star-wars, adapted to synthesis):
//
//   createAudioEngine(): AudioEngine
//     .resume()                 — lazily builds the ONE AudioContext;
//                                 idempotent (autoplay-policy gesture gate)
//     .play('cannon'|'explosion')          — one-shot cues; no-op pre-resume
//     .startLoop('saucer'|'track')         — sustained cues; no-op pre-resume
//     .stopLoop('saucer'|'track')          — safe even when not started
//     .setEngine(throttle)                 — continuous hum, param-driven
//   engineParams(throttle): { frequency, gain }
//     — the PURE throttle→hum mapping, exported so the knob curve is testable
//       without any context at all (tempest's pure-seam habit).
//
// Battlezone's engine sound is DISCRETE ANALOG hardware, not POKEY — there is
// no register data to bake, so synthesis parameters are approximations and
// none of these tests assert a ROM fact (story sourcing rule).
//
// src/shell/audio.ts is absent pre-GREEN — dynamic-import failure is the RED
// signal (house pattern: saucer.test.ts's loadSaucer()).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// --- recording fake Web Audio surface ---------------------------------------

class FakeAudioParam {
  /** Every value ever scheduled or assigned, in order. */
  readonly values: number[] = []
  private v = 0
  get value(): number {
    return this.v
  }
  set value(next: number) {
    this.v = next
    this.values.push(next)
  }
  setValueAtTime(v: number): this {
    this.value = v
    return this
  }
  linearRampToValueAtTime(v: number): this {
    this.value = v
    return this
  }
  exponentialRampToValueAtTime(v: number): this {
    this.value = v
    return this
  }
  setTargetAtTime(v: number): this {
    this.value = v
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
  start(): void {}
  stop(): void {}
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
  start(): void {}
  stop(): void {}
}

class FakeStereoPanner extends FakeNode {
  readonly pan = new FakeAudioParam()
}

class FakeDelay extends FakeNode {
  readonly delayTime = new FakeAudioParam()
}

class FakeWaveShaper extends FakeNode {
  curve: Float32Array | null = null
  oversample = 'none'
}

class FakeDynamicsCompressor extends FakeNode {
  readonly threshold = new FakeAudioParam()
  readonly knee = new FakeAudioParam()
  readonly ratio = new FakeAudioParam()
  readonly attack = new FakeAudioParam()
  readonly release = new FakeAudioParam()
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = []
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
  /** Review rework: spy — an inert repeat resume() would strand a suspended context. */
  resumeCalls = 0
  closeCalls = 0
  /**
   * SH2-18: a CLOSED context REJECTS. This fake previously resolved unconditionally,
   * so a bare `void ctx.resume()` (which is what src/shell/audio.ts still writes)
   * looked harmless here while leaking an unhandled rejection in a real browser.
   */
  resume(): Promise<void> {
    this.resumeCalls++
    return this.state === 'closed'
      ? Promise.reject(new Error('InvalidStateError: context is closed'))
      : Promise.resolve()
  }
  suspend(): Promise<void> {
    return Promise.resolve()
  }
  /**
   * SH2-18: close() now really CLOSES. It used to be cosmetic — it returned a resolved
   * promise and left `state` at 'running' — which meant this harness COULD NOT EXPRESS
   * the failure it most needed to: a browser closing the context out from under the
   * game (iOS reclaiming audio, a long-backgrounded tab). That is why battlezone has
   * had zero coverage of the closed-context path. Red Baron's fake (rb2-11 review
   * round 1) already does this; battlezone's is brought up to the same grade.
   */
  close(): Promise<void> {
    this.closeCalls++
    this.state = 'closed'
    return Promise.resolve()
  }
  /**
   * SH2-18: a closed context throws SYNCHRONOUSLY from every factory method. These are
   * called from main.ts's frame() — ABOVE the requestAnimationFrame(frame) re-schedule
   * — so an escaping InvalidStateError does not merely mute the game, it FREEZES
   * rendering and input.
   */
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
  createStereoPanner(): FakeStereoPanner {
    return new FakeStereoPanner()
  }
  createDelay(): FakeDelay {
    return new FakeDelay()
  }
  createWaveShaper(): FakeWaveShaper {
    return new FakeWaveShaper()
  }
  createDynamicsCompressor(): FakeDynamicsCompressor {
    return new FakeDynamicsCompressor()
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

/** Every frequency value any oscillator ever received, across all contexts. */
function allFrequencyValues(): number[] {
  return FakeAudioContext.instances.flatMap((c) => c.oscillators.flatMap((o) => o.frequency.values))
}

/** Every gain value any gain node ever received, across all contexts. */
function allGainValues(): number[] {
  return FakeAudioContext.instances.flatMap((c) => c.gains.flatMap((g) => g.gain.values))
}

async function loadAudio() {
  return import('../../src/shell/audio')
}

beforeEach(() => {
  vi.resetModules()
  FakeAudioContext.instances = []
  vi.stubGlobal('AudioContext', FakeAudioContext)
  vi.stubGlobal('webkitAudioContext', FakeAudioContext)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// --- the gesture gate (story AC: never before a user gesture) ---------------

describe('gesture gate — no AudioContext until resume()', () => {
  it('importing the module builds NO context (autoplay policy)', async () => {
    await loadAudio()
    expect(FakeAudioContext.instances).toHaveLength(0)
  })

  it('createAudioEngine() builds NO context either — construction is not a gesture', async () => {
    const m = await loadAudio()
    m.createAudioEngine()
    expect(FakeAudioContext.instances).toHaveLength(0)
  })

  it('pre-resume one-shots and loops are silent no-ops, never throws', async () => {
    const m = await loadAudio()
    const engine = m.createAudioEngine()
    expect(() => {
      engine.play('cannon')
      engine.play('explosion')
      engine.startLoop('saucer')
      engine.startLoop('track')
      engine.stopLoop('saucer')
      engine.setEngine(0.7)
    }).not.toThrow()
    expect(FakeAudioContext.instances).toHaveLength(0)
  })

  it('resume() builds exactly ONE context, and a second resume() is a no-op', async () => {
    const m = await loadAudio()
    const engine = m.createAudioEngine()
    engine.resume()
    expect(FakeAudioContext.instances).toHaveLength(1)
    engine.resume()
    engine.resume()
    expect(FakeAudioContext.instances, 'repeat gestures must be harmless').toHaveLength(1)
  })
})

// --- the pure throttle→hum mapping (story AC: params respond to throttle) ---

describe('engineParams — the pure throttle→hum curve', () => {
  it('pitch rises with throttle: full ahead is audibly above idle', async () => {
    const m = await loadAudio()
    const idle = m.engineParams(0)
    const half = m.engineParams(0.5)
    const full = m.engineParams(1)
    expect(full.frequency).toBeGreaterThan(half.frequency)
    expect(half.frequency).toBeGreaterThan(idle.frequency)
  })

  it('the tank idles AUDIBLY — gain never hits zero at rest, never exceeds unity', async () => {
    const m = await loadAudio()
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const p = m.engineParams(t)
      expect(p.gain, `gain at throttle ${t}`).toBeGreaterThan(0)
      expect(p.gain, `gain at throttle ${t}`).toBeLessThanOrEqual(1)
      expect(Number.isFinite(p.frequency)).toBe(true)
      expect(p.frequency).toBeGreaterThan(0)
    }
  })

  it('clamps out-of-range throttle to the [0, 1] band (input hygiene)', async () => {
    const m = await loadAudio()
    expect(m.engineParams(-0.5)).toEqual(m.engineParams(0))
    expect(m.engineParams(2)).toEqual(m.engineParams(1))
  })
})

// --- the live wiring (mapping actually reaches the nodes) --------------------

describe('setEngine — the hum tracks the treads through the real node graph', () => {
  it('applies engineParams to a live oscillator/gain pair', async () => {
    const m = await loadAudio()
    const engine = m.createAudioEngine()
    engine.resume()

    engine.setEngine(0.25)
    engine.setEngine(0.9)

    expect(allFrequencyValues()).toContain(m.engineParams(0.25).frequency)
    expect(allFrequencyValues()).toContain(m.engineParams(0.9).frequency)
    expect(allGainValues()).toContain(m.engineParams(0.25).gain)
    expect(allGainValues()).toContain(m.engineParams(0.9).gain)
  })

  it('one-shots build nodes only after the gate opens', async () => {
    const m = await loadAudio()
    const engine = m.createAudioEngine()
    engine.resume()
    const before = FakeAudioContext.instances[0].oscillators.length + FakeAudioContext.instances[0].sources.length
    engine.play('cannon')
    const after = FakeAudioContext.instances[0].oscillators.length + FakeAudioContext.instances[0].sources.length
    expect(after, 'a post-gesture one-shot must actually synthesize').toBeGreaterThan(before)
  })

  it('loops are defensive: double-start and orphan-stop never throw', async () => {
    const m = await loadAudio()
    const engine = m.createAudioEngine()
    engine.resume()
    expect(() => {
      engine.startLoop('saucer')
      engine.startLoop('saucer')
      engine.stopLoop('saucer')
      engine.stopLoop('saucer')
      engine.stopLoop('track')
    }).not.toThrow()
  })
})

// --- review rework: the hum's real off-switch (rejection finding 2) ----------

describe('stopEngine — actual silence, not an argument value', () => {
  // engineParams(0) is DELIBERATELY audible (in-run idle). Out-of-run silence
  // therefore needs its own affordance: stopEngine() drives the hum's gain to
  // an actual 0. Pinned after the review rejection: "silence outside playing"
  // must be an audible fact.
  it('exists on the engine surface', async () => {
    const m = await loadAudio()
    const engine = m.createAudioEngine()
    expect(typeof engine.stopEngine).toBe('function')
  })

  it('is a harmless no-op before the gate opens and before any hum exists', async () => {
    const m = await loadAudio()
    const engine = m.createAudioEngine()
    expect(() => engine.stopEngine()).not.toThrow()
    expect(FakeAudioContext.instances).toHaveLength(0)
    engine.resume()
    expect(() => engine.stopEngine()).not.toThrow() // resumed, but no hum built yet
  })

  it('drives the hum gain to a real 0 — no gain param ever saw 0 before it', async () => {
    const m = await loadAudio()
    const engine = m.createAudioEngine()
    engine.resume()
    engine.setEngine(0.7)
    expect(allGainValues(), 'staging: nothing sets a 0 gain before the stop').not.toContain(0)
    engine.stopEngine()
    expect(allGainValues()).toContain(0)
  })

  it('is idempotent, and a later setEngine brings the hum back at the right params', async () => {
    const m = await loadAudio()
    const engine = m.createAudioEngine()
    engine.resume()
    engine.setEngine(0.7)
    engine.stopEngine()
    expect(() => engine.stopEngine()).not.toThrow()
    engine.setEngine(0.4)
    expect(allFrequencyValues()).toContain(m.engineParams(0.4).frequency)
    const gains = allGainValues()
    expect(gains[gains.length - 1], 'the hum must end AUDIBLE again').toBe(m.engineParams(0.4).gain)
  })
})

// --- review rework: fake-fidelity guards (analyzer findings) -----------------

describe('engine internals the old fakes could not see (review rework guards)', () => {
  it('every repeat resume() nudges the context — never inert after construction', async () => {
    const m = await loadAudio()
    const engine = m.createAudioEngine()
    engine.resume()
    engine.resume()
    engine.resume()
    expect(FakeAudioContext.instances).toHaveLength(1)
    // Each gesture must reach ctx.resume() — a suspended tab depends on it.
    expect(FakeAudioContext.instances[0].resumeCalls).toBeGreaterThanOrEqual(3)
  })

  it('double startLoop builds NO second voice — node count is flat', async () => {
    const m = await loadAudio()
    const engine = m.createAudioEngine()
    engine.resume()
    engine.startLoop('saucer')
    const after1 = FakeAudioContext.instances[0].oscillators.length
    engine.startLoop('saucer')
    expect(FakeAudioContext.instances[0].oscillators.length, 'a doubled warble is audible').toBe(after1)
    engine.stopLoop('saucer')
    engine.startLoop('saucer')
    expect(FakeAudioContext.instances[0].oscillators.length, 'stop→start builds a fresh voice').toBeGreaterThan(after1)
  })

  it('the hum oscillator is a SINGLETON across setEngine calls — no 60 Hz node leak', async () => {
    const m = await loadAudio()
    const engine = m.createAudioEngine()
    engine.resume()
    engine.setEngine(0.2)
    const afterFirst = FakeAudioContext.instances[0].oscillators.length
    engine.setEngine(0.5)
    engine.setEngine(0.9)
    engine.setEngine(0.1)
    expect(FakeAudioContext.instances[0].oscillators.length).toBe(afterFirst)
  })
})

describe('constructor resolution branches (review rework guards)', () => {
  it('falls back to the webkit-prefixed constructor when AudioContext is absent', async () => {
    vi.stubGlobal('AudioContext', undefined)
    const m = await loadAudio()
    const engine = m.createAudioEngine()
    engine.resume()
    expect(FakeAudioContext.instances, 'legacy Safari path must still build').toHaveLength(1)
  })

  it('with no WebAudio at all, the game runs silent forever — no throw, no context', async () => {
    vi.stubGlobal('AudioContext', undefined)
    vi.stubGlobal('webkitAudioContext', undefined)
    const m = await loadAudio()
    const engine = m.createAudioEngine()
    expect(() => {
      engine.resume()
      engine.play('cannon')
      engine.startLoop('track')
      engine.stopLoop('track')
      engine.setEngine(0.5)
      engine.stopEngine()
      engine.resume()
    }).not.toThrow()
    expect(FakeAudioContext.instances).toHaveLength(0)
  })
})

// --- lang-review #1 static scan on the new shell surface ---------------------

describe('shell audio modules keep the type system honest (lang-review #1)', () => {
  const shellDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'shell')

  it.each(['audio.ts', 'audio-dispatch.ts'])('%s has no type-safety escapes', (file) => {
    // Pre-GREEN these files don't exist — the read failure IS the red.
    const source = readFileSync(join(shellDir, file), 'utf8')
    // SH2-18: word-boundary, not a raw substring. `toContain('as any')` false-positives on
    // ordinary English — "h(as any)one", "w(as any)" — and cost a real cycle when a header
    // comment reading "no other cabinet has any use for them" tripped it. The rule is about
    // the CAST `as any`, so anchor it like arcade-shared's source-rules tests already do.
    expect(source, `${file}: no "as any" cast`).not.toMatch(/\bas any\b/)
    expect(source, `${file}: no double-cast bypass`).not.toMatch(/\bas\s+unknown\s+as\b/)
    expect(source, `${file}: no @ts-ignore`).not.toContain('@ts-ignore')
    expect(source, `${file}: no ": Function" type`).not.toMatch(/:\s*Function\b/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SH2-18 — the NO-THROW CONTRACT (adopted from @shared/synth)
// ─────────────────────────────────────────────────────────────────────────────
//
// These are NEW BEHAVIOUR, not a regression guard. Battlezone's engine does not have
// this contract today: it has no `live()` (a closed context is not treated as absent),
// no `guard()` (no try/catch around WebAudio effects), no try/catch around
// `new Ctor()`, and a bare `void ctx.resume()` with no `.catch()`. Red Baron gained
// all four in its rb2-11 review round; battlezone never had that round. Adopting the
// shared synthesis skeleton hands battlezone the contract it is missing — that is the
// POINT of SH2-18, not a side effect.
//
// Why it matters at runtime: a browser may CLOSE the AudioContext out from under the
// game (iOS reclaiming audio under memory pressure, a long-backgrounded tab). Every
// createOscillator/createGain/createBufferSource then throws InvalidStateError
// SYNCHRONOUSLY. Those calls run inside main.ts's frame() — ABOVE the
// requestAnimationFrame(frame) re-schedule — so an escaping exception does not merely
// mute the tank, it FREEZES rendering and input. Sound may die; the game never does.
//
// The fake above was upgraded to express exactly this (close() really closes; the
// factories throw when closed; resume() rejects when closed). Until Dev adopts the
// shared skeleton these FAIL — and that failure is the bug, reproduced.

describe('SH2-18 — a CLOSED AudioContext degrades to silence, never a freeze', () => {
  it('every public method may be hammered on a closed context without throwing', async () => {
    const m = await loadAudio()
    const engine = m.createAudioEngine()
    engine.resume()
    await FakeAudioContext.instances[0].close()

    expect(() => {
      engine.resume()
      engine.play('cannon')
      engine.play('explosion')
      engine.startLoop('saucer')
      engine.startLoop('track')
      engine.stopLoop('saucer')
      engine.stopLoop('track')
      engine.setEngine(0.5)
      engine.stopEngine()
    }, 'a closed context must silence the tank, not freeze the frame loop').not.toThrow()
  })

  it('builds no nodes into a closed context — it is treated as ABSENT, not as live', async () => {
    const m = await loadAudio()
    const engine = m.createAudioEngine()
    engine.resume()
    const ctx = FakeAudioContext.instances[0]
    await ctx.close()

    const before = ctx.oscillators.length + ctx.gains.length + ctx.sources.length
    engine.play('cannon')
    engine.startLoop('saucer')
    engine.setEngine(1)
    const after = ctx.oscillators.length + ctx.gains.length + ctx.sources.length

    // Catching the throw is not enough: the engine must KNOW the context is dead and
    // not even attempt to build into it (a `live()` state === 'closed' check).
    expect(after, 'a dead context must not be built into at all').toBe(before)
  })

  it('resume() on a closed context does not leak an unhandled rejection', async () => {
    // The real AudioContext.resume() REJECTS on a closed context. `void ctx.resume()`
    // with no `.catch()` — what src/shell/audio.ts writes today — surfaces that as an
    // unhandled rejection.
    const rejections: unknown[] = []
    const onUnhandled = (reason: unknown) => rejections.push(reason)
    process.on('unhandledRejection', onUnhandled)
    try {
      const m = await loadAudio()
      const engine = m.createAudioEngine()
      engine.resume()
      await FakeAudioContext.instances[0].close()
      engine.resume() // → ctx.resume() on a closed context → rejects
      await new Promise((r) => setTimeout(r, 0))
    } finally {
      process.off('unhandledRejection', onUnhandled)
    }
    expect(rejections, 'resume() must .catch() the closed-context rejection').toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SH2-18 review round 2 — the HUM must survive a context recovery
// ─────────────────────────────────────────────────────────────────────────────
//
// Round 1's recovery fix cleared the shared engine's voice registry, so saucer/track come
// back after the browser closes the context. But the engine hum is NOT a registry voice —
// its oscillator free-runs and its GAIN is the on/off switch, so it lives in a local
// `humOsc`/`humGain` slot built once behind an `if (humOsc === null)` gate.
//
// After a recovery those refs are still non-null, pointing at nodes on the DEAD context.
// The gate never re-fires, so the hum is silent for the rest of the session while the
// other voices return — a HALF recovery, which is nastier than none because it looks like
// it works. The shared engine now announces a rebuild (`onRebuild`) and the cabinet drops
// its stale references.

describe('SH2-18 (round 2) — the engine hum comes back after a context recovery', () => {
  it('setEngine rebuilds the hum on the NEW context after close + resume', async () => {
    const m = await loadAudio()
    const engine = m.createAudioEngine()
    engine.resume()
    engine.setEngine(0.5)

    const ctxA = FakeAudioContext.instances[0]
    expect(ctxA.oscillators.length, 'the hum exists on the first context').toBeGreaterThan(0)

    await ctxA.close() // iOS reclaims audio / the tab was backgrounded
    engine.resume() // the player touches the controls again → recovery
    expect(FakeAudioContext.instances.length, 'a fresh context was built').toBe(2)

    engine.setEngine(0.7) // the tank is moving again
    const ctxB = FakeAudioContext.instances[1]
    expect(
      ctxB.oscillators.length,
      'the hum MUST be rebuilt on the live context — otherwise the tank is silent forever',
    ).toBeGreaterThan(0)
  })

  it('the recovered hum still tracks the throttle', async () => {
    const m = await loadAudio()
    const engine = m.createAudioEngine()
    engine.resume()
    engine.setEngine(0.2)
    await FakeAudioContext.instances[0].close()
    engine.resume()

    engine.setEngine(1)
    const ctxB = FakeAudioContext.instances[1]
    const p = m.engineParams(1)
    const freqs = ctxB.oscillators.flatMap((o) => o.frequency.values)
    expect(freqs, 'the recovered hum is driven by the same curve as before').toContain(p.frequency)
  })

  it('the loops come back too — the whole cabinet recovers, not half of it', async () => {
    const m = await loadAudio()
    const engine = m.createAudioEngine()
    engine.resume()
    engine.startLoop('saucer')
    await FakeAudioContext.instances[0].close()
    engine.resume()

    engine.startLoop('saucer')
    const ctxB = FakeAudioContext.instances[1]
    expect(ctxB.oscillators.length, 'the saucer warble is rebuilt on the live context').toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SH2-22 — the engine hum is a self-healing PERSISTENT VOICE, not a hand-held node
//
// SH2-18 recovered the hum by having the cabinet null its own `let humOsc | null` /
// `let humGain | null` slots inside a `synth.onRebuild(...)` callback. That worked, but it
// was ADVISORY: the next cabinet (or a careless edit here) that adds an out-of-registry
// node and forgets the reset silently ships the half-recovery trap again — the reviewer's
// #13 sweep, not the test suite, is what caught it in SH2-18.
//
// SH2-22 makes it STRUCTURAL (design fork → Option A, engine-owned persistent voices):
// the hum becomes a `synth.persistentVoice(build)` handle. The cabinet no longer holds the
// oscillator/gain, and no longer registers an onRebuild reset — the engine rebuilds the
// controller on every recovery. These are source-rule guards on the TRAP'S SIGNATURE:
// they go red the moment the raw-node-behind-a-null-gate pattern reappears in this file.
//
// The behavioural recovery tests above ('setEngine rebuilds the hum on the NEW context',
// 'the recovered hum still tracks the throttle') are the runtime proof the migration
// actually works; these guards prove it was done the STRUCTURAL way, not re-patched by hand.
// ─────────────────────────────────────────────────────────────────────────────

describe('SH2-22 — the hum is engine-owned, not a cabinet-held node', () => {
  const audioSrc = () =>
    readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'shell', 'audio.ts'), 'utf8')

  it('holds NO nullable WebAudio node as cabinet state — that is the footgun signature', () => {
    const src = audioSrc()
    // `let humOsc: OscillatorNode | null` and friends ARE the trap: a raw node the engine
    // cannot see or reset, behind an `=== null` build gate that a recovery leaves pointing
    // at a dead context. Under Option A the engine holds the nodes inside persistentVoice;
    // the cabinet holds only the opaque handle. Anchored to the declaration form, not a
    // fuzzy substring (SH2-18 lesson: raw `.toContain` scans false-positive and go vacuous).
    const nullableNodeDecl =
      /\b(?:let|var)\s+\w+\s*:\s*(?:OscillatorNode|GainNode|AudioBufferSourceNode|BiquadFilterNode|AudioNode)\s*\|\s*null\b/g
    const offenders = src.match(nullableNodeDecl) ?? []
    expect(
      offenders,
      `nullable WebAudio node held as cabinet state re-opens the half-recovery trap: ${offenders.join(', ')}`,
    ).toEqual([])
  })

  it('registers NO manual synth.onRebuild — the engine owns the rebuild now', () => {
    const src = audioSrc()
    // With persistentVoice the reset is the ENGINE's job. A hand-rolled onRebuild here means
    // the cabinet is still juggling a raw node it has to remember to drop — Option B, which
    // the story rejected. (Retired from the shared surface too; see synth-source-rules.)
    expect(src, 'the cabinet must not hand-roll a rebuild reset').not.toMatch(/\.onRebuild\s*\(/)
  })

  it('drives its continuous hum through synth.persistentVoice', () => {
    const src = audioSrc()
    // The positive assertion: the hum is a registry-managed, self-healing voice. Without
    // this a cabinet could pass the two negative guards simply by deleting the hum.
    expect(src, 'the engine hum must be a persistentVoice, not a hand-held oscillator').toMatch(
      /\.persistentVoice\s*[<(]/,
    )
  })
})
