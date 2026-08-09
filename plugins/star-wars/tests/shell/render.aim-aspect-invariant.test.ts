// tests/shell/render.aim-aspect-invariant.test.ts
//
// sw10-1 REWORK (Reviewer F1) — the authentic lens must be aspect-independent
// END-TO-END: in the SIM aim AND in the RENDER glass, not just the sim half.
//
// The green pass made the sim aspect-independent — `aimDirection` (gameRules.ts)
// is `normalize([1, aimX/f, aimY/f])` and `inPlayerView` uses `hBound = vBound`
// (tie-status.ts) — but left the RENDER projection aspect-DEPENDENT:
// `render.ts:500` (and its duplicate `debug-overlay.ts:213`) still build
// `perspective(FOV_Y, w / h, NEAR, FAR)` at the real full-window aspect
// (`main.ts` W = innerWidth, H = innerHeight; `@shared/view` fills the window).
//
// On develop the old `aimDirection`'s `* aspect` term exactly cancelled the
// render's `f / aspect`, so the crosshair and the fired ray agreed at every
// aspect. Dropping the sim-side term WITHOUT making the render aspect-independent
// breaks that cancellation: a world point on the aim ray now projects to
// NDC.x = aimX / aspect, while `crosshairNdc` (gameRules.ts) draws the reticle at
// raw aimX. On a normal ~16:9 window an off-centre shot misses the very TIE under
// the crosshair by the aspect factor — the "8-16 kill-loop" bug, reintroduced on
// the HORIZONTAL axis. The existing kill-loop / frustum suites cannot see it:
// they keep every enemy on the vertical axis on purpose ("aspect only scales X",
// combat-kill-loop.test.ts:68) — that comment IS the unguarded seam.
//
// WHY BIND TO A RENDER SEAM (not a reconstruction). A test that rebuilds
// `perspective(FOV_Y, aspect, …)` itself (the combat-kill-loop `projectNdc`
// idiom) cannot verify the fix: once Dev makes the RENDER aspect-independent the
// reconstruction still scales X and the test would stay red forever — apparatus
// that fails by its own hand, not the code's (typescript.md #18). So this suite
// pins the ONE projection the render actually draws with. `render.ts` today
// exports no such seam and builds the matrix inline (duplicated in
// `debug-overlay.ts`), so the fix is to expose ONE `sceneProjection(w, h)` that
// BOTH consume, and make it aspect-independent (feed `perspective` aspect = 1 and
// letterbox the viewport, per TEA's own Delivery Finding). Until that export
// exists these tests are RED at the seam; after it exists and is
// aspect-independent they go GREEN. The namespace cast keeps `tsc` green while the
// export is absent, so the RED is a legible runtime failure, not a compile break.

import { describe, it, expect } from 'vitest'
import { viewMatrix, transform, scale, type Vec3, type Mat4 } from '@shared/math3d'
import { aimDirection, crosshairNdc, FOV_Y, COCKPIT } from '../../src/core/gameRules'
import { CAMERA_ORIENT } from '../../src/core/basis'
import * as RenderModule from '../../src/shell/render'

// The seam the rework must expose from render.ts: the scene projection matrix for
// a `w × h` canvas — the SAME matrix `render()` and `drawDebugOverlay()` draw
// with (today each builds `perspective(FOV_Y, w/h, NEAR, FAR)` inline; the fix
// centralises them here and makes the result aspect-independent). Cast, not
// imported directly, so tsc stays green until the export lands.
const sceneProjection = (
  RenderModule as unknown as { sceneProjection?: (w: number, h: number) => Mat4 }
).sceneProjection

/** Project a native world point through the REAL scene camera + projection at a
 *  `w × h` canvas — the exact pipeline the shell renders with. Throws a legible
 *  failure (not a TypeError) while the seam is unimplemented. */
function renderNdc(pos: Vec3, w: number, h: number): readonly [number, number] {
  if (typeof sceneProjection !== 'function') {
    throw new Error(
      'render.ts must export `sceneProjection(w, h)` (sw10-1 rework F1) — the one ' +
        'aspect-independent projection both render() and drawDebugOverlay() draw with.',
    )
  }
  const eye = transform(viewMatrix(COCKPIT, CAMERA_ORIENT), pos)
  const ndc = transform(sceneProjection(w, h), eye)
  return [ndc[0], ndc[1]]
}

