// tests/core/trench-channel.test.ts
//
// Story 11-6 — Walled trench channel: floor + ribbed side walls, receding.
// RED phase. These tests define the contract and are EXPECTED TO FAIL until the
// GREEN phase implements it.
//
// WHY THIS STORY EXISTS (see docs/adr/0002-scene-geometry-surface-and-trench.md
// part B): the trench phase draws a single flat 512×384 floor tile (the TRENCH
// model). Seated at the port's depth it reprojects to a ~224px-wide, ~4px-tall
// sliver — no walls, no length — so the trench reads as a flat smear, not a
// corridor you fly down. The fix mirrors 11-5's surface grid: a PURE,
// deterministic core generator that builds a long WALLED channel — floor rails,
// lateral floor ribs, two vertical ribbed side walls, and top rails — running
// from the cockpit out to a far cutoff and scrolling toward the camera.
//
// THE CONTRACT this suite asks DEV to implement (mirrors src/core/surface-grid.ts,
// which the 11-5 author explicitly noted "11-6's trenchChannel will mirror"):
//
//   src/core/trench-channel.ts:
//     export function trenchChannel(scroll: number): Model3D
//     export const TRENCH_HALF_W: number   // floor rails / walls at x = ±TRENCH_HALF_W
//     export const TRENCH_WALL_H: number   // side walls rise from y=0 to y=TRENCH_WALL_H
//     export const RIB_Z: number           // rib spacing (and the scroll period)
//     export const TRENCH_FAR: number      // far cutoff (channel recedes to z ≈ -TRENCH_FAR)
//
//   src/core/state.ts — GameState gains:
//     trenchScrollZ: number   // accumulator; initialState() seeds it to 0
//
//   src/core/sim.ts:
//     - stepTrench advances trenchScrollZ by TRENCH_SCROLL_SPEED·dt (the SAME rate
//       that scrolls the exhaust port up the channel), and trenchChannel reads it.
//     - enterPhase resets trenchScrollZ to 0 on every phase entry (mirrors
//       surfaceScrollZ).
//
// DESIGN DECISIONS (logged as TEA deviations — the spec left these open):
//   - Module path: the generator + its TRENCH_* envelope constants live in a
//     dedicated `src/core/trench-channel.ts` (single responsibility; mirrors
//     surface-grid.ts). Dev may split internally and re-export.
//   - Far-cutoff constant: the story names TRENCH_HALF_W / RIB_Z / TRENCH_WALL_H
//     but not the receding length; named TRENCH_FAR here to mirror GRID_FAR.
//   - Return type: a `Model3D` (the story says `-> Model3D`), so the shell strokes
//     it through the existing drawWireframe like every other model.
//
// Tests reference TRENCH_* BY NAME, never hard-coded numbers, so they stay correct
// whatever authentic-feel values GREEN settles on (the surface-grid pattern). Per
// the repo's RED convention, `tsc` is red until the new symbols exist; vitest
// (esbuild, no typecheck) still RUNS these and reports the contract as failing.

import { describe, it, expect } from 'vitest'
import {
  trenchChannel,
  TRENCH_HALF_W,
  TRENCH_WALL_H,
  RIB_Z,
  TRENCH_FAR,
} from '../../src/core/trench-channel'
import {
  initialState,
  TRENCH_SCROLL_SPEED,
  type GameState,
} from '../../src/core/state'
import { stepGame, enterPhase } from '../../src/core/sim'
import { NO_INPUT } from '../../src/core/input'
import { TRENCH, type Model3D } from '../../src/core/models'

const EPS = 1e-6

/** Edges running along native DEPTH (the rails): both endpoints share RIGHT (v[1])
 *  AND UP (v[2]), differ in depth (v[0]). Returns the {x:right, y:up} each rail
 *  runs along. */
function rails(m: Model3D): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = []
  for (const [a, b] of m.edges) {
    const va = m.vertices[a]
    const vb = m.vertices[b]
    if (va[1] === vb[1] && va[2] === vb[2] && va[0] !== vb[0]) out.push({ x: va[1], y: va[2] })
  }
  return out
}

