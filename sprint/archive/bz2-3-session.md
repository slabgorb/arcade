---
story_id: "bz2-3"
jira_key: "bz2-3"
epic: "bz2"
workflow: "tdd"
---
# Story bz2-3: Camera/scale calibration — fix FOV/near-plane so obstacles and enemies read at correct distance

## Story Details
- **ID:** bz2-3
- **Jira Key:** bz2-3
- **Type:** bug
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd
- **Stack Parent:** none
- **Repo:** battlezone

## Branch
**Branch Strategy:** gitflow (fix/bz2-3-camera-scale-calibration)

## Story Summary

From the first live playtest of the bz1 slice, the camera/scale reads too close: obstacles and enemies loom larger/nearer than intended. This story fixes the FOV / near-plane / projection scale so objects read at their correct distance.

**Technical Focus:**
- battlezone src/core Math Box (math3d) projection + camera params
- src/shell render configuration
- This is a faithful vector clone — Canvas 2D, no 3D engine; projection is hand-rolled

**Acceptance Criteria:**
- The RED phase captures the miscalibration as a failing test (e.g., a known-distance obstacle should project to an expected screen size/position)
- GREEN fixes the camera/scale constants to pass the test
- Objects now read at their correct distance relative to the player's view cone

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-04T14:32:19Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-04T13:44:14Z | 2026-07-04T13:46:24Z | 2m 10s |
| red | 2026-07-04T13:46:24Z | 2026-07-04T14:04:14Z | 17m 50s |
| green | 2026-07-04T14:04:14Z | 2026-07-04T14:10:20Z | 6m 6s |
| review | 2026-07-04T14:10:20Z | 2026-07-04T14:24:04Z | 13m 44s |
| green | 2026-07-04T14:24:04Z | 2026-07-04T14:26:36Z | 2m 32s |
| review | 2026-07-04T14:26:36Z | 2026-07-04T14:32:19Z | 5m 43s |
| finish | 2026-07-04T14:32:19Z | - | - |

## Sm Assessment

**Story nature:** A calibration bug surfaced by the first live bz1 playtest — the camera/scale reads too close, so obstacles and enemies loom larger and nearer than intended. Sibling bz2-2 (arcade vector font) is done; this is the next p2 item in the bz2 followup epic.

**Routing decision:** tdd (phased) → handing off to **TEA (Han Solo)** for the RED phase. The right RED gate is a projection test: place an obstacle/enemy at a known world distance and assert it projects to the expected screen size/position under the correct camera params. That failing test pins the miscalibration precisely; DEV then corrects the FOV / near-plane / projection-scale constants in GREEN.

**Scope guidance for downstream agents:**
- Work lives in battlezone `src/core` Math Box (math3d) projection + camera params, with `src/shell` render config. Hand-rolled projection — Canvas 2D, no 3D engine.
- Keep the fix to camera/scale calibration constants. Do not refactor the projection pipeline or touch unrelated sim behavior.
- The epic closes with an explicit live playtest pass (later story), so leave the change verifiable by eye at correct distance, not just numerically.

**Blockers:** None. Branch `fix/bz2-3-camera-scale-calibration` created off develop; session and context files in place. Local tracking only (no Jira).

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Conflict** (non-blocking): widening the scene display FOV decouples it from the
  background horizon, which still renders at the 45° cone. Affects
  `src/core/horizon.ts` (`BACKDROP_FOV = H_FOV`, and the module comment lines ~13-15 /
  ~111 claiming "backdrop and scene share one FOV" becomes stale). Per findings §7 the
  object/background parallax ("objects move out of sync with the background") is
  AUTHENTIC, so a scene-only widen is likely correct — but Dev/reviewer should
  consciously decide whether the backdrop widens too, and update horizon.ts's now-stale
  comment either way. bz2-3 scopes itself to the object/scene projection only.
