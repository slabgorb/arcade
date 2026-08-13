// tests/select.test.ts
//
// Story ml5-2 — RED phase (TEA). SELECT STARTING SCORE — the Millipede novelty
// centipede has no counterpart for: the player may start at a higher score
// (and difficulty) for more points. This file pins the PURE, ml7-independent
// kernel; the attract state machine around it (TIMER cadence MLSUB.MAC:1439-1446
// and :1449-1453, the FIRE debounce :1469-1479, MESS/HILITE/CHAN7 display and
// sound) is the ml7 seam and is NOT modelled here.
//
//   BONUSS  (MLTST.MAC:8-26)  — max starting bonus: merges OPTNS1 D4-D5 with
//           OPTNS2 D2-D3 into a byte index X = 8 + 8*bonusOpt + 2*startOpt
//           into the BONUSV table; OPTNS1 D7 set (select disabled) exits with
//           X=8 — the zero entry.
//   BONUSV  (MLTST.MAC:28-33) — after the 4 increment words, FOUR rows of max
//           starting values (BCD words ×100), one row per bonus option.
//   SELEC4  (MLSUB.MAC:1740-1745) — LSCORE ← the BONUSS maximum.
//   MODE    (MLSUB.MAC:385-391) — game start enters select mode (MODE=1) only
//           when D7 is clear AND the max's mid byte is non-zero.
//   The window arithmetic (MLSUB.MAC:1535-1543, :1559-1567) steps entries by
//   ± one increment in SED arithmetic, stopping at zero (:1527-1528) and at
//   LSCORE (:1549-1551) — so the selectable ladder is the increment's
//   multiples from 0 to the maximum, inclusive.
//   Applying a selection (MLSUB.MAC:1592-1604) writes SCORE1/SCORE2 from the
//   chosen word and seeds BONUSL/BONUSM = selection + one increment (SED).
//   Game start from a selection seeds 5*SCORE2 + 1 extra mushrooms between
//   rows 8 and 17 (MLSUB.MAC:1483-1491, "1 TO 0F0").
//
// Every constant carries an SL-* claim in
// docs/rom-study/claims/15-bonus-select.json (GREEN generates it — see
// tests/audit/bonus-select-claims.test.ts).
//
// ─── WHAT GREEN (Dev) MUST SHIP ─────────────────────────────────────────────
//   src/core/select.ts — pure, cited, BCD-byte semantics. Exports:
//
//     SELECT_DISABLE = 0x80                       // OPTNS1 D7 (MLDEF.MAC:92; MLTST.MAC:16)
//     MAX_START_ROWS: number[][] =                // MLTST.MAC:30-33, BCD words
//       [[0, 0x0120, 0x0240, 0x0360],
//        [0, 0x0150, 0x0300, 0x0450],
//        [0, 0x0200, 0x0400, 0x0600],
//        [0, 0x0200, 0x0400, 0x0600]]
//     bonusIndexByte(optns1, optns2): number      // BONUSS X (MLTST.MAC:14-24)
//     maxStartingScore(optns1, optns2): number    // SELEC4's LSCORE, a BCD word
//     selectModeAtStart(optns1, optns2): 0 | 1    // MLSUB.MAC:385-391
//     startingScoreLadder(optns1, optns2): number[]  // BCD words, 0..max by increment
//     applyStartingScore(word, optns1):
//       { score1; score2; bonusL; bonusM }        // MLSUB.MAC:1592-1604
//     startMushroomCount(score2): number          // 5*SCORE2 + 1 (MLSUB.MAC:1483-1488)
//     MUSHROOM_ROW_BOTTOM = 0x08                  // MLSUB.MAC:1489
//     MUSHROOM_ROW_TOP = 0x17                     // MLSUB.MAC:1490
//
// ─── RADIX ──────────────────────────────────────────────────────────────────
// MLDEF.MAC:2 sets `.RADIX 16`, inherited via .INCLUD — literals are hex; a
// trailing period in the source marks DECIMAL. The BONUSV words read as BCD:
// `.WORD 120` is bytes 20,01 — the display prints 1·20·00 → 12,000.

