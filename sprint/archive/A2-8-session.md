---
story_id: "A2-8"
jira_key: "A2-8"
epic: ""
workflow: "tdd"
---
# Story A2-8: Subtle debris particles on every rock break — dim, short-lived scatter per reference footage

## Story Details
- **ID:** A2-8
- **Jira Key:** A2-8
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch Strategy:** gitflow (feat/A2-8-subtle-debris-particles off develop)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-06T11:12:54Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-06T10:39:17Z | 2026-07-06T10:43:14Z | 3m 57s |
| red | 2026-07-06T10:43:14Z | 2026-07-06T10:57:16Z | 14m 2s |
| green | 2026-07-06T10:57:16Z | 2026-07-06T11:06:11Z | 8m 55s |
| review | 2026-07-06T11:06:11Z | 2026-07-06T11:12:54Z | 6m 43s |
| finish | 2026-07-06T11:12:54Z | - | - |

## Sm Assessment

**Story:** A2-8 — Subtle debris particles on every rock break (dim, short-lived scatter per reference footage).
**Repo:** asteroids · **Workflow:** tdd (phased) · **Branch:** `feat/A2-8-subtle-debris-particles` off `develop` (gitflow).
**Points:** 2 · **Priority:** p2 · Epic A2 (Asteroids playtest followup).

**Scope (SM routing, not implementation):** Add a visual debris/particle effect on rock destruction. ROM-faithful per this session's Architect (Goldstein) investigation — the 1979 ROM draws "shrapnel" on every object break. This is a NEW visual feature (not a retune/bug), sized 2pt, single repo, no cross-repo contract.

**Context readiness:** Story context (`sprint/context/context-story-A2-8.md`) is enriched with the pre-extracted ROM shrapnel quarry (addresses, timer/scale/pattern mechanism, b=7 intensity, RNG-free + reuse-`shipDebris.ts`-shape guidance, ExplosionEvent trigger at `sim.ts:341-344`). Full quarry also in memory `asteroids-a2-8-shrapnel-quarry`. O'Brien (TEA) should NOT need to re-derive from the disassembly — exact dot coordinates recoverable from the vector ROM's "Shrapnel Patterns Vector Data" if fixtures need them.

**Merge gate:** Clear — no open PRs in asteroids. No blocking stories.

**Watch-outs for the pipeline:**
- Keep the port RNG-free (ROM shrapnel is deterministic; extra RNG draws would shift wave-spawn determinism like A2-6 did).
- Reuse the *shape* of `shipDebris.ts` (transient-piece array + `update*(dt)` + render fade), NOT its drift physics — shrapnel is stationary + scale-expanding + point-based.
- Trigger off the existing A-18 `ExplosionEvent` destruction edge; do not add a second detector.
- Fidelity scope (full 4-pattern cycle vs single-pattern scale-expansion) and "dim" brightness are the aesthetic knobs to settle at playtest.

