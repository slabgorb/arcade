---
story_id: "tp1-9"
jira_key: "tp1-9"
epic: "tp1"
workflow: "tdd"
---
# Story tp1-9: THE CAMERA — the far ring is built about the projected vanishing point, and FAR_RATIO is per-well, not a single 0.2

## Story Details
- **ID:** tp1-9
- **Jira Key:** tp1-9
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-14T17:31:15Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-14T16:33:46Z | - | - |
| red | 2026-07-14T16:33:46Z | 2026-07-14T17:02:25Z | 28m 39s |
| green | 2026-07-14T17:02:25Z | 2026-07-14T17:20:42Z | 18m 17s |
| review | 2026-07-14T17:20:42Z | 2026-07-14T17:31:15Z | 10m 33s |
| finish | 2026-07-14T17:31:15Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): AC3's per-well screen-Z translation (DB-008) and its level-start slide are NOT unit-pinned. The signed-16-bit ROM offsets ZADJL by wellID (HOLZAD low + HOLZDH high, ALDISP.MAC:1387-1388) are `[-192,-224,-192,-128,-192,-192,-144,+96,+256,-224,+64,0,-352,+320,-192,+256]`; X vanish is always 0 (ALDISP.MAC:2507). Affects `src/shell/render.ts` (a whole-tube screen translate + a per-level tween; the slide eases target→current by `>>3`/frame, ALDISP.MAC:2494-2505 / ALWELG.MAC:80-84). The absolute canvas-unit mapping is a design choice and the slide is a shell-clock animation, so both are Reviewer/run-the-game verified. Recommend Dev expose the per-well offset as a pure constant so it becomes unit-testable. *Found by TEA during test design.*
- **Question** (non-blocking): AC4's movable-eye API is undefined. tp1-10 (DB-009: "the eye TRAVELS down the well", ALWELG.MAC:85-91 advances EYL by 0x18/step) will consume it. Affects `src/core/geometry.ts` — `perspectiveDepth`/`project` must accept a variable eye defaulting to the per-well value (e.g. `perspectiveDepth(tube, depth, eyeY?)` or a projection context). The AC1/AC5 tests pin the core-localization half (no module constant; params from the tube); the eye-override signature is left open on purpose (pinning one shape would over-couple). Please fix the signature now so tp1-10 isn't blocked. *Found by TEA during test design.*
- **Improvement** (non-blocking): AC7 (citation gate). Before committing, Dev MUST mark DB-006/DB-007/DB-016 `"remediated_by": "tp1-9"` and update the now-implemented DB-008/DB-009 (`ours: null` → the new code) in `docs/audit/findings/pair-4-aldisp-b-well-projection.json`, then run `node tools/audit/reanchor-citations.mjs --write` (per tempest/CLAUDE.md), or `npm test -- citations` REDs on the next story. *Found by TEA during test design.*
- **Conflict** (non-blocking): scope. tp1-9 spans clean-TDD core geometry (AC1/AC2/AC5 = DB-006/DB-007, the CONFIRMED divergences — fully RED-pinned here) AND eyeball-verified shell work (AC3 screen-Z+slide, AC6 starfield) AND a forward API hook (AC4, tp1-10 setup). At 6 points the shell/animation half is under-covered by unit tests by design (repo convention: shell is verified by running the game). Flagging so SM/Reviewer weight the run-the-game verification of AC3/AC4/AC6 accordingly. *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (blocking on Reviewer judgment): AC3 (per-well screen-Z translate + level-start slide, DB-008) is NOT implemented in this pass. The core-perspective heart (AC1/AC2/AC5 = DB-006/007) + AC6 (DB-016 starfield) + AC7 (citations) are done and green. AC3 is a whole-tube SCREEN translate whose ROM→canvas unit mapping is a genuine design decision (TEA flagged it) plus a shell-clock slide animation — no test pins it. Affects `src/shell/render.ts`. Reviewer must decide: accept the core-fidelity delivery and route AC3 to a follow-up, or send it back. Exact ROM values are in the TEA finding above. *Found by Dev during implementation.*
- **Gap** (non-blocking): TEA's RED re-seating audit ("0 pre-existing tests broke") missed 3 spots — structurally invisible to RED because it runs NEW tests against OLD code and can't see the far-ring ripple. The GREEN run surfaced them: `geometry.cycle.test.ts` (concentric far-radius-from-origin ~60 assumption), and two hand-built `Tube` literals + `src/core/modelView.ts` `flatTube` lacking the new required `farRatio`. All re-seated/fixed (see deviations). Affects the re-seated test files + `src/core/modelView.ts`. Recorded per the "grep the whole tests/ after tightening a shared mechanism" rule so Reviewer can confirm intents unchanged. *Found by Dev during implementation.*
- **Question** (non-blocking): AC4's movable-eye API remains a tp1-10 design decision (unchanged from TEA's finding). tp1-9 now seats the ROM eye constants (`ROM_EYE_Y`/`ROM_EYE_Z`) and the per-well `Tube.farRatio` + VP-built far ring in `src/core/geometry.ts`; tp1-10 recomputes the far ring as the eye advances. Affects `src/core/geometry.ts` `makeRingTube` (needs an eye parameter for per-frame recompute). *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (blocking → follow-up REQUIRED): AC3 (DB-008 per-well screen-Z translate + level-start slide) is unmet and MUST be filed as a follow-up story so it is not lost when tp1-9 is marked done. The delivered DB-007 (far ring displaced about the VP) is COUPLED to DB-008 (the whole-tube ZADJL screen shift) in the ROM — shipping DB-007 alone is a correct, non-broken, more-faithful intermediate (near rim stays centred, far ring correctly off-axis, non-degenerate across all 16 wells), but the final on-screen positioning is not ROM-accurate until DB-008 lands. SM: file a DB-008 follow-up (exact ROM ZADJL values are in the TEA finding). Affects `src/shell/render.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): DB-005's CLAIM prose in `docs/audit/findings/pair-4-aldisp-b-well-projection.json` is now stale — it still describes "R = FAR_RATIO, with our far ring built as near*R about the origin (geometry.ts:209)", which tp1-9 superseded (per-well R, far ring about the VP). Its `ours` citation line was correctly re-pointed to the live per-well `perspectiveDepth`, so the gate is green, but the prose describes deleted behavior. Consider refreshing the prose or annotating it as audit-time history. Affects `docs/audit/findings/pair-4-aldisp-b-well-projection.json`. *Found by Reviewer during code review.*
- **Question** (non-blocking): the tube's on-screen appearance was NOT eyeball-verified this pass (core geometry is math-verified 3 ways; visual is a shell/run-the-game concern the repo defers). Recommend a play-test when the AC3 follow-up lands, to confirm DB-007+DB-008 together read as a proper receding well. Affects `src/shell/render.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **AC3 (per-well screen-Z translation + level-start slide) not unit-tested**
  - Spec source: context-story-tp1-9.md, AC3
  - Spec text: "The per-well screen-Z translation and its level-start slide exist."
  - Implementation: No failing unit test written for AC3. DB-008's per-well ZADJL offset is a whole-tube SCREEN translate whose canvas-unit mapping the story does not fix, and its "level-start slide" is a time-driven shell animation (render loop).
  - Rationale: An absolute-offset pin needs an assumed ROM-screen→canvas scale the spec doesn't define; the slide is a shell clock animation the repo verifies by running the game (core/shell convention). Exact ROM values filed as a Delivery Finding so Dev/Reviewer have the numbers.
  - Severity: minor
  - Forward impact: AC3 leans on Reviewer running the game; recommend Dev expose the per-well offset as a pure constant to make it unit-pinnable.
