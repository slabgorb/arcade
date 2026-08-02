// tests/core/incoming-fire-reaction-window.test.ts
//
// sw8-8 RED — DOES THE INCOMING-FIRE REACTION WINDOW ACTUALLY EXIST?
//
// sw8-2 closed "fire fairness" (AC9) by pinning that incoming fire stays AIM-REACHABLE, and
// AC12 ruled that the fireball's homing target and the cockpit hit-test BOTH stay at the world
// ORIGIN, reconciled by BOUNDING the drifting space eye into [-2048, +2048) (`EYE_WRAP`,
// gameRules.ts `spaceEye`). A playtest during the sw8-4 investigation then reported an idle ship
// dying in under a second to a fireball, which is what this story exists to rule on.
//
// THE MEASUREMENT (sw8-8 AC1, taken on develop @ 9c6f19c under NO_INPUT, seeds 1983/1234/7/42/
// 99/31337) SPLITS THE COMPLAINT IN TWO, AND ONLY ONE HALF IS A DEFECT:
//
//   * Flight DURATION is fine. Spawn-to-impact measured 1.707 s – 2.194 s; the analytic floor
//     from the closest legal shot (a TIE may not fire inside TIE_NEAR_BOUND = $800 = 2048, and
//     the position decays 7/8 per game frame toward the cockpit hit sphere at 80) is
//     log(80/2048)/log(7/8) = 24.28 frames = 1.184 s. NOTHING arrives in under a second. The
//     literal "<1s" reading of the report is REFUTED — pinned as a control below so a future fix
//     cannot "solve" this story by slowing the fireball down.
//
//   * The ANSWERABLE window is the defect, and it is worse than "tight" — it is ABSENT exactly
//     where a human reacts. In 100 % of measured flights the fireball was aim-reachable ONLY in
//     the far part of its flight and went unreachable BEFORE impact. Measured reach ran 2 %–66 %
//     of flight life, with a BLIND TAIL of 0.731 s – 2.146 s immediately before the hit, and
//     `reachableAtImpact` was FALSE for every flight, every seed. The worst case was reachable
//     for a single 0.049 s frame and then blind for 2.146 s.
//
// THE CAUSE (counterfactual, same runs): re-measuring the identical flights from the world ORIGIN
// instead of from the eye gives 100 % reachability and `reachableAtImpact === true` for every one.
// So the fireball's own geometry is sound; the split between WHERE THE SHOT LANDS (the origin) and
// WHERE THE PILOT LOOKS AND SHOOTS FROM (`spaceEye`, up to 2048 off to one side) is the whole
// defect. `aimAt` divides the lateral offset by the remaining DEPTH, so as a shot decays toward
// the origin its depth goes to zero while its offset from the eye tends to the eye's own offset —
// the angle diverges and it necessarily swings off the side of the view in its final approach.
// `spaceEye`'s comment claims the ±2048 amplitude "stays well inside the space-combat FOV
// envelope, so combat stays reachable"; that reasoning holds for a TIE sitting at a fixed depth
// and FAILS for a shot closing to zero depth. ANY non-zero eye offset produces a blind tail —
// bounding it, as sw8-2 did, only changes how early the tail starts.
//
// WHY NO EXISTING SUITE CAUGHT IT: the sw8-2 AC9 reachability suite (deleted by sw8-8) checked
// a STATIC hand-placed position, `incomingFireball = [1200, 0, -8000]`, with `enemyShots: []` —
// a fireball that never closes. Reachability at a fixed depth is a strictly weaker property than
// reachability through impact, and the gap between them is this story.
//
// WHAT THESE TESTS PIN — the OBSERVABLE, not a mechanism. The split was closed by seating the
// pilot's eye, gun and hit sphere together at the cockpit; sw8-8 then retired the moving eye
// outright, so "seat the pilot at `spaceEye`" is no longer an available fix and the tombstone in
// gameRules.ts forbids reviving it. The two controls at the bottom still fence off the fixes that
// would pass by destroying something else: slowing the fireball, and — before the eye was retired
// — parking it.
//
// Sacred boundary: drives the public `stepGame`; no DOM, no time except `dt`, no randomness except
// the seeded RNG carried in state.

