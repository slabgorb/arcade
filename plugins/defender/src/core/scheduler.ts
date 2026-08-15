// plugins/defender/src/core/scheduler.ts
//
// Story df3-1 (GREEN) — the cooperative process-scheduler core for Defender, a pure,
// clock-free re-derivation of the Williams kernel at reference/original-source/
// defender/DEFA7.SRC:12-130. The shell drives it: it calls stepTick() once per
// 16-msec frame off @shared/loop. The core never reads a clock, mints entropy, or
// reaches a browser surface — the src/core purity sweep (tests/purity.test.ts) scans
// this file. jt2 (joust) is a prose pattern reference only; nothing is imported here.
//
// ─── THE ROM, ROUTINE BY ROUTINE ─────────────────────────────────────────────────
//   MKPROC (:72-84)  pulls a record off the FREE list, PCOD=0, PADDR=start, PTYPE=type,
//                    PTIME=1 ("INIT TIME", :82), links it into the ACTIVE run-list —
//                    so a fresh process first runs on the NEXT tick, never on creation.
//   SLEEP  (:12-15)  sets PTIME=N and PADDR=wake on the CURRENT process (CRPROC), then
//                    yields — the process wakes after exactly N ticks at the NEW PADDR.
//   SUCIDE (:19-22)  a process that yields nothing → KILL self, back to FREE, dispatch on.
//   KILL   (:31-49)  unlink an arbitrary process from ACTIVE, return its record to FREE.
//   DISP   (:3119-3129)  one dispatch pass:
//                        DISP1  DEC PTIME,U   ; every live process drops one tick
//                               BNE DISP2     ; not zero → still sleeping, skip
//                               STU CRPROC    ; zero → it is the current process
//                               JMP [PADDR,U] ; dispatch its continuation
//   and that pass fires once per frame behind the TIMER gate (EXEC0, :3048-3050) — the
//   gate lives in the SHELL here (it owns the clock); stepTick() IS one DISP pass.
//
// ─── DETERMINISM (df3-1 TEA design deviation) ────────────────────────────────────
// stepTick() dispatches the SNAPSHOT of the run-list taken at the start of the tick.
// A process created DURING a dispatch (a child spawned by a running process) is
// enqueued but not decremented or dispatched until the next tick — matching the ROM,
// whose head-insertion (MKPROC STU [CRPROC]) lands the child behind the live DISP
// cursor. Order WITHIN a tick is not part of the contract.

/**
 * A process body ("PADDR"): the code a process runs when dispatched. It receives its
 * own handle and the scheduler, and either yields via `sched.sleep(n, wake)` (SLEEP —
 * rescheduled) or returns without sleeping (SUCIDE — self-terminates and is freed).
 */
export type Continuation = (self: Process, sched: Scheduler) => void

/** The public, read-only view of a process record. */
export interface Process {
  /** PTIME — ticks remaining until this process next runs. */
  readonly ptime: number
  /** PTYPE — the user type handed to makeProcess. */
  readonly ptype: number
  /** True while the process is on the run-list; false once KILLed or SUCIDEd. */
  readonly alive: boolean
}

/** The cooperative scheduler surface the shell drives once per frame. */
export interface Scheduler {
  /** MKPROC — enqueue a new process (PTIME=1, runs next tick); returns its handle. */
  makeProcess: (start: Continuation, type: number) => Process
  /** KILL — unlink a process and free its record; it never runs again. */
  kill: (proc: Process) => void
  /** SLEEP — reschedule the CURRENT process (valid only inside a dispatch). */
  sleep: (ticks: number, wake: Continuation) => void
  /** One DISP pass: decrement every live process, dispatch those that reach zero. */
  stepTick: () => void
  /** A snapshot of the live run-list. */
  readonly processes: readonly Process[]
}

/** The internal, mutable record. `paddr` is the only field the public view omits. */
interface ProcRecord {
  ptime: number
  ptype: number
  alive: boolean
  paddr: Continuation
}

/** Create an isolated scheduler with its own run-list. Pure — no shared state. */
export function createScheduler(): Scheduler {
  // The ACTIVE run-list. We hold only live records; KILL/SUCIDE splice a record out.
  const runList: ProcRecord[] = []

  // CRPROC and the SLEEP-vs-SUCIDE discriminator, live only during a dispatch.
  let current: ProcRecord | null = null
  let currentRescheduled = false

  const removeProc = (proc: ProcRecord): void => {
    // Only a record actually on THIS run-list is freed. A foreign handle (from another
    // scheduler) or an already-removed one is a TRUE no-op — we do not touch its `alive`
    // flag, so a mistaken kill() cannot silently mark someone else's process dead.
    const i = runList.indexOf(proc)
    if (i === -1) return
    proc.alive = false
    runList.splice(i, 1)
  }

  const makeProcess = (start: Continuation, type: number): Process => {
    // MKPROC :72-84 — PCOD=0 (regular), PADDR=start, PTYPE=type, PTIME=1 INIT (:82).
    const proc: ProcRecord = { ptime: 1, ptype: type, alive: true, paddr: start }
    runList.push(proc) // link into ACTIVE
    return proc
  }

  const kill = (proc: Process): void => {
    // KILL :31-49 — idempotent, and scoped to this run-list (removeProc checks
    // membership first). NOTE: `Process` is a structural, exported interface, so this
    // downcast is a within-module CONVENTION — makeProcess is the only place records
    // are minted — NOT a type-system guarantee. The membership check in removeProc is
    // what actually makes a foreign or hand-built handle safe, not the cast.
    removeProc(proc as ProcRecord)
  }

  const sleep = (ticks: number, wake: Continuation): void => {
    // SLEEP :12-15 — operates on CRPROC; a no-op outside a dispatch (no current proc).
    if (current === null) return
    // Guard the boundary (lang-review #21): DISP only ever tests PTIME as it counts DOWN
    // through exactly 0, so any ptime that cannot land on 0 — zero, negative, NaN,
    // ±Infinity, or a fraction that steps past 0 — would strand the process forever
    // (alive, never dispatched, never freed). Any such invalid duration is treated as 1
    // ("wake next tick"), matching MKPROC's own PTIME=1 INIT (:82); a positive fraction
    // floors to whole ticks. The scheduler quantum is an integer count of frames.
    current.ptime = Number.isFinite(ticks) && ticks >= 1 ? Math.floor(ticks) : 1
    current.paddr = wake
    currentRescheduled = true
  }

  const stepTick = (): void => {
    // DISP :3119-3129 — walk the run-list as it stood at the start of the pass.
    const snapshot = runList.slice()
    for (const proc of snapshot) {
      if (!proc.alive) continue // killed earlier this tick (or before) — skip
      proc.ptime -= 1 // DISP1 DEC PTIME,U
      if (proc.ptime !== 0) continue // BNE DISP2 — still sleeping
      // Reached zero: dispatch. STU CRPROC / JMP [PADDR,U].
      current = proc
      currentRescheduled = false
      proc.paddr(proc, api)
      current = null
      // Yielded nothing (no SLEEP) and not explicitly killed → SUCIDE (:19-22).
      if (proc.alive && !currentRescheduled) removeProc(proc)
    }
  }

  const api: Scheduler = {
    makeProcess,
    kill,
    sleep,
    stepTick,
    get processes(): readonly Process[] {
      return runList.slice()
    },
  }
  return api
}
