// src/shell/frame-clock.ts
//
// Story ml7-5 — the FIXED-TIMESTEP clock. The millipede ROM MAIN loop is
// VBLANK-synced 60 Hz (MILLI.MAC:11-48 "LSR SYNC / BCC 1$ ;WAIT FOR IRQ TO GET TO
// VBLANK"; MLDEF.MAC:31 "IRQ 4 PER FRAME (1 IN VBLANK)"; MLSUB.MAC:1908 ";1 MINUTE
// AT 60HZ") and MOTION advances every frame — so the sim's logic rate is 60 Hz.
// main.ts used to step stepGame once per requestAnimationFrame, so on a display
// whose rAF exceeds 60 Hz the sim ran faster than the arcade. This module folds
// real elapsed time into a whole number of fixed 60 Hz steps, carrying the
// remainder, so the sim rate is decoupled from the render/refresh rate.
//
// SHELL, and deliberately clock-free itself: the elapsed time is an ARGUMENT, not
// a wall-clock read — the pure core stays deterministic and this stays unit-tested
// (tests/frame-clock.test.ts) without a browser. THE fix's real arbiter is the AC3
// browser playtest on the actual display.

/** The ROM logic rate: the VBLANK-synced MAIN loop runs 60x/second. */
export const LOGIC_HZ = 60

/** Milliseconds per fixed sim step (one 60 Hz frame ≈ 16.667 ms). */
export const STEP_MS = 1000 / LOGIC_HZ

/** Spiral-of-death guard: the most sim steps one rAF may run. A backgrounded tab
 *  can hand back a multi-second elapsed; without this the catch-up loop would run
 *  hundreds of steps and freeze the frame. We cap and drop the backlog instead. */
export const MAX_CATCHUP_STEPS = 5

/** How many fixed steps are due, and the sub-step time to carry to the next call. */
export interface FixedStepResult {
  steps: number
  remainderMs: number
}

/**
 * Fold `elapsedMs` of real time into whole 60 Hz steps.
 *
 * Returns the number of `stepGame` calls due this frame and the leftover time to
 * bank into the next call's accumulator. A non-positive `elapsedMs` (zero delta or
 * a backwards clock) contributes no time. When the backlog would exceed
 * `MAX_CATCHUP_STEPS` the excess is dropped (steps clamped, remainder reset) so a
 * long stall can never trigger a spiral of steps.
 */
export function advanceFixedSteps(accumulatorMs: number, elapsedMs: number): FixedStepResult {
  const dt = elapsedMs > 0 ? elapsedMs : 0
  const total = accumulatorMs + dt
  const due = Math.floor(total / STEP_MS)

  if (due <= 0) return { steps: 0, remainderMs: total }
  if (due > MAX_CATCHUP_STEPS) return { steps: MAX_CATCHUP_STEPS, remainderMs: 0 }

  return { steps: due, remainderMs: total - due * STEP_MS }
}
