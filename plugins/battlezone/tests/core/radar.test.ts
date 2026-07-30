// tests/core/radar.test.ts
//
// Story bz1-6 — RED phase (Furiosa / TEA). The radar scanner's deterministic
// core: bearing/range derivation, radar-invisibility filtering, and the sweep.
//
// CONTRACT for the GREEN phase (The Word Burgers / DEV): create the pure,
// deterministic module `src/core/radar.ts`, importing only sibling core modules
// (e.g. `./camera` for `TankPose`), exporting:
//
//   export type RadarContactKind =
//     | 'tank' | 'super-tank' | 'missile'   // radar-VISIBLE hostiles
//     | 'saucer' | 'obstacle'               // radar-INVISIBLE (ROM)
//
//   export interface RadarContact {
//     readonly x: number            // planar world X  (planar-sim ruling: no y)
//     readonly z: number            // planar world Z
//     readonly kind: RadarContactKind
//   }
//
//   export interface RadarBlip {
//     readonly bearing: number      // radians in (−π, π]; 0 = dead ahead,
//                                   //   following camera.ts's heading convention
//                                   //   (0 → +Z, +π/2 → +X, counter-clockwise).
//     readonly range: number        // world units from the player, ≥ 0
//   }
//
//   // The kinds the ROM keeps OFF the scanner — the 21 obstacles and the saucer
//   // (context-epic-bz1.md; src/core/obstacles.ts:7; story bz1-9). deriveRadar
//   // filters these out internally so bz1-9 can wire the live saucer with NO
//   // change to the filter, and bz1-7 can drop enemy tanks straight in.
//   export const RADAR_INVISIBLE_KINDS: readonly RadarContactKind[]
//
//   // Pure: player pose + world contacts → one blip per radar-VISIBLE contact.
//   // Order-preserving; never mutates `contacts`; excludes RADAR_INVISIBLE_KINDS.
//   export function deriveRadar(
//     pose: TankPose,
//     contacts: readonly RadarContact[],
//   ): readonly RadarBlip[]
//
//   // Sweep period, milliseconds. One full revolution of the sweep line.
//   export const SWEEP_PERIOD_MS: number
//
//   // Pure: elapsed ms → sweep angle in [0, 2π), advancing monotonically within
//   //   a period and wrapping cleanly each SWEEP_PERIOD_MS. NO Date.now — time
//   //   enters as an argument (enforced by radar-purity.test.ts).
//   export function sweepAngle(elapsedMs: number): number
//
// TEST SCOPE: these tests pin the pure CORE contract only — bearing/range math,
// the invisibility filter, and sweep behavior. The green scanner OVERLAY render
// (AC-5) is a shell/canvas concern verified manually (see the TEA assessment's
// deviation note); it is intentionally not asserted here.
//
// Loaded defensively (await import in beforeAll): during RED the module does not
// exist yet, so a static import would crash collection. Loading defensively lets
// every invariant report a clean assertion failure — the exact contract DEV must
// satisfy — instead of one opaque module-resolution error.

import { describe, it, expect, beforeAll } from 'vitest'
import type { TankPose } from '../../src/core/camera'
import { OBSTACLES } from '../../src/core/obstacles'

type RadarContactKind =
  | 'tank'
  | 'super-tank'
  | 'missile'
  | 'saucer'
  | 'obstacle'

interface RadarContact {
  readonly x: number
  readonly z: number
  readonly kind: RadarContactKind
}

interface RadarBlip {
  readonly bearing: number
  readonly range: number
}

type RadarModule = {
  deriveRadar?: (
    pose: TankPose,
    contacts: readonly RadarContact[],
  ) => readonly RadarBlip[]
  RADAR_INVISIBLE_KINDS?: readonly RadarContactKind[]
  SWEEP_PERIOD_MS?: number
  sweepAngle?: (elapsedMs: number) => number
}

let mod: RadarModule = {}

// A missing export becomes a loud, deterministic failure rather than a crash:
// each helper throws with the exact export name DEV must provide.
const deriveRadar = (
  pose: TankPose,
  contacts: readonly RadarContact[],
): readonly RadarBlip[] => {
  if (!mod.deriveRadar) throw new Error('radar.ts must export deriveRadar()')
  return mod.deriveRadar(pose, contacts)
}
const sweepAngle = (elapsedMs: number): number => {
  if (!mod.sweepAngle) throw new Error('radar.ts must export sweepAngle()')
  return mod.sweepAngle(elapsedMs)
}

const TOL = 1e-9
const AT_ORIGIN: TankPose = { x: 0, z: 0, heading: 0 }
const TAU = Math.PI * 2

/** Shortest signed distance between two angles on the circle, radians. */
const angleGap = (a: number, b: number): number => {
  let d = (a - b) % TAU
  if (d > Math.PI) d -= TAU
  if (d <= -Math.PI) d += TAU
  return d
}

