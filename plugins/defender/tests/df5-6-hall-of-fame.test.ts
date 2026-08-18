// tests/df5-6-hall-of-fame.test.ts
//
// Story df5-6 — RED phase (Leeloo / TEA). AC2: the final score is committed to the hall
// of fame via @shared/highscore + @shared/name-entry — the shared modules are CONSUMED,
// not re-implemented. Defender's score format maps onto the shared table, and NO bespoke
// high-score persistence is introduced (design spec §7: "the hall of fame is where df5
// CONSUMES @shared, not where it adds to it").
//
// ─── THE ROM, DECODED (all lines from tool output) ───────────────────────────────────
//   *HALL OF FAME ENTRY          AMODE1.SRC:117
//   HALLOF  JSR GNCIDE           AMODE1.SRC:119   (the hall-of-fame entry vector)
//   *HALL OF FAME INITIALS DISPLAY … HOFIN       AMODE1.SRC:242
//   *HALL OF FAME - ADD SCORE AND INITIALS TO LIST            AMODE1.SRC:270
// The ROM board is initials + score (CRHSTD RMB 12), i.e. the @shared base row shape
// { name, score } with no domain field — the battlezone / missile-command precedent
// (bind the base guard isHighScoreRow, domain key '').
//
// ─── WHAT GREEN (Dev) MUST SHIP ──────────────────────────────────────────────────────
//   plugins/defender/src/core/highscore.ts  — the PURE Defender board: a DefenderHighScore
//     row type that IS the @shared base shape, consuming qualifiesForHighScore/insertHighScore
//     from @shared (no re-implementation). No localStorage (purity.test.ts).
//   plugins/defender/src/shell/highscore.ts — the one-origin persistence seam:
//     DEFENDER_HIGH_SCORE_GAME_ID === 'defender' and makeDefenderHighScoreStorage() built on
//     @shared makeHighScoreStorage (load-on-boot + save-on-commit), the ONLY localStorage
//     toucher — exactly the asteroids/missile-command shape.
//   A glossary row + byte-verified claim pinning HALLOF (AMODE1.SRC:119) — the df1-1 gate.

import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  qualifiesForHighScore,
  insertHighScore,
  highScoreKey,
  MAX_HIGH_SCORES,
  type HighScoreEntryBase,
} from '@shared/highscore'
import { stepNameEntry } from '@shared/name-entry'
// RED until GREEN creates the modules.
import type { DefenderHighScore } from '../src/core/highscore.js'
import { DEFENDER_HIGH_SCORE_GAME_ID, makeDefenderHighScoreStorage } from '../src/shell/highscore.js'
import { expectPopulated } from './helpers/dossier-audit'
// The HALLOF cited-mapping (glossary + claim) assertions live in df5-6-identity.test.ts.

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = join(pluginRoot, 'src')

/** Every .ts file under src/ (core + shell), as text — for the "consumed, not
 *  re-implemented" source scan. */
function srcFiles(): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = []
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, name.name)
      if (name.isDirectory()) walk(p)
      else if (name.name.endsWith('.ts')) out.push({ path: p, text: readFileSync(p, 'utf8') })
    }
  }
  walk(srcDir)
  return out
}

/** A minimal in-memory localStorage (the asteroids/tuning.test.ts shape). */
function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map<string, string>(Object.entries(initial))
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size
    },
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('df5-6 AC2 — Defender score format maps onto the @shared hall-of-fame table', () => {
  it("a Defender row IS the @shared base shape { name, score } — assignable, no bespoke type", () => {
    // If DefenderHighScore drifts from the shared shape this stops compiling; the runtime
    // assertion keeps the test non-vacuous.
    const row: DefenderHighScore = { name: 'AAA', score: 12_345 }
    const asBase: HighScoreEntryBase = row
    expect(asBase.name).toBe('AAA')
    expect(asBase.score).toBe(12_345)
  })

  it('the final score sorts into the shared table via insertHighScore (descending, truncated)', () => {
    const table: DefenderHighScore[] = [
      { name: 'ONE', score: 30_000 },
      { name: 'TWO', score: 20_000 },
      { name: 'TRE', score: 10_000 },
    ]
    const withNew = insertHighScore(table, { name: 'NEW', score: 25_000 })
    expect(withNew.map((r) => r.score)).toEqual([30_000, 25_000, 20_000, 10_000])
    expect(withNew[1].name).toBe('NEW')
    // qualification: a score beating the lowest of a full board qualifies; a non-positive
    // score never does.
    const full: DefenderHighScore[] = Array.from({ length: MAX_HIGH_SCORES }, (_, i) => ({
      name: 'ZZZ',
      score: (i + 1) * 1_000,
    }))
    expect(qualifiesForHighScore(full, 500)).toBe(false) // below the lowest (1000)
    expect(qualifiesForHighScore(full, 50_000)).toBe(true)
    expect(qualifiesForHighScore([], 0)).toBe(false)
  })

  it('initials entry is the @shared name-entry stepper — consumed, not re-implemented', () => {
    // Prove Defender uses the shared 3-char stepper for HALL OF FAME INITIALS ENTRY.
    let buf = ''
    buf = stepNameEntry(buf, 'A', 3)
    buf = stepNameEntry(buf, 'B', 3)
    buf = stepNameEntry(buf, 'C', 3)
    expect(buf).toBe('ABC')
    buf = stepNameEntry(buf, 'D', 3) // capped at 3
    expect(buf).toBe('ABC')
  })
})

