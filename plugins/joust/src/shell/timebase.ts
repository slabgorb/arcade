// src/shell/timebase.ts
//
// Story jt1-1 (GREEN, Julia) — the shell side of the boundary. The shell owns
// wall time: it accumulates elapsed seconds and hands the core whole frames,
// so the simulation never reads a clock of its own.
//
// ── SH3-2: whether joust can adopt @shared/loop's accumulator (AC-4) ─────────
// It CAN — and the honest answer is "adoptable, deferred", not "impossible".
// @shared/loop's `advanceFixedSteps(acc, elapsed, dt, step, maxFrame)` takes the
// timestep `dt` as a parameter (and `createLoop(step, render, hz = 60)` takes `hz`
// as a parameter — a default, not a hard-coded rate), so the shared helper runs at
// whatever cadence a caller passes, not a rounded 60. `pumpFrames` below is that
// same arithmetic at joust's own `SECONDS_PER_FRAME = 1/FRAME_HZ` (the ROM's video
// rate, core/frame), and centipede and pac-man already wrap that exact shared
// helper at their own non-60 `FRAME_DT`. So adopting it here would keep joust's
// NUMBER while sharing the VERB — "share the VERB, not the NUMBERS" is satisfied,
// no cadence change. It is simply out of SH3-2's scope (a user ruling narrowed this
// story to the canvas mount); retiring `pumpFrames` onto
// `advanceFixedSteps(acc, elapsed, SECONDS_PER_FRAME, step)` is a clean,
// determinism-neutral follow-up. Only the boot-time canvas MOUNT was shared here
// (@shared/host-helpers.mountCanvas, main.ts).

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
