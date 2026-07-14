---
story_id: tp1-32
jira_key: tp1-32
epic: tp1
workflow: tdd
---
# Story tp1-32: THE FRAMING clips the tube off-screen — tp1-31's ZADJL screen-Z translate is over-scaled; keep the whole well inside the viewport for all 16 wells

## Story Details
- **ID:** tp1-32
- **Jira Key:** tp1-32
- **Workflow:** tdd
- **Stack Parent:** none

## SM Assessment

**Nature of the impediment:** A framing regression, not a new feature. The shipped tp1-31
(PR #115, tempest v1.0.13) introduced a per-well ZADJL screen-Z translate in
`src/core/geometry.ts`, but the ROM→canvas scale is too large — the near rim (and the
Claw riding on it) is pushed partly off-screen. Confirmed by play-test, visible even at
level 1 and worse for the deeper wells.

**Root cause (from the story):** `screenZ = -ROM_ZADJ[well] * (16+H) * RING_SCALE / ROM_SCREEN_FACTOR`
with `RING_SCALE = 300/112` and `ROM_SCREEN_FACTOR = 256`. The tube's near radius (~300) already
nearly fills the ±360 half-box of the 720-unit scene; the computed shift (~80 at level 1, up to
~94–147 at the deepest wells) drives the near rim past ±360 and it clips.

**Constraint the implementer must honor:** Stay within #115's shipped architecture — `screenZ`
lives in the core Tube/camera. Do NOT reintroduce the separate `framing.ts` approach from the
closed-unmerged PR #116. Preserve ROM intent (wells sit high/low in frame), just at a magnitude
that never clips the playfield, and re-confirm the negative-ZADJL majority still reads as the
ROM's 'MOVE UP'.

**Why tdd (not trivial):** Though only 2 points, the story ships with a crisp, pure-geometry
testable invariant — for all 16 wells, the near-ring extents (min/max x,y) after `screenZ` stay
within ±360 (with a small safety margin), computable over `Tube.screenZ` + ring points with no
canvas. That invariant is exactly what a RED test should pin. The residual magnitude 'feel' is a
play-test tune, out of scope for the automated test.

**Routing decision:** Phased tdd → hand to TEA (RED) to author the failing invariant test.
Merge gate clear (no open tempest PRs). No blockers anticipated.


## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-14T21:20:22Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-14T20:41:27Z | 2026-07-14T20:43:53Z | 2m 26s |
| red | 2026-07-14T20:43:53Z | 2026-07-14T21:00:20Z | 16m 27s |
| green | 2026-07-14T21:00:20Z | 2026-07-14T21:09:12Z | 8m 52s |
| review | 2026-07-14T21:09:12Z | 2026-07-14T21:20:22Z | 11m 10s |
| finish | 2026-07-14T21:20:22Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Improvement** (non-blocking): the fix is a design choice among the story's three options; the RED suite accepts ALL of them. Recommend the simplest that preserves ROM per-well proportions — a UNIFORM down-scale of the screenZ magnitude (raise the effective `ROM_SCREEN_FACTOR` / apply a headroom factor), so every well keeps its relative high/low position. Binding constraint: well shape 12 (level 12) — near-ring reaches y=+300 AND has the largest +screenZ (+147); to clear ±340 a uniform factor must be ≤ ~0.27 (screenZ → ~27% of current). A clamp preserves more of the mild wells' shift. Affects `src/core/geometry.ts` (the `screenZ` formula at ~line 264 / `RING_SCALE` / `ROM_SCREEN_FACTOR`). *Found by TEA during test design.*
- **Question** (non-blocking): if Dev chooses a CLAMP that equalizes levels 1 & 2 (both ±300 wells capped to the same value), `tests/core/tp1-31.camera-slide.test.ts`'s level1→2 "still travelling" easing assertion may need a verify-phase re-seat to a guaranteed-nonzero-delta transition; the level7→8 sign-change case is clamp-robust and unaffected. Affects `tests/core/tp1-31.camera-slide.test.ts`. *Found by TEA during test design.*
- **Gap** (non-blocking): the invariant is scoped to the near RING + a 20-unit margin; it does NOT guarantee the CLAW glyph (a fixed-size shape anchored to the rim that extends OUTWARD past it) fully fits — that is the play-test tune the story defers. Even at screenZ=0 a ±300 ring sits ~60 units from the ±360 edge, so a large claw can still graze it. If the Claw still clips after the framing fix, a follow-up (shrink claw footprint or the base ring) may be needed. Affects `src/shell/render.ts` (claw draw) / `src/core/geometry.ts` (`CLAW_FOOTPRINT_FRACTION` / `RING_SCALE`). *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): the framing MAGNITUDE is now a subtle 25% of the ROM target (`VIEWPORT_SAFE_SCALE = 0.25`) — this is the story's deferred play-test tune. There is headroom to raise it toward ~0.27 before the deepest well (shape 12) re-clips the ±340 band (at 0.25 the worst well lands at 336.8). Recommend the user play-test the framing and dial `VIEWPORT_SAFE_SCALE` to taste. Affects `src/core/geometry.ts` (`VIEWPORT_SAFE_SCALE`). *Found by Dev during implementation.*
- **Question** (non-blocking): RESOLVED TEA's camera-slide concern — the uniform rescale kept adjacent levels 1 & 2 distinct, so `tests/core/tp1-31.camera-slide.test.ts` stayed GREEN with no verify-phase re-seat needed (the clamp risk did not materialize). *Found by Dev during implementation.*
- **Gap** (non-blocking): TEA's claw-fit gap remains open by design — the invariant covers the near RING, not the CLAW glyph. At 0.25 the shifts are small (≤~37 units), so the claw is far less likely to clip than under shipped #115, but a visual play-test should confirm the Claw specifically stays fully on-screen across the deep wells. Not visually verified by Dev (pure-geometry change; the multi-checkout dev-port hazard makes an ad-hoc screenshot unreliable). Affects `src/shell/render.ts` (claw draw). *Found by Dev during implementation.*

