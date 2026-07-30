// tests/core/enemies-aggression.test.ts
//
// Story bz3-2 — RED phase (O'Brien / TEA). ENEMY AI AGGRESSION (cluster C2,
// findings E-002, E-004, E-009, E-011, E-013). The ROM tank is ATTACK-DOMINANT;
// the clone tuned it into a passive jockey and then COMPENSATED for the passivity
// with a wide fire cone and (pre-bz3-1) a fast turn. The audit's refuter confirmed
// these are ONE coupled retune, not five independent knobs — so this file pins the
// ROM-correct behavior for all of them together.
//
// Every magnitude below is cited to the CITABLE primary source
// (~/Projects/battlezone-source-text/BZONE.MAC — the CRLF-free tree; the audit
// findings JSON carries the same line numbers). Angle format: BZONE stores a full
// circle in one byte, so 1 unit = 360/256 = 1.40625° (TRACK `LDA I,20 ;C USE 45
// DEG` at BZONE.MAC:3525 fixes $20 = 45°). The game frame is 15.625 Hz / 64 ms
// (timebase.ts, bz3-1 / BZONE.MAC:1085 "END OF FRAME (64 MS)" / :422 LSR SYNC) —
// per-frame quanta convert to per-second by THAT, never the 60 Hz render loop.
//
// These assertions drive ONLY the exported sim surface (stepEnemies) and pin ROM
// TARGETS with generous playtest bands where the ROM byte is undecoded (the range
// restraint, E-013). They are RED against the current passive tuning and become
// GREEN when Dev retunes the disposition + cone + turn + spawn arc + range gate.

import { describe, it, expect } from 'vitest'
import type { TankPose } from '../../src/core/camera'
import {
  stepEnemies,
  EXPLOSION_DURATION,
  type EnemyState,
  type Hostile,
  type HostileKind,
} from '../../src/core/enemies'
import { MAX_TURN_RATE } from '../../src/core/movement'
import { GAME_FRAME_HZ } from '../../src/core/timebase'

const DT = 1 / GAME_FRAME_HZ // one ROM game frame (64 ms) — bz3-1 timebase
const TAU = Math.PI * 2
const DEG = Math.PI / 180
/** One BZONE angle unit in degrees (byte-per-circle: 360/256). */
const ANGLE_UNIT_DEG = 360 / 256 // = 1.40625°

/** Open ground, far from all 21 ROM obstacles (the enemies.test.ts fixture range). */
const PLAYER: TankPose = { x: 200_000, z: 200_000, heading: 0 }
const FIELD = { x: 200_000, z: 200_000 }

/** A wide, deterministic seed spread (Knuth multiplicative — no ambient RNG). */
const SEEDS = Array.from({ length: 240 }, (_, i) => (i * 2_654_435_761) >>> 0)

/** Fold an angle onto (−π, π]. */
function wrapAngle(a: number): number {
  let r = a % TAU
  if (r > Math.PI) r -= TAU
  if (r <= -Math.PI) r += TAU
  return r
}

/** Bearing from (x, z) to the player — camera.ts's [sin, cos] convention. */
function bearingTo(x: number, z: number, to: TankPose): number {
  return Math.atan2(to.x - x, to.z - z)
}

const deg = (rad: number): string => `${((rad * 180) / Math.PI).toFixed(2)}°`

// =============================================================================
// AC-1 / E-002 — disposition is ATTACK-DOMINANT (≥50% of decisions attack)
//
// ROM R.50$/R.40$ decision tree (BZONE.MAC:3069-3082):
//     R.50$: LDA FTIMER / CMP I,0FF / BEQ R.ATCK    ; been nice too long → attack
//            LDA PRAND / LSR / BCC R.ATCK           ; FAIR COIN → attack  (:3072-3074)
//            LDA HITS+1 / BNE R.ATCK                ; player is good → attack
//            LDA HITS / SEC / SBC HITS+2            ; by score sign:
//            BEQ R.EVAD / BCC R.RAND / BCS R.ATCK   ; even→evade, behind→wander, AHEAD→attack
// Bit 0 of the POKEY noise byte routes a full HALF of every decision straight to
// attack BEFORE any score logic — a hard ≥50% attack floor per decision, rising
// as the player pulls ahead. The clone instead makes charge a deliberate 0.3
// MINORITY (CHARGE_CHANCE=0.3, enemies.ts:227) and FORBIDS back-to-back charges
// (`const canCharge = goal !== 'charge'`, enemies.ts:634).
// =============================================================================

