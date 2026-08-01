---
story_id: "sw8-17"
jira_key: "sw8-17"
epic: "sw8"
workflow: "tdd"
---
# Story sw8-17: The Death Star's off-centre wander belongs to the STATION, not the camera

## Story Details
- **ID:** sw8-17
- **Jira Key:** sw8-17
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-01T19:36:51Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-01T18:42:38+00:00 | 2026-08-01T18:45:06Z | 2m 28s |
| red | 2026-08-01T18:45:06Z | 2026-08-01T19:03:03Z | 17m 57s |
| green | 2026-08-01T19:03:03Z | 2026-08-01T19:17:25Z | 14m 22s |
| review | 2026-08-01T19:17:25Z | 2026-08-01T19:26:09Z | 8m 44s |
| green | 2026-08-01T19:26:09Z | 2026-08-01T19:30:28Z | 4m 19s |
| review | 2026-08-01T19:30:28Z | 2026-08-01T19:36:51Z | 6m 23s |
| finish | 2026-08-01T19:36:51Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[Gap, non-blocking] (TEA, red)** The story's ROM pointers are dead ends: `WSSITE.MAC` (`.TITLE WSSITE ;I;HANDLE SITE`) is the gun SIGHT + player's X-wing hood, and `WSBASE.MAC`'s "starbase" sections are the trench pie/wedge framework. The station mechanism lives in **WSMAIN.MAC** (VWDTHA :3605, attitude seeds :1331/:1940, aim :2293-2314/:2447, turn stop :1529-1535). Epic prose that repeats the WSBASE/WSSITE pointer should be corrected when sw8-18 (citation-defect sweep) runs.

### Dev (implementation)

- **Improvement** (non-blocking): The sweep-in tail constants (`DEATH_STAR_TURN_START_S = END−5`, `DEATH_STAR_IN_CONE_S = END−1.5`, end angle 4°) approximate the S0G/S1G interludes; the real turn rate could be derived from `AIM`/`RHTRIG` (WSMAIN.MAC:2422-2470, :2735+) if a later fidelity pass wants the exact sweep speed. Affects `plugins/star-wars/src/shell/render.ts` (the three tail constants). *Found by Dev during implementation.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Re-based the sw7-15 X-007 loom baseline and margin**
  - Spec source: tests/shell/render.death-star-finale.test.ts (TEA, sw7-15), X-007 finding
  - Spec text: "looms the station large — bigger than a fresh far seed — during the finale … expect(peak).toBeGreaterThan(farSeed * 1.5)"
  - Implementation: baseline changed from the fresh far seed (phaseTime 0) to the approach end (phaseTime 21, the largest normal-play draw); margin 1.5× → 1.25×
  - Rationale: sw8-17 rightly hides the station at the far seed (parked beyond the ROM draw gate), so the old baseline's sanity check (`farSeed > 0`) can no longer pass; the new baseline is stricter in meaning ("bigger than the body EVER draws in play") and 1.25× reflects the screen-space measurement compressing the 1.67× world-scale ratio (off-centre baseline seat + y ≤ 500 crop)
  - Severity: minor
  - Forward impact: none — X-007's loom pin is preserved and strengthened; no sibling story reads the old baseline

## Impact Summary

**Delivery Findings:** 2 non-blocking items, both forward-routed.

1. **ROM citation defect (routes to sw8-18):** TEA identified that epic prose incorrectly references WSBASE/WSSITE (gun sight + trench framework) as the station mechanism. The actual mechanism is VWDTHA in WSMAIN.MAC. This misrouting will be corrected in sw8-18 (citation-defect sweep), which has a broader mandate to fix all sw8 citation defects and add a mechanical guard against similar misroutes in future.

2. **Fidelity opportunity (downstream optimization):** Dev found that the sweep-in tail constants (`DEATH_STAR_TURN_START_S`, `DEATH_STAR_IN_CONE_S`, end angle) approximate the cabinet's S0G/S1G interludes. The exact turn rate could be derived from AIM/RHTRIG ROM fields (WSMAIN.MAC) in a later fidelity pass if needed. This is marked as a possible improvement, not a requirement for this story.

**Design Deviations:** 1 re-base of the sw7-15 X-007 loom baseline (see Design Deviations section for full detail). Impact: none — X-007's finding bite is preserved and strengthened; no sibling story reads the old baseline.

**Forward Dependencies:** 
- sw8-18 owns the WSBASE/WSSITE citation correction and the mechanical ROM-citation guard.
- Future fidelity passes may consume the sweep-rate opportunity (lower priority).