### Reviewer (code review)

- **Improvement** (non-blocking): `tests/core/tp1-32.framing-viewport.test.ts:94-98` (the "safety margin is real and small" case) asserts only relationships among the test file's own constants (`MARGIN`/`SCENE_HALF`/`SAFE_HALF`) — it never calls production code, so it cannot detect a `geometry.ts` regression. Confirmed as a rule #8 (test-quality) match but downgraded to LOW/non-blocking: it is an intentional, honestly-named anti-cheese guard (it CAN fail if a future editor sets `MARGIN=0` to weaken the invariant — not an `assert(true)` tautology), and the real viewport coverage lives in the two sibling `it` blocks that do call `tubeForLevel`. Optional cleanup: fold it into a module-load assert or a comment. Affects `tests/core/tp1-32.framing-viewport.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the framing "feel" (VIEWPORT_SAFE_SCALE=0.25) and the Claw's exact on-screen fit remain a human play-test tune (per TEA + Dev findings). Recommend the user play-test the deep wells (esp. level 12) before considering the magnitude final; there is headroom to ~0.27. Affects `src/core/geometry.ts` (`VIEWPORT_SAFE_SCALE`). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Re-seated tp1-31.screen-z.test.ts's two exact-magnitude pins to scale/clamp-invariant properties**
  - Spec source: context-story-tp1-32.md — "TESTABLE INVARIANT"
  - Spec text: "for every one of the 16 wells, the near-ring extents … stay within the scene box (±360 …). … The remaining 'feel' of the magnitude is a play-test tune."
  - Implementation: replaced `screenZ === -ZADJ·(16+H)·S/256` (toBeCloseTo,9) and the exact spot literals (+80.357, -93.75) with per-well DIRECTION (`sign(screenZ) === sign(ROM target)`), an upper bound (`|screenZ| ≤ |ROM target|`, i.e. a reduction never an amplification), the zero-well pin, and the WELSEQ remap tripwire re-expressed via sign. Tests 3/4/5 (world-unit misconversion, single zero well, level-17 wrap) kept verbatim — they survive as-is.
  - Rationale: the story declares the shipped magnitude OVER-SCALED and the corrected magnitude a play-test tune; a bit-exact pin forbids every valid fix and would strand Dev (Dev makes tests pass, cannot move goalposts). The re-seated properties hold under all three offered fixes (uniform rescale / ring shrink / clamp).
  - Severity: minor
  - Forward impact: the exact per-well ROM-relative magnitude PROPORTIONS are no longer bit-pinned anywhere — intended (magnitude is now a tune). Reviewer/play-test confirms the fix preserves ROM high/low intent.

