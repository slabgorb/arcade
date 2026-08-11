// tests/core/trench-fire-scroll-carry.test.ts
//
// Bug: "the trench guns are firing the wrong way — the bullets outrun the player."
//
// The trench models the player's forward flight as the WORLD scrolling toward a
// (near-)fixed cockpit at TRENCH_SCROLL_SPEED (~15,750 u/s): the walls, obstacles and
// exhaust port all get `pos.z += TRENCH_SCROLL_SPEED*dt` each frame (sim.ts stepTrench).
// The old wall-gun shot did NOT: it was fired at a bare ENEMY_SHOT_SPEED (~300 u/s)
// toward the ship, so it crept forward while the world rushed past 50× faster — the
// player outran the bullet and it read on screen as receding downrange.
//
// The fix gives every trench base-gun shell a depth velocity that RIDES the scroll
// (`vel = [-TRENCH_SCROLL_SPEED, 0, 0]`), so it closes with the walls. It does NOT lead
// the ship — sw11-1 retired the closed-form `trenchGunFireVelocity` lead for trench
// base guns (that model now serves only the SURFACE turrets, sw10-2); the shell launches
// straight down the scroll and the damped per-frame heat-seek (`seekShots`) does all the
// lateral/vertical steering, so authentic shells scatter and usually miss. The scroll
// closing is fast (~262 u per 60 fps frame >> the 160 u cockpit sphere), so the cockpit
// hit is a SWEPT test over the shot's per-frame step (gameRules.sweptCollides), not a
// point-in-sphere that a single leap would tunnel through.

import { describe, it, expect } from 'vitest'
import { initialState, type GameState, type Projectile } from '../../src/core/state'
import { ENEMY_SHOT_SPEED, ENEMY_SHOT_TTL, TRENCH_SCROLL_SPEED } from '../../src/core/state'
import { stepGame, enterPhase } from '../../src/core/sim'
import { NO_INPUT } from '../../src/core/input'
import { TRENCH_EYE_SEAT } from '../../src/core/trench-channel'
import type { Vec3 } from '@shared/math3d'

const SEAT = TRENCH_EYE_SEAT
const DT = 1 / 60

/** An isolated trench (no guns, no port) so the ONLY enemy shot in play is the one
 *  we inject — its motion is a clean read, undisturbed by RNG-driven fire. */
function bareTrench(view: Vec3, seed = 1): GameState {
  return {
    ...enterPhase(initialState(seed), 'trench'),
    mode: 'playing',
    wave: 8,
    exhaustPort: null,
    projectiles: [],
    trenchObstacles: [],
    trenchView: [...view] as Vec3,
  }
}

/** A base-gun shell built exactly as `stepTrench` now spawns it (sim.ts fire loop):
 *  riding the scroll in depth with NO lead, carrying its wall's `seek` direction. */
const shotAt = (pos: Vec3): Projectile => ({
  pos: [...pos] as Vec3,
  vel: [-TRENCH_SCROLL_SPEED, 0, 0] as Vec3,
  seek: pos[1] < 0 ? 1 : -1,
  ttl: ENEMY_SHOT_TTL,
})

describe('trench wall-gun fire rides the scroll (the bullets must not outrun the player)', () => {
  it('the launch rides the scroll in depth with NO lateral/vertical lead (sw11-1)', () => {
    // The fix contract as a pure unit. A downrange wall gun spawns its shell riding the
    // world scroll in depth (so it closes with the walls, not at its own ~300 u/s creep)
    // and with ZERO lateral/vertical launch — the ROM never leads (sw11-1). An off-wall
    // gun therefore does NOT auto-arrive on an off-centre pilot the way the retired
    // closed-form lead did; the damped heat-seek (seekShots) handles the approach.
    const gun: Vec3 = [6000, -300, SEAT]
    const { vel } = shotAt(gun)

    expect(vel[0], 'depth closes at the world scroll rate, not the muzzle creep').toBeCloseTo(-TRENCH_SCROLL_SPEED, 5)
    expect(Math.abs(vel[0]), 'i.e. far faster than the old bare muzzle speed').toBeGreaterThan(ENEMY_SHOT_SPEED * 5)
    expect(vel[1], 'no lateral lead — the ROM does not aim ahead of the ship').toBe(0)
    expect(vel[2], 'no vertical lead').toBe(0)
  })

  it('a fired shot closes on the cockpit with the scroll, not its own muzzle creep', () => {
    // End to end: one incoming shot far downrange, dead-centre. After one step its
    // depth advances toward the cockpit by ~TRENCH_SCROLL_SPEED·dt (it rides the
    // world), NOT by ~ENEMY_SHOT_SPEED·dt (~5 u), which is what left it behind before.
    const view: Vec3 = [0, 0, SEAT]
    const d0 = 5000 // native depth downrange
    const s0: GameState = { ...bareTrench(view), enemyShots: [shotAt([d0, 0, SEAT])] }
    const s1 = stepGame(s0, NO_INPUT, DT)

    expect(s1.enemyShots.length, 'the far shot is still alive').toBe(1)
    const advance = d0 - s1.enemyShots[0].pos[0] // > 0 means it moved toward the cockpit (depth→0)
    expect(advance, 'the shot advances toward the cockpit with the scroll').toBeGreaterThan(TRENCH_SCROLL_SPEED * DT * 0.8)
    expect(advance, 'i.e. far faster than its own muzzle creep — it is NOT left behind').toBeGreaterThan(ENEMY_SHOT_SPEED * DT * 5)
  })

  it('a dead-on shot that crosses the cockpit plane in one step still HITS (no tunnelling)', () => {
    // At scroll speed the shot leaps ~262 u/frame — more than the 160 u diameter of the
    // radius-80 cockpit sphere. A plain point-in-sphere test would let a dead-on shot
    // jump clean over the cockpit between frames and never register. Seated at depth ≈ 150
    // it is >80 from the cockpit now and >80 past it next frame, so only a SWEPT test
    // over the segment catches it. (A centred pilot leaves the heat-seek inert — dz 0 and
    // lateral delta 0 — so the shell holds dead-centre and the sweep lands it.)
    const view: Vec3 = [0, 0, SEAT]
    const s0: GameState = { ...bareTrench(view), enemyShots: [shotAt([150, 0, SEAT])] }
    const s1 = stepGame(s0, NO_INPUT, DT)

    expect(
      s1.events.some((e) => e.type === 'player-death'),
      'the dead-on incoming shot reaches the cockpit and is registered as a hit',
    ).toBe(true)
    expect(s1.enemyShots.length, 'and is consumed, not left to sail past the cockpit').toBe(0)
  })
})