## Sm Assessment

**Story:** sw8-17 — the Death Star's off-centre wander belongs to the STATION, not the camera (3 pts, tdd, bug, star-wars).
**Branch:** none
(trunk-based — work happens directly on main; no feature branch.)

Setup complete: session file created, story context written at `sprint/context/context-story-sw8-17.md`, story status `in_progress`, claim committed and pushed (9599cb2). Probes confirmed no sibling checkout or remote branch holds this story.

**Scope for TEA (red):** pin the station's own lateral motion in `deathStarPlacement` — the mechanism must come from the ROM's station-side code (WSBASE.MAC / WSSITE.MAC DS site handling), reproducing the epic §1 longplay observation (Death Star entirely out of frame mid space-combat). Hard constraint: `tests/shell/render.space-camera.test.ts` pins camera-contributes-no-lateral-offset — the fix must NOT be re-derived from ST.UX or reintroduced as a camera slide.

**Routing:** phased tdd → TEA owns the next phase (red).
## Tea Assessment

**Story:** sw8-17 — port the Death Star's station-owned lateral wander into `deathStarPlacement`.
**Branch:** none
**Verdict:** RED established and verified — 3 failing tests pin the story delta; 2085/2088 star-wars tests pass (no pre-existing red; citation gate green).

### The ROM mechanism (verified against the shipped WSROOT.MAP link set)

The station in space is a fixed **landmark**, not a positioned object: `VWDTHA` (WSMAIN.MAC:3605) draws it at the ship-attitude transform of the world +X far point ("X POSITION AT FAR(4000,0,0) DISTANCE"), gated in-front (:3607) and inside a ±45° pyramid (:3613/:3618) — outside the gate the cabinet draws **nothing** (the longplay's "entirely out of frame"). Every wave-set seeds the attitude facing dead away (`$C0` — "FACE BACKWARDS" :1331, "TURN PLAYER AWAY FROM NEW DETH STAR" :1940). Mid-combat the per-tick twirl aims at **aliens only** (STWSP1≡S1TW :2293, AIM :2311, AIMDTH :2447); the yoke never rotates the ship in space (S1MV :2522-2530 writes only ST.UX). On wave-clear the turn converges until `M$AX ≥ $3F00` (≈ 10.1° off-axis, :1529-1535), then the hyper grows the station while still converging (:1568). With our camera pinned to the cockpit (sw8-8), that attitude-driven view direction is honestly expressed as the STATION's own lateral seat.

### Acceptance criteria (as pinned by the RED suite)

`tests/shell/render.death-star-station-wander.test.ts` — RED (3):
1. At wave start the station is outside the ROM draw gate (astern seed).
2. At the §1 anchor (mid-box neighbourhood) it is entirely out of frame.
3. It is out of frame for ≥ half the combat window ([0,16] s sampled at 0.25 s).

Green guards Dev must not break (6): camera bit-invariant across the box + view-x ≡ world-x (tombstone re-guarded); visibility is a suffix (sweep-in converges, no flicker); inside the $3F00 stop cone (≤ ~10.14°) by the end of the box; seat clamps past `SPACE_PHASE_END_S`; purity + determinism; source tripwire — no `state.frame`/ST.UX derivation in `deathStarPlacement`.

Also load-bearing and green: `tests/shell/render.space-camera.test.ts` (unmodified), `tests/core/death-star-body.test.ts` (depth/growth/clamp guards — the lateral term must ride the same clamp).

### Notes for Dev

- The lateral term is a pure `f(state)` in `deathStarPlacement` (shell). Suggested shape: phase-clock-driven wander that starts astern/off-pyramid, stays out through the combat window, sweeps in once and converges — but the curve is Dev's choice within the pins.
- Do NOT touch `cameraView`. Do NOT read `state.frame` in the placement.
- `render.ts` carries audit-cited lines: after editing it, run `node plugins/star-wars/tools/audit/reanchor-citations.mjs --write` (line drift only) or the citation gate reds.
- A vertical (y) term is permitted by the pins (the ROM gate is 2-axis); not required.

### Rule Coverage (typescript checklist)

- §1 type-safety escapes: no `as any`/double-casts in the new suite; fixtures use real `GameState` spreads (`phaseTime` is a first-class field since sw8-11).
- §4 null handling: no optional-chaining shortcuts; helpers take concrete types.
- Test-quality self-check: every test asserts a concrete value with a failure message; no `let _`, no always-true assertions; the "suffix" test asserts per-sample with indices in the message.
## Dev Assessment

**Implementation Complete:** Yes
**Branch:** none
(trunk-based — commits 32228b6 (rebased → aa7faec) pushed to main.)

**Files Changed:**
- `plugins/star-wars/src/shell/render.ts` — the sw8-17 lateral term: `deathStarOffAxis(t)` (parked 75° beyond the ROM ±45° draw gate through the combat window; one linear sweep through the END−5…END−1.5 tail; enters the $3F00 stop cone (~10.14°) and converges to 4° by the box end) feeding `x = tan(θ)·−z` in `deathStarPlacement`; phase clock clamped before use so the seat saturates past `SPACE_PHASE_END_S`. Camera untouched; no `state.frame` read.
- `plugins/star-wars/tests/shell/render.death-star-finale.test.ts` — X-007 loom baseline re-based (see Design Deviations).
- `plugins/star-wars/docs/audit/findings/pair-{explosions,hud,models}.json` — citation line drift re-anchored (`reanchor-citations.mjs --write`: 11 moved, 0 lost).

**Tests:** star-wars 2088/2088 GREEN (all 9 sw8-17 wander tests, sw8-8 tombstone, death-star-body guards, citation gate); orchestrator 359/359; `tsc --noEmit` clean.

**Handoff:** To review.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed 1, dismissed 0, deferred 0 |

**All received:** Yes (2 enabled returned; 7 disabled via settings)
**Total findings:** 1 confirmed, 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** REJECTED — round 1. One confirmed, mutation-proven defect in the guard for the story's own MUST-NOT constraint. Small, precise fix; everything else verified good.

### Confirmed findings

1. **[RULE] The ST.UX/frame tripwire guards the wrong function boundary** — `tests/shell/render.death-star-station-wander.test.ts:204`. The test asserts `deathStarPlacement.toString()` contains no `.frame`/`ST.UX`, but `Function.prototype.toString()` returns only that function's own literal source — never the body of a callee. The lateral-term mechanism actually lives in the private helper `deathStarOffAxis` (`src/shell/render.ts`), so the exact regression the story forbids ("MUST NOT be re-derived from ST.UX") can be reintroduced inside the helper with the suite staying green. **Mutation-proven** by the rule-checker: a `state.frame` reference threaded into `deathStarOffAxis` passed the tripwire; probe reverted cleanly. Fix (Dev's choice): export `deathStarOffAxis` and scan BOTH `toString()`s, or scan the module source text for the placement region instead. The camera-invariance tests do NOT cover this hole — they pin the camera, not the station's derivation.

