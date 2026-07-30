// tests/shell/audio-adoption.test.ts
//
// SH2-18 — battlezone adopts @shared/synth (AC-7).
//
// The fence runs BOTH ways:
//   • The VERB must leave  — no local resolveContextCtor / noiseBuffer / guard / live.
//   • The NUMBERS must stay — engineParams and the cabinet's voices are battlezone's
//     alone and must NOT be pushed up into the shared package. Over-extraction is the
//     failure mode nobody notices until a second game needs a different curve.
//
// ── REVIEW ROUND 1: these tests were VACUOUS and are rebuilt ─────────────────
// The first cut scanned the source as TEXT with un-anchored regexes, and the reviewer
// killed it by mutation:
//   • `expect(src).toMatch(/saucerVoice/)` matched the name in a COMMENT — renaming the
//     real function to `saucerVoiceZZZ` left the suite green.
//   • The "full cabinet surface" check matched the AudioEngine INTERFACE declaration,
//     which sits in the same file. Renaming the returned object's `stopEngine` key — a
//     genuine runtime `TypeError: not a function` — left all six tests passing.
// A test that reads the type and calls it proof of the implementation is theatre.
//
// So: the cabinet SURFACE is now asserted against the real object `createAudioEngine()`
// returns, and every source-text check is anchored to a DECLARATION form (`function foo(`),
// never a bare substring that a comment can satisfy.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createAudioEngine, engineParams } from '../../src/shell/audio'

const audioSrc = () =>
  readFileSync(fileURLToPath(new URL('../../src/shell/audio.ts', import.meta.url)), 'utf8')

describe('SH2-18 — battlezone consumes the shared synthesis skeleton (AC-7)', () => {
  it('imports the engine from @shared/synth', () => {
    expect(audioSrc(), 'battlezone must consume the shared VERB, not re-write it').toMatch(
      /from\s+['"]@shared\/synth['"]/,
    )
  })

  it('no longer hand-writes the engine skeleton', () => {
    const src = audioSrc()
    // Anchored to the DECLARATION form — a mention in prose must not satisfy this.
    const skeleton = [
      { name: 'resolveContextCtor', re: /\bfunction\s+resolveContextCtor\s*\(/ },
      { name: 'noiseBuffer', re: /\bfunction\s+noiseBuffer\s*\(/ },
      { name: 'guard', re: /\bfunction\s+guard\s*\(/ },
      { name: 'live', re: /\bfunction\s+live\s*\(/ },
    ]
    const stillLocal = skeleton.filter((s) => s.re.test(src)).map((s) => s.name)
    expect(
      stillLocal,
      `still hand-written locally instead of imported from @shared/synth: ${stillLocal.join(', ')}`,
    ).toEqual([])
  })

  it('does not build its own AudioContext — the shared engine owns the gesture gate', () => {
    expect(audioSrc(), 'the shared engine owns context construction').not.toMatch(
      /new\s+(AudioContext|Ctor)\s*\(/,
    )
  })
})

describe('SH2-18 — battlezone KEEPS its full cabinet surface (runtime, not source text)', () => {
  // Constructing the engine touches NO AudioContext (that is the gesture gate's whole
  // point), so it is safe to build one in a bare node test and interrogate the real object.
  it('createAudioEngine() returns every method the cabinet had before the extraction', () => {
    const engine = createAudioEngine()
    // Asserted on the RETURNED OBJECT. Renaming any of these keys now fails here, where
    // the old source-text version happily passed while `engine.stopEngine()` threw.
    expect(typeof engine.resume).toBe('function')
    expect(typeof engine.play).toBe('function')
    expect(typeof engine.startLoop).toBe('function')
    expect(typeof engine.stopLoop).toBe('function')
    expect(typeof engine.setEngine).toBe('function')
    // stopEngine is battlezone-only (red-baron has no equivalent) and the easiest to lose.
    expect(typeof engine.stopEngine).toBe('function')
  })

  it('every method is a silent no-op before the gesture gate opens', () => {
    // Proves the methods are really WIRED to the shared engine, not just present as keys:
    // pre-gate there is no context, so every one must degrade silently rather than throw.
    const engine = createAudioEngine()
    expect(() => {
      engine.play('cannon')
      engine.play('explosion')
      engine.startLoop('saucer')
      engine.startLoop('track')
      engine.stopLoop('saucer')
      engine.stopLoop('track')
      engine.setEngine(0.5)
      engine.stopEngine()
    }).not.toThrow()
  })
})

describe('SH2-18 — battlezone KEEPS its NUMBERS (no over-extraction)', () => {
  it('still owns the pure throttle→hum curve, and it still computes', () => {
    // Asserted by BEHAVIOUR, not by grepping for the name: engineParams is battlezone's
    // tuning, and red-baron's hum is a detuned pair on a completely different curve.
    expect(typeof engineParams).toBe('function')
    // 40 Hz at idle (the tank never falls silent) up to 120 Hz flat out; gain 0.12 → 0.30.
    // toBeCloseTo, not toEqual: pinning a float's exact bit pattern makes the test hostage
    // to representation rather than to the curve it means to guard.
    expect(engineParams(0).frequency).toBeCloseTo(40)
    expect(engineParams(0).gain).toBeCloseTo(0.12)
    expect(engineParams(1).frequency).toBeCloseTo(120)
    expect(engineParams(1).gain).toBeCloseTo(0.3)
    // Monotonic in throttle — the curve is the cabinet's, and it must survive intact.
    expect(engineParams(1).frequency).toBeGreaterThan(engineParams(0.5).frequency)
    // Clamped outside [0,1] — a throttle can't drive the hum past its rails.
    expect(engineParams(-5)).toEqual(engineParams(0))
    expect(engineParams(99)).toEqual(engineParams(1))
  })

  it('still owns its cabinet voices as real declarations, not just as comments', () => {
    const src = audioSrc()
    // Anchored: `function saucerVoice(` — a stray mention in prose no longer satisfies it.
    expect(src, 'the visitor’s warble is battlezone’s instrument').toMatch(
      /\bfunction\s+saucerVoice\s*\(/,
    )
    expect(src, 'the tread rattle is battlezone’s instrument').toMatch(
      /\bfunction\s+trackVoice\s*\(/,
    )
    expect(src, 'the noise burst envelope is battlezone’s own').toMatch(
      /\bfunction\s+noiseBurst\s*\(/,
    )
  })

  it('still owns its own sound-name unions', () => {
    const src = audioSrc()
    expect(src).toMatch(/export\s+type\s+SoundName\b/)
    expect(src).toMatch(/export\s+type\s+LoopName\b/)
  })
})
