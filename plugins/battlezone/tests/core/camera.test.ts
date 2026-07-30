// tests/core/camera.test.ts
//
// Story bz1-3 — RED phase (Furiosa / TEA).
//
// CONTRACT for the GREEN phase (The Word Burgers / DEV): create
// `src/core/camera.ts`, the tank-pose → camera bridge, exporting:
//
//   export interface TankPose {
//     readonly x: number        // planar world X (planar-sim ruling)
//     readonly z: number        // planar world Z
//     readonly heading: number  // radians — ROM angle convention, see below
//   }
//   export const GROUND_Y: number      // −640 — the ROM's baked ground plane
//   export const NEAR_CULL: number     // 1023  ($03ff, mathbox.html)
//   export const FAR_CULL: number      // 31487 ($7aff, mathbox.html)
//   export const H_FOV: number         // π/4 — the confirmed 45° visibility cone
//   export function forwardFromHeading(heading: number): Vec3
//   export function tankView(pose: TankPose): Mat4   // composes with math3d MVP
//
// ROM CONVENTIONS PINNED HERE (findings doc §4, quoting mathbox.html verbatim):
//   * "+X points to the left, +Y up, +Z into the monitor"
//   * "When facing angle 0, the player looks toward +Z"
//   * "Increasing angle rotates counter-clockwise toward +X"
//   * Near plane $03ff (1023), far plane $7aff (31487) — camera-relative clip
//   * EYE AT WORLD y = 0: the ROM bakes eye height into the vertex data — every
//     ground-sitting model's base plane is y = −640 (obstacles/tanks in
//     models.ts), so the camera needs NO eye-height translation. GROUND_Y is
//     exported so ground geometry (and tests) share the constant.
//
// The ported Math Box looks down −Z in eye space (OpenGL convention), so
// tankView() must BRIDGE: world "+Z ahead at heading 0" → eye −Z, and world +X
// → screen-left. These tests pin that bridge behaviorally (where points land),
// not as a specific matrix formula — Dev picks the composition.
//
// Loaded defensively (await import in beforeAll), matching the house pattern
// from bz1-2's obstacles.test.ts: during RED the module does not exist, so each
// test reports a clean assertion failure instead of a collection crash.

import { describe, it, expect, beforeAll } from 'vitest'
import { multiply, transform, type Mat4, type Vec3 } from '@shared/math3d'

interface TankPose {
  readonly x: number
  readonly z: number
  readonly heading: number
}

interface CameraModule {
  GROUND_Y?: number
  NEAR_CULL?: number
  FAR_CULL?: number
  H_FOV?: number
  forwardFromHeading?: (heading: number) => Vec3
  tankView?: (pose: TankPose) => Mat4
}

let cam: CameraModule = {}

beforeAll(async () => {
  try {
    cam = (await import('../../src/core/camera')) as CameraModule
  } catch {
    cam = {}
  }
})

/** Fail loud-and-clear when a contract export is missing (RED-friendly). */
function need<T>(value: T | undefined, name: string): T {
  if (value === undefined) {
    throw new Error(`src/core/camera.ts must export ${name} (bz1-3 RED contract)`)
  }
  return value
}

describe('camera — ROM constants (findings §4, mathbox.html)', () => {
  it('exports NEAR_CULL === 1023 ($03ff — ROM-quoted, exact)', () => {
    expect(need(cam.NEAR_CULL, 'NEAR_CULL')).toBe(1023)
  })

  it('exports FAR_CULL === 31487 ($7aff — ROM-quoted, exact)', () => {
    expect(need(cam.FAR_CULL, 'FAR_CULL')).toBe(31487)
  })

  it('exports H_FOV === π/4 (the confirmed 45° visibility cone, findings §7)', () => {
    expect(need(cam.H_FOV, 'H_FOV')).toBeCloseTo(Math.PI / 4, 12)
  })

  it('exports GROUND_Y === −640 (the base plane every ROM ground model sits on)', () => {
    // NARROW_PYRAMID/WIDE_PYRAMID/TALL_BOX/SHORT_BOX/SLOW_TANK bases are all at
    // y = −640 in models.ts — the ROM pre-offsets vertices so the eye is y = 0.
    expect(need(cam.GROUND_Y, 'GROUND_Y')).toBe(-640)
  })
})

describe('camera — forwardFromHeading (ROM angle convention)', () => {
  it('heading 0 faces +Z ("facing angle 0, the player looks toward +Z")', () => {
    const f = need(cam.forwardFromHeading, 'forwardFromHeading')(0)
    expect(f[0]).toBeCloseTo(0, 9)
    expect(f[1]).toBeCloseTo(0, 9)
    expect(f[2]).toBeCloseTo(1, 9)
  })

  it('heading π/2 faces +X ("increasing angle rotates counter-clockwise toward +X")', () => {
    const f = need(cam.forwardFromHeading, 'forwardFromHeading')(Math.PI / 2)
    expect(f[0]).toBeCloseTo(1, 9)
    expect(f[1]).toBeCloseTo(0, 9)
    expect(f[2]).toBeCloseTo(0, 9)
  })

  it('stays a unit vector in the ground plane for arbitrary headings', () => {
    const forward = need(cam.forwardFromHeading, 'forwardFromHeading')
    for (const h of [0.3, 1.7, 2.9, 4.2, 5.8]) {
      const f = forward(h)
      expect(Math.hypot(f[0], f[1], f[2])).toBeCloseTo(1, 9)
      expect(f[1]).toBeCloseTo(0, 9) // planar-sim ruling: forward never pitches
    }
  })

  it('wraps: heading and heading + 2π give the same direction', () => {
    const forward = need(cam.forwardFromHeading, 'forwardFromHeading')
    const a = forward(1.1)
    const b = forward(1.1 + 2 * Math.PI)
    expect(a[0]).toBeCloseTo(b[0], 9)
    expect(a[2]).toBeCloseTo(b[2], 9)
  })
})

