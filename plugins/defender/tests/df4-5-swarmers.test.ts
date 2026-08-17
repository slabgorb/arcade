// tests/df4-5-swarmers.test.ts
//
// Story df4-5 — RED phase (O'Brien / TEA). The SWARMER (MSWM, DEFB6.SRC:141) as a pure,
// scheduler-driven reducer in src/core/swarmers.ts. The MSWM "mini swarmer" IS the arcade
// SWARMER (MESS0.SRC:418) — the fast pursuer a Pod (core/probes.ts) bursts into when shot.
// It seeks the player in X and fires a SWARM BOMB at the player on a timer.
//
// Re-derived from reference/original-source/defender/DEFB6.SRC:
//   MMSW           :144  spawn — SWCNT cap CMPA #20 / BHI (:148), NEWP MSWM,STYPE (:151)
//   *MINI SWARM PROCESS :195  MSWM — LDB SWXV / CMPY OX16 / BHS / NEGB (:196-200): SEEK X;
//                       Y accel with damping + random factor, clamped ±$200 (:208-231)
//   MSWMF          :245  DEC PD4 / BNE / JSR SWBMB — fire a swarm bomb on the shot timer
//   NAP 3,MSWLP    :249  the process cadence
//
// SCOPE FENCE: IN — spawn as a scheduler process, SWCNT cap, SEEK-X pursuit, the SHOOT-on-timer
//   decision + aim (SWBMB), and MSWKIL death (DEC SWCNT). OUT — the Y damping/random/clamp
//   flight detail (SWXV/SWSTIM are wave RAM, placeholders — df5), the projectile ENTITY (an
//   injected sink), live sim wiring (synthetic only), the swarm-bomb-vs-player collision (df4-1).
//
// Every scenario drives the ONE cabinet scheduler. `rand`, `player`, `fire` are INJECTED.

import { describe, it, expect } from 'vitest'
import { createScheduler } from '../src/core/scheduler.js'
import { stepUntil } from './helpers/df4-3-landers-contract.js'
import { loadSwarmer, type EnemyDeps, type PlayerPos, type SwarmerBank } from './helpers/df4-5-enemies-contract.js'

const MAX_TICKS = 20_000
// A fixed injected byte source keeps every scenario reproducible (the sim owns real entropy).
const constRand = (): number => 0x40

/** One recorded shot from the injected SHOOT sink. */
interface Shot {
  fromX: number
  fromY: number
  toX: number
  toY: number
}

interface Rig {
  sched: ReturnType<typeof createScheduler>
  bank: SwarmerBank
  shots: Shot[]
}

function makeBank(playerFn: () => PlayerPos, rand: () => number = constRand): Rig {
  const sched = createScheduler()
  const shots: Shot[] = []
  const deps: EnemyDeps = {
    rand,
    player: playerFn,
    fire: (fromX, fromY, toX, toY) => shots.push({ fromX, fromY, toX, toY }),
  }
  const bank = loadSwarmer().createSwarmerBank(sched, deps)
  return { sched, bank, shots }
}

function freshBank(player: PlayerPos): Rig {
  return makeBank(() => player)
}

describe('df4-5 — the SWARMER (MSWM) exists as a cited process (DEFB6.SRC:141, NAP 3 :249)', () => {
  it('exposes its fixed ROM constants at their byte-verified magnitudes', () => {
    const mod = loadSwarmer()
    expect(mod.SWARMER_NAP, 'NAP 3,MSWLP (DEFB6.SRC:249)').toBe(3)
    expect(mod.SWARMER_MAX, 'CMPA #20 — the SWCNT cap (DEFB6.SRC:148)').toBe(20)
  })

  it('a spawned swarmer starts alive at its coords and is a scheduler process', () => {
    const { sched, bank } = freshBank({ x: 5000, y: 200 })
    const before = sched.processes.length
    const s = bank.spawnSwarmer(1000, 120)
    expect(s, 'spawnSwarmer(finite coords) must return a live swarmer').not.toBeNull()
    expect(s?.x).toBe(1000)
    expect(s?.y).toBe(120)
    expect(s?.alive).toBe(true)
    expect(bank.swarmers.length).toBe(1)
    expect(sched.processes.length, 'the swarmer runs as a process on the shared run-list').toBeGreaterThan(before)
  })

  it('a non-finite spawn coordinate is rejected and leaks no process (lang-review #21)', () => {
    const { sched, bank } = freshBank({ x: 5000, y: 200 })
    const before = sched.processes.length
    expect(bank.spawnSwarmer(Number.NaN, 120), 'spawnSwarmer(NaN, y) spawns nothing').toBeNull()
    expect(bank.spawnSwarmer(1000, Number.POSITIVE_INFINITY), 'spawnSwarmer(x, Infinity) spawns nothing').toBeNull()
    expect(bank.swarmers.length, 'no swarmer was created from a bad coord').toBe(0)
    expect(sched.processes.length, 'a rejected spawn leaks no scheduler process').toBe(before)
  })
})

