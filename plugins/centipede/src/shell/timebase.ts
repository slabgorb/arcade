// src/shell/timebase.ts
//
// Story cp1-6 (GREEN, Julia) — the demo loop's PACING POLICY, a pure
// node-testable unit. EPIC RULING (claims/02-timebase.json, TB-1): the game
// logic runs ONE sim step per VIDEO frame at FRAME_HZ = 15750/263 = 59.88593 Hz
// — NOT once per DISPLAY frame. The cp1-1 skeleton stepped per
// requestAnimationFrame, which the cp1-1 Reviewer flagged: a 120 Hz panel would
// run the sim at 2x. stepsForElapsed is the fixed-timestep accumulator that
// fixes it — its step count depends only on elapsed WALL time, so a 60/120/144
// Hz display all feed the same number of sim steps.
//
// MAME hedges 262 vs 263 (open-question 1) — FRAME_HZ stays a single named
// constant so a later correction is one line.
//
// Wraps @shared/loop's advanceFixedSteps (the asteroids-corrected form,
// SH-5) rather than re-deriving the same accumulator arithmetic.

import { advanceFixedSteps } from '@shared/loop'

export const FRAME_HZ = 15750 / 263
export const FRAME_DT = 1 / FRAME_HZ

export interface StepsResult {
  steps: number
  acc: number
}

/** Fold `elapsed` wall-seconds into `acc` and report how many whole FRAME_DT
 *  sim steps that produced, plus the leftover carry (always in [0, FRAME_DT)).
 *  A huge elapsed span (a backgrounded tab) is clamped by advanceFixedSteps'
 *  own spiral-of-death guard before folding. */
export function stepsForElapsed(acc: number, elapsed: number): StepsResult {
  let steps = 0
  const nextAcc = advanceFixedSteps(acc, elapsed, FRAME_DT, () => {
    steps += 1
  })
  return { steps, acc: nextAcc }
}

// Story cp2-2 (GREEN, Julia) — R1 carry-forward from the cp1-6 review: the old
// demo loop sample()d the input adapters ONCE per rAF frame and reused that
// sample across every sim sub-step, dropping deltas on 0-step frames (>60 Hz
// displays) and replaying a single flick across an entire catch-up burst. The
// fix is a per-STEP sampling seam: pumpFrame drains `sampleStep()` and applies
// it via `step()` once per sim step (never on a 0-step frame), so a device
// delta accumulated in a shell input adapter is consumed exactly once.

/** Pump one display frame through the fixed-timestep accumulator, calling
 *  `step(sampleStep())` once per resulting sim step — never on a 0-step
 *  frame. Returns the updated accumulator carry. */
export function pumpFrame<Input>(
  acc: number,
  elapsed: number,
  sampleStep: () => Input,
  step: (input: Input) => void,
): number {
  return advanceFixedSteps(acc, elapsed, FRAME_DT, () => step(sampleStep()))
}
