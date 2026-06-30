---
story_id: "11-3"
jira_key: ""
epic: "11"
workflow: "tdd"
---
# Story 11-3: Dev debug overlay: axes, grid, frustum, model bounds

## Story Details
- **ID:** 11-3
- **Jira Key:** N/A (no Jira integration)
- **Workflow:** tdd
- **Branch:** feat/11-3-dev-debug-overlay (star-wars subrepo, gitflow)
- **Points:** 3
- **Priority:** p2
- **Type:** chore

## Technical Approach

Add a dev-only, toggle-key debug overlay to the shell renderer that provides visual feedback for placing 3D geometry without eyeballing. The overlay is off by default and never affects gameplay or determinism.

**Core components:**

1. **Keyboard toggle** — a dev key shows/hides the overlay; overlay state is shell-only (never affects core or game state).

2. **World axes at origin** — draw X, Y, Z axes in world space projected through the camera: red for X, green for Y, blue for Z. Each axis extends from the origin outward to visualize the coordinate frame.

3. **Ground grid in y=0 plane** — a grid of perpendicular lines in the y=0 plane (receding in -Z, spanning ±X). Helps visualize the surface/trench positioning and gravity reference.

4. **Camera frustum** — compute and draw the viewing frustum from the camera matrix (the pyramid of visible space). Edges connecting the frustum corners show the camera's field of view and depth range.

5. **On-screen model bounds** — for each model being rendered, project its bounding sphere (reusing `modelView.modelBounds`) and draw a circle + name label so you can see what's where and debug placement without tweaking constants and rebuilding.

**Implementation path:**

- Add a `debugOverlay` toggle state to the shell render loop (keyed off a dev key; default false).
- Build pure geometry helpers in `src/shell/render.ts` or a new `src/shell/debug-overlay.ts`:
  - `frustumCorners(camera, near, far)` → array of 8 world-space corner points
  - `projectBounds(model, mvpMatrix)` → screen-space circle radius + center
  - Drawing functions for grid/frustum/bounds (pure Canvas 2D).
- Wires through the existing `render(gameState, ctx)` path without DOM/shell boundary violation.
- Unit tests cover geometry calculations (frustum, bounds projection); visual output (grid, labels) is eyeballed in dev.

**Reuses existing infrastructure:**

- `mvpMatrix` from 11-2's camera/MVP pipeline — no new matrix math.
- `modelView.modelBounds` (already computed per model) — no new bounding logic.
- Canvas 2D drawing (existing render surface) — no new 3D libraries.

## Acceptance Criteria
- A keyboard toggle (dev-key) shows/hides the overlay; it is off by default and never affects gameplay or the sim
- Overlay draws world axes (X/Y/Z) at the origin and a ground grid in the y=0 plane
- Overlay draws the camera frustum and each on-screen model's bounding sphere + name label
- Any pure geometry helpers added (frustum corners, bounds projection) are unit-tested; drawing output is eyeballed in dev
- No core/shell boundary violation, no new runtime deps, build clean, tests green

## SM Assessment

**Routing decision:** TDD (phased) → handoff to TEA for the RED phase.

**Reasoning:**
- 3-point chore adding a dev-only overlay with pure geometry helpers (frustum, bounds) and shell-layer drawing. TDD ensures the geometry calculations are test-driven before visual rendering.
- Scope is shell-only: new toggle state, helper functions in `render.ts` or `debug-overlay.ts`, and Canvas 2D drawing code.
- No core changes, no new runtime dependencies, no sim impact — the overlay is purely observational.
- TEA should pin the geometry contracts (frustum corners, bounds projection) with unit tests and verify the drawing code by inspection + eyeballing the dev server.
- Single repo (star-wars), gitflow branch `feat/11-3-dev-debug-overlay` cut off `develop`. Builds on 11-2's MVP camera (already merged).

