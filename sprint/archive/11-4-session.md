---
story_id: "11-4"
jira_key: ""
epic: "11"
workflow: "tdd"
---
# Story 11-4: Dev phase-jump keys to reach the surface/trench scenes for verification

## Story Details
- **ID:** 11-4
- **Jira Key:** (not configured)
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch Strategy:** gitflow (chore/11-4-dev-phase-jump)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-30T00:32:36Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-29T23:54:00Z | 2026-06-29T23:56:56Z | 2m 56s |
| red | 2026-06-29T23:56:56Z | 2026-06-30T00:06:31Z | 9m 35s |
| green | 2026-06-30T00:06:31Z | 2026-06-30T00:20:21Z | 13m 50s |
| review | 2026-06-30T00:20:21Z | 2026-06-30T00:32:36Z | 12m 15s |
| finish | 2026-06-30T00:32:36Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

No upstream findings

### TEA (test design)
- **Improvement** (non-blocking): This dev phase-jump is itself the remedy for the verification gap that let the triangle/sliver render bug pass review in 11-1/11-2 — surface/trench were unreachable for eyeballing. Affects `star-wars/src/shell/` (the dev key binding) and the 11-5/11-6 ACs, which now gain a reachable in-scene view. *Found by TEA during test design.*
- **Gap** (non-blocking): `enterPhase` is currently a private function in `src/core/sim.ts`; the dev jump and the new tests need it exported. Affects `star-wars/src/core/sim.ts` (add `export` to `enterPhase`). *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): Eyeballing star-wars on `:5274` can hit the WRONG checkout — the pinned port is owned by whichever `just serve` bound it first (during this story it was the **a-3** checkout, not a-2 where the work lives). Confirm the serving checkout (`lsof -nP -iTCP:5274 -sTCP:LISTEN -t` → its `cwd`) before eyeballing, or serve the target checkout on a free port. Affects the dev-server eyeball step for 11-5/11-6 (and the 11-3 overlay). *Found by Dev during implementation.*
- No code-level upstream findings during implementation.

### Reviewer (code review)
- **Question** (non-blocking): `enterPhase` carries in-flight player `projectiles` across a phase transition (it is NOT in the override list). This is PRE-EXISTING behavior — normal progression already does it; 11-4 only adds `export`. Should a transition clear player bolts? Affects `star-wars/src/core/sim.ts` (`enterPhase`). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): Two phase-jump tests assert tautologically — the RNG-seed check compares the same `rng` reference to itself, and the determinism check compares two pristine-seed states (RNG never advanced), so both pass even if the property regressed. The properties they intend to check ARE true today (verified independently), so non-blocking. Affects `star-wars/tests/core/phase-jump.test.ts` (capture `seedBefore` as a number; advance the RNG before the determinism compare). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): A dev jump from the game-over screen sets `mode:'playing'` but `enterPhase` spreads `gameOver:true`/`lives:0` through, so `stepGame`'s `if (mode==='gameover' || state.gameOver)` branch freezes the sim under a playing HUD. The scene still renders (fine for eyeballing static geometry) and the normal `start → jump` path is unaffected, so non-blocking — but the dev jump could also reset `gameOver:false` for a clean playable scene. Affects `star-wars/src/main.ts` (dev-jump block). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Tested the existing `enterPhase` as the exported dev-jump unit (no new wrapper)**
  - Spec source: context-story-11-4.md, AC#1 / AC#3
  - Spec text: "reusing the existing enterPhase transition so phase state stays consistent" and "Any core helper added (e.g. a phase-set used by the jump) is pure and unit-tested"
  - Implementation: Tests import `enterPhase` directly from `src/core/sim.ts` (today private) and exercise it as the pure dev-jump unit, rather than asserting a brand-new `jumpToPhase` wrapper.
  - Rationale: The story names `enterPhase` explicitly; exporting/reusing it is the minimal change and avoids a redundant wrapper. The shell binds the keys and calls it directly (eyeballed), so `stepGame` stays untouched.
  - Severity: minor
  - Forward impact: Dev must add `export` to `enterPhase`; 11-5/11-6 reuse the same export for their dev-reachable verification.
