// tests/frame-clock.test.ts
//
// Story ml7-5 (RED) — the FIXED-TIMESTEP clock. ml6-2's main.ts steps stepGame
// once per requestAnimationFrame, so on a 120/144 Hz (or uncapped-rAF) display the
// sim runs faster than the ROM. The ROM MAIN loop is VBLANK-synced 60 Hz
// (MILLI.MAC:11-48 "LSR SYNC / BCC 1$ ;WAIT FOR IRQ TO GET TO VBLANK";
// MLDEF.MAC:31 "IRQ 4 PER FRAME (1 IN VBLANK)"; MLSUB.MAC:1908 ";1 MINUTE AT 60HZ")
// and MOTION runs every frame — so the ROM logic rate is 60 Hz, NOT the "~10.4 Hz"
// the story title guessed (see the RED Delivery Finding: 10.4 Hz would run 6x SLOW).
//
// The fix is a PURE accumulator: fold real elapsed time and emit exactly
// floor(accumulator / 16.667 ms) fixed steps, carrying the remainder, clamped
// against the spiral-of-death. This module is deterministic (an injected time
// delta, no wall clock) so the sim stays clock-free and the behaviour is unit-
// testable without a browser. The AC3 real-browser playtest is the liveness arbiter.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import {
  LOGIC_HZ,
  STEP_MS,
  MAX_CATCHUP_STEPS,
  advanceFixedSteps,
} from '../src/shell/frame-clock'

describe('ml7-5 frame-clock — the ROM 60 Hz logic rate', () => {
  it('LOGIC_HZ is the ROM MAIN-loop rate: 60, not the retired ~10.4 Hz premise', () => {
    expect(LOGIC_HZ).toBe(60)
  })

  it('STEP_MS is one 60 Hz frame (~16.667 ms) — decisively NOT a ~96 ms / 10.4 Hz step', () => {
    expect(STEP_MS).toBeCloseTo(1000 / 60, 3) // 16.666…
    // Discriminator against the misdiagnosed 10.4 Hz (≈96 ms/step): a 10.4 Hz
    // clock would be ~6x slower. Prove the step is a 60 Hz frame, not that.
    expect(STEP_MS).toBeLessThan(20)
    expect(1000 / STEP_MS).toBeCloseTo(60, 0)
  })
})

describe('ml7-5 frame-clock — advanceFixedSteps accumulator', () => {
  it('emits 0 steps when less than one step has elapsed, carrying the remainder', () => {
    const r = advanceFixedSteps(0, 8) // 8 ms < 16.667 ms
    expect(r.steps).toBe(0)
    expect(r.remainderMs).toBeCloseTo(8, 6)
  })

  it('emits exactly 1 step for one step-worth of elapsed time', () => {
    const r = advanceFixedSteps(0, STEP_MS)
    expect(r.steps).toBe(1)
    expect(r.remainderMs).toBeCloseTo(0, 6)
  })

  it('emits 2 steps for a 30 fps frame (~33.33 ms) and carries the leftover', () => {
    const r = advanceFixedSteps(0, 2 * STEP_MS + 5)
    expect(r.steps).toBe(2)
    expect(r.remainderMs).toBeCloseTo(5, 6)
  })

  it('accumulates a sub-step remainder across calls until a whole step is due', () => {
    const first = advanceFixedSteps(0, 10) // 10 ms banked, no step yet
    expect(first.steps).toBe(0)
    const second = advanceFixedSteps(first.remainderMs, 10) // 20 ms total ≥ one step
    expect(second.steps).toBe(1)
    expect(second.remainderMs).toBeCloseTo(20 - STEP_MS, 6) // ≈ 3.333 ms
  })

  it('never emits a negative or fractional step count, and never a negative remainder', () => {
    for (const elapsed of [0, 1, STEP_MS, 3 * STEP_MS + 7, 500]) {
      const r = advanceFixedSteps(0, elapsed)
      expect(Number.isInteger(r.steps)).toBe(true)
      expect(r.steps).toBeGreaterThanOrEqual(0)
      expect(r.remainderMs).toBeGreaterThanOrEqual(0)
    }
  })

  it('treats a zero or negative elapsed as no time passed (0 steps)', () => {
    expect(advanceFixedSteps(0, 0).steps).toBe(0)
    expect(advanceFixedSteps(0, -50).steps).toBe(0)
  })
})

describe('ml7-5 frame-clock — display-independence (the actual bug)', () => {
  // Drive the accumulator for one wall-clock second at various rAF cadences and
  // count the sim steps. The whole point of the fix: the step count tracks
  // real time at 60 Hz, NOT the display refresh rate.
  const stepsOverOneSecond = (rafHz: number): number => {
    const perFrameMs = 1000 / rafHz
    let acc = 0
    let steps = 0
    for (let i = 0; i < rafHz; i++) {
      const r = advanceFixedSteps(acc, perFrameMs)
      steps += r.steps
      acc = r.remainderMs
    }
    return steps
  }

  it('a 60 Hz display yields ~60 steps/second (the fix is a no-op here)', () => {
    const steps = stepsOverOneSecond(60)
    expect(steps).toBeGreaterThanOrEqual(59)
    expect(steps).toBeLessThanOrEqual(60)
  })

  it('a 144 Hz display still yields ~60 steps/second — NOT 144 (the 6x-too-fast fix)', () => {
    const steps = stepsOverOneSecond(144)
    expect(steps).toBeGreaterThanOrEqual(59)
    expect(steps).toBeLessThanOrEqual(60)
    expect(steps).toBeLessThan(144) // regression: pre-fix ran one step per rAF
  })

  it('a 240 Hz / uncapped-style display still yields ~60 steps/second', () => {
    const steps = stepsOverOneSecond(240)
    expect(steps).toBeGreaterThanOrEqual(59)
    expect(steps).toBeLessThanOrEqual(60)
  })
})

describe('ml7-5 frame-clock — spiral-of-death guard', () => {
  it('MAX_CATCHUP_STEPS is a small, sane clamp (a real guard, not effectively unbounded)', () => {
    expect(Number.isInteger(MAX_CATCHUP_STEPS)).toBe(true)
    expect(MAX_CATCHUP_STEPS).toBeGreaterThanOrEqual(1)
    expect(MAX_CATCHUP_STEPS).toBeLessThanOrEqual(10)
  })

  it('a long stall (backgrounded tab) clamps catch-up to MAX_CATCHUP_STEPS, not hundreds', () => {
    const r = advanceFixedSteps(0, 100 * STEP_MS) // would be 100 steps unclamped
    expect(r.steps).toBe(MAX_CATCHUP_STEPS)
    expect(r.steps).toBeLessThan(100)
  })
})

describe('ml7-5 frame-clock — wired into the frame loop (built-but-not-wired guard)', () => {
  // The pure module is worthless if main.ts still calls stepGame once per rAF.
  // AC3's real-browser playtest is the true liveness proof; this is the cheap
  // structural backstop so a green unit suite can't hide an unwired accumulator.
  const mainSrc = readFileSync(
    fileURLToPath(new URL('../src/main.ts', import.meta.url)),
    'utf8',
  )

  it('main.ts imports the fixed-timestep accumulator from shell/frame-clock', () => {
    expect(mainSrc).toMatch(/from\s+['"]\.\/shell\/frame-clock['"]/)
    expect(mainSrc).toMatch(/advanceFixedSteps/)
  })
})
