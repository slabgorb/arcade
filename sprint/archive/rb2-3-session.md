---
story_id: "rb2-3"
jira_key: "rb2-3"
epic: "rb2"
workflow: "tdd"
---
# Story rb2-3: Enemy biplane render + LOD — draw the 42-vertex model via the transcribed connect-lists, built-in LOD split (42-pt near .PLPNT / 29-pt drone .DRPNT far), bank proportional to turn-rate, through the rb1 scene substrate

## Story Details
- **ID:** rb2-3
- **Jira Key:** rb2-3
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/rb2-3-biplane-render-lod
- **Points:** 3
- **Priority:** p2

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-10T13:22:37Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-10T12:40:16+00:00 | 2026-07-10T12:45:10Z | 4m 54s |
| red | 2026-07-10T12:45:10Z | 2026-07-10T12:59:39Z | 14m 29s |
| green | 2026-07-10T12:59:39Z | 2026-07-10T13:12:09Z | 12m 30s |
| review | 2026-07-10T13:12:09Z | 2026-07-10T13:22:37Z | 10m 28s |
| finish | 2026-07-10T13:22:37Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **Improvement (non-blocking, doc):** The rb2 epic context Background carries a stale guardrail — "red-baron has NO GitHub remote — stories land via a local merge to develop (no push, no PR)." Reality: red-baron *has* a GitHub remote and rb2-2 landed via **PR #1** (`66b1bb4`). The finish flow for rb2-3 should expect a **PR to develop**, not a local merge. Fidelity doc / epic Background should be corrected by the Architect in a follow-up.

### TEA (test design)

- **Gap** (non-blocking): The 42-vertex plane model `.PLPNT` and its 29-vertex drone LOD `.DRPNT` are **not yet transcribed** — rb2-2 transcribed only the connect-LISTS (`DB.MAP/DB.MAR/DB.LNS` → topology.ts); the VERTICES they index live in the PROGRAM ROM `RBARON.MAC:6207-6279` and are still absent. rb2-3 is therefore **data transcription + render**, not render-only. Affects `red-baron/src/core/biplane.ts` (Dev must transcribe all 42 vertices from the `reference/red-baron` quarry — gitignored; read it, commit only the TS). The tests pin the 42/29 counts, the points-0-28 prefix, the golden vertex #12 = (-40,20,-40), and the POINTP signed-byte range, but the remaining 41 vertex values come from the ROM source. *Found by TEA during test design.*
- **Improvement** (non-blocking): flight.ts's `ROLL_SCALE`/`PITCH_SCALE`/`YAW_SCALE`/`ALT_TO_Y` are module-**private**, so the story context's "reuse the scale factors from flight.ts" is not directly importable. The bank tests instead assert parity against the PUBLIC `toAttitude(...).roll`. Affects `red-baron/src/core/biplane.ts` (implement `biplaneBank` via `toAttitude`/`pfrotn`, **not** by duplicating the private `ROLL_SCALE` constant — a copied magic number would drift). *Found by TEA during test design.*

### Dev (implementation)

