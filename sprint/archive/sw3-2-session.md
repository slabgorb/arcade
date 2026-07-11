---
story_id: "sw3-2"
jira_key: ""
epic: ""
workflow: "tdd"
---
# Story sw3-2: Trench pilotable viewpoint (sub_703B ±511 lateral / −257..−3583 vertical band) — makes catwalks dodgeable instead of a guaranteed shield loss every run

## Story Details
- **ID:** sw3-2
- **Jira Key:** (not tracked)
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch Strategy:** gitflow (feat/sw3-2-trench-pilotable-viewpoint)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-11T13:37:43Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-11T13:00:51Z | 2026-07-11T13:04:25Z | 3m 34s |
| red | 2026-07-11T13:04:25Z | 2026-07-11T13:18:04Z | 13m 39s |
| green | 2026-07-11T13:18:04Z | 2026-07-11T13:27:16Z | 9m 12s |
| review | 2026-07-11T13:27:16Z | 2026-07-11T13:37:43Z | 10m 27s |
| finish | 2026-07-11T13:37:43Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): The render camera does not read a pilotable eye — `cameraView()` lifts the trench view to a FIXED `TRENCH_SKIM` (`src/shell/render.ts:183`). Wiring `trenchView` into the collision (core) is tested here, but the player only *sees* the dodge once the shell camera reads it too. Affects `star-wars/src/shell/render.ts` (`cameraView` must offset the trench eye by `trenchView`; shell/render is out of core-test scope so no test guards it). *Found by TEA during test design.*
- **Gap** (non-blocking): The band magnitude has no pinned ROM↔world conversion — two conflicting ROM candidates and no arbitration (`src/core/trench-channel.ts`, "Trench geometry & limits"; audit ## Open follow-ups). Dev must CHOOSE provisional band constants scaled off the `TRENCH_HALF_W=256` anchor using the ROM's own ratios (as `RIB_Z`/`TRENCH_FAR` already do) and name them PROVISIONAL. Affects `star-wars/src/core/state.ts` (new band constants). *Found by TEA during test design.*
- **Improvement** (non-blocking): Collision-world (cockpit origin `[0,0,0]`, catwalk at y=200) and the display skim (`TRENCH_SKIM=60`) are two different frames. Keep `trenchView` in collision-world (the tests seat it at the origin so the baseline hazard survives) and ADD it to the skim for render — do not conflate them. Affects `star-wars/src/core/sim.ts` + `src/shell/render.ts`. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): The band constants are PROVISIONAL — `TRENCH_VIEW_HALF_W=2×TRENCH_HALF_W` (512), `TRENCH_VIEW_FLOOR=−13×TRENCH_HALF_W` (−3328), `TRENCH_VIEW_RATE=1200` — derived from ROM ratios ($1FF≈2×$100, span $0D00≈13×$100) but with no arbitrated ROM↔world conversion. Revisit when that conversion is pinned (audit ## Open follow-ups). Affects `star-wars/src/core/trench-channel.ts` (the sub_703B band block). *Found by Dev during implementation.*
- **Question** (non-blocking): The camera dive/pan is now live in `cameraView` but shell/render is not unit-tested — the *feel* (dive speed, how far the walls slide, no clipping at the band edges) is unverified. Recommend a playtest of the trench run before release to confirm the dodge reads right. Affects `star-wars/src/shell/render.ts` (`cameraView` trench branch). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): NaN can permanently poison `trenchView`. The clamp saturates ±Infinity but not NaN; a `0/0` in `shell/input.ts` (zero-size canvas `getBoundingClientRect`) yields NaN `aimX/aimY`, and once `trenchView` goes NaN it stays NaN for the rest of the trench run (only reset on the next `enterPhase`) — silently disabling the catwalk collision (NaN compares always false) and corrupting the view matrix. Same class as the pre-existing `stepSurface` altitude accumulator (`sim.ts:369`), so it's not introduced here. Sanitize `aimX/aimY` at the shell `Input` boundary to fix both. Affects `star-wars/src/shell/input.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): Test hardening — add (a) a ceiling-clamp test (push UP from a dived position; assert `trenchView[1]` settles at exactly `0`, re-adding the removed `UP` preset) and (b) a partial-dive test (a shallow non-zero dive that does NOT clear `CATWALK_HIT_RADIUS` still crashes), to prove the collision tracks `trenchView` geometry rather than merely whether input is neutral. Affects `star-wars/tests/core/trench-viewpoint.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): Player bolts still originate from `COCKPIT=[0,0,0]` (`sim.ts:146`), not the dived `trenchView`, so after a dive shots emanate from the centreline. Aiming still works (port sits at x=0 and the aim ray is input-driven), but a follow-up could originate trench bolts from `trenchView` for visual consistency. Affects `star-wars/src/core/sim.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Band clamp tested by behaviour, not by hardcoded ROM magnitudes**
  - Spec source: context-story-sw3-2.md, AC-1 / AC-2
  - Spec text: "within the ROM clamp band (lateral ±511, vertical −257..−3583)" / "clamped to the band edges (no wrap, no overshoot)"
  - Implementation: Tests assert the clamp INVARIANTS — a sustained dive saturates at a finite floor, an oversized single step clamps (no overshoot), a long dive never wraps above the seat, and the lateral bound is symmetric — instead of pinning the literal ±511 / −257..−3583 in world units.
  - Rationale: The ROM↔world-unit conversion is explicitly unresolved (two conflicting ROM candidates; `trench-channel.ts` + audit ## Open follow-ups). Hardcoding a magnitude would pin a number no source arbitrates and would break the moment Dev scales the band off the `TRENCH_HALF_W` anchor. Behaviour-level assertions survive whatever provisional band GREEN picks.
  - Severity: minor
  - Forward impact: When a later story pins the ROM↔world conversion, add exact-magnitude assertions (and the vertical ceiling, below).
- **Vertical band verified in the dive direction only**
  - Spec source: context-story-sw3-2.md, AC-1
  - Spec text: "lateral and vertical position update from input each tick within the ROM clamp band (... vertical −257..−3583)"
  - Implementation: Tests assert the DOWN (dive) saturation + no-wrap and the lateral symmetry, but do NOT assert a vertical ceiling/up-edge or the exact −257 top offset.
  - Rationale: Neutral seats the eye at the collision-world origin (so the baseline catwalk hazard survives); the dive is the AC-3-critical direction that makes the catwalk dodgeable. The up-edge is a Dev design choice with no bearing on dodgeability and no arbitrated ROM value.
  - Severity: minor
  - Forward impact: A follow-up can pin the vertical ceiling once the ROM↔world conversion lands.

### Dev (implementation)
- **Viewpoint collision change scoped to the catwalk only**
  - Spec source: context-story-sw3-2.md, AC-3; TEA contract (session TEA Assessment)
  - Spec text: "catwalks/obstacles become dodgeable ... a run where the player steers clear does NOT incur the previously-guaranteed shield loss"
  - Implementation: Only the catwalk hazard (`stepTrench`, was `collides(pos, COCKPIT, CATWALK_HIT_RADIUS)`) now tests against `trenchView`. The exhaust-port MISS check and the space/surface cockpit-hit checks stay at the fixed `COCKPIT=[0,0,0]`.
  - Rationale: The port is a shoot-target whose miss fires when it crosses the cockpit plane (z≈0), independent of the eye's lateral/vertical offset; the space/surface hits are other phases entirely. Moving them would be scope creep with no test demanding it (minimalist discipline).
  - Severity: minor
  - Forward impact: If a later story wants the port's approach to parallax with the pilotable eye, extend the port collision then.
- **Removed one unused test constant (`UP`) to keep `tsc --noEmit` clean**
  - Spec source: tests/core/trench-viewpoint.test.ts (TEA's RED file)
  - Spec text: `const UP: Input = { aimX: 0, aimY: 1, fire: false }` — declared but never referenced
  - Implementation: Deleted the `UP` line. TEA had flagged (but deliberately did not write) an up-direction guard; the constant was dead code and failed `noUnusedLocals` in the build.
  - Rationale: The build gate (`pf check` → `tsc --noEmit`) fails on unused locals; the deletion changes no assertions and leaves all 9 tests intact (mirrors the sw2-5 precedent for a Dev build-only edit to a TEA test).
  - Severity: trivial
  - Forward impact: none.

### Reviewer (audit)
- **TEA — Band clamp tested by behaviour, not hardcoded ROM magnitudes** → ✓ ACCEPTED by Reviewer: the ROM↔world conversion is genuinely unresolved (`trench-channel.ts`, audit ## Open follow-ups), and the behaviour-level clamp invariants (finite floor, no overshoot via the dt=100 single-step test, no wrap, symmetric lateral) are the right contract — they survive whatever provisional band GREEN picked and match the PROVISIONAL treatment of `RIB_Z`/`TRENCH_FAR`.
- **TEA — Vertical band verified in the dive direction only** → ✓ ACCEPTED by Reviewer: the dive is the AC-3-critical direction and neutral seats at the origin (baseline hazard preserved). Corroborated by reviewer-test-analyzer, which independently flagged the untested ceiling clamp; the ceiling IS implemented (`Math.min(0, …)`, `sim.ts:486`) and partially guarded by the "never wraps" test (`maxY ≤ 0`). Filed as a non-blocking test-hardening Delivery Finding rather than a blocker.
- **Dev — Viewpoint collision change scoped to the catwalk only** → ✓ ACCEPTED by Reviewer: the port MISS is a z-plane crossing independent of the eye's lateral/vertical offset, and space/surface are other phases; moving them would be scope creep. I verified all four `stepTrench` return paths carry `trenchView` (safe-hold `sim.ts:565`, port-hit reset via `clearRun`→`enterPhase` `sim.ts:599`, miss persists the dive `sim.ts:620`, normal scroll `sim.ts:633`) — no camera-jump bug from the narrow scope.
- **Dev — Removed one unused test constant (`UP`)** → ✓ ACCEPTED by Reviewer: build-only, no assertion changed, mirrors the sw2-5 precedent; `tsc --noEmit` confirmed clean. Note: the ceiling-clamp test-hardening follow-up would re-introduce a `UP` preset — deliberate, not a contradiction.
- **Reviewer note (incidental, not a spec deviation):** Player bolts still originate from `COCKPIT=[0,0,0]` (`sim.ts:146`) rather than the dived `trenchView`; aiming is unaffected (port at x=0, aim ray input-driven), so this is a cosmetic follow-up, recorded as a non-blocking Delivery Finding.

## Sm Assessment

**Story:** sw3-2 — Trench pilotable viewpoint (ROM `sub_703B`, lateral ±511 / vertical −257..−3583 band). 5 pts, p1, TDD (phased). Repo: star-wars, branch `feat/sw3-2-trench-pilotable-viewpoint` off develop (gitflow).

**Setup verified on disk:**
- Session file created; Phase `setup` (not pre-advanced).
- Story moved `backlog → in_progress` in `sprint/epic-sw3.yaml`.
- Branch `feat/sw3-2-trench-pilotable-viewpoint` created from develop.
- Story + epic context generated (new files, no curated content clobbered).

**Context for TEA (RED phase):**
- Source of truth is the ROM behavior in `star-wars/docs/sw2-6-disassembly-fidelity-audit.md` (`sub_703B`). Position clamps to band edges — no wrap, no overshoot.
- Deterministic core (`src/core`) owns the position update; `src/shell` only reads it for render/input. Follow the existing star-wars core/shell split and the sw2 trench-phase entry points.
- 4 ACs captured in `sprint/context/context-story-sw3-2.md`. The key testable invariants: pilotable lateral+vertical update from input, hard clamp at band edges, and a steered-clear run avoids the previously-guaranteed shield loss.

**Routing:** Phased TDD → hand off to TEA for RED. No Jira. Merge gate clear (no blocking PRs).

## TEA Assessment

**Phase:** finish
**Tests Required:** Yes
**Reason:** 5-pt behavioural core change (pilotable trench viewpoint + collision) — the pure-core contract is unit-testable and must be pinned before implementation.

**Test Files:**
- `star-wars/tests/core/trench-viewpoint.test.ts` — 9 tests, one new file (no existing test touched).

**Tests Written:** 9 tests covering 3 of the 4 ACs directly (AC-4 core-verified; its shell-read half is a Dev finding).

| AC | Coverage | Tests |
|----|----------|-------|
| AC-1 pilotable within band | ✓ | seats at origin on entry; yoke flies eye down; yoke flies eye laterally |
| AC-2 clamped, no wrap/overshoot | ✓ | dive saturates at a finite floor; oversized step clamps (no overshoot); long dive never wraps; lateral clamp symmetric |
| AC-3 catwalks dodgeable, hazard preserved | ✓ | held dive dodges (no crash/no shield); neutral input still costs exactly one shield |
| AC-4 core owns update, shell reads | ◑ core-only | viewpoint lives in `GameState`/`stepTrench` and drives the catwalk collision (tested); the shell-read (`cameraView`) half is out of core-test scope → logged as a Delivery Finding for Dev |

**The contract Dev implements (pinned by the tests):**
- New `GameState.trenchView: Vec3`, seated at `[0,0,0]` on trench entry (keeps the baseline catwalk hazard alive).
- The yoke flies it each tick, clamped to a finite band (down-dive floor + symmetric lateral bound), integrated on a path that rides the no-port safe-hold return.
- `stepTrench` collides the catwalk against `trenchView`, not the fixed `COCKPIT`.
- Band magnitudes are Dev's provisional choice (scale off `TRENCH_HALF_W`) — the tests do NOT hardcode them (see Design Deviations).

### Rule Coverage

| Rule (source) | Applies? | How covered |
|---------------|----------|-------------|
| TS lang-review #8 — test quality (no vacuous asserts, no `as any` in assertions, import from `src/` not `dist/`) | Yes | Self-checked: every test has concrete value/behaviour assertions (exact life-delta, `.toEqual([0,0,0])`, `.toBe(floor)`); no `let _ =`, no `assert(true)`; imports from `src/`. |
| Core purity / determinism (star-wars CLAUDE.md) | Yes | The clamp tests use exact-equality (`b.trenchView[1]).toBe(a.trenchView[1])`, `oneBigStep).toBe(floor)`) — these flake under any nondeterminism, so they guard the boundary. All time enters as `dt`; no RNG touched. |
| TS #3 enum exhaustiveness, #5 validated constructors, #10 tenant context | No | No new enums, validated constructors, or multi-tenant surface in this story. |

**Rules checked:** 2 of 2 applicable lang-review/purity rules have test coverage.
**Self-check:** 0 vacuous tests (all 9 assert meaningful values/outcomes; the `as TrenchObstacle['pos']` cast is on a fresh array copy, mirroring the existing hazard test, not an assertion escape).

**RED verified:** testing-runner (RUN_ID sw3-2-tea-red) — 8 of 9 new tests fail (field absent → dive still crashes); the "neutral still costs a shield" baseline passes (documents the preserved hazard). All 58 other files / 610 tests stay green — zero collateral. Committed on `feat/sw3-2-trench-pilotable-viewpoint` (`ff6d87b`).

**Handoff:** To Dev (The Word Burgers) for GREEN — implement `trenchView` + the band + the catwalk-vs-viewpoint collision, then wire `cameraView` (Delivery Finding) so the dodge is visible.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `star-wars/src/core/trench-channel.ts` — new `sub_703B` band block: `TRENCH_VIEW_HALF_W` (512), `TRENCH_VIEW_FLOOR` (−3328), `TRENCH_VIEW_RATE` (1200), scaled off `TRENCH_HALF_W` via ROM ratios, named PROVISIONAL.
- `star-wars/src/core/state.ts` — `GameState.trenchView: Vec3` field + seeded `[0,0,0]` in `initialState`.
- `star-wars/src/core/sim.ts` — `enterPhase` reseats `trenchView` to `[0,0,0]`; `stepTrench` flies it from the yoke (clamped to the band, on `base` so it rides the no-port safe-hold) and collides the catwalk against it instead of the fixed `COCKPIT`.
- `star-wars/src/shell/render.ts` — `cameraView` offsets the trench eye by `trenchView` on top of the fixed skim, so the dodge is visible.
- `star-wars/tests/core/trench-viewpoint.test.ts` — removed one unused constant (`UP`) for `tsc` (build-only; no assertion change — see Design Deviations).

**Tests:** 618/618 passing (GREEN) — all 9 sw3-2 tests pass, 0 regressions across 59 files (testing-runner RUN_ID sw3-2-dev-green). `tsc --noEmit` clean.

**AC coverage:** AC-1 (pilotable within band) ✓, AC-2 (clamped, no wrap/overshoot) ✓, AC-3 (catwalks dodgeable, hazard preserved) ✓, AC-4 (core owns the update, shell reads) ✓ — `trenchView` lives in the core sim/state; `cameraView` (shell) only reads it.

**Branch:** `feat/sw3-2-trench-pilotable-viewpoint` — pushed (commit `b063c86`; RED tests at `ff6d87b`). No PR (SM opens it at finish).

**Handoff:** To the review phase (Immortan Joe / Reviewer).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 618/618 green, tsc clean, no lint (lint == tsc), 0 code smells, no PR yet |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 3 | confirmed 3 (all non-blocking), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | findings | 1 | confirmed 1 (non-blocking, pre-existing pattern), dismissed 0, deferred 0 |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed 1 (Low, mechanical), dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned; 5 disabled via `workflow.reviewer_subagents`)
**Total findings:** 5 confirmed (all non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** yoke `aimX/aimY` (shell `input.ts`) → `stepGame` → `stepTrench` integrates + clamps into `GameState.trenchView` (`sim.ts:482-486`, `dt`-scaled, band `[-512,512]` × `[-3328,0]`) → consumed by (a) the catwalk collision `collides(pos, trenchView, CATWALK_HIT_RADIUS)` (`sim.ts:533`) and (b) the read-only `cameraView` trench eye (`render.ts:133-134`). Deterministic and pure — no DOM/time/RNG entered `core/`.

**Pattern observed:** the band constants (`trench-channel.ts:106-115`) are scaled off the `TRENCH_HALF_W` anchor via ROM ratios and named PROVISIONAL — consistent with the existing `RIB_Z`/`TRENCH_FAR` treatment. Good pattern.

**Error handling / boundaries:** clamp bounds are correctly ordered in both axes (lo < hi); `trenchView` is a fresh `[0,0,0]` literal on every `enterPhase`/`initialState` (no shared-array aliasing); all four `stepTrench` return paths carry `trenchView`.

### Findings (by specialist — all non-blocking)

- [TEST] (test-analyzer, Medium): the vertical clamp is only exercised on the FLOOR/dive half; no ceiling test that pushing UP from a dive settles at exactly 0. The ceiling IS implemented (`Math.min(0, …)`) and partially guarded by "never wraps"; TEA logged this as the deliberate "dive-direction only" deviation. → confirmed, filed as a test-hardening Delivery Finding.
- [TEST] (test-analyzer, Medium): no partial-dive case, so a degenerate "aimY≠0 → skip hazard" fix could pass. I read the impl — it genuinely collides against `trenchView` position geometry (`sim.ts:533`), not an input-zero branch — so this is test-strength, not a bug. → confirmed as hardening, filed.
- [TEST] (test-analyzer, Low): the `cameraView` trench branch is untested. Matches project convention (shell verified by running the game); Dev already filed a playtest finding. → confirmed, non-blocking.
- [SEC] (security, Low): NaN can permanently poison `trenchView` (clamp saturates ±Infinity but not NaN; `0/0` in `shell/input.ts` freezes it for the run, disabling the catwalk collision + corrupting the view matrix). Same class as the pre-existing, untouched `stepSurface` altitude accumulator (`sim.ts:369`); `dt` correctly ruled out (fixed 60 Hz). → confirmed, non-blocking, filed as a shell-boundary input-sanitization follow-up (fixes both accumulators).
- [RULE] (rule-checker, Low): `trenchStart(obstacles: TrenchObstacle[])` (`test:198`) isn't `readonly` (TS #2). It is only read via `.map()` and exactly mirrors the pre-existing `isolatedTrench()` helper (`trench-catwalk-hazard.test.ts:44`). Per project-rule policy I do not dismiss it — I downgrade to Low and confirm; consistent with codebase convention, non-blocking.
- [EDGE] N/A (disabled). [SILENT] N/A (disabled). [DOC] N/A (disabled). [TYPE] N/A (disabled). [SIMPLE] N/A (disabled).

### My own observations (independent of subagents)

- [VERIFIED] All four `stepTrench` return paths carry `trenchView` — no camera-jump bug — evidence: `sim.ts:565` (safe-hold spreads `base`), `599-608` (port-hit → `clearRun`→`enterPhase` resets to `[0,0,0]`, correct for the new phase), `620-629` (miss spreads `afterObstacles`, persists the dive — correct, same phase), `633` (normal scroll spreads `afterObstacles`). Complies with the core purity rule (no DOM/time/RNG).
- [VERIFIED] Baseline hazard preserved — neutral seat `[0,0,0]`, catwalk at y=200, dist 200 < `CATWALK_HIT_RADIUS` 240 → still bites — evidence: `sim.ts:533` + test at `:289` passes (exactly one shield).
- [VERIFIED] No-overshoot is genuinely proven — a single `dt=100` step clamps to the SAME floor a long hold reaches — evidence: test `:102` `oneBigStep === floor`, impl `Math.max(TRENCH_VIEW_FLOOR, …)` `sim.ts:486`.
- [VERIFIED] `cameraView` stays a pure read-only consumer — evidence: `render.ts:126-135` reads `state.trenchView`, returns a new `Mat4`, mutates nothing; composes the existing `viewMatrix` primitive with the core-computed value (no game math in the shell).
- [MEDIUM→LOW] `tsc --noEmit` clean confirms every `GameState` construction site received `trenchView` — no missing-field literal anywhere.

### Rule Compliance (lang-review/typescript.md + star-wars core-boundary)

| Rule | Applies | Verdict |
|------|---------|---------|
| #1 Type-safety escapes (`as any`, `!`, ts-ignore) | Yes | Compliant — `trenchView` typed via explicit `: Vec3`, no casts; test uses a real `if (!catwalk) throw`, not a `!` escape. |
| #2 Missing `readonly` on unmutated array params | Yes | **1 violation (Low):** `trenchStart(obstacles)` — mirrors existing helper convention; confirmed, non-blocking. |
| #4 Null/undefined (`??` vs `||`) | Yes | Compliant — clamp uses `Math.max/min`; `trenchView` always present (required field, set in `initialState`+`enterPhase`). |
| #5 Module/imports | Yes | Compliant — value import from `./trench-channel`, no cycle (trench-channel imports only types), no `.js` needed (bundler resolution). |
| #8 Test quality | Yes | Compliant — every assertion is specific/falsifiable; no `.only/.skip`, no `toBeTruthy`, no `as any`, imports from `src/`. |
| #3/#6/#7/#10/#11 enums/JSX/async/input-validation/error-handling | No | Not applicable — no enums, JSX, async, API boundary, or new user-input typing. |
| core-boundary: no shell import / no DOM / no Date/random / time via `dt` / RNG-only | Yes | Compliant — verified by rule-checker (rules 23-27) and independently; motion is a pure `dt`-scaled function of input, clamped to a finite band. |
| core-boundary: shell `render.ts` read-only over sim state | Yes | Compliant — `cameraView` is pure/read-only. |

### Devil's Advocate

Suppose I want to prove this ships a broken trench. First attack: **the band is a magic number with no source** — `TRENCH_VIEW_FLOOR = -3328`, `RATE = 1200`. If those are wrong, the dive either can't clear the catwalk (still a guaranteed shield) or overshoots the trench floor into the wall geometry. Rebuttal: the tests don't pin magnitudes; they pin the *outcome* (a held dive dodges; neutral still crashes), so a mis-tuned-but-functional band still satisfies the AC, and the values are honestly flagged PROVISIONAL with a follow-up when the ROM↔world conversion lands. The *feel* is genuinely unverified in unit tests — hence the playtest Delivery Finding. Second attack: **the NaN poison** — a confused/hostile environment (hidden canvas, `display:none`, a resize race) drives `aimX/aimY` to NaN via `0/0`, and the new accumulator makes that NaN *sticky* for the whole run, silently killing the catwalk hazard and blanking the view. This is the strongest real concern; but it's a rare precondition, it's the identical gap already shipped in the surface altitude accumulator, and it degrades one trench run (self-heals on the next phase) rather than corrupting data or crashing — Low, filed, not a blocker. Third attack: **a lazy fix** — did Dev just disable the catwalk when input is nonzero? No: `collides(pos, trenchView, …)` is real position geometry; the "neutral still crashes" test would fail if the hazard were removed, and I read the code to confirm it's not an `aimY===0` branch. Fourth: **a confused player** dives to dodge the catwalk, then can't shoot the port because bolts leave from the old centreline — but the port is at x=0 and the aim ray is input-driven, so aiming is unaffected; only the shot *origin* lags, a cosmetic follow-up. Fifth: **camera desync** — could the collision say "dodged" while the camera says "crashed"? No: both read the same `trenchView`, computed once per step. Nothing here rises to Critical or High.

**Handoff:** To SM (The Organic Mechanic) for finish-story.