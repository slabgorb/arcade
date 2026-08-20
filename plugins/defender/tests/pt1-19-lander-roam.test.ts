// tests/pt1-19-lander-roam.test.ts
//
// Story pt1-19 — RED phase (Leeloo / TEA). Playtest 2026-08-19: the landers spawn and
// fall in a synchronized Space-Invaders row instead of roaming independently.
//
// ROOT CAUSE (confirmed in code): the whole wave spawns synchronously (sim.ts:330
// `for i<n spawnEnemyAt(...)`), every lander at LANDER_SPAWN_Y = YMIN+2 (landers.ts:46 —
// the SAME row), and every lander advances at the SAME DESCEND_STEP = 2 rows/tick
// (landers.ts:85), an admitted df4-3 PLACEHOLDER. Same start row + same speed + same
// frame = a falling row, not Defender's spread-out, independently roaming attackers.
//
// ROM ground truth (reference/original-source/defender/):
//   LANDST  DEFB6.SRC:649  the ROM KEEPS the spawn row uniform (`LDA #YMIN+2 / STA OY16`,
//                          :663) — so a faithful fix does NOT stagger spawn Y; the df4-3
//                          suite pins `LANDER_SPAWN_Y === YMIN+2` and must stay green. The
//                          SPREAD is produced AFTER spawn, three ways:
//     • random spawn column   `JSR RAND / LDD HSEED / STD OX16,X`            (:656-660)
//     • individual X velocity  `LDA LNDXV / JSR RMAX` + random sign `BITB #1`(:670-676)
//                              → landers DRIFT apart at their OWN horizontal rate
//     • terrain-relative dive  LANDSA descends toward `GETALT-50` (:711-719) → they settle
//                              at DIFFERENT altitudes following the terrain contour
//   LANDS0  DEFB6.SRC:688  the per-tick lander AI: ROAM at that altitude, pick a target
//                          individually, and only THEN close in to grab (LANDG, :738).
//   LNDYV   PHR6.SRC:393   the wave-table descent-velocity RAM the df4-3 header defers.
//
// WHAT THIS SUITE PINS (AC5: "landers do NOT share a single Y/velocity after N ticks"):
// the anti-lockstep OUTCOMES that break the "neat row descending in lockstep" bug and are
// faithful against the CURRENT enemy-bank contract —
//   1. landers roam to DIFFERENT columns (individual LNDXV horizontal velocity),
//   2. landers do NOT move in lockstep (their per-tick displacement differs),
//   3. a target-less lander PATROLS at altitude rather than sinking to the floor,
//   4. the new roam arithmetic never yields a non-finite coordinate (lang-review #21).
//
// SCOPE NOTE for GREEN: the per-COLUMN altitude spread (LANDSA `GETALT-50`) implies giving
// the enemy bank terrain access — an architecture decision left to GREEN and flagged in the
// session Delivery Findings, NOT invented here as a brittle terrain-API test. The roam +
// patrol pins below already push toward an altitude model without dictating its shape.
//
// Every scenario drives the ONE df3 scheduler (scheduler.ts) — enemies are processes, never
// their own tick — and injects `rand` (the sim owns real entropy). Note: each lander's roam
// velocity is drawn from its per-lander SPAWN INDEX (createEnemyBank's `landerSpawnSeq`), NOT
// from `rand` — deliberately, so the shared cue-stream entropy is untouched and seeded replays
// hold. So the bank's `rand` value is irrelevant to the roam spread here; distinct landers get
// distinct velocities purely from spawn order.
//
// The last describe block reaches past the bank into the REAL sim (createSim) — the scenario the
// playtest actually saw (landers hunting the seeded ground humanoids) — because the bank-level
// pins alone let round 1 pass green while the bug survived (a targeted lander took the hunt path,
// never the roam branch). That sim-level pin is the load-bearing regression guard.

import { describe, it, expect } from 'vitest'
import { createScheduler } from '../src/core/scheduler.js'
import { YMAX } from '../src/core/world.js'
import { createSim, stepSim, spawnLander, type Input, type SimState } from '../src/core/sim.js'
import { loadLanders, stepUntil, type EnemyBank } from './helpers/df4-3-landers-contract.js'

