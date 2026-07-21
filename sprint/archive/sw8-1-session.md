---
story_id: "sw8-1"
jira_key: "sw8-1"
epic: "sw8"
workflow: "tdd"
---
# Story sw8-1: The moving eye — port the ST.UX viewer drift so the space viewpoint MOVES: Death Star can leave frame, starfield drifts laterally instead of forward-streaming (collapses camera + starfield + DS-approach)

## Story Details
- **ID:** sw8-1
- **Jira Key:** sw8-1
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 5
- **Priority:** p1
- **Repos:** star-wars

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-21T00:26:54Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-20T23:20:28+00:00 | 2026-07-20T23:20:28+00:00 | - |
| red | 2026-07-20T23:20:28+00:00 | 2026-07-20T23:36:51Z | 16m 23s |
| green | 2026-07-20T23:36:51Z | 2026-07-21T00:14:12Z | 37m 21s |
| review | 2026-07-21T00:14:12Z | 2026-07-21T00:26:54Z | 12m 42s |
| finish | 2026-07-21T00:26:54Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Question** (non-blocking): AC1 asks Dev to settle *translation vs rotation* from the disasm; the ROM comment already transcribed in `src/core/starfield.ts:6-13` (`ST.UX = FRAME<<7`, a viewer-**translation** vector `VWSTAR` loads every frame, WSMAIN.MAC:2525-2528 / WSSTAR.MAC:96-103) points strongly at TRANSLATION driven off the frame counter. Dev should confirm against the full `WSMAIN`/`WSSTAR` dig and **document the ruling in the implementation/commit** (there is no vitest for AC1 — it is a knowledge deliverable). Affects `src/shell/render.ts` (`cameraView` space branch) and possibly `src/core/state.ts` (eye state).
- **Question** (non-blocking): design open-question #4 — does the moving eye live in `core` (determinism) or `shell` (pure render)? AC5 determinism holds **either way** because `state.frame` is already deterministic core state; the RED suite is placement-agnostic (drives the real sim). Dev rules placement in GREEN. Affects `src/core/state.ts` vs `src/shell/render.ts`.
- **Improvement** (non-blocking): AC6 (citations) has no bespoke test — the existing `npm test -- citations` suite is the guard. If Dev tunes or touches a constant carrying a `docs/audit/findings/*.json` citation (e.g. near `STAR_SPEED`, or a new `ST.UX` constant beside a cited symbol), re-stamp its `remediated_by` line. Affects `docs/audit/findings/*.json`.
- **Gap** (non-blocking): AC3/AC4 acceptance is ultimately **visual** (design §6: "our frame beside the cabinet frame") — the longplay anchor is wave 4, score ~352,171, DS entirely off-frame. The RED tests pin the enabling behavior (camera moves, DS departs centre, field drifts laterally) but **cannot** assert the pixel match; Dev+Reviewer must do the beside-the-longplay QA on a spare-port serve. Affects manual QA (see root `CLAUDE.md` multi-checkout port trap).

