// tests/df4-4-mutants.test.ts
//
// Story df4-4 — RED phase (Han Solo / TEA). The MUTANT (SCZ / SCHITZO) as a pure,
// scheduler-driven reducer in src/core/mutants.ts: the enemy a carrying lander BECOMES
// on reaching the top (the df4-3 reachedTop trigger consumed). It seeks the player in X,
// hops erratically in Y (the "schizo"), and shoots on a timer. Re-derived from DEFB6.SRC
// (SCZS0 :592, the SCZ00 transform :828-839, the SCZ0 body :844-901, NAP 3 :901).
//
// SCOPE FENCE (encoded here so a later reader sees the boundary in the tests):
//   IN  — the lander→mutant transform (reachedTop), SCZS0 direct spawn, SEEK-X pursuit,
//         the RANDOM-Y HOP (clamped to [YMIN,YMAX]), the SHOOT-on-timer decision + aim,
//         and the SCZKIL death. Every constant that is a FIXED ROM byte is pinned; the
//         mutant velocities (SZXV/SZYV/SZRY) and shot interval (SZSTIM) are wave-table
//         RAM (PHR6.SRC:396-399) with no fixed magnitude to port — df4-4 placeholders
//         pending df5, exactly as landers.ts's DESCEND_STEP is (the df4-3 precedent).
//   OUT — the projectile ENTITY a shot becomes (df4-5/df5 — here SHOOT is an injected
//         sink); live scheduler/sim integration (synthetic processes only, this story);
//         P250/P500 scoring (df5). None of those are asserted here.
//
// Every scenario drives the ONE cabinet scheduler (df3 scheduler.ts) — the mutant is a
// process, never its own tick. `rand`, `player`, and `fire` are injected (the contract).

import { describe, it, expect } from 'vitest'
import { createScheduler } from '../src/core/scheduler.js'
import { YMIN, YMAX } from '../src/core/world.js'
import { stepUntil } from './helpers/df4-3-landers-contract.js'
import {
  loadMutants,
  type EnemyDeps,
  type MutantBank,
  type PlayerPos,
} from './helpers/df4-4-enemies-contract.js'

// A generous "eventually" bound: mutant X/Y speeds are GREEN's placeholders (SZXV/SZYV
// are wave RAM), so scenarios assert the mutant REACHES a state, not how fast. A mutant
// that never reaches it inside 20k ticks is not wired — the point of RED.
const MAX_TICKS = 20_000

// A fixed injected byte source keeps every scenario reproducible (the sim owns real
// entropy). 0x40 is positive (bit 7 clear) — a steady random-Y-hop direction.
const constRand = (): number => 0x40

/** One recorded shot from the injected SHOOT sink. */
interface Shot {
  fromX: number
  fromY: number
  toX: number
  toY: number
}

/** Spin up a fresh scheduler + mutant bank with a fixed player and a recording fire sink. */
function freshBank(player: PlayerPos): {
  sched: ReturnType<typeof createScheduler>
  bank: MutantBank
  shots: Shot[]
} {
  const sched = createScheduler()
  const shots: Shot[] = []
  const deps: EnemyDeps = {
    rand: constRand,
    player: () => player,
    fire: (fromX, fromY, toX, toY) => shots.push({ fromX, fromY, toX, toY }),
  }
  const bank = loadMutants().createMutantBank(sched, deps)
  return { sched, bank, shots }
}

