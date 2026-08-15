// plugins/defender/tests/scheduler.test.ts
//
// Story df3-1 — RED phase (Leeloo / TEA). The cooperative process-scheduler core
// for Defender: a run-list of short-lived processes dispatched once per 16-msec
// frame, re-derived from the Williams kernel at reference/original-source/defender/
// DEFA7.SRC:12-130. This is the FIRST core module that steps a clock — but only in
// the SHELL: the core stays clock-free, the shell calls stepTick() off @shared/loop
// once per frame. jt2 (joust) is a prose pattern reference only; nothing is imported
// from joust — this suite pins a fresh derivation from THIS tree's ROM source.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
// src/core/scheduler.ts does not exist yet. loadScheduler() throws a self-describing
// "not built yet" per test (the framebuffer.test.ts / purity.test.ts pattern), so a
// RED failure proves the FEATURE is absent — never a cryptic module-resolution trace.
//
// ─── THE ROM SEMANTICS THIS SUITE PINS (DEFA7.SRC) ───────────────────────────────
// The dispatcher DISP (DEFA7.SRC:3119-3129) walks the ACTIVE run-list once per pass:
//   DISP1  DEC PTIME,U      ; every live process's PTIME drops by one each tick
//          BNE DISP2        ; not zero yet → still sleeping, skip
//          STU CRPROC       ; reached zero → it is the current process
//          JMP [PADDR,U]    ; dispatch: run its continuation
// and the pass itself fires once per frame behind the TIMER gate (EXEC0, :3048-3050).
//   • MKPROC (:72-84) takes a START continuation + a TYPE and inits PTIME=1 ("INIT
//     TIME", :82) — so a fresh process first runs on the NEXT tick, never on creation.
//   • SLEEP  (:12-15) sets PTIME=N and PADDR=wake on the current process, then yields
//     — the process wakes after EXACTLY N ticks, resuming at the NEW continuation.
//   • SUCIDE (:19-22) / a continuation that yields NOTHING → unlinked from ACTIVE and
//     returned to the FREE list (KILL, :31-49).
//   • KILL   (:31-49) unlinks an arbitrary process and frees its record.
//
// ─── CONTRACT (what GREEN/Dev must build) ────────────────────────────────────────
//   export type Continuation = (self: Process, sched: Scheduler) => void
//   export interface Process  { readonly ptime: number; readonly ptype: number;
//                               readonly alive: boolean }
//   export interface Scheduler {
//     makeProcess(start: Continuation, type: number): Process   // MKPROC — ptime=1
//     kill(proc: Process): void                                 // KILL
//     sleep(ticks: number, wake: Continuation): void            // SLEEP — current proc
//     stepTick(): void                                          // one dispatch pass
//     readonly processes: readonly Process[]                    // live run-list snapshot
//   }
//   export function createScheduler(): Scheduler
//
// DETERMINISM DECISION (see the Design Deviation logged this session): stepTick()
// dispatches the SNAPSHOT of the run-list taken at the start of the tick. A process
// created DURING a dispatch (a child spawned by a running process) is enqueued but
// not decremented or dispatched until the NEXT tick — matching the ROM, whose
// head-insertion (MKPROC STU [CRPROC]) lands the child behind the pass's live cursor.
// This makes concurrent dispatch fully deterministic without pinning inter-process
// order WITHIN a tick (which df3-1 deliberately leaves to Dev — order is not
// observable behaviour any story yet depends on).
//
// AC-4/AC-1 NOTE (duration lives in SLEEP, not MKPROC): the derived AC-1 says
// "createProcess() accepts duration + callback", but MKPROC takes start+type and
// inits PTIME=1 itself; the delay is SLEEP's parameter (DEFA7.SRC:12-13). ROM wins;
// this suite pins makeProcess(start, type) and puts N into sleep(N, wake).
//
// AC-6 (purity) is enforced by the armed src/core sweep in purity.test.ts the moment
// scheduler.ts lands — it is NOT duplicated here (the framebuffer.test.ts precedent).
// stepTick()'s ZERO arity is pinned below as the API-level face of "clock-free".

import { describe, it, expect } from 'vitest'

type Continuation = (self: Process, sched: Scheduler) => void

interface Process {
  readonly ptime: number
  readonly ptype: number
  readonly alive: boolean
}

interface Scheduler {
  makeProcess: (start: Continuation, type: number) => Process
  kill: (proc: Process) => void
  sleep: (ticks: number, wake: Continuation) => void
  stepTick: () => void
  readonly processes: readonly Process[]
}

interface SchedulerModule {
  createScheduler: () => Scheduler
}

