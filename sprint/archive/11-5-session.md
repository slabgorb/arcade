---
story_id: "11-5"
jira_key: ""
epic: "11"
workflow: "tdd"
---
# Story 11-5: Procedural Death Star surface — receding ground grid + horizon

## Story Details
- **ID:** 11-5
- **Jira Key:** (none)
- **Workflow:** tdd
- **Stack Parent:** none (no upstream dependency)
- **Epic:** 11 (star-wars 3D-vector render pipeline)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-30T10:16:15Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-30T09:39:11Z | 2026-06-30T09:41:11Z | 2m |
| red | 2026-06-30T09:41:11Z | 2026-06-30T09:53:10Z | 11m 59s |
| green | 2026-06-30T09:53:10Z | 2026-06-30T10:02:40Z | 9m 30s |
| review | 2026-06-30T10:02:40Z | 2026-06-30T10:16:15Z | 13m 35s |
| finish | 2026-06-30T10:16:15Z | - | - |

## Sm Assessment

**Verdict:** Setup complete — routing to TEA (The Jesus) for the RED phase.

**Story scope (coordination view only):** Replace the collapsed `DEATH_STAR_SURFACE` (Object_8) spike with a procedurally-generated, scrolling ground grid that recedes to a horizon — the Wave-2 surface skim. Per ADR 0002 part A, the surface defect is a *content* problem (Object_8 was never a surface), not a clipping/MVP bug — that pipeline is correct as of 11-2. 11-4 (just merged) makes this phase reachable for honest verification.

**Setup state:**
- Session: `.session/11-5-session.md` (this file), phase `setup` → handing off to `red`.
- Context: `sprint/context/context-story-11-5.md` (acceptance criteria validated).
- Branch: `feat/11-5-surface-grid` off `develop` in the star-wars subrepo (gitflow).
- No Jira (jira_key empty) — claim steps skipped.

**Constraints the implementation must respect (for TEA/Dev, not my call to design):**
- `surfaceGrid(scroll) -> Model3D` must be a **pure core generator** (src/core) — no DOM/time/random; the CLAUDE.md core/shell boundary is the hardest rule in this repo.
- New `surfaceScrollZ` accumulator in `GameState`, advanced by `TURRET_SCROLL_SPEED`, reset on phase entry — determinism and the `stepGame(state,input,dt)` contract must be preserved.
- Object_8/`DEATH_STAR_SURFACE` is re-classified (retired from the surface render), **not deleted**. Existing `SURFACE_TOWER` turrets keep their sim positions and sit on the grid.

**Next agent:** TEA — write the failing tests (RED) for `surfaceGrid` purity/shape and the `surfaceScrollZ` accumulator/reset behavior. Reference ADR `star-wars/docs/adr/0002-scene-geometry-surface-and-trench.md` (part A).

---
## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** 5-pt feature adding a pure core generator + new GameState — squarely TDD.

**Test Files:**
- `star-wars/tests/core/surface-grid.test.ts` — the pure `surfaceGrid(scroll)` generator (shape, y=0 plane, purity/determinism, width/length envelope, GRID_X/GRID_Z spacing + line counts, X-symmetry, scroll recycling + toward-camera direction) and the `surfaceScrollZ` accumulator (initialState seed, surface-phase advance by `TURRET_SCROLL_SPEED·dt`, shares the turret flow, reset-on-`enterPhase`, determinism). Plus an AC5 regression guard that `DEATH_STAR_SURFACE` stays in the registry (re-classified, not deleted).
- `star-wars/tests/shell/render.surface-grid.test.ts` — AC2 swap mechanism: mocks `drawWireframe` and asserts the surface phase draws the flat-y=0 grid and NOT `DEATH_STAR_SURFACE`.

**Tests Written:** 19 (17 core + 2 render) covering ACs 1, 2, 3, 5.
**Status:** RED (verified by testing-runner, RUN_ID 11-5-tea-red) — 2 files / 2 assertions failing, **418/418 pre-existing tests still green, no regressions.**
- `surface-grid.test.ts` → fails at import (`Cannot find module ../../src/core/surface-grid`) — the contract module Dev must create. Its 17 cases run for the first time once that module exists; if any assertion over-specifies the contract, reconcile in the RED↔GREEN dialog (TEA can revise tests).
- `render.surface-grid.test.ts` → fails on assertions (render.ts:184 still strokes `DEATH_STAR_SURFACE`).

