// tests/core/surface-fire-scroll-carry.test.ts
//
// Story sw10-2 — RED. The SURFACE twin of the shipped trench fix
// (tests/core/trench-fire-scroll-carry.test.ts, PR #125), and the 2026-08-08
// projection audit's own §7 open item ("Surface turret fire uses the same shared
// advance() path — worth checking it rides surfaceScrollZ the same way").
//
// == THE BUG ==================================================================
//
// The surface phase models the pilot's forward flight as the ground scrolling toward a
// (near-)fixed cockpit: the WHOLE field rides `surfaceScrollZ` — every tower/bunker gets
// `pos.x -= scrollSpeed·dt` each frame (sim.ts stepSurface, the `scrolled` map). That
// scroll is FAST and ACCELERATING — SURFACE_SEED_SPEED (0x100·TICK_HZ ≈ 5,250 u/s) ramping
// to SURFACE_MAX_SPEED (0x400·TICK_HZ ≈ 21,000 u/s).
//
// The turret fire does NOT ride it. A tower fires a fireball at a bare ENEMY_SHOT_SPEED
// (300 u/s) straight at the ship (sim.ts, the surface fire block). So the shot creeps at
// ~300 u/s while the world — the very tower that fired it — rushes past 17-70× faster. The
// player outruns the bullet and it reads on screen as receding downrange: the exact
// frame-consistency defect the trench had before it was taught to ride the scroll.
//
// == THE FIX (mirrors gameRules.trenchGunFireVelocity) ========================
//
// The shot's DEPTH velocity IS the scroll (negative — closing on the cockpit with the world,
// not at its own muzzle creep), and its right/up components LEAD the ship: sized so the shot
// arrives at the ship's y/z at the same instant its depth reaches the cockpit plane. The one
// difference from the trench: TRENCH_SCROLL_SPEED is a constant, but the surface scroll RAMPS,
// so the surface fire velocity must key off THIS FRAME's `scrollSpeed` (== the state's
// `surfaceScrollSpeed` after the step), not a fixed constant.
//
// Because that closing is fast (up to SURFACE_MAX_SPEED/60 ≈ 350 u/frame >> the 160 u cockpit
// diameter), the surface cockpit hit must become a SWEPT test over the shot's per-frame step
// (as the trench's did, gameRules.sweptCollides) — a point-in-sphere test lets a dead-on shot
// leap clean over the cockpit between frames. See the third test.
//
// == COUPLED EXISTING TESTS (updated in the same RED) =========================
//
// Two tests pinned the OLD straight-at-ship velocity and are moved onto this contract, keeping
// their surviving intent (the fire targets the flying ship, launched from the cap):
//   * surface-aim-wysiwyg.test.ts — "aims a tower fireball at the ship point, not at the origin"
//   * hitscan-laser.test.ts       — "the fireball still launches from the tower cap and flies AT the ship"

import { describe, it, expect } from 'vitest'
import { stepGame, enterPhase, surfaceShip } from '../../src/core/sim'
import {
  initialState,
  ENEMY_SHOT_SPEED,
  SURFACE_MAX_SPEED,
  MAX_SKIM_ALTITUDE,
  COCKPIT_HIT_RADIUS,
  type GameState,
} from '../../src/core/state'
import { eyeOf } from '../support/aim'
import { add, scale, type Vec3 } from '@shared/math3d'
import type { Input } from '../../src/core/input'

const DT = 1 / 60
const ASPECT = 16 / 9

/** A surface run with an EMPTY, already-laid maze (`surfaceMazeLaid: true`), so each test faces
 *  only the objects it injects — no `mazeForWave` field laid over the fixture. */
const surface = (over: Partial<GameState> = {}): GameState => ({
  ...enterPhase(initialState(1983), 'surface'),
  mode: 'playing',
  turrets: [],
  surfaceMazeLaid: true,
  projectiles: [],
  enemyShots: [],
  fireCooldown: 0,
  ...over,
})

/** Yoke at rest, trigger up — the player does nothing; we are watching the maze's fire. A level
 *  stick is the one input under which altitude cannot change mid-step, so the frame's ship point
 *  is stable (see surface-aim-wysiwyg's note on why that matters). */
const idle = (over: Partial<Input> = {}): Input => ({ aimX: 0, aimY: 0, fire: false, aspect: ASPECT, ...over })