/**
 * One disposition decision: a tank whose re-pick timer has expired
 * (moveCounter/reversing 0), stepped once on open ground. Returns the goal it
 * SELECTED. `startGoal`='flank' + a nonzero heading error exercises the ROM's
 * fair-coin selection (canCharge path); 'charge' + aligned exercises the
 * no-back-to-back gate.
 */
function decisionGoal(seed: number, startGoal: 'flank' | 'charge', headingErr: number): string | undefined {
  const x = PLAYER.x
  const z = PLAYER.z + 60_000 // 60k north, well outside any standoff, open ground
  const bearing = bearingTo(x, z, PLAYER)
  const hostile: Hostile = {
    x,
    z,
    heading: wrapAngle(bearing + headingErr),
    kind: 'tank',
    phase: 'alive',
    phaseAge: 5,
    goal: startGoal,
    turnTo: bearing,
    moveCounter: 0,
    reversing: 0,
  }
  const state: EnemyState = { hostile, shell: null, rng: seed, missilesLaunched: 0 }
  // Neutral score, full aggression — the ≥50% floor comes from the coin alone.
  return stepEnemies(state, PLAYER, null, DT, 0, 1).state.hostile.goal
}

function attackFraction(startGoal: 'flank' | 'charge', headingErr: number): number {
  const charges = SEEDS.filter((s) => decisionGoal(s, startGoal, headingErr) === 'charge').length
  return charges / SEEDS.length
}

describe('bz3-2 AC-1 / E-002 — the enemy disposition is attack-dominant (BZONE.MAC:3072 LDA PRAND / LSR / BCC R.ATCK)', () => {
  it('at least half of all disposition decisions choose ATTACK (charge)', () => {
    // ROM: the fair coin alone routes ≥50% to attack. Clone today: CHARGE_CHANCE
    // 0.3, so ~30% — a passive minority. From a non-charge goal (canCharge=true)
    // the roll is the clone's most charge-favourable case, and it STILL falls far
    // short of the ROM floor.
    const frac = attackFraction('flank', 0.5)
    expect(
      frac,
      `only ${(frac * 100).toFixed(1)}% of decisions attacked — the ROM fair coin (BZONE.MAC:3073-3074) ` +
        `is a ≥50% attack floor; the clone makes charge a 0.3 minority`,
    ).toBeGreaterThanOrEqual(0.45)
  })

  it('a tank may attack again immediately after attacking — the ROM coin has no anti-repeat gate', () => {
    // ROM `BCC R.ATCK` (:3074) never consults the previous disposition — two
    // attacks in a row are legal and common. The clone's `canCharge = goal !==
    // 'charge'` (enemies.ts:634) makes a charge that has lined up NEVER re-pick
    // charge, so from an aligned charge the attack rate is pinned at 0.
    const frac = attackFraction('charge', 0)
    expect(
      frac,
      `${(frac * 100).toFixed(1)}% attacked after an aligned charge — the no-back-to-back gate ` +
        `(enemies.ts:634) forbids the ROM's legal repeat attack (BZONE.MAC:3074)`,
    ).toBeGreaterThanOrEqual(0.45)
  })
})