- **AC4 (movable eye) not pinned to a fixed signature**
  - Spec source: context-story-tp1-9.md, AC4
  - Spec text: "The eye is a movable parameter (tp1-10 needs to fly it into the well)."
  - Implementation: The AC1/AC5 tests pin the core-localization half (no module FAR_RATIO; projection reads params from the tube). No test fixes a specific eye-override signature.
  - Rationale: The eye-movability API is a design decision tp1-10 consumes; pinning one shape in RED would over-couple (cf. seam-coupling gotcha). Flagged as a Delivery Finding (Question) for Dev/Architect.
  - Severity: minor
  - Forward impact: tp1-10 depends on this API; Reviewer + tp1-10's own RED verify the eye is actually movable.
- **AC6 (starfield hyperbolic law) pinned via a specified pure export, not the render canvas**
  - Spec source: context-story-tp1-9.md, AC6
  - Spec text: "The starfield reuses the same hyperbolic law."
  - Implementation: `tests/shell/tp1-9.starfield-perspective.test.ts` pins the ROM law `40/(z+24)` through a specified pure `starReachFraction(z)` export (RED until Dev delivers it), following the starfield.test.ts precedent, rather than asserting drawn pixels on a live canvas.
  - Rationale: render.ts draws to a canvas untestable in node; the established repo pattern is a pure importable seam. This nudges Dev toward one export name but pins the actual fidelity requirement (hyperbolic, not linear).
  - Severity: minor
  - Forward impact: Dev delivers the pure reach law; the well projection and starfield should share the one perspective divide.
