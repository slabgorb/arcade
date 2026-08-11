// tests/clamp-adoption.test.ts
//
// SH4-4 wiring guard. Extraction is only real if the duplicated local copies are
// DELETED and the sites import the shared clamp — otherwise a Dev could add
// @shared/clamp and leave all eight copies in place, satisfying nothing.
//
// AC-2: the four adopting games import `clamp` from '@shared/clamp' and no longer
//        define their own generic 3-arg clamp.
// AC-5: the out-of-scope variants (clampVel, clamp01, clampIndex, clampAxis,
//        battlezone's 1-arg clamp) stay LOCAL and are NOT folded into the shared
//        module. These assertions pass on arrival and must stay green — a guard
//        against over-folding.
//
// RED until GREEN: the adopting sites still define local clamps and don't import
// the shared one, and src/shared/clamp.ts does not yet exist.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const REPO_ROOT = resolve(import.meta.dirname, '../../..')
const read = (rel: string) => readFileSync(resolve(REPO_ROOT, rel), 'utf8')

// Strip comments so a stale doc-comment mentioning `const clamp = …` can't
// satisfy or trip a source-text check. Proportionate for these files (no `//`
// inside strings near the clamp sites); the definition patterns below only ever
// match real code lines.
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')

// A local generic clamp DEFINITION — the symbol named exactly `clamp` (word
// boundary excludes clampVel/clamp01/clampAxis/clampIndex) declared as a
// function, or a const/let/var binding (typed `clamp:` or assigned `clamp =`).
const definesLocalClamp = (src: string) =>
  /\bfunction\s+clamp\s*\(/.test(src) || /\b(?:const|let|var)\s+clamp\s*[:=]/.test(src)

// Detects a REAL import (call on comment-stripped source, or a commented-out
// `// import { clamp } from '@shared/clamp'` line satisfies it — see callers).
const importsSharedClamp = (src: string) =>
  /import\s*(?:type\s*)?\{[^}]*\bclamp\b[^}]*\}\s*from\s*['"]@shared\/clamp['"]/.test(src)

// Every site that carried a generic 3-arg clamp before the extraction.
const ADOPTING_SITES = [
  'plugins/red-baron/src/core/returning-ace.ts',
  'plugins/red-baron/src/core/flight.ts',
  'plugins/red-baron/src/core/score-countup.ts',
  'plugins/red-baron/src/core/lives.ts',
  'plugins/red-baron/src/core/enemy.ts',
  'plugins/asteroids/src/core/rocks.ts',
  'plugins/star-wars/src/core/gameRules.ts',
  'plugins/missile-command/src/core/cursor.ts',
] as const

describe('SH4-4 adoption — the shared clamp exists and exports only the generic form (AC-1)', () => {
  it('src/shared/clamp.ts exists and exports `clamp`', () => {
    expect(existsSync(resolve(REPO_ROOT, 'src/shared/clamp.ts'))).toBe(true)
    expect(/export\s+(?:function|const)\s+clamp\b/.test(read('src/shared/clamp.ts'))).toBe(true)
  })

  it('does NOT fold the out-of-scope variants into the shared module (AC-5)', () => {
    const shared = stripComments(read('src/shared/clamp.ts'))
    for (const variant of ['clampVel', 'clamp01', 'clampIndex', 'clampAxis']) {
      expect(shared.includes(variant), `${variant} must stay local, not in @shared/clamp`).toBe(false)
    }
  })
})

describe('SH4-4 adoption — each site imports @shared/clamp and drops its local copy (AC-2)', () => {
  for (const site of ADOPTING_SITES) {
    it(`${site} imports the shared clamp`, () => {
      expect(importsSharedClamp(stripComments(read(site))), `${site} must import clamp from @shared/clamp`).toBe(true)
    })

    it(`${site} no longer defines its own generic clamp`, () => {
      expect(
        definesLocalClamp(stripComments(read(site))),
        `${site} must delete its local generic clamp`,
      ).toBe(false)
    })
  }
})

describe('SH4-4 fence — out-of-scope clamp variants remain local (AC-5)', () => {
  const LOCAL_VARIANTS: ReadonlyArray<readonly [string, string]> = [
    ['plugins/asteroids/src/core/bullet.ts', 'clampVel'],
    ['plugins/battlezone/src/core/difficulty.ts', 'clamp01'],
    ['plugins/tempest/src/shell/glyphs.ts', 'clampIndex'],
    ['plugins/asteroids/src/core/ship.ts', 'clampAxis'],
    ['plugins/battlezone/src/core/sim.ts', 'clampAxis'],
  ]

  for (const [file, name] of LOCAL_VARIANTS) {
    it(`${name} stays defined in ${file}`, () => {
      const src = stripComments(read(file))
      const defined =
        new RegExp(`\\bfunction\\s+${name}\\s*\\(`).test(src) ||
        new RegExp(`\\bconst\\s+${name}\\s*=`).test(src)
      expect(defined, `${name} must remain a local helper in ${file}`).toBe(true)
    })
  }

  it("battlezone's 1-arg clamp(v) stays local (not the generic 3-arg form)", () => {
    // input.ts:92 defines `function clamp(v)` — a single-argument axis clamp that
    // is NOT the extracted generic form and must stay put.
    const src = stripComments(read('plugins/battlezone/src/shell/input.ts'))
    expect(/\bfunction\s+clamp\s*\(\s*v\s*:/.test(src), 'battlezone input.ts keeps its 1-arg clamp').toBe(true)
    // And it must NOT have been swapped for a shared import.
    expect(importsSharedClamp(src)).toBe(false)
  })
})
