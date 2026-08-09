// tests/core/surface-grid.test.ts
//
// Story 11-5 — Procedural Death Star surface: a receding ground grid + horizon.
// RED phase. These tests define the contract and are EXPECTED TO FAIL until the
// GREEN phase implements it.
//
// WHY THIS STORY EXISTS (see docs/adr/0002-scene-geometry-surface-and-trench.md
// part A): DEATH_STAR_SURFACE (Object_8) is a narrow 3-fin spike, never a ground.
// Seated 600 units from the eye it balloons off every screen edge and collapses
// to a triangle at the crosshair — the surface phase reads as a triangle, not a
// surface. The fix is a PURE, deterministic core generator that builds a wide,
// receding ground grid on the y=0 plane and scrolls it toward the cockpit.
//
// THE CONTRACT this suite asks DEV to implement:
//
//   src/core/surface-grid.ts:
//     export function surfaceGrid(scroll: number): Model3D
//     export const GRID_X: number            // lateral spacing of longitudinal lines
//     export const GRID_Z: number            // spacing of lateral lines (the scroll period)
//     export const GRID_HALF_WIDTH: number   // outermost longitudinal line at x = ±GRID_HALF_WIDTH
//     export const GRID_FAR: number          // far cutoff (the grid recedes to z ≈ -GRID_FAR)
//
//   src/core/state.ts — GameState gains:
//     surfaceScrollZ: number   // accumulator; initialState() seeds it to 0
//
//   src/core/sim.ts:
//     - stepSurface advances surfaceScrollZ by TURRET_SCROLL_SPEED·dt (the SAME
//       flow that scrolls the turrets), and surfaceGrid reads it.
//     - enterPhase resets surfaceScrollZ to 0 on every phase entry.
//
// DESIGN DECISIONS (logged as TEA deviations — the spec left these open):
//   - Module path: the generator + its GRID_* envelope constants live in a
//     dedicated `src/core/surface-grid.ts` (single responsibility; 11-6's
//     trenchChannel will mirror it). Dev may split internally and re-export.
//   - Return type: a `Model3D` (the story description says `-> Model3D`), so the
//     shell strokes it through the existing drawWireframe like every other model.
//
// Tests reference GRID_* BY NAME, never hard-coded numbers, so they stay correct
// whatever authentic-feel values GREEN settles on (the surface.test.ts pattern).
// Per the repo's RED convention, `tsc` is red until the new symbols exist; vitest
// (esbuild, no typecheck) still RUNS these and reports the contract as failing.

import { describe, it, expect } from 'vitest'
import {
  surfaceGrid,
  GRID_X,
  GRID_Z,
  GRID_HALF_WIDTH,
  GRID_FAR,
} from '../../src/core/surface-grid'
import {
  initialState,
  SURFACE_SEED_SPEED,
  SURFACE_ACCEL,
  type GameState,
} from '../../src/core/state'
import { stepGame, enterPhase } from '../../src/core/sim'
import { NO_INPUT } from '../../src/core/input'
import { DEATH_STAR_SURFACE, type Model3D } from '../../src/core/models'

const EPS = 1e-6

/** Distinct right-values (native Y) carrying a LONGITUDINAL line (an edge parallel
 *  to +X depth: both endpoints share a right and differ in depth), sorted ascending. */
function longitudinalRights(m: Model3D): number[] {
  const ys = new Set<number>()
  for (const [a, b] of m.edges) {
    const va = m.vertices[a]
    const vb = m.vertices[b]
    if (va[1] === vb[1] && va[0] !== vb[0]) ys.add(va[1])
  }
  return [...ys].sort((p, q) => p - q)
}

/** Distinct depth-values (native X) carrying a LATERAL line (an edge across right Y:
 *  both endpoints share a depth and differ in right), sorted ascending. */
function lateralDepths(m: Model3D): number[] {
  const ds = new Set<number>()
  for (const [a, b] of m.edges) {
    const va = m.vertices[a]
    const vb = m.vertices[b]
    if (va[0] === vb[0] && va[1] !== vb[1]) ds.add(va[0])
  }
  return [...ds].sort((p, q) => p - q)
}

// --- AC1: surfaceGrid is a well-formed Model3D on the native floor plane -------

