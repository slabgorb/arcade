---
story_id: "8-8"
jira_key: ""
epic: ""
workflow: "tdd"
---
# Story 8-8: Wave/phase progression: space->surface->trench (make Waves 2-3 playable)

## Story Details
- **ID:** 8-8
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** tdd
- **Stack Parent:** 8-4
- **Points:** 3
- **Priority:** p2
- **Repo:** star-wars

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-28T09:22:06Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-28T08:45:30Z | 2026-06-28T08:47:27Z | 1m 57s |
| red | 2026-06-28T08:47:27Z | 2026-06-28T08:57:41Z | 10m 14s |
| green | 2026-06-28T08:57:41Z | 2026-06-28T09:07:58Z | 10m 17s |
| review | 2026-06-28T09:07:58Z | 2026-06-28T09:22:06Z | 14m 8s |
| finish | 2026-06-28T09:22:06Z | - | - |

## Sm Assessment

**Story nature:** 8-8 wires the phase-progression machinery so the already-built
surface (8-4) and trench (8-5) waves become reachable in live play instead of
test-only dead code. The transition logic lives in `src/core/sim.ts` (pure,
deterministic — dt + seeded RNG); a secondary thread reconciles the provisional
surface render placement 8-4 left behind (`src/shell/render.ts`).

**Routing rationale:** tdd / phased workflow → RED phase first. TEA (Han Solo)
writes failing tests that pin the deterministic phase-advance contract
(space→surface→trench, advance condition, score/lives carry-forward) before any
implementation.

**Dependencies flagged for TEA:**
- Depends on 8-4 (surface) — complete and merged.
- Full chain also wants 8-5 (trench). If 8-5 does not yet exist, the trench leg
  cannot be exercised end-to-end; pin the space→surface leg now and treat the
  surface→trench transition condition as the testable unit. Surface this as a
  Delivery Finding if 8-5's absence blocks an AC.
- AC #3 (live surface eyeball / no floating turrets) is a render-verification
  task — carries into the verify phase, not unit-testable in core.

**Jira:** none — local sprint tracking only. Explicitly skipped, not an oversight.

**Gate:** session, context, branch all present. Pre-handoff checklist passes.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** New gameplay machinery (phase progression) with a deterministic core
contract — squarely TDD.

**Test Files:**
- `star-wars/tests/core/phase-progression.test.ts` — pins the space→surface→trench
  progression contract: kill-quota advance condition, ordering, score/lives
  carry-forward, per-phase clean open, determinism, and trench terminal safety.

**Tests Written:** 15 tests (13 RED, 2 guards passing) covering AC1 (the
deterministic phase-advance contract) in full. AC2 (reachable/playable) is covered
to the extent 8-8 can — the transition INTO surface and trench is proven; trench
*playability* is blocked on 8-5 (Delivery Finding). AC3 (live surface eyeball / no
floating turrets) is a render-verification task for the verify phase — not
unit-testable in the pure core.

**Status:** RED — 13 failing, ready for Dev. `tsc` is red on exactly the contract
to build: `GameState.phaseKills`, `SPACE_WAVE_QUOTA`, `SURFACE_WAVE_QUOTA`.

### Rule Coverage

| Rule (lang-review/typescript.md) | Test(s) | Status |
|---|---|---|
| #4 null/undefined: `??` vs `||` on 0-valued counter | `phaseKills` starts 0 and is asserted `toBe(0)` (a falsy-but-valid value the transition must not treat as "unset") | failing |
| #3 enum/union exhaustiveness on `Phase` | trench leg exercised (`surface clears to trench`, `holds in the trench`) so a non-exhaustive `phase` switch is caught | failing |
| #8 test quality (own tests) | every test asserts a concrete value (`toBe`/`toHaveLength`/`toEqual`); no `let _ =`, no `assert(true)`, no `is_none`-style vacuity | n/a (self-check) |

**Rules checked:** The pure deterministic core touches few of the 13 lang-review
rules (no React, no async, no JSON/IO boundaries, no `as any`); the applicable ones
(null-handling on the new counter, union exhaustiveness across the third phase, and
test-quality self-check) have coverage above.
**Self-check:** 0 vacuous tests — every test carries a meaningful assertion.

