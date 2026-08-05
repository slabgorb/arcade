// tests/scheduler.test.ts
//
// Story jt2-1 — RED phase (O'Brien / TEA). The process scheduler core: the
// tagged-union process list, frame naps, two scheduling classes, kill by
// id+mask, and the per-frame RNG stir. GameState grows from jt1-1's bare frame
// counter into the ruled ROM-shaped core — SEMANTICS ONLY (epic ruling): no
// 56-byte block, no PPC, no RAM pool. The provenance of every law lives in the
// companion suite, tests/scheduler-source.test.ts.
//
// RED today: tests/helpers/scheduler-contract.ts::loadScheduler throws
// "scheduler not built yet" because src/core/frame.ts has no spawn/kill/draw —
// a clean feature-absent red, per test, not an import trace.
//
// ─── WHY EACH LAW IS PINNED THE WAY IT IS ────────────────────────────────────
// A scheduler is a coordinator: the interesting failures are ordering and
// off-by-one, not arithmetic. So the naps are proven by WHEN a process first
// wakes (nap N ⇒ pass N — `DEC PNAP,U / BEQ EXELOP`), the classes by the ORDER
// wakers appear regardless of insertion order (two full passes, not a single
// interleaved walk), the kill by the id+mask SET it removes, and the RNG stir
// by the stream moving on a frame that consumes NOTHING. The migration guard is
// the paranoid one: a player stepped from the list must reproduce the existing
// airborne flight pipeline BIT FOR BIT, or the "no behaviour change" claim is a
// lie the demo would ship green.

import { describe, it, expect } from 'vitest'
import {
  loadScheduler,
  type GameState,
  type ProcessClass,
  type ProcessSpec,
  type SchedulerModule,
} from './helpers/scheduler-contract.js'
import { loadFlight, type EntityState, type PlayerInput } from './helpers/flight-contract.js'
import { loadArena } from './helpers/arena-contract.js'

const SEED = 0x1234_5678

/** A process spec with sensible defaults; callers override only what they test. */
function spec(over: Partial<ProcessSpec> & { id: number }): ProcessSpec {
  return { cls: 'primary', nap: 1, period: 1, kind: 'nap', ...over }
}

/** Step `n` whole frames, threading the (optional) per-frame input map. */
function stepN(
  sched: SchedulerModule,
  state: GameState,
  n: number,
  inputs?: Record<number, PlayerInput>,
): GameState {
  let s = state
  for (let i = 0; i < n; i++) s = sched.stepFrame(s, inputs)
  return s
}

/** The nap countdown of one process, or undefined if it was killed/absent. */
const napOf = (s: GameState, id: number): number | undefined =>
  s.processes.find((p) => p.id === id)?.nap