describe('df4-5 — the SWARMER SEEKS the player in X (MSWM LDB SWXV, DEFB6.SRC:196-200)', () => {
  it('a swarmer to the LEFT of the player moves RIGHT, toward the player column', () => {
    const { sched, bank } = freshBank({ x: 6000, y: 200 })
    const s = bank.spawnSwarmer(1000, 120)
    const x0 = s?.x ?? 0
    const closed = stepUntil(sched, () => (bank.swarmers[0]?.x ?? x0) > x0, MAX_TICKS)
    expect(
      closed,
      'the swarmer seeks the player horizontally — with the player to its right its X increases ' +
        '(LDB SWXV, signed toward PLABX, DEFB6.SRC:196-200)',
    ).toBeGreaterThan(0)
  })

  it('a swarmer to the RIGHT of the player moves LEFT, toward the player column', () => {
    const { sched, bank } = freshBank({ x: 1000, y: 200 })
    const s = bank.spawnSwarmer(6000, 120)
    const x0 = s?.x ?? 0
    const closed = stepUntil(sched, () => (bank.swarmers[0]?.x ?? x0) < x0, MAX_TICKS)
    expect(closed, 'with the player to its left the swarmer seeks left — X decreases (NEGB, :200)').toBeGreaterThan(0)
  })
})

describe('df4-5 — the SWARMER SHOOTS a swarm bomb at the player on a timer (SWBMB, DEFB6.SRC:245-251)', () => {
  it('fires at the player when its shot timer expires, and RE-ARMS (fires more than once)', () => {
    const player: PlayerPos = { x: 5000, y: 200 }
    const { sched, bank, shots } = freshBank(player)
    bank.spawnSwarmer(1000, 120)
    // DEC PD4 / BNE / JSR SWBMB (DEFB6.SRC:245-248): a swarm bomb fires when the timer reaches
    // zero, and the timer RELOADS (SWSTIM), so a live swarmer shoots repeatedly.
    const firedTwice = stepUntil(sched, () => shots.length >= 2, MAX_TICKS)
    expect(
      firedTwice,
      'a live swarmer shoots on its timer and re-arms — the shot count reaches 2 (not a one-shot)',
    ).toBeGreaterThan(0)
    // Every swarm bomb is AIMED at the player (SWBMB fires toward PLABX): the injected sink's
    // target must be the player's pose, not a fixed direction.
    for (const s of shots) {
      expect({ toX: s.toX, toY: s.toY }, 'each swarm bomb is aimed at the player').toEqual({
        toX: player.x,
        toY: player.y,
      })
    }
  })
})

describe('df4-5 — the SWARMER dies (MSWKIL, DEFB6.SRC:176) and guards a non-finite player', () => {
  it('killSwarmer removes the swarmer from the live bank (DEC SWCNT)', () => {
    const { sched, bank } = freshBank({ x: 5000, y: 200 })
    const s = bank.spawnSwarmer(1000, 120)
    expect(s, 'precondition: spawn returns a live swarmer').not.toBeNull()
    if (!s) return
    expect(bank.swarmers.length).toBe(1)
    bank.killSwarmer(s)
    sched.stepTick()
    expect(bank.swarmers.some((x) => x === s), 'a killed swarmer leaves the live bank').toBe(false)
  })

  it('a non-finite injected player() pose never corrupts the swarmer position, and fires no shot (#21)', () => {
    const nanPlayer = { x: Number.NaN, y: Number.NaN }
    const { sched, bank, shots } = makeBank(() => nanPlayer)
    bank.spawnSwarmer(1000, 120)
    // 200 ticks spans several shot-timer expiries, so the FIRE half of the guard is exercised.
    for (let t = 0; t < 200; t++) {
      sched.stepTick()
      const s = bank.swarmers[0]
      expect(s, `the swarmer must persist through tick ${t}`).toBeDefined()
      const x = s ? s.x : Number.NaN
      const y = s ? s.y : Number.NaN
      expect(Number.isFinite(x), `the swarmer's X stayed finite despite a NaN player at tick ${t}`).toBe(true)
      expect(Number.isFinite(y), `the swarmer's Y stayed finite despite a NaN player at tick ${t}`).toBe(true)
    }
    // The FIRE half of the #21 guard: no swarm bomb is aimed at a non-finite player.
    expect(shots.length, 'no swarm bomb fires while the player pose is non-finite').toBe(0)
  })
})
