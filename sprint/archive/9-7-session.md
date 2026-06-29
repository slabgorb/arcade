---
story_id: "9-7"
jira_key: ""
epic: ""
workflow: "tdd"
---
# Story 9-7: TIE fighters scale with distance (perspective size grows on approach, not fixed)

## Story Details
- **ID:** 9-7
- **Type:** Bug
- **Points:** 2
- **Jira Key:** N/A (local issue tracking)
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** star-wars
- **Branch:** fix/9-7-tie-scale-with-distance
- **Branch Strategy:** gitflow (fix/{STORY_ID}-{SLUG})
- **Assignee:** Keith Avery

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-29T23:14:17Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-29T22:21:27Z | 2026-06-29T22:23:40Z | 2m 13s |
| red | 2026-06-29T22:23:40Z | 2026-06-29T22:48:01Z | 24m 21s |
| green | 2026-06-29T22:48:01Z | 2026-06-29T23:04:49Z | 16m 48s |
| review | 2026-06-29T23:04:49Z | 2026-06-29T23:14:17Z | 9m 28s |
| finish | 2026-06-29T23:14:17Z | - | - |

## Problem Statement

TIE fighters currently render at a **fixed on-screen size** regardless of their distance from the camera. This breaks the 3D perspective model that is core to the Star Wars arcade experience. TIEs should appear **small when far away** and **grow progressively larger as they approach** the player's cockpit, mimicking authentic perspective scaling.

**Current behavior:** A TIE at z=-1200 (spawn depth) renders the same size as one approaching at z=-100, creating a flat, non-immersive visual.

**Expected behavior:** On-screen TIE scale should be inversely proportional to distance from the camera, creating believable 3D depth.

## Technical Approach

### Analysis
- TIE scale is currently fixed in `src/shell/render.ts` (likely in the `drawWireframe` or enemy drawing routine)
- The Math Box (src/core/math3d) already provides perspective projection / MVP (Model-View-Projection) pipeline support
- Story 11-2 (camera + MVP transform pipeline) is the foundational camera/projection work; this story applies that pipeline to TIE rendering

### Implementation Path
1. **Audit current render pipeline:**
   - Trace how enemy TIEs are drawn (shell layer)
   - Identify where on-screen scale is set (likely a fixed scale constant or hardcoded multiplier)
   - Confirm that worldspace z-coordinate is available at render time

2. **Apply perspective scaling:**
   - Use the camera's projection matrix / field-of-view (FOV) to compute on-screen scale as a function of z-distance
   - Formula: `screenScale = baseScale * (FOV / z)` or similar depth-based perspective divide
   - Ensure scaling is consistent with the cockpit camera model (first-person 3D)

3. **Bounds checking:**
   - Story 9-3 (peel-away lifecycle) already bounds on-screen scale to prevent TIEs from ballooning into full-frame walls
   - Ensure perspective scaling respects those bounds (no TIE renders larger than the cabinet-equivalent near-plane limit)

4. **Testing:**
   - Unit tests confirming that TIE on-screen scale is proportional to 1/z (inverse distance)
   - Regression tests for edge cases (very close, very far, camera-aligned TIEs)
   - Visual regression: existing demo/contact sheet should show TIEs swooping in with proper perspective

### Dependencies
- **Upstream:** Story 11-2 (camera + MVP transform pipeline must be complete so the perspective math is available)
- **Parallel:** Story 9-3 (peel-away lifecycle) provides the bounding logic

### Acceptance Criteria
1. **Perspective scaling implemented:** On-screen TIE size is inversely proportional to z-distance from camera (closer TIEs are larger)
2. **Math Box integration:** Scaling uses the projection matrix / FOV from the camera pipeline (core/camera or similar), not hardcoded constants
3. **Bounded:** On-screen scale is capped to prevent TIEs from exceeding the cabinet-equivalent near-plane bound (story 9-3 intact)
4. **Deterministic:** All distance/scale calculations use deterministic math, no wall-clock time or frame-dependent effects
5. **Unit tested:** New tests confirm perspective scaling behavior; all existing tests pass
6. **No regression:** Cockpit damage, collisions, and AI flight paths unaffected

## Delivery Findings