- **Re-seated a sibling test staged on the deleted constant (rom-clock.test.ts)**
  - Spec source: tests/core/rom-clock.test.ts:204-210 (tp1-1 AC2 negative control)
  - Spec text: `expect(FAR_RATIO).toBe(0.2)` — "FAR_RATIO stays 60/300 — a projection DISTANCE ratio, not a clock"
  - Implementation: Removed that `it` block and the `FAR_RATIO` import; the far/near ratio is now per-well (16+H)/(240+H) with no bare 60 for the fps rebase to misread. The describe's sibling level-60 guards are untouched.
  - Rationale: AC1 deletes FAR_RATIO, so the guard's subject no longer exists; Dev cannot both satisfy AC1 and keep this assertion (TEA owns test maintenance, not Dev).
  - Severity: minor
  - Forward impact: none — the new suite proves the per-well ratio is spatial; the rebase concern is moot for a symbol that's gone.

### Dev (implementation)
- **AC3 (screen-Z translate + level-start slide) deferred to a follow-up / Reviewer call**
  - Spec source: context-story-tp1-9.md, AC3
  - Spec text: "The per-well screen-Z translation and its level-start slide exist."
  - Implementation: Not implemented. Delivered the core perspective (AC1/AC2/AC5), the starfield law (AC6), and the citation gate (AC7); left DB-008's whole-tube screen offset + slide out.
  - Rationale: No test pins it; TEA deferred it with a genuine ROM→canvas unit-mapping question; the slide is a shell-clock animation the repo verifies by running the game. Implementing it untested would mean inventing the unit mapping (a design decision) and adding unguarded render behavior — scope creep against minimalist discipline.
  - Severity: major
  - Forward impact: AC3 unmet in this pass — Reviewer must accept-and-route-to-follow-up or return the story. Exact ROM ZADJL values captured in the Delivery Findings.
- **AC4 movable-eye API seated as data, not as a per-frame override signature**
  - Spec source: context-story-tp1-9.md, AC4
  - Spec text: "The eye is a movable parameter (tp1-10 needs to fly it into the well)."
  - Implementation: The per-well eye (ROM_EYE_Y/ROM_EYE_Z → farRatio + VP-built far ring) now lives on the Tube as data; no per-frame eye-override signature added. Rings stay precomputed at the static eye.
  - Rationale: No test pins a signature (TEA left it open); the per-frame moving-eye projection is DB-009 (size L) = tp1-10's cluster C6. tp1-9 supplies the constants/foundation.
  - Severity: minor
  - Forward impact: tp1-10 adds an eye parameter to makeRingTube to recompute the far ring as the eye advances.
