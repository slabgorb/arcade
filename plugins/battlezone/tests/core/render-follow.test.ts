// tests/core/render-follow.test.ts
//
// Story bz1-4 — RED phase (Furiosa / TEA). Regression coverage the bz1-3
// reviewer routed into this story's red phase (context-story-bz1-4.md, "Forward
// Findings from bz1-3"). These exercise bz1-3's ALREADY-SHIPPED projection
// (camera.ts / scene.ts / horizon.ts) under a MOVING tank — the pipeline this
// story starts driving for real. They lock existing behaviour against
// regression, so several will pass immediately (that is their job); any that
// fail expose a bz1-3 projection gap for Dev to close in GREEN.
//
// Three gaps folded in:
//   1. Full-pipeline ground convergence — the horizon stays welded to NDC y = 0
//      as the tank drives a full circle (AC 2 was only tested in eye space).
//   2. Portrait aspect (< 1) — no NaN / Infinity in skyline or obstacle field.
//   3. Negative-heading wheel/wrap — heading crossing 0 / 2π is continuous.

import { describe, it, expect } from 'vitest'
import type { TankPose } from '../../src/core/camera'
import { skylineSegments } from '../../src/core/horizon'
import { obstacleSegments } from '../../src/core/scene'

const LANDSCAPE = 16 / 9

function assertFinite(segs: readonly { x1: number; y1: number; x2: number; y2: number }[], where: string): void {
  for (const s of segs) {
    for (const v of [s.x1, s.y1, s.x2, s.y2]) {
      expect(Number.isFinite(v), `${where}: expected finite NDC, got ${v}`).toBe(true)
    }
  }
}

describe('gap 1 — ground convergence while driving a full circle', () => {
  it('welds the horizon line to NDC y = 0 at every heading', () => {
    for (let k = 0; k < 48; k++) {
      const heading = (k / 48) * 2 * Math.PI
      const segs = skylineSegments(heading, LANDSCAPE)
      const horizon = segs[0] // the full-width horizon line
      expect(horizon.y1).toBe(0)
      expect(horizon.y2).toBe(0)
      expect(horizon.x1).toBe(-1)
      expect(horizon.x2).toBe(1)
      assertFinite(segs, `skyline @ heading ${heading}`)
    }
  })

  it('keeps the projected obstacle field finite while circling the field', () => {
    for (let k = 0; k < 48; k++) {
      const a = (k / 48) * 2 * Math.PI
      const pose: TankPose = { x: 4000 * Math.cos(a), z: 4000 * Math.sin(a), heading: a }
      assertFinite(obstacleSegments(pose, LANDSCAPE), `obstacles @ circle step ${k}`)
    }
  })
})

describe('gap 2 — portrait aspect (< 1) produces no NaN / Infinity', () => {
  it('skyline and obstacle field stay finite for tall/narrow viewports', () => {
    for (const aspect of [0.5, 0.3, 9 / 16]) {
      assertFinite(skylineSegments(1.0, aspect), `skyline @ aspect ${aspect}`)
      assertFinite(obstacleSegments({ x: 0, z: 0, heading: 0.8 }, aspect), `obstacles @ aspect ${aspect}`)
    }
  })
})

describe('gap 3 — negative-heading wheel/wrap continuity', () => {
  it('a heading just below 0 matches the same heading + 2π (wrap is seamless)', () => {
    const near0 = skylineSegments(-0.0001, LANDSCAPE)
    const near2pi = skylineSegments(2 * Math.PI - 0.0001, LANDSCAPE)
    expect(near0.length).toBe(near2pi.length)
    for (let i = 0; i < near0.length; i++) {
      expect(near0[i].x1).toBeCloseTo(near2pi[i].x1, 4)
      expect(near0[i].y1).toBeCloseTo(near2pi[i].y1, 4)
      expect(near0[i].x2).toBeCloseTo(near2pi[i].x2, 4)
      expect(near0[i].y2).toBeCloseTo(near2pi[i].y2, 4)
    }
  })

  it('never produces NaN for negative headings', () => {
    for (const h of [-0.0001, -1, -Math.PI, -2 * Math.PI, -10]) {
      assertFinite(skylineSegments(h, LANDSCAPE), `skyline @ negative heading ${h}`)
    }
  })
})
