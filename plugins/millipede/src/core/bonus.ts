// src/core/bonus.ts
//
// Story ml5-2 (GREEN) — BONUS LIFE + LIVES: the SCORNG bonus-life tail
// (MLSUB.MAC:1076-1101) that ml5-1's `awardScore` deferred, plus the BONUS1
// increment selection (MLSUB.MAC:31-39), the BONUSV increment words
// (MLTST.MAC:28), the DIP-selected starting lives (MLSUB.MAC:274-279) and the
// game-start LIVES writes (MLSUB.MAC:350-351, :382-384). DLIVES
// (MLSUB.MAC:505-508) is the display anchor for the 6 cap; the render is
// shell. Every constant carries a BL-* claim in
// docs/rom-study/claims/15-bonus-select.json, byte-verified by the ml1-1 gate.
//
// ─── RADIX ──────────────────────────────────────────────────────────────────
// MLDEF.MAC:2 sets `.RADIX 16`, inherited by MLSUB/MLTST via .INCLUD —
// ROM literals quoted here are hex; a trailing period marks DECIMAL.
//
// ─── THE COMPARATOR IS A BAND, NOT A FLOOR ──────────────────────────────────
// :1076-1080  LDA SCORE1 / CMP BONUSL / LDA SCORE2 / SBC BONUSM / BNE 25$
// Centipede's tail (cp4-4) used BCC — a floor. Millipede's BNE demands the
// borrow-chained subtraction land on ZERO, which holds across the window
// [T, T+9,999] in hundreds-of-points arithmetic: either SCORE2 == BONUSM with
// SCORE1 ≥ BONUSL (same 10k page), or SCORE2 == BONUSM+1 with SCORE1 < BONUSL
// (the crossing landed in the page above). SCORE0 (ones/tens) never takes
// part — 11,99x has NOT reached 12,000.
//
// ─── BYTE SEMANTICS ─────────────────────────────────────────────────────────
// score1/score2/bonusL/bonusM are BCD bytes 0..0x99 (the score in hundreds);
// lives is a plain byte. Functions are pure and deterministic.

// ─── the lives cap (MLSUB.MAC:1095 CMP I,6; DLIVES :507-508) ────────────────
export const LIVES_MAX = 6

// ─── the increment words (MLTST.MAC:28, BCD ×100) ───────────────────────────
// .WORD 120,150,200,200 — 12,000 / 15,000 / 20,000 / the "none" option's
// word. "THE LAST ENTRY ABOVE IS REALLY 0" holds for the LIFE and the BONUS
// display only: at Y=6 the threshold still advances by 0x0200 (SCORNG calls
// BONUS1 unconditionally, :1081-1089) and EXTRAL is still flagged.
export const BONUS_INCREMENTS: readonly number[] = [0x0120, 0x0150, 0x0200, 0x0200]

/** The no-bonus option index (MLSUB.MAC:15 CPY I,06; :1092-1093). */
export const BONUS_NONE_Y = 6

export interface BonusInput {
  /** SCORE1 — the BCD hundreds/thousands byte. */
  score1: number
  /** SCORE2 — the BCD ten-thousands byte. */
  score2: number
  /** BONUSL — threshold low BCD byte. */
  bonusL: number
  /** BONUSM — threshold mid BCD byte. */
  bonusM: number
  /** LIVES byte for the player being scored. */
  lives: number
  /** OPTNS1 — the option-switch shadow (OPTSW0, MLDEF.MAC:86-92). */
  optns1: number
}

export interface BonusResult {
  bonusL: number
  bonusM: number
  lives: number
  /** EXTRAL (MLDEF.MAC:412) — set on every threshold hit (:1090-1091). */
  extral: boolean
  /** True only when a life was actually added (:1098). */
  awarded: boolean
}

/** BONUS1's index: (OPTNS1 AND 30) >> 3 — 0, 2, 4 or 6 (MLSUB.MAC:32-37). */
export function bonusIndex(optns1: number): number {
  return (optns1 & 0x30) >> 3
}

/** The selected increment's BCD halves — BONUSV[y] / BONUSV[y+1] (MLSUB.MAC:38, :12). */
export function bonusIncrement(optns1: number): { low: number; mid: number } {
  const word = BONUS_INCREMENTS[bonusIndex(optns1) >> 1]
  return { low: word & 0xff, mid: word >> 8 }
}

/** NLIVES: ((OPTNS1 AND 0C) >> 2) + 2 — "2 TO 5 LIVES TO START WITH" (MLSUB.MAC:274-279). */
export function startingLives(optns1: number): number {
  return ((optns1 & 0x0c) >> 2) + 2
}

/**
 * The game-start LIVES writes: the player now playing holds NLIVES-1 — "WE
 * ARE PLAYING WITH ONE" (MLSUB.MAC:382-384); player 2's slot holds NLIVES
 * untouched until swap-in (MLSUB.MAC:350-351).
 */
export function startGameLives(nlives: number): { current: number; other: number } {
  return { current: nlives - 1, other: nlives }
}

/** Game start seeds BONUSL/BONUSM with ONE increment (MLSUB.MAC:393-398). */
export function initialBonusTarget(optns1: number): { bonusL: number; bonusM: number } {
  const inc = bonusIncrement(optns1)
  return { bonusL: inc.low, bonusM: inc.mid }
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

/**
 * The SCORNG bonus-life tail (MLSUB.MAC:1076-1101), run after every in-game
 * score award. The band comparator (:1076-1080) either refuses or, on a hit:
 * the threshold advances by the increment FIRST (SED, :1081-1089), EXTRAL is
 * flagged (:1090-1091), and a life is added only if the bonus option is not
 * "none" (:1092-1093) and LIVES is under 6 (:1095-1096, :1098). One event,
 * one advance, one life — the tail falls through to RTS; there is no
 * catch-up loop.
 *
 * DEVIATION (cited): :1097 `20$: BCS 20$ ;OOPS-RESET` spins until the
 * watchdog resets when LIVES exceeds 6. A pure reducer cannot hang, so
 * lives > LIVES_MAX takes the same no-award path as the cap.
 */
export function awardBonus(input: Readonly<BonusInput>): BonusResult {
  const { score1, score2, bonusL, bonusM, lives, optns1 } = input
  // :1076-1080 — CMP sets the borrow the SBC consumes; BNE refuses non-zero.
  const borrow = score1 >= bonusL ? 0 : 1
  if (((score2 - bonusM - borrow) & 0xff) !== 0) {
    return { bonusL, bonusM, lives, extral: false, awarded: false }
  }
  // :1081-1089 — JSR BONUS1, SED add: the threshold advances before anything.
  const inc = bonusIncrement(optns1)
  const lo = bcdAdd(bonusL, inc.low, 0)
  const mi = bcdAdd(bonusM, inc.mid, lo.carry)
  // :1090-1091 — STA X,EXTRAL, flagged on every hit.
  // :1092-1093 — CPY I,06: the none option never pays a life.
  // :1095-1098 — CMP I,6 cap (with the :1097 OOPS trap covered above).
  const pays = bonusIndex(optns1) !== BONUS_NONE_Y && lives < LIVES_MAX
  return {
    bonusL: lo.sum,
    bonusM: mi.sum,
    lives: pays ? lives + 1 : lives,
    extral: true,
    awarded: pays,
  }
}