beforeAll(async () => {
  try {
    mod = (await import('../../src/core/radar')) as RadarModule
  } catch {
    mod = {}
  }
})

describe('deriveRadar — bearing follows the camera.ts heading convention', () => {
  it('a contact dead ahead (heading 0, +Z) reads bearing 0', () => {
    const [blip] = deriveRadar(AT_ORIGIN, [{ x: 0, z: 100, kind: 'tank' }])
    expect(Math.abs(angleGap(blip.bearing, 0))).toBeLessThan(TOL)
  })

  it('a contact to +X (heading 0) reads bearing +π/2 (counter-clockwise)', () => {
    const [blip] = deriveRadar(AT_ORIGIN, [{ x: 100, z: 0, kind: 'tank' }])
    expect(Math.abs(angleGap(blip.bearing, Math.PI / 2))).toBeLessThan(TOL)
  })

  it('a contact to −X (heading 0) reads bearing −π/2', () => {
    const [blip] = deriveRadar(AT_ORIGIN, [{ x: -100, z: 0, kind: 'tank' }])
    expect(Math.abs(angleGap(blip.bearing, -Math.PI / 2))).toBeLessThan(TOL)
  })

  it('a contact directly behind (heading 0, −Z) reads bearing ±π', () => {
    const [blip] = deriveRadar(AT_ORIGIN, [{ x: 0, z: -100, kind: 'tank' }])
    // ±π are the same heading; assert the gap to π is ~0 either way.
    expect(Math.abs(angleGap(blip.bearing, Math.PI))).toBeLessThan(TOL)
  })

  it('a non-cardinal contact (heading 0, +X+Z equal) reads bearing +π/4', () => {
    const [blip] = deriveRadar(AT_ORIGIN, [{ x: 100, z: 100, kind: 'tank' }])
    expect(Math.abs(angleGap(blip.bearing, Math.PI / 4))).toBeLessThan(TOL)
  })

  it('bearing is RELATIVE to heading: facing +X, a +X contact is dead ahead', () => {
    const facingPlusX: TankPose = { x: 0, z: 0, heading: Math.PI / 2 }
    const [blip] = deriveRadar(facingPlusX, [{ x: 100, z: 0, kind: 'tank' }])
    expect(Math.abs(angleGap(blip.bearing, 0))).toBeLessThan(TOL)
  })

  it('bearing is RELATIVE to heading: facing +X, a +Z contact is at −π/2', () => {
    const facingPlusX: TankPose = { x: 0, z: 0, heading: Math.PI / 2 }
    const [blip] = deriveRadar(facingPlusX, [{ x: 0, z: 100, kind: 'tank' }])
    expect(Math.abs(angleGap(blip.bearing, -Math.PI / 2))).toBeLessThan(TOL)
  })

  it('bearing is RELATIVE to the player POSITION, not the world origin', () => {
    const offset: TankPose = { x: 50, z: 50, heading: 0 }
    // Contact 100 units ahead in +Z of the player → dead ahead, range 100.
    const [blip] = deriveRadar(offset, [{ x: 50, z: 150, kind: 'tank' }])
    expect(Math.abs(angleGap(blip.bearing, 0))).toBeLessThan(TOL)
    expect(Math.abs(blip.range - 100)).toBeLessThan(TOL)
  })

  it('every derived bearing is finite and within (−π, π]', () => {
    const blips = deriveRadar(AT_ORIGIN, [
      { x: 100, z: 100, kind: 'tank' },
      { x: -30, z: 7, kind: 'missile' },
      { x: 0, z: -500, kind: 'super-tank' },
    ])
    expect(blips.length).toBe(3)
    for (const b of blips) {
      expect(Number.isFinite(b.bearing)).toBe(true)
      expect(b.bearing).toBeGreaterThan(-Math.PI - TOL)
      expect(b.bearing).toBeLessThanOrEqual(Math.PI + TOL)
    }
  })
})

describe('deriveRadar — range', () => {
  it('reports Euclidean planar distance from the player', () => {
    const [blip] = deriveRadar(AT_ORIGIN, [{ x: 300, z: 400, kind: 'tank' }])
    expect(Math.abs(blip.range - 500)).toBeLessThan(TOL) // 3-4-5
  })

  it('every range is finite and ≥ 0', () => {
    const blips = deriveRadar(AT_ORIGIN, [
      { x: 1, z: 0, kind: 'tank' },
      { x: -999, z: 999, kind: 'missile' },
    ])
    for (const b of blips) {
      expect(Number.isFinite(b.range)).toBe(true)
      expect(b.range).toBeGreaterThanOrEqual(0)
    }
  })

  it('a contact sitting on the player (dx=dz=0) is a finite, range-0 blip', () => {
    // Degenerate boundary: must not produce NaN from atan2(0,0)/hypot(0,0).
    const [blip] = deriveRadar(AT_ORIGIN, [{ x: 0, z: 0, kind: 'tank' }])
    expect(blip).toBeDefined()
    expect(Number.isFinite(blip.bearing)).toBe(true)
    expect(Math.abs(blip.range)).toBeLessThan(TOL)
  })
})