describe('df4-4 — the MUTANT: exists as a cited process (SCZS0, DEFB6.SRC:592, NAP 3 :901)', () => {
  it('exposes SCHIZO_NAP at its byte-verified ROM magnitude (NAP 3,SCZ0)', () => {
    // Pin the exact cadence, not just "some nap": NAP 3,SCZ0 (DEFB6.SRC:901). A changed
    // cadence (e.g. copying the lander's NAP 2) must redden — the mutant is faster.
    expect(loadMutants().SCHIZO_NAP).toBe(3)
  })

  it('a spawned mutant starts alive at its coords and is a scheduler process (NEWP SCZ0,STYPE)', () => {
    const { sched, bank } = freshBank({ x: 5000, y: 200 })
    const before = sched.processes.length
    const mutant = bank.spawnMutant(1000, 120)
    expect(mutant, 'spawnMutant(finite coords) must return a live mutant').not.toBeNull()
    expect(mutant?.x).toBe(1000)
    expect(mutant?.y).toBe(120)
    expect(mutant?.alive).toBe(true)
    expect(bank.mutants.length).toBe(1)
    // The mutant is a process on the shared run-list — NEWP SCZ0,STYPE (DEFB6.SRC:592).
    expect(sched.processes.length).toBeGreaterThan(before)
  })
})

describe('df4-4 — the TRANSFORM: a lander that reached the top BECOMES a mutant (SCZ00, DEFB6.SRC:828)', () => {
  it('transforms a reachedTop lander into a mutant at the lander position, as a new process', () => {
    const { sched, bank } = freshBank({ x: 5000, y: 200 })
    const before = sched.processes.length
    // df4-3 fires reachedTop when a carrying lander reaches the top; df4-4 consumes it.
    const mutant = bank.transformLander({ x: 1234, y: YMIN + 8, reachedTop: true })
    expect(mutant, 'a reachedTop lander must transform into a mutant (SCZ00, DEFB6.SRC:828)').not.toBeNull()
    expect(mutant?.x, 'the mutant appears where the lander was').toBe(1234)
    expect(mutant?.y).toBe(YMIN + 8)
    expect(bank.mutants.length).toBe(1)
    expect(sched.processes.length, 'the mutant runs as a new SCZ0 process').toBeGreaterThan(before)
  })

  it('does NOT transform a lander that has not reached the top — the transform fires only at the top', () => {
    const { sched, bank } = freshBank({ x: 5000, y: 200 })
    const before = sched.processes.length
    // reachedTop is the latch: a mid-carry lander (still descending/rising) is not a mutant.
    const mutant = bank.transformLander({ x: 1234, y: YMIN + 100, reachedTop: false })
    expect(mutant, 'a lander that has not reached the top does not become a mutant').toBeNull()
    expect(bank.mutants.length, 'no mutant is created from a non-triggered lander').toBe(0)
    expect(sched.processes.length, 'a rejected transform leaks no scheduler process').toBe(before)
  })
})

describe('df4-4 — the MUTANT SEEKS the player in X (SCZ0 SEEK X, DEFB6.SRC:846-851)', () => {
  it('a mutant to the LEFT of the player moves RIGHT, toward the player column', () => {
    const { sched, bank } = freshBank({ x: 6000, y: 200 })
    const m = bank.spawnMutant(1000, 120)
    const x0 = m?.x ?? 0
    const closed = stepUntil(sched, () => (bank.mutants[0]?.x ?? x0) > x0, MAX_TICKS)
    expect(
      closed,
      'the mutant seeks the player horizontally — with the player to its right its X increases ' +
        '(LDB SZXV / signed toward PLABX, DEFB6.SRC:845-851)',
    ).toBeGreaterThan(0)
  })

  it('a mutant to the RIGHT of the player moves LEFT, toward the player column', () => {
    const { sched, bank } = freshBank({ x: 1000, y: 200 })
    const m = bank.spawnMutant(6000, 120)
    const x0 = m?.x ?? 0
    const closed = stepUntil(sched, () => (bank.mutants[0]?.x ?? x0) < x0, MAX_TICKS)
    expect(closed, 'with the player to its left the mutant seeks left — X decreases (NEGB, :849)').toBeGreaterThan(0)
  })
})

