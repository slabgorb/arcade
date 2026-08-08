// tests/core/trench-fire-scroll-carry.test.ts
//
// Bug: "the trench guns are firing the wrong way — the bullets outrun the player."
//
// The trench models the player's forward flight as the WORLD scrolling toward a
// (near-)fixed cockpit at TRENCH_SCROLL_SPEED (~15,750 u/s): the walls, obstacles and
// exhaust port all get `pos.z += TRENCH_SCROLL_SPEED*dt` each frame (sim.ts stepTrench
// — obstacles at :1424, port at :1388). The old wall-gun shot did NOT: it was fired at
// a bare ENEMY_SHOT_SPEED (~300 u/s) toward the ship, so it crept forward while the
// world rushed past 50× faster — the player outran the bullet and it read on screen as
// receding downrange ("firing the wrong way").
//
// The fix gives the shot a closing velocity that RIDES the scroll in depth and LEADS
// the ship laterally (gameRules.trenchGunFireVelocity), so it approaches the cockpit
// with the world AND still arrives at an off-centre pilot. That closing is fast
// (~262 u per 60 fps frame >> the 160 u cockpit sphere), so the cockpit hit is a SWEPT
// test over the shot's per-frame step (gameRules.sweptCollides), not a point-in-sphere
// that a single leap would tunnel through.

import { describe, it, expect } from 'vitest'
import { initialState, type GameState } from '../../src/core/state'
import { ENEMY_SHOT_SPEED, ENEMY_SHOT_TTL, TRENCH_SCROLL_SPEED } from '../../src/core/state'
import { trenchGunFireVelocity } from '../../src/core/gameRules'
import { stepGame, enterPhase } from '../../src/core/sim'
import { NO_INPUT } from '../../src/core/input'
import { TRENCH_EYE_SEAT } from '../../src/core/trench-channel'
import { add, scale, type Vec3 } from '@shared/math3d'

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

/** A fireball fired from `pos` at the ship point `view`, exactly as the wall guns
 *  spawn it (sim.ts fire loop → the shared trenchGunFireVelocity). */
const shotAt = (pos: Vec3, view: Vec3) => ({ pos: [...pos] as Vec3, vel: trenchGunFireVelocity(pos, view), ttl: ENEMY_SHOT_TTL })

describe('trench wall-gun fire rides the scroll (the bullets must not outrun the player)', () => {
  it('the fire velocity rides the scroll in depth and leads the ship laterally to hit it', () => {
    // The fix contract, as a pure unit. A wall gun downrange at x=-300 firing at a
    // centred pilot: its z-velocity IS the scroll (so it closes with the walls, not at
    // its own ~300 u/s creep), and integrating the whole velocity for the transit time
    // lands it on the ship's x/y — a lead, so an off-wall gun still hits centre.
    const gun: Vec3 = [-300, SEAT, -6000]
    const ship: Vec3 = [0, SEAT, 0]
    const vel = trenchGunFireVelocity(gun, ship)

    expect(vel[2], 'depth closes at the world scroll rate, not the muzzle creep').toBeCloseTo(TRENCH_SCROLL_SPEED, 5)
    expect(vel[2], 'i.e. far faster than the old bare muzzle speed').toBeGreaterThan(ENEMY_SHOT_SPEED * 5)

    const transit = (ship[2] - gun[2]) / TRENCH_SCROLL_SPEED
    const arrival = add(gun, scale(vel, transit)) // where the shot is when its depth reaches the cockpit plane
    expect(arrival[0], 'leads onto the ship x').toBeCloseTo(ship[0], 3)
    expect(arrival[1], 'leads onto the ship y').toBeCloseTo(ship[1], 3)
    expect(arrival[2], 'arrives exactly at the cockpit plane').toBeCloseTo(ship[2], 3)
  })

  it('a fired shot closes on the cockpit with the scroll, not its own muzzle creep', () => {
    // End to end: one incoming shot far downrange, dead-centre. After one step its
    // depth advances toward the cockpit by ~TRENCH_SCROLL_SPEED·dt (it rides the
    // world), NOT by ~ENEMY_SHOT_SPEED·dt (~5 u), which is what left it behind before.
    const view: Vec3 = [0, SEAT, 0]
    const z0 = -5000
    const s0: GameState = { ...bareTrench(view), enemyShots: [shotAt([0, SEAT, z0], view)] }
    const s1 = stepGame(s0, NO_INPUT, DT)

    expect(s1.enemyShots.length, 'the far shot is still alive').toBe(1)
    const dz = s1.enemyShots[0].pos[2] - z0 // > 0 means it moved toward the cockpit (z→0)
    expect(dz, 'the shot advances toward the cockpit with the scroll').toBeGreaterThan(TRENCH_SCROLL_SPEED * DT * 0.8)
    expect(dz, 'i.e. far faster than its own muzzle creep — it is NOT left behind').toBeGreaterThan(ENEMY_SHOT_SPEED * DT * 5)
  })

  it('a dead-on shot that crosses the cockpit plane in one step still HITS (no tunnelling)', () => {
    // At scroll speed the shot leaps ~262 u/frame — more than the 160 u diameter of the
    // radius-80 cockpit sphere. A plain point-in-sphere test would let a dead-on shot
    // jump clean over the cockpit between frames and never register. Seated at z ≈ -150
    // it is >80 from the cockpit now and >80 past it next frame, so only a SWEPT test
    // over the segment catches it.
    const view: Vec3 = [0, SEAT, 0]
    const s0: GameState = { ...bareTrench(view), enemyShots: [shotAt([0, SEAT, -150], view)] }
    const s1 = stepGame(s0, NO_INPUT, DT)

    expect(
      s1.events.some((e) => e.type === 'player-death'),
      'the dead-on incoming shot reaches the cockpit and is registered as a hit',
    ).toBe(true)
    expect(s1.enemyShots.length, 'and is consumed, not left to sail past the cockpit').toBe(0)
  })
})
