// plugins/missile-command/tests/pt1-8-empty-high-score.test.ts
//
// Story pt1-8 (RED / TEA) — erase the built-in high score. The 2026-08-19 playtest
// found missile-command boots with the seeded ROM DEFAULT_HIGH_SCORES ladder (DFT/DLS/
// … the W3DSUP defaults) on screen; a fresh cabinet must instead start with an EMPTY
// board (localStorage-backed real scores only). A DELIBERATE, user-sanctioned deviation
// from ROM fidelity.
//
// The ROM byte-decode of DEFAULT_HIGH_SCORES is KEPT as unwired REFERENCE (see
// tests/highscore.test.ts + tests/citations.test.ts, untouched by this story): the
// constant still exists and still decodes, it is simply no longer read by any runtime
// seed path. This file pins the NEW behavior:
//
//   • loadHighScores(<empty/unreachable storage>) === []          (AC1 — the load seam)
//   • createGame().highScores === [] and createPlayGame().highScores === []  (AC1)
//   • DEFAULT_HIGH_SCORES REMAINS declared (5 ROM rows)           (AC4 — reference alive)
//   • no runtime src file references DEFAULT_HIGH_SCORES           (AC4 — nothing seeds)
//
// missile-command's vitest project is `environment: 'node'` (no localStorage). With no
// localStorage global installed, makeMcHighScoreStorage().load() returns [] (the
// unreachable-store path) — exactly the first-boot case.

import { describe, it, expect, beforeEach } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'
import { createGame, createPlayGame } from '../src/core/game.js'
import { loadHighScores, makeMcHighScoreStorage } from '../src/shell/highscore.js'
import { DEFAULT_HIGH_SCORES, MC_HIGH_SCORE_DEPTH } from '../src/core/highscore.js'

const PLUGIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(PLUGIN_ROOT, 'src')

beforeEach(() => {
  delete (globalThis as Record<string, unknown>).localStorage
})

describe('pt1-8 — the missile-command high-score board starts EMPTY (no built-in seed)', () => {
  it('loadHighScores returns [] on a first / empty / unreachable boot — never the ROM default', () => {
    const loaded = loadHighScores(makeMcHighScoreStorage())
    expect(loaded, 'a fresh cabinet must start clean, not seeded with DFT/DLS/…').toEqual([])
  })

  it('createPlayGame seeds an EMPTY live ladder (the single boot seed point)', () => {
    expect(createPlayGame(1).highScores, 'the play board must carry no built-in scores').toEqual([])
  })

  it('createGame (the attract cold-start) also starts with an EMPTY ladder', () => {
    expect(createGame(1).highScores, 'the attract board must carry no built-in scores').toEqual([])
  })
})

describe('pt1-8 — DEFAULT_HIGH_SCORES REMAINS as unwired ROM reference (AC4)', () => {
  it('still decodes to the five W3DSUP rows, best-first (documentation, wired to nothing)', () => {
    expect(DEFAULT_HIGH_SCORES).toHaveLength(MC_HIGH_SCORE_DEPTH)
    expect(DEFAULT_HIGH_SCORES[0]).toEqual({ name: 'DFT', score: 7500 })
    expect(DEFAULT_HIGH_SCORES[MC_HIGH_SCORE_DEPTH - 1]).toEqual({ name: 'MJP', score: 6950 })
  })

  it('is referenced by NO runtime src file except its own declaration (no seed path)', () => {
    // AC4: "no runtime seed path imports it." RED today: game.ts (createPlayGame seed)
    // + shell/highscore.ts (the load fallback) both import and read it.
    const { declarations, violations, scanned } = scanForDefaultSeed(SRC)

    for (const req of ['core/highscore.ts', 'core/game.ts', 'shell/highscore.ts', 'main.ts']) {
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

// ─── the shared scan (self-contained; no cross-file test helper, per checklist #18) ──
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
