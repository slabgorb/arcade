---
story_id: "SH-5"
jira_key: ""
epic: ""
workflow: "tdd"
---
# Story SH-5: Extract the fixed-timestep game-loop accumulator into @arcade/shared/loop (carrying asteroids' last===0 fix)

## Story Details
- **ID:** SH-5
- **Jira Key:** (none — Jira not integrated)
- **Workflow:** tdd
- **Stack Parent:** none (independent extraction story)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-08T13:32:08Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-07T23:11:07Z | 2026-07-07T23:13:06Z | 1m 59s |
| red | 2026-07-07T23:13:06Z | 2026-07-07T23:24:15Z | 11m 9s |
| green | 2026-07-07T23:24:15Z | 2026-07-08T13:22:37Z | 13h 58m |
| review | 2026-07-08T13:22:37Z | 2026-07-08T13:32:08Z | 9m 31s |
| finish | 2026-07-08T13:32:08Z | - | - |

## Acceptance Criteria
- @arcade/shared/loop exports the fixed-timestep accumulator with asteroids' started-boolean fix (no last===0 ambiguity).
- star-wars and asteroids consume it at a pinned ref; battlezone's inlined loop is replaced by it.
- tempest's richer wrapper composes over the shared primitive rather than duplicating the accumulator.

## Implementation Notes (Inherited from SH-2 Pattern)

### Git & Dependency Management
- **Dev inner-loop ref:** `github:slabgorb/arcade-shared#feat/SH-5-extract-loop-accumulator`
- **Consumers pin:** `@arcade/shared` at the branch ref; committed package-lock.json resolves the branch ref to a fixed commit.
- **Release obligation (BLOCKING):** At release, merge arcade-shared → cut version tag on main → bump every consumer from `#feat/...` ref to `#vX.Y.Z` tag → re-verify suites → delete feature branch.
- Log this release obligation as a Delivery Finding at the end of the story.

### Type Safety (arcade-shared constraint)
- arcade-shared has NO root tsconfig/vitest config: build compiles only src/, vitest strips types.
- Test files get ZERO compile-time typechecking.
- Pin type contracts at runtime or via source-text regex, never compile-only annotations.
- Env is node (fake localStorage on globalThis if needed).

## Quarry Pointers for TEA
- **Corrected primitive source:** asteroids' createLoop — recover its `started`-boolean fix (replaces the ambiguous `last === 0` sentinel that star-wars still carries unfixed).
- **Current landscape:**
  - star-wars + asteroids: near-identical createLoop accumulator today.
  - battlezone: loop inlined in main.ts.
  - tempest: richer event-draining wrapper that must compose OVER the shared primitive, not duplicate it.

## Sm Assessment

