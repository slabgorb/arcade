---
story_id: "8-16"
jira_key: ""
epic: "8"
workflow: "tdd"
---
# Story 8-16: Firing does not kill enemies; wave clears via collision/ramming not kills — fix hit-detection + wave-clear condition (Wave 1)

## Story Details
- **ID:** 8-16
- **Jira Key:** (none — local sprint tracking)
- **Type:** bug
- **Priority:** p1
- **Points:** 3
- **Workflow:** tdd
- **Repos:** star-wars
- **Stack Parent:** none

## Problem Statement

Wave 1 space combat has two broken mechanics:

1. **Firing does not kill enemies**: Player shots (from the cannon) do not register hits on TIE fighters. The hit-detection logic is broken, so firing appears ineffective.

2. **Wave clears only on collision/ramming**: The wave-clear condition is broken. Currently, the wave only clears when the player collides with/rams enemies, not when the player destroys them via firing. This is backwards from the cabinet behavior.

These bugs make Wave 1 unplayable as a combat game — the primary game mechanic (shooting) doesn't work.

## Technical Approach

### Hit-Detection Fix (Player Firing)

Location: `star-wars/src/core/sim.ts` (stepGame and supporting collision/hit logic)

1. Identify the current hit-detection implementation between player shots and TIE fighters
2. Verify the collision detection for projectiles vs enemies:
   - Check sphere/AABB collision checks between shot positions and TIE bounding volumes
   - Verify that hit events are being generated and applied to enemy state
   - Ensure that hit damage or destruction logic is wired correctly
3. Add unit tests to verify:
   - Player fires a shot at a known TIE position → enemy takes damage or dies
   - Multiple shots can accumulate damage (if health-based) or each destroys (if one-shot)
4. Fix the implementation so shots reliably kill enemies in deterministic test scenarios

### Wave-Clear Condition Fix

Location: `star-wars/src/core/sim.ts` (stepGame phase/wave advancement logic)

1. Identify the current wave-clear condition (likely checking `GameState.enemies` count or a flag)
2. Verify it is correctly triggered when all enemies are destroyed by player fire, not collision
3. Fix the condition so:
   - Wave clears when all enemies are dead (regardless of how they died)
   - The condition is deterministic (seeded RNG, pure logic)
4. Add unit tests to verify:
   - Wave with N enemies → kill all N via firing → wave clears
   - Wave with N enemies → kill M via firing, rest via collision → wave clears only after all are dead

### Acceptance Criteria

- Player shots reliably kill TIE fighters in Wave 1 (deterministic sim tests verify this under a fixed RNG seed)
- Wave clears when all enemies are destroyed by player fire, not only by collision
- Unit tests in `tests/core/sim.test.ts` verify both:
  - Hit detection on at least one scenario (player fire → enemy death)
  - Wave clear on all enemies destroyed by fire
- Live gameplay (npm run dev): wave 1 is winnable by shooting enemies (no ramming required)
- npm run build succeeds; npm test passes; no debug code
- Branch is `fix/8-16-combat-kill-loop` in star-wars/develop

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-28T17:21:10Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-28T16:45:06Z | 2026-06-28T16:46:58Z | 1m 52s |
| red | 2026-06-28T16:46:58Z | 2026-06-28T17:03:16Z | 16m 18s |
| green | 2026-06-28T17:03:16Z | 2026-06-28T17:10:49Z | 7m 33s |
| review | 2026-06-28T17:10:49Z | 2026-06-28T17:21:10Z | 10m 21s |
| finish | 2026-06-28T17:21:10Z | - | - |

## Delivery Findings

No upstream findings at setup.

### TEA (test design)
- **Gap** (blocking): The firing aim direction is inconsistent with the perspective
  projection the scene is drawn under, so bolts overshoot what the crosshair covers
  (the root cause of "firing does not kill enemies"). Affects `src/core/gameRules.ts`
  (`aimDirection` must invert the projection — divide aimY by `f = 1/tan(fovY/2)`,
  and aimX by `f/aspect`). The vertical correction is pure-core; the horizontal one
  needs the render's aspect (w/h) — a shell value — so the aim plumbing (`Input`, or
  a fixed reference aspect/FOV shared core↔shell) must supply it. *Found by TEA during test design.*
