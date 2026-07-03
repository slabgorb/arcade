---
story_id: "14-7"
jira_key: ""
epic: "14"
workflow: "tdd"
---
# Story 14-7: Trench catwalk hazard never costs a shield (COCKPIT_HIT_RADIUS < catwalk y-offset)

## Story Details
- **ID:** 14-7
- **Jira Key:** (none — local sprint story)
- **Workflow:** tdd
- **Type:** bug
- **Points:** 2
- **Stack Parent:** none
- **Branch Strategy:** gitflow (fix/14-7-trench-catwalk-hazard)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-03T09:14:23Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-03T08:47:37Z | 2026-07-03T08:49:57Z | 2m 20s |
| red | 2026-07-03T08:49:57Z | 2026-07-03T08:58:08Z | 8m 11s |
| green | 2026-07-03T08:58:08Z | 2026-07-03T09:04:14Z | 6m 6s |
| review | 2026-07-03T09:04:14Z | 2026-07-03T09:14:23Z | 10m 9s |
| finish | 2026-07-03T09:14:23Z | - | - |

## Technical Context

### Problem Summary
The catwalk obstacle in the trench run has a hazard radius that never triggers a collision with the cockpit, making the hazard geometrically unreachable.

### Root Cause
- Catwalk spawns at station (0, 200, -2100) with fixed x/y coordinates
- Cockpit collision check uses COCKPIT_HIT_RADIUS = 80 (src/core/state.ts)
- Minimum distance at z=0 is sqrt(200² + 0²) = 200, always > 80
- The crash branch (crashedCatwalk=true, terrain-crash event, -1 life) can never execute

### Affected Files
- src/core/trench-obstacles.ts (TRENCH_OBSTACLE_STATIONS — catwalk spawn position)
- src/core/sim.ts (stepTrench — catwalk z-axis movement)
- src/core/state.ts (COCKPIT_HIT_RADIUS constant)

### Reproduction
1. Press 9 to jump to a fresh trench (6/6 shields)
2. Do not fire
3. Wait until t=4.5s
4. Catwalk passes through without causing shield loss (expected: -1 shield)
5. Confirmed 2026-07-02 via live playtest isolation screenshot

### Fix Options
1. **Raise COCKPIT_HIT_RADIUS** for this check
2. **Lower the catwalk's spawn y-coordinate**
3. **Give the catwalk its own hazard radius** separate from COCKPIT_HIT_RADIUS

## Acceptance Criteria
- [ ] Catwalk collision now triggers the crash event when it reaches z=0
- [ ] Shield loss of -1 occurs upon catwalk contact (verified via playtest or unit test)
- [ ] Solution maintains consistency with other trench obstacle hazard logic
- [ ] No debug code remains
- [ ] Tests pass: `npm test`

## Sm Assessment

**Scope:** Well-bounded 2pt bug fix in one repo (star-wars). Root cause is proven, not
suspected — the geometric argument (min catwalk→cockpit distance = 200 > COCKPIT_HIT_RADIUS
= 80) means the crash branch is provably dead code. This is a strong candidate for TDD: the
failing test writes itself (drive the trench until the catwalk crosses z=0, assert a shield
was lost / terrain-crash event fired), and it will fail red today for exactly the reason the
description states.

**Handoff notes for O'Brien (tea):**
- The bug is temporal (collision-over-time), so the RED test must step the sim through the
  catwalk's z=0 crossing (~t=4.2s per the repro) — a single-frame assertion won't catch it.
  This is precisely why the static /scenes.html contact sheet missed it.
- Three fix options are on the table (raise the radius for this check, lower the catwalk
  spawn-y, or give the catwalk its own hazard radius). Do NOT bake a specific fix into the
  test — assert the *behavior* (catwalk contact costs a shield / fires terrain-crash), so
  whichever fix Julia picks in green stays valid. Guard against over-correction too: a fix
  that makes the catwalk hit too early or the port double-count should also fail.
- The description references concrete symbols (TRENCH_OBSTACLE_STATIONS, stepTrench,
  COCKPIT / COCKPIT_HIT_RADIUS) — verify they still exist before trusting the writeup.

