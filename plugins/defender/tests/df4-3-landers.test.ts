// tests/df4-3-landers.test.ts
//
// Story df4-3 — RED phase (Han Solo / TEA). The signature Defender loop as a pure,
// scheduler-driven reducer in src/core/landers.ts: a LANDER descends from the top,
// hunts a HUMANOID walking the terrain, grabs it, carries it toward the top (the
// transform TRIGGER df4-4 consumes), and — when the carrying lander is shot — drops
// the humanoid into an AFALL free-fall. Re-derived from DEFB6.SRC (LANDST :649,
// LANDS0 :688, ASTRO :290, LANDF :795, LKIL1 :903, AFALL :927).
//
// SCOPE FENCE (design §4/§6, encoded here so a later reader sees the boundary in the
// tests, not just the prose):
//   IN  — lander descent+targeting, humanoid walk, grab, carry-to-top, the transform
//         TRIGGER (reachedTop), and the shot-carrier → AFALL drop + fall motion.
//   OUT — the MUTANT (SCZ) behaviour a triggered lander becomes (df4-4); the AFALL
//         GROUND outcome ALAND (rescue / fall-to-planet, df5); P250/P500 SCORING
//         (df5, DEFB6.SRC:408); lander SHOOTING (LSHOT — the bomb/projectile mechanic,
//         df4-5). None of those are asserted here.
//
// The contract + the "not built yet" loader live in tests/helpers/df4-3-landers-contract.ts.
// Every scenario drives the ONE cabinet scheduler (df3 scheduler.ts) — enemies are
// processes, never their own tick (the epic's standing trap). `rand` is injected.

import { describe, it, expect } from 'vitest'
import { createScheduler } from '../src/core/scheduler.js'
import { YMIN } from '../src/core/world.js'
import { loadLanders, stepUntil, type EnemyBank } from './helpers/df4-3-landers-contract.js'

// A generous "eventually" bound: descent/carry speeds are GREEN's to derive from
// LNDYV, so these scenarios assert the loop REACHES each state, not how fast. If an
// authentic velocity genuinely needs more runway, GREEN raises this — but a loop that
// never reaches the state inside 20k ticks is not wired, which is the point of RED.
const MAX_TICKS = 20_000

// A fixed injected byte source. df4-3 spawning is deterministic given `rand`; a
// constant stream keeps every scenario reproducible (the sim owns real entropy).
const constRand = (): number => 0x40

/** Spin up a fresh scheduler + enemy bank for one scenario. */
function freshBank(rand: () => number = constRand): { sched: ReturnType<typeof createScheduler>; bank: EnemyBank } {
  const sched = createScheduler()
  const bank = loadLanders().createEnemyBank(sched, rand)
  return { sched, bank }
}

describe('df4-3 — the LANDER: spawns at the top, descends (LANDST/LANDS0, DEFB6.SRC:649,688)', () => {
  it('exposes the cited spawn/top/fall constants at their byte-verified ROM magnitudes', () => {
    const m = loadLanders()
    // LDA #YMIN+2 / STA OY16 (DEFB6.SRC:663) — landers appear two rows below the top.
    expect(m.LANDER_SPAWN_Y).toBe(YMIN + 2)
    // CMPA #YMIN+8 / BLS LANDFX (DEFB6.SRC:798) — the carry triggers the transform here.
    expect(m.LANDER_TOP_Y).toBe(YMIN + 8)
    // LDD #8 ACCEL DOWNWARD (DEFB6.SRC:928) — pin the exact AFALL acceleration, not just its
    // sign: an ordering-only test ("Y increases") passes for any positive accel (lang-review #29).
    expect(m.AFALL_ACCEL).toBe(8)
    // CMPD #$300 (DEFB6.SRC:930) — pin the exact terminal-fall cap; a removed/raised cap must redden.
    expect(m.AFALL_MAX_FALL).toBe(0x300)
  })

  it('a spawned lander starts at LANDER_SPAWN_Y, alive, empty-handed, and is a scheduler process', () => {
    const { sched, bank } = freshBank()
    const before = sched.processes.length
    const lander = bank.spawnLander(1000)
    expect(lander, 'spawnLander(finite x) must return a live lander').not.toBeNull()
    expect(lander?.y).toBe(loadLanders().LANDER_SPAWN_Y)
    expect(lander?.alive).toBe(true)
    expect(lander?.carrying).toBe(false)
    expect(lander?.reachedTop).toBe(false)
    expect(bank.landers.length).toBe(1)
    // Enemies are processes on the shared run-list — NEWP LANDS0,STYPE (DEFB6.SRC:657).
    expect(sched.processes.length).toBeGreaterThan(before)
  })

  it('descends from the top: with a humanoid far below, the fresh lander moves DOWN', () => {
    const { sched, bank } = freshBank()
    const groundY = YMIN + 120 // a humanoid low on the terrain, well below the top
    bank.spawnHumanoid(1000, groundY)
    const lander = bank.spawnLander(1000)
    const y0 = lander?.y ?? -1
    // Step a little; the lander should be heading DOWN toward the target, not up/off.
    stepUntil(sched, () => (bank.landers[0]?.y ?? y0) > y0, 200)
    expect(
      bank.landers[0]?.y ?? y0,
      'a freshly spawned lander descends from the top toward its target (OYV = LNDYV, DEFB6.SRC:665)',
    ).toBeGreaterThan(y0)
  })
})

