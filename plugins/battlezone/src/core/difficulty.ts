// src/core/difficulty.ts
//
// Story bz1-10 — the difficulty ratchet. ONE pure function maps the ROM's
// score differential (player minus enemy) to a normalised aggression
// parameter in [0, 1] that the enemy side scales its knobs by, hard-capped
// at the authentic ceiling — the epic's standing rule: ratchet UP TO the
// ROM curve, never past it.
//
// ROM authority (docs/battlezone-1980-source-findings.md §5, code label
// $69fd, hub-page narrative):
//   * "The enemy has a score value that increases by 1000 points when the
//     player is killed." → ENEMY_SCORE_PER_PLAYER_DEATH.
//   * Aggression follows the player-minus-enemy differential, reaching FULL
//     when the player is ahead by 7000 → FULL_AGGRESSION_DIFFERENTIAL, and
//     the output clamps flat there (values at and past the cap are equal).
//   * "Even when initially mild, the enemy will become more aggressive ~17
//     seconds after it has spawned." → AGGRESSION_RAMP_SECONDS, the per-spawn
//     ramp fed by the hostile's phaseAge.
// The interior interpolation (linear here) and the multiplicative ramp shape
// are OUR reading — the ROM narrative pins endpoints and direction only.
//
// Bonus-tank thresholds (findings §9, DSW0 `BB` bit pair): the ROM offers
// none / 15K+100K / 25K+100K / 50K+100K. The ROM itself cannot name a factory
// default (a physical DIP bank read at runtime), so — exactly like bz1-2's
// MISSILE_INTRO_THRESHOLD pin — the default comes from arcade-museum.com's
// Battlezone DIP sheet, which $-marks "Bonus ta[n]ks at 15,000 and 100,000
// points" as the factory setting.
//
// PURE. No DOM, no time, no randomness.

/** Player-minus-enemy differential at which aggression reaches full (findings §5). */
export const FULL_AGGRESSION_DIFFERENTIAL = 7000

/** The enemy's own score rises by this much each time the player dies (findings §5). */
export const ENEMY_SCORE_PER_PLAYER_DEATH = 1000

/** Seconds after a spawn at which the per-spawn aggression ramp completes (findings §5, "~17 seconds"). */
export const AGGRESSION_RAMP_SECONDS = 17

/**
 * The two extra-tank score thresholds, ascending — DSW0 factory default
 * (15K/100K, arcade-museum.com DIP sheet; findings §9 for the option band).
 */
export const BONUS_TANK_SCORES: readonly [number, number] = [15_000, 100_000]

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

/**
 * The ratchet: normalised aggression in [0, 1] for a given score
 * differential (player minus enemy) and spawn age in seconds.
 *
 *  - Monotonically non-decreasing in BOTH arguments.
 *  - Exactly 1 at/above the 7000 ceiling — a full-differential hostile
 *    "spawns in any direction and moves with full aggression" (findings §5),
 *    so the ramp cannot dilute it.
 *  - Below the ceiling the linear base curve (0 at −7000, 1 at +7000) is
 *    scaled by the spawn ramp: fresh spawns start mild and reach the full
 *    differential-determined value at AGGRESSION_RAMP_SECONDS.
 *  - Omitting spawnAge means fully ramped.
 */
export function aggression(
  differential: number,
  spawnAge: number = AGGRESSION_RAMP_SECONDS,
): number {
  if (differential >= FULL_AGGRESSION_DIFFERENTIAL) return 1
  const base = clamp01(
    (differential + FULL_AGGRESSION_DIFFERENTIAL) / (2 * FULL_AGGRESSION_DIFFERENTIAL),
  )
  const ramp = clamp01(spawnAge / AGGRESSION_RAMP_SECONDS)
  return base * ramp
}

/**
 * How many bonus-tank thresholds a score step CROSSED: before < T ≤ after.
 * The award is a crossing, never a standing balance — sitting at/above an
 * already-crossed threshold re-awards nothing (the tempest
 * EXTRA_LIFE_INTERVAL pattern, adapted to the ROM's two fixed thresholds).
 */
export function extraTanksEarned(before: number, after: number): number {
  let earned = 0
  for (const threshold of BONUS_TANK_SCORES) {
    if (before < threshold && after >= threshold) earned += 1
  }
  return earned
}