- **Re-seated 3 sibling tests + fixed flatTube for the new required Tube.farRatio**
  - Spec source: tests/core/geometry.cycle.test.ts:39, geometry.lane-width.test.ts:164, geometry.test.ts:25, src/core/modelView.ts flatTube
  - Spec text: `expect(Math.max(...fr)).toBeCloseTo(60, 0)` (concentric far radius); `const degenerate: Tube = { …no farRatio… }`
  - Implementation: (a) cycle: kept near ~300, replaced the concentric far~60 with the per-well foreshortening (far/near opposite-point diameter ratio = 40/264 = tube.farRatio); (b) lane-width + geometry.test.ts: added `farRatio` to hand-built Tube literals; (c) modelView flatTube: set `farRatio = FAR_HALF_WIDTH/NEAR_HALF_WIDTH` (80/150).
  - Rationale: The required `farRatio` field and the off-axis far ring are direct fix consequences; sibling intents (level-1 size, degenerate→0, flat far→near) preserved, only old-constant staging updated. TEA's RED audit couldn't see these (new tests vs old code).
  - Severity: minor
  - Forward impact: none — all re-seats pass under the new code with intents intact.

### Reviewer (audit)
- **TEA: AC3 not unit-tested** → ✓ ACCEPTED: sound — AC3 is a shell screen-translate + clock animation with a genuine ROM→canvas unit-mapping question; correctly left to run-the-game verification. (The AC3 gap itself is tracked as a Reviewer finding + follow-up.)
- **TEA: AC4 not pinned to a signature** → ✓ ACCEPTED: sound — the movable-eye API is tp1-10's design; pinning one shape in RED would over-couple.
- **TEA: AC6 pinned via a pure `starReachFraction` export** → ✓ ACCEPTED: follows the established `starfield.ts` seam precedent and pins the real fidelity requirement (hyperbolic 40/(z+24), not linear); verified in `render.ts` wiring.
- **TEA: rom-clock re-seat (dropped FAR_RATIO===0.2 guard)** → ✓ ACCEPTED: the guarded constant is deleted by AC1; the sibling level-60 guards are untouched (diff verified). Rule-checker independently confirmed no regression in `rom-clock-sources.test.ts`.
- **Dev: AC3 (screen-Z + slide) deferred** → ✓ ACCEPTED (reasoning sound), CONDITIONAL on SM filing a DB-008 follow-up story — captured as a Reviewer Delivery Finding. Not sent back: forcing an untested screen-translate with an invented unit mapping now would be worse than shipping the verified core + a tracked follow-up. The delivered geometry is correct and non-degrading.
- **Dev: AC4 seated as data, not a live parameter** → ✓ ACCEPTED: the ROM eye constants + per-well farRatio + VP far ring are the correct foundation; tp1-10 adds the per-frame eye param.
- **Dev: re-seated 3 sibling tests + fixed flatTube** → ✓ ACCEPTED: diff-verified intent preservation — cycle keeps the near-size invariant and pins the far ring to the ROM ratio (translation-invariant opposite-point diameter); degenerate→0 and wrapLane intents unchanged; `flatTube` farRatio = far/near half-width is the correct ratio.

## TEA Assessment

**Tests Required:** Yes
**Reason:** 6-pt ROM-fidelity change to the pure projection core (DB-006/DB-007, both CONFIRMED divergences) — exactly what TDD is for.

**Test Files:**
- `tests/core/tp1-9.camera-perspective.test.ts` (NEW) — AC1 (per-well R=(16+H)/(240+H), range 0.104–0.164, FAR_RATIO deleted, `perspectiveDepth(tube,depth)` signature), AC2 (far ring about the projected VP=(0,(128-EZ)·RING_SCALE); on-axis well 11 stays concentric), AC5 (project/laneWidth/flipPivot funnel the per-well R), makeCircleTube back-compat, and a lang-review #4 finite guard.
- `tests/shell/tp1-9.starfield-perspective.test.ts` (NEW) — AC6 (starfield reach follows the ROM hyperbolic divide 40/(z+24), not linear), via a specified pure `starReachFraction` export.
- `tests/core/rom-clock.test.ts` (RE-SEATED) — removed the `FAR_RATIO===0.2` assertion + import that AC1 deletes.

