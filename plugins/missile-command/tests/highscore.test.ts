// plugins/missile-command/tests/highscore.test.ts
//
// Story mc7-1 — RED phase (Leeloo / TEA). The MC high-score TABLE in core (pure),
// a consumer of @shared/highscore. Pins three ROM facts and the depth-5 behaviour:
//
//   MC-HISCORE-DEPTH    — the ladder is 5 deep, NOT the shared default of 10.
//                         HSCORL is `.BLKB 3*5` (W3DSUP.MAC:125 — 3 BCD score
//                         bytes x 5 entries) and DSPHI moves BEST from
//                         `HSCORL+<3*4>` (W3DSUP.MAC:3754 — index 4 = the 5th /
//                         highest entry). So the table is 5 rows, stored ascending
//                         (best last).
//   MC-HISCORE-DEFAULTS — the seeded default ladder. INIINI copies 15 bytes
//                         (`LDX I,14.`) from SCOINI -> HSCORL and STRINI -> INITAL:
//                         SCOINI `.BYTE 50,69,0,05,70,0,30,73,0,95,74,0,0,75,0`
//                         (W3DSUP.MAC:3748 — five little-endian BCD triples) and
//                         STRINI `.ASCIN /MJPRDASRCDLSDFT /` (W3DSUP.MAC:3746 —
//                         five 3-char initials). Under `.RADIX 16` the `.BYTE`
//                         tokens are HEX and, in decimal (SED) mode, read as BCD.
//   MC-HISCORE-QUALIFY   — qualify + insert over MC GameState.score at DEPTH 5.
//
// WHY THIS IS RED AGAINST NAIVE SHARED USAGE: @shared/highscore hard-codes
// MAX_HIGH_SCORES = 10 and qualifiesForHighScore / insertHighScore truncate to it.
// A full MC ladder is only 5 rows, so shared's qualify would see `5 < 10` and admit
// ANY positive score, and shared's insert would grow the table to 6 rather than
// dropping the lowest. mc7-1 must thread DEPTH 5 through — the design ruling is to
// PARAMETERIZE @shared/highscore's depth, not fork it.
//
// ─── the derivation cross-check is source-gated ──────────────────────────────
// reference/source is VENDORED and gitignored, so a clean CI checkout lacks it.
// The decoded values are therefore hard-pinned below (they run everywhere) AND
// re-derived from source under `skipIf(!sourceAvailable)` (runs where the ROM is
// present). The top-level read is guarded so its absence never throws.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import {
  MC_HIGH_SCORE_DEPTH,
  DEFAULT_HIGH_SCORES,
  qualifiesForHighScore,
  insertHighScore,
  type MissileCommandHighScore,
} from '../src/core/highscore.js'

// The shared primitives, imported to pin the "parameterize, don't fork" ruling:
// their depth must be an optional argument that DEFAULTS to 10 for every other
// consumer and accepts 5 for MC.
import {
  qualifiesForHighScore as sharedQualifies,
  insertHighScore as sharedInsert,
  MAX_HIGH_SCORES,
  type HighScoreEntryBase,
} from '@shared/highscore'

// ─── ROM-derived expectation (the ground truth these constants must equal) ────

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const W3DSUP = join(root, 'reference', 'source', 'W3DSUP.MAC')
const sourceAvailable = existsSync(W3DSUP)

// The whole table, best-first (the descending order @shared/highscore maintains).
// Decoded from SCOINI + STRINI; the ROM stores ascending (best last), so this is
// the reverse. Hard-pinned so CI enforces it even when the vendored source is absent.
const EXPECTED_DEFAULTS: ReadonlyArray<{ name: string; score: number }> = [
  { name: 'DFT', score: 7500 }, // HSCORL+<3*4> — BEST (W3DSUP.MAC:3754)
  { name: 'DLS', score: 7495 },
  { name: 'SRC', score: 7330 },
  { name: 'RDA', score: 7005 },
  { name: 'MJP', score: 6950 }, // lowest rung
]

// One BCD byte (0x00..0x99) -> its two decimal digits (0x69 -> 69).
const bcd = (byte: number): number => (byte >> 4) * 10 + (byte & 0x0f)

