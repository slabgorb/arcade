// plugins/star-wars/tests/core/pt1-8-empty-high-score.test.ts
//
// Story pt1-8 (RED / TEA) — erase the built-in high score. The 2026-08-19 playtest
// found star-wars boots with the seeded ROM DEFAULT_HIGH_SCORES ladder (OBI/WAN/HAN/…
// the DOINTS defaults) on screen; a fresh cabinet must instead start with an EMPTY
// board (localStorage-backed real scores only). A DELIBERATE, user-sanctioned deviation
// from ROM fidelity — the pre-sw7-3 "NO SCORES YET" behaviour, restored.
//
// star-wars seeds through `main.ts:  let highScores = seedDefaultHighScores(load())`.
// The seam is `src/core/highScores.ts::seedDefaultHighScores`, whose whole job is to
// copy DEFAULT_HIGH_SCORES onto an empty board. This story removes the seed: main.ts
// must thread the RAW persisted load, and nothing runtime may read DEFAULT_HIGH_SCORES.
//
// The ROM byte-decode of DEFAULT_HIGH_SCORES is KEPT as unwired REFERENCE (see
// tests/core/default-high-scores.test.ts, which this story trims to the decode blocks
// only): the constant still exists and still decodes, wired to nothing.

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'
import { DEFAULT_HIGH_SCORES } from '../../src/core/highScores'

const PLUGIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SRC = join(PLUGIN_ROOT, 'src')

const stripComments = (s: string): string =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')

describe('pt1-8 — DEFAULT_HIGH_SCORES REMAINS as unwired ROM reference (AC4)', () => {
  it('still decodes to the ten DOINTS rows, best-first (documentation, wired to nothing)', () => {
    expect(DEFAULT_HIGH_SCORES).toHaveLength(10)
    expect(DEFAULT_HIGH_SCORES[0]).toMatchObject({ name: 'OBI', score: 1_285_353 })
    expect(DEFAULT_HIGH_SCORES[9]).toMatchObject({ name: 'RLM', score: 380_655 })
  })

  it('is referenced by NO runtime src file except its own declaration (no seed path)', () => {
    // AC4: "no runtime seed path imports it." RED today: core/highScores.ts's
    // seedDefaultHighScores body reads `[...DEFAULT_HIGH_SCORES]`.
    const { declarations, violations, scanned } = scanForDefaultSeed(SRC)

    for (const req of ['core/highScores.ts', 'main.ts']) {
      expect(scanned, `the src scan must cover ${req}`).toContain(req)
    }
    expect(scanned.length, 'the src scan must reach the whole module').toBeGreaterThan(10)

    expect(declarations, 'DEFAULT_HIGH_SCORES must REMAIN declared exactly once (AC4)').toBe(1)
    expect(
      violations,
      `no runtime src may reference the seeded ladder (AC4):\n  ${violations.join('\n  ')}`,
    ).toEqual([])
  })
})

describe('pt1-8 — main.ts stops seeding defaults on boot (AC1/AC2)', () => {
  const mainSrc = stripComments(readFileSync(join(SRC, 'main.ts'), 'utf8'))

  it('does NOT seed the ROM defaults on boot (seedDefaultHighScores is gone from the boot path)', () => {
    // RED today: main.ts imports and calls seedDefaultHighScores. A fresh cabinet must
    // boot the persisted board as-is — empty when nothing is stored.
    expect(
      mainSrc,
      'main.ts must not seed the ROM defaults — the board starts clean',
    ).not.toMatch(/seedDefaultHighScores/)
  })

  it('still loads the persisted board from storage (persistence is not dropped)', () => {
    // Guard the OTHER direction: removing the seed must not also drop the localStorage
    // load — real scores must still survive a reload.
    expect(mainSrc, 'main.ts must still load the persisted high-score board').toMatch(
      /highScoreStorage\.load\s*\(/,
    )
  })
})

// ─── the scan (self-contained; no cross-file test helper, per checklist #18) ─────────
function scanForDefaultSeed(srcRoot: string): {
  declarations: number
  violations: string[]
  scanned: string[]
} {
  const strip = (s: string): string =>
    s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
  const files = readdirSync(srcRoot, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith('.ts'))
    .map((d) => join(d.parentPath, d.name))
  const scanned = files.map((f) => relative(srcRoot, f).split('\\').join('/'))
  let declarations = 0
  const violations: string[] = []
  files.forEach((f, idx) => {
    strip(readFileSync(f, 'utf8'))
      .split('\n')
      .forEach((line, i) => {
        if (!line.includes('DEFAULT_HIGH_SCORES')) return
        if (/export const DEFAULT_HIGH_SCORES\b/.test(line)) {
          declarations++
          return
        }
        violations.push(`${scanned[idx]}:${i + 1}: ${line.trim()}`)
      })
  })
  return { declarations, violations, scanned }
}
