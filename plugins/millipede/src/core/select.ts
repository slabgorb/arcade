// src/core/select.ts
//
// Story ml5-2 (GREEN) — SELECT STARTING SCORE, the Millipede novelty: the
// player may start at a higher score (and difficulty) for more points. This
// module is the PURE, ml7-independent kernel — BONUSS's merged DIP index
// (MLTST.MAC:8-26), the max-starting rows (MLTST.MAC:28-33), SELEC4's LSCORE
// store (MLSUB.MAC:1740-1745), the game-start MODE decision
// (MLSUB.MAC:385-391), the selectable ladder the SSCORE window walks
// (MLSUB.MAC:1535-1567 SED steps, :1527-1528 and :1549-1551 stops), applying
// a selection (MLSUB.MAC:1592-1604), and the extra-mushroom seed
// (MLSUB.MAC:1483-1491). The attract machine around it — TIMER cadence
// (:1439-1453), FIRE debounce (:1469-1479), MESS/HILITE/CHAN7 — is the ml7
// seam and is NOT modelled. Every constant carries an SL-* claim in
// docs/rom-study/claims/15-bonus-select.json, byte-verified by the ml1-1 gate.
//
// ─── RADIX ──────────────────────────────────────────────────────────────────
// MLDEF.MAC:2 sets `.RADIX 16`, inherited via .INCLUD — literals are hex; a
// trailing period marks DECIMAL. The BONUSV words read as BCD ×100:
// `.WORD 120` is bytes 20,01 and displays 1·20·00 → 12,000.
//
// ─── THE DIP TRAP ───────────────────────────────────────────────────────────
// OPTNS1 D2-D3 is the starting LIVES (bonus.ts); OPTNS2 D2-D3 is the max
// select score (MLDEF.MAC:110) — the SAME bits in DIFFERENT banks. BONUSS
// merges OPTNS1's D4-D5 with OPTNS2's D2-D3 (the EOR dance, MLTST.MAC:17-21).

import { bonusIncrement } from './bonus'

/** OPTNS1 D7 — select-score mode disable (MLDEF.MAC:92; MLTST.MAC:16 BMI). */
export const SELECT_DISABLE = 0x80

// ─── the max-starting rows (MLTST.MAC:30-33, BCD words ×100) ────────────────
// One row per bonus option; entries by OPTNS2 D2-D3. The none-bonus row
// mirrors the 20k row. Preceded in BONUSV by the 4 increment words, which is
// why BONUSS's index starts at 8 ("SKIP OVER OTHER ENTRIES", MLTST.MAC:23).
export const MAX_START_ROWS: readonly (readonly number[])[] = [
  [0, 0x0120, 0x0240, 0x0360],
  [0, 0x0150, 0x0300, 0x0450],
  [0, 0x0200, 0x0400, 0x0600],
  [0, 0x0200, 0x0400, 0x0600],
]

// ─── the extra-mushroom seed band (MLSUB.MAC:1489-1490) ─────────────────────
export const MUSHROOM_ROW_BOTTOM = 0x08
export const MUSHROOM_ROW_TOP = 0x17

/**
 * BONUSS (MLTST.MAC:14-24): the byte index into BONUSV. D7 set exits with
 * X=8 — the zero entry (:14-16). Otherwise the EOR dance merges OPTNS1's
 * D4-D5 over OPTNS2, keeps bits 2-5, halves them and adds 8:
 * X = 8 + 8*bonusOpt + 2*startOpt.
 */
export function bonusIndexByte(optns1: number, optns2: number): number {
  if ((optns1 & SELECT_DISABLE) !== 0) return 8 // :14-16 — LDX I,8 / BMI 90$
  const merged = (optns1 & 0x30) | (optns2 & ~0x30 & 0xff) // :17-20 — the EOR dance
  return (((merged & 0x3c) >> 1) + 8) & 0xff // :21-23 — AND 3C / LSR / ADC I,08
}

/**
 * The maximum starting score as a BCD word — what SELEC4 stores into LSCORE
 * (MLSUB.MAC:1740-1745): low from BONUSV[X], mid from BONUSV[X+1].
 */
export function maxStartingScore(optns1: number, optns2: number): number {
  const x = bonusIndexByte(optns1, optns2)
  const row = MAX_START_ROWS[(x - 8) >> 3]
  return row[((x - 8) & 0x07) >> 1]
}

/**
 * The game-start MODE decision (MLSUB.MAC:385-391): select mode (1) only when
 * D7 is clear AND LSCORE's mid byte is non-zero; else straight to play (0).
 */
export function selectModeAtStart(optns1: number, optns2: number): 0 | 1 {
  if ((optns1 & SELECT_DISABLE) !== 0) return 0 // :386-387 — BIT/BMI
  return maxStartingScore(optns1, optns2) >> 8 !== 0 ? 1 : 0 // :388-390 — LDA LSCORE+1 / BEQ
}

/** One BCD byte add with carry in/out (the SED ADC). */
function bcdAdd(a: number, b: number, carry: number): { sum: number; carry: number } {
  let lo = (a & 0x0f) + (b & 0x0f) + carry
  let hi = (a >> 4) + (b >> 4)
  if (lo > 9) {
    lo -= 10
    hi += 1
  }
  if (hi > 9) return { sum: ((hi - 10) << 4) | lo, carry: 1 }
  return { sum: (hi << 4) | lo, carry: 0 }
}

/** BCD word + the increment (the :1535-1543/:1559-1567 SED step, one rung). */
function stepWord(word: number, inc: { low: number; mid: number }): number {
  const lo = bcdAdd(word & 0xff, inc.low, 0)
  const mi = bcdAdd(word >> 8, inc.mid, lo.carry)
  return (mi.sum << 8) | lo.sum
}

/**
 * The selectable starting scores: the increment's multiples from 0 to the
 * maximum inclusive — what the SSCORE window walks with its ± SED steps
 * (MLSUB.MAC:1535-1543 down, :1559-1567 up), stopping at zero (:1527-1528)
 * and at LSCORE (:1549-1551). Disabled or zero-max collapses to the lone
 * zero rung.
 */
export function startingScoreLadder(optns1: number, optns2: number): number[] {
  const max = maxStartingScore(optns1, optns2)
  const inc = bonusIncrement(optns1)
  const ladder = [0]
  let word = 0
  while (word < max) {
    word = stepWord(word, inc)
    ladder.push(word)
  }
  return ladder
}

/**
 * Applying a selection (MLSUB.MAC:1592-1604): SCORE1/SCORE2 take the chosen
 * word's halves; BONUSL/BONUSM seed one increment above it (SED).
 */
export function applyStartingScore(
  word: number,
  optns1: number,
): { score1: number; score2: number; bonusL: number; bonusM: number } {
  const target = stepWord(word, bonusIncrement(optns1)) // :1596-1603
  return {
    score1: word & 0xff, // :1594-1595 — STA X,SCORE1
    score2: word >> 8, // :1592-1593 — STA X,SCORE2
    bonusL: target & 0xff, // :1600
    bonusM: target >> 8, // :1603
  }
}

/**
 * The extra-mushroom seed for a selected start (MLSUB.MAC:1483-1488):
 * SCORE2*4 + SCORE2 + the SEC's carry — "1 TO 0F0" — between rows 8 and 17
 * (:1489-1490).
 */
export function startMushroomCount(score2: number): number {
  return score2 * 5 + 1
}