**Decision:** Setup complete. Hand off to O'Brien (TEA) for the RED phase.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): The ROM shrapnel system also fires on SAUCER destruction (ObjExplode $6B29 sets exploding-status $A0 on ANY hit object; DrawObjectExplode $7349 branches ship→DoShipExplsn, else→shrapnel). This story scopes to rock breaks per its title, so saucer-death shrapnel is a candidate follow-up — and note the saucer-kill path currently emits NO explosion event at all. Affects `asteroids/src/core/sim.ts` (the saucer-kill branch, ~lines 355-358; A-13 collision paths). *Found by TEA during test design.*
- **Improvement** (non-blocking): Shrapnel render is pinned only as a source-text wiring check (`render-wiring.test.ts` reads `state.shrapnel`), mirroring the A2-5 shipDebris precedent. The exact dot glyph, count (ROM ~10-11), and "dim" brightness (ROM intensity b=7) are eyeball/playtest-verified per the render house convention. Affects `asteroids/src/shell/render.ts` (a `drawShrapnel` fn, faded by life like `drawShipDebris`). *Found by TEA during test design.*
- **Question** (non-blocking): `spawnShrapnel(center)` takes ONLY a position — no `Rng` — which is the structural RNG-free guarantee. Dev must NOT thread `state.rng` into it; doing so would reintroduce exactly the wave-spawn determinism perturbation A2-6 fought (the tests pin `rng.seed` unchanged on a small-rock kill). Affects `asteroids/src/core/sim.ts` (the rock-break spawn site, ~line 344, next to the existing `explosion` event). *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): The "dim, subtle" look (peak alpha `SHRAPNEL_DIM = 0.55`, dot radius 1.5px, spread speed 2.4, life 0.35s) is unverified by pixels — GREEN proves the sim contract, not the feel. Recommend a live playtest of a rock break to confirm the scatter reads as dim/subtle and the spread/lifetime feel right. Affects `asteroids/src/shell/render.ts` (`drawShrapnel` feel consts) + `asteroids/src/core/shrapnel.ts` (`SHRAPNEL_LIFETIME_S`/`SHRAPNEL_SPREAD_SPEED`/pattern). *Found by Dev during implementation.*
- **Improvement** (non-blocking): Followed TEA's finding — the ROM shrapnel also fires on SAUCER destruction, which this story scopes out; a follow-up could add `spawnShrapnel(saucer.pos)` on the two saucer-kill branches (and note those currently emit no explosion event either). Affects `asteroids/src/core/sim.ts` (saucer-kill branches). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): The break→death→gameover threading (a rock break and a run-ending ship death on the SAME tick, shrapnel surviving into the GAME OVER card) is correct by inspection — `handleShipDeath` (lives.ts:76,96) and `tryRespawnShip` (lives.ts:109) spread `...state`, preserving `shrapnel` — but is NOT directly unit-tested; the cross-mode tests construct shrapnel in-place rather than via the break→death path. Affects `asteroids/tests/shrapnel.test.ts` (a candidate regression test). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): The "dim, subtle" brightness / spread / lifetime are unverified by pixels (deliberately — a playtest knob per the story context and TEA's logged deviation). Recommend a live rock-break playtest before this ships to the cabinet. Affects `asteroids/src/shell/render.ts` (`SHRAPNEL_DIM`, `SHRAPNEL_DOT_RADIUS`) + `asteroids/src/core/shrapnel.ts` (`SHRAPNEL_LIFETIME_S`/`SHRAPNEL_SPREAD_SPEED`). *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 5 findings (0 Gap, 0 Conflict, 1 Question, 4 Improvement)
**Blocking:** None

- **Improvement:** The ROM shrapnel system also fires on SAUCER destruction (ObjExplode $6B29 sets exploding-status $A0 on ANY hit object; DrawObjectExplode $7349 branches ship→DoShipExplsn, else→shrapnel). This story scopes to rock breaks per its title, so saucer-death shrapnel is a candidate follow-up — and note the saucer-kill path currently emits NO explosion event at all. Affects `asteroids/src/core/sim.ts`.
- **Improvement:** Shrapnel render is pinned only as a source-text wiring check (`render-wiring.test.ts` reads `state.shrapnel`), mirroring the A2-5 shipDebris precedent. The exact dot glyph, count (ROM ~10-11), and "dim" brightness (ROM intensity b=7) are eyeball/playtest-verified per the render house convention. Affects `asteroids/src/shell/render.ts`.
- **Question:** `spawnShrapnel(center)` takes ONLY a position — no `Rng` — which is the structural RNG-free guarantee. Dev must NOT thread `state.rng` into it; doing so would reintroduce exactly the wave-spawn determinism perturbation A2-6 fought (the tests pin `rng.seed` unchanged on a small-rock kill). Affects `asteroids/src/core/sim.ts`.
- **Improvement:** Followed TEA's finding — the ROM shrapnel also fires on SAUCER destruction, which this story scopes out; a follow-up could add `spawnShrapnel(saucer.pos)` on the two saucer-kill branches (and note those currently emit no explosion event either). Affects `asteroids/src/core/sim.ts`.
- **Improvement:** The break→death→gameover threading (a rock break and a run-ending ship death on the SAME tick, shrapnel surviving into the GAME OVER card) is correct by inspection — `handleShipDeath` (lives.ts:76,96) and `tryRespawnShip` (lives.ts:109) spread `...state`, preserving `shrapnel` — but is NOT directly unit-tested; the cross-mode tests construct shrapnel in-place rather than via the break→death path. Affects `asteroids/tests/shrapnel.test.ts`.

