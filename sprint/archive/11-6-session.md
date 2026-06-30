---
story_id: "11-6"
jira_key: ""
epic: ""
workflow: "tdd"
---
# Story 11-6: Walled trench channel — floor + ribbed side walls, receding

## Story Details
- **ID:** 11-6
- **Jira Key:** (none)
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-30T11:21:34Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-30T10:53:18Z | 2026-06-30T10:54:31Z | 1m 13s |
| red | 2026-06-30T10:54:31Z | 2026-06-30T11:04:18Z | 9m 47s |
| green | 2026-06-30T11:04:18Z | 2026-06-30T11:09:50Z | 5m 32s |
| review | 2026-06-30T11:09:50Z | 2026-06-30T11:21:34Z | 11m 44s |
| finish | 2026-06-30T11:21:34Z | - | - |

## SM Assessment

**Story:** 11-6 — Walled trench channel (floor + ribbed side walls, receding). 5 pts, p2, repo `star-wars`, tdd (phased) workflow.

**Routing decision:** Phased TDD. Setup → **red (TEA)** → green (Dev) → review (Reviewer) → finish (SM). Handing off to TEA to write failing tests first. This is a meaty 5-pt core-sim feature with a pure generator at its heart — exactly the kind of deterministic logic that belongs under test before any implementation.

**Scope / technical approach (for TEA & Dev — full spec in `sprint/context/context-story-11-6.md`):**
- New PURE core generator `trenchChannel(scroll) -> Model3D` in `src/core`: floor rails at `x=±TRENCH_HALF_W`, lateral floor ribs every `RIB_Z`, two vertical side walls (`y=0`→`TRENCH_WALL_H`) with a vertical rib per `RIB_Z`, top rails. Runs `z≈0`→far cutoff, scrolls toward camera, recycles via `scroll mod RIB_Z`.
- New `trenchScrollZ` accumulator on `GameState`, advanced by `TRENCH_SCROLL_SPEED`, reset on phase entry.
- Exhaust port keeps its own sim scroll, seated in floor at channel center. Camera unchanged (skims `y=TRENCH_SKIM`, centered).
- Replaces the flat 512×384 floor tile that reprojects to a ~224×4px sliver (see ADR `docs/adr/0002-scene-geometry-surface-and-trench.md` part B).

**Dependency:** 11-4 (dev phase-jump keys) — already merged on develop; used for visual verification of the trench phase.

**Pre-handoff checklist:**
- [x] Session file created (`.session/11-6-session.md`)
- [x] Story context written w/ technical approach + ACs (`sprint/context/context-story-11-6.md`)
- [x] Feature branch created: `feat/11-6-walled-trench-channel` (base develop)
- [x] No Jira (local tracking; JIRA_KEY empty) — explicitly skipped
- [x] Merge gate clear (no blocking open PRs in star-wars)

## TEA Assessment

**Tests Required:** Yes
**Reason:** 5-pt core-sim feature with a pure deterministic generator at its heart — exactly what TDD exists for.

**Test Files:**
- `tests/core/trench-channel.test.ts` — the pure `trenchChannel(scroll) -> Model3D` generator + the `trenchScrollZ` accumulator. 27 tests across: well-formedness (finite verts, in-range non-degenerate edges), the walled-corridor differentiator (y spans 0→`TRENCH_WALL_H`; length >> width — NOT the old flat sliver), purity/determinism, ±X symmetry & both side walls, floor+top rails on both walls, lateral floor ribs + vertical wall ribs every `RIB_Z` (full-width / full-height / shared z-stations), scroll recycling `mod RIB_Z` + direction (incl. walls scroll *with* the floor), the accumulator (seed 0 / advance by `TRENCH_SCROLL_SPEED·dt` / same rate as the port / reset on every phase entry / determinism), and a flat-`TRENCH`-tile-retired-not-deleted regression guard.
- `tests/shell/render.trench-channel.test.ts` — the render swap (AC2) + scroll wiring (AC3): the trench phase draws the walled channel (not the flat `TRENCH` tile), still seats `EXHAUST_PORT` inside it, and feeds the live `trenchScrollZ` (three sub-period offsets guard against an unlucky rib-period multiple).

