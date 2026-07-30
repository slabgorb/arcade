// tests/core/enemy-tread-counter.test.ts
//
// Story bz4-3 — RED phase (O'Brien / TEA). AC-1: the enemy tank's tread
// animation counter must be tied to the tank's own MOVEMENT, not a free-running
// clock.
//
// WHAT THIS STORY CHANGES (vs bz3-12)
//   bz3-12 shipped the animated treads driven off the free-running game
//   `frameCount` (main.ts passes `treadCounter: game.frameCount`) as a
//   documented deviation: the near tread rolls continuously while the tank is
//   alive, INCLUDING while it sits still, and never reverses. The ROM instead
//   steps a PER-OBJECT counter TRDCTR off the tank's forward/reverse decision:
//
//     BZONE.MAC:2669  M.F:  JSR M.FOR      ; FORWARD
//                           INC ZX,TRDCTR  ; forward motion advances the tread
//     BZONE.MAC:2673  M.R:  JSR M.REV      ; REVERSE
//                           DEC ZX,TRDCTR  ; reverse motion runs it BACKWARD
//
//   The movement dispatch (MTAB, BZONE.MAC:2651) routes every forward variant
//   (M.FF full-forward, M.F forward, M.LTF/M.RTF turn-while-forward) through
//   M.F -> INC, and every reverse variant through M.R -> DEC. Pure pivots
//   (M.PL/M.PR) and the stationary/illegal cases (M.STOP) touch TRDCTR at all —
//   so a tank that holds still FREEZES its tread frame. `ZX,TRDCTR` is indexed
//   by the object register, i.e. the counter is PER-HOSTILE, not one shared
//   clock (verified against ~/Projects/battlezone-source-text/BZONE.MAC).
//
//   The pure frame-SELECT function (`scene.treadFrame`, `TRDCTR & 3`) is already
//   byte-exact from bz3-12 — including the `treadFrame(-1) === treadFrame(3)`
//   negative-wrap that a reversing counter needs — so THIS story does not touch
//   the cadence/geometry; it only changes the SOURCE of the counter from the
//   free-running `frameCount` to a movement-derived per-hostile field.
//
// THE CORE CONTRACT (for Julia / DEV)
//   `stepEnemies` must carry a numeric per-hostile tread counter on `Hostile`
//   (suggested `Hostile.treadCounter`) that:
//     * INCREASES while the tank advances (net-forward treads),
//     * stays FROZEN while the tank holds still (no translation),
//     * DECREASES while the tank reverses (net-reverse treads),
//   threaded through every `Hostile` rebuild (and seeded at spawn / in
//   `initEnemies`). main.ts then passes `treadCounter: hostile.treadCounter` in
//   place of today's `game.frameCount`. This suite pins the SIGN of the delta
//   and the freeze — NOT the exact per-frame magnitude — so Dev keeps the
//   freedom to INC/DEC per game-frame or per sub-step (the ROM's ±1/game-frame
//   cadence is out of scope: "rate and period are already byte-exact").
//
// The `treadCounter` field does not exist on `Hostile` yet, so it is read via a
// cast (`treadOf`) and seeded via a cast (`withTread`) — the RED file typechecks
// (`tsc --noEmit`) before GREEN, and asserts the ACTUAL movement relationship so
// the failures are "no movement-tied counter", never a vacuous pass.

import { describe, it, expect } from 'vitest'
import type { TankPose } from '../../src/core/camera'
import { stepEnemies, type EnemyState, type Hostile } from '../../src/core/enemies'
import { initGame, type GameState } from '../../src/core/state'
import { stepGame } from '../../src/core/sim'
import { NO_INPUT } from '../../src/core/input'

const DT = 1 / 60

/** Open ground, far from all 21 obstacles (|coords| <= ~46k) — unobstructed. */
const PLAYER: TankPose = { x: 200_000, z: 200_000, heading: 0 }

/** ROM heading convention: 0 faces +Z, increasing turns toward +X. */
function bearingTo(x: number, z: number, to: TankPose): number {
  return Math.atan2(to.x - x, to.z - z)
}
function distTo(h: { x: number; z: number }, to: TankPose): number {
  return Math.hypot(to.x - h.x, to.z - h.z)
}

/**
 * Read the movement-tied tread counter this story adds to `Hostile`. Cast so the
 * file typechecks before the field exists; `undefined` (today) makes every
 * assertion below fail for the intended reason — no movement-tied counter yet.
 */
const treadOf = (h: Hostile): number | undefined =>
  (h as { readonly treadCounter?: number }).treadCounter

/** Seed a hostile with an explicit starting tread counter (cast to allow the
 *  not-yet-added field under `tsc --noEmit`). A non-zero seed makes the FREEZE
 *  assertion non-vacuous — a frozen counter must stay at the seed, not read 0. */
function withTread(h: Hostile, treadCounter: number): Hostile {
  return { ...h, treadCounter } as Hostile & { readonly treadCounter: number }
}

