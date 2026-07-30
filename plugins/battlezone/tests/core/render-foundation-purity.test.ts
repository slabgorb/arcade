// tests/core/render-foundation-purity.test.ts
//
// Story bz1-3 — RED phase (Furiosa / TEA). Rule-enforcement suite.
//
// Enforces the epic's non-negotiable core purity rule (context-epic-bz1.md:
// core/ must never touch DOM/time/randomness — all time enters as dt, all
// randomness via the seeded RNG) and the TypeScript lang-review checklist's
// type-safety-escape rules (#1: no `as any` / `@ts-ignore`) on the three NEW
// core modules this story creates. File-content scans follow the house pattern
// of tests/scaffold.test.ts (readFileSync against this repo's own files).
//
// RED: these fail while the modules don't exist — existence is itself the
// first assertion of the render-foundation contract.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const path = (rel: string): string => join(root, rel)

const NEW_CORE_MODULES = [
  'src/core/camera.ts',
  'src/core/scene.ts',
  'src/core/horizon.ts',
] as const

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

// TS lang-review #1: type-system escapes need a story-level reason; a fresh
// pure-math module has none.
const BANNED_ESCAPES = ['as any', '@ts-ignore', 'as unknown as'] as const

describe.each(NEW_CORE_MODULES)('purity — %s', (rel) => {
  it('exists (the bz1-3 render-foundation module set)', () => {
    expect(existsSync(path(rel)), `${rel} must exist`).toBe(true)
  })

  it('contains no DOM / time / randomness tokens (epic core-purity rule)', () => {
    const src = existsSync(path(rel)) ? readFileSync(path(rel), 'utf8') : ''
    expect(src.length).toBeGreaterThan(0)
    for (const token of BANNED_IMPURITY) {
      expect(src, `${rel} must not contain "${token}"`).not.toContain(token)
    }
  })

  it('contains no type-safety escapes (lang-review #1)', () => {
    const src = existsSync(path(rel)) ? readFileSync(path(rel), 'utf8') : ''
    expect(src.length).toBeGreaterThan(0)
    for (const token of BANNED_ESCAPES) {
      expect(src, `${rel} must not contain "${token}"`).not.toContain(token)
    }
  })

  it('imports only sibling core modules or the pinned @shared library (never shell/, never node builtins)', () => {
    const src = existsSync(path(rel)) ? readFileSync(path(rel), 'utf8') : ''
    expect(src.length).toBeGreaterThan(0)
    const importPaths = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1])
    for (const p of importPaths) {
      // SH-2 (ADR-0001): core may consume the pure, version-pinned @shared
      // library (e.g. @shared/math3d) alongside its relative siblings.
      const allowed = p.startsWith('./') || p.startsWith('@shared/')
      expect(
        allowed,
        `${rel} imports "${p}" — core may only import sibling core modules or the pinned @shared library`,
      ).toBe(true)
    }
  })
})