- **Question** (non-blocking): the exact 90° display-FOV magnitude is quarry-unconfirmed
  (rests on the epic's "90° horizon" claim; see Design Deviation). Affects the calibration
  constant Dev introduces — the epic-closing live playtest is the final gate; a retune to a
  different wide value there is a follow-up tuning story, not a defect in this fix.
  *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): the scene/backdrop FOV divergence is now LIVE — the 3D
  scene renders at ~90° (`DISPLAY_FOV`) while the mountains stay at 45° (`BACKDROP_FOV`).
  Affects `src/core/horizon.ts` (backdrop framing). This is the authentic §7 parallax and
  in scope only for objects, so I kept the backdrop at 45° and updated its stale "shared
  FOV" comment. Reviewer/playtest should eyeball whether the mountains-vs-objects framing
  reads acceptably; a wider backdrop is a bz1-12 / epic-closing-playtest call, not a bz2-3
  defect. *Found by Dev during implementation.*
- **Improvement** (non-blocking): bz2-3 is a VISUAL calibration whose numeric target is
  verified by the projection tests, but its final feel is the epic-closing live playtest's
  gate (per SM scope). Affects the bz2 epic close (the playtest story confirms objects read
  at correct distance by eye, and can retune `DISPLAY_FOV` if 90° feels off).
  *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): the backdrop-vs-scene VERTICAL relationship is a visual
  design call for the epic-closing playtest / bz1-12. Affects `src/core/horizon.ts` (line
  127 keeps the backdrop's elevation→y scale at `tan(H_FOV/2)/aspect`, so the backdrop is
  now uniformly a 45° projection while the scene renders at ~90° — mountains/moon ride
  ~2.41× taller relative to 3D objects than pre-bz2-3). This is self-consistent and matches
  the documented "keep the backdrop at 45°" choice, but the playtest should confirm the
  skyline still reads right now that objects zoomed out. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Pinned the display FOV to 90° despite the magnitude being quarry-unconfirmed**
  - Spec source: context-epic-bz2.md (playtest: "camera/scale reads too close"); findings §7; bz1-3 session history
  - Spec text: "Objects render within a 45° visibility cone; the background horizon spans 90° FOV" (epic bz1 known-facts; the 90° was logged quarry-unconfirmed in bz1-3)
  - Implementation: tests assert `sceneProjection` subtends a 90° horizontal display FOV (= 2× the CONFIRMED 45° cone), not an open-ended "wider than 45°"
  - Rationale: TDD needs a concrete target. 90° is the one documented candidate, is exactly 2× the confirmed cone (principled, not arbitrary), yields the clean focal-length-1 projection, and reproduces the §7 object/background parallax. Left as a bare inequality it would be an untestable calibration. The tests carry the "wider than the cone" inequality AND the 90° target, so a playtest retune fails loudly rather than silently.
  - Severity: moderate
  - Forward impact: the epic-closing live playtest is the final calibration gate; a retune updates these `toBeCloseTo(2*H_FOV)` targets in one place (scene-calibration.test.ts + the scene.test.ts block).
- **Retargeted an existing bz1-3 test contract (the 45°-display-FOV assertions)**
  - Spec source: tests/core/scene.test.ts, describe "scene — sceneProjection pins the 45° horizontal FOV (findings §7)"
  - Spec text: "an eye-space point at bearing +22.5° lands at the NDC edge |x| ≈ 1" (pinned the 45° cone AS the display FOV)
  - Implementation: that block is retitled and its two edge assertions retargeted — the screen edge is now a 45° bearing (90° field) and the 22.5° cone edge lands at |x| ≈ 0.414, inside the frame
  - Rationale: those assertions encoded the CONFLATION bug (visibility cone reused as display FOV). Leaving them would block GREEN and re-assert the defect. bz1-3 mislabeled §7 (a visibility/cull fact) as the display-FOV contract; the playtest proved that wrong.
  - Severity: moderate
  - Forward impact: none — the cull cone / radar wedge / horizon backdrop still key off `H_FOV` (45°), which is unchanged and guarded by a new test.

