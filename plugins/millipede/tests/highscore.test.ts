// tests/highscore.test.ts
//
// Story ml5-3 — RED phase (Han Solo / TEA). The BEHAVIOUR arm of "high-score table
// + initials in core". Pins WHAT the table does: an 8-deep ladder seeded with the
// ROM's default scores/initials, qualify/insert threaded at that depth, and the
// initials buffer driven by @shared/name-entry at the ROM's 3-initial width. The
// CLAIMS arm (WHERE every constant came from, byte-verifiable) is
// tests/audit/high-scores-claims.test.ts.
//
// ─── THE STORY'S OPEN RESEARCH QUESTION, ANSWERED ────────────────────────────────
// "Verify whether the ROM ships a default ladder before seeding one." It DOES.
// MLTST.MAC:97-112 seeds EAROM (the high-score store) with eight scores then eight
// initials, positionally paired — the same INIINI-style default MC ships. So this
// story SEEDS the ROM's real ladder; it is NOT the pac-man/centipede clone-ism trap
// the epic warns about (inventing an attract HUD), it is the faithful opposite.
//
// ─── DECODING THE ROM DEFAULT (MLTST.MAC:97-112, RADIX 16 / claim RX-1) ──────────
//   Scores  99$ .BYTE triples are 3-byte BCD, LSB,MIDDLE,MSB (MLDEF.MAC:275), so
//           [75,91,08] → 08 91 75 → 89175. All eight decode DESCENDING, which is
//           itself corroboration the endianness is right.
//   Initials  next eight triples map A=1..Z=26, 0=blank (self-proving: [02,02,0D]
//           → B,B,M matches the ROM's own ";BBM" comment; all eight match). ED's
//           third byte is 0 (blank) → the entry is 'ED', trailing blank stripped
//           (the name-entry path can never produce a trailing space anyway).
//   Depth   NSCORE =8 (MLDEF.MAC:189) → an 8-rung ladder, not the shared 10.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
// src/core/highscore.ts is an `export {}` seam (the new-core-module RED convention).
// The namespace-cast below makes tsc compile against the INTENDED surface; every
// case throws at runtime ("...is not a function" / undefined) until Dev builds it.

import { describe, it, expect } from 'vitest'
import * as highscoreModule from '../src/core/highscore'

// The surface Dev must ship. Cast through `unknown` so this file type-checks against
// the empty seam — the failures are runtime (behaviour absent), not compile-time.
type Row = { name: string; score: number }
const HS = highscoreModule as unknown as {
  MILLI_HIGH_SCORE_DEPTH: number
  MILLI_INITIALS_LENGTH: number
  DEFAULT_HIGH_SCORES: readonly Row[]
  qualifiesForHighScore: (table: readonly Row[], score: number) => boolean
  insertHighScore: (table: readonly Row[], entry: Row) => Row[]
  stepInitials: (buffer: string, key: string) => string
}

// The ROM default ladder, best-first — the single source of ground truth this suite
// pins. Decoded by hand from MLTST.MAC:97-112 this session (see header).
const ROM_DEFAULT: readonly Row[] = [
  { name: 'BBM', score: 89175 }, // [75,91,08] / [02,02,0D]
  { name: 'FXL', score: 88254 }, // [54,82,08] / [06,18,0C]
  { name: 'MEC', score: 87830 }, // [30,78,08] / [0D,05,03]
  { name: 'ED', score: 86520 }, //  [20,65,08] / [05,04,00]  (third initial byte 0 = blank)
  { name: 'DUG', score: 75478 }, // [78,54,07] / [04,15,07]
  { name: 'DCB', score: 63084 }, // [84,30,06] / [04,03,02]
  { name: 'DEW', score: 52227 }, // [27,22,05] / [04,05,17]
  { name: 'DFW', score: 41916 }, // [16,19,04] / [04,06,17]
]

describe('ml5-3 — millipede high-score table depth + ROM default ladder', () => {
  it('the ladder is NSCORE=8 deep, not the shared 10 (MLDEF.MAC:189)', () => {
    expect(HS.MILLI_HIGH_SCORE_DEPTH).toBe(8)
  })

  it('the initials width is 3 (GETINT collects three, MLSUB.MAC:547)', () => {
    expect(HS.MILLI_INITIALS_LENGTH).toBe(3)
  })

  it('DEFAULT_HIGH_SCORES seeds the eight ROM rows, best-first (MLTST.MAC:97-112)', () => {
    expect(HS.DEFAULT_HIGH_SCORES).toEqual(ROM_DEFAULT)
  })

  it('DEFAULT_HIGH_SCORES has exactly NSCORE=8 rows', () => {
    expect(HS.DEFAULT_HIGH_SCORES).toHaveLength(HS.MILLI_HIGH_SCORE_DEPTH)
  })

  it('the seeded ladder is strictly descending by score (the qualify/insert precondition)', () => {
    const scores = HS.DEFAULT_HIGH_SCORES.map((r) => r.score)
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1], `row ${i - 1} must outrank row ${i}`).toBeGreaterThan(scores[i])
    }
  })

  it('every seeded row is 2-3 uppercase initials and a positive integer score', () => {
    for (const row of HS.DEFAULT_HIGH_SCORES) {
      expect(row.name, `${row.name}: 2-3 A-Z initials`).toMatch(/^[A-Z]{2,3}$/)
      expect(Number.isInteger(row.score) && row.score > 0, `${row.name}: positive integer score`).toBe(true)
    }
  })
})

