---
story_id: "8-11"
jira_key: ""
epic: ""
workflow: "tdd"
---
# Story 8-11: Fix Wave 2 Death Star surface geometry not visible during gameplay

## Story Details
- **ID:** 8-11
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** tdd
- **Stack Parent:** none (depends on 8-8, already merged)
- **Points:** 3
- **Priority:** p1
- **Type:** bug
- **Repo:** star-wars

## Branch Strategy
**Branch Strategy:** gitflow (feat/8-11-fix-wave2-deathstar-surface)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-28T18:37:43Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-28T18:09:53Z | 2026-06-28T18:11:42Z | 1m 49s |
| red | 2026-06-28T18:11:42Z | 2026-06-28T18:22:04Z | 10m 22s |
| green | 2026-06-28T18:22:04Z | 2026-06-28T18:26:32Z | 4m 28s |
| review | 2026-06-28T18:26:32Z | 2026-06-28T18:37:43Z | 11m 11s |
| finish | 2026-06-28T18:37:43Z | - | - |

## Sm Assessment

**Story:** 8-11 — Fix Wave 2 Death Star surface geometry not visible during gameplay (P1 bug, 3 pts, star-wars, tdd).

**What this is:** During Wave 2 (the Death Star surface phase, between TIE fighters and the trench run), the surface geometry never appears on screen. Turrets spawn and scroll correctly, but the floor/surface they sit on is invisible.

**Root cause (from setup research):** `DEATH_STAR_SURFACE` is rendered at Z=0 in `src/shell/render.ts` (~lines 88–90), i.e. at the cockpit/camera origin — at or behind the near clip plane (NEAR=1), so every vertex is clipped away. The core sim and the geometry definition are correct; this is a shell/render-layer placement bug. Turrets are correctly placed ahead at Z=-1200 and scroll toward the camera; the surface needs an analogous Z-placement so it's both visible and spatially aligned with the turrets. Mirrors the altitude/placement fix already done for turrets in 8-8 (merged).

**Approach:** Add a Z-placement so the surface sits ahead of the camera and aligned with the turret floor, rather than at Z=0. Context file `sprint/context/context-story-8-11.md` carries AC-1 (surface visible during Wave 2), AC-2 (turret/surface spatial alignment), and AC-3 (live Wave 2 eyeball).

**Routing:** Phased TDD. Handing to TEA for the RED phase — failing unit tests around surface-phase placement plus a live Wave 2 integration eyeball. No blockers; dependency 8-8 already merged. Branch `feat/8-11-fix-wave2-deathstar-surface` is cut on star-wars/develop.

That's just, like, my assessment, man. Route it.

## TEA Assessment

**Tests Required:** Yes
**Reason:** P1 render-visibility bug with a concrete, projectable contract — exactly the kind of seam TDD pins.

**Test Files:**
- `star-wars/tests/core/surface-visibility.test.ts` — 8 tests, RED. Drives a new pure render export `surfacePlacement(state) -> { floor: Vec3 }` (mirrors `trenchPlacement`), asserted through the REAL projection math (`perspective`/`project`/`SURFACE_ORIENT`) and the REAL `DEATH_STAR_SURFACE` geometry + sim constants — no hard-coded magic numbers.