function stateWith(hostile: Hostile): EnemyState {
  return { hostile, shell: null, rng: 0x1234_abcd, missilesLaunched: 0 }
}

/** Run the enemy sim `steps` frames of movement, no player shell. */
function run(state: EnemyState, steps: number): EnemyState {
  let s = state
  for (let i = 0; i < steps; i++) s = stepEnemies(s, PLAYER, null, DT).state
  return s
}

const SEED_COUNT = 5 // arbitrary non-zero start for the tread counter
const STEPS = 15

// A settled (past fire-grace) alive slow tank, barrel aimed straight at the
// player, LOCKED in charge with a long moveCounter so it never re-picks a goal
// mid-run — the movement is a clean function of the geometry we set.
function chargingTank(x: number, z: number): Hostile {
  return {
    x, z, heading: bearingTo(x, z, PLAYER),
    kind: 'tank', phase: 'alive', phaseAge: 5,
    goal: 'charge', moveCounter: 100,
  }
}

// =============================================================================
// AC-1 — the tread counter is TIED TO MOVEMENT (INC fwd / freeze still / DEC rev)
// =============================================================================
describe('bz4-3 AC-1 — movement-tied tread counter (TRDCTR INC/DEC, BZONE.MAC:2669/2673)', () => {
  it('ADVANCES (INC) while the tank drives forward (BZONE.MAC:2669)', () => {
    // 20k out, aligned, outside the standoff → the charging tank closes the gap.
    const start = withTread(chargingTank(PLAYER.x, PLAYER.z - 20_000), SEED_COUNT)
    const after = run(stateWith(start), STEPS).hostile

    // Guard: the tank actually moved forward (closer) — no vacuous freeze.
    expect(distTo(after, PLAYER)).toBeLessThan(distTo(start, PLAYER))

    const c = treadOf(after)
    expect(c, 'stepEnemies must produce a numeric per-hostile tread counter').toBeTypeOf('number')
    expect(c as number).toBeGreaterThan(SEED_COUNT) // INC on forward motion
  })

  it('FREEZES while the tank holds still (no INC/DEC when stationary — the bz3-12 discriminator)', () => {
    // Inside the standoff (500 < ~1280) and aligned → the AI commands zero
    // translation, so the tank does not move and the tread must NOT advance.
    // bz3-12's free-running `frameCount` would keep rolling here.
    const start = withTread(chargingTank(PLAYER.x, PLAYER.z - 500), SEED_COUNT)
    const after = run(stateWith(start), STEPS).hostile

    // Guard: the tank genuinely did not translate (exact no-op, stepTank v=0).
    expect(after.x).toBe(start.x)
    expect(after.z).toBe(start.z)

    const c = treadOf(after)
    expect(c, 'a stationary tank must carry a defined, frozen tread counter').toBeTypeOf('number')
    expect(c).toBe(SEED_COUNT) // frozen at the seed — not advanced, not reset to 0
  })

  it('RUNS BACKWARD (DEC) while the tank reverses (BZONE.MAC:2673)', () => {
    // A reversing tank (post-collision back-off) with its goal aligned to its
    // heading so it backs straight out — net-reverse treads → DEC.
    const base = chargingTank(PLAYER.x, PLAYER.z - 20_000)
    const start = withTread(
      { ...base, goal: 'wander', turnTo: base.heading, reversing: 3.0 },
      SEED_COUNT,
    )
    const after = run(stateWith(start), STEPS).hostile

    // Guard: the tank actually backed AWAY from the player.
    expect(distTo(after, PLAYER)).toBeGreaterThan(distTo(start, PLAYER))

    const c = treadOf(after)
    expect(c, 'a reversing tank must carry a defined tread counter').toBeTypeOf('number')
    expect(c as number).toBeLessThan(SEED_COUNT) // DEC on reverse motion
  })

  it('is PER-HOSTILE, derived from each tank\'s OWN motion — not one shared clock', () => {
    // Two tanks stepped the SAME number of frames but moving differently: one
    // charges forward, one holds still. A single shared frame counter (bz3-12's
    // `game.frameCount`) would tie their tread frames identically; a per-object
    // TRDCTR (ZX-indexed, BZONE.MAC:2669) diverges with the motion.
    const mover = withTread(chargingTank(PLAYER.x, PLAYER.z - 20_000), SEED_COUNT)
    const holder = withTread(chargingTank(PLAYER.x, PLAYER.z - 500), SEED_COUNT)

    const movedCount = treadOf(run(stateWith(mover), STEPS).hostile)
    const heldCount = treadOf(run(stateWith(holder), STEPS).hostile)

    expect(movedCount, 'the moving tank must carry a numeric tread counter').toBeTypeOf('number')
    expect(heldCount, 'the still tank must carry a numeric tread counter').toBeTypeOf('number')
    // Same frame budget, different motion → different tread counters.
    expect(movedCount).not.toBe(heldCount)
  })
})