/** A varying byte source (0..255): a distinct value on each call, so an authentic
 *  per-lander random velocity draws a different magnitude/sign for each spawn. The +37
 *  step is coprime with 256, so the stream visits every residue before repeating. */
function rampRand(): () => number {
  let n = 0
  return () => (n = (n + 37) & 0xff)
}

/** Spin up a fresh scheduler + enemy bank for one scenario. */
function freshBank(rand: () => number = rampRand()): { sched: ReturnType<typeof createScheduler>; bank: EnemyBank } {
  const sched = createScheduler()
  const bank = loadLanders().createEnemyBank(sched, rand)
  return { sched, bank }
}

/** Advance the shared scheduler exactly `n` ticks (no predicate — pure runway). */
function runTicks(sched: ReturnType<typeof createScheduler>, n: number): void {
  stepUntil(sched, () => false, n)
}

describe('pt1-19 — landers roam independently, not a synchronized descending row', () => {
  it('roam to DIFFERENT columns as they patrol — individual horizontal velocity (LNDXV, DEFB6.SRC:670-676; AC1/AC3)', () => {
    const { sched, bank } = freshBank()
    const COL = 0x8000
    // Six landers in ONE column, no humanoids anywhere — nothing to hunt, so the ONLY
    // motion is the roam. An authentic lander drifts at its own LNDXV; today it does not.
    for (let i = 0; i < 6; i++) bank.spawnLander(COL)
    runTicks(sched, 60)

    const columns = new Set(bank.landers.map((l) => l.x))
    expect(
      columns.size,
      'six landers that spawned in one column must DRIFT to different columns as they roam ' +
        '(each carries its own LNDXV horizontal velocity) — today they never move in X ' +
        'without a target and stay a single stacked file, the "neat row" the playtest saw',
    ).toBeGreaterThan(1)
  })

  it('do NOT move in lockstep — each advances by its OWN velocity per tick (AC5 "not a single velocity")', () => {
    const { sched, bank } = freshBank()
    for (let i = 0; i < 6; i++) bank.spawnLander(0x8000)
    runTicks(sched, 20) // reach a steady roam before sampling the step

    const before = bank.landers.map((l) => ({ x: l.x, y: l.y }))
    sched.stepTick()
    const after = bank.landers.map((l) => ({ x: l.x, y: l.y }))

    // One displacement vector per lander. Lockstep = every vector identical (set size 1);
    // independent roam = at least two landers move differently (size > 1).
    const displacements = new Set(before.map((b, i) => `${after[i].x - b.x},${after[i].y - b.y}`))
    expect(
      displacements.size,
      'each lander must advance by its own velocity — today all six share ONE displacement ' +
        'vector (Δx=0, Δy=+DESCEND_STEP=2), the exact lockstep descent the playtest reported',
    ).toBeGreaterThan(1)
  })

  it('a target-less lander PATROLS at altitude instead of sinking to the floor (LANDS0 LANDSA, DEFB6.SRC:691,711)', () => {
    const { sched, bank } = freshBank()
    const lander = bank.spawnLander(0x8000) // no humanoids on the field — nothing to abduct
    expect(lander, 'precondition: a lander spawned').not.toBeNull()

    // 400 ticks: today's placeholder descends toward YMAX at +2/tick and reaches the floor
    // (YMAX=240, from YMIN+2=44) in ~100 ticks, so 400 leaves it pinned at the very bottom.
    runTicks(sched, 400)
    const live = bank.landers[0]
    expect(live?.alive, 'the target-less lander is still on the field (it does not self-destruct)').toBe(true)
    expect(
      live?.y ?? YMAX,
      'with nothing to grab a lander must ROAM at an altitude band (LANDSA rides GETALT-50, ' +
        'above the terrain), NOT plunge to the very floor (YMAX) as the df4-3 placeholder ' +
        'descent does — a lander sitting on the floor is the lockstep-dive bug',
    ).toBeLessThan(YMAX)
  })

  it('roaming never produces a non-finite lander coordinate (lang-review #21 — degenerate numeric input)', () => {
    // The new individual-velocity arithmetic must not let a value slip to NaN/±Infinity: a
    // non-finite X/Y would make a lander vanish from the render and never converge. This is
    // a GREEN-forward guard — green today (positions are finite) and it must stay green.
    const { sched, bank } = freshBank()
    for (let i = 0; i < 5; i++) bank.spawnLander(0x2000 * i + 1)
    runTicks(sched, 120)

    expect(bank.landers.length, 'precondition: the landers are on the field').toBe(5)
    for (const l of bank.landers) {
      expect(Number.isFinite(l.x), 'a roaming lander keeps a finite X').toBe(true)
      expect(Number.isFinite(l.y), 'a roaming lander keeps a finite Y').toBe(true)
    }
  })

  it('the roam drift is SIGNED — some landers go left, some right (BITB #1 sign, DEFB6.SRC:672-675)', () => {
    // Makes the random-SIGN half of roamVelocity load-bearing: without it every lander drifts
    // the same way and this reddens. Spawn a spread of landers (no prey), record each start X,
    // roam, and require BOTH a leftward and a rightward mover (columnGap wrap-aware).
    const { sched, bank } = freshBank()
    const starts = [0x2000, 0x4000, 0x6000, 0x8000, 0xa000, 0xc000, 0xe000, 0x1000]
    for (const x of starts) bank.spawnLander(x)
    const x0 = bank.landers.map((l) => l.x)
    runTicks(sched, 40)
    // Signed cylinder delta of each lander from its own start (−0x8000..0x7fff).
    const drifts = bank.landers.map((l, i) => ((l.x - x0[i] + 0x8000) & 0xffff) - 0x8000)
    expect(drifts.some((d) => d < 0), 'at least one lander drifts LEFT (negative LNDXV)').toBe(true)
    expect(drifts.some((d) => d > 0), 'at least one lander drifts RIGHT (positive LNDXV)').toBe(true)
  })
})

