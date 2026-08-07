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
//     step. mc3 models the SHAPE at unit speed (SPEED = 1); the per-wave
//     enemy-speed table is mc4 difficulty, so no new claimed constant here.

export interface Vec {
  readonly h: number
  readonly v: number
}

export interface Icbm {
  readonly origin: Vec
  readonly target: Vec
  readonly pos: Vec
  readonly arrived: boolean
}

/** Launch a warhead from `origin` toward `target`: pos = origin, arrived = false. */
export function launchIcbm(origin: Vec, target: Vec): Icbm {
  return { origin, target, pos: origin, arrived: false }
}

/**
 * Advance the head ~1 unit along the straight line origin→target. Snaps exactly
 * to the target on arrival, then is idempotent (a parked, arrived ICBM is
 * returned unchanged). Pure — never mutates its input.
 */
export function stepIcbm(icbm: Icbm): Icbm {
  if (icbm.arrived) return icbm
  const dh = icbm.target.h - icbm.pos.h
  const dv = icbm.target.v - icbm.pos.v
  const remaining = Math.hypot(dh, dv)
  if (remaining <= 1) return { ...icbm, pos: icbm.target, arrived: true }
  const pos = { h: icbm.pos.h + dh / remaining, v: icbm.pos.v + dv / remaining }
  return { ...icbm, pos }
}