**Watch-outs for downstream agents:**
- Frustum geometry should use the same near/far planes as the existing camera/projection matrix (don't invent new depth bounds).
- Model bounds projection must match the actual screen positions observed in 11-1/11-2 (otherwise the overlay defeats its purpose as a debug feedback loop).
- Dev server eyeballing is the ACs for the visual layers (grid, frustum, labels); geometry correctness is test-driven.
- No shell→core imports, no new npm dependencies.

**Handoff:** To TEA (red phase) to design test coverage for the pure geometry helpers (frustum corners + bounds projection). Setup complete: session file at `.session/11-3-session.md`, branch `feat/11-3-dev-debug-overlay` ready on `develop`.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** The story adds two pure geometry helpers the AC explicitly names as
"unit-tested" (frustum corners + bounds projection) plus an overlay draw pass with
hard invariants (never mutates the sim, deterministic, additive). TDD pins those
contracts before any drawing exists.

**Test Files:**
- `tests/shell/debug-overlay.test.ts` — 17 failing tests across three suites.

**Contract handed to Dev (GREEN) — a new module `src/shell/debug-overlay.ts`:**
- `frustumCorners(fovY, aspect, near, far): Vec3[]` — the 8 frustum corners in EYE
  space (camera at origin, −Z). Pure. **Defining test:** each corner maps to an NDC
  cube corner (`|x|=|y|=|z|=1`) under `perspective(fovY, aspect, near, far)`, so the
  helper IS the frustum that projection defines — corner-order-agnostic.
- `projectBounds(centerEye, radius, proj, w, h): { x, y, r } | null` — a bounding
  sphere (centre in eye space, world radius) → a screen circle, or `null` at/behind
  the near plane. Reuses `wireframe.project()`'s NEAR guard + NDC→pixel map.
- `drawDebugOverlay(ctx, state, w, h): void` — a SEPARATE additive draw pass
  (axes + y=0 grid + frustum + per-model bounds sphere & name label, reusing
  `core/modelView.modelBounds`). main.ts calls it only when the dev toggle is on.

**AC coverage:**
| AC | How covered |
|----|-------------|
| 1 — toggle off by default, never affects gameplay/sim | `NEVER mutates the sim state` (deep-equal via structuredClone) + `is a SEPARATE additive pass` (render() untouched; off = main.ts skips it). The toggle KEY itself is main.ts `import.meta.env.DEV` wiring — eyeballed, not unit-tested, per the 11-4 phase-jump precedent. |
| 2 — world axes + y=0 grid | `draws structural geometry even with no models` (axes/grid/frustum stroke without entities). Exact lines/colours **eyeballed in dev** per the AC. |
| 3 — frustum + per-model bounds sphere + name label | `frustumCorners` suite (5) + `rings each on-screen model with a bounds circle and a name label` + `more models, more bounds circles`. |
| 4 — pure helpers unit-tested; drawing eyeballed | `frustumCorners` (5) + `projectBounds` (5) suites; drawing pinned only at mechanism altitude. |
| 5 — no boundary violation, no new deps, build clean, green | Tests import only existing core/shell symbols; no new deps. Enforced at GREEN gate. |

**Tests Written:** 17 tests across 5 ACs
**Status:** RED — `debug-overlay.test.ts` fails on module resolution (the new
module does not exist yet). All 418 pre-existing tests pass — zero regressions
(verified via testing-runner, RUN_ID 11-3-tea-red).

### Rule Coverage

| Rule (typescript.md) | Test(s) | Status |
|------|---------|--------|
| #4 null/undefined — nullable contract | `projectBounds … returns null for a sphere centre at or behind the near plane` (3 null cases) + the non-null branches | failing (RED) |
| #8 test quality — meaningful assertions | self-checked all 17 cases — no `let _ =`, no `assert(true)`, no `is_none()`-on-always-null, no `as any` in assertions | pass (self-check) |
| #1 type-safety escapes | canvas mock uses the house `as unknown as CanvasRenderingContext2D` test double (warranted; matches wireframe.test/render.tie-orient) — no `as any` | n/a (test double) |

**Rules checked:** 3 of 13 applicable. The remaining checks (#3 enums, #5 modules,
#6 React/JSX, #7 async, #9 build-config, #10 input-validation, #11 error-handling,
#12 perf/bundle, #13 fix-regressions) are not exercised by a pure-geometry +
Canvas-2D drawing story with no enums, async, JSX, I/O, or untrusted input.
**Self-check:** 0 vacuous tests found.

**Watch-outs for Dev (Yoda):**
- The frustum drawn from the camera's OWN viewpoint is visually degenerate (it
  fills the screen). `frustumCorners` is correct in eye space regardless; how to
  draw it usefully is a Dev call, eyeballed in dev (see Delivery Findings).
- Bounds rings MUST project through the SAME `proj`/`cameraView` the scene uses
  (the `rings models through the SCENE camera` test guards the gross case; exact
  placement is eyeballed — see the SM watch-out).
- Keep the toggle gated to `import.meta.env.DEV` so Vite tree-shakes it from
  production, exactly like the 11-4 phase-jump keys in main.ts.

**Handoff:** To Dev (Yoda) for the GREEN phase — implement `src/shell/debug-overlay.ts`.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/shell/debug-overlay.ts` (NEW) — the overlay module. Exports the two
  unit-tested pure helpers `frustumCorners(fovY, aspect, near, far)` and
  `projectBounds(centerEye, radius, proj, w, h)`, plus the `drawDebugOverlay(ctx,
  state, w, h)` draw pass (axes + y=0 grid + frustum gizmo + per-model bounds ring
  & name label, reusing `core/modelView.modelBounds`).
- `src/shell/render.ts` — exported `modelMatrix` (was private; one-word change, no
  behaviour change) so the overlay places models with the EXACT same matrix render
  uses, minimising drift.
- `src/main.ts` — wired the dev toggle: a `debugOverlay` boolean toggled by the
  backtick (`` ` ``/`Backquote`) key, gated to `import.meta.env.DEV`; the render
  callback calls `drawDebugOverlay` only when on (`import.meta.env.DEV &&
  debugOverlay`), so Vite tree-shakes the overlay out of production.

