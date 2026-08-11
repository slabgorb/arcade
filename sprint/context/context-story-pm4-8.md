# Context: pm4-8 — Self-playing attract demo (core)

## Background

**Measured Facts (verified against tree as of 2026-08-11):**

1. **Dependency pm4-5 is `done`** (phase machine shipped: `GamePhase` includes `attract`, `advancePhase` in `plugins/pac-man/src/core/phase.ts`).

2. **During `attract` the sim is currently FROZEN.** `plugins/pac-man/src/core/game.ts:493-504`: the comment states "The sim proper runs ONLY in `playing`. `game-over`, `attract` and `ready` freeze it: nothing moves — not Pac, not the ghosts (Blinky is released from frame 0), not the dot count." The `attract` branch (line 500-504) only checks start/coin then `return`s. So the story's description "(ghost AI already runs)" does NOT mean ghosts currently execute during attract — it means the ghost AI CODE (`stepGhost` in `plugins/pac-man/src/core/ghost.ts`) already EXISTS and is to be REUSED. pm4-8 must un-freeze/step the sim during attract: drive Pac from the seeded auto-player AND step the ghosts (reuse `stepGhost`).

3. **BLAST RADIUS — pm4-8 deliberately OVERTURNS a shipped invariant.** `plugins/pac-man/tests/core/lifecycle.test.ts:79-88` — `describe('pm4-6 AC4: the whole sim is frozen during attract — Blinky must not move')` — directly contradicts pm4-8 (the maze must now play itself, so Blinky WILL move in attract). This is an EXPECTED RED, anticipated by the epic authors (`plugins/pac-man/tests/core/freeze-pauses.test.ts:12-13` notes "pm4-6 already owns attract/ready/playing; pm4-8 the attract auto-player"). TEA must reconcile/replace that "Blinky must not move during attract" assertion, NOT treat its failure as a regression. This is load-bearing: the existing pm4-6 test actively contradicts the deliverable.

4. **SCOPE is CORE-ONLY.** Deliverable: a pure, deterministic, seeded auto-player driver in `plugins/pac-man/src/core/` (mirrors mc6-4's missile-command pattern — the "SMART CURSOR MOVER (ATTRACT)" seeded driver), no clock, seeded RNG. `plugins/pac-man/tests/core/purity.test.ts` (the core-boundary scan) MUST stay green — no `Date`/`performance`/clock imports in core. The SHELL attract-screen presentation + high-score ladder is a SEPARATE story **pm4-9** (backlog); the `showcase: false -> true` flip in `plugins/pac-man/plugin.ts:12` and `src/host/registry.ts` is OUT OF SCOPE here (likely pm4-9). Do NOT wire shell render or flip showcase in pm4-8.

5. **LIVENESS REQUIREMENT for TEA's RED** (per hard-won project rule "a feature must be OBSERVED in play"): the RED phase must not certify mere transcription. It should include (a) a SEEDED-DEMO test showing the maze actually advances over N frames in attract (Pac moves, a ghost moves, dots get eaten) purely from the driver, (b) an ORDINARY-INPUT test showing any input during attract -> `ready` (reseeds a fresh board via the existing `startCabinet`), and (c) a CONTROL showing determinism: same seed -> same trajectory, different seed -> different.

## Acceptance Criteria

> ⚠ **DERIVED ACs** — epic YAML had `acceptance_criteria: null`; these were derived by SM/setup from measured facts, not authored in the epic.

- **AC-1:** Auto-player in `src/core/` accepts a seed and drives Pac-Man movement during phase `attract` deterministically (same seed → same trajectory, different seed → different).
- **AC-2:** Ghosts step during `attract` using reused `stepGhost` logic; they move and act autonomously in attract, observable in seeded-demo tests.
- **AC-3:** Dots are consumed during `attract` by Pac-Man driven by the auto-player (measured in seeded-demo test over N frames).
- **AC-4:** Any input during `attract` advances to `ready` and reseeds a fresh board via existing `startCabinet`.
- **AC-5:** `purity.test.ts` remains green: auto-player uses only seeded RNG and frame counts, no `Date`/`performance`/clock.
- **AC-6:** Existing pm4-6 test (lifecycle.test.ts:79-88) "Blinky must not move during attract" is reconciled/replaced by TEA to reflect new behavior (this is expected RED, not a regression).
- **AC-7:** RED phase includes three test classes: seeded-demo (Pac + ghost + dot consumption over N frames), ordinary-input (any key → ready), determinism control (same/different seed → same/different output).

## Test Plan

TEA will write tests in `plugins/pac-man/tests/core/` covering:

1. **Seeded-Demo Test:** Create a board with a known seed, advance attract N times, assert Pac position moved, ghost position moved, dot count decreased.
2. **Ordinary-Input Test:** Start attract, inject input, verify phase→ready, verify fresh board (dots reset).
3. **Determinism Control:** Two runs with same seed yield identical position traces; two runs with different seeds yield different traces.

Watch for: the test at lifecycle.test.ts:79-88 will red — TEA must update/replace it so it reflects attract self-play (Blinky WILL move).

## Notes for Dev

The auto-player is a pure seeded driver; mc6-4 (missile-command) is the design reference. Place the driver in `plugins/pac-man/src/core/`, re-use `stepGhost` and the existing RNG seeding infrastructure. Shell presentation (attract screen, ladder, showcase flag) is pm4-9, out of scope here.
