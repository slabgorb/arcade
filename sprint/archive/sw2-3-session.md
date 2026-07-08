---
story_id: "sw2-3"
jira_key: ""
epic: "sw2"
workflow: "tdd"
---
# Story sw2-3: Surface-assault phase — tall towers with yellow-cube tops firing fireballs, not grounded trench turrets; gate round-1 firing

## Story Details
- **ID:** sw2-3
- **Type:** bug
- **Points:** 5
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** star-wars
- **Assignee:** Keith Avery
- **Branch:** feat/sw2-3-surface-towers
- **Epic:** sw2 — Star Wars playtest followup

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-08T04:39:15Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-08T03:52:46.571821Z | 2026-07-08T03:55:59Z | 3m 12s |
| red | 2026-07-08T03:55:59Z | 2026-07-08T04:12:55Z | 16m 56s |
| green | 2026-07-08T04:12:55Z | 2026-07-08T04:26:16Z | 13m 21s |
| review | 2026-07-08T04:26:16Z | 2026-07-08T04:39:15Z | 12m 59s |
| finish | 2026-07-08T04:39:15Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): the sprint YAML entry for sw2-3 carried only a title — no description or ACs; the whole contract was re-derived from the sw2 epic overview + code discovery. Affects `sprint/current-sprint.yaml` (future sw2 stories benefit from ACs seeded at authoring time). *Found by TEA during test design.*
- **Question** (non-blocking): the round-1 fire-grace duration (`TOWER_FIRE_GRACE`) and the cube-top fire elevation (`TOWER_HEIGHT`) are unspecified — the tests reference them by name but do not fix their values. Affects `star-wars/src/core/state.ts` (Dev picks faithful values; tune by eyeball against the `SURFACE_TOWER` cube height + cabinet feel). *Found by TEA during test design.*
- **Improvement** (non-blocking): elevating the fireball origin means tower fire now DESCENDS from height toward the cockpit — Dev should confirm the existing cockpit hit-test (`COCKPIT`/`COCKPIT_HIT_RADIUS`) and the sw2-2 fireball WYSIWYG hit radius still register these shots along their new steeper path. Affects `star-wars/src/core/sim.ts` (`stepSurface` cockpit-damage + player-bolt-vs-shot paths). *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): RESOLVED TEA's descend-from-height concern — the cube-top fireball still aims at the cockpit origin, and all cockpit-damage + player-bolt-vs-shot collision tests (surface + shootable-fireball suites) stay green; the sw2-2 fireball WYSIWYG hit radius applies unchanged. No further change needed. Affects `star-wars/src/core/sim.ts`. *Found by Dev during implementation.*
- **Improvement** (non-blocking): the TEA render test carried two redundant type casts (`c[6] as string`, `c[1] as { vertices: number[][] }`); the latter is `readonly`-incompatible with `Model3D.vertices` and blocked `tsc`. Dropped both (assertions unchanged) — a test-quality nit worth watching for in future shell mock-inspection tests. Affects `star-wars/tests/shell/render.surface-tower-cube.test.ts`. *Found by Dev during implementation.*

