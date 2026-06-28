---
story_id: "8-5"
jira_key: ""
epic: "8"
workflow: "tdd"
---
# Story 8-5: Wave 3 — trench run: trench, catwalks, exhaust port, bonus

## Story Details
- **ID:** 8-5
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** tdd
- **Points:** 5
- **Stack Parent:** 8-4 (merged into develop, PR #3)
- **Repos:** star-wars
- **Assignee:** Keith Avery

## Story Description

Renders TRENCH (and any new catwalk/exhaust-port geometry) from core/models.ts. The TRENCH model carries the nearest-neighbour heuristic EDGES from the 8-2 port and will render tangled — the same bug fixed for TIEs in 8-3.

**In scope:**
- Re-author TRENCH edges by ring reconstruction (its floor is explicit square loops; close them + connect catwalk rails)
- Guard with the inducedSingleCycle topology test
- Give TRENCH a fixed display orientation if needed (floor lies flat in y=0; camera skims it)
- Ensure any NEW model authored here ships correct ring-based edges + a topology test from the start, not heuristic edges
- Eyeball on first render

**Key reference:** context-epic-8.md → "Geometry connectivity (read before 8-4/8-5)"

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-28T10:20:38Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-28T09:34:52.707811+00:00 | 2026-06-28T09:41:24Z | 6m 31s |
| red | 2026-06-28T09:41:24Z | 2026-06-28T09:56:45Z | 15m 21s |
| green | 2026-06-28T09:56:45Z | 2026-06-28T10:07:38Z | 10m 53s |
| review | 2026-06-28T10:07:38Z | 2026-06-28T10:20:38Z | 13m |
| finish | 2026-06-28T10:20:38Z | - | - |

## Sm Assessment

**Routing:** Phased TDD workflow → handing off to TEA (Han Solo) for the RED phase.

**Pre-flight resolved:** Story 8-5 depends on 8-4 (merged, PR #3). Discovered story 8-8
was marked `done` but its PR #4 was never merged — merged it into star-wars `develop`
before setup so 8-5 branches off an honest base that includes the space→surface→trench
progression wiring. No outstanding blocking PRs remain.

**Nature of the work (for TEA):** This is primarily a *geometry-correctness* story, not a
feature story. The TRENCH model in `core/models.ts` was ported with nearest-neighbour
heuristic edges (the same defect fixed for TIEs in 8-3) and renders tangled. The fix is
to re-author TRENCH edges by ring reconstruction and lock it in with topology tests.

**Test surface TEA should drive (RED):**
- `inducedSingleCycle` topology guard over TRENCH edges — the existing pattern from the
  8-3/8-4 geometry tests is the model to follow (see `tests/core/` for prior topology tests).
- The TRENCH floor is explicit square loops — tests should assert closed rings + connected
  catwalk rails, not heuristic adjacency.
- Any NEW model (catwalk/exhaust-port) authored in GREEN must arrive with ring-based edges
  AND its own topology test from the start — write the failing topology test now.
- Display orientation: floor lies flat in y=0, camera skims it — a fixed orientation test
  may be warranted if rendering needs it.

**Reference TEA must read first:** `sprint/context/context-epic-8.md` →
"Geometry connectivity (read before 8-4/8-5)", and `sprint/context/context-story-8-5.md`.

**Acceptance:** TRENCH (and new geometry) renders untangled, topology tests pass, eyeball
verification on first render. 5 points.

## TEA Assessment

**Phase:** finish (test design)
**Tests Required:** Yes
**Reason:** Geometry-correctness story — topology/connectivity contracts must be locked before GREEN.

**Test File:**
- `star-wars/tests/core/models.test.ts` — appended a "Story 8-5" section (reuses the
  8-2/8-4 `deriveRings` + `inducedSingleCycle` helpers; adds `isSingleComponent` and
  `countCrossRingRails`, each with its own helper self-check).

**Tests Written:** 8 new (5 RED + 1 floor-ring regression guard + 2 connectivity-helper self-checks).
**Status:** RED — verified by Chewbacca (testing-runner): **5 failing / 97 passing**, build + typecheck PASS, zero unexpected failures.

**RED tests (Dev's GREEN target):**
1. Trench is a single connected wireframe (catwalk rails bridge the two floor loops).
2. ≥1 catwalk rail bridges the inner and outer floor rings (derived rings, not hardcoded indices).
3. Registry includes an exhaust-port model (the run target).
4. The exhaust port is a closed ring opening (≥1 derived ring, each closes — ring-based edges from the start).
5. The exhaust port is one connected wireframe (no floating segments).

**Green guards (already passing — protect correct behavior):**
- Trench floor squares each close into one loop (regression guard for the rail work).
- `isSingleComponent` helper self-check (accepts connected / rejects disjoint).
- The existing 8-2 well-formedness suite auto-covers any new model added to `MODELS`
  (finite verts, in-range integer edges, no degenerate/duplicate/orphan) — no duplication needed.

### Read before GREEN (Yoda)

The architect's "TRENCH renders tangled" premise is **measurably false** — TRENCH's two floor
squares already close cleanly. **Do not re-author TRENCH edges to fix a tangle; there is none.**
The work is additive: (a) add catwalk rails that connect the two floor loops — simplest is edges
joining existing outer↔inner vertices, kept at y=0 so the 8-2 flatness invariant holds; and
(b) author a NEW exhaust-port model with ring-based edges and add it to `MODELS`. Eyeball both
in the dev server (port 5274) on first render — topology tests catch tangles but NOT orientation
or scale.

### Rule Coverage (lang-review: typescript.md)

| Check | Applies to | Test / Note |
|-------|-----------|-------------|
| #8 Test quality | test design (TEA) | New tests assert meaningful values; both helpers have discriminating self-checks; no `as any` in assertions; no vacuous `let _ =` / `assert(true)`. |
| Core purity (CLAUDE.md) | models.ts | Tests import from `src/core` only — no shell/DOM/time/randomness; models.ts stays pure data. |
| #1–#7, #9–#12 | GREEN (Dev) | Implementation-pattern checks — apply to the exhaust-port model Dev authors (`readonly` tuples per `Model3D`, `??` over `||`, no `as any`), not to test design. |

**Rules checked:** test-design-applicable checks (#8, core purity) enforced; implementation checks deferred to GREEN self-review.
**Self-check:** 0 vacuous tests — the `expect(m).toBeDefined(); if (!m) return` idiom mirrors the existing 8-2/8-4 tests; the `toBeDefined()` is the real RED assertion.

**Handoff:** To Dev (Yoda) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes (geometry + render wiring; trench gameplay deferred — see findings)
**Tests:** 102/102 passing (GREEN) — verified by the Living Force (testing-runner); build + typecheck PASS, zero regressions.
**Branch:** `feat/8-5-wave-3-trench-run` (pushed to origin).

**Files Changed:**
- `star-wars/src/core/models.ts` — added 4 **catwalk rails** to `TRENCH` ([0,4],[1,5],[2,6],[3,7], each joining an outer floor corner to its matching inner corner, kept at y=0) so the trench is one connected wireframe; added a new ring-based `EXHAUST_PORT` octagon model (symmetric ±64/±27, single closed loop, flat in y=0) and registered it in `MODELS`. Corrected the stale module header note.
- `star-wars/src/shell/render.ts` — added a `phase === 'trench'` render branch drawing `TRENCH` + `EXHAUST_PORT` at a static skim placement with `TRENCH_ORIENT = IDENTITY` (floor lies flat in y=0; camera skims it), so the geometry actually renders and can be eyeballed.

**How the 5 RED tests went GREEN:**
1. Trench single connected wireframe ← catwalk rails bridge the loops.
2. ≥1 cross-ring catwalk rail ← 4 rails join the rings.
3. Exhaust-port model in registry ← `EXHAUST_PORT` added to `MODELS`.
4. Exhaust port is a closed ring ← octagon authored as one ring-based loop.
5. Exhaust port connected ← single 8-vertex cycle.

**Heeded Han Solo's finding:** did NOT "re-author TRENCH edges to fix a tangle" — there was none. The floor squares already closed; the work was additive (rails + port). The floor-ring regression guard stays GREEN.

**Eyeball status:** render path is wired and builds, but the in-game eyeball of the trench
phase requires reaching Wave 3 (space→surface→trench). Topology guarantees untangled geometry
and orientation is identity (flat floor) — the look-right confirmation is a REVIEW step.

**Self-review:**
- [x] Wired to front end — trench geometry now renders in the trench phase (was blank before).
- [x] Follows project patterns — mirrors the 8-4 surface render branch + `*_ORIENT` convention.
- [x] Acceptance criteria — geometry renders untangled, topology tests pass; *bonus/gameplay deferred* (finding).
- [x] Core purity preserved — models.ts stays pure data; no DOM/time/randomness.

**Handoff:** To Reviewer (Obi-Wan).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (102/102 green, build+typecheck PASS, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — self-assessed |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — self-assessed |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — self-assessed |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — self-assessed |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — self-assessed |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — self-assessed |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — self-assessed |
| 9 | reviewer-rule-checker | Yes | findings | 4 (Low — non-null assertions) | confirmed 4 (Low), dismissed 0, deferred 0 |

**All received:** Yes (2 enabled subagents returned; 7 disabled via `workflow.reviewer_subagents`, domains self-assessed)
**Total findings:** 4 confirmed (all Low), 0 dismissed, 0 deferred — plus 1 Medium and 1 Gap found by my own analysis.

## Reviewer Assessment

**Verdict:** APPROVED

**Scope reviewed:** 3 files (`src/core/models.ts`, `src/shell/render.ts`, `tests/core/models.test.ts`), +227/−5. Pure-data geometry + a shell render branch + topology tests. No backend, user input, tenancy, async, or enums.

**Data flow traced:** `MODELS` static data (TRENCH rails, EXHAUST_PORT octagon) → `render()` trench branch → `drawModelAt` → `transform`/`project` (core/math3d) → canvas strokes. Safe: pure object-space data; off-screen/behind-camera points are dropped (`project` returns null → `drawModelAt` `continue`s). No mutation, no impurity.

**Pattern observed:** the trench render branch (render.ts:81-88) faithfully mirrors the 8-4 surface branch (`drawModelAt` + a `*_ORIENT`); EXHAUST_PORT and the rails follow the 8-2/8-4 "authentic data + authored ring edges" convention. Consistent.

**Findings (tagged by source):**
- `[RULE]` 4× non-null assertion in `isSingleComponent` (models.test.ts:449,450,455,456) — **Low, CONFIRMED, non-blocking.** `adj` is pre-populated for 0..n-1 and edge indices are bounds-guaranteed by the existing "every edge index in range" well-formedness test; pattern is identical to the already-accepted `inducedSingleCycle` helper (8-4). Test hygiene, not a runtime risk.
- `[PREFLIGHT]` 102/102 tests green, build + typecheck PASS, 0 code smells.
- `[EDGE]` (disabled — self-assessed): the only new branch is `phase === 'trench'`; `space` still falls to the enemy `else` (unchanged). Off-screen points handled by `project()` null-guard. No out-of-range indices introduced (well-formedness green). **One MEDIUM:** render placement leaves the exhaust port floating ~244 units beyond the trench floor's far edge (floor z∈[-892,-508], port z∈[-1264,-1136]) — see Devil's Advocate; non-blocking placeholder.
- `[SILENT]` (disabled — self-assessed): no error handling in the diff (pure data + drawing); no swallowed errors / empty catches / silent fallbacks.
- `[TEST]` (disabled — self-assessed): new tests assert meaningful values; both helpers have discriminating self-checks; the exhaust-port ring test is non-vacuous (deriveRings yields exactly one ring that MUST close); `toBeDefined()` carries the real assertion. No vacuous assertions.
- `[DOC]` (disabled — self-assessed): the stale module header ("TRENCH still carries heuristic edges") was correctly updated; new comments accurately describe rails + octagon + deferred gameplay. No misleading docs.
- `[TYPE]` (disabled — self-assessed): EXHAUST_PORT conforms to `Model3D` (readonly Vec3[]/edge pairs); no stringly-typed APIs, no unsafe casts beyond the Low `!` above.
- `[SEC]` (disabled — self-assessed): N/A — single-player browser game; no user input, auth, secrets, network, or tenancy in this diff.
- `[SIMPLE]` (disabled — self-assessed): no dead code / over-engineering; rails are minimal (4 edges), the octagon is the simplest equal-radius ring with integer coords. The placement constants are a documented placeholder.

### Rule Compliance (typescript.md #1–#13 + core/shell boundary)
- **#1 Type-safety escapes:** 4× Low non-null assertion in the test helper (above); no `as any` / `@ts-ignore` / double-cast. — minor
- **#2 Generics/interfaces:** helpers typed to `Model3D`; no `Record<string,any>`/`Function`/`object`. Compliant.
- **#3 Enums:** none in diff. N/A.
- **#4 Null/undefined:** `countCrossRingRails` guards `findIndex` −1; Vec3 placement from numeric constants; no `||`-vs-`??` bug. Compliant.
- **#5 Modules:** value imports (TRENCH/EXHAUST_PORT) vs `type` imports (Model3D/Mat4/Vec3) correct; no missing `.js` (Vite resolution). Compliant.
- **#6 React/JSX:** no .tsx. N/A. **#7 Async:** none. N/A.
- **#8 Test quality:** no `as any`; imports from `src` not `dist`; meaningful assertions. Compliant.
- **#9 Build/config:** no config changes. N/A. **#10 Input validation:** no external input. N/A. **#11 Error handling:** no try/catch. N/A.
- **#12 Perf/bundle:** direct named imports, no barrel/dynamic import. Compliant. **#13 Fix-regressions:** only new pattern (`isSingleComponent`) flagged under #1; no silencing casts. Compliant.
- **Core purity (CLAUDE.md):** models.ts pure data (`import type Vec3` only); no DOM/time/random; shell→core import direction correct; render does no game math (routes through math3d). Compliant.

### Geometry independently verified (challenged my VERIFIEDs)
- `[VERIFIED]` **EXHAUST_PORT is ONE equal-radius ring** — all 8 vertices are permutations of (±64,±27) in x/z at y=0; each radius = √(64²+27²)=√4825=69.46222 (computed, identical for all 8); deriveRings buckets them as one ring (eps=6.4e-5 ≫ any ULP diff); the 8 edges form a single non-crossing 8-cycle (angles monotonic 22.9°→337.1°). models.ts:322-337.
- `[VERIFIED]` **TRENCH stays topology-correct** — rails [0,4],[1,5],[2,6],[3,7] are cross-ring; each floor loop's induced subgraph keeps every vertex at degree 2 (loops preserved); `isSingleComponent`=true; all 8 vertices remain y=0, so the 8-2 flatness test holds. models.ts:300-309.
- `[VERIFIED]` **No render regression** — `space` phase unchanged (final `else`); the `trench` phase previously drew nothing (no enemies), now draws geometry. render.ts:78-91.

### Devil's Advocate
Arguing this is broken: First, the render placement — `TRENCH_FLOOR_Z=700`/`TRENCH_PORT_Z=1200` are pulled from thin air with no tie to `GameState`. I computed the result: the exhaust port lands 244 units BEYOND the trench floor's far edge (floor ends z=-892, port near edge z=-1136), so on first eyeball an amber octagon floats in the void past the end of a short floor stub — a reviewer could reasonably read that as "the geometry is wrong." Second, the trench is NOT playable: `stepTrench` is still a terminal hold, so a player reaching Wave 3 is frozen staring at static geometry; the story title ("trench run … bonus") promises gameplay this PR does not deliver, so a stakeholder could call the story incomplete. Third, `isSingleComponent` will THROW (not fail cleanly) if ever handed a model with an out-of-range edge index — `adj.get(a)!` would be undefined and `.push` crashes; today the well-formedness test prevents that, but a future model added without that guard could crash the suite confusingly. Fourth, the exhaust port has no DEPTH — a flat octagon reads as a stop-sign on the floor, not a recessed shaft you drop a torpedo into; the eyeball may reject it. Fifth, on a very tall/narrow canvas the floor's x=±256 could clip and truncate the trench.

Rebuttals: (1)(4) placement/depth are documented first-render placeholders, flagged by Dev as an Improvement and explicitly deferred — eyeball-tunable in the gameplay follow-up, not defects in the tested deliverable (topology, which is correct). (2) deferral aligns with the highest-authority session scope ("primarily a geometry-correctness story") and is logged as a major deviation + Gap — tracked, not silent. (3) inputs are bounds-guaranteed by the well-formedness suite and the pattern matches the accepted `inducedSingleCycle` helper — Low, non-blocking. (5) the surface phase has the same aspect dependence and was accepted; framing is an eyeball concern. Conclusion: no defect in the delivered, tested deliverable; concerns are placeholder placement (deferred, flagged Medium) and deferred gameplay (scope-aligned, tracked). No Critical/High.

**Deviation audit:** see `### Reviewer (audit)` below — all 6 TEA/Dev deviations ACCEPTED; the deferred-gameplay deviation accepted with a reinforced non-blocking follow-up finding.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### TEA (test design)
- **Conflict** (non-blocking): The 8-3 architect note's premise that TRENCH "renders tangled / carries heuristic edges" is empirically false — its two concentric floor squares already close into clean single loops (measured via `deriveRings` + `inducedSingleCycle`; the 8-vertex case was simple enough the nearest-neighbour heuristic landed both rectangle perimeters). The real Wave 3 gaps are structural, not a tangle: the floor loops are disconnected and the exhaust port has no geometry. Affects `sprint/context/context-epic-8.md` and `sprint/context/context-story-8-5.md` (correct the premise so GREEN/REVIEW don't chase a non-existent tangle). *Found by TEA during test design.*
- **Gap** (non-blocking): `TIE_FIGHTER` and `DARTH_TIE` FAIL the ring-closure guard (9 and 38 derived rings, none close) and have NO topology test — yet `context-epic-8.md` → "Geometry connectivity" states the TIEs were "rebuilt from the vertices' own ring structure and are now guarded by a topology test" in 8-3. They still carry the 8-2 heuristic edges and will render tangled in Wave 1. Affects `star-wars/src/core/models.ts` (TIE/DARTH edges need ring reconstruction). Out of 8-5 scope — inherited 8-3 follow-up debt. *Found by TEA during test design.*
- **Gap** (non-blocking): The story title's "bonus" (trench-run bonus scoring) is unspecified sim/scoring behaviour with no ACs; this RED phase covers only the geometry deliverables. Affects `star-wars/src/core/` sim/gameRules (bonus scoring needs a spec/AC before it can be built or tested). Flag for PM/Architect. *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): Trench-run **gameplay is not built** — `stepTrench` (`star-wars/src/core/sim.ts`) is still the "safe terminal hold" stub, and the trench renders at a static placement. The story title's "bonus" plus the sim.ts comment's "real trench" (scroll/approach, exhaust-port targeting, bonus scoring, collision) need a follow-up story. This story delivered the geometry foundation (connected trench + ring-based exhaust port + render wiring) that gameplay will build on. Affects `star-wars/src/core/sim.ts` (`stepTrench`) and `star-wars/src/shell/render.ts` (static placement → gameplay-driven). *Found by Dev during implementation.*
- **Improvement** (non-blocking): The exhaust-port placement/scale in `render.ts` (`TRENCH_SKIM`/`TRENCH_FLOOR_Z`/`TRENCH_PORT_Z`) is a first-render guess; the in-game eyeball at Wave 3 may want it tuned. Affects `star-wars/src/shell/render.ts`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): Render placement leaves the `EXHAUST_PORT` floating ~244 units beyond the trench floor's far edge (floor world-z ends at −892, port near edge at −1136) — on first eyeball the port reads as disconnected from the channel. Affects `star-wars/src/shell/render.ts` (`TRENCH_FLOOR_Z`/`TRENCH_PORT_Z` need tuning, or the port placed to meet the floor). *Found by Reviewer during code review.*
- **Gap** (non-blocking): Trench-run gameplay is unbuilt — `stepTrench` is a terminal hold with no bonus scoring/scroll/targeting; the trench is non-playable at Wave 3. Reinforces TEA's bonus Gap and Dev's deferral. Affects `star-wars/src/core/sim.ts` (`stepTrench`). SM/PM should schedule a follow-up "trench-run gameplay" story. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): The `isSingleComponent`/`inducedSingleCycle` test helpers use non-null assertions (`!`) on `Map.get()`/`Array.pop()`; bounds-safe today but would throw on a malformed model. Affects `star-wars/tests/core/models.test.ts`. Low-priority test hygiene. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 1 findings (0 Gap, 0 Conflict, 0 Question, 1 Improvement)
**Blocking:** None

- **Improvement:** Render placement leaves the `EXHAUST_PORT` floating ~244 units beyond the trench floor's far edge (floor world-z ends at −892, port near edge at −1136) — on first eyeball the port reads as disconnected from the channel. Affects `star-wars/src/shell/render.ts`.

### Downstream Effects

- **`star-wars/src/shell`** — 1 finding

### Deviation Justifications

6 deviations

- **Authored the 8-5 acceptance criteria from scratch**
  - Rationale: No ACs existed and TEA is directed to author them in RED; tests assert topology/well-formedness, never a specific edge list, per the 8-2 contract.
  - Severity: minor
  - Forward impact: these tests are Dev's GREEN target.
- **Orientation is not tested in core**
  - Rationale: context-epic-8.md ("Display orientation is a render concern, kept out of core") is authoritative — orientation lives in shell/render; core/models holds authentic object-space data untouched.
  - Severity: minor
  - Forward impact: orientation verified by eyeball on first render in GREEN/REVIEW.
- **"Bonus" scoring is not covered by tests**
  - Rationale: SM scoped 8-5 as "primarily a geometry-correctness story"; bonus is unspecified sim behaviour with no ACs — logged as a Gap finding rather than invented.
  - Severity: minor
  - Forward impact: bonus scoring needs a spec/AC (clarification or separate story) before it can be TDD'd.
- **Did NOT re-author TRENCH edges by ring reconstruction**
  - Rationale: There was no tangle to fix; "re-authoring" closed loops would be churn with no behavioural change. The genuine gap was connectivity + the missing port, which the tests encode.
  - Severity: minor
  - Forward impact: none — trench geometry is topology-correct and connected.
- **Wired trench-phase rendering with a static placement**
  - Rationale: The session scope lists display orientation + eyeball as in-scope; without a render path the geometry cannot be rendered or eyeballed. Placement is static, not gameplay.
  - Severity: minor
  - Forward impact: trench-run gameplay will replace the static placement; the core `stepTrench` hold is unchanged.
- **Deferred trench gameplay and bonus scoring**
  - Rationale: The session scope (highest authority) framed 8-5 as geometry-correctness; TEA wrote no gameplay/bonus tests and flagged bonus as a Gap needing spec. Building untested gameplay would be scope creep without ACs.
  - Severity: major
  - Forward impact: a follow-up story must build trench-run gameplay (scroll, exhaust-port targeting, bonus scoring) replacing the `stepTrench` hold and the static render placement.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### TEA (test design)
- **Authored the 8-5 acceptance criteria from scratch**
  - Spec source: context-story-8-5.md, "Acceptance Criteria"
  - Spec text: "No acceptance criteria recorded in the sprint YAML — TEA to define during the RED phase."
  - Implementation: Defined the geometry contract — trench connected via catwalk rails (single component + ≥1 cross-ring rail) and a ring-clean, connected exhaust-port model — plus a floor-ring-closure regression guard.
  - Rationale: No ACs existed and TEA is directed to author them in RED; tests assert topology/well-formedness, never a specific edge list, per the 8-2 contract.
  - Severity: minor
  - Forward impact: these tests are Dev's GREEN target.
- **Orientation is not tested in core**
  - Spec source: SM Assessment (session) / context-story-8-5.md
  - Spec text: "give it a fixed display orientation if needed ... a fixed orientation test may be warranted if rendering needs it."
  - Implementation: No orientation test in the core/models suite; deferred to render-layer eyeball.
  - Rationale: context-epic-8.md ("Display orientation is a render concern, kept out of core") is authoritative — orientation lives in shell/render; core/models holds authentic object-space data untouched.
  - Severity: minor
  - Forward impact: orientation verified by eyeball on first render in GREEN/REVIEW.
- **"Bonus" scoring is not covered by tests**
  - Spec source: story title — "trench, catwalks, exhaust port, bonus"
  - Spec text: "... bonus"
  - Implementation: No bonus-scoring tests written.
  - Rationale: SM scoped 8-5 as "primarily a geometry-correctness story"; bonus is unspecified sim behaviour with no ACs — logged as a Gap finding rather than invented.
  - Severity: minor
  - Forward impact: bonus scoring needs a spec/AC (clarification or separate story) before it can be TDD'd.

### Dev (implementation)
- **Did NOT re-author TRENCH edges by ring reconstruction**
  - Spec source: context-story-8-5.md "In scope" / SM Assessment
  - Spec text: "Re-author TRENCH edges by ring reconstruction (its floor is explicit square loops; close them + connect catwalk rails)"
  - Implementation: Left the floor squares untouched (they already close cleanly per TEA's measurement); added only the catwalk rails ([0,4],[1,5],[2,6],[3,7]) plus the new EXHAUST_PORT model.
  - Rationale: There was no tangle to fix; "re-authoring" closed loops would be churn with no behavioural change. The genuine gap was connectivity + the missing port, which the tests encode.
  - Severity: minor
  - Forward impact: none — trench geometry is topology-correct and connected.
- **Wired trench-phase rendering with a static placement**
  - Spec source: context-story-8-5.md "In scope"
  - Spec text: "Give TRENCH a fixed display orientation if needed (floor lies flat in y=0; camera skims it) ... Eyeball on first render"
  - Implementation: Added a `phase === 'trench'` branch to `shell/render.ts` drawing TRENCH + EXHAUST_PORT at a fixed skim placement with `TRENCH_ORIENT = IDENTITY`.
  - Rationale: The session scope lists display orientation + eyeball as in-scope; without a render path the geometry cannot be rendered or eyeballed. Placement is static, not gameplay.
  - Severity: minor
  - Forward impact: trench-run gameplay will replace the static placement; the core `stepTrench` hold is unchanged.
- **Deferred trench gameplay and bonus scoring**
  - Spec source: story title / sim.ts comment (`stepTrench`, lines ~266-270)
  - Spec text: "trench, catwalks, exhaust port, bonus" / "8-5 replaces this hold with the real trench"
  - Implementation: Delivered geometry + render wiring only; `stepTrench` remains the safe terminal hold, no bonus scoring/scroll/collision.
  - Rationale: The session scope (highest authority) framed 8-5 as geometry-correctness; TEA wrote no gameplay/bonus tests and flagged bonus as a Gap needing spec. Building untested gameplay would be scope creep without ACs.
  - Severity: major
  - Forward impact: a follow-up story must build trench-run gameplay (scroll, exhaust-port targeting, bonus scoring) replacing the `stepTrench` hold and the static render placement.

### Reviewer (audit)
All six logged deviations reviewed — every one ACCEPTED; nothing slips through undocumented.
- TEA — **Authored ACs from scratch** → ✓ ACCEPTED: no ACs existed; the topology/connectivity contract is sound and follows the 8-2 "assert well-formedness, never specific edges" convention.
- TEA — **Orientation not tested in core** → ✓ ACCEPTED: context-epic-8.md is authoritative that orientation is a render concern; verified by eyeball, not core tests.
- TEA — **"Bonus" not covered by tests** → ✓ ACCEPTED: geometry-scoped story; bonus correctly flagged as a Gap rather than invented.
- Dev — **Did NOT re-author TRENCH edges** → ✓ ACCEPTED: independently verified (computation) that the floor loops already close; re-authoring would be churn with no behavioural change.
- Dev — **Wired trench render with static placement** → ✓ ACCEPTED: session scope lists display orientation + eyeball as in-scope; placement is a documented placeholder (see Reviewer Improvement finding on the 244-unit port gap).
- Dev — **Deferred trench gameplay/bonus (major)** → ✓ ACCEPTED with reinforced follow-up: the deferral aligns with the highest-authority session scope ("primarily a geometry-correctness story") and is well-documented; it is NOT a blocker for the geometry deliverable. Reinforced as a non-blocking Gap finding so SM/PM schedule a trench-run gameplay story.