describe('camera — tankView (world → eye bridge)', () => {
  it('a point dead ahead at eye level lands on the eye −Z axis (Math Box convention)', () => {
    const view = need(cam.tankView, 'tankView')({ x: 0, z: 0, heading: 0 })
    // World: heading 0 faces +Z, so (0, 0, 100) is 100 units dead ahead at eye level.
    const eye = transform(view, [0, 0, 100])
    expect(eye[0]).toBeCloseTo(0, 6)
    expect(eye[1]).toBeCloseTo(0, 6)
    expect(eye[2]).toBeCloseTo(-100, 6) // the Math Box looks down −Z
  })

  it('world +X appears to the LEFT ("+X points to the left" — eye x negative)', () => {
    const view = need(cam.tankView, 'tankView')({ x: 0, z: 0, heading: 0 })
    const eye = transform(view, [10, 0, 100]) // ahead and toward world +X
    expect(eye[0]).toBeLessThan(0) // eye/NDC +x is screen-right, so left is negative
    expect(eye[2]).toBeLessThan(0) // still in front
  })

  it('turning toward +X (heading > 0) moves a centered object to the RIGHT', () => {
    const view = need(cam.tankView, 'tankView')({ x: 0, z: 0, heading: 0.1 })
    // The object that WAS dead ahead: turning left must sweep it screen-right.
    const eye = transform(view, [0, 0, 100])
    expect(eye[0]).toBeGreaterThan(0)
  })

  it('the ground plane sits below the eye (GROUND_Y under a level camera)', () => {
    const groundY = need(cam.GROUND_Y, 'GROUND_Y')
    const view = need(cam.tankView, 'tankView')({ x: 0, z: 0, heading: 0 })
    const eye = transform(view, [0, groundY, 500]) // ground point 500 ahead
    expect(eye[1]).toBeLessThan(0) // below the eye axis — no pitch, level camera
    expect(eye[1]).toBeCloseTo(groundY, 6) // eye at world y=0 ⇒ height unchanged
  })

  it('translates with the tank: the same relative offset lands identically', () => {
    const tankView = need(cam.tankView, 'tankView')
    const atOrigin = transform(tankView({ x: 0, z: 0, heading: 0 }), [0, 0, 100])
    const moved = transform(tankView({ x: 8192, z: -4096, heading: 0 }), [8192, 0, -4096 + 100])
    expect(moved[0]).toBeCloseTo(atOrigin[0], 6)
    expect(moved[1]).toBeCloseTo(atOrigin[1], 6)
    expect(moved[2]).toBeCloseTo(atOrigin[2], 6)
  })

  it('rotates with the tank: a point along forward(h) is always dead ahead', () => {
    const tankView = need(cam.tankView, 'tankView')
    const forward = need(cam.forwardFromHeading, 'forwardFromHeading')
    for (const h of [0, 0.9, 2.4, 4.0]) {
      const f = forward(h)
      const view = tankView({ x: 1000, z: 2000, heading: h })
      const eye = transform(view, [1000 + f[0] * 250, 0, 2000 + f[2] * 250])
      expect(eye[0]).toBeCloseTo(0, 5)
      expect(eye[1]).toBeCloseTo(0, 5)
      expect(eye[2]).toBeCloseTo(-250, 5)
    }
  })

  it('is rigid — distances between world points survive the view transform', () => {
    const view = need(cam.tankView, 'tankView')({ x: 300, z: -700, heading: 2.2 })
    const p: Vec3 = [100, -640, 500]
    const q: Vec3 = [-400, 0, 900]
    const pe = transform(view, p)
    const qe = transform(view, q)
    const before = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2])
    const after = Math.hypot(qe[0] - pe[0], qe[1] - pe[1], qe[2] - pe[2])
    expect(after).toBeCloseTo(before, 4)
  })

  it('is pure — identical poses give an identical matrix (determinism, epic AC)', () => {
    const tankView = need(cam.tankView, 'tankView')
    const a = tankView({ x: 12, z: 34, heading: 0.56 })
    const b = tankView({ x: 12, z: 34, heading: 0.56 })
    expect(a.length).toBe(16)
    for (let i = 0; i < 16; i++) expect(a[i]).toBe(b[i])
  })

  it('composes with the Math Box: view is a valid Mat4 for multiply()', () => {
    const view = need(cam.tankView, 'tankView')({ x: 0, z: 0, heading: 1.0 })
    expect(view.length).toBe(16)
    const composed = multiply(view, view) // any 16-length row-major composes
    expect(composed.length).toBe(16)
    for (const v of composed) expect(Number.isFinite(v)).toBe(true)
  })
})
