---
story_id: "bz1-6"
jira_key: ""
epic: "bz1"
workflow: "tdd"
---
# Story bz1-6: Radar scanner — green overlay arc, enemy blips within cone, sweep

## Story Details
- **ID:** bz1-6
- **Jira Key:** (none — local sprint only)
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 2
- **Repo:** battlezone

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-03T20:04:15Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-03T19:35:10Z | 2026-07-03T19:37:47Z | 2m 37s |
| red | 2026-07-03T19:37:47Z | 2026-07-03T19:46:09Z | 8m 22s |
| green | 2026-07-03T19:46:09Z | 2026-07-03T19:52:10Z | 6m 1s |
| review | 2026-07-03T19:52:10Z | 2026-07-03T20:04:15Z | 12m 5s |
| finish | 2026-07-03T20:04:15Z | - | - |

## Sm Assessment

**Story:** bz1-6 — Radar scanner (green overlay arc, blips within cone, sweep). 2pts, `tdd`/phased, battlezone repo, branch `feat/bz1-6-radar-scanner` off `develop` (gitflow). No Jira (local sprint only).

**Setup done:** Session + context created; feature branch checked out in `battlezone/`. Context enriched beyond the YAML stub with a real technical approach and 5 acceptance criteria grounded in the existing codebase (not invented).

**Scope for TEA (RED):** New pure core module `src/core/radar.ts` — a deterministic `deriveRadar` (player pose + blip-source → blips) plus a time-parameterized sweep angle. Obstacle- and saucer-exclusion built in. No live enemies exist yet (bz1-7) or live saucer (bz1-9), so RED drives synthetic/stub entities. Bearing math reuses the `camera.ts` heading convention (0→+Z, π/2→+X, CCW). Shell renders the green scanner overlay (arc, sweep line, blips).

**Load-bearing constraints — keep stable, downstream depends on them:**
- `deriveRadar` name/shape: bz1-9 wires the live saucer through its existing exclusion; bz1-7 supplies enemy tanks — with *no* change to the filter.
- Obstacles never appear on radar (`src/core/obstacles.ts:7`); saucer is radar-invisible (bz1-9).
- No `Date.now()` inside core — pass time in (determinism).
- Final HUD placement + bichromatic palette are bz1-12's call; bz1-6 establishes scope/contents only.

**Routing:** phased tdd → next agent **tea** (Imperator Furiosa) for RED. Witness me.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** New pure core module with real behavior (bearing/range math, an exclusion filter, a deterministic sweep) — squarely TDD, not a chore bypass.

**Test Files:**
- `battlezone/tests/core/radar.test.ts` — behavioral contract for `deriveRadar` (bearing follows the `camera.ts` heading convention; range = planar Euclidean distance; the ROM radar-invisibility filter for obstacles + saucer) and `sweepAngle` (starts at 0, half-period ≈ π, wraps each period, monotonic within a period, always in [0, 2π), periodic, deterministic).
- `battlezone/tests/core/radar-purity.test.ts` — rule-enforcement scan of `src/core/radar.ts` (module exists; no DOM/time/randomness tokens; no type-safety escapes; sibling-core imports only), mirroring bz1-4's `movement-purity` suite.

**Tests Written:** 29 tests covering ACs 1–4. AC-5 (overlay render) is intentionally left to manual/visual verification — see Design Deviations.
**Status:** RED — verified by testing-runner: 29 failing (all in the two radar suites, failing for missing module/exports), 223 pre-existing tests still green.

