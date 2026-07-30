// tests/core/models.test.ts
//
// Story bz1-2 — RED phase (The Jesus / TEA).
//
// CONTRACT for the GREEN phase (Walter / DEV): create `src/core/models.ts`, the
// wireframe geometry registry, mirroring the sibling star-wars/src/core/models.ts
// EXACTLY in shape:
//
//   import type { Vec3 } from '@shared/math3d'          // Vec3 = readonly [number,number,number]
//   export interface Model3D {
//     readonly name: string
//     readonly vertices: readonly Vec3[]           // object-space points, ROM-ported
//     readonly edges: readonly (readonly [number, number])[]  // index pairs (wireframe)
//   }
//   export const MODELS: readonly Model3D[]         // array OR record — read by name
//
// The registry MUST cover the full Battlezone roster the findings doc distills:
// slow tank, super tank, missile, saucer, the player shell/projectile, the
// explosion debris, AND one model per obstacle shape (pyramid, box, …). Models
// are matched by their human-readable `name` (regex), so DEV is free to name the
// exports naturally — same convention as star-wars 8-2.
//
// WELL-FORMEDNESS, NOT SPECIFIC EDGES. After the byte-decode rework, 9 of the 10
// models are fully ROM-exact — vertices AND edges decoded straight from each
// shape's ROM command stream; EXPLOSION_DEBRIS is the lone hybrid (ROM-exact
// vertices, authored edges, because the ROM draws that debris as unconnected
// points — see models.ts). These tests deliberately assert edge *well-formedness*
// (valid indices, no self edges, no duplicates, no orphan vertices) rather than
// exact edge lists: baking the decoded edges as fixtures would duplicate the data
// port into the test and couple the committed suite to the gitignored quarry (the
// same reasoning as obstacle positions). Exact ROM-edge fidelity is carried by
// models.ts's per-model citations and audited by the Reviewer, not unit-tested here.
// Orientation and scale are RENDER concerns eyeballed in the dev server, not
// baked here (see the epic's geometry-connectivity note).
//
// reference/ INDEPENDENCE + DEFENSIVE LOAD: same as obstacles.test.ts — imports
// only from src/core, and loads defensively so RED reports clean assertion
// failures. The final test cross-references src/core/obstacles so a "sneaky dev"
// can't ship 21 obstacles whose shapes have no geometry.

import { describe, it, expect, beforeAll } from 'vitest'
import type { Model3D } from '../../src/core/models'
import type { Obstacle, ObstacleType } from '../../src/core/obstacles'

let MODELS: readonly Model3D[] = []
let OBSTACLES: readonly Obstacle[] = []
let OBSTACLE_TYPES: readonly ObstacleType[] = []

