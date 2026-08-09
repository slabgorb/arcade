// tests/core/sw10-1-authentic-lens.test.ts
//
// Story sw10-1 — Unify on the cabinet's authentic projection lens (RED phase).
//
// Source of truth: plugins/star-wars/docs/2026-08-08-star-wars-projection-audit.md
// (audit commit 3580752), confirmed against the 1983 MACRO-11 source
// (SWMP.DOC / WSMAIN.MAC): the cabinet projects with a SYMMETRIC ~90° field of
// view (45° half-angle on BOTH axes), perspective-dividing by the depth axis,
// with an aspect-INDEPENDENT clip test (`|lateral| < depth`, `|vertical| < depth`).
//
// Our lens diverges: FOV_Y = 60° (30° vertical half-angle), horizontal scaled by
// the viewport aspect (`f/aspect`) — so it is neither symmetric nor
// aspect-independent, and it forced the per-model *_ORIENT axis-swap hacks in
// render.ts to bridge ROM object space into the wrong frame one model at a time.
//
// These tests pin the AUTHENTIC lens. They FAIL against the current 60°
// anisotropic lens and go GREEN only once the projection is symmetric ~90° and
// aspect-independent. They assert lens SHAPE (angles / ratios / symmetry /
// aspect-independence), never absolute placement — placement re-derivation is
// explicitly deferred to sw10-2 (AC #5), so nothing here pins a scene constant.
//
// The lens is exercised through two seams the game already commits to:
//   • the FORWARD projection — `perspective(FOV_Y, aspect, …)` + `transform`
//     (the exact `perspective(FOV_Y, w/h, …)` the scene is drawn under, render.ts:490);
//   • the INVERSE projection — `gameRules.aimDirection`, the crosshair→world ray
//     documented as "the INVERSE of the perspective projection the scene is drawn
//     under" (gameRules.ts). Whatever world-frame design GREEN adopts, these two
//     must express the same authentic lens.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { perspective, transform, type Vec3, type Mat4 } from '@shared/math3d'
import { FOV_Y, aimDirection } from '../../src/core/gameRules'

const DEG = Math.PI / 180

// near/far scale only the NDC z channel; the divide is by w = -z, so NDC x/y are
// independent of these. Any positive pair works for the lateral/vertical claims.
const NEAR = 1
const FAR = 1000

