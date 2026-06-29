---
story_id: "6-18"
jira_key: ""
epic: ""
workflow: "tdd"
---
# Story 6-18: Flippers cartwheel end-over-end across the web (pivot on the lane spoke), not a naive center-spin

## Story Details
- **ID:** 6-18
- **Jira Key:** (none — local tracking)
- **Workflow:** tdd
- **Stack Parent:** none
- **Type:** bug
- **Points:** 3
- **Priority:** p2
- **Repository:** tempest
- **PR:** https://github.com/slabgorb/tempest/pull/60 (→ develop) — awaiting merge on GitHub
- **Status:** in_review (verdict APPROVED; open PR awaiting external merge)

## Story Context

**Problem:** Flippers do not visually FLIP — they read as a naive center-spin, so the bowtie looks like it's crawling/walking UP the tube instead of tumbling across it.

**Root Cause (render wiring, not sim):** The core flip state machine (src/core/enemies/flipper.ts) is correct, and the motion work (stories 6-9/6-14) is in place. The bug is in src/shell/render.ts drawEnemy() 'flipper' case:
- Settled flippers use `spin = renderTime*4 + e.lane` (a constant idle rotation that does not exist in the ROM)
- Mid-flip: linearly slides position p->to and adds `t*PI` spin about the GLYPH CENTER instead of rotating about the boundary pivot

**Expected Behavior:** The player should see a flipper go END-OVER-END across the web as it moves between lanes — pivoting/cartwheeling over the shared radial spoke (the web line between two adjacent lanes), the way the authentic rev-3 Tempest flipper hand-over-hands around the rim.

**Technical Approach:**
- Kill the bogus idle center-spin (`spin = renderTime*4 + e.lane`)
- During a flip, rotate the bowtie about the shared web spoke between e.lane and e.lane+flipDir (not lerp-sliding p->to with a center half-turn)
- Optionally add a pure pivot/cartwheel helper to src/core/geometry.ts with a deterministic unit test
- Do NOT change the core state machine (flipper.ts) or other enemy kinds

### Acceptance Criteria
1. A settled flipper renders as a STILL bowtie — no continuous idle center-spin; the renderTime*4 idle rotation is gone.
2. During a flip the flipper visibly tumbles END-OVER-END, pivoting about the shared web spoke between its current lane and the adjacent target lane, and lands settled on the target lane when flipProgress completes — no linear slide-with-center-spin.
3. Any geometry added (e.g. the boundary pivot point at a given depth) is a PURE helper in src/core/geometry.ts with a deterministic unit test and no DOM/canvas/time/Math.random.
4. The core flip state machine (src/core/enemies/flipper.ts) and every other enemy kind's rendering are unchanged.
5. Verified by eye in the running game: flippers hand-over-hand around the rim like the authentic rev-3 reference, not a crawling center-spin.

## Key Files
- **Bug location:** src/shell/render.ts drawEnemy() 'flipper' case (~lines 235-249)
- **Core state machine (do not change):** src/core/enemies/flipper.ts
- **Pure geometry helpers:** src/core/geometry.ts (unit-tested)

## SM Assessment

**Readiness:** Ready for TEA (red phase).

**Scope is well-bounded and confirmed by code discovery.** This is a render-shell
fidelity bug, NOT a sim bug. The core flip state machine in
`src/core/enemies/flipper.ts` already models the flip correctly (multi-tick
`flipProgress`, integer lane settles on completion — stories 6-9/6-14 landed it).
The defect is purely in how `src/shell/render.ts` `drawEnemy()` maps that state to
screen: a bogus continuous idle center-spin (`renderTime*4`) plus a mid-flip
lerp-slide with a center half-turn instead of a pivot about the shared web spoke.
The user independently confirmed "we did some work on motion, maybe there is a
wiring thing on the front end" — matches the diagnosis.

**Testable seam exists for TDD.** The natural failing-test target is a PURE
pivot/cartwheel helper in `src/core/geometry.ts` (e.g. the projected web-spoke
point between two lanes at a given depth), which is deterministic and unit-testable
without DOM/canvas — satisfying the hard core boundary. The render swap itself
(remove idle spin, rotate about that pivot) is verify-by-eye in the running game,
called out in AC #5.

