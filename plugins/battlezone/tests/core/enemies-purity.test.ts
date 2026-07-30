// tests/core/enemies-purity.test.ts
//
// Story bz1-7 — RED phase (Furiosa / TEA). Rule-enforcement suite for the two
// core modules this story creates (enemies, rng).
//
// Enforces the epic's non-negotiable core-purity rule (context-epic-bz1.md:
// core/ must never touch DOM/time/randomness — all time enters as dt, all
// randomness from the carried seed) and the TypeScript lang-review checklist:
// #1 (no `as any` / `@ts-ignore` / `as unknown as`) and #2 (readonly
// discipline — a pure reducer must not mutate its inputs). Mirrors the
// bz1-4/bz1-5 movement/firing purity suites.
//
// The Math.random ban is THE load-bearing check of this story: a spawn picker
// is exactly where ambient randomness sneaks into a core. The seeded PRNG is
// the only lawful source of randomness (its mulberry32 internals contain none of
// the banned tokens — determinism comes from the carried seed word).
//
// SH-3 (ADR-0001): the seeded PRNG was extracted out of src/core/rng.ts into the
// pinned @shared/rng library, so rng.ts is no longer a local core module
// and enemies.ts now imports the generator from @shared — a lawful source
// alongside its relative siblings (mirrors render-foundation-purity's SH-2
// allowance for @shared/math3d).

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import type { TankPose } from '../../src/core/camera'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const path = (rel: string): string => join(root, rel)

// rng.ts was extracted to @shared/rng (SH-3); enemies.ts remains local.
const NEW_CORE_MODULES = ['src/core/enemies.ts'] as const

// Epic purity rule: no DOM, no wall-clock, no ambient randomness, no rAF.
const BANNED_IMPURITY = [
  'Math.random',
  'Date.now',
  'new Date',
  'performance.now',
  'requestAnimationFrame',
  'document.',
  'window.',
  'localStorage',
] as const

// TS lang-review #1: type-system escapes need a story-level reason; fresh pure
// core modules have none.
const BANNED_ESCAPES = ['as any', '@ts-ignore', 'as unknown as'] as const

interface Hostile {
  readonly x: number
  readonly z: number
  readonly heading: number
  readonly kind: string
  readonly phase: 'alive' | 'exploding'
  readonly phaseAge: number
}
interface Shell {
  readonly x: number
  readonly z: number
  readonly heading: number
  readonly range: number
}
interface EnemyState {
  readonly hostile: Hostile
  readonly shell: Shell | null
  readonly rng: number
}
interface EnemyStepResult {
  readonly state: EnemyState
  readonly scoreAward: number
  readonly playerShellConsumed: boolean
  readonly playerHit: boolean
}
interface EnemiesModule {
  initEnemies(seed: number, player: TankPose): EnemyState
  stepEnemies(
    state: EnemyState,
    player: TankPose,
    playerShell: Shell | null,
    dt: number,
  ): EnemyStepResult
}

async function loadEnemies(): Promise<EnemiesModule> {
  let m: Partial<EnemiesModule> = {}
  try {
    m = (await import('../../src/core/enemies')) as unknown as Partial<EnemiesModule>
  } catch {
    // module not built yet
  }
  if (typeof m.initEnemies !== 'function' || typeof m.stepEnemies !== 'function') {
    throw new Error(
      'CONTRACT: src/core/enemies.ts must export initEnemies(seed, player) and stepEnemies(state, player, playerShell, dt)',
    )
  }
  return m as EnemiesModule
}

for (const mod of NEW_CORE_MODULES) {
  describe(`purity — ${mod}`, () => {
    it(`exists (a bz1-7 core module)`, () => {
      expect(existsSync(path(mod)), `${mod} must exist`).toBe(true)
    })

    it('contains no DOM / time / randomness tokens (epic core-purity rule)', () => {
      const src = existsSync(path(mod)) ? readFileSync(path(mod), 'utf8') : ''
      expect(src.length).toBeGreaterThan(0)
      for (const token of BANNED_IMPURITY) {
        expect(src, `${mod} must not contain "${token}"`).not.toContain(token)
      }
    })

    it('contains no type-safety escapes (lang-review #1)', () => {
      const src = existsSync(path(mod)) ? readFileSync(path(mod), 'utf8') : ''
      expect(src.length).toBeGreaterThan(0)
      for (const token of BANNED_ESCAPES) {
        expect(src, `${mod} must not contain "${token}"`).not.toContain(token)
      }
    })

    it('imports only sibling core modules or the pinned @shared library (never shell/, never node builtins)', () => {
      const src = existsSync(path(mod)) ? readFileSync(path(mod), 'utf8') : ''
      expect(src.length).toBeGreaterThan(0)
      const importPaths = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((mm) => mm[1])
      for (const p of importPaths) {
        // SH-2/SH-3 (ADR-0001): core may consume the pure, version-pinned
        // @shared library (e.g. @shared/rng) alongside its siblings.
        const allowed = p.startsWith('./') || p.startsWith('@shared/')
        expect(
          allowed,
          `${mod} imports "${p}" — core may only import sibling core modules or the pinned @shared library`,
        ).toBe(true)
      }
    })
  })
}

describe('purity — stepEnemies is a non-mutating reducer (lang-review #2 readonly)', () => {
  const OPEN: TankPose = Object.freeze({ x: 200_000, z: 200_000, heading: 0 })

  it('does not mutate the state, hostile, shell, or pose it is handed', async () => {
    const { stepEnemies } = await loadEnemies()
    // Deep-freeze every input: a reducer that tried to mutate any of them
    // would throw in strict mode. It must return fresh objects instead. The
    // carried rng is a primitive seed word — unmutatable by construction.
    const hostile: Hostile = Object.freeze({
      x: 220_000,
      z: 200_000,
      heading: 1,
      kind: 'tank',
      phase: 'alive',
      phaseAge: 0.5,
    })
    const shell: Shell = Object.freeze({ x: 210_000, z: 205_000, heading: 2, range: 3_000 })
    const state: EnemyState = Object.freeze({ hostile, shell, rng: 1234 })
    const playerShell: Shell = Object.freeze({ x: 100_000, z: 100_000, heading: 0, range: 10 })

    const r = stepEnemies(state, OPEN, playerShell, 1 / 60)

    // Frozen inputs untouched…
    expect(state.hostile.x).toBe(220_000)
    expect(state.hostile.phaseAge).toBe(0.5)
    expect((state.shell as Shell).range).toBe(3_000)
    expect(state.rng).toBe(1234)
    // …and the result is distinct fresh state, never the same references
    // handed back mutated.
    expect(r.state).not.toBe(state)
    if (r.state.hostile.phaseAge !== hostile.phaseAge) {
      expect(r.state.hostile).not.toBe(hostile)
    }
  })

  it('initEnemies does not mutate the pose it spawns against', async () => {
    const { initEnemies } = await loadEnemies()
    const pose: TankPose = Object.freeze({ x: 0, z: 0, heading: 0.7 })
    const state = initEnemies(42, pose)
    expect(state.hostile).toBeTruthy()
    expect(pose.x).toBe(0)
    expect(pose.heading).toBe(0.7)
  })
})
