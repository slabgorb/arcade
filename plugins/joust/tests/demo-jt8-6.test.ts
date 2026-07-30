// tests/demo-jt8-6.test.ts
//
// Story jt8-6 — RED phase (Han Solo / TEA). The egg-ladder counter's LIFETIME.
//
// ─── THE STORY'S PREMISE IS REFUTED BY THE ROM IT CITES ───────────────────────
// jt8-6 was filed as "the counter must SURVIVE a mount death; our eggHits resets
// to rung 1 on every respawn (REPRODUCED: a veteran with 3 prior hits scores
// 1000, then the identical staging after a respawn scores 250)". The ROM says the
// opposite, in the same decision record the story cites:
//
//     JOUSTRV4.SRC:4667  *   DEATH OF PLAYER 1
//     JOUSTRV4.SRC:4669  DEATH1  CLR  EGGS1
//     JOUSTRV4.SRC:4675  DEATH2  CLR  EGGS2
//
// `DEATH1` is not incidental code — it IS the `DDEAD` field of P1DEC
// (`FDB DEATH1,EGGS1,…`, :5551), i.e. the "DEATH WISH ROUTINE (REG.X VICTOR,
// REG.U LOSER)" declared at :112. Both kill sites dispatch it through the LOSER's
// decision — `LDY PDECSN,U` / `JSR [DDEAD,Y]  CALL DEATH ROUTINE (REG.X VICTOR,
// REG.U DEAD)` at :5071-5074 (OSTWIN, losing a joust) and :6563-6564 (the lava
// path, `LDX #0  NO VICTOR`). So on ANY player death the counter is cleared, and
// "a veteran who dies scores 250 on the next catch" is FAITHFUL, not a bug.
//
// ─── WHERE THE MISFILE CAME FROM, AND WHAT THE REAL DEFECT IS ────────────────
// jt8-4 read the counter's lifetime off EGGSCR alone and concluded "EGGSCR never
// resets it, so the count persists for that player" (claims/egg-catch.json
// JT84-006, mirrored in demo.ts:158 and demo-jt8-4-source.test.ts:25-26). The
// first clause is true; the second does not follow. `DEGGS` is a POINTER
// (`LDY DEGGS,Y` then `LDB ,Y`, :3037/:3042 — the debug guard at :3039 reads
// "SHOULD NEVER BE ZERO" because it is an address), and it points at the fixed
// per-player cells EGGS1 / EGGS2. Grepping those cells instead of the routine
// gives the WHOLE lifetime — exactly three reset sites, none of them in EGGSCR:
//
//   :907 / :912    game start  — "RESET NUMBER OF EGG KILLED"
//   :1979 / :1980  WNRM        — "RESET NUMBER OF EGGS KILLED BY PLAYER 1 / 2"
//   :4669 / :4675  DEATH1/2    — the death-wish clear
//
// So the counter climbs only WITHIN one life of one wave. Our port gets the death
// boundary right by construction (`eggHits` rides the player process; a death
// removes it and `respawnPlayerProcess` builds a fresh one, so the credit dies
// with the man) and gets the WAVE boundary WRONG: `stepDemo`'s advance carries
// `processes` forward and only appends the new complement (demo.ts:1090-1105), so
// the counter walks into the next wave. PROBED on this tree: a player holding 2
// hits clears wave 1, and its first catch of wave 2 pays 750 where the ROM pays
// 250.
//
// That inverts the story: the boundary the story wanted DELETED is the one that
// is correct, and the boundary it declared out of scope is the actual defect. This
// suite therefore pins the machine (three resets, one of them missing) and NOT the
// story's prose. See the session's Design Deviations and Delivery Findings.
//
// ─── WHY THE DEATH GUARD IS IN A RED SUITE THOUGH IT PASSES TODAY ────────────
// The story's instruction — "re-home the count where it outlives a process (a
// per-player record on DemoSim, the jt8-1 targets precedent)" — would BREAK the
// death reset, because a record that outlives the process by design no longer
// loses the credit when the man dies. Group 2 is the guard that makes that
// regression loud. It is green on arrival, so its non-vacuity is proven by
// mutation, recorded in the handoff — not asserted.