**Contract handed to Dev (The Word Burgers):** create pure, deterministic `src/core/radar.ts` (sibling-core imports only) exporting `RadarContactKind`, `RadarContact {x,z,kind}`, `RadarBlip {bearing,range}`, `RADAR_INVISIBLE_KINDS` (⊇ {'obstacle','saucer'}), `deriveRadar(pose, contacts)` (order-preserving, non-mutating, excludes invisible kinds), `SWEEP_PERIOD_MS`, and `sweepAngle(elapsedMs)`. Full signatures are in the header of `radar.test.ts`. Bearing convention: `bearing = normalize(atan2(dx,dz) − heading)` into (−π, π], 0 = dead ahead — the direct consequence of `forwardFromHeading = [sin,0,cos]`.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| Epic core-purity (no DOM/time/randomness) | radar-purity: "contains no DOM / time / randomness tokens" | failing |
| Determinism — sweep takes `elapsedMs`, never the clock | radar.test: "is deterministic", "is periodic"; radar-purity `Date.now`/`performance.now` ban | failing |
| lang-review #1 — no `as any` / `@ts-ignore` / `as unknown as` | radar-purity: "contains no type-safety escapes" | failing |
| core import scope — sibling core only | radar-purity: "imports only sibling core modules" | failing |
| No NaN leakage (finite bearing/range; atan2(0,0) boundary) | radar.test: "every derived bearing is finite…", "every range is finite ≥ 0", "a contact sitting on the player… range-0 blip" | failing |

**Rules checked:** 5 of 5 applicable conventions covered. NOTE: `.pennyfarthing/gates/lang-review/{ts}.md` is **absent** in this checkout — the rubric above is drawn from the epic core-purity rule and the type-escape/import-scope conventions already embodied in bz1-3/bz1-4's purity suites, not a numbered checklist file.
**Self-check:** 0 vacuous tests found (every test asserts an expected value, count, or membership; missing-export helpers throw with the exact export name).

**Handoff:** To Dev (The Word Burgers) for implementation (GREEN).

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `battlezone/src/core/radar.ts` (new) — pure, deterministic `deriveRadar` (pose + contacts → polar blips; bearing per `camera.ts` convention; range = planar distance; filters `RADAR_INVISIBLE_KINDS` = {obstacle, saucer}), `sweepAngle(elapsedMs)` (deterministic [0,2π), wraps each `SWEEP_PERIOD_MS`).
- `battlezone/src/shell/render.ts` — `drawRadar` HUD (green scope ring, ±`H_FOV`/2 forward cone, rotating sweep line, one dot per blip) + `RADAR_RANGE`.
- `battlezone/src/main.ts` — wired `drawRadar(deriveRadar(pose, contacts), sweepAngle(tMs), …)` into the rAF frame loop with the live pose + shell clock.

**Tests:** 252/252 passing (GREEN); `tsc --noEmit` + `vite build` clean (verified by testing-runner).
**Branch:** feat/bz1-6-radar-scanner — pushed to origin/battlezone.

