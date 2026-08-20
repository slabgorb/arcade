// plugins/millipede/tests/pt1-8-empty-high-score.test.ts
//
// Story pt1-8 (RED / TEA) — erase the built-in high score. The 2026-08-19 playtest
// found millipede boots with the seeded ROM DEFAULT_HIGH_SCORES ladder on screen; a
// fresh cabinet must instead start with an EMPTY board (localStorage-backed real
// scores only). This is a DELIBERATE, user-sanctioned deviation from ROM fidelity.
//
// The ROM byte-decode of DEFAULT_HIGH_SCORES is KEPT as unwired REFERENCE (see
// tests/highscore.test.ts + tests/audit/high-scores-claims.test.ts, untouched by this
// story): the constant still exists and still decodes, it is simply no longer read by
// any runtime seed path. This file pins the NEW behavior:
//
//   • loadHighScores(<empty/unreachable storage>) === []          (AC1 — the load seam)
//   • createGame(seed).highScores === []                          (AC1 — initial state)
//   • DEFAULT_HIGH_SCORES REMAINS declared (8 ROM rows)           (AC4 — reference alive)
//   • no runtime src file references DEFAULT_HIGH_SCORES           (AC4 — nothing seeds)
//   • the shell boots an empty board WITHOUT crashing the HUD      (AC2 — empty display)
//
// millipede's vitest project is `environment: 'node'` (no localStorage). With no
// localStorage global installed, makeMilliHighScoreStorage().load() returns [] (the
// unreachable-store path), which is exactly the first-boot case.

import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'
import { createGame } from '../src/core/game-state'
import { loadHighScores, makeMilliHighScoreStorage } from '../src/shell/highscore.js'
import { DEFAULT_HIGH_SCORES, MILLI_HIGH_SCORE_DEPTH } from '../src/core/highscore.js'
import { bootMillipedeShell, type ShellHarness } from './helpers/boot-shell'

const PLUGIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(PLUGIN_ROOT, 'src')

// Ensure the "first boot" state: NO persisted board anywhere. millipede runs under
// node, so simply removing the global leaves load() on the unreachable-store path.
beforeEach(() => {
  delete (globalThis as Record<string, unknown>).localStorage
})

describe('pt1-8 — the millipede high-score board starts EMPTY (no built-in seed)', () => {
  it('loadHighScores returns [] on a first / empty / unreachable boot — never the ROM default', () => {
    const loaded = loadHighScores(makeMilliHighScoreStorage())
    expect(loaded, 'a fresh cabinet must start clean, not seeded with BBM/FXL/…').toEqual([])
  })

  it('createGame seeds an EMPTY live ladder (initial GameState board is [])', () => {
    const g = createGame(0x1982) as { highScores: readonly unknown[] }
    expect(g.highScores, 'the initial state must carry no built-in scores').toEqual([])
  })
})

describe('pt1-8 — DEFAULT_HIGH_SCORES REMAINS as unwired ROM reference (AC4)', () => {
  it('still decodes to the eight ROM rows, best-first (documentation, wired to nothing)', () => {
    // The constant is NOT deleted — only unwired. tests/highscore.test.ts byte-pins
    // the decode; here we assert only that it survives, so a Dev who "cleans up" the
    // whole module reddens.
    expect(DEFAULT_HIGH_SCORES).toHaveLength(MILLI_HIGH_SCORE_DEPTH)
    expect(DEFAULT_HIGH_SCORES[0]).toEqual({ name: 'BBM', score: 89_175 })
    expect(DEFAULT_HIGH_SCORES[MILLI_HIGH_SCORE_DEPTH - 1]).toEqual({ name: 'DFW', score: 41_916 })
  })

  it('is referenced by NO runtime src file except its own declaration (no seed path)', () => {
    // AC4: "no runtime seed path imports it." Scan every src/**/*.ts with comments
    // stripped; the only permitted occurrence of the token is the `export const`
    // declaration in core/highscore.ts. Any other hit (an import, a `highScores:
    // DEFAULT_HIGH_SCORES` seed, a `: DEFAULT_HIGH_SCORES` fallback) is a live seed.
    // RED today: game-state.ts + shell/highscore.ts both import and seed it.
    const { declarations, violations, scanned } = scanForDefaultSeed(SRC)

    // Positive read-set floor (#28): a rename must not silently drop a seed file from
    // the scan. Require the files that hold the seed today to be in the scanned set.
    for (const req of ['core/highscore.ts', 'core/game-state.ts', 'shell/highscore.ts', 'main.ts']) {
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

describe('pt1-8 — an empty board renders WITHOUT crashing the HUD (AC2)', () => {
  // main.ts's HUD reads `state.highScores[0].score`. On an empty board that is
  // `undefined.score` — a throw. This proves Dev guards the read (mc's `?.score ?? 0`
  // idiom) when the seed is removed. An EMPTY (present-but-keyless) store keeps the boot
  // healthy while making loadHighScores return the empty board. Today the board is the
  // non-empty DEFAULT, so the empty-board assertion is RED; the no-throw assertion is the
  // guard that reddens if Dev removes the seed without guarding the HUD read.
  const makeFakeStorage = (initial: Record<string, string>): Storage => {
    const map = new Map<string, string>(Object.entries(initial))
    return {
      get length() {
        return map.size
      },
      clear: () => map.clear(),
      getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
      key: (i: number) => Array.from(map.keys())[i] ?? null,
      removeItem: (k: string) => void map.delete(k),
      setItem: (k: string, v: string) => void map.set(k, v),
    } as Storage
  }

  let shell: ShellHarness
  // ONE boot for both assertions (beforeAll, per the Group D idiom) — a second boot
  // shares the harness's global rAF state and halts the loop.
  beforeAll(async () => {
    // A present-but-empty store (no high-score key) → loadHighScores returns [] once the
    // seed is removed, but the shell still boots healthily (a rAF loop needs a store).
    ;(globalThis as Record<string, unknown>).localStorage = makeFakeStorage({})
    shell = await bootMillipedeShell()
    for (let i = 0; i < 20; i++) shell.frame(i * 4)
  })

  it('boots an EMPTY board and renders 20 frames without crashing the HUD', () => {
    // Two guarantees in one: (1) the live board threaded through main.ts is empty on a
    // fresh cabinet — RED today, the board is the seeded DEFAULT; (2) the boot + 20
    // render frames ran in beforeAll without a throw — the unguarded `highScores[0].score`
    // HUD read (main.ts) would throw on the empty board, so reaching this assertion at all
    // proves Dev guarded it (mc's `?.score ?? 0` idiom).
    const live = (shell.sim() as { highScores: readonly unknown[] }).highScores
    expect(live, 'the booted attract board must be empty, and rendering it must not crash').toEqual([])
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
