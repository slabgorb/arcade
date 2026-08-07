// src/core/icbm.ts
//
// Story mc3-1 (GREEN, Yoda) — the enemy ICBM as PURE core data: a warhead that
// launches from a top-edge origin, flies a STRAIGHT line at constant unit speed
// to a ground target (a city or base position), and reports ARRIVAL on impact.
// The mirror of the player abm.ts; the shell never computes geometry.
//
// PURE: plain arithmetic, no clock, no entropy, no browser surface, no shell
// import. The src/core purity sweep (tests/purity.test.ts) scans this file.
//
// ─── SOURCE OF TRUTH (REV-01 W3MAIN.MAC; double-spaced → logical cites) ───────
//   UPDATE ICBM POSITIONS (UPDPOS for enemy warheads) — each tick every live
//     ICBM head advances by its per-ICBM velocity vector toward its ground
//     target; it lands when the head reaches the target. Straight line, constant
//     step. mc3 modelled the SHAPE at unit speed; mc4-1 carries the per-ICBM
//     descent velocity here (from the per-wave schedule, src/core/wave.ts) so the
//     step size ramps by wave instead of the retired hard-coded 1. The velocity
//     defaults to 1 (mc3's unit speed) so existing callers are unchanged; wiring
//     the spawner to launch each wave's ICBMs at waveSchedule(wave).velocity is mc4-4.

export interface Vec {
  readonly h: number
  readonly v: number
}

export interface Icbm {
  readonly origin: Vec
  readonly target: Vec
  readonly pos: Vec
  readonly arrived: boolean
  /** Cabinet units the head advances per tick — the per-wave descent speed. Optional:
   *  a raw Icbm literal that omits it descends at mc3's unit speed (stepIcbm defaults it). */
  readonly velocity?: number
}

/** Launch a warhead from `origin` toward `target` at `velocity` cabinet units/tick
 *  (default 1 — mc3's unit speed): pos = origin, arrived = false. */
export function launchIcbm(origin: Vec, target: Vec, velocity = 1): Icbm {
  return { origin, target, pos: origin, arrived: false, velocity }
}

/**
 * Advance the head ~`icbm.velocity` units along the straight line origin→target.
 * Snaps exactly to the target on arrival, then is idempotent (a parked, arrived
 * ICBM is returned unchanged). Pure — never mutates its input.
 */
export function stepIcbm(icbm: Icbm): Icbm {
  if (icbm.arrived) return icbm
  const velocity = icbm.velocity ?? 1 // unit speed when a literal omits it (mc3 default)
  const dh = icbm.target.h - icbm.pos.h
  const dv = icbm.target.v - icbm.pos.v
  const remaining = Math.hypot(dh, dv)
  if (remaining <= velocity) return { ...icbm, pos: icbm.target, arrived: true }
  const step = velocity / remaining
  const pos = { h: icbm.pos.h + dh * step, v: icbm.pos.v + dv * step }
  return { ...icbm, pos }
}