**Decision:** Confirm — proceed to RED phase. No blockers, no open questions requiring the
user. Routing to tea.

## Tea Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** Behavioral bug in the deterministic core (`stepTrench`) — a dead collision
branch. Textbook TDD: the failing test reproduces the geometric proof.

**Test Files:**
- `tests/core/trench-catwalk-hazard.test.ts` — drives the REAL spawned catwalk
  (`spawnTrenchObstacles()`, y-offset intact) through the cockpit over ~252 frames and
  asserts a shield is lost + `terrain-crash` fires.

**Tests Written:** 3 (1 RED driver + 2 guards) covering the 2 behavioral ACs.
**Status:** RED confirmed — full suite 537 passed / **1 failed** (the AC test), no regressions.

Failing assertion (as designed): `trench-catwalk-hazard.test.ts:68`
`expected false to be true` — `crashSeen` never flips, because the catwalk at y=200 never
enters the 80-unit `COCKPIT_HIT_RADIUS` sphere. This is the bug, reproduced.

**Design note — why the fix must not be baked into the test:** three valid fixes exist
(widen the hazard radius / lower the catwalk spawn-y / give the catwalk its own radius). The
RED driver reads the catwalk from `spawnTrenchObstacles()` and asserts *behavior* (crash +
exactly one shield), so whichever Julia picks turns it GREEN. The two guards defend the flanks:
one keeps a far-downrange catwalk from crashing (over-eager radius), and the `=== 1` shield
assertion forbids double-counting across the multi-frame crossing.

### Rule Coverage

| Rule (lang-review/typescript.md) | Test / measure | Status |
|----------------------------------|----------------|--------|
| No `!` non-null assertion on nullable | `spawnedCatwalk()` throws instead of `!` on `.find()` | pass |
| No `as any` in test assertions | none used | pass |
| Tests import from `src/`, not `dist/` | imports from `../../src/core/*` | pass |
| Determinism of the pure core | existing `is deterministic for a fixed seed` (trench-obstacles.test.ts) still green | pass |
| Meaningful, non-vacuous assertions | self-check below | pass |

**Rules checked:** 5 of 5 applicable TS lang-review checks have coverage or a passing measure.
**Self-check:** 0 vacuous tests introduced — every assertion checks a concrete value
(`crashSeen === true`, `lives delta === 1`, lengths, `terrain-crash` membership). No
`let _ =`, no `assert(true)`, no `is_none`-on-always-none.

**Handoff:** To Julia (Dev) for GREEN — make `trench-catwalk-hazard.test.ts:68` pass without
breaking the two guards or the other 537 tests.

## Dev Assessment

**Implementation Complete:** Yes

**Chosen fix (of the 3 options):** Option 3 — a dedicated `CATWALK_HIT_RADIUS`.
- *Option 1 (raise `COCKPIT_HIT_RADIUS`)* rejected: that constant gates TIE contact, enemy
  fire, and the port crash — widening it to reach y=200 would broaden every unrelated
  cockpit hit-test. Side effects everywhere.
- *Option 2 (lower the catwalk spawn-y)* rejected: y=200 is fidelity geometry (the catwalk
  spans the channel above the centreline); dropping it to cockpit level would corrupt how it
  renders in the trench.
- *Option 3 (own radius)* chosen: surgical, and it matches the codebase's established
  per-entity-radius pattern (`TIE_HIT_RADIUS`, `PORT_HIT_RADIUS`, `OBSTACLE_HIT_RADIUS`,
  `COCKPIT_HIT_RADIUS`) — satisfying AC3 (consistency with other hazard logic).

**Value:** `CATWALK_HIT_RADIUS = 240`. Closest approach is 200 (the y-offset) at z=0; a
radius of exactly 200 collides only on the razor-thin z=0 plane, which the discrete ~8.3
u/frame scroll can skip on float drift. 240 opens a ~16-frame contact window around z=0 yet
stays far under the ~2090-unit spawn distance, so the catwalk crashes as it passes but never
fires early. The `continue` that removes the catwalk on contact guarantees a single shield.