### Rule Compliance

Rule-checker ran the full typescript checklist (15 numbered rules) plus 4 project rules over every type/function/field in the diff — 27 instances: **26 compliant, 1 violation (the [RULE] finding above)**. Highlights: no type-safety escapes (§1); `.js` extensions correctly omitted under `bundler` resolution (§5 — the arcade-shared ESM rule applies to the shipped library, not in-repo app code); test quality clean (§8); core/shell boundary intact — `deathStarPlacement`/`deathStarOffAxis` are pure reads, no DOM/clock/RNG (project rule); the CODE itself carries no `state.frame`/ST.UX derivation (verified by direct reading, independent of the broken tripwire); all 17 ROM citations in the new comments verified verbatim against the LF source; audit JSON changes are line-number re-anchors ONLY (zero `"verbatim"` lines touched, citation gate 12/12 green).

### Own review — observations (Reviewer, direct)

1. VERIFIED GOOD — `deathStarOffAxis` piecewise boundaries are exactly continuous (75° at t=16 both sides; stop-cone 10.14° at t=19.5 both sides) and monotone non-increasing ⇒ the single-sweep suffix pin holds by construction, no knife-edge flicker.
2. VERIFIED GOOD — the phase clock is clamped BEFORE the helper, so the whole seat (lateral term included) saturates past `SPACE_PHASE_END_S`, keeping death-star-body's beyond==atQuota guard true by construction.
3. VERIFIED GOOD — draw wiring unchanged: the body renders only in the space scene, first in painter's order (render.ts, "Draw it FIRST so it sits BEHIND the TIEs"), consumed only via `deathStarSeat`; no sim consumer exists, so determinism and TIE hit-tests are untouched.
4. VERIFIED GOOD — the X-007 loom re-base preserves the finding's bite: baseline is now the LARGEST normal-play draw (approach end) rather than the far seed sw8-17 rightly hides; measured loom 1.4× vs 1.25× threshold with deterministic rendering (no flake margin needed). `render.death-star-picture.test.ts` stays non-vacuous (its `SPACE_PHASE_OVER` fixture renders the visible approach-end body).
5. VERIFIED GOOD — data flow traced end-to-end: core `stepGame` advances `phaseTime` (space branch) → shell `deathStarPlacement` derives {x, z, scale} → `deathStarSeat` (loom override only during boom) → `drawDeathStar` model matrix → `drawWireframe`. Hard inputs: negative/huge/NaN-free `phaseTime` handled by the clamp; parked x ≈ 31.7k world units sits inside the ±$7CFF play cube and is render-only.
6. MINOR (non-blocking, note only) — the re-based finale fixture writes `phaseTime: 21` as a literal instead of reusing `tests/support/space-phase-end.ts` `SPACE_PHASE_OVER`; consistency nit, fine to fold into the fix commit or leave.