async function loadScheduler(): Promise<SchedulerModule> {
  try {
    const mod = (await import('../src/core/scheduler.js')) as Partial<SchedulerModule>
    if (typeof mod.createScheduler !== 'function') throw new Error('no `createScheduler` export')
    return mod as SchedulerModule
  } catch (e) {
    throw new Error(
      'src/core/scheduler.ts not built yet — GREEN (Dev) creates the pure, clock-free ' +
        'cooperative scheduler re-derived from defender/DEFA7.SRC:12-130: ' +
        '`createScheduler(): Scheduler` with makeProcess(start, type) (MKPROC, ptime=1 ' +
        'INIT), kill(proc) (KILL/free), sleep(ticks, wake) (SLEEP on the current proc), ' +
        'stepTick() (one DISP pass: DEC PTIME, dispatch on 0), and a `processes` run-list ' +
        'snapshot. No clock, no Date, no timers — the shell drives stepTick() off ' +
        `@shared/loop. (${(e as Error).message})`,
    )
  }
}

describe('makeProcess (MKPROC) — enqueues a process with verifiable state', () => {
  it('records the user TYPE it was given — two DISTINCT types, so a fixed stub fails', async () => {
    const { createScheduler } = await loadScheduler()
    const sched = createScheduler()
    const noop: Continuation = () => {}

    // Two different types: an implementation that hardcoded a type (or echoed the
    // first it saw) could not satisfy both (lang-review #18/#26).
    const a = sched.makeProcess(noop, 7)
    const b = sched.makeProcess(noop, 3)
    expect(a.ptype).toBe(7)
    expect(b.ptype).toBe(3)
    expect(a.alive).toBe(true)
    expect(b.alive).toBe(true)
  })

  it('enqueues onto the run-list — the snapshot grows by exactly one per make', async () => {
    const { createScheduler } = await loadScheduler()
    const sched = createScheduler()
    const noop: Continuation = () => {}

    expect(sched.processes.length).toBe(0)
    const a = sched.makeProcess(noop, 1)
    expect(sched.processes.length).toBe(1)
    expect(sched.processes).toContain(a)
    const b = sched.makeProcess(noop, 2)
    expect(sched.processes.length).toBe(2)
    expect(sched.processes).toContain(b)
  })

  it('does NOT run on creation, and first runs on the NEXT tick (PTIME=1 INIT, :82)', async () => {
    const { createScheduler } = await loadScheduler()
    const sched = createScheduler()
    const log: string[] = []
    sched.makeProcess(() => log.push('ran'), 1)

    // MKPROC inits PTIME=1, so DISP1 must DEC 1→0 before dispatch: nothing runs until
    // the first tick. A "run immediately on make" mutant fails here…
    expect(log).toEqual([])
    sched.stepTick()
    // …and a "needs two ticks" (off-by-one on the init) mutant fails here.
    expect(log).toEqual(['ran'])
  })
})

describe('stepTick (DISP) — one dispatch pass per call', () => {
  it('dispatches EVERY ready process in a single tick, each exactly once', async () => {
    const { createScheduler } = await loadScheduler()
    const sched = createScheduler()
    const log: string[] = []
    sched.makeProcess(() => log.push('a'), 1)
    sched.makeProcess(() => log.push('b'), 2)
    sched.makeProcess(() => log.push('c'), 3)

    sched.stepTick()

    // Order within a tick is not pinned (df3-1) — the SET and per-process COUNT are.
    expect(log.length).toBe(3)
    expect([...log].sort()).toEqual(['a', 'b', 'c'])
  })

  it('advances no clock of its own — stepTick() takes zero arguments (clock-free face)', async () => {
    const { createScheduler } = await loadScheduler()
    const sched = createScheduler()
    // A stepTick(dtMs) would have arity 1. The shell owns the clock and steps whole
    // frames; the core never reads a delta. (The source-level ban is the purity sweep.)
    expect(sched.stepTick.length).toBe(0)
  })
})

