# Story Context: df3-1

## Story Title
Cooperative process scheduler core (RED first): plugins/defender/src/core/scheduler.ts — a process run-list with makeProcess (MKPROC, defender/DEFA7.SRC:72), kill (KILL/SUCIDE, defender/DEFA7.SRC:19,31), sleep/nap (SLEEP, defender/DEFA7.SRC:12 — wake after N 16-msec ticks at a continuation addr), and stepTick() (the once-per-frame dispatch, the sub-128 IRQ arm's effect, defender/DEFA7.SRC:3048-3050). Pure and clock-free; the shell calls stepTick() off @shared/loop. Re-derived and re-cited from THIS tree (jt2 is a pattern reference in prose only, never imported). purity.test.ts stays green.

## Story Type
Feature

## Points
5

## Acceptance Criteria (Derived from ROM Citations)

### AC-1: makeProcess (MKPROC) — process creation
The scheduler must provide a `makeProcess()` function that creates and enqueues a new process on the run-list, allocating process records from the FREE list and initializing them with PTIME (duration in 16-msec ticks), PADDR (continuation address), PTYPE (process type), and PCOD (process code/behavior). Citations: defender/DEFA7.SRC:72 (MKPROC PSHS A,Y,U).

**Test:** createProcess() accepts duration + callback, enqueues to run-list, state is verifiable.

### AC-2: kill (KILL) — process termination
The scheduler must provide a `kill()` function that removes a process from the run-list and returns it to the FREE list. Citations: defender/DEFA7.SRC:31 (KILL).

**Test:** kill() removes process from run-list, frees process record, process no longer executes.

### AC-3: SUCIDE — self-terminating process
The scheduler must support SUCIDE behavior (process self-termination at the end of its continuation), returning itself to the FREE list. Citations: defender/DEFA7.SRC:19 (SUCIDE).

**Test:** A process that returns without rescheduling itself is freed and no longer in run-list.

### AC-4: sleep/nap (SLEEP) — timed process suspension
The scheduler must provide a `sleep()` or `nap()` function that suspends a running process for N 16-msec ticks (the scheduler quantum), resuming execution at a continuation address after the delay expires. Citations: defender/DEFA7.SRC:12 (SLEEP LDU CRPROC).

**Test:** sleep(N) suspends process, stepTick() advances N times, process resumes at continuation.

### AC-5: stepTick() — once-per-frame dispatch
The scheduler must provide a `stepTick()` function that executes once per 16-msec frame (60 Hz), decrementing PTIME for each sleeping process, and dispatching all ready (PTIME=0) processes from the run-list to their continuation addresses. stepTick() is called by the shell off @shared/loop and must remain clock-free (no internal timers; shell drives the clock). Citations: defender/DEFA7.SRC:3048-3050 (EXEC0 / LDA TIMER / BEQ EXEC0 / CLR TIMER — the once-per-frame TIMER gate).

**Test:** stepTick() decrements PTIME, dispatches ready processes, maintains run-list consistency.

### AC-6: purity.test.ts stays green
The scheduler must pass the existing purity test that enforces clock-free core (no direct call to timers, no Date, no setTimeout, no global state). Re-derived from jt2 (joust scheduler) as a pattern reference in prose only — joust code is never imported.

**Test:** `npm run test:orchestrator` and `npx vitest run --project defender` both pass; no clock symbols in src/core/scheduler.ts.

## Workflow
tdd

## Repository
arcade

## Epic
df3 — Defender — the ship + the scheduler (phase 4a)

## Background

The Defender arcade machine used a cooperative multi-process scheduler kernel to coordinate the player ship, enemies, projectiles, and game state transitions. The scheduler dispatched processes (short-running subroutines) on a fixed 16-msec (60 Hz) clock tick, using SLEEP to yield control until the next tick.

The df3 epic re-derives this scheduler in TypeScript as a pure, clock-free core module (the shell provides the clock via @shared/loop and calls stepTick() once per frame). This story implements the core scheduler kernel: process creation (MKPROC), termination (KILL/SUCIDE), sleep/nap suspension with wake-up at a continuation address, and the once-per-frame dispatch loop (stepTick).

The scheduler is a pattern reuse from jt2 (joust), re-cited from defender/DEFA7.SRC. No code is imported from joust; this is a fresh derivation from the ROM.

## Dependencies
- df1 (dossier + citation gate + src/core purity test)
- df2 (framebuffer render seam, palette, charset, object/terrain tables)

## Out of Scope
- Player ship mechanics (df3-3)
- World-wrap coordinate model (df3-2)
- Parallax starfield (df3-4)
- Laser fire (df3-5)
- Enemies/collision/materialize (df4)
- Waves/scanner/smart-bomb/hyperspace/score/2P (df5)
- Sound (df6)
- Attract→play phase machine/HUD/showcase (df7)

## Design Notes

**Pattern Reference:** jt2 (joust scheduler) is a prose reference only for understanding the Williams kernel pattern. No code is imported. The scheduler is re-derived and re-cited from THIS tree (defender/DEFA7.SRC:12-130).

**Purity & Clock-Free:** The core scheduler is pure and clock-free. The shell (via @shared/loop) calls stepTick() once per 16-msec frame (60 Hz). The scheduler must not directly read a clock or call any time function (Date, setTimeout, etc.). The purity test (purity.test.ts) enforces this constraint.

**Process Records:** Processes are records with fields: PTIME (time until wake, in ticks), PADDR (continuation address / callback), PTYPE (process type), PCOD (process code/behavior). The scheduler maintains a run-list and a FREE list.

**ROM Citations:** Every constant and algorithm comes from defender/DEFA7.SRC or defender/PHR6.SRC, with line numbers cited in acceptance criteria and code comments. Line numbers come from SourceGen or tool output, not hand-counted.
