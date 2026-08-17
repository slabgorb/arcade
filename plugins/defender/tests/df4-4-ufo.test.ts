// tests/df4-4-ufo.test.ts
//
// Story df4-4 — RED phase (Han Solo / TEA). The UFO / BAITER — the timeout pursuer — as
// a pure, scheduler-driven reducer in src/core/ufo.ts: it materializes, seeks the player
// in X and Y (Y at half rate), and shoots on a timer that starts at 8. Re-derived from
// DEFB6.SRC (UFOST :5, the UFOLP loop :26-46, INIT SHOT TIMER :21-22, the UFONV seek
// velocity :48-78, NAP 6 :46, DEC UFOCNT :81).
//
// SCOPE FENCE (encoded here so a later reader sees the boundary in the tests):
//   IN  — spawn as a process, the UFONV SEEK-X/SEEK-Y pursuit, the fixed first-shot timer
//         (8), the SHOOT-on-timer decision + aim, and the UFOKIL death. FIXED ROM bytes
//         are pinned; the shot RELOAD interval (UFSTIM) and seek probability (UFOSK) are
//         wave-table RAM (PHR6.SRC:404-405) — df4-4 placeholders pending df5, exactly as
//         landers.ts's speeds are (the df4-3 precedent).
//   OUT — the projectile ENTITY a shot becomes (df4-5/df5 — SHOOT is an injected sink);
//         live scheduler/sim integration (synthetic processes only); the DEFA7 timeout
//         that SPAWNS the baiter (:1687, a df5 wave concern). None asserted here.
//
// Every scenario drives the ONE cabinet scheduler (df3 scheduler.ts) — the baiter is a
// process, never its own tick. `rand`, `player`, and `fire` are injected (the contract).

import { describe, it, expect } from 'vitest'
import { createScheduler } from '../src/core/scheduler.js'
import { stepUntil } from './helpers/df4-3-landers-contract.js'
import { loadUfo, type EnemyDeps, type PlayerPos, type UfoBank } from './helpers/df4-4-enemies-contract.js'

const MAX_TICKS = 20_000

// A fixed injected byte source keeps every scenario reproducible.
const constRand = (): number => 0xff

/** One recorded shot from the injected SHOOT sink. */
interface Shot {
  fromX: number
  fromY: number
  toX: number
  toY: number
}

/** Spin up a fresh scheduler + UFO bank with a fixed player and a recording fire sink. */
function freshBank(player: PlayerPos): {
  sched: ReturnType<typeof createScheduler>
  bank: UfoBank
  shots: Shot[]
} {
  const sched = createScheduler()
  const shots: Shot[] = []
  const deps: EnemyDeps = {
    rand: constRand,
    player: () => player,
    fire: (fromX, fromY, toX, toY) => shots.push({ fromX, fromY, toX, toY }),
  }
  const bank = loadUfo().createUfoBank(sched, deps)
  return { sched, bank, shots }
}

describe('df4-4 — the BAITER: exists as a cited process (UFOST, DEFB6.SRC:5, NAP 6 :46)', () => {
  it('exposes the cited fixed constants at their byte-verified ROM magnitudes', () => {
    const m = loadUfo()
    // LDA #8 / STA PD2 INIT SHOT TIMER (DEFB6.SRC:21-22) — pin the exact first-shot delay,
    // not just "positive": a changed init timer must redden.
    expect(m.UFO_SHOT_TIMER_INIT).toBe(8)
    // NAP 6,UFOLP (DEFB6.SRC:46) — pin the exact cadence (the baiter is slower-ticking than
    // the mutant's NAP 3); a copied cadence must redden.
    expect(m.UFO_NAP).toBe(6)
  })

  it('a spawned baiter starts alive at its coords and is a scheduler process (NEWP UFOLP,STYPE)', () => {
    const { sched, bank } = freshBank({ x: 6000, y: 200 })
    const before = sched.processes.length
    const ufo = bank.spawnUfo(1000, 100)
    expect(ufo, 'spawnUfo(finite coords) must return a live baiter').not.toBeNull()
    expect(ufo?.x).toBe(1000)
    expect(ufo?.y).toBe(100)
    expect(ufo?.alive).toBe(true)
    expect(bank.ufos.length).toBe(1)
    // The baiter is a process on the shared run-list — NEWP UFOLP,STYPE (DEFB6.SRC:5).
    expect(sched.processes.length).toBeGreaterThan(before)
  })
})

