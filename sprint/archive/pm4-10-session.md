---
story_id: "pm4-10"
jira_key: "pm4-10"
epic: "pm4"
workflow: "tdd"
---
# Story pm4-10: Game-over -> attract timeout (core+shell)

## Story Details
- **ID:** pm4-10
- **Jira Key:** pm4-10
- **Workflow:** tdd
- **Stack Parent:** pm4-5 (done)
- **Branch:** feat/pm4-10-game-over-attract-timeout
- **PR:** #243
- **Branch Strategy:** gitflow (feat/pm4-10-game-over-attract-timeout)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-11T14:48:06Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-11T13:46:02Z | 2026-08-11T13:48:42Z | 2m 40s |
| red | 2026-08-11T13:48:42Z | 2026-08-11T14:14:23Z | 25m 41s |
| green | 2026-08-11T14:14:23Z | 2026-08-11T14:33:04Z | 18m 41s |
| review | 2026-08-11T14:33:04Z | 2026-08-11T14:48:06Z | 15m 2s |
| finish | 2026-08-11T14:48:06Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[Conflict, non-blocking] The story's "cited cadence / ROM-cite it" is not
  achievable — the game-over→attract hold is an HONEST-UNCITED cadence.** Confirmed
  against the vendored `pacman.asm` at RED: the ROM master-state dispatch at `#4e00`
  (glossary §Cabinet state machine — `pacman.asm:0195` read, `:0984/:269a/:318c`
  writes) pins the DISPATCH MECHANISM, not a duration literal, and the glossary states
  outright that the phase edges "carry NO frame constants." No isolable ROM
  game-over-to-attract frame count exists — exactly the finding pm4-6 (`READY_HOLD_FRAMES`)
  and pm4-7 (`DYING_HOLD_FRAMES`/`LEVEL_CLEAR_HOLD_FRAMES`) already recorded. Per the SM
  handoff note and the "don't fabricate ROM citations" rule, **no ROM line was invented.**
  Dev owns the frame value (a shell-timing choice ~a few seconds, sibling posture);
  `citations.test.ts` gates it as green with no claim, just like its siblings. The RED
  suite therefore couples the cadence to the exported `GAME_OVER_HOLD_FRAMES` (imports it
  and proves the edge fires at exactly that many frames) instead of asserting a fabricated
  number — that is how "pin the timeout constant at RED" is satisfied honestly.

### Dev (implementation)
- No upstream findings during implementation. TEA's RED roadmap was complete and
  accurate; the full pac-man vitest project (380 tests) stayed green with zero collateral
  and `tsc` is clean, so no sibling re-seats, no exhaustiveness census growth, and no
  hidden coupling surfaced. The honest-uncited cadence Conflict TEA already filed above
  fully covers the one spec-vs-ROM tension.

### Reviewer (code review)
- **Gap** (non-blocking): the game-over name-entry screen has no timeout of its own, so a
  qualifying run with an open, unconfirmed initials screen holds the cabinet on GAME OVER forever
  if the player walks away — it never falls back to attract. This is the PINNED pm4-10 spec (AC2)
  and `NameEntryState`'s own doc flags "minus the timeout (this cabinet has no attract mode to fall
  back to yet)" — but attract now EXISTS, so a future story could add a name-entry timeout that
  reseeds attract. Affects `plugins/pac-man/src/core/game.ts` (the game-over branch / `NameEntryState`)
  — add a bounded name-entry idle timeout that routes to the same attract reseed. *Found by Reviewer
  during code review.*
