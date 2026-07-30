// tests/core/obstacles.test.ts
//
// Story bz1-2 — RED phase (The Jesus / TEA).
//
// CONTRACT for the GREEN phase (Walter / DEV): create `src/core/obstacles.ts`,
// the authority-chain port of the ROM's 21-obstacle table, exporting:
//
//   export type ObstacleType = 'pyramid' | 'box' | …   // a CLOSED string union
//   export const OBSTACLE_TYPES: readonly ObstacleType[] // the declared taxonomy
//   export interface Obstacle {
//     readonly x: number            // planar world X  (planar-sim ruling: no y)
//     readonly z: number            // planar world Z
//     readonly orientation: number  // heading, ROM units cited in findings doc
//     readonly type: ObstacleType
//   }
//   export const OBSTACLES: readonly Obstacle[]          // EXACTLY 21 entries
//
// TEST / ATTESTATION SPLIT (decided in RED, documented in the TEA assessment):
//   * These tests assert STRUCTURE, COUNT, and REFERENTIAL INTEGRITY only — the
//     invariants the story's Technical Approach names ("obstacle table has
//     exactly 21 entries"). They deliberately do NOT bake the exact ROM (x,z,
//     orientation) of each obstacle: doing so would (a) duplicate the entire
//     data port into a test fixture and (b) make the committed suite depend on
//     values only recoverable from the gitignored quarry. Exact ROM fidelity is
//     carried by the findings doc's per-fact citations and audited by the
//     Reviewer, not unit-tested here.
//   * reference/ INDEPENDENCE: this suite imports only from `src/core/` — never
//     from `reference/` (gitignored, checkout-local). It must pass in a fresh
//     `git clone battlezone` with no quarry present.
//
// Loaded defensively (await import in beforeAll): during RED the module does not
// exist yet, so a static import would crash collection. Loading defensively lets
// every invariant report a clean assertion failure — the exact contract DEV must
// satisfy — instead of one opaque module-resolution error.

import { describe, it, expect, beforeAll } from 'vitest'
import type { Obstacle, ObstacleType } from '../../src/core/obstacles'

let OBSTACLES: readonly Obstacle[] = []
let OBSTACLE_TYPES: readonly ObstacleType[] = []

beforeAll(async () => {
  try {
    const m = (await import('../../src/core/obstacles')) as {
      OBSTACLES?: readonly Obstacle[]
      OBSTACLE_TYPES?: readonly ObstacleType[]
    }
    OBSTACLES = m.OBSTACLES ?? []
    OBSTACLE_TYPES = m.OBSTACLE_TYPES ?? []
  } catch {
    OBSTACLES = []
    OBSTACLE_TYPES = []
  }
})

describe('obstacles — the 21-entry ROM table', () => {
  it('exports a non-empty OBSTACLES table', () => {
    expect(Array.isArray(OBSTACLES)).toBe(true)
    expect(OBSTACLES.length).toBeGreaterThan(0)
  })

  it('contains EXACTLY 21 obstacles (the ROM count — hard AC)', () => {
    // The single most load-bearing number in this story. Not >= 21, not ~21.
    expect(OBSTACLES.length).toBe(21)
  })

  it('every entry conforms to the Obstacle shape (planar x/z, orientation, type)', () => {
    expect(OBSTACLES.length).toBeGreaterThan(0)
    for (const o of OBSTACLES) {
      expect(typeof o.x).toBe('number')
      expect(typeof o.z).toBe('number')
      expect(typeof o.orientation).toBe('number')
      expect(typeof o.type).toBe('string')
      expect((o.type as string).length).toBeGreaterThan(0)
    }
  })

  it('every position component is finite (no NaN/Infinity leaking from a bad port)', () => {
    expect(OBSTACLES.length).toBeGreaterThan(0)
    for (const o of OBSTACLES) {
      expect(Number.isFinite(o.x)).toBe(true)
      expect(Number.isFinite(o.z)).toBe(true)
    }
  })

  it('every orientation is finite', () => {
    expect(OBSTACLES.length).toBeGreaterThan(0)
    for (const o of OBSTACLES) expect(Number.isFinite(o.orientation)).toBe(true)
  })
})

describe('obstacles — type taxonomy (referential integrity)', () => {
  it('declares a non-empty OBSTACLE_TYPES taxonomy', () => {
    expect(Array.isArray(OBSTACLE_TYPES)).toBe(true)
    expect(OBSTACLE_TYPES.length).toBeGreaterThan(0)
  })

  it('every obstacle.type is a member of the declared OBSTACLE_TYPES set', () => {
    expect(OBSTACLES.length).toBeGreaterThan(0)
    for (const o of OBSTACLES) {
      expect(OBSTACLE_TYPES.includes(o.type)).toBe(true)
    }
  })

  it('uses at least two distinct types across the field (epic: pyramids AND blocks)', () => {
    // context-epic-bz1.md: "21 fixed obstacles (pyramids/blocks)" — a mix, not one shape.
    expect(OBSTACLES.length).toBeGreaterThan(0)
    const used = new Set(OBSTACLES.map((o) => o.type))
    expect(used.size).toBeGreaterThanOrEqual(2)
  })
})

describe('obstacles — placement sanity', () => {
  it('all 21 obstacle positions are distinct (no two stacked at one (x,z))', () => {
    expect(OBSTACLES.length).toBeGreaterThan(0)
    const keys = new Set(OBSTACLES.map((o) => `${o.x},${o.z}`))
    expect(keys.size).toBe(OBSTACLES.length)
  })
})
