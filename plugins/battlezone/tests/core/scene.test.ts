// tests/core/scene.test.ts
//
// Story bz1-3 — RED phase (Furiosa / TEA).
//
// CONTRACT for the GREEN phase (The Word Burgers / DEV): create
// `src/core/scene.ts`, the pure world → NDC wireframe projector, exporting:
//
//   export interface SceneSegment {
//     readonly x1: number; readonly y1: number   // NDC endpoint A
//     readonly x2: number; readonly y2: number   // NDC endpoint B
//   }
//   export interface Placement {
//     readonly x: number; readonly z: number; readonly orientation: number
//   }
//   export const OBSTACLE_MODEL: Record<ObstacleType, Model3D>  // exhaustive
//   export function sceneProjection(aspect: number): Mat4  // ~90° DISPLAY_FOV (bz2-3)
//   export function visibleObstacles(pose: TankPose): readonly Obstacle[]
//   export function projectModel(
//     model: Model3D, placement: Placement, pose: TankPose, aspect: number,
//   ): readonly SceneSegment[]
//   export function obstacleSegments(pose: TankPose, aspect: number): readonly SceneSegment[]
//
// ROM RULES PINNED HERE (findings doc §4, quoting mathbox.html):
//   * "Objects outside these distances are culled before vertex processing" —
//     the CAMERA-RELATIVE window [NEAR_CULL=1023, FAR_CULL=31487]. Strictly
//     outside ⇒ no segments. (Exact-boundary semantics deliberately untested —
//     the quote doesn't pin inclusive/exclusive; don't over-fit ±1.)
//   * The 45° visibility cone (findings §7) is the CULL cone (H_FOV), not the
//     display FOV. bz2-3 decoupled them: sceneProjection projects the ~90°
//     DISPLAY_FOV (2× the cone) at every aspect ratio, so an object at the cull
//     cone's edge lands mid-frame, not on the screen edge. See the describe
//     block below and scene-calibration.test.ts for the full contract.
//   * Behind-camera geometry must never reach the screen (a naive perspective
//     divide mirrors it back into view — the classic bug this guards).
//
// Projection lands in NDC ([-1,1] visible square); the shell maps NDC → canvas
// pixels and strokes. Segments may extend outside [-1,1] (canvas clips); they
// must simply be finite and real.
//
// Defensive module loading per the bz1-2 house pattern (see obstacles.test.ts).

import { describe, it, expect, beforeAll } from 'vitest'
import { transform, type Mat4 } from '@shared/math3d'
import type { Model3D } from '../../src/core/models'
import {
  NARROW_PYRAMID,
  WIDE_PYRAMID,
  TALL_BOX,
  SHORT_BOX,
} from '../../src/core/models'
import { OBSTACLES, OBSTACLE_TYPES, type Obstacle, type ObstacleType } from '../../src/core/obstacles'

interface TankPose {
  readonly x: number
  readonly z: number
  readonly heading: number
}

interface SceneSegment {
  readonly x1: number
  readonly y1: number
  readonly x2: number
  readonly y2: number
}

interface Placement {
  readonly x: number
  readonly z: number
  readonly orientation: number
}

interface SceneModule {
  OBSTACLE_MODEL?: Record<ObstacleType, Model3D>
  sceneProjection?: (aspect: number) => Mat4
  visibleObstacles?: (pose: TankPose) => readonly Obstacle[]
  projectModel?: (
    model: Model3D,
    placement: Placement,
    pose: TankPose,
    aspect: number,
  ) => readonly SceneSegment[]
  obstacleSegments?: (pose: TankPose, aspect: number) => readonly SceneSegment[]
}

let scene: SceneModule = {}

beforeAll(async () => {
  try {
    scene = (await import('../../src/core/scene')) as SceneModule
  } catch {
    scene = {}
  }
})

function need<T>(value: T | undefined, name: string): T {
  if (value === undefined) {
    throw new Error(`src/core/scene.ts must export ${name} (bz1-3 RED contract)`)
  }
  return value
}

// The original cabinet's addressable display is ~1024×768 (findings/epic) — 4:3.
const ASPECT = 4 / 3