// =============================================================================
// AC-2 / E-004 — fire cone is ROM-tight (~2.8°), retuned WITH the disposition
//
// FIREIT on-target test (BZONE.MAC:3137-3146):
//     JSR TRACK / LDX I,2 / SEC / SBC TANGLE+2 ... (abs of bearing − barrel)
//     10$: CMP I,2 / BCS 50$          ; |error| >= 2 units → DON'T fire
// Fire needs |error| < 2 units = < 2.8125°, and because the compare is on an
// integer byte the effective window is 0–1 unit ≤ 1.41°. The clone fires within
// FIRE_CONE = 0.12 rad = 6.88° (enemies.ts:252) — 2.4× the ROM ceiling. Run at
// full aggression so the E-013 range gate is dropped and only the cone gates fire.
// =============================================================================

/** True iff a settled, fully-aggressive tank aimed `headingErr` off the player fires this step. */
function firesWhenAimed(headingErr: number): boolean {
  const x = PLAYER.x
  const z = PLAYER.z + 5_000 // in range, open ground
  const bearing = bearingTo(x, z, PLAYER)
  const hostile: Hostile = {
    x,
    z,
    heading: wrapAngle(bearing + headingErr),
    kind: 'tank',
    phase: 'alive',
    phaseAge: 5, // past the ~2 s spawn grace
    goal: 'charge',
    turnTo: bearing,
    moveCounter: 100, // no re-pick this step
    reversing: 0,
  }
  const state: EnemyState = { hostile, shell: null, rng: 12_345, missilesLaunched: 0 }
  return stepEnemies(state, PLAYER, null, DT, 0, 1).state.shell !== null
}

describe('bz3-2 AC-2 / E-004 — fire cone tightened to the ROM ~2.8° window (BZONE.MAC:3145 CMP I,2)', () => {
  const ROM_CONE = 2 * ANGLE_UNIT_DEG * DEG // < 2 units ≈ 2.81° ceiling
  const CLONE_CONE = 0.12 // rad = 6.88°, the current (too wide) gate

  it('a tank aimed OUTSIDE the ROM cone but inside the current cone holds fire', () => {
    // 0.09 rad ≈ 5.16°: past the ROM ≤2.81° ceiling, inside the clone's 6.88°.
    // The ROM tank would not shoot; the clone does.
    const err = 0.09
    expect(err).toBeGreaterThan(ROM_CONE) // ~2.81°
    expect(err).toBeLessThan(CLONE_CONE) // ~6.88°
    expect(
      firesWhenAimed(err),
      `fired at ${deg(err)} off — the ROM window is < 2 units (${deg(ROM_CONE)}); the clone's 6.88° cone is too wide`,
    ).toBe(false)
  })

  it('a tank aimed WITHIN the ROM cone still fires (the tighten is not a cease-fire)', () => {
    // 0.01 rad ≈ 0.57°: inside even the strict 1-unit effective window — a
    // genuinely lined-up tank must still shoot.
    expect(firesWhenAimed(0.01), 'a dead-on tank must still fire').toBe(true)
  })
})

// =============================================================================
// AC-2 / E-011 — enemy turn rate is ROM 22°/s regular, 44°/s super
//
// ITANGL rotates the tank by adding $0080 to the 16-bit angle TANGLE:LANGLE
// (BZONE.MAC:2826 `ITANGL: LDA I,80 ... ADC LANGLE ... ADC TANGLE`) = 0.5 unit
// per call. ROBOT's pivot path calls it twice per frame for a regular tank and
// four times for the TR7 super tank (BZONE.MAC:2988-2997) = 1 and 2 units/frame.
// At 15.625 Hz: 1 unit × 1.40625° × 15.625 = 21.97°/s; super = 43.95°/s.
//
// CARRY-FORWARD from bz3-1: with the corrected timebase the enemy now turns at
// 0.4 × MAX_TURN_RATE ≈ 8.8°/s — FAR BELOW the ROM 22°/s (E-011 still OPEN). Note
// the corrected player MAX_TURN_RATE is itself 21.97°/s, so the ROM enemy regular
// rate EQUALS MAX_TURN_RATE and super = 2× — retune the enemy's own cap to that,
// never touching the shared player constant.
// =============================================================================

const ROM_TURN_REGULAR_DEG = 1 * ANGLE_UNIT_DEG * GAME_FRAME_HZ // = 21.97°/s
const ROM_TURN_SUPER_DEG = 2 * ANGLE_UNIT_DEG * GAME_FRAME_HZ // = 43.95°/s

