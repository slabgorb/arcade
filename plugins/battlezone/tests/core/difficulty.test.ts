// tests/core/difficulty.test.ts
//
// Story bz1-10 — RED phase (Furiosa / TEA). The difficulty ratchet: a PURE
// function mapping the ROM's score differential to an aggression parameter,
// hard-capped at the authentic ceiling (the standing arcade rule: ratchet UP
// TO the ROM, never past it), plus the extra-tank threshold-crossing helper.
//
// ROM authority (docs/battlezone-1980-source-findings.md §5, code label $69fd):
//   * "The enemy has a score value that increases by 1000 points when the
//     player is killed."
//   * Aggression is based on the DIFFERENCE between the player's score and
//     the enemy's score; full aggression once the player out-scores the enemy
//     by 7000 points.
//   * "Even when initially mild, the enemy will become more aggressive ~17
//     seconds after it has spawned."
// Bonus-tank thresholds (findings §9, DSW0 BB): the ROM offers 15K/100K,
// 25K/100K, 50K/100K (or none). The findings do NOT pin a factory default
// (unlike the missile threshold's 10K pin), so these tests constrain the
// exported pair to the ROM's DSW0 band and Dev pins ONE option with a cited
// source — the exact MISSILE_INTRO_THRESHOLD precedent from bz1-2.
//
// src/core/difficulty.ts does NOT exist pre-GREEN, so this file fails to LOAD
// until Dev creates it — that import failure IS the RED signal (house pattern:
// star-wars tests/shell/storage.test.ts). The new module is automatically
// covered by core-purity-sweep.test.ts (no time, no ambient randomness).
import { describe, it, expect } from 'vitest'
import {
  aggression,
  extraTanksEarned,
  FULL_AGGRESSION_DIFFERENTIAL,
  ENEMY_SCORE_PER_PLAYER_DEATH,
  AGGRESSION_RAMP_SECONDS,
  BONUS_TANK_SCORES,
} from '../../src/core/difficulty'

// The three DSW0 bonus-tank options that award tanks at all (findings §9:
// "BB=bonus tank score (00=none, 01=15K/100K, 10=25K/100K, 11=50K/100K)").
// "None" is not a faithful default for a home cabinet with no coin pressure.
const DSW0_BONUS_PAIRS: readonly (readonly [number, number])[] = [
  [15_000, 100_000],
  [25_000, 100_000],
  [50_000, 100_000],
]

// Sampled differential sweep: enemy-winning negatives, through the gradual
// band, across the ceiling, and far past it.
const SWEEP_MIN = -14_000
const SWEEP_MAX = 21_000
const SWEEP_STEP = 250
function sweep(): number[] {
  const out: number[] = []
  for (let d = SWEEP_MIN; d <= SWEEP_MAX; d += SWEEP_STEP) out.push(d)
  return out
}

describe('ROM constants — the ratchet quotes the disassembly, not taste', () => {
  it('full aggression lands at a 7000-point differential (findings §5, $69fd)', () => {
    expect(FULL_AGGRESSION_DIFFERENTIAL).toBe(7000)
  })

  it('the enemy side scores 1000 per player death (findings §5)', () => {
    expect(ENEMY_SCORE_PER_PLAYER_DEATH).toBe(1000)
  })

  it('the per-spawn ramp completes at ~17 seconds (findings §5)', () => {
    expect(AGGRESSION_RAMP_SECONDS).toBe(17)
  })

  it('bonus-tank thresholds are one of the ROM DSW0 pairs, ascending (findings §9)', () => {
    expect(DSW0_BONUS_PAIRS).toContainEqual([...BONUS_TANK_SCORES])
    expect(BONUS_TANK_SCORES[0]).toBeLessThan(BONUS_TANK_SCORES[1])
  })
})

describe('aggression(differential) — the ratchet only turns one way', () => {
  // AC: monotonically non-decreasing across the documented range.
  it('never decreases as the differential grows (sampled across the whole curve)', () => {
    const samples = sweep().map((d) => aggression(d))
    for (let i = 1; i < samples.length; i++) {
      expect(
        samples[i],
        `aggression dipped between differential ${SWEEP_MIN + (i - 1) * SWEEP_STEP} and ${SWEEP_MIN + i * SWEEP_STEP}`,
      ).toBeGreaterThanOrEqual(samples[i - 1])
    }
  })

  // AC: clamps flat at the ROM ceiling — at and beyond produce IDENTICAL
  // output, never higher (the epic's "up to ROM, never past it" rule).
  it('clamps flat at the ceiling: 7000, 7001, 70k, and 7M are all the same value', () => {
    const atCap = aggression(FULL_AGGRESSION_DIFFERENTIAL)
    expect(aggression(FULL_AGGRESSION_DIFFERENTIAL + 1)).toBe(atCap)
    expect(aggression(70_000)).toBe(atCap)
    expect(aggression(7_000_000)).toBe(atCap)
  })

  it('no differential anywhere in the sweep exceeds the capped value', () => {
    const atCap = aggression(FULL_AGGRESSION_DIFFERENTIAL)
    for (const d of sweep()) {
      expect(aggression(d)).toBeLessThanOrEqual(atCap)
    }
  })

  // The parameter is normalised so the enemy knobs can scale by it directly:
  // full aggression is exactly 1, and nothing is ever negative (TEA-pinned
  // API decision, logged in the session deviations).
  it('is normalised: outputs stay within [0, 1] and the ceiling value IS 1', () => {
    for (const d of sweep()) {
      const a = aggression(d)
      expect(a).toBeGreaterThanOrEqual(0)
      expect(a).toBeLessThanOrEqual(1)
    }
    expect(aggression(FULL_AGGRESSION_DIFFERENTIAL)).toBe(1)
  })

  // "This changes gradually until the player is out-scoring the enemy by
  // 7000" — a constant function must not pass the monotonicity test.
  it('actually climbs: an even score is milder than the ceiling', () => {
    expect(aggression(0)).toBeLessThan(aggression(FULL_AGGRESSION_DIFFERENTIAL))
  })

  // "If the enemy is winning, tanks ... take bad shots" — an enemy in the
  // lead is never MORE aggressive than an even game.
  it('an enemy-winning differential is at most as aggressive as an even game', () => {
    expect(aggression(-7000)).toBeLessThanOrEqual(aggression(0))
  })

  it('is pure: the same differential twice gives the identical value', () => {
    expect(aggression(3500)).toBe(aggression(3500))
    expect(aggression(-2000)).toBe(aggression(-2000))
  })
})

