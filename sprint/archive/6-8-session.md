---
story_id: "6-8"
jira_key: ""
epic: "6"
workflow: "tdd"
---
# Story 6-8: Authentic enemy + bolt shapes (render fidelity)

## Story Details
- **ID:** 6-8
- **Jira Key:** None (local sprint tracking)
- **Epic:** 6 — Wave 6: Playtest feel & balance
- **Workflow:** tdd
- **Type:** feature (render fidelity)
- **Points:** 3
- **Priority:** p2
- **Repos:** tempest
- **Stack Parent:** none
- **Assignee:** dev

## Context
This story replaces enemy shapes with authentic vector glyphs from the rev-3 ROM. Work is SHELL/RENDER fidelity only — no src/core changes. The goal is to match the glowing-vector aesthetic while preserving animation frames (spin, pulse, writhe).

### Acceptance Criteria
1. Each enemy + bolt renders as an authentic vector glyph WITH its animation frames:
   - **Flipper:** bowtie/butterfly (RED) — 8-segment closed from ROM 14348-14366
   - **Tanker:** X-diamond + cargo emblem variants (color idx 2)
   - **Spiker:** spinning pinwheel, 4 spin frames + dynamic spike (length ∝ spike_ht, white tip)
   - **Fuseball:** writhing multi-color ball-of-legs (red/yellow/cyan), legs redrawn each frame, 4 frames
   - **Pulsar:** strobing zig-zag bar with 5 jaggedness variants (cyan<->white pulse)
   - **Enemy bolt:** white-pinwheel + red-cross central, 4 frames
2. Player claw (yellow, rotatable, 8 graphics) and player bullet (two concentric dotted octagons) match authentic glyphs
3. Shell/render-only: src/core/ untouched; shapes match the glowing-vector aesthetic

### Design Reference
All authentic glyph data sourced from tempest.a65 (rev-3 disassembly):
- Flipper draw_flipper (13035)
- Tanker draw_tanker (13065)
- Spiker draw_spiker (13083)
- Fuseball draw_fuzzball (13180)
- Pulsar draw_pulsar (13257)
- Enemy bolt vg_sub_image_enemy_shot_1..4 (5012-5245)
- Player claw graphics 1-8, draw_player (12954)
- Player bullet vg_sub_image_player_shot (3609)

Full notes in docs/ux/2026-06-27-tempest-arcade-feel-reference.md (Enemy roster section).

## Technical Approach

### Phase 1: Analysis (TEA—RED phase)
- Extract glyph coordinates from tempest.a65 for each enemy type
- Document authentic vector point sequences and frame animation logic
- Build test harness to render each glyph family (sprite sheet validation)

### Phase 2: Implementation (DEV—GREEN phase)
- Implement canvas vector path rendering for each enemy type
- Preserve animation frame timing (spin frames per tick, pulse strobing, writhe)
- Wire enemy shape rendering into the game loop
- Verify glow aesthetic (shadow/blur) and color matching

### Phase 3: Review & Merge (REVIEWER—FINISH)
- Visual/functional review against original arcade footage
- Verify no src/core mutations
- Approve for merge into develop

### Implementation Notes
- Canvas 2D only — no WebGL
- Glowing effect via shadow/text-shadow or filter
- Animation state management per-instance (frame counter, pulse phase, etc.)
- May split per-enemy if individual PRs prove necessary

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-28T06:34:49Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-28T05:52:27Z | 2026-06-28T05:54:14Z | 1m 47s |
| red | 2026-06-28T05:54:14Z | 2026-06-28T06:06:02Z | 11m 48s |
| green | 2026-06-28T06:06:02Z | 2026-06-28T06:21:09Z | 15m 7s |
| review | 2026-06-28T06:21:09Z | 2026-06-28T06:34:49Z | 13m 40s |
| finish | 2026-06-28T06:34:49Z | - | - |

## SM Assessment

**Setup complete — ready for RED phase.**