### Downstream Effects

Cross-module impact: 5 findings across 3 modules

- **`asteroids/src/core`** — 3 findings
- **`asteroids/src/shell`** — 1 finding
- **`asteroids/tests`** — 1 finding

### Deviation Justifications

3 deviations

- **Shrapnel expansion modeled as per-dot outward velocity, not the ROM's growing render scale**
  - Rationale: Keeps all geometry in the deterministic core (the Architect explicitly steered to reuse the shipDebris pos/vel/life shape), yields the same on-screen visual (an anchored, spreading, fading dot cloud), and stays fully unit-testable — a mock-canvas scale-step assertion would be brittle and render-coupled. A ROM-exact scale port is a later render-fidelity concern (A-17 style) that can swap the internal expansion mechanism without touching the spawn/age/fade contract.
  - Severity: minor
  - Forward impact: none — the spawn/age/fade contract is stable; a future scale-exact pass replaces only the internal expansion mechanism.
- **"Dim" brightness is not unit-pinned — left to render eyeball / playtest verification**
  - Rationale: The shell render layer is eyeball-verified per project convention (render-wiring.test.ts header; CLAUDE.md "the shell is verified by running the game"), and the story context itself designates "dim" a playtest knob. A mock-canvas alpha assertion would pin an arbitrary magnitude, not the aesthetic.
  - Severity: minor
  - Forward impact: none — Reviewer/playtest confirms the dim look; a render-fidelity pin can be added later if desired.