const idsOf = (s: GameState): number[] => s.processes.map((p) => p.id).sort((a, b) => a - b)

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — FRAME NAPS. A process napping N wakes on exactly the Nth pass.
//        PNAP, RAMDEF.SRC:171 (1 nap = 1 frame); DEC PNAP,U / BEQ EXELOP,
//        SYSTEM.SRC:233,250.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 — processes nap in whole frames', () => {
  it('a process napping N wakes on exactly the Nth pass, never before', async () => {
    const sched = await loadScheduler()
    // period huge so its FIRST wake is the only one inside the window.
    let s = sched.spawn(sched.createState(SEED), spec({ id: 7, nap: 3, period: 9999 }))
    const wokeOn: number[] = []
    for (let frame = 1; frame <= 5; frame++) {
      s = sched.stepFrame(s)
      if (s.woke.includes(7)) wokeOn.push(frame)
    }
    expect(wokeOn, 'a nap of 3 wakes once, on pass 3').toEqual([3])
  })

  it('counts the nap DOWN one per frame — proven via the decrement, not just the wake', async () => {
    const sched = await loadScheduler()
    let s = sched.spawn(sched.createState(SEED), spec({ id: 7, nap: 4, period: 9999 }))
    s = sched.stepFrame(s)
    expect(napOf(s, 7), 'after pass 1').toBe(3)
    s = sched.stepFrame(s)
    expect(napOf(s, 7), 'after pass 2').toBe(2)
    s = sched.stepFrame(s)
    expect(napOf(s, 7), 'after pass 3').toBe(1)
    expect(s.woke, 'still asleep — a nap of 4 has not reached 0').not.toContain(7)
  })

  it('a nap of 1 wakes on the very first pass (1 nap = 1 frame)', async () => {
    const sched = await loadScheduler()
    const s = sched.stepFrame(sched.spawn(sched.createState(SEED), spec({ id: 1, nap: 1 })))
    expect(s.woke).toContain(1)
  })

  it('re-naps to `period` on waking, so a period-P process wakes every P frames', async () => {
    // The re-nap the process body sets (NAPTIM STA PNAP,U, SYSTEM.SRC:225). A
    // player is period 1 (every frame); this proves the general P.
    const sched = await loadScheduler()
    let s = sched.spawn(sched.createState(SEED), spec({ id: 5, nap: 1, period: 3 }))
    const wokeOn: number[] = []
    for (let frame = 1; frame <= 7; frame++) {
      s = sched.stepFrame(s)
      if (s.woke.includes(5)) wokeOn.push(frame)
    }
    expect(wokeOn, 'nap 1 then re-nap 3: wakes on 1, 4, 7').toEqual([1, 4, 7])
  })

  it('naps two processes independently on the same frames', async () => {
    const sched = await loadScheduler()
    let s = sched.createState(SEED)
    s = sched.spawn(s, spec({ id: 2, nap: 2, period: 9999 }))
    s = sched.spawn(s, spec({ id: 4, nap: 4, period: 9999 }))
    const woke2: number[] = []
    const woke4: number[] = []
    for (let frame = 1; frame <= 4; frame++) {
      s = sched.stepFrame(s)
      if (s.woke.includes(2)) woke2.push(frame)
      if (s.woke.includes(4)) woke4.push(frame)
    }
    expect(woke2).toEqual([2])
    expect(woke4).toEqual([4])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — TWO SCHEDULING CLASSES AS TWO FULL PASSES. Every primary steps before
//        any secondary each frame. PRISEC, SYSTEM.SRC:217,231,248; PROCCR sets
//        PPRI=0, SECCR 255, RAMDEF.SRC:8-18.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 — primaries all step before any secondary each frame', () => {
  /** Index of an id within a wake list, or -1. */
  const at = (woke: readonly number[], id: number): number => woke.indexOf(id)

  it('orders every primary ahead of every secondary — regardless of insertion order', async () => {
    // The trap a single interleaved walk would fall into: if the scheduler made
    // ONE pass over the list, wakers would appear in INSERTION order. Two full
    // passes put class first. So spawn them interleaved, secondary FIRST, and
    // demand class order out.
    const sched = await loadScheduler()
    let s = sched.createState(SEED)
    for (const p of [
      { id: 22, cls: 'secondary' as ProcessClass },
      { id: 11, cls: 'primary' as ProcessClass },
      { id: 21, cls: 'secondary' as ProcessClass },
      { id: 12, cls: 'primary' as ProcessClass },
    ]) {
      s = sched.spawn(s, spec({ ...p, nap: 1, period: 1 }))
    }
    s = sched.stepFrame(s)

    const primaries = [11, 12]
    const secondaries = [21, 22]
    for (const p of primaries) expect(s.woke, `primary ${p} woke`).toContain(p)
    for (const sec of secondaries) expect(s.woke, `secondary ${sec} woke`).toContain(sec)

    const lastPrimary = Math.max(...primaries.map((p) => at(s.woke, p)))
    const firstSecondary = Math.min(...secondaries.map((sec) => at(s.woke, sec)))
    expect(
      lastPrimary,
      `every primary must precede every secondary — got wake order ${JSON.stringify(s.woke)}`,
    ).toBeLessThan(firstSecondary)
  })

  it('decrements a secondary\'s nap once per frame too (secondaries get their own pass)', async () => {
    // A scheduler that only ran the primary pass would leave secondaries frozen.
    const sched = await loadScheduler()
    let s = sched.spawn(
      sched.createState(SEED),
      spec({ id: 9, cls: 'secondary', nap: 3, period: 9999 }),
    )
    s = sched.stepFrame(s)
    expect(napOf(s, 9), 'a secondary naps down one per frame').toBe(2)
    s = stepN(sched, s, 2)
    expect(s.woke, 'and wakes on its Nth pass like a primary').toContain(9)
  })

  it('a sleeping primary does not block a ready secondary from waking', async () => {
    // Class order is about the two passes, not about readiness gating: a primary
    // still napping this frame must not suppress a secondary that is due.
    const sched = await loadScheduler()
    let s = sched.createState(SEED)
    s = sched.spawn(s, spec({ id: 30, cls: 'primary', nap: 5, period: 9999 }))
    s = sched.spawn(s, spec({ id: 40, cls: 'secondary', nap: 1, period: 1 }))
    s = sched.stepFrame(s)
    expect(s.woke, 'the not-yet-due primary stays asleep').not.toContain(30)
    expect(s.woke, 'the due secondary still wakes').toContain(40)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — KILL BY ID + MASK. One call kills a whole class of ids.
//        KLPROC — ANDB PID,U / CMPB ,S, SYSTEM.SRC:341-347.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 — kill takes id+mask, so one call kills a class', () => {
  /** Spawn a fixed cohort spanning two id "classes" by high nibble. */
  async function cohort(): Promise<{ sched: SchedulerModule; state: GameState }> {
    const sched = await loadScheduler()
    let s = sched.createState(SEED)
    for (const id of [0x11, 0x12, 0x1a, 0x21, 0x22, 0x2f, 0x31]) {
      s = sched.spawn(s, spec({ id }))
    }
    return { sched, state: s }
  }

  it('removes every id in the class (id&mask===target) in ONE call, and only those', async () => {
    const { sched, state } = await cohort()
    // Kill the 0x1_ class: (id & 0xF0) === 0x10.
    const after = sched.kill(state, 0x10, 0xf0)
    expect(idsOf(after), 'the whole 0x1_ class is gone; 0x2_ and 0x3_ remain').toEqual([
      0x21, 0x22, 0x2f, 0x31,
    ])
  })

  it('with mask 0xFF kills exactly the one process whose id === target', async () => {
    const { sched, state } = await cohort()
    const after = sched.kill(state, 0x22, 0xff)
    expect(idsOf(after)).toEqual([0x11, 0x12, 0x1a, 0x21, 0x2f, 0x31])
  })

  it('kills nothing when no id matches (a class with no members)', async () => {
    const { sched, state } = await cohort()
    const after = sched.kill(state, 0x50, 0xf0)
    expect(idsOf(after), 'no 0x5_ process exists').toEqual(idsOf(state))
  })

  it('obeys the masking law for every member: survives iff (id & mask) !== target', async () => {
    const { sched, state } = await cohort()
    const target = 0x20
    const mask = 0xf0
    const after = sched.kill(state, target, mask)
    const survivors = new Set(idsOf(after))
    for (const id of idsOf(state)) {
      const shouldSurvive = (id & mask) !== target
      expect(
        survivors.has(id),
        `id 0x${id.toString(16)}: (id&mask)=0x${(id & mask).toString(16)} vs target 0x${target.toString(
          16,
        )}`,
      ).toBe(shouldSurvive)
    }
  })

  it('leaves the frame counter and the RNG stream untouched (kill is not a step)', async () => {
    const { sched, state } = await cohort()
    const after = sched.kill(state, 0x10, 0xf0)
    expect(after.frame, 'killing is not advancing time').toBe(state.frame)
    expect(sched.draw(after).value, 'kill must not stir the RNG').toBe(sched.draw(state).value)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — PER-FRAME RNG STIR. The RNG advances once per frame independent of
//        consumption. INC RANDOM / DEC RANDOM+1, SYSTEM.SRC:581-582.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-2 — the RNG stirs once per frame, independent of consumption', () => {
  /** Advance the stream by `k` manual draws (the consumption path). */
  const advanceByDraws = (sched: SchedulerModule, s: GameState, k: number): GameState => {
    let out = s
    for (let i = 0; i < k; i++) out = sched.draw(out).state
    return out
  }

  it('moves the stream on a frame that consumes NOTHING (no processes, no draws)', async () => {
    const sched = await loadScheduler()
    const s0 = sched.createState(SEED) // empty process list — zero consumption
    expect(
      sched.draw(sched.stepFrame(s0)).value,
      'a frame with no RNG calls must still shift the stream position',
    ).not.toBe(sched.draw(s0).value)
  })

  it('advances by EXACTLY one step per frame — one frame equals one draw', async () => {
    const sched = await loadScheduler()
    const s0 = sched.createState(SEED)
    expect(
      sched.draw(sched.stepFrame(s0)).value,
      'the per-frame stir is a single generator advance, not two or four',
    ).toBe(sched.draw(advanceByDraws(sched, s0, 1)).value)
  })

  it('K empty frames advance the stream by exactly K steps', async () => {
    const sched = await loadScheduler()
    const s0 = sched.createState(SEED)
    expect(sched.draw(stepN(sched, s0, 5)).value).toBe(sched.draw(advanceByDraws(sched, s0, 5)).value)
  })

  it('is deterministic under seed — same seed, same frames, same stream', async () => {
    const sched = await loadScheduler()
    const a = sched.draw(stepN(sched, sched.createState(SEED), 5)).value
    const b = sched.draw(stepN(sched, sched.createState(SEED), 5)).value
    expect(a).toBe(b)
  })

  it('different seeds give different streams (the seed is load-bearing)', async () => {
    const sched = await loadScheduler()
    // Compare the first few draws as a sequence, so an unlucky single collision
    // cannot pass this vacuously.
    const seq = (seed: number): number[] => {
      let s = sched.createState(seed)
      const out: number[] = []
      for (let i = 0; i < 4; i++) {
        const d = sched.draw(s)
        out.push(d.value)
        s = d.state
      }
      return out
    }
    expect(seq(0xaaaa_bbbb)).not.toEqual(seq(0x1357_9bdf))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — THE MIGRATION GUARD. A player stepped from the process list reproduces
//        the existing airborne flight pipeline (main.ts stepPlayer, jt1-6)
//        BIT FOR BIT — the jt1-5 seeded-replay determinism, carried through the
//        migration. The reference here replicates that airborne branch verbatim;
//        the script is tuned to stay aloft so `land`/the ground branch (and its
//        animPhase) never enter — proven by the airborne assertion below.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-3 — the jt1-5 seeded replay reproduces through the process list', () => {
  const PID = 0x42
  const START: EntityState = {
    posX: 270,
    posY: 24 << 8,
    velXIndex: 8,
    velXFrac: 0,
    velY: -0x0080,
    timeUp: 1,
    groundState: null,
    plantZ: 0,
    airborne: true,
  }
  const FRAMES = 90
  /** Deterministic input script — flap every 4th frame, joystick cycling. */
  const scriptInput = (i: number): PlayerInput => ({
    dir: (((i % 3) - 1) as -1 | 0 | 1),
    flap: i % 4 === 0,
    flapHeld: i % 4 === 0,
  })

  /**
   * main.ts stepPlayer's AIRBORNE branch — the existing stepping, plus jt9-8's
   * PTIMUP re-init on a wing transition. `prevFlapHeld` is the button LEVEL the
   * previous frame carried, so this independent reference model reproduces
   * `runBehaviour`'s edge reset (a wing transition clears `timeUp`, applied after
   * the tick and only while still airborne) without calling the scheduler.
   */
  function stepAirborne(
    f: Awaited<ReturnType<typeof loadFlight>>,
    arena: Awaited<ReturnType<typeof loadArena>>,
    state: EntityState,
    input: PlayerInput,
    prevFlapHeld: boolean,
  ): EntityState {
    const wasAirborne = state.airborne
    let s = state
    if (input.flap) s = f.flap(s, input)
    s = f.stepFlight(s, input)
    s = { ...s, timeUp: f.tickTimeUp(s.timeUp) }
    const ceiling = arena.applyCeiling(s.posY, s.velY)
    s = { ...s, posY: ceiling.posY, velY: ceiling.velY }
    s = { ...s, posX: arena.wrapX(s.posX) }
    const outcome = arena.groundOutcome(f.groundMaskAt(s.posX, s.posY >> 8))
    if (outcome.kind === 'platform') s = f.land(s, outcome.platform)
    if (f.wingEdge(wasAirborne, prevFlapHeld, input) !== null && s.airborne) s = { ...s, timeUp: 0 }
    return s
  }

  it('reproduces the reference trajectory bit-for-bit', async () => {
    const sched = await loadScheduler() // RED gate: throws until the scheduler exists
    const f = await loadFlight()
    const arena = await loadArena()

    // Reference: the existing pipeline, stepped directly.
    const ref: string[] = []
    let e = START
    for (let i = 0; i < FRAMES; i++) {
      e = stepAirborne(f, arena, e, scriptInput(i), i > 0 ? scriptInput(i - 1).flapHeld : false)
      ref.push(JSON.stringify(e))
    }

    // Fixture honesty: the script must stay airborne the whole time, so the
    // ground branch (which this reference does not model) is never reached.
    for (const frame of ref) {
      const state = JSON.parse(frame) as EntityState
      expect(state.airborne, 'the migration script must stay aloft').toBe(true)
      expect(state.posY >> 8, 'and well clear of any platform').toBeLessThan(72)
    }

    // Migrated: the same player, stepped from the process list.
    let s = sched.spawn(sched.createState(SEED), {
      id: PID,
      cls: 'primary',
      nap: 1,
      period: 1,
      kind: 'player',
      entity: START,
    })
    const migrated: string[] = []
    for (let i = 0; i < FRAMES; i++) {
      s = sched.stepFrame(s, { [PID]: scriptInput(i) })
      const entity = s.processes.find((p) => p.id === PID)?.entity
      expect(entity, `the player process must still exist at frame ${i}`).toBeDefined()
      migrated.push(JSON.stringify(entity))
    }

    expect(migrated, 'a player stepped from the list must match the direct pipeline').toEqual(ref)
  })

  it('the script is non-trivial — the bird actually moves and wraps', async () => {
    // Determinism over a trajectory that never moved would prove nothing.
    const f = await loadFlight()
    const arena = await loadArena()
    let e = START
    let moved = false
    let wrapped = false
    for (let i = 0; i < FRAMES; i++) {
      const before = e.posX
      e = stepAirborne(f, arena, e, scriptInput(i), i > 0 ? scriptInput(i - 1).flapHeld : false)
      if (e.posX !== before) moved = true
      if (e.posX < before - 100) wrapped = true // a big backward jump = a wrap
    }
    expect(moved, 'the reference trajectory never moved').toBe(true)
    expect(wrapped, 'the reference trajectory never crossed the horizontal wrap').toBe(true)
  })

  it('the RNG stir does not perturb the deterministic player physics', async () => {
    // Flight is pure arithmetic — it draws no randomness. So stepping a player
    // through the scheduler (which stirs the RNG every frame) must land the
    // player in the identical place two runs in a row.
    const sched = await loadScheduler()
    const run = (): string => {
      let s = sched.spawn(sched.createState(SEED), {
        id: PID,
        cls: 'primary',
        nap: 1,
        period: 1,
        kind: 'player',
        entity: START,
      })
      s = stepN(sched, s, FRAMES, { [PID]: scriptInput(0) })
      return JSON.stringify(s.processes.find((p) => p.id === PID)?.entity)
    }
    expect(run()).toBe(run())
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4/AC-5 — PURITY & DETERMINISM. Core mints no entropy and mutates nothing
//             it is handed. The per-file scanner (tests/purity.test.ts) already
//             sweeps src/core for clock/Math.random; these pin the OBSERVABLE
//             consequences a sweep cannot see.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-4/AC-5 — the core stays pure: seeded, not ambient; and non-mutating', () => {
  const populate = (sched: SchedulerModule): GameState => {
    let s = sched.createState(SEED)
    s = sched.spawn(s, spec({ id: 1, cls: 'primary', nap: 2, period: 3 }))
    s = sched.spawn(s, spec({ id: 2, cls: 'secondary', nap: 1, period: 1 }))
    return s
  }

  it('two fresh states from the same seed evolve identically (no Math.random / clock)', async () => {
    // If core reached for ambient entropy, these two runs would diverge. This is
    // the behavioural half of the purity guard.
    const sched = await loadScheduler()
    const runOnce = (): unknown => {
      const s = stepN(sched, populate(sched), 6)
      return { processes: s.processes, woke: s.woke, draw: sched.draw(s).value }
    }
    expect(runOnce()).toEqual(runOnce())
  })

  it('createState is deterministic — same seed, identical starting state', async () => {
    const sched = await loadScheduler()
    expect(sched.createState(SEED)).toEqual(sched.createState(SEED))
  })

  it('stepFrame does not mutate the state handed in', async () => {
    const sched = await loadScheduler()
    const s = populate(sched)
    const frozen = JSON.stringify(s)
    sched.stepFrame(s)
    expect(JSON.stringify(s), 'stepFrame must return a NEW state, never mutate its argument').toBe(
      frozen,
    )
  })

  it('spawn and kill do not mutate the state handed in', async () => {
    const sched = await loadScheduler()
    const s = populate(sched)
    const frozen = JSON.stringify(s)
    sched.spawn(s, spec({ id: 99 }))
    sched.kill(s, 1, 0xff)
    expect(JSON.stringify(s)).toBe(frozen)
  })

  it('draw does not mutate the state handed in', async () => {
    const sched = await loadScheduler()
    const s = sched.createState(SEED)
    const frozen = JSON.stringify(s)
    sched.draw(s)
    expect(JSON.stringify(s)).toBe(frozen)
  })
})