### Hard questions asked

Could the wander desync the gun/fireball arc the way sw8-1's camera did? No — the camera and gun both stay at the cockpit; only the drawn body moves, and it never enters the sim. Could a mid-boom wave transition pop the seat? Yes visually (loom → parked), and that is ROM-faithful: PHINXT re-seeds the attitude astern immediately after the finale.

**Routing:** back to Dev (green) to re-anchor the tripwire to the mechanism (`deathStarOffAxis`), then re-review.
## Dev Assessment (round 2)

**Implementation Complete:** Yes
**Branch:** none
(trunk-based — commit 008b111 (rebased → 6de564d) pushed to main.)

**Review round 1 finding addressed:** the [RULE] tripwire hole. `deathStarOffAxis` is now exported and the tripwire scans `deathStarPlacement.toString() + deathStarOffAxis.toString()`, with the test comment explaining WHY (toString never includes a callee's body). **Mutation-verified:** re-ran the reviewer's probe (a `.frame` read inside the helper) against the fixed guard — the tripwire FAILS as it must; probe reverted before commit. Also folded in the minor fixture nit: the finale baseline now imports `SPACE_PHASE_END_S` instead of a bare 21.

**Files Changed (round 2):**
- `plugins/star-wars/src/shell/render.ts` — `deathStarOffAxis` exported (one-keyword change; no line drift, citation gate untouched)
- `plugins/star-wars/tests/shell/render.death-star-station-wander.test.ts` — tripwire scans both function bodies
- `plugins/star-wars/tests/shell/render.death-star-finale.test.ts` — `SPACE_PHASE_END_S` import replaces the literal

**Tests:** star-wars 2088/2088 GREEN; `tsc --noEmit` clean.

**Handoff:** back to review (round 2).
## Subagent Results (round 2)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none (round-1 finding verified CLOSED) | N/A |

**All received:** Yes (2 enabled returned; 7 disabled via settings)
**Total findings:** 0 confirmed, 0 dismissed, 0 deferred

## Reviewer Assessment (round 2)

**Verdict:** APPROVED.

The single round-1 finding — **[RULE]** the ST.UX/frame tripwire guarding only the wrapper's `toString()` — is verified CLOSED, and not on Dev's word: the rule-checker re-ran the mutation probe itself (a `.frame` read inserted into `deathStarOffAxis`'s body → tripwire FAILS; file restored via git → tree clean → tripwire PASSES). `deathStarOffAxis` is exported (`render.ts:303`, a same-line keyword change with zero citation drift — gate 12/12 green) and the tripwire concatenates both function bodies before the regex (`render.death-star-station-wander.test.ts:217`).

### Rule Compliance (round 2)

Full typescript checklist re-applied to the fix diff: rules 1–15 all compliant across the three changed files (imports correctly `type`-qualified; `.js` extensions rightly omitted under `bundler` resolution; rule 15 now COMPLIANT — the assertion matches the claim, mutation-proven). No new instances introduced.

### Verification

- star-wars suite 194 files / 2088 tests GREEN (independently re-run by both specialists); `tsc --noEmit` clean.
- No smells, no `.only`/`.skip`, no mutation-probe leftovers (grepped).
- The fixture nit from round 1 is folded in (`SPACE_PHASE_END_S` import replaces the bare 21).
- Round-1's own review observations 1–5 (boundary continuity, clamp ordering, draw wiring, loom re-base bite, data-flow trace) were all VERIFIED GOOD against the original diff and are untouched by this delta.

**Routing:** to SM for finish. Non-blocking residue already recorded in Delivery Findings: the WSBASE/WSSITE dead-end pointer correction rides sw8-18; the exact S0G/S1G sweep rate is a possible later fidelity pass.