**Files Changed:**
- `src/core/state.ts` — added `CATWALK_HIT_RADIUS = 240` (with geometry rationale) beside `COCKPIT_HIT_RADIUS`.
- `src/core/sim.ts` — `stepTrench` catwalk hazard check now uses `CATWALK_HIT_RADIUS` (import + call + comment).

**Tests:** 538/538 passing (GREEN) — the RED driver flipped to pass, both guards stay green,
no regressions. `tsc --noEmit` clean, `vite build` succeeds.

**Verification note:** This is a pure-core deterministic change; the RED driver exercises the
exact live repro (enter a fresh trench, don't fire, drive ~252 frames until the catwalk
crosses z=0) at the core level. With the hard core/shell boundary, the shell only renders
core state, so the stepped-sim test is the faithful end-to-end exercise of the fixed flow.

**Branch:** fix/14-7-trench-catwalk-hazard (pushed to origin)

**Handoff:** To The Thought Police (Reviewer) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 smells; 538/538 tests, tsc+vite clean | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 5 (2 med, 3 low; 1 out-of-diff) | confirmed 0 blocking, 5 as non-blocking improvements |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 1 (low) | confirmed 1 as non-blocking [LOW] |

**All received:** Yes (3 enabled returned; 6 disabled via `workflow.reviewer_subagents`)
**Total findings:** 0 confirmed blocking, 6 confirmed non-blocking (1 [LOW] rule, 2 [MEDIUM] test-fidelity, 3 [LOW] test-quality), 0 dismissed

## Reviewer Assessment

**Verdict:** APPROVED

The production change is correct, minimal, and surgical: a new documented per-entity
constant `CATWALK_HIT_RADIUS = 240` (state.ts:168) and a one-line swap of the catwalk hazard
check to use it (sim.ts:449). I verified independently that `COCKPIT = [0,0,0]` (sim.ts:79),
so the catwalk at [0,200,z] has a closest approach of 200 at z=0 — beyond the old
`COCKPIT_HIT_RADIUS` of 80 (dead branch), and inside 240 (now live). The new constant gates
exactly ONE call site; `COCKPIT_HIT_RADIUS`'s 7 other uses are untouched, so no TIE/port/enemy
hit-test is broadened. All five ACs are met and preflight is green (538/538, tsc+vite clean,
0 smells).

**Data flow traced:** the catwalk obstacle's world position (`o.pos`, seeded from
`TRENCH_OBSTACLE_STATIONS` via `spawnTrenchObstacles`) → per-frame `pos = [x, y, z + scroll·dt]`
in `stepTrench` → `collides(pos, COCKPIT, CATWALK_HIT_RADIUS)` → on hit: `crashedCatwalk=true`,
`terrain-crash` event, `lives-1`, and `continue` (removes the obstacle so it cannot re-fire).
Single, well-bounded shield loss. Safe.

**Subagent dispatch (all 8 tags):**
- `[RULE]` reviewer-rule-checker — **[LOW] confirmed**: test helper `isolatedTrench(obstacles: TrenchObstacle[])` should be `readonly TrenchObstacle[]` to match the codebase convention (`readonly Projectile[]` in sim.ts, `readonly TrenchObstacle[]` in trench-obstacles.ts). Confirmed (not dismissed — it matches a real convention) but non-blocking: test-only, zero runtime/type-safety impact. Production fix clean against all 15 rules incl. the core/ purity boundary and the hit-radius-constant convention.
- `[TEST]` reviewer-test-analyzer — **confirmed as non-blocking improvements**, 0 blocking:
  - [MEDIUM] The new tests isolate via `exhaustPort: null`, which is not a production-reachable state (a real trench always carries a port). I **verified** this does NOT hide a bug: the port spawns 300 units behind the catwalk (z=−2400 vs −2100) and both scroll at the same rate, so their crash zones (catwalk |z|≤132.7, port |z|≤80) never overlap the 300-unit gap — no same-frame double-deduction is possible. Still, a test that drives the REAL `enterPhase(...,'trench')` state (port present) through the catwalk window and asserts exactly one shield would prove isolation==reality. Logged as a delivery finding.
  - [MEDIUM] The "far downrange" guard checks a point ~2091 units out — too far to pin the radius edge (it would pass even for an over-corrected radius of 500–1000). A boundary-adjacent case (catwalk at z≈−150, distance≈250, assert no crash) would actually guard the edge. Logged.
  - [LOW] test 3 (exactly-one-catwalk table sanity) duplicates existing coverage and doesn't discriminate the fix; [LOW] the `toHaveLength(0)` assertion in the primary test would pass pre-fix too (unconditional despawn) — non-harmful, since the sibling `crashSeen`/`lives` assertions carry the proof.
  - [MEDIUM, out-of-diff] pre-existing `trench-obstacles.test.ts:107` uses an idealized y=0 catwalk that masks the real geometry — already flagged by TEA; carried forward.