- **Gap** (non-blocking): `docs/superpowers/specs/2026-08-09-pac-man-cabinet-lifecycle-design.md:134`
  labels the game-over → attract edge as story "pm4-7" rather than "pm4-10". Out of this diff's
  scope (the file predates and is untouched by pm4-10), so not a blast-radius miss introduced here.
  Affects that design doc (correct the story attribution). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- No deviations from spec. TEA's GREEN roadmap was followed exactly: exported
  `GAME_OVER_HOLD_FRAMES` (honest-uncited, sibling `*_HOLD_FRAMES` posture), added the
  `gameOverFrames` counter to `GameState` (init 0 in `createGameState`, reset on entry
  to `game-over` — mirrors `readyFrames`/`freezeFrames`), wired the `game-over` branch in
  `stepGame` to count only while the name-entry screen is null/confirmed and route through
  `advancePhase('game-over', { overExpired })` → `Object.assign(state, createGameState(...))`
  on expiry, and made `main.ts` drop both the sim-skip early-return and the manual
  Enter-to-restart. The frame value (180 ≈ 3 s @ 60 Hz) is the shell-timing choice the
  spec explicitly assigns to Dev, not a deviation.
  - **Trivial follow-on (not a spec deviation):** `main.ts`'s `let game` → `const game`.
    Removing the manual restart's `game = createGameState(...)` reassignment left the
    binding single-assignment (core reseeds now happen in-place via `Object.assign`), so
    `const` is the correct declaration. Behaviour-neutral.