**Implementation notes:**
- `frustumCorners` returns eye-space corners at `±d·tan(fovY/2)` (×aspect on x) for
  `d ∈ {near, far}`; by construction each maps to an NDC cube corner under the
  matching `perspective(...)` — the defining test.
- `projectBounds` reuses `wireframe.project()` (so the NEAR guard + NDC→pixel map
  are shared) and sizes the screen circle from a one-radius lateral eye-space
  offset — perspective-correct (shrinks with depth, grows with radius).
- The overlay rebuilds the SAME `perspective(FOV_Y, w/h, NEAR, FAR)` + `cameraView`
  + per-model matrices render uses, so bounds rings land on the models (the SM
  watch-out). Drawing is via the existing `drawWireframe` (near-plane clipping for
  free).
- Frustum: drawn as an inset, uniformly-scaled, angled gizmo built from the REAL
  NEAR/FAR planes — see the deviation below (the cockpit can't see its own
  frustum). Resolves TEA's degeneracy finding.

**Tests:** 17/17 new passing; **435/435** total (33 files) — zero regressions.
**Build:** `npm run build` (tsc --noEmit && vite build) clean, zero type errors.
**Branch:** `feat/11-3-dev-debug-overlay` (pushed to origin).
**AC status:** AC 1–5 met (toggle + invariants, axes/grid, frustum + bounds + label,
pure helpers unit-tested, no boundary violation / no new deps / build clean / green).

**Handoff:** To Reviewer (Obi-Wan) — note the two eyeball items: (1) the frustum
gizmo reads as a legible pyramid, and (2) bounds rings/axes/grid sit correctly when
toggled in surface/trench on the dev server (:5274, backtick to toggle).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (all GREEN) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings (reviewer-assessed directly) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings (reviewer-assessed directly) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings (reviewer-assessed directly) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings (reviewer-assessed directly) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings (reviewer-assessed directly) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings (reviewer-assessed directly) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings (reviewer-assessed directly) |
| 9 | reviewer-rule-checker | Yes | findings | 5 (all LOW, all test-only) | confirmed 5 (LOW, non-blocking), dismissed 0, deferred 0 |

