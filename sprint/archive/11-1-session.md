---
story_id: "11-1"
jira_key: ""
epic: "11"
workflow: "tdd"
---
# Story 11-1: Near-plane line clipping in the wireframe renderer

## Story Details
- **ID:** 11-1
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** tdd
- **Epic:** 11 (star-wars 3D-vector render pipeline)
- **Points:** 3
- **Priority:** p1
- **Stack Parent:** none (independent feature)

## Technical Context

**Problem:** The wireframe renderer (`wireframe.ts` drawWireframe) discards any edge with an endpoint at or behind the near plane (z = -NEAR). When `project()` returns null for a point behind the plane, the current code (`if (!pa || !pb) continue`) drops the entire edge. This causes geometry straddling the camera plane — notably the Death Star surface and the trench — to collapse into degenerate triangles.

**Solution:** Implement parametric line clipping. For edges where one endpoint is in front of the near plane and the other is behind (or on) it:
1. Calculate the parametric intersection: `t = (-NEAR - za) / (zb - za)`
2. Lerp the edge to the crossing point: `point(t) = a + t * (b - a)`
3. Project and draw only the clipped segment

**Scope:** Modify `star-wars/src/shell/render/wireframe.ts`. The same clipping logic is shared with the contact sheet (`tools/contactSheet.ts`), so verify both render correctly.

**Reference:** See `star-wars/docs/adr/0001-3d-vector-render-pipeline.md` (Part A: Near-plane clipping).

## Acceptance Criteria
- An edge with one endpoint in front of and one behind the near plane is clipped to z=-NEAR and drawn to the crossing point (not dropped)
- Edges fully behind the near plane draw nothing; edges fully in front are unchanged (no regression)
- The crossing point uses the correct parametric intersection; unit tests cover both-behind, both-in-front, straddling, and endpoint-exactly-on-plane cases
- The Death Star surface and trench render as receding surfaces (no longer triangles), eyeballed in the dev server (:5273) and the model contact sheet
- Determinism preserved; npm run build clean and tests green

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-29T18:38:21Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-29T18:12:45Z | 2026-06-29T18:14:55Z | 2m 10s |
| red | 2026-06-29T18:14:55Z | 2026-06-29T18:23:21Z | 8m 26s |
| green | 2026-06-29T18:23:21Z | 2026-06-29T18:27:57Z | 4m 36s |
| review | 2026-06-29T18:27:57Z | 2026-06-29T18:38:21Z | 10m 24s |
| finish | 2026-06-29T18:38:21Z | - | - |

## SM Assessment

**Strategic read (Thrawn):** This is the keystone of epic 11 — Part A of ADR 0001. The
defect is precisely understood: `if (!pa || !pb) continue` in `drawWireframe` treats
"project returned null" (point behind the near plane) as "drop the whole edge," which
amputates any geometry straddling the camera and renders the Death Star surface and
trench as degenerate triangles. The fix is a small, well-bounded parametric clip to
z=-NEAR before projection. Low architectural risk, high visual payoff.

**Scope is clean and contained.** Single primary file (`src/shell/render/wireframe.ts`)
with one known shared consumer: the model contact sheet (`tools/contactSheet.ts`). That
shared surface is the one anticipated blocker — both call sites must be verified, since a
change to drawWireframe ripples into the contact-sheet preview grid the team uses to
eyeball model shape/scale.

**TDD is the correct workflow.** The clip math has crisp, enumerable cases —
both-in-front (unchanged), both-behind (drawn nothing), straddling (clipped), and the
boundary case of an endpoint exactly on z=-NEAR. These are textbook for a failing-test-
first approach. Han Solo (TEA) should drive the RED phase from the four cases named in
the acceptance criteria, with the parametric intersection `t=(-NEAR-za)/(zb-za)` as the
property under test.

**Routing:** Phased TDD. Handoff to TEA for the red phase. No impediments anticipated.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** Behavioral change to a pure geometry routine with crisp, enumerable cases —
exactly the AC-named set (both-in-front, both-behind, straddling, endpoint-exactly-on-plane).

**Test Files:**
- `star-wars/tests/shell/wireframe.test.ts` — rewrote the misleading `skips edges
  straddling the near plane` test (it asserted the OLD drop-the-edge behaviour with loose
  `>0, <12` bounds that pass for both 4 and 8 segments) into precise clipping assertions,
  and added a dedicated `drawWireframe near-plane clipping` suite.

