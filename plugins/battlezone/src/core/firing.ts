// src/core/firing.ts
//
// Story bz1-5 — the player's cannon: shell projectile, the centered gunsight,
// and line-of-sight shot blocking. PURE core (epic non-negotiable): all time
// enters as `dt`, no DOM, no wall clock, no randomness — identical-in ⇒
// identical-out.
//
// ROM FIDELITY (local quarry `reference/rom-quarry/Battlezone.dis65`):
//   * The world is FLAT — the ROM stores projectiles as 16-bit X/Z coords and
//     16-bit X/Z velocities only (`projectile_x_coords`/`_z_coords`/
//     `_velocities`); there is no Y. Shells "fly level from the cannon"
//     (context-epic-bz1.md, planar-sim ruling). No arc, no gravity.
//   * ONE player shell at a time. The fire routine gates on "player projectile
//     ready?" / "player projectile still in flight?" (dis65 offsets 233 / 523).
//     Slot #0 is the player's, #1 the enemy's (bz1-7) — modelled here as a
//     single `Shell | null`.
//   * The shell's velocity "matches the facing of the firing unit" (offset
//     2674) — it flies straight along the tank's heading at launch.
//   * Speed & range: "Projectiles move 4x per frame, so with a time-to-live of
//     $7f, the maximum distance traveled is 256*127=32512 ($7f00), which is a
//     bit past the far plane" (offset 7118). → 256 units/frame, expiring at
//     32512 units; the 4 sub-steps/frame are a swept collision test so a fast
//     shell never tunnels through an obstacle (offset 6636: "advance them four
//     steps per frame and check for collisions after each step").
//   * Obstacles block shots (epic: "they block movement and shells"; dis65
//     "Projectile struck obstacle"). The exact projectile collision-diameter
//     table at $6139 is a deferred byte-decode — shellBlocked reuses movement's
//     footprint approximation (see the bz1-5 session deviations).
//
// The per-second SHELL_SPEED scales the ROM's per-sub-step quantum by the
// 15.625 Hz / 64 ms game frame (GAME_FRAME_HZ; bz3-1 corrected this from a
// mistaken 60 Hz, F-004); exact-value true-up is bz1-12's playtest.

import { forwardFromHeading, type TankPose } from './camera'
import { OBSTACLES, type ObstacleType } from './obstacles'
import { GAME_FRAME_HZ } from './timebase'
import type { Input } from './input'

/** An in-flight cannon shell on the flat plain (planar-sim ruling: no y). */
export interface Shell {
  /** Planar world X. */
  readonly x: number
  /** Planar world Z. */
  readonly z: number
  /** Travel direction, radians — FIXED at fire time (the shell never curves). */
  readonly heading: number
  /** Distance travelled so far, units — drives max-range expiry. */
  readonly range: number
}

// --- ROM-derived constants (Battlezone.dis65 offset 7118) -------------------

/**
 * Distance a shell covers per ROM SUB-STEP — the "256" in 256×127 = 32512.
 * F-004: the ROM's 256 is PER-SUB-STEP, not per-frame; the shell integrator
 * advances SHELL_SUBSTEPS_PER_FRAME sub-steps every game frame (SAVE3=4 loop,
 * BZONE.MAC:608), so one game frame covers 256 × 4 = 1024 units.
 */
const SHELL_STEP_PER_SUBSTEP = 256

/** ROM: "advance them four steps per frame and check collisions after each"
 *  (SAVE3=4 loop, BZONE.MAC:608 / dis65 offset 6636). */
const SHELL_SUBSTEPS_PER_FRAME = 4

/** Swept-collision granularity: 256 units — the ROM's per-sub-step distance. */
const SHELL_SUBSTEP = SHELL_STEP_PER_SUBSTEP

/**
 * Shell muzzle speed, units/second (constant — level flight, no acceleration):
 * 256 per-sub-step × 4 sub-steps × the 15.625 Hz / 64 ms game frame (GAME_FRAME_HZ,
 * BZONE.MAC:1085 / :422) = 16000 u/s. NOT 256 × 15.625 = 4000 — the F-004
 * naive-rescale trap that treats the per-sub-step 256 as a per-frame step.
 */