describe('deriveRadar — radar-invisibility filter (ROM: obstacles + saucer)', () => {
  it("declares RADAR_INVISIBLE_KINDS containing 'obstacle' and 'saucer'", () => {
    const kinds = mod.RADAR_INVISIBLE_KINDS ?? []
    expect(kinds.includes('obstacle')).toBe(true)
    expect(kinds.includes('saucer')).toBe(true)
  })

  it('the 21-entry ROM obstacle field produces ZERO blips', () => {
    // Drive the REAL obstacle table through the filter — obstacles never scan.
    const contacts: RadarContact[] = OBSTACLES.map((o) => ({
      x: o.x,
      z: o.z,
      kind: 'obstacle',
    }))
    expect(contacts.length).toBe(21)
    expect(deriveRadar(AT_ORIGIN, contacts)).toHaveLength(0)
  })

  it('a saucer contact produces ZERO blips (the bz1-9 exclusion path)', () => {
    // bz1-9 wires the live saucer through this exact filter with no change.
    expect(deriveRadar(AT_ORIGIN, [{ x: 200, z: 200, kind: 'saucer' }])).toHaveLength(0)
  })

  it('filters ONLY the invisible kinds out of a mixed field', () => {
    const contacts: RadarContact[] = [
      { x: 100, z: 0, kind: 'tank' }, //      visible
      { x: 0, z: 100, kind: 'obstacle' }, //  invisible
      { x: -100, z: 0, kind: 'missile' }, //  visible
      { x: 0, z: -100, kind: 'saucer' }, //   invisible
      { x: 50, z: 50, kind: 'super-tank' }, // visible
    ]
    // Exactly the three visible hostiles survive — not 5, not 0.
    expect(deriveRadar(AT_ORIGIN, contacts)).toHaveLength(3)
  })

  it('an empty contact list yields an empty blip list', () => {
    expect(deriveRadar(AT_ORIGIN, [])).toHaveLength(0)
  })
})

describe('deriveRadar — purity of inputs', () => {
  it('does not mutate the contacts array it is given', () => {
    const contacts: RadarContact[] = [
      { x: 100, z: 0, kind: 'tank' },
      { x: 0, z: 100, kind: 'saucer' },
    ]
    const snapshot = JSON.stringify(contacts)
    deriveRadar(AT_ORIGIN, contacts)
    expect(contacts).toHaveLength(2)
    expect(JSON.stringify(contacts)).toBe(snapshot)
  })
})

describe('sweepAngle — deterministic rotating sweep (no wall-clock)', () => {
  it('exports a positive, finite SWEEP_PERIOD_MS', () => {
    expect(typeof mod.SWEEP_PERIOD_MS).toBe('number')
    expect(Number.isFinite(mod.SWEEP_PERIOD_MS as number)).toBe(true)
    expect(mod.SWEEP_PERIOD_MS as number).toBeGreaterThan(0)
  })

  it('starts at angle 0 when elapsed is 0', () => {
    expect(Math.abs(angleGap(sweepAngle(0), 0))).toBeLessThan(TOL)
  })

  it('reaches ~π at half a period and wraps to ~0 at a full period', () => {
    const P = mod.SWEEP_PERIOD_MS as number
    expect(Math.abs(angleGap(sweepAngle(P / 2), Math.PI))).toBeLessThan(1e-6)
    expect(Math.abs(angleGap(sweepAngle(P), 0))).toBeLessThan(1e-6)
  })

  it('advances monotonically within a single period', () => {
    const P = mod.SWEEP_PERIOD_MS as number
    let prev = -Infinity
    for (let i = 0; i < 10; i++) {
      const a = sweepAngle((i / 10) * P) // samples in [0, P)
      expect(a).toBeGreaterThan(prev)
      prev = a
    }
  })

  it('always returns an angle in [0, 2π)', () => {
    const P = mod.SWEEP_PERIOD_MS as number
    for (let i = 0; i <= 40; i++) {
      const a = sweepAngle((i / 10) * P) // spans several full periods
      expect(a).toBeGreaterThanOrEqual(0)
      expect(a).toBeLessThan(TAU)
    }
  })

  it('is periodic: t and t + SWEEP_PERIOD_MS map to the same angle', () => {
    const P = mod.SWEEP_PERIOD_MS as number
    for (const t of [0, P * 0.13, P * 0.5, P * 0.87]) {
      expect(Math.abs(angleGap(sweepAngle(t + P), sweepAngle(t)))).toBeLessThan(1e-6)
    }
  })

  it('is deterministic: identical elapsed → identical angle (no ambient state)', () => {
    expect(sweepAngle(1234.5)).toBe(sweepAngle(1234.5))
    expect(sweepAngle(0)).toBe(sweepAngle(0))
  })
})