describe('df4-4 — the MUTANT is a "schizo": a RANDOM Y HOP kept on-strip (SCZ10, DEFB6.SRC:883-891)', () => {
  it('the mutant hops in Y over time, and never leaves the [YMIN, YMAX] strip', () => {
    const { sched, bank } = freshBank({ x: 5000, y: 200 })
    const m = bank.spawnMutant(1000, 120)
    const y0 = m?.y ?? 0

    // The Y HOP moves the mutant vertically each dispatch (ADDB #±SZRY to OY16, :887).
    const hopped = stepUntil(sched, () => (bank.mutants[0]?.y ?? y0) !== y0, 2000)
    expect(hopped, "the mutant's Y changes over time — it is not vertically static (SZRY hop)").toBeGreaterThan(0)

    // …but the hop wraps/clamps onto the strip: CMPB #YMIN / BHS … / LDB #YMAX (:888-890).
    // Step a long run and assert the mutant is NEVER off-strip — a hop off the top/bottom
    // is a NaN/overflow bug (lang-review #21), not authentic schizo motion.
    for (let t = 0; t < 3000; t++) {
      sched.stepTick()
      const y = bank.mutants[0]?.y
      if (y === undefined) break
      expect(y, `the mutant left the [${YMIN}, ${YMAX}] strip at tick ${t} (y=${y})`).toBeGreaterThanOrEqual(YMIN)
      expect(y).toBeLessThanOrEqual(YMAX)
    }
  })
})

describe('df4-4 — the MUTANT SHOOTS at the player on a timer (SCZ0, DEFB6.SRC:892-897)', () => {
  it('fires at the player when its shot timer expires, and RE-ARMS (fires more than once)', () => {
    const player: PlayerPos = { x: 5000, y: 200 }
    const { sched, bank, shots } = freshBank(player)
    bank.spawnMutant(1000, 120)

    // DEC PD2 SHOT TIME / BNE / JSR SHOOT (DEFB6.SRC:892-897): a shot fires when the timer
    // reaches zero, and the timer RELOADS (SZSTIM), so a live mutant shoots repeatedly.
    const firedTwice = stepUntil(sched, () => shots.length >= 2, MAX_TICKS)
    expect(
      firedTwice,
      'a live mutant shoots on its timer and re-arms — the shot count reaches 2 (not a one-shot)',
    ).toBeGreaterThan(0)

    // Every shot is AIMED at the player (JSR SHOOT fires toward PLABX/PLAYC): the injected
    // sink's target must be the player's pose, not a fixed direction.
    for (const s of shots) {
      expect({ toX: s.toX, toY: s.toY }, 'each mutant shot is aimed at the player').toEqual({
        toX: player.x,
        toY: player.y,
      })
    }
  })
})

describe('df4-4 — the MUTANT dies (SCZKIL, DEFB6.SRC:624) and guards its spawn boundary', () => {
  it('killMutant removes the mutant from the live bank', () => {
    const { sched, bank } = freshBank({ x: 5000, y: 200 })
    const mutant = bank.spawnMutant(1000, 120)!
    expect(bank.mutants.length).toBe(1)
    bank.killMutant(mutant)
    // Give its process a tick to SUCIDE, then it is gone from the bank (DEC SCZCNT).
    sched.stepTick()
    expect(bank.mutants.some((m) => m === mutant), 'a killed mutant leaves the live bank').toBe(false)
  })

  it('a non-finite spawn coordinate is rejected and leaks no process (lang-review #21)', () => {
    const { sched, bank } = freshBank({ x: 5000, y: 200 })
    const before = sched.processes.length
    expect(bank.spawnMutant(Number.NaN, 120), 'spawnMutant(NaN, y) spawns nothing').toBeNull()
    expect(bank.spawnMutant(1000, Number.POSITIVE_INFINITY), 'spawnMutant(x, Infinity) spawns nothing').toBeNull()
    expect(bank.mutants.length, 'no mutant was created from a bad coord').toBe(0)
    expect(sched.processes.length, 'a rejected spawn leaks no scheduler process').toBe(before)
  })
})