**All received:** Yes (2 enabled subagents returned; 7 disabled via `workflow.reviewer_subagents` and assessed directly)
**Total findings:** 5 confirmed (all LOW, test-only), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

A dev-only, additive overlay pass with two pure, well-tested geometry helpers. Production code carries zero rule violations; the architectural boundary is intact; build and full suite are GREEN (435/435). The only findings are five LOW, test-only items that match the established house canvas-stub pattern. No Critical/High issues — nothing blocks.

**Data flow traced:** `Backquote` keydown → `debugOverlay = !debugOverlay` (shell-only boolean, `src/main.ts:90-94`, inside `if (import.meta.env.DEV)`) → render callback `if (import.meta.env.DEV && debugOverlay) drawDebugOverlay(ctx, state, W, H)` (`src/main.ts:170`) → overlay READS `state` (phase/enemies/turrets/exhaustPort) and strokes Canvas 2D. The state never flows back as a mutation (verified: the `NEVER mutates the sim state` test deep-equals via `structuredClone`; rule-checker S2 confirms no assignment to `state`). Safe because the overlay is a pure read + draw, gated out of production by the static `import.meta.env.DEV` guard.

**Pattern observed:** the overlay reuses the existing `drawWireframe` near-plane-clipping path for axes/grid/frustum (`src/shell/debug-overlay.ts:262-275`) and render's exported `modelMatrix`/placement helpers for per-model bounds (`sceneModels`, `:221-241`), so the rings project through the SAME `perspective(FOV_Y, w/h, NEAR, FAR)` + `cameraView` the scene uses — the SM watch-out ("bounds must match actual screen positions") is structurally honoured, not re-derived.

**Error handling:** offscreen/behind-camera geometry is handled by `project()`'s NEAR guard returning `null`; `projectBounds` returns `null` and the bounds loop does `if (!circle) continue` (`:281`) — an intentional skip-the-invisible, not a swallowed error. No try/catch, no async, no I/O in the new code.

### Observations (tagged by source)

