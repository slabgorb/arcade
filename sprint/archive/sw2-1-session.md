---
story_id: "sw2-1"
jira_key: "sw2-1"
epic: "sw2"
workflow: "tdd"
---
# Story sw2-1: TIE fighters hittable on approach — register shots during the inbound run, not only after they turn back

## Story Details
- **ID:** sw2-1
- **Jira Key:** sw2-1
- **Epic:** sw2 (Star Wars — playtest followup)
- **Workflow:** tdd
- **Stack Parent:** none

## Story Context

**Type:** Bug (P1)
**Points:** 3
**Repository:** star-wars

### Problem Statement

TIE fighters cannot be hit by player laser shots while flying inbound toward the player. Hits only register after the TIE has completed its attack run, turned back to retreat, and is very close to the player. This severely limits the player's defensive options during the high-risk inbound phase.

### Expected Behavior

Player laser shots should register collisions/hits against TIE fighters during their entire flight path, including:
- Inbound approach (initial attack run toward player)
- After turnaround (retreat phase)

### Technical Context

**Location:** star-wars/src/core (deterministic simulation)

**Likely Issue Areas:**
- Collision detection between player laser shots and TIE fighter bounding boxes/hit regions
- Hit detection might only be active in certain flight phases (post-turnaround state)
- TIE fighter state machine may not register collisions during inbound phase
- Laser shot lifecycle or collision registration may be frame-gated or state-dependent

**Reference:** Star Wars arcade ROM collision model; authentic behavior for reference under `reference/` (ROM disassembly).

## Acceptance Criteria

1. Player laser shots collide with TIE fighters during the **inbound approach phase** (before turnaround)
2. Player laser shots collide with TIE fighters during the **retreat phase** (after turnaround) — regression test
3. Collision damage / kill event fires correctly for both phases
4. No false-positive hits on other objects (terrain, other enemies)
5. All existing collision tests remain green

## Workflow Tracking

**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-07T13:54:03Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-07T13:21:53Z | 2026-07-07T13:24:15Z | 2m 22s |
| red | 2026-07-07T13:24:15Z | 2026-07-07T13:37:26Z | 13m 11s |
| green | 2026-07-07T13:37:26Z | 2026-07-07T13:44:23Z | 6m 57s |
| review | 2026-07-07T13:44:23Z | 2026-07-07T13:54:03Z | 9m 40s |
| finish | 2026-07-07T13:54:03Z | - | - |

## Delivery Findings

