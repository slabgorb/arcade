// src/core/score.ts
//
// Story ml5-1 (GREEN / Yoda). SCORNG scoring (MLSUB.MAC:1049-1055) and the SCORE2
// BCD difficulty dial. Pure, cited (SG-* in docs/rom-study/claims/13-waves-scoring.json).
// Contract: tests/scoring.test.ts.
//
// The score is a 3-byte BCD accumulator SCORE0/SCORE1/SCORE2 in the ROM; here the
// running score is a plain integer number of points, and SCORE2 — the ten-thousands
// digit-pair every wave ramp reads — is DERIVED (score2Of), not stored. So the ROM's
// "increment SCORE2 on a 10K carry" (:1061-1074) is automatic in this model.

/** Pack 0..99 into a BCD byte: 14 -> 0x14 (BCD encoding helper — no single ROM claim). */
export const bcdByte = (pair: number): number => Math.floor(pair / 10) * 0x10 + (pair % 10)

/**
 * SCORE2 — the ten-thousands BCD digit-pair of the running score (MLDEF.MAC),
 * the byte beetlesPerWave / stepWaveCadence / beetleAllowed all compare. It is
 * `floor(score / 10000) % 100` packed to BCD, so it wraps at the 3-byte
 * SCORE0/1/2 ceiling (1,000,000 rolls back to 0x00). Derived dial — no single claim.
 */
export const score2Of = (score: number): number => bcdByte(Math.floor(score / 10000) % 100)

/**
 * SCORE1 — the hundreds/thousands BCD digit-pair of the running score, the low
 * byte of the bonus-life band comparator (bonus.ts awardBonus, MLSUB.MAC:1076).
 * `floor(score / 100) % 100` packed to BCD, the companion to score2Of.
 */
export const score1Of = (score: number): number => bcdByte(Math.floor(score / 100) % 100)

export interface ScoreInput {
  /** Running score, in points. */
  readonly score: number
  /** PTS to award — a critter's kill value (MLDEF.MAC:398). */
  readonly points: number
  /** MODE < 0 — in attract, SCORNG is a no-op (MLSUB.MAC:1050). */
  readonly attract: boolean
}

/**
 * SCORNG-AWARD SCORE (MLSUB.MAC:1049-1055, claims SG-1/SG-3). Adds `points` to the
 * running score, except in attract mode where MODE < 0 takes the early RTS
 * (:1050, claim SG-2) and nothing is awarded. The bonus-life tail (:1075-1103, ending
 * at the 30$ RTS) is now src/core/bonus.ts's awardBonus (ml5-2) — the caller runs it
 * after every in-game award. The COUNT3 new-head speed ramp (:1061-1069) is now
 * rampCount3 below (ml5-5); this is the pure accumulator.
 */
export function awardScore({ score, points, attract }: Readonly<ScoreInput>): number {
  if (attract) return score // :1050 BMI 30$ — no score in attract
  return score + points // :1055 ADC X,SCORE0
}

export interface Count3RampInput {
  /** COUNT3 — the new-head spawn timer (MLDEF.MAC:33), a binary byte 0..255. */
  readonly count3: number
  /** Running score BEFORE this award, in points (the SCORE0/1/2 accumulator). */
  readonly score: number
  /** PTS to award — a critter's kill value (MLDEF.MAC:398). */
  readonly points: number
  /** MODE < 0 — in attract, SCORNG early-outs before this block (MLSUB.MAC:1050). */
  readonly attract: boolean
  /** OPTNS1 option shadow (OPTSW0, MLDEF.MAC:86-92); LSR bit0 -> HARD (:1062-1063). */
  readonly optns1: number
}

/**
 * SCORNG's 10,000-point tail — the COUNT3 new-head speed ramp (MLSUB.MAC:1061-1069)
 * that ml5-1/ml5-2 deferred. On a 10K boundary crossing (the carry out of SCORE1,
 * :1061 BCC 15$) the new-head spawn timer speeds up: LSR of OPTNS1 (:1062-1063)
 * selects the side, then SBC I,2 (:1068) drops COUNT3 by 2 — HARD unconditionally
 * (:1065 BCS 10$, no floor), EASY only while COUNT3 >= 0x31 (:1066-1067 CMP I,31 /
 * BCC 12$; .RADIX 16 so `31` is 0x31 = 49 decimal — the "3/8 seconds" minimum).
 * Attract short-circuits the whole routine (:1050).
 *
 * SCORE2's own +1 (:1070-1074) is automatic here: the running score is a plain
 * integer and SCORE2 is DERIVED (score2Of), so a crossing bumps it by construction.
 *
 * NOTE: distinct from the per-spawn COUNT3 ramp in millipede.ts (COUNT3_FLOOR=0x60 /
 * COUNT3_STEP=0x08, MLSUB.MAC:809/811) — same register, different mechanism.
 */
export function rampCount3({ count3, score, points, attract, optns1 }: Readonly<Count3RampInput>): number {
  if (attract) return count3 // :1050 BMI 30$ — SCORNG never reaches the COUNT3 block
  // :1061 BCC 15$ — the block runs only when the award carries out of SCORE1 (crosses 10K).
  if (Math.floor((score + points) / 10_000) === Math.floor(score / 10_000)) return count3
  const hard = (optns1 & 0x01) !== 0 // :1062-1063 LDA OPTNS1 / LSR -> carry (bit0)
  // :1066-1067 CMP I,31 / BCC 12$ — EASY holds below 0x31; HARD (:1065 BCS 10$) skips the floor.
  if (!hard && count3 < 0x31) return count3
  return (count3 - 0x02) & 0xff // :1068 SBC I,2 — an 8-bit decrement (wraps, no clamp)
}