- **Re-seated tp1-31.camera-slide.test.ts slide start/target from raw ROM bytes to the audited tube.screenZ**
  - Spec source: context-story-tp1-32.md — "TESTABLE INVARIANT" (magnitude is a tune)
  - Spec text: "The remaining 'feel' of the magnitude is a play-test tune."
  - Implementation: `SCREEN_Z.level{1,2,7,8}` now derive from `tubeForLevel(n).screenZ` instead of `(192*40*300)/(112*256)` etc.; updated the header comment that previously forbade deriving from tube.screenZ.
  - Rationale: the ZADEST 1/8-per-frame EASE is independent of the magnitude; the raw-byte literals encode the over-scaled value the fix removes. Deriving keeps the ease coverage green under the tune, and the magnitude is now guarded by tp1-32 + tp1-31.screen-z sign checks, so no net coverage is lost. Direction coverage preserved: 1→2 stays same-sign, 7→8 still crosses zero.
  - Severity: minor
  - Forward impact: NARROW — if the fix is a CLAMP that collapses adjacent levels 1 & 2 to an equal value (both ±300 wells hitting the same cap), the level1→2 "still travelling" easing assertion could false-fail (zero delta). The level7→8 sign-change case is clamp-robust. Flagged as a Delivery Finding for Dev/verify.
### Dev (implementation)

- **Chose UNIFORM screenZ damping (VIEWPORT_SAFE_SCALE = 0.25) over a per-well clamp**
  - Spec source: context-story-tp1-32.md — "FIX (design choice for the implementer …)"
  - Spec text: "raise ROM_SCREEN_FACTOR / reduce the effective scale so the max shift leaves headroom; and/or shrink the base tube (RING_SCALE); and/or clamp the translate to a viewport-safe band. Preserve the ROM intent (wells sit high/low in frame)…"
  - Implementation: a single uniform factor 0.25 multiplying `tube.screenZ` in `geometry.ts` (a sanctioned "reduce the effective scale" option), NOT a clamp and NOT a RING_SCALE change.
  - Rationale: uniform is the minimal change (one constant); it preserves every well's ROM high/low ORDERING and direction exactly (a clamp flattens the deep wells onto a common cap, losing proportions); and it keeps the re-seated `tp1-31.camera-slide` siblings GREEN (a clamp collapses levels 1 & 2 to equal values → breaks the level1→2 ease, exactly as TEA flagged). Binding well = shape 12 (rim +300 + largest +target) needs factor ≤ ~0.27 to clear ±340; 0.25 chosen for a few units of self-margin (worst well → 336.8).
  - Severity: minor
  - Forward impact: framing is now SUBTLE (25% of the ROM target — e.g. level-1 circle shifts +20 vs the old +80); direction/ordering intact so ROM intent is preserved but gentle. Headroom exists to raise `VIEWPORT_SAFE_SCALE` toward ~0.27 if a play-test wants more pronounced framing — the story's deferred magnitude tune. No sibling-story assumptions changed.

### Reviewer (audit)

