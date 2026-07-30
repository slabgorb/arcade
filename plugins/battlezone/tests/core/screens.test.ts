// tests/core/screens.test.ts
//
// Story bz1-10 — RED phase (Furiosa / TEA). The attract/title and game-over
// screen CONTENT, as pure core data the shell strokes verbatim — and the
// epic's coin-op descope enforced BY TEST, not eyeball (story AC: "attract/
// title/game-over screen text contains no coin-op strings ... asserted by
// test"). This arcade has no money model: nothing quarter-shaped, ever.
//
// Pinned surface (absent pre-GREEN — module-load failure is the RED signal):
//   core/screens.ts : attractLines(table) / gameOverLines(score) — the text
//   lines each screen shows. Layout/glow belong to the shell; WORDS are core
//   data so they stay testable (the house core/shell split).
//
// The audit also sweeps SOURCE string literals across EVERY shell module,
// the bootstrap, and the screen-data module — a directory sweep, not a
// hand-named file list (review round 1: the same lesson core-purity-sweep
// encodes — a hand-named list lets a future shell module ship unscanned).
// Literals are JOINED per file and Unicode-normalized before matching, so
// split-string ('INSE' + 'RT COIN') and zero-width-character obfuscations
// cannot slip the banned words past the regex (empirically demonstrated
// bypasses, review round 1). Comments are exempt (only quoted literals are
// scanned) — the descope may be DISCUSSED in prose, never displayed.
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'
import { attractLines, gameOverLines } from '../../src/core/screens'
import type { HighScoreTable } from '../../src/core/state'

const SRC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src')

/** Every file whose string literals may reach a screen: all of shell/, the
 *  bootstrap, and the screen-data module itself. Swept, present and future. */
function auditFiles(): string[] {
  const shellDir = join(SRC_DIR, 'shell')
  return [
    join(SRC_DIR, 'main.ts'),
    join(SRC_DIR, 'core', 'screens.ts'),
    ...readdirSync(shellDir)
      .filter((f) => f.endsWith('.ts'))
      .map((f) => join(shellDir, f)),
  ]
}

// The epic descope, as a regex: no inserted-coin text, no credit counts,
// nothing quarter-shaped. 'insert' alone is included deliberately — the only
// legitimate screen use of the word on a 1980 cabinet is the one we banned.
const COIN_OP = /coin|credit|insert|quarter|free\s*play|¢/i

const SAMPLE_TABLE: HighScoreTable = [
  { name: 'KAV', score: 12_345 },
  { name: 'BOB', score: 3000 },
]

const joined = (lines: readonly string[]): string => lines.join('\n')

/** Every quoted string literal in a TS source: '…', "…", `…`. */
function stringLiteralsOf(src: string): string[] {
  const re = /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g
  return src.match(re) ?? []
}

/**
 * The audit view of a file's literals: quotes stripped, everything JOINED
 * into one run, NFKC-normalized, zero-width characters removed. Splitting a
 * banned word across literals or hiding a zero-width space inside it leaves
 * the banned word intact in THIS string.
 */
function auditTextOf(src: string): string {
  return stringLiteralsOf(src)
    .map((lit) => lit.slice(1, -1))
    .join('')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
}

describe('the attract/title screen — title, board, and a plain start prompt', () => {
  it('names the game', () => {
    expect(joined(attractLines([]))).toMatch(/BATTLEZONE/i)
  })

  it('prompts with press-start — the run begins with start, nothing quarter-shaped', () => {
    expect(joined(attractLines([]))).toMatch(/PRESS\s+START/i)
  })

  it('shows the high-score board when there is one: names and scores appear', () => {
    const text = joined(attractLines(SAMPLE_TABLE))
    expect(text).toContain('KAV')
    expect(text).toMatch(/12,?345/)
  })

  it('an empty board still shows title + prompt, and no orphaned board heading', () => {
    const text = joined(attractLines([]))
    expect(text).toMatch(/BATTLEZONE/i)
    expect(text).toMatch(/PRESS\s+START/i)
    // Review round 1: assert what the weaker version couldn't — a heading
    // with no scores under it must not render on a fresh cabinet.
    expect(text).not.toMatch(/HIGH\s+SCORES/i)
  })
})

describe('the game-over screen', () => {
  it('says the run is over', () => {
    expect(joined(gameOverLines(3000))).toMatch(/GAME\s+OVER/i)
  })
})

describe('the coin-op descope, asserted — no cabinet begging anywhere (AC)', () => {
  it('the attract screen carries no coin-op strings, empty or populated', () => {
    expect(joined(attractLines([]))).not.toMatch(COIN_OP)
    expect(joined(attractLines(SAMPLE_TABLE))).not.toMatch(COIN_OP)
  })

  it('the game-over screen carries no coin-op strings at any score', () => {
    for (const score of [0, 3000, 123_000]) {
      expect(joined(gameOverLines(score))).not.toMatch(COIN_OP)
    }
  })

  // Swept, joined, normalized (review round 1): every shell module plus the
  // bootstrap and the screen-data module, with split-literal and zero-width
  // obfuscation collapsed before matching. A future shell/hud.ts is swept
  // the day it is born.
  for (const file of auditFiles()) {
    const name = relative(SRC_DIR, file)
    it(`no coin-op text hides in the string literals of src/${name}`, () => {
      const text = auditTextOf(readFileSync(file, 'utf8'))
      expect(text, `coin-op text reachable from src/${name}`).not.toMatch(COIN_OP)
    })
  }
})
