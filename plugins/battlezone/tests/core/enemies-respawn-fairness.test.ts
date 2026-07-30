// tests/core/enemies-respawn-fairness.test.ts
//
// Story bz2-9 — R2 REOPEN (Furiosa / TEA). The R1 fix (forward-hemisphere spawn
// geometry + a 0.5 s post-spawn fire grace keyed on hostile.phaseAge) landed but
// FAILED the live playtest: ~3 s of life, the surviving enemy re-kills instantly
// on respawn, and enemy fire machine-guns against a barrier. Two authentic ROM
// mechanisms the R1 fix never modelled (decoded from reference/va-battlezone —
// see the session's Architect Design Note):
//
//   1. RESPAWN GRACE — the ROM's rez_protect ($d1) "enemy plays nice" counter is
//      reset to 0 on the player-death/respawn path ($5215) as well as on enemy
//      spawn; TryShootPlayer ($6595) holds fire until it reaches ~2 s ("don't be
//      unfair"). R1's grace keys on the ENEMY's phaseAge, which does NOT reset
//      when the PLAYER dies — the carried-forward tank (phaseAge ≫ grace) fires
//      on the very next frame and re-kills the fresh spawn. That is the ~3 s bug.
//
//   2. RELOAD — on any strike the ROM sets the projectile to an EXPLOSION state
//      ($a0) that keeps the fire gate closed until the blast animation ends, so a
//      tank whose shell hits a nearby barrier cannot re-fire on the next frame.
//      Our sim frees the enemy shell slot the instant it clears an obstacle
//      (firing.ts shellBlocked → return null), so a wedged tank machine-guns.
//
// Both are behavioral OUTCOME tests (no exact grace/reload constant is pinned),
// so a playtest true-up of the durations cannot break them. They assert what the
// player feels: you get a reaction beat after respawning, and a stuck tank does
// not hose you frame-by-frame.

import { describe, it, expect } from 'vitest'
import { stepGame } from '../../src/core/sim'
import { initGame, SPAWN_POSE, type GameState } from '../../src/core/state'
import { stepEnemies, type EnemyState, type Hostile } from '../../src/core/enemies'
import type { TankPose } from '../../src/core/camera'
import type { Input } from '../../src/core/input'
import { shellBlocked } from '../../src/core/firing'
import { OBSTACLES } from '../../src/core/obstacles'
import { PROXTB } from '../../src/core/movement'

const DT = 1 / 60
const EPS = 1e-9
const NEUTRAL: Input = { leftTread: 0, rightTread: 0, fire: false, start: false }

// --- Group A: respawn fire grace (driven through the REAL sim, AC-1) ----------
//
// A 'playing' battle rigged so the enemy's shell reaches the player THIS step,
// forcing a death → respawn, with a settled, dead-aimed tank left standing at
// the origin the player respawns onto. Under R1 that survivor re-fires the very
// next frame; the ROM would still be holding fire.

function aboutToDie(seed = 1): GameState {
  const hostile: Hostile = {
    x: 0,
    z: 5_000, // inside bz3-2/E-013's RANGE_RESTRAINT so a mild ratchet can still fire
    heading: Math.PI, // bearingTo(0, 5000, origin) = π — dead-aimed at the origin
    kind: 'tank',
    phase: 'alive',
    phaseAge: 5, // long settled: R1 has no reason to hold fire
  }
  const enemies: EnemyState = {
    hostile,
    // Heading π moves −z; at z=800 the shell is already inside PLAYER_RADIUS of
    // the player at the origin, so it lands the killing hit on step one.
    shell: { x: 0, z: 800, heading: Math.PI, range: 0 },
    rng: seed,
    missilesLaunched: 0,
  }
  return { ...initGame(seed), mode: 'playing', player: SPAWN_POSE, enemies, lives: 3 }
}

