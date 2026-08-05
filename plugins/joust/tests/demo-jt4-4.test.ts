// tests/demo-jt4-4.test.ts
//
// Story jt4-4 — RED phase (Leeloo / TEA). The SIM-behaviour half of the loop story:
// the demo.ts concerns the session layer's stepGame drives but does not own —
//
//   1. DBAIT baiter removal + the NBAIT settle-on-entry (deferred by jt3, demo.ts).
//      A baiter that dissolves is REMOVED and the NBAIT count SETTLES so the max-3
//      cap (PCHASE=−1, CMPA #3-1, JOUSTRV4.SRC:2108-2113) frees a slot instead of the
//      swarm holding forever — the ROM DECrements NBAIT on the baiter's death entry
//      (PTEKLL, JOUSTRV4.SRC:1370-1372). Proven by filling the cap, killing one, and
//      spawning again.
//   2. The LIVE partner-kill DETECTION event — collisionPass must emit a
//      DISTINGUISHABLE partner-kill event when one player kills another, so the
//      session layer (stepGame) can drive recordPartnerKill. Today the joust loser is
//      removed SILENTLY (jt4-3 Delivery Finding).
//   3. The WAVEGG egg-hatch spawn wired into spawnWaveEnemies — an egg wave (wave 5,
//      status $08) enters its complement AS EGGS (WAVEGG `LDX #EGG1`, JOUSTRV4.SRC:
//      2737-2776), not as materialising ground enemies. jt4-3 built the predicate
//      (eggWaveSpawnsEggs); jt4-4 wires it, as spawnWavePteros wires the ptero count.
//
// demo.ts already exists, so these redden on the MISSING BEHAVIOUR (a clean assertion
// red), not a module-resolution trace. The `baiter`/`baiterClock` fields live on the
// real demo.ts (jt3-5/3-7) but not on the jt2-7 demo-contract, so — as the jt3-7
// menagerie suite does — they are reached through local structural views. The source
// re-derivation + JT44-* claims live in tests/game-loop-source.test.ts. Each test
// NAMES the mutant it kills.

import { describe, it, expect } from 'vitest'
import { loadDemo } from './helpers/demo-contract.js'
import { loadBaiter } from './helpers/baiter-contract.js'
import type { DemoProcess, DemoState, EntityState } from './helpers/demo-contract.js'
import type { BaiterClock } from './helpers/baiter-contract.js'

const SEED = 0x1234

// The real demo.ts carries `baiter` on a ptero process (jt3-5) and `baiterClock` on
// the DemoState (jt3-5) — fields the frozen jt2-7 contract never grew. These local
// views read/write them without weakening the shared contract.
type BaiterProc = DemoProcess & { baiter?: boolean }
type DemoWithClock = DemoState & { baiterClock?: BaiterClock }

function entity(over: Partial<EntityState> = {}): EntityState {
  return {
    posX: 50, posY: 100 << 8, velXIndex: 0, velXFrac: 0, velY: 0,
    timeUp: 1, groundState: null, plantZ: 0, airborne: true, animPhase: 0, ...over,
  }
}

const liveBaiters = (d: DemoState): DemoProcess[] =>
  d.sim.processes.filter((p) => p.kind === 'ptero' && (p as BaiterProc).baiter === true)
const hasEgg = (d: DemoState): boolean => d.sim.processes.some((p) => p.kind === 'egg')

/** One forced wave advance at the demo level: strip to players (a cleared wave) + step. */
function forceAdvance(d: Awaited<ReturnType<typeof loadDemo>>, demo: DemoState): DemoState {
  const players = demo.sim.processes.filter((p) => p.kind === 'player')
  return d.stepDemo({ ...demo, sim: { ...demo.sim, processes: players }, events: [] })
}
function advanceTo(d: Awaited<ReturnType<typeof loadDemo>>, demo: DemoState, target: number): DemoState {
  let s = demo
  let guard = 0
  while (s.wave < target) {
    s = forceAdvance(d, s)
    if (++guard > 60) throw new Error(`stuck advancing to wave ${target} at ${s.wave}`)
  }
  return s
}