/** Distinct DEPTH (v[0]) carrying a LATERAL FLOOR rib (an edge across RIGHT on the
 *  up=0 floor: both endpoints at up=0 (v[2]), sharing a depth, differing in right),
 *  sorted ascending. */
function floorRibZs(m: Model3D): number[] {
  const zs = new Set<number>()
  for (const [a, b] of m.edges) {
    const va = m.vertices[a]
    const vb = m.vertices[b]
    if (va[2] === 0 && vb[2] === 0 && va[0] === vb[0] && va[1] !== vb[1]) zs.add(va[0])
  }
  return [...zs].sort((p, q) => p - q)
}

/** Across-RIGHT floor edges (the lateral floor ribs) as endpoint-index pairs. */
function floorRibEdges(m: Model3D): [number, number][] {
  return m.edges.filter(([a, b]) => {
    const va = m.vertices[a]
    const vb = m.vertices[b]
    return va[2] === 0 && vb[2] === 0 && va[0] === vb[0] && va[1] !== vb[1]
  }) as [number, number][]
}

/** VERTICAL ribs: edges across UP (v[2]) — both endpoints share RIGHT (v[1]) AND
 *  DEPTH (v[0]), differ in up. These rungs climb each wall from the floor rail to
 *  the top rail. Returns {x:right, z:depth}. */
function verticalRibs(m: Model3D): { x: number; z: number }[] {
  const out: { x: number; z: number }[] = []
  for (const [a, b] of m.edges) {
    const va = m.vertices[a]
    const vb = m.vertices[b]
    if (va[1] === vb[1] && va[0] === vb[0] && va[2] !== vb[2]) out.push({ x: va[1], z: va[0] })
  }
  return out
}

/** Vertical-rib edges as endpoint-index pairs (for height-span checks). */
function verticalRibEdges(m: Model3D): [number, number][] {
  return m.edges.filter(([a, b]) => {
    const va = m.vertices[a]
    const vb = m.vertices[b]
    return va[1] === vb[1] && va[0] === vb[0] && va[2] !== vb[2]
  }) as [number, number][]
}

// --- AC1: trenchChannel is a well-formed Model3D — a walled corridor, not a tile

describe('Story 11-6 — trenchChannel: shape & a walled corridor (not a flat tile)', () => {
  it('returns a Model3D with vertices and edges', () => {
    const c = trenchChannel(0)
    expect(typeof c.name).toBe('string')
    expect(Array.isArray(c.vertices)).toBe(true)
    expect(Array.isArray(c.edges)).toBe(true)
    expect(c.vertices.length).toBeGreaterThan(0)
    expect(c.edges.length).toBeGreaterThan(0)
  })

  it('every vertex is a finite 3D point', () => {
    const c = trenchChannel(0)
    for (const v of c.vertices) {
      expect(v).toHaveLength(3)
      expect(Number.isFinite(v[0])).toBe(true)
      expect(Number.isFinite(v[1])).toBe(true)
      expect(Number.isFinite(v[2])).toBe(true)
    }
  })

  it('every edge indexes two distinct, in-range vertices (no degenerate edges)', () => {
    const c = trenchChannel(0)
    for (const [a, b] of c.edges) {
      expect(Number.isInteger(a)).toBe(true)
      expect(Number.isInteger(b)).toBe(true)
      expect(a).not.toBe(b)
      expect(a).toBeGreaterThanOrEqual(0)
      expect(b).toBeGreaterThanOrEqual(0)
      expect(a).toBeLessThan(c.vertices.length)
      expect(b).toBeLessThan(c.vertices.length)
    }
  })

  it('rises OFF the floor into walls: y spans 0 → TRENCH_WALL_H (NOT the old flat y=0 tile)', () => {
    // THE differentiator from the retired flat tile: that tile lay entirely on
    // y=0 (a sliver); this channel has standing side walls.
    const ys = trenchChannel(0).vertices.map((v) => v[2]) // native UP = index 2
    expect(Math.min(...ys)).toBe(0) // floor on the up=0 plane
    expect(Math.max(...ys)).toBeCloseTo(TRENCH_WALL_H) // walls rise to full height
  })

  it('reads as a LONG corridor, not a sliver: its length far exceeds its width', () => {
    // The old flat tile projected to ~224×4px because it had no length. The
    // channel recedes the full TRENCH_FAR — much longer than it is wide.
    const vs = trenchChannel(0).vertices
    const length = Math.max(...vs.map((v) => v[0])) // native DEPTH receding forward +X
    const width = TRENCH_HALF_W * 2
    expect(length).toBeCloseTo(TRENCH_FAR)
    expect(length).toBeGreaterThan(width)
  })
})

