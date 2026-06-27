---
story_id: "8-2"
jira_key: ""
epic: "8"
workflow: "tdd"
---
# Story 8-2: Port authentic 3D vector models (Object_3D_Data → core/models)

## Story Details
- **ID:** 8-2
- **Jira Key:** (not used - no Jira integration)
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** star-wars

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-27T21:06:24Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-27T20:33:47Z | 2026-06-27T20:37:00Z | 3m 13s |
| red | 2026-06-27T20:37:00Z | 2026-06-27T20:47:51Z | 10m 51s |
| green | 2026-06-27T20:47:51Z | 2026-06-27T20:55:23Z | 7m 32s |
| review | 2026-06-27T20:55:23Z | 2026-06-27T21:06:24Z | 11m 1s |
| finish | 2026-06-27T21:06:24Z | - | - |

## Sm Assessment

**Setup verdict:** Clean. Story 8-2 is the critical-path foundation for epic 8 — porting the authentic Atari 1983 vector models from the cabinet disassembly into typed, deterministic TypeScript. No upstream dependencies; it unblocks all downstream visual work (8-3 → 8-5). Merge gate clear, no blocking PRs.

**Artifacts verified:**
- Session file present, fields set (workflow=tdd, repos=star-wars, phase=setup).
- Story context written at `sprint/context/context-story-8-2.md` with RED/GREEN approach + ACs.
- Feature branch `feat/8-2-port-3d-vector-models` created and checked out in the star-wars subrepo (base: `develop`).

**Routing:** Phased TDD workflow → hand off to TEA (Han Solo) for the RED phase.

**Strategic notes for the next agent:**
- The boundary is sacred: `src/core/` is pure and deterministic. Models are world-space vertex (`Vec3[]`) + edge index data only — no rendering, no screen-space math, no DOM/time/randomness. All 3D math flows through `src/core/math3d.ts` (the Math Box).
- Data source is `star-wars/reference/disasm/Object_3D_Data.asm` — **GITIGNORED**. Read it to recover real numbers; never commit, move, or import `.asm` into `src/`. The public repo must stay clean of copyrighted disassembly material — this is a hard acceptance criterion, not a guideline.
- A Wave-0 stub `src/core/models.ts` already exists; the port extends/replaces it.
- RED tests should assert: typed model shape (`Vec3[]` vertices, edge index pairs), well-formedness (every edge index in range, no degenerate/self edges), and a few authentic invariants from the disassembly (e.g. TIE-fighter vertex/edge counts and symmetry).
- Build/test run **inside** the subrepo: `cd star-wars && npm test` (vitest), `npm run build` (tsc --noEmit && vite build).

Everything proceeds according to the sprint plan.

## TEA Assessment

**Tests Required:** Yes
**Reason:** Pure-core data module — exactly what TDD is for; authentic invariants are checkable against the disassembly.

**Test Files:**
- `star-wars/tests/core/models.test.ts` — 15 tests: registry contract, universal wireframe well-formedness, and authentic TIE-fighter + trench invariants.

**Tests Written:** 15 tests covering AC-1 (shape), AC-1 (well-formedness), and AC-1 (authentic invariants).
**Status:** RED (15 failing, all assertion failures — no import/compile crashes). Pre-existing `math3d.test.ts` (7 tests) still GREEN. `tsc --noEmit` exits 0 (tree clean).

### Rule Coverage

| Rule (typescript.md) | Test(s) | Status |
|------|---------|--------|
| #2 generic/interface — `readonly` shape, no loose types | `every registry entry conforms to the Model3D shape`, `every vertex is a finite Vec3` | failing |
| #10 input validation — validated data shape (no NaN/garbage from hand-ported hex) | `every vertex is a finite Vec3`, `every edge is a pair of integer vertex indices` | failing |
| #8 test quality — no vacuous assertions | self-checked: every test has a meaningful assert; empty-registry guarded with `expect(length).toBeGreaterThan(0)` so RED never passes vacuously | n/a |