/** A player positioned to win a lance-height joust against the entity 4px to its right.
 *  jt9-14 re-seat 110→109 (lanceOffset 9): the player-vs-ptero/baiter pass now runs
 *  narrowPhase after broadPhase (the ROM's BPCOL→OSTHIT gate, JOUSTRV4.SRC:4944-4952),
 *  and CWNG3R×PT1RC overlap only at lanceOffset 8-9 — offset 10 became a mask MISS.
 *  Offset 9 is in the band AND the mask (green pre- and post-jt9-14). */
function lancePlayer(): DemoProcess {
  return {
    id: 1, cls: 'primary', nap: 1, period: 1, kind: 'player', facing: 1, mount: 'ostrich',
    collisionEnabled: true, entity: entity({ posX: 100, posY: 109 << 8 }),
  }
}

/** A BAITER process (a ptero tagged PCHASE≠0) CO-LOCATED with the lance player,
 *  lower — killable. jt9-43 COLDX re-seat 104→100: at dy=−9 only player row 0 [7,9]
 *  aligns with PT1RC row 9 [8,15], and narrowPhase now folds COLDX — dx=4 shifts it
 *  to [12,19], a MISS (the ROM rejects it too). Co-locating keeps the lance-row
 *  masks superimposed (COLDX=0 right-facer kill, JOUSTRV4.SRC:4994). */