describe('sw10-1 — authentic cabinet projection lens (symmetric ~90° FOV, divide-by-depth)', () => {
  describe('field of view magnitude', () => {
    it('FOV_Y is a symmetric ~90° field of view (45° half-angle), not the 60° anisotropic lens', () => {
      // Cabinet: symmetric 90° (the clip test is literally |Y| < X, |Z| < X).
      // RED now: FOV_Y = 60° (Math.PI / 3).
      expect(FOV_Y).toBeGreaterThan(85 * DEG)
      expect(FOV_Y).toBeLessThan(95 * DEG)
    })
  })

  describe('forward projection — 45° half-angle on both axes (square viewport)', () => {
    // At a square viewport the aspect term drops out, so the ONLY thing that puts
    // a 45°-edge point at the NDC boundary is a 90° FOV (f = 1/tan(45°) = 1).
    const proj: Mat4 = perspective(FOV_Y, 1, NEAR, FAR)
    const project = (v: Vec3) => transform(proj, v)
    const d = 500 // an arbitrary depth; a point at (±d, 0, -d) sits on the 45° edge

    it('a point whose lateral offset equals its depth lands on the horizontal edge (NDC x = ±1)', () => {
      // RED now: gives ±tan(60°/2)⁻¹ scaling → ±1.732, well past the edge.
      expect(project([d, 0, -d])[0]).toBeCloseTo(1, 5)
      expect(project([-d, 0, -d])[0]).toBeCloseTo(-1, 5)
    })

    it('a point whose vertical offset equals its depth lands on the vertical edge (NDC y = ±1)', () => {
      // RED now: ±1.732.
      expect(project([0, d, -d])[1]).toBeCloseTo(1, 5)
      expect(project([0, -d, -d])[1]).toBeCloseTo(-1, 5)
    })

    it('the horizontal and vertical half-angles are equal (symmetric FOV)', () => {
      // The edge magnitude on x must match the edge magnitude on y — a square lens.
      const rightEdge = Math.abs(project([d, 0, -d])[0])
      const topEdge = Math.abs(project([0, d, -d])[1])
      expect(rightEdge).toBeCloseTo(topEdge, 5)
      // …and that shared magnitude is the NDC boundary, 1 — RED now (both 1.732).
      expect(rightEdge).toBeCloseTo(1, 5)
    })

    it('divides by depth: a point at lateral = k·depth projects to NDC k, at any depth', () => {
      // Pins BOTH the 1/depth divide AND the authentic f = 1 magnitude.
      // RED now: k·1.732 instead of k.
      for (const depth of [d, 2 * d, 0.5 * d]) {
        expect(project([0.5 * depth, 0, -depth])[0]).toBeCloseTo(0.5, 5)
        expect(project([0, 0.25 * depth, -depth])[1]).toBeCloseTo(0.25, 5)
      }
    })
  })

  describe('inverse projection (aimDirection) — the crosshair→world ray under the same lens', () => {
    it('the crosshair horizontal edge ray sits at 45° (|lateral| = |depth|)', () => {
      // NDC x = 1 is the right edge; under a symmetric 90° lens that ray is at 45°,
      // so its lateral component equals its depth component in magnitude. sw10-1:
      // native ray = [depth(X), right(Y), up(Z)], so lateral = edge[1], depth = edge[0].
      const edge = aimDirection(1, 0)
      expect(Math.abs(edge[1])).toBeCloseTo(Math.abs(edge[0]), 5)
    })

    it('the crosshair vertical edge ray sits at 45° (|vertical| = |depth|)', () => {
      // native: vertical = up = edge[2], depth = edge[0].
      const edge = aimDirection(0, 1)
      expect(Math.abs(edge[2])).toBeCloseTo(Math.abs(edge[0]), 5)
    })

    it('horizontal and vertical edge rays are equally off-axis (symmetric FOV)', () => {
      const hx = aimDirection(1, 0)
      const vy = aimDirection(0, 1)
      expect(Math.abs(hx[1])).toBeCloseTo(Math.abs(vy[2]), 5)
    })

    it('the lens is aspect-independent: the crosshair edge ray does not depend on viewport aspect', () => {
      // Cabinet clip is |Y| < X regardless of viewport shape. The edge ray must be
      // identical at every aspect — RED now, where the `* aspect` term skews it.
      const aspects = [1, 4 / 3, 16 / 9, 21 / 9]
      const rays = aspects.map((a) => aimDirection(1, 0, a))
      for (const r of rays) {
        expect(r[0]).toBeCloseTo(rays[0][0], 5)
        expect(r[1]).toBeCloseTo(rays[0][1], 5)
        expect(r[2]).toBeCloseTo(rays[0][2], 5)
        // …and every one of them is the same 45° edge ray (native: right=[1], depth=[0]).
        expect(Math.abs(r[1])).toBeCloseTo(Math.abs(r[0]), 5)
      }
    })
  })

  describe('render.ts — per-model *_ORIENT axis-swap hacks are retired (AC #2)', () => {
    // Source guard: the axis-swap hacks exist ONLY because the base lens/frame is
    // wrong and is corrected ad-hoc per object. Once the lens is authentic, the
    // per-model orientation rotations must be gone (removed) or neutralized (no
    // longer a rotation). Comments and string data are stripped first so the guard
    // can't be defeated by wording (see core-purity.test.ts).
    const raw = readFileSync(new URL('../../src/shell/render.ts', import.meta.url), 'utf8')
    const stripped = stripStrings(stripComments(raw))

    // Sanity: prove we actually loaded the render source, so the checks below
    // aren't vacuous passes against an empty read.
    it('scans the real render source', () => {
      expect(stripped).toContain('drawWireframe')
    })

    // The pure single-line axis-swap rotations named in the story title.
    for (const name of ['SURFACE_ORIENT', 'PORT_ORIENT', 'TIE_ORIENT']) {
      it(`${name} no longer applies a per-model axis-swap rotation`, () => {
        const decl = declLine(stripped, name)
        // Removed entirely counts as retired (no declaration to inspect).
        if (decl === null) return
        // RED now: e.g. `export const SURFACE_ORIENT: Mat4 = rotationZ(-Math.PI / 2)`.
        expect(decl).not.toMatch(/rotation[XYZ]\s*\(/)
      })
    }
  })
})

// --- helpers (mirrors core-purity.test.ts so the guard normalizes identically) ---

/** Remove block and line comments so a banned pattern can't hide in prose. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ')
}

/** Blank out string / template literal CONTENTS so data can't masquerade as code. */
function stripStrings(src: string): string {
  return src
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, '``')
}

/** The (comment-stripped) declaration line of `const NAME`, or null if absent. */
function declLine(src: string, name: string): string | null {
  const re = new RegExp(`\\b(?:export\\s+)?const\\s+${name}\\b`)
  const line = src.split('\n').find((l) => re.test(l))
  return line ?? null
}
