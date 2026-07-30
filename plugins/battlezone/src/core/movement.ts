// src/core/movement.ts
//
// Story bz1-4 — dual-tread differential-drive kinematics + planar obstacle
// collision, the movement primitive of the sim. PURE core (epic
// non-negotiable): all time enters as `dt`, no DOM, no wall clock, no
// randomness — identical-in ⇒ identical-out.
//
// ROM FIDELITY (local quarry `reference/rom-quarry/Battlezone.dis65`, rev2 —
// 6502disassembly.com Battlezone):
//   The cabinet's two joysticks ARE the two treads. The player-update routine
//   at $4600 combines them exactly as a differential drive (dis65 labels):
//     * both sticks forward → "move forward 2 steps"        ($4702)
//     * both sticks back    → "move backward 2 steps"       ($4713)
//     * sticks opposed      → "rotate 2 units", no move     ($4660/$4669)
//     * one stick forward   → "rotate 1 unit" + "move forward" ($4678-$4693)
//   → forward speed ∝ (leftTread + rightTread); yaw ∝ (rightTread - leftTread);
//   full throttle = 2 steps / 2 units per frame, a single tread = half of each.
//   The forward step is cos(facing) scaled ×3/4 ($4913-$4928); the facing is a
//   9-bit wheel ($5005 "add 1 unit to 9-bit facing angle") so one rotation unit
//   = 2π/512 rad. Player collision radius is $480 = 1152 units ($6427 "use $480
//   as player radius"); collision is a circle test of the tank centre against
//   each obstacle ($6471 "compare distance to obstacle radius"), and obstacles
//   are symmetric so a circle is exact.
//
// The per-second MAGNITUDES (MAX_SPEED / MAX_TURN_RATE) scale the ROM's
// per-frame quanta by the 15.625 Hz / 64 ms game frame (GAME_FRAME_HZ; bz3-1
// corrected this from a mistaken 60 Hz); exact-value true-up against MAME
// footage is bz1-12's playtest. Steering handedness comes
// out CCW-toward-the-idle-tread here (consistent with the ROM's +X-screen-left,
// CCW convention) but is likewise playtest-confirmed in bz1-12 (bz1-3 chirality
// finding). See the session file's Dev deviations.

import { forwardFromHeading, type TankPose } from './camera'
import { OBSTACLES, type ObstacleType } from './obstacles'
import { GAME_FRAME_HZ } from './timebase'
import type { Input } from './input'

// --- ROM-derived constants (reference/rom-quarry/Battlezone.dis65) ----------

/** One rotation unit = 2π/512 rad — the ROM's 9-bit player facing wheel ($5005). */
const TURN_UNIT = (2 * Math.PI) / 512

/**
 * Forward step = 0x5E = 94: the ROM cos table peaks at 0x7FFF, so the amplitude
 * high byte is 127 (NOT 64), scaled ×¾ by the M.SET halvings → 0x5E ($4913-$4928;
 * audit M-003). The old 48 under-scaled it, which partly masked the frame-rate bug.
 */
const FORWARD_STEP = 0x5e

// Per-GAME-frame quanta scale to per-second by the 15.625 Hz / 64 ms ROM game
// frame (GAME_FRAME_HZ, BZONE.MAC:1085 "END OF FRAME (64 MS)" / :422 LSR SYNC) —
// NOT the 60 Hz render loop the original clone mistook it for (audit C-001/M-001).

/** Full-throttle speed (both treads forward): 2 steps/frame → units/second. */
export const MAX_SPEED = FORWARD_STEP * 2 * GAME_FRAME_HZ

/** Full pivot rate (opposed treads): 2 units/frame → rad/second. */
export const MAX_TURN_RATE = TURN_UNIT * 2 * GAME_FRAME_HZ

/**
 * Fine-aim yaw multiplier (bz2-4). When Input.fineAim is engaged, stepTank
 * scales the yaw rate by this factor so the player can resolve the tank's
 * heading (= its aim; the hull is the turret) finely enough to line a shot up
 * on a distant enemy — the coarse ±1-tread keyboard turn skips past the target.
 * A quarter of the coarse rate: precise without making normal turning sluggish
 * (coarse turning keeps the full ROM MAX_TURN_RATE). Forward drive is unscaled —
 * fine-aim sharpens the aim, it is not a speed brake. The bz2-6 playtest may
 * retune within (0, 0.5].
 */
export const FINE_AIM_TURN_SCALE = 0.25

/** Player collision radius — ROM $480 ($6427 "use $480 as player radius"). */
export const PLAYER_RADIUS = 0x480

// Per-type tank-vs-obstacle collide distance — the ROM's PROXTB, compared
// DIRECTLY against raw centre distance (bz3-4, F-006). No player-radius add:
// the 3/4-tank-radius pre-add at BZONE.MAC:3637-3648 is ROBOT-only, out of
// scope here. Object type code doubled is the PROXTB word index (`OBJOBJ`
// ASL, BZONE.MAC:3632-3634); values are hex `.WORD` in a `.RADIX 16` region.
// Exported so consumers needing "just past the movement-block edge" (e.g.
// tests staging a tank wedged against a specific obstacle) use the real
// per-type threshold. Supersedes the old (bz1-4-era) circumscribed-footprint
// OBSTACLE_RADIUS approximation, removed here as dead code — nothing else
// in src/ imports it once isBlocked/shellBlocked move to PROXTB/PRXTBL_EFF.
export const PROXTB: Readonly<Record<ObstacleType, number>> = {
  'narrow-pyramid': 0x340, // 832 — BZONE.MAC:3690 PROXTB word[0] (type $00)
  'tall-box': 0x340, //       832 — BZONE.MAC:3690 PROXTB word[1] (type $01)
  'wide-pyramid': 0x400, //  1024 — BZONE.MAC:3694 PROXTB word[12] (type $0c)
  'short-box': 0x3c0, //      960 — BZONE.MAC:3694 PROXTB word[15] (type $0f)
}

/**
 * True iff a tank centred at (x, z) overlaps any obstacle footprint — the ROM
 * circle test of raw centre distance against the object's own PROXTB radius
 * (per-type, not a summed player+obstacle approximation).
 */
export function isBlocked(x: number, z: number): boolean {
  for (const o of OBSTACLES) {
    const block = PROXTB[o.type]
    const dx = x - o.x
    const dz = z - o.z
    if (dx * dx + dz * dz < block * block) return true
  }
  return false
}

/**
 * Advance the tank one step: differential-drive integration on the flat plain
 * (rotate, then move along the new facing — the ROM's rotate-then-move order),
 * followed by hard-stop collision (the ROM "motion blocked by object" zeroes
 * the offending translation while keeping the rotation). Pure and deterministic.
 */
export function stepTank(pose: TankPose, input: Input, dt: number): TankPose {
  const v = (MAX_SPEED * (input.leftTread + input.rightTread)) / 2
  // Fine-aim (bz2-4) scales ONLY the yaw — a precision aim modifier, not a
  // speed brake; coarse turning (fineAim off/absent) keeps the full ROM rate.
  const turnScale = input.fineAim ? FINE_AIM_TURN_SCALE : 1
  const yawRate = (MAX_TURN_RATE * (input.rightTread - input.leftTread) * turnScale) / 2

  const heading = pose.heading + yawRate * dt
  const fwd = forwardFromHeading(heading)
  let x = pose.x + fwd[0] * v * dt
  let z = pose.z + fwd[2] * v * dt

  // Never end a step inside a footprint — hard-stop the blocked translation.
  if (isBlocked(x, z)) {
    x = pose.x
    z = pose.z
  }

  return { x, z, heading }
}
