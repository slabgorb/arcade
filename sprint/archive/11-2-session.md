---
story_id: "11-2"
jira_key: ""
epic: "11"
workflow: "tdd"
---
# Story 11-2: Camera + MVP transform pipeline (model/view/projection + scale)

## Story Details
- **ID:** 11-2
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** tdd
- **Stack Parent:** 11-1 (done)
- **Points:** 5
- **Priority:** p2
- **Type:** refactor
- **Repo:** star-wars

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-29T20:49:16Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-29T20:04:25Z | 2026-06-29T20:07:10Z | 2m 45s |
| red | 2026-06-29T20:07:10Z | 2026-06-29T20:14:26Z | 7m 16s |
| green | 2026-06-29T20:14:26Z | 2026-06-29T20:38:17Z | 23m 51s |
| review | 2026-06-29T20:38:17Z | 2026-06-29T20:49:16Z | 10m 59s |
| finish | 2026-06-29T20:49:16Z | - | - |

## Story Context

### Technical Approach

The camera + MVP pipeline unifies view and world placement:

1. **Math builders (core/math3d.ts, pure & tested):**
   - `scaling(sx, sy, sz)` — diagonal matrix
   - `viewMatrix(camPos, orientation)` — inverse camera transform derived from cockpit state
   - Determinism + no shell imports required

2. **Model matrix per entity (render.ts):**
   - Compose model = translation(pos) × rotation(rot) × scale(scale)
   - Vertices transform through MVP = projection × view × model
   - No individual vertex multiplies; compose once per model, transform batch

3. **Camera state from sim:**
   - Derives from `GameState` cockpit (position, orientation already live in sim)
   - Core stays pure; shell composes the MVP pipeline and passes to render

4. **Retire ad-hoc placement:**
   - Remove or reduce SKIM_OFFSET, Z_SURFACE_PLACEMENT, surfacePlacement/trenchPlacement
   - Surface, trench, TIEs placed via camera/model-matrix path

### Acceptance Criteria
- core/math3d.ts gains pure, unit-tested scaling() and viewMatrix() builders (matrix invariants / inverse-camera identity covered)
- A per-entity model matrix composes translation, rotation, and scale; vertices render through MVP = projection x view x model
- render.ts places the surface, trench, and TIEs via the camera/model-matrix path; the prior ad-hoc world-offset constants are removed or reduced to camera state
- The camera is derived from GameState only; core/math3d remains pure (no DOM/shell imports) and determinism is preserved
- Surface/trench/TIE placement matches or improves current visuals — eyeballed in dev (:5274) and the contact sheet; build clean, tests green

### Dependencies
- Blocks 11-3 (debug overlay builds on this camera)
- Depends on 11-1 (near-plane clipping, now done)

### Reference
See star-wars/docs/adr/0001-3d-vector-render-pipeline.md (part B) for the full design rationale.

## Delivery Findings

### TEA (test design)
- **Conflict** (blocking): Retiring `surfacePlacement` / `trenchPlacement` (AC-3) breaks pre-existing tests that import and assert their behaviour. Affects `tests/core/surface-visibility.test.ts` and `tests/core/trench.test.ts` (Dev must migrate these to the new camera/model-matrix contract, or keep the functions reduced to a thin camera-state derivation — either way GREEN cannot pass while these still call the removed exports). *Found by TEA during test design.*
- **Question** (non-blocking): I pinned `viewMatrix(camPos: Vec3, orientation: Mat4)` — orientation as the Math Box's native rotation matrix (consistent with `rotationY`/`lookRotation`/`Enemy.orient`). If the camera state was intended to carry a forward *vector* instead, Dev/Architect should reconcile the signature; the inverse-camera invariants hold either way. Affects `src/core/math3d.ts`. *Found by TEA during test design.*
- **Gap** (non-blocking): `GameState` has no explicit camera field — the surface camera derives from `state.altitude` (eye at `[0, altitude, 0]`, floor at y=0); space/trench imply an origin eye. Dev should source the camera purely from sim state in the shell (`viewMatrix([0, state.altitude, 0], IDENTITY)` for surface), keeping core pure. Affects `src/shell/render.ts`. *Found by TEA during test design.*

