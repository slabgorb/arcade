// src/shell/timebase.ts
//
// Story pm1-3 (GREEN) — the sim tick, copied from centipede's
// src/shell/timebase.ts `pumpFrame` shape (itself wrapping @shared/loop's
// asteroids-corrected fixed-timestep accumulator). Pac-Man's game logic runs
// on the board's 60 Hz vertical-blank interrupt (brief.md "CPU / timebase"),
// ONE sim step per video frame — never once per requestAnimationFrame, which
// would run the sim at display refresh rate instead (a 120 Hz panel would
// double speed).

import { advanceFixedSteps } from '@shared/loop'

export const FRAME_HZ = 60
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