const ORIGIN: TankPose = { x: 0, z: 0, heading: 0 }

/** Every coordinate of every segment is a real, finite number. */
function expectFiniteSegments(segs: readonly SceneSegment[]): void {
  for (const s of segs) {
    expect(Number.isFinite(s.x1)).toBe(true)
    expect(Number.isFinite(s.y1)).toBe(true)
    expect(Number.isFinite(s.x2)).toBe(true)
    expect(Number.isFinite(s.y2)).toBe(true)
  }
}

describe('scene — OBSTACLE_MODEL (type → ROM-decoded wireframe, exhaustive)', () => {
  it('maps every declared ObstacleType (runtime exhaustiveness — TS rule #3)', () => {
    const map = need(scene.OBSTACLE_MODEL, 'OBSTACLE_MODEL')
    expect(OBSTACLE_TYPES.length).toBeGreaterThan(0)
    for (const t of OBSTACLE_TYPES) {
      expect(map[t], `OBSTACLE_MODEL must map '${t}'`).toBeDefined()
    }
  })

  it('maps each type to its ROM-decoded model from models.ts (identity, not copies)', () => {
    const map = need(scene.OBSTACLE_MODEL, 'OBSTACLE_MODEL')
    expect(map['narrow-pyramid']).toBe(NARROW_PYRAMID)
    expect(map['wide-pyramid']).toBe(WIDE_PYRAMID)
    expect(map['tall-box']).toBe(TALL_BOX)
    expect(map['short-box']).toBe(SHORT_BOX)
  })
})

describe('scene — sceneProjection projects the ~90° display field (bz2-3 calibration)', () => {
  // bz2-3 corrected the bz1-3 conflation: H_FOV is the §7 45° VISIBILITY cone
  // (what the ROM culls), NOT the display FOV. The display field is the ~90°
  // background-horizon (2× the cone), so the screen edge is a 45° bearing and
  // the cone edge (22.5°) lands near half-frame. Full rationale + the
  // playtest-tunable target live in scene-calibration.test.ts.
  it('an eye-space point at bearing +45° lands at the NDC edge |x| ≈ 1 (4:3, 90° wide)', () => {
    const proj = need(scene.sceneProjection, 'sceneProjection')(ASPECT)
    const half = Math.PI / 4 // 45° = half of the 90° display field
    const d = 5000
    const ndc = transform(proj, [Math.sin(half) * d, 0, -Math.cos(half) * d])
    expect(Math.abs(ndc[0])).toBeCloseTo(1, 4)
  })

  it('the display field is aspect-invariant (16:9 gives the same 45° edge)', () => {
    const proj = need(scene.sceneProjection, 'sceneProjection')(16 / 9)
    const half = Math.PI / 4
    const d = 5000
    const ndc = transform(proj, [Math.sin(half) * d, 0, -Math.cos(half) * d])
    expect(Math.abs(ndc[0])).toBeCloseTo(1, 4)
  })

  it('the 45° visibility-cone edge (22.5°) now lands well inside the frame, not on it', () => {
    const proj = need(scene.sceneProjection, 'sceneProjection')(ASPECT)
    const half = Math.PI / 8 // 22.5° = edge of the §7 visibility cone
    const d = 5000
    const ndc = transform(proj, [Math.sin(half) * d, 0, -Math.cos(half) * d])
    expect(Math.abs(ndc[0])).toBeCloseTo(Math.tan(Math.PI / 8), 4) // ≈ 0.414
  })

  it('a point dead ahead projects to the NDC centre', () => {
    const proj = need(scene.sceneProjection, 'sceneProjection')(ASPECT)
    const ndc = transform(proj, [0, 0, -5000])
    expect(ndc[0]).toBeCloseTo(0, 6)
    expect(ndc[1]).toBeCloseTo(0, 6)
  })
})

