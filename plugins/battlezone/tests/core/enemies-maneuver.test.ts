// tests/core/enemies-maneuver.test.ts
//
// Story bz2-10 — RED phase (Imperator Furiosa / TEA). The authentic-tank-AI
// contract: bz2-9's spawn geometry + fire grace made the OPENING survivable but
// the tank still plays like a gun turret — `aiInput` (enemies.ts) welds the
// barrel to the player and pivots at the player's FULL rate, so it is always
// aimed and fires the instant grace+reload allow. The live playtest failed on
// exactly that.
//
// The real ROM tank (SourceGen decode, reference/va-battlezone/) is a
// GOAL-HEADING state machine, NOT a beeline seeker:
//   * SetTankTurnTo $6534 — picks a goal heading that is frequently ~90 deg off
//     the player (flank, `player_angle XOR $40`) or a random wander (+-45 deg),
//     re-picked every few seconds; only "GoHard" charges straight in.
//   * RotateLeft/Right $638d/$639b — ~22 deg/s (regular) / ~44 deg/s (super),
//     WELL below the player's ~84 deg/s pivot; big turns rotate without advancing.
//   * SmallAngleCom $64c2 — holds a standoff (~1280 slow / ~2048 super), circles
//     instead of ramming.
//   * HitSomething $651a — reverses + turns on obstacle collision (unstick).
//   * ShootOkay $65b6 — fires only when the barrel genuinely lines up (+-2.8 deg);
//     because the barrel usually tracks the flank goal, fire is intermittent.
//
// These assertions are RELATIVE / BANDED (no absolute ROM constants) so bz1-12-
// style playtest retuning of the provisional AI knobs (flank odds, exact turn
// rate, standoff byte) cannot break them — the pattern established by
// enemies-aggro.test.ts. They exercise ONLY the exported sim surface
// (stepEnemies / stepTank), so Dev is free to choose the field/struct shape.
import { describe, it, expect } from 'vitest'
import type { TankPose } from '../../src/core/camera'
import { stepEnemies, type EnemyState, type Hostile, type HostileKind } from '../../src/core/enemies'
import { stepTank, MAX_TURN_RATE } from '../../src/core/movement'
import { OBSTACLES } from '../../src/core/obstacles'

const DT = 1 / 60

/** Open ground, far from all 21 obstacles (|coords| <= ~46k) — unobstructed motion. */
const OPEN_PLAYER: TankPose = { x: 200_000, z: 200_000, heading: 0 }

const TAU = Math.PI * 2
/** Fold an angle onto (-pi, pi] (matches enemies.ts wrapAngle). */
function wrap(a: number): number {
  let r = a % TAU
  if (r > Math.PI) r -= TAU
  if (r <= -Math.PI) r += TAU
  return r
}

/** ROM heading convention: 0 faces +Z, increasing turns toward +X. */
function bearingTo(fromX: number, fromZ: number, to: TankPose): number {
  return Math.atan2(to.x - fromX, to.z - fromZ)
}

/** |heading - bearing-to-player|: 0 = barrel dead on the player. */
function aimError(h: Hostile, player: TankPose): number {
  return Math.abs(wrap(bearingTo(h.x, h.z, player) - h.heading))
}

function dist(ax: number, az: number, bx: number, bz: number): number {
  return Math.hypot(ax - bx, az - bz)
}

/** A settled (past fire-grace) alive slow tank at (x,z), barrel aimed straight at the player. */
function settledTankAimedAt(player: TankPose, x: number, z: number): Hostile {
  return { x, z, heading: bearingTo(x, z, player), kind: 'tank', phase: 'alive', phaseAge: 5 }
}

/**
 * A settled tank LOCKED in charge mode (goal fixed, counter long enough it never
 * re-picks within a run) — it drives straight at the player until the standoff
 * halts it. Forcing the charge makes the standoff gate load-bearing: a
 * `STANDOFF=0` mutant rams to point-blank (fails the floor), so the test cannot
 * pass vacuously on a seed that happens to never approach.
 */