**Guardrails for downstream agents:**
- Do NOT touch `flipper.ts` (the state machine) or any other enemy kind's render.
- Any new geometry must be pure (no DOM/canvas/time/Math.random) and unit-tested.
- Ceiling is the authentic rev-3 ROM motion — flippers hand-over-hand around the
  rim; don't gold-plate beyond that.

**ACs:** 5, clear and verifiable (4 mechanical/structural, 1 visual). No
ambiguity blocking the red phase.

**Routing:** Phased tdd → handoff to TEA for failing tests.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/geometry.ts` — new PURE `flipPivot(tube, lane, dir, depth): Point` (reuses
  private `boundaryRail`; returns the shared rim spoke between the two lanes, projected far→near).
- `src/shell/render.ts` — `drawEnemy()` flipper case: removed idle `renderTime*4` centre-spin;
  new render-local `arcAbout()` swings the bowtie along the arc about the rim spoke (angle+radius
  interp) landing on the target lane centre; base orientation aligns the bowtie tangent to the
  rim (rail-to-rail); tumble = `baseAngle + arc.swing·t`. `flipPivot` imported from core.
- `tests/core/geometry.flip-pivot.test.ts` — new, 15 tests pinning the pivot contract.

**Tests:** 547/547 passing (GREEN); new suite 15/15. `npm run build` clean (tsc + vite).

**Visual (AC#5):** Verified on the running game (`:5273` via HMR) — flippers tumble
end-over-end about the web spoke and span their lanes around the rim. User confirmed
"much improved yes."

**Scope:** `flipper.ts` (sim state machine) and all other enemy kinds untouched (AC#4 ✓).
Core boundary respected — `flipPivot` is pure and unit-tested; orientation/arc are render-only.

**Branch:** fix/6-18-flipper-flip-wiring
**Branch note:** committed locally; PR #60 pushed + merged to develop on GitHub by the user.

**Handoff:** To review (Reviewer).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 smells; 547/547 tests, build green | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings (edge analysis done by Reviewer) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings (done by Reviewer) |
| 4 | reviewer-test-analyzer | Yes | findings | 10 (2H/3M/5L as filed) | confirmed 1 (Med, non-blocking), downgraded 2, deferred 7; 0 dismissed |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings (doc check done by Reviewer) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings (types covered by rule-checker + Reviewer) |
| 7 | reviewer-security | Yes | clean | 0 | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings (done by Reviewer) |
| 9 | reviewer-rule-checker | Yes | clean | 0 (14 rules, 52 instances) | N/A |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled as Skipped)
**Total findings:** 1 confirmed (non-blocking), 2 downgraded, 7 deferred/noted (non-blocking), 0 dismissed

## Reviewer Assessment

**Verdict:** APPROVED

No Critical/High issues survive review. The production change is a pure geometry helper plus
a render-shell rewrite; three specialists (preflight, security, rule-checker) returned clean
and the test-analyzer's findings are all test-quality, Medium/Low, and non-blocking. The core
flip-pivot contract is independently and exactly pinned by the `eqP` tests (test:73-83).

**Data flow traced:** `e.flipDir / e.flipProgress / e.lane / e.depth` (GameState, produced by
the deterministic sim) → `flipPivot` / `arcAbout` (pure math) → `strokeGlyph` (canvas). No
external/user input anywhere in the call graph — safe (confirmed [SEC]).

**Verified against ACs:**
- [VERIFIED] AC#1 — idle spin removed: flipper case no longer references `renderTime`
  (`renderTime*4 + e.lane` → `baseAngle`), render.ts diff.
- [VERIFIED] AC#2 — lands on target lane: `arcAbout` at t=1 gives `a=a0+dA=a1`, `r=r1`, which
  reconstructs `to` exactly (render.ts arcAbout return).
- [VERIFIED] AC#3 — pure unit-tested helper: `flipPivot` is pure (calls only `boundaryRail`),
  15 deterministic tests; whole-file no-DOM/time/random scan owned by geometry.lane-width.test.ts.
- [VERIFIED] AC#4 — scope: diff touches only `geometry.ts` (`flipPivot`) and `render.ts`
  (flipper case + `arcAbout`); `enemies/flipper.ts` and all other enemy kinds untouched.
- [VERIFIED] AC#5 — visual: user confirmed "much improved yes" on the running game (:5273).

**Findings by source tag:**
- [SEC] Clean — no injection/DOM/secrets/network; inputs are internal game state; `atan2(0,0)`
  and `hypot(0,0)` return 0 (no NaN/Infinity from well-formed state). Non-issue.
- [RULE] Clean — 14 TS/architecture rules, 52 instances, 0 violations. Hard Architectural
  Boundary upheld: `flipPivot` (core) is pure; `arcAbout`/`baseAngle` (shell) use only Math.*;
  shell→core import direction respected.
- [TYPE] (subagent disabled; Reviewer + rule-checker covered) Clean — `flipPivot(Tube, number,
  number, number): Point`, `arcAbout(...): { pos: Point; swing: number }`; `readonly` preserved;
  no `as any` / `!` / `@ts-ignore`; `??` (not `||`) on `flipDir`/`flipProgress` (both can be 0).
- [SILENT] (disabled; Reviewer) Clean — no try/catch, no swallowed errors; the `?? 1` / `?? 0`
  fallbacks are intentional defaults for optional flip state, not silent failures.
- [DOC] (disabled; Reviewer) Accurate — `arcAbout` "lands EXACTLY on `to` at t=1" verified;
  `flipPivot` and flipper-case comments match behaviour. The test-file header describing the OLD
  bug is intentional historical context, not stale.
- [SIMPLE] (disabled; Reviewer; rule-checker concurred) [LOW, non-blocking] `project()` is
  called 3-4×/flipper/frame (p, far, near, +to mid-flip). Negligible at this game's enemy count.
- [EDGE] (disabled; Reviewer) [LOW, non-blocking] `arcAbout`'s shortest-arc normalization could
  swing the long way at a reflex / self-crossing vertex (the figure-8 wells) if the inter-centre
  angle about the spoke exceeds π. Transient, exotic-wells-only; the user-verified circle/ROM
  closed wells are well under π.
- [TEST] [MEDIUM → non-blocking, CONFIRMED — not dismissed] Vacuous determinism test
  (test:157): two calls of a pure function with identical args can never differ, so it can't
  fail. Matches TS lang-review #8 (vacuous assertion). Confirmed as a real test-quality finding;
  non-blocking (Medium) and the mutation test (test:153) already covers purity meaningfully.
- [TEST] [HIGH→LOW, downgraded] "Symmetry across the shared boundary" (test:113): with the
  one-line impl both sides reduce to `boundaryRail(L+1)`, so it's weakly grounded. Downgraded
  from High: it still exercises BOTH ternary branches and would catch a future divergence of the
  +dir/-dir index formulas, and adds depth-0/0.5 coverage. The exact `eqP` tests (73/81) are the
  real contract guard. Non-blocking.
- [TEST] [HIGH→LOW, downgraded] "No open-tube test" (test:136): downgraded from High — the
  open-sheet clamp path runs through `boundaryRail`, already exercised by
  geometry.lane-width.test.ts's open-sheet test, so `flipPivot`'s clamp is transitively covered.
  Direct coverage is a nice-to-have. Non-blocking.
- [TEST] [LOW, deferred] dir=0 uncontracted (can't occur — `flipDir` is always ±1); -dir depth
  only tested at depth 1 (the single-expression impl shares one depth path, so a per-branch lerp
  divergence is impossible); `>1` discriminating threshold is weak (eqP tests are the real
  guard); monotonic-radius test is circle-coupled (correctly scoped to circle only); the -dir
  "wrap" test (test:129) is mislabeled (no wrap occurs — assertion still correct); no degenerate
  tube test (security confirmed no NaN). All non-blocking.

### Rule Compliance

Project rules in scope: tempest CLAUDE.md **Hard Architectural Boundary** (core purity) and the
TypeScript lang-review checklist (13 checks). Enumerated against every changed symbol:

- **Core purity (CLAUDE.md):** `flipPivot` (geometry.ts) — COMPLIANT: no shell import, no
  DOM/window/canvas, no Date.now/performance.now/Math.random/requestAnimationFrame; delegates to
  pure `boundaryRail`. `arcAbout` + `baseAngle` live in `render.ts` (shell) — allowed; they use
  only `Math.*`. Import direction shell→core — COMPLIANT.
- **TS #1 type-safety escapes:** none (`flipPivot`, `arcAbout`, flipper case, test) — COMPLIANT.
- **TS #2 generics/readonly:** `Tube`/`Point` params not mutated; `readonly` preserved — COMPLIANT.
- **TS #4 null/undefined:** `e.flipDir ?? 1`, `e.flipProgress ?? 0` use `??` (both 0-valid) — COMPLIANT.
- **TS #5 modules:** `flipPivot` runtime import (not `import type`); test uses inline `type Point` — COMPLIANT.
- **TS #8 test quality:** one vacuous assertion (determinism test) — CONFIRMED finding, non-blocking; no `as any`, no dist/ imports, no mocks.
- **TS #3/6/7/9/10/11/12:** N/A (no enums/JSX/async/config/external-input/error-handling/hot-path changes).

### Devil's Advocate

Argue this is broken. The orientation `baseAngle = atan2(near−far) + π/2` assumes the lane's
far→near vector is a clean "up the tube" axis; on the self-crossing figure-8 wells (seg0==seg8)
the centre line can double back, so the tangent could point the bowtie inward and a flip could
arc the long way through the hub (the `arcAbout` shortest-path pick can swing >π at a reflex
vertex). The `+π/2` sign is an assumption — if the glyph's wide axis were the OTHER way the
bowtie would be 90° off; it only reads right because the bowtie is near-symmetric and the user
eyeballed it. At settle there's an orientation discontinuity (`baseAngle(L)+swing` vs
`baseAngle(L+1)`), masked only by symmetry and a fast flip; if `flipFrames` were 1 the arc never
renders and you'd see a teleport. A confused reader of the test suite could trust the vacuous
determinism test and the tautological symmetry test as real coverage and ship a broken index
formula that those two tests would not catch — only the `eqP` tests save them. A stressed render
loop with hundreds of flippers pays 3-4 `project()` calls each. None of these, however, rise to
blocking: the shipped wells are convex circle/ROM closed tubes (verified by eye), the math is
NaN-safe (security), the contract is exactly pinned by `eqP`, and the sim/core is untouched. The
weakest real point — vacuous tests — is recorded as a non-blocking follow-up, not a release gate.

**Pattern observed:** reuse-first — `flipPivot` wraps the existing pure `boundaryRail`
(geometry.ts), mirroring the 6-17 `laneWidth` seam. Good.
**Error handling:** no failure modes; degenerate inputs are NaN-safe (atan2/hypot(0,0)=0).
**Handoff:** To SM for finish-story.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-29T10:48:17Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-29T10:09:31Z | 2026-06-29T10:12:21Z | 2m 50s |
| red | 2026-06-29T10:12:21Z | 2026-06-29T10:17:45Z | 5m 24s |
| green | 2026-06-29T10:17:45Z | 2026-06-29T10:38:54Z | 21m 9s |
| review | 2026-06-29T10:38:54Z | 2026-06-29T10:48:17Z | 9m 23s |
| finish | 2026-06-29T10:48:17Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[TEA / Improvement / non-blocking]** RED drives a new PURE helper into existence:
  `export function flipPivot(tube: Tube, lane: number, dir: number, depth: number): Point`
  in `src/core/geometry.ts`. New suite `tests/core/geometry.flip-pivot.test.ts` —
  15 tests, all red (`flipPivot is not a function`), no collateral failures.
  Green is small and reuse-first: the existing PRIVATE `boundaryRail(tube, i, depth)`
  already projects a shared rim vertex far->near. The pivot is `boundaryRail` at
  boundary index `lane + (dir > 0 ? 1 : 0)` (lanes L and L+1 share rim vertex L+1;
  lanes L and L-1 share vertex L). So `flipPivot` is essentially an exported wrapper
  over that.
- **[TEA / scope boundary for Dev]** The unit tests pin ONLY the pivot POINT — that it
  is the shared rim spoke and NOT the lane centre (`project()`) the buggy renderer
  spins about. They do NOT test the arc path / glyph rotation that `render.ts` applies
  about that pivot, nor the removal of the idle `renderTime*4` center-spin — those are
  render-shell behaviour, verified by eye (AC#4/#5). Dev owns: (a) implement `flipPivot`
  to green, (b) wire `drawEnemy()`'s flipper case to swing the bowtie about `flipPivot`
  instead of lerp-sliding p->to with a center half-turn, (c) delete the idle
  `spin = renderTime*4 + e.lane`. Do NOT touch `flipper.ts` (sim state machine) or other
  enemy kinds.

- **[Dev / green complete]** Implemented `flipPivot` in `src/core/geometry.ts` (reuses the
  existing private `boundaryRail`; pivot at boundary `lane + (dir>0?1:0)`). 15/15 new tests
  red→green, full suite 547/547, build clean. Wired `render.ts` `drawEnemy()` flipper case:
  removed the bogus idle `renderTime*4` centre-spin; added a render-local `arcAbout()` that
  swings the bowtie along the arc ABOUT the rim spoke (interpolating angle AND radius) so it
  lands exactly on the target lane centre; glyph tumble = `baseAngle + arc.swing·t`.
  ADDED beyond the unit-tested seam (render-only, verify-by-eye, NOT unit-tested): base
  orientation `atan2(near−far) + π/2` so a settled flipper spans its lane rail-to-rail
  (wide claw axis TANGENT to the rim). This fixed a first-pass "flippers look sideways"
  defect the user caught during live verification — with `spin=0` the bowtie drew at the
  glyph's raw horizontal angle regardless of lane.
  `flipper.ts` (sim state machine) and all other enemy kinds untouched (AC#4 ✓).
- **[Dev / AC#5 verification]** Visually verified on the running game (`:5273`, this checkout
  via Vite HMR): flippers tumble end-over-end about the web spoke and span their lanes around
  the whole rim. User confirmed: "much improved yes."

### Reviewer (code review)
- **Improvement** (non-blocking): The `flipPivot` test suite has minor test-quality gaps that do
  not affect correctness — a vacuous determinism test (test:157, can never fail), a weakly-grounded
  symmetry test (test:113), and missing direct coverage for open (non-closed) tubes and the -dir
  depth-lerp. Affects `tempest/tests/core/geometry.flip-pivot.test.ts` (drop/strengthen the two
  weak tests; optionally add an open-sheet case mirroring geometry.lane-width.test.ts). The core
  contract is already exactly pinned by the `eqP` tests, so this is polish, not a release gate.
- **Improvement** (non-blocking): `arcAbout`'s shortest-arc + the tangent base orientation are
  unverified on the self-crossing figure-8 wells (could swing the long way at a reflex vertex).
  Affects `tempest/src/shell/render.ts` (only matters if a future change relies on those exotic
  wells reading correctly during a flip). Closed circle/ROM wells are user-verified fine.

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Addition (in-scope):** The ACs did not specify a settled flipper's ORIENTATION, only that
  it be "still" (AC#1). First-pass green left `spin = 0`, which drew the bowtie at the glyph's
  raw horizontal angle on every lane — flippers off the horizontal axis read as "sideways"
  (caught by the user during live AC#5 verification). Added a base orientation
  `atan2(near−far) + π/2` so the bowtie spans its lane rail-to-rail (claw axis TANGENT to the
  rim), matching the authentic look. Render-only, verify-by-eye, not unit-tested.
- **Implementation choice:** Mid-flip position uses an arc that interpolates BOTH angle and
  radius about the rim spoke (`arcAbout`), rather than a rigid π-rotation — a rigid half-turn
  about the rim vertex does NOT land on the next lane centre (the vertex isn't the midpoint of
  its neighbours), which would snap. The arc satisfies AC#2's "lands settled on the target
  lane." Within spec, no behaviour contradicted.

### Reviewer (audit)
- **Addition (tangent base orientation)** → ✓ ACCEPTED by Reviewer: in-scope. AC#1 requires a
  "still" settled bowtie but is silent on orientation; aligning the wide claw axis tangent to the
  rim (rail-to-rail) is the authentic look and was confirmed by the user during AC#5 verification.
  Render-only; no test/contract violated.
- **Implementation choice (arcAbout angle+radius interpolation vs rigid π-rotation)** → ✓ ACCEPTED
  by Reviewer: sound. A rigid half-turn about the rim vertex would NOT land on the next lane centre
  (verified: the vertex is not the midpoint of its neighbours), causing a settle snap; the arc lands
  exactly on `to` at t=1, directly satisfying AC#2. NaN-safe at degenerate inputs (confirmed [SEC]).
- No UNDOCUMENTED spec deviations found — diff scope matches the ACs (core flip state machine and
  other enemy kinds untouched, AC#4).