import { describe, it, expect } from 'vitest'
import { initialState, TICK_HZ, ENEMY_SHOT_TTL, type GameState } from '../../src/core/state'
import { stepGame } from '../../src/core/sim'
import { NO_INPUT } from '../../src/core/input'
import { eyeOf, aimAt } from '../support/aim'
import { length, normalize, type Vec3 } from '@shared/math3d'

/** One whole game frame of dt — one decision tick per `stepGame`. */
const TICK_DT = 1 / TICK_HZ

/** Seeds measured for AC1. Several are kept because the TIE fire gate is frame-driven and only
 *  the threshold roll is seeded, so different seeds surface different launch RANGES (7,864 →
 *  30,157) — and the defect must not depend on which one you happen to draw. */
const SEEDS = [1983, 7, 42] as const

/**
 * THE REACTION WINDOW. A window shorter than a human's ~250 ms simple reaction time cannot be
 * answered at all; half a second is the smallest span that leaves room to SEE the shot, move the
 * yoke onto it and pull. Pinned as a floor, not a target: the counterfactual above shows a
 * closed eye/cockpit split delivers reachability across the shot's WHOLE 1.7 s+ life, so this bar
 * is met with well over a second to spare and is not a tuning knob Dev has to hit precisely.
 */
const REACTION_SECONDS = 0.5

/**
 * The final-approach band for the live-fire test. Chosen by measurement, not by feel: inside 400
 * units a physically-possible yoke killed 0 fireballs and took 3/4/5 hits across the three seeds,
 * while the same runs aimed with an IMPOSSIBLE (unclamped) yoke killed every one and took none.
 * That is the cleanest separation of "the shot cannot be hit" from "the player cannot point at
 * it" the run offers.
 */
const FINAL_APPROACH_UNITS = 400

/** A physical yoke maps the pointer across the canvas rect into [-1, +1] (`src/shell/input.ts`),
 *  so aim outside that range is not a harder shot — it is an input the hardware cannot produce. */
const clampYoke = (v: number) => Math.max(-1, Math.min(1, v))

/** A live space run with the shield stack deepened so the phase plays out instead of ending on a
 *  death — only the fireballs under measurement are of interest. `initialState` already opens in
 *  phase 'space' / mode 'playing' / frame 0. */
const spaceRun = (seed: number): GameState => ({ ...initialState(seed), lives: 999 })

/** Stable per-fireball identity. The homing law only SCALES the position toward the cockpit, so
 *  the unit direction from the origin is invariant across a shot's entire life — it identifies a
 *  flight without reaching into sim internals or relying on array order.
 *
 *  BOUND, stated rather than defended: two shots launched down the SAME bearing to 4 decimal
 *  places would merge into one flight here. `MAX_FIREBALL_SLOTS` is 6, so it is structurally
 *  possible; it does not happen at the 3-4 shots a space phase actually produces, and a merge
 *  would CONCATENATE two reach histories, which can only add un-reachable frames — it cannot make
 *  a blind flight look answerable. The failure mode is a false RED, never a false green. */
const rayId = (p: Vec3): string =>
  normalize(p)
    .map((v) => v.toFixed(4))
    .join(',')

type Flight = {
  /** Range at first sight — the TIE's position when it fired. */
  launchRange: number
  /** Per-frame: could the yoke point at the shot this frame? */
  reach: boolean[]
  /** Distance to the cockpit on the last frame the shot existed. */
  finalDistance: number
}

/** Fly a whole space phase on neutral input and record every fireball's flight. */
function flightsOf(seed: number): Flight[] {
  let s = spaceRun(seed)
  const open = new Map<string, Flight>()
  const closed: Flight[] = []
  for (let i = 0; i < 4000; i++) {
    s = stepGame(s, NO_INPUT, TICK_DT)
    if (s.phase !== 'space') break
    const eye = eyeOf(s)
    const seen = new Set<string>()
    for (const shot of s.enemyShots) {
      const id = rayId(shot.pos)
      seen.add(id)
      let f = open.get(id)
      if (!f) {
        f = { launchRange: length(shot.pos), reach: [], finalDistance: 0 }
        open.set(id, f)
      }
      f.reach.push(aimAt(shot.pos, eye).reachable)
      f.finalDistance = length(shot.pos)
    }
    for (const [id, f] of [...open]) {
      if (!seen.has(id)) {
        closed.push(f)
        open.delete(id)
      }
    }
  }
  return closed
}