/** Fire one armed tower this frame. `age` long past TOWER_FIRE_GRACE, cooldown expired, so
 *  `armed[nextInt(rng, 1)]` is deterministic and exactly one shot spawns. */
function towerFires(tower: Vec3, altitude = MAX_SKIM_ALTITUDE): GameState {
  return stepGame(
    surface({ altitude, turrets: [{ pos: [...tower] as Vec3, age: 10 }], enemyFireCooldown: 0 }),
    idle(),
    DT,
  )
}

describe('sw10-2 — surface turret fire rides surfaceScrollZ (the bullets must not outrun the player)', () => {
  it('the fired shot closes in depth at the WORLD scroll rate, not its own ~300 u/s muzzle creep', () => {
    // A tower dead ahead, downrange. Before the fix its shot leaves at ENEMY_SHOT_SPEED aimed at
    // the ship, so |vel.x| <= 300 — slower than the field it was fired from. After: the depth
    // component IS this frame's scroll (negative), so it closes WITH the tower that fired it.
    const s = towerFires([5000, 0, 0]) // native [depth, right, up]
    expect(s.enemyShots, 'the armed tower fires exactly one shot').toHaveLength(1)

    const vel = s.enemyShots[0].vel
    expect(vel[0], 'depth closes at the surface scroll rate this frame, not the muzzle creep').toBeCloseTo(
      -s.surfaceScrollSpeed,
      2,
    )
    expect(Math.abs(vel[0]), 'i.e. far faster than the old bare muzzle speed').toBeGreaterThan(ENEMY_SHOT_SPEED * 5)
  })

  it('leads the ship: an off-axis tower shot arrives ON the pilot as its depth reaches the cockpit plane', () => {
    // The point of riding the scroll: an off-wall gun must still HIT a pilot who is not dead ahead.
    // Fire from downrange AND well off to the right; integrating the whole velocity for the transit
    // time (depth / scroll) must land the shot on the ship's right/up — a lead, not a straight aim.
    const s = towerFires([5000, 900, 0]) // downrange and 900 to the right
    expect(s.enemyShots).toHaveLength(1)

    const shot = s.enemyShots[0]
    const ship = eyeOf(s) // the flown ship point the maze lays its fire on
    const transit = shot.pos[0] / s.surfaceScrollSpeed // time to ride the scroll to the cockpit plane
    const arrival = add(shot.pos, scale(shot.vel, transit))

    expect(arrival[0], 'arrives exactly at the cockpit plane (depth 0)').toBeCloseTo(ship[0], 1)
    expect(arrival[1], 'leads onto the ship right').toBeCloseTo(ship[1], 1)
    expect(arrival[2], 'leads onto the ship up').toBeCloseTo(ship[2], 1)
    // The lead is doing real work — the muzzle really is well off the ship's line.
    expect(Math.abs(shot.pos[1] - ship[1]), 'the tower is genuinely off to the side').toBeGreaterThan(200)
  })

  it('a dead-on incoming shot that crosses the cockpit plane in one step still HITS (swept, no tunnelling)', () => {
    // At scroll speed a shot leaps ~350 u/frame — more than the 160 u diameter of the radius-80
    // cockpit sphere. A plain point-in-sphere test lets a dead-on shot jump clean over the cockpit
    // between frames and never register. Seated just downrange (150) it is >80 from the cockpit now
    // and >80 past it next frame, so only a SWEPT test over the segment catches it.
    const ship = surfaceShip(MAX_SKIM_ALTITUDE) // at the ceiling the flown altitude clamps, so this IS the hit centre
    const s0 = surface({
      altitude: MAX_SKIM_ALTITUDE,
      enemyShots: [{ pos: [150, ship[1], ship[2]], vel: [-SURFACE_MAX_SPEED, 0, 0], ttl: 5 }], // native depth-first, dead-on
    })
    const s = stepGame(s0, idle(), DT)

    expect(
      s.events.some((e) => e.type === 'player-death' && e.cause === 'turret'),
      'the dead-on incoming shot reaches the cockpit and is registered as a turret hit',
    ).toBe(true)
    expect(s.enemyShots.length, 'and is consumed, not left to sail past the cockpit').toBe(0)

    // The fixture must genuinely tunnel a point test, or it proves nothing about SWEPT.
    const leap = SURFACE_MAX_SPEED * DT
    expect(leap, 'the per-frame leap really does exceed the cockpit diameter').toBeGreaterThan(COCKPIT_HIT_RADIUS * 2)
  })
})