### Rule Coverage

No `.claude/rules` or `SOUL.md` in this repo; rubric is the ACs + `gates/lang-review/typescript.md`. Applicable checks pinned by these tests:

| Rule | Test(s) | Status |
|------|---------|--------|
| Determinism / purity (boundary, ADR + CLAUDE.md) | `surfaceGrid is pure & deterministic`, `accumulates deterministically for a fixed seed` | failing (module missing) |
| #4 null/undefined (no `\|\|`-on-0; surfaceScrollZ defined) | `initialState seeds surfaceScrollZ to 0`, `advances … by TURRET_SCROLL_SPEED·dt` | failing |
| #8 test quality (no `as any` in assertions; mock types match impl) | render swap test uses `vi.mocked(drawWireframe)`, not `as any`; ctx stub is the documented `as unknown as` idiom | n/a (self-check) |

**Rules checked:** purity/determinism, null/undefined, and test-quality are the checklist items that map to this pure-core + accumulator surface; the rest (React/JSX, async/Promise, enum, error handling) don't apply to a deterministic geometry generator.
**Self-check (Phase C):** 0 vacuous tests — every case has a concrete assertion; the 2 AC5 cases are intentional no-delete regression guards (pass today), not vacuous.

**Handoff:** To Dev (Walter) for implementation. See Design Deviations (module path / Model3D return type, AC4-eyeball) and the green→GREEN target: create `src/core/surface-grid.ts`, add `surfaceScrollZ` to GameState/initialState/stepSurface/enterPhase, swap render.ts:184. **AC4 still needs a human eyeball at :5274 via the 11-4 phase-jump — green tests are necessary, not sufficient.**

---
## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `star-wars/src/core/surface-grid.ts` (NEW) — pure `surfaceGrid(scroll): Model3D` generator + envelope constants `GRID_X=400`, `GRID_Z=500`, `GRID_HALF_WIDTH=3600`, `GRID_FAR=6000`. Builds longitudinal lines at x=±k·GRID_X (static) and lateral lines every GRID_Z recycling toward the cockpit by `scroll mod GRID_Z`. No DOM/time/random — boundary intact.
- `star-wars/src/core/state.ts` — `GameState` gains `surfaceScrollZ: number`; `initialState()` seeds it to 0.
- `star-wars/src/core/sim.ts` — `stepSurface` advances `surfaceScrollZ` by `TURRET_SCROLL_SPEED·dt` (the same flow as the turrets); `enterPhase` resets it to 0 on every phase entry.
- `star-wars/src/shell/render.ts` — the surface phase now draws `surfaceGrid(state.surfaceScrollZ)` (authored in world space, camera-only transform) instead of `DEATH_STAR_SURFACE`. The spike model stays in the registry (AC5, re-classified not deleted).

**Tests:** 439/439 passing (GREEN) — verified by testing-runner, RUN_ID 11-5-dev-green. 21 new (19 generator/accumulator + 2 render-swap), 418 pre-existing, **zero regressions**. `tsc --noEmit` clean across src + tests.

**ACs:** AC1 (pure generator) ✓, AC2 (render swap) ✓, AC3 (surfaceScrollZ accumulator) ✓, AC5 (spike re-classified not deleted, determinism, build clean) ✓. **AC4 (reads as a wide receding ground — NOT a triangle) is the one AC green tests cannot prove — it needs a human eyeball at :5274 via the 11-4 phase-jump.**

**Branch:** `feat/11-5-surface-grid` (pushed to origin). No PR (SM opens it at finish).

**Handoff:** To Reviewer (The Big Lebowski). Please eyeball the surface phase at :5274 (jump via 11-4) to close AC4, and see the Dev deviations (orphaned spike scaffolding kept on purpose; only laterals scroll).

