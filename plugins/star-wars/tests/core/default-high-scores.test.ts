// tests/core/default-high-scores.test.ts
//
// sw7-3 RED — H-015: the ROM ships a SEEDED default high-score board. DOINTS
// (TCHSCR.MAC:701-716) copies 10 default entries — INTINT initials + INTSCR
// scores — into the table on a NOVRAM reset. Our board boots empty ("NO SCORES
// YET"); a fresh cabinet must instead greet the player with the iconic Rebel
// names OBI .. RLM.
//
// The scores are PACKED BCD, not hex: `INTSCR: .WORD 0128,5353` is read as the
// decimal-digit string 0128'5353 = 1,285,353 (TCHSCR is effectively RADIX 16,
// but every nibble is a BCD digit). The initials are hex letter-indices
// A=1..Z=26: `INTINT: .BYTE 0F,02,09` = O(15) B(2) I(9) = OBI. BOTH decodes were
// verified ARITHMETICALLY against the primary source
// (~/Projects/star-wars-1983-source-text/TCHSCR.MAC:718-738), not the finding's
// prose — e.g. `.WORD 0087,2551` -> 00'87'25'51 -> 872,551.
//
// This module (src/core/highScores.ts) does not exist until GREEN; the import
// fails RED. Dev creates:
//   - DEFAULT_HIGH_SCORES : HighScoreTable<'wave'>  (pure data, highest first)
//   - seedDefaultHighScores(loaded) : returns the defaults on an EMPTY board,
//                                     the loaded table UNCHANGED otherwise
//     — the DOINTS-on-reset seam main.ts wires the storage.load() through.
import { describe, it, expect } from 'vitest'
import { DEFAULT_HIGH_SCORES, seedDefaultHighScores } from '../../src/core/highScores'
import { makeHighScoreRowGuard, type HighScoreTable } from '@shared/highscore'

// The authentic seed ladder, highest first — INTINT/INTSCR decoded from
// TCHSCR.MAC:718-738. Pinned to LITERALS so no assertion re-derives from the
// constant under test (a `.toBe(DEFAULT_HIGH_SCORES[0].score)` would pass for any
// wrong value the constant happened to hold).
const ROM_SEED: readonly (readonly [string, number])[] = [
  ['OBI', 1_285_353],
  ['WAN', 1_110_936],
  ['HAN', 1_024_650],
  ['GJR', 872_551],
  ['MLH', 813_553],
  ['JED', 704_899],
  ['NLA', 518_000],
  ['EJD', 492_159],
  ['EAR', 384_766],
  ['RLM', 380_655],
]

describe('sw7-3 H-015 — the ROM default high-score board (DOINTS / INTINT / INTSCR)', () => {
  it('has exactly 10 entries (NHSCRS)', () => {
    expect(DEFAULT_HIGH_SCORES).toHaveLength(10)
  })

  it('carries the authentic Rebel names + BCD-decoded scores, highest first', () => {
    const got = DEFAULT_HIGH_SCORES.map((e) => [e.name, e.score] as [string, number])
    expect(got).toEqual(ROM_SEED.map(([n, s]) => [n, s]))
  })

  it('is ordered strictly descending by score (a valid ladder)', () => {
    for (let i = 1; i < DEFAULT_HIGH_SCORES.length; i++) {
      expect(DEFAULT_HIGH_SCORES[i - 1].score).toBeGreaterThan(DEFAULT_HIGH_SCORES[i].score)
    }
  })

  it('reads the top score as PACKED BCD (1,285,353), NOT the hex misreading', () => {
    // `.WORD 0128,5353` as BCD digits = 1_285_353. The trap is reading the digit
    // string as a hex literal: 0x01285353 = 19_417_939. Refute that reading here
    // so a future "simplification" back to hex fails loudly.
    expect(DEFAULT_HIGH_SCORES[0].score).toBe(1_285_353)
    expect(DEFAULT_HIGH_SCORES[0].score).not.toBe(0x01285353)
  })

  it('every entry is exactly 3 uppercase A-Z initials', () => {
    for (const e of DEFAULT_HIGH_SCORES) {
      expect(e.name, `bad initials: ${JSON.stringify(e.name)}`).toMatch(/^[A-Z]{3}$/)
    }
  })

  it("every entry validates against the shared wave-domain row guard (round-trips through storage)", () => {
    // makeHighScoreRowGuard('wave') is what main.ts feeds makeHighScoreStorage;
    // it accepts a finite number OR an explicit null (highscore.ts: a migrated /
    // no-real-run row). This forces the seed rows to be well-formed
    // HighScoreEntry<'wave'>. Since sw8-20 the ROM ladder's absent per-entry wave
    // is encoded as `null` (no real run) rather than a fabricated number — the
    // exact value IS pinned, in the sw8-20 block below.
    const isRow = makeHighScoreRowGuard('wave')
    for (const e of DEFAULT_HIGH_SCORES) {
      expect(isRow(e), `entry ${e.name} is not a valid HighScoreEntry<'wave'>`).toBe(true)
    }
  })
})

// sw8-20 — The ROM's default table (INTINT/INTSCR, TCHSCR.MAC:718-738) carries
// ONLY initials + score; there is no per-entry wave in the ROM. The pre-sw8-20
// clone marked "no real run" with the fabricated `wave: 0`, which the file's own
// comment flagged as "a clone artifact, not a ROM value". Task 20 widened the
// domain field to `number | null` so a row with no real run can say so instead of
// inventing one; sw8-20 acts on that: the ten defaults must carry `wave: null`.
describe('sw8-20 — the ROM defaults carry NO per-run wave: honest null, not the fabricated 0', () => {
  it('encodes every default row as wave === null (no real run) — not 0, not any number', () => {
    // `toBeNull()` is exact: it passes ONLY for the JS value null. It reddens on
    // the pre-sw8-20 `wave: 0` (0 is not null) and on any numeric placeholder, so
    // this is the non-vacuity proof — the current (mutant) source fails it.
    for (const e of DEFAULT_HIGH_SCORES) {
      expect(
        e.wave,
        `${e.name}: default rows have no real run, so wave must be null; got ${JSON.stringify(e.wave)}`,
      ).toBeNull()
    }
  })

  it('carries the fabricated wave 0 on no default row (mutation: restoring wave: 0 must redden)', () => {
    // Explicit refutation of the exact mutation the story names — a Dev who
    // "restores" wave: 0 reddens here even if toBeNull above were ever loosened.
    for (const e of DEFAULT_HIGH_SCORES) {
      expect(e.wave, `${e.name} still carries the fabricated wave 0`).not.toBe(0)
    }
  })
})

describe('sw7-3 H-015 — seedDefaultHighScores: DOINTS runs ONLY on an empty / reset board', () => {
  it('seeds the 10 defaults when the stored table is empty (a fresh cabinet)', () => {
    expect(seedDefaultHighScores([])).toEqual(DEFAULT_HIGH_SCORES)
  })

  it('NEVER clobbers a non-empty board (a single real score must not wipe the ladder)', () => {
    // The Design-B trap: falling back to the defaults whenever the board "looks
    // empty enough". The ROM copies defaults on RESET only; once any score is
    // posted the table is the player's. Prove a populated board passes through.
    const real: HighScoreTable<'wave'> = [{ name: 'ZZZ', score: 42, wave: 1 }]
    expect(seedDefaultHighScores(real)).toEqual(real)
  })
})