describe('bz2-9 R2 respawn grace — a fresh respawn gets a reaction beat before the survivor fires (AC-1)', () => {
  it('the rig kills the player and respawns them (scenario sanity — a life is spent, the tank re-centres)', () => {
    const after = stepGame(aboutToDie(), NEUTRAL, DT)
    expect(after.lives, 'the enemy shell should have taken exactly one life').toBe(2)
    expect(
      after.player.x === 0 && after.player.z === 0,
      'the player should respawn at the origin',
    ).toBe(true)
    expect(after.enemies.hostile.phase, 'the survivor fights on').toBe('alive')
  })

  it('the surviving, dead-aimed enemy fires NO shell for a full reaction second after the respawn', () => {
    let s = stepGame(aboutToDie(), NEUTRAL, DT) // the death + respawn step
    expect(s.lives, 'precondition: respawned with one life spent').toBe(2)
    for (let t = 0; t < 1 - EPS; t += DT) {
      s = stepGame(s, NEUTRAL, DT)
      expect(
        s.enemies.shell,
        `the survivor must hold fire during the post-respawn grace (t≈${t.toFixed(3)}s)`,
      ).toBeNull()
      // A second death inside the reaction window IS the ~3-s-of-life bug.
      expect(s.lives, `no second death inside the reaction window (t≈${t.toFixed(3)}s)`).toBe(2)
    }
  })

  it('the respawn grace LIFTS — the enemy resumes fire within a few seconds (lethality intact, AC-4)', () => {
    let s = stepGame(aboutToDie(), NEUTRAL, DT)
    let firedAgain = false
    for (let t = 0; t < 4; t += DT) {
      s = stepGame(s, NEUTRAL, DT)
      if (s.enemies.shell !== null) {
        firedAgain = true
        break
      }
    }
    expect(firedAgain, 'a permanent post-respawn cease-fire would gut the duel').toBe(true)
  })
})

// --- Group B: reload — a barrier-wedged tank cannot machine-gun (AC-1) --------
//
// Obstacle #2 (a wide-pyramid at (-32768, 0)) sits squarely on the -x axis. A
// tank parked just past the movement-block edge wedges against it — exactly
// the "stuck on an obstacle" pose the playtest saw spraying shots — and every
// shell it fires toward the origin strikes the box and clears within a few
// frames. (Obstacle #1, the short box this scenario originally used, no
// longer works here: bz3-4/F-007 gives short-box a PRXTBL of 0, so it no
// longer blocks SHELLS at all — only obstacle-#2's wide-pyramid type still
// does, per the ROM's distinct shell-vs-tank proximity tables.)

const ORIGIN: TankPose = { x: 0, z: 0, heading: 0 }
const BARRIER = OBSTACLES[2]
const BARRIER_DIR = Math.sign(BARRIER.x) // extend away from the origin along the barrier's own axis
/** Just past the movement-block edge (PROXTB, bz3-4): a tank here cannot
 *  advance, so it holds its firing pose against the barrier. */
const WEDGE_X = BARRIER.x + BARRIER_DIR * (PROXTB[BARRIER.type] + 1)

function wedgedTank(): EnemyState {
  return {
    hostile: {
      x: WEDGE_X,
      z: 0,
      heading: Math.atan2(-WEDGE_X, 0), // bearingTo(WEDGE_X, 0, origin) = −π/2, dead-aimed
      kind: 'tank',
      phase: 'alive',
      phaseAge: 5, // long settled — well past any spawn grace, so only the reload can gate it
    },
    shell: null,
    rng: 12_345,
    missilesLaunched: 0,
  }
}

describe('bz2-9 R2 reload — a tank wedged against a barrier fires on a reload, not every frame (AC-1)', () => {
  it('the scenario is valid — the barrier lies on the tank→player line and the tank does open fire', () => {
    // Static geometry: the barrier centre blocks shots and the tank sits clear
    // on its far side, so every shell fired toward the origin must strike the box.
    expect(shellBlocked(BARRIER.x, 0), 'the barrier must block shots on the z=0 line').toBe(true)
    expect(shellBlocked(WEDGE_X, 0), 'the wedged tank itself must sit on clear ground').toBe(false)
    expect(
      Math.abs(WEDGE_X),
      'the tank must sit beyond the barrier from the player',
    ).toBeGreaterThan(Math.abs(BARRIER.x))
    // Dynamic: the tank actually opens fire (else the no-spam count is vacuous).
    let es = wedgedTank()
    let everFired = false
    for (let i = 0; i < 10; i++) {
      const r = stepEnemies(es, ORIGIN, null, DT)
      if (r.state.shell !== null) {
        everFired = true
        break
      }
      es = r.state
    }
    expect(everFired, 'the wedged, aimed tank should open fire').toBe(true)
  })

  it('over two seconds it opens fire only a handful of times, not one shot every few frames', () => {
    // A shell leaves the barrel at range 0; a shell already in flight has range
    // > 0. R1 re-fires the instant its shell clears the barrier, so a fresh
    // (range-0) shell reappears every few frames — tens of muzzle flashes per
    // 2 s. A reload after each cleared shot caps the muzzle flashes to a handful.
    let es = wedgedTank()
    let muzzleFlashes = 0
    for (let i = 0; i < 120; i++) {
      const r = stepEnemies(es, ORIGIN, null, DT)
      if (r.state.shell !== null && r.state.shell.range === 0) muzzleFlashes++
      es = r.state
    }
    expect(
      muzzleFlashes,
      `the wedged tank opened fire ${muzzleFlashes} times in 2 s — a barrier machine-gun`,
    ).toBeLessThanOrEqual(8)
  })
})