import { describe, it, expect } from 'vitest'
import {
  loadDemo,
  type DemoState,
  type DemoProcess,
  type EggState,
} from './helpers/demo-contract.js'
import { loadFlight } from './helpers/flight-contract.js'
import { loadArena } from './helpers/arena-contract.js'

const SEED = 0x1234_5678

const PLAYER1_ID = 1
const PLAYER2_ID = 2

/** The ladder, for readable expectations (EGGVAL, jt2-4 / JT24-021..024). */
const RUNG_1 = 250
const RUNG_3 = 750
const RUNG_4 = 1000

// ─── Staging ─────────────────────────────────────────────────────────────────
// Deliberately the same factories as tests/demo-jt8-4.test.ts: this story changes
// WHEN the counter is cleared, so its fixtures must be recognisable beside the
// suite that pinned the catch itself.

/** A player process at an exact pixel position, optionally carrying ladder credit. */
function playerAt(id: number, posX: number, pixelY: number, eggHits?: number): DemoProcess {
  const p: DemoProcess = {
    id,
    cls: 'primary',
    nap: 1,
    period: 1,
    kind: 'player',
    facing: 1,
    mount: id === PLAYER2_ID ? 'stork' : 'ostrich',
    entity: {
      posX,
      posY: pixelY << 8,
      velXIndex: 0,
      velXFrac: 0,
      velY: 0,
      timeUp: 1,
      groundState: null,
      plantZ: 0,
      airborne: true,
      animPhase: 0,
    },
  }
  return eggHits === undefined ? p : { ...p, eggHits }
}

/** An egg with test-neutral defaults. `pfeet: 1` — SETTLED, so no 500 air bonus
 *  muddies the ladder value under assertion (jt8-4 AC-2 owns the bonus). */
function eggOf(over: Partial<EggState>): EggState {
  return {
    posX: 100,
    posY: 40 << 8,
    velX: 0,
    velY: 0,
    bumpX: 0,
    bumpY: 0,
    eggsLeft: 4,
    hitCount: 0,
    pfeet: 1,
    settled: false,
    ...over,
  }
}

/** An egg PROCESS in the kill-egg id namespace (`$1_0000+`, demo.ts:797). */
function eggProcAt(id: number, over: Partial<EggState>): DemoProcess {
  return { id, cls: 'secondary', nap: 1, period: 1, kind: 'egg', egg: eggOf(over) }
}

/**
 * An inert wave-HOLDER — a `kind:'enemy'` process with no `enemy` payload. It
 * satisfies `enemiesLeft` (so the wave cannot clear underneath a staging) while
 * being unsteppable and unable to joust the catcher. jt8-4's factory, kept
 * verbatim; this suite needs its OPPOSITE too (see `clearableWith`).
 */
function waveHolder(): DemoProcess {
  return { id: 0x7000, cls: 'secondary', nap: 1, period: 1, kind: 'enemy' }
}

const withProcesses = (d: DemoState, procs: readonly DemoProcess[]): DemoState => ({
  ...d,
  sim: { ...d.sim, processes: procs },
})

/**
 * A sim staged so the NEXT `stepDemo` clears the wave: `clearable` (demo.ts:1086)
 * wants no enemy, no egg, and a live player. Everything else about the state is
 * the real `createWaveDemo` product.
 */
const clearableWith = (d: DemoState, players: readonly DemoProcess[]): DemoState =>
  withProcesses(d, players)

const playersOf = (d: DemoState): DemoProcess[] => d.sim.processes.filter((p) => p.kind === 'player')

const playerNo = (d: DemoState, id: number): DemoProcess => {
  const p = playersOf(d).find((q) => q.id === id)
  if (!p) throw new Error(`player ${id} is not in the sim`)
  return p
}