describe('Story 11-5 — surfaceGrid: shape & the ground plane', () => {
  it('returns a Model3D with vertices and edges', () => {
    const g = surfaceGrid(0)
    expect(typeof g.name).toBe('string')
    expect(Array.isArray(g.vertices)).toBe(true)
    expect(Array.isArray(g.edges)).toBe(true)
    expect(g.vertices.length).toBeGreaterThan(0)
    expect(g.edges.length).toBeGreaterThan(0)
  })

  it('every vertex is a finite 3D point', () => {
    const g = surfaceGrid(0)
    for (const v of g.vertices) {
      expect(v).toHaveLength(3)
      expect(Number.isFinite(v[0])).toBe(true)
      expect(Number.isFinite(v[1])).toBe(true)
      expect(Number.isFinite(v[2])).toBe(true)
    }
  })

  it('every edge indexes two distinct, in-range vertices (no degenerate edges)', () => {
    const g = surfaceGrid(0)
    for (const [a, b] of g.edges) {
      expect(Number.isInteger(a)).toBe(true)
      expect(Number.isInteger(b)).toBe(true)
      expect(a).not.toBe(b)
      expect(a).toBeGreaterThanOrEqual(0)
      expect(b).toBeGreaterThanOrEqual(0)
      expect(a).toBeLessThan(g.vertices.length)
      expect(b).toBeLessThan(g.vertices.length)
    }
  })

  it('lies flat on the native floor plane up=0 (this is a floor, not the up-spanning spike)', () => {
    const g = surfaceGrid(0)
    for (const v of g.vertices) expect(v[2]).toBe(0) // native up (+Z) = 0
  })
})

// --- AC1: pure & deterministic ----------------------------------------------

describe('Story 11-5 — surfaceGrid is pure & deterministic', () => {
  it('returns identical geometry for identical scroll (no DOM/time/random state)', () => {
    // Repeated calls must match exactly — a Math.random()/Date.now() leak would
    // diverge here. Purity is further guaranteed by the core/shell boundary
    // (the generator lives in core/, which may never touch the shell).
    expect(surfaceGrid(0)).toEqual(surfaceGrid(0))
    expect(surfaceGrid(137.5)).toEqual(surfaceGrid(137.5))
  })
})

// --- AC1: width / length envelope & line counts ------------------------------

describe('Story 11-5 — surfaceGrid envelope & line counts', () => {
  it('spans the full width: outermost longitudinal lines reach right = ±GRID_HALF_WIDTH', () => {
    const ys = surfaceGrid(0).vertices.map((v) => v[1]) // native right (+Y)
    expect(Math.max(...ys)).toBeCloseTo(GRID_HALF_WIDTH)
    expect(Math.min(...ys)).toBeCloseTo(-GRID_HALF_WIDTH)
  })

  it('is mirror-symmetric across right=0 (for every (depth,y,0) there is a (depth,-y,0))', () => {
    const g = surfaceGrid(0)
    const present = new Set(g.vertices.map((v) => `${v[1]}|${v[0]}`))
    for (const v of g.vertices) {
      expect(present.has(`${-v[1]}|${v[0]}`)).toBe(true)
    }
  })

  it('spaces the longitudinal lines exactly GRID_X apart, with no gaps', () => {
    const ys = longitudinalRights(surfaceGrid(0))
    expect(ys.length).toBeGreaterThanOrEqual(3) // a grid, not a lone line
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i] - ys[i - 1]).toBeCloseTo(GRID_X)
    }
    // count is consistent with the spacing across the full ±GRID_HALF_WIDTH span
    const span = ys[ys.length - 1] - ys[0]
    expect(ys.length).toBe(Math.round(span / GRID_X) + 1)
  })

  it('spaces the lateral lines exactly GRID_Z apart, receding from the cockpit to the horizon', () => {
    const ds = lateralDepths(surfaceGrid(0))
    expect(ds.length).toBeGreaterThanOrEqual(3)
    for (let i = 1; i < ds.length; i++) {
      expect(ds[i] - ds[i - 1]).toBeCloseTo(GRID_Z)
    }
    const nearest = ds[0] // least depth = closest to the cockpit (depth +X ahead)
    const farthest = ds[ds.length - 1] // greatest depth = the horizon
    expect(nearest).toBeGreaterThanOrEqual(-EPS) // ahead of / at the cockpit
    expect(nearest).toBeLessThanOrEqual(GRID_Z + EPS) // within one cell of it
    expect(farthest).toBeGreaterThanOrEqual(GRID_FAR - GRID_Z) // recedes to ≈ the far cutoff
    expect(farthest).toBeLessThanOrEqual(GRID_FAR + EPS) // but never overshoots it
  })
})

// --- AC1 / AC3: scroll recycling & direction ---------------------------------