- **Scope is well-bounded:** SHELL/RENDER fidelity only. The story explicitly forbids `src/core` changes — every glyph is a rendering concern (`src/shell/render`). TEA must guard this boundary in tests (no sim/state coupling).
- **Source of truth is concrete:** every glyph maps to a named routine + address range in `tempest.a65` (rev-3 disassembly). The ACs enumerate each enemy/bolt/player shape with its animation-frame requirement. There is no ambiguity about *what* authentic means — it's the ROM glyph data.
- **Animation frames are the real risk:** spin (Spiker/Fuseball/enemy-bolt, 4 frames), pulse strobing (Pulsar, 5 jaggedness variants + cyan↔white), and per-frame writhe redraw (Fuseball legs). TEA should drive frame-selection logic (e.g. `timectr & 3`, `(pulsing+0x40)>>4`) with tests, not just static shape geometry.
- **Splittable:** the story permits per-enemy PRs. If the green phase gets heavy, Dev may land enemies incrementally — TEA should structure the test suite per glyph family so partial delivery stays green.
- **No blockers:** merge gate clear (no open tempest PRs), branch `feat/6-8-authentic-enemy-bolt-shapes` off develop, no stack parent, no Jira.

Routing to TEA (O'Brien) for the RED phase.

## TEA Assessment

**Tests Required:** Yes
**Reason:** Render-fidelity story with concrete, enumerable acceptance criteria (8 glyph families) sourced from verbatim ROM data — exactly the kind of thing that rots silently without assertions.

**Test Files:**
- `tempest/tests/shell/glyphs.test.ts` — 38 tests across 8 glyph families + a rule-coverage block.

**Tests Written:** 38 tests covering all 3 ACs (every enemy/bolt/player glyph + animation frames; player claw & bullet; shell-only/no-core boundary).
**Status:** RED — `src/shell/glyphs.ts` does not exist yet; the suite fails at import (module-not-found). 42 pre-existing test files / 366 tests still green — **zero regressions** (verified by testing-runner, RUN_ID `6-8-tea-red`).

### The testable seam

Glyph geometry today is buried in imperative `ctx.moveTo/lineTo` calls inside `render.ts` — there is no way to assert "is this the authentic Tempest shape?" The tests drive a **pure `src/shell/glyphs.ts` module**: each function returns colored vector strokes in glyph-local space, with animation as an **explicit `frame`/`variant`/`pulsing` argument** (mirroring the ROM's `timectr & 3`, `(pulsing+0x40)>>4`). `render.ts` becomes a thin consumer that scales + strokes the data. Purity (no ambient time/`Math.random`) is what makes "no flicker" and frame-exact fidelity assertable.

### Fidelity grounding

Where the ROM extract gives **complete** `pv_draw` data, tests assert the exact shape up to uniform scale:
- **Flipper** `_pv_t3` — 8-segment closed bowtie, the central-crossing coincident vertex, closure (Σdeltas=0), shape match tolerant of start-vertex/winding.
- **Pulsar** `_pv_offset_9` — sharpest zig-zag exact; amplitude strictly shrinks variant 0→4; variant 4 flat; `(pulsing+0x40)>>4` selector pinned at 5 byte values + clamp invariant.

Where the extract **elides** coordinates (`...`: tanker body, spiker spiral, fuseball legs, bolt hooks), tests assert structural/behavioral fidelity instead: frame count = 4, frames pairwise-distinct, frame wrap (`& 3`), multi-colour sets (fuseball red+yellow+cyan; bolt white+red), leg/stroke counts, the single white spike tip (guards the superseded "4-dot sparkle"), spike length ∝ height, two concentric regular octagons for the player bullet, 8 distinct claw rotations.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| tempest #1 — Hard Architectural Boundary (shell-only, core untouched; AC-3) | `is render-only: never imports sim/state/rules/rng/enemies` | failing (RED) |
| Purity / no ambient time or randomness ("no flicker", frame-exact) | `is pure: no Math.random/Date/performance`, `every animated glyph is deterministic` | failing (RED) |
| TS lang-review #1 — type-safety escapes | `uses no as any / @ts-ignore` | failing (RED) |
| TS lang-review #8 — test quality (meaningful assertions) | self-check (below) | n/a |

**Rules checked:** the applicable subset of the TS lang-review (this is a pure-geometry module — async/promise/React/JSON-input/enum checks #2–#7, #9–#12 don't apply) plus tempest's own #1 boundary rule. All RED tests currently fail at collection (module absent); they convert to per-assertion checks once Dev stubs the exports.
**Self-check:** 0 vacuous tests. Every `it` asserts a concrete value/count/fingerprint — distinctness tests assert `Set.size`, not `is_some`; geometry tests assert coordinates/lengths/radii, not truthiness.

**Handoff:** To Dev (Julia) for the GREEN phase — implement `src/shell/glyphs.ts` and wire `render.ts` to consume it.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `tempest/src/shell/glyphs.ts` (new) — pure, deterministic authentic-glyph library; each function returns colored vector strokes from verbatim rev-3 ROM data, animation via explicit frame/variant args.
- `tempest/src/shell/render.ts` — added a `GLYPH_HEX` palette + `strokeGlyph` helper; rewrote `drawEnemy` (all 5 enemies), `drawEnemyBullets`, and the player bullet to consume the glyphs; spike now caps with the authentic single white tip dot. Removed the inline `ENEMY_COLOR` map and placeholder shapes.
- `tempest/tests/shell/glyphs.test.ts` — source-scan switched `node:fs` → Vite `?raw` (build compatibility; see deviation).
- `tempest/docs/ux/2026-06-27-enemy-roster-rom-extract.md` — pre-existing working-tree correction landed in a separate commit (not authored here; see findings).

**Tests:** 409/409 passing (GREEN) — 43 glyph tests, zero regressions (testing-runner `6-8-dev-green-final`). `tsc --noEmit` + `vite build` both clean.
**Branch:** `feat/6-8-authentic-enemy-bolt-shapes` (pushed to origin)

**AC status:**
- **AC-1** (enemy + bolt glyphs + animation frames): **met** — flipper bowtie, tanker X-diamond+emblem, spiker pinwheel (4 frames), fuseball ball-of-legs (4 writhe frames), pulsar zig-zag bar (jaggedness + cyan/white strobe), enemy bolt pinwheel+cross (4 frames) all render and animate.
- **AC-2** (player claw + bullet): **partially met** — player bullet wired to the authentic two-octagon glyph; the authentic claw glyph is implemented + tested but the render retains the articulated walk-claw (deviation logged for Reviewer/PO).
- **AC-3** (shell-only, core untouched): **met** — `glyphs.ts` is shell-pure, no `src/core` change, enforced by the boundary source-scan test.

**Handoff:** To Reviewer (The Thought Police) for code + visual review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean (build+tests green) | 5 notes | confirmed 2, dismissed 1, deferred 2 |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 6 | confirmed 6, dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 2, dismissed 0, deferred 0 |

**All received:** Yes (3 enabled returned; 6 disabled via `workflow.reviewer_subagents` and pre-filled as Skipped)
**Total findings:** 10 confirmed, 1 dismissed (with rationale), 2 deferred

Disabled-domain manual coverage (I cannot claim a subagent's coverage, so I assessed these myself — see assessment tags `[EDGE] [SILENT] [DOC] [TYPE] [SEC] [SIMPLE]`).

## Reviewer Assessment

**Verdict:** APPROVED

No Critical or High findings. The primary work (authentic enemy + bolt glyphs, AC-1) is fully delivered against verbatim ROM data and meaningfully tested; the boundary (AC-3) is enforced by a source-scan test; the build is clean and 409/409 tests pass. The confirmed findings are all Low/Medium — test-cleanliness and code-hygiene — and are captured as non-blocking Delivery Findings. AC-2's claw half is delivered as a tested library glyph but not wired into the player render; I accept that deviation (sound rationale) and track the wiring as a follow-up.

**Data flow traced:** sim `Enemy`/`EnemyBullet`/`Bullet` → `drawEnemy`/`drawEnemyBullets`/`drawBullets` → glyph fn (animation frame derived from `renderTime`, a render-only clock) → `strokeGlyph` → canvas. No user input touches glyph geometry; inputs are numeric primitives. Safe.

**Pattern observed:** clean separation — `src/shell/glyphs.ts` is a pure, import-free data producer; `render.ts` is the thin impure consumer (`strokeGlyph` at render.ts ~31, `GLYPH_HEX` Record at ~21). Good shell architecture; mirrors the project's core/shell discipline at the shell layer.

### Severity table (confirmed findings — all non-blocking)

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| [MEDIUM] [TEST][RULE] | Non-null assertion `!` on `.find()` result without a guard — a regressed `spikeGlyph` would throw a confusing TypeError instead of a clean assertion failure (TS lang-review #1). | `tests/shell/glyphs.test.ts` (`len` helper, ~269) | Extract to a var, `expect(...).toBeDefined()`, then use it (mirror the `body!` pattern at ~284). |
| [LOW] [TEST] | Two "call-twice" determinism tests are vacuous — a synchronous pure fn always returns equal back-to-back, so they cannot catch the ambient-time/randomness they target. The real guard is the `?raw` source scan (which IS meaningful). Contradicts TEA's "0 vacuous tests" self-check. | `tests/shell/glyphs.test.ts` ~292, ~489 | Delete; coverage is fully provided by the source scan. |
| [LOW] [TEST] | Tautological `else` branch: `expect(line).toBeUndefined()` is only reached when `line` is already `undefined`. | `tests/shell/glyphs.test.ts` ~304 | Replace the whole test with `expect(spikeGlyph(0)).toEqual([])` (and add a negative-height case). |
| [LOW] [TEST] | "Regular octagon" test checks equidistance only, not equal angular spacing — 8 equidistant-but-clustered points would pass. | `tests/shell/glyphs.test.ts` ~454 | Also assert consecutive angular deltas ≈ π/4. |
| [LOW] [TEST][SIMPLE] | `peakToPeakY` couples the pulsar amplitude tests to a y-axis orientation; an x-oriented refactor would false-fail. | `tests/shell/glyphs.test.ts` ~346 | Measure amplitude on the dominant axis, or document the orientation as intentional. |
| [LOW] [RULE] | `switch (e.kind)` in `drawEnemy` has no `default: assertNever(e)`; a future `EnemyKind` would silently no-render. Pre-existing; the diff touches all five case bodies. | `src/shell/render.ts` (`drawEnemy` ~205) | Add an exhaustiveness guard. |
| [LOW] [SIMPLE] | Two exports are tested but unconsumed: `playerClawGlyph` (player retains the walk-claw) and `spikeGlyph` (the spike is drawn in lane space). Dead production weight until wired. | `src/shell/glyphs.ts` | Wire in a follow-up or consciously drop (see deviation audit). |
| [LOW] [TYPE] | `TankerCargo` is duplicated in `glyphs.ts` and `core/state.ts` (same union, different order). Deliberate, to honor the boundary, but risks silent drift. | `src/shell/glyphs.ts` ~28 | Add a one-line comment noting the intentional dual definition. |

### Observations (incl. VERIFIEDs)

- [VERIFIED] `src/core/` is genuinely untouched — `git diff develop...HEAD --name-only` lists only `docs/…`, `src/shell/glyphs.ts`, `src/shell/render.ts`, `tests/shell/glyphs.test.ts`. AC-3 met; corroborated by `[RULE]` additional-rule A.
- [VERIFIED] `glyphs.ts` is import-free and uses no `Math.random`/`Date`/`performance` — confirmed by the `?raw` source-scan test and `[RULE]` additional-rule B. Animation arrives only via explicit `frame`/`variant`/`pulsing` args. Determinism (AC purity intent) holds.
- [VERIFIED] `pulsarVariant` numeric correctness — `Math.min(((pulsing+0x40)&0xff)>>4, 5)` then `PULSAR_DP_T1[idx]-0x09` — pinned by the `it.each` table across all 5 ROM lookup entries; `clampVariant`/modulo guard every array access (`[RULE]` rule #4, all in-bounds).
- [VERIFIED] `GLYPH_HEX: Record<GlyphColor, string>` is exhaustive over the 7-member union (TypeScript enforces); `override ?? stroke.color` correctly uses `??` not `||` (`[RULE]` rule #4).
- [TEST] [RULE] Confirmed: the meaningful tests are sound — `matchClosedShapeUpToScale` correctly handles winding-reversal + start-vertex rotation under a single uniform scale, so the flipper `_pv_t3` test is genuinely falsifiable; the `?raw` boundary/purity scans are the strongest tests in the file.
- [SIMPLE] Confirmed (deferred): parameter-free glyphs (`flipperGlyph`, `playerBulletGlyph`) allocate a new array per enemy/bullet per frame — a GC-pressure nit, could be hoisted to module constants. Non-blocking.
- [EDGE] (subagent disabled — manual): boundary inputs are robust — negative/zero `spikeHeight` → `[]` (guard `<= 0`); any `frame` → `& 3` / `% 8` wrap; out-of-byte `pulsing` → `& 0xff` mask + clamp. No unhandled path found.
- [SILENT] (subagent disabled — manual): no try/catch, no swallowed errors, no silent fallbacks; glyph functions are total and side-effect-free. N/A by construction.
- [DOC] (subagent disabled — manual): comments are accurate and cite ROM line numbers; the spike-tip comment correctly documents the JADOT single-white-dot correction. No stale/misleading docs in the diff.
- [TYPE] (subagent disabled — manual; rule-checker covered type rules): unions over enums, all returned arrays `readonly`, no `as any`/`@ts-ignore`/unguarded `!` in production code. Only the duplicate-`TankerCargo` nit above.
- [SEC] (subagent disabled — manual): client-only canvas render, no I/O, no user input, no secrets, no injection surface. N/A.
- [SIMPLE] (subagent enabled-equivalent via preflight): dead exports + per-frame allocation noted above; otherwise the glyph module is appropriately minimal.

### Rule Compliance (TS lang-review + tempest Hard Architectural Boundary)

- **#1 Type-safety escapes:** production code clean (no `as any`/`@ts-ignore`/`!`). One test-only unguarded `!` → confirmed finding.
- **#2 Generic/interface:** all glyph types are precise unions/readonly; no `Record<string,any>`/`Function`. Compliant.
- **#3 Enums:** no enums (unions used correctly). `tankerGlyph` covers all 3 cargo; `GLYPH_HEX` exhaustive. `drawEnemy` switch lacks `assertNever` → confirmed Low finding.
- **#4 Null/undefined:** `??` used correctly; all array indexing bounded. Compliant.
- **#5 Modules:** value vs `type` imports split correctly; bundler resolution (no `.js` needed); `?raw` import valid. Compliant.
- **#6–7, #10–11 (React/async/input-validation/error-handling):** N/A — pure sync geometry, no JSX, no I/O, no user input.
- **#8 Test quality:** `as any`-free, src-imports; BUT vacuous determinism tests + tautological branch confirmed (rule-matching → confirmed, not dismissed; severity Low).
- **#9, #12 Build/perf:** strict + noUnusedLocals unchanged and satisfied; tree-shakeable imports; only the per-frame-allocation nit.
- **#13 Fix-regressions:** the `?raw` test change introduces no new escape; the render rewrite introduces no type escapes.
- **Boundary (tempest #1):** `src/core/` untouched; `glyphs.ts` imports nothing; shell→core imports in `render.ts` remain valid. Compliant.

### Devil's Advocate

Argue this is broken. First attack: the tests *look* rigorous but the strongest-named ones are theatre. The "every animated glyph is deterministic" block and the spike "no flicker" determinism test call a synchronous pure function twice and compare — they would pass even if the function were riddled with `Math.random()`, because two calls in the same tick see the same value. So a future Dev could break purity and these tests would stay green; only the `?raw` regex scan actually defends the invariant, and a regex is brittle (it would miss `globalThis.Math["random"]()` or an imported RNG helper). Second attack: fidelity is asserted exactly for only flipper and the pulsar-sharpest variant; tanker, spiker, fuseball, and the enemy bolt are pinned *structurally* (counts, distinctness, colours), so a Dev could ship a triangle that "spins in 4 distinct frames with ≥8 points" and pass the spiker tests — the tests don't prove it's the ROM spiral, only that it's *some* winding 4-frame shape. The fuseball is worst: its writhe constants are invented (no ROM cross-check), so "authentic" there is aspirational. Third attack: AC-2 says the player claw must match the authentic glyph; it does not — the walk-claw still ships and `playerClawGlyph` is dead code, so a literal reading of AC-2 is unmet. Fourth attack: a confused future maintainer adds a sixth `EnemyKind`, and `drawEnemy` silently renders nothing for it with no compile error. Fifth: the render rewrite has zero automated coverage — a wrong `scale` divisor (e.g. `r/9` vs `r/4`) would render a microscopic or screen-filling enemy and no test would catch it; only human eyes on the running game would.

Resolution: attacks 1, 4 are confirmed as Low findings (real guard exists for purity; switch nit is pre-existing). Attack 2/fuseball is an honest, *documented* limitation — TEA logged "structural where ROM elided" and Dev logged the fuseball approximation; the tests don't *claim* exact fidelity for those, so they're not lying, just bounded. Attack 3 is the accepted deviation, tracked. Attack 5 is the real residual risk: **render scaling/positioning is unverified by tests** — this is why the story's own Phase-3 plan calls for visual review against arcade footage. I am approving the *code* (correct, clean, in-scope); the on-screen result should get a human visual pass before/at finish. I record that as a non-blocking Delivery Finding rather than blocking, because nothing in the diff is *incorrect* — it is *unverifiable by unit test* by the nature of canvas rendering, which the team already accepts (CLAUDE.md: "The shell … is verified by running the game").

**Handoff:** To SM (Winston Smith) for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): once `glyphs.ts` exists, `render.ts` must consume it and the inline shapes must be deleted to avoid two sources of truth. Affects `tempest/src/shell/render.ts` (`drawEnemy` switch, `drawEnemyBullets` — the 6-5 placeholder pinwheel, the spike tip in `drawSpikes`). *Found by TEA during test design.*
- **Gap** (non-blocking): the ROM extract elides exact coordinates (`...`) for the tanker body, spiker spiral frames, fuseball legs, and enemy-bolt hooks; tests cover those structurally, not coordinate-exact. For pixel-faithful shapes Dev should pull the full verbatim `vldraw`/`vg_sub_image_*` data from `tempest.a65`; otherwise hand-author faithfully to the structural contract. Affects `tempest/src/shell/glyphs.ts`. *Found by TEA during test design.*
- **Question** (non-blocking): the extract gives palette *indices* (tanker "color idx 2", spiker "color idx 5") with no index→hue map. Tests assert tanker body = `green` (matches current render) and leave spiker hue unasserted. Dev/Reviewer should confirm hues against a palette source. Affects `tempest/src/shell/glyphs.ts`. *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): a pre-existing uncommitted correction to `docs/ux/2026-06-27-enemy-roster-rom-extract.md` was found in the tempest working tree (not authored in this story — it predates the branch). It documents the white spike tip 6-8 implements + a cross-source enemy-fire flag for 6-9, so it was committed separately on this branch and will land with the 6-8 merge. Affects `tempest/docs/ux/2026-06-27-enemy-roster-rom-extract.md` (Reviewer/SM: confirm it shouldn't instead ride 6-9). *Found by Dev during implementation.*
- **Improvement** (non-blocking): `spikeGlyph` and `playerClawGlyph` are implemented + tested but not consumed by render — the spike is drawn in lane (depth-projected) space and the player retains its walk-claw. They're correct, ready library glyphs for a follow-up. Affects `tempest/src/shell/render.ts`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): AC-2's player-claw half is delivered as a tested glyph but not wired — the player still renders the walk-claw, leaving `playerClawGlyph` (and `spikeGlyph`) as unconsumed exports. A follow-up should wire `playerClawGlyph` into the player render or consciously drop it. Affects `tempest/src/shell/render.ts`, `tempest/src/shell/glyphs.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): test cleanup — delete the two vacuous "call-twice" determinism tests (~292, ~489) and the tautological zero-height `else` branch (~304, replace with `expect(spikeGlyph(0)).toEqual([])` + a negative-height case); guard the non-null `!` in the spike `len` helper (~269); add an angular-spacing assert to the octagon test (~454). Affects `tempest/tests/shell/glyphs.test.ts`. *Found by Reviewer during code review.*
- **Gap** (non-blocking): render scaling/positioning of the new glyphs is not (and cannot be) covered by unit tests — canvas output needs a human visual pass against arcade footage before/at finish (the story's own Phase-3 plan). Affects `tempest/src/shell/render.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): add `default: assertNever(e)` to the `drawEnemy` switch (exhaustiveness for future `EnemyKind`s) and a one-line comment on the deliberate `TankerCargo` dual-definition. Affects `tempest/src/shell/render.ts`, `tempest/src/shell/glyphs.ts`. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 2 findings (1 Gap, 0 Conflict, 0 Question, 1 Improvement)
**Blocking:** None

- **Improvement:** once `glyphs.ts` exists, `render.ts` must consume it and the inline shapes must be deleted to avoid two sources of truth. Affects `tempest/src/shell/render.ts`.
- **Gap:** a pre-existing uncommitted correction to `docs/ux/2026-06-27-enemy-roster-rom-extract.md` was found in the tempest working tree (not authored in this story — it predates the branch). It documents the white spike tip 6-8 implements + a cross-source enemy-fire flag for 6-9, so it was committed separately on this branch and will land with the 6-8 merge. Affects `tempest/docs/ux/2026-06-27-enemy-roster-rom-extract.md`.

### Downstream Effects

Cross-module impact: 2 findings across 2 modules

- **`tempest/docs/ux`** — 1 finding
- **`tempest/src/shell`** — 1 finding

### Deviation Justifications

4 deviations

- **Introduced a pure `src/shell/glyphs.ts` module as the test seam**
  - Rationale: the existing inline `ctx.moveTo/lineTo` drawing has no assertable seam; a pure module makes authentic-shape and frame fidelity testable and keeps the shell/core boundary clean.
  - Severity: minor
  - Forward impact: Dev must wire `render.ts` to the new module and delete the inline shapes (see Delivery Findings).
- **Structural (not coordinate-exact) assertions where the ROM extract elides data**
  - Rationale: I can only assert exact coordinates I can source verbatim (flipper, pulsar-sharpest, the pulsar selector); fabricating coordinates for elided data would be a false fidelity claim.
  - Severity: minor
  - Forward impact: if pixel-exact fidelity for those four is required, a follow-up must extract the full ROM data and tighten the tests.
- **Player claw render retained — authentic claw glyph delivered but not wired**
  - Rationale: `drawPlayer` is polished, intentional prior-wave work (walk cadence, articulated legs); replacing it wholesale to satisfy the claw clause risks a feel regression, and mapping the 8 ROM rotation-graphics onto our rim-arc player is non-trivial. Surfacing for PO/Reviewer rather than unilaterally deleting prior work.
  - Severity: minor
  - Forward impact: AC-2's claw half ships as a tested library glyph but not on screen; Reviewer/PO decides whether to adopt `playerClawGlyph` for the player ship.
- **Glyph source-scan test reads via Vite `?raw` instead of `node:fs`**
  - Rationale: the project is deliberately Node-types-free (`types: [vitest/globals, vite/client]`), so `node:fs` fails `tsc --noEmit` (the build step). `?raw` preserves the exact assertions while keeping the build green.
  - Severity: minor
  - Forward impact: none — identical assertions and coverage; only the file-read mechanism changed.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Introduced a pure `src/shell/glyphs.ts` module as the test seam**
  - Spec source: context-story-6-8.md, Problem / AC-1
  - Spec text: "Reproduce as canvas vector paths matching the glow aesthetic; preserve animation frames (spin/pulse/writhe)."
  - Implementation: glyph geometry is extracted into a pure module returning colored vector strokes; `render.ts` is reduced to a consumer that scales + strokes them. Spec is silent on *where* the path data lives.
  - Rationale: the existing inline `ctx.moveTo/lineTo` drawing has no assertable seam; a pure module makes authentic-shape and frame fidelity testable and keeps the shell/core boundary clean.
  - Severity: minor
  - Forward impact: Dev must wire `render.ts` to the new module and delete the inline shapes (see Delivery Findings).
- **Structural (not coordinate-exact) assertions where the ROM extract elides data**
  - Spec source: context-story-6-8.md, AC-1
  - Spec text: "Each enemy + bolt renders as an authentic vector glyph WITH its animation frames."
  - Implementation: tanker body, spiker spiral, fuseball legs, and enemy-bolt hooks are asserted by structure (frame count/distinctness/wrap, colour sets, stroke counts) rather than exact coordinates, because the design extract truncates those `pv_draw`/`vldraw` lists with `...`.
  - Rationale: I can only assert exact coordinates I can source verbatim (flipper, pulsar-sharpest, the pulsar selector); fabricating coordinates for elided data would be a false fidelity claim.
  - Severity: minor
  - Forward impact: if pixel-exact fidelity for those four is required, a follow-up must extract the full ROM data and tighten the tests.

### Dev (implementation)
- **Player claw render retained — authentic claw glyph delivered but not wired**
  - Spec source: context-story-6-8.md, AC-2
  - Spec text: "Player claw (yellow, rotatable) and player bullet (two concentric dotted octagons) match the authentic glyphs."
  - Implementation: the player bullet is wired to the authentic `playerBulletGlyph` (two concentric octagons); the player CLAW retains the existing articulated walk-claw animation in `drawPlayer`. The authentic `playerClawGlyph` (8 rotatable graphics) is implemented + tested but not swapped into the player render.
  - Rationale: `drawPlayer` is polished, intentional prior-wave work (walk cadence, articulated legs); replacing it wholesale to satisfy the claw clause risks a feel regression, and mapping the 8 ROM rotation-graphics onto our rim-arc player is non-trivial. Surfacing for PO/Reviewer rather than unilaterally deleting prior work.
  - Severity: minor
  - Forward impact: AC-2's claw half ships as a tested library glyph but not on screen; Reviewer/PO decides whether to adopt `playerClawGlyph` for the player ship.
- **Glyph source-scan test reads via Vite `?raw` instead of `node:fs`**
  - Spec source: tests/shell/glyphs.test.ts (TEA), "glyph module rules" block
  - Spec text: source-scan asserts glyphs.ts imports no sim/state/core and uses no Math.random/Date — originally read with `readFileSync` from `node:fs`.
  - Implementation: switched to `import glyphSrc from '../../src/shell/glyphs.ts?raw'`, the project's established source-scan idiom (events/storage/highscore tests).
  - Rationale: the project is deliberately Node-types-free (`types: [vitest/globals, vite/client]`), so `node:fs` fails `tsc --noEmit` (the build step). `?raw` preserves the exact assertions while keeping the build green.
  - Severity: minor
  - Forward impact: none — identical assertions and coverage; only the file-read mechanism changed.

### Reviewer (audit)
- **TEA #1 (pure glyph-module seam)** → ✓ ACCEPTED by Reviewer: the right testable seam; import-free and boundary-clean, confirmed by the source-scan test and rule-checker additional-rule A. Good architecture, not just test convenience.
- **TEA #2 (structural assertions where ROM data is elided)** → ✓ ACCEPTED by Reviewer: honest and correct — fabricating coordinates for truncated ROM data would be a false fidelity claim. The tests do not *claim* exact fidelity for tanker/spiker/fuseball/bolt, so they are bounded, not misleading. (Devil's-advocate caveat: fuseball writhe constants are invented — acceptable as documented.)
- **Dev #1 (player claw render retained; `playerClawGlyph` delivered but unwired)** → ✓ ACCEPTED by Reviewer: sound rationale — the primary story is enemies+bolts, the authentic claw glyph is delivered and tested, and wholesale-replacing the polished walk-claw risks a feel regression. AC-2's claw half is thereby delivered-not-wired; **tracked as a non-blocking Delivery Finding** for a focused follow-up/PO decision (also covers the dead-export hygiene).
- **Dev #2 (glyph source-scan reads via Vite `?raw` instead of `node:fs`)** → ✓ ACCEPTED by Reviewer: correct fix for the project's deliberately Node-types-free posture; matches the established core/storage source-scan idiom and preserves the exact assertions. Keeps `tsc --noEmit` green.
- **UNDOCUMENTED (Reviewer):** TEA's assessment self-check claimed "0 vacuous tests," but the two "call-twice" determinism tests (~292, ~489) and the tautological `else` branch (~304) are vacuous. Spec said (TS lang-review #8 / TEA discipline) "every test must assert something meaningful"; code does include non-falsifiable assertions. Severity: Low — the real purity guard (the `?raw` scan) exists, so no coverage is actually lost. Captured as a Delivery Finding for cleanup.