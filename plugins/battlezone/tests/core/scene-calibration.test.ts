// tests/core/scene-calibration.test.ts
//
// Story bz2-3 — RED phase (Han Solo / TEA): camera/scale calibration.
//
// THE BUG (first live playtest, epic bz2): "camera/scale reads too close —
// obstacles and enemies loom larger/nearer than intended."
//
// ROOT CAUSE — a CONFLATION baked in at bz1-3. `sceneProjection` reused
// `H_FOV` for the DISPLAY field of view. But `H_FOV` is the ROM-CONFIRMED 45°
// *visibility / cull cone* (findings §7: "units on the battlefield are visible
// in a cone 45 degrees wide, which is why when you spin in a circle the
// battlefield objects move out of sync with the background"). That §7 quote is
// itself the proof the display projection is NOT 45°: objects moving "out of
// sync with the background" can only happen if the on-screen field is WIDER
// than the cull cone. Reusing the 45° cone as the display FOV magnifies every
// object by 1/tan(22.5°) ≈ 2.41× — an object at the very edge of the cull cone
// lands exactly on the screen edge, so everything fills the screen and "looms."
//
// THE FIX (contract for Yoda / DEV): decouple the DISPLAY field of view from
// the visibility cone. `sceneProjection` must project a field WIDER than the
// 45° cone — the epic's documented ~90° background-horizon field (= 2× the
// confirmed cone), which yields the clean focal-length-1 projection and
// reproduces the §7 object/background parallax. The 45° cone (`H_FOV`) and the
// [NEAR_CULL, FAR_CULL] window must NOT change — the fix widens what the eye
// SEES, not what the ROM CULLS. Introduce a new display-FOV constant; do not
// repurpose `H_FOV` (the radar wedge and horizon backdrop still key off it).
//
// The exact 90° MAGNITUDE rests on the epic's "90° horizon" claim, which the
// ROM quarry could not confirm (see the Design Deviation in the session file
// and bz1-3's history). It is 2× the CONFIRMED cone — a principled target, not
// an arbitrary one — and the epic closes with a live playtest that is the final
// calibration gate. These tests pin that target; a playtest retune is a
// follow-up, not a silent contract change.
//
// PURE geometry — no DOM, no time, no randomness (core discipline).

import { describe, it, expect } from 'vitest'
import { transform } from '@shared/math3d'
import { sceneProjection, projectModel } from '../../src/core/scene'
import { H_FOV, NEAR_CULL, FAR_CULL } from '../../src/core/camera'
import { WIDE_PYRAMID } from '../../src/core/models'

// The original cabinet's addressable display is ~1024×768 — 4:3.
const ASPECT = 4 / 3
const ORIGIN = { x: 0, z: 0, heading: 0 }

/**
 * The horizontal field of view the projection actually subtends, recovered
 * from the perspective matrix: `matrix[0] = 1 / tan(FOV_h / 2)`, independent of
 * aspect (sceneProjection derives fovY from the horizontal FOV + aspect).
 */
function horizontalFov(aspect: number): number {
  const m = sceneProjection(aspect)
  return 2 * Math.atan(1 / m[0])
}

/**
 * NDC of an eye-space point at horizontal bearing `theta` off the view axis,
 * `d` units in front of the camera, at eye level (y = 0). Bearing 0 is dead
 * ahead; |NDC x| = 1 is the screen edge.
 */
function ndcAtBearing(theta: number, d: number, aspect: number): readonly [number, number, number] {
  return transform(sceneProjection(aspect), [Math.sin(theta) * d, 0, -Math.cos(theta) * d])
}

describe('bz2-3 — display FOV is decoupled from the 45° visibility cone (the bug)', () => {
  it('projects a field WIDER than the 45° visibility/cull cone (objects were looming ~2.41×)', () => {
    // The defect in one assertion: the display field must not equal the cull
    // cone. Under the bug horizontalFov === H_FOV (45°); the fix widens it.
    expect(horizontalFov(ASPECT)).toBeGreaterThan(H_FOV)
  })

  it('a target at the edge of the 45° visibility cone renders well INSIDE the frame, not on its edge', () => {
    // Under the bug a cull-cone-edge object (22.5° off-axis) sat exactly on the
    // screen edge (|x| = 1.0). It must now fall clearly inside the frame.
    const ndc = ndcAtBearing(H_FOV / 2, 6000, ASPECT)
    expect(Math.abs(ndc[0])).toBeLessThan(0.9)
  })
})

describe('bz2-3 — the corrected field is the ~90° background-horizon (2× the cull cone)', () => {
  it('subtends a 90° horizontal display FOV — focal length 1 (playtest-tunable target)', () => {
    // 2 × the CONFIRMED 45° cone. Magnitude rests on the epic 90° horizon claim
    // (quarry-unconfirmed) — see Design Deviation; live playtest is final gate.
    expect(horizontalFov(ASPECT)).toBeCloseTo(2 * H_FOV, 2) // 90° within ~0.3°
  })

  it('the screen edge |x| = 1 corresponds to a 45° bearing (±45° ⇒ 90° wide)', () => {
    const ndc = ndcAtBearing(Math.PI / 4, 6000, ASPECT)
    expect(Math.abs(ndc[0])).toBeCloseTo(1, 2)
  })

  it('the visibility-cone edge (22.5°) lands near half-frame — tan(22.5°) ≈ 0.414', () => {
    const ndc = ndcAtBearing(H_FOV / 2, 6000, ASPECT)
    expect(Math.abs(ndc[0])).toBeCloseTo(Math.tan(H_FOV / 2), 2)
  })

  it('the display field stays aspect-invariant (90° horizontal at 4:3, 16:9, and 1:1)', () => {
    expect(horizontalFov(16 / 9)).toBeCloseTo(2 * H_FOV, 2)
    expect(horizontalFov(1)).toBeCloseTo(2 * H_FOV, 2)
  })
})

describe('bz2-3 — the ROM-confirmed 45° cone and cull window are UNCHANGED (guard)', () => {
  it('H_FOV (the §7 visibility cone) stays 45° — the fix must widen DISPLAY, not culling', () => {
    // Guard against a "fix" that widens the cull cone: H_FOV drives the radar
    // wedge and horizon backdrop, and is the quarry-confirmed value.
    expect(H_FOV).toBeCloseTo(Math.PI / 4, 10)
  })

  it('the near/far cull window keeps its ROM values ($03ff / $7aff)', () => {
    expect(NEAR_CULL).toBe(1023)
    expect(FAR_CULL).toBe(31487)
  })
})

describe('bz2-3 — obstacles read at the correct distance (no looming off-frame)', () => {
  it('a wide pyramid at a representative near-field distance fits ENTIRELY within the NDC frame', () => {
    // Exercises the real projectModel path (used by obstacles, the player
    // shell, and enemies). At 2200 units dead ahead the pyramid overflowed BOTH
    // screen axes under the 45° display FOV (|NDC| up to ~1.47) — the "objects
    // loom larger than intended" symptom. It must now project inside the frame.
    const segs = projectModel(WIDE_PYRAMID, { x: 0, z: 2200, orientation: 0 }, ORIGIN, ASPECT)
    expect(segs.length).toBeGreaterThan(0) // guard: not vacuously passing on []
    for (const s of segs) {
      expect(Math.abs(s.x1)).toBeLessThanOrEqual(1)
      expect(Math.abs(s.y1)).toBeLessThanOrEqual(1)
      expect(Math.abs(s.x2)).toBeLessThanOrEqual(1)
      expect(Math.abs(s.y2)).toBeLessThanOrEqual(1)
    }
  })
})