describe('ml5-3 — qualifiesForHighScore threads the depth-8 ladder', () => {
  it('a non-positive score never qualifies', () => {
    expect(HS.qualifiesForHighScore([], 0)).toBe(false)
    expect(HS.qualifiesForHighScore([], -5)).toBe(false)
    expect(HS.qualifiesForHighScore(ROM_DEFAULT, 0)).toBe(false)
  })

  it('any positive score qualifies while a rung is open (fewer than 8 rows)', () => {
    expect(HS.qualifiesForHighScore([], 1)).toBe(true)
    expect(HS.qualifiesForHighScore(ROM_DEFAULT.slice(0, 7), 1)).toBe(true)
  })

  it('on a FULL 8-rung board a score must STRICTLY beat the lowest (41916)', () => {
    expect(HS.qualifiesForHighScore(ROM_DEFAULT, 41917)).toBe(true) // beats DFW
    expect(HS.qualifiesForHighScore(ROM_DEFAULT, 41916)).toBe(false) // ties — does not displace
    expect(HS.qualifiesForHighScore(ROM_DEFAULT, 41915)).toBe(false)
    expect(HS.qualifiesForHighScore(ROM_DEFAULT, 100000)).toBe(true)
  })

  it('proves it is depth 8, not the shared 10: a 9th open slot is NOT assumed', () => {
    // If the wrapper forgot to thread depth and used the shared default 10, a full
    // 8-row board would still show 2 open slots and admit 41915. It must not.
    expect(HS.qualifiesForHighScore(ROM_DEFAULT, 41915)).toBe(false)
  })
})

describe('ml5-3 — insertHighScore threads the depth-8 ladder', () => {
  it('inserts in descending order and keeps the board at 8', () => {
    const next = HS.insertHighScore(ROM_DEFAULT, { name: 'AAA', score: 100000 })
    expect(next).toHaveLength(8)
    expect(next[0]).toEqual({ name: 'AAA', score: 100000 })
    expect(next.map((r) => r.name)).not.toContain('DFW') // the lowest rung is pushed off
  })

  it('a score that only beats the lowest lands at the bottom and evicts DFW', () => {
    const next = HS.insertHighScore(ROM_DEFAULT, { name: 'NEW', score: 41917 })
    expect(next).toHaveLength(8)
    expect(next[7]).toEqual({ name: 'NEW', score: 41917 })
    expect(next.map((r) => r.name)).not.toContain('DFW')
  })

  it('grows a partial board without truncating below 8', () => {
    const partial = ROM_DEFAULT.slice(0, 3)
    const next = HS.insertHighScore(partial, { name: 'MID', score: 88000 })
    expect(next).toHaveLength(4)
    expect(next.map((r) => r.name)).toEqual(['BBM', 'MID', 'MEC']) // 89175 > 88000 > 87830
  })

  it('does not mutate the input table', () => {
    const before = ROM_DEFAULT.map((r) => ({ ...r }))
    HS.insertHighScore(ROM_DEFAULT, { name: 'ZZZ', score: 999999 })
    expect(ROM_DEFAULT).toEqual(before)
  })
})

describe('ml5-3 — stepInitials drives the buffer via @shared/name-entry at width 3', () => {
  it('appends an UPPERCASED letter while the buffer is short of 3', () => {
    expect(HS.stepInitials('', 'a')).toBe('A')
    expect(HS.stepInitials('A', 'b')).toBe('AB')
    expect(HS.stepInitials('AB', 'C')).toBe('ABC')
  })

  it('caps the buffer at THREE initials (INITL is 3 bytes — the millipede binding)', () => {
    expect(HS.stepInitials('ABC', 'D')).toBe('ABC')
  })

  it('Backspace deletes the last char and never underflows past empty', () => {
    expect(HS.stepInitials('AB', 'Backspace')).toBe('A')
    expect(HS.stepInitials('', 'Backspace')).toBe('')
  })

  it('non-letter keys are inert', () => {
    expect(HS.stepInitials('AB', '1')).toBe('AB')
    expect(HS.stepInitials('AB', 'Enter')).toBe('AB')
    expect(HS.stepInitials('AB', 'ArrowLeft')).toBe('AB')
  })
})