/** Peak per-second yaw of a tank driven from a 180°-off goal (guaranteed saturation), in deg/s. */
function saturatedTurnRateDeg(kind: HostileKind): number {
  const x = PLAYER.x
  const z = PLAYER.z + 60_000
  const bearing = bearingTo(x, z, PLAYER)
  const hostile: Hostile = {
    x,
    z,
    heading: wrapAngle(bearing + Math.PI), // facing directly away from the charge goal
    kind,
    phase: 'alive',
    phaseAge: 0, // never fires — irrelevant to yaw
    goal: 'charge', // re-locks the goal onto the live player bearing
    turnTo: bearing,
    moveCounter: 100, // no re-pick this step
    reversing: 0,
  }
  const state: EnemyState = { hostile, shell: null, rng: 1, missilesLaunched: 0 }
  const next = stepEnemies(state, PLAYER, null, DT, 0, 1).state.hostile
  return (Math.abs(wrapAngle(next.heading - hostile.heading)) / DT) / DEG
}

describe('bz3-2 AC-2 / E-011 — enemy turn rate retuned to ROM 22/44°/s (BZONE.MAC:2826 ITANGL LDA I,80)', () => {
  it('a regular tank sweeps at ~22°/s (1 unit/frame @ 15.625 Hz), not the current ~8.8°/s', () => {
    const rate = saturatedTurnRateDeg('tank')
    // ROM 21.97°/s. Band [19.5, 25] cleanly excludes the current 0.4×≈8.8°/s
    // (too slow post-bz3-1) and the pre-bz3-1 34°/s.
    expect(rate, `regular tank turned ${rate.toFixed(1)}°/s — ROM target ${ROM_TURN_REGULAR_DEG.toFixed(1)}°/s`).toBeGreaterThan(19.5)
    expect(rate).toBeLessThan(25)
  })

  it('a super tank sweeps at ~44°/s — twice the regular rate (TR7: 4 ITANGL calls/frame)', () => {
    const rate = saturatedTurnRateDeg('super-tank')
    expect(rate, `super tank turned ${rate.toFixed(1)}°/s — ROM target ${ROM_TURN_SUPER_DEG.toFixed(1)}°/s`).toBeGreaterThan(39)
    expect(rate).toBeLessThan(49)
  })

  it('super turns at ~2× the regular tank (ROM 2 units/frame vs 1)', () => {
    const ratio = saturatedTurnRateDeg('super-tank') / saturatedTurnRateDeg('tank')
    // ROM ratio exactly 2.0; the current 0.7/0.4 = 1.75 falls short.
    expect(ratio, `super/regular turn ratio ${ratio.toFixed(2)} — ROM is 2.0`).toBeGreaterThan(1.9)
  })

  it('the enemy retune leaves the shared player MAX_TURN_RATE at the ROM rate it equals', () => {
    // Guard: the ROM enemy REGULAR rate coincides with the corrected player pivot
    // (both 1.40625°/frame @ 15.625 Hz). The fix belongs in the enemy's own cap.
    expect(MAX_TURN_RATE / DEG).toBeCloseTo(ROM_TURN_REGULAR_DEG, 1)
  })
})

// =============================================================================
// AC-3 / E-009 — spawn arc is DIFFERENTIAL-SCALED (±21° early → ±178° full aggression)
//
// ROBCHK builds a spawn-offset MASK from the player-minus-enemy score differential
// (BZONE.MAC:3752-3772): min $0F (15 units = ±21°) when the player is even/behind,
// widening $0F→$1F→$3F→$7F as the clamped diff (≤7, E-008) climbs, to $7F
// (127 units = ±178°). The offset is `PRAND AND mask` added to the player's facing
// TANGLE (:3789-3795) and then to the player POSITION — so a mild enemy spawns
// nearly dead ahead and a full-aggression enemy anywhere around the player.
//
// The scaling MUST key on the player-minus-enemy DIFFERENTIAL — the same signal
// difficulty.aggression() reads (sim.ts) — not the aggro ratchet it produces, and
// not the raw player score (chooseKind's separate, absolute-score missile DIP
// check, findings §9). Held via stepEnemies' own `differential` parameter, which
// defaults to `score` for callers with no enemy-score context — but these tests
// drive it explicitly and pin `score`/`aggro` neutral so only the differential
// axis is under test: aggro is held at 1 in both cases below (a spawn arc keyed
// on aggro could not satisfy both), and keying on the differential (not score)
// keeps enemies-spawn-fairness.test.ts (score 0 → narrow) green.
// =============================================================================