function chargingTankAt(player: TankPose, x: number, z: number, kind: HostileKind = 'tank'): Hostile {
  return { x, z, heading: bearingTo(x, z, player), kind, phase: 'alive', phaseAge: 5, goal: 'charge', moveCounter: 100 }
}

function stateWith(hostile: Hostile, seed: number): EnemyState {
  return { hostile, shell: null, rng: seed, missilesLaunched: 0 }
}

/**
 * Advance the enemy side `steps` frames against a STATIONARY player, no player
 * shell (so the tank is never killed/replaced — a tank persists), returning the
 * hostile at each tick. Fire is a side effect on state.shell; it never mutates
 * the tank's own path.
 */
function runTrajectory(initial: EnemyState, player: TankPose, steps: number, score = 0): Hostile[] {
  const out: Hostile[] = []
  let state = initial
  for (let i = 0; i < steps; i++) {
    state = stepEnemies(state, player, null, DT, score).state
    out.push(state.hostile)
  }
  return out
}

/** Peak commanded turn rate (rad/s) over the first `frames` steps from a big-error start. */
function observedTurnRate(kind: HostileKind, frames = 5): number {
  const player = OPEN_PLAYER
  const start: Hostile = {
    x: 200_000,
    z: 260_000,
    heading: bearingTo(200_000, 260_000, player) + Math.PI / 2, // 90 deg off the player
    kind,
    phase: 'alive',
    phaseAge: 5,
  }
  let state = stateWith(start, 12_345)
  let prev = start.heading
  let peak = 0
  for (let i = 0; i < frames; i++) {
    state = stepEnemies(state, player, null, DT).state
    peak = Math.max(peak, Math.abs(wrap(state.hostile.heading - prev)) / DT)
    prev = state.hostile.heading
  }
  return peak
}

// A spread of seeds so RNG-driven goal odds are averaged out (the odds are
// playtest-tunable, so no single seed is load-bearing).
const SEEDS = [1, 7, 23, 42, 99, 128, 256, 777, 1009, 3333, 8888, 65_535]

describe('bz2-10 AC-1: the tank stops welding its barrel to the player', () => {
  // bz3-1: the enemy derives its turn/move rate from the shared MAX_TURN_RATE /
  // MAX_SPEED, so the 15.625 Hz timebase correction slowed it to ROM speed too.
  // Scale the sim-time budget by the 60/15.625 = 3.84 ratio this story corrects
  // (10 s → ~40 s) so the now-ROM-speed tank has the same relative room to sweep.
  const STEPS = Math.round(40 / DT) // 40 s: several goal re-picks at ROM turn rate
  // Start far enough that a beeline never reaches (and overshoots) the player
  // inside the window — so a turret's aim error stays ~0 the whole run.
  const START_D = 70_000

  it('a settled tank spends real time facing well off the player (flank/wander, not a turret)', () => {
    // Beeline: aim error clings to ~0 forever. Maneuvering: the barrel swings
    // toward flank/wander goals ~90 deg off. Average the per-seed peak error.
    const peakErrs = SEEDS.map((seed) =>
      Math.max(
        ...runTrajectory(
          stateWith(settledTankAimedAt(OPEN_PLAYER, OPEN_PLAYER.x, OPEN_PLAYER.z + START_D), seed),
          OPEN_PLAYER,
          STEPS,
        ).map((h) => aimError(h, OPEN_PLAYER)),
      ),
    )
    const meanPeak = peakErrs.reduce((a, b) => a + b, 0) / peakErrs.length
    // 0.9 rad (~52 deg) is far above beeline noise (~0) and well under the pi/2
    // flank target — robust to charge-heavy tunes.
    expect(meanPeak, 'the tank must turn substantially off-player (flank/wander), not track it').toBeGreaterThan(0.9)
  })

  it('a settled tank is NOT aimed on most frames, and NO single seed is a turret', () => {
    const AIMED = 0.3 // "barrel roughly on the player" band — far wider than the tight fire cone
    const aimedFractions = SEEDS.map((seed) => {
      const traj = runTrajectory(
        stateWith(settledTankAimedAt(OPEN_PLAYER, OPEN_PLAYER.x, OPEN_PLAYER.z + START_D), seed),
        OPEN_PLAYER,
        STEPS,
      )
      return traj.filter((h) => aimError(h, OPEN_PLAYER) <= AIMED).length / traj.length
    })
    const meanAimed = aimedFractions.reduce((a, b) => a + b, 0) / aimedFractions.length
    // Beeline: ~1.0 (always aimed). Maneuvering: aimed only during sweeps. 0.7
    // leaves headroom for a charge-leaning tune while still failing the turret.
    expect(meanAimed, 'a maneuvering tank cannot be aimed at the player nearly every frame').toBeLessThan(0.7)
    // Per-seed floor (review R2): the 12-seed mean can hide a lone turret — an
    // earlier tune left seed 65535 aimed 100% of the run while the mean still
    // passed. No SINGLE seed may sit barrel-on ≥85% of the frames.
    const maxAimed = Math.max(...aimedFractions)
    expect(maxAimed, 'no single seed may weld its barrel to the player (turret)').toBeLessThan(0.85)
  })
})

