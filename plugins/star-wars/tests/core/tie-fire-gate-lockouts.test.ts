// tests/core/tie-fire-gate-lockouts.test.ts
//
// sw8-16 — the two UNPINNED conditions of the §6 TIE fire gate.
//
// The ROM gate is the run at WSCPU.MAC 140$ (:622-633) and tests exactly four
// things: C$PV (player can see the alien), C$T9 (the AIM_AHEAD maneuver
// lockout, A$CHTW bit $40), the $800 "not too close" floor, and A$GLW
// ("glowing from a hit"). Two of the four were already pinned when sw8-9
// rebuilt the gate — deleting the C$PV term reds tie-fire-visibility.test.ts,
// deleting the floor reds the world-metric suite — but the sw8-9 review
// mutation-proved the other two are NOT: hardwiring `aimingAhead = false` or
// `notHit = true` in sim.ts each left the whole suite green. This file closes
// that hole, one describe per lockout.
//
// Every fixture below holds the OTHER three gate terms open — parked dead
// ahead at z = -4000 (inside the C_PV pyramid, beyond the $800 floor) with
// `move: 0` so nothing translates — so the one term under test is the only
// thing that can silence the guns. Each lockout arm is paired with a control
// arm identical except for that term, which is what makes a hardwired-constant
// mutation red: the constant cannot satisfy both arms.
//
// The sacred boundary holds: no DOM, no time except `dt`, no randomness except
// the seeded RNG carried in state.

import { describe, it, expect } from 'vitest'
import { stepGame } from '../../src/core/sim'
import { initialState, TICK_HZ, TIE_NEAR_BOUND, type GameState, type Enemy } from '../../src/core/state'
import { NO_INPUT } from '../../src/core/input'
import { Twist, type ChoreoVm } from '../../src/core/tie-vm'
import { length, type Vec3 } from '@shared/math3d'
import { makeTie, lookAtOrigin } from './helpers/space'

/** One whole game frame of dt — exactly one decision tick per `stepGame`. */
const TICK_DT = 1 / TICK_HZ

/** Dead ahead of the cockpit: inside the view pyramid, well past the $800 floor. */
const POST: Vec3 = [0, 0, -4000]

/** A VM mid-maneuver: `waitFrames` far beyond any run below, so `tickChoreo`
 *  only counts down (tie-vm.ts CHTW.E path) and the twist bits hold for the
 *  whole measurement — the program under `pc` is never consulted. */
function holdingTwist(twist: number): ChoreoVm {
  return { pc: 0, savedPc: -1, waitFrames: 1e9, twist, move: 0, untilMask: 0 }
}

/** A wave-1 space state (mask 0x0F, threshold 0x80 — ~50% of open windows
 *  fire) carrying exactly one fighter. Spawner parked and lives banked so the
 *  lone fixture is the only shooter and its homing fireballs never end the
 *  run mid-measurement. `phaseTime: 0` undoes wave 1's 1.95 s head start on
 *  the PH.TIM clock: the PH$SP2 warp ends space at 21 s (sw8-11), so a zeroed
 *  clock gives a 420-frame budget — every run below stays at ≤ 380 frames. */
function spaceWith(tie: Enemy, seed = 1983): GameState {
  return { ...initialState(seed), wave: 1, enemies: [tie], spawnTimer: 1e9, lives: 999, phaseTime: 0 }
}

/** The longest measurement any test below takes — inside the 420-frame phase
 *  budget, and long enough that a gate-open fighter statistically cannot stay
 *  silent (≈23 open cadence windows at mask 0x0F, ~50% each). */
const RUN_FRAMES = 380

/** Step `n` whole game frames; return the 1-based step indices on which an
 *  `enemy-fire` event fired, plus the final state for fixture-integrity checks. */
function run(state: GameState, n: number): { fires: number[]; final: GameState } {
  const fires: number[] = []
  let s = state
  for (let i = 1; i <= n; i++) {
    s = stepGame(s, NO_INPUT, TICK_DT)
    if (s.events.some((e) => e.type === 'enemy-fire')) fires.push(i)
  }
  return { fires, final: s }
}