/** |bearing FROM the player TO the hostile, relative to the player's heading|
 *  (matches enemies-spawn-fairness.test.ts: the spawn direction off the facing). */
function spawnOffset(player: TankPose, h: Hostile): number {
  return Math.abs(wrapAngle(Math.atan2(h.x - player.x, h.z - player.z) - player.heading))
}

const SPAWN_HEADINGS = [0.4, 2.0, -1.6]

/** Fire the same-step replacement spawn across seeds/headings at a given player-minus-enemy differential. */
function replacementOffsets(differential: number): { offset: number; alive: boolean }[] {
  return SEEDS.flatMap((seed) =>
    SPAWN_HEADINGS.map((heading) => {
      const player: TankPose = { x: FIELD.x, z: FIELD.z, heading }
      const dying: Hostile = {
        x: player.x + 20_000,
        z: player.z,
        heading: 0,
        kind: 'tank',
        phase: 'exploding',
        phaseAge: EXPLOSION_DURATION, // one step from retiring → the replacement spawns now
      }
      const state: EnemyState = { hostile: dying, shell: null, rng: seed, missilesLaunched: 0 }
      // score neutral (0, irrelevant to chooseKind here) and aggro pinned at 1 in
      // BOTH the mild and full cases below — the arc must scale on the explicit
      // `differential` argument, not `score` or aggro.
      const next = stepEnemies(state, player, null, DT, 0, 1, differential).state.hostile
      return { offset: spawnOffset(player, next), alive: next.phase === 'alive' }
    }),
  )
}

describe('bz3-2 AC-3 / E-009 — spawn arc scales with the score differential (BZONE.MAC:3765-3795, mask $0F→$7F)', () => {
  const MILD_MAX = 30 * DEG // ROM $0F = ±21° + interpolation slack
  const FULL_FLOOR = 135 * DEG // ROM $7F = ±178°; ≥135° proves rear spawns at full aggression

  it('an even/behind differential (0) spawns cluster nearly ahead — within ~±21° (ROM $0F)', () => {
    const cases = replacementOffsets(0)
    expect(cases.every((c) => c.alive), 'a replacement failed to spawn alive').toBe(true)
    const worst = cases.reduce((m, c) => Math.max(m, c.offset), 0)
    expect(
      worst,
      `mild spawns reached ${deg(worst)} off the player — the ROM's early window is $0F ≈ ±21°, ` +
        `but the clone uses a fixed ±90° arc that ignores the differential`,
    ).toBeLessThanOrEqual(MILD_MAX)
  })

  it('a differential past the 7000 cap spawns spread all around — reaching past ±90° into the rear (ROM $7F)', () => {
    const cases = replacementOffsets(50_000) // differential far past the 7000 cap → widest window
    expect(cases.every((c) => c.alive), 'a replacement failed to spawn alive').toBe(true)
    const worst = cases.reduce((m, c) => Math.max(m, c.offset), 0)
    expect(
      worst,
      `full-aggression spawns never exceeded ${deg(worst)} — the ROM $7F window reaches ±178°, ` +
        `but the clone's fixed ±90° arc can never spawn behind the player`,
    ).toBeGreaterThanOrEqual(FULL_FLOOR)
  })

  it('the arc widens SUBSTANTIALLY with the differential — full aggression spreads far past an even/behind game', () => {
    const mildWorst = replacementOffsets(0).reduce((m, c) => Math.max(m, c.offset), 0)
    const fullWorst = replacementOffsets(50_000).reduce((m, c) => Math.max(m, c.offset), 0)
    // ROM: $0F (±21°) → $7F (±178°) — a >150° growth. The current fixed ±90° arc
    // barely differs between the two (sampling noise), so require a real gap.
    expect(
      fullWorst - mildWorst,
      `the spawn arc widened only ${deg(fullWorst - mildWorst)} — the ROM widens $0F→$7F (≈±21°→±178°)`,
    ).toBeGreaterThan(Math.PI / 3) // > 60°
  })
})

