// tests/df4-5-bombers.test.ts
//
// Story df4-5 — RED phase (O'Brien / TEA). The BOMBER (the TIE process, DEFB6.SRC:1023)
// as a pure, scheduler-driven reducer in src/core/ties.ts. The TIE is the arcade BOMBER:
// a formation flyer that lays BOMBS (mines) as it goes — it is the BOMBER precisely because
// it drops bombs (DEFB6.SRC:1112-1115 `LDA LSEED / ANDA #$7 / BNE / BSR BOMBST`). BOMBST
// (:1136) is the bomb it lays, NOT an enemy — the correction to the story's AC1 guess.
//
// Re-derived from reference/original-source/defender/DEFB6.SRC:
//   *TIE PROCESS   :1023  TIE — the formation flyer; own colour table TCTAB (:1206)
//   TIE31          :1112  LDA LSEED / ANDA #$7 / BNE TIEX / BSR BOMBST — the 1/8 bomb gate
//   NAP 1,TIE      :1116  the process cadence
//   BOMBST         :1136  LDA BMBCNT / CMPA #10 / BHS — the BMBCNT cap; lifetime SEED&$1F+1 (:1146)
//
// SCOPE FENCE: IN — spawn as a scheduler process, the 1/8 LSEED bomb-drop gate, the BMBCNT
//   cap (≤10), a laid bomb's lifetime (≥1), and TIEKIL death. OUT — the TIE's squad/cruise-alt
//   flight path (wave-table RAM, df5), live scheduler/sim wiring (synthetic only this story),
//   the bomb-vs-player collision (df4-1's COLIDE consumes it later), scoring (df5).
//
// Every scenario drives the ONE cabinet scheduler (df3 scheduler.ts). `rand` (the LSEED gate
// + the SEED lifetime) and `player` (the cruise-altitude target) are INJECTED.

import { describe, it, expect } from 'vitest'
import { createScheduler } from '../src/core/scheduler.js'
import { stepUntil } from './helpers/df4-3-landers-contract.js'
import { loadBomber, type BomberBank, type BomberDeps, type PlayerPos } from './helpers/df4-5-enemies-contract.js'

const MAX_TICKS = 20_000

interface Rig {
  sched: ReturnType<typeof createScheduler>
  bank: BomberBank
}

/** Spin up a fresh scheduler + bomber bank with an injectable player + rand source. */
function makeBank(rand: () => number, playerFn: () => PlayerPos = () => ({ x: 5000, y: 200 })): Rig {
  const sched = createScheduler()
  const deps: BomberDeps = { rand, player: playerFn }
  const bank = loadBomber().createBomberBank(sched, deps)
  return { sched, bank }
}

// A rand value whose low 3 bits are ZERO OPENS the bomb-drop gate (LSEED & $7 === 0), and
// whose low 5 bits are non-zero gives a LONG bomb lifetime (SEED & $1F + 1). 0x18 = 24:
// 24 & 7 === 0 (gate OPEN), 24 & 0x1F === 24 (lifetime 25) — bombs drop AND persist.
const gateOpenLongLife = (): number => 0x18
// Low 3 bits non-zero KEEPS the gate SHUT: 0x01 & 7 === 1 — no bomb ever drops.
const gateShut = (): number => 0x01

describe('df4-5 — the BOMBER (TIE) exists as a cited process (DEFB6.SRC:1023, NAP 1 :1116)', () => {
  it('exposes its fixed ROM constants at their byte-verified magnitudes', () => {
    const mod = loadBomber()
    expect(mod.TIE_NAP, 'NAP 1,TIE (DEFB6.SRC:1116)').toBe(1)
    expect(mod.BOMB_MAX, 'CMPA #10 — the BMBCNT cap (DEFB6.SRC:1137)').toBe(10)
    expect(mod.BOMB_DROP_MASK, 'ANDA #$7 — the 1/8 drop gate (DEFB6.SRC:1113)').toBe(0x7)
    expect(mod.BOMB_LIFETIME_MASK, 'ANDA #$1F — the lifetime seed mask (DEFB6.SRC:1146)').toBe(0x1f)
  })

  it('a spawned bomber starts alive at its coords and is a scheduler process', () => {
    const { sched, bank } = makeBank(gateShut)
    const before = sched.processes.length
    const bomber = bank.spawnBomber(1000, 120)
    expect(bomber, 'spawnBomber(finite coords) must return a live bomber').not.toBeNull()
    expect(bomber?.x).toBe(1000)
    expect(bomber?.y).toBe(120)
    expect(bomber?.alive).toBe(true)
    expect(bank.bombers.length).toBe(1)
    expect(sched.processes.length, 'the bomber runs as a process on the shared run-list').toBeGreaterThan(before)
  })

  it('a non-finite spawn coordinate is rejected and leaks no process (lang-review #21)', () => {
    const { sched, bank } = makeBank(gateShut)
    const before = sched.processes.length
    expect(bank.spawnBomber(Number.NaN, 120), 'spawnBomber(NaN, y) spawns nothing').toBeNull()
    expect(bank.spawnBomber(1000, Number.POSITIVE_INFINITY), 'spawnBomber(x, Infinity) spawns nothing').toBeNull()
    expect(bank.bombers.length, 'no bomber was created from a bad coord').toBe(0)
    expect(sched.processes.length, 'a rejected spawn leaks no scheduler process').toBe(before)
  })
})

