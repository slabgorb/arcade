// tests/core/core-purity-sweep.test.ts
//
// Story bz1-8 — RED phase (Furiosa / TEA). Directory-wide enforcement of the
// epic's non-negotiable core-purity rule (context-epic-bz1.md: core/ never
// touches DOM/time/randomness — all time enters as dt, all randomness from
// the carried seed) and lang-review #1 (no type-system escapes).
//
// WHY A SWEEP: bz1-4/5/7's purity suites each scan a hand-named file list, so
// a NEW core module (say, a missiles.ts split out during this story's roster
// rework) would ship unscanned. This suite closes that hole permanently:
// every .ts file under src/core/ is scanned, present and future. Verified
// green against the pre-bz1-8 tree — any failure is new impurity, not legacy.
//
// (House precedent: the per-story suites stay — they carry the story-level
// contract context. This sweep is the epic-level backstop.)

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const coreDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'core')

// Epic purity rule: no DOM, no wall-clock, no ambient randomness, no rAF.
// (Mirrors enemies-purity.test.ts's list — keep the two in sync.)
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

// TS lang-review #1: type-system escapes need a story-level reason; the pure
// core has none.
const BANNED_ESCAPES = ['as any', '@ts-ignore', 'as unknown as'] as const

const coreFiles = readdirSync(coreDir).filter((f) => f.endsWith('.ts'))

describe('core purity sweep — every file under src/core/, present and future', () => {
  it('finds the core modules at all (a moved directory must fail loudly, not pass vacuously)', () => {
    expect(coreFiles.length).toBeGreaterThan(0)
  })

  for (const file of coreFiles) {
    describe(`src/core/${file}`, () => {
      it('contains no DOM / time / randomness tokens (epic core-purity rule)', () => {
        const src = readFileSync(join(coreDir, file), 'utf8')
        expect(src.length).toBeGreaterThan(0)
        for (const token of BANNED_IMPURITY) {
          expect(src, `src/core/${file} must not contain "${token}"`).not.toContain(token)
        }
      })

      it('contains no type-safety escapes (lang-review #1)', () => {
        const src = readFileSync(join(coreDir, file), 'utf8')
        for (const token of BANNED_ESCAPES) {
          expect(src, `src/core/${file} must not contain "${token}"`).not.toContain(token)
        }
      })
    })
  }
})
