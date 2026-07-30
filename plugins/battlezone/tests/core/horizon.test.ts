// tests/core/horizon.test.ts
//
// Story bz1-3 — RED phase (Furiosa / TEA).
// Story bz3-6 — RED phase (O'Brien / TEA): AC1 removes the invented volcano
//   cone. H-008 (CONFIRMED): the ROM draws NO volcano cone silhouette — MOUNTS
//   only moves the beam to the eruption point ("MOVE BEAM TO TOP OF VOLCANO",
//   BZONE.MAC:1318) and plots the flying rocks (the H-006 fountain). The
//   faithful "volcano" is a MTNS ridge peak (bz3-8) that erupts, NOT a
//   free-standing authored cone. bz1-3 invented a cone-with-crater polyline
//   (horizon.ts VOLCANO); bz3-6 deletes it. The two feature tests below are
//   FLIPPED from "volcano present" to "volcano cone absent" — RED until GREEN
//   removes the VOLCANO const.
//
// CONTRACT for the GREEN phase (The Word Burgers / DEV): create
// `src/core/horizon.ts`, the background skyline (horizon line + mountains +
// crescent moon; NO volcano cone — bz3-6/H-008), exporting:
//
//   export interface PanoramaPolyline {
//     readonly name: 'mountains' | 'volcano' | 'moon'
//     // Polyline points in ANGULAR space: [azimuth, elevation] radians.
//     // Azimuth is a WORLD bearing (same convention as TankPose.heading:
//     // 0 = +Z, increasing counter-clockwise toward +X). Elevation 0 = the
//     // horizon line; positive = up.
//     readonly points: readonly (readonly [number, number])[]
//   }
//   export const PANORAMA: readonly PanoramaPolyline[]
//   export const BACKDROP_FOV: number  // H_FOV or 2·H_FOV — see note below
//   export function panoramaToNdc(
//     azimuth: number, elevation: number, heading: number, aspect: number,
//   ): readonly [number, number] | null   // null ⇒ outside the horizontal view
//   export function skylineSegments(heading: number, aspect: number): readonly SceneSegment[]
//
// AUTHORED DATA, STRUCTURAL TESTS: the quarry has NO horizon picture data
// (findings doc — zero hits for horizon/volcano/moon; §10 lists the epic's
// "90° FOV horizon" claim as unconfirmed). PANORAMA is therefore authored
// against footage, like models.ts's EXPLOSION_DEBRIS edges — so these tests pin
// STRUCTURE and BEHAVIOR (wrap, scroll, features present, horizon line), never
// exact authored coordinates. A future ROM-exact panorama must pass unchanged.
//
// BACKDROP_FOV: the epic context claims the background horizon spans 90° while
// units live in the confirmed 45° cone; the findings doc could not confirm or
// deny 90°. The contract allows either 45° (one shared FOV) or 90° (half-rate
// background scroll) — pinned to exactly one of the two, trued up in bz1-12.
//
// Sign conventions match camera.test.ts: a feature at azimuth > heading is
// toward +X = screen-LEFT (negative NDC x); increasing heading sweeps features
// RIGHT. The horizon line sits at NDC y = 0 — the eye is level (no pitch) on a
// flat plain, so ground and sky meet at the eye axis.

import { describe, it, expect, beforeAll } from 'vitest'

interface PanoramaPolyline {
  readonly name: 'mountains' | 'volcano' | 'moon'
  readonly points: readonly (readonly [number, number])[]
}

interface SceneSegment {
  readonly x1: number
  readonly y1: number
  readonly x2: number
  readonly y2: number
}

interface HorizonModule {
  PANORAMA?: readonly PanoramaPolyline[]
  BACKDROP_FOV?: number
  panoramaToNdc?: (
    azimuth: number,
    elevation: number,
    heading: number,
    aspect: number,
  ) => readonly [number, number] | null
  skylineSegments?: (heading: number, aspect: number) => readonly SceneSegment[]
}

let horizon: HorizonModule = {}

beforeAll(async () => {
  try {
    horizon = (await import('../../src/core/horizon')) as HorizonModule
  } catch {
    horizon = {}
  }
})

