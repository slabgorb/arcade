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
//     • individual X velocity  `LDA LNDXV / JSR RMAX` + random sign `BITB #1`(:667-676)
//                              → landers DRIFT apart at their OWN horizontal rate
//     • terrain-relative dive  LANDSA descends toward `GETALT-50` (:726-736) → they settle
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
// their own tick — and injects `rand` (the sim owns real entropy). A RAMP rand hands each
// spawn/tick a fresh byte so an authentic per-lander velocity draws distinct values; today
// the lander step consumes no entropy, so the ramp changes nothing and the row stays locked.

import { describe, it, expect } from 'vitest'
import { createScheduler } from '../src/core/scheduler.js'
import { YMAX } from '../src/core/world.js'
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
  it('roam to DIFFERENT columns as they patrol — individual horizontal velocity (LNDXV, DEFB6.SRC:667-676; AC1/AC3)', () => {
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

  it('a target-less lander PATROLS at altitude instead of sinking to the floor (LANDS0 LANDSA, DEFB6.SRC:688,726)', () => {
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
})
