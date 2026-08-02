// tests/core/space-eye-is-cockpit.test.ts
//
// sw8-2 AC9/AC11, re-pinned by sw8-8 — the space eye IS the cockpit, so incoming fire stays
// answerable all the way in.
//
// This file was RETIRED:`bounded-eye-combat.test.ts` (the `RETIRED:` marker tells the
// comment-citation guard this name is a historical record, not a live reference). It asserted that sw8-1's MOVING space camera stayed
// BOUNDED (`|eye| < 33,000`, the ROM ST.UX 16-bit range) so that combat at a FIXED depth stayed
// inside the yoke's reach. sw8-8 retired that camera outright — `ST.UX` is the starfield's
// register, never a camera (its only CONSUMER in the 1983 tree is the star generator, `WSSTAR.MAC:98`
// `LDD ST.UX ;STARS RELATIVE MOVEMENT`; the full case is the tombstone in `src/core/gameRules.ts`).
//
// WHY IT HAD TO BE REWRITTEN, NOT LEFT GREEN. Two reasons, and the second is the serious one.
//
// 1. Its premise is gone. `cameraView`'s space arm now returns the cockpit constant, so `eyeOf(s)`
//    is `[0,0,0]` for every fixture still in SPACE — including the `frame: 50_000` state built
//    specifically to exercise drift. (The old `advance(…, 1600)` fixture had stopped measuring
//    space at all: sw8-11 made the phase TIME-boxed, so by frame 1,600 it was in the TRENCH and
//    `eyeOf` read `[0, 768, 0]` — see the advance() doc below.) Its last assertion reduced to
//    `Math.hypot(0,0,0) < 33_000`. It could not fail under any regression, while its name and
//    header advertised it as the guard for this very invariant.
//
// 2. Fixed-depth reachability was never the property that matters, which is how sw8-2 shipped
//    believing fire fairness was solved. `aimAt` divides lateral offset by remaining DEPTH. Hold
//    the depth at 8,000 and an eye offset of a couple of thousand units is a small angle; let the
//    shot CLOSE and the same offset diverges without bound as depth → 0. Any non-zero eye offset,
//    bounded or not, therefore blinds the pilot on the final approach — the defect sw8-8 measured
//    (0 % of flights reachable at impact) and the reason bounding the eye could not have fixed it.
//
// WHAT IT PINS NOW. The cockpit-coincidence itself, exactly (so it can fail again), and
// reachability through IMPACT rather than at a convenient range. Both bite on any re-derived eye,
// however small or however tightly wrapped — which is what makes this a tripwire rather than
// scenery.
//
// SCOPE. This suite is deterministic geometry: a hand-placed shot, arbitrary frame counters, no
// TIEs. Its sibling `tests/core/incoming-fire-reaction-window.test.ts` (sw8-8) measures the same
// property in live fire across seeded waves, with the reaction window in seconds. Neither replaces
// the other: live fire never reaches frame 50,000, and this suite never proves a TIE actually
// shoots.
//
// SEAM-AGNOSTIC. `eyeOf(s)` recovers the eye the shell's camera actually builds (it inverts
// `cameraView`), and `aimAt(target, eye)` inverts the SAME projection the crosshair is drawn
// under — so "reachable" here is literally "the yoke can point at it", not a formula retyped
// from render.ts.
//
// Sacred boundary: drives the public `stepGame`; no DOM, no time except `dt`, no randomness
// except the seeded RNG carried in state.

import { describe, it, expect } from 'vitest'
import { initialState, TICK_HZ, ENEMY_SHOT_TTL, type GameState } from '../../src/core/state'
import { stepGame } from '../../src/core/sim'
import { COCKPIT } from '../../src/core/gameRules'
import { NO_INPUT } from '../../src/core/input'
import { eyeOf, aimAt } from '../support/aim'
import { length, type Vec3 } from '@shared/math3d'

/** One whole game frame of dt — one decision tick per `stepGame`, so N steps advance the frame
 *  counter by ~N game frames. */
const TICK_DT = 1 / TICK_HZ

/** A live space scene with NO combatants — the fight is represented by fixed world positions or a
 *  hand-placed shot, so the run only advances `frame` without a TIE beelining the cockpit or a
 *  stray fireball draining the shield mid-measurement. `initialState` already opens in
 *  phase:'space' / mode:'playing' / frame:0. */
const spaceRun = (seed = 1983): GameState => ({
  ...initialState(seed),
  enemies: [],
  enemyShots: [],
  spawnTimer: 1e9,
  lives: 999,
})

/** Step the real sim `steps` game frames on neutral input and ASSERT the run is still in space.
 *
 *  The guard is not decoration. The suite this replaces stepped 1,600 frames here and called the
 *  result a long space run — but sw8-11 later made the space phase TIME-boxed (the PH.TIM clock,
 *  ~19 s ≈ 390 game frames), so by frame 1,600 the fixture was in the TRENCH and `eyeOf` was
 *  reading `[0, 768, 0]`, the trench seat. It measured the wrong camera and stayed green. Anything
 *  that needs a deep frame counter sets `frame` directly (DEEP_FRAME below) instead of playing to
 *  it, which is both honest and immune to the next phase-length change. */
function advance(s0: GameState, steps: number): GameState {
  let s = s0
  for (let i = 0; i < steps; i++) s = stepGame(s, NO_INPUT, TICK_DT)
  expect(s.phase, `fixture guard: ${steps} frames left the space phase`).toBe('space')
  return s
}