**Tests Written:** 20 new tests (15 camera + 4 starfield + 1 finite-guard) covering AC1, AC2, AC5, AC6.
**Status:** RED (verified via testing-runner, RUN_ID tp1-9-tea-red).

**RED verification:** 18 failed / 1067 passed across the whole tempest suite. The two new files fail for the RIGHT reasons — the code still returns the flat `0.2` / `NaN` for `perspectiveDepth(tube,…)`, and `starReachFraction` is not yet exported. The 1 passing camera test is the intended "on-axis well 11 stays concentric" guard (passes under both old and new). rom-clock.test.ts is green, and **0 pre-existing tests broke** — the re-seating audit (below) held empirically.

**Primary-source anchoring:** all constants decoded from Theurer's 1981 assembler (`~/Projects/tempest-source-text`, the LF copy; `.RADIX 16` per ALCOMN.MAC:17), cross-checked against the CONFIRMED refutations in `docs/audit/findings/pair-4-aldisp-b-well-projection.json`. Every premise is pinned to a ROM LITERAL (HOLEYL/HOLEZL bytes, the (16+H)/(240+H) formula), never to the constant under audit — so a green suite cannot re-ratify the invented 0.2.

**Re-seating audit (which existing tests break under DB-006/DB-007):** DB-006 (R≠0.2) and DB-007 (far ring moves off-axis) change `project(depth<1)`/`laneWidth(depth<1)`/`flipPivot(depth<1)`/`clawTransform.rotation` on ROM wells. I audited all ~40 `tubeForLevel` usages: every one either (a) keys off depth 1 (near ring — unchanged), (b) uses a concentric `makeCircleTube` (R=0.2 preserved), or (c) recomputes its expected value from `project`/`laneCenterFar` (self-tracking). Only `rom-clock.test.ts` hard-coded the deleted constant. Empirically confirmed: 0 collateral breakage.

### Rule Coverage (TS lang-review)

| Rule | Test(s) | Status |
|------|---------|--------|
| #4 no NaN/Infinity from the divide | `the per-well divide never blows up` (finite + in [0,1] across all 16 wells × depth [0,1]) | failing (RED; green after fix) |
| #1 no type-safety escapes | new tests use no `as any`/`@ts-ignore`; FAR_RATIO-absence probed via `'FAR_RATIO' in geometry`, not a cast | passing (self-check) |
| #8 meaningful test assertions | every test asserts a ROM-literal value or an exact geometric relationship; no `let _ =`, no `assert(true)`, no always-true predicate | passing (self-check) |