**Handoff:** To Dev (Yoda) for GREEN implementation.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `star-wars/src/core/state.ts` — added `phaseKills` to `GameState` (+ `initialState`
  = 0) and the `SPACE_WAVE_QUOTA` (6) / `SURFACE_WAVE_QUOTA` (4) constants.
- `star-wars/src/core/sim.ts` — count kills into `phaseKills` per phase; new
  `progress()` / `enterPhase()` spine advances space→surface→trench on the quota,
  carrying score/lives and opening each phase clean; new `stepTrench()` safe
  terminal hold; phase dispatch routes surface/trench and progress-wraps space/surface.
  Phase order & quotas are `Record<Phase, …>` tables so the third phase can't be
  forgotten (exhaustive by type).
- `star-wars/src/shell/render.ts` — turrets now render in the floor's −altitude
  frame (no longer floating at the sim's world y=0).

**Tests:** 94/94 passing (GREEN). `tsc --noEmit && vite build` clean. The 13 RED
8-8 tests are now green; the 2 guards stay green; all 79 prior tests unaffected.

**ACs:**
- AC1 (deterministic space→surface→trench advance, carry score/lives) — DONE, fully
  tested.
- AC2 (surface & trench reachable in live play) — surface reachable & playable;
  trench reachable but a terminal hold (gameplay is 8-5). See Delivery Findings.
- AC3 (turret/floor framing reconciled; live eyeball) — framing fix DONE in code;
  live visual eyeball deferred to Reviewer (see Design Deviation — port owned by the
  live checkout, surface phase not scriptable without forbidden debug hooks).

**Branch:** `feat/8-8-wave-phase-progression` (pushed to origin/star-wars).

**Handoff:** To Reviewer (Obi-Wan) for code review — please eyeball the surface
phase live (no floating turrets; skim readability) as the remaining AC3 confirmation.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): Trench gameplay (story 8-5) does not exist — `stepGame`
  has no `stepTrench`, only `stepSurface`; 8-5 is still `backlog`. So AC2's "trench
  reachable AND playable in the live game" cannot be fully met by 8-8: this story
  can only land the transition INTO the trench (proven by the suite) and a safe
  terminal hold. Full trench playability waits on 8-5. Affects
  `star-wars/src/core/sim.ts` (a `stepTrench` is owed by 8-5; 8-8 supplies only the
  placeholder hold). *Found by TEA during test design.*
- **Improvement** (non-blocking): The surface phase currently advances `enemyShots`
  in its shared prologue but never spawns space TIEs — leftover space fireballs
  would survive a naive transition. The suite asks GREEN to clear `enemies`/
  `enemyShots` when entering surface and `turrets` when entering trench, so each
  phase opens clean. Affects `star-wars/src/core/sim.ts` (transition reset).
  *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): Inherited render debt is now visible in play —
  `DEATH_STAR_SURFACE` is sparse (5 cross-sections) and still carries the 8-2
  nearest-neighbour heuristic edges, so the surface reads thin/tangled now that
  the phase is reachable. Per epic-8 context this is explicitly inherited debt,
  "not new work" for 8-8. A convincing skim wants tiling/scrolling instances or
  added relief and a ring-topology edge rebuild. Affects
  `star-wars/src/core/models.ts` (`DEATH_STAR_SURFACE` edges) and
  `star-wars/src/shell/render.ts` (surface tiling). *Found by Dev during implementation.*