**ACs:** AC-1..4 unit-tested green. AC-5 (overlay) is wired to the front end and builds; visual confirmation is manual via `just serve` (per TEA's AC-5 deviation) — deliberately not screenshotted here to avoid binding the live prod checkout's pinned port `:5276`.

**Handoff:** To Reviewer (Immortan Joe) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 (252/252 green, tsc+vite clean, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings (domain self-covered) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings (domain self-covered) |
| 4 | reviewer-test-analyzer | Yes | findings | 6 | confirmed 6 (all non-blocking), dismissed 0 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings (domain self-covered) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings (covered by rule-checker + me) |
| 7 | reviewer-security | Yes | clean | 0 | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings (domain self-covered) |
| 9 | reviewer-rule-checker | Yes | findings | 3 (8 instances) | confirmed 3 (all non-blocking), dismissed 0 |

**All received:** Yes (4 enabled ran, 5 disabled pre-filled per workflow.reviewer_subagents)
**Total findings:** 9 confirmed (all Medium/Low, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

The core is correct and I verified it by hand, not on the strength of a green suite. All 9 subagent findings are test-quality / coverage / forward-design improvements at Medium/Low severity — none is a Critical/High code-correctness defect. They are recorded as non-blocking delivery findings for a fast-follow; the ACs (bearing, range, exclusion, sweep) are met and unit-tested, and the build is clean.

**Data flow traced:** keyboard → `KeyboardTreads.read()` → `stepTank` → `pose.heading` (accumulated UNBOUNDED, movement.ts:92) → `deriveRadar(pose, contacts)` → `RadarBlip[]` → `drawRadar` → canvas. Input is internal/trusted; `contacts` is an empty literal today (main.ts:56), so no external/untrusted data reaches the radar. Safe.

**Observations (11):**
- [VERIFIED] Bearing math correct across the unbounded-heading domain — radar.ts:83 `normalizeAngle(atan2(dx,dz) − heading)` folds to (−π,π]; hand-checked heading=−4 → bearing −2.283 (exercises the `a>π` branch, radar.ts:65) and heading=7 → −0.717. Matches camera.ts `forwardFromHeading=[sin,0,cos]` (camera.ts:51). Complies with core-purity.
- [VERIFIED] Core purity — radar.ts imports only `import type {TankPose} from './camera'` (radar.ts:15); zero DOM/time/randomness tokens; enforced by radar-purity.test.ts and confirmed by [SEC]. `sweepAngle` takes `elapsedMs` (radar.ts:98); the clock read stays in the shell (main.ts:57).
- [VERIFIED] Exclusion filter correct — radar.ts:81 skips `RADAR_INVISIBLE_KINDS` = {obstacle,saucer} (radar.ts:55); the real 21-entry `OBSTACLES` driven through it → 0 blips (test). `deriveRadar` is order-preserving + non-mutating (test).
- [VERIFIED] sweepAngle deterministic + wraps + negative-safe — radar.ts:99 double-mod → [0,2π); tests cover t=0, P/2≈π, P→0, monotonic, periodic.
- [VERIFIED] Wiring — `drawRadar` is called last each frame (main.ts:57) with live pose + rAF clock; leftover `shadowBlur` is reset at the next frame's top. Overlay reachable in the running app.
- [TEST][MEDIUM] `normalizeAngle` wrap branches (radar.ts:65-66) are never exercised — all bearing tests use heading 0 or π/2 with contacts already inside (−π,π], yet movement.ts:92 makes |heading|>π a real runtime domain. Code verified correct; a regression-protection gap, not a defect. radar.test.ts:126.
- [RULE][MEDIUM] `RADAR_INVISIBLE_KINDS` (radar.ts:55) has no compile-time tie to `RadarContactKind` — a future kind (bz1-7/bz1-9 add kinds) omitted from the list silently defaults to radar-visible. Current classification correct; recommend `Record<RadarContactKind,boolean>` or a length-asserted paired list when the union grows.
- [RULE][MEDIUM] Six `mod.SWEEP_PERIOD_MS as number` casts (radar.test.ts:270,271,279,285,295,304) bypass the optional field's undefined-ness instead of the `?? []`/throw-if-missing pattern the same file uses for its siblings — a missing export would surface as silent NaN failures, not a clear "must export" message.
- [TEST][MEDIUM] "filters ONLY the invisible kinds" asserts only `.toHaveLength(3)`, not which contacts survived or their order, despite the order-preserving contract (radar.test.ts:237).
- [SILENT][LOW] Defensive RED loader `catch { mod = {} }` (radar.test.ts:121) swallows the import error with no binding — a genuine throw in radar.ts would masquerade as "not created yet." Matches the established house pattern (obstacles.test.ts), so consistent, but loses diagnostics.
- [SIMPLE][LOW] `sweepAngle`'s negative-input term (radar.ts:99 `+ SWEEP_PERIOD_MS`) is unreachable from the only caller (rAF `tMs` ≥ 0) and untested — add a negative case or accept as cheap defensiveness. `render.ts:95` range-clamp is pure but lives in the untested canvas fn; could extract to core for a cheap unit test.

**Dispatch-tag coverage:**
- [EDGE] (disabled) — self-enumerated boundaries: atan2(0,0) origin (tested, finite), heading wrap ±π (gap above), range clamp at RADAR_RANGE (render.ts:95, bounded), empty contacts (tested), sweep at 0/P/negative. No boundary crashes; NaN only from non-finite input, which the current wiring never supplies.
- [SILENT] (disabled) — only swallow is the test loader catch (above); core has no error paths.
- [TEST] — 6 test-analyzer findings confirmed (above).
- [DOC] (disabled) — JSDoc on every export (rule-checker #15); the RED-phase comment radar.test.ts:53-56 slightly over-justifies the local type duplication (minor). Source comments accurate.
- [TYPE] (disabled) — covered by rule-checker #1 (exhaustiveness); interfaces are readonly; `RadarContactKind` is a string union (correct, not an enum).
- [SEC] — clean; pure client game, no auth/secrets/network/tenant surface.
- [SIMPLE] (disabled) — negative-elapsedMs defensiveness is mild over-engineering (above); otherwise minimal; empty `contacts` is a documented placeholder, not dead code.
- [RULE] — 3 rule-checker findings confirmed (above).

### Rule Compliance (TypeScript lang-review + core-purity)
Rule-checker enumerated 15 rules / 52 instances. **Compliant:** #1 type-safety-escapes, #2 generic/interface (all params `readonly`), #5 module/declaration (mixed value/type import main.ts:14 correct; `moduleResolution: bundler` → no `.js` needed), #6 JSX (N/A), #7 async (N/A), #8 mock-signature match (RadarModule matches radar.ts), #9 build-config (untouched, strict on), #10 input-validation (no external input), #12 perf/bundle (named imports, no barrels), #13 fix-regressions (N/A), #14 core-purity (sibling-core-only, no impurity), #15 naming/idiom (readonly, planar x/z, JSDoc). **Violations (all non-blocking):** #3 exhaustiveness (`RADAR_INVISIBLE_KINDS`), #4 null/undefined (`SWEEP_PERIOD_MS as number` ×6), #11 error-handling (swallowing catch).

### Devil's Advocate
Argue the code is broken. First: the radar shows NOTHING in the running game — `contacts` is a hardcoded empty array (main.ts:56), so a player sees a scope ring and a sweep sweeping over a void. A cynic calls this a story that "implements a radar" while displaying no targets. Rebuttal: correct-by-scope — no enemy or saucer entities exist until bz1-7/bz1-9; the blip path is wired and unit-tested, and the ROM radar likewise only shows the current hostile. Second: unbounded heading. `movement.ts:92` never wraps `heading`, so after enough turning it is a large number; feed a NaN/±Infinity heading (a future movement bug) and `atan2`/`hypot` yield NaN, which flows into `drawRadar`'s `ctx.arc(NaN,…)` — canvas silently no-ops, so a corrupt pose makes blips vanish with no error. A silent-failure surface, though unreachable from today's inputs. Third: sweep direction and the +bearing→screen-left handedness are my choice, unvalidated against the arcade; a player used to the real cabinet might read the radar mirror-imaged — deferred to bz1-12 by AC-5, but nobody has looked at it on screen (Dev admits no screenshot). Fourth: a resize race with a 0-height canvas makes R=max(28,0)=28, cy=42 — a radar over a collapsed frame; ugly, harmless. Fifth: a future contributor adds a `'mine'` kind to `RadarContactKind`, forgets `RADAR_INVISIBLE_KINDS`, and it silently paints (rule-checker #1). What did the review miss? The NaN-pose silent-failure path merits a one-line finite-guard in `deriveRadar` if bz1-7's entities can ever produce non-finite positions — recorded as a forward finding. None of these is a present, reachable correctness defect: with the actual inputs (empty contacts, finite pose, rAF clock), every path is correct and bounded.

**Error handling:** Core is pure math with no error paths; the only swallow is the test loader `catch {}` (radar.test.ts:121, non-blocking, house pattern). Null/empty: empty contacts → `[]` (tested); on-player contact → finite range-0 blip (tested).

**Pattern observed:** clean core/shell split — pure `deriveRadar`/`sweepAngle` in core (radar.ts), all canvas/clock in shell (render.ts:52, main.ts:57), mirroring bz1-3/bz1-4.

**Handoff:** To SM (The Organic Mechanic) for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Question** (non-blocking): The story title's "enemy blips within cone" is ambiguous — the RED core tests pin bearing/range/exclusion/sweep but deliberately do NOT constrain whether the scanner shows only forward-view-cone (±`H_FOV`/2, `camera.ts` `H_FOV`=π/4) blips or all-around blips at their true bearing. Real Battlezone renders blips all around the scope with the cone as a forward indicator, but this isn't nailed in the ACs. Affects `battlezone/src/shell` radar overlay (framing decision) and, only if a hard cone-visibility filter is desired, `battlezone/src/core/radar.ts`. Dev/Reviewer resolve against the bz1-2 findings; default assumption = `deriveRadar` returns all visible contacts and the overlay decides framing. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): Radar overlay placement, scope radius, and palette are provisional (top-center, ~9% of the min viewport dimension, single-color green) pending bz1-12's HUD/cracked-glass framing + bichromatic palette. Affects `battlezone/src/shell/render.ts` (`drawRadar` layout, `RADAR_RANGE`). *Found by Dev during implementation.*
- **Gap** (non-blocking): The scanner paints no blips in-game yet because no enemy/saucer entities exist — the blip path is wired and unit-tested but only exercised once bz1-7 (tanks) / bz1-9 (saucer) push live `RadarContact`s into the empty `contacts` list in `battlezone/src/main.ts`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): No test exercises `normalizeAngle`'s wrap branches though `movement.ts:92` accumulates heading unbounded (|heading|>π is reachable). Add wrap-boundary bearing cases (e.g. heading=−4 and heading=7). Affects `battlezone/tests/core/radar.test.ts`. Code verified correct — this is regression protection. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `RADAR_INVISIBLE_KINDS` has no compile-time exhaustiveness tie to `RadarContactKind`; a future kind omitted from it silently defaults to radar-visible. Affects `battlezone/src/core/radar.ts:55` (switch to `Record<RadarContactKind,boolean>` or a length-asserted paired list when bz1-7/bz1-9 extend the union). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): Test hygiene — six `mod.SWEEP_PERIOD_MS as number` casts and a bare-`catch` RED loader are inconsistent with the file's own throw-if-missing/`??` patterns; and "filters ONLY invisible kinds" should assert survivor identity/order, not just count. Affects `battlezone/tests/core/radar.test.ts`. *Found by Reviewer during code review.*
- **Gap** (non-blocking): `deriveRadar` has no finite-guard; if a future entity (bz1-7/bz1-9) supplies a NaN/Infinity position, the blip silently fails to draw (canvas no-ops on NaN) rather than erroring. Affects `battlezone/src/core/radar.ts` (guard, or document the finite-input precondition). *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 3 findings (1 Gap, 0 Conflict, 0 Question, 2 Improvement)
**Blocking:** None

- **Improvement:** Radar overlay placement, scope radius, and palette are provisional (top-center, ~9% of the min viewport dimension, single-color green) pending bz1-12's HUD/cracked-glass framing + bichromatic palette. Affects `battlezone/src/shell/render.ts`.
- **Improvement:** `RADAR_INVISIBLE_KINDS` has no compile-time exhaustiveness tie to `RadarContactKind`; a future kind omitted from it silently defaults to radar-visible. Affects `battlezone/src/core/radar.ts:55`.
- **Gap:** `deriveRadar` has no finite-guard; if a future entity (bz1-7/bz1-9) supplies a NaN/Infinity position, the blip silently fails to draw (canvas no-ops on NaN) rather than erroring. Affects `battlezone/src/core/radar.ts`.

### Downstream Effects

Cross-module impact: 3 findings across 2 modules

- **`battlezone/src/core`** — 2 findings
- **`battlezone/src/shell`** — 1 finding

### Deviation Justifications

2 deviations

- **AC-5 (radar overlay render) has no automated test**
  - Rationale: The overlay is a canvas draw with no pure logic to assert without over-specifying draw calls and boxing in bz1-12's placement/palette. The values the overlay consumes (bearing, range, sweep angle) ARE fully pinned by the core tests.
  - Severity: minor
  - Forward impact: Reviewer/manual must eyeball the overlay via `just serve`; bz1-12 finalizes placement and the bichromatic palette.
- **Sweep period & radar range are placeholder constants, not ROM-sourced**
  - Rationale: The ROM sweep rate and radar display range weren't extracted for this 2-pt story; the behavior (deterministic wrap, range→radius scaling) is correct regardless of the exact constants.
  - Severity: minor
  - Forward impact: A fidelity/HUD pass (bz1-12) or a ROM-rate check may retune both; no API change — each is a single named constant.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **AC-5 (radar overlay render) has no automated test**
  - Spec source: context-story-bz1-6.md, AC-5
  - Spec text: "the shell draws the green scanner overlay at the top of the viewport: the arc/cone outline, the rotating sweep line at the current sweep angle, and a mark for each derived blip … (Visual/manual verification acceptable; exact placement deferred to `bz1-12`.)"
  - Implementation: RED covers only the pure core (`deriveRadar` + `sweepAngle`); the Canvas 2D overlay is left to manual/visual verification, per the AC's own allowance.
  - Rationale: The overlay is a canvas draw with no pure logic to assert without over-specifying draw calls and boxing in bz1-12's placement/palette. The values the overlay consumes (bearing, range, sweep angle) ARE fully pinned by the core tests.
  - Severity: minor
  - Forward impact: Reviewer/manual must eyeball the overlay via `just serve`; bz1-12 finalizes placement and the bichromatic palette.

### Dev (implementation)
- **Sweep period & radar range are placeholder constants, not ROM-sourced**
  - Spec source: context-story-bz1-6.md, AC-4 / AC-5; context-epic-bz1.md ("ROM is canonical")
  - Spec text: AC-4 "the sweep angle is a deterministic function of elapsed time … wraps cleanly over a full revolution"; AC-5 "exact placement deferred to bz1-12"
  - Implementation: `SWEEP_PERIOD_MS = 2000` (one revolution) and `RADAR_RANGE = 32768` (world units to the scope edge) are reasonable placeholders. TEA's tests pin sweep BEHAVIOR relative to `SWEEP_PERIOD_MS`, not a specific value, so no test constrains these numbers.
  - Rationale: The ROM sweep rate and radar display range weren't extracted for this 2-pt story; the behavior (deterministic wrap, range→radius scaling) is correct regardless of the exact constants.
  - Severity: minor
  - Forward impact: A fidelity/HUD pass (bz1-12) or a ROM-rate check may retune both; no API change — each is a single named constant.

### Reviewer (audit)
- **TEA — AC-5 render has no automated test** → ✓ ACCEPTED by Reviewer: sound. The overlay is a Canvas 2D draw with no pure logic to assert without over-specifying draw calls and pre-empting bz1-12's placement; the values it consumes (bearing/range/sweep) are fully unit-tested. Follow-up (non-blocking): the pure range→radius clamp (render.ts:95) could be extracted to core for a cheap test.
- **Dev — sweep period & radar range are placeholder constants** → ✓ ACCEPTED by Reviewer: sound. TEA's tests pin sweep BEHAVIOR relative to `SWEEP_PERIOD_MS`, not a value; both are single JSDoc'd named constants, retunable by a bz1-12 fidelity pass with no API change. Consistent with "ROM is the ceiling — don't gold-plate deep fidelity."
- No undocumented deviations found: the implementation matches the story context's scope (core `deriveRadar`/`sweepAngle` + shell overlay); AC-1..4 are tested and AC-5 is wired per its manual-verification allowance.