- **Shrapnel scatter is a provisional even-ring pattern, not the ROM's four irregular ShrapPatPtrTbl patterns**
  - Rationale: Took the story's explicitly-offered "single-pattern" fidelity option — simplest code that passes O'Brien's tests and reads as a dim, expanding scatter. The ROM's exact 4-pattern geometry lives in the copyrighted vector-ROM quarry (absent from this checkout) and is an A-17-style render-fidelity concern, not load-bearing for the spawn/age/fade behavior this story delivers.
  - Severity: minor
  - Forward impact: none — a future ROM-exact pass can swap `SHRAPNEL_PATTERN` (and the velocity model for a scale model, per TEA's logged deviation) without touching the `spawnShrapnel`/`updateShrapnel` contract or any caller.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Shrapnel expansion modeled as per-dot outward velocity, not the ROM's growing render scale**
  - Spec source: context-story-A2-8.md, Technical Approach §2 ("Shrapnel mechanism")
  - Spec text: "Does NOT drift (skips `UpdateObjPos` in ROM) — Expansion via SCALE: timer counts up $A0→positive ... Scale formula: `(timer & $F0) + $10` → 5 growth steps"
  - Implementation: Tests pin a `pos`/`vel`/`life` particle model (reusing shipDebris.ts's proven structure per the Architect's steer) where each dot starts AT the impact point and drifts outward with a symmetric velocity, so the CENTROID stays anchored while the cloud EXPANDS. The ROM's fixed-anchor-pattern + growing-render-scale is thus modeled as centroid-anchored per-dot velocity. Tests pin the observable CONTRACT (anchored centroid, expanding extent, short life, RNG-free), not the exact scale-step formula.
  - Rationale: Keeps all geometry in the deterministic core (the Architect explicitly steered to reuse the shipDebris pos/vel/life shape), yields the same on-screen visual (an anchored, spreading, fading dot cloud), and stays fully unit-testable — a mock-canvas scale-step assertion would be brittle and render-coupled. A ROM-exact scale port is a later render-fidelity concern (A-17 style) that can swap the internal expansion mechanism without touching the spawn/age/fade contract.
  - Severity: minor
  - Forward impact: none — the spawn/age/fade contract is stable; a future scale-exact pass replaces only the internal expansion mechanism.
- **"Dim" brightness is not unit-pinned — left to render eyeball / playtest verification**
  - Spec source: story title (session Sm Assessment) + context-story-A2-8.md §2
  - Spec text: "dim, short-lived scatter per reference footage"; "Lit at intensity b=7 (dimmer than ship fragments' b=12) — 'dim/subtle' is ROM-consistent"; "'dim' brightness is the aesthetic knob to settle at playtest"
  - Implementation: `render-wiring.test.ts` pins that `state.shrapnel` is DRAWN, but no test pins a specific `globalAlpha`/brightness magnitude. The dim look (a low-alpha fade-by-life, like `drawShipDebris`) is verified by eye in the dev server.
  - Rationale: The shell render layer is eyeball-verified per project convention (render-wiring.test.ts header; CLAUDE.md "the shell is verified by running the game"), and the story context itself designates "dim" a playtest knob. A mock-canvas alpha assertion would pin an arbitrary magnitude, not the aesthetic.
  - Severity: minor
  - Forward impact: none — Reviewer/playtest confirms the dim look; a render-fidelity pin can be added later if desired.

### Dev (implementation)
- **Shrapnel scatter is a provisional even-ring pattern, not the ROM's four irregular ShrapPatPtrTbl patterns**
  - Spec source: context-story-A2-8.md, Technical Approach §4 ("Implementation guidance")
  - Spec text: "Fidelity scope: full 4-pattern cycle vs single-pattern scale-expansion; 'dim' brightness is the aesthetic knob"
  - Implementation: `SHRAPNEL_PATTERN` is a single fixed set of 11 dots on evenly-spaced headings with a small harmonic speed variation (`core/shrapnel.ts`), NOT the ROM's four cycled, irregular shrapnel patterns (ShrapPatPtrTbl $50F8 → $5100/$512C/$516A/$51A0). Even spacing makes the pattern centroid-balanced (mean velocity exactly zero), satisfying the "anchored, not a jet" contract by construction.
  - Rationale: Took the story's explicitly-offered "single-pattern" fidelity option — simplest code that passes O'Brien's tests and reads as a dim, expanding scatter. The ROM's exact 4-pattern geometry lives in the copyrighted vector-ROM quarry (absent from this checkout) and is an A-17-style render-fidelity concern, not load-bearing for the spawn/age/fade behavior this story delivers.
  - Severity: minor
  - Forward impact: none — a future ROM-exact pass can swap `SHRAPNEL_PATTERN` (and the velocity model for a scale model, per TEA's logged deviation) without touching the `spawnShrapnel`/`updateShrapnel` contract or any caller.
- The expansion mechanism (per-dot outward velocity rather than the ROM's growing render scale) follows TEA's already-logged deviation above — implemented to the tests, not re-logged here.

### Reviewer (audit)
- **TEA: expansion modeled as per-dot outward velocity, not the ROM's render scale** → ✓ ACCEPTED by Reviewer: sound. The velocity model reuses the deterministic-core shipDebris shape, yields the same anchored/expanding visual, and keeps the geometry unit-testable; the spawn/age/fade contract is stable so a future scale-exact pass is a drop-in. Consistent with the house "provisional, verify vs quarry (A-17)" convention.
- **TEA: "dim" brightness not unit-pinned — left to render eyeball/playtest** → ✓ ACCEPTED by Reviewer: agrees with author reasoning. The shell render layer is eyeball-verified per project convention (render-wiring.test.ts header; CLAUDE.md), and the story context itself designates "dim" a playtest knob. A mock-canvas alpha assertion would pin an arbitrary magnitude, not the aesthetic. (Reviewer finding logged to recommend the playtest before cabinet ship.)
- **Dev: provisional even-ring pattern, not the ROM's four irregular ShrapPatPtrTbl patterns** → ✓ ACCEPTED by Reviewer: sound. The story context §4 explicitly offers "single-pattern scale-expansion" as an in-scope fidelity option; the even-ring choice also makes the "anchored, not a jet" contract hold by construction (mean velocity exactly zero over the N=11 ring). The ROM's exact 4-pattern geometry lives in a copyrighted vector-ROM quarry absent from this checkout — correctly deferred to an A-17-style pass; `SHRAPNEL_PATTERN` is a drop-in swap point.

## TEA Assessment

**Tests Required:** Yes
**Reason:** New visual-feedback feature (ROM shrapnel on every rock break); a pure deterministic core module + sim integration + render wiring — all unit-testable.

**Test Files:**
- `asteroids/tests/shrapnel.test.ts` (NEW) — 40 tests: `spawnShrapnel`/`updateShrapnel`/`SHRAPNEL_LIFETIME_S` unit behavior + `stepGame` integration (spawn-on-every-tier, RNG-free, cross-mode aging, cosmetic guardrails).
- `asteroids/tests/render-wiring.test.ts` (+1) — source-text pin that `render.ts` draws `state.shrapnel` (mirrors the A2-5 shipDebris wiring guard).

**Tests Written:** ~41 tests covering 8 TEA-defined ACs (no ACs existed in the YAML — see the shrapnel.test.ts header for the full AC list).
**Status:** RED (confirmed by testing-runner, RUN_ID A2-8-tea-red): `shrapnel.test.ts` fails to load (module/type absent), the new `state.shrapnel` wiring assertion fails, and **746 pre-existing tests stay green — nothing broken**.

**Headline pins (mutation-minded):**
- **Every tier breaks debris** — large, medium, AND the small tier that despawns with no children (the crux of "every rock break").
- **RNG-free** — killing a small rock (`splitRock` draws 0) leaves `rng.seed` UNCHANGED with a second rock surviving + no saucer (splitRock is the only possible consumer); killing a large rock advances the seed EXACTLY as an independent `splitRock` clone. Guards the A2-6 wave-spawn-determinism lesson.
- **Anchored, not a jet** — `spawnShrapnel` takes only a position (structurally cannot inherit rock velocity); net drift < half the spread speed; centroid stays within a rock-hitbox of the impact over its whole life.
- **Short-lived** — `SHRAPNEL_LIFETIME_S` is `> 0`, `<= 0.5s` (ROM ~0.33s), and `< DEBRIS_LIFETIME_S` (1.5s); every dot spawns with exactly that life (no hardcode).
- **Cross-mode aging** — a scatter still animating keeps fading through gameover AND attract (the A2-5 Reviewer-HIGH freeze bug, pre-empted for shrapnel: Dev must age `shrapnel` in the playing pipeline, `stepAttract`, AND `stepGameOver`).
- **Cosmetic** — no hitbox (bullet passes through), never gates respawn.

### Rule Coverage

| Rule (TS lang-review) | Test(s) | Status |
|-----------------------|---------|--------|
| #1 type-safety escapes (`as any`, `@ts-ignore`) | `render-wiring.test.ts` "introduces no type-safety escapes"; new tests use no casts | enforced |
| #2 missing `readonly` on array params | `updateShrapnel(particles: readonly Shrapnel[], …)` contract (mirrors `updateShipDebris`) — purity + immutable-return tests | pinned |
| #4 null/undefined (`??` vs `||`) | N/A — no nullable defaults in a pure geometry module | n/a |
| #8 test quality (meaningful assertions, no vacuous) | Phase-C self-check: every test asserts a concrete value; no `assert(true)`/`let _ =`/always-None | done |
| #3/#5/#6/#7/#10/#11 (enums, JSX, async, JSON/input validation, error handling) | N/A — pure synchronous deterministic core, no enums/JSX/async/IO/user-input | n/a |

**Rules checked:** the applicable TS lang-review rules (#1, #2, #8) have coverage; the rest are N/A for a pure deterministic geometry module (documented above).
**Self-check:** 0 vacuous tests (every assertion pins a value or count; determinism/purity/anchoring pins are all mutation-minded).

**Handoff:** To Julia (Dev) for GREEN — create `src/core/shrapnel.ts` (`Shrapnel` type, `spawnShrapnel`, `updateShrapnel`, `SHRAPNEL_LIFETIME_S`), add `shrapnel` to `GameState` + `initialState`, spawn it at the rock-break edge (`sim.ts:344`, next to the `explosion` event — RNG-FREE), age it in the playing pipeline + `stepAttract` + `stepGameOver`, and draw it in `render.ts` (`drawShrapnel`, faded by life).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `asteroids/src/core/shrapnel.ts` (NEW) — the shrapnel model: `spawnShrapnel(center)` (RNG-FREE, 11 dots on a fixed centroid-balanced pattern, all at the impact point, life `SHRAPNEL_LIFETIME_S`), `updateShrapnel(particles, dt)` (translate by vel·frames, age by dt, drop at ≤0, no wrap — mirrors `updateShipDebris`), and the `SHRAPNEL_LIFETIME_S`/`SHRAPNEL_COUNT`/spread/pattern constants.
- `asteroids/src/core/state.ts` — added the `Shrapnel` interface (`{ pos, vel, life }`), the `GameState.shrapnel` field, and `shrapnel: []` in `initialState`.
- `asteroids/src/core/sim.ts` — spawn `spawnShrapnel(destroyed.pos)` at the rock-break edge (next to the existing `explosion` event, RNG-free), and age `shrapnel` in ALL THREE mode branches: the playing pipeline, `stepAttract`, and `stepGameOver` (the A2-5 cross-mode-aging lesson).
- `asteroids/src/shell/render.ts` — `drawShrapnel` (dim glowing dots, `globalAlpha` faded by life at peak `SHRAPNEL_DIM = 0.55`, below the ship debris' 1.0), wired into `render()`; reads `state.shrapnel`.

**Tests:** 792/792 passing (GREEN) — `tests/shrapnel.test.ts` 45/45, `tests/render-wiring.test.ts` 13/13, all pre-existing suites green. Verified by testing-runner (RUN_ID A2-8-dev-green).
**Build:** `tsc --noEmit` clean (0 type errors) + `vite build` succeeds.

**Self-review:**
- Wired end-to-end: core spawn/age → `GameState.shrapnel` → `render.ts` draw call. ✓
- Follows project patterns: mirrors `shipDebris.ts`'s transient-particle shape + `drawShipDebris`'s alpha-fade render, and the "provisional feel constant, verify vs quarry (A-17)" convention. ✓
- Minimalist: no new abstractions beyond what the tests demand; the RNG-free guarantee is structural (no `Rng` param). ✓
- All 8 TEA ACs met (every tier, anchored, expands, short-lived, RNG-free, cosmetic, cross-mode aging, rendered).
- Not pixel-verified: the "dim/subtle" feel is a playtest knob (logged as a Dev finding) — the sim contract is fully unit-tested; the look is eyeball-verified per the render house convention.

**Branch:** `feat/A2-8-subtle-debris-particles` (asteroids)

**Handoff:** To O'Brien (TEA) for the verify phase (simplify + quality-pass).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (792/792 green, tsc+vite clean, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer (see Devil's Advocate) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer (pure fns, no error paths) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer (test-quality review below) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer (comment accuracy checked) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer (Rule Compliance below) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — N/A (pure client-side game math, no IO/input/secrets) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer ([SIMPLE] note below) |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer (exhaustive Rule Compliance below) |

**All received:** Yes (1 enabled subagent returned; 8 disabled via `workflow.reviewer_subagents` and covered directly by Reviewer)
**Total findings:** 0 confirmed blocking; 2 LOW observations (non-blocking); 3 deviations audited (all ACCEPTED)

### Rule Compliance (TS lang-review — `.pennyfarthing/gates/lang-review/typescript.md`)

Enumerated every type/function/const in the diff against each applicable numbered rule:

- **#1 type-safety escapes** — COMPLIANT. `grep` of all 4 changed src files: no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, or non-null `!`. `render-wiring.test.ts` also asserts render.ts has none. (preflight corroborates: 0 escapes.)
- **#2 generics/interfaces/`readonly`** — COMPLIANT. `updateShrapnel(particles: readonly Shrapnel[], dt)` and `SHRAPNEL_PATTERN: readonly Vec2[]` both `readonly`. No `Record<string,any>`, `object`, or `Function` types. `Shrapnel` is a specific interface `{pos, vel, life}`.
- **#3 enums** — N/A (no enums introduced).
- **#4 null/undefined** — COMPLIANT. No `||`-vs-`??` hazard (no nullable defaults); `Math.max(0, Math.min(1, life/LIFETIME))` clamp is correct. No `Map.get`.
- **#5 module/declaration** — COMPLIANT. `import { type Shrapnel }` is type-only; `SHRAPNEL_LIFETIME_S` imported as a runtime value (correct). No relative-import extensions — consistent with every existing import in the repo (Vite bundler resolution, not Node16).
- **#6 React/JSX** — N/A (no `.tsx`).
- **#7 async/Promise** — N/A (all synchronous).
- **#8 test quality** — COMPLIANT. Every new test asserts a concrete value/count; no `assert(true)`, `let _ =`, or always-`None`. Determinism/purity/anchoring pins are mutation-minded (RNG-clone discipline, exact-lifetime pins). One LOW coverage gap noted below.
- **#9 build/config** — COMPLIANT. No tsconfig changes; `tsc --noEmit` strict passes with 0 errors.
- **#10 input validation** — N/A (no user input / JSON / network boundary).
- **#11 error handling** — N/A (pure fns, no `try/catch`).
- **#12 perf/bundle** — COMPLIANT (with LOW note): `drawShrapnel` sets `shadowBlur` per dot — identical to the existing `drawShipDebris` precedent, and dot count is bounded (11/break, ~0.35s life). No hot-path `JSON.stringify`, no barrel over-imports.
- **#13 fix-regressions** — N/A (no review-fix commits yet).

### Devil's Advocate

Let me argue this code is broken. **Attack 1 — the burst silently vanishes when a rock break coincides with a run-ending death.** On the last life, `stepped` is built in 'playing' mode with the fresh shrapnel appended, then `handleShipDeath` flips it to 'gameover'. If `handleShipDeath` reconstructed state, the burst would be lost. But lives.ts:76 (`{...state, lives:0, shipDestroyed:true, mode:'gameover', saucer:null, gameOver:{…}}`) and lives.ts:96 (`{...state, lives, shipDestroyed:true}`) both SPREAD `...state` — `shrapnel` survives untouched, then `stepGameOver` ages it next tick. Refuted with line evidence. **Attack 2 — the centroid drifts because float error breaks the mean-zero claim.** The harmonic speed pattern makes the exact vector sum zero (harmonics 1–4 sum to zero over the N=11 ring); float residue is ~1e-15/component, so over a 0.35s life the centroid drifts ~1e-13 units — the "anchored within 132 over 10 frames" test passes by ~10 orders of magnitude. Refuted. **Attack 3 — a rock destroyed at the toroidal seam spawns shrapnel that drifts off-screen unwrapped.** True that `updateShrapnel` deliberately does not wrap — but this is the exact, intentional `shipDebris` precedent (a 0.35s cosmetic burst near the edge showing a few dots slip past is faithful; the ROM shrapnel is anchored and short anyway). Not a defect. **Attack 4 — a confused maintainer treats shrapnel as collidable and adds it to the hit-test.** The state.ts field doc says "Purely cosmetic — never consulted by collision or the respawn clear-zone check," and two guardrail tests pin bullet-pass-through and respawn-not-blocked. Refuted. **Attack 5 — `updateShrapnel` revives dead dots on a negative dt.** dt is always positive from the loop; the identical non-guard exists in `updateShipDebris`. Not a real path. **Attack 6 — perf collapse when many rocks explode at once.** Player shots are capped at 4 and breaks stagger across frames, so simultaneous dot count stays in the low dozens; `shadowBlur` per dot matches the shipped `drawShipDebris` cost. The devil finds only a LOW test-coverage gap (break→death path proven by inspection, not a test) and the trivially-exported `SHRAPNEL_COUNT`. The implementation is correct.

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** a player bullet sweeps a rock (`sim.ts` collision loop) → `destroyed.pos` → `spawnShrapnel(destroyed.pos)` (RNG-FREE, no `rng` arg) appended to `shrapnel` → threaded through `stepped` and every post-step transform (all spread `...state`) → `GameState.shrapnel` → `render.ts` `drawShrapnel` strokes each dot dimmed by `life/SHRAPNEL_LIFETIME_S`. Safe: no rng consumed (spawn stream untouched — tests pin `rng.seed` unchanged on a small-rock kill), and the burst is aged in all three mode branches so it never freezes.

**Observations (8):**
- `[VERIFIED]` **RNG-free spawn** — `spawnShrapnel(center: Vec2)` has no `Rng` param (shrapnel.ts) and sim.ts calls it with only `destroyed.pos`; complies with the A2-6 determinism guard. Evidence: shrapnel.ts `spawnShrapnel` signature; sim.ts break-edge spawn line; `rng.seed`-unchanged tests green.
- `[VERIFIED]` **Cross-mode aging in all three branches** — `updateShrapnel` runs in the playing pipeline (sim.ts ~299), `stepAttract` (~163), and `stepGameOver` base (~191). Evidence: three call sites + 3 cross-mode tests green.
- `[VERIFIED]` **[EDGE] break→death threading** — `handleShipDeath` (lives.ts:76,96) and `tryRespawnShip` (lives.ts:109) spread `...state`, preserving `shrapnel`; a same-tick break+death keeps the burst fading into gameover. (edge-hunter disabled; verified directly.)
- `[VERIFIED]` **[TYPE] type/rule compliance** — `Shrapnel {pos,vel,life}` mirrors `ShipDebrisSegment`; `updateShrapnel` param `readonly`; no type escapes. (type-design disabled; verified via Rule Compliance.)
- `[VERIFIED]` **[SEC] no attack surface** — pure deterministic client-side geometry; no IO, input, network, secrets, or `JSON.parse`. (security disabled; N/A confirmed.)
- `[VERIFIED]` **[DOC] comments accurate** — the mean-velocity-zero claim (shrapnel.ts) is mathematically correct; the b=7-vs-b=12 dim rationale (render.ts) matches the ROM quarry; state.ts "purely cosmetic" doc matches behavior. (comment-analyzer disabled; verified.)
- `[LOW]` **[TEST] coverage gap** — the break→death→gameover threading path is proven by inspection but not directly unit-tested (non-blocking; behavior confirmed correct — logged as a Delivery Finding).
- `[LOW]` **[SIMPLE] `SHRAPNEL_COUNT` exported but unused externally** — documentary/harmless; no change required.

**[RULE]** All applicable TS lang-review rules pass (see Rule Compliance above); no violations.
**[SILENT]** No swallowed errors, empty catches, or silent fallbacks — the diff has no error-handling paths (pure functions).

**Pattern observed:** faithful reuse — mirrors `shipDebris.ts`'s transient-particle shape (`spawn*`/`update*(dt)`/life-drop) and `drawShipDebris`'s alpha-fade render, with the three intended divergences (RNG-free, anchored, point-based) all structurally enforced. `asteroids/src/core/shrapnel.ts:53` (spawnShrapnel) & `src/shell/render.ts` drawShrapnel.

**Error handling:** N/A by design — pure total functions over well-typed inputs; empty-array and dt=0 paths tested (`shrapnel.test.ts`).

**Deviations:** 3 logged (2 TEA, 1 Dev) — all audited ✓ ACCEPTED (see `### Reviewer (audit)`). No undocumented deviations found.

**No Critical/High issues. 2 LOW observations, both non-blocking.**

**Handoff:** To Winston Smith (SM) for finish-story.