### Dev (implementation)
- **Placed DISPLAY_FOV in camera.ts, not scene.ts as TEA's contract suggested**
  - Spec source: TEA Assessment → "The fix contract (GREEN)" ("In `src/core/scene.ts` … introduce a new display-FOV constant")
  - Spec text: "introduce a *separate* display-FOV constant" feeding sceneProjection
  - Implementation: `DISPLAY_FOV = 2 * H_FOV` is defined in `src/core/camera.ts` (beside `H_FOV`/`NEAR_CULL`/`FAR_CULL`), imported by `scene.ts`; `scene.ts` no longer imports `H_FOV`
  - Rationale: camera.ts is the home of the camera/projection constants and where `H_FOV` is defined — co-locating `DISPLAY_FOV` there makes the visibility-cone-vs-display-FOV distinction explicit at the exact point the bz1-3 conflation originated. The tests derive the FOV from the projection matrix (they don't import the constant), so location is free.
  - Severity: minor
  - Forward impact: none — a separate, wider display FOV was introduced exactly as the contract intended; only its file location differs.
- **Left BACKDROP_FOV at 45° (did not widen the horizon) — a scope decision**
  - Spec source: TEA Delivery Finding (Conflict, non-blocking) on the scene/backdrop FOV interaction; story scope (obstacles & enemies)
  - Spec text: "Dev/reviewer should consciously decide whether the backdrop widens too"
  - Implementation: `BACKDROP_FOV` stays `= H_FOV` (45°); only its now-stale "shared FOV" comment was updated. The 3D scene alone widened to `DISPLAY_FOV`.
  - Rationale: bz2-3's AC is "obstacles and enemies read at correct distance" (objects only); §7 confirms object/background parallax is authentic, so a scene-only widen matches both scope and the ROM. Widening the backdrop is bz1-12 / epic-closing-playtest territory.
  - Severity: minor
  - Forward impact: the mountains now sit at a narrower field than the scene (authentic parallax); bz1-12 / the playtest may revisit backdrop framing.

### Reviewer (audit)
- **TEA: Pinned the display FOV to 90° (quarry-unconfirmed)** → ✓ ACCEPTED: 90° = 2× the CONFIRMED cone is principled, transparently flagged, and gated by the epic-closing playtest. The tests carry both the "wider than the cone" inequality and the 90° target, so a retune fails loudly. Sound.
- **TEA: Retargeted the bz1-3 45°-display-FOV assertions** → ✓ ACCEPTED: those assertions encoded the conflation bug; retargeting was necessary for GREEN and the cull cone / radar / backdrop still key off the unchanged `H_FOV` (guarded by a new test). Correct.
- **Dev: Placed DISPLAY_FOV in camera.ts, not scene.ts** → ✓ ACCEPTED: camera.ts is the home of `H_FOV`/`NEAR_CULL`/`FAR_CULL`; co-locating makes the cone-vs-display distinction explicit where the conflation originated. Better than the suggested location.
- **Dev: Left BACKDROP_FOV at 45°** → ✓ ACCEPTED (horizontal): keeping the backdrop's azimuth field at 45° is the §7-authentic parallax and in scope. BUT the deviation reasons only about the HORIZONTAL field — see the UNDOCUMENTED entry below for the vertical side effect it did not address.
- **UNDOCUMENTED — backdrop VERTICAL scale silently diverged from the scene:** Spec/design said (horizon.ts:114-116 comment) the backdrop's elevation→y uses "the same vertical scale the 3D scene uses (tan(fovY/2) = tan(H_FOV/2)/aspect), so backdrop and scene share one vertical geometry." Code (horizon.ts:127) still computes `y = tan(elevation)/(tan(H_FOV/2)/aspect)`, but the scene's vertical scale now derives from `DISPLAY_FOV`, so that comment is now FALSE and the two vertical geometries differ by ~2.41×. The Dev deviation documented the horizontal divergence but not this vertical one. Severity: LOW (documentation-primary — the resulting uniform-45° backdrop is self-consistent and an acceptable design, but the code must not ship claiming the opposite). Corroborated by [RULE]. → Sent back for a doc-only fix. **✓ RESOLVED (round 2, commit 6d833f8):** the JSDoc now describes the uniform-45° backdrop as INDEPENDENT of `DISPLAY_FOV`, with an inline guard note at the `y` computation; re-verified by preflight (GREEN) + rule-checker (both comments RESOLVED, 0 new violations).

## TEA Assessment

**Tests Required:** Yes
**Reason:** Camera/scale calibration bug — the RED gate pins the corrected projection so DEV's fix is verifiable, not eyeballed.

**Test Files:**
- `battlezone/tests/core/scene-calibration.test.ts` (NEW) — the full bz2-3 contract: the defect (display FOV must be wider than the 45° cull cone), the 90° target, a guard that the confirmed cone + cull window are unchanged, and an integration test that a real obstacle no longer looms off-frame.
- `battlezone/tests/core/scene.test.ts` (EDITED) — retargeted the `sceneProjection` FOV describe block, whose bz1-3 assertions had pinned the *buggy* 45°-display behavior (see Design Deviation).

**Tests Written:** 6 new + 3 retargeted = **9 failing tests**, covering the one AC (obstacles/enemies read at correct distance).
**Status:** RED — confirmed via `testing-runner`: **9 failed / 380 passed**, all failures confined to the two files above, **zero collateral** (horizon/radar/math3d untouched), no TS/compile errors.

### Root cause (for DEV / Yoda)
`sceneProjection` reused `H_FOV` (the ROM-confirmed 45° **visibility/cull** cone, findings §7) as the **display** FOV. Perspective is scale-invariant, so object size is governed only by FOV — and a 45° display FOV magnifies everything by `1/tan(22.5°) ≈ 2.41×`: an object at the cull-cone edge lands exactly on the screen edge, so everything fills the screen and "looms." The §7 quote ("objects move out of sync with the background") is itself proof the display field is *wider* than the cull cone.

### The fix contract (GREEN)
- In `src/core/scene.ts`, project a **wider display field** — the ~90° background-horizon (2× the cone), i.e. a new display-FOV constant of `2 * H_FOV` (`Math.PI / 2`) feeding `sceneProjection`. Target: `matrix[0] → 1.0` (focal length 1); the 45° cone edge then lands at |NDC x| ≈ 0.414.
- **Do NOT** change `H_FOV`, `NEAR_CULL`, or `FAR_CULL` — introduce a *separate* display-FOV constant. `H_FOV` still drives the radar wedge (`render.ts`) and the horizon backdrop (`horizon.ts`); repurposing it would break both. Guard tests enforce this.
- Firing/aim is world-space (reticle fixed at NDC centre) — no change needed; widening the FOV cannot desync "shoot what you aim at".
- See the two Delivery Findings re: the scene/backdrop FOV interaction and horizon.ts's now-stale "shared FOV" comment.

### Rule Coverage
| Rule (typescript.md) | Test(s) | Status |
|---|---|---|
| #8 test quality — meaningful assertions, import from `src/` not `dist/`, no `as any` | every test asserts a concrete numeric value; `projectModel` test guards against vacuous `[]` pass | ✅ satisfied |
| #2 `readonly` on array/object params | `ndcAtBearing` returns `readonly [number,number,number]` | ✅ satisfied |

**Rules checked:** the pure-projection RED tests exercise #8 and #2. The remaining checks (#1 type escapes, #3 enums, #4 null/undefined, #5 modules, #6 React, #7/#11 async/error, #9 build, #10/#12 input-validation/perf, #13 fix-regressions) are DEV-side implementation concerns with no surface in a deterministic math test file — no `as any`, no I/O, no user input, no async.
**Self-check:** 0 vacuous tests — no `assert(true)`, no `let _ =`, no `is_none`-style always-passing checks; the one `[]`-return path is explicitly guarded with `expect(segs.length).toBeGreaterThan(0)`.

**Handoff:** To DEV (Yoda) for GREEN implementation.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/camera.ts` — added `DISPLAY_FOV = 2 * H_FOV` (~90° horizon display field) beside `H_FOV`, with a comment on the visibility-cone vs display-FOV distinction (the conflation's origin).
- `src/core/scene.ts` — `sceneProjection` now derives fovY from `DISPLAY_FOV` instead of `H_FOV`; dropped the now-unused `H_FOV` import; updated the stale "45° FOV" comments.
- `src/core/horizon.ts` — comment-only: corrected the stale "backdrop and scene share one FOV" claim to document the intentional (authentic §7) scene/backdrop divergence. `BACKDROP_FOV` unchanged.

**Fix:** The one-line behavioral change is `H_FOV → DISPLAY_FOV` in `sceneProjection`. `H_FOV` / `NEAR_CULL` / `FAR_CULL` are untouched, so the radar wedge, distance culling, and firing are unaffected. The projected field is now ~90° (focal length 1): a cull-cone-edge object lands at |NDC x| ≈ 0.414 instead of on the screen edge, so obstacles/enemies read ~2.41× farther — the "too close" symptom resolved.

**Tests:** 389/389 passing (GREEN). Verified via `testing-runner`: all 9 target tests pass, zero failures suite-wide, `tsc --noEmit` clean, `vite build` succeeds.

**Branch:** `fix/bz2-3-camera-scale-calibration` (pushed to origin, tracking set).

**Self-review:**
- Wired up: `sceneProjection` is the single projection the render loop (`main.ts`) already calls for obstacles, the player shell, and enemies — the fix reaches all of them through the existing path.
- Minimal: one constant + one operand swap; no new abstractions, no pipeline refactor (respects SM scope guidance).
- AC met: the failing projection tests now pass; numeric calibration verified. Visual/feel confirmation is the epic-closing playtest's gate by design.
- No debug code; working tree clean (one pre-existing untracked `README.md`, not from this story, left alone).

**Handoff:** To Reviewer (Obi-Wan Kenobi) for code review.

### Dev Rework (round 1 — doc-only)

Reviewer REJECTED for two stale/contradictory comments (behavioral fix accepted). Both fixed — comment-only, no code or test-logic change:
- `src/core/horizon.ts` — rewrote the `panoramaToNdc` JSDoc: the backdrop is a UNIFORM 45° projection (azimuth + elevation), independent of the scene's `DISPLAY_FOV` (removed the false "share one vertical geometry" claim). Added an inline note at the `y` computation so a maintainer won't "sync" it to `DISPLAY_FOV` and break the intentional §7 parallax (the exact trap the reviewer's devil's advocate flagged).
- `tests/core/scene.test.ts` — updated the top-of-file contract header (`sceneProjection` comment + the §7 line) from "45° horizontal FOV" to the ~90° `DISPLAY_FOV` contract, matching the rewritten describe block.

**Tests:** 389/389 GREEN, `tsc --noEmit` clean, `vite build` ok (comment-only). **Pushed:** `6d833f8`.
Reviewer's non-blocking delivery finding (backdrop-vs-scene vertical relationship → epic-closing playtest / bz1-12) left as-is; it is deferred, not a bz2-3 defect.

**Handoff:** Back to Reviewer (Obi-Wan Kenobi) for re-review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
Round 1 (behavioral review) → REJECTED for 2 stale comments. Round 2 (re-review of the doc-only rework) below.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | R1: 0 smells / 389 GREEN. R2: still 389/389 GREEN, tsc+build clean, rework confirmed doc-only | N/A (GREEN confirmed both rounds) |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — domain covered by Reviewer |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — domain covered by Reviewer |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — domain covered by Reviewer |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — domain covered by Reviewer (drove the 2 stale-comment findings) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — domain covered by Reviewer |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — domain covered by Reviewer |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — domain covered by Reviewer |
| 9 | reviewer-rule-checker | Yes | clean | R1: 13 rules clean + 2 stale-comment violations. R2: both comments RESOLVED, 0 new violations, 13 rules clean | confirmed 0 (R1's 2 now fixed & re-verified), dismissed 0, deferred 0 |

**All received:** Yes (2 enabled subagents returned each round; 7 disabled via `workflow.reviewer_subagents`, pre-filled as Skipped)
**Total findings:** Round 1: 2 confirmed (stale comments, LOW) → fixed in commit 6d833f8. Round 2: 0 findings — both resolved, 0 new.

## Reviewer Assessment

**Verdict:** APPROVED (round 2 — after the round-1 doc-only rework)

**Data flow traced:** camera pose → `sceneProjection(aspect)` (now `DISPLAY_FOV`-based) → `projectModel`/`obstacleSegments` → NDC → `render.ts` pixels. Safe: pure, deterministic geometry; no user input, I/O, or error surface. The wider field reaches obstacles, the player shell, and enemies via the single `sceneProjection` (`main.ts:84/90/101/104`).
**Pattern observed:** clean constant decouple — `DISPLAY_FOV = 2 * H_FOV` (`camera.ts:57`) feeds `sceneProjection` (`scene.ts:65`) while `H_FOV` remains the cull/radar/backdrop cone. Minimal and correct.
**Error handling:** N/A — pure math; no `try/catch`, no fallbacks, no nullable returns introduced. Cull window + behind-eye guard unchanged.

**History / rationale:** **Round 1 — REJECTED** for two documentation-correctness defects the fix left behind (comments asserting the *opposite* of the code): `horizon.ts:114-116` ("backdrop and scene share one vertical geometry", false after `DISPLAY_FOV`) and `scene.test.ts:16,28-29` ("45° horizontal FOV" contract header). The behavioral fix was accepted in round 1; only the comments blocked merge. **Round 2 — both RESOLVED** in commit `6d833f8` (comment-only): the `horizon.ts` JSDoc now describes the uniform-45° backdrop as independent of `DISPLAY_FOV` with an inline guard note preventing the "sync to DISPLAY_FOV" trap; the `scene.test.ts` header now states the ~90° `DISPLAY_FOV` contract. Re-verified: preflight GREEN (389/389, tsc+build clean, rework confirmed doc-only) and rule-checker (both comments RESOLVED, 0 new violations, 13 numbered rules clean). No behavioral or test-logic change since round 1's accepted code.

**Round 1 findings (both ✓ RESOLVED in round 2, commit 6d833f8 — retained as record):**

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [LOW] ✓resolved | `[RULE]`/`[DOC]` Comment asserts the OPPOSITE of the code: "the same vertical scale the 3D scene uses (tan(fovY/2) = tan(H_FOV/2)/aspect), so backdrop and scene share one vertical geometry" — but the scene now derives its vertical scale from `DISPLAY_FOV`, so they differ ~2.41×. This is the 2nd of the two stale comments TEA flagged; only the `:13` block was fixed. | `src/core/horizon.ts:114-116` (and the `:127` `y` computation it describes) | Rewrite the comment to state the backdrop is uniformly at `H_FOV` (45°) for BOTH azimuth and elevation, independent of the scene's `DISPLAY_FOV` (the §7 parallax choice, vertical included). No code change needed — the uniform-45° backdrop is self-consistent and an accepted design. |
| [LOW] | `[RULE]`/`[DOC]` Top-of-file contract header still declares "45° horizontal FOV" / "sceneProjection pins a 45° HORIZONTAL field of view at every aspect ratio" — contradicts the describe block this same diff rewrote to test the ~90° display field. | `tests/core/scene.test.ts:16, 28-29` | Update the header contract text to the ~90° `DISPLAY_FOV`; note that §7's 45° is now the culling cone, not the display FOV. |

### Observations
1. `[VERIFIED]` The fix is a clean decouple: `sceneProjection` derives `fovY` from `DISPLAY_FOV` — evidence: `camera.ts:57` (`export const DISPLAY_FOV = 2 * H_FOV`), `scene.ts:65` (`Math.tan(DISPLAY_FOV / 2)`). `matrix[0] → 1.0` (90°) confirmed by preflight 389/389 GREEN + the calibration tests. Complies with all applicable lang-review rules (rule-checker: 0/35 violations).
2. `[VERIFIED]` No dangling reference from the import change — `scene.ts:31` drops `H_FOV`; grep shows `H_FOV` survives only in prose comments; `tsc --noEmit` (with `noUnusedLocals`) is clean. Rule #5 (modules/unused imports) compliant.
3. `[VERIFIED]` Wiring reaches every rendered object — `main.ts:84` `obstacleSegments`, `:90`/`:101`/`:104` `projectModel(SHELL/…)` all flow through the single `sceneProjection`; the wider FOV covers obstacles, the player shell, and enemies. Story AC ("obstacles AND enemies") satisfied.
4. `[VERIFIED]` `[SEC]`/`[SIMPLE]` Firing/aim cannot desync — `firing.ts` `GUNSIGHT_NDC = [0,0]` (screen centre) and collisions are world-space; FOV-independent, so "shoot what you aim at" holds. No security surface (pure internal geometry, no user input/I/O). The fix is minimal (one const + one operand swap) — no over-engineering.
5. `[TEST]` Test quality is strong — the new tests assert concrete numeric relationships, are non-vacuous under the pre-fix formula, and the `projectModel` integration test guards against a vacuous `[]` pass (`expect(segs.length).toBeGreaterThan(0)`). Verified good; import from `src/`, no `as any`.
6. `[RULE]`/`[DOC]` **FINDING** — stale/false comment `horizon.ts:114-116` (see severity table). Confirmed by rule-checker (high) and my own trace of the vertical-scale math.
7. `[RULE]`/`[DOC]` **FINDING** — stale header contract `scene.test.ts:16, 28-29` (see severity table). Confirmed by rule-checker (high) and my own read.
8. `[EDGE]`/`[SILENT]` No new boundary or silent-failure risk — aspect-invariance holds at 4:3/16:9/1:1 (and `fovY = 2·atan(1/aspect)` stays `< 180°` for any aspect > 0, no singularity); distance culling `[NEAR_CULL, FAR_CULL]` and the behind-eye guard are unchanged; pure math, no `try/catch`/fallbacks to swallow errors.
9. `[TYPE]` Type design clean — `DISPLAY_FOV` is a typed numeric const; `ndcAtBearing` returns a `readonly` tuple; no stringly-typed APIs or casts introduced.

### Rule Compliance
Lang-review (`typescript.md`) checked exhaustively by `reviewer-rule-checker` across 35 instances — **0 violations** on rules #1 (type-safety escapes), #2 (generics/`readonly`), #3 (enums — N/A), #4 (null/undefined — N/A), #5 (modules/imports — `H_FOV` removed cleanly, no `.js` needed under `moduleResolution: bundler`), #6 (React — N/A), #7 (async — N/A), #8 (test quality — all non-vacuous, `src` imports), #9 (build config — unchanged), #10 (input validation — N/A, no user input), #11 (error handling — N/A), #12 (perf/bundle — specific named imports), #13 (fix-regression meta — clean). The only defects are the two stale comments above, which fall under the reviewer's comment-analysis domain, not a numbered lang rule. No `.claude/rules/*.md` or `SOUL.md` exist in this repo.

### Devil's Advocate
Assume this is broken. First attack: **the 90° magnitude is a guess.** It rests on the epic's quarry-unconfirmed "90° horizon" claim; a stressed playtester could find objects now read *too far* (over-corrected), and no automated test can catch "feels wrong" — only the epic-closing playtest. This is a genuine residual risk, but it is transparently documented, the target is pinned loudly (tests fail if retuned), and choosing a wider field is unambiguously the right *direction* for a "too close" bug. Not a defect in this story. Second attack: **the stale comment is a live trap.** A future maintainer touching `horizon.ts` reads line 115 ("backdrop and scene share one vertical geometry"), believes the backdrop tracks the scene, and "fixes" line 127 to use `DISPLAY_FOV` — silently destroying the intended §7 parallax. This is precisely why a contradictory comment is worse than a missing one, and why I am bouncing for the fix rather than deferring it. Third attack: **extreme aspect ratios.** `fovY = 2·atan(tan(45°)/aspect)`; as `aspect → 0` (portrait), `fovY → 180°` but never reaches it (atan is bounded) and `tan(fovY/2) = 1/aspect` stays finite — no divide-by-zero, no NaN. The calibration tests only exercise `aspect ≥ 1`, a minor coverage gap, but the game runs landscape and the math is continuous, so not a bug. Fourth attack: **the backdrop now looks wrong** — mountains/moon ride ~2.41× taller relative to the shrunken 3D world. Visible, yes; broken, no — nothing clips off-screen (moon at NDC y ≈ 0.79, mountains ≤ 0.42, horizon at 0), it is self-consistent, and it is the explicit domain of bz1-12 / the playtest, which I've captured as a delivery finding. None of these rise to Critical/High; the two comment defects are what block a clean merge.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story. Both round-1 findings resolved and re-verified; no open blockers. Non-blocking delivery finding (backdrop-vs-scene vertical relationship) carried forward to the epic-closing playtest / bz1-12.