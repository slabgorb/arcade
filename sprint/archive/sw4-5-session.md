---
story_id: "sw4-5"
jira_key: ""
epic: "sw4"
workflow: "tdd"
---
# Story sw4-5: Fix develop-red exhaust-port score tests

## Story Details
- **ID:** sw4-5
- **Jira Key:** (none - Jira not configured for this project)
- **Workflow:** tdd
- **Type:** bug
- **Points:** 2
- **Priority:** p1
- **Stack Parent:** none

## Story Summary
sw3-15's PORT_APPROACH_WINDOW gate (port z >= -800) regressed sw3-1's portKill helper: the bolt drops at the deep trench-z outside the near window, blocking same-frame detonation so the kill scores 0. rom-score-values exhaust-port-kill tests (25000/30000) fail on develop. Reconcile the approach-window gate with the score-kill path so develop is green.

**IMPORTANT CONTEXT FOR TEA:** Before writing any fix, verify the premise:
- star-wars v0.0.8 was released with ALL 836 tests passing
- sw4-2's merge included commit e1e475d "fix(test): re-seat rom-score-values port kill into the sw3-15 $800 window"
- The referenced exhaust-port-kill tests may ALREADY be green on current origin/develop
- If tests already pass, this story is likely already-resolved by sw4-2

## Sm Assessment

Story sw4-5 set up cleanly and routed to the RED phase (TEA / O'Brien) under the `tdd` phased workflow. Session, story context, and the `feat/sw4-5-fix-exhaust-port-score-approach-window` branch (off `origin/star-wars/develop`) are in place. No blocking PRs on star-wars — merge gate clear.

**Verify-the-premise flag (blocking instruction for RED):** The story asserts the exhaust-port-kill score tests (25000/30000) *fail on develop today*. That premise is in doubt: star-wars `v0.0.8` released moments ago with all 836 tests green, and sw4-2 carried commit `e1e475d "fix(test): re-seat rom-score-values port kill into the sw3-15 $800 window"`. TEA must reproduce the claimed failure on **current `origin/develop`** (fetch first) before writing any fix. If the exhaust-port-kill tests already pass, report sw4-5 as **already-resolved by sw4-2** rather than fixing an already-green condition — do not manufacture a failing test to justify the story.

**Scope reminder:** star-wars is gitflow — branch/diff/PR against `origin/develop`, never local develop. Fix must reconcile sw3-15's `PORT_APPROACH_WINDOW` (port z >= -800) with sw3-1's `portKill` score path without regressing sw3-15's octagon-tight port accuracy.

## TEA Assessment

**Tests Required:** No
**Reason:** Story already resolved before it was started — no failing state to capture. RED is a no-op.

**Premise verification (SM-flagged, blocking):** The story asserts the `rom-score-values` exhaust-port-kill tests (25,000 / 30,000) *fail on develop today*. Reproduced against current `origin/develop` (my branch is 0 ahead / 0 behind it; HEAD `f24c654` = the `v0.0.8` release commit):
- `npx vitest run tests/core/rom-score-values.test.ts` → **10/10 pass**, including both named cases:
  - `a non-clean exhaust-port kill scores exactly 25,000` ✅
  - `a clean exhaust-port kill scores 25,000 + 5,000 Force = 30,000` ✅
- Full suite: `npm test` → **836/836 pass**. The story's stated done-condition ("develop is green") is **already true**.

**Root cause of the false premise:** The reconciliation the story describes — re-seating the port kill into sw3-15's `PORT_APPROACH_WINDOW` ($800 window) — already landed. The `trenchPortInWindow()` / `portKill()` helpers in `tests/core/rom-score-values.test.ts` stage the port at `[0,0,-300]` (in-window). Provenance: helper introduced by `3bd1018` (sw3-6, PR #73, "TEA test-maintenance"), with the related port-kill re-seat in `0efa6f9` (sw4-2, PR #71, commit `e1e475d`). Both merged before sw4-5's branch was cut.

**Recommendation:** Close sw4-5 as **already-resolved / obsolete** — no code or test change is warranted. Fabricating a failing test to justify the story would violate TDD honesty and the SM's explicit instruction. Routing back to SM for disposition rather than forward to Dev (nothing to implement).

## Workflow Tracking
**Workflow:** tdd
**Phase:** red
**Phase Started:** 2026-07-12T08:24:26Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-12T08:22:13Z | 2026-07-12T08:24:26Z | 2m 13s |
| red | 2026-07-12T08:24:26Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->
### TEA (test design)
- **Gap** (blocking): sw4-5's premise is stale — the exhaust-port-kill (25,000/30,000) tests it claims are red already pass on `origin/develop` (836/836 green). Affects nothing in `src/` (no code change needed); the bug was fixed by `3bd1018` (sw3-6 #73) + `e1e475d` (sw4-2 #71) before this story started. Story should be closed as already-resolved, not implemented. *Found by TEA during test design.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->
No design deviations