describe('bz2-10 AC-2: the tank turns like a tank, not a turret', () => {
  it('a regular enemy tank sweeps at the ROM ~22 deg/s rate (bz3-2 / E-011)', () => {
    const rate = observedTurnRate('tank')
    // bz3-2 UPDATE: bz3-1 corrected MAX_TURN_RATE to the ROM 21.97 deg/s, and the
    // ROM enemy REGULAR sweep (1 unit/frame @ 15.625 Hz, BZONE.MAC:2826 ITANGL /
    // :2988 two calls) coincides with it — so the enemy turns AT the player pivot
    // rate, not a fraction of it. The old `< MAX_TURN_RATE * 0.5` band pinned the
    // clone's 0.4x (~8.8 deg/s) bug (E-011, still OPEN); this pins the ROM target.
    // Precise 22/44 deg/s bands live in enemies-aggression.test.ts.
    expect(rate, 'the enemy regular sweep must reach the ROM ~22 deg/s (approx MAX_TURN_RATE)').toBeGreaterThan(
      MAX_TURN_RATE * 0.8,
    )
  })

  it('the player tank still pivots at its full rate (the enemy slow-down must not touch the shared cap)', () => {
    // Guard for the MAX_TURN_RATE watch-item: the fix belongs in the enemy's
    // commanded treads, NOT in the constant the player also uses.
    const pose: TankPose = { x: 0, z: 0, heading: 0 }
    const turned = stepTank(pose, { leftTread: -1, rightTread: 1, fire: false }, DT)
    const rate = Math.abs(wrap(turned.heading - pose.heading)) / DT
    expect(rate, 'the player full-opposed pivot must stay MAX_TURN_RATE').toBeCloseTo(MAX_TURN_RATE, 5)
  })

  it('a super tank out-turns a regular tank (ROM: super rotates at 2x)', () => {
    // Beeline pivots both kinds at the identical full rate — so this is RED until
    // the kinds get distinct, ROM-faithful turn rates.
    expect(observedTurnRate('super-tank'), 'the super tank must out-turn the slow tank').toBeGreaterThan(
      observedTurnRate('tank'),
    )
  })
})