/** The silence must come from the term under test, not from the fixture
 *  quietly leaving the measurement: still IN the space phase (the PH$SP2 warp
 *  clears the enemies array wholesale — a phase-out would otherwise read as
 *  lockout silence), still exactly one fighter, still at the parked post (in
 *  view), still beyond the $800 floor. */
function expectStillAtPost(final: GameState): void {
  expect(final.phase).toBe('space')
  expect(final.enemies).toHaveLength(1)
  expect(final.enemies[0].pos).toEqual(POST)
  expect(length(final.enemies[0].pos)).toBeGreaterThan(TIE_NEAR_BOUND)
}

describe('TIE fire gate — the C$T9 AIM_AHEAD lockout (WSCPU.MAC:627-628)', () => {
  it('a fighter mid-AIM_AHEAD maneuver never fires', () => {
    const tie = makeTie({ pos: POST, orient: lookAtOrigin(POST), vm: holdingTwist(Twist.AIM_AHEAD) })
    const { fires, final } = run(spaceWith(tie), RUN_FRAMES)
    expect(fires).toEqual([])
    expectStillAtPost(final)
    // The lockout was ACTIVE the whole run: the countdown path holds twist
    // verbatim, and it is still set on the surviving VM.
    expect((final.enemies[0].vm?.twist ?? 0) & Twist.AIM_AHEAD).toBe(Twist.AIM_AHEAD)
  })

  it('CONTROL: the same fighter mid-AIM_PLAYER fires — the lockout is bit $40 alone', () => {
    // AIM_PLAYER ($80) drives the IDENTICAL aimOrient steer as AIM_AHEAD, so
    // the two arms differ in nothing but WHICH twist bit is set. The ROM locks
    // out only C$T9 ($40): an aim-at-the-player fighter shoots. This is what
    // reds `aimingAhead = false` (arm 1 fires) without letting an over-broad
    // `twist & (AIM_PLAYER|AIM_AHEAD)` reading sneak through (this arm silent).
    const tie = makeTie({ pos: POST, orient: lookAtOrigin(POST), vm: holdingTwist(Twist.AIM_PLAYER) })
    const { fires, final } = run(spaceWith(tie), RUN_FRAMES)
    expect(fires.length).toBeGreaterThan(0)
    expectStillAtPost(final)
  })
})

describe('TIE fire gate — the A$GLW glow lockout (WSCPU.MAC:631-632)', () => {
  it('a glowing just-hit fighter never fires while the glow window is open', () => {
    // Darth is the fighter that actually glows in play (sim.ts re-arms `glow`
    // on every scored hit); 9999 s cannot decay within the run.
    const tie = makeTie({ pos: POST, orient: lookAtOrigin(POST), kind: 'darth', glow: 9999 })
    const { fires, final } = run(spaceWith(tie), RUN_FRAMES)
    expect(fires).toEqual([])
    expectStillAtPost(final)
    expect(final.enemies[0].glow ?? 0).toBeGreaterThan(0) // window still open at the end
  })

  it('CONTROL: the same fighter with the glow expired fires', () => {
    const tie = makeTie({ pos: POST, orient: lookAtOrigin(POST), kind: 'darth', glow: 0 })
    const { fires, final } = run(spaceWith(tie), RUN_FRAMES)
    expect(fires.length).toBeGreaterThan(0)
    expectStillAtPost(final)
  })

  it('the lockout is a WINDOW, not a latch: fire resumes once the glow decays', () => {
    // 4 s of glow = 80 game frames at TICK_HZ. The gate reads the INCOMING
    // glow (the decision tick runs before the decay map), so steps 1..80 are
    // blocked and step 81 is the first eligible tick. Assert around that
    // boundary tolerantly — the exact resume step belongs to the mask + PRNG.
    const GLOW_SECONDS = 4
    const blockedFrames = GLOW_SECONDS * TICK_HZ
    const tie = makeTie({ pos: POST, orient: lookAtOrigin(POST), kind: 'darth', glow: GLOW_SECONDS })
    const { fires } = run(spaceWith(tie), RUN_FRAMES)
    expect(fires.length).toBeGreaterThan(0) // it DID resume
    expect(Math.min(...fires)).toBeGreaterThan(blockedFrames) // and never fired while glowing
  })
})