- `[RULE]` 5 LOW findings, **all in `tests/shell/debug-overlay.test.ts`**, confirmed: (1) `ctx as unknown as CanvasRenderingContext2D` double-cast (`:101`); (2-4) non-null assertions `c!.x/.y/.r`, `far!.r`, `big!.r` after `expect().not.toBeNull()` (`:180-183,197,203`); (5) partial `fillText`/`arc` mock signatures (`:94,97`). **Decision: confirmed as LOW, non-blocking.** These are the standard node canvas-stub pattern and match the IDENTICAL cast in `tests/shell/wireframe.test.ts:27` and `tests/shell/render.tie-orient.test.ts:56` — pre-existing house convention. LOW severity does not block; logged as a Delivery Finding for a future test-hygiene pass. Not dismissed (the rule is real); downgraded in impact by the matching project convention.
- `[TEST]` (subagent disabled — reviewer-assessed, corroborated by `[RULE]` #8): the new tests assert meaningfully (NDC-cube-corner mapping for `frustumCorners`; null branches + monotonicity for `projectBounds`; no-mutation/determinism/additive for the draw pass). No vacuous assertions. The only debt is the stub fidelity above (LOW).
- `[TYPE]` (disabled — reviewer-assessed, corroborated by `[RULE]` #1): production types are clean — `frustumCorners`/`projectBounds`/`drawDebugOverlay`/`sceneModels` use `Vec3`/`Mat4`/`Model3D`/`GameState`, no `as any`, no `Record<string,any>`. `state: GameState` (not `Readonly<GameState>`) matches the existing render.ts convention; no new debt. [VERIFIED] no production type escapes — `src/shell/debug-overlay.ts` has zero `as`/`!`/`@ts-ignore`.
- `[SEC]` (disabled — reviewer-assessed): no untrusted input. `e.code !== 'Backquote'` compares a typed DOM `KeyboardEvent.code` (`:91`); no `JSON.parse`, no URLs, no secrets. The whole feature is dev-only and tree-shaken from production. [VERIFIED] no security surface introduced.
- `[SILENT]` (disabled — reviewer-assessed): the only early-returns are `if (!c)/(!edge) return null` and `if (!circle) continue` — deliberate "this point is behind the camera, skip it" semantics matching `wireframe.project()`, not swallowed errors. [VERIFIED] no empty catches / silent fallbacks.
- `[EDGE]` (disabled — reviewer-assessed): boundary cases are covered — sphere centre exactly on the near plane → `null` (tested); empty scene → axes/grid/frustum still stroke; multiple models → one ring each (tested). `w/h` with `h=0` would divide-by-zero, but that is a pre-existing assumption shared with `render()` and not reachable in play.
- `[DOC]` (disabled — reviewer-assessed): module + helper JSDoc is accurate and explains the eye-space convention, the NDC-cube-corner contract, and the gizmo rationale; comments match the code. No stale/misleading docs.
- `[SIMPLE]` (disabled — reviewer-assessed): `sceneModels` mirrors render's per-phase draw list (Dev already filed this as a Delivery Finding — extract a shared builder later). The frustum gizmo reads as a cone (near rect sub-pixel) — eyeball item. Neither is over-engineering that blocks; both logged as non-blocking findings.

### Rule Compliance (typescript.md #1–#13 + star-wars/CLAUDE.md boundary)

Exhaustive check (rule-checker, 17 rules, 61 instances):
- **#1 type escapes:** production clean; 4 LOW test-only (`as unknown as`, `!`). **#2 generics:** clean (no `Record<string,any>`/`Function`). **#3 enums:** N/A (none). **#4 null/undefined:** clean (`if (!x)` guards, no `||`-for-`??`). **#5 modules:** clean (`import type` used; `moduleResolution: bundler` ⇒ no `.js` needed). **#6 React:** N/A. **#7 async:** N/A. **#8 test quality:** 1 LOW (mock signatures). **#9 build:** clean (strict on; no tsconfig change). **#10 input validation:** clean. **#11 error handling:** N/A. **#12 perf/bundle:** clean (specific imports; overlay tree-shaken in prod). **#13 fix-regressions:** N/A (initial pass).
- **Boundary (A–D, CLAUDE.md):** [VERIFIED] no `core/` file imports `shell/` (grep clean; no core file changed); 3D math imported FROM `core/math3d`, not reimplemented; no new npm deps (no `package.json` change); `stepGame`/determinism untouched (overlay never calls the sim).
- **Story rules (S1–S4):** boundary intact; overlay read-only (S2, test-verified); zero new deps (S3); toggle DEV-gated (S4).

### Devil's Advocate

Argue this is broken. First attack: the overlay claims "never affects gameplay," but it runs every frame inside the render callback — could it corrupt the shared `ctx` state and bleed into the next frame's `render()`? Inspecting: `drawDebugOverlay` runs INSIDE the `ctx.save()/ctx.scale()/ctx.restore()` block in `main.ts` AND after `render()`, and it sets `shadowBlur` back to 0 after its arcs; the next frame re-runs `render()` which resets `fillStyle`/`strokeStyle`/`shadowBlur` itself — so any leaked `strokeStyle`/`font` is overwritten before it matters. Not a real corruption. Second attack: a malicious/confused user spams the backtick key — does the toggle desync? It is a pure boolean flip with no async, idempotent per keypress; no race. Third attack: production leakage — does the dev overlay ship to players? The draw call is `import.meta.env.DEV && debugOverlay`; in a prod build `import.meta.env.DEV` is statically `false`, so Rollup drops the branch, the `debugOverlay` binding, AND the `drawDebugOverlay` import (rule-checker #12 confirmed; the bundle is 9.79 kB, unchanged-ish). Fourth attack: the bounds rings lie about where models are, defeating the tool's purpose — the SM's explicit risk. But `sceneModels` uses render's EXACT `modelMatrix`/orients/placement and the same `proj`/`view`, and the `rings models through the SCENE camera` test pins a dead-ahead TIE to screen-centre; the rings cannot drift from the draw unless render's per-phase list changes (flagged for a shared builder). Fifth attack: a stressed value — `h=0` → `w/h=Infinity` → NaN projections. True, but unreachable (the canvas always has positive height in play) and shared with the existing `render()` assumption; not introduced here. Sixth: the frustum is mislabelled — it draws a cone, not a frustum. It IS the real frustum (near plane genuinely sub-pixel vs a 9000-deep far plane); honest, if less textbook. None of these rise to Critical/High. The code does what it claims.

**Handoff:** To SM (Thrawn) for finish-story.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-30T10:14:12Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-30T09:39:25Z | 2026-06-30T09:41:36Z | 2m 11s |
| red | 2026-06-30T09:41:36Z | 2026-06-30T09:52:49Z | 11m 13s |
| green | 2026-06-30T09:52:49Z | 2026-06-30T10:04:00Z | 11m 11s |
| review | 2026-06-30T10:04:00Z | 2026-06-30T10:14:12Z | 10m 12s |
| finish | 2026-06-30T10:14:12Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Question** (non-blocking): The frustum drawn from the camera's OWN viewpoint
  is geometrically degenerate — it fills the screen (the eye sits at the frustum
  apex), so a naïve `frustumCorners → project → stroke` reads as four screen
  diagonals, not an illuminating "pyramid of visible space". `frustumCorners` is
  correct in eye space regardless; how to render it usefully is a Dev/eyeball
  decision. Affects `src/shell/debug-overlay.ts` (the frustum draw path — consider
  a slightly inset/pulled-back debug view, or treat it as a near/far/FOV reference
  readout). *Found by TEA during test design.*
- **Question** (non-blocking): TEA contract decision — the pure helpers
  (`frustumCorners`, `projectBounds`) are placed in `src/shell/debug-overlay.ts`,
  not `core/`. The story scope (highest spec authority) names that file, and these
  are overlay-specific dev helpers, not general sim math — mirroring `wireframe.ts`,
  which already holds pure shell helpers (`project`, `clipToNear`). This is in
  tension with ADR 0001's "pure matrix builders live in core" note, but they are not
  matrix builders and `core/` stays untouched (boundary holds). Reviewer should
  confirm this placement is acceptable. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): `sceneModels()` in `debug-overlay.ts` mirrors
  render.ts's per-phase draw list (which models, with which orients/placement, per
  phase). It already shares render's exported `modelMatrix`/orients/placement
  helpers, so the MATRICES can't drift — but the per-phase model LIST is authored
  in two places and could. Affects `src/shell/render.ts` + `src/shell/debug-overlay.ts`
  (extract a shared `sceneModels(state)` builder both render() and the overlay
  consume; deferred to avoid refactoring render's draw loop under this story).
  *Found by Dev during implementation.*
- **Resolved** (non-blocking): TEA's frustum-degeneracy finding is addressed — the
  frustum is drawn as an inset, scaled, angled gizmo (real NEAR/FAR shape) rather
  than from the cockpit's own viewpoint. Affects `src/shell/debug-overlay.ts`
  (eyeball the gizmo's legibility). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): the test canvas stub uses `as unknown as CanvasRenderingContext2D` plus non-null assertions (`c!.x`, `far!.r`, `big!.r`) and partial `fillText`/`arc` mock signatures. Affects `tests/shell/debug-overlay.test.ts` (could tighten to typed `vi.fn()` stubs / explicit guards). This is the established house pattern (identical cast in `tests/shell/wireframe.test.ts` and `render.tie-orient.test.ts`), so it is LOW and consistent — flagged for a future test-hygiene pass, not this story. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the frustum gizmo reads as a cone (the scaled near rectangle is sub-pixel at NEAR:FAR = 1:9000). Affects `src/shell/debug-overlay.ts` (`frustumModel`/`FRUSTUM_GIZMO_*` constants — eyeball on :5274; tune if a boxier near-plane read is wanted). *Found by Reviewer during code review.*
- **Question** (non-blocking): the bounds ring radius assumes model scale = 1 (true for every current `modelMatrix` call in render.ts). Affects `src/shell/debug-overlay.ts` (`drawDebugOverlay` bounds loop) — if a future story renders a model with `s != 1`, the overlay ring will mis-size until it threads the same scale. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Toggle key (AC-1) verified by invariant, not by a keypress test**
  - Spec source: context-story-11-3.md, AC-1
  - Spec text: "A keyboard toggle shows/hides the overlay; it is off by default and never affects gameplay or the sim"
  - Implementation: AC-1 is pinned by two invariant tests — `NEVER mutates the sim state` (deep-equal before/after) and `is a SEPARATE additive pass` (render() is untouched, so "off" = main.ts simply doesn't call the overlay) — rather than a test that simulates the dev keypress and asserts a visibility flag.
  - Rationale: the toggle lives in `main.ts` bootstrap DOM wiring gated to `import.meta.env.DEV`, which is not unit-testable in node — the established 11-4 phase-jump precedent eyeballs the key and unit-tests the pure behaviour it drives. The invariants capture the part of AC-1 that actually matters (no sim impact, additive), and the key/default-off is eyeballed in dev.
  - Severity: minor
  - Forward impact: Dev wires the toggle in `main.ts` (eyeballed); Reviewer confirms the key default-off + show/hide on the dev server (:5274).

### Dev (implementation)
- **Frustum drawn as an inset gizmo, not in-place from the camera**
  - Spec source: context-story-11-3.md, AC-3 (and ADR 0001 part C)
  - Spec text: "Overlay draws the camera frustum"
  - Implementation: the frustum is built from the REAL NEAR/FAR planes (`frustumCorners(FOV_Y, w/h, NEAR, FAR)`) but drawn through a fixed debug transform — uniformly scaled down (shape preserved), rotated, and pushed in front of the camera — so it reads as a legible pyramid, instead of being projected from the cockpit's own viewpoint.
  - Rationale: the cockpit IS the camera, so its frustum is degenerate from its own eye (apex at the origin → fills the screen as screen-edge diagonals). An offset/exploded gizmo is the only way to actually SEE the frustum's FOV/depth shape — the approach TEA flagged as needed. Near/far planes are unchanged (honours the SM watch-out "don't invent new depth bounds"); only the viewing transform is a visualisation choice.
  - Severity: minor
  - Forward impact: none (dev-only visual; eyeballed). Reviewer/dev should confirm the gizmo reads clearly on :5274; the constants (scale/yaw/push) are tunable.
### Reviewer (audit)
- **TEA — "Toggle key (AC-1) verified by invariant, not by a keypress test"** → ✓ ACCEPTED by Reviewer: sound. The toggle is `main.ts` `import.meta.env.DEV` bootstrap wiring (not node-testable); the invariant tests (no-mutation + additive-pass) capture the substantive part of AC-1, and the key/default-off is correctly eyeballed — identical to the merged 11-4 phase-jump precedent. Backtick listener + `import.meta.env.DEV && debugOverlay` guard confirmed at `src/main.ts:90-94,170`.
- **Dev — "Frustum drawn as an inset gizmo, not in-place from the camera"** → ✓ ACCEPTED by Reviewer: correct call. From the cockpit's own eye the frustum is degenerate (apex at origin), so an offset gizmo is the only way to read its shape; `frustumModel` uses the REAL `NEAR`/`FAR` (`src/shell/debug-overlay.ts:204`), honouring the SM watch-out. Non-blocking eyeball: with `NEAR=1`/`FAR=9000` the scaled near rectangle is sub-pixel, so the gizmo reads as a cone from an apex rather than a box — geometrically honest, but the near rectangle won't be visible; tune the constants if a boxier read is wanted. Logged as a Delivery Finding.
- No UNDOCUMENTED deviations found: the diff matches the logged TEA/Dev deviations; no other spec divergence detected.