function need<T>(value: T | undefined, name: string): T {
  if (value === undefined) {
    throw new Error(`src/core/horizon.ts must export ${name} (bz1-3 RED contract)`)
  }
  return value
}

const ASPECT = 4 / 3
const H_FOV = Math.PI / 4
const TAU = 2 * Math.PI

describe('horizon — PANORAMA data (authored; structural invariants only)', () => {
  it('has the MTNS ridge + embedded moon, but NO invented volcano cone (bz3-6 / AC1 / H-008)', () => {
    // H-008 CONFIRMED (BZONE.MAC:1318 "MOVE BEAM TO TOP OF VOLCANO"): the ROM
    // has no cone silhouette — the eruption point is a MTNS ridge peak, the
    // "volcano" IS the H-006 rock fountain. The bz1-3 cone-with-crater polyline
    // is invented and must be gone.
    const panorama = need(horizon.PANORAMA, 'PANORAMA')
    const names = new Set(panorama.map((p) => p.name))
    expect(names.has('mountains'), 'the MTNS ridge stays (bz3-8/H-002)').toBe(true)
    expect(names.has('moon'), 'the MTN0-embedded moon stays (bz3-8/H-003)').toBe(true)
    expect(names.has('volcano'), 'the invented volcano cone silhouette must be REMOVED (H-008)').toBe(false)
  })

  it('every polyline has at least 2 points (a polyline, not a dot)', () => {
    const panorama = need(horizon.PANORAMA, 'PANORAMA')
    expect(panorama.length).toBeGreaterThan(0)
    for (const p of panorama) expect(p.points.length).toBeGreaterThanOrEqual(2)
  })

  it('every point is finite, elevation ≥ 0 (skyline never dips below the horizon)', () => {
    const panorama = need(horizon.PANORAMA, 'PANORAMA')
    for (const p of panorama) {
      for (const [az, el] of p.points) {
        expect(Number.isFinite(az)).toBe(true)
        expect(Number.isFinite(el)).toBe(true)
        expect(el).toBeGreaterThanOrEqual(0)
        expect(el).toBeLessThan(Math.PI / 2) // sane: below the zenith
      }
    }
  })

  it('the backdrop is ONLY MTNS-derived geometry — no stray invented cone (bz3-6 / AC1 / H-008)', () => {
    // Every panorama polyline must be MTNS ridge or the embedded moon; the
    // invented free-standing 'volcano' cone (bz1-3) is deleted, leaving nothing
    // authored outside the ROM's MTN_SEGMENTS decode.
    const panorama = need(horizon.PANORAMA, 'PANORAMA')
    const cones = panorama.filter((p) => p.name === 'volcano')
    expect(cones, 'the static volcano cone silhouette is removed').toHaveLength(0)
    for (const p of panorama) {
      expect(['mountains', 'moon'], `stray polyline "${p.name}" — only MTNS ridge + moon survive`).toContain(
        p.name,
      )
    }
  })

  it('the moon floats — every moon point is strictly above the horizon', () => {
    const panorama = need(horizon.PANORAMA, 'PANORAMA')
    const moons = panorama.filter((p) => p.name === 'moon')
    expect(moons.length).toBeGreaterThan(0)
    for (const m of moons) {
      for (const [, el] of m.points) expect(el).toBeGreaterThan(0)
    }
  })

  it('mountains ring the full panorama — no azimuth gap ≥ H_FOV (no empty view)', () => {
    // At ANY heading, at least one mountain vertex must be in the 45° window:
    // sort all mountain azimuths (mod 2π), largest gap (including wrap-around)
    // must be < H_FOV. The original backdrop wraps the entire battlefield.
    const panorama = need(horizon.PANORAMA, 'PANORAMA')
    const azimuths = panorama
      .filter((p) => p.name === 'mountains')
      .flatMap((p) => p.points.map(([az]) => ((az % TAU) + TAU) % TAU))
      .sort((a, b) => a - b)
    expect(azimuths.length).toBeGreaterThan(2)
    let maxGap = azimuths[0] + TAU - azimuths[azimuths.length - 1] // wrap gap
    for (let i = 1; i < azimuths.length; i++) {
      maxGap = Math.max(maxGap, azimuths[i] - azimuths[i - 1])
    }
    expect(maxGap).toBeLessThan(H_FOV)
  })
})

