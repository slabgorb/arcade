// plugins/missile-command/src/core/score.ts
//
// Story mc3-3 — scoring. Pure and deterministic: core owns HOW the score grows,
// the shell only renders the number. Missile Command awards points per downed
// ICBM. The ROM adds `25 × wave-multiplier` to the running total per kill — the
// BCD add at W3MAIN.MAC:4091 (`ADC I,25`), inside the `;ICBM PTS X WAVE NUMBER`
// block whose `SED` (4085) sets decimal mode. mc3 pins the WAVE-1 value 25;
// mc4-3 generalises it by the per-wave multiplier (below).
// Claim: docs/rom-study/claims/score.json (MC-ICBPTS).

/** Points for downing one ICBM at wave 1. `W3MAIN.MAC:4091` (`ADC I,25`, under
 *  `;INCREASE POINTS FOR DOWNING ICBMS`); claim MC-ICBPTS. Scaled per wave by
 *  `scoreMultiplier` below. */
export const ICBM_KILL_POINTS = 25

// ─── mc4-3 — the PER-WAVE SCORE MULTIPLIER (SMULTI) ──────────────────────────
// A downed ICBM is worth `ICBM_KILL_POINTS × SMULTI(wave)`. The ROM derives
// SMULTI at wave setup, then the kill loop adds 25 to the per-ICBM bucket SMULTI
// times (`;ICBM PTS X WAVE NUMBER`, W3MAIN.MAC:4083):
//
//     LDA WAVENO / CLC / ADC I,1 / LSR    ->  (wave + 1) >> 1   (W3MAIN.MAC:4063-4069)
//     CMP I,MAXMUL / IFCS / LDA I,MAXMUL  ->  clamp to MAXMUL   (W3MAIN.MAC:4071-4075)
//
// WAVENO is 1-based ("LDA I,1 ;START WITH WAVE 1", W3MAIN.MAC:3863), so the
// integer LSR makes the multiplier STEP EVERY TWO WAVES, capped at MAXMUL(6):
//   waves 1-2 ->x1(25)  3-4 ->x2(50)  5-6 ->x3(75)  7-8 ->x4(100)
//   waves 9-10 ->x5(125)  11+ ->x6(150, capped)
// This is deliberately NOT "25 x wave" — that story-AC paraphrase was refuted
// against the ROM at RED and ruled ROM-faithful (see the mc4-3 session).

/** The maximum score multiplier — `MAXMUL` at `W3COMN.MAC:201`; claim MC-MAXMUL. */
const MAX_SCORE_MULTIPLIER = 6

/**
 * This wave's score multiplier for a 1-based `wave` (the ROM's SMULTI). Pure —
 * same wave in, same multiplier out. A real wave is never below 1, so the input
 * is clamped up to the wave-1 floor: a degenerate wave must not zero the
 * multiplier and blank out scoring. See the derivation note above; claim MC-MAXMUL.
 */
export function scoreMultiplier(wave: number): number {
  const clamped = Math.max(1, wave)
  return Math.min((clamped + 1) >> 1, MAX_SCORE_MULTIPLIER)
}

/** Add the points for `killed` downed ICBMs onto the running `score`, each kill
 *  worth `ICBM_KILL_POINTS × scoreMultiplier(wave)`. `wave` is 1-based and defaults
 *  to the opening wave, so a two-arg call scores at the base rate; the live wave
 *  is threaded in by the step wiring (mc4-4). */
export function scoreKills(score: number, killed: number, wave: number = 1): number {
  return score + killed * ICBM_KILL_POINTS * scoreMultiplier(wave)
}
