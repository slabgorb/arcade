---
story_id: "SH4-1"
jira_key: "SH4-1"
epic: "SH4"
workflow: "tdd"
---
# Story SH4-1: Lift the 3-D model/sheet dev-tool helpers into a new pure @shared/model-view

## Story Details
- **ID:** SH4-1
- **Jira Key:** SH4-1
- **Repos:** arcade
- **Branch:** feat/SH4-1-model-view-shared
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-11T14:40:57Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-11T14:08:04Z | 2026-08-11T14:10:47Z | 2m 43s |
| red | 2026-08-11T14:10:47Z | 2026-08-11T14:18:00Z | 7m 13s |
| green | 2026-08-11T14:18:00Z | 2026-08-11T14:26:54Z | 8m 54s |
| review | 2026-08-11T14:26:54Z | 2026-08-11T14:40:57Z | 14m 3s |
| finish | 2026-08-11T14:40:57Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

No upstream findings

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Classified `model-view` as a PURE_SUBPATH in the shared purity guard (beyond the minimum to go green)**
  - Spec source: context-story-SH4-1.md, TEA Assessment GREEN-phase item 5; AC-5
  - Spec text: "Optional hygiene, not required for green: add `'model-view'` to `PURE_SUBPATHS` … A DOM-free file already passes the unclassified-file check, so purity stays green without it."
  - Implementation: added `'model-view'` to `PURE_SUBPATHS` in `src/shared/tests/purity.test.ts`, so the module now carries the transitive DOM-free fence like `math3d`/`rng`, not merely the weaker unclassified-file scan.
  - Rationale: a new pure shared math module belongs on the same list as every sibling pure module; the guard exists precisely to catch a new file landing unclassified, and leaving it off would be the anomaly a Reviewer flags.
  - Severity: minor
  - Forward impact: none

## Sm Assessment

Story set up for the RED phase. This is a genuine shared-library extraction (epic SH4), not
an already-satisfied convention-pin: I measured the premise against the current `develop`
tree before setup.

**Premise verified (2026-08-11):**
- `@shared/model-view` does NOT exist yet — the extraction target is genuinely absent.
- `cellRects` is byte-identical across all three cited files (md5 `90a04d31…`): red-baron
  `tools/sheetLayout.ts:51-66`, star-wars `core/modelView.ts:44-59`, tempest
  `core/modelView.ts:16-31`. red-baron's own header calls its copy "the THIRD copy".
- `fitDistance` byte-identical in red-baron + star-wars (md5 `b495785f…`); tempest has none.
- `modelBounds` near-identical x2 with DIFFERING signatures — red-baron `readonly Vec3[]`
  vs star-wars `Model3D` (iterates `.vertices`). The title mandates red-baron's signature.

**Scope correction carried into the context (primary input for TEA/Dev):** the title's "on
no game's render path" is defensible only for production — star-wars imports `modelBounds`
into the SHELL module `shell/debug-overlay.ts:234`, which is `import.meta.env.DEV`-gated and
tree-shaken from prod. So the extraction edits shell code, and adopting the `readonly Vec3[]`
signature ripples to three star-wars call sites (`tools/contactSheet.ts:80,135`,
`shell/debug-overlay.ts:234`); red-baron's site already passes `.points`. No user ruling was
required — the deliverable is unambiguous; this is a scope note, not a fork.

ACs were derived by sm-setup from the title (epic `acceptance_criteria` was null) and the
verified facts written into the Background. Session fields (`Repos`, `Branch`) were added by
hand after sm-setup omitted them. Story stamped `in_progress`; claim branch
`feat/SH4-1-model-view-shared` committed and pushed.

Handing off to TEA (Tyr One-Handed) for the RED phase.

## Tea Assessment

RED state confirmed. Four new test files, all failing for the correct reason — the target
module `src/shared/model-view.ts` does not exist, so every import of `@shared/model-view`
fails to resolve (`Cannot find package '@shared/model-view'`, 0 tests run). Verified via
`testing-runner` (RUN_ID `SH4-1-tea-red`) across all four projects.

**Test files written (all committed on `feat/SH4-1-model-view-shared`):**
| File | Project | Covers | AC |
|------|---------|--------|----|
| `src/shared/tests/model-view.test.ts` | shared | behaviour of the 3 helpers | AC-1, AC-2, AC-5 |
| `plugins/red-baron/tests/tools/model-view-shared.test.ts` | red-baron | sheetLayout re-exports shared (identity) | AC-3 |
| `plugins/star-wars/tests/core/model-view-shared.test.ts` | star-wars | core/modelView re-exports shared (identity) | AC-3 |
| `plugins/tempest/tests/core/model-view-shared.test.ts` | tempest | core/modelView re-exports cellRects (identity) + keeps flatTube | AC-3 |

