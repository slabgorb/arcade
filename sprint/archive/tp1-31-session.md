---
story_id: "tp1-31"
jira_key: "tp1-31"
epic: "tp1"
workflow: "tdd"
---
# Story tp1-31: THE FRAMING — the per-well screen-Z vanishing point (ZADJL) translates the whole tube, and it slides in at level start (DB-008, deferred from tp1-9)

## Story Details
- **ID:** tp1-31
- **Jira Key:** tp1-31
- **Workflow:** tdd
- **Stack Parent:** tp1-9 (deferred from; superseded a-1 branch `fix/tp1-9-camera-per-well-far-ratio` contains complete port base)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-14T18:51:59Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-14T18:34:37Z | 2026-07-14T18:36:15Z | 1m 38s |
| red | 2026-07-14T18:36:15Z | 2026-07-14T18:41:53Z | 5m 38s |
| green | 2026-07-14T18:41:53Z | 2026-07-14T18:47:55Z | 6m 2s |
| review | 2026-07-14T18:47:55Z | 2026-07-14T18:51:59Z | 4m 4s |
| finish | 2026-07-14T18:51:59Z | - | - |

## Sm Assessment

**Setup complete — routing to TEA (O'Brien) for the RED phase.**

- **Story:** tp1-31, 3 points, p1, epic tp1 — "THE FRAMING": DB-008's per-well screen-Z translate (ZADJL) + the level-start slide, deferred from tp1-9 by the checkout that shipped tempest #113.
- **Repos:** tempest (gitflow; branched `feat/tp1-31-framing-screen-z-slide` from origin/develop at d1df2ab).
- **Workflow:** tdd (phased). Routed per SETUP_RESULT: next_agent = tea.
- **Merge gate:** clear — no open PRs on slabgorb/tempest (the superseded a-1 tp1-9 branch has no PR).
- **THE HEADLINE for TEA/Dev — this story is a PORT, not a fresh build.** a-1's superseded branch `fix/tp1-9-camera-per-well-far-ratio` (pushed; RED 63d2647, GREEN 5a9fcc8) contains a complete, Reviewer-verified implementation of exactly this scope, built pre-#113. Port its delta onto upstream's `Tube.farRatio` API. Full inventory: `sprint/archive/tp1-9-session-superseded-a1.md` (Reviewer Assessment + Delivery Findings).
- **The load-bearing unit lesson (do NOT lose this):** ZADJ is a POST-divide ROM screen-unit quantity (WORSCR: `SCREEN Z = [FACTOR/(PY-EY)]*(PZ-EZ)+SZCENT`, ALDISP.MAC:2049-2051, FACTOR = 256 via the math-box high byte; `ADC ZADJL` :2274). Rim-relative port: `screenZ = −ZADJ·(16+H)·RING_SCALE/256`. The tp1-31 story description lists raw ZADJ values with no conversion — a RED written naively from it re-creates the 6.4× error the superseded review caught.
- **Also folded in by Reviewer ruling (see superseded session findings):** the starfield scene-origin anchor fix (develop draws the warp field half a screen off-centre — upstream #113 kept the pre-phosphor `(W/2, H/2)` anchor) and the stale origin-anchored VP glow in drawTube. Both are one-line render fixes in the same framing territory.
- **Sources of truth for the port:** superseded branch files `src/core/{state,sim}.ts` (CameraState, snap/ease/stepCamera), `src/core/geometry.ts` (ZADJ table + screenZ derivation — re-home onto upstream's makeRingTube), `src/shell/render.ts` (scene translate + anchors), `tests/core/tp1-9.camera-slide.test.ts` + the AC-3 describes of `tests/core/tp1-9.per-well-camera.test.ts` (rename to tp1-31.*, adapt to farRatio API).

## TEA Assessment

**Tests Required:** Yes
**Reason:** p1 fidelity story — new Tube data, new sim state, render wiring. RED is a PORT of the Reviewer-verified suites from the superseded a-1 tp1-9 branch (5a9fcc8), adapted to the #113 `farRatio` API.

**Test Files:**
- `tempest/tests/core/tp1-31.screen-z.test.ts` — `tube.screenZ = −ZADJ·(16+H)·RING_SCALE/256` for all 16 levels (ROM-byte literals, WELSEQ remap tripwire on level 9, exactly-one-zero figure-8, wrap totality, finiteness) PLUS an explicit refutation of the naive world-unit conversion (−ZADJ·S) so the 6.4× error the superseded review caught cannot resurrect from the story description's raw table.
- `tempest/tests/core/tp1-31.camera-slide.test.ts` — `s.camera.screenZ` snaps at game start, eases ~⅛-per-frame over ~8 ROM frames on wave advance (1→2 up, 7→8 down across a sign change), monotone, no overshoot, deterministic; arrival literals independent of tube.screenZ (tp1-27 lesson).
- `tempest/tests/shell/tp1-31.framing.test.ts` — `?raw` scans: render consumes camera.screenZ; starfield anchored at the scene origin (kills the half-screen displacement still live on develop); no hard-coded `arc(0, 0, …)` (the VP glow must follow the far ring).

**Tests Written:** 13 tests
**Status:** RED (13/13 failing — testing-runner RUN_ID tp1-31-tea-red; ZERO pre-GREEN passes in the new files; 1114 existing tests green including upstream's tp1-9 suites)

**Sibling re-seats (TEA-owned):** `geometry.test.ts` + `geometry.lane-width.test.ts` Tube literals gain the new `screenZ` field (neutral 0; neither test reads it). `src/core/modelView.ts`'s flatTube literal is Dev's (src).

**Rule Coverage:** TS #4 (finiteness across the roster — screen-z suite); TS #8 (vacuous-trace guards ported: `Number.isFinite` before `toEqual`); rest n/a (no enums/async/JSX/config; readonly is tsc-gated).

**Handoff notes for Julia (Dev):** port from `fix/tp1-9-camera-per-well-far-ratio` (5a9fcc8): `state.ts` CameraState + initialState (near-verbatim), `sim.ts` cloneState/startGameAtLevel-snap/advanceLevel-ease/stepCamera (near-verbatim), `geometry.ts` ZADJ table + screenZ derivation re-homed onto upstream's makeRingTube (their HOLEYL lives as `ROM_EYE_Y` — reuse it for the (16+H) factor; add `screenZ: 0` to makeCircleTube and modelView's flatTube), `render.ts` `pctx.translate(0, s.camera.screenZ)` after beginScene + starfield origin anchor (+ scene-unit reach) + VP glow re-anchored on the far-ring centroid (not `arc(0,0)`). Citations: stamp DB-008 `remediated_by: tp1-31`; run `node tools/audit/reanchor-citations.mjs --write` (WD-013 and others cite render.ts lines); the superseded archive documents the whole path.

**Handoff:** To Julia (Dev) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `tempest/src/core/geometry.ts` — `Tube.screenZ` + `ROM_ZADJ` table (HOLZAD/HOLZDH, ALDISP.MAC:1387-1388) + `ROM_SCREEN_FACTOR = 256`; derivation `−ZADJ·(16+H)·RING_SCALE/256` in makeRingTube; `screenZ: 0` on synthetic tubes (makeCircleTube).
- `tempest/src/core/state.ts` — `CameraState { screenZ, slidePerFrame }`; initialState snaps to the level-1 target.
- `tempest/src/core/sim.ts` — cloneState carries camera; startGameAtLevel snaps (CNWLF2); advanceLevel arms the ⅛-gap ease (ZADEST); stepCamera applies per playing frame with a direction-aware clamp.
- `tempest/src/shell/render.ts` — whole-scene `pctx.translate(0, s.camera.screenZ)`; drawStarfield re-anchored at the scene origin with scene-unit reach (fixes the half-screen displacement live on develop since the phosphor refactor); VP glow anchored on the far-ring centroid instead of `arc(0,0)`.
- `tempest/src/core/modelView.ts` — flatTube gains `screenZ: 0` (mechanical).
- `tempest/docs/audit/findings/` — DB-008 stamped `remediated_by: tp1-31`; WD-013 re-quoted to the new call text; reanchor clean (161 citations, 0 lost).

**Tests:** 1127/1127 passing (GREEN, 98 files — testing-runner RUN_ID tp1-31-dev-green); `tsc --noEmit` + `npm run build` clean; citations green.
**Branch:** feat/tp1-31-framing-screen-z-slide (pushed; RED 981e6b8, GREEN d0f388b)

**Port fidelity note:** implementation is byte-for-byte the superseded branch's logic re-homed onto upstream's API, except (a) the ZADJ table is named `ROM_ZADJ` matching upstream's `ROM_EYE_*` convention, and (b) the VP-glow centroid fix is NEW (it was a Reviewer finding, not in the superseded branch).

**Handoff:** To the Thought Police (Reviewer).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (1127/1127 green, tsc+build clean, 0 smells, tree clean, 0 behind origin/develop) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings |

**All received:** Yes (1 returned, 8 disabled via workflow.reviewer_subagents — analytical review performed directly by Reviewer)
**Total findings:** 0 confirmed, 0 dismissed, 0 deferred (one process observation recorded as a Delivery Finding)

## Reviewer Assessment

**Verdict:** APPROVED

**Supersession check (the tp1-9 lesson, run FIRST):** origin/develop has NOT moved — this branch is 0 behind / 2 ahead. However `origin/feat/tp1-31-framing-zadjl-screen-z` appeared mid-review: the sibling checkout is racing THIS story too, unmerged. We are ahead with GREEN complete; recorded as a Delivery Finding and re-checked at finish before merge.

**Review basis:** this diff is the PORT of an implementation I already reviewed in full this session (superseded tp1-9 branch — full checklist, Devil's Advocate, and unit-derivation verification recorded in `sprint/archive/tp1-9-session-superseded-a1.md`). This pass verified the port itself hunk-by-hunk plus the one NEW piece (the VP-glow centroid).

### Observations

1. `[VERIFIED]` The screenZ derivation survived the port intact: `(-ROM_ZADJ[tube] * (16 + H) * RING_SCALE) / ROM_SCREEN_FACTOR` with H = ROM_EYE_Y[tube] (upstream's own HOLEYL transcription — single source, no second spelling; the tp1-27 two-spellings trap avoided). Verified against WORSCR (ALDISP.MAC:2049-2051, FACTOR=256 high-byte load, ADC ZADJL :2274) in the superseded review; the test suite pins all 16 wells to ROM-byte literals plus an explicit world-unit refutation.
2. `[VERIFIED]` The slide state machine ports byte-for-byte: snap in startGameAtLevel (CNWLF2), ⅛-gap fixed step armed in advanceLevel (ZADEST), per-call stepCamera with direction-aware clamp, cloneState carries camera (sim.ts diff hunks read directly). One stepPlaying call = one ROM frame — the qframe convention, consistent with the ROM_FPS·SIM_STEP=1 loop contract.
3. `[VERIFIED]` The whole-scene translate is placed correctly: after beginScene's centre-origin transform, before every scene draw (tube, spikes, warp starfield, enemies, bullets, player, particles, explosions all on pctx); HUD/overlays draw on the main ctx after composite and stay fixed — matching WORSCR adding ZADJL to projected points only.
4. `[VERIFIED]` The starfield re-anchor is faithful and contained: dots at `arc(ux*r, uy*r)` about the scene origin (DSTARF's PXL=PZL=0x80), reach re-based to scene units (720·0.6); upstream's starReachFraction law untouched. The half-screen displacement live on develop since the phosphor refactor dies here.
5. `[VERIFIED]` The VP-glow centroid (the one NEW piece): mean of tube.far, closed tubes only; the contact sheet's direct drawTube caller uses an OPEN flat tube so the new loop never runs there; self-crossing figure-8 centroid ≈ origin (VP=0 well) — correct degenerate behaviour.
6. `[VERIFIED]` Citations: DB-008 stamped `remediated_by: tp1-31` (NO_COUNTERPART + null ours — the combination the tp1-5 rework legalised); WD-013 re-quoted to the new call text (still live for tp1-10's starfield gating); reanchor reports 161 clean / 0 lost; citations suite green.
7. `[LOW]` The 9 findings-JSON files in the diff are line-number reanchors from the tool plus the two deliberate edits above — verified intentional, no content drift.

### Rule Compliance (lang-review typescript)

| Check | Result |
|---|---|
| #1 type escapes | Compliant — none in diff (preflight grep 0) |
| #2 readonly | Compliant — Tube.screenZ readonly; CameraState mutable per GameState substate convention |
| #3/#5/#6/#7/#9 | N/A — no enums/module tricks/JSX/async/config |
| #4 null/undefined & divides | Compliant — screenZ from positive-denominator constants; finiteness pinned across the roster |
| #8 test quality | Compliant — vacuous-trace guards ported; no .only/.skip |

### Devil's Advocate

Argue this port is broken: the strongest attack is that a port of once-reviewed code invites rubber-stamping — the reviewer pattern-matches "same as before" and misses an adaptation error. So where could adaptation have bitten? (a) The (16+H) factor now reads upstream's ROM_EYE_Y instead of our WellEye.distance — if upstream's transcription differed from ours the screenZ literals would shift; but both transcribe HOLEYL identically (byte-checked in both reviews) and the 16-level literal suite would catch any divergence. (b) Upstream's makeCircleTube derives farRatio from radii — synthetic tubes get screenZ: 0 by construction here, so no synthetic ever translates; correct, since ZADJ is a ROM-well table. (c) The translate could double-apply if drawWarp or drawStarfield internally re-centred — read both: neither translates; the starfield's OLD self-centring is precisely what this diff deletes. (d) A subtler one: fx.shake applies in composite() AFTER the scene translate — shake displaces the already-translated image, which is correct (the cabinet shakes the whole picture). (e) The racing sibling branch could merge first and this review's baseline evaporates — mitigated by re-checking origin/develop at finish before merging; if they land first, the supersession protocol runs again with roles reversed. (f) The slide arming in advanceLevel mutates s.camera on the clone — verified cloneState copies camera before any arm runs. Nothing here changes the verdict; the finish-time re-check is mandatory.

**Data flow traced:** ROM byte tables → makeRingTube (build-time) → tube.screenZ → advanceLevel/startGameAtLevel → s.camera (per-frame, pure) → render translate. Only runtime input is s.level via tubeForLevel's total mod-16 wrap.
**Pattern observed:** single-source ROM constants beside their siblings (`ROM_ZADJ` next to `ROM_EYE_Y/Z`, geometry.ts) — the anti-two-spellings pattern.
**Error handling:** pure arithmetic; poles excluded by construction; totality pinned.
**Handoff:** To Winston Smith (SM) for finish-story — with a MANDATORY origin/develop re-check before merge (racing sibling branch), and the PR merge requires the Comrade's authorization per the self-approval guardrail.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Improvement** (non-blocking): the tp1-31 story description lists the raw ZADJ table with no unit-conversion guidance — the exact gap that produced the superseded tp1-9 RED's 6.4× error. The refutation test now guards it, but future deferral stories should carry the unit derivation in the YAML description, not just in an archived session. Affects `sprint/epic-tp1.yaml` (story-authoring practice). *Found by TEA during test design.*
- No other upstream findings — the full inventory for this scope lives in `sprint/archive/tp1-9-session-superseded-a1.md`.

### Dev (implementation)

- No upstream findings during implementation — the port applied cleanly; all discoveries for this scope were already recorded by the superseded tp1-9 session and TEA above.

### Reviewer (code review)

- **Conflict** (blocking for finish): **the sibling checkout is racing tp1-31 too** — `origin/feat/tp1-31-framing-zadjl-screen-z` appeared during this review (unmerged; origin/develop unmoved; no open PR; no orchestrator claim). This branch is COMPLETE (GREEN + reviewed) and ahead. SM must re-check origin/develop immediately before merging, and the Comrade should stop the sibling session's duplicate work if it is still running. Affects `tempest` (merge timing) and the sibling checkout (abort signal).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): this is the SECOND same-day race on one backlog (tp1-9, now tp1-31) — the cross-checkout claim mechanism proposed in the superseded session's findings (story claim pushed to orchestrator main at setup) is now demonstrably worth building. Affects `.pennyfarthing` (sm-setup / merge-gate design).
  *Found by Reviewer during code review.*

## Impact Summary

**Findings:** 3 total (1 blocking, 2 non-blocking)

### Key Observations

1. **Blocking Issue — Sibling Checkout Race (Reviewer):**
   - The branch `origin/feat/tp1-31-framing-zadjl-screen-z` exists on the remote (unmerged, no PR, no orchestrator claim)
   - This story branch is COMPLETE (GREEN + APPROVED) and ahead in the same scope
   - **Action Required:** SM must re-check origin/develop immediately before merge to determine precedence
   - Sibling checkout session should be stopped if still running to prevent duplicate work

2. **Story Description Gap (TEA):**
   - Story description lists raw ZADJ values without unit-conversion guidance
   - Caused the 6.4× error in the superseded tp1-9 RED
   - **Mitigation:** Refutation test guards the regression; future deferral stories should embed unit derivation in YAML

3. **Process Improvement (Reviewer):**
   - Second same-day race on one backlog (tp1-9, now tp1-31)
   - Cross-checkout claim mechanism (pushing story claim to orchestrator main at setup) would prevent this
   - Affects `.pennyfarthing` sm-setup / merge-gate design

### Readiness Assessment

- **Session File:** Complete (all phases documented, verdicts present)
- **Implementation:** GREEN (1127/1127 tests passing, tsc clean, build clean)
- **Review Status:** APPROVED (verdict present; Devil's Advocate traced data flow)
- **Branch Status:** Pushed and clean, up to date with origin
- **PR Status:** Exists, OPEN, CLEAN merge status (ready for manual merge by user)

### Blocking Conditions for Finish

✓ Reviewer verdict: APPROVED  
✓ Tests passing: 1127/1127  
✓ Build clean: Yes  
✓ Branch pushed: Yes  
✓ PR exists: Yes (PR #115, CLEAN)  

⚠ **BLOCKING for merge:** Confirm origin/develop state before merge; if sibling branch `origin/feat/tp1-31-framing-zadjl-screen-z` landed, determine precedence per supersession protocol (re-review if sibling is ahead).


## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **The slide's state lives in the CORE (s.camera), not the shell**
  - Spec source: sprint/epic-tp1.yaml tp1-31 description
  - Spec text: "Implement as a shell screen-translate of the whole Tube + a per-level tween; does not touch core projection"
  - Implementation: tests pin `GameState.camera.screenZ` animated by the sim; render only APPLIES the translate (the projection itself is untouched, honouring the description's intent)
  - Rationale: the tween needs new-wave vs new-life knowledge only the sim has; sim-side state is deterministic/replayable (the shell has no story-aware clock), and the ported implementation proved it under the full suite. "Does not touch core projection" is satisfied — perspectiveDepth/project are unchanged by this story
  - Severity: minor
  - Forward impact: tp1-10's dive camera will extend the same `s.camera` seam.
- **Render application pinned by source-scan only** (render cannot run in node; behavioural pins live in the pure core suites; same seam as 10-4/6-17/tp1-9)
  - Spec source: tp1-31 description ("screen-translate of the whole Tube")
  - Spec text: as above
  - Implementation: `?raw` scans for camera.screenZ consumption, origin-anchored starfield, no arc(0,0)
  - Rationale: node-env constraint; the two visual defects this story fixes were themselves found by direct code reading, recorded in the superseded review
  - Severity: minor
  - Forward impact: Reviewer should eyeball the framing on a dev server.
- **Port provenance: RED suites ported from the superseded tp1-9 branch** (5a9fcc8), renamed and adapted to the farRatio API; intents unchanged; the screenZ literals carry the corrected post-divide units
  - Spec source: sprint/archive/tp1-9-session-superseded-a1.md (Reviewer Assessment)
  - Spec text: "the tp1-31 re-scope MUST carry the corrected derivation"
  - Implementation: literals `−ZADJ·(16+H)·S/256` + an explicit world-unit refutation test
  - Severity: minor
  - Forward impact: none.
- **Mid-slide death→respawn snap remains unpinned** (carried from the superseded session: our respawn does not re-run well init; the ROM's CNWLF2 path snaps)
  - Spec source: DB-008 claim
  - Spec text: "on a new life it snaps to the table value"
  - Implementation: game-start snap pinned; mid-slide respawn behaviour left to tp1-10/Reviewer
  - Severity: minor
  - Forward impact: tp1-10 reworks the same camera state.

### Dev (implementation)
- **The VP-glow fix uses the far-ring centroid, not the exact projected VP**
  - Spec source: sprint/archive/tp1-9-session-superseded-a1.md, Reviewer finding ("anchor at the far-ring centroid")
  - Spec text: "the far ring converges on the per-well VP … one-line fix (anchor at the far-ring centroid)"
  - Implementation: glow at mean(tube.far) — the centroid tracks the VP displacement (VP·(1−R) for centred rings) but is not the VP itself; geometry does not export the VP or eye Z
  - Rationale: the glow is decoration marking the well's hole; the hole's visual centre IS the far-ring centroid, computable from public Tube data without widening the API
  - Severity: minor
  - Forward impact: if tp1-10 exports eye/VP data, the glow could anchor on the true VP; cosmetically indistinguishable.
- **No other deviations** — the port matches the superseded, Reviewer-stamped implementation.

### Reviewer (audit)

- **TEA: slide state in the CORE (s.camera), not the shell** → ✓ ACCEPTED by Reviewer: the story description's "shell tween" was the sibling TEA's suggestion, not a ROM constraint; the sim owns wave/life transitions and determinism. "Does not touch core projection" is honoured — perspectiveDepth/project are untouched by this diff (verified: geometry diff adds data only).
- **TEA: render application scan-pinned only** → ✓ ACCEPTED by Reviewer: node-env constraint stands; I read all three render hunks directly (below).
- **TEA: port provenance with corrected units** → ✓ ACCEPTED by Reviewer: the −ZADJ·(16+H)·S/256 derivation was independently verified against WORSCR in the superseded review and re-checked here; the world-unit refutation test guards the regression path.
- **TEA: mid-slide respawn snap unpinned** → ✓ ACCEPTED by Reviewer: carried to tp1-10, which reworks this exact state.
- **Dev: VP-glow at the far-ring centroid, not the exact VP** → ✓ ACCEPTED by Reviewer: the centroid is the hole's visual centre, derivable from public Tube data; for centred rings it differs from the VP only by R·(near centroid) ≈ 0. Decoration, not projection.
- **Dev: no other deviations** → ✓ ACCEPTED by Reviewer: diffed the port hunk-by-hunk against the superseded branch — logic identical, names re-homed (`ROM_ZADJ` beside `ROM_EYE_*`).