// tests/model-view.test.ts — SH4-1
//
// Behaviour of the newly-extracted pure @shared/model-view module: the three
// dev-tool helpers lifted out of red-baron/star-wars/tempest (cellRects,
// fitDistance, modelBounds). Pure — no DOM, no time, no randomness — so it lives
// in the shared library and is unit-tested here. The golden values below are the
// SAME ones the pre-extraction game suites asserted (tempest cellRects(900,400,6,3),
// red-baron/star-wars modelBounds on the unit cube), so a byte-faithful lift keeps
// them green.
import { describe, it, expect } from 'vitest'
import { cellRects, fitDistance, modelBounds } from '@shared/model-view'
import type { Vec3 } from '@shared/math3d'

describe('cellRects', () => {
  it('returns exactly `count` rects', () => {
    expect(cellRects(900, 400, 6, 3)).toHaveLength(6)
    expect(cellRects(900, 400, 5, 3)).toHaveLength(5)
  })

  it('places cells row-major across `cols` columns (3 cols × 2 rows → 300×200)', () => {
    const r = cellRects(900, 400, 6, 3)
    expect(r[0]).toEqual({ x: 0, y: 0, w: 300, h: 200 })
    expect(r[1]).toEqual({ x: 300, y: 0, w: 300, h: 200 })
    expect(r[2]).toEqual({ x: 600, y: 0, w: 300, h: 200 })
    expect(r[3]).toEqual({ x: 0, y: 200, w: 300, h: 200 })
    expect(r[4]).toEqual({ x: 300, y: 200, w: 300, h: 200 })
    expect(r[5]).toEqual({ x: 600, y: 200, w: 300, h: 200 })
  })

  it('tiles the area — rightmost column reaches w, bottom row reaches h', () => {
    const r = cellRects(900, 400, 6, 3)
    expect(r[2].x + r[2].w).toBe(900)
    expect(r[3].y + r[3].h).toBe(400)
  })

  it('clamps cols below 1 up to a single column', () => {
    const r = cellRects(100, 100, 4, 0)
    expect(r).toHaveLength(4)
    // 1 col, ceil(4/1)=4 rows → 100×25 cells stacked vertically
    expect(r[0]).toEqual({ x: 0, y: 0, w: 100, h: 25 })
    expect(r[3]).toEqual({ x: 0, y: 75, w: 100, h: 25 })
  })

  it('returns an empty grid for a zero count', () => {
    expect(cellRects(100, 100, 0, 2)).toEqual([])
  })
})

describe('fitDistance', () => {
  it('grows with radius', () => {
    expect(fitDistance(200, Math.PI / 3)).toBeGreaterThan(fitDistance(100, Math.PI / 3))
  })

  it('frames the sphere to subtend ~70% of the vertical FOV', () => {
    // fitDistance solves 2·atan(r/d) = FILL·fovY with FILL = 0.7. Recovering the
    // subtended angle from the returned distance pins FILL geometrically, without
    // re-deriving the tan() formula (which would be a circular assertion).
    const fovY = Math.PI / 3
    const d = fitDistance(200, fovY)
    expect(2 * Math.atan(200 / d)).toBeCloseTo(0.7 * fovY)
  })

  it('is finite and positive for a degenerate (zero-radius) model', () => {
    const d = fitDistance(0, Math.PI / 3)
    expect(Number.isFinite(d)).toBe(true)
    expect(d).toBeGreaterThan(0)
  })

  it('clamps a sub-epsilon radius to the same distance as zero', () => {
    // A degenerate radius is clamped to 1e-3, so anything at or below it yields
    // the identical framing distance.
    const fovY = Math.PI / 3
    expect(fitDistance(0, fovY)).toBe(fitDistance(1e-3, fovY))
    expect(fitDistance(1e-4, fovY)).toBe(fitDistance(0, fovY))
  })
})

describe('modelBounds', () => {
  const CUBE: readonly Vec3[] = [
    [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5],
    [-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5],
  ]

  it('centres the unit cube at the origin with the corner radius', () => {
    const { center, radius } = modelBounds(CUBE)
    expect(center[0]).toBeCloseTo(0)
    expect(center[1]).toBeCloseTo(0)
    expect(center[2]).toBeCloseTo(0)
    expect(radius).toBeCloseTo(Math.sqrt(0.75)) // half space-diagonal of a 1×1×1 cube
  })

  it('finds the AABB centre of an off-origin point set', () => {
    const points: readonly Vec3[] = [[0, 0, 0], [10, 4, -2]]
    expect(modelBounds(points).center).toEqual([5, 2, -1])
  })

  it('a single point is its own centre with zero radius', () => {
    const { center, radius } = modelBounds([[3, -1, 7]])
    expect(center).toEqual([3, -1, 7])
    expect(radius).toBe(0)
  })

  it('accepts a bare readonly Vec3[] (red-baron signature), not a Model3D wrapper', () => {
    // The shared signature is `readonly Vec3[]` — passing a raw coordinate array
    // must type-check and compute, no { vertices } envelope required.
    const line: readonly Vec3[] = [[0, 0, 0], [2, 0, 0]]
    expect(modelBounds(line).center).toEqual([1, 0, 0])
    expect(modelBounds(line).radius).toBeCloseTo(1)
  })
})