describe('horizon — BACKDROP_FOV (45° confirmed / 90° unconfirmed epic claim)', () => {
  it('is exactly H_FOV (π/4) or 2·H_FOV (π/2) — nothing else', () => {
    const fov = need(horizon.BACKDROP_FOV, 'BACKDROP_FOV')
    const isConfirmed45 = Math.abs(fov - H_FOV) < 1e-12
    const isEpicClaim90 = Math.abs(fov - 2 * H_FOV) < 1e-12
    expect(isConfirmed45 || isEpicClaim90).toBe(true)
  })
})

describe('horizon — panoramaToNdc (angular backdrop → NDC point mapper)', () => {
  it('a feature dead ahead on the horizon maps to the exact centre [0, 0]', () => {
    const toNdc = need(horizon.panoramaToNdc, 'panoramaToNdc')
    for (const h of [0, 1.2, 3.7, 5.9]) {
      const p = toNdc(h, 0, h, ASPECT)
      expect(p).not.toBeNull()
      if (p) {
        expect(p[0]).toBeCloseTo(0, 6)
        expect(p[1]).toBeCloseTo(0, 6)
      }
    }
  })

  it('azimuth = heading + BACKDROP_FOV/2 lands at the LEFT edge (x ≈ −1)', () => {
    const toNdc = need(horizon.panoramaToNdc, 'panoramaToNdc')
    const fov = need(horizon.BACKDROP_FOV, 'BACKDROP_FOV')
    const h = 1.0
    const p = toNdc(h + fov / 2, 0, h, ASPECT)
    expect(p).not.toBeNull()
    if (p) expect(p[0]).toBeCloseTo(-1, 3) // +X is screen-left (ROM convention)
  })

  it('azimuth = heading − BACKDROP_FOV/2 lands at the RIGHT edge (x ≈ +1)', () => {
    const toNdc = need(horizon.panoramaToNdc, 'panoramaToNdc')
    const fov = need(horizon.BACKDROP_FOV, 'BACKDROP_FOV')
    const h = 1.0
    const p = toNdc(h - fov / 2, 0, h, ASPECT)
    expect(p).not.toBeNull()
    if (p) expect(p[0]).toBeCloseTo(1, 3)
  })

  it('x is strictly monotonic in azimuth across the window (no fold-back)', () => {
    const toNdc = need(horizon.panoramaToNdc, 'panoramaToNdc')
    const fov = need(horizon.BACKDROP_FOV, 'BACKDROP_FOV')
    const h = 2.0
    let prev = Number.POSITIVE_INFINITY
    for (let k = -4; k <= 4; k++) {
      const p = toNdc(h + (k / 10) * fov, 0, h, ASPECT)
      expect(p).not.toBeNull()
      if (p) {
        expect(p[0]).toBeLessThan(prev) // increasing azimuth → decreasing x (leftward)
        prev = p[0]
      }
    }
  })

  it('returns null well outside the horizontal window (azimuth − heading = BACKDROP_FOV)', () => {
    const toNdc = need(horizon.panoramaToNdc, 'panoramaToNdc')
    const fov = need(horizon.BACKDROP_FOV, 'BACKDROP_FOV')
    expect(toNdc(1.0 + fov, 0, 1.0, ASPECT)).toBeNull()
    expect(toNdc(1.0 - fov, 0, 1.0, ASPECT)).toBeNull()
  })

  it('wraps: azimuth + 2π maps to the same point (the backdrop is a ring)', () => {
    const toNdc = need(horizon.panoramaToNdc, 'panoramaToNdc')
    const a = toNdc(1.3, 0.1, 1.0, ASPECT)
    const b = toNdc(1.3 + TAU, 0.1, 1.0, ASPECT)
    expect(a).not.toBeNull()
    expect(b).not.toBeNull()
    if (a && b) {
      expect(b[0]).toBeCloseTo(a[0], 6)
      expect(b[1]).toBeCloseTo(a[1], 6)
    }
  })

  it('elevation raises y monotonically; y is heading-independent (pure yaw)', () => {
    const toNdc = need(horizon.panoramaToNdc, 'panoramaToNdc')
    const flat = toNdc(2.0, 0, 2.0, ASPECT)
    const low = toNdc(2.0, 0.05, 2.0, ASPECT)
    const high = toNdc(2.0, 0.2, 2.0, ASPECT)
    expect(flat).not.toBeNull()
    expect(low).not.toBeNull()
    expect(high).not.toBeNull()
    if (flat && low && high) {
      expect(low[1]).toBeGreaterThan(flat[1])
      expect(high[1]).toBeGreaterThan(low[1])
    }
    // Same feature seen from a different heading keeps its height on screen.
    const elsewhere = toNdc(3.1, 0.2, 3.0, ASPECT)
    expect(elsewhere).not.toBeNull()
    if (high && elsewhere) expect(elsewhere[1]).toBeCloseTo(high[1], 6)
  })

  it('turning toward +X (heading +δ) sweeps a fixed feature RIGHT (x increases)', () => {
    const toNdc = need(horizon.panoramaToNdc, 'panoramaToNdc')
    const az = 1.0
    const before = toNdc(az, 0.1, 1.0, ASPECT)
    const after = toNdc(az, 0.1, 1.05, ASPECT)
    expect(before).not.toBeNull()
    expect(after).not.toBeNull()
    if (before && after) expect(after[0]).toBeGreaterThan(before[0])
  })
})

