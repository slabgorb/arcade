// tests/core/tie-approach-sweep.test.ts
//
// sw8-6 RED (Han Solo / TEA) — the TIE approach must read as a FIELD-CROSSING SWEEP,
// not a CENTERLINE ZOOM ("grow-on-the-crosshair-then-loop").
//
// THE RULING (rule-before-fix, epic sw8 §3 — established by running the real sim; see the
// session Delivery Findings). A hero TIE flown with NO player input, spawner/fire parked:
//
//   slot 0 (spawn x=0, the ROM 1A1 slot)  world-x stays 0 the whole approach, then overshoots
//                                          the cockpit and LOOPS (wy climbs to ~5600) — "a TIE
//                                          flew x=0 its whole life".
//   slot 1 (spawn x=-1024)  world-x -1024 -> -100 while depth 31744 -> 3087, then it rams the
//   slot 2 (spawn x=+1024)  cockpit and vanishes (~f62). "#2/#3 steer x->0".
//
// The defect: the offset fighters collapse their lateral offset PROPORTIONALLY to depth. The
// ANGULAR lateral position |x|/depth is FLAT across the approach (0.0323 -> 0.0324, ~1.00x), so
// the fighter holds a fixed screen ANGLE and merely GROWS on the crosshair — a zoom. The 1983
// longplay instead shows each fighter CARRY its spawn lateral offset across the field as it
// closes, so |x|/depth WIDENS and the TIE sweeps across the screen, converging to x~0 only in the
// final approach (the moving eye, sw8-1/sw8-2, already shipped & bounded, adds only a modest
// on-screen pan — the isolable, unit-testable defect is purely the CHOREOGRAPHY / world path).
//
// This suite pins that world-space observable (AC2 "#2/#3 steer x->0" + AC4 "deterministic
// trajectory probe / x-position deltas"). The MAGNITUDE of the carry is Dev's tuning against the
// longplay (design §3 "eyeball-owned"); the RED driver only asserts a REAL outward sweep exists —
// |x|/depth widens rather than staying flat. The VISUAL "crosses the screen at matching wave"
// (AC1/AC3) is longplay QA per epic §6 (a green vitest is necessary, not sufficient); recorded as
// a Delivery Finding, not pinned here.
//
// Sacred boundary: drives the public `stepGame` on the pure core — no DOM, no time except `dt`,
// no randomness except the seeded RNG carried in state.

import { describe, it, expect } from 'vitest'
import { initialState, TICK_HZ, type GameState } from '../../src/core/state'
import { stepGame } from '../../src/core/sim'
import { spawnTieForTest, NO_INPUT } from './helpers/space'

const SEED = 1983
const TICK_DT = 1 / TICK_HZ
// A "closing" sample must be well down the approach yet still in front of the pilot (depth > 0)
// and above the ram/pass-through zone — so the same frame is measurable under BOTH the current
// beeline (rams ~f62, depth ~2500) and a carried-offset fix. 3000 sits just above that.
const DEPTH_FLOOR = 3000

type Sample = { frame: number; x: number; depth: number; ratio: number }

/** Fly ONE hero TIE (spawned at ROM lateral `slot`, its real choreography VM) through its
 *  approach with no player input; the spawner and fire clocks are parked so the hero is the only
 *  thing that moves. Returns per-frame world-x, depth (=-z), and the angular lateral position
 *  |x|/depth — the sweep-vs-zoom discriminator — for every frame the hero is alive. */
function approach(slot: number, maxFrames = 120): Sample[] {
  const hero = spawnTieForTest({ wave: 0, slot, seed: SEED }) // wave 1 => spaceWave 0 (sim.ts)
  let s: GameState = { ...initialState(SEED), enemies: [hero], spawnTimer: 1e9, enemyFireCooldown: 1e9 }
  const out: Sample[] = []
  for (let f = 0; f < maxFrames; f++) {
    const e = s.enemies[0]
    if (!e) break // rammed / passed the cockpit and despawned
    const depth = -e.pos[2]
    out.push({ frame: f, x: e.pos[0], depth, ratio: Math.abs(e.pos[0]) / Math.max(1, depth) })
    s = stepGame(s, NO_INPUT, TICK_DT)
  }
  return out
}

/** The deepest-into-the-approach sample that is still in front of the pilot and above the
 *  pass/ram floor — the point at which "carried offset" and "proportional collapse" diverge. */
function closingSample(samples: Sample[]): Sample {
  const spawnDepth = samples[0].depth
  const inFront = samples.filter((s) => s.depth >= DEPTH_FLOOR && s.depth < spawnDepth)
  return inFront[inFront.length - 1]
}

