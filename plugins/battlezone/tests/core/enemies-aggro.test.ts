// tests/core/enemies-aggro.test.ts
//
// Story bz1-10 — review round 1 (Furiosa / TEA, per Immortan Joe's
// [MEDIUM][TEST] finding). The ratchet's behavioral payload in stepEnemies —
// the thing that actually changes gameplay — had NO direct test, and the
// code comment's "aggro 1 is EXACTLY the pre-ratchet behavior" regression
// guarantee was enforced by nothing.
//
// These are RELATIVE-behavior assertions (mild vs full, omitted vs explicit),
// deliberately free of absolute speed/angle constants so bz1-12's playtest
// retuning of the provisional AI numbers cannot break them.
import { describe, it, expect } from 'vitest'
import type { TankPose } from '../../src/core/camera'
import { stepEnemies, type EnemyState, type Hostile } from '../../src/core/enemies'

const DT = 1 / 60

// Open ground, far from all 21 obstacles (the enemies.test.ts fixture range).
const PLAYER: TankPose = { x: 200_000, z: 200_000, heading: 0 }

/** ROM heading convention: 0 faces +Z, increasing turns toward +X. */
function bearingTo(fromX: number, fromZ: number, to: TankPose): number {
  return Math.atan2(to.x - fromX, to.z - fromZ)
}

/** An alive slow tank at (x, z), heading offset from the player bearing. */
function tankOffAxis(x: number, z: number, headingError: number): Hostile {
  return {
    x,
    z,
    heading: bearingTo(x, z, PLAYER) + headingError,
    kind: 'tank',
    phase: 'alive',
    phaseAge: 5,
  }
}

function stateWith(hostile: Hostile): EnemyState {
  return { hostile, shell: null, rng: 99, missilesLaunched: 0 }
}

const dist = (a: Hostile, b: Hostile): number => Math.hypot(a.x - b.x, a.z - b.z)

describe('the ratchet reaches the treads — mild tanks crawl', () => {
  it('an aggro-0 tank covers less ground per step than an aggro-1 tank', () => {
    // Perfectly aimed → the AI takes the drive branch (throttle governs).
    const start = tankOffAxis(200_000, 240_000, 0)
    const mild = stepEnemies(stateWith(start), PLAYER, null, DT, 0, 0)
    const full = stepEnemies(stateWith(start), PLAYER, null, DT, 0, 1)

    const mildMoved = dist(mild.state.hostile, start)
    const fullMoved = dist(full.state.hostile, start)
    expect(fullMoved).toBeGreaterThan(0)
    expect(mildMoved, 'a mild tank must crawl, not charge').toBeLessThan(fullMoved)
  })
})

describe('the ratchet reaches the trigger — mild tanks take bad shots', () => {
  // Misaligned by 0.45 rad: outside the full-aggression aimed gate, inside
  // the widened mild gate ("If the enemy is winning, tanks ... take bad
  // shots" — findings §5). The exact gate widths are provisional; the
  // RELATIVE fact (mild fires where full holds fire) is the ROM behavior.
  // In range (6,000 units, well inside bz3-2/E-013's RANGE_RESTRAINT) so the
  // angle gate is what's under test here, not the separate range restraint.
  const OFF_AXIS = 0.45

  it('a full-aggression tank holds fire while badly aimed', () => {
    const r = stepEnemies(stateWith(tankOffAxis(200_000, 206_000, OFF_AXIS)), PLAYER, null, DT, 0, 1)
    expect(r.state.shell, 'a disciplined tank waits for the aim').toBeNull()
  })

  it('a mild tank shoulders the shot anyway — along its bad barrel line', () => {
    const start = tankOffAxis(200_000, 206_000, OFF_AXIS)
    const r = stepEnemies(stateWith(start), PLAYER, null, DT, 0, 0)
    expect(r.state.shell, 'a mild tank takes the bad shot').not.toBeNull()
    // The shell leaves along the tank's own (badly aimed) barrel — ROM
    // offset 2674 semantics, unchanged by the ratchet.
    expect(r.state.shell?.heading).toBeCloseTo(start.heading, 6)
    expect(r.playerHit).toBe(false)
  })
})

describe('the regression guarantee — omitted aggro IS full aggression', () => {
  it('stepEnemies without the aggro arg returns the identical state as aggro 1', () => {
    // Misaligned start so BOTH the fire gate and the drive/pivot branch are
    // exercised by the comparison, plus the rng-carrying spawn machinery.
    const start = tankOffAxis(200_000, 240_000, 0.2)
    const implicit = stepEnemies(stateWith(start), PLAYER, null, DT, 4000)
    const explicit = stepEnemies(stateWith(start), PLAYER, null, DT, 4000, 1)
    expect(implicit).toEqual(explicit)
  })

  it('holds through a kill step (score award, replacement spawn, rng draws)', () => {
    const victim = tankOffAxis(240_000, 240_000, 0)
    const killShot = { x: victim.x, z: victim.z - 200, heading: 0, range: 0 }
    const implicit = stepEnemies(stateWith(victim), PLAYER, killShot, DT, 0)
    const explicit = stepEnemies(stateWith(victim), PLAYER, killShot, DT, 0, 1)
    expect(implicit).toEqual(explicit)
    expect(implicit.scoreAward).toBe(1000)
  })
})
