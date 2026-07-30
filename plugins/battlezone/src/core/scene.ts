// src/core/scene.ts
//
// Story bz1-3 — the pure world → NDC wireframe projector.
//
// Carries ROM-decoded models (models.ts) placed on the flat plain through the
// ported Math Box into normalised device coordinates the shell can stroke as
// glowing green vectors. The shell never does game math: it maps NDC → pixels
// and paints SceneSegments, nothing more (epic ruling: projection stays core).
//
// ROM rules implemented here (findings doc §4, mathbox.html):
//   * Per-object camera-relative culling — "Objects outside these distances
//     are culled before vertex processing": the [NEAR_CULL, FAR_CULL] range of
//     [1023, 31487]. The cull is by distance from the CAMERA each frame, never
//     a bound on static placement (7 of the 21 obstacles sit farther than
//     31487 from the world origin — correct and expected).
//   * The DISPLAY field of view — sceneProjection derives the vertical FOV from
//     DISPLAY_FOV (the ~90° horizon field, deliberately WIDER than the §7 45°
//     VISIBILITY cone) and the aspect ratio, so the horizontal span is
//     DISPLAY_FOV at ANY aspect. bz2-3: reusing the 45° cull cone as the display
//     field (bz1-3) magnified objects ~2.41× and made them read too close.
//   * Objects with geometry at or behind the eye plane are dropped whole (the
//     ROM culled before vertex processing; a naive perspective divide would
//     mirror behind-camera points back into view).
//
// PURE and deterministic. No DOM, no time, no randomness.

import { multiply, perspective, rotationY, transform, translation, type Mat4 } from '@shared/math3d'
import type { Model3D } from './models'
import { NARROW_PYRAMID, RADAR_ANTENNA, SHORT_BOX, TALL_BOX, TREAD_FRAMES, WIDE_PYRAMID } from './models'
import { OBSTACLES, type Obstacle, type ObstacleType } from './obstacles'
import { DISPLAY_FOV, FAR_CULL, NEAR_CULL, tankView, type TankPose } from './camera'

/** One projected wireframe edge in NDC ([-1,1] is the visible square). */
export interface SceneSegment {
  readonly x1: number
  readonly y1: number
  readonly x2: number
  readonly y2: number
}

/** A model's placement on the plain (planar-sim ruling: no y). */
export interface Placement {
  readonly x: number
  readonly z: number
  /** Facing, radians — same ROM angle convention as TankPose.heading. */
  readonly orientation: number
}

/** ObstacleType → its ROM-decoded wireframe. Exhaustive over OBSTACLE_TYPES. */
export const OBSTACLE_MODEL: Readonly<Record<ObstacleType, Model3D>> = {
  'narrow-pyramid': NARROW_PYRAMID,
  'wide-pyramid': WIDE_PYRAMID,
  'tall-box': TALL_BOX,
  'short-box': SHORT_BOX,
}

/**
 * The one perspective matrix of the game: the ~90° DISPLAY_FOV horizontal field
 * at any aspect ratio (fovY is derived so tan(DISPLAY_FOV/2) spans NDC x = ±1).
 * DISPLAY_FOV is deliberately WIDER than the 45° visibility cone (H_FOV) the ROM
 * culls to — see camera.ts. bz2-3 fixed the bz1-3 conflation that used the cull
 * cone as the display field, which made obstacles/enemies read too close.
 */
export function sceneProjection(aspect: number): Mat4 {
  const fovY = 2 * Math.atan(Math.tan(DISPLAY_FOV / 2) / aspect)
  return perspective(fovY, aspect, NEAR_CULL, FAR_CULL)
}

/**
 * The ROM's per-frame object cull: obstacles whose camera-relative distance
 * falls inside [NEAR_CULL, FAR_CULL]. Distance-only — heading plays no part
 * (the screen edge handles the rest); the radar story (bz1-6) never sees
 * obstacles at all.
 */
export function visibleObstacles(pose: TankPose): readonly Obstacle[] {
  return OBSTACLES.filter((o) => {
    const d = Math.hypot(o.x - pose.x, o.z - pose.z)
    return d >= NEAR_CULL && d <= FAR_CULL
  })
}

// Eye-space depth guard: any vertex at or in front of this plane (z ≥ −1)
// drops the whole object, mirroring the ROM's cull-before-vertex-processing
// and keeping the perspective divide from mirroring behind-eye geometry.
const EYE_EPSILON_Z = -1

/**
 * Project one model at a placement into NDC segments, or [] when the ROM cull
 * rejects it (outside the [NEAR_CULL, FAR_CULL] range, or geometry reaching
 * the eye plane).
 *
 * `bounce` (bz3-9 / M-009, default 0): forwarded to `tankView` — the ROM cull
 * distance `d` above is judged against the UNJOLTED pose (the ROM's per-frame
 * object cull runs before KLUDGE's per-vertex depth nudge), only the eye used
 * for the actual projection carries the jolt.
 */