**Tests Written:** 7 (5 new RED drivers + 2 regression guards), plus the tightened cube test.
Mapped to the 5 ACs.

**RED drivers (currently failing — verified by testing-runner, run 11-1-tea-red):**
- `clips straddling edges of a model instead of dropping them` — CUBE at z=-1.2: expects **8**
  segments (4 front-face whole + 4 clipped struts); got 4 (struts dropped).
- `clips a straddling edge to the near plane instead of dropping it` — single front→behind
  edge, expects 1 segment ending at the projected cut point; got 0.
- `clips a straddling edge regardless of which endpoint is behind` — reversed vertex order,
  expects 1; got 0. Proves the clip handles the behind-endpoint on either side.
- `clips an edge whose endpoint sits exactly on the near plane` — boundary case (z=-NEAR,
  t=1), expects 1; got 0.
- `is deterministic — identical inputs produce identical clipped segments` — expects length 1
  and segment-equality across two runs; got 0.

**Regression guards (passing now — must stay green):**
- `strokes one segment per edge when the whole model is in front` (12 segments).
- `leaves an edge fully in front of the near plane unchanged` (1 segment, exact pixels).
- `draws nothing for an edge fully behind the near plane` (0 segments).
- `project` suite + `GLOW_FOR` suite untouched.

**Status:** RED (5 failing / 372 passing) — all failures are pure assertion errors
(expected N, got M), no compile/import errors. Confirmed by testing-runner.