### Reviewer (code review)
All non-blocking test-robustness gaps — the SHIPPING code is correct and fully verified (preflight/security/rule-checker clean + Reviewer trace). These harden the regression net for a quick TEA follow-up; they do not block this merge.
- **Improvement** (non-blocking): the "aim preserved" test (`still looses the fireball back toward the cockpit`) is a LOOSE assertion — `dot(vel, COCKPIT − pos) > 0` holds for any launch point, so it catches a grossly-wrong aim but does NOT pin that the aim is computed from the ELEVATED muzzle (a regression aiming from the ground still passes; [TEST] proved this with a scratch regression → dot=651). The origin elevation itself IS pinned by the `pos[1] ≈ TOWER_HEIGHT` test, so no AC is unguarded — just under-tightened. Harden with `expect(shot.vel[1]).toBeLessThan(0)` (an elevated shooter aiming at the lower cockpit must have downward Y velocity). Affects `star-wars/tests/core/surface-towers.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the render test `still draws a tall tower structure` passes if ONLY the yellow cube is drawn (its verts are y>0), so it does not guard against the red `SURFACE_TOWER` body being silently dropped ([TEST] proved it by filtering the body out of the mock calls — both assertions still pass). Add an assertion that a call with the red tower glow / `name === 'Surface Tower'` is still present. Affects `star-wars/tests/shell/render.surface-tower-cube.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the grace-window loop `for (elapsed=0; elapsed < TOWER_FIRE_GRACE − DT; …)` runs ZERO iterations (asserting nothing) if `TOWER_FIRE_GRACE ≤ DT`; the `Number.isFinite` guard only catches NaN, not a small-but-finite retune. Latent — masked by the current 0.75s grace. Add `expect(TOWER_FIRE_GRACE).toBeGreaterThan(DT)` or an iteration-count assertion. Affects `star-wars/tests/core/surface-towers.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): three lesser gaps — (a) no test drives multiple towers of DIFFERENT ages to prove fire-selection only ever draws from `armed` (a regression selecting from all `turrets` would pass, since `firstFireball` always resolves while exactly one tower exists); (b) `toBeCloseTo(TOWER_HEIGHT, 0)` allows ±0.5 slack where the muzzle y is bit-exact 96 — use `toBe`; (c) the bare-`{pos}` back-compat test exercises scroll/determinism but never the gate itself on a legacy fixture. Affects `star-wars/tests/core/surface-towers.test.ts`. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 3 findings (1 Gap, 0 Conflict, 1 Question, 1 Improvement)
**Blocking:** None

- **Gap:** the sprint YAML entry for sw2-3 carried only a title — no description or ACs; the whole contract was re-derived from the sw2 epic overview + code discovery. Affects `sprint/current-sprint.yaml`.
- **Question:** the round-1 fire-grace duration (`TOWER_FIRE_GRACE`) and the cube-top fire elevation (`TOWER_HEIGHT`) are unspecified — the tests reference them by name but do not fix their values. Affects `star-wars/src/core/state.ts`.
- **Improvement:** elevating the fireball origin means tower fire now DESCENDS from height toward the cockpit — Dev should confirm the existing cockpit hit-test (`COCKPIT`/`COCKPIT_HIT_RADIUS`) and the sw2-2 fireball WYSIWYG hit radius still register these shots along their new steeper path. Affects `star-wars/src/core/sim.ts`.

### Downstream Effects

Cross-module impact: 3 findings across 2 modules

- **`star-wars/src/core`** — 2 findings
- **`sprint`** — 1 finding

### Deviation Justifications

5 deviations

- **Interpreted "gate round-1 firing" as a per-tower fire-grace window**
  - Rationale: mirrors the codebase's existing fire-fairness pattern (Battlezone `rez_protect` spawn grace; sw2 space TIEs fire only after their run). A readable reaction window is exactly what "unclear" round-1 firing lacked. "First wave never fires" was rejected as too large a gameplay change for a bug fix.
  - Severity: minor
  - Forward impact: Dev adds `TOWER_FIRE_GRACE` + per-tower grace state (OPTIONAL field, nullish-defaulted — see the back-compat test); the exact grace DURATION is Dev/eyeball-tuned.
- **Pinned the "yellow-cube top" as a render MECHANISM, not eyeball-only**
  - Rationale: follows the sibling swap-mechanism precedent (render.surface-grid.test.ts) and sw2-2's render.enemy-fireball.test.ts, which pinned a fidelity fix's mechanism while leaving exact hue/geometry to eyeball. "Yellow" is the defining spec feature, not an incidental hue.
  - Severity: minor
  - Forward impact: Dev renders the cube via a yellow-glow `drawWireframe` call (a cube sub-model or a colour-split of `SURFACE_TOWER`); exact cube geometry/scale/hue stay eyeball-verified in the dev server.
- **Left tower GEOMETRY/SCALE ("tall") to eyeball; asserted only fire-origin elevation + a drawn y>0 model**
  - Rationale: per the repo convention (surface.test.ts orientation note), model shape/scale is EYEBALL-verified. The testable, faithful proxy for "tall, not grounded" is that fire erupts from an elevated cube, not the floor.
  - Severity: minor
  - Forward impact: Dev/reviewer confirm the tower reads as tall (vs squat/grounded) in the dev server; if the authentic `SURFACE_TOWER` model is too squat, a scale/height tweak is a follow-on eyeball call.
- **Rendered the yellow cube as a synthetic decoration model, not a colour-split of the authentic SURFACE_TOWER**
  - Rationale: the MODELS registry is documented "authentic geometry only" (the Wave-0 placeholder CUBE is excluded), and colour-splitting the re-authored authentic tower risked its models.test.ts well-formedness guards. A capping cube is minimal, low-risk, and reads as the bright cube pod on top. `TOWER_CUBE` is deliberately NOT registered (drawn directly), matching the excluded-placeholder precedent.
  - Severity: minor
  - Forward impact: if strict fidelity is wanted, the authentic Object_10 box could be colour-split instead; eyeball the cube size/placement in the dev server.
- **Set the surface `enemy-fire` event position to the elevated muzzle**
  - Rationale: visual coherence — a muzzle flash on the floor while the fireball comes from the cube would read wrong. No test required or forbade this.
  - Severity: minor
  - Forward impact: none — the space-phase formation fire path is untouched (events.test.ts covers the space path only).

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Interpreted "gate round-1 firing" as a per-tower fire-grace window**
  - Spec source: context-story-sw2-3.md (Problem, defect 3) + context-epic-sw2.md ("unclear round-1 firing")
  - Spec text: "gate round-1 firing" / "the surface-assault phase … with unclear round-1 firing"
  - Implementation: tests assert a newly-risen tower does NOT fire on its appearance frame and holds fire for `TOWER_FIRE_GRACE` seconds, then fires — a per-tower grace, not a whole-first-wave fire mute.
  - Rationale: mirrors the codebase's existing fire-fairness pattern (Battlezone `rez_protect` spawn grace; sw2 space TIEs fire only after their run). A readable reaction window is exactly what "unclear" round-1 firing lacked. "First wave never fires" was rejected as too large a gameplay change for a bug fix.
  - Severity: minor
  - Forward impact: Dev adds `TOWER_FIRE_GRACE` + per-tower grace state (OPTIONAL field, nullish-defaulted — see the back-compat test); the exact grace DURATION is Dev/eyeball-tuned.
- **Pinned the "yellow-cube top" as a render MECHANISM, not eyeball-only**
  - Spec source: context-story-sw2-3.md (title/Problem: "yellow-cube tops")
  - Spec text: "tall towers with yellow-cube tops"
  - Implementation: a shell test asserts the surface phase draws ≥1 element with a YELLOW glow (r&g high, b low), distinct from the red tower body — rather than leaving the whole visual to eyeball.
  - Rationale: follows the sibling swap-mechanism precedent (render.surface-grid.test.ts) and sw2-2's render.enemy-fireball.test.ts, which pinned a fidelity fix's mechanism while leaving exact hue/geometry to eyeball. "Yellow" is the defining spec feature, not an incidental hue.
  - Severity: minor
  - Forward impact: Dev renders the cube via a yellow-glow `drawWireframe` call (a cube sub-model or a colour-split of `SURFACE_TOWER`); exact cube geometry/scale/hue stay eyeball-verified in the dev server.
- **Left tower GEOMETRY/SCALE ("tall") to eyeball; asserted only fire-origin elevation + a drawn y>0 model**
  - Spec source: context-story-sw2-3.md (title: "tall towers … not grounded trench turrets")
  - Spec text: "tall towers with yellow-cube tops firing fireballs, not grounded trench turrets"
  - Implementation: the core test pins the fireball's launch height to `TOWER_HEIGHT` (>0, not the y=0 floor); the render test only asserts a model with vertices above the floor is drawn. Exact tower height/silhouette is not structurally tested.
  - Rationale: per the repo convention (surface.test.ts orientation note), model shape/scale is EYEBALL-verified. The testable, faithful proxy for "tall, not grounded" is that fire erupts from an elevated cube, not the floor.
  - Severity: minor
  - Forward impact: Dev/reviewer confirm the tower reads as tall (vs squat/grounded) in the dev server; if the authentic `SURFACE_TOWER` model is too squat, a scale/height tweak is a follow-on eyeball call.

### Dev (implementation)
- **Rendered the yellow cube as a synthetic decoration model, not a colour-split of the authentic SURFACE_TOWER**
  - Spec source: context-story-sw2-3.md (title/Problem: "yellow-cube tops") + `models.ts` MODELS registry contract
  - Spec text: "tall towers with yellow-cube tops"
  - Implementation: added a separate render-only `TOWER_CUBE` model (a compact box centred at y=TOWER_HEIGHT) drawn yellow atop the red `SURFACE_TOWER`, rather than recolouring the authentic tower's own upper box.
  - Rationale: the MODELS registry is documented "authentic geometry only" (the Wave-0 placeholder CUBE is excluded), and colour-splitting the re-authored authentic tower risked its models.test.ts well-formedness guards. A capping cube is minimal, low-risk, and reads as the bright cube pod on top. `TOWER_CUBE` is deliberately NOT registered (drawn directly), matching the excluded-placeholder precedent.
  - Severity: minor
  - Forward impact: if strict fidelity is wanted, the authentic Object_10 box could be colour-split instead; eyeball the cube size/placement in the dev server.
- **Set the surface `enemy-fire` event position to the elevated muzzle**
  - Spec source: tests/core/surface-towers.test.ts (fire-origin AC) — no test pins the `enemy-fire` event pos in the surface phase
  - Spec text: (the fireball launches from the cube top)
  - Implementation: the surface `enemy-fire` event now carries the elevated muzzle pos (base + `TOWER_HEIGHT`), not the ground pos, so the shell's muzzle flash appears at the cube where the fireball erupts.
  - Rationale: visual coherence — a muzzle flash on the floor while the fireball comes from the cube would read wrong. No test required or forbade this.
  - Severity: minor
  - Forward impact: none — the space-phase formation fire path is untouched (events.test.ts covers the space path only).

### Reviewer (audit)
- **TEA: "gate round-1 firing" as a per-tower fire-grace window** → ✓ ACCEPTED by Reviewer: sound and faithful — mirrors the codebase's existing fire-fairness pattern (BZ `rez_protect`, sw2 TIE fire-after-run) and directly addresses the epic's "unclear round-1 firing." The 0.75s grace sits safely under the ~2s tower dwell (verified: `SPAWN_DISTANCE 1200 / TURRET_SCROLL_SPEED 600`), so towers still fire.
- **TEA: pinned the yellow-cube top as a render MECHANISM, not eyeball-only** → ✓ ACCEPTED by Reviewer: consistent with the sibling swap-mechanism precedent (render.surface-grid.test.ts) and sw2-2's render test; "yellow" is the defining spec feature, so pinning it structurally is correct.
- **TEA: left tower geometry/scale ("tall") to eyeball** → ✓ ACCEPTED by Reviewer: matches the repo's standing convention (surface.test.ts orientation note) that model shape/scale is eyeball-verified; the elevated fire origin is the right testable proxy for "tall, not grounded."
- **Dev: synthetic render-only TOWER_CUBE vs colour-split of authentic SURFACE_TOWER** → ✓ ACCEPTED by Reviewer: respects the documented "authentic-geometry-only" MODELS registry contract; [RULE] confirmed the cube is correctly UNregistered and well-formed (8 verts, 12 edges, no orphans/dupes/degenerate). Reasonable, low-risk. Eyeball the cube size/placement in `just serve` (noted as a Dev eyeball item).
- **Dev: surface `enemy-fire` event pos moved to the elevated muzzle** → ✓ ACCEPTED by Reviewer: correct for visual coherence (muzzle flash at the cube, not the floor); no test breakage — events.test.ts pins only the space-phase formation-fire pos, confirmed untouched by the diff.
- **Undocumented deviations:** none found — the diff matches every logged deviation; no silent spec divergence.

## SM Assessment

Setup complete for sw2-3 (5pt, p1, tdd, star-wars → develop). The sprint YAML
carried only the title, so I re-seeded `context-story-sw2-3.md` from the sw2 epic
overview + light code discovery. Scope is three rolled-up playtest defects on the
**surface-assault phase**: (1) grounded turrets → tall yellow-cube-topped towers,
(2) turret laser fire → shootable **fireballs** (reuse the sw2-2 fireball
mechanic), (3) an explicit, tested **round-1 firing gate**.

Key routing already surfaced for TEA: `stepSurface` (`sim.ts:305`) drives the
current turret spawn/fire; `SURFACE_TOWER` model already exists
(`models.ts:295`) — verify wiring; fireball collision surface
(`ENEMY_SHOT_HIT_RADIUS` 90→150) shipped in sw2-2 and must be reused, not
re-rolled, to avoid re-opening tunneling. Inherited findings (lasers-vs-fireballs,
fireball WYSIWYG radius, round-1 gate) are captured in the context file.

No Jira (local sprint). Handing off to TEA (Imperator Furiosa) for the RED phase
to define ACs and failing tests — anchored to the three defects plus a
real-fired fireball collision test.

## TEA Assessment

**Tests Required:** Yes
**Reason:** 5-pt playtest bug with real, deterministic behavioural deltas (fire origin, fire gating) plus a render-fidelity delta (yellow cube). TDD.

**Test Files:**
- `star-wars/tests/core/surface-towers.test.ts` — core contract: elevated cube-top fire origin, round-1 fire grace, purity + back-compat.
- `star-wars/tests/shell/render.surface-tower-cube.test.ts` — render mechanism: a distinct yellow cube-top element is drawn on the tower.

**Tests Written:** 10 (5 RED drivers + 5 regression/purity guards) covering 3 defects.
**Status:** RED (failing — ready for Dev). Verified by the testing-runner War Boy (RUN_ID sw2-3-tea-red): 5 new tests fail for the right reasons; 535 pre-existing tests stay green (no regressions).

**The contract (derived from the sw2 epic overview — the YAML had only a title):**
1. **Elevated fire origin** — a surface fireball launches from the tower cube top (`shot.pos[1] ≈ TOWER_HEIGHT`, strictly > 0), still aimed at the cockpit — not from the y=0 floor. (RED: today it fires from y=0.)
2. **Round-1 fire gate** — a freshly-risen tower does NOT fire on its appearance frame and holds fire for `TOWER_FIRE_GRACE`, then fires. (RED: today it fires the instant a tower exists.)
3. **Yellow cube top** — the surface phase draws a distinct yellow element on the tower, not an all-red turret. (RED: today the tower is drawn entirely in `#ff3b30`.)