// --- AC1: pure & deterministic (the sacred core/shell boundary) --------------

describe('Story 11-6 — trenchChannel is pure & deterministic', () => {
  it('returns identical geometry for identical scroll (no DOM/time/random state)', () => {
    // Repeated calls must match exactly — a Math.random()/Date.now() leak would
    // diverge here. Purity is further guaranteed by the boundary (core/ may never
    // touch the shell, time, or randomness).
    expect(trenchChannel(0)).toEqual(trenchChannel(0))
    expect(trenchChannel(137.5)).toEqual(trenchChannel(137.5))
  })
})

// --- AC1: width, symmetry & the two side walls -------------------------------

describe('Story 11-6 — trenchChannel width, symmetry & the two side walls', () => {
  it('spans the channel width: rails and walls sit at x = ±TRENCH_HALF_W', () => {
    const xs = trenchChannel(0).vertices.map((v) => v[1]) // native RIGHT = index 1
    expect(Math.max(...xs)).toBeCloseTo(TRENCH_HALF_W)
    expect(Math.min(...xs)).toBeCloseTo(-TRENCH_HALF_W)
  })

  it('is mirror-symmetric across the centreline (for every (d,r,u) there is a (d,−r,u))', () => {
    const c = trenchChannel(0)
    const present = new Set(c.vertices.map((v) => `${v[0]}|${v[1]}|${v[2]}`))
    for (const v of c.vertices) {
      // mirror the native RIGHT axis (index 1)
      expect(present.has(`${v[0]}|${-v[1]}|${v[2]}`)).toBe(true)
    }
  })

  it('raises BOTH side walls — vertices above the floor at each of right = ±TRENCH_HALF_W', () => {
    const c = trenchChannel(0)
    const leftWall = c.vertices.some((v) => v[1] === -TRENCH_HALF_W && v[2] > 0)
    const rightWall = c.vertices.some((v) => v[1] === TRENCH_HALF_W && v[2] > 0)
    expect(leftWall).toBe(true)
    expect(rightWall).toBe(true)
  })
})

// --- AC1: rails — floor rails + top rails on both walls, the full length -----

describe('Story 11-6 — trenchChannel rails: floor + top, both walls, full length', () => {
  it('runs a floor rail (y=0) and a top rail (y=TRENCH_WALL_H) at each of x = ±TRENCH_HALF_W', () => {
    const rs = rails(trenchChannel(0))
    const has = (x: number, y: number) => rs.some((r) => r.x === x && Math.abs(r.y - y) < EPS)
    expect(has(-TRENCH_HALF_W, 0)).toBe(true) // left floor rail
    expect(has(TRENCH_HALF_W, 0)).toBe(true) // right floor rail
    expect(has(-TRENCH_HALF_W, TRENCH_WALL_H)).toBe(true) // left top rail
    expect(has(TRENCH_HALF_W, TRENCH_WALL_H)).toBe(true) // right top rail
  })

  it('recedes from the cockpit (depth≈0) out to the far cutoff (depth≈+TRENCH_FAR)', () => {
    const zs = trenchChannel(0).vertices.map((v) => v[0]) // native DEPTH = index 0
    expect(Math.max(...zs)).toBeCloseTo(TRENCH_FAR) // far end at the cutoff
    expect(Math.min(...zs)).toBeCloseTo(0) // near end at the cockpit
  })
})

