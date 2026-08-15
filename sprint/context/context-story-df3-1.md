# Story df3-1 Context

## Title
Cooperative process scheduler core (RED first): plugins/defender/src/core/scheduler.ts — a process run-list with makeProcess (MKPROC, defender/DEFA7.SRC:72), kill (KILL/SUCIDE, defender/DEFA7.SRC:19,31), sleep/nap (SLEEP, defender/DEFA7.SRC:12 — wake after N 16-msec ticks at a continuation addr), and stepTick() (the once-per-frame dispatch, the sub-128 IRQ arm's effect, defender/DEFA7.SRC:3048-3050). Pure and clock-free; the shell calls stepTick() off @shared/loop. Re-derived and re-cited from THIS tree (jt2 is a pattern reference in prose only, never imported). purity.test.ts stays green.

## Metadata
- **Story ID:** df3-1
- **Type:** story
- **Points:** 5
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Defender — the ship + the scheduler (phase 4a)

## Problem

Defender's game logic is not a frame of straight-line updates — it is a set of
**cooperative processes** on a linked run-list, each yielding control by *napping*
for N 16-msec ticks and resuming at a stored continuation address. The ship, each
star, each laser (and, later, every enemy) is one of these processes. Nothing in
`df3` can move until this kernel exists, so it is built **first** and **RED first**:
a pure, clock-free `src/core/scheduler.ts` that the shell drives one tick per frame.

## Technical Approach

Port the resident kernel from `DEFA7.SRC`, re-derived and re-cited from *this* tree
(joust's kernel is a **pattern reference in prose only** — never imported).

**The process record.** Each process carries the fields the ROM names: `PADDR`
(continuation address — where the process resumes), `PTIME` (nap countdown in
ticks), `PTYPE` (user type tag), `PCOD` (regular vs "super" process). In TS this is
a small record/struct on a run-list; the ROM keeps two free-lists (`FREE`,
`SPFREE`) — model at least the regular `FREE` list.

**The operations** (cite each):
- `makeProcess` / `MKPROC` (`defender/DEFA7.SRC:72-87`) — pull a record off `FREE`,
  set `PADDR`/`PTYPE`, init `PTIME=1`, link into the run-list at the current
  process. (`MSPROC`, `defender/DEFA7.SRC:56`, is the "super process" variant — model
  if a laser needs it in df3-5, else note and defer.)
- `sleep` / `nap` / `SLEEP` (`defender/DEFA7.SRC:12-15`) — store the nap count into
  `PTIME` and the continuation into `PADDR`, then yield (`DISP2`). The ROM's `NAP`
  macro is the ergonomic form; expose a `sleep(ticks, continuation)`.
- `kill` / `KILL` / `SUCIDE` (`defender/DEFA7.SRC:19-48`) — unlink a process from
  the run-list and return its record to `FREE` (or `SPFREE`). `SUCIDE` is
  kill-self-then-dispatch.
- `stepTick()` — the once-per-frame dispatch: the effect of the IRQ's sub-128 arm
  incrementing `TIMER` while `EXEC0` spins on it (`defender/DEFA7.SRC:3048-3050`).
  Walk the run-list, decrement `PTIME`, run each due process from its `PADDR`, honour
  new naps/kills issued during the tick.

**Purity.** `stepTick()` takes no wall-clock — the SHELL calls it once per fixed
60 Hz frame off `@shared/loop`. `plugins/defender/tests/purity.test.ts` must stay
green (no `Date`/`Math.random`/canvas/`fetch` in `src/core/`).

## Scope

- **In scope:** the pure kernel — process records, `FREE` list, make/kill/sleep,
  `stepTick()` dispatch; a trivial demo process proving nap→resume works.
- **Out of scope:** the ship, stars, laser, world/camera (later df3 stories); any
  enemy process (`df4`); the shell rAF wiring beyond calling `stepTick()`.

## Acceptance Criteria

- [ ] `plugins/defender/src/core/scheduler.ts` exists: a pure cooperative kernel
      with `makeProcess`, `kill`, `sleep`/`nap`, and `stepTick()` — no clock read.
- [ ] A process that naps for N ticks does **not** run for N-1 `stepTick()` calls
      and **does** resume at its continuation on the Nth (pinned with an explicit N).
- [ ] `kill` unlinks a process (it stops receiving ticks) and returns its record to
      the free list so a later `makeProcess` reuses it; run-list integrity holds
      across interleaved make/kill.
- [ ] Every kernel constant/field introduced into `src/core` (`PTIME`/`PADDR`/
      `PTYPE`/`PCOD`, the tick quantum) is backed by a
      `plugins/defender/docs/rom-study/claims/*.json` entry, byte-verified by
      `citations.test.ts` against `reference/original-source/defender/DEFA7.SRC`.
- [ ] `purity.test.ts` stays green; the shell calls `stepTick()` once per fixed
      60 Hz frame via `@shared/loop` (SHELL-side; core stays clock-free).
- [ ] New comments cite ROM as `defender/DEFA7.SRC:<line>`, not `file.ts:<line>`.

## References

- **Epic context:** `sprint/context/context-epic-df3.md` — core/shell boundary, timebase, scheduler-as-pattern guardrail.
- **Design spec:** `docs/superpowers/specs/2026-08-15-defender-df3-ship-scheduler-design.md` §2 (the seam), §4 (df3-1).
- **Kernel source:** `reference/original-source/defender/DEFA7.SRC:12` (SLEEP), `:19` (SUCIDE), `:31` (KILL), `:72` (MKPROC), `:56` (MSPROC); `:3048-3050` (EXEC0/TIMER spin).
- **Dossier:** `plugins/defender/docs/rom-study/subsystems.md` ("Resident control — DEFA7").
- **Pattern reference (prose only):** joust's cooperative kernel under `plugins/joust/src/core/` — do **not** import.
- **Gates:** `plugins/defender/tests/audit/citations.test.ts`, `plugins/defender/tests/purity.test.ts` (df1-1).

---
> **Architect-verified anchors** (checked against the current tree during df3 hydration, 2026-08-15):
> `DEFA7.SRC:12` = `SLEEP`, `:19` = `SUCIDE`, `:31` = `KILL`, `:72` = `MKPROC`, `:56` = `MSPROC`, `:3048-3050` = the `EXEC0 LDA TIMER` spin. TEA must re-pin precisely at RED (line numbers from tool output only).

_Generated by `pf context create story df3-1`; body authored by Architect (df3 design spec)._