### Rule Coverage
| Rule / invariant | Test(s) | Status |
|------------------|---------|--------|
| AC1 elevated fire origin | `launches the fireball from the tower cube-top elevation …` | RED |
| AC1 aim preserved | `still looses the fireball back toward the cockpit` | guard (green) |
| AC2 round-1 gate (appearance frame) | `does not fire on the very frame a tower first appears` | RED |
| AC2 round-1 gate (grace window) | `holds fire through the TOWER_FIRE_GRACE window …` | RED |
| AC2 gate opens (not a mute) | `opens the gate after the grace — a tower does eventually fire` | guard (green) |
| AC3 yellow cube top | `draws a distinct YELLOW element on the tower …` | RED |
| AC3 tower still drawn tall | `still draws a tall tower structure …` | guard (green) |
| Contract constants exist | `exposes a positive, finite cube-top elevation and fire-grace window` | RED |
| lang-review #4 safe optional defaults | `steps a bare {pos} turret … without new required fields` | guard (green) |
| SOUL core/shell purity (deterministic on seed) | `fires identically for a fixed seed …` | guard (green) |

**Rules checked:** typescript lang-review — #4 (safe optional defaults for the new per-tower grace field) has a dedicated back-compat test; #8 (test quality) enforced via self-check below. #1/#2/#3/#5–#7/#9–#12 are N/A for this change (no new casts, enums, async, React, I/O, or input boundaries — the delta is pure sim + one render colour). The sacred core/shell boundary is covered by the determinism guard.
**Self-check:** 0 vacuous tests. Hardened the grace-window loop against a NaN-bound vacuous pass (a missing `TOWER_FIRE_GRACE` export → `undefined` → `elapsed < NaN` skips the loop) with a `Number.isFinite` guard + a dedicated constants-sanity test.

