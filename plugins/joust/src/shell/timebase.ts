// src/shell/timebase.ts
//
// Story jt1-1 (GREEN, Julia) — the shell side of the boundary. The shell owns
// wall time: it accumulates elapsed seconds and hands the core whole frames,
// so the simulation never reads a clock of its own.
//
// ── SH3-2: why joust keeps this pump and does NOT adopt @shared/loop ─────────
// @shared/loop provides a fixed-timestep accumulator too, but at a hard-coded
// 60 Hz. joust does not run at 60 Hz: `pumpFrames` drains wall time at the ROM's
// own `FRAME_HZ` (core/frame), the cabinet's video rate, and the simulation is
// gated against original source at that cadence. Adopting @shared/loop would swap
// the NUMBER (the frame period) for a rounded 60, which is exactly what the SH3
// epic forbids — "share the VERB, not the NUMBERS; per-cabinet exotic ROM
// timebases stay in the games." So the accumulator VERB is identical but the rate
// is joust's own: the shared loop is NOT adoptable here, and this pump stays. Only
// the boot-time canvas MOUNT was shared (@shared/host-helpers.mountCanvas, main.ts).

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