### Reviewer (audit)
- **Dev: "No deviations from spec" (followed TEA's GREEN roadmap exactly)** → ✓ ACCEPTED by
  Reviewer: verified the implementation matches the roadmap point-for-point (exported constant,
  `gameOverFrames` counter init/reset, name-entry-gated count, `advancePhase`+`Object.assign`
  reseed, main.ts skip-removal + restart-removal). The 180-frame value is the shell-timing choice
  the spec explicitly assigns to Dev (honest-uncited sibling posture) — not a deviation.
- **Dev: `let game` → `const game` (behaviour-neutral follow-on)** → ✓ ACCEPTED by Reviewer:
  tsc passing is proof of single-assignment; core reseeds now mutate `game` in place via
  `Object.assign`, so `const` is correct. Sound.
- No UNDOCUMENTED deviations found. The one in-diff issue I raised (#17 comment contradiction) is
  a documentation-precision defect, not a spec deviation — fixed in review (9f68b4ff), not carried
  as a deviation.

Setup verified on disk: session file, branch `feat/pm4-10-game-over-attract-timeout`
(from `origin/develop`), and story context all present; `epic-pm4.yaml` marks pm4-10
`in_progress` with `started` + `branch` stamped. Dependency **pm4-5 is done** (the pure
unwired phase machine, incl. the `game-over -> attract` MAINLINE transition), so this
story only wires the timeout cadence into runtime and swaps out the manual
Enter-to-restart in `main.ts`. Merge gate clear (no open PRs, clean tree).

**For TEA (RED):**
- Scope is 2pt, core+shell. Core: a **cited** frame-count timeout that fires
  `game-over -> attract` after game-over (and after name-entry when the run qualified).
  Shell: `plugins/pac-man/src/shell/main.ts` currently gates restart on manual Enter —
  replace with the auto-return.
- **Pin the timeout constant at RED** and ROM-cite it. Every new constant is
  `citations.test.ts`-gated — do NOT invent a citation; derive it from `pacman.asm`
  (the pm4-5 dispatch cites :0195 / :0984 / :269a / :318c). If no authentic ROM
  game-over-to-attract delay exists, flag it as a Delivery Finding rather than fabricate.
- Sim is clock-free, seeded (mc6-1 contract); `purity.test.ts` must stay green.
- Watch the qualified-run path: name-entry must complete first before the timeout counts.

Handing off to TEA for the RED phase.

## Tea Assessment

**RED is in place and verified directly** (vitest + tsc — not the confabulation-prone
testing-runner). Commit `a5abcbc8`.

**Two new failing suites:**
- `tests/core/game-over-timeout.test.ts` (8 tests) — the core timeout, driven only
  through the public surface (`createGameState`/`stepGame`/`confirmNameEntry`):
  - **AC1** — a non-qualifying game-over returns to attract at **exactly**
    `GAME_OVER_HOLD_FRAMES`, with NO key (the timeout, not Enter, closes the loop).
  - **AC1b** — the sim is frozen for the whole hold (Pac/Blinky/dots/score static).
  - **AC2** — the name-entry gate: an open, unconfirmed initials screen **pauses** the
    timeout indefinitely (`3×` the constant, still game-over); after `confirmNameEntry`
    the full window runs **from confirmation** (proves pre-confirm frames don't bank).
  - **AC3** — the return reseeds a fresh board (score/lives/dots/level) while
    **preserving** the high-score table — the same reseed contract as pm4-6's start→ready.
  - **Liveness** — a real last-life death → game-over(initials open) → confirm → timeout
    → attract, all through the public API (the "feature must be observed in play" lesson).
- `tests/shell/main-game-over-restart.test.ts` (3 tests, `?raw` source scan, mechanical
  half) — `main.ts` must stop skipping the sim in game-over (so the hold can tick) and
  drop the manual Enter-to-restart. Observable half = the review Playwright playtest.

**RED evidence:** 9 red / 2 intentional green guards (the "still steps the sim" positive
and the "open initials never times out" gate — both stay green post-GREEN). `npm run lint`
reddens with a single `TS2305` on the missing `GAME_OVER_HOLD_FRAMES` export — the
type-extension RED, no collateral errors.

**Cadence posture:** honest-uncited — see the Delivery Finding above. The suite pins the
cadence *coupled to* the exported constant, not to a fabricated ROM number.

**For Dev (GREEN):**
- Export `GAME_OVER_HOLD_FRAMES` from `game.ts` (sibling `*_HOLD_FRAMES` convention;
  no `citations.test.ts` claim needed — it's honest-uncited like its siblings).
- Wire the `game-over` branch in `stepGame`: count frames only while
  `nameEntry === null || nameEntry.confirmed`, and on `>= GAME_OVER_HOLD_FRAMES` route
  through `advancePhase('game-over', { overExpired: true })` → attract, reseeding via the
  `Object.assign(state, createGameState(seed, highScoreTable))` idiom (see `startCabinet`
  / the attract self-exit reseed). Add the counter field to `GameState` + init it to 0 in
  `createGameState` (mirrors `readyFrames`/`freezeFrames`). Keep the sim frozen during the
  hold (no `stepPlayingSim`).
- `main.ts`: remove `if (game.phase === 'game-over') return` before `stepGame`, and delete
  the Enter-to-restart branch. Keep `confirmNameEntry`/`enterInitial` on the keydown path.
- `purity.test.ts` must stay green (frame count only — no clock/RNG).

**Rule Coverage** (`.pennyfarthing/gates/lang-review/typescript.md` + project rules):
- *Meaningful assertions / no vacuous tests:* every test asserts an observable phase
  transition or a concrete reset value; the two green guards are genuine invariants, not
  `assert(true)`. Self-checked — no `let _ =`, no always-null `is-none`.
- *Purity / clock-free (SOUL + purity.test.ts):* cadence pinned as a deterministic frame
  count through the public surface; no wall clock, owned by `purity.test.ts`.
- *#14 single-exit edge (the freeze-pauses precedent):* the name-entry gate is pinned at
  the one exit where both "counting" and "paused" are visible — the confirm-then-full-window
  test forces the gate to be evaluated once, correctly.
- *No fabricated ROM citation:* the honest-uncited posture is the rule here (Delivery
  Finding) — the suite couples to the constant instead of a quoted number.

Handing off to Dev for GREEN.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/pac-man/src/core/game.ts` — exported `GAME_OVER_HOLD_FRAMES = 180`
  (honest-uncited, sibling `*_HOLD_FRAMES` posture); added `gameOverFrames: number` to
  `GameState` (init 0 in `createGameState`, reset to 0 on entry to `game-over`); wired the
  `game-over` branch in `stepGame` — the sim stays frozen (no `stepPlayingSim`), the
  counter advances ONLY while the name-entry screen is null or confirmed (open initials
  pause the timeout), and on `>= GAME_OVER_HOLD_FRAMES` it routes through
  `advancePhase('game-over', { overExpired })` and `Object.assign`s a fresh attract board
  (keeping seed + high-score table).
- `plugins/pac-man/src/main.ts` — removed the `if (game.phase === 'game-over') return`
  sim-skip so the hold can tick; deleted the manual Enter-to-restart branch (the core
  timeout replaces it; a START/coin from attract begins the next game); kept
  `confirmNameEntry`/`enterInitial` on the keydown path; `let game` → `const game` (core
  reseeds now happen in-place).

**Tests:** 11/11 new (GREEN); full pac-man project 380/380 passing; `tsc --noEmit` clean.
Verified by running vitest + tsc directly (per the testing-runner confabulation caveat).

**Self-review (judgment checks):**
- Wired to front end — `main.ts` steps the sim every phase, so game-over ticks → times out
  → reseeds in place → the attract demo (drawn from the same `game` binding) resumes. ✓
- Follows project patterns — mirrors `readyFrames`/`freezeFrames` counters and the
  `startCabinet` / attract-self-exit reseed idiom. ✓
- ACs met — AC1 (exact-window timeout, no key), AC1b (frozen board), AC2 (name-entry
  pauses, full window from confirmation), AC3 (fresh reseed, table preserved), liveness
  (real death → confirm → timeout → attract) all green. ✓
- Error handling — none required; the pure sim has no failure modes to guard here. ✓

**Observable half:** the human/Playwright playtest (sit on a real game-over, watch it
return to the attract demo on its own with no key) is the review phase's job, per the
`main-game-over-restart.test.ts` header and the pm4-6 precedent — the mechanical `?raw`
scan + the core public-API liveness test cover Dev's obligations here.

**Branch:** feat/pm4-10-game-over-attract-timeout (to be pushed)

**Handoff:** To next phase (verify / review).

## Subagent Results

Enabled per `workflow.reviewer_subagents`: preflight, security, rule_checker (3 ON).
The other 6 are disabled via settings — pre-filled Skipped and hand-covered by me in the
Reviewer Assessment (tagged [EDGE]/[SILENT]/[TEST]/[DOC]/[TYPE]/[SIMPLE]).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — pac-man 380/380, tsc clean, orchestrator 463/0, tree clean, no smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered [EDGE] |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered [SILENT] |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered [TEST] |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered [DOC] (see rule-checker #17) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — hand-covered [TYPE] |
| 7 | reviewer-security | Yes | clean | none | N/A — purity holds, reseed preserves table by ref, save-once intact, seed param safe |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — hand-covered [SIMPLE] |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed 1 (#17 comment precision — FIXED in review), 25 rules compliant; 3 guards mutation-proven in a worktree |

**All received:** Yes (3 enabled returned; 6 disabled via settings, pre-filled)
**Total findings:** 1 confirmed (#17, fixed in review), 0 dismissed, 2 deferred as non-blocking Delivery Findings (name-entry has no attract fallback; an out-of-diff design-doc mislabels this edge as pm4-7)

### Rule Compliance (lang-review/typescript.md — my own enumeration, cross-checked with rule-checker)

- **#1 type-safety escapes** — COMPLIANT. `GAME_OVER_HOLD_FRAMES` plain number; `gameOverFrames: number`; `const game: GameState` explicit type; the game-over branch uses a real strict-null check (`state.nameEntry !== null && !state.nameEntry.confirmed`), no `as`/`!`/`@ts-ignore`. tsc passing is itself proof the `let`→`const` has no reassignment.
- **#2 generic/interface** — COMPLIANT. `gameOverFrames` is a concrete primitive; the `advancePhase('game-over', { overExpired })` literal satisfies the pre-existing readonly `PhaseSignals`.
- **#3 enum / exhaustiveness** — COMPLIANT / N/A. No new `GamePhase` or `GameEvent` variant; `phase.ts` untouched (git-confirmed), so no `never`-guard or census growth is owed.
- **#4 null/undefined** — COMPLIANT. Explicit `!== null` guard; test's `nameEntry?.confirmed` chains only into a sync `expect`.
- **#14 single-exit derived edge** — COMPLIANT. `advancePhase('game-over', …)` has exactly one call site; the `gameOverFrames = 0` reset (game.ts:799) sits on the sole `playing→game-over` producer path, mirroring the dying/level-clear `freezeFrames` reset.
- **#15 source-text guards are mutation-tested** — COMPLIANT. Both `.not.toMatch` shell guards reddened on reinstating the exact retired constructs; the cadence assertions couple to the imported constant (never a bare `180`) and redden on deleting the mechanism / the name-entry gate.
- **#17 contradictory same-diff comments** — was 1 VIOLATION at main.ts (frame-loop comment read "the sim now runs in EVERY phase," contradicting game.ts's "stays FROZEN (no stepPlayingSim)"). FIXED in review (commit 9f68b4ff) — reworded to distinguish "stepGame is CALLED every frame" from "stepPlayingSim moves entities." Re-verified green.
- **#18/#26 non-vacuous tests** — COMPLIANT. AC3 compares against an independently-computed `createGameState(SEED)` baseline (accepted reseed contract), not a hand-typed literal; every cadence term traces to production code / the imported constant, not test-local arithmetic.
- **#20 measured-from-same-diff artifact** — COMPLIANT. `GAME_OVER_HOLD_FRAMES = 180` is a CHOSEN honest-uncited design constant (sibling `*_HOLD_FRAMES` posture), correctly framed as a duration choice, not a measurement.
- **#24 retirement blast radius** — COMPLIANT within diff. The manual-restart branch is fully removed and every surviving reference calls it RETIRED. (Out-of-diff: a design-doc mislabels this edge as pm4-7 — deferred finding, predates this diff.)
- **#25 whole-file guard scope** — COMPLIANT. The `.not.toMatch` guards are the sanctioned negative "absence is absence" case; `toMatch(/stepGame\(/)` is a coarse seam-exists anchor with a single call site.
- Rules #6/#7/#9/#10/#11/#16/#19/#21/#23 — N/A (no JSX, async, config, external input, try/catch, aria, filtered populations, degenerate numeric input, or published mutant table in this diff).

### Devil's Advocate

Assume this is broken. **Malicious/confused input:** a player mashes Enter on a qualifying
game-over. The first Enter confirms + saves; every subsequent Enter finds `nameEntry.confirmed`
true, so the keydown name-entry branch's `!confirmed` guard is false and it falls through to —
nothing, because the manual-restart branch is gone. No double-save (save is guarded by the
`!== boardBefore` reference check AND the confirm guard), no double-confirm. A non-qualifying
game-over has `nameEntry === null`, so Enter is inert and the timeout owns the return. Good.
**Walk-away:** a qualifying game-over with an open, unconfirmed initials screen never times out —
`entryOpen` freezes the counter forever. Is that a soft-lock? It is the PINNED spec (AC2: "never
times out while the initials screen is open — even far past the hold"), and `NameEntryState`'s own
doc flags "minus the timeout." But it IS a real product gap now that attract exists: a player who
walks away mid-initials leaves the cabinet stuck on GAME OVER, never returning to the demo. Filed
as a non-blocking Delivery Finding for a future name-entry-timeout story — not a pm4-10 defect.
**Timing/refresh:** the hold is a deterministic 180 SIM frames via the fixed-timestep pump, not
wall-clock, so a slow display or a catch-up multi-substep frame still yields ~3 s of sim time and
the same frame count — no drift, no double-count. **Reseed integrity:** `Object.assign(state,
createGameState(seed, table))` carries the SAME table reference, so `main.ts`'s save-once check
sees no change and does not re-persist; the fresh board resets score/lives/dots/level while the
persisted ladder survives (AC3, security-confirmed). **Stressed storage:** `highScoreStorage.save`
on confirm could throw in private-mode/quota — but that path is pre-existing (unchanged by pm4-10),
not a regression here. **Empty table:** a score-0 or qualifying-on-empty game-over opens initials
and waits — defined behavior, no crash. Nothing here rises to a behavioral defect; the only real
forward risk (no name-entry timeout) is the recorded finding, and the only in-diff defect (the
#17 comment) is fixed.

## Reviewer Assessment

**Verdict:** APPROVED

pm4-10 wires the last unhooked edge of the pm4-5 phase machine — the game-over → attract timeout —
and retires the manual Enter-to-restart. Three enabled specialists (preflight, security,
rule-checker) plus my hand-coverage of the six disabled domains. The one confirmed finding (a
same-diff comment contradiction) was LOW and I fixed it in-review; everything else is clean.

**Findings by dispatch domain:**
- [PRE] Preflight GREEN — pac-man 380/380, `tsc --noEmit` clean, orchestrator 463/0, working tree clean (only the expected `sprint/epic-pm4.yaml` phase-transition churn), no console.log/debugger/.only/.skip/TODO.
- [RULE] rule-checker: 1 finding (#17, below) + 25 rules compliant. It mutation-tested all three guard mechanisms in a NAMED worktree (`rulecheck-wt`, removed) — each reddens on revert; the main checkout was never touched. CONFIRMED and fixed.
- [DOC] The #17 finding: main.ts's frame-loop comment "the sim now runs in EVERY phase" contradicted game.ts's "stays FROZEN (no stepPlayingSim)" from the same commit. FIXED (9f68b4ff) — reworded to separate "stepGame is called every frame" from "stepPlayingSim moves entities." Re-verified 11/11 + tsc clean. LOW, non-blocking, resolved.
- [SEC] Security clean — core purity holds (no clock/RNG/DOM/timer/localStorage; the `Object.assign` aliases no banned surface, and the purity sweep over every `src/core/*.ts` is green); the reseed preserves `highScoreTable` by reference (no leak/truncation); `insertHighScore` is immutable; the save-once reference check neither double-fires nor skips on the timeout reseed; the `?seed=` URL param is `Number.parseInt`+`isFinite`-gated, no injection surface. No backend/auth/tenant surface exists.
- [EDGE] Boundary conditions verified: the `>= GAME_OVER_HOLD_FRAMES` fires on exactly the 180th frame (AC1 pins one-short-holds, on-frame-flips; mutating `>=`→`>` or the increment reddens AC1/idle). The `entryOpen` gate freezes the counter iff an unconfirmed entry is open, and counts from confirmation (AC2 pins both directions). Reseed lands in attract, not ready/playing (AC3).
- [TYPE] `const game` is proven single-assignment by tsc; `gameOverFrames: number` and the constant are plainly typed; the null check is real, not an assertion. No stringly-typed or unsafe-cast surface added.
- [TEST] Tests are non-vacuous and mutation-proven (rule #15/#18/#26): cadence couples to the imported constant; AC3 uses an independently-computed baseline; the two intentional green guards ("still steps the sim," "open initials never time out") are genuine invariants, not `assert(true)`.
- [SILENT] No swallowed errors introduced — the game-over branch has no try/catch or silent fallback; the pre-existing audio/save try/catches are untouched.
- [SIMPLE] The `gameOverFrames = 0` reset on game-over entry (game.ts:799) is defensive — the invariant already guarantees 0 there, so reverting it reddens no test (an equivalent-ish mutant). It is NOT over-engineering: it sits on the sole entry path and mirrors the established dying/level-clear `freezeFrames` reset, guarding future refactors. Kept deliberately; do not remove.

**Data flow traced:** last-life death (`stepPlayingSim` collision) → `advancePhase('playing', {pacDied, livesRemaining:0})` → `game-over` (reset counter, open initials if qualifying) → keydown `confirmNameEntry` + `highScoreStorage.save` → `stepGame` game-over branch counts 180 frames → `advancePhase('game-over', {overExpired})` → `attract` → `Object.assign(state, createGameState(seed, table))` reseeds in place → `main.ts` renders the reseeded attract demo from the same `game` binding. Safe: pure frame count, table preserved by reference, no wall-clock, no save on the no-op reseed.

**Pattern observed:** mirrors the sibling freeze counters (`readyFrames`/`freezeFrames`) and the `startCabinet` / attract-self-exit `Object.assign` reseed idiom — consistent with the codebase, no new abstraction.

**Observable half deferred (non-blocking):** the human/Playwright playtest (sit on a real
game-over, watch it return to the attract demo unaided) is the authoritative observable check per
the `main-game-over-restart.test.ts` header; the `?raw` source scan + the core public-API liveness
test cover it mechanically here. Recommended for the finish/playtest step but not a review blocker.

**Handoff:** To SM for finish-story.