**Notes for Dev (The Word Burgers):**
- Add `TOWER_HEIGHT` and `TOWER_FIRE_GRACE` to `src/core/state.ts` (single-sourced like the other Wave-2 constants). Elevate the `enemyShots` spawn origin in `stepSurface` by `TOWER_HEIGHT`; add per-tower fire grace (keep the field OPTIONAL / nullish-defaulted so the bare `{ pos }` fixtures across the surface suite keep working).
- Yellow cube: draw it via a yellow-glow `drawWireframe` call (cube sub-model or a colour-split of `SURFACE_TOWER`). Exact hue/geometry/scale stay eyeball-verified in the dev server (`just serve` → surface phase).
- See Delivery Findings for the descend-from-height collision check and the unspecified constant values.

**Handoff:** To Dev (The Word Burgers) for the GREEN phase.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `star-wars/src/core/state.ts` — `TOWER_HEIGHT` (96), `TOWER_FIRE_GRACE` (0.75s), optional `age` on the `Turret` interface (nullish-defaulted).
- `star-wars/src/core/sim.ts` — `stepSurface`: age each tower; only towers past `TOWER_FIRE_GRACE` may fire; launch the fireball from the cube top (`base + TOWER_HEIGHT`), aimed at the cockpit from there; muzzle event moved to the elevated origin.
- `star-wars/src/core/models.ts` — render-only `TOWER_CUBE` model (not in the authentic registry).
- `star-wars/src/shell/render.ts` — draw the yellow cube atop each red tower body (`CUBE_GLOW = #ffd60a`).
- `star-wars/tests/shell/render.surface-tower-cube.test.ts` — dropped two redundant/`readonly`-incompatible type casts so `tsc` builds (assertions unchanged).