/** Seconds of flight — the frame count is only a time under a known `dt`, and the sim's game
 *  frame is 20.508 Hz, NOT 60 (state.ts TICK_HZ). Everything here is stated in seconds. */
const lifeSeconds = (f: Flight) => f.reach.length * TICK_DT

describe('sw8-8 — the incoming-fire reaction window', () => {
  // ---- The defect -------------------------------------------------------------------------

  it('AC2: a fireball is still aim-reachable at the moment it lands', () => {
    // The single sharpest statement of the bug. Today every flight ends blind: the shot the
    // pilot is about to be hit by is off the arc his yoke can reach, so the "shootable" half of
    // sw8-2's AC9 is unavailable at exactly the moment it matters. Measured: 0 of 3-4 flights
    // per seed reachable at impact, all six seeds.
    for (const seed of SEEDS) {
      const flights = flightsOf(seed)
      expect(flights.length, `seed ${seed} produced no incoming fire to measure`).toBeGreaterThan(0)
      for (const f of flights) {
        // Only arrivals are in scope. A shot that timed out never threatened the pilot, and the
        // 64-tick life (~3.12 s) comfortably exceeds every measured flight, so this excludes
        // nothing today — it is here so the assertion stays honest if cadence changes later.
        if (lifeSeconds(f) >= ENEMY_SHOT_TTL) continue
        expect(
          f.reach[f.reach.length - 1],
          `seed ${seed}: a fireball launched at range ${f.launchRange.toFixed(0)} was NOT ` +
            `aim-reachable on the frame it hit the cockpit (life ${lifeSeconds(f).toFixed(3)}s)`,
        ).toBe(true)
      }
    }
  })

  it('AC2: the answerable window runs contiguously INTO impact, with no blind tail', () => {
    // Reachable-at-impact alone could be satisfied by a single flickering frame. The window the
    // story asks for is a span the pilot can act inside, ending AT the hit — so require the last
    // REACTION_SECONDS of every flight to be continuously answerable. Measured blind tail today:
    // 0.731 s – 2.146 s, i.e. the final half-second is 100 % blind on every flight.
    for (const seed of SEEDS) {
      for (const f of flightsOf(seed)) {
        if (lifeSeconds(f) >= ENEMY_SHOT_TTL) continue
        const tailFrames = Math.min(f.reach.length, Math.ceil(REACTION_SECONDS / TICK_DT))
        const tail = f.reach.slice(f.reach.length - tailFrames)
        const blind = tail.filter((r) => !r).length
        expect(
          blind,
          `seed ${seed}: of the final ${(tailFrames * TICK_DT).toFixed(3)}s before impact, ` +
            `${(blind * TICK_DT).toFixed(3)}s were outside the yoke's reach ` +
            `(launch range ${f.launchRange.toFixed(0)})`,
        ).toBe(0)
      }
    }
  })

  it('AC3: a physically-possible yoke can shoot incoming fire down in its final approach', () => {
    // The one that fires the REAL gun rather than asserting geometry — a test that only checks
    // NDC could be satisfied by a reachable shot the beam still misses. The pilot tracks the
    // nearest fireball inside FINAL_APPROACH_UNITS with the crosshair pushed as far as the
    // hardware allows and mashes the trigger (it is edge-triggered, so alternate frames re-arm
    // it — a held button fires once). Measured today: 36/48/60 consecutive frames on target —
    // 1.8 s to 2.9 s of continuous, correctly-aimed fire — killing NOTHING, while every one of
    // those fireballs landed. With an unclamped (impossible) yoke the same runs killed all of
    // them and took no hits, which is what proves the shot is mechanically hittable and the
    // failure is purely that the player cannot point at it.
    for (const seed of SEEDS) {
      let s = spaceRun(seed)
      let killed = 0
      let landed = 0
      let framesOnTarget = 0
      let pull = true
      for (let i = 0; i < 1200; i++) {
        if (s.phase !== 'space') break
        const target = s.enemyShots.find((sh) => length(sh.pos) < FINAL_APPROACH_UNITS)
        let input = NO_INPUT
        if (target) {
          framesOnTarget++
          const a = aimAt(target.pos as Vec3, eyeOf(s))
          input = { aimX: clampYoke(a.aimX), aimY: clampYoke(a.aimY), fire: pull }
          pull = !pull
        }
        s = stepGame(s, input, TICK_DT)
        for (const e of s.events) {
          if (e.type === 'fireball-destroyed') killed++
          if (e.type === 'player-death') landed++
        }
      }
      expect(framesOnTarget, `seed ${seed}: no fireball ever entered the final-approach band`).toBeGreaterThan(0)
      expect(
        landed,
        `seed ${seed}: ${landed} fireball(s) hit a pilot who tracked them for ${framesOnTarget} ` +
          `frames (${(framesOnTarget * TICK_DT).toFixed(2)}s) with the trigger down`,
      ).toBe(0)
      // A floor of ONE, not a count. `landed === 0` already carries the acceptance and has margin
      // on every seed; this only has to prove an interception is possible at all, so that "nothing
      // landed" can never be satisfied by a run where the pilot simply had nothing to shoot at.
      // Round 1 asked for >= 3 and that was a mis-measure: replayed across five seeds the kills are
      // 3, 4, 5, 5, 4 — seed 1983 sits exactly on the bar, with zero margin, on a quantity this
      // story does not own (TIE fire cadence, wave timing, the beam's nearest-target priority).
      expect(killed, `seed ${seed}: the pilot shot down nothing`).toBeGreaterThanOrEqual(1)
    }
  })

  // ---- Controls: the two fixes that would pass by breaking something else ------------------

  it('CONTROL: flight duration is NOT the defect — no fireball arrives in under a second', () => {
    // Green today, and it must STAY green: the report said "died in <1s", but the shot itself is
    // not fast. If a fix "closes" this story by slowing the fireball, lengthening its TTL or
    // pushing the fire floor out, the reachability tests above would go green for the wrong
    // reason — the pilot still would not be able to point at it, he would just have longer not
    // to. This pins the half of the complaint that measurement refuted.
    for (const seed of SEEDS) {
      for (const f of flightsOf(seed)) {
        expect(
          lifeSeconds(f),
          `seed ${seed}: a fireball launched at ${f.launchRange.toFixed(0)} arrived in ` +
            `${lifeSeconds(f).toFixed(3)}s`,
        ).toBeGreaterThanOrEqual(1)
      }
    }
    // ...and the floor is structural, not luck: the closest a TIE may legally fire from is
    // TIE_NEAR_BOUND ($800 = 2048), and 7/8-per-frame decay from there to the 80-unit hit sphere
    // takes log(80/2048)/log(7/8) frames at TICK_HZ.
    const floorSeconds = Math.log(80 / 2048) / Math.log(7 / 8) / TICK_HZ
    expect(floorSeconds).toBeGreaterThan(1)
  })

  it("CONTROL: the ST.UX drift survives — the fix must not simply delete the lateral motion", () => {
    // RE-SEATED onto the starfield (sw8-8 GREEN), which is what this control was always reaching
    // for. As written in RED it watched `eyeOf`, because at that point the drift lived in the
    // space CAMERA and the cheap fix was to park that camera. The ruling moved the subject: ST.UX
    // is the starfield's register — its only CONSUMER in the 1983 tree is the star generator
    // (`WSSTAR.MAC:98`, `LDD ST.UX ;STARS RELATIVE MOVEMENT`) — so the camera was never the right
    // thing to watch, and it is now correctly frame-invariant.
    //
    // The control's INTENT is unchanged and still bites: closing the eye/cockpit split must not be
    // achieved by deleting the lateral motion that makes space read as flight. Watching the field
    // is strictly the better guard, because it is where the ROM puts the motion.
    let s = spaceRun(1983)
    const meanX = (st: GameState) => st.starfield.reduce((a, k) => a + k.x, 0) / st.starfield.length
    const first = meanX(s)
    let last = first
    for (let i = 0; i < 600; i++) {
      s = stepGame(s, NO_INPUT, TICK_DT)
      if (s.phase !== 'space') break
      last = meanX(s)
    }
    expect(Math.abs(last - first), 'the starfield no longer drifts laterally').toBeGreaterThan(1)
  })
})