function baiterVictim(): BaiterProc {
  return {
    id: 0x0880, cls: 'secondary', nap: 1, period: 1, kind: 'ptero', baiter: true, facing: -1,
    collisionEnabled: true, entity: entity({ posX: 100, posY: 100 << 8 }),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DBAIT — the baiter removal + the NBAIT settle-on-entry (the max-3 cap frees).
// ─────────────────────────────────────────────────────────────────────────────
describe('DBAIT — a dissolved baiter settles NBAIT so the max-3 cap frees a slot', () => {
  it('killing a baiter DECREMENTS the on-screen count (NBAIT settles on the death entry)', async () => {
    const demo = await loadDemo()
    const baiter = await loadBaiter()
    // Cap FULL (NBAIT = MAX_BAITERS). An enemy is kept so the wave does not clear (a clear
    // would re-seed the clock and hide the settle). The player lance-kills the baiter.
    const base = demo.createWaveDemo(SEED)
    const anEnemy = base.sim.processes.find((p) => p.kind === 'enemy')
    expect(anEnemy, 'wave 1 supplies a ground enemy to hold the wave open').toBeTruthy()
    const state: DemoWithClock = {
      ...base,
      sim: { ...base.sim, processes: [lancePlayer(), baiterVictim(), anEnemy!] },
      events: [],
      baiterClock: { cbait: 999, nbait: baiter.MAX_BAITERS, pbaitn: 0 },
    }
    const stepped = demo.stepDemo(state) as DemoWithClock
    // The killed baiter is no longer a live baiter (it enters the dissolve) — the removal half.
    expect(liveBaiters(stepped).length, 'the killed baiter is removed from the live count').toBe(0)
    expect(stepped.wave, 'the enemy held the wave open (no re-seed)').toBe(base.wave)
    // The settle: NBAIT drops below the cap (kills "the swarm holds MAX_BAITERS forever" —
    // the deferred DBAIT: nothing decrements NBAIT on a baiter death today).
    expect(stepped.baiterClock?.nbait, 'a baiter death settles NBAIT by one').toBe(baiter.MAX_BAITERS - 1)
  })

  it('fill the cap, kill one, spawn again — the freed slot lets a new baiter send off', async () => {
    const demo = await loadDemo()
    const baiter = await loadBaiter()
    // NBAIT at the cap and a send-off armed (cbait 1). With the swarm stuck at MAX_BAITERS the
    // EMYOK cap check (CMPA #3-1 / BHI) refuses every send-off forever; only the DBAIT settle
    // on the kill drops NBAIT so the next nap-tick can send a new baiter.
    const base = demo.createWaveDemo(SEED)
    const anEnemy = base.sim.processes.find((p) => p.kind === 'enemy')!
    let d: DemoState = {
      ...base,
      sim: { ...base.sim, processes: [lancePlayer(), baiterVictim(), anEnemy] },
      events: [],
      baiterClock: { cbait: 1, nbait: baiter.MAX_BAITERS, pbaitn: 5 },
    } as DemoWithClock
    let fresh = 0
    for (let f = 1; f <= 16; f++) {
      d = demo.stepDemo(d)
      // A freshly SENT baiter rides the per-frame send-off id namespace (0x30_0000+frame),
      // distinct from the killed baiter (0x0880).
      fresh = d.sim.processes.filter(
        (p) => p.kind === 'ptero' && (p as BaiterProc).baiter && p.id >= 0x30_0000,
      ).length
      if (fresh > 0) break
    }
    // RED today: NBAIT never settles, so the cap stays full and NO new baiter ever sends off.
    expect(fresh, 'after the kill frees a slot, a new baiter sends off within the window').toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// The LIVE partner-kill DETECTION event — collisionPass distinguishes a PvP kill.
// ─────────────────────────────────────────────────────────────────────────────
describe('partner-kill detection — collisionPass emits a distinguishable partner-kill event', () => {
  it('when one player kills another, a partner-kill event names the WINNER (not a silent removal)', async () => {
    const demo = await loadDemo()
    // P1 (higher on screen) wins the lance-height joust; P2 (8px lower) dies. Today the loser
    // is removed SILENTLY (no event) — jt4-3 could not tell an enemy-kill from a partner-kill.
    const p1: DemoProcess = {
      id: 1, cls: 'primary', nap: 1, period: 1, kind: 'player', facing: 1, mount: 'ostrich',
      collisionEnabled: true, entity: entity({ posX: 100, posY: 100 << 8 }),
    }
    const p2: DemoProcess = {
      id: 2, cls: 'primary', nap: 1, period: 1, kind: 'player', facing: -1, mount: 'stork',
      collisionEnabled: true, entity: entity({ posX: 104, posY: 108 << 8 }),
    }
    const base = demo.createWaveDemo(SEED)
    const stepped = demo.stepDemo({ ...base, sim: { ...base.sim, processes: [p1, p2] }, events: [] })
    // Non-vacuous: the kill actually happened (P2 removed) so the missing thing is the EVENT.
    const survivors = stepped.sim.processes.filter((p) => p.kind === 'player').map((p) => p.id)
    expect(survivors, 'P1 wins the partner-joust; P2 is removed').toEqual([1])
    // The distinguishable event the session layer needs to drive recordPartnerKill. A widened
    // view — the new variant is not in the jt2-7 DemoEvent union the contract froze.
    const events = stepped.events as readonly { kind: string; winner?: number; loser?: number }[]
    const pk = events.find((e) => e.kind === 'partnerKill')
    expect(pk, 'collisionPass emits a partnerKill event on a PvP kill (not a silent removal)').toBeTruthy()
    // Kills "emits an untyped/unattributed event" — the winner (the surviving killer) is named.
    expect(pk?.winner, 'the event attributes the kill to the winning player (P1)').toBe(1)
    expect(pk?.loser, 'and names the loser (P2)').toBe(2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// The WAVEGG egg-hatch spawn — an egg wave enters its complement AS EGGS.
// ─────────────────────────────────────────────────────────────────────────────
describe('egg-hatch spawn — the egg wave (wave 5, $08) spawns its complement as EGGS', () => {
  it('wave 5 enters egg processes (WAVEGG), not the materialising ground enemies', async () => {
    const demo = await loadDemo()
    // Wave 5's status $08 dispatches to the 'egg' type. eggWaveSpawnsEggs is built (jt4-3) but
    // NOT wired into spawnWaveEnemies — today wave 5 still materialises bounders. WAVEGG
    // (JOUSTRV4.SRC:2737) enters the wave AS EGGS instead. Kills "the egg wave is unwired".
    const atWave5 = advanceTo(demo, demo.createWaveDemo(SEED), 5)
    expect(atWave5.wave, 'reached the egg wave').toBe(5)
    expect(hasEgg(atWave5), 'the egg wave hatches its complement from eggs (WAVEGG wired)').toBe(true)
  })

  it('a NON-egg wave spawns NO eggs — the wiring is keyed on the egg type, not always-on', async () => {
    const demo = await loadDemo()
    // Wave 2 (status $04, co-op) is not an egg wave — its complement enters as ground enemies.
    // Kills "spawnWaveEnemies now spawns eggs for every wave".
    const atWave2 = advanceTo(demo, demo.createWaveDemo(SEED), 2)
    expect(atWave2.wave, 'reached a non-egg wave').toBe(2)
    expect(hasEgg(atWave2), 'a co-op wave spawns ground enemies, not eggs').toBe(false)
  })
})