---
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 smells (439 tests green, build clean) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 5 (1 high-conf coverage gap, 4 med/low) | confirmed 5 (all non-blocking), dismissed 0 |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 1 (LOW, rule #1) | confirmed 1 (LOW, non-blocking), dismissed 0 |

**All received:** Yes (4 enabled returned; 5 disabled via settings, covered by Reviewer)
**Total findings:** 6 confirmed (all Low/Medium, non-blocking), 0 dismissed, 0 deferred

---
## Reviewer Assessment

**Verdict:** APPROVED

**Summary:** A small, boundary-respecting, well-tested feature. A new PURE core generator (`surfaceGrid`) replaces the mis-cast `DEATH_STAR_SURFACE` spike with a wide receding ground grid; a `surfaceScrollZ` accumulator rides the existing turret flow and resets on phase entry. Core purity holds (rule-checker A1/A2: 0 violations), the four-point GameState wiring is consistent (A3: 0 violations), security is clean, 439/439 tests pass, `tsc` clean. **I reprojected the grid through the surface camera and confirmed AC4 numerically — it reads as a receding ground with a horizon, NOT the old triangle.** The only findings are test-robustness nits (Medium/Low) and one Low rule-match on a test-only cast — none blocking.

**Data flow traced:** `enterPhase` seeds `surfaceScrollZ=0` → `stepSurface` advances it by `TURRET_SCROLL_SPEED·dt` (sim.ts:374) → `render.ts:187` passes `state.surfaceScrollZ` to `surfaceGrid(scroll)` → `offset = ((scroll % GRID_Z) + GRID_Z) % GRID_Z` → lateral-line z positions → `drawWireframe` strokes via the surface `view` matrix. No user-controlled input reaches `surfaceGrid`; the only argument is a sim accumulator seeded at 0 and advanced by `constant·dt`. Deterministic and safe ([SEC] confirmed).

### Rule Compliance

Per [RULE] (reviewer-rule-checker: 13 TS rules + 3 CLAUDE.md boundary rules, 30 instances, **1 violation**) and my own enumeration:
- **Core/shell boundary (CLAUDE.md — hardest rule):** `surface-grid.ts` imports only `import type { Vec3 }`/`import type { Model3D }` (both core), uses only `Math.round` + arithmetic + `Array.push`; no DOM/`window`/`Date`/`Math.random`/`rAF`, no shell import. `render.ts` (shell) imports `surfaceGrid` from core — the allowed direction. COMPLIANT (A1/A2, 0 violations).
- **#1 type-safety escapes:** no `as any`/`@ts-ignore`/`!` in src. ONE match: `as unknown as CanvasRenderingContext2D` at `tests/shell/render.surface-grid.test.ts:~70` — confirmed below as [RULE][LOW] (test-only stub).
- **#2 generics/readonly:** `Vec3[]` and `[number,number][]` are structurally assignable to the `readonly` `Model3D` fields — no cast, compiles clean. COMPLIANT.
- **#4 null/undefined:** `((scroll % GRID_Z) + GRID_Z) % GRID_Z` is the correct non-negative-modulo idiom (−100→400, 0→0, GRID_Z→0); `surfaceScrollZ` arithmetic is plain `+` on a always-`number` field — no `||`-on-0 misuse. COMPLIANT.
- **#5 module/declaration:** `import type` for the type-only `Vec3`/`Model3D`; value import for the runtime `surfaceGrid`. COMPLIANT.
- **#8 test quality:** mock typed via `vi.mocked` (not `as any`); imports from `src/` not `dist/`. Two redundant assertions flagged below (Low). COMPLIANT by rule letter.
- **GameState invariant (A3):** `surfaceScrollZ` in the interface (state.ts:274), `initialState` (:315), advanced in `stepSurface` (sim.ts:374), reset in `enterPhase` (:506), and preserved by `...state` in the space fall-through and `stepTrench`. COMPLIANT.

### Observations

1. `[VERIFIED]` Core purity preserved — `src/core/surface-grid.ts:17-18` only `import type` from core; pure fn of `scroll`, no DOM/time/random. Hardest CLAUDE.md rule holds ([RULE] A1, 0 violations).
2. `[VERIFIED]` `surfaceScrollZ` wired at all four points and preserved across non-surface phases — state.ts:274/:315, sim.ts:374/:506; `...state` carries it through space/trench ([RULE] A3 confirmed).
3. `[VERIFIED][AC4]` Reprojection (scratchpad/reproject.mjs, surface camera y=120, FOV 60°, 1456×1117) shows a receding ground with a horizon: lateral-line centers rise 791→578px toward screen-center as z goes −500→−6000; the near line runs off **both** screen edges while the far line spans the width; the outer x=±3600 longitudinals converge from off-screen toward center (728). The opposite of the ADR's triangle-collapsing spike. AC4 geometry confirmed; final glow/polish is the human eyeball.
4. `[SEC]` Security clean — no type escapes in src; `surfaceGrid(NaN/Infinity)` yields bounded geometry (loop counts are compile-time constants) and is unreachable (the accumulator is always finite). Canvas no-ops on NaN coords. No injection/eval/DOM-in-core.
5. `[RULE][LOW]` `as unknown as CanvasRenderingContext2D` (render.surface-grid.test.ts) matches lang-review #1 (double-cast). **Confirmed, not dismissed** (rule match) — held at LOW: test-only, the established codebase idiom (`render.player-laser.test.ts` uses the identical cast), no runtime/validation bypass. Improvement: extract a shared `makeCtx()` stub so the cast appears once.
6. `[TEST][MEDIUM]` Coverage gap (test-analyzer, high-conf): no test asserts `surfaceScrollZ` stays `0` while stepping a NON-surface phase. **The code is correct** — I verified only `stepSurface` mutates it and space/trench preserve it via `...state` — but a future copy-paste into `stepTrench` would go uncaught. Non-blocking; fast-follow test.
7. `[TEST][LOW]` Robustness nits (test-analyzer): negative-scroll path untested (defensive modulo); `typeof …toBe('number')` redundant with the adjacent `.toBe(0)`; the determinism test's `a.surfaceScrollZ===b.surfaceScrollZ` is subsumed by `toEqual(b)`; the render negative-check is name-based (could use object identity). All non-blocking.
8. `[SIMPLE]` (disabled — covered by Reviewer) `[LOW]` `surfacePlacement`/`Z_SURFACE_PLACEMENT`/`SURFACE_ORIENT` are now orphaned from `render()` but kept — **not dead code**: `surface-visibility.test.ts`/`surface.test.ts` exercise them directly, and Dev logged the choice. Acceptable; a future cleanup can retire them.
9. `[DOC]` (disabled — covered by Reviewer) `[LOW]` Both new test files keep a "RED phase — EXPECTED TO FAIL" preamble that is now stale (they pass). Cosmetic; preflight also noted it. Non-blocking.
10. `[EDGE]` (disabled — covered by Reviewer) The diff's only branches are `enterPhase`'s phase ternaries (covered by the reset tests), `stepSurface`'s accumulate (covered), and the negative-scroll modulo (handled; untested per obs. 7). No unhandled path; the sub-cell far-horizon gap is the only edge (see Devil's Advocate), cosmetic.
11. `[SILENT]` (disabled — covered by Reviewer) No try/catch, no error handling, no swallowed errors in the diff — `surfaceGrid` has no failure path. Nothing to swallow.
12. `[TYPE]` (disabled — covered by Reviewer) Types clean: mutable→readonly array assignability ([RULE] #2), correct `import type` (#5), no `as any`. The sole cast is the test stub (obs. 5).

### Devil's Advocate

Assume this is broken. The most dangerous claim is "the grid reads as a ground." I did not trust the green tests for that — the structural tests pin spacing/symmetry/envelope but not the projected picture, which is precisely the gap that let the triangle ship through 11-1/11-2. So I reprojected the actual vertices through the real surface camera: the result is unambiguously a receding ground (near line off both edges, far line spanning the width near a central horizon, longitudinals converging to a vanishing point). The fix is sound where the prior stories failed. Next attack: state coherence. `surfaceScrollZ` only ever grows within a surface phase; could it overflow or lose precision? At 600 u/s it is bounded by the 4-kill phase clear (seconds), and even pathologically it stays far under 2^53 where integer math is exact, and it is consumed `mod GRID_Z` — no precision bite. Could the grid and turrets desync? Both advance at exactly `TURRET_SCROLL_SPEED·dt`, so a turret holds a fixed position relative to the moving grid — no drift. The subtle real defect: when `offset > 0`, the nearest lateral pokes to `z = +offset` (behind the camera, near-plane clipped) and the farthest stops at `z = −GRID_FAR + offset`, leaving a one-cell gap at the very horizon. I checked its size — at the horizon one `GRID_Z` cell is ~2px tall — so it is imperceptible, a cosmetic shimmer at most, not a correctness bug. A stressed input: a huge `dt` frame-hitch jumps the scroll, but `mod GRID_Z` keeps the grid valid and it self-corrects next frame. A confused player jumping to the surface via the 11-4 dev key hits `enterPhase`, which resets the scroll to 0 — the jumped scene is identical to the progressed one. A malicious page has no input path into `surfaceGrid`. The worst real-world bite is a sub-pixel horizon gap. Nothing rises to Critical or High; verdict stands.

**Pattern observed:** Pure-core-generator strokes through the shell — `surfaceGrid` (core, world-space) is consumed by `render.ts:187` with only the camera `view` matrix, exactly like Tempest's tube geometry. Correct and idiomatic ([SIMPLE]/[TYPE] confirm).
**Error handling:** No failure paths in the diff; `surfaceGrid` is total over its numeric domain (finite inputs → finite geometry; the unreachable NaN case degrades to silent canvas no-ops).

**Handoff:** To SM (The Dude) for finish-story. The Medium/Low test-hardening nits + the cosmetic horizon-gap are captured as Delivery Findings for a fast-follow.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### TEA (test design)
- **Improvement** (non-blocking): The ADR 0002 "Proposed stories" list (part A → "11-4") is off by one from the actual sprint — the dev phase-jump was inserted as 11-4, so the surface grid is 11-5 and the trench is 11-6. The ADR's prose/part labels (A=surface, B=trench, C=body) are still correct; only the trailing story-number mapping drifted. Affects `star-wars/docs/adr/0002-scene-geometry-surface-and-trench.md` (the "Proposed stories" section could note the renumber). *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): The surface grid constants are authentic-FEEL (no symbolic table in StarWars.asm): `GRID_X=400`, `GRID_Z=500`, `GRID_HALF_WIDTH=3600`, `GRID_FAR=6000`. `GRID_Z=500` vs `TURRET_SCROLL_SPEED=600` means the lateral cells pass at ~1.2 cells/sec — fine, but the exact density/recede-rate is an EYEBALL tuning at :5274, not yet pinned to anything authentic. Affects `star-wars/src/core/surface-grid.ts` (constants may want a tuning pass once the surface is viewed). *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (non-blocking): No test pins that `surfaceScrollZ` stays `0` while stepping a NON-surface phase (space/trench). The code is correct (only `stepSurface` mutates it; `...state` preserves it elsewhere), but a future copy-paste into `stepTrench` would go uncaught. Affects `star-wars/tests/core/surface-grid.test.ts` (add a non-advancement test for the inactive phases). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): Test-robustness nits — negative-scroll recycling untested, two redundant assertions (`typeof…toBe('number')` beside `.toBe(0)`; `a.surfaceScrollZ===b.surfaceScrollZ` beside `toEqual(b)`), and a name-based render negative-check that could use object identity. Also a shared `makeCtx()` helper would centralise the lone `as unknown as CanvasRenderingContext2D` stub. Affects `star-wars/tests/core/surface-grid.test.ts` + `tests/shell/render.surface-grid.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): When the grid scrolls (`offset>0`), a one-cell band is briefly missing at the very horizon (the farthest lateral stops at `z=−GRID_FAR+offset`). At the horizon one `GRID_Z` cell is ~2px — cosmetic. A future polish could draw one extra far lateral so coverage is gapless. Affects `star-wars/src/core/surface-grid.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### TEA (test design)
- **Generator module path & return type pinned by the test contract**
  - Spec source: context-story-11-5.md, AC-1; ADR 0002 part A
  - Spec text: "core gains a pure, deterministic surfaceGrid(scroll) generator … Add a PURE core generator surfaceGrid(scroll) -> Model3D" (ADR offers "-> Model3D (or a line-segment list)")
  - Implementation: tests import `surfaceGrid` + `GRID_X`/`GRID_Z`/`GRID_HALF_WIDTH`/`GRID_FAR` from a dedicated `src/core/surface-grid.ts` and assert it returns a `Model3D`.
  - Rationale: the story description says `-> Model3D`, which the shell strokes through the existing `drawWireframe` like every other model; a dedicated module is single-responsibility and mirrors how 11-6's `trenchChannel` will land. Dev may split internals/re-export as long as those symbols resolve.
  - Severity: minor
  - Forward impact: Dev must expose those four constants + `surfaceGrid` from that path (or re-export). If Dev prefers a line-segment list, the shape tests need revising first — flag it, don't cast.
- **AC4 visual fidelity is eyeball-only, not unit-tested**
  - Spec source: context-story-11-5.md, AC-4
  - Spec text: "The surface reads as a wide receding ground with a horizon — NOT a triangle — eyeballed via the 11-4 phase-jump in dev (:5274)"
  - Implementation: I assert STRUCTURAL proxies (flat on y=0, full ±GRID_HALF_WIDTH width, lateral lines receding to ≈ −GRID_FAR, GRID_X/GRID_Z spacing, scroll recycling/direction) but NOT the rendered picture.
  - Rationale: "reads as a receding ground" is a visual judgment; the repo's standing convention (render.ts SURFACE_ORIENT note) keeps exact visuals an eyeball concern. This is the exact gap that sank 11-1/11-2, so the structural proxies + the drawWireframe-swap test make the mechanism verifiable; the final look still needs a human eye.
  - Severity: minor
  - Forward impact: Reviewer/Dev MUST eyeball the surface phase at :5274 via the 11-4 phase-jump before sign-off — green tests are necessary but not sufficient for AC4.

### Dev (implementation)
- **Retired-spike render scaffolding kept, not deleted**
  - Spec source: context-story-11-5.md, AC-5
  - Spec text: "Object_8/DEATH_STAR_SURFACE is removed from the surface scene (re-classified, not deleted)"
  - Implementation: render.ts no longer CALLS `surfacePlacement()` / `SURFACE_ORIENT` / `Z_SURFACE_PLACEMENT` in the surface block (the spike draw is gone), but those exports are left in place — they are still exercised directly by `surface-visibility.test.ts` and `surface.test.ts`, which pass unchanged.
  - Rationale: AC5 retires the spike from the *scene*; removing the orphaned placement helpers would break their existing unit tests and is outside 11-5's scope. Leaving them is intentional, not an oversight.
  - Severity: minor
  - Forward impact: a future cleanup could retire `surfacePlacement`/`Z_SURFACE_PLACEMENT` (and their 8-11 tests) once nothing seats the spike; `SURFACE_ORIENT` stays (surface.test.ts pins it).
- **Only the lateral lines carry the scroll; longitudinal lines are static**
  - Spec source: ADR 0002 part A
  - Spec text: "Longitudinal lines parallel to −Z … Lateral lines across X every GRID_Z … scrolling toward the camera and recycling by scroll mod GRID_Z"
  - Implementation: `surfaceGrid` scrolls only the lateral lines (z = −k·GRID_Z + scroll mod GRID_Z); the longitudinal lines are fixed at z∈[0,−GRID_FAR].
  - Rationale: a line parallel to −Z slid along −Z is identical to itself, so scrolling the longitudinals is a visual no-op — the laterals alone produce the "ground rushing past." Simplest code that satisfies the recycling/direction tests.
  - Severity: minor
  - Forward impact: none — 11-6's trench will mirror this (only ribs/walls scroll, rails static).

### Reviewer (audit)
- **TEA — Generator module path & Model3D return type** → ✓ ACCEPTED by Reviewer: the story description literally says `-> Model3D`; a dedicated `src/core/surface-grid.ts` is single-responsibility and the implementation honours it. Sound.
- **TEA — AC4 visual fidelity is eyeball-only** → ✓ ACCEPTED by Reviewer: correct framing, and I went further — reprojected the grid through the surface camera (scratchpad/reproject.mjs) to confirm the geometry reads as a receding ground with a horizon (not a triangle). Final glow/polish remains a human eyeball; the mechanism is verified.
- **Dev — Retired-spike render scaffolding kept, not deleted** → ✓ ACCEPTED by Reviewer: AC5 retires the spike from the *scene*; `surfacePlacement`/`SURFACE_ORIENT` stay test-covered (surface-visibility/surface tests), so they are not dead code. Removing them is out of 11-5 scope. Logged as a future-cleanup Delivery Finding ([SIMPLE] obs. 8).
- **Dev — Only lateral lines carry the scroll; longitudinals static** → ✓ ACCEPTED by Reviewer: sliding a −Z-parallel line along −Z is a visual no-op, so static longitudinals are correct and simplest. The only side effect is a sub-pixel horizon gap when scrolling (cosmetic, logged as a Delivery Finding).
- No UNDOCUMENTED deviations found — every spec divergence was logged by TEA or Dev.