### Dev (implementation)
- **Resolved (TEA's blocking Conflict)**: `trenchPlacement` needed NO change — `SKIM_OFFSET` was applied by the render caller, not baked into it, so moving the skim to the camera left its contract intact (trench.test.ts passes untouched). `surface-visibility.test.ts` was migrated (altitude framing → `cameraView`); visibility/turret-zone guards preserved. All 393 tests green. Affects `tests/core/surface-visibility.test.ts`. *Found by Dev during implementation.*
- **Improvement** (non-blocking): The epic-11 design doc `docs/adr/0001-3d-vector-render-pipeline.md` was UNTRACKED in the star-wars repo (authored during planning, never committed). I landed it in this branch (`docs(11)` commit) so the design 11-1/11-2/11-3 implement is versioned. Affects `docs/adr/`. *Found by Dev during implementation.*
- No further upstream findings.

### Reviewer (code review)
- **Improvement** (non-blocking): `viewMatrix` inverts the camera via `transpose(orientation)`, which equals the true inverse ONLY for an orthonormal (pure-rotation) orientation — documented in the JSDoc but unenforced. Every current caller passes `IDENTITY` (safe), but **story 11-3** introduces a debug-overlay frustum and may add a non-identity camera orientation; a non-rotation `Mat4` would silently produce a malformed view (no error, no NaN). Affects `src/core/math3d.ts` (`viewMatrix`/`transpose`) — before 11-3 adds camera rotation, either add a `@param` example of valid inputs or a dev-mode orthonormality assertion. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `drawLockOn` (render.ts) projects the enemy world position WITHOUT the camera view, while `drawPlayerLaser`/`drawSpark` now apply `transform(view, …)`. Harmless today (enemies are space-only → `view = IDENTITY`), but inconsistent — if any future phase renders enemies under a lifted camera the lock-on ring would be misplaced. Affects `src/shell/render.ts` (`drawLockOn`). *Found by Reviewer during code review.*
- **Note** (non-blocking): 4 pre-existing type-safety patterns live in files this PR touched but did NOT introduce — `canvas.getContext('2d')!` (contactSheet.ts:40), the documented partial-mock `as unknown as` cast and `p![…]` assertions in wireframe.test.ts, and `skipLibCheck: true` in tsconfig.json. Out of scope for 11-2 (not in the change); listed for a future hygiene pass. *Found by Reviewer (rule-checker) during code review.*

## Design Deviations

### TEA (test design)
- **Shell placement (render.ts) left to eyeball, not unit-tested**
  - Spec source: context-story-11-2.md, AC-3 and AC-5
  - Spec text: "render.ts places the surface, trench, and TIEs via the camera/model-matrix path ... Surface/trench/TIE placement matches or improves current visuals — eyeballed in dev (:5274) and the contact sheet"
  - Implementation: RED covers only the pure core — `scaling`, `viewMatrix`, and the MVP composition math in `tests/core/math3d.camera-mvp.test.ts`. The `render.ts` rewiring and the visual surface/trench/TIE placement carry no new unit tests.
  - Rationale: AC-5 itself prescribes eyeball verification; orientation/scale escape structural tests by the repo's own convention (the `SURFACE_ORIENT` note in render.ts). A pixel-output test would couple to canvas mechanics, not behaviour. Matches the SM scope boundary for this story.
  - Severity: minor
  - Forward impact: Dev and Reviewer must eyeball dev (`:5274`) **and** the contact sheet for AC-3/AC-5; no automated guard will catch a visual placement regression there.

### Dev (implementation)
- **`drawWireframe` signature changed: `(pos, orient)` → a single `modelView` matrix**
  - Spec source: context-story-11-2.md, AC-2; ADR 0001 part B
  - Spec text: "vertices render through MVP = projection × view × model"
  - Implementation: `drawWireframe(ctx, m, modelView, proj, w, h, color)`; `render.ts` composes `multiply(view, modelMatrix(pos, orient, scale))`. Migrated `wireframe.test.ts` call sites (every 11-1 clip assertion preserved verbatim; only the call form adapts) and `contactSheet.ts`.
  - Rationale: A single composed `view × model` is the honest MVP expression. Folding the camera into `pos`/`orient` would re-fake the camera this story retires; an adversarial reviewer would (rightly) flag that.
  - Severity: minor
  - Forward impact: 11-3 (debug overlay) draws through this same `drawWireframe` + `cameraView`; the overlay should reuse the exported `cameraView(state)` so the frustum matches the scene.
- **`surfacePlacement` reduced to an arg-less static seat; altitude moved to the camera**
  - Spec source: context-story-11-2.md, AC-3; surface-visibility.test.ts (the 8-11 guard)
  - Spec text: "the prior ad-hoc world-offset constants are removed or reduced to camera state"
  - Implementation: `surfacePlacement()` now returns the static forward seat `[0, 0, -Z_SURFACE_PLACEMENT]`; the altitude-skim framing moved into the new exported `cameraView(state)`. Migrated `surface-visibility.test.ts` tests #3/#4 to assert the framing through `cameraView`; kept the visibility/turret-zone regression guards (Z is unchanged, so they still hold).
  - Rationale: AC-3 explicitly permits "reduced to camera state." Altitude is camera state; the floor keeps its true world Y = 0. This is the intended retirement, but it does change a public render export's signature and a test's contract — logged.
  - Severity: minor
  - Forward impact: any future caller of `surfacePlacement` must drop the `state` arg; `cameraView` is the new single source of camera state.
- **`Z_SURFACE_PLACEMENT` retained (not removed)**
  - Spec source: context-story-11-2.md, AC-3 (lists it among constants to remove/reduce)
  - Spec text: "the prior ad-hoc world-offset constants are removed or reduced to camera state"
  - Implementation: Kept `Z_SURFACE_PLACEMENT` as the surface model's forward seat in Z (inside `surfacePlacement`). The camera-fake constants — `SKIM_OFFSET` and the per-entity `−altitude` drops — WERE removed/moved to the camera.
  - Rationale: It is genuine model placement (where the surface sits ahead of the cockpit), with no altitude/camera component; removing it would just substitute an arbitrary literal. It is not an "ad-hoc camera glue" constant.
  - Severity: minor
  - Forward impact: none.
- **Surface/trench eyeballed by equivalence + contact sheet, not a live in-play screenshot**
  - Spec source: context-story-11-2.md, AC-5
  - Spec text: "Surface/trench/TIE placement matches or improves current visuals — eyeballed in dev (:5274) and the contact sheet"
  - Implementation: Directly eyeballed (preview build) the **contact sheet** (all 6 models render as clean receding vectors), the **attract** screen, and **live space combat** (TIEs banking, fireball, laser, crosshair, HUD — zero console errors). Surface/trench *in play* (behind the 6-kill phase gate) verified by mathematical equivalence — the camera lift `viewMatrix([0, altitude, 0], IDENTITY)` is exactly the retired world-shift `translation(0, −altitude, 0)`, and the 8-11/8-5 regression suites pass — rather than a live screenshot.
  - Rationale: Reaching surface/trench live needs automating ~6 aimed kills (a browser rabbit hole); the lift is provably the prior shift, so the floor/port visuals are equivalent and the turrets stay seated on the floor.
  - Severity: minor
  - Forward impact: Reviewer/user should confirm in-play surface/trench once reachable; no automated guard covers their visuals.

### Reviewer (audit)
Every logged deviation reviewed (Obi-Wan Kenobi):
- **TEA — Shell placement left to eyeball, not unit-tested** → ✓ ACCEPTED: matches the repo's own convention (the `SURFACE_ORIENT` "MUST be eyeballed" note) and AC-5's explicit eyeball clause. A pixel-output test would couple to canvas mechanics, not behaviour. Sound.
- **Dev — `drawWireframe` signature → single `modelView` matrix** → ✓ ACCEPTED: the honest expression of `MVP = projection × view × model`; verified behavior-preserving (`transform(T(pos)∘orient, v) ≡ add(transform(orient,v), pos)`). All call sites (render, contactSheet) and `wireframe.test.ts` migrated; 11-1 clip assertions preserved verbatim; suite green.
- **Dev — `surfacePlacement` reduced to arg-less seat; altitude → camera** → ✓ ACCEPTED: AC-3 explicitly permits "reduced to camera state." Migrated `surface-visibility.test.ts` #3/#4 to assert framing through `cameraView` (non-vacuous: `floorBelowEye(alt) === −alt`); the visibility/turret-zone regression guards are intact because the surface Z seat is unchanged.
- **Dev — `Z_SURFACE_PLACEMENT` retained** → ✓ ACCEPTED: it is genuine model placement (the surface's forward seat in Z), not camera glue; removing it would substitute an arbitrary literal. The actual camera-fake constants (`SKIM_OFFSET`, per-entity `−altitude` drops) WERE retired. Agrees with author reasoning.
- **Dev — Surface/trench eyeballed by equivalence, not live** → ✓ ACCEPTED: I independently verified the equivalence — `viewMatrix([0,altitude,0], IDENTITY) = translation(0,−altitude,0)`, so a y=0 floor lands at eye-y = −altitude, identical to the retired world-shift; Z (the clip axis) is untouched. Contact sheet + live space combat were eyeballed directly. In-play surface/trench confirmation recommended (non-blocking) — captured as a Delivery Finding.

## Sm Assessment

**Setup decision (Grand Admiral Thrawn):** Story 11-2 selected by request. I have anticipated this — it is the natural successor to 11-1.

- **Workflow:** `tdd` (phased: red → green → review → finish). Correct for a 5-point refactor that introduces new, purely-testable math (`scaling`, `viewMatrix`, MVP composition). The math builders demand failing tests first; TEA leads.
- **Repo / branch:** `star-wars`, branch `feat/11-2-camera-mvp-transform-pipeline` cut off `develop` (the subrepo's base). Confirmed active.
- **Dependency gate:** 11-1 (near-plane clipping) is `done`, so the clip stage this pipeline feeds already exists. Unblocked.
- **Merge gate:** Clear — no open PRs in star-wars at setup.
- **Scope boundary for TEA:** The high-value test surface is `core/math3d.ts` (pure: matrix invariants + inverse-camera identity for `viewMatrix`, diagonal correctness for `scaling`, MVP associativity). Shell rewiring of `render.ts` (retiring SKIM_OFFSET / Z_SURFACE_PLACEMENT / surfacePlacement / trenchPlacement) is visual and is verified by eyeball on dev + contact sheet, not unit tests — keep RED focused on the pure core.
- **Invariant to protect:** core stays pure (no DOM/shell imports); the camera derives from `GameState` only. Any test that reaches into the shell from core is a smell.

**Routing:** Hand off to **Han Solo (TEA)** for the RED phase. Reference design lives in `star-wars/docs/adr/0001-3d-vector-render-pipeline.md` (part B).

---
## TEA Assessment

**Tests Required:** Yes
**Reason:** New pure-math builders (`scaling`, `viewMatrix`) and an MVP composition contract — exactly the testable core this story exists to add.

**Test Files:**
- `tests/core/math3d.camera-mvp.test.ts` — 16 tests across three suites: `scaling()` diagonal-scale math, `viewMatrix()` inverse-camera transform, and the `projection × view × model` composition.

**Tests Written:** 16 tests covering ACs 1, 2, and 4 (the pure-math surface). ACs 3 & 5 are visual/shell and verified by eyeball (see Design Deviations).
**Status:** RED — verified by Chewbacca (testing-runner): **1 file failed / 28 passed; 16 failed / 377 passed.** The 16 new tests are the ONLY failures, all `scaling is not a function` / `viewMatrix is not a function`, proving they drive the two missing builders. Zero collateral breakage.

**What the tests pin (the contract for Yoda):**
- `scaling(sx, sy, sz): Mat4` — pure diagonal scale: per-axis scale, unit-scale ≡ IDENTITY, origin fixed, negative mirrors, composes as the innermost S in `T∘R∘S`.
- `viewMatrix(camPos: Vec3, orientation: Mat4): Mat4` — the inverse of `translation(camPos) ∘ orientation`: no-op at origin/identity, maps the camera onto the eye origin, world-shift for the altitude-skim case, inverse-rotation for a yawed camera, exact inverse of the camera world transform, rigid (distance-preserving), deterministic.
- MVP — `view∘model` applies model-then-view (affine order), a dead-ahead model projects to NDC centre, model scale enlarges the projected silhouette at fixed depth, and raising the camera pushes a ground model downward (camera state replacing the retired `SKIM_OFFSET`).

### Rule Coverage

| Rule (lang-review/typescript.md) | Test(s) | Status |
|---|---|---|
| #2 generic/interface — `Mat4` shape & `readonly` returns | `expectMatClose` asserts `.length === 16`; builders typed `Mat4` | failing |
| #8 test quality — no vacuous assertions | self-check pass; ratio test guarded by `small[0]).not.toBeCloseTo(0)` | failing |
| core purity / determinism (CLAUDE.md boundary) | `viewMatrix` "identical inputs give identical matrix"; whole suite runs in node with no DOM | failing |

**Rules checked:** 3 of 13 lang-review checks apply to a pure, synchronous, no-I/O math builder. N/A here: #1 type escapes, #3 enums, #4 null/undefined, #5 modules/JSX, #6 React, #7/#11 async/errors, #9 build-config, #10 input validation, #12 perf/bundle — there is no async, user input, enum, error path, or module surface in these builders.
**Self-check:** 0 vacuous tests (every test makes a concrete numeric assertion; the scale-ratio test carries an explicit off-centre guard so the comparison can't pass trivially).

**Handoff:** To **Yoda (Dev)** for GREEN — implement `scaling` and `viewMatrix` in `src/core/math3d.ts` to satisfy the 16 tests, then rewire `render.ts` to place models via `{pos, rot, scale}` through the camera/MVP path and retire the ad-hoc placement constants. **Read the blocking Conflict in Delivery Findings first** — `surface-visibility.test.ts` and `trench.test.ts` call the functions this story retires.

---
## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/math3d.ts` — added pure `scaling(sx,sy,sz)` and `viewMatrix(camPos, orientation)` (+ an internal `transpose` helper; rotation⁻¹ = transpose).
- `src/shell/wireframe.ts` — `drawWireframe` now takes one composed `modelView` matrix and transforms vertices into eye space; the 11-1 near-plane clip is unchanged (now eye-space Z).
- `src/shell/render.ts` — new exported `cameraView(state)` (the cockpit IS the camera) and `modelMatrix(pos, orient, scale)`; every model drawn via `multiply(view, modelMatrix(...))`; projectiles/sparks ride the same view; `surfacePlacement` reduced to a static seat; `SKIM_OFFSET` + per-entity altitude drops retired.
- `src/tools/contactSheet.ts` — migrated to the `modelView` signature (its `translation(-dist)` is the cell's view).
- `tests/shell/wireframe.test.ts`, `tests/core/surface-visibility.test.ts` — migrated to the new signature / camera-framing contract (assertions preserved; see Design Deviations).
- `docs/adr/0001-3d-vector-render-pipeline.md` — landed (was untracked).

**Tests:** 393/393 passing (GREEN) — verified by Chewbacca (testing-runner): 29 files, 0 failures, including the 16 new camera/MVP tests, the 11-1 clip suite, and the 8-11/8-5 regression guards. `tsc --noEmit` clean; `vite build` clean.

**Eyeball (AC-5):** Contact sheet (`/models.html`) — all six models render as clean receding vectors (Surface/Trench are proper corridors, not triangles). Live space combat — TIEs bank at the cockpit with upright panels, fireball/laser/crosshair/HUD correct, **zero console errors**. Surface/trench in-play verified by equivalence (camera lift ≡ retired world-shift) + green regression suites; flagged for Reviewer to confirm in-play (Design Deviations).

**Branch:** `feat/11-2-camera-mvp-transform-pipeline` (pushed, 3 commits: RED tests, impl, ADR).

**ACs:** AC-1 ✓ (pure `scaling`/`viewMatrix`, unit-tested) · AC-2 ✓ (model matrix + MVP) · AC-3 ✓ (camera/model-matrix path; `SKIM_OFFSET`/altitude-drops retired, `surfacePlacement` reduced) · AC-4 ✓ (camera from `GameState` only; core pure, determinism intact) · AC-5 ✓ (build clean, tests green, eyeballed — surface/trench by equivalence).

**Handoff:** To **Obi-Wan Kenobi (Reviewer)** for code review. Suggested focus: the `drawWireframe` signature change + `wireframe.test.ts` migration (clip assertions preserved?), and the `surfacePlacement`/`cameraView` contract shift in `surface-visibility.test.ts`. In-play surface/trench eyeball recommended if reachable.

---
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 smells; 393/393 green; `tsc`+`vite build` clean; tree clean; branch correct | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings (covered manually — see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings (covered manually — see [SILENT]) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings (covered manually + rule-checker #8 — see [TEST]) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings (covered manually — see [DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings (covered manually + rule-checker — see [TYPE]) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings (covered manually — see [SEC]) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings (covered manually — see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | findings | 1 introduced (MEDIUM: `viewMatrix` orthonormality); 4 pre-existing (out of scope) | confirmed 1 (non-blocking), deferred 4 (pre-existing) |

**All received:** Yes (2 enabled returned; 7 disabled via `workflow.reviewer_subagents`, pre-filled and covered by my own analysis)
**Total findings:** 1 confirmed (MEDIUM, non-blocking), 0 dismissed, 4 deferred (pre-existing, not introduced by 11-2)

---
## Reviewer Assessment

**Verdict:** APPROVED

The diff is a clean, faithful realization of ADR 0001 part B. The pure core stays pure, the shell rewiring is behavior-preserving where it must be and correctly retires the camera-fake constants, the 11-1 clip is intact, and all 393 tests are green. No Critical or High findings. The one PR-introduced concern (`viewMatrix` orthonormality) is documented, safe for every current caller, and forward-looking — captured as a non-blocking Delivery Finding for 11-3.

**Data flow traced:** `GameState` (sim) → `cameraView(state)` builds the view matrix (`viewMatrix([0, altitude|skim, 0], IDENTITY)`) and `modelMatrix(pos, orient, scale)` the per-entity model → `multiply(view, model)` → `drawWireframe` transforms each vertex into eye space, near-plane-clips, and projects through `proj` → canvas strokes. **Safe because** the camera is read-only from sim state, the core never learns about the camera (no reverse import), and there is no external/user input on this path — the only "input" is the deterministic sim state.

**Pattern observed:** Composed `MVP = projection × view × model` with a single `modelView` handed to the renderer — `src/shell/render.ts:172-199`. Good pattern: one camera, per-entity model matrices, no scattered placement constants.

**Error handling:** No error paths exist in this pure-math/render code (no I/O, no async, no try/catch). Division-by-zero is structurally avoided: the near-plane clip pins behind-plane endpoints to `z = −NEAR`, where the perspective `w = NEAR ≠ 0`, so `transform`'s `wp === 0 ? 1` guard is never the deciding factor (`src/shell/wireframe.ts:81-88`, `math3d.ts:44`).

### Observations (8)

- `[VERIFIED]` **Core purity / boundary intact** — `scaling`, `transpose`, `viewMatrix` are pure array arithmetic (`viewMatrix` composes pure `multiply`+`translation`); zero imports, no DOM/`Date`/`Math.random`/`rAF`. Evidence: `math3d.ts:60-66,113-139` has no shell import and no DOM reference. Complies with CLAUDE.md's hard core/shell boundary (rule-checker #14–#17 confirm: 0 violations).
- `[VERIFIED]` **`viewMatrix` is the correct inverse for its documented domain** — `transpose(R)·translation(−camPos)` = `(translation(camPos)·R)⁻¹` for orthonormal `R`. Evidence: `math3d.ts:136-139`; the "exact inverse" test (`math3d.camera-mvp.test.ts`) passes with a non-trivial `lookRotation` orientation, and `multiply(view, camWorld) ≈ I`.
- `[VERIFIED]` **`drawWireframe` refactor is behavior-preserving** — `transform(modelView, v)` with `modelView = T(pos)∘orient` equals the old `add(transform(orient, v), pos)`; the clip now runs in eye space, which equals world space for the camera-at-origin paths the 11-1 tests exercise. Evidence: `wireframe.ts:78-91`; all 8 clip tests green after the mechanical `at(pos)` migration.
- `[VERIFIED]` **Camera lift ≡ retired world-shift** — `viewMatrix([0, altitude, 0], IDENTITY) = translation(0, −altitude, 0)`, so a y=0 floor lands at eye-y = −altitude (old behaviour) while Z (the clip axis) is untouched. Surface and trench visuals are provably equivalent; turrets stay seated. Evidence: `render.ts:121-124,177-183`; `surface-visibility.test.ts` + the contact-sheet screenshot.
- `[TYPE]`/`[RULE]` `[MEDIUM]` **`viewMatrix` orthonormality is documented but unenforced** — a future non-rotation `Mat4` orientation would silently produce a malformed view. Confirmed by the rule-checker; all current callers pass `IDENTITY` (safe). Non-blocking; logged as a Delivery Finding to harden before 11-3. `math3d.ts:113-139`.
- `[SIMPLE]` `[LOW]` **`modelMatrix` always multiplies by `scaling(1,1,1)`** — no caller passes `s ≠ 1`, so it's a per-frame identity multiply. Justified: it is the canonical `T∘R∘S` structure AC-2 requires, and `scaling` is exercised by the unit tests. Not a blocker. `render.ts:133-135`.
- `[SIMPLE]`/`[DOC]` `[LOW]` **`surfacePlacement()` now returns a constant** — could be a `const`, but is kept as a function for symmetry with `trenchPlacement` and to preserve the regression-test surface. Accurate JSDoc. Acceptable. `render.ts:109-111`.
- `[VERIFIED]` **Test migrations preserve intent** — `wireframe.test.ts` clip assertions unchanged (only the call form adapts via `at()`); `surface-visibility.test.ts` #3/#4 now assert the camera framing meaningfully (`floorBelowEye(alt) === −alt`, altitude-0 verbatim), and the visibility/turret-zone guards are intact. Evidence: the two test files; rule-checker #8 found 0 introduced test-quality issues.

### Rule Compliance

Checked the lang-review/typescript.md checklist (1–13) and CLAUDE.md's boundary rules against every changed `.ts` symbol (rule-checker enumerated 61 instances):
- **#1 type escapes** — net-new code clean; 4 pre-existing escapes in touched files NOT introduced by this PR (deferred, out of scope).
- **#2 generics/interface** — all returns typed `Mat4`/`Vec3` (already `readonly`); no `Record<string,any>`/`Function`. Clean.
- **#3 enums / #6 React / #7 async / #10 input-validation / #11 errors** — N/A (no enums, no JSX, all synchronous, no user input, no error paths).
- **#4 null/undefined** — `cameraView` passes `state.altitude` directly (no `||`); `trenchPlacement` uses `?? `; altitude-0 is test-pinned as falsy-valid. Clean.
- **#5 modules** — type-only imports use `type`; bundler resolution (no `.js` ext needed). Clean.
- **#8 test quality** — new tests non-vacuous (concrete numeric assertions + an off-centre guard on the scale-ratio test). Clean.
- **#13 fix-regressions** — no `as any` added, no `||` on falsy-valid values, default `s = 1` (not `|| 1`). Clean.
- **CLAUDE.md boundary (#14–#17)** — core stays pure, no shell import, camera derives from sim state, `Mat4`/`Vec3` remain `readonly`. **0 violations.**

### Devil's Advocate

Suppose this code is broken. Where would it bite? First, the camera: `cameraView` feeds `state.altitude` straight into `viewMatrix`. If the sim ever produced a `NaN`/`Infinity` altitude, the view matrix would carry it into every vertex and the scene would vanish — but the sim clamps altitude (`MIN_SKIM_ALTITUDE`/`SKIM_ALTITUDE`) and never emits non-finite values, so this is not reachable from gameplay, only from a future sim bug. Second, the orthonormality trap: `viewMatrix` trusts its caller to pass a rotation. A confused future contributor implementing 11-3's camera could compose `lookRotation` with a `scaling` and pass it as `orientation`; `transpose` would then NOT be the inverse and the world would shear with no error, no `NaN`, no crash — the worst kind of bug, silent. That is the single most dangerous edge here; I've flagged it for hardening before 11-3 lands a non-identity camera. Third, division-by-zero in projection: a vertex exactly on the camera plane yields `w = 0`; but the near-plane clip pins such endpoints to `z = −NEAR` (where `w = NEAR`), so the degenerate point never reaches the divide — verified. Fourth, a malicious/confused user: input is keyboard yoke + mouse only; there is no string, path, JSON, or network surface, so injection is impossible — `[SEC]` is genuinely N/A (no auth, no tenants, no secrets). Fifth, the lock-on ring: `drawLockOn` skips the view transform; today enemies are space-only (`view = IDENTITY`) so it is correct, but it is a latent inconsistency if enemies ever render under a lifted camera — flagged non-blocking. None of these reach Critical/High; the silent-shear risk is real but future-conditional and documented.

### Dispatch tag coverage (7 of 9 subagents disabled — covered manually)

- `[EDGE]` (disabled; manual): altitude-0 handled verbatim (test-pinned); empty `enemies`/`turrets` loops draw nothing; near-plane clip degenerate cases (both behind / both front / exactly on plane) covered by the green 11-1 suite; no `w=0` divide reachable. No unhandled boundary.
- `[SILENT]` (disabled; manual): no `try/catch`, no swallowed errors, no silent fallbacks in the diff; the only silent guard (`wp === 0 ? 1`) is pre-existing and unreachable for clipped geometry.
- `[TEST]` (disabled; manual + rule-checker #8): new tests assert concrete values with a non-vacuity guard; migrated tests preserve their assertions. 0 introduced test-quality issues.
- `[DOC]` (disabled; manual): JSDoc on `scaling`/`viewMatrix`/`cameraView`/`modelMatrix`/`surfacePlacement` is accurate and updated; the clip comment now correctly says "eye space"; `viewMatrix` documents the orthonormality constraint. No stale comments introduced.
- `[TYPE]` (disabled; manual + rule-checker): one MEDIUM — `viewMatrix` orthonormality (above). Otherwise types are sound (`Mat4`/`Vec3` readonly, no escapes in new code).
- `[SEC]` (disabled; manual): N/A — pure rendering math; no user input, auth, network, secrets, or tenants.
- `[SIMPLE]` (disabled; manual): two LOW notes (`modelMatrix` identity-scale multiply; `surfacePlacement` constant function) — both justified, neither blocks.
- `[RULE]` (rule-checker): net-new code clean on all 13 TS rules + 4 boundary rules; 1 introduced MEDIUM concern, 4 pre-existing (out of scope).

**Handoff:** To **Grand Admiral Thrawn (SM)** for finish-story.