describe('bz2-10 AC-3: the tank keeps its distance instead of ramming', () => {
  const runMinDist = (kind: HostileKind): number => {
    // Forced-charge from 20k. bz3-1: at the corrected 15.625 Hz timebase the
    // ROM-speed charge (~1440 u/s) rams from 20k in ~14 s, so the old 12 s no
    // longer reaches the standoff. Scale by the 60/15.625 = 3.84 ratio this story
    // corrects (12 s → ~48 s); the standoff is still what must halt it.
    const traj = runTrajectory(
      stateWith(chargingTankAt(OPEN_PLAYER, OPEN_PLAYER.x, OPEN_PLAYER.z + 20_000, kind), 555),
      OPEN_PLAYER,
      Math.round(48 / DT),
    )
    return Math.min(...traj.map((h) => dist(h.x, h.z, OPEN_PLAYER.x, OPEN_PLAYER.z)))
  }

  it('a charging tank closes to the standoff and holds — neither rams nor stalls short', () => {
    const minDist = runMinDist('tank')
    // Assert BOTH bounds so the test stays honest: a STANDOFF=0 mutant rams
    // (minDist→~0, fails the floor); a never-approach bug leaves minDist ~20k
    // (fails the ceiling). Only a real standoff (~1280) lands between them.
    expect(minDist, 'the tank must hold a standoff, not ram the player').toBeGreaterThan(800)
    expect(minDist, 'the tank must actually approach to near the standoff (non-vacuous)').toBeLessThan(4_000)
  })

  it('a super tank holds a WIDER standoff than a regular tank (ROM $08 vs $05)', () => {
    const minReg = runMinDist('tank')
    const minSup = runMinDist('super-tank')
    expect(minSup, 'the super tank must not ram either').toBeGreaterThan(800)
    expect(minSup, 'the super tank holds a wider standoff than the regular tank').toBeGreaterThan(minReg)
  })
})

describe('bz2-10 AC-4: a tank driven into an obstacle does not stay wedged', () => {
  // Shove a charging tank straight through a pyramid (player on the far side),
  // then measure the rebound: min distance to the block, then the max distance
  // reached AFTER that min. A beeline wedges at the block radius and freezes
  // (delta ~0); a maneuvering tank reverses on collision and retreats well clear.
  const reboundOff = (kind: HostileKind): number => {
    const O = OBSTACLES[0] // wide-pyramid at (8192, 8192)
    const player: TankPose = { x: O.x, z: O.z + 20_000, heading: 0 }
    const start = chargingTankAt(player, O.x, O.z - 4_000, kind) // charging just short of the block
    const distsToO = runTrajectory(stateWith(start, 246), player, Math.round(10 / DT)).map((h) =>
      dist(h.x, h.z, O.x, O.z),
    )
    const minToO = Math.min(...distsToO)
    return Math.max(...distsToO.slice(distsToO.indexOf(minToO))) - minToO
  }

  it('a tank shoved at a pyramid backs off instead of grinding forever', () => {
    expect(reboundOff('tank'), 'a wedged tank must back away from the obstacle').toBeGreaterThan(1_000)
  })

  it('a super tank shoved at a pyramid also backs off (super reverse-on-collision)', () => {
    expect(reboundOff('super-tank'), 'a wedged super tank must back away too').toBeGreaterThan(1_000)
  })
})

