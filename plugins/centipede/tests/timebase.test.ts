// tests/timebase.test.ts
//
// Story cp1-6 — RED phase (O'Brien / TEA). The demo loop's PACING POLICY, made a
// pure node-testable unit. src/shell/timebase.ts does not exist yet — RED.
//
// EPIC RULING (context-epic-cp1, TB-1 = claims/02-timebase.json): the game logic
// runs ONE sim step per VIDEO frame at FRAME_HZ = 15750/263 = 59.88593 Hz — NOT
// once per DISPLAY frame. The cp1-1 skeleton stepped per requestAnimationFrame,
// which the cp1-1 Reviewer flagged: on a 120 Hz panel that runs the sim at 2×.
// The fix is a fixed-timestep accumulator whose step count depends only on elapsed
// WALL time, so a 60/120/144 Hz display all feed the SAME number of sim steps.
//
// MAME hedges 262 vs 263 (open-question 1) — FRAME_HZ must stay a single named
// constant so a later correction is one line.

import { describe, it, expect } from 'vitest'
import { FRAME_HZ, FRAME_DT, stepsForElapsed } from '../src/shell/timebase'

/** Feed `seconds` of wall-time to the accumulator in `frames` equal chunks (a
 *  display running at frames/seconds Hz) and return the total sim steps emitted. */
function totalSteps(seconds: number, frames: number): number {
  const chunk = seconds / frames
  let acc = 0
  let steps = 0
  for (let i = 0; i < frames; i++) {
    const r = stepsForElapsed(acc, chunk)
    steps += r.steps
    acc = r.acc
  }
  return steps
}

describe('cp1-6 timebase — the cited video-frame rate', () => {
  it('FRAME_HZ is 15750/263 = 59.88593 Hz (TB-1)', () => {
    expect(FRAME_HZ).toBeCloseTo(15750 / 263, 5)
  })
  it('FRAME_DT is the reciprocal (seconds per sim step)', () => {
    expect(FRAME_DT).toBeCloseTo(1 / FRAME_HZ, 9)
    expect(FRAME_DT).toBeCloseTo(0.016698, 5)
  })
})

describe('cp1-6 timebase — display-refresh INVARIANCE (the cp1-1 reviewer fix)', () => {
  const SECONDS = 1
  const analytic = Math.floor(SECONDS / FRAME_DT) // ≈ 59 steps in one second

  it('one second at 60 / 120 / 144 Hz all feed the same sim-step count (±1 FP slack)', () => {
    const s60 = totalSteps(SECONDS, 60)
    const s120 = totalSteps(SECONDS, 120)
    const s144 = totalSteps(SECONDS, 144)
    expect(Math.abs(s60 - s120)).toBeLessThanOrEqual(1)
    expect(Math.abs(s120 - s144)).toBeLessThanOrEqual(1)
    for (const s of [s60, s120, s144]) expect(Math.abs(s - analytic)).toBeLessThanOrEqual(1)
  })

  it('the sim does NOT run once per display frame (120 Hz != 120 steps — the bug)', () => {
    const s120 = totalSteps(1, 120)
    const s144 = totalSteps(1, 144)
    expect(s120, 'a per-rAF stepper would emit ~120 here').toBeLessThan(70)
    expect(s144, 'a per-rAF stepper would emit ~144 here').toBeLessThan(70)
  })
})

describe('cp1-6 timebase — accumulator arithmetic', () => {
  it('emits no step until a whole dt has accrued, then carries the remainder', () => {
    const half = stepsForElapsed(0, FRAME_DT / 2)
    expect(half.steps).toBe(0)
    expect(half.acc).toBeCloseTo(FRAME_DT / 2, 9)
    const rest = stepsForElapsed(half.acc, FRAME_DT / 2 + FRAME_DT / 100)
    expect(rest.steps, 'two ~half-dt chunks make exactly one step').toBe(1)
    expect(rest.acc, 'carry stays in [0, dt)').toBeGreaterThanOrEqual(0)
    expect(rest.acc).toBeLessThan(FRAME_DT)
  })

  it('a multi-dt span emits multiple steps in one call', () => {
    const r = stepsForElapsed(0, FRAME_DT * 3 + FRAME_DT / 3)
    expect(r.steps).toBe(3)
    expect(r.acc).toBeLessThan(FRAME_DT)
  })

  it('clamps a huge elapsed (backgrounded tab) — no spiral of death', () => {
    // 100 s would be ~5988 steps unclamped; a spiral-of-death guard must cap it.
    const r = stepsForElapsed(0, 100)
    expect(r.steps, 'catch-up is clamped far below the unclamped 5988').toBeLessThan(100)
  })
})