- `[EDGE]` reviewer-edge-hunter — disabled via settings; I covered boundary conditions myself (see Devil's Advocate + the z-geometry analysis above).
- `[SILENT]` reviewer-silent-failure-hunter — disabled; no swallowed errors: the one `throw` in the test fails loud, no try/catch, no `||`/`??` fallbacks introduced.
- `[DOC]` reviewer-comment-analyzer — disabled; I checked the comments myself: the state.ts doc comment and the sim.ts inline comment are accurate to the geometry (200-unit offset, 80 vs 240) and cite story 14-7. No stale docs.
- `[TYPE]` reviewer-type-design — disabled; no stringly-typed APIs, no unsafe casts (the one `as TrenchObstacle['pos']` is a legitimate tuple-narrowing that mirrors production `spawnTrenchObstacles`). Constant inferred as `number`.
- `[SEC]` reviewer-security — disabled; N/A — pure client-side deterministic sim, no user input/auth/network/secrets in the diff.
- `[SIMPLE]` reviewer-simplifier — disabled; the fix is already the simplest correct option (one constant + one call swap); no dead code or over-engineering. Rejected alternatives (raise COCKPIT_HIT_RADIUS / lower spawn-y) are documented in the Dev Assessment.

### Rule Compliance (TS lang-review, 13 checks + 2 project rules)

- **#1 Type-safety escapes** — PASS. No `as any`/`as unknown`/`@ts-ignore`/`!`. The `.find()` result is guarded with `if (!catwalk) throw`. The `[...o.pos] as TrenchObstacle['pos']` is a tuple-narrowing cast identical to prod `spawnTrenchObstacles` (trench-obstacles.ts).
- **#2 Generic/interface** — 1 [LOW] violation: `isolatedTrench` array param not `readonly` (see [RULE] above). All other array params in the diff are fine.
- **#3 Enums** — N/A (no enums; no new switch on `TrenchObstacle['kind']`).
- **#4 Null/undefined** — PASS. `.find()` guarded; `catwalks[0]` accessed only after `toHaveLength(1)`; no `||`/`??` misuse (zero occurrences in diff).
- **#5 Modules** — PASS. Inline `type` modifiers on type-only imports; value imports used as values; `moduleResolution: bundler` doesn't require `.js` extensions (matches every sibling test).
- **#6 React/JSX** — N/A (no .tsx).
- **#7 Async** — N/A (`stepGame`/`enterPhase` are synchronous pure functions).
- **#8 Test quality** — PASS. Imports from `src/` not `dist/`; no `as any`; every test carries a meaningful assertion.
- **#9 Build/config** — N/A (no config touched).
- **#10 Input validation** — N/A (no external input).
- **#11 Error handling** — PASS. The one `throw` is loud with a message; no swallowed errors.
- **#12 Perf/bundle** — PASS. Specific named imports; no dynamic import/JSON.stringify/sync fs.
- **#13 Fix-introduced regressions** — PASS. No `as any` added to silence errors; radius derivation fully explained, not papered over.
- **[Project] core/ purity boundary** — PASS. New constant is a pure number; no shell import, no DOM/Date.now/Math.random/rAF; `pos` derives from the existing `dt` param; collision is genuine 3D `Vec3` distance against `COCKPIT=[0,0,0]`.
- **[Project] per-entity hit-radius convention** — PASS. `CATWALK_HIT_RADIUS` has a doc comment deriving its value and sits beside the sibling radii, exactly matching convention.

### Devil's Advocate

Let me argue this code is broken. First attack: the radius `240` is a magic number pulled from
thin air — but the doc comment derives it (200-unit fixed y-offset + margin so the discrete
~8.3 u/frame scroll actually lands a frame inside the shell rather than skipping a razor-thin
z=0 plane), so it is principled, not arbitrary. Second attack: does 240 make OTHER things
crash? No — `CATWALK_HIT_RADIUS` gates only the `o.kind === 'catwalk'` branch; turrets/squares
never crash the cockpit at all, and I confirmed the constant has exactly one call site. Third
attack — the scariest — a real trench carries BOTH a catwalk and an exhaust port, and
`stepTrench` has two independent `lives-1` sites; could a single frame deduct two shields now
that the catwalk is live? I chased this to ground with the constants: catwalk at z=−2100 (crash
zone |z|≤132.7) and port at z=−2400 (crash zone |z|≤80) scroll together with a fixed 300-unit
separation; 132.7 + 80 = 212.7 < 300, so the two crash zones can never coincide on one frame.
The catwalk is `continue`'d out of the survivor list the instant it crashes, so it also cannot
re-fire on a later frame. No double-deduction. Fourth attack: what if a future station adds a
catwalk at x≠0 or a different y? Then 240 might not reach it — but this diff has exactly one
catwalk at x=0,y=200 (asserted by test 3), so that is future work, not a defect here. Fifth
attack: floating-point — could the crossing frame skip the shell entirely? No: the 240 radius
opens a ~16-frame window (|z|≤132.7 at 8.3 u/frame), far wider than any single-step drift, and
the 252-frame driving test empirically confirms the crash fires. The code survives the
interrogation. The residual concerns are all test-strengthening, not correctness.

**Pattern observed:** per-entity named hit-radius with derivation comment — `CATWALK_HIT_RADIUS`
at state.ts:168, consistent with `PORT_HIT_RADIUS`/`OBSTACLE_HIT_RADIUS`/`TURRET_HIT_RADIUS`.
**Error handling:** the loud `throw` in `spawnedCatwalk()` (test) is the only failure path; the
sim branch is total (crash or scroll-on), no swallowed states.

**Handoff:** To Winston Smith (SM) for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): The existing test that was *supposed* to cover this hazard
  masked the bug by using an idealized catwalk at `[0, 0, -1]` (y=0), where it trivially
  collides — giving false green while the real y=200 station never could. Affects
  `star-wars/tests/core/trench-obstacles.test.ts` (the "cockpit contact with a CATWALK costs
  a shield" case, ~line 107 — consider re-pointing it at the real spawn geometry, or leave it
  as a pure collision-primitive test now that `trench-catwalk-hazard.test.ts` covers the real
  path). *Found by TEA during test design.*
