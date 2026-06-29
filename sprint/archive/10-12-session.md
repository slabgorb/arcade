---
story_id: "10-12"
jira_key: ""
epic: "10"
workflow: "tdd"
---
# Story 10-12: True perspective projection (replace linear depth lerp) [stretch]

## Story Details
- **ID:** 10-12
- **Jira Key:** (no Jira)
- **Workflow:** tdd
- **Epic:** 10 (ROM-accurate fidelity gaps)
- **Points:** 5
- **Priority:** p3
- **Stack Parent:** none
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-29T21:14:34Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-29T20:19:55Z | 2026-06-29T20:21:46Z | 1m 51s |
| red | 2026-06-29T20:21:46Z | 2026-06-29T20:50:24Z | 28m 38s |
| green | 2026-06-29T20:50:24Z | 2026-06-29T20:58:34Z | 8m 10s |
| review | 2026-06-29T20:58:34Z | 2026-06-29T21:14:34Z | 16m |
| finish | 2026-06-29T21:14:34Z | - | - |

## Sm Assessment

**Setup complete — routing to TEA (RED phase).**

- **Story:** 10-12 True perspective projection (replace linear depth lerp) [stretch], 5 pts, p3, epic 10.
- **Repo:** tempest (TypeScript/Vite/Vitest). Trunk-based — no feature branch (repos.yaml has no `branch_strategy` for tempest, unlike star-wars/gitflow). Work commits directly to `develop`.
- **Jira:** none (local sprint YAML tracking).
- **Workflow:** tdd (phased) → setup ✓ → red (tea) → green (dev) → review → finish.
- **Merge gate:** clear (no open PRs in tempest).
- **Scope:** Replace the affine/linear depth lerp in `geometry.project` (geometry.ts:55-59, fixed FAR_RATIO 0.2) with a true perspective divide (screen-scale ∝ 1/(eye − z)) driven by the ROM vanishing point. Affects all depth rendering + apparent enemy speed; collision is lane+depth so pure-sim is unaffected — feel and tests change. Ref: context-epic-10.md Geometry, context-story-10-12.md.
- **Note for TEA/Dev:** STRETCH story sequenced after the visible-win stories. ROM is canonical per project guidance — match the cabinet's depth acceleration, don't over-tune beyond it.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Status:** RED confirmed (13 failing tests across 4 geometry files; 0 unexpected regressions; no TS compile errors). Verified via two testing-runner runs.

**Scope decision (user-confirmed):** Full perspective — `project` AND `boundaryRail` share one 1/z reparameterisation, so position, enemy size (`laneWidth`) and the flip spoke (`flipPivot`) all accelerate toward the rim together. (See Design Deviations.)

**The perspective spec the tests pin (so Dev has an exact target):**
- Endpoints unchanged: `project(d=0)` = far centre, `project(d=1)` = near centre (the rim and claw must not move). Same for `laneWidth` / `flipPivot` endpoints.
- A Tempest well is one ring scaled toward the vanishing point (tube centre / origin), so screen radius ∝ 1/(eye − z) with z linear in depth.
- **Signature invariant:** with endpoints preserved (far = near × FAR_RATIO=0.2), `1/radius(depth)` is AFFINE in depth — uniquely determined, no free magic number. This fails for the affine lerp (1/radius is convex) and passes only for a true divide.
- Consequence: depth 0.5 lands COMPRESSED toward the far centre (~1/3 radius, not the 0.6 affine midpoint); equal depth steps produce strictly growing screen steps; the last 0.1 of depth dwarfs the first 0.1 (~16× on the level-1 ring).

**Test Files:**
- `tests/core/geometry.perspective.test.ts` (NEW) — full Story 10-12 characterisation: endpoints, not-midpoint, compression, the 1/z affine invariant (project + laneWidth + flipPivot), acceleration, NaN/Infinity safety, and an authentic ROM-well check.
- `tests/core/geometry.test.ts` (UPDATED) — "depth 0.5 is the midpoint" → "compressed toward the far end".
- `tests/core/geometry.lane-width.test.ts` (UPDATED) — "interpolates linearly" → "scales by the perspective divide".
- `tests/core/geometry.flip-pivot.test.ts` (UPDATED) — "depth 0.5 is the midpoint" → "compressed toward the far vertex".