No upstream findings.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (blocking): Pushing `SPAWN_DISTANCE` out to ~5000 puts a TIE's far
  edge (spawn + bounding radius ~334 ≈ 5334) beyond the camera `FAR` clip plane (5000),
  so the ship would be partly/fully clipped at spawn. Affects `src/shell/wireframe.ts`
  (`FAR = 5000` — raise to ~6000) and the `perspective(FOV_Y, w/h, NEAR, FAR)` call in
  `src/shell/render.ts`. *Found by TEA during test design.* (Not pinned as a core test —
  FAR is a shell render constant; kept the test file core-pure. Dev must bump it.)
- **Improvement** (non-blocking): Raising `ENEMY_SPEED` (the approach-time guard forces
  ~120→~390) may ripple into `tests/core/difficulty.test.ts`, `tie-flight.test.ts`,
  fireball-cadence and wave-ramp tests. Affects `src/core/state.ts` + any test that
  asserts on absolute enemy speed/positions. *Found by TEA during test design.*
- **Question** (non-blocking): The near-bound balloon (~165% of viewport at z=350) is
  left to story 9-3's peel-away lifecycle and is OUT OF SCOPE for 9-7. If the user wants
  the closest-approach size capped too, that's a follow-up against 9-3. Affects
  `src/core/state.ts` (`TIE_NEAR_BOUND`). *Found by TEA during test design.*

### Dev (implementation)
- **Resolved** TEA's blocking FAR finding: raised `FAR` 5000→6000 in `src/shell/wireframe.ts`.
  (Note: there is no far-plane cull today — only x/y are painted — so this is frustum hygiene
  for future depth work, not a current visual fix.) *Found by Dev during implementation.*
- **Improvement** (non-blocking): The TIE flight model's deferred "accelerate-from-rest"
  (docs/tie-flight-ai-model.md §5.1) would let close-range and far-range speeds differ, so a
  far spawn wouldn't force a single high constant speed. Until then `ENEMY_SPEED` is one
  constant trading approach-time against close-range tracking. Affects `src/core/sim.ts` /
  `src/core/state.ts`. *Found by Dev during implementation.*
- **Question** (non-blocking): The pacing (`TIE_SPAWN_DISTANCE=5000`, `ENEMY_SPEED=480` →
  ~9.7s approach) is pinned only by the ≤12s guard; the exact feel wants an eyeball in the
  running game. If it reads slow, raise `ENEMY_SPEED`; if TIEs arrive too fast, lower it.
  Affects `src/core/state.ts`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): `tests/core/tie-perspective-scale.test.ts:73` hardcodes
  `perspective(FOV_Y, 16/9, 1, 5000)` — the `5000` is now stale vs `FAR=6000`. Harmless (the
  Y-span measure is independent of near/far, and the comment says so), but a future cleanup
  could import `FAR` or drop the literal. Affects the test file only. *Found by Reviewer during code review.*
- **Question** (non-blocking): Visual feel of the ~9.7s approach at `ENEMY_SPEED=480` has NOT
  been eyeballed in the running game (the live :5274 server is the a-2 checkout). The math is
  pinned; the feel should be confirmed by playing from this checkout. Affects `src/core/state.ts`.
  *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

5 deviations

- **Reframed the defect from the SM's stated ACs after user side-by-side feedback**
  - Rationale: User provided cabinet-vs-ours screenshots (2026-06-29): "much too close to
  - Severity: minor
  - Forward impact: Dev fixes by tuning `SPAWN_DISTANCE` (+ companions ENEMY_SPEED, FAR),
- **Apparent size measured via bounding sphere, not the as-rendered silhouette**
  - Rationale: The repo convention (render.ts:69) is that orientation/scale "MUST be
  - Severity: minor
  - Forward impact: The 12% / 6× thresholds are in the (conservative) sphere measure; the
- **Near-bound balloon left out of scope (deferred to 9-3)**
  - Rationale: The user's two complaints are both about the START/RANGE, not the impact
  - Severity: minor
  - Forward impact: TIEs may still grow large just before peel-away; that's 9-3's domain.
- **Introduced a TIE-specific `TIE_SPAWN_DISTANCE` instead of raising the shared `SPAWN_DISTANCE`**
  - Rationale: `SPAWN_DISTANCE` is NOT TIE-only — it also places surface turrets (sim.ts:520)
  - Severity: minor
  - Forward impact: None negative — surface/turret behaviour and their tests are untouched.
- **Chose `ENEMY_SPEED=480` (TEA suggested ~390)**
  - Rationale: 390 sits right at the 12s edge — any later nudge to `TIE_SPAWN_DISTANCE` would
  - Severity: minor
  - Forward impact: Wave-1 TIEs travel faster in world units but over a longer path, so