No upstream findings at setup.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): The bolt-reach ceiling that hides inbound TIEs (`PROJECTILE_SPEED`×`PROJECTILE_TTL` ≈ 1800u vs `TIE_SPAWN_DISTANCE` 8000) is shared by the surface phase — laser turrets are shot with the SAME player bolts (`stepSurface`, same `collides`/`advance`), so surface targets past ~1800u are likely equally unhittable-at-range. Affects `star-wars/src/core/sim.ts` (a reach fix scoped only to the space step may need to apply to the surface turret loop too). *Found by TEA during test design.*
- **Question** (non-blocking): The per-pair hit-test (`collides`, line 197) is already phase-agnostic — an approaching TIE and a peeling TIE hit-test identically. The bug is purely bolt REACH, not a state gate. Dev should NOT add an approach/peel condition to the collision predicate. Affects `star-wars/src/core/state.ts` (`PROJECTILE_TTL`/`PROJECTILE_SPEED` tuning is the likely lever). *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): The reach fix is global (single `PROJECTILE_SPEED`), so it incidentally extends bolt reach in the surface and trench phases too. Harmless (all 542 tests green) and arguably correct, but sw2-3 (surface towers) and sw2-4 (exhaust-port timing/feedback) should re-check feel/timing under the faster real-fired bolt during their work. Affects `star-wars/src/core/state.ts` (`PROJECTILE_SPEED`). *Found by Dev during implementation.*
- **Question** (non-blocking): TEA flagged surface turrets as possibly unhittable-at-range, but turrets spawn at `SPAWN_DISTANCE` (1200) — already inside the OLD 1800 reach — so that specific concern was moot even before this change. Affects `star-wars/src/core/sim.ts` (`stepSurface`). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): The 5000 bolt speed (~83 u/frame at 60fps) creates a TUNNELING exposure on every small-radius target a real-fired bolt tests per-frame (no swept collision exists anywhere in the core): enemy fireballs (`ENEMY_SHOT_HIT_RADIUS` 90, sim.ts:217), the trench exhaust port (`PORT_HIT_RADIUS` 120, sim.ts:495), and trench obstacles (`OBSTACLE_HIT_RADIUS` 90, trench-obstacles.ts:41). Dead-centre shots still register (~2–3 frames); grazing shots can skip the sphere. TIEs (250) stay safe. No test exercises real-speed interception (fireball/port tests hand-place unit-velocity bolts). Affects `star-wars/src/core/sim.ts` + `trench-obstacles.ts` — sw2-2 (fireballs) and sw2-4 (exhaust port) should add a real-fired-bolt test and consider a swept/segment collision (or a per-target reach cap) when they touch those mechanics. *Found by Reviewer during code review.*
- **Gap** (non-blocking): No test drives a real MOVING, banking inbound TIE (vel≠0 from `TIE_SPAWN_DISTANCE`) through the aim+trigger path at range — every sw2-1 test uses a stationary stand-in. The reach dimension is validly isolated, but AC-1's literal scenario (a swooping approach) is covered only by composition with the existing 8-16 aim tests. Affects `star-wars/tests/core/tie-inbound-hittable.test.ts` (add a moving-approach kill test). *Found by Reviewer during code review.*

## Design Deviations

No deviations at setup.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **RED asserts killability across the full approach volume, out to the spawn distance**
  - Spec source: context-story-sw2-1.md / session AC-1
  - Spec text: "Player laser shots collide with TIE fighters during the inbound approach phase (before turnaround)"
  - Implementation: Tests assert an inbound TIE is killable at BOTH a mid-approach range (4000) and the far edge (`TIE_SPAWN_DISTANCE` = 8000), which requires GREEN to restore near-full-depth bolt reach, not merely nudge it past close range.
  - Rationale: "On the way in" begins at spawn; the authentic cabinet lets the player engage TIEs as distant specks. A test only at a modest range could be satisfied by a partial fix that still hides fresh spawns — reproducing the very complaint.
  - Severity: minor
  - Forward impact: If GREEN deliberately caps reach at a bounded engagement range (< 8000), the spawn-distance test will fail and must be renegotiated with Reviewer; the mid-approach test would still hold.