// Representative space-combat positions at a mid-approach range (TIEs close from
// TIE_SPAWN_DISTANCE = 31,744 toward the cockpit). At depth 8,000 the FOV envelope is
// depth·tan(30°) ≈ 4,600, which comfortably exceeds the ~3,078 eye_x the sw8-1 finding names as
// the close-TIE FOV edge.
const combatTie: Vec3 = [0, 0, -8000] // an approaching TIE dead ahead
const incomingFireball: Vec3 = [1200, 0, -8000] // an incoming fireball, off to one side

/** The longest run that stays inside the time-boxed space phase (sw8-11: ~19 s on the PH.TIM
 *  clock, ≈390 game frames). 300 frames ≈ 14.6 s of continuous flight. */
const SPACE_RUN_FRAMES = 300

/** A deep frame counter — past any wrap a re-derived ST.UX camera could apply, and unreachable by
 *  play now that the phase is time-boxed, which is why the live-fire sibling cannot cover it.
 *  sw8-1's retired `frame * 8` eye would sit at x ≈ 400,000 here: the whole origin-anchored fight
 *  a hundred FOV envelopes off the side of the screen. */
const DEEP_FRAME = 50_000

describe('sw8-8 — the space eye is the cockpit', () => {
  it('the eye IS the cockpit at every frame — fresh, after a long run, and at a deep frame', () => {
    // The tripwire, and the direct inversion of what this file used to assert. Stated as exact
    // equality, not a bound: sw8-2 pinned `|eye| < 33_000` and a ±2,048 wrapped eye satisfied that
    // while still blinding the pilot (below). There is no acceptable non-zero offset, so there is
    // no bound to tune — the eye either is the cockpit or the pilot is in two places at once.
    expect(eyeOf(spaceRun()), 'fresh space run').toEqual(COCKPIT)
    expect(
      eyeOf(advance(spaceRun(), SPACE_RUN_FRAMES)),
      `after ${SPACE_RUN_FRAMES} game frames of flight`,
    ).toEqual(COCKPIT)
    expect(eyeOf({ ...spaceRun(), frame: DEEP_FRAME }), `at frame ${DEEP_FRAME}`).toEqual(COCKPIT)
  })

  it('AC9 restated: a closing fireball stays aim-reachable on EVERY frame through impact', () => {
    // The assertion sw8-2 needed and did not have. Its version parked `incomingFireball` at a
    // fixed depth of 8,000 and asked whether the yoke could reach it there; a shot that never
    // closes cannot expose the divergence, because the blinding is `lateral / depth` with
    // depth → 0. Here the real `homeShots` law flies it in (7/8 per game frame toward the
    // cockpit) and every frame of the approach must be answerable.
    //
    // This fails for ANY non-zero eye offset — the smaller the offset the later the pilot goes
    // blind, but he always does, so no bound on a moving eye can make it pass. That is the whole
    // reason sw8-8 retired the camera instead of tightening sw8-2's bound.
    for (const frame of [0, DEEP_FRAME]) {
      let s: GameState = {
        ...spaceRun(),
        frame,
        enemyShots: [{ pos: incomingFireball, vel: [0, 0, 0], ttl: ENEMY_SHOT_TTL }],
      }
      let frames = 0
      let arrived = false
      while (s.enemyShots.length > 0 && s.phase === 'space') {
        const shot = s.enemyShots[0]
        expect(
          aimAt(shot.pos as Vec3, eyeOf(s)).reachable,
          `frame ${frame}: the fireball left the yoke's reach at range ` +
            `${length(shot.pos).toFixed(0)} (${frames} frames into its flight)`,
        ).toBe(true)
        frames++
        s = stepGame(s, NO_INPUT, TICK_DT)
        if (s.events.some((e) => e.type === 'player-death')) arrived = true
      }
      // The flight has to have actually ARRIVED, or "reachable throughout" is a statement about a
      // shot that expired harmlessly downrange. The hit is the sim's own verdict — the shot is
      // consumed by `collides(pos, ship, COCKPIT_HIT_RADIUS)`, so this cannot be satisfied by a
      // fireball that merely got close and timed out. ~35 frames at 7/8 decay, inside the 64-tick
      // life; `lives: 999` keeps the run alive so the assertion is about the flight, not the death.
      expect(arrived, `frame ${frame}: the fireball never reached the cockpit`).toBe(true)
    }
  })

  it('AC11: space combat at mid-approach range stays aim-reachable, however deep the frame', () => {
    // sw8-2's original observable, kept because it is the one this file was created to own: a
    // representative fight anchored on the ORIGIN (TIEs spawn origin-relative, `tie-waves.ts TBG`)
    // must stay inside the yoke's ±1 NDC clamp however long the cabinet has been running. Under
    // sw8-1's unbounded eye it did not — the eye slid past the FOV envelope and put the whole
    // fight off the side of the screen, the soft-lock the sw8-1 review found.
    for (const s of [advance(spaceRun(), SPACE_RUN_FRAMES), { ...spaceRun(), frame: DEEP_FRAME }]) {
      expect(aimAt(combatTie, eyeOf(s)).reachable, `a TIE dead ahead at frame ${s.frame}`).toBe(true)
      expect(
        aimAt(incomingFireball, eyeOf(s)).reachable,
        `an incoming fireball off to one side at frame ${s.frame}`,
      ).toBe(true)
    }
  })
})