describe('scene — visibleObstacles (ROM camera-relative distance window)', () => {
  it('excludes the obstacle the tank is standing on (distance 0 < NEAR_CULL)', () => {
    // Obstacle #0 sits at exactly (8192, 8192) — park the tank on it.
    const visible = need(scene.visibleObstacles, 'visibleObstacles')({
      x: 8192,
      z: 8192,
      heading: 0,
    })
    expect(visible.some((o) => o.x === 8192 && o.z === 8192)).toBe(false)
  })

  it('excludes obstacle #2 at (−32768, 0) from the origin (32768 > FAR_CULL 31487)', () => {
    const visible = need(scene.visibleObstacles, 'visibleObstacles')(ORIGIN)
    expect(visible.some((o) => o.x === -32768 && o.z === 0)).toBe(false)
  })

  it('includes obstacle #0 at (8192, 8192) from the origin (~11585 — inside the window)', () => {
    const visible = need(scene.visibleObstacles, 'visibleObstacles')(ORIGIN)
    expect(visible.some((o) => o.x === 8192 && o.z === 8192)).toBe(true)
  })

  it('distance cull is heading-independent (the window is a range, not a cone)', () => {
    const visibleObstacles = need(scene.visibleObstacles, 'visibleObstacles')
    const north = visibleObstacles({ x: 0, z: 0, heading: 0 })
    const south = visibleObstacles({ x: 0, z: 0, heading: Math.PI })
    expect(north.length).toBeGreaterThan(0)
    expect(north.length).toBe(south.length)
  })

  it('every returned obstacle is inside [NEAR_CULL, FAR_CULL] of the camera', () => {
    const visibleObstacles = need(scene.visibleObstacles, 'visibleObstacles')
    for (const pose of [ORIGIN, { x: 10000, z: -20000, heading: 1.5 }]) {
      const visible = visibleObstacles(pose)
      expect(visible.length).toBeGreaterThan(0)
      for (const o of visible) {
        const d = Math.hypot(o.x - pose.x, o.z - pose.z)
        expect(d).toBeGreaterThanOrEqual(1023)
        expect(d).toBeLessThanOrEqual(31487)
      }
    }
  })

  it('returns entries from the real table (subset of OBSTACLES, no fabrications)', () => {
    const visible = need(scene.visibleObstacles, 'visibleObstacles')(ORIGIN)
    expect(visible.length).toBeGreaterThan(0)
    for (const o of visible) expect(OBSTACLES.includes(o)).toBe(true)
    expect(new Set(visible).size).toBe(visible.length) // no duplicates
  })
})