**Rules checked:** TS lang-review is largely DEV self-review; the data-relevant rules (#2 shape/immutability intent, #10 validated shape, #8 test quality) have coverage. Runtime-freeze (#2) deliberately NOT tested — no `Object.freeze`/`as const` convention exists in tempest/star-wars core, so imposing it would break codebase consistency; the `readonly` types carry the intent at compile time.
**Self-check:** 0 vacuous tests. Every `it` asserts a concrete value; parametric checks loop inside a single `it` (not `it.each`) and front-load a non-empty guard so an empty registry fails loudly rather than registering zero cases.

**Key handoff note for DEV (Yoda):** the disassembly has NO edge data — you author the wireframe connectivity (see blocking Delivery Finding). Tests lock vertex authenticity (counts, Y-symmetry, trench coplanarity) and wireframe integrity (in-range, non-degenerate, unique, no-orphan), and require a `MODELS` registry (array or record of `Model3D`) with ≥4 models including a TIE fighter and a trench, identified by `Model3D.name`.

**Handoff:** To DEV for GREEN implementation.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `star-wars/src/core/models.ts` — replaced the Wave-0 stub with 5 authentic models + a `MODELS` registry. Vertices ported verbatim from `Object_3D_Data.asm`; edges authored from geometry (nearest-neighbour + trench square loops). `CUBE` retained for the render shell.

**Models ported (authentic vertices, authored edges):**
| Model (`name`) | Source | Vertices | Edges |
|----------------|--------|---------:|------:|
| TIE Fighter | `Obj_Tie_Fighter` | 52 | 65 |
| Darth Vader TIE | `Obj_Darth_Tie` | 56 | 64 |
| Death Star Surface | `Object_8` | 16 | 18 |
| Surface Tower | `Object_10` | 14 | 21 |
| Trench | `Obj_Trench_Squares` | 8 | 8 |

**Tests:** 22/22 passing (GREEN) — 15 models + 7 math3d. `tsc --noEmit` clean; `npm run build` (tsc && vite build) succeeds. Tree clean; no `reference/` or `.asm` tracked or staged (verified).

**Authenticity notes:** TIE fighter is bilaterally Y-symmetric and ≥52 render vertices; trench is coplanar in Y — all verified against the disassembly. The one substitution is edge connectivity (authored, not cabinet-exact — see Design Deviations and Delivery Findings).

**Branch:** feat/8-2-port-3d-vector-models (pushed)

**Handoff:** To Reviewer (Obi-Wan) for code review.

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
| 9 | reviewer-rule-checker | Yes | findings | 1 (low) | confirmed 1, dismissed 0, deferred 0 |

**All received:** Yes (2 enabled returned; 7 disabled via `workflow.reviewer_subagents`)
**Total findings:** 1 confirmed (low), 0 dismissed, 0 deferred

Disabled specialists' domains were assessed manually by the Reviewer (see tagged observations below) — preflight + rule-checker covered the mechanical and rule-compliance surface, and this is a small, pure static-data diff.

## Reviewer Assessment

**Verdict:** APPROVED

A clean, faithful port. The authentic cabinet vertices are reproduced verbatim from `Object_3D_Data.asm`, the sacred core/shell purity boundary holds, and the public repo carries no copyrighted disassembly. The one substitution — authored wireframe edges — is honest, well-documented, and forced by the source (the `.asm` has no line-segment tables). No Critical or High issues. The single confirmed finding is LOW and does not block.

**Data flow traced:** static model data (`MODELS` / `CUBE`) → `src/shell/render.ts` `drawModel()` iterates `m.edges`, indexes `m.vertices[a]/[b]` → Math Box `transform(mvp, …)` → strokes glowing line. There is no user input on this path. Safe because every edge index is verified in `[0, vertexCount)` (rule-checker + my own check), so `vertices[a]` is never `undefined` and no `NaN` reaches the canvas. Currently only `CUBE` is consumed at runtime; `MODELS` is exported for Wave 1 (8-3).

**Observations (≥5):**
- [VERIFIED] Core purity holds — `src/core/models.ts:21` imports only `type { Vec3 }` from `./math3d`; zero DOM/`window`/`canvas`/`Date.*`/`Math.random`/`performance.*`/`requestAnimationFrame`; complies with star-wars CLAUDE.md's hard boundary rule. Evidence: `grep` for those tokens returns nothing.
- [VERIFIED] Authentic vertices, not fabricated — `TIE Fighter[0] = [-130,-208,234]` equals disassembly `($FF7E,$FF30,$EA)`; spot-matched against `Object_3D_Data.asm:2`. Y-symmetry (`y→-y`) holds for all 52 verts (rule-checker confirmed programmatically). Complies with "port data, don't vendor it."
- [VERIFIED] No IP leak — `git ls-files | grep -iE 'reference/|\.asm$'` empty; preflight confirms 0 tracked/staged reference artifacts. Hard AC met: public repo stays clean. ([SEC] domain — security subagent disabled; assessed manually: client-only browser game, no user input, no secrets, no injection surface.)
- [VERIFIED] Immutability intent — `Model3D` (`models.ts:23-29`) is `readonly` at every depth (name, vertices, edges, edge tuple); `MODELS` is `readonly Model3D[]`. Consistent with the codebase (no `Object.freeze` convention exists in tempest/star-wars core, so none imposed). ([TYPE] domain — type-design subagent disabled; assessed via rule-checker rule #2 + manual: compliant.)
- [VERIFIED] Edge well-formedness across all 5 models — in-range, non-degenerate, undirected-unique, no-orphan — verified independently by the rule-checker's Node validator and by Yoda's generator. ([EDGE] domain — edge-hunter disabled; the universal well-formedness test suite + rule-checker cover boundary conditions: an out-of-range index would `undefined`-index a vertex, but none exist.)
- [VERIFIED] Documentation accurate — the `models.ts` header faithfully describes "vertices ported / edges authored / anchor dropped / pure data"; matches the implementation exactly. No stale or misleading comments. ([DOC] domain — comment-analyzer disabled; assessed manually: clean.)
- [VERIFIED] Tests substantive, not vacuous — every `it` asserts a concrete value; the empty-registry guard (`expect(length).toBeGreaterThan(0)`) prevents a vacuous pass. ([TEST] domain — test-analyzer disabled; rule-checker rule #8 + manual: clean.)
- [VERIFIED] No swallowed errors / silent fallbacks — a pure static-data module with no `try/catch`, no error paths. ([SILENT] domain — silent-failure-hunter disabled; N/A for this diff.)
- [LOW] [TYPE][RULE] `tests/core/models.test.ts:38` uses `as unknown as { MODELS?: … }` (TS rule #1 "double-cast bypass"). It is intentional and JSDoc-documented as a RED-phase robustness device (avoids a missing-named-export crash before `MODELS` existed). Now that GREEN commits `MODELS` permanently, it is simplifiable to a direct typed import — but it is harmless, confined to test infra, and the array-or-record normalization it enables is a deliberate flexibility. Confirmed (not dismissed) per rule-match policy; LOW because intentional + documented + test-only. Non-blocking; logged as a follow-up improvement. ([SIMPLE] domain — simplifier disabled; this is the only mild over-generality, noted.)

### Rule Compliance

Exhaustive enumeration performed by `reviewer-rule-checker` against the full TypeScript lang-review checklist (#1–#13) plus 4 architectural rules (A1 core purity, A2 data-only, A3 no-vendor, A4 strict/readonly/ESM): **24 instances checked, 1 violation** (the LOW cast above). Every `Model3D` const (TIE_FIGHTER, DARTH_TIE, DEATH_STAR_SURFACE, SURFACE_TOWER, TRENCH) + the `MODELS` registry + the `Model3D` interface were each checked for readonly/typing (rule #2) and core-purity (A1) — all compliant. `import type` usage (rule #5) correct. `moduleResolution: bundler` means `.js` extensions are not required. No enums/async/JSX/error-handling/security-input surface in the diff.

### Devil's Advocate

Argue this is broken. First and most real: the **edges are authored, not the cabinet's draw list**. Nearest-neighbour connectivity can link two vertices that are spatially close but topologically unrelated — e.g. bridging the gap between a TIE's two wing panels through the cockpit hub — producing stray segments. No test checks *appearance*, only well-formedness; a player who knows the 1983 game could see a subtly mangled silhouette. This is the genuine quality risk, and it is exactly what the deviations + delivery findings flag for Wave-1 eyeballing. Second: **model naming is guessed**. `Object_8`/`Object_10` are generically labelled; I assert "Death Star Surface" and "Surface Tower" on inference. If 8-3/8-4 import by name and Object_8 is actually, say, an explosion frame rather than the Death Star, downstream wires the wrong geometry — and only the TIE and trench names are test-locked. Third: **scale**. Death Star spans ±6720 while the TIE sits at ±256; a Wave-1 dev who renders `MODELS` uniformly with one camera gets the Death Star clipping the near plane or the TIE shrunk to a dot. Fourth, the one I expected to bite but doesn't: could the test's `as unknown as` mask a renamed-export regression? No — `allModels()` returns `[]` and the `toBeGreaterThan(0)` guards fail loudly, so a rename is caught. Fifth: **registry uniqueness** is unchecked — a model listed twice would pass every test; trivially true today (5 distinct consts), not worth a finding. Net: the devil surfaces three risks (authored edges, guessed names, scale) — all already documented by TEA/Dev as deviations/findings, none undocumented. The cast risk is disproven. One new micro-observation (registry uniqueness) is too minor to flag. Nothing rises to High; the verdict stands.

**Tenant isolation:** N/A — single-player, client-only browser game; no tenancy, no per-user data, no trait methods handling tenant data.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (blocking): `Object_3D_Data.asm` contains vertex tables ONLY (`fdb x, y, z` triples) — there is NO line-segment / edge-connectivity data in it. The story AC and SM setup both assumed edges live in this file; they do not. Affects `star-wars/src/core/models.ts` (DEV must AUTHOR well-formed wireframe edges per model, cross-referencing the AVG vector-draw routines in `reference/disasm/StarWars.asm` for authentic connectivity). Tests assert edge *well-formedness*, never specific edges, because the source has none. *Found by TEA during test design.*
- **Gap** (non-blocking): Death Star surface tiles and towers are stored under generic labels (`Object_8`, `Object_10`…`Object_21`) in `Object_3D_Data.asm` — only the TIE variants (`Obj_Tie_Fighter`, `Obj_Darth_Tie`) and `Obj_Trench_Squares` are self-named. Affects `models.ts` (DEV must map the numbered objects to roles using `StarWars.asm` cross-reference; tests identify TIE + trench by `Model3D.name`, and require ≥4 total models, but do not pin the obscure labels). *Found by TEA during test design.*
- **Improvement** (non-blocking): coordinate scale varies wildly between objects — `Object_8` spans Z −3840..6720 while the TIE/trench sit at ~±256 (raw 16-bit cabinet units). Affects `models.ts` (DEV should consider normalising each model to a consistent unit scale so the registry is uniform for render/collision). The Y-symmetry and trench-coplanarity tests are scale-invariant, so normalising is safe. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): the authored nearest-neighbour edges are a geometric approximation of the cabinet wireframe, not the exact AVG draw list (which isn't recoverable by name from the disassembly present). Affects `star-wars/src/core/models.ts` edges — a future polish story could recover the real line-segment order from the 6809 draw routines for cabinet-accurate silhouettes. Resolves Han Solo's blocking finding for now (well-formed wireframe shipped). *Found by Dev during implementation.*
- **Question** (non-blocking): Wave 1 (8-3) must decide each model's world scale + placement transform and rewire `src/shell/render.ts` from `CUBE` to the `MODELS` registry. Affects `src/shell/render.ts` and the 8-3 sim. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): `tests/core/models.test.ts:38` retains the RED-phase `as unknown as { MODELS?: … }` cast; now that `MODELS` is a committed export, a follow-up can simplify it to a direct typed import (or add a TODO). Affects the test file only. *Found by Reviewer during code review.*
- **Question** (non-blocking): the `DEATH_STAR_SURFACE` (`Object_8`) and `SURFACE_TOWER` (`Object_10`) names are inferred — those objects are generically labelled in the disassembly. Before 8-4 consumes them by name, confirm the role mapping (cross-reference `StarWars.asm` spawn/draw sites). Affects `star-wars/src/core/models.ts` naming + 8-4. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): authored nearest-neighbour edges are well-formed but not the cabinet's exact draw list; when 8-3 first renders the TIE fighter, eyeball the silhouette and refine connectivity if it reads wrong. Affects `models.ts` edges. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Tests assert edge well-formedness, not authentic edge values**
  - Spec source: context-story-8-2.md, AC-1
  - Spec text: "vertex arrays (X, Y, Z coordinates) and line-segment indices (edge pairs referencing vertices)" / "Authentic invariants ported from disassembly"
  - Implementation: Edge tests check in-range / non-degenerate / no-duplicate / no-orphan only; no test pins specific edge index pairs.
  - Rationale: `Object_3D_Data.asm` contains no edge tables (see Delivery Findings) — there are no authentic edge values in the cited source to assert against. DEV authors connectivity.
  - Severity: minor
  - Forward impact: Connectivity authenticity is not test-locked; Reviewer should eyeball the rendered wireframes in Wave 1.
- **Vertex counts asserted as lower bounds + symmetry, not exact counts**
  - Spec source: context-story-8-2.md, AC-1
  - Spec text: "TIE fighter vertex count and symmetry properties"
  - Implementation: TIE fighter asserts `vertices.length >= 52` plus exact Y-reflection symmetry and no-coincident-vertices; trench asserts `>= 8` plus Y-coplanarity.
  - Rationale: each source object begins with a `0,0,0` anchor that may or may not be ported as vertices[0]; a lower bound + the strong symmetry invariant proves the full authentic model without brittleness over the anchor decision. Symmetry/coplanarity are scale-invariant, so DEV normalisation is safe.
  - Severity: trivial
  - Forward impact: none
- **Test placed at `tests/core/models.test.ts`**
  - Spec source: context-story-8-2.md, AC-1 / RED checklist
  - Spec text: "Tests live alongside core (e.g., `src/core/models.test.ts`)"
  - Implementation: file written to `tests/core/models.test.ts`.
  - Rationale: matches the established repo convention (`tests/core/math3d.test.ts`); tsconfig `include` already covers `tests`.
  - Severity: trivial
  - Forward impact: none

### Dev (implementation)
- **Edges authored from geometry (nearest-neighbour), not ported from the disassembly**
  - Spec source: context-story-8-2.md, AC-2 / GREEN checklist
  - Spec text: "Recover vertex and edge tables from Object_3D_Data.asm"
  - Implementation: Vertices ported verbatim; EDGES authored — k=2 nearest-neighbour links per vertex for the meshes, explicit square loops for the trench floor. `Object_3D_Data.asm` has no edge tables.
  - Rationale: the cited source carries vertex tables only; the AVG draw-list connectivity is not recoverable by object name from the disassembly present (confirmed: 0 references to `Obj_Tie_Fighter` et al. in `StarWars.asm`). A geometry-derived wireframe is the faithful, in-scope substitute. Aligns with Han Solo's blocking Delivery Finding.
  - Severity: minor
  - Forward impact: edge connectivity is geometric, not cabinet-exact; Reviewer + Wave 1 should eyeball rendered silhouettes. Recovering the exact draw list is candidate future polish.
- **Leading (0,0,0) object anchor dropped — render vertices only**
  - Spec source: tests/core/models.test.ts (no-orphan-vertices test) + TEA "render vertices only" contract
  - Spec text: "no orphan vertices (every vertex is referenced by an edge)"
  - Implementation: dropped each table's leading (0,0,0) anchor; exported only drawn vertices. (Object_8 and the trench have no such anchor — ported whole.)
  - Rationale: the anchor is the object centroid/reference, not a drawn point; keeping it would create center-spoke edges or an orphan vertex. Dropping yields a clean wireframe satisfying the no-orphan contract.
  - Severity: trivial
  - Forward impact: none.
- **Authentic raw cabinet coordinates kept (no normalisation)**
  - Spec source: Delivery Findings — TEA Improvement (non-blocking)
  - Spec text: "DEV should consider normalising each model to a consistent unit scale"
  - Implementation: kept the exact signed-16-bit coordinates; no per-model scaling.
  - Rationale: maximally faithful port; scale belongs with world placement in Wave 1/2 via the Math Box. Symmetry/coplanarity invariants are scale-invariant, so this is safe and reversible.
  - Severity: trivial
  - Forward impact: Wave 1+ applies per-model scale when placing models in the world.
- **CUBE retained; render.ts left drawing the Wave 0 placeholder**
  - Spec source: context-story-8-2.md, AC-2
  - Spec text: "Export models for use by Wave 1 (8-3) and beyond"
  - Implementation: exported the `MODELS` registry; did NOT rewire `src/shell/render.ts` to draw the authentic models — it still spins `CUBE`.
  - Rationale: story scope is the data port; choosing which model renders where (with what transforms) is Wave 1 (8-3). Removing CUBE would break the render shell's build.
  - Severity: minor
  - Forward impact: 8-3 wires `MODELS` into render/sim and can retire `CUBE`.

### Reviewer (audit)
- **TEA: edge well-formedness, not authentic edge values** → ✓ ACCEPTED by Reviewer: correct — the cited source has no edge tables; testing well-formedness is the only honest contract. Verified 0 references to the object labels in `StarWars.asm`.
- **TEA: vertex counts as lower bounds + symmetry** → ✓ ACCEPTED by Reviewer: lower-bound + Y-symmetry is robust to the anchor decision and scale-invariant; stronger than an exact count would be.
- **TEA: test at `tests/core/models.test.ts`** → ✓ ACCEPTED by Reviewer: matches the existing `tests/core/math3d.test.ts` convention; tsconfig includes `tests`.
- **Dev: edges authored (nearest-neighbour), not ported** → ✓ ACCEPTED by Reviewer: forced by the source. Geometry-derived wireframe is the faithful, in-scope substitute. Visual fidelity vs the cabinet draw list is flagged for Wave-1 review (see Delivery Findings) — accepted, not a blocker.
- **Dev: leading (0,0,0) anchor dropped** → ✓ ACCEPTED by Reviewer: the anchor is a centroid, not a drawn point; dropping it yields a clean orphan-free wireframe. Sound.
- **Dev: raw cabinet coordinates kept (no normalisation)** → ✓ ACCEPTED by Reviewer: maximally faithful; scale belongs with Wave-1 placement. Scale disparity (Death Star vs TIE) is noted for downstream — accepted.
- **Dev: CUBE retained; render.ts unchanged** → ✓ ACCEPTED by Reviewer: render wiring is Wave-1 (8-3) scope; CUBE is actively used by the render shell, so not dead code. Correct call for a foundation story.

No undocumented deviations found — every spec divergence was logged by TEA/Dev before review.