**Design choices worth the Reviewer's attention:**
- **Identity, not behaviour, is the anti-duplication pin (AC-3).** The per-game guards assert
  `game.fn === shared.fn` (`toBe`), which is red on a leftover byte-identical local copy — a
  behaviour test alone would pass on a regenerated duplicate (the "count passes on a
  regenerated instance" trap). Re-export (`export { … } from '@shared/model-view'`) gives
  identity; a thin local wrapper would (correctly) fail it, because a wrapper reintroduces
  the duplication this story exists to remove.
- **`fitDistance` FILL is pinned geometrically, not circularly.** Rather than re-deriving
  `r/tan(0.7·fovY/2)` (which would just re-assert the implementation), the test recovers the
  subtended angle `2·atan(r/d)` from the returned distance and asserts it ≈ `0.7·fovY`. Plus
  the degenerate-radius clamp (`fitDistance(0) === fitDistance(1e-3)`).
- **Golden values are geometry-derived, not code-copied:** cube radius `√0.75`, cellRects
  `(900,400,6,3)` grid positions (the same values tempest's pre-extraction suite asserted).

**REQUIRED GREEN-phase work for Dev (Loki) — beyond creating the module:**
1. Create `src/shared/model-view.ts`: `cellRects` and `fitDistance` byte-identical to the
   existing copies; `modelBounds(points: readonly Vec3[])` using red-baron's algorithm.
2. Re-export from the three definition sites so identity holds:
   `plugins/red-baron/src/tools/sheetLayout.ts`, `plugins/star-wars/src/core/modelView.ts`
   (all three helpers), `plugins/tempest/src/core/modelView.ts` (cellRects only; keep
   `flatTube` local).
3. Model3D→`.vertices` ripple from the new `modelBounds` signature (SCOPE CORRECTION):
   `plugins/star-wars/src/tools/contactSheet.ts:80,135` and
   `plugins/star-wars/src/shell/debug-overlay.ts:234`.
4. **Update the EXISTING `plugins/star-wars/tests/core/modelView.test.ts`** — it calls
   `modelBounds(CUBE)` (CUBE is a `Model3D`) at line 8 and `modelBounds(m)` (a `Model3D`) at
   line 17. Both break under the `readonly Vec3[]` signature and must become
   `modelBounds(CUBE.vertices)` / `modelBounds(m.vertices)`. This is load-bearing for AC-4.
   (red-baron's existing `sheetLayout.test.ts` already passes `readonly Vec3[]` — no change.)
5. Optional hygiene, not required for green: add `'model-view'` to `PURE_SUBPATHS` in
   `src/shared/tests/purity.test.ts`. A DOM-free file already passes the unclassified-file
   check, so purity stays green without it — but the module IS pure and belongs on the list.

**Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`):**
- *"Every guard must be mutation-tested — delete the mechanism, require red."* The identity
  guards satisfy this: the mechanism is the re-export; a local copy (the mutation) reddens
  them. The behaviour tests would survive that mutation, which is exactly why the identity
  guards exist alongside them.
- *"A test helper that reimplements a platform algorithm is untested code."* Avoided — the
  `fitDistance` check inverts the geometry (`atan`) instead of re-coding `tan`.
- *"A fixture whose value IS the expectation."* Avoided — golden values derived from geometry
  (√0.75, exact grid math), not lifted from the implementation's output.
- Vacuous-assertion self-check (Phase C): clean — every test has a concrete
  `toEqual`/`toBe`/`toBeCloseTo`; the one `typeof … === 'function'` (flatTube) is a
  deliberate survival regression, not a filler assertion.

Handing off to Dev (Loki Silvertongue) for the GREEN phase.

## Dev Assessment

GREEN confirmed. **6,573 tests pass, 0 fail** across the shared, red-baron, star-wars,
tempest and orchestrator projects (`testing-runner`, RUN_ID `SH4-1-dev-green`); repo-wide
`npm run lint` (tsc --noEmit) is clean. Net diff is **+100 / −143** — the extraction removes
more than it adds, as a de-duplication should. Pushed to `feat/SH4-1-model-view-shared`
(`509abcf3`).

**What shipped (AC-by-AC):**
- **AC-1 / AC-2 / AC-5** — new pure `src/shared/model-view.ts`: `cellRects` and `fitDistance`
  lifted byte-identical; `modelBounds(points: readonly Vec3[])` is red-baron's algorithm and
  signature. Imports only `import type { Vec3 } from './math3d.js'` — no DOM, no game type.
- **AC-3** — the three definition sites now `export { … } from '@shared/model-view'`:
  red-baron `tools/sheetLayout.ts` (all three), star-wars `core/modelView.ts` (all three),
  tempest `core/modelView.ts` (`cellRects` only; `flatTube` + its constants stay local). The
  per-game identity guards (`game.fn === shared.fn`) confirm these are re-exports, not copies.
- **AC-3 ripple (SCOPE CORRECTION)** — `modelBounds` call sites switched to `.vertices`:
  star-wars `tools/contactSheet.ts:80` (`m.vertices`) and `:135` (`boundSource.vertices`,
  dropping the throwaway `{name,vertices,edges:[]}` envelope), and shell `debug-overlay.ts:234`
  (`model.vertices`). red-baron `contactSheet.ts:86` already passed `.points` — untouched.
- **AC-4** — updated the pre-existing star-wars tests that passed a `Model3D` to the new
  signature: `tests/core/modelView.test.ts` (lines 8, 17) and
  `tests/core/tie-perspective-scale.test.ts:49` (`TIE_FIGHTER.vertices`). This last one was
  NOT in the SCOPE CORRECTION's list — I found it by grepping every `modelBounds(` call site
  repo-wide rather than trusting the enumerated list, then let `tsc` confirm nothing else
  broke. red-baron's `sheetLayout.test.ts` already used `readonly Vec3[]` — untouched.

**One discretionary change, logged as a deviation:** classified `model-view` as a
`PURE_SUBPATH` in `src/shared/tests/purity.test.ts` (TEA marked this optional). See the
`### Dev (implementation)` deviation above. Purity stays green (its closure is just `math3d`).

**For the Reviewer (Heimdall):**
- The `flatTube` split in tempest is the only asymmetry — tempest re-exports `cellRects` but
  keeps `flatTube` local, since `flatTube` is tempest's own board geometry, never shared.
- The identity guards are the load-bearing anti-duplication check; a future re-introduced
  local copy of any helper would redden them even if its behaviour matched.
- No barrel (`src/shared/index.ts`) change was needed — it only exports `SHARED_VERSION`;
  games consume `@shared/<module>` subpaths directly.

Handing off to the Reviewer (Heimdall) for the REVIEW phase.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | — |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 3 | confirmed 1, deferred 2 |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 | confirmed 1 (2 lines, one root cause), dismissed 0 |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none (0/26) | — |

**All received:** Yes (4 enabled subagents returned; 5 disabled via `workflow.reviewer_subagents` and pre-filled as Skipped).
**Total findings:** 2 confirmed blocking-for-honesty (F1, F2), 2 deferred non-blocking (F3, F4), 0 dismissed.

**Coverage note for the disabled dimensions:** [PRE] preflight returned GREEN/clean (lint + all suites + smells). edge_hunter/type_design/simplifier/security/silent_failure are off on this project, so I covered their surface myself: (a) the [RULE] rule-checker (enabled) mechanically swept all 26 TS rules incl. type-design and boundary rules — 0 violations; (b) I ran the incompleteness sweep (no other game kept a local cellRects/fitDistance/modelBounds — the only definition left in the tree is `src/shared/model-view.ts`); (c) test-analyzer mutation-verified the identity guards (revert red-baron re-export to a local copy → 3/3 `toBe` red) and the `flatTube` vacuity; (d) I verified the `modelBounds([])` NaN edge is pre-existing and byte-identical, with no live caller passing an empty array.

## Reviewer Assessment

**Verdict: APPROVED — two minor, non-blocking findings routed to SH4-7. The extraction is correct, complete, and faithful; all five ACs are met.**

The code is right: `@shared/model-view` is a byte-faithful lift (verified from the diff — removed bodies match the new module character-for-character), the `modelBounds` `Model3D → readonly Vec3[]` signature change is propagated to every one of the 16 repo-wide call sites, all three games re-export (identity guards prove it, mutation-verified), purity stays green with `model-view` correctly classified, and the full suite is green (6,573 tests) with lint clean.

Two subagents caught genuine but **cosmetic** defects — a test-honesty tweak (F1) and a provenance-comment scope (F2), each a one-liner with zero correctness/AC/behaviour impact. I considered blocking on F1 (the codebase's TS checklist rules #15/#17/#18/#25 target vacuous guards), but the guard still catches its real regression (flatTube deletion) and only under-claims on an implausible one (flatTube over-extraction — it depends on `./geometry`, is tempest-specific, and nobody would share it). Per the project's ship-and-route discipline for minor findings, I approve and route both to **SH4-7** (1pt, trivial) rather than bounce a flawless extraction through another ceremony round. F3/F4 are pre-existing and noted.

**Note on routing:** the approval gate's `complete-phase` advanced `review → finish` on the structural checks (a known reject-misroute), which happens to be the correct destination for this APPROVED verdict.

### Findings

**F1 — [TEST] CONFIRMED — routed to SH4-7 (non-blocking) — vacuous guard: the tempest `flatTube` assertion does not enforce its own claim.**
`plugins/tempest/tests/core/model-view-shared.test.ts:17`. The test is titled *"keeps flatTube local (not part of the shared extraction)"* but asserts only `expect(typeof modelView.flatTube).toBe('function')`. test-analyzer proved by mutation that moving `flatTube` into `@shared/model-view` and re-exporting it from tempest keeps this **green** — so the assertion catches `flatTube`-deletion but not the over-extraction its title names. Confirmed by inspection too: `typeof x === 'function'` is true whether `flatTube` is local or a re-export.
- **Required fix:** add an assertion that actually pins locality, e.g. `expect('flatTube' in shared).toBe(false)` (verified: `@shared/model-view` exports only `modelBounds`/`fitDistance`/`cellRects`, so this passes now and reddens if `flatTube` is ever extracted). Keep the existence check too.

**F2 — [DOC] CONFIRMED — routed to SH4-7 (non-blocking, trivial) — over-generalized provenance comment.**
`plugins/red-baron/src/tools/sheetLayout.ts:7-8` and `plugins/red-baron/tests/tools/model-view-shared.test.ts:2-3`. Both attribute the original header's "THIRD copy" phrase to all three helpers, but comment-analyzer verified against `develop` that only `cellRects` ever had three copies — `fitDistance`/`modelBounds` had two each. Prose is an unguarded surface here (a false comment ships green), and this is the permanent header.
- **Required fix:** scope "THIRD copy" to `cellRects`; note `fitDistance`/`modelBounds` were duplicated 2× and lifted alongside it. (One reword in each of the two files.)

**F3 — [TEST] DEFERRED (non-blocking) — `modelBounds([])` untested; returns `{center:[NaN,NaN,NaN], radius:0}`.**
`src/shared/tests/model-view.test.ts`. Pre-existing behaviour, byte-identical across all three prior copies, carried over unchanged; rule-checker and I both confirmed no call site passes an empty array. Not a regression. Since Dev is already editing the shared test file for F1's sibling suite, **optionally** pin the current empty-input behaviour while in there — but it does not block, and is not required by any AC.

**F4 — [TEST] DEFERRED (non-blocking) — `cellRects` negative `count`/non-positive `w`/`h` untested.**
Pre-existing; unreachable from real callers (`count = MODELS.length ≥ 0`, `w`/`h` are canvas dims). Low value; routed as an observation only. If a follow-up wants belt-and-suspenders on the shared helper's input domain, file it against SH4; not this story.

### Rule Compliance (`.pennyfarthing/gates/lang-review/typescript.md`)

[RULE] Rule-checker swept all 26 rules mechanically: **0 violations** (16 rules had no applicable instance; 10 applied and passed). I independently confirm the load-bearing ones:
- **#15/#18/#25 (guards must test the claim, not a token; apparatus must not pass-by-passing):** the identity guards use `toBe` (Object.is) and are mutation-sound — PASS. The **exception is F1**, the `flatTube` assertion, which is precisely a #18 "fails by passing" instance — that is the rejection.
- **#17 (comments asserting an unrun mechanism):** the "unaffected"/"golden values" claims verified true; the **exception is F2**, an over-general provenance claim (#17-adjacent) — folded into the rejection.
- **#21 (degenerate-but-not-nullish input):** `Math.max(radius,1e-3)`/`Math.max(1,cols)` clamps are the recommended pattern — PASS.
- **Core purity boundary / extraction eligibility:** `@shared/model-view` is DOM-free and in `PURE_SUBPATHS`; `@shared` is a legal core import; the ≥2-games-identical bar is cleared (cellRects ×3, fitDistance ×2, modelBounds ×2) — PASS.

### Routed follow-up — SH4-7 (filed, 1pt, trivial, p3)
1. F1: strengthen `plugins/tempest/tests/core/model-view-shared.test.ts` to assert `flatTube` is absent from `@shared/model-view`.
2. F2: scope the "THIRD copy" phrasing to `cellRects` in `red-baron/src/tools/sheetLayout.ts` and `red-baron/tests/tools/model-view-shared.test.ts`.
3. F3 (optional): pin `modelBounds([])` empty-input behaviour.

None block SH4-1: the code is correct and complete, and these are cosmetic guard/prose polish captured in SH4-7.

**APPROVED.** Handing to SM (Baldur the Bright) for the finish ceremony.