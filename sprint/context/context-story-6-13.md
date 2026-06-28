# Story 6-13 Context

## Title
Decide & reconcile authentic ROM spawn schedule vs the playtest-tuned curve (6-9 follow-up)

## Metadata
- **Story ID:** 6-13
- **Type:** chore
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** tempest
- **Epic:** Wave 6 — Playtest feel & balance

## Problem
Story 6-9 tuned enemy *motion* to authentic ROM constants but surfaced a blocking
conflict it deferred: the **authentic ROM enemy spawn schedule** (which enemy
types unlock at which level) does not match the **playtest-tuned curve** currently
encoded in `src/core/rules.ts` (`rollSpawnKind`) and locked by existing tests.

- **Authentic ROM schedule (rev-3 source):** flippers-only L1–4; tankers/spikers
  appear L5+; fuseballs L11+; pulsars L17+.
- **Current playtest-tuned curve:** tankers/spikers at L3+; pulsars/fuseballs at L5+.
- Tests pinning the current (tuned) curve: `tests/core/sim.spawn.test.ts` and
  `tests/core/sim.difficulty.test.ts`.

## DECISION (stakeholder — 2026-06-28)
**Follow the authentic ROM spawn schedule. Do NOT re-tune the canonical game.**

The "decide" half of this story is resolved by the user: the canonical Tempest
spawn schedule is authoritative. Reconcile code + tests to the ROM schedule, not
to a blend and not to the playtest-tuned curve. This is consistent with the
project's standing direction to favor harder/more-authentic constants (the game
plays too easy and difficulty should ratchet up toward the original).

If the exact per-level ROM thresholds need verification, derive them from the
rev-3 ROM source / disassembly rather than guessing; the L5/L11/L17 figures above
are the working values from 6-9's investigation and should be confirmed during RED.

## Technical Approach
_Hints for TEA/Dev — verify against the code before relying on line numbers._
- `src/core/rules.ts` → `rollSpawnKind()` (~L182–195) gates roster by level;
  this is the curve to reconcile to the ROM schedule.
- `src/core/sim.ts` → spawn loop consumes `rollSpawnKind()`.
- `tests/core/sim.spawn.test.ts` → currently locks L1=flippers, L3=tankers/spikers
  intro. Must be updated to the ROM schedule (flippers-only through L4, etc.).
- `tests/core/sim.difficulty.test.ts` → roster gate (~L101–112) likewise.
- Document the authentic schedule somewhere durable (constant comment / doc) so the
  decision is not re-litigated.

## Scope
- **In scope:** documenting the authentic ROM spawn schedule; reconciling
  `rollSpawnKind`/spawn logic and the spawn/difficulty tests to that schedule.
- **Out of scope:** re-tuning toward a playtest curve; enemy *motion* fidelity
  (that's 6-14/6-15/6-16); spawn *rate/interval* tuning beyond the roster-by-level
  schedule unless it's part of the canonical schedule.

## Acceptance Criteria
1. The authentic ROM spawn schedule (which enemy types unlock at which level) is
   documented in the code/repo with its source noted.
2. The decision "follow ROM, do not re-tune" is recorded with rationale (this file
   + a durable note in the relevant source).
3. `rollSpawnKind`/spawn logic is reconciled so the roster-by-level matches the
   authentic ROM schedule.
4. `sim.spawn.test.ts` and `sim.difficulty.test.ts` are updated to assert the ROM
   schedule and pass (no remaining assertions pinning the old playtest curve).

---
_Decision recorded by SM from stakeholder input; background from sm-setup investigation of story 6-9._