// --- AC1: ribs — lateral floor ribs + vertical wall ribs every RIB_Z ---------

describe('Story 11-6 — trenchChannel ribs: lateral floor + vertical wall, every RIB_Z', () => {
  it('spaces the lateral floor ribs exactly RIB_Z apart, receding cockpit → far cutoff', () => {
    const zs = floorRibZs(trenchChannel(0))
    expect(zs.length).toBeGreaterThanOrEqual(3) // a ribbed channel, not a lone bar
    for (let i = 1; i < zs.length; i++) {
      expect(zs[i] - zs[i - 1]).toBeCloseTo(RIB_Z)
    }
    const nearest = zs[0] // smallest depth = closest to the cockpit
    const farthest = zs[zs.length - 1] // largest depth = the far cutoff
    expect(nearest).toBeGreaterThanOrEqual(-EPS) // at / just ahead of the cockpit
    expect(nearest).toBeLessThanOrEqual(RIB_Z + EPS) // within one cell of it
    expect(farthest).toBeGreaterThanOrEqual(TRENCH_FAR - RIB_Z) // recedes to ≈ the cutoff
    expect(farthest).toBeLessThanOrEqual(TRENCH_FAR + EPS) // but never overshoots it
  })

  it('each lateral floor rib spans the full channel width (−TRENCH_HALF_W → +TRENCH_HALF_W)', () => {
    const c = trenchChannel(0)
    const ribs = floorRibEdges(c)
    expect(ribs.length).toBeGreaterThan(0)
    for (const [a, b] of ribs) {
      const xs = [c.vertices[a][1], c.vertices[b][1]].sort((p, q) => p - q) // native RIGHT = index 1
      expect(xs[0]).toBeCloseTo(-TRENCH_HALF_W)
      expect(xs[1]).toBeCloseTo(TRENCH_HALF_W)
    }
  })

  it('raises a vertical rib on EACH wall (symmetric counts), each running floor → top', () => {
    const c = trenchChannel(0)
    const vr = verticalRibs(c)
    const left = vr.filter((r) => r.x === -TRENCH_HALF_W)
    const right = vr.filter((r) => r.x === TRENCH_HALF_W)
    expect(left.length).toBeGreaterThanOrEqual(3)
    expect(left.length).toBe(right.length) // the two walls are ribbed identically
    for (const [a, b] of verticalRibEdges(c)) {
      const ys = [c.vertices[a][2], c.vertices[b][2]].sort((p, q) => p - q) // native UP = index 2
      expect(ys[0]).toBeCloseTo(0) // rises from the floor rail
      expect(ys[1]).toBeCloseTo(TRENCH_WALL_H) // to the top rail
    }
  })

  it('seats each vertical wall rib at a floor-rib z station (one rung per rib)', () => {
    const c = trenchChannel(0)
    const ribStations = new Set(floorRibZs(c).map((z) => z.toFixed(6)))
    for (const r of verticalRibs(c)) {
      expect(ribStations.has(r.z.toFixed(6))).toBe(true)
    }
  })
})

// --- AC1 / AC3: scroll recycling & direction ---------------------------------

describe('Story 11-6 — trenchChannel scroll recycling & direction', () => {
  it('recycles by scroll mod RIB_Z: trenchChannel(s) === trenchChannel(s + RIB_Z)', () => {
    for (const s of [0, RIB_Z / 3, 1.0, RIB_Z * 2.25]) {
      expect(trenchChannel(s)).toEqual(trenchChannel(s + RIB_Z))
    }
  })

  it('scrolls the channel toward the camera as scroll grows (an interior floor rib advances toward the cockpit, depth −)', () => {
    const base = floorRibZs(trenchChannel(0))
    // An INTERIOR rib — away from both ends, so a sub-cell scroll can't wrap it.
    const interior = base[Math.floor(base.length / 2)]
    const delta = RIB_Z * 0.3
    const shifted = floorRibZs(trenchChannel(delta))
    // Native: scrolling toward the cockpit DECREASES depth.
    expect(shifted.some((z) => Math.abs(z - (interior - delta)) < EPS)).toBe(true)
    // …and it did NOT stay put (a genuine scroll, not a no-op).
    expect(shifted.some((z) => Math.abs(z - interior) < EPS)).toBe(false)
  })

  it('scrolls the WALLS with the floor (vertical ribs advance with the floor ribs, not independently)', () => {
    // Catches a GREEN that scrolls only the floor laterals and leaves the wall
    // rungs static — the channel must move as one rigid corridor.
    const base = floorRibZs(trenchChannel(0))
    const interior = base[Math.floor(base.length / 2)]
    const delta = RIB_Z * 0.3
    const wallZs = verticalRibs(trenchChannel(delta)).map((r) => r.z)
    expect(wallZs.some((z) => Math.abs(z - (interior - delta)) < EPS)).toBe(true)
  })
})

