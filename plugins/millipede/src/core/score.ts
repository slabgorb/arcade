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

/** Pack 0..99 into a BCD byte: 14 -> 0x14 (SG-BCD). */
export const bcdByte = (pair: number): number => Math.floor(pair / 10) * 0x10 + (pair % 10)

/**
 * SCORE2 — the ten-thousands BCD digit-pair of the running score (MLDEF.MAC),
 * the byte beetlesPerWave / stepWaveCadence / beetleAllowed all compare. It is
 * `floor(score / 10000) % 100` packed to BCD, so it wraps at the 3-byte
 * SCORE0/1/2 ceiling (1,000,000 rolls back to 0x00). SG-SCORE2 / SG-SCORE2-WRAP.
 */
export const score2Of = (score: number): number => bcdByte(Math.floor(score / 10000) % 100)

export interface ScoreInput {
  /** Running score, in points. */
  readonly score: number
  /** PTS to award — a critter's kill value (MLDEF.MAC:398). */
  readonly points: number
  /** MODE < 0 — in attract, SCORNG is a no-op (MLSUB.MAC:1050). */
  readonly attract: boolean
}

/**
 * SCORNG-AWARD SCORE (MLSUB.MAC:1049-1055). Adds `points` to the running score,
 * except in attract mode where MODE < 0 takes the early RTS (:1050, SG-ATTRACT) and
 * nothing is awarded. The bonus-life tail (:1075-) and the COUNT3 new-head speed
 * ramp (:1062-1069) are deferred to a later ml5 story — this is the pure accumulator.
 */
export function awardScore({ score, points, attract }: Readonly<ScoreInput>): number {
  if (attract) return score // :1050 BMI 30$ — no score in attract
  return score + points // :1055 ADC X,SCORE0
}