describe('Story 11-5 — surfaceGrid scroll recycling', () => {
  it('recycles by scroll mod GRID_Z: surfaceGrid(s) === surfaceGrid(s + GRID_Z)', () => {
    for (const s of [0, GRID_Z / 3, 1.0, GRID_Z * 2.25]) {
      expect(surfaceGrid(s)).toEqual(surfaceGrid(s + GRID_Z))
    }
  })

  it('scrolls the ground toward the camera as scroll grows (lateral lines advance toward depth 0)', () => {
    const base = lateralDepths(surfaceGrid(0))
    // An INTERIOR lateral line — away from both ends, so a sub-cell scroll can't
    // wrap it. A grid that scrolls toward the cockpit moves it by −delta in depth
    // (depth +X ahead, so nearing the cockpit means depth decreases).
    const interior = base[Math.floor(base.length / 2)]
    const delta = GRID_Z * 0.3
    const shifted = lateralDepths(surfaceGrid(delta))
    expect(shifted.some((d) => Math.abs(d - (interior - delta)) < EPS)).toBe(true)
    // …and it did NOT stay put (it genuinely moved, not a no-op scroll).
    expect(shifted.some((d) => Math.abs(d - interior) < EPS)).toBe(false)
  })
})

// --- AC3: the surfaceScrollZ accumulator -------------------------------------

describe('Story 11-5 — surfaceScrollZ accumulator', () => {
  it('initialState seeds surfaceScrollZ to 0', () => {
    const s = initialState()
    expect(typeof s.surfaceScrollZ).toBe('number')
    expect(s.surfaceScrollZ).toBe(0)
  })

  it('advances surfaceScrollZ by the accelerating rate (seeded at $100), not the flat 600 (D-022)', () => {
    // sw7-18: the surface scroll is the ROM's accelerating pace, seeded at
    // SURFACE_SEED_SPEED (≈ 5,250 u/s) — the first frame moves by that rate (± one
    // accel tick), decisively past the retired flat 600·dt.
    const s0 = enterPhase(initialState(), 'surface')
    const dt = 0.1
    const s1 = stepGame(s0, NO_INPUT, dt)
    expect(s1.surfaceScrollZ).toBeGreaterThanOrEqual(SURFACE_SEED_SPEED * dt)
    expect(s1.surfaceScrollZ).toBeLessThanOrEqual((SURFACE_SEED_SPEED + SURFACE_ACCEL * dt) * dt + 1e-6)
    expect(s1.surfaceScrollZ).toBeGreaterThan(600 * dt) // no longer the flat rate
  })

  it('rides the SAME flow as the turrets (ground and turrets advance by one delta)', () => {
    // native: a turret 1000 ahead is depth (+X) = 1000; scrolling toward the cockpit
    // DECREASES its depth, so the advance is the drop in pos[0].
    const s0: GameState = { ...enterPhase(initialState(), 'surface'), turrets: [{ pos: [1000, 0, 0] }] }
    const dt = 0.1
    const s1 = stepGame(s0, NO_INPUT, dt)
    const turretAdvance = 1000 - s1.turrets[0].pos[0]
    // Whatever the (accelerating) rate is, the ground grid and the turrets ride it
    // together — one delta — so the field never shears against the floor.
    expect(s1.surfaceScrollZ).toBeCloseTo(turretAdvance)
    expect(turretAdvance).toBeGreaterThan(600 * dt) // faster than the retired flat rate
  })

  it('resets surfaceScrollZ to 0 on entering the surface phase', () => {
    const dirty = { ...initialState(1983), surfaceScrollZ: 555 }
    expect(enterPhase(dirty, 'surface').surfaceScrollZ).toBe(0)
  })

  it('resets surfaceScrollZ to 0 on entering any other phase too', () => {
    const dirty = { ...initialState(1983), surfaceScrollZ: 555 }
    expect(enterPhase(dirty, 'space').surfaceScrollZ).toBe(0)
    expect(enterPhase(dirty, 'trench').surfaceScrollZ).toBe(0)
  })

  it('accumulates deterministically for a fixed seed', () => {
    let a = enterPhase(initialState(7), 'surface')
    let b = enterPhase(initialState(7), 'surface')
    for (let i = 0; i < 20; i++) {
      a = stepGame(a, NO_INPUT, 0.1)
      b = stepGame(b, NO_INPUT, 0.1)
    }
    expect(a.surfaceScrollZ).toBe(b.surfaceScrollZ)
    expect(a).toEqual(b)
  })
})

// --- AC5: DEATH_STAR_SURFACE is re-classified, NOT deleted --------------------

describe('Story 11-5 — DEATH_STAR_SURFACE retired, not deleted (AC5 regression guard)', () => {
  it('keeps DEATH_STAR_SURFACE in the model registry', () => {
    expect(DEATH_STAR_SURFACE).toBeDefined()
    expect(DEATH_STAR_SURFACE.vertices.length).toBeGreaterThan(0)
    expect(DEATH_STAR_SURFACE.edges.length).toBeGreaterThan(0)
  })

  it('confirms it is a y-spanning spike — which is exactly why it can NOT be the ground', () => {
    const ys = DEATH_STAR_SURFACE.vertices.map((v) => v[1])
    // Unlike the new grid (flat in y=0), the spike rises off the floor plane.
    expect(Math.max(...ys)).toBeGreaterThan(0)
  })
})