describe('horizon — skylineSegments (assembled backdrop for the shell)', () => {
  it('is non-empty at every sampled heading (the backdrop rings the world)', () => {
    const skyline = need(horizon.skylineSegments, 'skylineSegments')
    for (let k = 0; k < 16; k++) {
      const segs = skyline((k / 16) * TAU, ASPECT)
      expect(segs.length, `heading ${((k / 16) * TAU).toFixed(2)} must show skyline`).toBeGreaterThan(0)
      for (const s of segs) {
        expect(Number.isFinite(s.x1)).toBe(true)
        expect(Number.isFinite(s.y1)).toBe(true)
        expect(Number.isFinite(s.x2)).toBe(true)
        expect(Number.isFinite(s.y2)).toBe(true)
      }
    }
  })

  it('never draws below the horizon line (all segment y ≥ 0)', () => {
    const skyline = need(horizon.skylineSegments, 'skylineSegments')
    for (const h of [0, 1.6, 3.2, 4.8]) {
      const segs = skyline(h, ASPECT)
      expect(segs.length).toBeGreaterThan(0) // guard: an empty skyline must not vacuously pass
      for (const s of segs) {
        expect(s.y1).toBeGreaterThanOrEqual(-1e-9)
        expect(s.y2).toBeGreaterThanOrEqual(-1e-9)
      }
    }
  })

  it('includes the full-width horizon line at NDC y = 0 (eye-level, flat plain)', () => {
    const skyline = need(horizon.skylineSegments, 'skylineSegments')
    for (const h of [0.4, 2.8]) {
      const line = skyline(h, ASPECT).filter(
        (s) => Math.abs(s.y1) < 1e-9 && Math.abs(s.y2) < 1e-9,
      )
      expect(line.length).toBeGreaterThan(0)
      const left = Math.min(...line.flatMap((s) => [s.x1, s.x2]))
      const right = Math.max(...line.flatMap((s) => [s.x1, s.x2]))
      expect(left).toBeLessThanOrEqual(-1 + 1e-6)
      expect(right).toBeGreaterThanOrEqual(1 - 1e-6)
    }
  })

  it('wraps: heading and heading + 2π render the identical skyline', () => {
    const skyline = need(horizon.skylineSegments, 'skylineSegments')
    const a = skyline(0.7, ASPECT)
    expect(a.length).toBeGreaterThan(0) // guard: two empty arrays must not vacuously match
    expect(a).toEqual(skyline(0.7 + TAU, ASPECT))
    const b = skyline(5.5, ASPECT)
    expect(b.length).toBeGreaterThan(0)
    expect(b).toEqual(skyline(5.5 + TAU, ASPECT))
  })

  it('is deterministic — identical inputs give deep-equal output (epic standing AC)', () => {
    const skyline = need(horizon.skylineSegments, 'skylineSegments')
    const a = skyline(2.2, ASPECT)
    const b = skyline(2.2, ASPECT)
    expect(a.length).toBeGreaterThan(0)
    expect(a).toEqual(b)
  })
})