## Design Deviations

No deviations recorded yet.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Reframed the defect from the SM's stated ACs after user side-by-side feedback**
  - Spec source: session AC #1/#2 ("on-screen TIE size inversely proportional to z";
    "uses the projection matrix, not hardcoded constants")
  - Spec text: "On-screen TIE size is inversely proportional to z-distance from camera"
  - Implementation: The 11-2 perspective divide ALREADY makes size ∝ 1/z (verified by the
    monotonic-growth test, which passes). The real, user-confirmed defect is different:
    TIEs spawn far too LARGE (~48% of viewport vs the cabinet's ~7%) and the size RANGE
    across the approach is too small (~3.4×). Tests therefore pin spawn apparent size
    (≤12%) and approach growth (≥6×), not a bare "∝ 1/z" relation.
  - Rationale: User provided cabinet-vs-ours screenshots (2026-06-29): "much too close to
    start with, and the motion is constrained." The 1/z math is correct; the spawn
    distance is the bug. Testing the already-passing 1/z relation would not have produced
    a RED state or fixed the user's complaint.
  - Severity: minor
  - Forward impact: Dev fixes by tuning `SPAWN_DISTANCE` (+ companions ENEMY_SPEED, FAR),
    NOT by touching the projection math. See Delivery Findings.
- **Apparent size measured via bounding sphere, not the as-rendered silhouette**
  - Spec source: session AC #1
  - Spec text: "On-screen TIE size ... (closer TIEs are larger)"
  - Implementation: Tests measure the projected bounding-sphere height (orientation-
    independent), not the exact rendered pixel silhouette (which depends on per-TIE banking
    + the TIE_ORIENT display roll).
  - Rationale: The repo convention (render.ts:69) is that orientation/scale "MUST be
    eyeballed" and escape structural tests. A bounding sphere reads identically from every
    angle, giving a stable, pure-core, deterministic measure of apparent size. Exact
    silhouette would couple the test to render orientation and be brittle.
  - Severity: minor
  - Forward impact: The 12% / 6× thresholds are in the (conservative) sphere measure; the
    visible result will read slightly smaller than the raw number suggests.
- **Near-bound balloon left out of scope (deferred to 9-3)**
  - Spec source: session AC #3 ("Bounded: on-screen scale capped ... story 9-3 intact")
  - Spec text: "On-screen scale is capped to prevent TIEs from exceeding the
    cabinet-equivalent near-plane bound"
  - Implementation: No test pins the closest-approach (near-bound) size; only the START
    size and the approach RANGE are tested.
  - Rationale: The user's two complaints are both about the START/RANGE, not the impact
    moment. The near-bound size is governed by 9-3's peel-away lifecycle (TIE_NEAR_BOUND);
    capping it here would overlap that story. Logged as a Question finding instead.
  - Severity: minor
  - Forward impact: TIEs may still grow large just before peel-away; that's 9-3's domain.

### Dev (implementation)
- **Introduced a TIE-specific `TIE_SPAWN_DISTANCE` instead of raising the shared `SPAWN_DISTANCE`**
  - Spec source: TEA Assessment "Guidance for Dev" + tests/core/tie-perspective-scale.test.ts
  - Spec text: "Primary lever: raise `SPAWN_DISTANCE` (`src/core/state.ts`) from 1200 → ~5000."
  - Implementation: Added a new `TIE_SPAWN_DISTANCE=5000` used only by `spawnTie`; left the
    shared `SPAWN_DISTANCE=1200` unchanged, and repointed the 9-7 test from `SPAWN_DISTANCE`
    to `TIE_SPAWN_DISTANCE` (thresholds untouched).
  - Rationale: `SPAWN_DISTANCE` is NOT TIE-only — it also places surface turrets (sim.ts:520)
    and anchors the Death Star surface (render.ts:104), and `tie-peel-away`/`surface-visibility`
    tests import it. Raising the shared constant would shove turrets to z=−5000 and shift the
    surface — a silent surface-phase regression. A TIE-specific constant isolates the change.
  - Severity: minor
  - Forward impact: None negative — surface/turret behaviour and their tests are untouched.
    Future TIE-spawn tuning should use `TIE_SPAWN_DISTANCE`, not `SPAWN_DISTANCE`.
- **Chose `ENEMY_SPEED=480` (TEA suggested ~390)**
  - Spec source: TEA Assessment "Companion 1" + the approach-time test (≤12s)
  - Spec text: "raise `ENEMY_SPEED` so the longer approach stays ≤12s (~120 → ~390)"
  - Implementation: Set `ENEMY_SPEED=480`, giving a ~9.7s wave-1 approach (vs the ≤12s bound).
  - Rationale: 390 sits right at the 12s edge — any later nudge to `TIE_SPAWN_DISTANCE` would
    break the guard. 480 gives comfortable margin while staying a moderate (4×) bump that
    keeps close-range tracking manageable. All speed tests are relative, so none break.
  - Severity: minor
  - Forward impact: Wave-1 TIEs travel faster in world units but over a longer path, so
    time-to-impact is similar-to-slightly-longer than before; difficulty ramp rides this base.
    Exact pacing is a tunable feel value (deferred §5.1 accel model would refine close range).

### Reviewer (audit)
- **TEA: Reframed the defect from the SM's stated ACs** → ✓ ACCEPTED by Reviewer: The 11-2
  divide is provably correct (monotonic test passes), so the user-confirmed defect (start
  size + range) is the right target. Reframing to observable thresholds was sound.
- **TEA: Apparent size measured via bounding sphere** → ✓ ACCEPTED by Reviewer:
  orientation-independent, pure-core, deterministic; correct given render.ts:69's
  "orientation/scale must be eyeballed" convention. Conservative but valid.
- **TEA: Near-bound balloon left out of scope (deferred to 9-3)** → ✓ ACCEPTED by Reviewer:
  the user's complaints are start/range; near-bound is 9-3's TIE_NEAR_BOUND domain. Correctly
  logged as a Question finding, not silently dropped.
- **Dev: TIE-specific `TIE_SPAWN_DISTANCE` instead of raising shared `SPAWN_DISTANCE`** →
  ✓ ACCEPTED by Reviewer: this is the correct call, not a shortcut — the shared constant
  also drives turrets (sim.ts:521) and surface placement (render.ts:104). Raising it would
  have silently regressed the surface phase. Repointing the test (thresholds unchanged)
  preserves the contract. Verified the split is clean (both constants used, tsc green).
- **Dev: Chose `ENEMY_SPEED=480` (TEA suggested ~390)** → ✓ ACCEPTED by Reviewer: 390 sits
  at the 12s edge; 480 gives margin and a moderate 4× bump. All speed tests are relative so
  none break (suite green). Exact pacing is a documented tunable, appropriately flagged.

## Sm Assessment

**Story nature:** A perspective-rendering bug in star-wars — TIEs render at a fixed
on-screen size instead of scaling with z-distance. 2 points, `tdd` workflow (phased).
This is a focused, well-bounded defect, not new feature surface, so TDD's red→green
loop fits: a failing test pinning "on-screen scale ∝ 1/z" drives the fix.

**Why now / dependencies:** Story 11-2 (camera + MVP transform pipeline) landed in the
most recent commits, so the projection/FOV math this fix depends on is now available in
the Math Box (`src/core/math3d` + camera). The fix should consume that pipeline rather
than introduce new hardcoded scale constants. Story 9-3 (peel-away lifecycle) already
bounds on-screen scale to keep TIEs from ballooning into full-frame walls — perspective
scaling must respect those bounds (AC #3).

**Routing:** Phased tdd workflow. Handing off to TEA (Han Solo) for the `red` phase to
author the failing perspective-scale tests against the camera/MVP pipeline. Watch for the
two known traps: (1) keep all distance/scale math deterministic — no wall-clock or
frame-dependent terms (AC #4); (2) verify the bounding from 9-3 is exercised, not bypassed.

**Setup state:** Session file complete with problem statement, technical approach, and 6
ACs. Branch `fix/9-7-tie-scale-with-distance` created and checked out in star-wars
(base: develop). No Jira (local tracking). Merge gate clear — no blocking open PRs.

Everything proceeds according to my sprint plan.

## TEA Assessment

**Tests Required:** Yes
**Reason:** Behavioral defect in on-screen perspective scaling — a pure, deterministic
core property, ideal for TDD.

**Test Files:**
- `tests/core/tie-perspective-scale.test.ts` — pins corrected TIE approach scaling

**The diagnosis (user-confirmed via cabinet side-by-side, 2026-06-29):** The 11-2 MVP
pipeline's perspective divide is working — apparent size already grows as 1/z (the
monotonic-growth test passes). The real defect is TUNING: with `SPAWN_DISTANCE=1200` and
the authentic TIE model (bounding radius ~334), a freshly-spawned TIE already subtends
**~48%** of the viewport (cabinet: ~7%), and grows only **~3.4×** across the whole
approach (cabinet: a speck swooping into a ship). User's words: "much too close to start
with, and the motion is constrained."

**Tests Written:** 4 tests covering AC #1 (perspective scaling reads as distance) and the
two user complaints (start size + approach range), plus two regression guards.
**Status:** RED — 2 failing (the new behavior), 2 passing (guards). Full suite: 2 failed,
399 passed, 0 regressions.

| Test | Status | Now → required |
|------|--------|----------------|
| spawned TIE reads as a distant ship (≤12% viewport) | **failing** | 0.48 → ≤0.12 |
| grows ≥6× across the approach (cabinet swoop-in) | **failing** | 3.43× → ≥6× |
| apparent size monotonic as it closes (11-2 guard) | passing | guard |
| approach stays playable at base speed (no crawl) | passing | guard (fails if Dev pushes spawn out w/o speed bump) |

### Rule Coverage

| Rule (lang-review/typescript.md) | Applies? | Coverage |
|------|------|----------|
| 1 Type-safety escapes (`as any`, `!`, `@ts-ignore`) | new test file: no | none used |
| 2 Generic/interface pitfalls | no new types | n/a |
| 3 Enum anti-patterns | no enums | n/a |
| 4 Null/undefined (`||` vs `??` on numerics) | watch in Dev | Dev: if defaulting tuning consts, use `??` |
| 5 Module/declaration | imports use extensionless TS (repo convention) | matches existing tests |

**Rules checked:** 5 of 5 — this is a tuning-constant + pure-test change with no new
types/constructors/enums, so most lang-review surface is n/a. The one to watch in GREEN is
rule 4 (numeric `??` vs `||`) if Dev introduces any defaulted constant.
**Self-check:** 0 vacuous tests — every test asserts a concrete numeric bound; no
`assert(true)`, no always-true comparisons.

**Guidance for Dev (Yoda):**
- Fix by TUNING, not by changing the projection math or shrinking the authentic model.
- Primary lever: raise `SPAWN_DISTANCE` (`src/core/state.ts`) from 1200 → ~5000.
- Companion 1 (test-enforced): raise `ENEMY_SPEED` so the longer approach stays ≤12s
  (~120 → ~390); watch for ripples into difficulty/flight/fireball tests.
- Companion 2 (finding-enforced, see Delivery Findings): raise `FAR` in
  `src/shell/wireframe.ts` (5000 → ~6000) so a far-spawned TIE isn't clipped.
- Re-verify the full suite stays green (the 399 must not regress).

**Handoff:** To Dev (Yoda) for the GREEN phase.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/core/state.ts` — added `TIE_SPAWN_DISTANCE=5000` (TIE-only spawn depth); bumped
  `ENEMY_SPEED` 120→480; refreshed the `SPAWN_DISTANCE` and `TIE_EXIT_RANGE` comments.
- `src/core/sim.ts` — `spawnTie` now spawns at `-TIE_SPAWN_DISTANCE` (turret spawn still
  uses the shared `SPAWN_DISTANCE`).
- `src/shell/wireframe.ts` — `FAR` 5000→6000 so a far-spawned TIE sits inside the frustum.
- `tests/core/tie-perspective-scale.test.ts` — repointed to `TIE_SPAWN_DISTANCE` (TEA's
  thresholds unchanged).

**The fix:** Pure tuning — the 11-2 perspective divide was already correct; TIEs were just
reusing the shared `SPAWN_DISTANCE=1200`, far too close for the authentic model. Splitting
out a TIE-specific spawn distance (5000) + a matching speed bump (so the longer approach
isn't a crawl) makes a fresh TIE read as a distant speck (~48% → ~12% of the viewport) that
grows ~14× as it bears down. The authentic geometry and the projection math are untouched.

**Tests:** 401/401 passing (GREEN). The 4 perspective tests pass; the other 397 unchanged.
`tsc --noEmit` clean. Zero regressions (turrets/surface/peel-away all green).

**Visual note (not eyeballed by Dev):** Per repo convention, on-screen scale "MUST be
eyeballed" and escapes structural tests; the math is pinned but the *feel* of the ~9.7s
approach at speed 480 is a judgment best made in the running game. The live :5274 server is
the **a-2** checkout, not this one, so it does NOT show this change — to see it, serve from
this checkout / pull the branch. Pacing is a tunable value if it reads too slow/fast.

**Branch:** `fix/9-7-tie-scale-with-distance` (pushed to origin).

**Handoff:** To the verify phase (TEA — simplify + quality pass), then Reviewer.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 401/401 tests, lint clean, tree clean, 0 smells | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer ([EDGE] below) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer ([SILENT] below) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — test quality covered by rule-checker (rule 8) + Reviewer ([TEST]) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer ([DOC] below) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — types covered by rule-checker (rules 1-2) + Reviewer ([TYPE]) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — covered by rule-checker (rule 10) + Reviewer ([SEC]) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer ([SIMPLE] below) |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 38 instances across 13 rules + purity boundary; 3 non-blocking advisories | confirmed 0, dismissed 0, deferred 3 advisories |

**All received:** Yes (2 enabled returned clean; 7 disabled via `workflow.reviewer_subagents`, domains self-covered)
**Total findings:** 0 confirmed blocking, 0 dismissed, 3 non-blocking advisories (all benign — see Rule Compliance)

## Reviewer Assessment

**Verdict:** APPROVED

A focused, well-bounded tuning fix. The 11-2 perspective divide was already correct; the
defect was that TIEs reused the shared `SPAWN_DISTANCE=1200` (far too close for the
authentic ±208/radius-334 model), so a fresh fighter filled ~48% of the viewport and grew
only ~3.4× across the approach. The fix introduces a TIE-specific `TIE_SPAWN_DISTANCE=5000`
(leaving the shared constant for turrets/surface), scales `ENEMY_SPEED` so the longer
approach stays ~9.7s, and widens `FAR` for frustum hygiene. Result: spawn ~12%, growth
~14×. Authentic geometry and projection math untouched. 401/401 green, tsc clean.

**Data flow traced:** `spawnTie` (sim.ts:601) places a TIE at `[x, y, -TIE_SPAWN_DISTANCE]`
with `x,y` from the seeded `nextFloat(rng)` → `vel = scale(toCockpit(pos), speed)` →
each frame `moveEnemy` advances it → render projects it via `MVP = perspective × view ×
model`. The new spawn depth flows through the existing deterministic pipeline; no new time
or randomness source enters. Safe.

**Observations:**
- [VERIFIED] Core/shell purity intact — `spawnTie` randomness is the seeded `nextFloat(rng)`
  (sim.ts:599-600), no `Math.random`/`Date.now`/DOM added; `state.ts` adds only numeric
  constants. Complies with star-wars CLAUDE.md "sacred boundary". Corroborated by [RULE]
  rule-checker rule 14 (8 instances, 0 violations).
- [VERIFIED] TIE/turret separation is correct — `spawnTie` uses `TIE_SPAWN_DISTANCE`
  (sim.ts:601) while `spawnTurret` still uses `SPAWN_DISTANCE` (sim.ts:521), so the surface
  phase is unmoved. Both constants remain imported and used (no dead import; tsc clean).
- [TEST] All 4 new tests are non-vacuous (rule-checker rule 8): each asserts a concrete
  numeric bound that fails under the old constants (spawn 0.48 vs ≤0.12; growth 3.4× vs ≥6×;
  approach 39s vs ≤12s at old speed). Thresholds keyed to the constants, so they survive
  retuning. Confirmed against `tie-perspective-scale.test.ts:78-113`.
- [DOC] Comment updates are accurate: the `TIE_EXIT_RANGE` rewrite (state.ts:179-184)
  correctly states the cull is gated on the peel latch — matches `sim.ts:139`
  `!(e.peeling && length(e.pos) > TIE_EXIT_RANGE)`, so a fresh non-peeling TIE at z=5000 is
  never culled. The `SPAWN_DISTANCE` and `FAR` comments are also correct.
- [SIMPLE] Minimal change — 3 constants + a one-line spawn swap + a test. No abstraction,
  no dead code, no over-engineering. The TIE-specific constant is necessary (sharing caused
  the coupling), not gratuitous.
- [TYPE] No type-safety escapes; constants are plain `number`, spawn keeps the explicit
  `Vec3` annotation (rule-checker rules 1-2, 0 violations).
- [EDGE] Boundary check: `TIE_NEAR_BOUND(350) < TIE_SPAWN_DISTANCE(5000)` so the
  spawn→near range is positive and the growth/monotonic math is well-formed; `ENEMY_SPEED`
  stays positive so approach-time is finite. No new divide-by-zero or inverted-range path.
- [SILENT] No new error paths, try/catch, or fallbacks introduced — nothing to swallow.
- [SEC] No security surface — client-only game, no user input/network/JSON.parse in the
  diff (rule-checker rule 10 N/A).

**Advisories (non-blocking, deferred):**
1. `tie-perspective-scale.test.ts:73` hardcodes `perspective(..., 1, 5000)` while `FAR` is
   now 6000. Mathematically irrelevant to the Y-span measure (y-NDC = f·y/z, independent of
   near/far) and the comment says so. Worth a future cleanup, not a correctness issue.
2. ENEMY_SPEED 120→480 could in principle break a test asserting the numeric `120` — but the
   full suite is green (401/401), so none does. Resolved.
3. `tsconfig skipLibCheck: true` — pre-existing, not introduced by this PR.

### Rule Compliance (TypeScript lang-review + star-wars purity boundary)

| Rule | Applicable instances in diff | Verdict |
|------|------|---------|
| 1 Type-safety escapes | 7 (3 consts, Vec3 lit, test helpers) | compliant — no casts/`!`/ts-ignore |
| 2 Generic/interface pitfalls | 3 | compliant — `number[]` local accumulator is intentional |
| 3 Enum anti-patterns | 0 | N/A — no enums |
| 4 Null/undefined (`??` vs `||`) | 4 | compliant — no defaulting introduced; `modelBounds` returns non-optional |
| 5 Module/declaration | 6 imports | compliant — runtime values, bundler resolution (no `.js` ext needed) |
| 6 React/JSX | 0 | N/A — no .tsx |
| 7 Async/Promise | 0 | N/A — all synchronous |
| 8 Test quality | 4 tests | compliant — non-vacuous, no `as any`, no dist/ imports |
| 9 Build/config | 0 | N/A — tsconfig untouched |
| 10 Security input validation | 0 | N/A — no user input/network |
| 11 Error handling | 0 | N/A — no try/catch added |
| 12 Performance/bundle | 5 imports | compliant — selective named imports, no barrels |
| 13 Fix-introduced regressions | 4 | compliant — turret/TIE split intentional, suite green |
| 14 Core/shell purity (star-wars) | 8 | compliant — seeded RNG only, no DOM/time, constants single-sourced in state.ts |

### Devil's Advocate

Let me argue this is broken. First: pushing the spawn to 5000 with a constant `ENEMY_SPEED`
means a TIE is a near-invisible speck for most of a ~9.7s approach — could a player perceive
the game as "empty" or unresponsive, or fail to hit a 12%-tall target? But the cabinet does
exactly this (the user's reference shows a ~7% speck), `TIE_HIT_RADIUS=250` keeps a distant
TIE generously hittable in 3D, and the lock-on (LOCK_RADIUS_NDC) is resolution-independent —
so distant targeting still works; this is a feel-tuning value, logged as a Dev Question, not
a bug. Second: does the wider `FAR=6000` distort depth or clip the near scene? No — `FAR`
feeds only the projection's z-row; there is no far-plane cull and only x/y are painted, so
nothing visible changes (verified: `project()` returns only `[x,y]`; `wireframe.ts` clips
near only). Third: could the 4× `ENEMY_SPEED` make close-range TIEs whip across the screen
untrackably? They peel at `TIE_NEAR_BOUND=350` and the difficulty ramp already multiplied
speed before; the deferred §5.1 accel model is the real long-term fix and is flagged. Fourth:
could a TIE spawn beyond `TIE_EXIT_RANGE=1800` and be wrongly culled on arrival? No — the
cull is gated on `e.peeling`, and a fresh TIE isn't peeling (verified sim.ts:139, peel latch
sim.ts:564). Fifth: does changing `ENEMY_SPEED` silently break a sibling test asserting the
literal 120? The full suite is green (401/401), and all speed tests import the constant
relatively. Sixth: the test hardcodes `far=5000` not 6000 — but the Y measure is provably
independent of far. No avenue of attack lands a blocking flaw. The change is sound.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.