/** The ladder credit a process carries, normalised — absent reads as zero, which
 *  is exactly how `collisionPass` reads it (`self.eggHits ?? 0`, demo.ts:904). */
const creditOf = (p: DemoProcess): number => p.eggHits ?? 0

/** Re-seat a process at a pixel position, keeping every other field — including
 *  whatever ladder credit it is carrying. Never rebuild the process: rebuilding
 *  would launder the very field under test.
 *
 *  `entity` is optional on the contract (an enemy-kind process has `enemy`
 *  instead), so this reports a mis-staged fixture rather than asserting non-null
 *  and failing later with an unreadable trace. */
const seatedAt = (p: DemoProcess, posX: number, pixelY: number): DemoProcess => {
  if (!p.entity) throw new Error(`process ${p.id} (${p.kind}) has no entity to re-seat`)
  return { ...p, entity: { ...p.entity, posX, posY: pixelY << 8 } }
}

/**
 * A re-created knight, ready to catch. `respawnPlayerProcess` hands back the real
 * CREP re-entry — collisions OFF inside a jt2-6 materialisation window — and that
 * window is jt2-6's law, not this story's. Stripping it (rather than staging a
 * hand-built process) keeps the PRODUCTION factory in the loop, so the guard still
 * reads whatever credit a re-created man is actually born with. `mat` is not in
 * this contract because jt8-6 does not own it.
 */
const readyToCatch = (p: DemoProcess): DemoProcess => {
  const { mat: _window, ...rest } = p as DemoProcess & { mat?: unknown }
  return { ...rest, collisionEnabled: true }
}

/** The `reason:'egg'` score VALUES the frame that produced `after` emitted. */
function eggValuesOf(before: DemoState, after: DemoState): number[] {
  const prior = new Set(before.events)
  return after.events
    .filter((e) => !prior.has(e))
    .filter((e): e is Extract<typeof e, { kind: 'score' }> => e.kind === 'score')
    .filter((e) => e.reason === 'egg')
    .map((e) => e.value)
}

/** The `reason:'egg'` events with their attribution. */
function eggEventsOf(before: DemoState, after: DemoState): { value: number; player?: number }[] {
  const prior = new Set(before.events)
  return after.events
    .filter((e) => !prior.has(e))
    .filter((e): e is Extract<typeof e, { kind: 'score' }> => e.kind === 'score')
    .filter((e) => e.reason === 'egg')
    .map((e) => ({ value: e.value, player: e.player }))
}

/** A column that stays airborne through the staging band, so `stepEgg` cannot
 *  bounce the staged egg out from under the catch. jt8-4's helper. */
async function findAir(): Promise<{ x: number; y: number }> {
  const flight = await loadFlight()
  const arena = await loadArena()
  for (let x = 8; x <= 284; x++) {
    let clear = true
    for (let y = 24; y <= 72; y++) {
      if (arena.groundOutcome(flight.groundMaskAt(x, y)).kind !== 'airborne') {
        clear = false
        break
      }
    }
    if (clear) return { x, y: 36 }
  }
  throw new Error('no open-air column found')
}

/**
 * Have `player` (carrying whatever credit it holds) catch one egg, and return the
 * `reason:'egg'` values that catch emitted. A `waveHolder` keeps the wave open so
 * the measurement cannot trip an advance and reset the very thing under test.
 */