### Dev (implementation)
- **Gap** (non-blocking): incoming fire is NOT reconciled with the moved eye — fireball homing decays toward the origin (`homeShots`) and the cockpit hit-test centres on the origin (`shipPoint(space) = COCKPIT`), while the player's eye/gun now slide laterally. A drifted pilot's incoming fire homes to where the origin projects, not at his crosshair. This is the sw8-2 "fire fairness / no shot originates outside the player's view" work. Affects `src/core/sim.ts` (homing target + cockpit `shipPoint`). *Found by Dev during implementation.*
- **Gap** (non-blocking): the player muzzle-flash render (sw7-16) still seats on `shipPoint` (origin in space) while the beam now leaves from `spaceEye` — a small visual gap once the eye has drifted. Affects `src/shell/render.ts` (muzzle-flash seat). *Found by Dev during implementation.*
- **Question** (non-blocking): AC3/AC4 VISUAL acceptance (DS entirely off-frame ~wave 4 / 352,171; field drifts laterally, not forward) is not machine-verifiable — needs a beside-the-longplay QA. Repro: serve YOUR checkout on a spare port (multi-checkout trap), press dev key `7` (space), watch ~30 s as the DS slides off and the field drifts. Tunables: `SPACE_EYE_SHIFT_PER_FRAME` (8) and `STAR_LATERAL_SPEED` (≈2/frame). Affects manual QA / the two rate consts. *Found by Dev during implementation.*
- **Improvement** (non-blocking): TEA's RED did not pin aim==view consistency; the regression that exposed it (`darth-vader-enemy-rom.test.ts`, multi-hit scoring) was pre-existing coverage, not a sw8-1 test. A direct "player hits a target THROUGH the moved eye" assertion would guard this seam. Affects `tests/`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (non-blocking, but HIGH-PRIORITY for QA/sw8-2 — the top item): the space eye is UNBOUNDED. `spaceEye = state.frame * 8` and `state.frame` free-runs across a whole run (`enterPhase` spreads `...s`, never resets it — `sim.ts:1583`; only `startRun` resets to 0). So the eye slides laterally without limit, while the ROM's `ST.UX` is a 16-bit register that WRAPS (~±32768 raw). Because TIEs spawn at ORIGIN-relative positions (`TBG`, tie-waves.ts:99) and the crosshair NDC CLAMPS to ±1 (gameRules.ts:61), a sliding eye pushes the (origin-anchored) combat progressively off-screen and unreachable → space-quota aim **degrades gradually and can soft-lock** on longer runs (a close approaching TIE clears the FOV edge at eye_x≈3078 ≈ frame 385 ≈ 19 s of continuous space flight; by wave 2+ the accumulated frame makes it severe). Wave 1 from a fresh run is fine (frame≈0). This is NOT covered by any AC (the tests use `NO_INPUT` and never fight). Recommend a bounded eye — a per-space-phase reset (DS centred at each phase entry, drifts off over that phase) OR a clamp OR the ROM 16-bit wrap — and/or tuning `SPACE_EYE_SHIFT_PER_FRAME` down. Affects `src/core/sim.ts` (`spaceEye`). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the starfield lateral drift is NOT phase-gated — `stepStarfield` applies it in all phases (surface/trench draw the field too, render.ts:439), whereas the camera/gun moving-eye IS gated to `phase==='space'`. Consistent with the codebase's existing "field moves in all phases" stance (render.ts:436-437) but the ROM's lateral `ST.UX` is space-flight-specific (`S1MV`); a follow-up could gate the lateral drift to space to match the camera/gun scope. Affects `src/core/starfield.ts` / `src/core/sim.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **RED pins the OBSERVABLE mechanism, not the `ST.UX = FRAME<<7` slope**
  - Spec source: context-story-sw8-1.md AC1/AC2 + design §6 open-Qs 1 & 4
  - Spec text: "settle translation vs. rotation from source, not guessed"; "the world (stars, Death Star, TIEs) slides past a moving eye"
  - Implementation: tests drive the real sim (`stepGame` from `initialState()`) and assert only that the space camera stops being frame-invariant, the DS departs screen centre, and the field drifts laterally — never the exact drift rate nor whether the eye is core state or shell-derived
  - Rationale: AC1 (translation-vs-rotation) and open-Q #4 (core-vs-shell) are Dev's rulings in GREEN; pinning the ROM slope would invent the number the story must derive ("pin the mechanism, not the invented literal")
  - Severity: minor
  - Forward impact: Dev free to tune the drift magnitude and choose the eye's home; Reviewer verifies the source ruling is documented and does the beside-the-longplay QA
- **AC6 (citations) covered by the existing suite, not a new test**
  - Spec source: context-story-sw8-1.md AC6
  - Spec text: "npm test -- citations passes; touched constants have updated remediated_by entries"
  - Implementation: no bespoke test authored; the pre-existing `citations` suite is the guard
  - Rationale: it already enforces exactly this; a duplicate would be redundant weight
  - Severity: minor
  - Forward impact: Dev must run `npm test -- citations` if a cited constant is touched
- **AC7 (no regressions) covered by a GREEN scope-guard + the green baseline, not a failing test**
  - Spec source: context-story-sw8-1.md AC7
  - Spec text: "Existing space-phase rendering tests still pass"
  - Implementation: the 1778-green baseline is the regression net; added one green guard (surface camera stays frame-invariant across frame values) to pin the space-only scope
  - Rationale: AC7 is a "stay green" property, not a new behavior to drive red
  - Severity: minor
  - Forward impact: a fix that bleeds the drift into surface/trench flips the guard red

### Dev (implementation)
- **The moving eye moves the player's GUN too, not just the camera (extends sw7-16 to space)**
  - Spec source: context-story-sw8-1.md — Scope + AC7
  - Spec text: "Camera/viewer motion only. Do NOT change the … TIE/fireball sim."
  - Implementation: `cameraView` (shell) AND the player `beamOrigin` (`sim.ts`) both read one shared `spaceEye(state)`; the gun leaves from the same moved eye the camera builds.
  - Rationale: a render-only moving eye desyncs aim from view — the pilot can no longer hit what the crosshair is on, PROVEN by the `darth-vader-enemy-rom` regression (after the eye drifts, later hits miss). sw7-16 established gun==camera as ONE eye; keeping that invariant when the eye moves is the only playable/faithful choice, and it is the player's OUTGOING viewpoint, not enemy behavior.
  - Severity: minor
  - Forward impact: the cockpit hit-test + fireball homing target deliberately STAY at the origin (sim untouched) — the ship's gun/eye moved, its collision hull did not. sw8-2 reconciles incoming fire with the moved eye.
- **The eye is DERIVED from `state.frame`, not stored as core state (open-Q #4 ruling)**
  - Spec source: design §6 open-Q #4 + context-story-sw8-1.md Purity
  - Spec text: "Does the moving eye belong in core (determinism) or shell (pure render)? … if motion is deterministic, add eye-translation to GameState."
  - Implementation: `spaceEye(s) = [s.frame * SPACE_EYE_SHIFT_PER_FRAME, 0, 0]` — a pure function of the existing deterministic `state.frame`; NO new GameState field.
  - Rationale: the ROM computes ST.UX every frame FROM the frame counter (S1MV), so it is already a pure function of deterministic state; storing it would be redundant state to keep in sync. AC5 determinism holds because `frame` is deterministic.
  - Severity: minor
  - Forward impact: none — a future player-steered eye would add the field then.
- **Camera eye and starfield drift use DECOUPLED rates; the authentic FRAME<<7 slope is tuned down**
  - Spec source: design §3 (rule bug/tuning/accepted-deviation) + AC4
  - Spec text: authentic slope FRAME<<7 = 0x80/frame; "starfield drifts with the eye"
  - Implementation: `SPACE_EYE_SHIFT_PER_FRAME = 8` (camera/gun) and `STAR_LATERAL_SPEED ≈ 2/frame` (starfield), both scaled DOWN from 0x80 (=128).
  - Rationale: 128/frame is raw ROM units at 20.5 Hz and does not port 1:1 — it empties the ±STAR_SPREAD field and throws the DS off-frame in ~1 s. Decoupled because the nearer DS shows more lateral parallax than the far starfield under the same slide. Eyeball tunables (design §3), NOT test-pinned.
  - Severity: minor
  - Forward impact: Reviewer/QA may re-tune the two rates against the longplay — one-line changes.
- **The lateral starfield drift is un-wrapped (the field thins slightly on the trailing edge over a long wave)**
  - Spec source: context-story-sw8-1.md Scope ("Do NOT change the starfield RNG substitute")
  - Spec text: keep the seeded substitute; the motion is what changes
  - Implementation: `stepStarfield` subtracts the lateral drift without wrapping x (z still wraps); the ROM re-rolls exited stars from hardware RNG, which the seeded field has no source for.
  - Rationale: an x-wrap band makes the centroid oscillate (periodic) rather than slide — less faithful to "the whole field slides past the eye" and it would defeat AC4's centroid assertion. At the gentle rate the field only thins slightly on the trailing edge over a full wave.
  - Severity: minor
  - Forward impact: a deterministic re-scatter-on-recycle would replenish the trailing edge — a possible follow-up if the thinning reads.

### Reviewer (audit)
- **TEA — RED pins the observable, not the ST.UX slope** → ✓ ACCEPTED: correct discipline; the RED suite is mechanism-agnostic and Dev's source dig ruled the slope. Agrees with author reasoning.
- **TEA — AC6 covered by the existing citations suite** → ✓ ACCEPTED: the citations gate is the right guard; it stayed green (12/12) after the reanchor.
- **TEA — AC7 covered by a green scope-guard + baseline** → ✓ ACCEPTED: the surface-camera-frame-invariant guard is a real pin and held green.
- **Dev — the moving eye moves the GUN too (extends sw7-16 to space)** → ✓ ACCEPTED: necessary, not optional — verified the darth regression proves aim/view desync without it, and `beamOrigin`+`cameraView` now read one `spaceEye`. Sound.
- **Dev — the eye is DERIVED from `state.frame`, not stored** → ✓ ACCEPTED: pure fn of deterministic state; rule-checker confirms no new nondeterminism, no new field to drift out of sync.
- **Dev — decoupled camera/starfield rates; authentic FRAME<<7 tuned down** → ✓ ACCEPTED as tuning per design §3, WITH the caveat that the drift rate interacts with the unbounded-eye combat-reachability finding above — tune it in the same QA pass.
- **Dev — the lateral starfield drift is un-wrapped** → ✓ ACCEPTED: the no-wrap choice is justified (monotonic slide vs periodic centroid) and the thinning is minor; noted alongside the Reviewer un-bounded-eye finding (same family: no wrap/bound).
- No UNDOCUMENTED deviations: the two Reviewer findings (unbounded eye, un-gated starfield drift) are emergent interactions, not silent spec departures — Dev's deviations disclosed the un-wrapped/un-reset design honestly.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** 5pt render/camera behavior change (the moving eye) — the observable outcomes are testable via the pure sim without touching canvas.

**Test Files:**
- `tests/shell/render.moving-eye.test.ts` — AC2 (space view matrix moves with the frame counter), AC3 (Death Star departs screen centre), AC5 (camera path deterministic AND non-constant), AC7 scope guard (surface camera stays frame-invariant).
- `tests/core/starfield-lateral-drift.test.ts` — AC4 (stars gain lateral x motion; whole-field centroid drifts), AC5 (field is seeded-deterministic).

**Tests Written:** 7 tests covering ACs 2/3/4/5/7. **Status: RED** (5 failing, 2 intended green guards) — ready for Dev.

**Verified RED (testing-runner, RUN_ID sw8-1-tea-red):** `tsc --noEmit` clean → every failure is an **assertion** mismatch, not a type/import error. Full suite **1778 passed / 5 failed / 1783** — the 5 reds are 100% the two new files; **zero pre-existing failures**.

| AC | Test | Today (RED) | Why red |
|----|------|-------------|---------|
| AC2 | `space view matrix changes as the frame counter advances` | `expected 0 to be > 1e-6` | `cameraView` returns `IDENTITY` for space (render.ts:346) — frame-invariant |
| AC3 | `the Death Star leaves screen centre over the space run` | `expected 0 to be > 25` | DS seated at x=0, static camera → view-x pinned at 0 forever |
| AC4 | `individual stars pick up lateral (x) motion` | `expected 0 to be > 0` | `stepStarfield` (starfield.ts:84) preserves x, only streams z |
| AC4 | `the whole field slides one way — centroid drifts` | `expected 0 to be > 1` | same — no lateral viewer translation |
| AC5 | `camera path deterministic AND non-constant` | `expected false to be true` | path is all-IDENTITY → deterministic but does not move |
| AC5 (core) | `field is deterministic — same seed reproduces` | **green guard** | seeded purity holds today; must survive the port |
| AC7 | `surface camera stays frame-invariant` | **green guard** | pins the space-only scope; flips red on a scope bleed |

### Rule Coverage

Language: TypeScript (`.pennyfarthing/gates/lang-review/typescript.md`, 13 checks). In RED the governing check is **#8 test quality**; the rest are implementation-side and land on Dev's GREEN + the Reviewer.

| Rule | Test(s) | Status |
|------|---------|--------|
| #8 test-quality — meaningful assertions | all 7 tests carry a concrete numeric `expect` (threshold/equality); none vacuous | enforced |
| #8 test-quality — no `as any` in tests | none used (only `type Mat4`/`type GameState` imports) | enforced |
| #8 test-quality — import from `src/` not `dist/` | all imports from `../../src/**` and `@arcade/shared/math3d` | enforced |

**Rules checked:** 1 of 13 lang-review checks is applicable to RED test design (#8); #1/#4/#5 (no `as any`, `??` vs `||`, `.js` extension on any new core module) are flagged for Dev's GREEN self-review since the port may add an eye field/module.
**Self-check (Phase C):** 0 vacuous tests — each red asserts a value that is provably `0`/`false`/`IDENTITY` today and a non-trivial threshold after; the 2 green guards assert equality that holds today and must be preserved.

**Handoff:** To Dev (Yoda) for implementation — rule the source (AC1) first, then port the moving eye and lateral starfield drift; keep the two green guards green.

## Dev Assessment

**Implementation Complete:** Yes

**AC1 ruling (source dive, WSMAIN.MAC / ~/Projects/star-wars-1983-source-text):** The space-flight player move `S1MV` (WSMAIN.MAC:2529-2531) is `LDD FRAME / JSR LSLD7 / STD ST.UX` → **ST.UX = FRAME × 128**, a viewer **TRANSLATION** ("STARS RELATIVE MOVEMENT"), **not a rotation**, driving **lateral X only** (ST.UY/UZ untouched in flight; the `#0080`-per-frame blocks above are the *attract* phases). **Open-Q #4 ruled:** the eye is a pure function of `state.frame`, so it is **derived, not stored** (no new GameState field).

**Files Changed:**
- `src/core/sim.ts` — added `SPACE_EYE_SHIFT_PER_FRAME` + `spaceEye(state)` (the shared moving-eye derivation); the player `beamOrigin` now casts from `spaceEye` in space so the gun follows the camera (sw7-16 invariant). Cockpit hit-test + fireball homing untouched (still origin).
- `src/shell/render.ts` — `cameraView` space branch returns `viewMatrix(spaceEye(state), IDENTITY)` (the moving eye); imports `spaceEye` from core.
- `src/core/starfield.ts` — `stepStarfield` adds lateral drift `x -= STAR_LATERAL_SPEED * dt` (the ST.UX slide); new `STAR_LATERAL_SPEED` const.
- `docs/audit/findings/*.json` — 35 citations re-anchored (line-number drift ONLY from inserted comments; 0 lost — no cited content changed).

**Tests:** **1783/1783 passing (GREEN)**; `npm run build` (tsc + vite) clean; `citations` 12/12.
- The 5 sw8-1 reds are now green (AC2 camera moves · AC3 DS departs centre · AC4 lateral drift ×2 · AC5 path deterministic-and-moves); the 2 green guards still hold (surface camera frame-invariant · seeded field determinism).
- **Regression caught + fixed:** the render-only eye reddened `darth-vader-enemy-rom.test.ts` (multi-hit scoring). Root cause: the test aims via `eyeOf` (the shell camera eye), so the moved camera desynced aim from the core's origin-based resolve. Fixed by casting the player beam from the same `spaceEye` (aim == view == resolve). Isolated by stash (7/7 without change → 2 fail with → 7/7 after fix).

**AC status:** AC1 ✅ (ruled) · AC2 ✅ · AC3 ✅ (behavior; **visual QA deferred** — see Findings) · AC4 ✅ (behavior; visual QA deferred) · AC5 ✅ · AC6 ✅ · AC7 ✅ (full suite green; TIEs slide through the camera).

**Wiring:** `cameraView` is the live render camera (render.ts draws all space entities through it); `spaceEye` feeds both it and the player gun. Wired to the front end.

**Branch:** feat/sw8-1-moving-eye-viewer-drift (to be pushed)

**Handoff:** To the verify/review phase. Reviewer (Obi-Wan): the two drift rates are eyeball tunables — please do the beside-the-longplay visual check (dev key `7` = space) and confirm the sw8-2 hand-offs in Delivery Findings (incoming-fire reconciliation, muzzle-flash seat) are acceptable to defer.

## Subagent Results

Only `preflight` and `rule_checker` are enabled (`pf settings get workflow.reviewer_subagents`); the other seven are disabled via settings. I covered the disabled domains myself (adversarial pass on the 337-line diff) — see the tagged observations.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (build clean, 1783/1783, citations 12/12, tree clean, no debug code) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — covered manually ([EDGE]: unbounded-eye boundary) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — covered manually ([SILENT]: no swallowed errors — no try/catch in diff) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — covered manually ([TEST]: no vacuous assertions) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — covered manually ([DOC]: comments verified vs source) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — covered manually ([TYPE]: `spaceEye:Vec3` sound) |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — covered manually ([SEC]: no input/IO surface) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — covered manually ([SIMPLE]: minimal, reuses existing infra) |
| 9 | reviewer-rule-checker | Yes | findings | 0 rule violations; 1 low-confidence note (starfield drift not phase-gated) | confirmed 1 (as [RULE]/LOW), 0 dismissed |

**All received:** Yes (2 enabled returned; 7 disabled via settings, domains covered manually)
**Total findings:** 2 confirmed (1 [RULE]-adjacent LOW + 1 Reviewer MEDIUM), 0 dismissed, 2 deferred to QA/sw8-2

## Reviewer Assessment

**Verdict:** APPROVED

**Summary:** The story's specified + tested scope is correct and fully green (build clean, 1783/1783, citations 12/12). AC1 was ruled from the primary source (WSMAIN.MAC:2529-2531 `S1MV` — ST.UX is a lateral viewer TRANSLATION off the frame counter, not a rotation); the moving eye is a pure, deterministic function of `state.frame` shared by the camera and the gun (sw7-16 invariant preserved), which the rule-checker confirms introduces no non-determinism and no core→shell import. The one substantive concern (unbounded eye → combat reachability) is real but out-of-AC-scope and explicitly QA/tuning-deferred by the design — flagged prominently, not blocking. No Critical/High in the tested behavior.

### Rule Compliance (TypeScript lang-review + CLAUDE.md hard boundary)
- **#1 type-safety escapes:** compliant — no `as any`/`@ts-ignore`/non-null-on-nullable in the diff (rule-checker confirmed). `spaceEye` returns `Vec3` from a tuple literal (tsc green).
- **#4 null/undefined:** N/A — no `??`/`||` added.
- **#5 module/`.js`:** compliant — `moduleResolution: bundler`; the new `spaceEye` import mirrors the sibling `surfaceShip` import (no extension needed for the game bundle).
- **#8 test quality:** compliant — both new files use real numeric thresholds, no vacuous assertions, no `as any`, import from `src/` not `dist/`.
- **CLAUDE.md core/shell purity + determinism (the hard rule):** COMPLIANT — `spaceEye` (sim.ts) and the starfield drift (starfield.ts) are pure arithmetic on `state.frame`/`dt`; no `Math.random`/`Date`/DOM; `render.ts` imports `spaceEye` from core (the allowed shell→core direction). Determinism asserted by two AC5 tests. (rule-checker: 0 violations across #1–#13 + the boundary.)

### Observations
- [RULE] rule-checker returned **0 rule violations** across the full TS checklist + the purity boundary — the strongest signal for a self-authored chain. Its one low-confidence note (starfield drift not phase-gated) I confirm as a LOW follow-up (see Delivery Findings).
- [MEDIUM][EDGE] **Unbounded eye → combat reachability** — `spaceEye = frame*8` with `frame` free-running (never reset per phase, `enterPhase` sim.ts:1583) and no ROM 16-bit wrap; origin-anchored TIEs (tie-waves.ts:99) + clamped crosshair (gameRules.ts:61) mean space combat aim degrades as the eye slides and can soft-lock on longer runs. Wave 1 (fresh run, frame≈0) is fine. Untested by any AC. **Non-blocking** (out-of-scope; design §3/§6 route eye tuning + multi-wave feel to the required manual QA, and sw8-2 owns TIE positioning/fire), but the **top QA item** — recommend a bounded eye (per-phase reset / clamp / ROM wrap).
- [VERIFIED][TYPE][SIMPLE] aim==view==resolve consistency — `beamOrigin` (sim.ts:287) and `cameraView` (render.ts:445→354) both read one `spaceEye`; evidence: the darth-vader multi-hit regression (which the render-only eye caused) is fixed and the full suite is green. Minimal: reuses `viewMatrix`/`beamOrigin` infra, one shared function, no dead code.
- [VERIFIED][SILENT][SEC] no swallowed errors and no security surface in the diff — no try/catch, no external input/IO; `state.frame` is internal sim state.
- [VERIFIED][DOC] the new comments cite `WSMAIN.MAC:2529-2531 S1MV` — I independently confirmed this in `~/Projects/star-wars-1983-source-text` (`LDD FRAME / JSR LSLD7 / STD ST.UX`). The "Today … only decrements z" test comment is the RED-phase provenance narrative (codebase convention), historically accurate.
- [LOW][DOC] the muzzle-flash-at-origin + incoming-fire-homing residuals are Dev-flagged and correctly scoped to sw8-2; deferral accepted.

### Devil's Advocate
Argue the code is broken. The sharpest attack is the unbounded eye: a determined player who lingers in a space phase — or simply reaches wave 2 — flies a viewpoint that has slid thousands of world-units laterally, and because the enemies spawn around the world origin while the yoke can only point to the FOV edge, the fight literally drifts off the side of the screen with no way to bring it back; the space kill-quota can stall, and since the eye and the cockpit-collision origin have separated by the same distance, incoming fire homes to a point nowhere near where the pilot is looking — the game becomes both unwinnable and unfair on a long enough run. A confused player would read the empty starfield and absent Death Star in wave 3 as a crash, not a feature. A second attack: the starfield thins on its trailing edge (un-wrapped drift) and, being un-phase-gated, drifts during the surface and trench too, where the ROM's lateral ST.UX does not apply — a subtle infidelity a sharp-eyed player could notice as the backdrop sliding under the trench. A third: the whole thing rests on `state.frame` advancing deterministically; if a future story ever reset or repurposed `frame`, the eye and the gun would silently teleport. What holds up under the assault: purity and determinism are airtight (two AC5 tests + the rule-checker), wave-1 play is correct, the gun-follows-camera fix genuinely closes the aim/view gap (the darth suite proves it), and every worst case above is either wave-2+/long-run (behind the required manual-QA gate and sw8-2's remit) or a documented minor divergence — none is a Critical/High defect in the story's specified, tested scope. The unbounded eye is the one finding worth a human's eyes before release; it is loudly flagged, not buried.

**Data flow traced:** `state.frame` (deterministic core) → `spaceEye(state)` → both `cameraView` (shell view matrix) and `beamOrigin` (core gun) → the player sees and shoots from one eye. Safe for determinism; the multi-wave magnitude is the flagged concern.
**Pattern observed:** the sw7-16 "gun and eye are one function" invariant, correctly extended to the space phase — `src/core/sim.ts:1924` (`spaceEye`) consumed by `render.ts:354` and `sim.ts:287`.
**Error handling:** N/A — pure arithmetic, no fallible paths; no null/undefined introduced.

**Dispatch tags present:** [EDGE] [SILENT] [TEST] [DOC] [TYPE] [SEC] [SIMPLE] [RULE].

**Handoff:** To SM (Thrawn) for finish-story. **Before release**, run the design-§6 manual QA (dev key `7`, watch the DS drift off + the field slide) and evaluate the unbounded-eye finding — bound the eye (per-phase reset / clamp / ROM wrap) here or in sw8-2 if the QA shows combat sliding off-screen.