// =============================================================================
// AC-3 / E-013 — long-range fire restraint until aggressive (TDIST ≥ $24)
//
// FIREIT's restraint ladder (BZONE.MAC:3120-3136): past the $20 spawn grace, a
// tank that is NOT fully aggressive (FTIMER != $FF) must clear more gates before
// firing — including `LDA TDIST / CMP I,24 / BCS 50$` (:3134-3136): if the player
// is too far (TDIST ≥ $24) it does NOT fire. Those gates are all bypassed once
// FTIMER == $FF (:3124 `CMP I,0FF / BEQ 5$`) — a fully aggressive tank snipes at
// any range. The clone's fire gate (enemies.ts:662-668) has NO range term, so a
// mild, freshly-settled tank fires the instant it lines up at ANY distance.
//
// $24 is an undecoded TDIST distance byte (E-013: value trued up in playtest), so
// these pin the RESTRAINT'S STRUCTURE — mild holds far / fires near, full fires
// far — with the near/far distances an order of magnitude apart so any sane
// threshold (~$24 × the clone's 256-units-per-ROM-distance-byte ≈ 9k) sits between.
// =============================================================================

/** True iff an aimed, settled tank at `distance` fires this step at aggression `aggro`. */
function aimedTankFiresAt(distance: number, aggro: number): boolean {
  const x = PLAYER.x
  const z = PLAYER.z + distance
  const bearing = bearingTo(x, z, PLAYER)
  const hostile: Hostile = {
    x,
    z,
    heading: bearing, // dead on the player
    kind: 'tank',
    phase: 'alive',
    phaseAge: 5, // past the spawn grace
    goal: 'charge',
    turnTo: bearing,
    moveCounter: 100,
    reversing: 0,
  }
  const state: EnemyState = { hostile, shell: null, rng: 7, missilesLaunched: 0 }
  return stepEnemies(state, PLAYER, null, DT, 0, aggro).state.shell !== null
}

describe('bz3-2 AC-3 / E-013 — a not-yet-aggressive tank withholds fire at long range (BZONE.MAC:3135 CMP I,24)', () => {
  const NEAR = 3_000 // clearly in range (just past the ~1280 standoff)
  const FAR = 30_000 // clearly too far (near the spawn ring)
  const MILD = 0.5 // not fully aggressive → the ROM range restraint applies
  const FULL = 1 // FTIMER == $FF equivalent → restraint dropped

  it('a mild, aimed tank HOLDS fire at long range (the missing TDIST ≥ $24 gate)', () => {
    expect(
      aimedTankFiresAt(FAR, MILD),
      `a mild tank fired at ${FAR} units — the ROM withholds fire at TDIST ≥ $24 until aggressive ` +
        `(BZONE.MAC:3134-3136); the clone has no range gate`,
    ).toBe(false)
  })

  it('the SAME mild tank fires up close — the restraint is a range gate, not a cease-fire', () => {
    expect(aimedTankFiresAt(NEAR, MILD), 'a mild tank must still fire in range').toBe(true)
  })

  it('a FULLY aggressive tank fires even at long range — the restraint lifts (ROM FTIMER==$FF)', () => {
    expect(
      aimedTankFiresAt(FAR, FULL),
      'a fully aggressive tank snipes at any range (BZONE.MAC:3124 CMP I,0FF / BEQ 5$)',
    ).toBe(true)
  })
})