- **Improvement** (non-blocking): This class of bug (a hazard geometrically unreachable over
  time) is invisible to the static `/scenes.html` contact sheet — it needs a stepped-sim test.
  Worth a note in the fidelity-epic testing guidance so future obstacle stations get a
  drive-through assertion, not just a single-frame render. *Found by TEA during test design.*

### Dev (implementation)
- **Question** (non-blocking): With the fix, the catwalk is now an UNAVOIDABLE hazard — the
  ship has no vertical freedom in the trench (`COCKPIT` is fixed at the origin), so the y=200
  catwalk always reaches z=0 and always costs exactly one shield on every trench pass. This is
  per-spec (AC1 wants a crash at z=0), but a future fidelity pass may want the catwalk to be
  dodgeable (e.g., an altitude dip) rather than a guaranteed −1. Affects
  `star-wars/src/core/sim.ts` (`stepTrench`) if dodge mechanics are ever added. *Found by Dev
  during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): The new tests isolate the shield count via `exhaustPort: null`,
  which is not a production-reachable state. I verified there is no double-deduction bug (the port
  sits 300 units behind the catwalk; their crash zones never overlap), but a test driving the REAL
  `enterPhase(initialState(),'trench')` state (port present) through the catwalk-crossing window and
  asserting exactly one shield lost would prove isolation matches reality. Affects
  `star-wars/tests/core/trench-catwalk-hazard.test.ts` (add a combined-path case). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): The "far downrange" guard probes a point ~2091 units out — too far
  to pin the radius edge (it would pass even for an over-corrected radius of 500–1000). A
  boundary-adjacent case (catwalk at z≈−150, distance≈250, assert no crash) would actually guard the
  ~132-unit edge the fix introduces. Affects `star-wars/tests/core/trench-catwalk-hazard.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking, [LOW]): `isolatedTrench(obstacles: TrenchObstacle[])` should be
  `readonly TrenchObstacle[]` (param is only read via `.map()`) to match the codebase's readonly-array
  convention. Affects `star-wars/tests/core/trench-catwalk-hazard.test.ts`. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

2 deviations

- **Behavior-level assertions instead of pinning one specific fix**
  - Rationale: Three valid fixes exist (widen radius / lower spawn-y / dedicated catwalk radius); coupling the test to one would wrongly reject the others.
  - Severity: minor
- **AC "maintains consistency with other trench obstacle hazard logic" verified by review, not by a unit assertion**
  - Rationale: "Consistency" is a design-review property, not a behavior a unit test can assert without over-coupling to the implementation shape.
  - Severity: minor
  - Forward impact: Reviewer (The Thought Police) should confirm the chosen fix reads consistently with the existing port/turret hazard checks in `stepTrench`.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Behavior-level assertions instead of pinning one specific fix**
  - Spec source: context-story-14-7.md, AC "Catwalk collision now triggers the crash event when it reaches z=0"
  - Spec text: "Catwalk collision now triggers the crash event when it reaches z=0; Shield loss of -1 occurs upon catwalk contact"
  - Implementation: The RED driver reads the catwalk from `spawnTrenchObstacles()` and asserts (terrain-crash fired, exactly one shield lost) rather than a specific radius value or spawn-y.
  - Rationale: Three valid fixes exist (widen radius / lower spawn-y / dedicated catwalk radius); coupling the test to one would wrongly reject the others.
  - Severity: minor
  - Forward impact: none
- **AC "maintains consistency with other trench obstacle hazard logic" verified by review, not by a unit assertion**
  - Spec source: context-story-14-7.md, AC "Solution maintains consistency with other trench obstacle hazard logic"
  - Spec text: "Solution maintains consistency with other trench obstacle hazard logic"
  - Implementation: No automated test enforces stylistic/consistency parity with the port/turret hazard logic; the RED tests assert only the observable crash behavior.
  - Rationale: "Consistency" is a design-review property, not a behavior a unit test can assert without over-coupling to the implementation shape.
  - Severity: minor
  - Forward impact: Reviewer (The Thought Police) should confirm the chosen fix reads consistently with the existing port/turret hazard checks in `stepTrench`.

### Dev (implementation)
- No deviations from spec. All five ACs are met: the catwalk crashes at z=0 (AC1), costs
  exactly one shield (AC2), uses the codebase's per-entity hit-radius pattern for consistency
  (AC3), adds no debug code (AC4), and the full suite passes 538/0 (AC5). Option 3 was one of
  the three fix options the spec explicitly offered — see the Dev Assessment for why it was
  chosen over options 1 and 2.

### Reviewer (audit)
- **TEA — "Behavior-level assertions instead of pinning one specific fix"** → ✓ ACCEPTED by Reviewer:
  correct call. Asserting crash + exactly-one-shield keeps the test valid across all three fix
  options; Dev's Option 3 satisfies it cleanly.
- **TEA — "AC3 consistency verified by review, not a unit assertion"** → ✓ ACCEPTED by Reviewer, and
  audited: the fix uses `CATWALK_HIT_RADIUS` in the same named-per-entity-radius style as
  `PORT_HIT_RADIUS`/`OBSTACLE_HIT_RADIUS`, with a doc comment — consistent with the existing hazard
  logic. AC3 is met.
- **Dev — "No deviations from spec"** → ✓ ACCEPTED by Reviewer: confirmed. Option 3 is within the
  spec's offered menu; all five ACs verified met. No undocumented deviations found — the diff touches
  only the catwalk hazard radius and its test, exactly as scoped.