describe('sw8-6 — TIE approach is a field-crossing sweep, not a centerline zoom', () => {
  // --- THE RED DRIVER: the offset is CARRIED, so the angular position widens (sweep) ---------
  // Fails today for BOTH offset slots (ratio flat, ~1.00x). Pinning both directions guards
  // against a fix that only carries one side of the field.
  for (const slot of [1, 2]) {
    it(`offset TIE (slot ${slot}) carries its lateral offset across the field — |x|/depth WIDENS as it closes (sweep, not zoom)`, () => {
      const samples = approach(slot)
      const spawn = samples[0]
      const close = closingSample(samples)

      // non-vacuity: it really had a ROM offset (~±1024), it was still alive deep in the
      // approach, and it actually closed distance — so the ratio comparison is meaningful.
      expect(Math.abs(spawn.x)).toBeGreaterThan(500)
      expect(close).toBeDefined()
      expect(close.depth).toBeLessThan(spawn.depth)
      expect(spawn.ratio).toBeGreaterThan(0)

      // THE ASSERTION: a field-crossing sweep carries the offset so the angular lateral position
      // grows as depth shrinks. A "grow-on-the-crosshair" zoom collapses x proportionally to
      // depth and keeps this ratio FLAT (today: ~1.00x → RED). 1.5x only demands a real sweep
      // exists; the true carried magnitude (longplay-tuned) is larger.
      expect(close.ratio).toBeGreaterThan(spawn.ratio * 1.5)
    })
  }

  // --- PRESERVATION GUARD (green now AND after): the centred fighter stays centred ------------
  it('the centred TIE (slot 0, spawn x=0) holds world-x ~ 0 through the approach — "a TIE flew x=0 its whole life"', () => {
    const samples = approach(0, 80) // sample the in-front approach, before it passes the cockpit (~f96)

    // it actually flew the approach and stayed alive across the sampled window
    expect(samples.length).toBeGreaterThan(60)
    expect(samples[samples.length - 1].depth).toBeLessThan(samples[0].depth)

    // world-x never departs the centreline (tolerance well under one ROM lateral unit = 1024):
    // carrying the OFFSET fighters' lateral must not shove the already-centred fighter off-axis.
    const maxAbsX = Math.max(...samples.map((s) => Math.abs(s.x)))
    expect(maxAbsX).toBeLessThan(100)
  })

  // --- PRESERVATION GUARD (green after the fix): #2/#3 still steer to the centreline ----------
  // The offset is CARRIED across the near field (the RED driver above: |x|/depth widens), so the
  // fighter does NOT converge at the mid-field closing sample — the ROM choreography's steering
  // (WSCPU TCH1A2/A3: the first YAW/AIM_PLAYER maneuver is ~66 frames in, `CT(0x20,YR,MF)` after
  // `CT(0x40,RR,MF2)`) only engages LATE in the approach, once the fighter has swept most of the
  // field. So convergence is measured over the FULL trajectory, not at depth 3000: across its
  // life the fighter's lateral still comes home to the centreline, proving it steers x->0 rather
  // than flying permanently off to the side. (Convergence lands late/at the fly-past here; making
  // it loiter-and-converge WHILE in front needs the deferred play-cube clamp — see the finding.)
  for (const slot of [1, 2]) {
    it(`offset TIE (slot ${slot}) still steers toward x~0 over its life — "#2/#3 steer x->0"`, () => {
      const samples = approach(slot, 130)
      const spawn = samples[0]
      // non-vacuity: it really had a ROM offset (~±1024) and really flew a long trajectory.
      expect(Math.abs(spawn.x)).toBeGreaterThan(500)
      expect(samples.length).toBeGreaterThan(20)
      // it steers home: the closest its lateral comes to centre is well inside its spawn offset
      // (a fighter that never converged would hold ~±1024 the whole way).
      const minAbsX = Math.min(...samples.map((s) => Math.abs(s.x)))
      expect(minAbsX).toBeLessThan(Math.abs(spawn.x) * 0.3)
    })
  }

  // --- AC4: deterministic trajectory probe (no silent drift) ----------------------------------
  it('the hero-TIE approach is deterministic — same seed + no input -> identical trajectory (AC4)', () => {
    const a = approach(1)
    const b = approach(1)
    expect(a.length).toBe(b.length)
    expect(a.map((s) => [s.frame, s.x, s.depth])).toEqual(b.map((s) => [s.frame, s.x, s.depth]))
    // non-trivial: guards against "identical because nothing moved" — it really approached.
    expect(a[a.length - 1].depth).toBeLessThan(a[0].depth)
  })
})