export function projectModel(
  model: Model3D,
  placement: Placement,
  pose: TankPose,
  aspect: number,
  bounce = 0,
): readonly SceneSegment[] {
  const d = Math.hypot(placement.x - pose.x, placement.z - pose.z)
  if (d < NEAR_CULL || d > FAR_CULL) return []

  const modelMatrix = multiply(
    translation(placement.x, 0, placement.z),
    rotationY(placement.orientation),
  )
  const modelView = multiply(tankView(pose, bounce), modelMatrix)

  const eyePoints = model.vertices.map((v) => transform(modelView, v))
  if (eyePoints.some((p) => p[2] >= EYE_EPSILON_Z)) return []

  const proj = sceneProjection(aspect)
  const ndc = eyePoints.map((p) => transform(proj, p))
  return model.edges.map(([a, b]) => ({
    x1: ndc[a][0],
    y1: ndc[a][1],
    x2: ndc[b][0],
    y2: ndc[b][1],
  }))
}

/** The wireframe 21-obstacle field: every ROM obstacle the cull admits.
 *  `bounce` (bz3-9, default 0) rides straight through to `projectModel`. */
export function obstacleSegments(
  pose: TankPose,
  aspect: number,
  bounce = 0,
): readonly SceneSegment[] {
  return visibleObstacles(pose).flatMap((o) =>
    projectModel(
      OBSTACLE_MODEL[o.type],
      { x: o.x, z: o.z, orientation: o.orientation },
      pose,
      aspect,
      bounce,
    ),
  )
}

// --- Enemy tank sub-object assembly (story bz3-12, findings W-017/W-018) --
//
// Every ROM enemy tank draws its own radar antenna (RDROBJ) spinning at a
// FIXED rate on top of the body, plus one animated tread frame (TREADS), the
// frame chosen by a caller-supplied counter. Both are pure geometry/cadence
// functions — the shell (main.ts) supplies the live `frameCount`/tread
// counter and calls `enemyTankSegments` in place of a bare `projectModel`.

/** RANGLE's per-game-frame increment — `$0B` (BZONE.MAC:2946-2949). RANGLE is
 *  a byte, so 256 steps of this size is exactly one full turn. */
export const RADAR_ANGLE_STEP = 11

/** The tread animation's cycle length — `TRDCTR & 3` (BZONE.MAC:1550-1551). */
export const TREAD_FRAME_COUNT = 4

/**
 * The antenna's own spin angle, radians — ROM RANGLE, a free-running BYTE
 * that gains `RADAR_ANGLE_STEP` every 15.625 Hz game frame and wraps at 256
 * (one full turn). `frameCount` is `state.frameCount` (bz3-11), ticked at
 * that same game-frame rate.
 */
export function radarSpin(frameCount: number): number {
  return (((frameCount * RADAR_ANGLE_STEP) & 0xff) / 256) * Math.PI * 2
}

/**
 * The near (front) tread frame for a tread counter — ROM TRDCTR & 3, through
 * OBJPNT's REVERSED front dispatch ($4..$7 -> TREAD7,TREAD6,TREAD5,TREAD4,
 * BZMTNS.MAC:486): counter&3 = 0,1,2,3 selects TREAD_FRAMES index 3,2,1,0.
 * Plain `&3` (not `%4`) so a DECrementing (reversing) counter wraps the same
 * way the ROM's byte arithmetic does.
 */
export function treadFrame(treadCounter: number): Model3D {
  return TREAD_FRAMES[3 - (treadCounter & 3)]
}

/** The live animation inputs `enemyTankSegments` needs: the game-frame count
 *  (drives the antenna spin) and the per-tank tread counter (drives the
 *  tread frame). See the story's session notes for the tread-counter source
 *  seam (bz3-12 Design Deviation). */
export interface TankAnim {
  readonly frameCount: number
  readonly treadCounter: number
}

/**
 * The full enemy-tank draw: body + spinning antenna + current tread frame.
 * The antenna and tread sit in the SAME object-local frame as `body` (no
 * extra x/z offset — RDRTBL/TREADn are already authored atop the tank hull,
 * models.ts's module note), so both project through the body's own
 * `placement`; the antenna's ORIENTATION, though, is the ABSOLUTE RANGLE spin
 * (world-frame, decoupled from the tank's facing — bz4-3/AC-2, RDROBJ's stored
 * "own spin angle", BZONE.MAC:1559-1562).
 */
export function enemyTankSegments(
  body: Model3D,
  placement: Placement,
  pose: TankPose,
  aspect: number,
  anim: TankAnim,
  bounce = 0,
): readonly SceneSegment[] {
  const antennaPlacement: Placement = {
    x: placement.x,
    z: placement.z,
    // bz4-3 / AC-2: the dish orientation is the ABSOLUTE RANGLE spin, decoupled
    // from the tank body heading — the ROM stores RANGLE straight into the
    // object's orientation slot (`LDA RANGLE / STA AY,PTBLO2+1`, BZONE.MAC:
    // 1561-1562), NOT body_heading + RANGLE. So the dish sweeps in the world
    // frame; yawing the hull must not drag the antenna's world angle with it.
    orientation: radarSpin(anim.frameCount),
  }
  return [
    ...projectModel(body, placement, pose, aspect, bounce),
    ...projectModel(RADAR_ANTENNA, antennaPlacement, pose, aspect, bounce),
    ...projectModel(treadFrame(anim.treadCounter), placement, pose, aspect, bounce),
  ]
}