describe('sw10-1 rework (Reviewer F1) — the render glass is aspect-independent, end-to-end with the aim', () => {
  // Two decidedly non-square, decidedly different windows plus a square control.
  const SQUARE: readonly [number, number] = [1000, 1000] // aspect 1
  const WIDE: readonly [number, number] = [1920, 1080] // aspect 16:9 ≈ 1.778
  const ULTRAWIDE: readonly [number, number] = [2560, 1080] // aspect 21:9 ≈ 2.370

  it('render.ts exposes a `sceneProjection(w, h)` seam (one projection for scene + overlay)', () => {
    // RED now: render.ts builds `perspective(FOV_Y, w/h)` inline at :500 and
    // debug-overlay.ts duplicates it at :213 — neither is a shared, testable seam.
    expect(typeof sceneProjection).toBe('function')
  })

  it('projects a fixed off-axis world point to the SAME horizontal NDC at every window aspect', () => {
    // A point off to the right (native right = +Y) and dead level. Its screen
    // position must not depend on the window's shape — the cabinet lens is
    // aspect-independent. RED now: perspective(FOV_Y, w/h) scales X by 1/aspect,
    // so NDC.x shrinks as the window widens.
    const p: Vec3 = [2000, 900, 0] // native [depth, right, up]
    const [xSquare] = renderNdc(p, ...SQUARE)
    const [xWide] = renderNdc(p, ...WIDE)
    const [xUltra] = renderNdc(p, ...ULTRAWIDE)
    expect(xWide).toBeCloseTo(xSquare, 5)
    expect(xUltra).toBeCloseTo(xSquare, 5)
  })

  it('a point on the fired ray lands under the crosshair on the HORIZONTAL axis, on a 16:9 window', () => {
    // The invariant `aimDirection`'s own docstring promises: "a point down this ray
    // projects back onto the crosshair at NDC [aimX, aimY], so the bolt hits what
    // the player aimed at." Off-centre horizontal aim, non-square window — the case
    // the kill-loop suite deliberately skips. RED now: the ray lands at aimX/aspect.
    const aimX = 0.5
    const ray = aimDirection(aimX, 0) // native [depth, right, up]
    const onRay = scale(ray, 1500) // a point 1500 units down the fired ray
    const [ndcX] = renderNdc(onRay, ...WIDE)
    const [crossX] = crosshairNdc(aimX, 0)
    expect(ndcX).toBeCloseTo(crossX, 5)
  })

  it('the fired ray tracks the crosshair across the whole horizontal span at 21:9', () => {
    // Not just one seat: sweep the reticle horizontally on an ultrawide window and
    // require the ray to follow it everywhere. A gate that ignores the window shape
    // reddens here at every off-centre aimX. RED now on ultrawide (worst case).
    for (const aimX of [-0.8, -0.3, 0.3, 0.8]) {
      const onRay = scale(aimDirection(aimX, 0), 1500)
      const [ndcX] = renderNdc(onRay, ...ULTRAWIDE)
      const [crossX] = crosshairNdc(aimX, 0)
      expect(ndcX, `aimX=${aimX} at 21:9`).toBeCloseTo(crossX, 5)
    }
  })

  it('still agrees on the VERTICAL axis (regression guard — the fix must not break the axis that already worked)', () => {
    // The vertical axis was correct before and must stay correct: perspective
    // scales Y by f (no aspect), and aimY/f matches. This passes today and must
    // keep passing after the horizontal fix — so a fix that letterboxes the WRONG
    // axis, or swaps the scaling, is caught here.
    const aimY = 0.5
    const onRay = scale(aimDirection(0, aimY), 1500)
    const [, ndcY] = renderNdc(onRay, ...WIDE)
    const [, crossY] = crosshairNdc(0, aimY)
    expect(ndcY).toBeCloseTo(crossY, 5)
  })

  it('FOV_Y is the authentic symmetric 90° lens (unchanged anchor — f = 1)', () => {
    // Anchors the constant the whole invariant rests on, so a fix that "restores"
    // aspect by also moving FOV is caught. tan(FOV_Y/2) = 1 ⇒ f = 1.
    expect(Math.tan(FOV_Y / 2)).toBeCloseTo(1, 10)
  })
})