describe('df4-3 — the HUMANOID: walks the terrain (ASTRO, DEFB6.SRC:290)', () => {
  it('a spawned humanoid starts walking and then moves or turns along the terrain', () => {
    const { sched, bank } = freshBank()
    const h0 = bank.spawnHumanoid(1000, YMIN + 120)
    expect(h0, 'spawnHumanoid(finite coords) must return a live humanoid').not.toBeNull()
    expect(h0?.state).toBe('walking')
    const x0 = h0?.x ?? 0
    const f0 = h0?.facing
    // ASTRO moves +/-$20 and toggles its walk frames on NAP 2 — over enough ticks the
    // humanoid's X changes or its facing flips (it is not a static sprite).
    const moved = stepUntil(
      sched,
      () => (bank.humanoids[0]?.x ?? x0) !== x0 || bank.humanoids[0]?.facing !== f0,
      500,
    )
    expect(moved, 'the humanoid walks the terrain — its X or facing changes over time').toBeGreaterThan(0)
  })
})

describe('df4-3 — the GRAB: an aligned lander seizes the humanoid (LANDG0/LANDG3, DEFB6.SRC:738,778)', () => {
  it('a lander descending onto a humanoid grabs it: carrying + the humanoid becomes grabbed', () => {
    const { sched, bank } = freshBank()
    bank.spawnHumanoid(1000, YMIN + 120)
    bank.spawnLander(1000) // spawned in the same column — it descends onto the target
    const grabbed = stepUntil(
      sched,
      () => bank.landers.some((l) => l.carrying) && bank.humanoids.some((h) => h.state === 'grabbed'),
      MAX_TICKS,
    )
    expect(
      grabbed,
      'the lander must align with and seize the humanoid — carrying flips true and the ' +
        "humanoid's state becomes 'grabbed' (the kill-vector swap at DEFB6.SRC:783,792)",
    ).toBeGreaterThan(0)
  })
})

describe('df4-3 — CARRY-TO-TOP → the transform TRIGGER (LANDF, DEFB6.SRC:795,798)', () => {
  it('a carrying lander rises, then fires the one-shot transform trigger at the top', () => {
    const { sched, bank } = freshBank()
    bank.spawnHumanoid(1000, YMIN + 120)
    bank.spawnLander(1000)

    // 1) reach a carry.
    const grabbed = stepUntil(sched, () => bank.landers.some((l) => l.carrying), MAX_TICKS)
    expect(grabbed, 'precondition: the lander grabs the humanoid').toBeGreaterThan(0)
    const carrier = bank.landers.find((l) => l.carrying)
    const yAtGrab = carrier?.y ?? 0

    // 2) it RISES — carry velocity is COM(LNDYV), upward (DEFB6.SRC:785-789).
    const rose = stepUntil(sched, () => (bank.landers.find((l) => l.carrying)?.y ?? yAtGrab) < yAtGrab, 2000)
    expect(rose, 'a carrying lander rises toward the top after the grab').toBeGreaterThan(0)

    // 3) at the top it fires the transform trigger (reachedTop). df4-3 fires it;
    //    df4-4's mutant consumes it. The humanoid is pulled inside and consumed here
    //    (LNDFX1 kills the astro, DEFB6.SRC:823-827) — so no humanoid stays 'grabbed'.
    const triggered = stepUntil(sched, () => bank.landers.some((l) => l.reachedTop), MAX_TICKS)
    expect(triggered, 'the carrying lander reaches the top and fires the transform trigger').toBeGreaterThan(0)
    expect(
      bank.humanoids.some((h) => h.state === 'grabbed'),
      'once the trigger fires the abducted humanoid is consumed — none remains grabbed',
    ).toBe(false)

    // lang-review #14 (a transition edge must be a one-shot, not re-fired each tick):
    // stepping further neither un-triggers it nor re-grabs a consumed humanoid.
    sched.stepTick()
    sched.stepTick()
    expect(bank.landers.some((l) => l.reachedTop), 'reachedTop is latched, not per-tick').toBe(true)
  })
})

