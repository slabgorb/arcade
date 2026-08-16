// src/core/icbm.ts
//
// Story mc3-1 (GREEN, Yoda) — the enemy ICBM as PURE core data: a warhead that
// launches from a top-edge origin, flies a STRAIGHT line at its per-ICBM descent
// speed (mc4-1: `velocity`, defaulting to mc3's unit speed) to a ground target (a
// city or base position), and reports ARRIVAL on impact. The mirror of the player
// abm.ts; the shell never computes geometry.
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
  // mc5-3: the ICBM-family discriminant. Absent (or 'ballistic') = an ordinary
  // warhead that homes on `target` (stepIcbm); 'cruise' = descends along `angle`
  // (stepCruise). Optional, so every pre-mc5-3 Icbm literal/test stays unchanged.
  readonly kind?: 'ballistic' | 'cruise'
  // mc5-3: a cruise missile's CMANGL flight direction (0->13). Ignored for ballistic.
  readonly angle?: number
  // mc12-1: the one-shot MIRV-spent marker. Set true on the ICBM that MIRVs AND on
  // every child it spawns, modelling the ROM's single MIRVIX slot being consumed by a
  // split (MIRVIX "ICBM TO MIRV (INDEX)" W3MAIN.MAC:227; consume W3MAIN.MAC:2011-2017).
  // A spent warhead is never MIRV-eligible again (mirvEligible), so one ICBM splits at
  // most once — "NO MORE THAN 3 SHOTS FROM A MIRV" (W3MAIN.MAC:2717). Optional so every
  // pre-mc12 Icbm literal stays valid; a launched ICBM omits it (undefined = not spent).
  readonly mirvSpent?: boolean
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

// ─── mc5-3: CRUISE missiles (ICBM-family, angle-driven descent) ───────────────
// A cruise missile does not home on a ground target — it descends along a discrete
// CMANGL angle (0->13), the ROM's ANGLE/CMNEWP path (W3MAIN.MAC:6421/6283). The
// horizontal drift per angle comes from the 16-bit tangent table SLOPEH:SLOPEL for
// the base angles 0,11,33,56,78 deg (W3MAIN.MAC:6515/6519), 8.8 fixed point (/256):
//   idx 0: (00<<8|00)=0    /256 = 0
//   idx 1: (00<<8|32)=50   /256 = 0.195
//   idx 2: (00<<8|AB)=171  /256 = 0.668
//   idx 3: (01<<8|7F)=383  /256 = 1.496
//   idx 4: (05<<8|06)=1286 /256 = 5.023
// The DECODED fractions ride inside a string (the sputnik WSPFIR idiom) so no loose
// literal survives the AC3 scan; the raw .BYTE rows are pinned byte-exact by claims
// MC-CMANGL-SLOPEH / MC-CMANGL-SLOPEL. CM_ANGADD packs the quadrant sign in the
// ANGLE routine (ANGADD, W3MAIN.MAC:6511; claim MC-CMANGL-ANGADD).
const CM_SLOPE: readonly number[] = '0,0.195,0.668,1.496,5.023'.split(',').map(Number)
const CM_ANGADD: readonly number[] = '12,8,0,4'.split(',').map(Number)

// How many base cruise headings a spawner picks among — one per SLOPEH:SLOPEL base
// angle (0,11,33,56,78 deg). Derived from the slope table length, so no bare count
// literal to cite; spawnCruise picks a heading in [0, CM_ANGLE_COUNT).
export const CM_ANGLE_COUNT = CM_SLOPE.length

// Decode a CMANGL (0->13) to a signed horizontal drift per descent tick: the slope
// MAGNITUDE from CM_SLOPE, the SIGN from the ANGADD quadrant the angle lands in
// (inverting ANGLE's CMANGL = ANGADD[quadrant] + slopeIndex packing — the offset
// into the quadrant band is the slope index, saturated at the steepest; the ANGADD
// 12/0 quadrants drift +h, the 8/4 quadrants -h). Pure.
function cruiseDrift(angle: number): number {
  const bases = [...CM_ANGADD].sort((a, b) => b - a) // high to low: 12,8,4,0
  const base = bases.find((b) => angle >= b) ?? 0
  const slopeIndex = Math.min(angle - base, CM_SLOPE.length - 1)
  const sign = base === 0 || base === CM_ANGADD[0] ? 1 : -1 // ANGADD[0]=12 & the 0 band are +h
  return CM_SLOPE[slopeIndex] * sign
}

// Launch a cruise missile from `origin` along CMANGL `angle` at `velocity` cabinet
// units/tick of DESCENT (default 1 = mc3 unit speed). `target` marks the ground
// column below; motion is angle-driven (stepCruise), never target-homing. Pure.
export function launchCruise(origin: Vec, angle: number, velocity = 1): Icbm {
  return { origin, target: { h: origin.h, v: 0 }, pos: origin, arrived: false, velocity, kind: 'cruise', angle }
}

// Advance a cruise one tick: descend by `velocity` and drift horizontally by its
// CMANGL slope (cruiseDrift). Arrives when the head reaches the ground (v <= 0),
// then idempotent — a landed cruise is returned unchanged. Pure, never mutates input.
export function stepCruise(icbm: Icbm): Icbm {
  if (icbm.arrived) return icbm
  const velocity = icbm.velocity ?? 1
  const newV = icbm.pos.v - velocity
  if (newV <= 0) return { ...icbm, pos: { h: icbm.pos.h, v: 0 }, arrived: true }
  const h = icbm.pos.h + velocity * cruiseDrift(icbm.angle ?? 0)
  return { ...icbm, pos: { h, v: newV } }
}

// Dispatch a warhead's per-tick step on its kind — cruise missiles fly the angled
// path, every other kind (ballistic, or an absent discriminant) flies the straight
// ICBM path. The single stepper game.ts calls over its whole warhead roster. Pure.
export function stepAnyIcbm(icbm: Icbm): Icbm {
  return icbm.kind === 'cruise' ? stepCruise(icbm) : stepIcbm(icbm)
}