### Dev (implementation)
- **Fixed inbound reach by raising the single global bolt speed, not a TIE-only reach model**
  - Spec source: session AC-1 / tie-inbound-hittable.test.ts
  - Spec text: "Player laser shots collide with TIE fighters during the inbound approach phase (before turnaround)"
  - Implementation: Raised `PROJECTILE_SPEED` 900 → 5000 (reach = speed × TTL = 10000 ≥ the 8015 worst-case spawn). `PROJECTILE_TTL` and the hit-test are unchanged; no approach/peel gate added (per TEA's Question).
  - Rationale: There is ONE player-bolt speed shared by every phase — the minimal lever that clears the approach volume. Raising speed (not TTL) keeps bolts short-lived (no lingering clutter) and restores a faithful fast-tracer feel; the old 900 was slower than the 1300-unit TIE approach.
  - Severity: minor
  - Forward impact: Player bolts are now ~5.5× faster in ALL phases. No test regressed (542 green; hand-placed-bolt tests set their own unit velocity). sw2-3 (surface towers) and sw2-4 (exhaust-port timing) will see faster real-fired bolts.

### Reviewer (audit)
- **TEA — "RED asserts killability across the full approach volume, out to the spawn distance"** → ✓ ACCEPTED: Faithful reading of AC-1 ("inbound approach phase" begins at spawn); pinning reach at `TIE_SPAWN_DISTANCE` prevents a partial fix that still hides fresh spawns. GREEN met it (reach 10000 ≥ 8015) rather than renegotiating, so the forward-impact clause is moot.
- **Dev — "Fixed inbound reach by raising the single global bolt speed, not a TIE-only reach model"** → ✓ ACCEPTED: There is exactly one player-bolt speed constant; raising it is the minimal, faithful lever (the old 900 was slower than the 1300-unit TIE approach). Speed-over-TTL correctly keeps bolts short-lived. The global side effects are real but non-blocking and are captured as Reviewer Delivery Findings for sw2-2/sw2-4.

## Sm Assessment

**Routing:** → Furiosa (TEA), RED phase. Phased TDD, 3pts, p1 bug in `star-wars`. Branch `fix/sw2-1-tie-fighters-hittable-approach` off `develop` (star-wars is gitflow — PR targets `develop`).

**Diagnosis (from live playtest):** TIE fighters only take hits *after* they finish the attack run, turn back, and close to short range. During the inbound approach they're effectively invulnerable to player lasers. The kill obviously works (they die on the way out), so this is not "collision is broken" — it's "collision is gated to the wrong flight state / range." The failing test needs to pin the *phase-independence* of hit detection, not just "a laser can hit a TIE."

**What the RED tests must capture (for TEA):**
- A player laser occupying the same position as an inbound TIE (pre-turnaround) registers a hit / kill event. This is the story — it must fail first against current code.
- Regression guard: a laser vs a retreating (post-turnaround) TIE still registers — don't fix inbound by breaking the path that currently works.
- Negative guard: no false-positive hits against non-TIE objects at the same coordinates (terrain/other enemies), so the fix widens *when* collisions count, not *what* collides.

**Investigation pointer (not a solution — Dev owns the fix):** deterministic sim lives in `star-wars/src/core`. Look for where TIE state (approach vs retreat) or range-to-player gates the laser↔TIE collision check. Likely a state/range guard around the collision test rather than the collision math itself.

**Scope boundary:** this story fixes *inbound hittability only*. Broad ROM-accuracy of the TIE collision model is deliberately deferred to the `sw2-6` disassembly-audit spike — do not gold-plate here. The `reference/` disassembly is available if TEA/Dev want to sanity-check authentic hit regions, but matching ROM exactly is not an AC for sw2-1.

**Handoff clean.** Session, context, and branch all in place. Witness me.

## TEA Assessment

**Tests Required:** Yes
**Reason:** P1 behavioral bug — the inbound-hittability regression must be pinned by a failing test before GREEN so the fix is measured, not asserted.

**Test Files:**
- `star-wars/tests/core/tie-inbound-hittable.test.ts` — inbound-TIE hittability: 2 RED reproducers + 1 retreat-path regression guard + 1 aim-line negative guard.

**Tests Written:** 4 tests. AC coverage: AC-1 (inbound hittable) → both RED tests; AC-2 (retreat still hittable) → peeling regression guard; AC-3 (kill event fires) → spawn-distance test asserts the `enemy-death`/`tie` event + `TIE_SCORE`; AC-4 (no false positives) → off-axis negative guard; AC-5 (existing tests stay green) → full-suite run, 540 pass.

**Status:** RED confirmed via `testing-runner` (RUN_ID sw2-1-tea-red). File compiles; exactly 2 tests fail (inbound TIE at spawn distance 8000 and mid-approach 4000 — bolt never reaches); the 2 guards pass; the other 540 star-wars tests stay green.

**Root shape (for Dev — behavioral, not prescriptive):** player bolt reach = `PROJECTILE_SPEED`(900) × `PROJECTILE_TTL`(2) ≈ 1800u, but TIEs spawn at `TIE_SPAWN_DISTANCE` (8000). Inbound fighters sit out of reach until they close to ~1800u ("very close"). The per-pair hit-test (`collides`, sim.ts:197, `TIE_HIT_RADIUS`) is ALREADY phase-agnostic — **do not add a peeling/approach gate to the collision predicate**; the fix is bolt REACH, not the hit-test. Tests assert observable state only (enemy count / score / lives / event), so restore reach however fits — bolt lifetime, speed, or an explicit range model. Two hard constraints from the guards: keep the peeling-retreat path killable, and keep reach directional along the aim line (a straight shot must still miss an off-axis fighter).

### Rule Coverage

| Rule (TS lang-review) | Test(s) / Handling | Status |
|-----------------------|--------------------|--------|
| #8 Test quality — meaningful assertions, no vacuous | All 4 tests assert `enemies.length` + `score` + `lives` (headline also asserts the `enemy-death` event) | green (self-checked) |
| #8 No `as any` in test assertions | None used; fixtures are fully typed (`Enemy`/`GameState`/`Vec3`) | clean |
| #4 `??` vs `||` on falsy-valid values | Production-side (reach constants) — flagged for GREEN via Delivery Findings | deferred to Dev's lang-review gate |
| #1 Type-safety escapes | None introduced in tests; production-side check | deferred to Dev's lang-review gate |

**Rules checked:** The test-facing rule (#8) is fully covered and self-checked. The remaining lang-review rules are static-analysis checks on the GREEN production code (type escapes, null-handling, async), enforced at Dev's handoff gate — they are not unit-testable from a pure-core spec, so they are noted here as deferred rather than given vacuous "tests."
**Self-check:** 0 vacuous tests — no `let _ =`, no `assert(true)`, no always-`None`/always-empty assertions; every assertion discriminates pass from fail.

**Handoff:** To The Word Burgers (Dev) for GREEN — make the two failing tests pass without breaking the guards or the 540 green tests.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `star-wars/src/core/state.ts` — `PROJECTILE_SPEED` 900 → 5000 (+ expanded comment). A bolt's reach (speed × TTL) now clears the full TIE approach volume (10000 ≥ 8015 worst-case spawn), so inbound TIEs are engageable the moment they appear. One-constant fix; the hit-test and `PROJECTILE_TTL` are untouched.

**Tests:** 542/542 passing (GREEN) — the 2 inbound reproducers now pass; the retreat-path and off-axis guards stay green; the other 540 tests unaffected. `tsc --noEmit` + vite build clean.
**Verification:** `testing-runner` RUN_ID sw2-1-dev-green — full suite (45 files) green, no type errors. Behaviour exercised end-to-end through the real firing path (`stepGame`/`advance`/`collides`), not mocks.
**Branch:** fix/sw2-1-tie-fighters-hittable-approach (pushed)

**Approach:** Minimal. The defect was bolt REACH, not the collision predicate — the per-pair hit-test is already phase-agnostic, so NO approach/peel gate was added. Chose speed over TTL so bolts stay short-lived and regain a fast-tracer feel (the old 900 was slower than the 1300-unit TIE approach — the laser the fighters outran).

**Handoff:** To Immortan Joe (Reviewer) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 542/542 green, tsc+vite build clean, 0 smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings (boundary/tunnel analysis done manually — see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 4 (1 med, 3 low) | confirmed 4 (all non-blocking), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings (comment nit surfaced by test-analyzer — see [DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings (type rules covered by rule-checker #1/#2/#5) |
| 7 | reviewer-security | Yes | clean | none | N/A — no security surface; purity boundary intact |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 13 rules | N/A — all compliant, core/shell purity confirmed |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 6 confirmed (2 medium + 2 low from test-analyzer/reviewer + 2 reviewer-originated Delivery Findings), 0 dismissed, 0 deferred. **No Critical/High.**

## Reviewer Assessment

**Verdict:** APPROVED

The fix is minimal, correct for its scope, and provably solves the reported bug. `PROJECTILE_SPEED` 900 → 5000 raises bolt reach (speed × TTL) from ~1800 to 10000, clearing the 8015 worst-case TIE spawn volume, so inbound TIEs are engageable on the way in. The collision predicate is untouched and remains phase-agnostic — no approach/peel gate was bolted on. test-analyzer empirically confirmed the RED reproducers fail at 900 and pass at 5000; the full suite is 542/542 green; tsc + vite build clean; the core/shell purity boundary is intact.

**Data flow traced:** `input.fire` → `stepGame` spawns a bolt at `COCKPIT` with `vel = aimDirection(...) × PROJECTILE_SPEED` (sim.ts:118) → `advance()` integrates it by `dt` (sim.ts:646) → per-frame `collides(enemy.pos, bolt.pos, TIE_HIT_RADIUS)` (sim.ts:197) → `enemy-death` event + `TIE_SCORE`. The only changed value is the velocity magnitude; the path is otherwise unchanged and safe.

### Observations (≥5)

- [VERIFIED] Reach fix is real and correct — evidence: state.ts:118 (`PROJECTILE_SPEED = 5000`); reach = 5000 × `PROJECTILE_TTL`(2) = 10000 ≥ 8015 worst-case spawn (`TIE_SPAWN_DISTANCE` 8000 + `SPAWN_SPREAD` 350 corner). test-analyzer checked out commit 23fed95 and confirmed the 2 reproducers fail at 900, pass at 5000. Complies with the core purity rule (numeric constant, no I/O).
- [VERIFIED] Hit-test unchanged & phase-agnostic — evidence: sim.ts:197 `collides(...TIE_HIT_RADIUS)` is not in the diff; no `peeling`/approach condition added, exactly per TEA's guidance. The fix widens HOW FAR a bolt flies, not WHAT it collides with.
- [VERIFIED] Core/shell purity intact — evidence: rule-checker + security both grepped state.ts and the test for `Date.now`/`new Date`/`performance.now`/`Math.random`/`requestAnimationFrame`/DOM → zero matches; time enters only as `DT`, randomness only via seeded `initialState(1983)`. [SEC][RULE]
- [MEDIUM] [TEST] Coverage gap — no test drives a real MOVING, banking inbound TIE (vel≠0 from spawn distance) through the aim+trigger path at range; every sw2-1 test uses a stationary stand-in (tie-inbound-hittable.test.ts). Non-blocking: the reach dimension is validly isolated by the stationary fixture (the codebase's endorsed pattern, per combat-kill-loop.test.ts:57-60), and banking/aim is orthogonal and covered by the 8-16 kill-loop suite. Recorded as a Delivery Finding for a follow-up integration test.
- [MEDIUM] [EDGE][SIMPLE] Tunneling exposure from the 5.5× speed bump — a real-fired bolt now steps ~83 u/frame; collision is a per-frame sphere test with no swept/continuous fallback anywhere in the core. Dead-centre closing leaves only ~2 frames inside the fireball sphere (`ENEMY_SHOT_HIT_RADIUS` 90, sim.ts:217, down from ~9 at 900), ~2.6 inside the exhaust port (`PORT_HIT_RADIUS` 120, sim.ts:495), ~2.9 inside obstacles (90, trench-obstacles.ts:41); grazing shots may skip entirely. TIEs (250) stay safe (~4.8 frames). Non-blocking for sw2-1 (its target is safe and all ACs/tests pass); recorded as a Delivery Finding directed at sw2-2 (fireballs) and sw2-4 (exhaust port), with a recommendation to add real-fired-bolt tests and consider swept collision.
- [LOW] [DOC] Comment overclaim — the score/lives assertion comments ("by fire (a ram never scores)", "it never rammed (stationary)") imply they discriminate kill-by-fire from kill-by-ram, but a `vel=[0,0,0]` TIE can never advance to `COCKPIT_HIT_RADIUS`, so the ram case is structurally unreachable (test-analyzer, tie-inbound-hittable.test.ts:97,126). The assertions are still valid checks on the scoring side-effect. Non-blocking; optional wording softening.
- [VERIFIED] Determinism preserved — no RNG/time surface touched; a pure scalar change. [SILENT] no error paths exist in a constant edit — nothing swallowed.

### Rule Compliance

Rubric = `.pennyfarthing/gates/lang-review/typescript.md` + the star-wars core/shell purity rule (CLAUDE.md). Enumerated exhaustively by reviewer-rule-checker over both changed files (24 instances, 13 rules):

| Rule | Instances in diff | Verdict |
|------|-------------------|---------|
| #1 Type-safety escapes (`as any`, `!`, `as unknown as`, `@ts-ignore`) | 2 files scanned | compliant — zero matches |
| #2 Generic/interface pitfalls (`Partial<T>` misuse, missing `readonly`) | `tieStill`/`loneWave` `Partial<>` overrides (test:54,78) | compliant — base object fully populated before spread; matches combat-kill-loop.test.ts idiom |
| #4 `??` vs `||` on falsy-valid values | 0 | N/A — no null-coalescing in diff |
| #5 Module/import (`import type` for values, `.js` ext) | 4 imports (test:16,23,24) | compliant — runtime vs type imports correctly split; `moduleResolution: bundler` |
| #8 Test quality (vacuous asserts, `as any`, `dist/` imports, `.only/.skip`) | 4 tests | compliant — precise `toBe`/`toHaveLength`, no truthy shortcuts, imports from `src/` |
| #10/#12 Security/perf (JSON.parse, barrels) | submodule import (test:24) | compliant — specific `/math3d` path, no untrusted input |
| Core/shell purity (CLAUDE.md) | state.ts constant; test imports | compliant — no shell import, no DOM/time/random |
| #3/#6/#7/#9/#11 (enums, JSX, async, config, error-handling) | 0 | N/A — none present in a constant + pure-core-test diff |

### Devil's Advocate

Argue this is broken. The most dangerous move here is a **global constant masquerading as a local fix**: `PROJECTILE_SPEED` is not a "TIE reach" knob — it is the speed of *every* player bolt in *every* phase. A reviewer who only checks the TIE path is exactly the trap the agent guide warns about. So what breaks downstream? Collision in this engine is a per-frame post-integration sphere check (`collides` = `length(sub(a,b)) ≤ r`), with **no swept/segment test to fall back on** — I grepped and confirmed none exists. At 900 u/s a bolt crept 15 units/frame; at 5000 it leaps 83. Against small targets that is the classic discrete-collision pass-through: the enemy fireball sphere is radius 90, the exhaust port 120, wall obstacles 90. A confused player who "clearly hit that fireball" but watched their bolt phase through it would rightly call this build broken — and the exhaust port is the literal *win condition* of the game, so a tunnelled port shot is a lost run. Worse, the test suite gives false comfort: every fireball/port/obstacle test hand-places a bolt with unit velocity `[0,0,-1]`, so not one of them exercises a bolt actually moving at 5000 — the suite is structurally blind to the regression the change most plausibly introduces. A stressed, deep-wave scenario (ENEMY_SPEED ramps with the wave) narrows the margin further. And the tests that DO pass use stationary stand-ins, so a real banking TIE whose lateral swoop drifts it off the aim line mid-flight is never fired upon at range — the headline scenario is validated only by inference.

Where the devil loses: I ran the arithmetic, not just the fear. Even dead-centre against the *smallest* radius (90) the bolt still lands ~2 frames inside the sphere, and an aimed port/fireball shot connects; the ramp math keeps the TIE path at ~4.8 frames. Nothing is *proven* broken, all 542 tests are green, and the fireball/port mechanics are already flagged-broken and owned by sw2-2/sw2-4 — the correct channel for the swept-collision follow-up. So the tunneling and moving-TIE gaps are genuine and I am recording them as blocking-nothing Delivery Findings, not inventing a rejection. The story's own AC surface is correct, tested, and safe.

**Verdict:** APPROVED — no Critical/High findings. Two Medium and one Low observation recorded as non-blocking Delivery Findings for sibling stories (sw2-2, sw2-4) and a follow-up test. Deviations (TEA full-depth-reach, Dev global-speed) both ACCEPTED.

**Handoff:** To The Organic Mechanic (SM) for finish-story.