beforeAll(async () => {
  try {
    const reg = (
      (await import('../../src/core/models')) as {
        MODELS?: readonly Model3D[] | Readonly<Record<string, Model3D>>
      }
    ).MODELS
    MODELS = !reg ? [] : Array.isArray(reg) ? [...reg] : Object.values(reg)
  } catch {
    MODELS = []
  }
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

const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '')
const findByName = (re: RegExp): Model3D | undefined =>
  MODELS.find((m) => typeof m.name === 'string' && re.test(m.name))

describe('models — registry & roster', () => {
  it('exposes a non-empty MODELS registry', () => {
    expect(MODELS.length).toBeGreaterThan(0)
  })

  it('covers the full roster (>= 8: 4 enemies + shell + debris + >= 2 obstacle shapes)', () => {
    expect(MODELS.length).toBeGreaterThanOrEqual(8)
  })

  it('every registry entry conforms to the Model3D shape', () => {
    expect(MODELS.length).toBeGreaterThan(0)
    for (const m of MODELS) {
      expect(typeof m.name).toBe('string')
      expect(m.name.length).toBeGreaterThan(0)
      expect(Array.isArray(m.vertices)).toBe(true)
      expect(Array.isArray(m.edges)).toBe(true)
    }
  })

  it('includes the slow tank (1000-pt hostile)', () => {
    expect(findByName(/slow[\s_-]?tank/i)).toBeDefined()
  })

  it('includes the super tank (3000-pt hostile)', () => {
    expect(findByName(/super[\s_-]?tank/i)).toBeDefined()
  })

  it('includes the missile (2000-pt hostile)', () => {
    expect(findByName(/missile/i)).toBeDefined()
  })

  it('includes the saucer (5000-pt bonus visitor)', () => {
    expect(findByName(/saucer/i)).toBeDefined()
  })

  it('includes the player shell / projectile', () => {
    expect(findByName(/shell|projectile|shot/i)).toBeDefined()
  })

  it('includes the explosion debris', () => {
    expect(findByName(/debris|explosion|shrapnel/i)).toBeDefined()
  })
})

describe('models — well-formedness (every model)', () => {
  it('every vertex is a finite Vec3 (length-3 number tuple)', () => {
    expect(MODELS.length).toBeGreaterThan(0)
    for (const m of MODELS) {
      expect(m.vertices.length).toBeGreaterThan(0)
      for (const v of m.vertices) {
        expect(Array.isArray(v)).toBe(true)
        expect(v.length).toBe(3)
        for (const c of v) expect(Number.isFinite(c)).toBe(true)
      }
    }
  })

  it('every edge is a pair of integer vertex indices', () => {
    expect(MODELS.length).toBeGreaterThan(0)
    for (const m of MODELS) {
      expect(m.edges.length).toBeGreaterThan(0)
      for (const e of m.edges) {
        expect(e.length).toBe(2)
        expect(Number.isInteger(e[0])).toBe(true)
        expect(Number.isInteger(e[1])).toBe(true)
      }
    }
  })

  it('every edge index is in range [0, vertexCount)', () => {
    expect(MODELS.length).toBeGreaterThan(0)
    for (const m of MODELS) {
      const n = m.vertices.length
      for (const [a, b] of m.edges) {
        expect(a).toBeGreaterThanOrEqual(0)
        expect(a).toBeLessThan(n)
        expect(b).toBeGreaterThanOrEqual(0)
        expect(b).toBeLessThan(n)
      }
    }
  })

  it('has no degenerate edges (an edge never joins a vertex to itself)', () => {
    expect(MODELS.length).toBeGreaterThan(0)
    for (const m of MODELS) {
      for (const [a, b] of m.edges) expect(a).not.toBe(b)
    }
  })

  it('has no duplicate edges (undirected)', () => {
    expect(MODELS.length).toBeGreaterThan(0)
    for (const m of MODELS) {
      const seen = new Set<string>()
      for (const [a, b] of m.edges) {
        const key = a < b ? `${a}-${b}` : `${b}-${a}`
        expect(seen.has(key)).toBe(false)
        seen.add(key)
      }
    }
  })

  it('has no orphan vertices (every vertex is referenced by an edge)', () => {
    expect(MODELS.length).toBeGreaterThan(0)
    for (const m of MODELS) {
      const used = new Set<number>()
      for (const [a, b] of m.edges) {
        used.add(a)
        used.add(b)
      }
      for (let i = 0; i < m.vertices.length; i++) {
        expect(used.has(i)).toBe(true)
      }
    }
  })
})

describe('models — cross-module integrity with obstacles', () => {
  it('every obstacle type in play maps to its own distinct wireframe model', () => {
    // AC: models include "each obstacle shape". Keeps the sneaky dev honest — the
    // 21 obstacles must reference geometry that actually exists. The old
    // some()/substring check was gameable two ways: (1) one model named
    // "narrowpyramidwidepyramidtallboxshortbox" is a superstring of every type id,
    // so it alone satisfied all four; (2) a stray collision could let two models
    // claim one type. Tighten to a real injective map: EXACTLY ONE model per type,
    // and the per-type models must all be DISTINCT — so no single mega-named model
    // can cover the whole roster.
    const usedTypes = [...new Set(OBSTACLES.map((o) => o.type))]
    expect(usedTypes.length).toBeGreaterThan(0) // fail loud during RED, never vacuous
    const picked = new Set<Model3D>()
    for (const t of usedTypes) {
      const matches = MODELS.filter((m) => norm(m.name).includes(norm(t)))
      expect(
        matches.length,
        `expected exactly 1 model for obstacle type "${t}", got ${matches.length}: [${matches.map((m) => m.name).join(', ')}]`,
      ).toBe(1)
      picked.add(matches[0])
    }
    expect(
      picked.size,
      'each obstacle type must map to a DISTINCT model (no single model covering multiple types)',
    ).toBe(usedTypes.length)
  })

  it('every declared obstacle type maps to its own distinct wireframe model', () => {
    // Every DECLARED obstacle type (not only those placed) should also be
    // model-backed, so later stories can spawn/draw any type without a gap.
    // Same injective tightening as the test above: exactly one model per type,
    // all distinct — not a gameable some()/substring check.
    expect(OBSTACLE_TYPES.length).toBeGreaterThan(0)
    const picked = new Set<Model3D>()
    for (const t of OBSTACLE_TYPES) {
      const matches = MODELS.filter((m) => norm(m.name).includes(norm(t)))
      expect(
        matches.length,
        `expected exactly 1 model for declared type "${t}", got ${matches.length}: [${matches.map((m) => m.name).join(', ')}]`,
      ).toBe(1)
      picked.add(matches[0])
    }
    expect(
      picked.size,
      'each declared obstacle type must map to a DISTINCT model',
    ).toBe(OBSTACLE_TYPES.length)
  })
})
