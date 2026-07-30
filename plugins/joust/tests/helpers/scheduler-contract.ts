// tests/helpers/scheduler-contract.ts
//
// Story jt2-1 — the CONTRACT for the process scheduler core, TEA-authored
// (O'Brien). Same split the epic has used since jt1-2: TEA states the module
// shape and the laws that pin it; Dev (Julia) writes the module. The behaviour
// lives in tests/scheduler.test.ts; the ROM-law provenance in
// tests/scheduler-source.test.ts.
//
// ─── THE RULING THIS CONTRACT ENCODES (epic jt2, binding) ────────────────────
// SEMANTICS ONLY, not a memory image. There is NO 56-byte block here, no PPC
// resume address, no 40×56 RAM pool — those stay dossier CITATIONS
// (subsystems.md §1). What the ROM's cooperative scheduler MEANS is modelled:
//
//   • A process naps in whole frames. `nap` counts down one per frame while the
//     process is asleep, and the process WAKES on the frame the count reaches 0
//     (`DEC PNAP,U / BEQ EXELOP`, SYSTEM.SRC:233,250 — nap N wakes on pass N).
//   • Two scheduling classes run as two FULL passes: every primary steps before
//     any secondary each frame (`PRISEC`, SYSTEM.SRC:217,231,248; PROCCR sets
//     PPRI=0, SECCR 255, RAMDEF.SRC:8-18).
//   • Kill takes id + mask, so one call kills a whole class of ids
//     (`KLPROC` — `ANDB PID,U / CMPB ,S`, SYSTEM.SRC:341-347).
//   • The RNG advances once per frame independent of consumption, mirroring the
//     IRQ's timer stir (`INC RANDOM / DEC RANDOM+1`, SYSTEM.SRC:581-582), via a
//     seeded deterministic generator (@arcade/shared/rng, mulberry32) whose
//     durable word is carried in state and seeded by the SHELL.
//
// ─── `period` — the re-nap the process body would set ────────────────────────
// The ROM has no `period` field: a woken process re-naps itself by calling
// `PCNAP n` in its body (`NAPTIM STA PNAP,U`, SYSTEM.SRC:225). We compress that
// one degree of freedom into `period`: on waking, the scheduler re-naps the
// process to `period`. A player runs every frame, so it is `nap:1, period:1`;
// a one-shot timer that must never re-fire in a test window uses a large period.

import type { EntityState, PlayerInput } from './flight-contract.js'

export type { EntityState, PlayerInput }

/** `PPRI` — a process's scheduling class. Primary steps before secondary. */
export type ProcessClass = 'primary' | 'secondary'

/** What a caller hands to `spawn` to create a process (`PROCCR`/`SECCR`). */
export interface ProcessSpec {
  /** `PID` — unique, non-zero. Kills select by `(id & mask) === target`. */
  id: number
  /** `PPRI` — primary (0) or secondary (255). */
  cls: ProcessClass
  /** `PNAP` — frames until the first wake. >= 1. */
  nap: number
  /** Re-nap applied on each wake (1 = every frame). See the header note. */
  period: number
  /** Tagged-union discriminant: 'player', later 'enemy'/'egg'/'wave'/… */
  kind: string
  /** A player process carries its flight/ground state here. */
  entity?: EntityState
}

/** A scheduled process. Plain data — the behaviour is dispatched by `kind`. */
export interface Process extends ProcessSpec {}

/** The whole simulation state after the jt2-1 migration. */
export interface GameState {
  /** Frame index — the pre-jt2 GameState was only this. */
  readonly frame: number
  /** The tagged-union process list. */
  readonly processes: readonly Process[]
  /**
   * The ordered ids that WOKE on the most recent `stepFrame` — primaries first,
   * then secondaries, in list order within each class. Empty at creation and
   * on any frame nothing woke.
   */
  readonly woke: readonly number[]
}

/** One drawn random plus the advanced state — the probe for the RNG stream. */
export interface Draw {
  /** A float in [0, 1). */
  readonly value: number
  /** The state after one generator advance. */
  readonly state: GameState
}

export interface SchedulerModule {
  /** The Williams video frame rate — unchanged from jt1-1. */
  FRAME_HZ: number

  /**
   * `PBLKM` — the ROM's maximum-process count, 40 (RAMDEF.SRC:166). OPTIONAL:
   * a semantics-only core need not enforce a cap, but IF it exposes one it must
   * be this value (anchored on PBLKM, never a searched `ORG $0` — claim
   * JT10-010).
   */
  PBLKM?: number

  /**
   * The deterministic starting state. The seed is the shell's — core mints no
   * entropy (the purity guard forbids it). No processes, RNG at the seed.
   */
  createState(seed: number): GameState

  /** Create a process and append it to the list (`PROCCR`/`SECCR`). Pure. */
  spawn(state: GameState, spec: ProcessSpec): GameState

  /**
   * Kill every process whose `(id & mask) === target` in ONE call — the
   * `KLPROC` id+mask law (SYSTEM.SRC:341-347). With `mask` isolating a class's
   * id bits, this removes a whole class; with `mask` = 0xFF it removes exactly
   * the one process with `id === target`. Pure.
   */
  kill(state: GameState, target: number, mask: number): GameState

  /**
   * Advance exactly one video frame: all primaries step, then all secondaries
   * (two full passes), each asleep process's nap decrements, wakers run their
   * kind's behaviour and re-nap to `period`, and the RNG stirs ONCE. `inputs`
   * supplies this frame's `PlayerInput` per process id (players only). Pure —
   * the returned state is new; the argument is never mutated.
   */
  stepFrame(state: GameState, inputs?: Record<number, PlayerInput>): GameState

  /** Draw one random from the durable stream, returning it and the advance. Pure. */
  draw(state: GameState): Draw
}

/**
 * Load the not-yet-built scheduler with a self-describing failure — the
 * loadFlight/loadChecker pattern. The specifier is assembled at runtime so the
 * bundler cannot resolve it statically and fail the whole FILE at collection.
 *
 * RED today: `src/core/frame.ts` exports `createState`/`stepFrame`/`FRAME_HZ`
 * but none of `spawn`/`kill`/`draw`, so this throws "scheduler not built yet"
 * per test — a clean "feature absent" red, never a module-resolution trace.
 */
export async function loadScheduler(): Promise<SchedulerModule> {
  const specifier = ['..', '..', 'src', 'core', 'frame.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<SchedulerModule>
    for (const fn of ['createState', 'spawn', 'kill', 'stepFrame', 'draw'] as const) {
      if (typeof mod[fn] !== 'function') throw new Error(`module has no \`${fn}\` export`)
    }
    return mod as SchedulerModule
  } catch (e) {
    throw new Error(
      'scheduler not built yet — GREEN (Julia) grows joust/src/core/frame.ts to ' +
        'satisfy tests/helpers/scheduler-contract.ts: a GameState with a process ' +
        'list + seeded RNG, plus spawn/kill/stepFrame/draw. ' +
        `(${(e as Error).message})`,
    )
  }
}