describe('aggression(differential, spawnAge) — the ~17-second spawn ramp', () => {
  // "Even when initially mild, the enemy will become more aggressive ~17
  // seconds after it has spawned" (findings §5). Shape (step vs gradual) is
  // Dev's call; these pin direction, completion, and the full-diff override.
  it('never decreases as the spawn ages, at any differential', () => {
    for (const d of [-7000, 0, 3500, 7000]) {
      let prev = aggression(d, 0)
      for (const age of [2, 5, 10, 17, 30, 120]) {
        const a = aggression(d, age)
        expect(a, `aggression fell as the spawn aged (diff ${d}, age ${age}s)`).toBeGreaterThanOrEqual(prev)
        prev = a
      }
    }
  })

  it('a mild fresh spawn IS milder: age 0 sits strictly below a fully ramped enemy', () => {
    expect(aggression(0, 0)).toBeLessThan(aggression(0, AGGRESSION_RAMP_SECONDS))
    expect(aggression(3500, 0)).toBeLessThan(aggression(3500, AGGRESSION_RAMP_SECONDS))
  })

  it('the ramp is COMPLETE at 17s: older spawns gain nothing more', () => {
    for (const d of [0, 3500, 7000]) {
      const ramped = aggression(d, AGGRESSION_RAMP_SECONDS)
      expect(aggression(d, 60)).toBe(ramped)
      expect(aggression(d, 3600)).toBe(ramped)
    }
  })

  it('omitting the age means fully ramped (the one-arg curve above)', () => {
    for (const d of [-7000, 0, 3500, 7000, 21_000]) {
      expect(aggression(d)).toBe(aggression(d, AGGRESSION_RAMP_SECONDS))
    }
  })

  // ROM: at full differential the enemy "spawns in any direction and moves
  // with full aggression" — the ramp cannot dilute a 7000-point lead.
  it('a fresh spawn at the ceiling differential is already at full aggression', () => {
    expect(aggression(FULL_AGGRESSION_DIFFERENTIAL, 0)).toBe(1)
  })
})

describe('extraTanksEarned(before, after) — the boundary-crossing award', () => {
  const [T1, T2] = [BONUS_TANK_SCORES[0], BONUS_TANK_SCORES[1]]

  // AC: awarded exactly once ON crossing (before < T ≤ after) — landing
  // exactly on the threshold counts.
  it('awards exactly one tank when a kill lands exactly on the first threshold', () => {
    expect(extraTanksEarned(T1 - 1000, T1)).toBe(1)
  })

  it('awards one tank when a kill carries the score past the first threshold', () => {
    expect(extraTanksEarned(T1 - 500, T1 + 4500)).toBe(1)
  })

  // AC: sitting at or above an already-crossed threshold never re-awards.
  it('never re-awards while the score sits at or above a crossed threshold', () => {
    expect(extraTanksEarned(T1, T1 + 5000)).toBe(0)
    expect(extraTanksEarned(T1 + 1000, T1 + 2000)).toBe(0)
  })

  // AC: the second, higher threshold awards independently.
  it('awards the second threshold independently of the first', () => {
    expect(extraTanksEarned(T2 - 1000, T2)).toBe(1)
    expect(extraTanksEarned(T2 - 3000, T2 + 2000)).toBe(1)
  })

  // Paranoia: a single leap across BOTH thresholds banks both tanks. (No
  // single ROM kill value can actually do this — the helper must still be
  // correct, not coincidentally correct.)
  it('a single step across both thresholds earns both tanks', () => {
    expect(extraTanksEarned(T1 - 1000, T2 + 1000)).toBe(2)
  })

  it('no crossing, no award — including a scoreless step and score zero', () => {
    expect(extraTanksEarned(0, 0)).toBe(0)
    expect(extraTanksEarned(2000, 2000)).toBe(0)
    expect(extraTanksEarned(0, T1 - 1)).toBe(0)
  })
})