describe('scene — projectModel (world placement → NDC wireframe segments)', () => {
  const placedAhead = (d: number): Placement => ({ x: 0, z: d, orientation: 0 })

  it('a wide pyramid dead ahead mid-window projects every edge', () => {
    const segs = need(scene.projectModel, 'projectModel')(
      WIDE_PYRAMID,
      placedAhead(5000),
      ORIGIN,
      ASPECT,
    )
    expect(segs.length).toBe(WIDE_PYRAMID.edges.length) // fully visible — all 8
    expectFiniteSegments(segs)
  })

  it('a fully visible object dead ahead straddles the screen centreline', () => {
    const segs = need(scene.projectModel, 'projectModel')(
      WIDE_PYRAMID,
      placedAhead(5000),
      ORIGIN,
      ASPECT,
    )
    expect(segs.some((s) => s.x1 < 0 || s.x2 < 0)).toBe(true)
    expect(segs.some((s) => s.x1 > 0 || s.x2 > 0)).toBe(true)
  })

  it('culls an object nearer than the ROM near window (800 < 1023 ⇒ nothing)', () => {
    const segs = need(scene.projectModel, 'projectModel')(
      WIDE_PYRAMID,
      placedAhead(800),
      ORIGIN,
      ASPECT,
    )
    expect(segs.length).toBe(0)
  })

  it('draws an object just inside the near window (1100 ⇒ segments)', () => {
    const segs = need(scene.projectModel, 'projectModel')(
      WIDE_PYRAMID,
      placedAhead(1100),
      ORIGIN,
      ASPECT,
    )
    expect(segs.length).toBeGreaterThan(0)
  })

  it('culls an object beyond the ROM far window (32000 > 31487 ⇒ nothing)', () => {
    const segs = need(scene.projectModel, 'projectModel')(
      WIDE_PYRAMID,
      placedAhead(32000),
      ORIGIN,
      ASPECT,
    )
    expect(segs.length).toBe(0)
  })

  it('draws an object just inside the far window (31000 ⇒ segments)', () => {
    const segs = need(scene.projectModel, 'projectModel')(
      WIDE_PYRAMID,
      placedAhead(31000),
      ORIGIN,
      ASPECT,
    )
    expect(segs.length).toBeGreaterThan(0)
  })

  it('never draws an object dead BEHIND the camera (in-window distance, mirrored-divide guard)', () => {
    const segs = need(scene.projectModel, 'projectModel')(
      WIDE_PYRAMID,
      { x: 0, z: -5000, orientation: 0 }, // 5000 behind a +Z-facing camera
      ORIGIN,
      ASPECT,
    )
    expect(segs.length).toBe(0)
  })

  it('honours placement orientation (a rotated box projects a different silhouette)', () => {
    const projectModel = need(scene.projectModel, 'projectModel')
    const flat = projectModel(TALL_BOX, { x: 0, z: 5000, orientation: 0 }, ORIGIN, ASPECT)
    const turned = projectModel(
      TALL_BOX,
      { x: 0, z: 5000, orientation: Math.PI / 4 },
      ORIGIN,
      ASPECT,
    )
    expect(flat.length).toBeGreaterThan(0)
    expect(turned.length).toBeGreaterThan(0)
    // 45° about Y genuinely changes the projected x extents of a box.
    const xs = (segs: readonly SceneSegment[]): number =>
      Math.max(...segs.flatMap((s) => [s.x1, s.x2]))
    expect(xs(turned)).not.toBeCloseTo(xs(flat), 4)
  })

  it('is deterministic — identical inputs give deep-equal output (epic standing AC)', () => {
    const projectModel = need(scene.projectModel, 'projectModel')
    const a = projectModel(NARROW_PYRAMID, placedAhead(7000), ORIGIN, ASPECT)
    const b = projectModel(NARROW_PYRAMID, placedAhead(7000), ORIGIN, ASPECT)
    expect(a.length).toBeGreaterThan(0)
    expect(a).toEqual(b)
  })
})

describe('scene — obstacleSegments (the wireframe 21-obstacle field)', () => {
  it('projects a non-empty field from the origin pose', () => {
    const segs = need(scene.obstacleSegments, 'obstacleSegments')(ORIGIN, ASPECT)
    expect(segs.length).toBeGreaterThan(0)
    expectFiniteSegments(segs)
  })

  it('draws only window-visible obstacles (segment count matches the per-obstacle sum)', () => {
    const obstacleSegments = need(scene.obstacleSegments, 'obstacleSegments')
    const visibleObstacles = need(scene.visibleObstacles, 'visibleObstacles')
    const projectModel = need(scene.projectModel, 'projectModel')
    const map = need(scene.OBSTACLE_MODEL, 'OBSTACLE_MODEL')
    const pose: TankPose = { x: 4000, z: 4000, heading: 2.0 }
    const expected = visibleObstacles(pose).flatMap((o) =>
      projectModel(map[o.type], { x: o.x, z: o.z, orientation: o.orientation }, pose, ASPECT),
    )
    expect(expected.length).toBeGreaterThan(0) // guard: empty-vs-empty must not vacuously pass
    expect(obstacleSegments(pose, ASPECT)).toEqual(expected)
  })

  it('is deterministic across calls (epic standing AC)', () => {
    const obstacleSegments = need(scene.obstacleSegments, 'obstacleSegments')
    const a = obstacleSegments(ORIGIN, ASPECT)
    const b = obstacleSegments(ORIGIN, ASPECT)
    expect(a.length).toBeGreaterThan(0)
    expect(a).toEqual(b)
  })

  it('does not mutate the shared OBSTACLES table (21 entries before and after)', () => {
    const obstacleSegments = need(scene.obstacleSegments, 'obstacleSegments')
    obstacleSegments(ORIGIN, ASPECT)
    obstacleSegments({ x: -9000, z: 12000, heading: 4.4 }, ASPECT)
    expect(OBSTACLES.length).toBe(21)
  })
})
