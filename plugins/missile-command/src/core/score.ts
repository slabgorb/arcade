// plugins/missile-command/src/core/score.ts
//
// Story mc3-3 — scoring. Pure and deterministic: core owns HOW the score grows,
// the shell only renders the number. Missile Command awards points per downed
// ICBM. The ROM adds `25 × wave` to the running total per kill — the BCD add at
// W3MAIN.MAC:4091 (`ADC I,25`), inside the `;ICBM PTS X WAVE NUMBER` block whose
// `SED` (4085) sets decimal mode. mc3 pins the WAVE-1 value 25; the ×-wave ramp
// is mc4. Claim: docs/rom-study/claims/score.json (MC-ICBPTS).

/** Points for downing one ICBM at wave 1. `W3MAIN.MAC:4091` (`ADC I,25`, under
 *  `;INCREASE POINTS FOR DOWNING ICBMS`); claim MC-ICBPTS. The ×-wave ramp is mc4. */
export const ICBM_KILL_POINTS = 25

/** Add the points for `killed` downed ICBMs onto the running `score`. */
export function scoreKills(score: number, killed: number): number {
  return score + killed * ICBM_KILL_POINTS
}
