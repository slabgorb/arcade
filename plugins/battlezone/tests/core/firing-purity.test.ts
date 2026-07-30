// tests/core/firing-purity.test.ts
//
// Story bz1-5 — RED phase (Furiosa / TEA). Rule-enforcement suite for the new
// core module this story creates (firing).
//
// Enforces the epic's non-negotiable core-purity rule (context-epic-bz1.md:
// core/ must never touch DOM/time/randomness — all time enters as dt) and the
// TypeScript lang-review checklist: #1 (no `as any` / `@ts-ignore` /
// `as unknown as`) and #2 (readonly discipline — a pure reducer must not mutate
// its inputs). Mirrors bz1-4's movement-purity suite.
//
// RED: these fail while firing.ts doesn't exist — existence is itself the first
// assertion of the firing contract.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import type { TankPose } from '../../src/core/camera'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const path = (rel: string): string => join(root, rel)

const NEW_CORE_MODULE = 'src/core/firing.ts'

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

// TS lang-review #1: type-system escapes need a story-level reason; a fresh pure
// firing module has none.
const BANNED_ESCAPES = ['as any', '@ts-ignore', 'as unknown as'] as const

interface Shell {
  readonly x: number
  readonly z: number
  readonly heading: number
  readonly range: number
}
interface Input {
  readonly leftTread: number
  readonly rightTread: number
  readonly fire: boolean
}
interface FiringModule {
  stepFiring(active: Shell | null, pose: TankPose, input: Input, dt: number): Shell | null
}

async function loadFiring(): Promise<FiringModule> {
  let m: Partial<FiringModule> = {}
  try {
    m = (await import('../../src/core/firing')) as unknown as Partial<FiringModule>
  } catch {
    // module not built yet
  }
  if (typeof m.stepFiring !== 'function') {
    throw new Error('CONTRACT: src/core/firing.ts must export stepFiring(active, pose, input, dt)')
  }
  return m as FiringModule
}

describe(`purity — ${NEW_CORE_MODULE}`, () => {
  it('exists (the bz1-5 firing module)', () => {
    expect(existsSync(path(NEW_CORE_MODULE)), `${NEW_CORE_MODULE} must exist`).toBe(true)
  })

  it('contains no DOM / time / randomness tokens (epic core-purity rule)', () => {
    const src = existsSync(path(NEW_CORE_MODULE)) ? readFileSync(path(NEW_CORE_MODULE), 'utf8') : ''
    expect(src.length).toBeGreaterThan(0)
    for (const token of BANNED_IMPURITY) {
      expect(src, `${NEW_CORE_MODULE} must not contain "${token}"`).not.toContain(token)
    }
  })

  it('contains no type-safety escapes (lang-review #1)', () => {
    const src = existsSync(path(NEW_CORE_MODULE)) ? readFileSync(path(NEW_CORE_MODULE), 'utf8') : ''
    expect(src.length).toBeGreaterThan(0)
    for (const token of BANNED_ESCAPES) {
      expect(src, `${NEW_CORE_MODULE} must not contain "${token}"`).not.toContain(token)
    }
  })

  it('imports only sibling core modules (never shell/, never node builtins)', () => {
    const src = existsSync(path(NEW_CORE_MODULE)) ? readFileSync(path(NEW_CORE_MODULE), 'utf8') : ''
    expect(src.length).toBeGreaterThan(0)
    const importPaths = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((mm) => mm[1])
    for (const p of importPaths) {
      expect(
        p.startsWith('./'),
        `${NEW_CORE_MODULE} imports "${p}" — core may only import sibling core modules`,
      ).toBe(true)
    }
  })
})

describe('purity — stepFiring is a non-mutating reducer (lang-review #2 readonly)', () => {
  const POSE: TankPose = { x: 0, z: 0, heading: Math.PI / 4 }
  const FIRE: Input = Object.freeze({ leftTread: 0, rightTread: 0, fire: true })

  it('does not mutate the input frame or the active shell it is handed', async () => {
    const { stepFiring } = await loadFiring()
    // Spawn, then advance a FROZEN shell with a FROZEN input: a reducer that
    // tried to mutate either would throw in strict mode. It must return a fresh
    // object instead.
    const spawned = stepFiring(null, POSE, FIRE, 1 / 240)
    expect(spawned).not.toBeNull()
    const frozen = Object.freeze({ ...(spawned as Shell) }) as Shell
    const IDLE: Input = Object.freeze({ leftTread: 0, rightTread: 0, fire: false })
    const advanced = stepFiring(frozen, POSE, IDLE, 1 / 240)
    // Frozen inputs untouched…
    expect(frozen.range).toBe((spawned as Shell).range)
    // …and the result is a distinct object (or a clean null on block/expiry).
    if (advanced !== null) {
      expect(advanced).not.toBe(frozen)
    }
  })
})