// =============================================================================
// AC-1 CADENCE GUARD — the MOVING tread runs at the 15.625 Hz GAME-FRAME clock,
// not the 60 Hz shell sub-step (Reviewer MEDIUM, session Delivery Findings).
// =============================================================================
//
// bz3-12 drove the treads off `game.frameCount`, which ticks ONLY at the ROM's
// 15.625 Hz / 64 ms game-frame boundary — inside sim.ts's `advanceRadar`
// remainder-clock loop (sim.ts:336-343; the C-001 warning at :316-320 is exactly
// "do NOT tick this on the ~60 Hz render sub-step"). bz4-3 rightly made the tread
// MOVEMENT-tied, but Dev steps `Hostile.treadCounter` ±1 per `stepEnemies` call —
// and `stepGame → stepBattle → stepEnemies` runs on EVERY 1/60 s shell sub-step.
// So the moving tread now advances ~4× too fast (60 Hz vs ~15.625 Hz), an
// unpinned ROM-fidelity regression. The story's premise is "tread rate/period
// stay byte-exact; only the movement COUPLING changes", so the moving-tread rate
// must match the game-frame cadence, NOT the sub-step rate.
//
// The four tests above (`stepEnemies` directly) pin only the SIGN of the delta
// (INC/freeze/DEC), deliberately leaving magnitude free — so they stay green
// under EITHER cadence and cannot catch this. This guard closes that gap by
// driving the PUBLIC sim entry (`stepGame`/`initGame`, the same real-time →
// sub-step path the shell uses) across an interval spanning K whole game frames
// of continuous forward drive, and pinning the tread delta to the `frameCount`
// delta over that SAME interval — i.e. onto the game-frame clock itself, not a
// hand-picked K. RED today: the tread advances by the sub-step count (~4K).
describe('bz4-3 AC-1 cadence — moving tread is on the GAME-FRAME clock (Reviewer MEDIUM)', () => {
  it('advances by the game-frame count (== frameCount delta), NOT the 60 Hz sub-step count', () => {
    // 1 s of wall-clock at the shell's fixed 1/60 s sub-step = 60 stepEnemies
    // calls but only floor(1 s × 15.625 Hz) = 15 whole 64 ms game frames.
    const SUBSTEPS = 60

    // A charging tank 20k out, aligned, LOCKED in charge (long moveCounter) so it
    // drives straight forward every sub-step. phaseAge 0 keeps it UNDER
    // SPAWN_FIRE_GRACE (2 s) for the whole 1 s run, so it never fires → no
    // player-hit → no respawn resetting the sim's clocks mid-interval (a clean,
    // forward-only window where game-frame and sub-step cadence are the only
    // difference the counter can express).
    const moving = withTread({ ...chargingTank(PLAYER.x, PLAYER.z - 20_000), phaseAge: 0 }, 0)
    const boot = initGame(0x1234_abcd)
    let game: GameState = {
      ...boot,
      mode: 'playing',
      player: PLAYER,
      enemies: { ...boot.enemies, hostile: moving },
    }

    const startFrame = game.frameCount
    const startTread = treadOf(game.enemies.hostile)
    const startDist = distTo(game.enemies.hostile, PLAYER)

    for (let i = 0; i < SUBSTEPS; i++) game = stepGame(game, NO_INPUT, DT)

    const hostile = game.enemies.hostile
    const frameDelta = game.frameCount - startFrame
    const treadNow = treadOf(hostile)

    // Guards — this really is the clean forward-only interval the pin assumes:
    expect(startTread, 'the moving tank starts with a numeric tread counter').toBeTypeOf('number')
    expect(treadNow, 'the moving tank must carry a numeric tread counter').toBeTypeOf('number')
    expect(hostile.phase, 'the tank must survive the whole run (never killed)').toBe('alive')
    expect(game.lives, 'no shot fired → no player-hit/respawn to reset the clock').toBe(boot.lives)
    expect(distTo(hostile, PLAYER), 'the tank genuinely drove FORWARD the whole interval')
      .toBeLessThan(startDist)
    // The interval spanned several whole game frames AND many more sub-steps —
    // so "game-frame cadence" and "sub-step cadence" are materially different
    // clocks here (this is what makes the pin below a real discriminator, not a
    // tautology): 60 sub-steps → 15 game frames.
    expect(frameDelta, 'the run must span multiple 15.625 Hz game frames').toBeGreaterThan(1)
    expect(SUBSTEPS, 'sub-steps must far outnumber game frames (the ~4× the bug adds)')
      .toBeGreaterThanOrEqual(frameDelta * 3)

    const treadDelta = (treadNow as number) - (startTread as number)
    // THE PIN: the moving tread advanced by the number of GAME FRAMES that
    // elapsed — the same 15.625 Hz clock `frameCount` rides (bz3-12's tread
    // source) — not by the number of 60 Hz sub-steps. RED today: `treadCounter`
    // steps once per `stepEnemies` sub-step, so treadDelta ≈ 4 × frameDelta.
    expect(treadDelta).toBe(frameDelta)
  })
})