describe('sleep (SLEEP) — timed suspension, resuming at a NEW continuation', () => {
  it('wakes after EXACTLY N ticks — proven with two DISTINCT durations (3 and 5)', async () => {
    const { createScheduler } = await loadScheduler()
    const sched = createScheduler()
    const log: string[] = []

    // p3 sleeps 3 then wakes at w3; p5 sleeps 5 then wakes at w5. Distinct durations
    // so a "wake next tick regardless of N" or a hardcoded-N mutant cannot pass both.
    sched.makeProcess((_s, s) => {
      log.push('p3.start')
      s.sleep(3, () => log.push('p3.wake'))
    }, 1)
    sched.makeProcess((_s, s) => {
      log.push('p5.start')
      s.sleep(5, () => log.push('p5.wake'))
    }, 2)

    sched.stepTick() // tick 1: both start (PTIME 1→0), then re-arm to 3 and 5
    expect([...log].sort()).toEqual(['p3.start', 'p5.start'])

    sched.stepTick() // tick 2: 3→2, 5→4 — neither wakes
    sched.stepTick() // tick 3: 2→1, 4→3 — neither wakes
    expect(log.filter((l) => l.endsWith('.wake'))).toEqual([])

    sched.stepTick() // tick 4: p3 1→0 wakes (3 ticks after its start); p5 3→2
    expect(log.filter((l) => l.endsWith('.wake'))).toEqual(['p3.wake'])

    sched.stepTick() // tick 5: p5 2→1
    sched.stepTick() // tick 6: p5 1→0 wakes (5 ticks after its start)
    expect(log.filter((l) => l.endsWith('.wake'))).toEqual(['p3.wake', 'p5.wake'])
  })

  it('resumes at the GIVEN wake continuation, not the original start (PADDR updated)', async () => {
    const { createScheduler } = await loadScheduler()
    const sched = createScheduler()
    const log: string[] = []

    const wake: Continuation = () => log.push('wake')
    sched.makeProcess((_s, s) => {
      log.push('start')
      s.sleep(1, wake)
    }, 1)

    sched.stepTick() // start runs, arms sleep(1, wake)
    sched.stepTick() // 1→0 → wake runs — NOT start again

    // The original start must not re-run: SLEEP overwrites PADDR with `wake`.
    expect(log).toEqual(['start', 'wake'])
    expect(log.filter((l) => l === 'start').length).toBe(1)
  })
})

describe('termination — SUCIDE (return) and KILL both free the record', () => {
  it('SUCIDE: a continuation that yields nothing is removed after one run', async () => {
    const { createScheduler } = await loadScheduler()
    const sched = createScheduler()
    const log: string[] = []

    const p = sched.makeProcess(() => log.push('once'), 1)

    sched.stepTick() // runs, does not reschedule → suicides
    expect(log).toEqual(['once'])
    expect(p.alive).toBe(false)
    expect(sched.processes).not.toContain(p)

    sched.stepTick() // must NOT run again — it is off the run-list
    sched.stepTick()
    expect(log).toEqual(['once'])
  })

  it('KILL: a killed process never runs, and its siblings are untouched', async () => {
    const { createScheduler } = await loadScheduler()
    const sched = createScheduler()
    const log: string[] = []

    // Three long-lived (self-sleeping) processes; kill the middle one before any tick.
    const keepA = sched.makeProcess(function a(_s, s): void {
      log.push('a')
      s.sleep(1, a)
    }, 1)
    const victim = sched.makeProcess(() => log.push('VICTIM'), 2)
    const keepC = sched.makeProcess(function c(_s, s): void {
      log.push('c')
      s.sleep(1, c)
    }, 3)

    sched.kill(victim)
    expect(victim.alive).toBe(false)
    expect(sched.processes).not.toContain(victim)
    expect(sched.processes).toContain(keepA)
    expect(sched.processes).toContain(keepC)

    sched.stepTick()
    sched.stepTick()

    // The victim's continuation must never have fired; a and c ran each tick.
    expect(log).not.toContain('VICTIM')
    expect(log.filter((l) => l === 'a').length).toBe(2)
    expect(log.filter((l) => l === 'c').length).toBe(2)
  })
})

describe('re-entrancy — a running process spawns a child (deterministic snapshot)', () => {
  it('a child made mid-tick waits for the NEXT tick, then runs exactly once', async () => {
    const { createScheduler } = await loadScheduler()
    const sched = createScheduler()
    const log: string[] = []

    // parent runs on tick 1, spawns a child, then suicides. The child (PTIME=1) is
    // enqueued behind the live cursor, so it must not run in tick 1 — only tick 2.
    sched.makeProcess((_s, s) => {
      log.push('parent')
      s.makeProcess(() => log.push('child'), 9)
    }, 1)

    sched.stepTick() // tick 1: parent runs and spawns child; child NOT yet dispatched
    expect(log).toEqual(['parent'])

    sched.stepTick() // tick 2: child (1→0) runs
    expect(log).toEqual(['parent', 'child'])

    sched.stepTick() // child suicided after its single run — nothing more
    expect(log).toEqual(['parent', 'child'])
  })
})

describe('processes snapshot — reflects the live run-list', () => {
  it('holds exactly the surviving processes after a kill (identity, not count alone)', async () => {
    const { createScheduler } = await loadScheduler()
    const sched = createScheduler()
    const noop: Continuation = () => {}

    const a = sched.makeProcess(noop, 1)
    const b = sched.makeProcess(noop, 2)
    const c = sched.makeProcess(noop, 3)
    sched.kill(b)

    const live = sched.processes
    expect(live.length).toBe(2)
    expect(live).toContain(a)
    expect(live).toContain(c)
    expect(live).not.toContain(b)
  })
})