async function catchOneEgg(
  from: DemoState,
  player: DemoProcess,
  air: { x: number; y: number },
  others: readonly DemoProcess[] = [],
): Promise<{ values: number[]; after: DemoState }> {
  const demo = await loadDemo()
  const staged = withProcesses(from, [
    seatedAt(player, air.x, air.y),
    ...others,
    eggProcAt(0x1_0000, { posX: air.x, posY: air.y << 8 }),
    waveHolder(),
  ])
  const after = demo.stepDemo(staged, {})
  return { values: eggValuesOf(staged, after), after }
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 1 — WNRM: EVERY WAVE START CLEARS BOTH COUNTERS.
//   JOUSTRV4.SRC:1979-1980
//     WNRM  CLR  EGGS1    RESET NUMBER OF EGGS KILLED BY PLAYER 1
//           CLR  EGGS2    RESET NUMBER OF EGGS KILLED BY PLAYER 2
//   This is the story's real defect and the only failing group on arrival.
// ─────────────────────────────────────────────────────────────────────────────

describe('jt8-6 AC-1 — a WAVE ADVANCE clears the egg ladder (WNRM :1979-1980)', () => {
  it('the counter is ZERO on the knight that walks into the next wave', async () => {
    const demo = await loadDemo()
    const air = await findAir()
    const before = clearableWith(demo.createWaveDemo(SEED), [
      playerAt(PLAYER1_ID, air.x, air.y, 3),
    ])
    expect(creditOf(playerNo(before, PLAYER1_ID))).toBe(3) // the staging is live

    const after = demo.stepDemo(before, {})

    expect(after.wave).not.toBe(before.wave) // the wave really advanced
    expect(creditOf(playerNo(after, PLAYER1_ID))).toBe(0)
  })

  it('so the FIRST catch of the new wave pays the FIRST rung, not the fourth', async () => {
    const demo = await loadDemo()
    const air = await findAir()
    const before = clearableWith(demo.createWaveDemo(SEED), [
      playerAt(PLAYER1_ID, air.x, air.y, 3),
    ])
    const advanced = demo.stepDemo(before, {})
    expect(advanced.wave).not.toBe(before.wave)

    // The SAME process object the advance produced — carrying whatever the
    // advance left on it. A veteran of the previous wave is a rookie in this one.
    const { values } = await catchOneEgg(advanced, playerNo(advanced, PLAYER1_ID), air)

    expect(values).toEqual([RUNG_1])
  })

  it('EVERY advance clears it — the second wave boundary resets as hard as the first', async () => {
    const demo = await loadDemo()
    const air = await findAir()

    // Wave 1 → 2, then earn credit inside wave 2, then wave 2 → 3.
    const first = demo.stepDemo(
      clearableWith(demo.createWaveDemo(SEED), [playerAt(PLAYER1_ID, air.x, air.y, 2)]),
      {},
    )
    const veteran = { ...playerNo(first, PLAYER1_ID), eggHits: 3 }
    const second = demo.stepDemo(clearableWith(first, [veteran]), {})

    expect(second.wave).not.toBe(first.wave)
    expect(creditOf(playerNo(second, PLAYER1_ID))).toBe(0)

    const { values } = await catchOneEgg(second, playerNo(second, PLAYER1_ID), air)
    expect(values).toEqual([RUNG_1])
  })

  it('BOTH knights are cleared — EGGS1 and EGGS2 are separate CLRs (:1979, :1980)', async () => {
    const demo = await loadDemo()
    const air = await findAir()
    const before = clearableWith(demo.createWaveDemo(SEED), [
      playerAt(PLAYER1_ID, air.x, air.y, 3),
      playerAt(PLAYER2_ID, air.x + 40, air.y, 2),
    ])
    const after = demo.stepDemo(before, {})
    expect(after.wave).not.toBe(before.wave)

    expect({
      p1: creditOf(playerNo(after, PLAYER1_ID)),
      p2: creditOf(playerNo(after, PLAYER2_ID)),
    }).toEqual({ p1: 0, p2: 0 })
  })

  it('and each of them then pays the first rung, credited to the right ledger', async () => {
    const demo = await loadDemo()
    const air = await findAir()
    const advanced = demo.stepDemo(
      clearableWith(demo.createWaveDemo(SEED), [
        playerAt(PLAYER1_ID, air.x, air.y, 3),
        playerAt(PLAYER2_ID, air.x + 40, air.y, 2),
      ]),
      {},
    )

    // P2 catches; P1 is parked far away so only one catcher is in reach.
    const staged = withProcesses(advanced, [
      seatedAt(playerNo(advanced, PLAYER2_ID), air.x, air.y),
      seatedAt(playerNo(advanced, PLAYER1_ID), air.x + 80, air.y),
      eggProcAt(0x1_0000, { posX: air.x, posY: air.y << 8 }),
      waveHolder(),
    ])
    const after = demo.stepDemo(staged, {})

    expect(eggEventsOf(staged, after)).toEqual([{ value: RUNG_1, player: PLAYER2_ID }])
  })

  it('the clear is scoped to the ADVANCE — an ordinary frame leaves the ladder alone', async () => {
    // The guard against "fix it by zeroing every frame", which would peg the
    // ladder at rung 1 forever and silently undo jt8-4's climb.
    const demo = await loadDemo()
    const air = await findAir()
    const held = withProcesses(demo.createWaveDemo(SEED), [
      playerAt(PLAYER1_ID, air.x, air.y, 2),
      waveHolder(), // the wave CANNOT clear this frame
    ])
    const after = demo.stepDemo(held, {})

    expect(after.wave).toBe(held.wave) // nothing advanced
    expect(creditOf(playerNo(after, PLAYER1_ID))).toBe(2)
  })

  it('a within-wave catch still CLIMBS after a boundary reset — 250 then 500', async () => {
    const demo = await loadDemo()
    const air = await findAir()
    const advanced = demo.stepDemo(
      clearableWith(demo.createWaveDemo(SEED), [playerAt(PLAYER1_ID, air.x, air.y, 4)]),
      {},
    )

    const first = await catchOneEgg(advanced, playerNo(advanced, PLAYER1_ID), air)
    expect(first.values).toEqual([RUNG_1])

    const second = await catchOneEgg(first.after, playerNo(first.after, PLAYER1_ID), air)
    expect(second.values).toEqual([500])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 2 — DEATH1/DEATH2: A DEATH CLEARS THE COUNTER.
//   JOUSTRV4.SRC:4669  DEATH1  CLR  EGGS1     (:4675 DEATH2 CLR EGGS2)
//   dispatched on the LOSER's decision at :5071-5074 and :6563-6564.
//
//   GREEN ON ARRIVAL. This is the REGRESSION GUARD against implementing the
//   story as filed — a counter re-homed onto DemoSim "so it outlives the
//   process" would keep the credit through a death and fail here.
// ─────────────────────────────────────────────────────────────────────────────

describe('jt8-6 AC-2 — a player DEATH clears the egg ladder (DEATH1/DEATH2 :4669/:4675)', () => {
  it('a re-created knight carries NO ladder credit (the CREP re-entry)', async () => {
    const mod = (await import('../src/core/demo.js')) as {
      respawnPlayerProcess: (id: number) => DemoProcess
    }
    expect(creditOf(mod.respawnPlayerProcess(PLAYER1_ID))).toBe(0)
    expect(creditOf(mod.respawnPlayerProcess(PLAYER2_ID))).toBe(0)
  })

  it("the story's REPRODUCED case, in the ROM's direction: 1000 before the death, 250 after", async () => {
    const demo = await loadDemo()
    const air = await findAir()
    const mod = (await import('../src/core/demo.js')) as {
      respawnPlayerProcess: (id: number) => DemoProcess
    }
    const base = demo.createWaveDemo(SEED)

    // A veteran with three prior hits banks the fourth rung.
    const veteran = playerAt(PLAYER1_ID, air.x, air.y, 3)
    const before = await catchOneEgg(base, veteran, air)
    expect(before.values).toEqual([RUNG_4])

    // He dies (the process leaves) and re-enters through the transporter. The
    // materialise window is jt2-6's law, not this story's — collisions are forced
    // back on so the catch under test can actually happen.
    const reborn = readyToCatch(mod.respawnPlayerProcess(PLAYER1_ID))
    const after = await catchOneEgg(before.after, reborn, air)

    expect(after.values).toEqual([RUNG_1])

    // And he climbs from the BOTTOM, not from where he left off. A counter that
    // outlived the man would read 4 here and peg at the cap for both catches.
    const next = await catchOneEgg(after.after, playerNo(after.after, PLAYER1_ID), air)
    expect(next.values).toEqual([500])
  })

  it('and no later frame hands the credit back — nothing is holding it for him', async () => {
    // The general form of the guard, independent of WHEN the next catch happens:
    // a per-player record that "outlives the process" has to restore the credit at
    // some frame, and this test looks at all of them. A design that keeps the
    // ladder off the process fails here even if its restore is late.
    const demo = await loadDemo()
    const air = await findAir()
    const mod = (await import('../src/core/demo.js')) as {
      respawnPlayerProcess: (id: number) => DemoProcess
    }

    // Earn credit, then lose the man and re-create him.
    const veteran = await catchOneEgg(
      demo.createWaveDemo(SEED),
      playerAt(PLAYER1_ID, air.x, air.y, 3),
      air,
    )
    expect(veteran.values).toEqual([RUNG_4]) // the credit was real

    let state = withProcesses(veteran.after, [
      readyToCatch(mod.respawnPlayerProcess(PLAYER1_ID)),
      waveHolder(), // hold the wave so no boundary reset can do this test's work
    ])
    for (let i = 0; i < 12; i++) {
      state = demo.stepDemo(state, {})
      expect(creditOf(playerNo(state, PLAYER1_ID))).toBe(0)
    }
  })

  it("one knight's death does not touch the OTHER's ladder — DEATH1 clears EGGS1 only", async () => {
    const demo = await loadDemo()
    const air = await findAir()
    const mod = (await import('../src/core/demo.js')) as {
      respawnPlayerProcess: (id: number) => DemoProcess
    }
    const base = demo.createWaveDemo(SEED)

    // P1 dies and re-enters; P2 never left and is still holding two hits.
    const survivor = playerAt(PLAYER2_ID, air.x + 80, air.y, 2)
    const reborn = readyToCatch(mod.respawnPlayerProcess(PLAYER1_ID))
    const staged = withProcesses(base, [
      seatedAt(survivor, air.x, air.y),
      seatedAt(reborn, air.x + 80, air.y),
      eggProcAt(0x1_0000, { posX: air.x, posY: air.y << 8 }),
      waveHolder(),
    ])
    const after = demo.stepDemo(staged, {})

    // P2's ladder is undisturbed: third rung, credited to P2.
    expect(eggEventsOf(staged, after)).toEqual([{ value: RUNG_3, player: PLAYER2_ID }])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 3 — GAME START (:907/:912) AND DETERMINISM.
// ─────────────────────────────────────────────────────────────────────────────

describe('jt8-6 AC-3 — a fresh game starts both ladders at zero (:907, :912)', () => {
  it('createWaveDemo hands out knights with no ladder credit', async () => {
    const demo = await loadDemo()
    const players = playersOf(demo.createWaveDemo(SEED))
    expect(players.length).toBeGreaterThan(0)
    // Name the offender rather than compare two arrays derived from the same list.
    expect(players.filter((p) => creditOf(p) !== 0).map((p) => p.id)).toEqual([])
  })
})

describe('jt8-6 AC-4 — the reset is deterministic', () => {
  it('two identical seeded runs across a wave advance emit the same egg scores', async () => {
    const demo = await loadDemo()
    const air = await findAir()

    const run = async (): Promise<number[]> => {
      const advanced = demo.stepDemo(
        clearableWith(demo.createWaveDemo(SEED), [playerAt(PLAYER1_ID, air.x, air.y, 3)]),
        {},
      )
      const one = await catchOneEgg(advanced, playerNo(advanced, PLAYER1_ID), air)
      const two = await catchOneEgg(one.after, playerNo(one.after, PLAYER1_ID), air)
      return [...one.values, ...two.values]
    }

    const a = await run()
    const b = await run()
    expect(a).toEqual(b)
    expect(a.length).toBeGreaterThan(0)
    expect(a).toEqual([RUNG_1, 500])
  })
})