describe('df4-4 — the BAITER PURSUES the player (UFONV, DEFB6.SRC:50-78)', () => {
  it('seeks the player in X: a baiter left of the player drifts RIGHT toward it', () => {
    const { sched, bank } = freshBank({ x: 6000, y: 100 })
    const u = bank.spawnUfo(1000, 100)
    const x0 = u?.x ?? 0
    const closed = stepUntil(sched, () => (bank.ufos[0]?.x ?? x0) > x0, MAX_TICKS)
    expect(
      closed,
      'the baiter seeks the player horizontally — its velocity aims at PLABX (UFONV, :53-65) ' +
        'and its X closes on the player',
    ).toBeGreaterThan(0)
  })

  it('seeks the player in Y: a baiter above the player drifts DOWN toward it (UFONV3, :66-78)', () => {
    const { sched, bank } = freshBank({ x: 1000, y: 220 })
    const u = bank.spawnUfo(1000, 100) // same column, player well below
    const y0 = u?.y ?? 0
    const closed = stepUntil(sched, () => (bank.ufos[0]?.y ?? y0) > y0, MAX_TICKS)
    expect(closed, 'the baiter seeks the player vertically — its Y closes on PLAYC (UFONV3, :66-78)').toBeGreaterThan(0)
  })
})

describe('df4-4 — the BAITER SHOOTS at the player on a timer that starts at 8 (UFOLP, DEFB6.SRC:30-38)', () => {
  it('does NOT shoot before its shot timer has counted down (the timer gates the shot)', () => {
    const { sched, bank, shots } = freshBank({ x: 6000, y: 200 })
    bank.spawnUfo(1000, 100)
    // The timer inits to 8 and DECs toward zero (DEC PD2 / BNE UFO1, :30-31). Within the
    // first few ticks it cannot have reached zero — a baiter that fires here is firing
    // every dispatch (the timer is not gating), which this asserts against.
    for (let t = 0; t < 5; t++) sched.stepTick()
    expect(shots.length, 'the baiter must not fire before its shot timer expires').toBe(0)
  })

  it('fires at the player once the timer expires, and RE-ARMS (fires more than once)', () => {
    const player: PlayerPos = { x: 6000, y: 200 }
    const { sched, bank, shots } = freshBank(player)
    bank.spawnUfo(1000, 100)

    // LDA UFSTIM / STA PD2 / JSR SHOOT (DEFB6.SRC:32-35): the timer reloads after firing,
    // so a live baiter shoots repeatedly.
    const firedTwice = stepUntil(sched, () => shots.length >= 2, MAX_TICKS)
    expect(
      firedTwice,
      'a live baiter shoots on its timer and re-arms — the shot count reaches 2 (not a one-shot)',
    ).toBeGreaterThan(0)

    // Every shot is AIMED at the player (JSR SHOOT toward PLABX/PLAYC).
    for (const s of shots) {
      expect({ toX: s.toX, toY: s.toY }, 'each baiter shot is aimed at the player').toEqual({
        toX: player.x,
        toY: player.y,
      })
    }
  })
})

describe('df4-4 — the BAITER dies (UFOKIL, DEFB6.SRC:81) and guards its spawn boundary', () => {
  it('killUfo removes the baiter from the live bank', () => {
    const { sched, bank } = freshBank({ x: 6000, y: 200 })
    const ufo = bank.spawnUfo(1000, 100)!
    expect(bank.ufos.length).toBe(1)
    bank.killUfo(ufo)
    sched.stepTick() // its process SUCIDEs on its next wake
    expect(bank.ufos.some((u) => u === ufo), 'a killed baiter leaves the live bank (DEC UFOCNT)').toBe(false)
  })

  it('a non-finite spawn coordinate is rejected and leaks no process (lang-review #21)', () => {
    const { sched, bank } = freshBank({ x: 6000, y: 200 })
    const before = sched.processes.length
    expect(bank.spawnUfo(Number.NaN, 100), 'spawnUfo(NaN, y) spawns nothing').toBeNull()
    expect(bank.spawnUfo(1000, Number.POSITIVE_INFINITY), 'spawnUfo(x, Infinity) spawns nothing').toBeNull()
    expect(bank.ufos.length, 'no baiter was created from a bad coord').toBe(0)
    expect(sched.processes.length, 'a rejected spawn leaks no scheduler process').toBe(before)
  })
})
