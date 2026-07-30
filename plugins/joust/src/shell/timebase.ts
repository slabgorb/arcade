// src/shell/timebase.ts
//
// Story jt1-1 (GREEN, Julia) — the shell side of the boundary. The shell owns
// wall time: it accumulates elapsed seconds and hands the core whole frames,
// so the simulation never reads a clock of its own.

import { FRAME_HZ } from '../core/frame'

const SECONDS_PER_FRAME = 1 / FRAME_HZ

/**
 * Drain an elapsed-time accumulator into whole simulation steps, calling
 * `step` once per frame owed. Returns the leftover accumulator.
 */
export function pumpFrames(
  accumulator: number,
  elapsedSeconds: number,
  step: () => void,
): number {
  let acc = accumulator + elapsedSeconds
  while (acc >= SECONDS_PER_FRAME) {
    acc -= SECONDS_PER_FRAME
    step()
  }
  return acc
}