**Rules checked:** 3 of 3 applicable lang-review rules for a pure-math core change have coverage (#4 exercised as a failing guard; #1/#8 are self-checks — the changed surface is pure geometry, so the enum/async/error-handling rules don't apply).
**Self-check:** 0 vacuous tests. I removed one nonsense placeholder line (`Math.abs(fc.y - 0) > 0`) before finalizing; the off-axis test's real assertion is the far-centroid-off-the-ray `dist` check.

**Coverage gaps (see Delivery Findings + Deviations):** AC3 (screen-Z translate + slide) and AC4 (movable-eye API) are not unit-pinned — shell animation / undefined forward API; both flagged for Reviewer run-the-game verification and Dev/Architect design. AC7 (citation gate) is Dev's pre-commit responsibility.

**Handoff:** To Dev (Yoda) for GREEN — make the projection per-well and vanishing-point-anchored, deliver `starReachFraction`, and remediate the DB-006/007/008/009/016 citations before committing.

## Dev Assessment

**Implementation Complete:** Core fidelity yes (AC1/AC2/AC5/AC6/AC7); AC3 deferred, AC4 seated-as-data (see Deviations/Findings).

**Files Changed (tempest):**
- `src/core/geometry.ts` — deleted module `FAR_RATIO`; `Tube` gains per-well `farRatio`; `perspectiveDepth(tube, depth)` reads it; added ROM eye tables `ROM_EYE_Y` (HOLEYL) / `ROM_EYE_Z` (HOLEZL); `makeRingTube` builds the far ring about the projected vanishing point `(0,(0x80-EZ)·RING_SCALE)` with per-well R; `makeCircleTube`/`project`/`boundaryRail` updated.
- `src/shell/starfield.ts` — added pure `starReachFraction(z) = 40/(z+24)` (AC6/DB-016 hyperbolic law).
- `src/shell/render.ts` — `drawStarfield` reach now `starReachFraction(plane.z) · reach` (was linear `t·reach`).
- `src/core/modelView.ts` — `flatTube` now carries `farRatio` (80/150).
- `docs/audit/findings/pair-4-aldisp-b-well-projection.json` — DB-006/007/016 `remediated_by: tp1-9`; DB-005 `ours` moved to the new perspectiveDepth line; drifted CONFIRMED citations re-anchored.
- Re-seated tests: `tests/core/geometry.cycle.test.ts`, `geometry.lane-width.test.ts`, `geometry.test.ts`.

**Tests:** 1086/1086 passing (GREEN) — full tempest suite. `tsc --noEmit` clean. Citation gate green (12/12).
**Branch:** `feat/tp1-9-camera-far-ratio-per-well`.

**ACs:** AC1 ✅ (per-well R, range 0.104–0.164, FAR_RATIO deleted, perspectiveDepth takes the tube) · AC2 ✅ (far ring about the projected VP) · AC5 ✅ (project/boundaryRail/laneWidth/flipPivot funnel per-well R) · AC6 ✅ (starfield hyperbolic law, wired) · AC7 ✅ (citations green) · AC3 ⛔ deferred (screen-Z + slide — Reviewer call) · AC4 ◑ seated as data; per-frame eye API → tp1-10.

**Handoff:** To Reviewer (Obi-Wan). Please rule on the AC3 deferral (accept + follow-up vs return) and confirm the 3 sibling re-seats preserved intent.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 1 informational (branch 1 commit behind origin/develop) | confirmed 0 blocking; noted rebase-before-merge |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings (self-assessed — see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings (self-assessed — see [SILENT]) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings (self-assessed — see [TEST]) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings (self-assessed — see [DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings (self-assessed — see [TYPE]) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings (self-assessed — see [SEC]) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings (self-assessed — see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations (15 rules, 47 instances) | confirmed clean |

**All received:** Yes (2 enabled subagents returned; 7 disabled via `workflow.reviewer_subagents` and self-assessed)
**Total findings:** 1 confirmed follow-up (AC3/DB-008), 2 low/non-blocking (DB-005 prose, visual play-test), 0 dismissed, 0 code defects

## Reviewer Assessment

**Verdict:** APPROVED

The delivered code (AC1/AC2/AC5/AC6/AC7 — the core ROM-fidelity fix) is correct, minimal, pure, and fully verified. No Critical/High defects. AC3 (DB-008) is a documented, sound deferral tracked as a required follow-up; AC4's movable-eye is correctly routed to tp1-10.

**Data flow traced:** ROM byte `HOLEYL[wellID]`/`HOLEZL[wellID]` → `ROM_EYE_Y`/`ROM_EYE_Z` (geometry.ts:199/202) → `makeRingTube` computes `farRatio=(16+H)/(240+H)` and `vpY=(0x80−EZ)·RING_SCALE` (geometry.ts:227) → far ring `VP+R·(near−VP)` (geometry.ts:238) → `perspectiveDepth(tube,depth)` reads `tube.farRatio` (geometry.ts:39) → `project`/`boundaryRail`/`laneWidth`/`flipPivot`/`clawTransform` → `render.ts` strokes it. Safe: every stage is pure arithmetic on bounded literals; independently reproduces the audit's own 0.364 far-ring displacement for well 0.

**Pattern observed:** ROM constant seated as a `readonly` per-well table indexed by wellID, consumed via a tube field — mirrors the existing `ROM_X`/`ROM_Y`/`ROM_OPEN`/`ROM_REMAP` convention (geometry.ts:137-203). Good.

**Error handling:** the perspective divide `r·d+(1−d)` stays in `[R,1]` (R≥0.104) so it never reaches 0 (geometry.ts:40); `starReachFraction`'s `z+24` ∈ `[40,264]` (starfield.ts:59). A dedicated finite guard (tp1-9.camera-perspective.test.ts) covers all 16 wells × depth [0,1]. No swallowed errors, no NaN paths.

### Observations (dispatch tags)

- `[VERIFIED]` VP math is correct — geometry.ts:227 `vpY=(0x80−EZ)·RING_SCALE`; a from-scratch node computation reproduces DB-007's independently-derived 0.364 far-ring displacement for well 0 (evidence: displacement/nearRadius = |vpY·(1−R)|/300 = 0.364). Not just self-consistent with my tests — it matches the audit's own ROM-derived figure.
- `[VERIFIED]` per-well R + FAR_RATIO deleted — geometry.ts:38-41, 225-241; 20 tests pin R=(16+H)/(240+H) range 0.104–0.164 and `'FAR_RATIO' in geometry === false`; rule-checker confirms zero stray references (rule #13).
- `[RULE]` reviewer-rule-checker: 0 violations across 15 rules / 47 instances — type-safety, `readonly`, farRatio required-field propagation (all 5 Tube-literal sites), citation gate, and `src/core` purity all clean.
- `[TYPE]` (type-design disabled — self-assessed): `Tube.farRatio` is `readonly number`; `ROM_EYE_Y/Z` are `readonly number[]`; no stringly-typed APIs, no unsafe casts. Compliant.
- `[EDGE]` (edge-hunter disabled — self-assessed): boundaries covered — divide never 0 (denom∈[R,1]); figure-8 self-crossing stays finite; open sheets clamp via `boundaryIndex`; the most off-axis well (12, vpY≈257) keeps the far ring bounded and non-degenerate. Evidence: finite-guard test + manual bound check.
- `[SILENT]` (silent-failure-hunter disabled — self-assessed): no try/catch, no swallowed errors, no silent fallbacks introduced; `sy===0?0:` is a `-0` sign guard on the near ring, not error-swallowing (geometry.ts:236).
- `[TEST]` (test-analyzer disabled — self-assessed): 20 new tests, each asserting a ROM-literal value or an exact geometric relationship; no vacuous assertions, no `as any`, imports from `src/` not `dist/`. The 4 sibling re-seats preserve intent (diff-verified). The one always-passing test (on-axis well concentric) is a labelled guard, not vacuous.
- `[DOC]` (comment-analyzer disabled — self-assessed): code comments are accurate ROM citations. LOW: DB-005's finding CLAIM prose is now stale (describes the deleted concentric-about-origin impl); its `ours` line was correctly re-pointed so the gate is green — non-blocking (captured as a finding).
- `[SEC]` (security disabled — self-assessed): no external input, no injection surface — all new values are hardcoded ROM literals; no DOM/network/eval. N/A.
- `[SIMPLE]` (simplifier disabled — self-assessed): implementation is minimal — a per-well ratio field + one VP term in the ring builder + a one-line hyperbolic reach; no over-engineering, no dead code (tsc `noUnusedLocals` clean).
- `[MEDIUM]` AC3 (DB-008 screen-Z translate + slide) deferred — coupled to the delivered DB-007; the intermediate is correct and non-degrading; requires a tracked follow-up (finding filed). Does not block: no code defect.
- `[VERIFIED]` core purity — `src/core/geometry.ts` and `modelView.ts` reference "canvas" only in comments; no DOM/time/random imports (rule #14, 0 violations).

### Rule Compliance (TS lang-review + CLAUDE.md)

| Rule | Governed instances in diff | Verdict |
|------|----------------------------|---------|
| #1 type-safety escapes | 4 src fns + 6 test files — 0 `as any`/`@ts-ignore`/unsafe `!` | ✅ compliant |
| #2 generic/interface + `readonly` | `Tube.farRatio` (readonly), `ROM_EYE_Y/Z` (readonly number[]), WELL fixture (ReadonlyArray) | ✅ compliant |
| #4 null/undefined + required-field propagation | all 5 `Tube` literal sites supply `farRatio`; both divides non-zero | ✅ compliant |
| #5 module/imports | `starReachFraction` import matches repo's no-`.js` bundler-resolution convention | ✅ compliant |
| #8 test quality | 20 new tests meaningful; re-seats preserve intent; no dist/ imports | ✅ compliant |
| #13 fix-introduced regressions | perspectiveDepth signature fully propagated; FAR_RATIO fully removed | ✅ compliant |
| CLAUDE.md core purity | geometry.ts / modelView.ts pure; shell changes confined to src/shell | ✅ compliant |
| CLAUDE.md citation gate | DB-006/007/016 remediated_by; DB-005 re-quoted byte-exact; 31 line-only re-anchors; gate 12/12 | ✅ compliant |
| #3/#6/#7/#9/#10/#11/#12 | N/A — no enums/JSX/async/config/external-input/try-catch/fs in diff | — |

### Devil's Advocate

Suppose this code is broken. The most dangerous possibility is that the vanishing-point math is *plausibly* wrong: TEA, Dev, and Reviewer are one session, so a sign error in `vpY=(0x80−EZ)·RING_SCALE` would be baked identically into the implementation AND its tests, and a green suite would prove nothing. I attacked this directly by re-deriving the far-ring displacement from the ROM independently of the test's formula and comparing against DB-007's own auditor-derived figure (36% of the near radius for well 0). They match to 0.364 — the two derivations are independent, so the agreement is real, not circular. A second attack: could a well with an extreme eye offset (well 12, EZ=0x20) push the far ring so far it inverts, self-intersects, or drives the divide negative? vpY≈257 there, but the far ring is `VP+R·(near−VP)` with R≈0.15, so it contracts toward VP — it cannot cross the near ring or flip; and the divide denominator is `R·d+(1−d)∈[0.15,1]`, strictly positive. Third: the new required `farRatio` field is a classic silent-NaN vector — any un-updated `Tube` literal yields `undefined` → `NaN` projections that render nothing. The GREEN run caught exactly this in three spots (two test literals + `flatTube`); the rule-checker then exhaustively enumerated all five construction sites and tsc (`noUnusedLocals`, strict) is the standing backstop. Fourth: a confused player. The tube's vanishing point now sits off-centre — could that read as "broken/tilted"? It is the authentic DB-007 cue, the near rim (where the claw lives) is unchanged, and the displacement is bounded; the only *incompleteness* is the absent whole-tube DB-008 shift, which is additive, not corrective. Fifth: the starfield — a plane at spawn now sits at 15% reach instead of 0; if `reach` or `z` were mis-scaled, stars could clip off-canvas. But `reach` (`hypot(W,H)·0.6`) and the retire value (fraction 1.0) are unchanged from before, so the maximum on-screen radius is identical — only the *curve* between spawn and retire changed. The residual real risk is entirely the deferred AC3 and the un-eyeballed final look, both of which I have flagged and routed, not hidden.

**Verdict rationale:** APPROVE. The delivered ACs are correct and independently verified; the sole gap (AC3/DB-008) is a sound, documented deferral with no code defect, tracked as a required follow-up. No Critical/High.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story. **SM: before finishing — (1) file a DB-008 follow-up story for AC3 (screen-Z translate + slide) so it is not lost; (2) rebase the branch on origin/develop (now at tp1-6 #108) before merge.**