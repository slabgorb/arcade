// tests/pokey-voice.test.ts
//
// Story ml6-2 — the PURE bridge from the ml6-1 ROM sweep tables to a playable
// tone schedule. sound-rom.ts gives AUDF/AUDC bytes in play order; this turns a
// CHAN slot into a sequence of { freq, gain } steps plus the per-step frame
// cadence (the slot's MASK). THE SWEEP IS THE SOUND — this schedule must MOVE,
// not collapse to one flat beep (the silent-feature trap, playbook §4).

import { describe, it, expect } from 'vitest'
import { pokeyVoiceSchedule, audfToHz, audcToGain } from '../src/shell/pokey-voice'
import { EFFECT_NAMES, MASK, freqSweep } from '../src/shell/sound-rom'

describe('ml6-2 pokey-voice — ROM sweep → tone schedule', () => {
  it('audfToHz falls as AUDF rises (POKEY divisor: bigger divisor = lower pitch)', () => {
    expect(audfToHz(0x10)).toBeGreaterThan(audfToHz(0x80))
    expect(audfToHz(0)).toBeGreaterThan(0)
    expect(Number.isFinite(audfToHz(0))).toBe(true) // AUDF 0 must not divide-by-zero
  })

  it('audcToGain reads the low-nibble volume (0..15) as 0..1, rest = silence', () => {
    expect(audcToGain(0x00)).toBe(0) // a rest
    expect(audcToGain(0xa8)).toBeCloseTo(8 / 15, 5)
    expect(audcToGain(0xaf)).toBeCloseTo(1, 5)
    expect(audcToGain(0xa8)).toBeGreaterThan(audcToGain(0xa3))
  })

  it('the explosion slot (CHAN2) produces a MOVING multi-step schedule', () => {
    const idx = EFFECT_NAMES.indexOf('explosion')
    const sched = pokeyVoiceSchedule(idx)
    expect(sched.steps.length).toBeGreaterThan(4)
    const freqs = sched.steps.map((s) => s.freq)
    // not a flat beep — the frequency actually changes across the sweep
    expect(new Set(freqs).size).toBeGreaterThan(1)
  })

  it('framesPerStep is the slot MASK + 1 (mask is the tempo divider)', () => {
    const idx = EFFECT_NAMES.indexOf('explosion')
    expect(pokeyVoiceSchedule(idx).framesPerStep).toBe(MASK[idx] + 1)
  })

  it('a constant-volume slot (shot, CHAN6) holds one gain across its freq sweep', () => {
    const idx = EFFECT_NAMES.indexOf('shot')
    const sched = pokeyVoiceSchedule(idx)
    expect(sched.steps.length).toBe(freqSweep(idx).length)
    const gains = new Set(sched.steps.map((s) => s.gain))
    expect(gains.size).toBe(1) // constant volume
    expect([...gains][0]).toBeGreaterThan(0)
  })

  it('a program-stuffed slot (dragonfly, CHAN4) yields no table schedule', () => {
    const idx = EFFECT_NAMES.indexOf('dragonfly')
    expect(pokeyVoiceSchedule(idx).steps.length).toBe(0)
  })
})
