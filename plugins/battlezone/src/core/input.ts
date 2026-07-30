// src/core/input.ts
//
// Story bz1-4 — the abstract per-frame input the pure core consumes for tank
// movement. The shell maps physical devices (the cabinet's dual joysticks, or a
// keyboard) into this shape; the core NEVER reads a device directly (the epic's
// non-negotiable core/shell boundary). Battlezone's cabinet is a two-stick
// dual-tread control — each tread is an independent forward/back axis.
//
// Story bz1-5 EXTENDED this with the `fire` axis (the cabinet's thumb trigger) —
// the non-breaking add the bz1-4 header foretold.
//
// Story bz1-10 EXTENDED it again with `start` — the one-shot run trigger the
// framing state machine consumes (attract → playing). The shell owns the
// EDGE: it latches the key press and hands the core a single true frame (the
// sibling pendingStart pattern), so the core treats `start` as an event.
// Optional so every pre-bz1-10 Input literal stays valid.
//
// Story bz2-4 EXTENDED it once more with `fineAim` — a held precision modifier.
// The keyboard only ever drives the treads to ±1, so every turn is the full ROM
// pivot rate and the aim skips past a distant target; when `fineAim` is held the
// core scales the yaw down (movement.FINE_AIM_TURN_SCALE) for fine aiming. A
// LEVEL read (like the treads), not an edge. Optional so every earlier Input
// literal stays valid.
//
// PURE data. No DOM, no time, no randomness.

/** One frame of tank control: the two tread axes plus the fire trigger. */
export interface Input {
  /** Left tread, normalised to [-1, 1] (+1 = full forward, -1 = full back). */
  readonly leftTread: number
  /** Right tread, normalised to [-1, 1] (+1 = full forward, -1 = full back). */
  readonly rightTread: number
  /** Fire trigger held this frame — the cabinet's cannon button (bz1-5). */
  readonly fire: boolean
  /** One-shot start trigger (bz1-10) — edge-latched by the shell; absent = false. */
  readonly start?: boolean
  /**
   * Fine-aim modifier (bz2-4) — held precision key. When true the core scales
   * the tank's yaw rate down (movement.FINE_AIM_TURN_SCALE) for fine aiming;
   * forward drive is unaffected. Optional so every pre-bz2-4 Input literal stays
   * valid; absent = coarse (full turn rate).
   */
  readonly fineAim?: boolean
}

/** The neutral frame — both treads idle, trigger released, no fine-aim. */
export const NO_INPUT: Input = { leftTread: 0, rightTread: 0, fire: false, start: false, fineAim: false }