**Test strategy notes (for Dev):**
- Expected cut-point pixels are derived from a guard-free `screenOf()` helper (`transform()`
  + project()'s exact NDC→pixel map), because project() rejects z=-NEAR. This pins the clip
  to the plane EXACTLY — a fudge-by-epsilon implementation will miss `toBeCloseTo`/equality.
- `connects()` matches a segment's two endpoints order-independently, so the moveTo/lineTo
  direction is free — only the clipped geometry is asserted.
- See the **Delivery Finding** below: do not re-call `project()` on the cut point.

### Rule Coverage

| Rule (typescript.md) | Applicable? | Test / Note |
|----------------------|-------------|-------------|
| #4 null/undefined handling | **Yes** — the bug itself | `project()→null` for behind-plane endpoints is the exact path under test; all 5 clip tests exercise it |
| #8 test quality | **Yes** | Self-checked: every test has a meaningful assertion; no vacuous `assert(true)`/`let _=`; no new `as any` (only the pre-existing canvas-stub `as unknown as` cast remains) |
| #1 type-safety escapes | N/A | no `as any`/`@ts-ignore` introduced |
| #2/#3 generics & enums | N/A | no new types or enums |
| #5 module/declaration | N/A | no new modules; ESM imports unchanged |
| #6 React/JSX | N/A | no `.tsx` |
| #7/#11 async & error handling | N/A | pure synchronous geometry, no promises/throws |
| #9 build/config | N/A | no tsconfig change |
| #10/#12 input-validation & perf | N/A | no user input / hot-path bundle change |

**Rules checked:** 2 of 2 applicable lang-review rules have coverage.
**Self-check:** 0 vacuous tests found (rewrote 1 imprecise pre-existing test into precise assertions).

**Handoff:** To Dev (Yoda) for GREEN — implement near-plane clipping in
`src/shell/wireframe.ts`; verify the model contact sheet (`tools/contactSheet.ts`) eyeballs
correctly since it shares this routine.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `star-wars/src/shell/wireframe.ts` — replaced the drop-the-whole-edge logic
  (`if (!pa || !pb) continue`) with near-plane clipping. Each edge's two world-space
  endpoints are classified against the plane (`z <= -NEAR` = in front / drawable); a
  behind-plane endpoint is clipped to the parametric crossing
  (`t = (-NEAR - za)/(zb - za)`, lerped, Z pinned to the plane) before projection.
  Edges fully behind the plane are still dropped; edges fully in front are unchanged.
  - Extracted `toScreen()` — the NDC→pixel map project() already used — so the clip can
    project a cut point sitting exactly on `z=-NEAR` (a Z project() rejects). `project()`'s
    public contract (null for points at/behind the camera) is **unchanged** — verified by
    the untouched `project` suite.
  - Added private `clipToNear(p, q)` for the crossing. ~25 lines net; no new imports, no
    new runtime deps.

**Approach:** Followed ADR 0001 Part A and TEA's delivery finding exactly. The clip is pure,
synchronous, deterministic geometry in the shell — no DOM/time/random, core/shell boundary intact.

**Tests:** 377/377 passing (GREEN) — the 5 near-plane clipping tests now pass, 0 regressions.
**Build:** `tsc --noEmit && vite build` clean, 0 type errors. (verified by testing-runner, run 11-1-dev-green)
**Branch:** `feat/11-1-near-plane-clipping` (pushed to origin).

**Shared consumer:** `tools/contactSheet.ts` calls `drawWireframe` directly (no clip logic of
its own), so it inherits the fix automatically — no separate change needed.

**Self-review:**
- [x] Wired into the shared renderer used by both the game and the contact sheet.
- [x] Follows project patterns (pure math helpers, narrow shell-only function).
- [x] All testable ACs met (clip straddle / drop-behind / unchanged-front / exact-on-plane /
      determinism / clean build). The two **visual** ACs — Death Star surface + trench render
      as receding surfaces, eyeballed in the dev server and the model contact sheet — are
      manual checks outside the headless suite; flagged for the Reviewer's eyeball pass.
- [x] No error handling needed beyond the degenerate-case classification (covered by tests).

**Handoff:** To Reviewer (Obi-Wan Kenobi) for code review.

## Subagent Results

Only `preflight` and `rule_checker` are enabled in `workflow.reviewer_subagents`; the
other seven are disabled via settings and pre-filled as Skipped. Their domains were
assessed directly by the Reviewer (tagged in the assessment).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 377/377 green, tsc+vite clean, 0 smells | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Reviewer assessed boundaries directly ([EDGE]) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Reviewer assessed directly ([SILENT]) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Reviewer assessed test quality directly ([TEST]) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Reviewer assessed comments directly ([DOC]) |
| 6 | reviewer-type-design | No | Skipped | disabled | Reviewer assessed types directly ([TYPE]) |
| 7 | reviewer-security | No | Skipped | disabled | Reviewer assessed directly ([SEC]) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Reviewer assessed complexity directly ([SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | findings | 3 (1 new Low, 2 pre-existing Low) | confirmed 1, downgraded 2 (rationale below) |

**All received:** Yes (2 enabled returned; 7 disabled pre-filled as Skipped)
**Total findings:** 1 confirmed-new (Low), 2 pre-existing (Low, downgraded with rationale), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

The shipped code (`src/shell/wireframe.ts`) carries **zero** findings from any specialist or
my own trace. The clip is correct, deterministic, well-wired, and boundary-clean. The only
NEW finding is a cosmetic `readonly` nit on a test-internal helper (Low). No Critical/High.

**Data flow traced:** model vertices → `transform(orient) + pos` (world space) →
front/behind classification against `z=-NEAR` → behind-plane endpoints replaced by
`clipToNear()` cut → `toScreen()` → `ctx.moveTo/lineTo`. Safe: every point reaching the
perspective divide has `z <= -NEAR`, so `w = -z >= 1` — the near-plane divide-by-~0 blow-up
that the missing clip used to dodge by dropping edges can no longer occur.

**Wiring verified:** `drawWireframe` is the shared draw path for BOTH the in-game renderer
(`render.ts:137/144/151/153/160` — Death Star surface, towers, trench, exhaust port, TIEs)
and the contact sheet (`contactSheet.ts:107`). The fix reaches exactly the surface+trench
geometry the ACs name. `project()`'s three other callers (`render.ts:207/235/266`,
single-point crosshair/laser/spark, each guarded `if (!x) return`) are unaffected — the
refactor preserved `project()`'s null-behind-camera contract byte-for-byte (the `project`
suite passes untouched).

### Observations (8 — issues and verifieds)

- `[VERIFIED]` **Clip math correct across all four AC cases** — evidence: `wireframe.ts:77-89`.
  straddle either direction → `clipToNear` substitutes the behind endpoint; both-front →
  full edge; both-behind → `continue`; endpoint exactly on `z=-NEAR` → classified front
  (`<=`) and drawn via `toScreen`. All proven by `tests/shell/wireframe.test.ts` (7 cases).
- `[EDGE]` *(specialist disabled — assessed directly)* `[VERIFIED]` **No divide-by-zero in
  `clipToNear`** — evidence: `wireframe.ts:45-48`. It fires only on a genuine crossing
  (one endpoint `<= -NEAR`, one `> -NEAR`), so `q[2] !== p[2]` and the denominator is
  non-zero; the comment documents the precondition. The degenerate "front-endpoint exactly
  on plane + partner behind" case yields `t` such that the cut equals the on-plane point — a
  zero-length segment (a dot), not a NaN or crash.
- `[TYPE]` `[RULE]` **`connects(seg: number[], …)` should be `readonly number[]`** at
  `tests/shell/wireframe.test.ts:42` — `seg` is never mutated and its sibling params are
  already `readonly [number, number]`. Matches typescript.md Rule #2 (missing readonly).
  **NEW, Low, non-blocking.** Recommended trivial fix; does not affect shipped code.
- `[RULE]` **Pre-existing `ctx as unknown as CanvasRenderingContext2D`** at test line 21 —
  the standard node canvas-stub idiom (present in `develop`, verified via `git show`). Matches
  Rule #1 but **not introduced by this diff**; downgraded to Low. A `DrawCtx` interface would
  remove the cast but widens `drawWireframe`'s public signature — out of scope for a clip bug.
- `[RULE]` **Pre-existing `p![0]`/`p![1]` non-null assertions** in the untouched `project`
  suite (test lines 57-58; lines 30-31 in `develop`). Matches Rule #1; **not introduced by
  this diff**; downgraded to Low.
- `[SILENT]` *(disabled — assessed directly)* `[VERIFIED]` **No swallowed errors / silent
  fallbacks** — evidence: `wireframe.ts:77-91`. The single `continue` is a deliberate,
  commented cull of fully-behind edges, not an error swallow; no try/catch, no empty catch,
  no `?? fallback`.
- `[SEC]` *(disabled — assessed directly)* `[VERIFIED]` **No security surface** — evidence:
  `wireframe.ts` consumes only in-process typed `Vec3`/`Mat4`; no user input, `JSON.parse`,
  network, `eval`, or `innerHTML`. Pure render math.
- `[SIMPLE]` *(disabled — assessed directly)* `[VERIFIED]` **Minimal, no over-engineering** —
  evidence: two small pure helpers (`toScreen` factored out of `project` to avoid duplicating
  the NDC→pixel map; `clipToNear` for the lerp), ~25 net lines, no new deps. Pre-existing
  per-edge re-transform of shared vertices is unchanged (not introduced here; out of scope).
- `[DOC]` *(disabled — assessed directly)* `[VERIFIED]` **Comments accurate** — evidence:
  `wireframe.ts:31-48` doc-comments correctly describe the guard-free `toScreen`, the
  `q[2] !== p[2]` precondition, and the `z=-NEAR` pinning. No stale/misleading comments.
- `[TEST]` *(disabled — assessed directly)* `[VERIFIED]` **Tests are meaningful, not vacuous**
  — evidence: exact count assertions (`toBe(8/1/0)`) independent of the pixel oracle, plus
  order-independent endpoint checks and a determinism `toEqual`. Minor: `screenOf` mirrors
  production `toScreen`, but the independent count assertions and the `project` suite's
  hard-coded `toBeCloseTo(50)` anchor the convention, so a shared-formula bug would still be
  caught. Acceptable.

### Rule Compliance (typescript.md + star-wars boundary rules)

| Rule | Scope in diff | Verdict |
|------|---------------|---------|
| #1 type-safety escapes | impl: none. tests: 2 pre-existing (cast L21, `p!` L57-58) | shipped code compliant; test items pre-existing Low |
| #2 generic/interface (readonly) | `connects` seg param | 1 NEW Low (`readonly number[]`); all other params correctly readonly (Vec3/Mat4/Model3D) |
| #3 enums | none | N/A |
| #4 null/undefined | `project()` guard preserved; clip uses explicit front/back test, no `||`/`??` misuse | compliant |
| #5 module/declaration | `import type` used for Mat4/Vec3/Model3D; bundler resolution | compliant |
| #6 React/JSX | none | N/A |
| #7/#11 async/error | none (pure sync) | N/A |
| #8 test quality | new helpers concrete, no `as any` in assertions | compliant |
| #9 build/config | tsc strict on, vite clean | compliant |
| #10/#12 input-validation/perf | no user input; no barrel/dynamic-import/hot-path JSON | compliant |
| #13 fix-regressions | refactor introduced no new escapes | compliant |
| Boundary: core purity | shell imports from core only; no core→shell | compliant |
| Boundary: shell determinism | `toScreen`/`clipToNear` pure — no Date/random/DOM | compliant |

### Devil's Advocate

Suppose this code is broken. Where would it hide? First, the classification asymmetry: the
clip calls a vertex "front" at `z <= -NEAR`, yet `project()` rejects that same `z == -NEAR`
as null. A careless reader could "fix" the inconsistency by making them match — and reintroduce
the bug, because the cut point ALWAYS lands exactly on `z=-NEAR`; if the clip rejected the
plane like `project()` does, every clipped segment would vanish again. The current split is
deliberate and load-bearing; the `toScreen`-vs-`project` separation is what makes it work, and
the exactly-on-plane test pins it. Second, a malicious/degenerate model: NaN vertex coords make
both `aFront` and `bFront` false (`NaN <= -NEAR` is false), so the edge is silently dropped
rather than crashing — defensive, though untested (acceptable: models are static authored data).
Third, an edge with both endpoints between the camera and the near plane (`-NEAR < z < 0`, too
close but in front of the eye) is dropped — correct, since none of it is in the drawable half-
space; the segment never reaches `z=-NEAR`. Fourth, performance under stress: the loop re-
transforms shared vertices once per incident edge — but that was equally true before (two
`project()` calls per edge), so no regression, and segment counts are in the hundreds. Fifth,
what would a confused user (the next dev, on story 11-2) misread? The two visual ACs (surface
and trench as receding planes) are NOT proven by the headless suite — they're asserted by
construction (correct clip math + confirmed wiring into `render.ts`). A real visual regression
(e.g., wrong glow, wrong orient) would slip past these unit tests. That risk is inherent to the
"no 3D engine, eyeball in dev" project and is explicitly an eyeball step in the AC; I flag it as
a non-blocking delivery finding rather than a code defect. Nothing here rises to Critical/High.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.

## Delivery Findings

No upstream findings at setup.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): The clipped endpoint lands EXACTLY on z=-NEAR, where
  `project()` returns null (its guard is `p[2] >= -NEAR`). The clip branch must project the
  cut point through the math box (`transform()` then the same NDC→pixel map project() uses)
  or via a guard-relaxed projection — NOT by re-calling `project()` unchanged on the cut
  point, which would drop the very segment it just clipped. Affects `src/shell/wireframe.ts`
  (the drawWireframe clip branch). *Found by TEA during test design.*