- **TEA Deviation 1 (re-seat tp1-31.screen-z exact-magnitude pins → scale/clamp-invariant)** → ✓ ACCEPTED by Reviewer: the story explicitly declares the shipped magnitude over-scaled and the corrected magnitude a play-test tune, so a bit-exact pin is no longer valid. The re-seated assertions (direction = sign of ROM target; `|screenZ| ≤ |target|`; zero-well; remap-via-sign) preserve every enduring intent and hold under any of the three offered fixes. Tests 3/4/5 kept verbatim. Verified GREEN and non-vacuous.
- **TEA Deviation 2 (re-seat tp1-31.camera-slide start/target from raw bytes → tube.screenZ)** → ✓ ACCEPTED by Reviewer: the ZADEST ease is magnitude-independent, and the raw-byte literals encoded exactly the over-scaled value being removed. Deriving is sound because the magnitude is now independently guarded by tp1-32 + tp1-31.screen-z (rule-checker [RULE] concurred: documented dynamics-only rescope, not a tautology; the suite still drives real `stepGame` transitions). The flagged CLAMP-collapse risk did not materialize — Dev chose uniform rescale, siblings stayed GREEN. No verify-phase re-seat needed.
- **Dev Deviation (uniform VIEWPORT_SAFE_SCALE=0.25 over a per-well clamp)** → ✓ ACCEPTED by Reviewer: uniform is a sanctioned "reduce the effective scale" option, is the minimal change (one constant), preserves every well's ROM high/low ORDERING and direction exactly, and — unlike a clamp — keeps the re-seated camera-slide siblings green. Value independently re-derived: binding well shape 12 needs factor ≤ ~0.2716; 0.25 lands the worst well at 336.83 (≤ ±340 with ~3 units of self-margin). The "subtle framing" forward impact is the story's explicit play-test tune, with documented headroom to ~0.27.
- No UNDOCUMENTED deviations found: the diff surface is exactly geometry.ts + the three test files + the citation reanchor; no `framing.ts`, no shell, no other core change.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** n/a — the story ships a crisp, pure-geometry testable invariant.

**Test Files:**
- `tests/core/tp1-32.framing-viewport.test.ts` (NEW) — the viewport-clip invariant: for every one of the 16 wells, every near-ring rim point lands within ±340 (the ±360 phosphor half-box minus a 20-unit stroke/headroom margin) on BOTH axes after `tube.screenZ`, plus three guards (x-untouched, margin real+small, per-well direction preserved / not zeroed).
- `tests/core/tp1-31.screen-z.test.ts` (RE-SEATED) — two exact-magnitude pins → scale/clamp-invariant direction + ROM-target upper bound + remap-via-sign. See Deviation 1.
- `tests/core/tp1-31.camera-slide.test.ts` (RE-SEATED) — slide start/target derived from `tube.screenZ` instead of raw ROM bytes. See Deviation 2.

**Tests Written:** 5 new cases (2 RED invariants + 3 green guards); 3 sibling cases re-seated across 2 files.
**Status:** RED (2 invariant cases failing — 33 rim violations across 8 wells, worst level 12 = |y| 447.3 vs ±340). Guards + both re-seated suites green; full suite 1165/1167 (only the 2 intended REDs fail); citations gate GREEN.

**The RED, concretely:** under shipped #115, levels 1,2,3,5,6,10,12,13 push the near rim past ±360 in Y (X never clips — `screenZ` is a y-only translate). A correct fix reduces / clamps `tube.screenZ` in `src/core/geometry.ts` so all 16 wells clear ±340, WITHOUT flipping the per-well direction (guard 3) and WITHOUT reintroducing PR #116's `framing.ts`.

### Rule Coverage

Language: TypeScript. Checklist: `.pennyfarthing/gates/lang-review/typescript.md`. This is a pure-geometry unit-test story (no new types/constructors, no async, no I/O, no user input, no React), so most checklist sections are N/A; the live one for a RED phase is #8 (test quality).

| Rule | Test(s) / Evidence | Status |
|------|--------------------|--------|
| #8 test quality — imports from `src/` not `dist/` | all three files import `../../src/core/geometry` | pass |
| #8 test quality — no `as any` in assertions | none used | pass |
| #8 test quality — meaningful, non-vacuous assertions | every `it` asserts real extents/signs; violation list asserted `toEqual([])` with a named message; guards assert bounds not truthiness | pass |
| #4 null/undefined — no `||` where `0`/`""` valid | uses `Math.sign`/`Math.abs`/numeric compares only | pass |
| #1 type-safety escapes; #2 generics; #3 enums; #5 modules; #6 React; #7 async; #9 build; #10 input-validation; #11 errors | no such code introduced (pure numeric geometry test) | n/a |