describe('bz2-10 AC-5: still lethal, opening still survivable', () => {
  it('a freshly spawned tank cannot fire during the opening grace (bz2-9 stays intact)', () => {
    const fresh: Hostile = { ...settledTankAimedAt(OPEN_PLAYER, OPEN_PLAYER.x, OPEN_PLAYER.z + 10_000), phaseAge: 0 }
    let state = stateWith(fresh, 4)
    let fired = false
    for (let i = 0; i < Math.round(1.5 / DT); i++) {
      state = stepEnemies(state, OPEN_PLAYER, null, DT).state
      if (state.shell !== null) fired = true
    }
    expect(fired, 'the opening grace must hold a just-spawned tank fire').toBe(false)
  })

  it('a maneuvering tank is still lethal — it DOES fire at the player over time', () => {
    // Guard against over-correction: a tank that never lines up and never fires
    // is not a tank. Over 20 s the flank sweeps must cross the player at least once.
    let state = stateWith(settledTankAimedAt(OPEN_PLAYER, OPEN_PLAYER.x, OPEN_PLAYER.z + 10_000), 31)
    let fireCount = 0
    for (let i = 0; i < Math.round(20 / DT); i++) {
      const before = state.shell
      state = stepEnemies(state, OPEN_PLAYER, null, DT).state
      if (before === null && state.shell !== null) fireCount++
    }
    expect(fireCount, 'an over-corrected tank that never fires is not lethal').toBeGreaterThan(0)
  })

  it('the fire gate tightens — a tank aimed only roughly at the player holds its shot', () => {
    // Intermittent fire needs a genuinely-lined-up barrel (ROM ShootOkay ~+-2.8 deg),
    // not the generous current cone (~0.3 rad / +-17 deg). A settled tank aimed 0.2 rad
    // (~11 deg) off must hold fire on the spot once the gate is ROM-tight. 0.2 rad sits
    // inside today's gate (so it fires now — RED) but well outside a tightened one.
    const off: Hostile = {
      x: OPEN_PLAYER.x,
      z: OPEN_PLAYER.z + 12_000,
      heading: bearingTo(OPEN_PLAYER.x, OPEN_PLAYER.z + 12_000, OPEN_PLAYER) + 0.2,
      kind: 'tank',
      phase: 'alive',
      phaseAge: 5,
    }
    const r = stepEnemies(stateWith(off, 17), OPEN_PLAYER, null, DT)
    expect(r.state.shell, 'a loosely-aimed tank must hold fire under the tightened gate').toBeNull()
  })
})

describe('bz2-10 AC-6: the maneuver stays pure and deterministic', () => {
  it('identical seed + inputs produce an identical trajectory', () => {
    const start = settledTankAimedAt(OPEN_PLAYER, OPEN_PLAYER.x, OPEN_PLAYER.z + 50_000)
    const steps = Math.round(6 / DT)
    expect(
      runTrajectory(stateWith(start, 4242), OPEN_PLAYER, steps),
      'identical seed + inputs must reproduce the exact trajectory (determinism)',
    ).toEqual(runTrajectory(stateWith(start, 4242), OPEN_PLAYER, steps))
  })

  it('the RNG seed steers the maneuver — different seeds diverge (most pairs)', () => {
    // A beeline ignores the seed once placed (draws no rng), so its path is
    // seed-independent — RED. Seeded goal-picking must make the seed matter.
    // Some seed pairs can alias to near-identical opening sweeps, so require
    // MOST pairs to diverge rather than betting the test on a single pair.
    const start = settledTankAimedAt(OPEN_PLAYER, OPEN_PLAYER.x, OPEN_PLAYER.z + 50_000)
    const steps = Math.round(10 / DT)
    const PAIRS: [number, number][] = [[1, 2], [7, 23], [42, 99], [128, 256], [777, 1009], [3333, 8888]]
    const end = (t: Hostile[]): Hostile => t[t.length - 1]
    const diverged = PAIRS.filter(([a, b]) => {
      const ea = end(runTrajectory(stateWith(start, a), OPEN_PLAYER, steps))
      const eb = end(runTrajectory(stateWith(start, b), OPEN_PLAYER, steps))
      return dist(ea.x, ea.z, eb.x, eb.z) > 1_000
    }).length
    expect(
      diverged,
      'seeded goal-picking must make the seed matter for most pairs',
    ).toBeGreaterThanOrEqual(Math.ceil(PAIRS.length * 0.6))
  })

  it('headings and positions stay finite — no NaN leaks from the new angle math', () => {
    const traj = runTrajectory(
      stateWith(settledTankAimedAt(OPEN_PLAYER, OPEN_PLAYER.x, OPEN_PLAYER.z + 60_000), 8),
      OPEN_PLAYER,
      Math.round(8 / DT),
    )
    for (const h of traj) {
      expect(
        Number.isFinite(h.x) && Number.isFinite(h.z) && Number.isFinite(h.heading),
        'no NaN/Infinity in tank state',
      ).toBe(true)
    }
  })
})