**Tests:** 540/540 passing (GREEN), including the 5 sw2-3 RED drivers. `tsc --noEmit` + `vite build` clean. Verified by the testing-runner Scrounger (RUN_ID sw2-3-dev-green-2).
**Branch:** feat/sw2-3-surface-towers (pushed, tracks origin).

**Constant values (TEA deferred these to Dev):**
- `TOWER_HEIGHT = 96` — WYSIWYG with the `SURFACE_TOWER` peak / `TOWER_CUBE` centre, so the fireball erupts from the drawn cube.
- `TOWER_FIRE_GRACE = 0.75s` — a readable reaction beat, comfortably under the ~2s a tower dwells on screen (`SPAWN_DISTANCE 1200 / TURRET_SCROLL_SPEED 600`) so towers still fire in time.

**Eyeball deferred (repo convention):** the yellow cube's exact size/placement and the tall-tower silhouette read are visual — confirm in the dev server (`just serve` → surface phase) and the epic's live-playtest verification story. The render MECHANISM (a distinct yellow element on the tower) is tested; exact hue/geometry stay eyeball.

**Self-review:** wired into the surface render path and the sim fire path; follows the existing Wave-2 constant / render-glow patterns; no debug code; all three ACs met (elevated fire origin, round-1 grace, yellow cube). No error handling needed (pure sim + render, no I/O).