**Rules checked:** the 2 applicable TS rules (#8, #4) have coverage; the other 9 are N/A for a pure-geometry test.
**Self-check:** 0 vacuous tests written; re-seated siblings verified GREEN on current code (not false REDs) via testing-runner.

**Handoff:** To Dev (Yoda) for the GREEN phase — reduce/clamp `tube.screenZ` so all 16 wells clear ±340; keep the per-well direction; stay inside #115's architecture (no `framing.ts`). See Delivery Findings for the recommended approach and the binding level-12 constraint.
## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/core/geometry.ts` — added `VIEWPORT_SAFE_SCALE = 0.25` and applied it as a uniform damping factor to the per-well `tube.screenZ`, so the ROM-derived SCREEN-Z shift no longer drives the near rim off-screen. Interface + makeRingTube comments updated to note the tp1-32 damping.
- `docs/audit/findings/pair-4-aldisp-b-well-projection.json` — reanchored (6 citation line-numbers shifted by the edit; `reanchor-citations.mjs --write` → 0 LOST). No `remediated_by` needed: DB-008 (the ZADJL finding) is already `remediated_by: tp1-31` with `ours: null`, and no cited verbatim line was modified — only shifted.

**Approach:** the story offered three fix options; I took "reduce the effective scale" as a single uniform factor (see Design Deviation). Uniform preserves every well's ROM high/low ordering + direction and — unlike a clamp — keeps the re-seated `tp1-31.camera-slide` siblings green. Value derived from the binding well (shape 12): factor ≤ ~0.27 to clear the ±340 safe band; 0.25 leaves ~3 units of self-margin (worst well 336.8).

**Tests:** 1167/1167 passing (GREEN) across 100 files. tp1-32.framing-viewport 5/5 (both invariants now green); tp1-31.screen-z 5/5; tp1-31.camera-slide 5/5 (uniform rescale kept levels 1 & 2 distinct → no re-seat needed); citations 12/12. `npm run build` (tsc --noEmit + vite) clean.
**Branch:** feat/tp1-32-framing-viewport-clip

**AC check:** the testable invariant — every one of the 16 wells' near-ring rim points stay within the ±360 viewport (±340 with margin) after screenZ — holds for all 16 wells. Per-well direction preserved ("MOVE UP" majority intact, guard 3). Stayed inside #115's architecture (screenZ in core Tube); did NOT reintroduce PR #116's `framing.ts`.

**Not visually verified:** pure-core geometry change fully covered by deterministic tests that assert the observable rim extents directly; the subjective framing "feel" (and the Claw's exact fit) is the story's explicit play-test tune — see Delivery Findings. Recommend a quick play-test before the magnitude is considered final.

**Handoff:** To Reviewer (Obi-Wan) for code review.
## Subagent Results

Subagent toggles: only `preflight` and `rule_checker` enabled (`pf settings get workflow.reviewer_subagents`); the other seven are disabled via settings and pre-filled "Skipped / disabled". For each disabled domain I assessed the diff myself (see the dispatch tags in the Reviewer Assessment).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (all GREEN: 1167 tests, build, citations 12/12, 0 smells, clean tree) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — boundaries assessed by Reviewer ([EDGE]) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — assessed by Reviewer ([SILENT]) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — test quality via rule-checker #8 + Reviewer ([TEST]) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — comments assessed by Reviewer ([DOC]) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — types via rule-checker #1/#2 + Reviewer ([TYPE]) |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — assessed by Reviewer ([SEC]) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — assessed by Reviewer ([SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | findings | 1 (LOW, rule #8: config-guard test) | confirmed 1 (downgraded LOW, non-blocking), dismissed 0, deferred 0 |

**All received:** Yes (2 enabled subagents returned; 7 disabled → assessed directly)
**Total findings:** 1 confirmed (LOW, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

The change is a focused, correct viewport-safety fix: a single uniform `VIEWPORT_SAFE_SCALE = 0.25` folded into the per-well `tube.screenZ` formula in `src/core/geometry.ts`, so the ROM-derived SCREEN-Z shift no longer drives the near rim off-screen for the deep wells. No Critical/High issues. The one confirmed finding is a LOW test-quality nit (an intentional anti-cheese guard) that does not block.

**Data flow traced:** `ROM_ZADJ[shape]` (ROM byte) → `makeRingTube` computes `screenZ = -ZADJ·(16+H)·S·0.25/256` → carried on `Tube.screenZ` → `initialState`/`sim.ts` set `camera.screenZ` to slide toward it → `render.ts:1001 pctx.translate(0, camera.screenZ)` shifts the whole scene in Y. Safe: the damped shift keeps every rim point within ±340 of centre in the ±360 scene box (verified below), on both axes and both in steady state and mid-slide.

### Observations (dispatch-tagged; ≥5)

1. `[VERIFIED]` The fix keeps all 16 wells' near-ring within the ±340 safe band — evidence: `geometry.ts` screenZ line multiplies by positive `0.25`; I independently re-derived the worst well (shape 12) at 336.83 (`verify_factor.mjs`, replicating the exact geometry math) and `tp1-32.framing-viewport.test.ts` is 5/5 GREEN. Complies with the story's testable invariant.
2. `[VERIFIED]` Per-well DIRECTION preserved ("MOVE UP" re-confirmation) — multiplying by a positive constant cannot flip a sign; `tp1-32` guard 3 + `tp1-31.screen-z` direction test both GREEN. The negative-ZADJ majority still reads as shipped.
3. `[VERIFIED][EDGE]` Transient-slide clipping is ALSO eliminated — a case the invariant test does not directly cover (it checks steady-state `tube.screenZ`). During the tp1-31 level-start ease, the NEW tube is drawn while `camera.screenZ` interpolates between two wells' values. Max `|screenZ|` after damping is 36.83, so NEW `±300` ring + any intermediate `camera.screenZ` ≤ 336.83 ≤ 340. No mid-slide clip. Evidence: `sim.ts` slides between two damped targets; computed directly.
4. `[VERIFIED]` Core purity maintained ([TYPE] domain) — `VIEWPORT_SAFE_SCALE` is a pure numeric `const`; `geometry.ts` has zero imports and no `DOM`/`Date`/`Math.random`/`rAF`/shell refs (grep confirmed; rule-checker #14 concurs). Honours the tempest `core/` boundary.
5. `[VERIFIED][RULE]` Audit citation gate correctly handled — 6 citations reanchored (line-number bumps only, 0 verbatim change, 0 LOST); `DB-008` (the ZADJL finding) correctly left frozen (`remediated_by: tp1-31`, `ours: null`) because tp1-32 tunes an already-remediated fix rather than remediating a new distinct finding; citations 12/12 GREEN. Complies with the tempest CLAUDE.md audit convention.
6. `[RULE][TEST][LOW]` `tp1-32.framing-viewport.test.ts:94-98` ("safety margin is real and small") asserts only relationships among the test's own constants — cannot catch a `geometry.ts` regression. CONFIRMED (rule #8 match) but downgraded to LOW/non-blocking: it is a deliberate, honestly-named anti-cheese guard that CAN fail on a config edit (`MARGIN=0`), not an `assert(true)` tautology; real viewport coverage lives in the two sibling `it` blocks. Logged as a non-blocking Improvement finding.
7. `[VERIFIED][TEST]` Re-seated siblings are non-vacuous — `tp1-31.camera-slide` still drives real `stepGame` transitions with `Number.isFinite` anti-vacuity guards; the `SCREEN_Z` derivation is a documented dynamics-only rescope (rule-checker did NOT flag it vacuous). `tp1-31.screen-z` retained tests 3/4/5 verbatim.
8. `[DOC]` Comments accurate and updated — the `Tube.screenZ` interface comment, the `makeRingTube` comment, and both re-seated test headers were updated to note the tp1-32 damping/rescope; the `VIEWPORT_SAFE_SCALE` comment's claims (worst well ~447, ±340 band, factor ≤~0.27) all check out. No stale/misleading comments introduced.
9. `[SILENT]` / `[SEC]` — N/A: the change is pure arithmetic with no error-handling surface, no try/catch/fallback, no user input, no I/O, no `JSON.parse`. Nothing to swallow, nothing to inject.
10. `[SIMPLE]` Minimal implementation — one constant + one factor in an existing expression; no over-engineering, no dead code. The only simplification candidate is the LOW config-guard test (see #6).

### Rule Compliance (`.pennyfarthing/gates/lang-review/typescript.md` + tempest CLAUDE.md)

Exhaustive per rule-checker (15 rules, 21 instances, 1 violation); I concur with each:

| Rule | Scope in diff | Result |
|------|---------------|--------|
| #1 type-safety escapes | geometry.ts + 3 test files | COMPLIANT — 0 `as any`/`as unknown`/`@ts-ignore`/new `!` |
| #2 generics/interface pitfalls | Tube (comment-only), scalar const | N/A — nothing introduced; Tube fields already `readonly` |
| #3 enums | — | N/A |
| #4 null/undefined (`||` vs `??`) | test files | COMPLIANT — the one `||` is a boolean OR of two comparisons, not a nullable-default |
| #5 module/`.js` extension | new test imports | COMPLIANT — extensionless correct under `moduleResolution: bundler`, matches repo convention |
| #6 React/JSX | — | N/A — no `.tsx` |
| #7 async | — | N/A — all synchronous |
| #8 test quality | 5 cases | 1 VIOLATION (LOW, config-guard test #6); else compliant (src imports, no `as any`, real assertions) |
| #9 build/config | — | N/A — no tsconfig/vite/package changes |
| #10 input validation | — | N/A — no input boundary |
| #11 error handling | — | N/A — no try/catch/throw |
| core purity (CLAUDE.md) | geometry.ts | COMPLIANT — pure, zero imports, no DOM/time/random |
| audit citation gate (CLAUDE.md) | findings JSON | COMPLIANT — reanchored, 0 LOST, DB-008 correctly frozen |

### Devil's Advocate

Arguing this code is broken. **(a) "0.25 is a magic number pulled from thin air."** Rebutted: it is derived (binding well shape 12 needs factor ≤ 0.2716 to clear ±340; 0.25 is a clean quarter with self-margin) and documented, and the exact value is explicitly the story's deferred play-test tune. **(b) "The invariant only checks steady-state `tube.screenZ`; a deep well slid into from a shallow one could transiently clip during the 8-frame ease."** This is the sharpest attack, and I chased it: because damping caps every `|screenZ|` at 36.83, any intermediate `camera.screenZ` during a slide is bounded by its two endpoints, so `±300 ring + ≤36.83 ≤ 336.83 ≤ 340` — no transient clip. The fix is stronger than the test that drove it. **(c) "The Claw extends past the rim, so the player's cursor could still clip even though the ring fits."** True and DOCUMENTED (TEA + Dev + Reviewer findings): the invariant is scoped to the ring; at 0.25 the shifts are ≤37 so the claw is far less likely to clip than under shipped #115, but the exact claw fit is a human play-test item — a known deferred scope, not a regression this change introduces. **(d) "Re-seating the sibling tests destroyed the exact-magnitude coverage."** By design: the magnitude is now a tune, so pinning a bit-exact value would forbid the fix; direction + `≤ROM-target` + the ±340 invariant box the value from every side. **(e) "Aspect ratio — a very wide or tall window could still clip."** Rebutted: the ±360 box is the `min(W,H)` guaranteed-visible square, and the invariant checks BOTH axes at ±340, so it holds for portrait and landscape alike. **(f) "Levels beyond 16?"** `tubeForLevel` cycles the same 16 shapes; no deeper well can appear without a code change that re-runs these tests. Conclusion: no Critical/High surfaced; the sole real limitation (claw fit) is documented and deferred to play-test.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.