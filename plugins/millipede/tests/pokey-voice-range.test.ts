// tests/pokey-voice-range.test.ts
//
// Story ml7-7 — the POKEY-voice sweep must land in the Web-Audio nominal range.
//
// ml6-2's AC3 playtest heard the sweep clamp: audfToHz(0) = 63920 / 2 = 31960 Hz
// (beetle/explosion/inchworm/bonus-life all reach AUDF 0), and Web Audio pins an
// oscillator to Nyquist (24 kHz at a 48 kHz sampleRate) and warns once per step.
// The fix is a proper POKEY→Hz SCALE (POKEY_CLOCK_HZ / audfToHz in pokey-voice.ts),
// NOT a per-step clamp: a clamp flattens the top of the sweep, and "THE SWEEP IS
// THE SOUND" (ml6-1 playbook §4). These are PURE tests over the schedule — no
// AudioContext — matching the module's node-testable contract.

import { describe, it, expect } from 'vitest'
import { pokeyVoiceSchedule } from '../src/shell/pokey-voice'
import { EFFECT_NAMES, freqSweep } from '../src/shell/sound-rom'

// Fixed Web-Audio reference points (facts, not tunables):
const NYQUIST_48K = 24000 // sampleRate 48000 / 2 — the hard clamp ceiling
const AUDIBLE_CEILING_HZ = 20000 // top of human hearing — the "nominal audible" target (AC1)

/** Every non-empty CHAN slot paired with its playable freq/gain steps. */
const slotSchedules = () =>
  EFFECT_NAMES.map((name, index) => ({ name, index, sched: pokeyVoiceSchedule(index) })).filter(
    (s) => s.sched.steps.length > 0,
  )

describe('ml7-7 pokey-voice sweep — Web-Audio nominal frequency range', () => {
  // Guard the enumeration itself: if no real multi-step sweeps are covered, the
  // ceiling assertions below would pass vacuously.
  it('enumerates the real multi-step sweep slots (non-vacuous)', () => {
    const slots = slotSchedules()
    expect(slots.length).toBeGreaterThanOrEqual(4)
    expect(slots.some((s) => s.sched.steps.length > 4)).toBe(true)
  })

  // AC1 — no step above the audible ceiling (~20 kHz).
  it('AC1: every step of every slot stays within the audible ceiling (~20 kHz)', () => {
    const over = slotSchedules().flatMap(({ name, sched }) =>
      sched.steps
        .map((s) => s.freq)
        .filter((f) => f > AUDIBLE_CEILING_HZ)
        .map((f) => `${name}:${f.toFixed(0)}Hz`),
    )
    expect(over, `steps above ${AUDIBLE_CEILING_HZ} Hz: [${over.join(', ')}]`).toEqual([])
  })

  // AC3 — nothing at/above Nyquist for a 48 kHz context, so the browser never
  // clamps and never warns.
  it('AC3: no step reaches Nyquist for a 48 kHz context (no browser clamp/warn)', () => {
    const clamped = slotSchedules().flatMap(({ name, sched }) =>
      sched.steps
        .filter((s) => s.freq >= NYQUIST_48K)
        .map((s) => `${name}:${s.freq.toFixed(0)}Hz`),
    )
    expect(clamped, `steps ≥ Nyquist(${NYQUIST_48K} Hz): [${clamped.join(', ')}]`).toEqual([])
  })

  // AC2 — the RELATIVE sweep shape survives. A faithful rescale is a single
  // constant factor over the whole schedule, so every step's ratio to the slot's
  // first step must equal the raw-AUDF ideal ratio. This is clock-independent:
  // POKEY pitch ∝ 1/(2*(AUDF+1)), so the constant clock cancels in the ratio.
  // A per-step CLAMP (min(freq, ceiling)) flattens the top and breaks this — the
  // exact wrong fix this guard rejects.
  //
  // NOTE: this PASSES on the current code (today's map already is a pure constant
  // scale) — it is a regression guard, green now, that a naive clamp fix reddens.
  it('AC2: relative sweep shape (inter-step ratios) is preserved, not clamped', () => {
    const idealPitch = (audf: number) => 1 / (2 * (audf + 1))
    for (const { name, index, sched } of slotSchedules()) {
      const audfs = freqSweep(index)
      expect(sched.steps.length, `${name}: step/AUDF length mismatch`).toBe(audfs.length)
      const f0 = sched.steps[0].freq
      const a0 = audfs[0]
      sched.steps.forEach((step, i) => {
        const actualRatio = step.freq / f0
        const idealRatio = idealPitch(audfs[i]) / idealPitch(a0)
        expect(
          actualRatio,
          `${name} step ${i} (AUDF ${audfs[i]}): ratio ${actualRatio.toFixed(4)} ≠ ideal ${idealRatio.toFixed(4)} — sweep shape not preserved`,
        ).toBeCloseTo(idealRatio, 5)
      })
    }
  })
})