- **Gap** (non-blocking): `biplane.ts` ships the model + LOD + `renderModel` + `biplaneBank` as pure core functions but is **not yet wired into the runnable cockpit** (`main.ts`) — enemy placement/state + frame-loop wiring is rb2-4. Affects `red-baron/src/main.ts` (rb2-4 composes the model matrix from an enemy world-pos + `rotationZ(biplaneBank(turnRate))`, computes camera depth for `biplaneLOD`, calls `renderModel`, strokes the segments). *Found by Dev during implementation.*
- **Improvement** (non-blocking): The rb1-3 scope-fence in `tests/cockpit-boot.test.ts` ("NO biplane geometry", findings §9 gap #1) is **retired** — its premise (picture-ROM source absent → biplane BLOCKED) was closed by rb2-2 + rb2-3. Affects `red-baron/tests/cockpit-boot.test.ts` (the two-test fence describe block was removed; see the Dev deviation). *Found by Dev during implementation.*
- Confirmed `.DRPNT` = the first 29 of `.PLPNT` against the ROM (`RBARON.MAC:6259` `.DRPNT = P.BACK-DB.PLN`) — no transcription gap.

### Reviewer (code review)

- **Improvement** (non-blocking): `renderModel`'s `model.points[op.point]` is an unguarded indexed access (no `noUncheckedIndexedAccess`); a future caller composing a **mismatched** `BiplaneModel` (points/connect not paired) would hit `undefined` and crash in `scene.ts` `toClip` rather than fail total. Affects `red-baron/src/core/biplane.ts` (rb2-4: only build models via `biplaneLOD`, or add a bounds guard). **Inert today** — both `biplaneLOD` models are correctly paired and the suite asserts the connect↔point bounds. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `src/main.ts`'s comment is now stale — "Still an EMPTY cockpit… no enemy/biplane geometry (blocked on the… later rb2 story)" — the block is closed and `biplane.ts` exists. Affects `red-baron/src/main.ts` (rb2-4 updates the comment when it wires the biplane into the render loop). *Found by Reviewer during code review.*
- **Gap** (non-blocking): neither `renderModel` nor `scene.ts` `projectSegment` **near-plane-clips** a partially-behind edge (one endpoint `w ≤ 0`) — a biplane flown very close to the camera could show a perspective-mirrored stray edge. AC5 only requires the both-endpoints-behind cull, which IS met. Affects `red-baron/src/core/scene.ts` (near-plane clipping is a candidate follow-up; the pre-existing `projectSegment` contract, not new in rb2-3). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the vertex suite golden-checks only 1 of 42 vertices (#12). I independently verified **all 42 exact-match the ROM** (`RBARON.MAC:6212-6256`), so there is no live defect — but the in-repo regression guard is thin. Affects `red-baron/tests/core/biplane.test.ts` (add a few more golden anchors, one per labeled group). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **New module `src/core/biplane.ts` rather than extending `scene.ts` / a new `enemy.ts`**
  - Spec source: context-story-rb2-3.md, "File Targets"
  - Spec text: "Extend src/core/flight.ts or create src/core/enemy.ts to define Enemy aircraft state. Add enemy-render logic to src/core/scene.ts (or a new render module)."
  - Implementation: tests target a dedicated `src/core/biplane.ts` (vertex data `.PLPNT`/`.DRPNT` + `biplaneLOD` + `biplaneBank` + `renderModel`).
  - Rationale: keeps topology.ts's "picture-ROM only" scope and scene.ts's "generic substrate" role clean, and avoids inventing an `Enemy` state type that belongs to rb2-4.
  - Severity: minor
  - Forward impact: rb2-4 owns the `Enemy` state/AI type and wires it into `renderModel`.

- **Render primitive is `renderModel(model, mvp)`; no `Enemy`/placement type is defined here**
  - Spec source: context-story-rb2-3.md, AC-1
  - Spec text: "Enemy aircraft can be positioned in world space and rendered through the rb1 scene substrate."
  - Implementation: `renderModel(model: BiplaneModel, mvp: Mat4)` is the pure render; the caller composes the model matrix (`translation ∘ rotationZ(biplaneBank(turnRate))`). Positioning is demonstrated in the integration tests by composing an MVP, not by a story-owned Enemy type.
  - Rationale: enemy state/placement/AI is rb2-4; rb2-3 delivers the pure render + LOD + bank building blocks.
  - Severity: minor
  - Forward impact: rb2-4 supplies world position + turn-rate and composes the MVP.

- **`LOD_DISTANCE` is a tuning constant; tests assert selection LOGIC, not a magic ROM distance**
  - Spec source: red-baron/docs/red-baron-1980-source-findings.md, §7
  - Spec text: "the full plane = 42 pts (.PLPNT); the drone/distant plane = 29 pts (.DRPNT ...) [ROM-verified vertices & counts; LOD reading inferred]"
  - Implementation: near/far selection is tested relative to the exported `LOD_DISTANCE` threshold (below → full, at/above → drone), not against a specific distance value.
  - Rationale: the ROM pins the near-full/far-drone SPLIT but not the switch distance; hard-coding a magic distance would be false precision.
  - Severity: minor
  - Forward impact: playtest may tune `LOD_DISTANCE`; the split semantics are fixed.

### Dev (implementation)

- **Retired the rb1-3 biplane scope-fence in `tests/cockpit-boot.test.ts`**
  - Spec source: tests/cockpit-boot.test.ts (rb1-3), describe "scope fence: NO biplane geometry (findings §9 gap #1)"
  - Spec text: "ships no biplane geometry module (plane.ts / biplane.ts / plane-points.ts)" — asserted `offenders` == `[]`, plus "no src module imports a biplane geometry model".
  - Implementation: removed the two-test scope-fence describe block and updated the suite header comment; `biplane.ts` is now permitted and is covered by `tests/core/biplane.test.ts`.
  - Rationale: the fence's premise ("the picture-ROM SOURCE ... is ABSENT ... biplane geometry ... explicitly BLOCKED before rb1-3") is now FALSE — rb2-2 closed gap #1 (connect-lists → topology.ts) and rb2-3 is the story that ships the biplane geometry. The fence's own comment scoped it as a temporary block to lift when the gap closed.
  - Severity: minor
  - Forward impact: rb2-4 may import `biplane.ts` into `main.ts` without tripping the removed import-fence.

- **`LOD_DISTANCE` concrete value = 1500 world units**
  - Spec source: red-baron/docs/red-baron-1980-source-findings.md, §7
  - Spec text: "[ROM-verified vertices & counts; LOD reading inferred]" — the split is authentic, the switch distance is not pinned.
  - Implementation: set `LOD_DISTANCE = 1500` (world units), within TEA's tested selection invariants (below → full, at/above → drone).
  - Rationale: plane half-span ~40u against the `HORZ=1000` horizon — a plane beyond ~1500u reads as distant; a defensible default the playtest can retune.
  - Severity: minor
  - Forward impact: playtest may retune the magnitude; selection semantics are unaffected.

### Reviewer (audit)

Every logged deviation reviewed:

- **TEA — new module `src/core/biplane.ts`** → ✓ ACCEPTED by Reviewer: sound separation; keeps topology.ts (picture-ROM) and scene.ts (generic substrate) scopes clean and avoids inventing an rb2-4-owned `Enemy` type.
- **TEA — `renderModel(model, mvp)` primitive, no `Enemy`/placement type** → ✓ ACCEPTED by Reviewer: correct deferral of enemy state/placement to rb2-4; the pure primitive is the right unit for this story.
- **TEA — `LOD_DISTANCE` tunable; tests assert selection logic not magnitude** → ✓ ACCEPTED by Reviewer: the ROM pins the split, not the switch distance (findings §7 "LOD reading inferred"); asserting logic over a magic number is correct.
- **Dev — retired the rb1-3 biplane scope-fence in `cockpit-boot.test.ts`** → ✓ ACCEPTED by Reviewer: the fence's premise (picture-ROM source absent → biplane BLOCKED) is exactly what rb2-2 (connect-lists) + rb2-3 (vertices) closed; the retirement is documented in-place, no dangling references remain, and `biplane.test.ts` more than replaces the coverage. Confirmed by test-analyzer and my own read.
- **Dev — `LOD_DISTANCE` concrete value = 1500** → ✓ ACCEPTED by Reviewer: a defensible, clearly-labelled inferred default (not a transcribed ROM constant); playtest can retune without changing semantics.

- **Reviewer (undocumented deviations found):** none — every spec divergence was logged by TEA/Dev.

---

## Sm Assessment

**Setup complete — routing to RED (TEA / Imperator Furiosa).**

- **Story:** rb2-3 — enemy biplane render + LOD, drawing the 42-vertex model through rb2-2's transcribed connect-lists (`src/core/topology.ts`).
- **Base reconciled:** local `develop` was stale; fetched and fast-forwarded to `origin/develop` (`66b1bb4`), which already contains rb2-2's topology (merged via PR #1). Branch `feat/rb2-3-biplane-render-lod` created off current develop — clean base, no botched merge.
- **Epic context:** sm-setup regenerated `context-epic-rb2.md` and wiped the curated Background (the known clobber trap); restored via `git checkout --`. Curated fidelity/guardrail content intact.
- **Technical approach:** reuse flight.ts scale factors + `flightView` camera, LOD split on depth (`DB.MAP+DB.MAR+DB.LNS` near / `DB.MAR` drone far), decode connect-lists via `decodeOp()`, project through scene substrate, bank via `pfrotn` (PLDELX×8). Enemies stand up as an `Enemy`/`FlightState` twin.
- **ACs:** initial set written; TEA confirms/refines during RED.
- **No Jira** (local tracking only). No blocking PRs. Merge gate clear.

Handing the wheel to Furiosa for the RED phase.

---

## TEA Assessment

**Tests Required:** Yes
**Reason:** 3-pt feature — new model geometry, LOD selection, bank coupling, and projected render. Not a chore.

**Test Files:**
- `red-baron/tests/core/biplane.test.ts` — the full rb2-3 contract against a not-yet-created `src/core/biplane.ts`.

**Tests Written:** 27 tests covering all 6 ACs.
**Status:** RED (failing) — verified by `testing-runner` (RUN_ID rb2-3-tea-red): `biplane.test.ts` fails at import (`Cannot find module '../../src/core/biplane'`), all 9 pre-existing suites still pass (135 tests). No regressions.

**AC coverage:**
| AC | Tests |
|----|-------|
| 1 — positioned & rendered through the substrate | end-to-end render (near 54 / far 30 segments through `sceneProjection`) |
| 2 — LOD 42-near / 29-far | `biplaneLOD` near/far selection, threshold boundary, 54/30 draw budgets, `.DRPNT` = points 0-28 prefix |
| 3 — bank ∝ turn-rate via `pfrotn` | `biplaneBank` parity with player `toAttitude().roll`, ±45° saturation, odd symmetry, monotonicity; banked-vs-level render differs |
| 4 — edges project (pen-down visible, pen-up dark) | `renderModel` one segment per VSBLEV, none per BLANKV; turtle draws from previous pen vertex; connect↔point bounds |
| 5 — behind-eye cull | `renderModel` / integration: model behind eye → 0 segments (no perspective ghost) |
| 6 — tests cover LOD/bank/edges/projection | the suite above, plus data-transcription invariants (counts, golden vertex, POINTP range) |

### Rule Coverage

| Rule (lang-review/typescript.md) | Test(s) | Status |
|------|---------|--------|
| #2 missing `readonly` / immutability | `renderModel` is a pure function — input model untouched; data typed `readonly Point3[]` | failing |
| #4 numeric edge / `??` vs `\|\|` | `biplaneLOD` is total — negative & NaN depth still yield a valid model | failing |
| #8 test quality (meaningful assertions, no `as any`) | self-check pass — removed a redundant `as FlightState`; every test asserts a concrete value/relationship | pass |
| #10 input validation (total on numeric input) | `biplaneLOD(NaN)` / negative depth returns a well-formed model, never crashes | failing |

**Rules checked:** 4 of 4 applicable lang-review rules covered (the rest — React/JSX, async/Promise, module `.js` extensions, error-handling `catch`, enum patterns — are N/A for a pure synchronous data+math module).
**Self-check:** 0 vacuous tests. Removed 1 redundant cast; no `let _ =`, no `assert(true)`, no always-None checks.

**Notes for Dev (The Word Burgers):**
- This is **transcription + render**. Transcribe all 42 `.PLPNT` vertices from `RBARON.MAC:6207-6279` (the gitignored `reference/red-baron` quarry — read it, commit only the TS). `DRONE_POINTS` = `PLANE_POINTS.slice(0, 29)`. The golden anchor: vertex #12 = `[-40, 20, -40]`.
- Implement `biplaneBank` via the PUBLIC `toAttitude`/`pfrotn` — do **not** duplicate flight.ts's private `ROLL_SCALE`.
- `renderModel` is a pen turtle: BLANKV moves `current` dark, VSBLEV emits `projectSegment(prev → current)`; drop segments both endpoints behind the eye. Reuse scene.ts's `projectSegment`.
- LOD concatenation relies on each sub-list opening pen-up (asserted) — don't reorder DB.MAP/MAR/LNS.

**Handoff:** To Dev for implementation (GREEN).

---

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `red-baron/src/core/biplane.ts` (new) — the 42-vertex `.PLPNT` + 29-vertex `.DRPNT` transcription (`RBARON.MAC:6212-6256`), `biplaneLOD`, `biplaneBank`, `renderModel`, and the `BiplaneModel` type.
- `red-baron/tests/cockpit-boot.test.ts` — retired the obsolete rb1-3 biplane scope-fence (see Dev deviation).

**Tests:** 160/160 passing (GREEN) — `biplane.test.ts` 27/27, no regressions. Verified by `testing-runner` (RUN_ID rb2-3-dev-green-2). Build: `tsc --noEmit` + `vite build` clean.
**Branch:** feat/rb2-3-biplane-render-lod — pushed to origin (`af9183f`).

**AC status:** all 6 met.
- AC1 positioned & rendered through the substrate — `renderModel` projects via scene.ts `projectSegment`; integration tests render 54/30 NDC segments.
- AC2 LOD 42-near / 29-far — `biplaneLOD` selects `NEAR_MODEL`/`FAR_MODEL` by depth; `DRONE_POINTS = PLANE_POINTS.slice(0,29)`.
- AC3 bank ∝ turn-rate via `pfrotn` — `biplaneBank` delegates to the player's `toAttitude().roll` (no duplicated `ROLL_SCALE`).
- AC4 pen-down visible / pen-up dark — `renderModel` turtle: BLANKV moves dark, VSBLEV emits `prev→current`.
- AC5 behind-eye cull — `projectSegment` drops both-endpoints-behind edges; integration test → 0 segments.
- AC6 tests cover LOD/bank/edges/projection — plus the data-transcription invariants.

**Notes for Reviewer (Immortan Joe):**
- The 42 vertices are the authentic ROM transcription from `RBARON.MAC:6212-6256`; golden anchor #12 = `[-40,20,-40]` verified. `.DRPNT` = first 29 confirmed against `.DRPNT = P.BACK-DB.PLN` (:6259).
- I edited a test — the rb1-3 scope-fence retirement — see the Dev deviation for the full rationale. No coverage lost (biplane.ts has its own suite).
- `biplane.ts` is a pure core module; main.ts wiring is deferred to rb2-4 (delivery finding).

**Handoff:** To Reviewer for code review.

---

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 160 tests green, tsc + vite build clean, 0 smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — edges covered by me (Devil's Advocate + [EDGE]) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — covered by me ([SILENT]: renderModel first-op guard) |
| 4 | reviewer-test-analyzer | Yes | findings | 5 | confirmed 5 (all non-blocking Med/Low), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — covered by me ([DOC]: stale main.ts comment) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — covered by rule-checker + me ([TYPE]) |
| 7 | reviewer-security | Yes | clean | none | N/A — no external input surface; indices bounded by ROM constants |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — covered by me ([SIMPLE]: module is minimal) |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed 1 (Low, inert), dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned, 5 disabled-skipped)
**Total findings:** 6 confirmed (all non-blocking), 0 dismissed, 0 deferred

### Rule Compliance

Mapped to `.pennyfarthing/gates/lang-review/typescript.md` (13 checks), verified exhaustively by rule-checker and cross-read by me over every exported symbol (`PLANE_POINTS`, `DRONE_POINTS`, `BiplaneModel`, `LOD_DISTANCE`, `NEAR_MODEL`, `FAR_MODEL`, `biplaneLOD`, `biplaneBank`, `renderModel`):

- **#1 type-safety escapes** — PASS. Zero `as any` / `as unknown` / `@ts-ignore` / non-null `!`. `renderModel` uses a `current !== null` guard instead of the tempting `projectSegment(current!, …)` (biplane.ts:165).
- **#2 generics/readonly** — PASS. Every exported datum is `readonly Point3[]`; `BiplaneModel` fields both `readonly`; `renderModel` returns `readonly SceneSegment[]`. No `Record<string,any>` / `Function` type.
- **#3 enums** — N/A (no enums).
- **#4 null/undefined** — one finding (below): `model.points[op.point]` is an unchecked indexed access (no `noUncheckedIndexedAccess`). `biplaneLOD` total for NaN/negative/Infinity; no `||`/`??` misuse anywhere.
- **#5 modules/imports** — PASS. Inline `type` modifiers, standalone `import type { Mat4 }`, extensionless relative imports — matches topology.ts/scene.ts/flight.ts and `moduleResolution: bundler`.
- **#6 React/JSX** — N/A (pure .ts, no DOM). **#7 async** — N/A (synchronous). **#10 input validation** — N/A (no external input). **#11 error handling** — N/A (total, no throw/catch). **#13 fix-regression** — N/A (new feature).
- **#8 test quality** — PASS. src-not-dist imports, no `.only`/`.skip`, no `as any`, meaningful assertions. (test-analyzer flags robustness *gaps*, not violations — recorded as non-blocking.)
- **#9 build config** — PASS. `strict: true`; compiles clean; no config changed.
- **#12 performance/bundle** — PASS. Direct named imports (no barrel), no dynamic import, no hot-path JSON.stringify in source.

### Devil's Advocate

Assume this is broken. Where does it bite? **(1)** `renderModel` trusts `op.point` to be in range — `model.points[op.point]` is typed `Point3` but is `undefined` at runtime for an out-of-bounds index, and the `current !== null` guard does NOT catch `undefined` (`undefined !== null` is `true`), so a mismatched `BiplaneModel` crashes in `scene.ts` `toClip`'s destructure rather than failing total — contradicting the file's own "rather than crashing" framing. Today this is unreachable: `biplaneLOD` only ever returns the two correctly-paired models, and the suite pins `maxIndex(DB_MAR) < 29` and `< 42` for the near lists. But `BiplaneModel` is a public interface with two independently-public fields, so rb2-4 could pair a bad model. **(2)** A biplane flown right up to the camera in a future dogfight will have vertices straddling the eye plane; `projectSegment` only culls *both*-behind edges and mirrors a single behind endpoint — so a very close plane can flash a stray mirrored line. AC5 only demands the both-behind cull (met), but the artifact is real and reachable once rb2-4 flies enemies close. **(3)** `LOD_DISTANCE = 1500` is a guess, not a ROM constant — if the world/enemy scale differs from my assumption, the drone LOD could trigger too early/late or never. **(4)** The vertex table: I proved 42/42 match the ROM, but the *suite* pins only vertex #12 — a later "correction" to any of the other 41 (sign flip, transposed axis) within the legal byte range would pass CI silently. **(5)** `biplaneBank` fabricates a `FlightState` with `altitude: 0` (below `ALT_MIN`); harmless because `toAttitude` ignores altitude for roll — but if `toAttitude` ever starts reading/validating altitude, `biplaneBank` breaks quietly. **(6)** `NEAR_MODEL`/`FAR_MODEL` are shared module objects, `readonly`-typed but not frozen (matching topology.ts convention) — a buggy caller could mutate `model.connect` at runtime and corrupt every subsequent render. **Verdict of the exercise:** none of these are *reachable defects in the shipped rb2-3 code* — they are latent/forward risks. Each is recorded as a non-blocking finding or delivery finding for rb2-4. The story's contract (model + LOD + bank + both-behind cull) is correct and faithful.

## Reviewer Assessment

**Verdict:** APPROVED

rb2-3 delivers an authentic, correct enemy-biplane model + LOD + bank + render. No Critical or High issues. All six findings are non-blocking (Medium/Low) — test-hardening, a stale comment, and latent robustness of a not-yet-consumed public API.

**Headline verification — [VERIFIED] the ROM transcription is exact.** I parsed all 42 `POINTP X,Y,Z` vertices from `reference/red-baron/RBARON.MAC:6212-6256` and diffed them against `PLANE_POINTS` — evidence: byte-for-byte **EXACT MATCH, 42/42** (anchor #12 = `[-40,20,-40]`; `.DRPNT` boundary confirmed — ROM[28] last front vertex, ROM[29] first back-face, so `slice(0,29)` = `.DRPNT = P.BACK-DB.PLN`). This is the check the suite can't fully make, and it passes.

**Subagent findings incorporated (tags plain-text per approval gate):**
- [SEC] Clean — pure math, no I/O/network/auth/untrusted input; `model.points[op.point]` indices come only from ROM constants, bounds enforced by the suite. Nothing to fix.
- [RULE] renderModel `model.points[op.point]` unguarded indexed access (biplane.ts:164-165) — LOW, **inert** (biplaneLOD models correctly paired; suite asserts bounds). Recorded as a delivery finding for rb2-4. Not dismissed — downgraded to Low because no reachable path hits it and adding a runtime check today would be dead code.
- [TEST] Five test-quality gaps — all non-blocking: (a) NaN-depth test accepts either LOD (biplane.test.ts:166) — impl is deterministically drone, should pin 29; (b) only vertex #12 golden-checked (biplane.test.ts:86) — I verified all 42 independently, so no live defect; (c) "identical coupling" test is a delegation guard, not a math oracle (by design; π/4-saturation + monotonicity are the oracle); (d) no first-op-draw / one-endpoint-behind render test (biplane.test.ts:232); (e) scope-fence removal legitimate.
- [DOC] Stale `src/main.ts` comment ("no enemy/biplane geometry … blocked") — LOW, delivery finding for rb2-4.
- [EDGE] Covered myself (edge-hunter disabled): `biplaneLOD` total over NaN/negative/Infinity (verified); `renderModel` first-op-draw guarded; partial-behind edge is a known `projectSegment` limitation (delivery finding).
- [SILENT] Covered myself (silent-failure-hunter disabled): the only silent path is a first-op-draw dropping its segment — inert, real lists open pen-up (asserted).
- [TYPE] Covered by rule-checker (type-design disabled): `readonly` discipline throughout; no stringly-typed APIs; `BiplaneModel` is a clean interface. Only note is the un-cross-validated points/connect pairing ([RULE] above).
- [SIMPLE] Covered myself (simplifier disabled): module is minimal — data + three small pure functions; `biplaneBank` reuses `toAttitude` rather than duplicating `ROLL_SCALE`; no dead code or over-engineering.

**Additional [VERIFIED] (evidence + rule compatibility):**
- [VERIFIED] `biplaneBank` reuses the player coupling, no duplicated constant — biplane.ts:144-146 delegates to `toAttitude(...).roll`; parity + ±45° saturation tested. Complies with the "single source of truth" intent.
- [VERIFIED] `biplaneLOD` total — biplane.ts:130-132 `depth < LOD_DISTANCE` gives NEAR for negative, FAR for NaN/Infinity (no `||`/`??`). Rule #4 compliant.
- [VERIFIED] No type-safety escapes — grep across biplane.ts + both test files: zero `as any`/`@ts-ignore`/non-null `!`. Rule #1 compliant.
- [VERIFIED] `readonly` on every exported symbol and `renderModel`'s return — biplane.ts:42,93,100-103,160. Rule #2 compliant.

**Data flow traced:** enemy world placement (rb2-4) → model matrix (`translation ∘ rotationZ(biplaneBank(turnRate))`) → `MVP = projection · view · model` → `biplaneLOD(depth)` picks vertex set + connect-list → `renderModel` walks the pen turtle → `projectSegment` → NDC `SceneSegment[]` (both-behind edges dropped). Safe: all indices ROM-bounded; output finite for in-front models; pure/deterministic.

**Pattern observed:** small pure functions over `readonly` ROM data, heavily documented with source citations — consistent with topology.ts/scene.ts/flight.ts. Good pattern, correctly followed.

**Handoff:** To SM for finish-story.