**Hardening note:** Two `laneWidth` "compressed" assertions initially used `< (w0+w1)/2`, which passed by a floating-point tie under the linear impl (wMid == affine average exactly). Tightened to `< ((w0+w1)/2)*0.9` (perspective gives ~0.56×) so RED is real, not luck. Re-verified failing.

### Rule Coverage

| Rule (TS lang-review) | Test(s) | Status |
|------|---------|--------|
| #1 type-safety escapes (`as any`/`@ts-ignore`) | whole-file scan in `geometry.lane-width.test.ts:181-184` (covers new perspective code) | covered (passing) |
| #4 null/undefined — divide-by-zero / NaN | `geometry.perspective.test.ts` "no NaN/Infinity from the denominator" (closed + open sheet, full depth range) | failing (RED) |
| Hard Architectural Boundary (no DOM/time/random in core) | whole-file scan in `geometry.lane-width.test.ts:168-179` | covered (passing) |
| #8 test quality (no vacuous assertions) | self-check: all assertions compute real values; no `let _ =`/`assert(true)` | passing |
| AC-2 documented eye/vanishing-point param | behavioural 1/z invariant (see deviation); provenance → Reviewer | failing (RED) |

**Rules checked:** the applicable TS lang-review rules for a pure geometry-math change (#1, #4, #8 + the core purity boundary). Most of the checklist (generics, enums, async, React/JSX, build config) is N/A to this change.
**Self-check:** 0 vacuous tests found.

**Handoff:** To Dev (Walter) for GREEN — factor a shared perspective reparameterisation into `project` and `boundaryRail` in `tempest/src/core/geometry.ts`. RED tests are in the working tree, uncommitted (see Delivery Findings re: branch-strategy conflict).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `tempest/src/core/geometry.ts` — promoted `FAR_RATIO` to an exported, documented projection parameter at the top; added pure `perspectiveDepth(depth)` helper (the 1/z reparameterisation); `project` and `boundaryRail` now apply it instead of the affine lerp. Removed the duplicate `FAR_RATIO` from the Wave-6 ring-building section.
- `tempest/tests/core/geometry.perspective.test.ts` (new), `geometry.test.ts`, `geometry.lane-width.test.ts`, `geometry.flip-pivot.test.ts` — TEA's RED tests (committed together with the impl; see branch note).

**Approach:** Pinning both endpoints (far = near × FAR_RATIO) under a 1/z divide yields the unique reparameterisation `t(d) = R·d / (R·d + (1−d))`, R = FAR_RATIO. Written with the `R·d + (1−d)` denominator (vs `1+(R−1)d`) so endpoints are **bit-exact** — needed because `geometry.test.ts` asserts `project(…,1)` with `toEqual` (exact). One shared helper drives position (`project`), enemy size (`laneWidth`) and the flip spoke (`flipPivot`), per the user-confirmed full-perspective scope.

**Tests:** 655/655 passing (GREEN). `tsc --noEmit` clean; `vite build` succeeds. Verified via two testing-runner runs.

**Branch:** `feat/10-12-perspective-projection` (committed `9e15a97`). **NOT pushed** — `tempest/CLAUDE.md` says "Don't commit/push unless asked"; the pf protected-branch hook forced a feature branch (resolving the strategy conflict — see Delivery Findings).

**Self-review:** Code wired to existing consumers (render.ts already calls project/laneWidth/flipPivot); follows the pure-core pattern (no DOM/time/random); all 4 ACs met; divide is NaN-safe (denominator bounded in [R, 1] over depth [0,1]).

**Handoff:** To Reviewer (The Big Lebowski) for code review.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Conflict** (non-blocking): Branch strategy is inconsistent across config sources. `tempest/CLAUDE.md` declares gitflow (default `develop`, feature branches `feat/...`, "Don't commit/push unless asked"), but `.pennyfarthing/repos.yaml` has NO `branch_strategy` for tempest (unlike star-wars), so pf treated this story as trunk-based. Affects `.pennyfarthing/repos.yaml` / `tempest/CLAUDE.md` (reconcile before any commit/PR). I left the RED tests UNCOMMITTED in the working tree to avoid pushing a failing suite onto `develop` and to honour "don't commit unless asked"; Dev/SM should resolve the strategy and decide commit/PR shape. *Found by TEA during test design.*
- **Improvement** (non-blocking): Dev should introduce ONE documented eye/vanishing-point constant for the perspective divide and derive the curve from endpoint preservation (far = near × FAR_RATIO ⇒ eye-distance ratio = 1/FAR_RATIO), citing docs/ux/2026-06-27-tempest-geometry-rom-survey.md. Per-level `lev_y3d` camera-height offset is explicitly OUT of scope (deferred per the survey's ADR). Affects `tempest/src/core/geometry.ts` (project + boundaryRail). *Found by TEA during test design.*

### Dev (implementation)
- **Conflict** (non-blocking): RESOLVES TEA's branch-strategy finding. The pf protected-branch hook BLOCKS commits to tempest `develop` ("Cannot commit to protected branch 'develop'"), enforcing gitflow/feature-branches — so sm-setup's "trunk-based" determination was wrong, and `tempest/CLAUDE.md`'s gitflow is authoritative. `.pennyfarthing/repos.yaml` should gain `default_branch: develop` + `branch_strategy: gitflow` for tempest (mirroring star-wars) so tooling matches the hook. Affects `.pennyfarthing/repos.yaml`. I committed on `feat/10-12-perspective-projection` (not pushed). *Found by Dev during implementation.*
- **Improvement** (non-blocking): Implemented TEA's eye/vanishing-point guidance — `FAR_RATIO` is now the single exported, documented projection parameter and the divide is derived from endpoint preservation. AC-2 satisfied; per-level `lev_y3d` left out of scope as advised. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): Fast-follow test hardening recommended. (a) `geometry.perspective.test.ts` "depth 0.5 sits COMPRESSED toward the far centre" — the secondary assertion `radius(p) < (radius(f)+radius(n))/2` is the float-tie pattern (passes for the old lerp by ~2.8e-14); apply the same `*0.9` margin used for laneWidth. (b) The three `reciprocalFirstDiffs` affine loops compare each element to `diffs[0]`, making the first iteration a vacuous self-comparison — iterate from `i=1`. (c) `reciprocalFirstDiffs(values: number[])` should be `readonly number[]` (lang-review #2). All non-blocking: the suite still enforces the perspective behaviour via the `dist`/`1/radius-affine` tests. Affects `tempest/tests/core/geometry.perspective.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `perspectiveDepth` (exported) has an unguarded denominator pole at `depth = 1.25`. Verified unreachable today (all call sites clamp depth to ≤1: flipper/fuseball/pulsar/tanker `Math.min(1,…)`, spiker ≤0.929, spikes ≤0.75, enemy bullets removed >1 before render), but perspective amplifies any future un-clamped depth overshoot far more than the old lerp did (depth 1.2 → t≈6 vs old 1.2). A DEV-only `RangeError` assert or a clamp would make the `[0,1]` precondition machine-enforced. Affects `tempest/src/core/geometry.ts`. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 1 findings (0 Gap, 0 Conflict, 0 Question, 1 Improvement)
**Blocking:** None

- **Improvement:** Dev should introduce ONE documented eye/vanishing-point constant for the perspective divide and derive the curve from endpoint preservation (far = near × FAR_RATIO ⇒ eye-distance ratio = 1/FAR_RATIO), citing docs/ux/2026-06-27-tempest-geometry-rom-survey.md. Per-level `lev_y3d` camera-height offset is explicitly OUT of scope (deferred per the survey's ADR). Affects `tempest/src/core/geometry.ts`.

### Downstream Effects

- **`tempest/src/core`** — 1 finding

### Deviation Justifications

2 deviations

- **Perspective extended beyond `geometry.project` to `boundaryRail` (laneWidth + flipPivot)**
  - Rationale: Story title is "True perspective projection" and the description states it "Affects all depth rendering"; the ROM survey (docs/ux/2026-06-27-tempest-geometry-rom-survey.md §1) says a well is one ring scaled by perspective toward the vanishing point — so position AND size AND spokes scale by the same 1/z. User explicitly chose this scope (Option B: "All depth projection") over the literal project-only reading.
  - Severity: minor
  - Forward impact: Dev must factor a shared perspective helper into both `project` and `boundaryRail` (not just lines 55-59). Three existing linear-assumption tests were rewritten (see assessment).
- **AC-2 ("documented eye/vanishing-point parameter") verified behaviourally, not by a named-export unit test**
  - Rationale: Pinning an exported constant name couples the test to Dev's naming and is fragile; a unit test cannot meaningfully assert a magic number "came from the ROM". The behavioural invariant is the observable consequence of the eye param.
  - Severity: minor
  - Forward impact: Reviewer should confirm the eye/vanishing-point constant is a single documented value citing the ROM survey, and that per-level `lev_y3d` camera offset stays OUT of scope (deferred per survey).

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Perspective extended beyond `geometry.project` to `boundaryRail` (laneWidth + flipPivot)**
  - Spec source: context-story-10-12.md, Problem (cites "geometry.project (geometry.ts:55-59)")
  - Spec text: "Replace the affine/linear depth interpolation in geometry.project (geometry.ts:55-59, fixed FAR_RATIO 0.2) with a true perspective divide"
  - Implementation: Tests require BOTH `project` (lane-center position) AND `boundaryRail` (rim spokes → `laneWidth` enemy size, `flipPivot`) to share one perspective reparameterisation.
  - Rationale: Story title is "True perspective projection" and the description states it "Affects all depth rendering"; the ROM survey (docs/ux/2026-06-27-tempest-geometry-rom-survey.md §1) says a well is one ring scaled by perspective toward the vanishing point — so position AND size AND spokes scale by the same 1/z. User explicitly chose this scope (Option B: "All depth projection") over the literal project-only reading.
  - Severity: minor
  - Forward impact: Dev must factor a shared perspective helper into both `project` and `boundaryRail` (not just lines 55-59). Three existing linear-assumption tests were rewritten (see assessment).
- **AC-2 ("documented eye/vanishing-point parameter") verified behaviourally, not by a named-export unit test**
  - Spec source: context-story-10-12.md, Acceptance Criteria AC-2
  - Spec text: "Vanishing-point/eye parameters sourced from the ROM or a documented approximation"
  - Implementation: No unit test asserts a specific exported constant name. Instead the "1/radius(depth) is affine in depth" invariant proves a coherent 1/z divide (i.e. a well-defined eye/vanishing-point model) governs the mapping; provenance/documentation of the constant is left to Reviewer code-inspection.
  - Rationale: Pinning an exported constant name couples the test to Dev's naming and is fragile; a unit test cannot meaningfully assert a magic number "came from the ROM". The behavioural invariant is the observable consequence of the eye param.
  - Severity: minor
  - Forward impact: Reviewer should confirm the eye/vanishing-point constant is a single documented value citing the ROM survey, and that per-level `lev_y3d` camera offset stays OUT of scope (deferred per survey).

### Dev (implementation)
- No deviations from spec. Implemented exactly the perspective divide TEA's tests pin (shared `perspectiveDepth` across `project` + `boundaryRail`, the user-confirmed full-perspective scope). The only non-obvious choice — writing the denominator as `R·d + (1−d)` rather than `1+(R−1)d` — is an algebraically identical reformulation for bit-exact endpoints, not a behavioural deviation.

### Reviewer (audit)
- **TEA: Perspective extended beyond `geometry.project` to `boundaryRail`** → ✓ ACCEPTED by Reviewer: user-confirmed scope (Option B), faithful to the ROM survey's single-ring-scaled-by-perspective model and the story's "affects all depth rendering"; the shared `perspectiveDepth` helper is the right factoring.
- **TEA: AC-2 verified behaviourally, not by a named-export unit test** → ✓ ACCEPTED by Reviewer: Dev went further and exported `FAR_RATIO` as a documented projection parameter (geometry.ts:12-18) with a derivation comment on `perspectiveDepth` (geometry.ts:20-36), so AC-2 ("documented vanishing-point/eye parameter") is satisfied by BOTH a documented constant and the behavioural 1/radius-affine invariant.
- **Dev: denominator written as `R·d + (1−d)` for bit-exact endpoints** → ✓ ACCEPTED by Reviewer: algebraically identical to `1+(R−1)d`; verified d=0→exactly 0 (zero numerator) and d=1→R/R=exactly 1, which is why the `toEqual` endpoint test passes. Sound reformulation, not a behavioural change.
- No undocumented deviations found.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (GREEN: 655/655, tsc clean, build clean, 0 smells) |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — assessed manually (depth domain [0,1] traced; pole at 1.25 unreachable) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — N/A (pure math, no error handling/fallbacks) |
| 4 | reviewer-test-analyzer | Yes | findings | 2 | confirmed 2 (both non-blocking: 1 MEDIUM float-tie, 1 LOW vacuous loop), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — assessed manually (doc comments thorough, no stale comments) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — type concerns covered by rule-checker |
| 7 | reviewer-security | Yes | findings | 1 | confirmed 1 (LOW: unguarded pole at 1.25, unreachable), dismissed 0 |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — assessed manually (minimal change, no over-engineering/dead code) |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed 1 (LOW: readonly param on test helper), dismissed 0 |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled as Skipped)
**Total findings:** 4 confirmed (1 MEDIUM, 3 LOW — all non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

The implementation is correct, minimal, pure-core compliant, well-documented, and fully GREEN (655/655). All 4 confirmed findings are non-blocking (no Critical/High per the severity policy); they are test-quality polish + one defense-in-depth note, captured as fast-follow Delivery Findings.

**Data flow traced:** `depth` (sim: enemy/bullet/spike state, all in [0,1]) → `project`/`laneWidth`/`flipPivot` → render coordinates. Safe because every call site keeps `depth ∈ [0,1]` (verified below), so the perspective denominator `1−0.8·depth` stays in `[0.2, 1]` — never the pole at 1.25.

**Pattern observed:** one shared `perspectiveDepth` reparameterisation consumed by both `project` and `boundaryRail` (geometry.ts:84-99) — consistent, DRY, and the ROM-faithful single-ring-scaled-by-perspective model.

**Error handling:** pure math, no error paths; the only failure mode is the denominator pole, which is unreachable in the current call graph (see [VERIFIED] below) and noted as a non-blocking defense-in-depth finding.

### Rule Compliance (lang-review/typescript.md)

- **#1 type-safety escapes:** compliant — no `as any`/`@ts-ignore`/`!` added (the one `open as Tube` cast is guarded by a prior `not.toBeNull()`).
- **#2 generics/readonly:** 1 LOW violation — `reciprocalFirstDiffs(values: number[])` should be `readonly number[]` (test helper, unmutated). Confirmed [RULE].
- **#3 enums / #6 React / #7 async / #9 build / #10–13:** N/A (none in diff).
- **#4 null/undefined & division:** compliant — denominator safe over [0,1] and tested for finiteness across all lanes/topologies; 1 LOW defense-in-depth note (unguarded pole at 1.25, unreachable). [SEC]
- **#5 modules/exports:** compliant — `export const FAR_RATIO` and `export function perspectiveDepth` are correct value exports; type-only imports marked; bundler resolution OK.
- **#8 test quality:** 2 findings (float-tie secondary assertion; vacuous first-iteration in affine loops) — confirmed [TEST], non-blocking.
- **Pure-core boundary (CLAUDE.md):** compliant — geometry.ts has no imports, no DOM/window/canvas, no `Date.now`/`performance.now`/`Math.random`.
- **Exported API documented:** compliant — both new exports carry thorough doc comments.

### Observations

1. `[VERIFIED]` perspectiveDepth formula correct — geometry.ts:37-39. `t=R·d/(R·d+(1−d))`; endpoints bit-exact (d=0→0, d=1→R/R=1); the unique 1/z divide pinning far=near×FAR_RATIO. Complies with the pure-core boundary.
2. `[VERIFIED]` Denominator never hits its pole — geometry.ts:38. `1−0.8d ∈ [0.2,1]` for d∈[0,1]; pole at d=1.25. Traced ALL call sites: flipper/fuseball/pulsar/tanker `Math.min(1,…)`; spiker clamps to SPIKER_TURNAROUND_DEPTH≈0.929 (rules.ts:115); spikes ≤ SPIKE_MAX_DEPTH=0.75 (rules.ts:28); enemy bullets removed when depth>1 before render (sim.ts:279); player bullets ∈[0,1]. Pole unreachable. (`[EDGE]` disabled → assessed manually.)
3. `[SEC]` LOW — exported `perspectiveDepth` has an unguarded pole at d=1.25 (security subagent). Confirmed, non-blocking: unreachable per #2; defense-in-depth only.
4. `[TEST]` MEDIUM — `geometry.perspective.test.ts` "depth 0.5 sits COMPRESSED toward the far centre": secondary assertion `radius(p) < (radius(f)+radius(n))/2` is the float-tie pattern (passes for the OLD lerp by ~2.8e-14); same defect fixed for laneWidth (`*0.9`) but missed here. Confirmed, non-blocking — the test still goes RED via `dist(p,f)<dist(p,n)` and the load-bearing 1/radius-affine test. Recommend `*0.9`.
5. `[TEST]` LOW — the three `reciprocalFirstDiffs` affine loops use `for (const d of diffs)`, so the first iteration is a vacuous self-comparison (`diffs[0]-diffs[0]=0`). 3 real checks remain per loop. Recommend iterating from `i=1`.
6. `[RULE]` LOW — `reciprocalFirstDiffs` param should be `readonly number[]` (lang-review #2).
7. `[VERIFIED]` AC "geometry tests updated" met — geometry.test.ts (midpoint), lane-width (linear), flip-pivot (midpoint) all correctly replaced with perspective expectations that fail for the old lerp.
8. `[DOC]` (disabled — assessed manually): FAR_RATIO (geometry.ts:12-17) and perspectiveDepth (geometry.ts:20-36) carry thorough, accurate doc comments; the Wave-6 comment was updated to reference the relocated constant. No stale/misleading comments.
9. `[TYPE]` (disabled — covered by rule-checker): typed signatures throughout, correct value exports, no unsafe casts. The only nit is the readonly param (#6).
10. `[SIMPLE]` (disabled — assessed manually): minimal change — one helper used in two functions; promoting FAR_RATIO removed a duplicate constant. No over-engineering or dead code.
11. `[SILENT]` (disabled — N/A): no swallowed errors/empty catches/silent fallbacks (pure math, no error handling).

### Devil's Advocate

Suppose this code is broken. The most credible attack is the perspective denominator: `1−0.8·depth` is zero at depth=1.25 and negative beyond, so any caller feeding depth≥1.25 gets `Infinity`/`NaN` coordinates with no fence downstream — silently corrupting a frame. And perspective *amplifies* overshoot: at depth 1.2 the new map returns t≈6.0 (600% past the rim) versus the old lerp's 1.2 (20% past), so a future enemy type that forgets `Math.min(1, …)` would fling its glyph far off-screen instead of nudging it slightly past the rim — a latent fragility the linear code masked. I chased this end-to-end: every current climber clamps with `Math.min(1, …)`, the spiker clamps to ≈0.929, spikes cap at 0.75, and enemy bullets are culled past depth 1 within the same sim step before any render — so today the pole is unreachable, which is why I rate it LOW rather than blocking. A second attack: does the test suite give false confidence? Yes, partially — the "compressed toward far centre" radius assertion passes for the wrong (linear) implementation by a floating-point hair, the exact trap the author fixed elsewhere. But the suite does not actually fail to catch a linear regression: the sibling `dist(p,f)<dist(p,n)` assertion and the dedicated `1/radius-affine` tests (the load-bearing AC-1 checks) fail correctly for any affine lerp, as the analyzer verified numerically. A third angle: could a subtly-wrong non-1/z curve sneak past the affine test's 1e-6 tolerance? No — true-divide deviations are ~1e-15 while any non-perspective ease deviates far more. A fourth: does this break collision/gameplay? No — `project` is render-only; collision is lane+depth, and all 644 non-geometry tests stay green. Conclusion: no production break; the residue is test-polish and one defense-in-depth note, all non-blocking.

**Subagent dispatch tags:** `[EDGE]` `[SILENT]` `[TEST]` `[DOC]` `[TYPE]` `[SEC]` `[SIMPLE]` `[RULE]` — all accounted for above (disabled specialists assessed manually).

**Handoff:** To SM (The Dude) for finish-story.