- **Gap** (non-blocking): The trench is a SAFE TERMINAL HOLD — `stepTrench` in
  `star-wars/src/core/sim.ts` arrives, tracks/fires the cockpit, but spawns/scores/
  damages nothing and never advances. Story 8-5 must replace `stepTrench` with real
  trench gameplay (catwalks, exhaust port, bonus) and add a trench quota to
  `PHASE_QUOTA` if the run should loop past the trench. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): The `tie()` test fixture casts `{ pos } as Enemy`
  (omitting `vel`/`kind`) — flagged by the rule-checker against lang-review rule #8
  (mock types should match real signatures). It is runtime-safe (`moveEnemy` guards
  `e.vel ?? ZERO`; `kind` is unread) and byte-identical to the merged
  `space-combat.test.ts:169` house pattern, so it is LOW and non-blocking. A future
  cleanup should tighten ALL three suites' fixtures together (`{ pos, vel: [0,0,0],
  kind: 'tie' }`) for consistency — fixing only the new one would diverge from the
  merged idiom. Affects `star-wars/tests/core/space-combat.test.ts`,
  `surface.test.ts`, `phase-progression.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): AC3's live surface eyeball was not performed by
  Dev or Reviewer (infra blocked it — pinned port 5274 owned by the live checkout;
  surface phase only reachable via play). The turret/floor reconciliation is correct
  by construction, but a human should eyeball the surface phase live (no floating
  turrets; skim readability) before the next release. Affects
  `star-wars/src/shell/render.ts`. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

4 deviations

- **Pinned a kill-count advance condition over a survive-timer**
  - Rationale: (1) "clear the wave" is the first option the spec lists and is the
  - Severity: minor
  - Forward impact: GREEN (Yoda) must add `phaseKills` to `GameState`/`initialState`
- **Trench treated as terminal (no `stepTrench`)**
  - Rationale: Trench gameplay is story 8-5 (still backlog); it does not exist to
  - Severity: minor
  - Forward impact: AC2 is only partially satisfiable by 8-8 (see Delivery Finding).