// Derive the default ladder straight from the vendored source lines, so a
// transcription slip in EXPECTED_DEFAULTS cannot pass unnoticed.
function deriveDefaultsFromSource(): { depth: number; table: Array<{ name: string; score: number }> } {
  const lines = readFileSync(W3DSUP, 'utf8').split('\n').map((l) => l.replace(/\r$/, ''))

  // HSCORL: .BLKB 3*5  -> depth = 5 (bytes / 3 per BCD score)
  const hscorl = lines.find((l) => l.startsWith('HSCORL:')) ?? ''
  const blk = hscorl.match(/\.BLKB\s+(\d+)\*(\d+)/)
  if (!blk) throw new Error(`could not parse HSCORL .BLKB from: ${hscorl}`)
  const bytesPerScore = Number(blk[1]) // 3
  const depth = Number(blk[2]) // 5

  // SCOINI: .BYTE 50,69,0,...  -> hex tokens (RADIX 16), grouped into BCD triples
  const scoini = lines.find((l) => l.startsWith('SCOINI:')) ?? ''
  const bytes = (scoini.split('.BYTE')[1] ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .map((t) => parseInt(t, 16))

  // STRINI: .ASCIN /MJPRDASRCDLSDFT / -> the 15 initials chars
  const strini = lines.find((l) => l.startsWith('STRINI:')) ?? ''
  const initials = (strini.match(/\/([^/]*)\//)?.[1] ?? '').slice(0, depth * bytesPerScore)

  // Ascending entries (index 0 = lowest), each a little-endian BCD score triple.
  const ascending: Array<{ name: string; score: number }> = []
  for (let i = 0; i < depth; i++) {
    const b = bytes.slice(i * bytesPerScore, i * bytesPerScore + bytesPerScore)
    const score = bcd(b[0]) + bcd(b[1]) * 100 + bcd(b[2]) * 10000 // LSB, mid, MSB
    const name = initials.slice(i * bytesPerScore, i * bytesPerScore + bytesPerScore)
    ascending.push({ name, score })
  }
  // Best last in storage (DSPHI reads HSCORL+<3*4>); present descending.
  return { depth, table: ascending.reverse() }
}

// Compare only the ROM-pinned fields, leaving the row's domain field to the module.
const nameScore = (t: ReadonlyArray<MissileCommandHighScore>) => t.map((e) => ({ name: e.name, score: e.score }))

// ─── MC-HISCORE-DEPTH ─────────────────────────────────────────────────────────

describe('MC-HISCORE-DEPTH — the ladder is 5 deep, not the shared 10', () => {
  it('pins the depth to the ROM (HSCORL .BLKB 3*5 / DSPHI HSCORL+<3*4>)', () => {
    expect(MC_HIGH_SCORE_DEPTH).toBe(5)
  })

  it('is NOT silently the shared default of 10', () => {
    expect(MC_HIGH_SCORE_DEPTH).not.toBe(MAX_HIGH_SCORES)
  })

  it('the seeded default ladder has exactly that many rungs', () => {
    expect(DEFAULT_HIGH_SCORES).toHaveLength(MC_HIGH_SCORE_DEPTH)
  })
})

// ─── MC-HISCORE-DEFAULTS ────────────────────────────────────────────────────────

describe('MC-HISCORE-DEFAULTS — the whole seeded ladder (SCOINI + STRINI)', () => {
  it('matches the decoded default table, best-first', () => {
    expect(nameScore(DEFAULT_HIGH_SCORES)).toEqual(EXPECTED_DEFAULTS)
  })

  it('is sorted strictly descending by score (best first, lowest last)', () => {
    const scores = DEFAULT_HIGH_SCORES.map((e) => e.score)
    for (let i = 1; i < scores.length; i++) expect(scores[i - 1]).toBeGreaterThan(scores[i])
  })

  it('BEST is 7500 (DFT) and the lowest rung is 6950 (MJP)', () => {
    expect(nameScore(DEFAULT_HIGH_SCORES)[0]).toEqual({ name: 'DFT', score: 7500 })
    expect(nameScore(DEFAULT_HIGH_SCORES)[4]).toEqual({ name: 'MJP', score: 6950 })
  })

  describe.skipIf(!sourceAvailable)('re-derived from the vendored ROM source', () => {
    it('EXPECTED_DEFAULTS is the radix-correct decode of SCOINI/STRINI', () => {
      const derived = deriveDefaultsFromSource()
      expect(derived.depth).toBe(5)
      expect(derived.table).toEqual(EXPECTED_DEFAULTS)
    })

    it('the module ladder equals the source-derived ladder', () => {
      expect(nameScore(DEFAULT_HIGH_SCORES)).toEqual(deriveDefaultsFromSource().table)
    })
  })
})

// ─── MC-HISCORE-QUALIFY — qualify at depth 5 ────────────────────────────────────

describe('MC-HISCORE-QUALIFY — qualification honours the depth-5 ladder', () => {
  it('a non-positive score never qualifies', () => {
    expect(qualifiesForHighScore([], 0)).toBe(false)
    expect(qualifiesForHighScore([], -1)).toBe(false)
    expect(qualifiesForHighScore(DEFAULT_HIGH_SCORES, 0)).toBe(false)
  })

  it('any positive score qualifies while the board has open rungs (< 5)', () => {
    expect(qualifiesForHighScore([], 1)).toBe(true)
    expect(qualifiesForHighScore(DEFAULT_HIGH_SCORES.slice(0, 4), 1)).toBe(true)
  })

  it('on a FULL 5-rung board a score must STRICTLY beat the lowest (6950)', () => {
    // The depth-5 boundary. Against a naive shared-at-10 qualify these would all
    // wrongly return true (5 < 10 => "open rungs"), so this is the RED driver.
    expect(qualifiesForHighScore(DEFAULT_HIGH_SCORES, 6949)).toBe(false) // below
    expect(qualifiesForHighScore(DEFAULT_HIGH_SCORES, 6950)).toBe(false) // tie — no
    expect(qualifiesForHighScore(DEFAULT_HIGH_SCORES, 6951)).toBe(true) // above
    expect(qualifiesForHighScore(DEFAULT_HIGH_SCORES, 9999)).toBe(true)
  })
})

// ─── MC-HISCORE-QUALIFY — insert at depth 5 ─────────────────────────────────────

describe('MC-HISCORE-QUALIFY — insert maintains a depth-5 descending ladder', () => {
  const row = (name: string, score: number): MissileCommandHighScore =>
    ({ ...DEFAULT_HIGH_SCORES[0], name, score }) as MissileCommandHighScore

  it('inserting a new best keeps the ladder 5 deep and drops the lowest', () => {
    const next = insertHighScore(DEFAULT_HIGH_SCORES, row('ZZZ', 8000))
    expect(next).toHaveLength(5) // NOT 6 — truncated at depth 5
    expect(nameScore(next)[0]).toEqual({ name: 'ZZZ', score: 8000 })
    expect(nameScore(next).at(-1)).toEqual({ name: 'RDA', score: 7005 }) // 6950 dropped
  })

  it('a losing score does not enter a full board', () => {
    const next = insertHighScore(DEFAULT_HIGH_SCORES, row('LOW', 5000))
    expect(next).toHaveLength(5)
    expect(next.some((e) => e.name === 'LOW')).toBe(false)
    expect(nameScore(next)).toEqual(EXPECTED_DEFAULTS)
  })

  it('a tie places the newcomer AFTER the existing equal score', () => {
    const next = insertHighScore(DEFAULT_HIGH_SCORES, row('TIE', 7330))
    expect(next).toHaveLength(5)
    const names = next.map((e) => e.name)
    expect(names.indexOf('SRC')).toBeLessThan(names.indexOf('TIE')) // existing holder keeps rank
  })

  it('does not mutate the input table', () => {
    const before = nameScore(DEFAULT_HIGH_SCORES)
    insertHighScore(DEFAULT_HIGH_SCORES, row('NEW', 9000))
    expect(nameScore(DEFAULT_HIGH_SCORES)).toEqual(before)
  })
})

// ─── the "parameterize @shared/highscore's depth, don't fork" ruling ────────────

describe('@shared/highscore is parameterized for depth (not forked)', () => {
  const fullFive: HighScoreEntryBase[] = EXPECTED_DEFAULTS.map((e) => ({ ...e }))

  it('the shared default depth is unchanged for every other consumer', () => {
    expect(MAX_HIGH_SCORES).toBe(10)
    // A 5-row board still has open rungs at the DEFAULT depth of 10.
    expect(sharedQualifies(fullFive, 1)).toBe(true)
  })

  it('shared qualify accepts an explicit depth and enforces a full-5 board', () => {
    expect(sharedQualifies(fullFive, 6949, 5)).toBe(false)
    expect(sharedQualifies(fullFive, 6951, 5)).toBe(true)
  })

  it('shared insert accepts an explicit depth and truncates to it', () => {
    const next = sharedInsert(fullFive, { name: 'ZZZ', score: 8000 }, 5)
    expect(next).toHaveLength(5)
  })
})