**Tests Written:** 31 tests covering all 5 ACs (AC4's "reads as a corridor" is structurally proxied by the y-span + length>>width tests; the *aesthetic* read stays an eyeball check via the 11-4 phase-jump per repo convention).
**Status:** RED (verified by testing-runner, RUN_ID 11-6-tea-red) — 2 files / 3 runnable assertions fail for exactly the right reasons; the core file errors on the not-yet-existent `src/core/trench-channel` module; 480 pre-existing tests untouched (no regressions).

### Rule Coverage

The TypeScript lang-review checklist is mostly implementation-time (Dev's concern); the rules with a meaningful RED test for a pure generator:

| Rule | Test(s) | Status |
|------|---------|--------|
| #1/#10 purity (sacred core boundary: no DOM/time/random) | `trenchChannel is pure & deterministic`, `accumulates deterministically for a fixed seed` | failing |
| #4 nullish: `0` is a valid scroll, not a falsy fallback | `recycles by scroll mod RIB_Z` (s=0 case), `initialState seeds trenchScrollZ to 0` | failing |
| #2 readonly `Model3D` contract honored | `returns a Model3D…`, `every edge indexes two distinct, in-range vertices` | failing |
| #8 test quality (no `as any`, no vacuous asserts) | self-check below | n/a |

**Rules checked:** 4 of 13 lang-review rules are applicable to a pure geometry generator + accumulator; the rest (React/JSX, async, build-config, error-handling) do not apply to deterministic core math.
**Self-check:** 0 vacuous tests. Every test asserts concrete values; `.find(...)` results are checked with `toBeDefined()` (meaningful — returns `undefined` on miss); the one cast is the established `as unknown as CanvasRenderingContext2D` ctx stub (mirrors `render.surface-grid.test.ts`), commented as the deliberate idiom.

**Handoff:** To Dev (Walter) for GREEN — implement `src/core/trench-channel.ts`, add `trenchScrollZ` to GameState/initialState, advance it in `stepTrench` by `TRENCH_SCROLL_SPEED·dt`, reset it in `enterPhase`, and swap the trench-phase draw in `render.ts` to `trenchChannel(state.trenchScrollZ)`.

## Dev Assessment

**Implementation Complete:** Yes — every TEA test now green, exactly to the contract.

**Files Changed:**
- `src/core/trench-channel.ts` (NEW) — PURE `trenchChannel(scroll) -> Model3D` + envelope constants `TRENCH_HALF_W=256`, `TRENCH_WALL_H=320`, `RIB_Z=400`, `TRENCH_FAR=6000`. Four longitudinal rails (floor + top per wall) at `x=±TRENCH_HALF_W`; at each `RIB_Z` station a lateral floor rib across the channel and a vertical rung up each wall (`0→TRENCH_WALL_H`); recedes to `-TRENCH_FAR`, recycles toward the camera via `scroll mod RIB_Z`. No DOM/time/random — boundary intact.
- `src/core/state.ts` — added `trenchScrollZ: number` to `GameState` (doc'd alongside `surfaceScrollZ`) and seeded it `0` in `initialState`.
- `src/core/sim.ts` — `stepTrench` advances `trenchScrollZ` by `TRENCH_SCROLL_SPEED·dt` on `base` (rides every return path; the empty-channel hold still scrolls); `enterPhase` resets it to `0` on every phase entry.
- `src/shell/render.ts` — trench phase now strokes `trenchChannel(state.trenchScrollZ)` in world space (camera-only transform, like the surface grid) instead of the flat `TRENCH` tile; the `EXHAUST_PORT` still draws at its sim world position inside the channel. Dropped the now-unused `TRENCH` model import (model stays in the registry / `models.ts`).

**Tests:** 509/509 passing (GREEN) — verified by testing-runner, RUN_ID 11-6-dev-green. `tsc --noEmit` clean + `vite build` clean (AC5). The 26 new core tests + 4 render tests all green; zero regressions in the 480 pre-existing.

**Branch:** `feat/11-6-walled-trench-channel` (pushed, tracks origin).

**Self-review (judgment checks):**
- [x] Wired to the front end — `render.ts` draws the channel in the live trench phase; reachable via the 11-4 dev phase-jump.
- [x] Follows project patterns — a direct mirror of the merged 11-5 `surface-grid.ts` generator + `surfaceScrollZ` accumulator.
- [x] All ACs met — generator + unit tests (AC1), render swap (AC2), `trenchScrollZ` scroll (AC3), corridor/not-sliver structurally proven; aesthetic read flagged for the eyeball pass (AC4); determinism + boundary + clean build (AC5).
- [x] Error handling — none required; pure deterministic geometry with no failure modes.

**Handoff:** To Reviewer (The Big Lebowski) for code review. One thing to eyeball: AC4's "reads as a corridor receding to a vanishing point" via the 11-4 phase-jump at `:5274` (see Delivery Finding) — the constant values are tunable.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 mechanical (2 soft notes) | confirmed 1 (stale TDD header), dismissed 1 (unconditional trenchPlacement — pre-existing), deferred 0 |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 5 | confirmed 5 (all LOW), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | 0 | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 3 | confirmed 3 (all LOW), dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned; 5 disabled via `workflow.reviewer_subagents`)
**Total findings:** 9 confirmed (all LOW / non-blocking), 1 dismissed (with rationale), 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

The implementation is a faithful, minimal mirror of the merged-and-approved 11-5 `surfaceGrid` generator + `surfaceScrollZ` accumulator. All four enabled specialists corroborate: the **source files are clean** (`trench-channel.ts`, `state.ts`, `sim.ts`, `render.ts`) against all 16 rules including the sacred core/shell boundary; **509/509 tests green**; **tsc + vite build clean**. Every confirmed finding is a LOW test-file quality/hardening item — several matching established conventions in already-merged code — and **none is Critical or High**, so none blocks the PR.

**Subagent dispatch (all 8 tags):**
- `[SEC]` — reviewer-security: **clean, 0 findings.** Core purity held; rib loop bounded by constants (`Math.round(TRENCH_FAR/RIB_Z)`=15, not driven by `scroll`); no new NaN path (the only `dt`-NaN path is pre-existing and shared with `surfaceScrollZ`, mitigated by the phase-entry reset).
- `[RULE]` — reviewer-rule-checker: 16 rules / 47 instances / 3 violations, **all in test files, all LOW** (see Rule Compliance). Source clean on every rule.
- `[TEST]` — reviewer-test-analyzer: 5 findings, all LOW (below).
- `[DOC]` — comment-analyzer disabled; assessed directly: preflight surfaced stale "EXPECTED TO FAIL" TDD headers in both test files (LOW, matches merged 11-5).
- `[TYPE]` — type-design disabled; covered by rule-checker rules #1/#2/#4: source has zero casts/`!`/`Record<string,any>`; `Model3D` readonly contract enforced at the `trenchChannel` return site.
- `[EDGE]` — edge-hunter disabled; assessed directly: scroll=0 (offset 0), sub-period scroll, period-boundary recycling, negative scroll (guarded), and the null-port hold are all handled; tests cover all but the negative branch.
- `[SILENT]` — silent-failure-hunter disabled; assessed directly: pure deterministic geometry, no try/catch, no swallowed errors, no I/O — nothing to fail silently.
- `[SIMPLE]` — simplifier disabled; assessed directly: the generator is minimal (rails loop + rib loop), no dead code, no over-engineering; a direct structural mirror of `surface-grid.ts`.

**Observations:**
1. `[VERIFIED]` Core/shell boundary intact — `src/core/trench-channel.ts:19-20` imports only `import type { Vec3 }`/`{ Model3D }` from core siblings; no shell import, no DOM/window/canvas, no `Date.now()`/`Math.random()`/`performance.now()`/`requestAnimationFrame`. Complies with the CLAUDE.md sacred-boundary rule. Corroborated by `[SEC]` and `[RULE]` #14.
2. `[VERIFIED]` Determinism — `trenchChannel` is a pure function of `scroll`; `sim.ts:411` advance is `state.trenchScrollZ + TRENCH_SCROLL_SPEED * dt` (deterministic); `enterPhase` resets to 0. Tests assert `toEqual` on repeated calls and full-state equality for a fixed seed over 20 steps. `[RULE]` #15.
3. `[VERIFIED]` Scroll wiring — `render.ts:226` feeds the **live** `state.trenchScrollZ` (not a hardcoded constant) to `trenchChannel`, mirroring `surfaceGrid(state.surfaceScrollZ)` one branch above. The now-dead `TRENCH` model import was correctly dropped (model retained in `models.ts`, guarded by the "retired not deleted" test).
4. `[LOW][TEST]` `render.trench-channel.test.ts:129` — `moved.some(m => JSON.stringify(m) !== JSON.stringify(base))` has a vacuous-pass path: `JSON.stringify(undefined)` is the value `undefined`, so if `drawnChannel()` ever returned `undefined` the `.some()` would pass anyway. **Latent only** — the unconditional `drawWireframe(…trenchChannel…)` plus the "draws a WALLED channel" test already rule out the miss for the current code. Recommend hardening: `expect(moved.every(m => m !== undefined)).toBe(true)` and `.every()` over `.some()`. Non-blocking.
5. `[LOW][TEST]` `trench-channel.test.ts` recycling test exercises only non-negative scroll; the `((scroll % RIB_Z) + RIB_Z) % RIB_Z` guard handles negatives but no test proves it. Runtime `trenchScrollZ` only ever accumulates upward from 0, and this exactly matches the merged 11-5 `surface-grid.test.ts`. Non-blocking improvement.
6. `[LOW][RULE]` `render.trench-channel.test.ts:63` — `ctx as unknown as CanvasRenderingContext2D` double-cast (rule #1). **Not dismissed** (rule matches), but downgraded to LOW: it is the project's standing canvas-stub idiom, verbatim from `render.surface-grid.test.ts` and used 10+ times across the suite, and is documented in the JSDoc. Non-blocking.
7. `[LOW][RULE]` `trench-channel.test.ts:333,336` — `exhaustPort!.pos` non-null assertions on a `… | null` field. Safe by construction (`enterPhase('trench')` calls `spawnPort()` unconditionally; `dt=0.1` won't null it) and matches the existing `trench.test.ts` convention. Recommend an `expect(s0.exhaustPort).not.toBeNull()` guard. Non-blocking.
8. `[LOW][DOC]` Both new test files retain "RED phase. … EXPECTED TO FAIL" headers though every test is green — historical scaffolding (identical to merged 11-5). A one-line clarification would help future readers. Non-blocking.
9. `[DISMISSED]` preflight flagged the unconditional `trenchPlacement(state)` call (`render.ts:230`) — dismissed: pre-existing pattern (the prior code also computed the placement before the `if (state.exhaustPort)` guard), side-effect-free and cheap; not introduced or worsened by this diff.
10. `[LOW][TEST]` No test asserts the surface/space phases leave `trenchScrollZ` unchanged (only `stepTrench` advances it). Behavior is correct in `sim.ts`; the gap is partially covered by the "resets to 0 on entering any other phase" test. Non-blocking.

**Data flow traced:** `trenchScrollZ`: `initialState()` seeds `0` → `enterPhase()` resets `0` on every phase entry (prevents cross-run growth) → `stepTrench` advances `+ TRENCH_SCROLL_SPEED * dt` each frame on `base` (rides every return path) → `render.ts` reads `state.trenchScrollZ` → `trenchChannel(scroll)` computes `offset = ((scroll % RIB_Z) + RIB_Z) % RIB_Z` (mod-bounded) → world-space vertices → `drawWireframe` via the camera view. Safe end-to-end: pure arithmetic, no external input, mod-bounded geometry, phase-entry reset bounds the accumulator.

**Wiring:** `render.ts` trench branch strokes `trenchChannel` in the live trench phase; reachable for the visual pass via the 11-4 phase-jump at `:5274`.

### Rule Compliance

Synthesized from reviewer-rule-checker's exhaustive enumeration (16 rules, 47 instances) plus my own read. **Source files: 0 violations on every rule.**

- **#1 Type-safety escapes** — source: 0 (no `as any`/`as unknown as T`/`@ts-ignore`/`!`). Tests: 3 LOW (canvas double-cast ×1, `exhaustPort!` ×2) — all matching merged conventions, see observations 6–7.
- **#2 Generics/interface (readonly)** — compliant. `Model3D` is a readonly interface; `Vec3[]`/`[number,number][]` are assignable to the readonly fields; TS enforces it at the `trenchChannel` return site.
- **#3 Enums** — n/a (none).
- **#4 Null/undefined (`??` vs `||`)** — compliant. `trenchScrollZ` is non-optional `number`, default `0`; no `||` on falsy-valid values; the `scroll=0` case is the recycling-test base.
- **#5 Module/declaration** — compliant. `import type` for types; value import for `trenchChannel`; `moduleResolution: bundler` (no `.js` extension required); no `/// <reference>`.
- **#6 React/JSX** — n/a.
- **#7 Async** — compliant (only the correct `await importOriginal()` mock idiom).
- **#8 Test quality** — no `as any` in assertions; mock generic types match `wireframe` exports; imports from `src/` not `dist/`. (The vacuous/coverage nits are observations 4–5,10.)
- **#9 Build/config** — unchanged; `strict: true`, `noUnusedLocals: true` still on; build clean.
- **#10 Input validation** — n/a (no external input; `scroll` is an internal accumulator).
- **#11 Error handling** — n/a (no try/catch; pure geometry).
- **#12 Perf/bundle** — compliant (specific imports; loop bound = 16; `JSON.stringify` only in test deep-compare).
- **#13 Fix-regressions** — n/a (new feature).
- **#14 Core/shell boundary (CLAUDE.md)** — compliant across all 5 changed sites.
- **#15 `stepGame` purity** — compliant (deterministic arithmetic + literal reset).
- **#16 `Model3D` readonly + named single-sourced constants** — compliant (`TRENCH_HALF_W`/`TRENCH_WALL_H`/`RIB_Z`/`TRENCH_FAR` exported and referenced by name in both code and tests).

### Devil's Advocate

Let me try to break it. **Unbounded accumulator:** `trenchScrollZ` advances every frame, including the null-port terminal hold, and is only reset on phase entry — could a player who parks in a no-port trench for hours overflow it into `NaN`/precision loss? In practice `trenchChannel` reads it through `% RIB_Z`, so the *geometry* stays bounded regardless of magnitude, and float precision survives until ~2^53/500 s (millennia). Not exploitable. **Negative-offset geometry:** if a future refactor dropped the `+RIB_Z) % RIB_Z` guard, negative `scroll` would push every rib out of the corridor — but `scroll` is never negative at runtime (monotonic from 0, reset on entry), and the guard is present; the only gap is a missing *test* for it (observation 5). **NaN poisoning:** a bad `dt` from the shell would propagate `trenchScrollZ → offset → all rib vertices → NaN` and blank the trench — but this is the pre-existing `surfaceScrollZ` risk, not introduced here, and the phase-entry reset re-zeroes it. **The vacuous render test (obs 4):** could the channel silently stop rendering for non-zero scroll and the suite still pass? The `.some()` + `JSON.stringify(undefined)` path *would* mask exactly that — but the unconditional draw call plus the separate "draws a WALLED channel" assertion close the hole for the current code; it's latent, not live. **Aesthetic failure:** could the trench read wrong — walls too short, too wide, vanishing point off — and all tests still pass? **Yes** — the structural tests prove walls exist, length≫width, and it recedes, but not that it *looks* like the film's trench. That is exactly why AC4 is the standing eyeball check, carried forward as a non-blocking item (matching how 11-5's grid was signed off). A confused player would see, at worst, a corridor with off proportions — a tuning nit on named constants, not a defect. Nothing here rises to Critical/High; the code is correct, pure, and deterministic.

**Verdict:** APPROVED. No Critical/High findings; source clean on all rules; full suite green; build clean. The LOW test-hardening items and the AC4 visual pass are carried to SM as non-blocking Delivery Findings.

**Handoff:** To SM (The Dude) for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### TEA (test design)
- No upstream findings during test design. The contract is a clean mirror of the merged 11-5 surface-grid generator; the spec's named constants, the `surfaceScrollZ` accumulator precedent, and `TRENCH_SCROLL_SPEED` (already exported from state.ts since 8-9) all line up with no gaps or conflicts.

### Dev (implementation)
- **Improvement** (non-blocking): the channel's authentic-feel constant values (`TRENCH_HALF_W=256`, `TRENCH_WALL_H=320`, `RIB_Z=400`, `TRENCH_FAR=6000`) are eyeball-tunable; AC4's "reads as a long walled corridor receding to a vanishing point" needs the standing visual pass via the 11-4 phase-jump (dev `:5274`) before sign-off — same convention as 11-5's grid and the render `SURFACE_ORIENT` note. Affects `src/core/trench-channel.ts` (adjust the constants if the proportions read wrong against the cockpit skim at render `TRENCH_SKIM=60`). *Found by Reviewer during code review.*

### Reviewer (code review)
- **Improvement** (non-blocking): harden the render scroll-wiring test against a vacuous pass — `JSON.stringify(undefined)` returns `undefined`, so `moved.some(m => JSON.stringify(m) !== JSON.stringify(base))` would pass even if the channel stopped rendering. Affects `tests/shell/render.trench-channel.test.ts:129` (add `expect(moved.every(m => m !== undefined)).toBe(true)` and switch `.some()` → `.every()`). Latent only — the unconditional draw + the "draws a WALLED channel" test cover the live case. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): add a negative-scroll recycling assertion and a "surface/space phase does not advance `trenchScrollZ`" test to close coverage gaps the guard/`stepTrench` already satisfy. Affects `tests/core/trench-channel.test.ts`. Matches the same gaps in the merged 11-5 suite. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): AC4 aesthetic read ("long walled corridor receding to a vanishing point") still needs the standing eyeball pass via the 11-4 phase-jump at `:5274`; constants are tunable. Carried from Dev's finding — structural correctness verified, visual feel is the render-convention manual check. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### TEA (test design)
- **Named the receding-length constant `TRENCH_FAR` (the spec left it unnamed)**
  - Spec source: context-story-11-6.md, AC-1 ("running from ~z=0 to a far cutoff")
  - Spec text: names `TRENCH_HALF_W`, `RIB_Z`, `TRENCH_WALL_H` but NOT the far-cutoff distance
  - Implementation: tests reference an exported `TRENCH_FAR` for the receding length, mirroring 11-5's `GRID_FAR`
  - Rationale: tests must reference the envelope by name (the surface-grid convention), so the cutoff needs a name; `TRENCH_FAR` matches the sibling generator
  - Severity: minor
  - Forward impact: Dev must export `TRENCH_FAR` from `src/core/trench-channel.ts`
- **Pinned the generator to a dedicated module `src/core/trench-channel.ts`**
  - Spec source: context-story-11-6.md, AC-1 ("a PURE core generator trenchChannel(scroll) -> Model3D")
  - Spec text: specifies the function + return type but not the file location
  - Implementation: tests import `trenchChannel` + `TRENCH_*` from `../../src/core/trench-channel` (single responsibility, mirrors `surface-grid.ts` — the 11-5 author explicitly noted "11-6's trenchChannel will mirror it")
  - Rationale: consistency with the immediate sibling generator; Dev may split internally and re-export
  - Severity: minor
  - Forward impact: none (re-export is allowed)
- **Pinned vertical-rib z-stations to coincide with floor-rib z-stations (one rung per rib)**
  - Spec source: context-story-11-6.md, AC-1 ("lateral floor ribs every RIB_Z … a vertical rib at each RIB_Z")
  - Spec text: floor ribs and wall ribs are each "every RIB_Z" but does not state they share stations
  - Implementation: a test asserts every vertical wall rib sits at a floor-rib z (`seats each vertical wall rib at a floor-rib z station`)
  - Rationale: a single shared station per RIB_Z reads as one rigid ladder-framed corridor; staggered ribs would be visual noise and harder to scroll coherently
  - Severity: minor
  - Forward impact: Dev emits floor + wall ribs at the same z loop iteration

### Dev (implementation)
- No deviations from spec. Implemented the TEA contract exactly: `src/core/trench-channel.ts` exports `trenchChannel` + `TRENCH_HALF_W`/`TRENCH_WALL_H`/`RIB_Z`/`TRENCH_FAR`; floor+top rails on both walls, lateral floor ribs and vertical wall rungs every `RIB_Z` at shared z-stations, receding to `-TRENCH_FAR` and recycling by `scroll mod RIB_Z`. `trenchScrollZ` added to GameState/initialState, advanced in `stepTrench` by `TRENCH_SCROLL_SPEED·dt` (same rate as the port), reset in `enterPhase`. `render.ts` swapped to draw `trenchChannel(state.trenchScrollZ)`. The concrete constant values are authentic-FEEL choices the spec explicitly left open (single-sourced for tuning), not a spec departure — captured as a Delivery Finding for the eyeball pass.

### Reviewer (audit)
- **TEA: Named the receding-length constant `TRENCH_FAR`** → ✓ ACCEPTED by Reviewer: the spec named three of four envelope constants; `TRENCH_FAR` mirrors `GRID_FAR` from the merged 11-5 generator. Sound and consistent.
- **TEA: Dedicated module `src/core/trench-channel.ts`** → ✓ ACCEPTED by Reviewer: single-responsibility, mirrors `surface-grid.ts` exactly as the 11-5 author anticipated. Verified the module imports only core types — boundary intact.
- **TEA: Vertical-rib z-stations coincide with floor-rib stations** → ✓ ACCEPTED by Reviewer: one rung per rib reads as a rigid ladder-framed corridor and scrolls coherently; verified in `trench-channel.ts:136-147` (floor + wall ribs emitted in the same `k` loop, sharing `z`).
- **Dev: No deviations from spec** → ✓ ACCEPTED by Reviewer: confirmed — the implementation matches the TEA contract verbatim. The concrete constant values fill spec-left-open authentic-FEEL choices (not a departure); their visual tuning is carried as a non-blocking Delivery Finding (AC4 eyeball pass).
- No undocumented deviations found. The diff matches the logged scope; nothing slipped through.