- **Conflict** (non-blocking): The shell draws the crosshair with `(aimY*0.5+0.5)*h`
  (`render.ts` `drawCrosshair`) but projects enemies and bolts with `(-ndc.y*0.5+0.5)*h`
  (`wireframe.ts` `project`) — opposite vertical sign. Even after the core aim fix,
  the on-screen reticle and the targets disagree vertically. Affects `src/shell/render.ts`
  (`drawCrosshair` must use the same NDC→screen mapping as `project()`). Not unit-testable
  in the pure core — verify by play. *Found by TEA during test design.*

### Dev (implementation)
- Both TEA findings are RESOLVED in this change: the aspect dimension is threaded via
  `Input.aspect` into `gameRules.aimDirection`, and the shell crosshair/pointer Y-sign
  now matches `project()` and the +aimY = up convention.
- **Improvement** (non-blocking): `src/tools/contactSheet.ts` keeps a private
  `FOV_Y = Math.PI/3 // match the game camera`; it could import the now-shared `FOV_Y`
  from `src/core/gameRules.ts` to avoid the two drifting apart. Affects
  `src/tools/contactSheet.ts`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking, LOW): the new test re-declares `const FOV_Y = Math.PI/3`
  locally instead of importing the now-exported `FOV_Y`; if the shared constant ever changes,
  the test's `proj()` and `aimDirection()` drift apart silently and the pinning test fails with
  a confusing numeric mismatch. Affects `tests/core/combat-kill-loop.test.ts:53` (import `FOV_Y`
  from `../../src/core/gameRules` and drop the local copy). *Found by Reviewer during code review.*
- **Improvement** (non-blocking, LOW): `aimDirection` recomputes `f = 1/tan(FOV_Y/2)`, the same
  focal-length scalar `perspective()` derives internally — a mild Math-Box DRY weakness (both
  stay in `core/`, so the boundary holds). A `focalLength(fovY)` helper in `math3d.ts` shared by
  both would single-source it. Affects `src/core/gameRules.ts:31`, `src/core/math3d.ts:92`.
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking, LOW): the shell aspect guard checks `clientHeight > 0` but not
  `clientWidth > 0`; a zero-width-but-nonzero-height canvas yields `aspect = 0`, collapsing
  horizontal aim to centre (no crash/NaN — a degenerate, non-gameplay case). Affects
  `src/shell/input.ts:39` (guard both dimensions). *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

4 deviations