describe('df4-3 — SHOT CARRIER → the humanoid FALLS (LKIL1 → AFALL, DEFB6.SRC:903,911,927)', () => {
  it('killing a CARRYING lander drops its humanoid into a downward free-fall', () => {
    const { sched, bank } = freshBank()
    bank.spawnHumanoid(1000, YMIN + 120)
    bank.spawnLander(1000)
    const grabbed = stepUntil(sched, () => bank.landers.some((l) => l.carrying), MAX_TICKS)
    expect(grabbed, 'precondition: the lander grabs the humanoid').toBeGreaterThan(0)

    const carrier = bank.landers.find((l) => l.carrying)!
    bank.killLander(carrier) // LKIL1: a passenger-carrying lander is shot (DEFB6.SRC:905)

    // NEWP AFALL,STYPE (DEFB6.SRC:911): the humanoid is now falling.
    const falling = bank.humanoids.find((h) => h.state === 'falling')
    expect(falling, "the dropped humanoid enters the 'falling' state when its carrier dies").toBeTruthy()

    // AFALL accelerates DOWNWARD from rest (+8/tick, DEFB6.SRC:928). It starts at zero
    // velocity, so a `vel || default` bug (lang-review #4) would corrupt the first
    // step — assert the fall Y strictly INCREASES from the very first fall tick.
    const yStart = falling?.y ?? 0
    sched.stepTick()
    const yNext = bank.humanoids.find((h) => h.state === 'falling')?.y ?? yStart
    expect(yNext, 'the falling humanoid moves DOWN on the first tick even from rest (v=0 + accel)').toBeGreaterThan(
      yStart,
    )
    const fellFurther = stepUntil(
      sched,
      () => (bank.humanoids.find((h) => h.state === 'falling')?.y ?? yNext) > yNext,
      200,
    )
    expect(fellFurther, 'the fall accelerates — Y keeps increasing over subsequent ticks').toBeGreaterThan(0)
  })

  it('killing a NON-carrying lander drops no one', () => {
    const { sched, bank } = freshBank()
    bank.spawnHumanoid(1000, YMIN + 120)
    const lander = bank.spawnLander(2500)! // a different column — grabs nothing yet
    sched.stepTick() // one tick: still empty-handed, well before any grab
    expect(bank.landers[0]?.carrying, 'precondition: this lander carries no one').toBe(false)
    bank.killLander(lander)
    expect(
      bank.humanoids.some((h) => h.state === 'falling'),
      'no humanoid falls when the lander that died was carrying nobody (LKIL1 checks OBJID, DEFB6.SRC:905)',
    ).toBe(false)
  })
})

describe('df4-3 — module boundary guards (lang-review #21, the laser.ts precedent)', () => {
  it('a non-finite spawn coordinate is rejected and leaks no process', () => {
    const { sched, bank } = freshBank()
    const before = sched.processes.length
    expect(bank.spawnLander(Number.NaN), 'spawnLander(NaN) spawns nothing').toBeNull()
    expect(bank.spawnLander(Number.POSITIVE_INFINITY), 'spawnLander(Infinity) spawns nothing').toBeNull()
    expect(bank.spawnHumanoid(Number.NaN, 100), 'spawnHumanoid(NaN, y) spawns nothing').toBeNull()
    expect(bank.spawnHumanoid(100, Number.NaN), 'spawnHumanoid(x, NaN) spawns nothing').toBeNull()
    expect(bank.landers.length, 'no lander was created from a bad coord').toBe(0)
    expect(bank.humanoids.length, 'no humanoid was created from a bad coord').toBe(0)
    expect(sched.processes.length, 'a rejected spawn leaks no scheduler process').toBe(before)
  })
})
