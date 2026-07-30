// src/core/camera.ts
//
// Story bz1-3 — the tank-pose → camera bridge.
//
// The game world runs the ROM's own conventions (findings doc §4, quoting
// mathbox.html verbatim): "+X points to the left, +Y up, +Z into the monitor";
// "When facing angle 0, the player looks toward +Z"; "Increasing angle rotates
// counter-clockwise toward +X". The ported Math Box (math3d.ts) instead looks
// down −Z in eye space with +X screen-right (OpenGL convention), so tankView()
// bridges the two: a yaw of `heading + π` maps world-forward (+Z at heading 0)
// onto eye −Z and world +X onto eye −X — which is exactly screen-LEFT, as the
// ROM demands.
//
// EYE HEIGHT IS BAKED INTO THE DATA: every ground-sitting model in models.ts
// (obstacles, tanks) carries its base plane at y = −640 — the ROM pre-offsets
// vertex data so the eye sits at world y = 0 and no eye-height translation
// exists anywhere in the pipeline. GROUND_Y names that plane for ground
// geometry and tests.
//
// PURE and deterministic. No DOM, no time, no randomness.

import { rotationY, viewMatrix, type Mat4, type Vec3 } from '@shared/math3d'

/** The player tank's pose on the flat plain (planar-sim ruling: no y). */
export interface TankPose {
  /** Planar world X. */
  readonly x: number
  /** Planar world Z. */
  readonly z: number
  /** Facing, radians — ROM convention: 0 faces +Z, increasing turns toward +X. */
  readonly heading: number
}

/** The ROM's ground plane: every ground model's base sits at y = −640. */
export const GROUND_Y = -640

/** Near cull distance, camera-relative — ROM `$03ff` (mathbox.html). */
export const NEAR_CULL = 1023

/** Far cull distance, camera-relative — ROM `$7aff` (mathbox.html). */
export const FAR_CULL = 31487

/** Horizontal field of view — the confirmed 45° visibility cone (findings §7). */
export const H_FOV = Math.PI / 4

/**
 * Horizontal field of view the 3D SCENE is DISPLAYED at — the ~90° background-
 * horizon field (2× H_FOV). This is DISTINCT from H_FOV: H_FOV is the 45°
 * VISIBILITY cone the ROM culls to (§7), while the eye renders a WIDER field, so
 * an object at the cull-cone edge sits mid-screen rather than on the screen
 * edge. bz1-3 reused H_FOV as the display FOV (a conflation), which magnified
 * everything by ~1/tan(22.5°) ≈ 2.41× and made obstacles/enemies loom too near
 * — the bug the first live playtest surfaced (bz2-3). The 90° magnitude is the
 * epic's background-horizon claim (quarry-unconfirmed, = 2× the confirmed cone);
 * the epic-closing live playtest is the final calibration gate.
 */
export const DISPLAY_FOV = 2 * H_FOV

/**
 * Unit forward direction on the plain for a ROM-convention heading:
 * heading 0 → +Z, heading π/2 → +X (counter-clockwise, per mathbox.html).
 */
export function forwardFromHeading(heading: number): Vec3 {
  return [Math.sin(heading), 0, Math.cos(heading)]
}

/**
 * The camera's view matrix for a tank pose. The eye sits at (x, 0, z) — world
 * y = 0, see the header — and yaws with `heading`. The `+ π` is the convention
 * bridge: it turns the Math Box's −Z eye axis onto the ROM's +Z world-forward
 * and flips X so world +X lands screen-left. Compose with
 * `sceneProjection × tankView × model` for the full MVP.
 *
 * `bounce` (bz3-9 / M-009, default 0): the live collision-BOUNCE magnitude
 * (0-255, `state.ts`'s `bounce`, decayed by `sim.ts`'s game-frame loop). KLUDGE
 * (BZONE.MAC:2108-2113) subtracts BOUNCE from every drawn vertex's depth
 * (DDEND) before the perspective divide — reducing every object's apparent
 * distance for a "jolt" of the whole view. Pushing the EYE forward along its
 * own facing by the same amount is the exact rigid-transform equivalent: for
 * any fixed world point, it reduces that point's eye-space depth by exactly
 * `bounce`, uniformly across every object this view projects (never a single
 * entity), with a single change here rather than one at each call site.
 */
export function tankView(pose: TankPose, bounce = 0): Mat4 {
  const fwd = forwardFromHeading(pose.heading)
  const eyeX = pose.x + fwd[0] * bounce
  const eyeZ = pose.z + fwd[2] * bounce
  return viewMatrix([eyeX, 0, eyeZ], rotationY(pose.heading + Math.PI))
}