export const SHELL_SPEED = SHELL_STEP_PER_SUBSTEP * SHELL_SUBSTEPS_PER_FRAME * GAME_FRAME_HZ

/** Max distance a shell travels before expiring — ROM $7f00 = 256 × 127. */
export const SHELL_MAX_RANGE = 32512

/**
 * The gunsight reticle's normalised-device position. Battlezone's cannon fires
 * straight ahead, so the reticle is FIXED at screen centre (unlike star-wars'
 * yoke-tracking crosshair). A shell flies toward exactly what the gunsight
 * covers; the shell (render) strokes the reticle here.
 */
export const GUNSIGHT_NDC: readonly [number, number] = [0, 0]

// Per-type shell-vs-obstacle effective radius — the ROM's PRXTBL, applied
// AFTER a >>2 shift of the range (BZONE.MAC:2420-2428), i.e. an effective
// radius of PRXTBL[type] << 2 (bz3-4, F-007). Bytes are DECIMAL
// (trailing-period) inside a `.RADIX 16` region: BZONE.MAC:2510
// `.BYTE 56.,88.` (narrow-pyramid $00, tall-box $01), :2514 `.BYTE 86.,0,0,0`
// (wide-pyramid $0c, short-box $0f). short-box's PRXTBL entry is 0 — the ROM
// asymmetry where a shell passes clean through a short box even though the
// same box still blocks a TANK (movement.ts's PROXTB[short-box] = 960).
const PRXTBL_EFF: Readonly<Record<ObstacleType, number>> = {
  'narrow-pyramid': 56 << 2, // 224 — PRXTBL byte[0] = 56.
  'tall-box': 88 << 2, //      352 — PRXTBL byte[1] = 88.
  'wide-pyramid': 86 << 2, //  344 — PRXTBL byte[12] = 86.
  'short-box': 0 << 2, //        0 — PRXTBL byte[15] = 0 (shells pass through)
}

/**
 * True iff a shell centred at (x, z) overlaps an obstacle footprint — the test
 * that makes the 21 obstacles block shots, using the ROM's own (smaller,
 * per-type, distinct-from-tank) PRXTBL proximity table.
 */
export function shellBlocked(x: number, z: number): boolean {
  for (const o of OBSTACLES) {
    const r = PRXTBL_EFF[o.type]
    const dx = x - o.x
    const dz = z - o.z
    if (dx * dx + dz * dz < r * r) return true
  }
  return false
}

/**
 * Advance the player's firing subsystem one step, pure and deterministic:
 *   * No shell in flight + fire pressed → spawn one at the tank, aligned to its
 *     heading (ROM "projectile ready?").
 *   * A shell in flight → advance it along its OWN heading by SHELL_SPEED·dt,
 *     sub-stepping so a fast shell can't tunnel through an obstacle; returns
 *     null when it expires (past SHELL_MAX_RANGE) or strikes an obstacle. `fire`
 *     is IGNORED while a shell is live — the player has exactly one shell out
 *     (ROM "still in flight?").
 */
export function stepFiring(
  active: Shell | null,
  pose: TankPose,
  input: Input,
  dt: number,
): Shell | null {
  if (active === null) {
    return input.fire ? { x: pose.x, z: pose.z, heading: pose.heading, range: 0 } : null
  }

  const dist = SHELL_SPEED * dt
  if (dist <= 0) return active // dt = 0: the shell holds position

  const fwd = forwardFromHeading(active.heading) // [sin, 0, cos]
  const substeps = Math.ceil(dist / SHELL_SUBSTEP)
  const stepDist = dist / substeps
  let x = active.x
  let z = active.z
  let range = active.range
  for (let i = 0; i < substeps; i++) {
    x += fwd[0] * stepDist
    z += fwd[2] * stepDist
    range += stepDist
    if (range > SHELL_MAX_RANGE) return null // expired at max range
    if (shellBlocked(x, z)) return null // shot blocked by an obstacle
  }
  return { x, z, heading: active.heading, range }
}
