// src/shell/timebase.ts
//
// Story mc2-3 (GREEN, Yoda) — the sim tick, pinned. This is the TIME UNIT every
// later velocity and enemy-descent speed (mc3) is expressed in, so it lives in the
// shell (which owns the clock) rather than being an implicit "60 fps" assumption in
// the rAF loop.
//
// Derived from the REV-01 source and MAME's board model — full working in
// docs/rom-study/timebase.md (open question O-2, resolved). One game-logic step runs
// per video frame, released by the VBLANK interrupt (W3INT `INC SYNC`) and counted by
// `FRAME` (`INC FRAME`, W3MAIN.MAC:781; `FRAME COUNTER (1-60)`, :239). The field runs
// at the board's VSYNC ≈ 61.0076 Hz (missile.cpp:58); the ROM treats it as nominal 60
// (`UPDATE EVERY 4/60 SEC`, W3MAIN.MAC:623). NOT one tick per IRQ — the board raises 4
// IRQs/frame and only the VBLANK one advances the frame.

/**
 * Exact game-logic tick rate, in ticks per second: one sim step per video frame at
 * the board's true VSYNC. Use this for any timer/velocity math (missile.cpp:58).
 */
export const TICK_HZ = 61.0076

/**
 * The round fallback the ROM itself uses for sub-second timing — the `FRAME` counter
 * wraps 1..60 (W3MAIN.MAC:239). Prefer {@link TICK_HZ} for fidelity; this is the
 * nominal 60 for readability and coarse "N seconds = N*60 frames" reasoning.
 */
export const NOMINAL_TICK_HZ = 60

/** Seconds of wall-clock advanced by one sim tick (one video frame). */
export const SECONDS_PER_TICK = 1 / TICK_HZ
