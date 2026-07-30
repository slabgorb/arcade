// tests/core/radar-purity.test.ts
//
// Story bz1-6 — RED phase (Furiosa / TEA). Rule-enforcement suite for the ONE
// new core module this story creates: the radar scanner.
//
// Enforces the epic's non-negotiable core-purity rule (context-epic-bz1.md:
// core/ must never touch DOM/time/randomness — all time enters as an argument;
// the sweep takes `elapsedMs`, never reads the clock) and the TypeScript
// lang-review type-safety-escape rule (#1: no `as any` / `@ts-ignore` /
// `as unknown as`). Mirrors bz1-4's movement-purity suite (file-content scans
// via readFileSync against this repo's own source).
//
// RED: these fail while the module doesn't exist — existence is itself the first
// assertion of the radar contract.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const path = (rel: string): string => join(root, rel)

const NEW_CORE_MODULE = 'src/core/radar.ts'

// Epic purity rule: no DOM, no wall-clock, no ambient randomness, no rAF. The
// sweep is deterministic in `elapsedMs`; a Date.now() here would make the whole
// radar non-reproducible and break bz1-9's determinism tests downstream.
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
// radar module has none.
const BANNED_ESCAPES = ['as any', '@ts-ignore', 'as unknown as'] as const

describe(`purity — ${NEW_CORE_MODULE}`, () => {
  it('exists (the bz1-6 radar module)', () => {
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
    const importPaths = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1])
    for (const p of importPaths) {
      expect(
        p.startsWith('./'),
        `${NEW_CORE_MODULE} imports "${p}" — core may only import sibling core modules`,
      ).toBe(true)
    }
  })
})