**Handoff:** To the review phase (Immortan Joe).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 540/540 green, tsc+build clean, 0 code smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 7 | confirmed 7, dismissed 0, all downgraded to non-blocking (test-robustness on correct code) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A — negligible surface; core purity + array caps intact |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations | N/A — 18 rules × 33 instances, all pass |

**All received:** Yes (4 enabled ran, 5 disabled via `workflow.reviewer_subagents`)
**Total findings:** 7 confirmed (all test-robustness, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

The shipping code (sim/state/models/render) is correct and comprehensively verified. Three specialists ([SEC], [RULE], preflight) returned clean, and my own trace confirms the core seams. The only findings ([TEST]) are test-robustness gaps against *hypothetical future* regressions — real and worth a quick TEA follow-up, but not defects in current behavior. No Critical/High issues in shipping code → APPROVED.

**Dispatch tag summary:**
- `[EDGE]` — disabled via settings (edge_hunter). Boundary check done manually: `age` boundary at `>= TOWER_FIRE_GRACE`, array caps `MAX_TURRETS`/`MAX_FIREBALL_SLOTS` unchanged, muzzle at bit-exact y=96. No boundary defect.
- `[SILENT]` — disabled via settings (silent_failure_hunter). No try/catch, no swallowed errors, no silent fallbacks in the diff (pure sim + render).
- `[TEST]` — 7 confirmed test-robustness findings (see Delivery Findings → Reviewer). Two empirically proven (aim tautology; red-body-drop blind spot). All non-blocking; shipping code correct.
- `[DOC]` — disabled via settings (comment_analyzer). Diff comments checked manually: doc comments on `TOWER_HEIGHT`/`TOWER_FIRE_GRACE`/`Turret.age`/`TOWER_CUBE` are accurate and match behavior; render loop comment updated correctly. No stale docs.
- `[TYPE]` — disabled via settings (type_design). Type check done manually + via [RULE]: `age?: number` optional with `?? 0` default (lang-review #4 compliant), no new casts in shipping code, `Vec3`/`Model3D` used correctly.
- `[SEC]` — clean. Client-only game, no external input boundary; core purity holds; per-frame arrays bounded by existing caps.
- `[SIMPLE]` — disabled via settings (simplifier). Manual read: change is minimal (hoisted `towerMat`, reused for two draws; single `armed` filter). No dead code or over-engineering.
- `[RULE]` — clean. 18 rules (13 TS lang-review + 5 project) × 33 instances, 0 violations. `??` correct, purity intact, determinism preserved, TOWER_CUBE correctly unregistered + well-formed.

### Observations (≥5)
- `[VERIFIED]` core/shell purity holds — `sim.ts` age uses `dt` only (`sim.ts:324`), randomness via seeded `nextInt(rng, armed.length)` (`sim.ts:341`); no DOM/`Date.now`/`Math.random`/shell imports. Complies with CLAUDE.md's Hard Architectural Boundary. Cross-confirmed by [RULE] #14 and [SEC].
- `[VERIFIED]` optional-field null handling — `(turret.age ?? 0)` at `sim.ts:324` and `:338` uses `??` not `||`, so a fresh tower's `age === 0` is preserved (a `||` would re-default it every frame). Complies with lang-review #4. Cross-confirmed by [RULE] #4.
- `[VERIFIED]` fireball elevation is bit-exact and captured un-advanced — `advance(state.enemyShots, dt)` runs at `sim.ts:128` BEFORE `stepSurface` pushes the new shot, so `enemyShots.push({ pos: muzzle })` (`sim.ts:346`) with `muzzle[1] = 0 + TOWER_HEIGHT = 96` is read un-advanced on the appearance frame. The elevated shot re-aims from the muzzle (`toCockpit(muzzle)`) and still converges on the cockpit hit-test point `COCKPIT = [0,0,0]` — no cockpit-damage regression (existing surface + shootable-fireball suites stay green). Cross-confirmed by [TEST].
- `[VERIFIED]` determinism preserved — filtering `turrets → armed` before `nextInt` does not add entropy; identical seeds take identical branches. The `fires identically for a fixed seed` test + 540/540 green (incl. surface determinism suite) confirm. Cross-confirmed by [RULE] #15.
- `[VERIFIED]` `TOWER_CUBE` respects the authentic-only MODELS registry — it is NOT registered (`models.ts` MODELS array unchanged), drawn directly from `render.ts:248`, geometry well-formed (8 verts / 12 edges, no orphans/dupes/degenerate). Cross-confirmed by [RULE] #17/#18.
- `[MEDIUM]` `[TEST]` the "aim preserved" test is a loose tautology — passes even if the aim drops the elevation (`surface-towers.test.ts`). Non-blocking (origin elevation IS pinned separately); harden with `vel[1] < 0`.
- `[MEDIUM]` `[TEST]` the render "tall tower" test doesn't guard the red body being dropped (`render.surface-tower-cube.test.ts`). Non-blocking; add a red-glow presence assertion.
- `[LOW]` `[TEST]` grace-window loop degenerates to zero iterations if `TOWER_FIRE_GRACE ≤ DT` (latent); `toBeCloseTo(_,0)` slack vs bit-exact 96; multi-tower `armed`-selection not exercised.
- `[LOW]` the player-kill hit-test still keys on the tower BASE (`TURRET_HIT_RADIUS = 200`), but since 200 > the ~120 tower height, the whole tower incl. cube is shootable — WYSIWYG-adequate, no change needed.

### Rule Compliance
Rubric: `.pennyfarthing/gates/lang-review/typescript.md` (#1–#13) + CLAUDE.md core/shell boundary. Exhaustive pass by [RULE] (18 rules × 33 instances, 0 violations); I cross-checked the load-bearing ones:
- **#1 type-safety escapes:** compliant — no new `as any`/`@ts-ignore`; the one shipping `[...muzzle] as Vec3` (`sim.ts:349`) is a pre-existing tuple-widening idiom (diff net-reduces casts 2→1); test `!`/stub casts are guarded/idiomatic.
- **#2 readonly/generics:** compliant — map/filter params read-only in practice; `Turret` matches sibling entity interfaces (none use `readonly`).
- **#4 null/undefined:** compliant — `??` for `age`, 0 preserved (VERIFIED above).
- **#5 modules:** compliant — inline `type` specifiers on type-only imports; `moduleResolution: bundler` so no `.js` extension needed.
- **#8 test quality:** PARTIAL — 3 loose/gappy assertions (the [TEST] findings). Non-blocking; logged for hardening.
- **#3/#6/#7/#9/#10/#11/#12:** N/A — no enums, JSX, async, config, input boundary, or error handling in the diff.
- **Core/shell boundary (CLAUDE.md):** compliant — VERIFIED above, cross-confirmed [RULE] #14–#16.
- **MODELS authentic-only + geometry well-formed:** compliant — VERIFIED above, [RULE] #17/#18.

### Data flow traced
Yoke/fire `Input` → `stepGame` (`sim.ts`) → `stepSurface`: towers age by `dt` → `armed` filter (`age >= TOWER_FIRE_GRACE`) → on cadence a fireball is pushed at `muzzle = base + TOWER_HEIGHT`, aimed at `COCKPIT` → `enemyShots` → cockpit collision (`collides(pos, COCKPIT, COCKPIT_HIT_RADIUS)`) costs a shield. Render: `state.turrets` → `drawWireframe(SURFACE_TOWER, red)` + `drawWireframe(TOWER_CUBE, yellow)` sharing `towerMat`. Safe: all inputs are `dt`/seeded-RNG; arrays hard-capped; no external boundary.

### Pattern observed
New Wave-2 constants single-sourced in `state.ts` alongside the existing turret constants; render glow follows the inline-literal pattern (`CUBE_GLOW` like `BOLT_GLOW`/`FIRE_GLOW`); per-entity fire-grace mirrors the `Enemy.fireCooldown?` optional-field pattern (`state.ts:67`). Consistent with the codebase.

### Error handling
None required — pure deterministic sim + render, no I/O, no external input, no failure modes. Null/empty inputs: `age` undefined → `?? 0` (safe); empty `turrets` → `armed.length > 0` guard prevents firing; empty `enemyShots` → capped push. Huge inputs: arrays bounded by `MAX_TURRETS`/`MAX_FIREBALL_SLOTS`.

### Devil's Advocate
Let me argue this code is broken. First, the fire gate: I claim a tower could fire on its appearance frame anyway. Trace — on the spawn frame the new tower has `age: 0`; `armed` filters `age >= 0.75`, so a lone fresh tower is excluded and cannot fire. Refuted (and the appearance-frame test proves it). Second: could the elevated fireball MISS the cockpit entirely, making the surface phase un-loseable? The shot aims `toCockpit(muzzle) = normalize([0,0,0] − muzzle)` and the hit-test checks distance to the SAME `COCKPIT = [0,0,0]`; a shot converging on a point must enter any positive-radius sphere around it. Refuted — and the existing "turret fire reaching the cockpit costs a shield" test stays green. Third: does the `age` field silently break the 535 legacy tests that hand-place `{ pos }` turrets? `?? 0` defaults the missing field; determinism/collision suites stay green (540/540). Refuted. Fourth, a confused-user/retune angle: someone lowers `TOWER_FIRE_GRACE` to 0.01 for a "harder" mode — the grace-window TEST would then assert nothing (zero-iteration loop) and go green while silently covering nothing. This is REAL but it is a test-suite blind spot, not a runtime break (the game would still gate for 0.01s); logged as a non-blocking finding. Fifth: could the yellow cube float detached if `TOWER_ORIENT` were ever non-identity? It shares the tower's exact `towerMat`, so it transforms in lockstep — it cannot detach. Sixth, malicious input: there is no external input surface — yoke/mouse only, no strings, no network, no storage in this path. Seventh: unbounded allocation from the per-frame `armed` filter? Bounded by `MAX_TURRETS = 4`. The one thing my advocacy surfaced that the review hadn't already — the retune-degeneracy of the grace-window loop — is already captured as finding F3. Nothing here rises to blocking.

**Handoff:** To SM (The Organic Mechanic) for finish-story.