**Routing:** New-work setup for SH-5, the 5th `@arcade/shared` extraction in the SH epic. Phased `tdd` workflow → hand off to TEA (O'Brien) for RED.

**Scope shape (routing-relevant, not implementation planning):** The `repos` field is `arcade-shared` (the primitive's home), but the ACs make this a *multi-repo* extraction — the new `/loop` export lands in arcade-shared, then star-wars + asteroids + battlezone + tempest all rewire as consumers. TEA/Dev should expect cross-repo churn under one story, exactly like SH-2 (math3d) and SH-4/SH-6.

**Inherited constraints carried into context (from SH-2, the pattern-setter):**
- Dev inner-loop pins consumers at `#feat/SH-5-extract-loop-accumulator`; the arcade-shared feature branch must be **pushed before** any game can resolve the git-URL dep. Committed `package-lock.json` freezes the branch ref to a commit.
- **Blocking-at-release obligation:** merge arcade-shared → tag on main → bump every consumer pin to the tag → re-verify → then delete the feature branch. Must be logged as a Delivery Finding before finish.
- arcade-shared test files get **zero compile-time typechecking** — assert type contracts at runtime / via source-text, never compile-only.

**The bug being carried:** asteroids' `started`-boolean fix supersedes the `last === 0` sentinel that star-wars still carries. That divergence *is* the story — the shared primitive must be the corrected one. TEA: recover the asteroids implementation as the reference, and write a test that would FAIL against the old `last === 0` form.

**Merge gate:** clear — no blocking open PRs, working tree clean.

**Handoff:** → TEA for RED phase. No code touched by SM.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** New shared primitive (`@arcade/shared/loop`) — the fixed-timestep accumulator is pure, deterministic logic and is exactly the kind of code TDD should pin. The star-wars `last === 0` bug was never caught precisely because game loops live in shell/IO and were never unit-tested; the extraction to a tested shared module is where that coverage finally lands.

**Test Files:**
- `arcade-shared/tests/loop.test.ts` — 12 tests, behavioural spec of `createLoop(step, render, hz)`.

**Tests Written:** 12 tests covering **AC-1 in full**. AC-2/AC-3 are integration/refactor ACs verified outside this repo — see Design Deviations.
**Status:** RED confirmed (exit 1). `loop.test.ts` fails on import resolution (`../src/loop` does not exist — house-style RED, same as `rng.test.ts`); the four pre-existing suites (highscore, math3d, math3d.camera-mvp, rng — 94 tests) all still pass.

**What the suite pins (all hand-verified against asteroids' corrected impl):**
- Shape/scheduling: `Loop{start,stop}`; `start()` schedules a frame but never steps synchronously; `stop()` calls `cancelAnimationFrame` with the frame id.
- Accumulator: first frame is a baseline (0 sub-steps); `step` always receives a constant `dt = 1/hz`; runs `floor(elapsed/dt)` sub-steps and carries the remainder out as render `alpha` (90ms → 5 steps, α≈0.4); sub-dt frames accumulate rather than drop (5ms then +15ms → one step); a 5s stall clamps to 0.25s → 15 steps not ~300; custom `hz=30` scales dt + cadence.
- **The fix (headline):** a `t=0` baseline followed by a `t=1000` frame runs **15** sub-steps with the `started` flag but **0** with the old `last===0` sentinel (the second frame is mistaken for "first frame" again and the whole second is swallowed). A companion test (t=0 → +20ms → 1 step vs 0) reinforces it. Both tests **fail against the buggy form and pass only against the corrected one** — the extraction cannot silently regress to the sentinel.

**Test harness note:** node env (no `requestAnimationFrame` global), so the suite `vi.stubGlobal`s rAF to CAPTURE the frame callback and drives it with chosen timestamps — fully deterministic, no DOM, no `as any`.

### Rule Coverage

Applicable checks from `.pennyfarthing/gates/lang-review/typescript.md` (a synchronous timing primitive + its test — most rules target React/async/enum/security-input surfaces that do not apply here):

| Rule | Test / Evidence | Status |
|------|-----------------|--------|
| #1 type-safety escapes | No `as any` / `@ts-ignore` / non-null assertions in the suite | clean |
| #4 null/undefined (default param `hz=60`) | `honours a custom hz…` + default-hz tests exercise both branches | failing (RED) |
| #8 test quality — import from `src/` not `dist/` | `import { createLoop } from '../src/loop'` | failing (RED) |
| #8 test quality — meaningful, non-vacuous assertions | Every `it` asserts a concrete count/shape/alpha (toBe/toEqual/toBeCloseTo/toContain) | clean |

**Rules checked:** 4 of 13 lang-review rules are applicable to this module; the rest (React/JSX, async/Promise, enum, input-validation, error-handling, bundle) are N/A for a pure timing loop.
**Self-check:** 0 vacuous tests found (no `let _ =`, no `assert(true)`, no `is-none`-on-always-none; every assertion could fail if the behaviour were wrong).

**Handoff:** To Dev (Julia) for GREEN — implement `arcade-shared/src/loop.ts` + the `./loop` subpath export, then the cross-repo consumer wiring. **Read the Delivery Findings first** — two design questions (tempest composition surface, battlezone variable-dt→fixed-timestep) should be resolved before wiring those two consumers.

## Dev Assessment

**Implementation Complete:** Yes
**Comrade decisions honoured:** battlezone → *Adopt fixed-timestep*; tempest → *Architect decides* (Emmanuel Goldstein designed a pure `advanceFixedSteps` composition kernel).

**Files Changed:**
- `arcade-shared/src/loop.ts` — added pure, clock/rAF-free `advanceFixedSteps(acc, elapsed, dt, step, maxFrame=0.25)`; `createLoop`'s else branch delegates to it (one accumulator in the module, unified 0.25 clamp). Committed `a91c7c9`, pushed.
- `arcade-shared/tests/loop.test.ts` — +7 RED→GREEN tests pinning the kernel; the 11 `createLoop` tests are the refactor's regression guard (unchanged, still green).
- `asteroids/src/main.ts` imports `@arcade/shared/loop`; deleted `src/shell/loop.ts` + `tests/loop.test.ts`; added `tests/loop-extraction.test.ts`; pin bump.
- `star-wars/src/main.ts` same swap (**also fixes** its live `last===0` swallow); deleted `src/shell/loop.ts`; added guard; pin bump. Re-homed onto current develop (sw2 work present).
- `battlezone/src/main.ts` inlined variable-dt loop → shared `createLoop` (split into `stepFrame`/`renderFrame`; cosmetic radar sweep now reads `performance.now()`); added guard; updated `arcade-shared-pipe`/`highscore-extraction` guards for the pin bump; pin bump.
- `tempest/src/shell/loop.ts` wrapper now composes over `advanceFixedSteps` (kept injected clock, per-sub-step event drain, first-sub-step input, mode transitions, guards, `getState`); removed local `MAX_FRAME`; added guard; pin bump.

**Tests (build + unit, per repo — all GREEN):**
- arcade-shared: 112 · asteroids: 786 · star-wars: 543 · battlezone: 740 · tempest: 767. Every `vite build` (tsc --noEmit + bundle) clean.

**Branches (pushed):** arcade-shared `feat/SH-5-extract-loop-accumulator`; asteroids/star-wars/battlezone/tempest `feat/SH-5-adopt-shared-loop`.

**AC status:**
- AC-1 ✅ shared kernel exports the accumulator with the started-boolean fix (112 green, incl. the two regression tests that fail on `last===0`).
- AC-2 ✅ asteroids + star-wars consume it; battlezone's inlined loop replaced by it (fixed-timestep adopted per Comrade).
- AC-3 ✅ tempest composes over the shared `advanceFixedSteps` kernel rather than duplicating the accumulator (Architect design).

**Remaining manual verification:** shell loops are "verified by running the game." A `just serve` smoke is recommended — especially **battlezone** (sim cadence changed) and **star-wars** (loop bug now fixed). See Delivery Findings.

**Handoff:** To Reviewer (The Thought Police) for review.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Question** (blocking-for-AC-3): "Compose over the shared primitive" (tempest) may need a lower-level export. tempest's wrapper injects `now()` (testable) and drains events per sub-step / applies input edges on the first sub-step; the byte-faithful `createLoop` owns `requestAnimationFrame` and reads its own clock. To compose cleanly while KEEPING its injected clock + event drain, the shared module may need to ALSO expose a pure accumulator helper (or an injectable clock / per-frame hook) rather than only `createLoop`. Affects `arcade-shared/src/loop.ts` (possible second export) and `tempest/src/shell/loop.ts`. Needs an Architect/Comrade decision BEFORE Dev implements AC-3. *Found by TEA during test design.*
- **Gap** (blocking): battlezone's loop is NOT the accumulator being extracted. `battlezone/src/main.ts:118-121` steps the sim ONCE per rAF frame with a VARIABLE dt (`Math.min(0.05, (tMs-last)/1000)`, its own `last===0` sentinel, 0.05s clamp) — not a fixed-timestep accumulator. Replacing it with the shared primitive changes battlezone's sim cadence (variable single-step → fixed 1/60 sub-stepping) and its stall clamp (0.05 → 0.25), a behavioural change to an already-shipped game, not a pure dedup. Affects `battlezone/src/main.ts`. Needs ratification before Dev swaps it. *Found by TEA during test design.*
- **Improvement** (non-blocking): star-wars adoption IS also a behaviour change — wiring it to the shared primitive fixes its live `last===0` swallow. Intended by the story, but it alters an already-shipped game's loop; smoke star-wars via `just serve` after GREEN. Affects `star-wars/src/shell/loop.ts`. *Found by TEA during test design.*
- **Improvement** (blocking-at-release): `#branch`-pin + tag-bump obligation (inherited from SH-2). Consumers pin `github:slabgorb/arcade-shared#feat/SH-5-extract-loop-accumulator`; the arcade-shared feat branch must be PUSHED before games can resolve it, and at release every pin bumps to a version tag before the branch is deleted. Affects each consumer's `package.json` / `package-lock.json`. *Found by TEA during test design (carried from SH-2).*

### Dev (implementation)
- **Improvement** (non-blocking): battlezone's fixed-timestep adoption is a shipped-game CADENCE change (variable single-step, 0.05s clamp → fixed 1/60 sub-steps, 0.25s clamp), ratified by the Comrade. Correctness is build + unit green; gameplay FEEL wants an eyeball. Affects `battlezone/src/main.ts` — smoke via `just serve` (`/battlezone/`) before release. *Found by Dev during implementation.*
- **Improvement** (non-blocking): star-wars' loop swap fixes its live `last===0` swallow — an intended behaviour change to a shipped game. Smoke `star-wars` via `just serve` after review. Affects `star-wars/src/shell` (loop now shared). *Found by Dev during implementation.*
- **Improvement** (blocking-at-release): the branch-pin/tag-bump obligation now spans FIVE repos. arcade-shared `feat/SH-5-extract-loop-accumulator` (@ `a91c7c9`) is pushed; all four consumers pin it. At release: merge arcade-shared → cut a `#v0.5.0` tag → bump every consumer pin from the `#feat` ref to `#v0.5.0` → re-run each suite → delete the five feat branches → re-assert battlezone's `arcade-shared-pipe` guard against the tag. Affects each consumer's `package.json`/`package-lock.json`. *Found by Dev during implementation (carried from SH-2).*
- **Gap** (non-blocking): consumers were on STALE prior-story feat branches (asteroids/star-wars/tempest on `feat/SH-4-*`, battlezone on `feat/SH-6-*`), already squash-merged to develop. Dev re-homed all SH-5 work onto fresh `feat/SH-5-adopt-shared-loop` branches cut from current `origin/develop`; star-wars' develop had diverged (sw2 work), re-verified there (543 green). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking, pre-release): the two ratified behavioural changes — battlezone's fixed-timestep cadence and star-wars' `last===0` fix — are correct by inspection + unit-green, but NOT yet gameplay-smoked. Affects `battlezone/src/main.ts` and star-wars' shared loop. Run `just serve` and eyeball `/battlezone/` (tank feel, radar sweep, pause/resume) and `/star-wars/` before release. *Found by Reviewer during code review.*
- **Improvement** (blocking-at-release): confirmed the five-repo tag-bump obligation. All four consumers' `package-lock.json` pin the SAME arcade-shared commit `a91c7c9`; at release, tag arcade-shared `v0.5.0`, bump every consumer pin `#feat/... → #v0.5.0`, re-verify each suite, and re-assert battlezone's `arcade-shared-pipe` guard (its `SHARED_VERSION === '0.5.0'` already matches). Affects each `package.json`/`package-lock.json`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **AC-2 & AC-3 verified by integration, not by new arcade-shared unit tests**
  - Spec source: context-story-SH-5.md, AC-2 & AC-3
  - Spec text: "star-wars and asteroids consume it at a pinned ref; battlezone's inlined loop is replaced by it." / "tempest's richer wrapper composes over the shared primitive rather than duplicating the accumulator."
  - Implementation: RED delivers only `arcade-shared/tests/loop.test.ts` (AC-1). Consumer wiring lands in four game repos on branches not yet created; those loops are shell/IO ("verified by running the game") with no existing unit coverage, so there is no in-repo RED test for them.
  - Rationale: arcade-shared runs in an isolated checkout; cross-repo source-grep / cross-repo-import tests would be brittle and violate the src-not-dist / no-cross-repo-import rules. AC-2/AC-3 are verified by each consumer's `vite build` + existing suite staying green + a manual `just serve` pass.
  - Severity: minor
  - Forward impact: Dev must create consumer feat branches and re-verify each game's suite; Reviewer should treat AC-2/AC-3 as integration-verified, not unit-covered.
- **Shared surface pinned as byte-faithful `createLoop(step, render, hz)`, not a separate pure accumulator**
  - Spec source: context-story-SH-5.md, AC-1 & AC-3
  - Spec text: "@arcade/shared/loop exports the fixed-timestep accumulator…" / "tempest's richer wrapper composes over the shared primitive"
  - Implementation: tests target `createLoop`'s exact asteroids signature (the byte-identical primitive). No test yet pins a separate pure `stepAccumulator` helper.
  - Rationale: `createLoop` is the byte-identical extraction (epic eligibility bar) and drop-in for asteroids/star-wars/battlezone; whether tempest's clean composition additionally needs a lower-level accumulator export is an unresolved design question (see Delivery Findings). I did not pre-commit tests to an undecided API.
  - Severity: minor
  - Forward impact: if Architect/Dev expose a pure accumulator for tempest, add targeted tests for it before GREEN.

### Dev (implementation)
- **Added a pure `advanceFixedSteps` kernel to @arcade/shared/loop (resolves TEA's blocking AC-3 question)**
  - Spec source: context-story-SH-5.md, AC-3; TEA Delivery Finding (tempest composition surface)
  - Spec text: "tempest's richer wrapper composes over the shared primitive rather than duplicating the accumulator."
  - Implementation: Per Architect (Emmanuel Goldstein) design — added pure, clock/rAF-free `advanceFixedSteps(acc, elapsed, dt, step, maxFrame=0.25)` alongside `createLoop`; `createLoop` delegates to it; tempest composes over it keeping its injected `now()`. 7 new tests written RED, then GREEN, before implementation.
  - Rationale: shared `createLoop` owns rAF + its own clock, so tempest (injected clock) cannot literally compose over it. A pure sub-kernel is the minimal seam both `createLoop` and tempest share, and unifies the 0.25 clamp that was duplicated.
  - Severity: minor
  - Forward impact: new shared export; siblings still use `createLoop` unchanged. Release tags/bumps the new surface.
- **battlezone: fixed-timestep adoption is a behavioural (physics) change, not a pure dedup (resolves TEA's blocking Gap)**
  - Spec source: context-story-SH-5.md, AC-2; TEA Delivery Finding (battlezone variable-dt)
  - Spec text: "battlezone's inlined loop is replaced by it."
  - Implementation: Per Comrade decision (*Adopt fixed-timestep*) — replaced battlezone's variable-dt single-step loop with the shared fixed-timestep `createLoop`. Sim cadence variable→fixed 1/60; stall clamp 0.05s→0.25s. Cosmetic radar sweep moved to `performance.now()` (render-only, no core impurity).
  - Rationale: the Comrade ratified the cadence change to satisfy AC-2 literally and unify battlezone with its siblings (+ gain the started-fix).
  - Severity: minor (ratified) — but see the smoke recommendation in Delivery Findings.
  - Forward impact: battlezone gameplay feel shifts subtly; needs a `just serve` eyeball before release.
- **Added consumer-side loop-extraction guards (fs/text), which TEA's RED plan deferred**
  - Spec source: TEA Design Deviation ("AC-2 & AC-3 verified by integration, not by new arcade-shared unit tests")
  - Spec text: "there is no in-repo RED test for them ... verified by each consumer's vite build + existing suite staying green + a manual just serve pass."
  - Implementation: added a pure fs/text `tests/loop-extraction.test.ts` to each consumer, mirroring SH-3's `rng-extraction.test.ts` — asserting the git-URL pin, an import off `@arcade/shared/loop`, and (per repo) deletion / replacement / retention of the local loop.
  - Rationale: asteroids LOSES its local `tests/loop.test.ts` in the swap (as SH-3 retired `tests/rng.test.ts`), so a replacement guard preserves coverage parity; these are single-repo (not the brittle cross-repo grep TEA avoided) and give durable AC-2/AC-3 wiring proof beyond "build passed."
  - Severity: minor
  - Forward impact: none — additive, green.
- **Updated battlezone's `arcade-shared-pipe` + `highscore-extraction` guards for the forced pin bump**
  - Spec source: SH-6 tests hard-coding `#v0.4.0` / `SHARED_VERSION === '0.4.0'`
  - Spec text: `expect(SHARED_VERSION).toBe('0.4.0')` and pin regex `#v0\.4\.0`.
  - Implementation: the required pin bump (`./loop` first exists at 0.5.0, so v0.4.0 can't stay) invalidates these. Updated `arcade-shared-pipe` to `'0.5.0'` (stable across the SH-5 release, since `SHARED_VERSION` stays 0.5.0 when the pin becomes a tag); relaxed `highscore-extraction`'s literal-pin check to any git-URL ref (its exact-version role delegates to `arcade-shared-pipe`).
  - Rationale: unavoidable collateral of the necessary bump; kept the guards' intent (git-URL pin + runtime version) intact.
  - Severity: minor
  - Forward impact: none — both survive the dev→release re-pin.

### Reviewer (audit)
All six logged deviations (2 TEA, 4 Dev) reviewed against the diff + preflight. No UNDOCUMENTED deviation found — every behavioural change in the diff (battlezone cadence, star-wars bugfix, tempest composition) is logged.
- **TEA — AC-2 & AC-3 verified by integration, not new arcade-shared unit tests** → ✓ ACCEPTED: consumer wiring is proven by 5 clean builds + each suite green + the new fs/text extraction guards; cross-repo unit tests would indeed be brittle.
- **TEA — shared surface pinned as byte-faithful createLoop, not a separate accumulator** → ✓ ACCEPTED, and superseded by Dev exactly as TEA's forward-impact note anticipated (the pure `advanceFixedSteps` kernel + 7 targeted tests were added).
- **Dev — added pure `advanceFixedSteps` kernel (AC-3 seam)** → ✓ ACCEPTED: pure, clock/rAF-free, byte-consistent 0.25 clamp; `createLoop` delegates with no behaviour change (11 regression tests green); tempest composes over it keeping its injected clock. Clears the ADR-0001 bar (shared by createLoop + tempest).
- **Dev — battlezone fixed-timestep is a behavioural (physics) change** → ✓ ACCEPTED: explicitly ratified by the Comrade; correctness verified by inspection + 740 green + build. The gameplay-feel smoke is carried as a pre-release Delivery Finding, not a code defect.
- **Dev — added consumer-side loop-extraction guards (TEA's RED plan deferred them)** → ✓ ACCEPTED: single-repo fs/text (not the brittle cross-repo grep TEA avoided); preserves coverage parity for asteroids' deleted `loop.test.ts`; mirrors the SH-3 idiom.
- **Dev — updated battlezone `arcade-shared-pipe` + `highscore-extraction` guards for the pin bump** → ✓ ACCEPTED: unavoidable collateral of the required 0.4.0→0.5.0 bump; `arcade-shared-pipe` now pins 0.5.0 (stable across release) and `highscore-extraction`'s ref-agnostic pin is mitigated by that runtime version proof + build (see [TEST]).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (2,948 tests green across 5 repos, 5 builds pass, 0 smells introduced) | confirmed 0, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — reviewer carried edge analysis (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — reviewer carried silent-failure analysis (see [SILENT]) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — reviewer carried test analysis (see [TEST]) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — reviewer carried doc analysis (see [DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — reviewer carried type analysis (see [TYPE]) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — reviewer carried security analysis (see [SEC]) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — reviewer carried simplification analysis (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — reviewer carried rule check (see [RULE] + Rule Compliance) |

**All received:** Yes (1 enabled subagent returned clean; 8 disabled via `workflow.reviewer_subagents`, their domains carried by the reviewer)
**Total findings:** 0 confirmed blocking, 3 low/non-blocking (reviewer-sourced), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

Multi-repo review of the SH-5 loop extraction (arcade-shared kernel + 4 consumers). `reviewer-preflight` independently confirmed 2,948 tests green and 5 clean builds; my own line-by-line pass of every source and test diff found no Critical/High issues. The refactors are behaviour-preserving where intended and behavioural-by-design only where the Comrade ratified.

**Data flow traced:** wall clock → sim. rAF timestamp (arcade-shared `createLoop`) / injected `now()` (tempest) / `performance.now()` (battlezone render only) → `advanceFixedSteps` folds elapsed into `acc` and emits constant `dt = 1/60` sub-steps → `stepGame`/`stepUnlessPaused` (pure core). Time enters the core ONLY as `dt`; no wall-clock read crosses the core boundary — battlezone's `sweepAngle(performance.now())` is a render-only cosmetic and `sweepAngle` itself takes `elapsedMs` as a pure argument. Safe.

**Pattern observed:** shared pure kernel + thin per-consumer adapters — `advanceFixedSteps` at `arcade-shared/src/loop.ts:38`; `createLoop` (asteroids/star-wars/battlezone) and the composing wrapper (tempest) all reduce to that one accumulator.

**Observations:**
1. [VERIFIED] `advanceFixedSteps` pure & correct — `arcade-shared/src/loop.ts:38-50`: `acc += min(maxFrame,elapsed); while(acc>=dt){step(dt);acc-=dt}; return acc`. 7 tests pin count/carry/clamp/purity. Complies with all applicable TS rules.
2. [VERIFIED] `createLoop` refactor behaviour-preserving — `loop.ts:52-73`: `started`-flag baseline unchanged (the AC-1 fix), else-branch delegates to `advanceFixedSteps` with the same 0.25 clamp; the 11 pre-existing tests are the regression guard, all green.
3. [VERIFIED][TYPE] Type design clean — `StepFn`/`RenderFn` aliases + numeric params; no new `as any`, `Record<string,any>`, `Function` type, or non-null assertions. (type_design disabled — carried by reviewer.)
4. [VERIFIED][SEC] No security surface — no user input, no `JSON.parse`/as-cast, no network, no secrets; timing primitives + fs-reading test guards only. (security disabled — carried by reviewer.)
5. [VERIFIED][EDGE] tempest composition preserves behaviour — `tempest/src/shell/loop.ts:56-92`: clamp (kernel's 0.25 default), lazy-once input via `sampled` (== old `if acc>=STEP`), first-substep-only edges, per-substep event drain + guarded mode transitions, injected `now()` retained. 0-substep frame: callback never fires → no spinner drain, empty `frameEvents`, `draw(state,[])` — identical to the original. (edge_hunter disabled — carried by reviewer.)
6. [VERIFIED] battlezone core purity intact — `battlezone/src/main.ts`: `performance.now()` added only in `renderFrame` (shell); `dt` into `stepGame` is constant 1/60; `sweepAngle` stays pure. Complies with CLAUDE.md "core never calls performance.now()/rAF".
7. [SILENT] No swallowed errors introduced — tempest keeps `catch (e: unknown)` + `console.error` + neutral-input fallback (intentional degradation, not silent); battlezone's `game !== prev` guard correctly skips side effects on paused/frozen sub-steps (not an error swallow). (silent_failure_hunter disabled — carried by reviewer.)
8. [LOW][SIMPLE] `advanceFixedSteps`/`createLoop` do not guard negative/NaN `elapsed` (`acc += min(maxFrame, elapsed)`, no lower bound). PRE-EXISTING in the extracted-from code and old tempest; rAF/performance.now/injected-now are monotonic, so unreachable in production. Not a regression — note only. (simplifier disabled — carried by reviewer.)
9. [LOW][TEST] battlezone `highscore-extraction` pin guard relaxed from exact `#v0.4.0` to any `#ref`. Slightly weaker, but `./highscore` resolution is proven by build + `makeHighScoreStorage` wiring, and the exact version is pinned by `arcade-shared-pipe` (`SHARED_VERSION === '0.5.0'`). Acceptable. (test_analyzer disabled — carried by reviewer.)
10. [LOW][DOC] `arcade-shared/src/loop.ts` header says "This is the ONLY place wall-clock time is read" — accurate for `createLoop`, but the module now also exports the clock-free `advanceFixedSteps`; the header slightly under-describes the new export. Cosmetic. (comment_analyzer disabled — carried by reviewer.)
11. [RULE] All 13 lang-review checks pass or N/A — see Rule Compliance below. (rule_checker disabled — carried by reviewer.)

### Rule Compliance — `.pennyfarthing/gates/lang-review/typescript.md` (13 checks)
- **#1 Type-safety escapes:** PASS — no new `as any`/`as unknown as`/`@ts-ignore`/non-null across changed `.ts`. (battlezone's pre-existing `canvas.getContext('2d')!` is untouched by this diff.)
- **#2 Generic/interface:** PASS — `StepFn`/`RenderFn` signatures + numeric params; no `Record<string,any>`/`object`/`Function`.
- **#3 Enum:** N/A — no enums.
- **#4 Null/undefined:** PASS — no `||`-on-falsy-valid; `maxFrame = 0.25` default param correct; tempest `sampled` gate avoids null.
- **#5 Module/declaration:** PASS — extensionless imports are the established Vite project convention; `@arcade/shared/loop` resolves via package.json `exports`; type aliases exported with `export type`.
- **#6 React/JSX:** N/A — no `.tsx`/React.
- **#7 Async/Promise:** N/A — all loop code synchronous.
- **#8 Test quality:** PASS — arcade-shared tests import from `../src` (not `dist`); 7 new tests non-vacuous; guards assert concrete existence/regex/import.
- **#9 Build/config:** N/A — no tsconfig changes; 5 builds green.
- **#10 Security input validation:** N/A — no user input / parsing / casts.
- **#11 Error handling:** PASS — tempest `catch (e: unknown)` preserved; no new catches elsewhere.
- **#12 Performance/bundle:** PASS — subpath imports (`/loop`) are tree-shaking-friendly; `performance.now()` runs once per render frame.
- **#13 Fix-introduced regressions:** N/A — initial review, no fixes applied.
- **Project rules (CLAUDE.md core-purity, ADR-0001 eligibility):** PASS — no wall-clock crosses the core boundary; `advanceFixedSteps` is shared by `createLoop` + tempest (≥2 consumers), clearing the byte/algorithm-identical bar.

### Devil's Advocate
Assume this is broken. The loudest target is battlezone: its physics genuinely changed and no human has run it. A fixed 1/60 sub-step with a 0.25s clamp means a backgrounded tab resuming after 5 seconds now runs 15 sub-steps in one frame instead of a single 0.05s-clamped step — does the tank teleport, or the audio machine-gun? Rebuttal: 15 sub-steps × 1/60 = 0.25s of simulated motion — bounded, and identical to every sibling; 0.25s of tank travel is not a teleport, and the clamp exists precisely to cap it. `playEventSounds` now fires per sub-step, but each cue maps to a REAL event and `stepGame` clears `events` each step, so a catch-up frame only plays cues for explosions that actually occurred — no duplication. Next: `treads.read()` runs per sub-step — is the start edge lost? No — `pendingStart` is consumed on sub-step 1 (start fires exactly once), later sub-steps read `start=false`; exactly-once preserved. tempest: could the `sampled` flag drain the spinner twice or never? Zero sub-steps → callback never fires → `sampleInput` NOT called → spinner preserved (the intended behaviour); N sub-steps → gated to once, on the first — identical to the original `if (acc>=STEP)` guard. A confused user pausing mid-frame? `stepUnlessPaused` returns the same reference, the `game !== prev` guard skips side effects, `acc` drains normally, resume continues deterministically. A stressed filesystem? The fs/text extraction guards throw loudly on a missing file (test fails, not silent). A malicious user? No input surface — no network, no parse, no DOM injection. The one genuine residual risk is unquantified gameplay FEEL on battlezone/star-wars — which is why the smoke test is carried as a pre-release finding, a manual QA step, not a code defect. Nothing in the diff is logically broken.

**Error handling:** tempest `catch (e: unknown)` + neutral-input fallback preserved (`tempest/src/shell/loop.ts`); battlezone side effects correctly gated on `game !== prev`. Null/empty inputs on the loop kernel are numeric and monotonic in production.

**Handoff:** To SM (Winston Smith) for finish-story.