describe('df5-6 AC2 — @shared is CONSUMED, no bespoke high-score persistence is introduced', () => {
  it('defender src imports the shared hall-of-fame modules (highscore + name-entry)', () => {
    const files = srcFiles()
    expectPopulated(files.length, 1, 'defender src/*.ts files')
    const importsHighscore = files.some((f) => /from '@shared\/highscore'/.test(f.text))
    const importsNameEntry = files.some((f) => /from '@shared\/name-entry'/.test(f.text))
    expect(importsHighscore, 'some defender src file must import @shared/highscore').toBe(true)
    expect(importsNameEntry, 'some defender src file must import @shared/name-entry').toBe(true)
  })

  it('defender does NOT re-declare the shared table logic (no bespoke qualify/insert/stepper)', () => {
    const files = srcFiles()
    const reDeclares = files.filter((f) =>
      /\b(function|const)\s+(qualifiesForHighScore|insertHighScore|stepNameEntry)\b/.test(f.text),
    )
    expect(
      reDeclares.map((f) => f.path),
      'these files re-implement @shared table logic — df5-6 must CONSUME it, not re-declare it',
    ).toEqual([])
  })

  it('the only high-score persistence is the @shared makeHighScoreStorage seam (no hand-rolled localStorage board)', () => {
    const files = srcFiles()
    // The shell storage seam must be built on the shared factory…
    const usesFactory = files.some((f) => /makeHighScoreStorage\s*[<(]/.test(f.text))
    expect(usesFactory, 'the hall-of-fame persistence must use @shared makeHighScoreStorage').toBe(
      true,
    )
    // …and no file may hand-roll a high-score board straight onto localStorage. Key on an
    // actual localStorage ACCESS (member call or the globalThis/window global), never the bare
    // token — a comment that merely says "no localStorage" is not a violation (lang-review #15).
    const accessesLocalStorage = (t: string): boolean =>
      /\blocalStorage\s*\.\s*\w/.test(t) || /\b(globalThis|window)\s*\.\s*localStorage\b/.test(t)
    const handRolled = files.filter(
      (f) =>
        accessesLocalStorage(f.text) &&
        /high[-\s]?score/i.test(f.text) &&
        !/makeHighScoreStorage/.test(f.text),
    )
    expect(
      handRolled.map((f) => f.path),
      'these files touch localStorage for high scores WITHOUT the shared factory — bespoke ' +
        'persistence is exactly what AC2 forbids',
    ).toEqual([])
  })
})

describe('df5-6 AC2 — the one-origin hall-of-fame persistence seam', () => {
  it("binds the cabinet game id 'defender' (the one-origin localStorage key the lobby reads)", () => {
    expect(DEFENDER_HIGH_SCORE_GAME_ID).toBe('defender')
    expect(highScoreKey(DEFENDER_HIGH_SCORE_GAME_ID)).toBe('defender-high-scores')
  })

  it('round-trips the board through one-origin localStorage via the shared factory', () => {
    vi.stubGlobal('localStorage', fakeStorage())
    const storage = makeDefenderHighScoreStorage()
    const board: DefenderHighScore[] = [
      { name: 'ACE', score: 99_000 },
      { name: 'BEE', score: 50_000 },
    ]
    storage.save(board)
    expect(storage.load()).toEqual(board)
  })
})