- **Chose authentic-FEEL wave quotas (not recovered from the disassembly)**
  - Rationale: StarWars.asm is raw unlabelled 6809 with no symbolic wave/quota
  - Severity: minor
  - Forward impact: none mechanically; numbers may be retuned by 8-6 (difficulty
- **AC3 reconciled in code; live eyeball deferred to review**
  - Rationale: This checkout could not bind the pinned port 5274 (owned by the
  - Severity: minor
  - Forward impact: Reviewer (Obi-Wan) should eyeball the surface phase live to

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Pinned a kill-count advance condition over a survive-timer**
  - Spec source: context-story-8-8.md, AC-1 ("a defined per-phase advance
    condition"); Problem para ("clear the wave / survive a timer — derive from
    StarWars.asm where possible")
  - Spec text: "advance GameState.phase space->surface->trench in order ... Define a
    per-phase advance condition (clear the wave / survive a timer)"
  - Implementation: The RED suite pins CLEAR-THE-WAVE — a phase is cleared when a
    new `phaseKills` counter reaches a per-phase quota (`SPACE_WAVE_QUOTA`,
    `SURFACE_WAVE_QUOTA`), checked every step; on clear, phase advances in order,
    score/lives carry forward, `phaseKills` resets to 0.
  - Rationale: (1) "clear the wave" is the first option the spec lists and is the
    faithful reading of a wave; (2) a survive-timer would eject the existing
    within-phase suites mid-test — `space-combat`/`surface` step up to ~150s of sim
    time in one phase, whereas a kill quota is inert under their idle/NO_INPUT runs,
    so a timer would have forced rewrites of green Wave 1/2 tests; (3) the quota is
    a clean, deterministic, constructible boundary for tests.
  - Severity: minor
  - Forward impact: GREEN (Yoda) must add `phaseKills` to `GameState`/`initialState`
    and export the two quota constants (real-feel values to recover from
    StarWars.asm, single-sourced in `state.ts` as the Wave 1/2 constants are).
    Architect/Reviewer may veto the mechanism; if a timer is preferred, the existing
    within-phase suites need their step budgets revisited.
- **Trench treated as terminal (no `stepTrench`)**
  - Spec source: context-story-8-8.md, AC-2
  - Spec text: "The surface (8-4) and trench (8-5) phases are reachable and playable
    in the live game"
  - Implementation: The suite only asserts the transition INTO the trench fires and
    that the trench then holds safely (no space-combat leak, no wrap-around). It does
    NOT assert trench gameplay.
  - Rationale: Trench gameplay is story 8-5 (still backlog); it does not exist to
    test. 8-8 owns the phase-transition machinery, not the trench itself.
  - Severity: minor
  - Forward impact: AC2 is only partially satisfiable by 8-8 (see Delivery Finding).
    8-5 will replace the terminal hold with real trench gameplay.

### Dev (implementation)
- **Chose authentic-FEEL wave quotas (not recovered from the disassembly)**
  - Spec source: context-story-8-8.md, Problem para ("derive from StarWars.asm
    where possible")
  - Spec text: "Define a per-phase advance condition (clear the wave / survive a
    timer — derive from StarWars.asm where possible)"
  - Implementation: `SPACE_WAVE_QUOTA = 6`, `SURFACE_WAVE_QUOTA = 4`, single-sourced
    in `src/core/state.ts`.
  - Rationale: StarWars.asm is raw unlabelled 6809 with no symbolic wave/quota
    tables (the same wall 8-3/8-4 hit for score/shield/timing constants); these are
    chosen to play right and named for easy correction, exactly as the Wave 1/2
    constants were. Tests reference them by name, so the contract is value-agnostic.
  - Severity: minor
  - Forward impact: none mechanically; numbers may be retuned by 8-6 (difficulty
    ramp) or corrected once deeper reverse-engineering recovers real values.
- **AC3 reconciled in code; live eyeball deferred to review**
  - Spec source: context-story-8-8.md, AC-3
  - Spec text: "Surface phase verified live: eyeball the surface + turrets in the
    running game; turret/floor altitude framing reconciled (no floating turrets)"
  - Implementation: Fixed the floating-turret framing in `src/shell/render.ts`
    (turrets now drop into the floor's −altitude frame instead of rendering at the
    sim's world y=0). The LIVE visual eyeball was NOT performed by Dev.
  - Rationale: This checkout could not bind the pinned port 5274 (owned by the
    live-arcade checkout running older code), and the surface phase is only
    reachable by clearing the space quota in play — not scriptable without debug
    hooks the dev-exit gate forbids. The geometric fix matches exactly what the
    context describes as the defect ("they float — reconcile the cockpit/altitude
    frame"). The tdd flow has no verify phase, so the live eyeball falls to the
    Reviewer, who runs the game.
  - Severity: minor
  - Forward impact: Reviewer (Obi-Wan) should eyeball the surface phase live to
    confirm no floating turrets and assess skim readability (sparse surface is the
    inherited-debt Delivery Finding above).

### Reviewer (audit)
- **Pinned a kill-count advance condition over a survive-timer (TEA)** → ✓ ACCEPTED
  by Reviewer: sound. "Clear the wave" is the spec's first option and the
  determinism+constructibility argument is correct; a timer would indeed have
  ejected the merged ~150s within-phase suites. The `Record<Phase,…>` table design
  makes the mechanism clean and exhaustive. 8-6 can retune without touching the contract.
- **Trench treated as terminal — no `stepTrench` gameplay (TEA)** → ✓ ACCEPTED by
  Reviewer: agrees with author reasoning. Trench gameplay is story 8-5 (backlog);
  8-8 owns the phase-transition machinery only. The terminal hold is tested
  (no space-combat leak, no wrap) and clearly documented. Tracked as a Delivery Finding.
- **Chose authentic-FEEL wave quotas 6 / 4 (Dev)** → ✓ ACCEPTED by Reviewer: matches
  the established Wave 1/2 constant convention (single-sourced in `state.ts`, named
  for correction). Tests are value-agnostic (reference by name). Quota 6 > the 3-slot
  max means no single-step multi-skip — verified.
- **AC3 reconciled in code; live eyeball deferred (Dev)** → ✓ ACCEPTED by Reviewer
  (with caveat): the turret offset `[x, y − altitude, z]` is correct by construction —
  it places the tower base on the same −altitude plane as the floor, exactly the
  reconciliation the context describes. The live visual eyeball remains a non-blocking
  recommended follow-up (genuine human visual judgment; infra blocked an easy live
  check — port 5274 owned by the live checkout, surface only reachable via play). See
  Reviewer Delivery Finding.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (build GREEN, 94/94 tests, no smells) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — edge analysis done by Reviewer |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — assessed by Reviewer (no try/catch in diff) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — test quality assessed by Reviewer + rule-checker |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — comments assessed by Reviewer |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — type design assessed by Reviewer + rule-checker |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — N/A (pure sim, no inputs/secrets) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — complexity assessed by Reviewer |
| 9 | reviewer-rule-checker | Yes | findings | 1 (rule #8 test-quality) | confirmed 1 (LOW, non-blocking) |

**All received:** Yes (2 enabled subagents returned; 7 disabled via `workflow.reviewer_subagents` and pre-filled as Skipped)
**Total findings:** 1 confirmed (LOW), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** mouse input (`input.fire`/`aimX`/`aimY`) → `stepGame` prologue
fires bolts → space-combat collision builds `killedTie` → `phaseKills += killedTie.size`
(`sim.ts:153`) → `progress()` checks the quota (`sim.ts:302`) → `enterPhase()` transitions
in order (`sim.ts:316`) → `render()` reads `state.phase`/`turrets`/`altitude`
(`render.ts:49-58`). The progression is driven end-to-end by player kills; wired and
accessible. Safe because every transition constructs a new state (no input/state mutation)
and the RNG is cloned at `sim.ts:62`.

### Rule Compliance (lang-review/typescript.md + sacred boundary)

- **#1 type-safety escapes** — PASS. No `as any`/`as unknown as T`/`@ts-ignore`/non-null
  assertions in the diff. The only cast is `({ pos } as Enemy)` in a test fixture (rule #8 below).
- **#2 generic/interface** — PASS. `Record<Phase, …>` keys are the `Phase` union, not `string`;
  no `Record<string,any>`/`Function`/`object`.
- **#3 enum/exhaustiveness** — PASS. `Phase` is a string union (no enum cost). `NEXT_PHASE`/
  `PHASE_QUOTA` (`sim.ts:284,291`) are `Record<Phase,…>` — adding a 4th phase forces a compile
  error there. [VERIFIED good pattern] Advisory: the `stepGame` if-else dispatch (`sim.ts:84-85`)
  treats `'space'` as implicit fall-through; a `switch`+`assertNever` would be self-guarding, but
  the Record tables already guarantee exhaustiveness — non-blocking.
- **#4 null/undefined (`??` vs `||`)** — PASS. `phaseKills` uses `<` and `+`, never `||`; the 0
  initial value compares correctly. Pre-existing `vel ?? ZERO` guards are correct.
- **#5 modules** — PASS. `Phase` imported as `import type`; runtime quota constants imported
  without `type`; `.js` omission correct for `moduleResolution:bundler`.
- **#8 test quality** — `[TEST][RULE]` 1 finding (LOW): `tie()` fixture casts `{ pos } as Enemy`
  omitting `vel`/`kind` (`phase-progression.test.ts:71`). Confirmed (rule-matching, not dismissed);
  LOW because it is runtime-safe (`moveEnemy` guards `e.vel ?? ZERO`; `kind` unread) and is
  byte-identical to the merged `space-combat.test.ts:169` house idiom. Non-blocking; recommend a
  suite-wide fixture cleanup (Delivery Finding).
- **#6/#7/#10/#11** — N/A (no JSX, no async/Promise, no user-string inputs, no try/catch).
- **#12 performance/bundle** — PASS. Specific named imports, no barrels.
- **Sacred boundary** — PASS (rule-checker + Reviewer): `core/` imports no `shell/`; no
  DOM/`window`/`Date.now`/`performance.now`/`Math.random`/`rAF`; `stepGame` referentially
  transparent (RNG cloned, state never mutated); all math is arithmetic/Math Box, no ad-hoc trig;
  quotas single-sourced in `state.ts`.

### Observations (dispatch-tagged)

1. `[VERIFIED]` Purity/determinism/boundary intact — `sim.ts:62` clones the RNG; `progress`/
   `enterPhase`/`stepTrench` (`sim.ts:272-326`) add no time/DOM/randomness and never mutate input
   or state. Complies with star-wars/CLAUDE.md sacred boundary.
2. `[VERIFIED]` Carry-forward + one-transition-per-step — `enterPhase` (`sim.ts:316`) spreads
   `...s` and never overrides `score`/`lives`, and sets `phaseKills:0`, so the next quota check
   cannot double-skip. Evidence: test "reaches surface in one transition — never skips to trench".
3. `[VERIFIED]` `[SILENT]` gameOver halts progression and no swallowed errors — `progress()`
   returns early on `s.gameOver` (`sim.ts:303`); no try/catch, empty catch, or silent fallback in
   the diff. Evidence: test "a finished run never advances".
4. `[TEST]` `[RULE]` [LOW] `tie()` fixture `as Enemy` cast (`phase-progression.test.ts:71`) —
   confirmed, runtime-safe, mirrors merged `space-combat.test.ts:169`. Non-blocking.
5. `[TYPE]` [LOW / VERIFIED] `Record<Phase,…>` tables give compile-time exhaustiveness (good);
   `turrets ?? []` in tests is an unnecessary-but-harmless nullish guard mirroring merged
   `surface.test.ts`. Non-blocking.
6. `[SIMPLE]` [LOW] `PHASE_QUOTA.trench = Infinity` (`sim.ts:293`) is redundant with
   `NEXT_PHASE.trench = null` (`sim.ts:287`) — belt-and-suspenders, clearly commented. Acceptable.
7. `[DOC]` `[VERIFIED]` New JSDoc on `stepTrench`/`progress`/`enterPhase` (`sim.ts:266-326`)
   accurately describes the terminal hold, one-at-a-time advance, and clean phase open.
8. `[EDGE]` `[VERIFIED]` Boundary cases hold — at-quota advances (`<` check), max 3 kills/step
   < quota 6 (no multi-skip), and a same-step enemyShot still applies its damage in `stepSurface`
   before `enterPhase` clears the slate (correct).
9. `[SEC]` N/A — pure deterministic simulation; no user inputs, secrets, auth, or tenant data.
10. `[LOW]` Render fix (`render.ts:201`) has no automated test and no live eyeball was performed
    (infra blocked it). Correct by construction; recommended human eyeball is a non-blocking
    follow-up (Delivery Finding).

### Devil's Advocate

Suppose this code is broken. Attack one: a passive player who never fires — in space the TIEs
spawn and drain shields to game-over before the kill quota is met, so the run ends without ever
advancing. Is that a stuck state? No: clearing the wave is the advance condition by design, and a
dead run correctly halts (`progress` gameOver guard). Attack two: clear three TIEs in a single
step from `phaseKills:5` → 8, overshooting quota 6. Does overshoot corrupt anything? No — `progress`
advances once and resets `phaseKills:0`; overshoot is discarded. Attack three: leftover player bolts.
`enterPhase` clears enemies/turrets/enemyShots but NOT `projectiles`, so a bolt fired the instant
before a transition flies into the next phase and could even kill a freshly-spawned turret on the
first surface frame. This is a minor gameplay oddity, not a crash or determinism break — flagged LOW.
Attack four: memory growth in the trench, where the player can fire forever. Bolts expire by TTL and
`advance()` drops them, so the in-flight set is bounded (~8) — no leak. Attack five: a confused player
reaches the trench and nothing happens (terminal hold) and may think the game froze; the HUD still
shows score/shields, and trench gameplay is explicitly story 8-5 — acceptable, but an 8-5/8-6 "to be
continued" cue would help. Attack six: determinism across the boundary — `enterPhase` consumes no RNG,
and the deterministic-crossing test confirms two identical seeds cross identically. Attack seven:
float drift in the quota check — `phaseKills` is integer Set-size accumulation, so the comparison is
exact. None of these rise to Critical/High; the two real residues (leftover projectiles, trench-hold
UX) are LOW and documented.

**Pattern observed:** Exhaustive `Record<Phase,…>` transition/quota tables instead of a switch —
compile-time-safe against new phases — at `sim.ts:284-295`. Good pattern.
**Error handling:** No failure paths introduced; `progress` is total over `Phase` and gameOver-guarded
(`sim.ts:302-307`). Lives floored at 0 pre-existing (`Math.max(0, …)`).
**Dispatch tags present:** `[EDGE]` `[SILENT]` `[TEST]` `[DOC]` `[TYPE]` `[SEC]` `[SIMPLE]` `[RULE]`.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.