**Tests Written:** 8 tests covering AC-1 (visibility) and AC-2 (turret alignment):
- export shape + finite Vec3 floor
- purity / determinism (same state → same placement) — the sacred core/shell boundary
- altitude framing preserved (`floor[1] === -altitude`) at two altitudes
- altitude 0 read verbatim (falsy-but-valid; guards a `||` default — TS rule #4)
- floor placed ahead of the near plane (`floor[2] < -NEAR`), never the buggy Z=0
- the WHOLE surface projects in front of the cockpit (all 16 vertices, none clipped) — the crux
- strictly more visible than the buggy Z=0 placement (pins the bug, guards regression)
- floor geometry seats inside the turret band (-SPAWN_DISTANCE, -NEAR) AND extends beyond it (AC-2: no floating turrets / no slab that stops short)

**Status:** RED — 8 failing (`surfacePlacement is not a function`); all 264 existing tests still green; zero collateral breakage. `tsc` is red on the missing export (documented RED convention).

### Rule Coverage

No `.pennyfarthing/gates/lang-review/typescript.md` rule has a per-line trigger in a test-only diff, but the applicable ones are covered by design:

| Rule | Test(s) | Status |
|------|---------|--------|
| #4 null/undefined (`||` vs `??` on falsy-valid) | `reads a grounded ship (altitude 0) verbatim` | failing (RED) |
| #8 test quality (no `as any`, meaningful asserts) | whole file — every test has a substantive assertion; no casts, no `let _ =`, no `assert(true)` | n/a (self-check clean) |
| Sacred boundary (purity/determinism) | `is a pure function of state` | failing (RED) |

**Rules checked:** 3 of 3 applicable lang-review rules have coverage (the rest — React/JSX, async, enums, error handling — don't apply to a pure geometric placement test).
**Self-check:** 0 vacuous tests found. No `as any`, no double-casts, no always-`null`/`true` assertions; the visibility tests count real projected vertices.

**Handoff:** To Dev (Walter) for the GREEN implementation — add `surfacePlacement` and wire `render()`'s surface branch. Heed the Delivery Finding: pick `Z_SURFACE_PLACEMENT` in ~(-7920, -6721), NOT the spec's literal ≈ -1200.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `star-wars/src/shell/render.ts` — added pure exported `surfacePlacement(state) -> { floor: Vec3 }` (mirrors `trenchPlacement`) and `Z_SURFACE_PLACEMENT` (derived: model near-extent + SPAWN_DISTANCE/2 = 7320); wired `render()`'s surface branch to consume it instead of the hard-coded `[0, -altitude, 0]`; imported `SPAWN_DISTANCE`.

**The fix:** The floor was drawn at Z=0, so the deep relief (+6720 near extent, Z-roll orientation) straddled the cockpit — its detailed near rings clipped behind the near plane. `surfacePlacement` shifts the whole relief forward to Z=-7320: the near ring lands at world Z=-600 (inside the turret band), the rest recedes ahead to the horizon, and the altitude-skim Y framing (`-state.altitude`) is preserved untouched.

**Tests:** 272/272 passing (GREEN) — the 8 new `surface-visibility` contract tests plus all 264 prior tests; zero regressions. `tsc --noEmit` (npm run lint) clean.

**Heeded TEA's finding:** picked Z in the valid window, NOT the spec's shallow ≈ -1200 (which TEA proved leaves the near rings clipped).

**Not done (by design):** AC-3 live Wave 2 eyeball — deferred to Reviewer (the shell is verified by running the game; the math contract is fully green). See Dev delivery findings.

**Branch:** `feat/8-11-fix-wave2-deathstar-surface` (pushed to origin).

**Handoff:** To Reviewer (The Big Lebowski) for code review + the live Wave 2 eyeball.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 272/272 tests, tsc clean, 0 smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — I covered edges myself ([EDGE] below) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — no error paths in a pure fn ([SILENT] below) |
| 4 | reviewer-test-analyzer | Yes | findings | 8 | confirmed 8 (all Low/Med, non-blocking); dismissed 1 sub-suggestion (line 89 → toBe(0), breaks on -0) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — I checked comments myself ([DOC] below) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — I checked types myself ([TYPE] below) |
| 7 | reviewer-security | Yes | clean | none | N/A — client geometry, no input surface |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — I noted the one redundancy ([SIMPLE] below) |
| 9 | reviewer-rule-checker | Yes | clean | none (0 violations) | N/A — 13 lang-review rules + 3 architectural rules all compliant |

**All received:** Yes (4 enabled returned; 5 disabled via `workflow.reviewer_subagents` settings)
**Total findings:** 8 confirmed (all Low/Medium test-quality, non-blocking), 1 sub-suggestion dismissed (with rationale), 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

**The fix works — confirmed live, not just on paper.** This is a "not visible during gameplay" bug, so I drove the REAL `render()` into a populated surface phase (throwaway harness, this checkout served on a free port, since 5274 was held by another checkout) and screenshotted it. The Death Star surface now renders: the steel-blue relief recedes correctly to a vanishing point on the horizon, the near ring sits just below the crosshair, and the red turrets stand on the floor plane. `surfacePlacement(surface()).floor` reported `[0, -120, -7320]` in-browser, matching the unit contract. Before this fix the floor was drawn at Z=0 and nothing showed. **AC-1 (surface visible) and AC-2 (turrets on the surface) are visually confirmed; AC-3 (live eyeball) is satisfied.**

**Data flow traced:** `state.altitude` (core sim) → `surfacePlacement` → `floor: [0, -altitude, -Z_SURFACE_PLACEMENT]` → `drawWireframe` → `project()` → canvas. Z is a module constant (`SURFACE_NEAR_EXTENT + SPAWN_DISTANCE/2 = 7320`, derived from the model); only Y varies with sim state. Safe and pure.

**Pattern observed:** `surfacePlacement` mirrors the established `trenchPlacement` seam (render.ts:72-74 vs 85-88) — a pure, exported, state-derived placement function. Consistent with the repo's render-placement convention.

**Error handling:** No throw/catch paths — it's a pure arithmetic function. Edge inputs (negative/huge altitude) are clamped upstream by the sim (`surface.test.ts` pins `altitude >= 0`); `Math.max(...DEATH_STAR_SURFACE.vertices...)` runs once at module load on a fixed 16-vertex const (never empty, never user-influenced).

### Observations (tagged by source)

- `[VERIFIED]` `surfacePlacement` is pure and respects the core/shell boundary — render.ts:72-74 reads `state.altitude` only, no DOM/time/random, returns a placement (not sim math); shell→core import of `SPAWN_DISTANCE` is the allowed direction. Complies with star-wars CLAUDE.md sacred boundary.
- `[VERIFIED]` altitude-0 handled with no default — render.ts:73 `-state.altitude` (direct negation, no `|| SKIM_ALTITUDE`); altitude 0 → floor[1] 0. Complies with lang-review #4. Corroborated by rule-checker.
- `[VERIFIED]` Z placement is correct AND on-screen — live eyeball: floor `[0,-120,-7320]`, surface fills the view and recedes to horizon, turrets seated. (Unit tests prove "in front of camera"; the eyeball adds the on-screen + orientation confirmation they can't.)
- `[SEC]` No security findings (reviewer-security clean) — client-only geometry, no user input reaches the new code, fixed-const spread is safe.
- `[RULE]` Zero violations (reviewer-rule-checker) — 13 lang-review TypeScript checks + 3 architectural rules, all compliant; `Z_SURFACE_PLACEMENT` single-sourced from the model + core constant.
- `[TEST]` 8 test-quality observations (reviewer-test-analyzer), all Low/Medium, none hide a bug: vacuous/redundant assertions (surface-visibility.test.ts:64 shape test, :71 tautological purity, :89 wrapped comparison, :90 redundant `not.toBe`, :109 `visibleCount===16` duplicates the per-vertex loop, :117 weak `fixed>buggy`) and 2 coverage gaps (:77 no floor[2] altitude-independence assertion, :132 `.some()` is one-vertex-weak). **Crucially, the suite as a whole DOES guard the bug** — it was RED (8 failing) pre-fix and GREEN post-fix because tests :89-109 and the turret-zone test genuinely fail at Z=0. The flagged tests are low-VALUE, not wrong. Non-blocking; recommend a quick polish (see delivery findings). **Dismissed** test-analyzer's line-89 suggestion to use `.toBe(0)`: `-state.altitude` at altitude 0 yields `-0`, and `toBe` uses `Object.is(-0, 0) === false`, so `.toBe(0)` would FAIL — the existing `=== 0` form is intentional and correct (rule-checker concurred).
- `[SIMPLE]` (subagent disabled) — my own pass: the only redundancy is the :106-109 per-vertex loop + `visibleCount===16` equivalence (project() nulls iff z>=-NEAR; the Z-roll orient leaves z). Cosmetic.
- `[EDGE]` (subagent disabled) — my own pass: negative/huge altitude clamped by sim; empty-model impossible (16-vertex const); non-surface phases (`space`/`trench`) untouched by the diff (264 prior tests still green). No edge defects.
- `[SILENT]` (subagent disabled) — my own pass: no swallowed errors — the new code has no try/catch, no fallback, no Promise. N/A.
- `[DOC]` (subagent disabled) — my own pass: the new comments (render.ts:54-61, 65-71) accurately describe the bug and fix; the old surface-branch comment was correctly updated from "drops away as the ship climbs" to also cover the Z placement. No stale docs.
- `[TYPE]` (subagent disabled) — my own pass: `surfacePlacement(state: GameState): { floor: Vec3 }` is fully typed; `Vec3` is a readonly tuple; the return shape mirrors `trenchPlacement`. No stringly-typing, no unsafe cast.

### Rule Compliance (lang-review/typescript.md + star-wars CLAUDE.md)

| Rule | Governed instances | Verdict |
|------|--------------------|---------|
| #1 type-safety escapes | render.ts:62-74, test imports/helpers | Compliant — no `as any`/`@ts-ignore`/`!` |
| #2 generics/interfaces | `surfacePlacement(state: GameState)`; test `Partial<GameState>` factory | Compliant — `state` un-`Readonly` matches existing `trenchPlacement`/`render` convention; factory provides all required fields first |
| #4 null/undefined (`||` vs `??`) | render.ts:73 `-state.altitude` | Compliant — direct negation; 0 is read verbatim (the whole point of 8-11) |
| #5 module/declaration | render.ts:9 import, :72 export; 7 test imports | Compliant — value/type split correct; no `.js` (project-wide convention) |
| #8 test quality | surface-visibility.test.ts (8 tests) | Compliant — no `as any`, no `vi.mock`, imports from `src/` not `dist/`; assertions meaningful (low-value ones flagged as observations, not violations) |
| #12 perf/bundle | render.ts:62 `Math.max(...vertices)` | Compliant — computed once at module load, fixed-size const, not in render hot path |
| #13 fix-introduced regressions | render.ts:63,73,112 | Compliant — fix adds no `as any`, no `||` default, no type widening |
| ARCH core/shell boundary | render.ts import + `surfacePlacement` | Compliant — shell consumes core state, does placement not sim math; mirrors `trenchPlacement` |
| #3/#6/#7/#9/#10/#11 | — | N/A — no enums/JSX/async/config/input-validation/error-handling in diff |

### Devil's Advocate

Try to prove this is broken. **First swing — the geometry overflows the frustum.** The surface model is 10 560 units deep but FAR is only 5000; shifted to Z=-7320, the far rings land at world Z ≈ -11 000, well past FAR. `project()` only culls on NEAR, so they still stroke. Is that a clutter/z-fighting bug? The live eyeball says no — the far geometry converges cleanly to the vanishing point and reads as the horizon, exactly what a receding floor should do. No z-fighting visible. (TEA and Dev both pre-flagged this as an eyeball question; the eyeball clears it.) **Second swing — turret seating during scroll.** Turrets scroll their own Z from -1200 toward 0 while the surface is a STATIC model with rings at world Z ≈ {-600, -1320, -8240, -9920, -11160}. There's a ~7000-unit gap between the near rings (-1320) and the next ring (-8240), bridged only by longitudinal struts. A turret scrolling through, say, Z=-4000 rests on a strut, not a ring, and could read as slightly floating over sparse lines. But this is a property of the authentic 16-vertex model's density, not of this Z-placement fix; AC-2's contract (geometry in the band AND beyond) holds, and the eyeball showed turrets seated. I'll carry it as a non-blocking eyeball note. **Third swing — a confused future maintainer couples Z to altitude.** The test suite inspects only floor[1] across altitudes and only renders visibility at the default altitude, so `floor:[0,-alt,-(Z_BASE+alt)]` would pass everything yet clip the surface at altitude 0 (test-analyzer finding #7). Real risk today? Zero — `floor[2]` is a pure constant. It's a future-regression gap, not a present defect, and it's non-blocking. **Fourth — does it crash on weird state?** Negative/huge altitude is sim-clamped; the model const is never empty; other phases are untouched. No throw path exists. **Conclusion:** every swing lands on either an authentic-model property already noted for the eyeball, or a non-blocking test-strengthening opportunity. No Critical/High defect. The fix is correct and the bug is genuinely resolved.

**Verdict rationale:** Production code is clean across all four enabled specialists and my own five-lens pass; the bug is confirmed fixed by live eyeball; the only findings are Low/Medium test-quality polish that does not undermine the suite's bug-guarding power. No Critical/High → APPROVE.

**Handoff:** To SM (The Dude) for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): The context-story's suggested Z placement (≈ -SPAWN_DISTANCE = -1200) is too shallow to fix the bug. Affects `star-wars/src/shell/render.ts:89` (the new `surfacePlacement`). DEATH_STAR_SURFACE's near rings reach object Z +6720 and SURFACE_ORIENT is a Z-roll (Z unchanged), so a -1200 floor leaves those rings at world Z +5520/+4800 — still behind the cockpit and clipped. DEV should pick `Z_SURFACE_PLACEMENT` so the +6720 near extent clears the near plane: roughly the window **(-7920, -6721)** keeps the whole surface ahead AND seats its near rings in the turret band. *Found by TEA during test design.*
- **Question** (non-blocking): The visible surface will extend past FAR (5000) — the far rings land at world Z ≈ -10 000 once shifted forward. `project()` only culls on NEAR, not FAR, so they still stroke (reading as terrain receding to the horizon). If that far-field clutter looks wrong on the live eyeball (AC-3), a FAR cull or a shorter model is a follow-up, not part of this fix. *Found by TEA during test design.*

### Dev (implementation)
- **Question** (non-blocking): AC-3 (live Wave 2 eyeball) is unverified by Dev — the structural/projection contract is fully green (272/272) but orientation, scale, and "reads as a convincing skimmable floor" cannot be unit-tested (per star-wars CLAUDE.md: the shell is verified by running the game). Affects `star-wars/src/shell/render.ts` (surface branch). Reviewer should clear Wave 1's 6-TIE quota, enter the surface phase, and confirm the floor reads, turrets stand on it (not floating), and altitude control moves the floor — and judge TEA's FAR-clutter question on the real screen. *Found by Dev during implementation.*
- **Improvement** (non-blocking): Settled `Z_SURFACE_PLACEMENT = 7320` (floor Z = -7320), seating the +6720 near ring at world Z = -600 (mid turret band) with comfortable margins from both contract boundaries (-6721 / -7920). If the eyeball wants the floor nearer or further, that one const is the single knob to turn. Affects `star-wars/src/shell/render.ts`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): Test-quality polish opportunity in the new suite. Affects `star-wars/tests/core/surface-visibility.test.ts` — per reviewer-test-analyzer: add a `floor[2]` altitude-independence assertion (closes the only real coverage gap, line 77), drop the redundant `visibleCount===16` (line 109, entailed by the per-vertex loop) and `not.toBe(-SKIM_ALTITUDE)` (line 90, entailed by `===0`), and consider a count-threshold instead of `.some()` for the turret-zone test (line 132). The suite already guards the bug (RED→GREEN), so this is cleanup, not a fix. *Found by Reviewer during code review.*
- **Question** (non-blocking): The Death Star surface is a STATIC, sparse 16-vertex model; with the new placement its rings land at world Z ≈ {-600, -1320, -8240, ...}, leaving a ~7000-unit gap bridged only by longitudinal struts. As turrets scroll their own Z (-1200→0), a turret passing through that gap rests on a strut rather than a ring and may read as slightly floating. This is authentic-model density, not a flaw in the Z fix — worth an eyeball during real scroll; a denser surface would be a separate story. Affects `star-wars/src/core/models.ts` (DEATH_STAR_SURFACE). *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 1 findings (0 Gap, 0 Conflict, 1 Question, 0 Improvement)
**Blocking:** None

- **Question:** The Death Star surface is a STATIC, sparse 16-vertex model; with the new placement its rings land at world Z ≈ {-600, -1320, -8240, ...}, leaving a ~7000-unit gap bridged only by longitudinal struts. As turrets scroll their own Z (-1200→0), a turret passing through that gap rests on a strut rather than a ring and may read as slightly floating. This is authentic-model density, not a flaw in the Z fix — worth an eyeball during real scroll; a denser surface would be a separate story. Affects `star-wars/src/core/models.ts`.

### Downstream Effects

- **`star-wars/src/core`** — 1 finding

### Deviation Justifications

3 deviations

- **Tests drive a new pure `surfacePlacement(state)` render export rather than an inline constant**
  - Rationale: `render()` touches a canvas context and cannot be unit-tested; extracting a pure placement seam is the only way to assert the fix without an eyeball, and it matches the established Wave 3 (`trenchPlacement`) pattern the reviewer already accepted.
  - Severity: minor
  - Forward impact: DEV must expose `surfacePlacement` and wire `render()`'s surface branch to consume it (one-line change at render.ts:89).
- **Tests require the WHOLE surface ahead of the near plane, a stronger reading of "in front of the near clip plane"**
  - Rationale: The model is 10 560 units deep (+6720 near extent); a shallow z ≈ -SPAWN_DISTANCE placement leaves the detailed near rings clipped behind the cockpit — i.e. it does NOT fix the reported bug. The stronger contract forces a placement that actually reveals the floor under the player. See the matching Delivery Finding.
  - Severity: minor
  - Forward impact: Z_SURFACE_PLACEMENT must land roughly in (-7920, -6721), not at the spec's literal ≈ -1200 suggestion.
- **Z_SURFACE_PLACEMENT derived from the model, not a hardcoded literal**
  - Rationale: The contract IS "shift the relief so its +Z near end clears the cockpit and sits in the turret band." Encoding that relationship directly tracks the geometry — if the authentic model is re-authored (as it was in 8-4/8-10), the placement follows instead of silently going stale. Still a single const, no abstraction.
  - Severity: minor
  - Forward impact: none — a future model edit auto-adjusts the placement; the TEA contract (whole surface ahead, near ring in the turret band) still pins the valid window.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Tests drive a new pure `surfacePlacement(state)` render export rather than an inline constant**
  - Spec source: context-story-8-11.md, "Technical Approach" AC-1
  - Spec text: "Modify `src/shell/render.ts` (line 89–90) to calculate the surface's world position from sim state or a fixed Z offset ... Use a fixed Z placement like `[0, -state.altitude, -Z_SURFACE_PLACEMENT]`"
  - Implementation: The RED suite requires a pure, exported `surfacePlacement(state) -> { floor: Vec3 }` (mirroring the existing `trenchPlacement`), not an inline literal inside `render()`.
  - Rationale: `render()` touches a canvas context and cannot be unit-tested; extracting a pure placement seam is the only way to assert the fix without an eyeball, and it matches the established Wave 3 (`trenchPlacement`) pattern the reviewer already accepted.
  - Severity: minor
  - Forward impact: DEV must expose `surfacePlacement` and wire `render()`'s surface branch to consume it (one-line change at render.ts:89).
- **Tests require the WHOLE surface ahead of the near plane, a stronger reading of "in front of the near clip plane"**
  - Spec source: context-story-8-11.md, AC-1 item 1–2
  - Spec text: "Places it in front of the near clip plane (z < -NEAR). Aligns spatially with turret spawning and scrolling (z ≈ -SPAWN_DISTANCE or deeper ...)"
  - Implementation: The suite asserts ALL 16 surface vertices project in front of the cockpit AND that floor geometry falls inside the turret band (-SPAWN_DISTANCE, -NEAR), not merely "some of it is in front."
  - Rationale: The model is 10 560 units deep (+6720 near extent); a shallow z ≈ -SPAWN_DISTANCE placement leaves the detailed near rings clipped behind the cockpit — i.e. it does NOT fix the reported bug. The stronger contract forces a placement that actually reveals the floor under the player. See the matching Delivery Finding.
  - Severity: minor
  - Forward impact: Z_SURFACE_PLACEMENT must land roughly in (-7920, -6721), not at the spec's literal ≈ -1200 suggestion.

### Dev (implementation)
- **Z_SURFACE_PLACEMENT derived from the model, not a hardcoded literal**
  - Spec source: context-story-8-11.md, "Technical Approach" AC-1 / Notes
  - Spec text: "Use a fixed Z placement like `[0, -state.altitude, -Z_SURFACE_PLACEMENT]` where Z_SURFACE_PLACEMENT is a single-sourced constant"
  - Implementation: `Z_SURFACE_PLACEMENT = max(DEATH_STAR_SURFACE.vertices.z) + SPAWN_DISTANCE/2` (= 6720 + 600 = 7320), a single-sourced const in render.ts derived from the model's near extent rather than a bare number.
  - Rationale: The contract IS "shift the relief so its +Z near end clears the cockpit and sits in the turret band." Encoding that relationship directly tracks the geometry — if the authentic model is re-authored (as it was in 8-4/8-10), the placement follows instead of silently going stale. Still a single const, no abstraction.
  - Severity: minor
  - Forward impact: none — a future model edit auto-adjusts the placement; the TEA contract (whole surface ahead, near ring in the turret band) still pins the valid window.

### Reviewer (audit)
- **TEA #1 (new `surfacePlacement` export vs inline constant)** → ✓ ACCEPTED by Reviewer: mirrors the established, already-accepted `trenchPlacement` seam and is the only way to unit-test a canvas-touching render path. Sound.
- **TEA #2 (whole surface ahead — stronger reading of AC-1)** → ✓ ACCEPTED by Reviewer: TEA's analysis is correct — the shallow ≈ -1200 placement the spec literally suggested leaves the +6720 near rings clipped (does NOT fix the bug). The live eyeball confirms the full relief now reads. The stronger contract was the right call.
- **Dev #1 (`Z_SURFACE_PLACEMENT` derived from model + SPAWN_DISTANCE/2 vs literal)** → ✓ ACCEPTED by Reviewer: still a single-sourced const (rule-checker confirmed), self-documents the "near end clears the cockpit" intent, and auto-tracks future model re-authoring. No downside; lands in TEA's valid window (Z=-7320).
- No UNDOCUMENTED deviations found: the diff matches the logged TEA/Dev decisions and the story ACs.