- **Shell key binding is not unit-tested (eyeballed per AC#3)**
  - Spec source: context-story-11-4.md, AC#3
  - Spec text: "the binding itself is eyeballed in dev (:5274)"
  - Implementation: No jsdom/keydown test for the dev-key → jump wiring; coverage stops at the pure `enterPhase` unit plus a guard that `stepGame`'s Input contract gains no required field.
  - Rationale: The binding is `window`/DOM shell glue the AC assigns to eyeballing; the project has no shell input-event test harness (no `tests/shell/input.test.ts`).
  - Severity: minor
  - Forward impact: Reviewer/Dev must eyeball the jump keys in dev (:5274) before sign-off.

### Dev (implementation)
- **Eyeballed on :5285, not the AC's literal :5274**
  - Spec source: context-story-11-4.md, AC#3
  - Spec text: "the binding itself is eyeballed in dev (:5274)"
  - Implementation: Verified on a temporary a-2 star-wars dev server on `:5285`; `:5274` was held by the a-3 checkout, so eyeballing it would have tested the wrong (pre-11-4) code.
  - Rationale: AC#3's intent is to eyeball THIS checkout's binding; the port number is incidental to which build is under test. Console confirmed `[dev] phase-jump → surface` and the surface phase rendered.
  - Severity: trivial
  - Forward impact: none — once a-2 owns :5274, the keys behave identically there.
- **Shell jump forces `mode:'playing'` (beyond the pure `enterPhase`)**
  - Spec source: context-story-11-4.md, AC#1
  - Spec text: "jump the active run to the surface phase and the trench phase (and back to space)"
  - Implementation: `main.ts` sets `state = { ...enterPhase(state, target), mode: 'playing' }` so a jump from the attract/game-over screen drops straight into the playing scene, not just a phase swap under a framing overlay.
  - Rationale: The tool's purpose is to SEE the scene; without forcing `playing`, a jump from attract would change `phase` but keep rendering the attract screen. This is shell-only — it never touches the pure `enterPhase` or its tests.
  - Severity: minor
  - Forward impact: none — purely a shell convenience for the dev verification flow.

### Reviewer (audit)
- **TEA — "Tested the existing `enterPhase` as the exported dev-jump unit (no new wrapper)"** → ✓ ACCEPTED: spec-aligned and minimal; the story names `enterPhase` explicitly, and rule-checker confirms exporting it keeps core pure (0 boundary violations).
- **TEA — "Shell key binding is not unit-tested (eyeballed per AC#3)"** → ✓ ACCEPTED: AC#3 explicitly assigns the binding to eyeballing; the project has no shell input-event harness, and the binding was eyeballed in dev (console-confirmed).
- **Dev — "Eyeballed on :5285, not the AC's literal :5274"** → ✓ ACCEPTED: AC#3's intent is to eyeball THIS checkout's binding; :5274 was held by the a-3 checkout, so :5285 tested the correct a-2 code. Console (`[dev] phase-jump → surface`) + screenshot confirm.
- **Dev — "Shell jump forces `mode:'playing'` (beyond the pure `enterPhase`)"** → ✓ ACCEPTED: a sound shell-only convenience that never touches core or the tests. NOTE (non-blocking): it does not also reset `gameOver`, so a jump from the game-over screen freezes the sim under a playing HUD — logged as a Reviewer delivery finding (improvement, not a deviation).
- **Undocumented deviations found by Reviewer:** none. The `projectiles` carry-over is PRE-EXISTING `enterPhase` behavior (unchanged by this story), not a spec deviation introduced here.

## Sm Assessment

**Story:** Dev-only phase-jump keys so a run can jump straight to the `surface` and `trench` phases (and back to `space`) without first clearing 6 TIE kills + 4 turret kills. This exists to make the next two stories verifiable: 11-5 (procedural surface grid) and 11-6 (walled trench channel) carry "eyeball in the dev server" ACs, and those phases are currently unreachable in casual play — the exact gap that let the triangle/sliver render bug ship through approved stories 11-1 and 11-2 (see `star-wars/docs/adr/0002-scene-geometry-surface-and-trench.md`, "Why it slipped through review").

**Acceptance criteria** (from `sprint/epic-11.yaml`, story 11-4):
1. Dev-only keys jump the active run to the surface phase and the trench phase (and back to space), reusing the existing `enterPhase` transition so phase state stays consistent.
2. The jump is gated to dev/debug and never fires in a normal run; it does not alter determinism or the `stepGame(state, input, dt)` contract.
3. Any core helper added (e.g. a phase-set used by the jump) is pure and unit-tested; the binding itself is eyeballed in dev (:5274).
4. Build clean, tests green, no new runtime deps, core/shell boundary intact.

**Technical landscape for the next agent (TEA):**
- `src/core/sim.ts` — `enterPhase(s, phase)` performs a phase transition (resets altitude/turrets/port/timers per phase); `PHASE_ORDER`/progression drives `space → surface → trench`. The jump should reuse `enterPhase` so phase state stays consistent rather than hand-mutating `state.phase`.
- `src/core/state.ts` — `Phase = 'space' | 'surface' | 'trench'`, `GameState`. A pure phase-set helper (the testable unit) likely belongs here or in `sim.ts`.
- `src/shell/input.ts` + `src/shell/loop.ts` — where keyboard input is read and fed to the sim each frame; the dev key binding lives in the shell, gated to dev/debug (e.g. `import.meta.env.DEV` or a debug flag), and must NOT enter the pure core or affect a normal run.

**Boundary watch:** the pure core stays deterministic — the dev jump must not introduce DOM/time/random into core, and must not change `stepGame` output for the same `(state, input, dt)` in a normal run. The unit-testable piece is the pure phase-set/`enterPhase` path; the key binding is shell-only and eyeballed.

**Setup state:** branch `chore/11-4-dev-phase-jump` (gitflow, base `develop`) active in `star-wars`; story context at `sprint/context/context-story-11-4.md`; ADR 0002 rides along on this branch (untracked design doc to be committed with the work). Merge gate clear — no blocking open PRs.

**Decision:** Setup complete and clean. Hand off to TEA (The Jesus) for the RED phase — write failing tests for the pure phase-set/jump path per AC#1–#3 before any implementation.

## TEA Assessment

**Tests Required:** Yes
**Reason:** —

**Test Files:**
- `tests/core/phase-jump.test.ts` — the dev phase-jump contract: a 3×3 from→to transition matrix, the skip-ahead (`space→trench`) and backward (`trench→space`) jumps progression can't make, run-state preservation, purity, determinism, and a `stepGame`-contract guard.

**Tests Written:** 17 tests covering AC#1–#3 (16 RED + 1 passing contract guard)
**Status:** RED — 16 failing with `TypeError: enterPhase is not a function` (export missing from `src/core/sim.ts`); the other 402 tests in the star-wars suite pass (no collateral breakage). Cache: `.session/test-runs/11-4-tea-red.md`.

### Rule Coverage

| Rule (typescript.md) | Test(s) | Status |
|------|---------|--------|
| #4 null/undefined (port presence per phase) | matrix asserts `exhaustPort` null vs set per target phase; `trench→space` clears the port | failing |
| #5 module/declaration (type-only imports) | file uses `import type` for `Phase`/`Enemy`/`GameState`/`Vec3`/`Input` | passing (lint-level) |
| #8 test quality (meaningful assertions, no `as any`) | every test asserts a concrete value; the purity test guards `enemiesBefore > 0` | self-checked |
| determinism / core purity (CLAUDE.md boundary) | `is DETERMINISTIC`, `is PURE`, RNG-seed-preserved | failing |
| stepGame contract intact (AC#2) | `no new required Input field` guard | passing (guard) |

**Rules checked:** TypeScript checks #1/#6/#7/#10/#11/#12 are N/A (a pure deterministic phase-set — no I/O, async, JSX, or user input). #4, #5, #8 covered above.
**Self-check:** 0 vacuous tests (no `let _ =`, no `assert(true)`, no always-None assertions).

**Handoff:** To Dev (Walter) — GREEN: (1) add `export` to `enterPhase` in `src/core/sim.ts`; (2) bind the dev jump keys in the shell (`src/shell/input.ts`/`main.ts`), gated to dev (e.g. `import.meta.env.DEV`), calling `enterPhase(state, target)` directly so `stepGame`'s `(state, input, dt)` contract is untouched and a normal run never jumps. Then eyeball the keys in dev (:5274).

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `star-wars/src/core/sim.ts` — exported `enterPhase` (the pure phase-set the dev jump reuses) + a doc note explaining why it is now exported.
- `star-wars/src/main.ts` — dev-gated (`import.meta.env.DEV`) `window` keydown binding: keys **7/8/9** (top row or numpad) → `enterPhase(state, 'space'/'surface'/'trench')`, forcing `mode:'playing'`; calls `enterPhase` directly (NOT through `stepGame`), with a DEV-guarded `console.log` confirmation.

**Tests:** 418/418 passing (GREEN) — incl. all 17 phase-jump tests; no collateral breakage. Cache: `.session/test-runs/11-4-dev-green.md`.
**Build:** `tsc --noEmit && vite build` clean; the dev block tree-shakes out of the production bundle (`import.meta.env.DEV` statically false), so the keys do not exist in a real cabinet.
**Eyeballed (AC#3):** On a temp a-2 dev server (:5285), pressing **8** logged `[dev] phase-jump → surface` and rendered the surface phase. (`:5274` was held by the a-3 checkout — see deviation + finding.)
**Branch:** `chore/11-4-dev-phase-jump` (pushed).

**AC coverage:**
- **AC#1** (jump to surface/trench/space via `enterPhase`): ✓ exported + bound; the unit matrix covers all 9 from→to transitions incl. skip-ahead and backward.
- **AC#2** (dev-gated, never in a normal run, `stepGame` contract intact): ✓ `import.meta.env.DEV` guard; jump bypasses `stepGame` (contract untouched); the "no new required Input field" guard test is green.
- **AC#3** (pure helper unit-tested; binding eyeballed): ✓ `enterPhase` unit-tested (16 tests); binding eyeballed in dev.
- **AC#4** (build clean, tests green, no new deps, boundary intact): ✓ — no new dependencies; the pure core gained only an `export`.

**Handoff:** To the next phase (verify / review).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean (success) | 0 actionable | confirmed 0, dismissed 0, deferred 1 (design Q on `mode:'playing'` placement) |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 6 | confirmed 6 (all Medium/Low, non-blocking), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none (14 rules, 37 instances, 0 violations) | N/A |

**All received:** Yes (4 enabled returned, 5 disabled via `workflow.reviewer_subagents`)
**Total findings:** 6 confirmed (all Medium/Low, non-blocking), 0 dismissed, 1 deferred

## Reviewer Assessment

**Verdict:** APPROVED

**Summary:** A minimal, boundary-respecting dev tool. The pure core gains only an `export`; the dev binding is shell-only, `import.meta.env.DEV`-gated (tree-shaken from production), and bypasses `stepGame` so the deterministic step contract is untouched. Security clean, exhaustive rule-check clean, build clean, 418/418 tests green. The only findings are test-robustness (Medium/Low) plus one game-over-jump edge — none blocking; all documented for a quick follow-up.

**Data flow traced:** `KeyboardEvent.code` → `DEV_JUMP[e.code]` (fixed 6-entry `Record<string, Phase>`) → `if (!target) return` guard → `enterPhase(state, target)` with `target ∈ {'space','surface','trench'}` → module `state` reassigned. No user-controlled string reaches any sink; `console.log` interpolates the fixed Phase literal, not `e.code`. Safe ([SEC] confirmed).

### Rule Compliance

Per [RULE] (reviewer-rule-checker, 14 rules / 37 instances, 0 violations) and my own enumeration:
- **Core/shell boundary (CLAUDE.md — hardest rule):** `enterPhase` (sim.ts:490) gains only `export`; body unchanged, calls pure `spawnPort()`, no DOM/`window`/`Date`/`Math.random`/`requestAnimationFrame`, no shell import. The keydown binding lives in `main.ts` (shell), importing core (correct direction). Core imports zero shell. COMPLIANT.
- **#1 type-safety escapes:** no `as any`/`@ts-ignore`/`!`. The `as Enemy` fixture cast (test:41) is a specific cast, not `as any` — compliant by rule letter.
- **#2 generics:** `Record<string, Phase>` uses a specific union value, not `any`; `DEV_JUMP` is a local const (the `readonly`-on-params rule doesn't apply). COMPLIANT.
- **#4 null/undefined:** `DEV_JUMP[e.code]` guarded by `if (!target) return`; all `Phase` values truthy, so the guard catches only `undefined`. No `||`-where-`??` misuse. COMPLIANT.
- **#5 module/declaration:** value vs `type` imports correctly split (`type GameState/Phase/Enemy/Vec3/Input` vs value `enterPhase/stepGame/initialState/NO_INPUT`); `bundler` resolution → no `.js` suffix needed. COMPLIANT.
- **#8 test quality:** concrete assertions throughout (no `.toBeTruthy()` proxies, no `as any`); two tautological assertions flagged below as Medium/Low (non-blocking).

### Observations

1. `[VERIFIED]` Core purity preserved — `enterPhase` export is the only core change; src/core/sim.ts:490 body unchanged, no DOM/time/random. Complies with the CLAUDE.md boundary ([RULE] rule 14, 0 violations).
2. `[VERIFIED]` Dev binding shell-only + dev-gated — src/main.ts:69-84 inside `if (import.meta.env.DEV)`, calls `enterPhase` directly (bypasses `stepGame`); Vite eliminates the branch in prod ([SEC] confirmed). `stepGame(state,input,dt)` contract untouched (guard test green).
3. `[VERIFIED]` Null handling correct — `DEV_JUMP[e.code]` + `if (!target) return` (src/main.ts:79); rule #4 compliant.
4. `[MEDIUM][TEST]` RNG-seed assertion is tautological (tests:112) — `s.rng.seed === start.rng.seed` compares the same object reference; passes even if RNG were consumed. Code is correct (no RNG consumed — verified), so non-blocking; harden by capturing `seedBefore` as a number.
5. `[LOW][TEST]` Determinism test (tests:125) compares two pristine seed-1983 states (RNG never advanced) — can't expose RNG-dependent non-determinism. Non-blocking; harden by advancing RNG before the compare.
6. `[LOW][TEST]` Matrix omits an `altitude` assertion for the `→surface` transitions, and the "no leftover ordnance" comment doesn't cover player `projectiles` (which `enterPhase` carries over — pre-existing, out of scope).
7. `[LOW]` Game-over-jump edge — forcing `mode:'playing'` without resetting `gameOver` freezes the sim under a playing HUD when jumping from the game-over screen (scene still renders; normal `start→jump` unaffected). Logged as an improvement.
8. `[VERIFIED][TEST]` Tests are substantive — 16 `enterPhase` cases (3×3 matrix + skip-ahead/backward/purity) + 1 contract guard, all with concrete assertions ([TEST] confirms no `as any`, no vacuous proxies).

**Disabled-subagent domains (covered by Reviewer):**
- `[EDGE]` (disabled) — I enumerated the diff's branches myself: the only conditionals are `if (!target) return` (unmatched key) and `enterPhase`'s phase ternaries; all reachable paths are covered, the game-over-jump edge noted (obs. 7).
- `[SILENT]` (disabled) — no error handling, try/catch, or swallowed errors in the diff; nothing to swallow.
- `[DOC]` (disabled) — comments are accurate and substantial (the dev-block rationale, the `enterPhase` export note, ADR 0002); lone nit is the imprecise "no leftover ordnance" test comment (obs. 6).
- `[TYPE]` (disabled) — type concerns covered under Rule Compliance (#1/#2/#5); all compliant.
- `[SIMPLE]` (disabled) — the dev block is minimal (fixed map + guarded handler); no over-engineering. Preflight's "move `mode:'playing'` to a dedicated dev util" is a future-nicety, not now.

### Devil's Advocate

Assume this code is broken. The most dangerous claim is "gated to dev, never fires in a normal run." A confused player in a *dev* session who fumbles the number row will teleport their run to another phase mid-fight — jarring, but intended for dev and impossible in a production cabinet (the block is statically eliminated; I confirmed the prod bundle drops it). What about a malicious page? The listener only reads `e.code` against a frozen six-key map and never reflects it anywhere, so there is no injection or DOM-write surface — the worst an attacker achieves is a phase change in their own dev tab. The subtler breakage is state coherence: the jump forces `mode:'playing'` but spreads the rest of `GameState` untouched, so jumping out of a *game-over* state yields `mode:'playing'` alongside `gameOver:true` and `lives:0`. `stepGame` short-circuits on `state.gameOver`, freezing the simulation under a "playing" HUD — the scene still paints (acceptable for eyeballing static geometry), but it is an inconsistent state the tool offers no escape from except pressing start. A second confusion: `enterPhase` does not clear in-flight player `projectiles`, so a jump mid-salvo drops live bolts into the new scene; they TTL-expire in ~2s and this is pre-existing progression behavior, but a tester eyeballing the surface could briefly see stray cyan lasers and mistake them for scene geometry. Stressed inputs? Holding the key auto-repeats `keydown`, re-jumping every repeat — harmless (idempotent re-entry to the same phase). Numpad vs top-row both map, so no layout gotcha. None of these rise to Critical/High: the production surface is empty, the core stays pure, and the only real-world bite is the game-over freeze, which I've logged as a non-blocking improvement. Nothing here changes the verdict, but the game-over edge is worth a one-line polish in a follow-up.

**Pattern observed:** Pure-function-from-impure-shell — the shell calls the deterministic core helper directly and owns all IO (src/main.ts:81). Correct and idiomatic for this codebase.
**Error handling:** No failure paths in the diff; the single guard (`if (!target) return`) correctly no-ops on unmatched keys.

**Handoff:** To SM (The Dude) for finish-story. Non-blocking test-hardening + the game-over-jump polish are captured as Delivery Findings for a fast-follow.