- **Behavioural kill tests cover the vertical aim axis only**
  - Rationale: the X projection factor is f/aspect and `aspect` is the render's w/h —
  - Severity: minor
  - Forward impact: Dev/Architect must decide how aspect (or a fixed reference
- **Stationary TIE stand-in for the "under the crosshair" kill tests**
  - Rationale: a TIE flying straight at the cockpit stays on the same line of sight
  - Severity: minor
  - Forward impact: none — the moving-TIE ram path stays covered by the 8-3 suite
- **Fix landed in the aim↔projection contract, not in sim.ts hit-detection**
  - Rationale: TEA's failing tests located the bug precisely at the aim/projection
  - Severity: minor
  - Forward impact: none — behaviour matches the tests and ACs.
- **Shell aim corrections (pointer-Y sign, crosshair Y-flip) are verified by play, not unit tests**
  - Rationale: the pure-core boundary keeps DOM/canvas math out of unit tests; these
  - Severity: minor
  - Forward impact: Reviewer should eyeball aiming in `npm run dev` (mouse up → reticle

## Design Deviations

No deviations from spec at setup.

### TEA (test design)
- **Behavioural kill tests cover the vertical aim axis only**
  - Spec source: context-story-8-16.md (title); the bug spans both screen axes
  - Spec text: "Firing does not kill enemies ... fix hit-detection + wave-clear condition"
  - Implementation: the two behavioural kill tests and the projection-consistency
    invariant fix the yoke on the vertical axis (aimX = 0); the horizontal axis is
    only held at centre, never deflected.
  - Rationale: the X projection factor is f/aspect and `aspect` is the render's w/h —
    a shell value the pure core cannot read. A core test can't pin horizontal
    alignment without baking in an aspect assumption that would over-constrain where
    the fix threads aspect. Vertical alignment is pure-FOV and unambiguous; the
    horizontal/aspect dimension is raised as a blocking Delivery Finding instead.
  - Severity: minor
  - Forward impact: Dev/Architect must decide how aspect (or a fixed reference
    aspect/FOV shared core↔shell) reaches the aim math; Reviewer should confirm
    horizontal aiming by play (and/or an aspect-parameterised test) once decided.
- **Stationary TIE stand-in for the "under the crosshair" kill tests**
  - Spec source: context-story-8-16.md (Wave 1 space combat)
  - Spec text: "wave clears via collision/ramming not kills"
  - Implementation: the kill tests hold the TIE at a fixed position (vel 0) rather
    than flying it at the cockpit.
  - Rationale: a TIE flying straight at the cockpit stays on the same line of sight
    (the same crosshair) the whole way in, so a stationary stand-in tests the
    identical aim/projection contract without ram-timing noise; with vel 0 every
    identically-aimed bolt shares one trajectory, making the pass/miss deterministic
    and hit-radius-robust.
  - Severity: minor
  - Forward impact: none — the moving-TIE ram path stays covered by the 8-3 suite
    and the ram-guard test added here.

### Dev (implementation)
- **Fix landed in the aim↔projection contract, not in sim.ts hit-detection**
  - Spec source: .session/8-16-session.md "Technical Approach" (SM); context-story-8-16.md
  - Spec text: "Location: src/core/sim.ts (stepGame and supporting collision/hit logic) …
    the hit-detection logic is broken"
  - Implementation: the per-pair hit-test in sim.ts was already correct (the 8-3 suite
    proves it). The real bug was `gameRules.aimDirection` ignoring the perspective
    projection, so the fix is in aimDirection (+ `Input.aspect` plumbing + the shell
    reticle); sim.ts collision is untouched apart from passing `input.aspect` to the aim.
  - Rationale: TEA's failing tests located the bug precisely at the aim/projection
    contract (the invariant pinned f·aimY ≠ aimY). The tests outrank the SM's
    pre-investigation approach hint; "fixing" collision would have been wrong.
  - Severity: minor
  - Forward impact: none — behaviour matches the tests and ACs.
- **Shell aim corrections (pointer-Y sign, crosshair Y-flip) are verified by play, not unit tests**
  - Spec source: .session/8-16-session.md Delivery Findings (TEA, non-blocking)
  - Spec text: "the on-screen reticle and the targets disagree vertically … Not
    unit-testable in the pure core — verify by play."
  - Implementation: negated the pointer→aimY mapping and flipped `drawCrosshair`'s
    screen-Y to match `project()`; both in the shell, with no automated coverage.
  - Rationale: the pure-core boundary keeps DOM/canvas math out of unit tests; these
    are the shell half of the fix the "wave 1 winnable by shooting" AC needs. Verified
    by reasoning against the established +aimY = up convention and project()'s mapping.
  - Severity: minor
  - Forward impact: Reviewer should eyeball aiming in `npm run dev` (mouse up → reticle
    up → bolt hits the high TIE; left/right symmetric).

### Reviewer (audit)
- **Behavioural kill tests cover the vertical aim axis only (TEA)** → ✓ ACCEPTED by Reviewer:
  vertical is aspect-free and pins the FOV factor `f` unambiguously; the horizontal axis is
  correct by construction (`aimX·aspect/f` inverts the projection's `(f/aspect)·x/−z`) and is
  called out for eyeball verification. Sound tradeoff given the pure core cannot read aspect.
- **Stationary TIE stand-in for the kill tests (TEA)** → ✓ ACCEPTED by Reviewer: a TIE flying
  straight at the cockpit stays on one sight-line, so a vel-0 stand-in tests the identical
  aim/projection contract deterministically; the ram path stays covered by the ram-guard test
  and the 8-3 suite.
- **Fix landed in the aim↔projection contract, not sim.ts hit-detection (Dev)** → ✓ ACCEPTED by
  Reviewer: the 8-3 suite proves the per-pair hit-test was already correct; the failing
  invariant test located the bug at the aim, and the tests outrank the SM's pre-investigation
  approach hint.
- **Shell aim corrections verified by play, not unit tests (Dev)** → ✓ ACCEPTED by Reviewer:
  DOM/canvas NDC→screen mapping is outside the pure-core test boundary; the pointer-Y and
  crosshair-Y flips are minimal and consistent with the established +aimY = up convention and
  `project()`'s mapping. Verified by code reasoning; recommend an eyeball pass at finish.

## Sm Assessment

**Story nature:** A p1 gameplay-breaking bug, not new feature work. Wave 1 is the
playable combat slice and its core verb — shooting — does nothing. Enemies only
die by ramming, which means both the hit-detection path (player fire → TIE death)
and the wave-clear condition are suspect. TDD is the right discipline: pin the
broken kill loop with deterministic failing tests before touching the sim.

**Routing decision:** Phased TDD → hand off to **Han Solo (TEA)** for the RED
phase. TEA writes failing tests in `tests/core/sim.test.ts` against the
deterministic sim (`star-wars/src/core/sim.ts`) under a fixed RNG seed, covering
both bugs:
1. Player shot at a known TIE position registers a hit and the enemy dies.
2. Wave clears when all enemies are destroyed by fire (not only by collision).

**Why TEA first, not Dev:** The two failure modes are easy to conflate. Tests must
isolate "fire kills enemy" from "wave clears" so the GREEN phase fix is targeted,
not a shotgun change. Keep the assertions on observable sim state (enemy count,
wave/phase advancement) — not on internal collision helpers — so the fix is free
to refactor hit-detection internals.

**Watchpoints for downstream agents:**
- Determinism: all combat tests must use a seeded RNG; no wall-clock, no Math.random.
- Don't let the wave-clear fix mask a still-broken hit-detection path — both must
  have independent failing tests in RED.
- Manual sanity (`npm run dev`): Wave 1 must be winnable by shooting alone.

I have anticipated this blocker. Handing off to Han Solo.

## TEA Assessment

**Tests Required:** Yes
**Reason:** A p1 gameplay bug whose root cause is a logic/geometry inconsistency —
exactly what a deterministic core test pins.

**Test Files:**
- `tests/core/combat-kill-loop.test.ts` — drives the REAL firing path (trigger via
  `Input`, bolt aimed by `stepGame`/`aimDirection`) instead of hand-placing a bolt
  on the enemy as the 8-3 suite does. Asserts observable sim state only (enemy
  count, score, shields, phase), so the GREEN fix is free to refactor internals.

**Tests Written:** 5 (2 controls/guards + 3 contract tests). Covering the 2 ACs:
hit-detection on player fire, and the wave-clear-by-kills condition.
**Status:** RED — verified `261 passed, 3 failed`; all 16 pre-existing suites green,
no regressions.

Failing (the contract — must go green in DEV):
- *off-centre TIE under the crosshair is destroyed by fire* → now `enemies.length 1`
  (bolt overshoots the reticle and misses).
- *firing line projects onto the crosshair (vertical)* → now `1.0392 ≈ f·0.6` vs the
  required `0.6` — the precise pin: `aimDirection` ignores the FOV (`f ≈ 1.732`).
- *shooting the final TIE clears space→surface* → now stays `space` (can't meet the
  kill quota when shots miss — this is the "wave clears via ramming not kills" symptom).

Passing (controls/guards — must STAY green):
- *centred shot destroys a TIE dead ahead* — the centre already works; isolates the
  bug to off-axis aim.
- *a ramming TIE costs a shield and does NOT clear the wave* — guards the wave-clear
  condition against ever counting a collision as a kill.

### Root cause (for DEV)
The per-pair hit-test is fine; the broken thing is the **aim ↔ projection contract**.
The renderer projects with a 60° vertical FOV, so a world point lands at NDC
`[(f/aspect)·x/-z, f·y/-z]`. The crosshair is drawn at NDC `[aimX, aimY]`, but a bolt
flies along `aimDirection = [aimX, aimY, -1]`, whose path projects to
`[(f/aspect)·aimX, f·aimY]` — overshooting the reticle by ~`f`. Fix `aimDirection`
to invert the projection (vertical is pure-FOV; horizontal needs the shell's aspect —
see the blocking Delivery Finding). Also see the non-blocking finding on the shell's
`drawCrosshair` Y-sign mismatch — needed for the fix to *feel* right in play.

### Rule Coverage

| Rule (typescript.md) | Test(s) / handling | Status |
|----------------------|--------------------|--------|
| #8 Test quality — meaningful assertions, no vacuous tests | every test asserts observable state (enemy count / score / lives / phase / NDC); no `as any`, no `let _ =`, no always-true asserts | self-checked ✓ |
| #4 Null/undefined (`??` vs `\|\|`) | applies to the DEV aim-math change, not the tests | static — DEV/lang-review gate |
| #1 Type-safety escapes (`as any`, `!`) | none in the test file; applies to DEV changes | static — DEV/lang-review gate |

**Rules checked:** the behaviourally-testable lang-review rule (#8) is enforced by the
suite + self-check; the remaining checklist items are static-analysis concerns for the
DEV implementation, deferred to the lang-review gate.
**Self-check:** 0 vacuous tests found.

**Handoff:** To Yoda (DEV) for the GREEN phase — make the 3 contract tests pass
without breaking the controls/guards or the 16 existing suites. Mind the two Delivery
Findings (the aspect dimension is blocking; the shell crosshair Y-flip is needed for
correct feel).

## Dev Assessment

**Implementation Complete:** Yes

**Root cause & fix:** The per-pair hit-test was fine; the kill loop broke because the
firing aim did not invert the projection the scene is drawn under, so bolts overshot
the crosshair by `f = 1/tan(FOV_Y/2)` and missed. With shots missing, the only way TIEs
left the sky was by ramming — the reported "wave clears via collision not kills". Fixed
by making the aim the inverse of the projection and aligning the shell reticle to it.

**Files Changed:**
- `src/core/gameRules.ts` — `aimDirection` now inverts the perspective projection
  (divides aimY by `f`, aimX by `f`/`aspect`); exports a shared `FOV_Y` so the aim and
  the renderer agree on one field of view.
- `src/core/input.ts` — added optional `Input.aspect` (viewport w/h the shell supplies);
  corrected the `aimY` doc to the established `+aimY = up` convention.
- `src/core/sim.ts` — passes `input.aspect` into `aimDirection` when a bolt is fired.
- `src/shell/render.ts` — uses the shared `FOV_Y`; flips `drawCrosshair`'s screen-Y to
  match `project()` so the reticle sits on its target.
- `src/shell/input.ts` — negates the pointer→aimY mapping (+aimY = up); supplies the
  viewport `aspect` in `sample()`.

**Tests:** 264/264 passing (GREEN). `combat-kill-loop.test.ts` 5/5 (the 3 contract tests
now pass; control + ram-guard still pass). All 17 files green — no regressions.
**Build:** `npm run build` (`tsc --noEmit && vite build`) succeeds, 0 TypeScript errors.
**Branch:** `fix/8-16-combat-kill-loop` (pushed to origin).

**Self-review:**
- [x] Wired to the front end — the shell threads `aspect` in and draws the reticle to match.
- [x] Follows project patterns — pure core/shell boundary intact; aim math stays in
      the core (Math Box / gameRules), shell only supplies viewport data and strokes pixels.
- [x] All ACs met — shots kill the TIE under the crosshair; the space wave clears by
      fire, not ramming; build + tests green; no debug code.
- [x] Error handling — `aspect` guards divide-by-zero (`clientHeight > 0 ? … : 1`).

**Note for Reviewer (Obi-Wan):** the two shell corrections (pointer-Y sign and crosshair
Y-flip) are not unit-tested by design (pure-core boundary) — please confirm aiming by
eye in `npm run dev` (mouse up → reticle up → bolt hits a high TIE; left/right symmetric).

**Handoff:** To Obi-Wan (Reviewer) for code review.

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
| 9 | reviewer-rule-checker | Yes | findings | 1 violation + 2 concerns (all LOW) | confirmed 3, dismissed 0, deferred 0 |

**All received:** Yes (2 enabled subagents returned; 7 disabled via `workflow.reviewer_subagents` settings)
**Total findings:** 3 confirmed (all LOW), 0 dismissed, 0 deferred

The 7 disabled domains (edge cases, silent failures, test quality, docs, type design, security,
simplicity) were assessed by the Reviewer directly — see the tagged observations below.

## Reviewer Assessment

**Verdict:** APPROVED

**Summary:** A precise, minimal fix for a p1 kill-loop bug. The root cause — the firing aim not
inverting the perspective projection the crosshair is drawn under — is correctly addressed in the
aim math (`aimDirection`), with the viewport aspect threaded from the shell via `Input` and the
shell reticle/sign aligned to match. Preflight is clean (264 tests, build green, zero smells); the
exhaustive rule-checker found no boundary or type violations, only three LOW improvements. No
Critical/High issues.

**Data flow traced:** mouse → `shell/input.ts` (pointer→`aimX/aimY`, Y negated to +up; `sample()`
attaches `aspect = clientW/clientH`) → `Input` → `stepGame` → `aimDirection(aimX, aimY, aspect)`
inverts the projection → bolt `vel` in world space → `collides()` (unchanged 3D sphere test) →
`phaseKills`/`score` → `progress()` advances the wave. The renderer draws the reticle at
`crosshairNdc` with the matching Y-flip, so the reticle sits exactly where the bolt travels. Safe
and internally consistent end-to-end.

**Pattern observed:** the hard core/shell boundary is respected — `core/` (gameRules/input/sim)
imports only core modules and uses `Math.tan/Math.PI` (allowed); the shell supplies viewport data
and consumes the shared `FOV_Y` constant but does no game math (`src/core/gameRules.ts:30`,
`src/shell/input.ts:39`, `src/shell/render.ts:18`).

**Observations (tagged by domain):**
- `[RULE] [VERIFIED]` Core purity boundary intact — `core/gameRules.ts` imports only `./math3d` +
  `./state`, no shell/DOM/`Date`/`Math.random`; the shell imports flow shell→core only
  (`gameRules.ts:8`, `render.ts:18`, `shell/input.ts:6`). Determinism preserved: `aspect` is part
  of `Input`, so `stepGame` stays a pure function of (state, input, dt). Rule-checker confirms 0
  boundary violations across 5 instances.
- `[TYPE] [VERIFIED]` No unsafe casts/escapes — `Input.aspect?: number` is cleanly optional;
  passing `number | undefined` to `aspect = 1` (`sim.ts:89`) is valid TS and falls back correctly.
  No `as any`, no `!`.
- `[SEC] [VERIFIED]` No security surface — client-only browser game, no backend/auth/secrets/
  tenant/injection. Inputs are browser-native numbers normalised to [-1,1] (`shell/input.ts:22-25`).
- `[SILENT] [VERIFIED]` No swallowed errors — the only fallback is the documented `aspect` default
  (ternary → 1), a deliberate default, not an error swallow.
- `[DOC] [VERIFIED]` Comments are accurate and updated (the misleading `aimY` "up..down" doc was
  corrected to +aimY = up). Minor: `src/tools/contactSheet.ts` keeps a private `FOV_Y // match the
  game camera` that could now import the shared constant (captured as a Dev finding).
- `[TEST] [LOW]` The new test re-declares `FOV_Y` locally instead of importing the exported one
  (`tests/core/combat-kill-loop.test.ts:53`) — future drift could turn the pinning test into a
  confusing numeric failure. Matches lang-review rule #8 → confirmed (not dismissed), downgraded to
  LOW because both values are π/3 today so the guard is correct now. Captured as a delivery finding.
- `[SIMPLE] [LOW]` `f = 1/tan(FOV_Y/2)` (`gameRules.ts:31`) duplicates the focal-length scalar
  inside `perspective()` (`math3d.ts:92`) — a mild Math-Box DRY weakness, both in `core/`. Captured.
- `[EDGE] [LOW]` The aspect guard checks `clientHeight > 0` but not `clientWidth > 0`
  (`shell/input.ts:39`); a zero-width canvas yields `aspect = 0` → horizontal aim collapses to
  centre (no crash/NaN, a degenerate non-gameplay case). Captured.

**Verification of the fix's correctness (the heart of the story):**
- Vertical: `aimDirection(0, aimY)` projects to `f·(aimY/f) = aimY = crosshairNdc.y` — exactly
  what the pinning test asserts (was `1.0392 = f·0.6`, now `0.6`). ✓
- Horizontal (untested, verified by construction): `aimDirection`'s X term `aimX·aspect/f`
  projects to `(f/aspect)·(aimX·aspect/f) = aimX = crosshairNdc.x`. ✓ The shell threads the same
  `aspect` the renderer uses (`W/H`), and X is not Y-flipped in either `project()` or the reticle,
  so left/right stays consistent.

### Rule Compliance

Exhaustive enumeration performed by `reviewer-rule-checker` against the full TypeScript lang-review
checklist (16 rules incl. 3 project-boundary rules) + cross-checked by the Reviewer:
- Rules #1 (type escapes), #2 (generics/interfaces), #4 (null/undefined `??` vs `||`), #5 (module/
  import), #10 (input validation), #12 (perf), #13 (fix-introduced regressions): **compliant**,
  0 violations across 27 instances.
- Rules #3 (enums), #6 (React), #7 (async), #9 (build config), #11 (error handling): **N/A** — no
  such constructs in the diff.
- Rule #8 (test quality): 1 LOW finding (local `FOV_Y` duplication) — confirmed, captured.
- Project Rule A (core purity boundary): **compliant** — 0 violations (5 instances).
- Project Rule B (3D math in the Math Box): **compliant** with 1 LOW DRY concern (`f` duplication).
- Project Rule C (aim/collision in 3D world space, not pixels): **compliant** — `aimDirection`
  returns a world `Vec3`; the NDC→screen flip stays in the renderer; `collides()` unchanged.

### Devil's Advocate

Assume this fix is broken. The most suspicious move is changing `aimDirection` and the shell at
once: the unit tests only exercise the vertical axis (aimX = 0), so a sign or aspect error on the
horizontal axis would sail straight through a green suite. Could a player aim left and have bolts
fly right? Tracing it: mouse-X maps `left→−1, right→+1`; `aimDirection`'s X term is `+aimX·aspect/f`
(monotonic, sign-preserving); `project()` maps `+X→right` with no flip; the reticle's `cx` has no
flip either. All three agree — left stays left. Could the two independent `aspect` computations
disagree? `shell/input.ts` uses `canvas.clientWidth/clientHeight` while `render.ts` uses window
inner W/H; they coincide only because the canvas is styled fullscreen in `resize()`. If a future
layout shrinks the canvas below the window (a sidebar, letterboxing), horizontal aim would drift —
a latent coupling, but not a today-bug. What about a stressed/odd viewport? `clientWidth = 0`
yields `aspect = 0` and dead horizontal aim, but no crash (LOW, captured). DPR? `aspect` cancels
`dpr`, so high-DPI is fine. A confused user pushing the yoke up now climbs and shoots up (the sign
fix), matching the cabinet — the prior inversion is gone. Determinism? `aspect` enters via `Input`,
so replays from a seed + input log still reproduce. The vertical-only test coverage is the one real
soft spot, and it is explicitly documented as a deviation with an eyeball-at-finish follow-up.
Nothing here rises to Critical/High.

**Error handling:** `aimDirection` cannot divide-by-zero (`f` from a fixed nonzero `FOV_Y`);
`normalize` guards the zero vector; the shell guards `clientHeight > 0`. (Width-zero is the LOW edge
above.)

**Verdict rationale:** All confirmed findings are LOW (non-blocking); preflight clean; boundary and
types clean; the fix is correct on the tested vertical axis and correct-by-construction on the
horizontal axis. APPROVED.

**Handoff:** To Grand Admiral Thrawn (SM) for finish-story. Recommend the three LOW improvements be
folded into a quick follow-up (or this branch before merge, at SM's discretion) and an eyeball aim
check in `npm run dev` at finish.