describe('df4-5 — the BOMBER lays BOMBS: the identity proof (TIE31 BSR BOMBST, DEFB6.SRC:1112-1115)', () => {
  it('a live bomber drops at least one bomb when the 1/8 gate is open (this is why it is the Bomber)', () => {
    const { sched, bank } = makeBank(gateOpenLongLife)
    bank.spawnBomber(1000, 120)
    const dropped = stepUntil(sched, () => bank.bombs.length >= 1, MAX_TICKS)
    expect(
      dropped,
      'the TIE process lays a bomb when (LSEED & 7) === 0 — a bomber that never drops a bomb is ' +
        'not the arcade Bomber (BSR BOMBST, DEFB6.SRC:1115)',
    ).toBeGreaterThan(0)
  })

  it('drops NO bomb while the 1/8 gate stays shut ((LSEED & 7) !== 0) — the gate is real, not vacuous', () => {
    const { sched, bank } = makeBank(gateShut)
    bank.spawnBomber(1000, 120)
    for (let t = 0; t < 500; t++) sched.stepTick()
    expect(
      bank.bombs.length,
      'with the drop gate held shut the bomber lays no bombs — a bomber that drops regardless ' +
        'of LSEED has no gate (the ANDA #$7 test, DEFB6.SRC:1113, would be dead)',
    ).toBe(0)
  })

  it('never exceeds the BMBCNT cap of 10 live bombs (CMPA #10 / BHS, DEFB6.SRC:1137)', () => {
    const { sched, bank } = makeBank(gateOpenLongLife)
    bank.spawnBomber(1000, 120)
    // The bomber must persist the whole run so the cap invariant is checked every tick (no
    // vacuous early exit — lang-review #15).
    const CAP_TICKS = 1000
    let ticksChecked = 0
    for (let t = 0; t < CAP_TICKS; t++) {
      sched.stepTick()
      expect(
        bank.bombs.length,
        `bombs exceeded the BMBCNT cap at tick ${t} (${bank.bombs.length} > 10) — the CMPA #10 ` +
          'guard must hold (DEFB6.SRC:1137)',
      ).toBeLessThanOrEqual(10)
      ticksChecked++
    }
    expect(ticksChecked, 'the cap guard must run every tick, not exit early').toBe(CAP_TICKS)
    // …and the gate is genuinely open here, so the cap is actually exercised (not vacuously ≤10
    // because nothing dropped): at least one bomb must have been laid.
    expect(bank.bombs.length, 'the gate was open — bombs were actually laid, so the cap is real').toBeGreaterThan(0)
  })

  it('each laid bomb carries a positive finite lifetime ((SEED & $1F) + 1 ≥ 1, DEFB6.SRC:1146-1147)', () => {
    const { sched, bank } = makeBank(gateOpenLongLife)
    bank.spawnBomber(1000, 120)
    stepUntil(sched, () => bank.bombs.length >= 1, MAX_TICKS)
    expect(bank.bombs.length, 'precondition: a bomb was laid').toBeGreaterThan(0)
    for (const b of bank.bombs) {
      expect(Number.isFinite(b.lifetime), 'a bomb lifetime must be finite').toBe(true)
      expect(b.lifetime, 'lifetime is (SEED & $1F)+1, so always ≥ 1 (INCA, DEFB6.SRC:1147)').toBeGreaterThanOrEqual(1)
    }
  })
})

describe('df4-5 — the BOMBER dies (TIEKIL, DEFB6.SRC:1118) and guards a non-finite player', () => {
  it('killBomber removes the bomber from the live bank', () => {
    const { sched, bank } = makeBank(gateShut)
    const bomber = bank.spawnBomber(1000, 120)
    expect(bomber, 'precondition: spawn returns a live bomber').not.toBeNull()
    if (!bomber) return
    expect(bank.bombers.length).toBe(1)
    bank.killBomber(bomber)
    sched.stepTick()
    expect(bank.bombers.some((b) => b === bomber), 'a killed bomber leaves the live bank').toBe(false)
  })

  it('a non-finite injected player() pose never corrupts the bomber position (per-tick #21 guard)', () => {
    // The bomber tracks the player's altitude (cruise-alt adjust, TIE09 DEFB6.SRC:1090+); a
    // non-finite player() must not poison its Y and permanently NaN it.
    const nanPlayer = { x: Number.NaN, y: Number.NaN }
    const { sched, bank } = makeBank(gateShut, () => nanPlayer)
    bank.spawnBomber(1000, 120)
    for (let t = 0; t < 200; t++) {
      sched.stepTick()
      const b = bank.bombers[0]
      expect(b, `the bomber must persist through tick ${t}`).toBeDefined()
      const x = b ? b.x : Number.NaN
      const y = b ? b.y : Number.NaN
      expect(Number.isFinite(x), `the bomber's X stayed finite despite a NaN player at tick ${t}`).toBe(true)
      expect(Number.isFinite(y), `the bomber's Y stayed finite despite a NaN player at tick ${t}`).toBe(true)
    }
  })
})