// ── The regression guard round 1 lacked: the fix must reach the REAL sim, where every lander
//    has a seeded ground humanoid to hunt. A targeted lander used to take the hunt path and dive
//    straight down at uniform speed — so a bank-level "no humanoid" pin passed while the reported
//    bug (a whole wave descending as one lockstep row) survived. This drives createSim directly. ──
const NEUTRAL: Input = { thrust: false, reverse: false, up: false, down: false, fire: false }
/** Deterministic byte source (the df3-6/df5-8 LCG shape) — no ambient entropy. */
function lcg(seed: number): () => number {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0), (s >>> 16) & 0xff)
}

describe('pt1-19 — the fix reaches the REAL sim: a wave does not descend as a lockstep row', () => {
  it('a wave spawned across the field does NOT collapse to one shared altitude (the playtest bug)', () => {
    let s: SimState = createSim(lcg(42))
    // A wave of landers across the field, into a sim that already seeded its ground humanoids —
    // the exact shape spawnSpread makes on a real wave. Pre-fix, all of these beeline the ground
    // row and share one Y every frame (reproduced: 64,84,104,124,144 — distinctY=1 throughout).
    for (let i = 0; i < 6; i++) s = spawnLander(s, Math.floor((i / 6) * 0x10000))
    const alive0 = s.landers.filter((l) => l.alive).length
    expect(alive0, 'precondition: the wave is airborne').toBeGreaterThan(1)

    // Sample the altitude spread across a run; the wave must NOT stay a single-Y row. They descend
    // together for the first stretch (ROM-faithful: all spawn at YMIN+2 and share DESCEND_STEP),
    // then fan out as each settles toward its OWN terrain-relative roam altitude (ground(x)-50) —
    // reaching 5 distinct Y by ~90 ticks in this seed. Pre-fix they stayed at ONE Y the whole run.
    let maxDistinctY = 1
    for (let f = 0; f < 90; f++) {
      s = stepSim(s, NEUTRAL)
      const ys = s.landers.filter((l) => l.alive).map((l) => Math.round(l.y))
      maxDistinctY = Math.max(maxDistinctY, new Set(ys).size)
    }
    expect(
      maxDistinctY,
      'the landers must occupy MORE THAN ONE altitude as they roam/dive individually — a single ' +
        'shared Y across the whole run is the synchronized descending row the playtest reported',
    ).toBeGreaterThan(1)
  })
})