// --- AC3: the trenchScrollZ accumulator --------------------------------------

describe('Story 11-6 — trenchScrollZ accumulator', () => {
  it('initialState seeds trenchScrollZ to 0', () => {
    const s = initialState()
    expect(typeof s.trenchScrollZ).toBe('number')
    expect(s.trenchScrollZ).toBe(0)
  })

  it('advances trenchScrollZ by TRENCH_SCROLL_SPEED·dt while flying the trench', () => {
    const s0 = enterPhase(initialState(), 'trench')
    const dt = 0.1
    const s1 = stepGame(s0, NO_INPUT, dt)
    expect(s1.trenchScrollZ).toBeCloseTo(TRENCH_SCROLL_SPEED * dt)
  })

  it('rides the SAME rate as the exhaust port (channel and port advance by one delta)', () => {
    const s0 = enterPhase(initialState(), 'trench')
    const startZ = s0.exhaustPort!.pos[0] // native DEPTH = index 0
    const dt = 0.1
    const s1 = stepGame(s0, NO_INPUT, dt)
    const portAdvance = startZ - s1.exhaustPort!.pos[0] // native depth decreases toward the cockpit
    expect(portAdvance).toBeCloseTo(TRENCH_SCROLL_SPEED * dt)
    expect(s1.trenchScrollZ).toBeCloseTo(portAdvance)
  })

  it('resets trenchScrollZ to 0 on entering the trench phase', () => {
    const dirty: GameState = { ...initialState(1983), trenchScrollZ: 555 }
    expect(enterPhase(dirty, 'trench').trenchScrollZ).toBe(0)
  })

  it('resets trenchScrollZ to 0 on entering any other phase too', () => {
    const dirty: GameState = { ...initialState(1983), trenchScrollZ: 555 }
    expect(enterPhase(dirty, 'space').trenchScrollZ).toBe(0)
    expect(enterPhase(dirty, 'surface').trenchScrollZ).toBe(0)
  })

  it('accumulates deterministically for a fixed seed', () => {
    let a = enterPhase(initialState(7), 'trench')
    let b = enterPhase(initialState(7), 'trench')
    for (let i = 0; i < 20; i++) {
      a = stepGame(a, NO_INPUT, 0.1)
      b = stepGame(b, NO_INPUT, 0.1)
    }
    expect(a.trenchScrollZ).toBe(b.trenchScrollZ)
    expect(a).toEqual(b)
  })
})

// --- The flat TRENCH tile is retired, not deleted (AC regression guard) -------

describe('Story 11-6 — the flat TRENCH tile is retired, not deleted', () => {
  it('keeps the TRENCH model in the registry (still consumed by trenchPlacement bounds)', () => {
    expect(TRENCH).toBeDefined()
    expect(TRENCH.vertices.length).toBeGreaterThan(0)
    expect(TRENCH.edges.length).toBeGreaterThan(0)
  })

  it('confirms TRENCH is flat on y=0 — which is exactly why it reads as a sliver, not a corridor', () => {
    for (const v of TRENCH.vertices) expect(v[1]).toBe(0)
    // The walled channel carries strictly more structure (walls + ribs) than the tile.
    expect(trenchChannel(0).edges.length).toBeGreaterThan(TRENCH.edges.length)
  })
})