### Dev (implementation)
- No upstream findings during implementation. (TEA's clip-projection finding was applied:
  extracted `toScreen()` so the cut point projects through the math box without project()'s
  guard; project()'s null-behind-camera contract is unchanged.)

### Reviewer (code review)
- **Improvement** (non-blocking): `connects(seg: number[], …)` should be `seg: readonly number[]`.
  Affects `tests/shell/wireframe.test.ts` (line 42 — never mutated; matches typescript.md Rule #2).
  Trivial one-word fix; shipped code unaffected. *Found by Reviewer during code review.*
- **Gap** (non-blocking): The two visual ACs (Death Star surface + trench render as receding
  surfaces) are proven by construction (correct clip math + confirmed wiring into `render.ts`),
  not by the headless suite. Affects nothing in code — recommend an eyeball pass in the dev
  server (`:5274`) and the model contact sheet (`/models.html`, G=scale, Space=pause) before/at
  finish to close the ACs. *Found by Reviewer during code review.*
- **Question** (non-blocking): Story text/AC references `src/shell/render/wireframe.ts` and port
  `:5273`; the real path is `src/shell/wireframe.ts` and the star-wars dev port is `:5274`. Affects
  `sprint` story/context text for 11-1 (and forward to 11-2) — worth correcting so later stories
  reference the right path/port. *Found by Reviewer during code review.*

## Design Deviations

No deviations from spec at setup.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- No deviations from spec.

### Dev (implementation)
- No deviations from spec.

### Reviewer (audit)
- **TEA — "No deviations from spec."** → ✓ ACCEPTED by Reviewer: verified — rewriting the loose
  pre-existing straddle test into an exact `toBe(8)` assertion implements the story's required
  behavior change; not a spec divergence.
- **Dev — "No deviations from spec."** → ✓ ACCEPTED by Reviewer: verified — extracting `toScreen()`
  and `clipToNear()` and classifying with `z <= -NEAR` is the natural implementation of ADR 0001
  Part A; `project()`'s public contract is preserved (project suite green). No undocumented
  divergence found in the diff.