import { describe, it, expect } from 'vitest'

interface SelectModule {
  SELECT_DISABLE: number
  MAX_START_ROWS: readonly (readonly number[])[]
  bonusIndexByte: (optns1: number, optns2: number) => number
  maxStartingScore: (optns1: number, optns2: number) => number
  selectModeAtStart: (optns1: number, optns2: number) => 0 | 1
  startingScoreLadder: (optns1: number, optns2: number) => number[]
  applyStartingScore: (
    word: number,
    optns1: number,
  ) => { score1: number; score2: number; bonusL: number; bonusM: number }
  startMushroomCount: (score2: number) => number
  MUSHROOM_ROW_BOTTOM: number
  MUSHROOM_ROW_TOP: number
}

const SELECT_SPECIFIER = ['..', 'src', 'core', 'select'].join('/')

/** Self-describing loader: RED proves the module absent. */
async function loadSelect(): Promise<SelectModule> {
  try {
    const mod = (await import(/* @vite-ignore */ SELECT_SPECIFIER)) as Partial<SelectModule>
    if (typeof mod.maxStartingScore !== 'function')
      throw new Error('module has no maxStartingScore export')
    return mod as SelectModule
  } catch (e) {
    throw new Error(
      'select reducer not built yet — GREEN (Dev) ships src/core/select.ts per the ' +
        'contract at the top of tests/select.test.ts (pure, cited, BCD-byte semantics). ' +
        `(${e instanceof Error ? e.message : String(e)})`,
    )
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BONUSS — the merged DIP index (MLTST.MAC:14-24)
// ─────────────────────────────────────────────────────────────────────────────
describe('select — BONUSS index and maximum', () => {
  it('pins the max-starting rows as BCD words (MLTST.MAC:30-33)', async () => {
    const m = await loadSelect()
    expect(m.MAX_START_ROWS).toEqual([
      [0, 0x0120, 0x0240, 0x0360],
      [0, 0x0150, 0x0300, 0x0450],
      [0, 0x0200, 0x0400, 0x0600],
      [0, 0x0200, 0x0400, 0x0600],
    ])
    expect(m.SELECT_DISABLE, 'OPTNS1 D7 (MLDEF.MAC:92)').toBe(0x80)
  })

  it('X = 8 + 8*bonusOpt + 2*startOpt — the byte index into BONUSV (MLTST.MAC:17-24)', async () => {
    const m = await loadSelect()
    expect(m.bonusIndexByte(0x00, 0x00), 'row 0, entry 0').toBe(8)
    expect(m.bonusIndexByte(0x00, 0x0c), 'row 0, entry 3').toBe(14)
    expect(m.bonusIndexByte(0x10, 0x04), 'row 1, entry 1').toBe(18)
    expect(m.bonusIndexByte(0x20, 0x08), 'row 2, entry 2').toBe(28)
    expect(m.bonusIndexByte(0x30, 0x0c), 'row 3, entry 3').toBe(38)
    expect(m.bonusIndexByte(0x00, 0xf3), 'only OPTNS2 D2-D3 participate').toBe(8)
  })

  it('D7 set exits with X=8 — the zero entry, whatever the other switches say (MLTST.MAC:14-16)', async () => {
    const m = await loadSelect()
    expect(m.bonusIndexByte(0x80 | 0x30, 0x0c)).toBe(8)
    expect(m.maxStartingScore(0x80 | 0x30, 0x0c), 'SELEC4 stores the zero').toBe(0)
  })

  it('maxStartingScore reads the indexed word — the SELEC4 store (MLSUB.MAC:1740-1745)', async () => {
    const m = await loadSelect()
    expect(m.maxStartingScore(0x00, 0x0c), '12k bonus, switch 3 → 36,000').toBe(0x0360)
    expect(m.maxStartingScore(0x10, 0x0c), '15k bonus → 45,000').toBe(0x0450)
    expect(m.maxStartingScore(0x20, 0x0c), '20k bonus → 60,000').toBe(0x0600)
    expect(m.maxStartingScore(0x30, 0x0c), 'the none row mirrors the 20k row').toBe(0x0600)
    expect(m.maxStartingScore(0x00, 0x00), 'switch 0 → no select scores').toBe(0)
    expect(m.maxStartingScore(0x00, 0x04), 'switch 1 → one increment').toBe(0x0120)
  })

  it('select mode at game start needs D7 clear AND a non-zero max mid byte (MLSUB.MAC:385-391)', async () => {
    const m = await loadSelect()
    expect(m.selectModeAtStart(0x00, 0x0c), 'enabled, max 0x0360').toBe(1)
    expect(m.selectModeAtStart(0x80, 0x0c), 'D7 disables').toBe(0)
    expect(m.selectModeAtStart(0x00, 0x00), 'a zero max has nothing to select').toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// The ladder (MLSUB.MAC:1535-1567 stepping, :1527-1528 / :1549-1551 stops)
// ─────────────────────────────────────────────────────────────────────────────
describe('select — the starting-score ladder', () => {
  it('is the increment multiples from 0 to the maximum inclusive (SED steps)', async () => {
    const m = await loadSelect()
    expect(m.startingScoreLadder(0x00, 0x0c), '12k steps to 36k').toEqual([
      0, 0x0120, 0x0240, 0x0360,
    ])
    expect(m.startingScoreLadder(0x10, 0x0c), '15k steps to 45k — BCD 150+150=300').toEqual([
      0, 0x0150, 0x0300, 0x0450,
    ])
    expect(m.startingScoreLadder(0x00, 0x04), 'a one-step maximum').toEqual([0, 0x0120])
  })

  it('collapses to the zero rung when select is disabled or the max is zero', async () => {
    const m = await loadSelect()
    expect(m.startingScoreLadder(0x80, 0x0c)).toEqual([0])
    expect(m.startingScoreLadder(0x00, 0x00)).toEqual([0])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Applying a selection (MLSUB.MAC:1592-1604) and the mushroom seed (:1483-1491)
// ─────────────────────────────────────────────────────────────────────────────
describe('select — applying a starting score', () => {
  it('writes SCORE1/SCORE2 from the word and seeds the bonus target one increment above (SED)', async () => {
    const m = await loadSelect()
    expect(m.applyStartingScore(0x0240, 0x00), '24,000 at the 12k DIP').toEqual({
      score1: 0x40,
      score2: 0x02,
      bonusL: 0x60,
      bonusM: 0x03,
    })
    expect(m.applyStartingScore(0x0450, 0x10), '45,000 at the 15k DIP — BCD 450+150=600').toEqual({
      score1: 0x50,
      score2: 0x04,
      bonusL: 0x00,
      bonusM: 0x06,
    })
    expect(m.applyStartingScore(0, 0x00), 'the zero rung is a plain start').toEqual({
      score1: 0x00,
      score2: 0x00,
      bonusL: 0x20,
      bonusM: 0x01,
    })
  })

  it('seeds 5*SCORE2 + 1 extra mushrooms between rows 8 and 17 (MLSUB.MAC:1483-1491)', async () => {
    const m = await loadSelect()
    expect(m.startMushroomCount(0x00), 'zero start still seeds one').toBe(1)
    expect(m.startMushroomCount(0x02), '20,000 start').toBe(11)
    expect(m.startMushroomCount(0x06), '60,000 start').toBe(31)
    expect(m.MUSHROOM_ROW_BOTTOM, ':1489').toBe(0x08)
    expect(m.MUSHROOM_ROW_TOP, ':1490').toBe(0x17)
  })
})
