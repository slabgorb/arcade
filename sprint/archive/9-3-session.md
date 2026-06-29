---
story_id: "9-3"
jira_key: ""
epic: "9"
workflow: "tdd"
---
# Story 9-3: Peel-away / fly-past lifecycle: un-killed TIEs complete their pass and exit instead of ballooning into the cockpit

## Story Details
- **ID:** 9-3
- **Jira Key:** (none)
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-29T14:54:43Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-29T14:18:45Z | 2026-06-29T14:20:40Z | 1m 55s |
| red | 2026-06-29T14:20:40Z | 2026-06-29T14:33:44Z | 13m 4s |
| green | 2026-06-29T14:33:44Z | 2026-06-29T14:46:12Z | 12m 28s |
| review | 2026-06-29T14:46:12Z | 2026-06-29T14:54:43Z | 8m 31s |
| finish | 2026-06-29T14:54:43Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): The TIE flight model doc and the story disagree on cockpit collision — model §7 says only fireballs damage the player, AC#3 keeps body collision for head-on hits. Affects `star-wars/docs/tie-flight-ai-model.md` §7 / §9 (a porting note for 9-3 says "drop TIE-body collision with the cockpit"). Worth a one-line doc note that 9-3 deliberately retains body collision per story scope, so 9-4/9-5 don't "fix" it back out. *Found by TEA during test design.*
- **Question** (non-blocking): The cabinet's peel-away is a wave-END group transition; 9-3 implements a per-TIE near-bound peel. If a later story wants the authentic "all survivors fly past together when the Death Star looms," that is still unbuilt. Affects `star-wars/src/core/sim.ts` (the space→surface transition in `progress`/`enterPhase` currently just clears enemies). *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): A peeling TIE now sets `Enemy.peeling` and banks outward; the render shell (`src/shell/render.ts`) may want to fade/scale or cull peeling TIEs distinctly for the cleanest "they pass and leave" look. Affects `star-wars/src/shell/render.ts` (render reads `pos`/`orient` only; `peeling` is available if useful). *Found by Dev during implementation.*
- No blocking findings during implementation.

### Reviewer (code review)
- **Improvement** (non-blocking): Peel direction is geometric (lateral-offset gate at exactly `COCKPIT_HIT_RADIUS`); a future story may want playtesting to confirm the share of TIEs that strafe-through vs peel "feels" right, and to pin `TIE_NEAR_BOUND`/`TIE_PEEL_SWEEP` against the cabinet. Affects `star-wars/src/core/state.ts` (authentic-FEEL placeholders). *Found by Reviewer during code review.*
- No blocking findings during code review.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Peel-away keeps TIE-body cockpit damage for head-on hits (model says no body collision at all)**
  - Spec source: docs/tie-flight-ai-model.md §7 vs context-story-9-3.md AC#3
  - Spec text (model): "there is no TIE-body ↔ ship collision anywhere in the pipeline … Only fireballs damage the player." Spec text (story AC#3): "Cockpit damage still occurs for genuine collision/strafe hits per the model (peel-away does not make TIEs harmless)."
  - Implementation: Tests keep the existing cockpit collision (a TIE within COCKPIT_HIT_RADIUS still costs a shield and is removed). Peel-away is a STEERING change only: off-center TIEs veer past and miss; a dead-center head-on TIE still clips the cockpit sphere and damages.
  - Rationale: Spec-authority hierarchy — story scope (AC#3) outranks the architecture/model doc. The story deliberately preserves danger; the model's "fireballs only" is the cabinet's exact mechanism, not the story's intent.
  - Severity: minor
  - Forward impact: 9-4/9-5 (full fire model) may revisit whether body collision is removed once fireball lethality is tuned; flagged, not blocking.
- **Per-TIE near-bound peel trigger instead of the cabinet's wave-end group fly-past**
  - Spec source: docs/tie-flight-ai-model.md §7
  - Spec text: "The fly-past happens at the wave-end transition … every remaining TIE eases its lateral position back toward center and drives its forward/depth translation +$400/frame until it overruns the far plane."
  - Implementation: Tests drive a PER-TIE peel-away keyed to a near-range bound (new constant TIE_NEAR_BOUND), not a wave-end timer. Each un-killed TIE that closes to the near-bound completes its pass and exits on its own.
  - Rationale: Story scope — "un-killed TIEs complete THEIR pass and exit" is per-fighter, mid-wave behavior that bounds on-screen scale every approach (AC#1+AC#2). The wave-end group transition is a separate, later concern.
  - Severity: minor
  - Forward impact: none for 9-3; a wave-end group peel can layer on later if desired.
- **New single-sourced constant TIE_NEAR_BOUND defines the AC#2 near clip**
  - Spec source: context-story-9-3.md AC#2
  - Spec text: "On-screen TIE scale is bounded: no TIE renders as a full-frame wall (cabinet-equivalent near-bound)."
  - Implementation: Tests import a new TIE_NEAR_BOUND from state.ts (must be > COCKPIT_HIT_RADIUS, < SPAWN_DISTANCE) rather than hard-coding a magic near-clip value. RED until Dev adds the constant + behavior.
  - Rationale: Matches the codebase idiom — every Wave-1 tuning value is a named, commented, single-sourced constant in state.ts. The near-bound is authentic-FEEL and belongs there for easy correction.
  - Severity: minor
  - Forward impact: none.

### Dev (implementation)
- **Peel-vs-ram discriminator: lateral offset from the −Z centerline ≥ COCKPIT_HIT_RADIUS**
  - Spec source: context-story-9-3.md AC#1 / AC#3; tie-peel-away.test.ts
  - Spec text: "A TIE that is neither killed nor lands a hit transitions to peel-away" / "Cockpit damage still occurs for genuine collision/strafe hits."
  - Implementation: A TIE peels when it closes to TIE_NEAR_BOUND AND its lateral offset `hypot(x, y)` (distance from the cockpit's forward axis) is ≥ COCKPIT_HIT_RADIUS — it has room to veer past. A fighter on/near the centerline (offset < the hit sphere) has nothing to steer around, keeps homing, and strafes through → genuine hit. This is the concrete rule that makes "neither lands a hit" (AC#1) and "genuine hits still damage" (AC#3) deterministic.
  - Rationale: The tests assert dead-center fixtures still ram and off-center ones peel; reusing the existing COCKPIT_HIT_RADIUS as the centerline threshold is the simplest geometry that satisfies both without a new tuning knob.
  - Severity: minor
  - Forward impact: 9-4/9-5 fire model may want a wider/independent "commit to strafe" band; today it is exactly the cockpit hit sphere.
- **Peel latch via an Enemy.peeling boolean; exit by range, swept-outward thrust**
  - Spec source: docs/tie-flight-ai-model.md §7; tie-peel-away.test.ts (AC1/AC2/AC4)
  - Spec text: "peel off & fly past … drives forward/depth +$400/frame until it overruns the far plane, then frees the slot."
  - Implementation: Added optional latched `Enemy.peeling` (stays true once begun, so a fighter never re-homes) and constants TIE_EXIT_RANGE (1800; > the ≈1298 spawn-box corner so fresh TIEs aren't culled) and TIE_PEEL_SWEEP (1 ≈ 45° sideways peel). Peel heading = outward radial + tangential sweep, so |pos| strictly grows; stepGame drops the TIE once |pos| > TIE_EXIT_RANGE.
  - Rationale: A latch keeps the decision pure and monotonic (no oscillation at the bound); range-based exit is frame-rate-independent and avoids porting the cabinet's per-tick `+$400` (unpinned to our dt — model §5.3 caveat).
  - Severity: minor
  - Forward impact: values are authentic-FEEL placeholders (our unit scale has no cabinet source), single-sourced in state.ts for easy correction in 9-5.

### Reviewer (audit)
All five logged deviations reviewed; every one is sound and documented. None reversed.
- **TEA #1 — keep TIE-body cockpit damage for head-on hits** → ✓ ACCEPTED by Reviewer: correctly resolved by the spec-authority hierarchy (story AC#3 outranks the model doc). Code keeps the existing cockpit collision unchanged; confirmed in the diff that `moveEnemy` only steers and never touches the damage rule.
- **TEA #2 — per-TIE near-bound peel vs cabinet wave-end group fly-past** → ✓ ACCEPTED by Reviewer: matches the story's per-fighter "complete their pass and exit" wording; the wave-end group peel is a separate later concern, flagged as a Delivery Finding.
- **TEA #3 — new single-sourced TIE_NEAR_BOUND for AC#2** → ✓ ACCEPTED by Reviewer: consistent with the codebase idiom; rule-checker A4 confirms the constant is single-sourced and commented.
- **Dev #1 — peel-vs-ram discriminator: lateral offset ≥ COCKPIT_HIT_RADIUS** → ✓ ACCEPTED by Reviewer: the simplest deterministic geometry that satisfies AC#1 (off-center peels) and AC#3 (centerline rams) without a new knob; reusing the hit radius as the centerline threshold is reasonable. Forward note already captured.
- **Dev #2 — peel latch (Enemy.peeling) + range exit + swept-outward thrust** → ✓ ACCEPTED by Reviewer: the latch keeps the decision pure and monotonic (no oscillation at the bound); rule-checker A2/A3 confirm no input mutation; outward thrust guarantees |pos| grows so the near-bound is never re-entered.

## Sm Assessment

**Story:** 9-3 — Peel-away / fly-past lifecycle. Un-killed TIEs must complete
their attack pass and exit the play volume (peel away / fly past) instead of
flying into the cockpit and ballooning to fill the frame (the Image-1 defect).

**Workflow:** tdd (phased: setup → red → green → review → finish). 2pts, p2,
`star-wars` repo on branch `feat/9-3-peel-away-flypast-lifecycle` (base `develop`).

**Routing decision:** Setup gate satisfied — session file, story context, and
feature branch all created and verified. Merge gate clear (no open PRs in
star-wars; fetched/pruned first to avoid stale-cache phantoms). Handing off to
**TEA (Han Solo)** for the RED phase.

**Context for RED phase:**
- This is epic 9 (ROM-accurate TIE flight AI). Builds on the RE'd flight model
  from 9-1 (`star-wars/docs/tie-flight-ai-model.md`) and the banking/swoop port
  from 9-2 (just completed).
- The peel-away/exit phase referenced in AC#1 derives from the "9-1 model."
  Core deterministic flight-state lifecycle lives in `star-wars/src/core/`.
- Preferred upstream source is the GITIGNORED
  `star-wars/reference/disasm/StarWars_annotated.lst` (not in git history).

**Acceptance criteria for TEA to cover with failing tests:**
1. Un-killed, non-hitting TIE transitions to peel-away/exit and leaves the play
   volume (frees its slot) rather than ramming.
2. On-screen TIE scale is bounded — no TIE renders as a full-frame wall.
3. Cockpit damage still occurs for genuine collision/strafe hits (peel-away does
   not make TIEs harmless).
4. Deterministic and unit-tested; existing tests pass.

**Risks/watch-items:** Scale-bound (AC#2) and damage-still-fires (AC#3) are the
regression-prone pair — peel-away must not silently disable collision damage.
Keep the sim deterministic; no wall-clock/random in the exit logic.

---

## TEA Assessment

**Tests Required:** Yes
**Reason:** New gameplay behavior (peel-away / fly-past lifecycle) — not a chore.

**Test Files:**
- `star-wars/tests/core/tie-peel-away.test.ts` — the 9-3 RED suite (7 tests, 4 RED / 3 guard).

**Tests Written:** 7 tests covering 4 ACs.
**Status:** RED (4 failing — ready for Dev). Verified via testing-runner:
`1 file failed | 25 passed (26)`, `4 tests failed | 346 passed (350)`.

### What each AC's tests assert

- **AC1 — peel away & exit, not ram (RED, 2 tests):**
  - An off-center un-shot TIE leaves the play volume (despawns / slot freed) WITHOUT
    costing a shield — `lives` stays at STARTING_LIVES the whole pass. *(RED today:
    `expected 5 to be 6` — it rams the cockpit and costs a shield.)*
  - Its range to the cockpit bottoms out then GROWS again (it completes a pass and
    recedes) and never enters the hit sphere. *(RED today: `81.93 > 131.93` is
    false — range only ever decreases until the ram.)*
- **AC2 — bounded on-screen scale (RED, 2 tests):**
  - A peeling TIE never closes inside the near-bound while in front of the camera
    (z < 0). *(RED today: min in-front range ≈ 85, and the bound is NaN.)*
  - The near-bound is a real clip: `TIE_NEAR_BOUND` exists, `> COCKPIT_HIT_RADIUS`
    and `< SPAWN_DISTANCE`. *(RED today: `TIE_NEAR_BOUND` is undefined — Dev must
    add this single-sourced constant to `src/core/state.ts`.)*
- **AC3 — genuine hits still damage (guard, 1 test, GREEN now):**
  - A dead-center head-on TIE still costs a shield and is removed. Guards against an
    over-correction that makes ALL TIEs harmless. Peel-away must be STEERING only;
    the cockpit collision check stays and runs every frame regardless of phase.
- **AC4 — deterministic & pure (guard, 2 tests, GREEN now):**
  - A 400-step seeded run replays bit-identically (no time/randomness in peel-away).
  - Stepping does not mutate the input enemies array while a TIE is peeling.

### Implementation contract handed to Dev (Yoda)

1. Add `TIE_NEAR_BOUND` to `src/core/state.ts` (single-sourced, commented like the
   other Wave-1 constants; `COCKPIT_HIT_RADIUS < TIE_NEAR_BOUND < SPAWN_DISTANCE`).
2. In the TIE flight path (`moveEnemy` / the space step in `sim.ts`): when an
   un-killed TIE closes to `TIE_NEAR_BOUND`, it stops homing into the origin and
   peels — steering past the cockpit so off-center fighters MISS, then leaves the
   play volume and frees its slot. A dead-center fighter (zero lateral offset) has
   nothing to veer around and still clips the cockpit sphere → genuine hit (AC#3).
3. Keep the existing cockpit collision (`collides(e.pos, COCKPIT, COCKPIT_HIT_RADIUS)`)
   exactly — peel-away changes trajectories, not the damage rule.
4. Stay pure: peel decisions derive only from position / seeded bias; no `Date`,
   no `Math.random`, no wall-clock. Use `??` (not `||`) for any defaulted numeric —
   `0` is a valid lateral offset / bank (lang-review TS #4).

### Rule Coverage (lang-review TypeScript checklist)

Only a subset of the 13-check TS checklist is applicable to a pure-core, no-JSX,
no-async, no-IO simulation change. Applicable checks and their test coverage:

| Rule | Test(s) | Status |
|------|---------|--------|
| #4 null/undefined (`??` vs `||`; falsy-but-valid `0`) | `a dead-center TIE … still costs a shield` (bank 0 / zero lateral offset) | guard (green) |
| #8 test quality (meaningful assertions, no `as any`, no vacuous) | self-check across all 7 tests | pass |
| #1 type-safety escapes (no `as any` in tests) | whole file (typed `Vec3` literals only, no `any`) | pass |

**Rules checked:** 3 of 3 applicable lang-review checks have coverage. Not
applicable (no surface area in this diff): #2 generics/`readonly` interfaces, #3
enums (the codebase uses string unions — Dev should keep that idiom if a flight
phase is added), #5 modules/`.js` ext, #6 React/JSX, #7 async, #9 build config,
#10 input validation, #11 error handling, #12 perf/bundle, #13 fix-regressions.
**Self-check:** 0 vacuous tests found (every test has a concrete numeric/equality
assertion; the import-driven REDs assert on real constants).

**Handoff:** To Dev (Yoda) for GREEN implementation.

---

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `star-wars/src/core/state.ts` — added `Enemy.peeling?: boolean` (latched exit flag)
  and three single-sourced constants: `TIE_NEAR_BOUND` (350), `TIE_EXIT_RANGE`
  (1800), `TIE_PEEL_SWEEP` (1), with a commented "TIE peel-away lifecycle" section.
- `star-wars/src/core/sim.ts` — `moveEnemy` now has an APPROACH phase (the 9-2
  homing swoop, unchanged) and a PEEL-AWAY phase: an un-killed TIE that closes to
  `TIE_NEAR_BOUND` off the centerline thrusts outward + sweeps to the side, recedes,
  and is dropped by `stepGame` once it passes `TIE_EXIT_RANGE` (slot freed). The
  cockpit collision rule is untouched, so a dead-center fighter still rams.

**How each AC is met:**
- **AC1** — off-center un-killed TIEs peel and leave the play volume (slot freed)
  without costing a shield; range bottoms out then recedes (a completed pass).
- **AC2** — peel thrust is outward, so |pos| grows every frame and a peeling TIE
  never re-enters `TIE_NEAR_BOUND` while in front of the camera (no full-frame wall).
- **AC3** — a centerline TIE (lateral offset < cockpit hit sphere) keeps homing and
  still strafes through → genuine collision still costs a shield and is removed.
- **AC4** — all heading/latch math derives only from position + seeded bias (no
  time, no randomness); a 400-step seeded run replays bit-identically; the step
  never mutates the input enemies.

**Tests:** 350/350 passing (GREEN) across 26 files — the 7 new 9-3 tests included,
zero regressions. Verified via testing-runner (`26 passed (26)`, `350 passed (350)`).
`npx tsc --noEmit` clean (exit 0).

**Branch:** feat/9-3-peel-away-flypast-lifecycle (star-wars; base `develop`).

**Handoff:** To Reviewer (Obi-Wan) for code review.

---

## Subagent Results

Per `workflow.reviewer_subagents` settings, only `preflight` and `rule_checker` are
enabled; the other seven are disabled and their domains were assessed by the
Reviewer directly (see Rule Compliance + the tagged observations in the Assessment).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (tests 350/350, tsc 0, lint 0, tree clean, 0 smells) | confirmed 0, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — edge cases assessed by Reviewer |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — no try/catch or fallbacks in diff |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — test quality assessed by Reviewer + rule-checker #8 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — comments assessed by Reviewer |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — type design assessed by Reviewer + rule-checker #1/#2 |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — no security surface (pure client sim) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — complexity assessed by Reviewer |
| 9 | reviewer-rule-checker | Yes | clean | none (17 rules, 52 instances, 0 violations) | confirmed 0, dismissed 0, deferred 0 |

**All received:** Yes (2 enabled returned clean; 7 disabled via settings, assessed directly)
**Total findings:** 0 confirmed, 0 dismissed, 0 deferred

---

## Reviewer Review

### Rule Compliance

Language: TypeScript (pure core). Rubric: `.pennyfarthing/gates/lang-review/typescript.md`
(checks 1–13) plus the star-wars architectural-boundary rule. Enumerated against
every changed type/function/field:

- **#1 type-safety escapes** — `moveEnemy`, the `stepGame` filter, and `tieToward`
  carry no `as any`, no `@ts-ignore`, no non-null assertions. The `!` tokens in
  `sim.ts` are logical-NOT on `Set.has(...)`, not non-null assertions. ✓ compliant.
- **#2 readonly / generics** — `moveEnemy(e: Enemy, …)` does not mutate `e` (returns
  a spread); matches the file convention (no `Readonly<T>` on object params). The
  pre-existing `advance(bolts: readonly …)` is unchanged. No `Record<string,any>`. ✓.
- **#3 enums** — none added; `peeling?: boolean` is a plain boolean, `kind: 'tie'` is
  a pre-existing string union. ✓.
- **#4 null/undefined** — `e.peeling ?? (…)`, `e.bank ?? 0`, `e.vel ?? ZERO` all use
  `??` correctly. `Math.sign(e.bank ?? 0) || 1` is the one case where `||` is
  *required*, not a bug: `Math.sign` yields `{-1,0,1}`; `-1`/`1` are truthy and
  preserved, only `0` (no bank → default peel side) falls through. ✓ (confirmed by
  rule-checker #4 and my own analysis).
- **#5 modules** — value imports for the 3 new constants; `import type` used for
  type-only imports in the test. ✓.
- **#6 React/JSX, #7 async, #9 build, #10 input-validation, #11 error-handling** —
  not applicable (no JSX, no async, no config, no external input, no try/catch). ✓.
- **#8 test quality** — every test has a concrete assertion; guard assertions
  (`ranges.length > 5`, `inFront.length > 5`) protect the `Math.min(...)` spreads
  from a vacuous-infinity pass; no `as any`, no mocks, imports from `src/` not
  `dist/`. ✓.
- **#12 perf/bundle** — named imports (tree-shakeable), no hot-path stringify. The
  only nit: `length(e.pos)` is computed twice per moved TIE (as `dist` in
  `moveEnemy`, again in the `stepGame` filter) — negligible (≤3 enemies). ✓.
- **Architectural boundary (star-wars CLAUDE.md)** — no import from `shell/`, no DOM,
  no `Date`/`performance.now`/`Math.random`/`requestAnimationFrame`. Time enters only
  as `dt`; peel direction derives from `pos`/`bank` only. `moveEnemy` returns new
  objects; `stepGame` `.map().filter()` builds fresh arrays without mutating
  `state.enemies`. ✓ (rule-checker A1/A2/A3 confirm).

### Observations (8 — no rubber-stamp)

1. `[VERIFIED]` Purity / no input mutation — `moveEnemy` returns `{ ...e, … }` and
   `stepGame` builds a new array via `.map().filter()`; `state.enemies` is never
   written. Evidence: sim.ts peel/approach returns + the enemies pipeline. Complies
   with the architectural-boundary rule (rule-checker A2/A3).
2. `[VERIFIED]` Determinism — peel math uses only `e.pos`, `e.bank`, constants, and
   pure math3d functions; no time/randomness. The `peeling` latch lives on the
   enemy carried in seeded state. AC#4's determinism + purity tests pass.
3. `[RULE]` / `[TYPE]` `Math.sign(e.bank ?? 0) || 1` is correct, NOT the lang-review
   #4 falsy-`0` trap — `0` is the intended "no bank → default side" case; `-1` is
   preserved. Evidence: sim.ts peel branch; corroborated by rule-checker #4.
4. `[EDGE]` No `normalize` of a zero vector — peel begins only when
   `lateralOffset ≥ COCKPIT_HIT_RADIUS`, so `|pos| ≥ 80` at the trigger and the
   outward thrust only grows it; `outward = normalize(e.pos)` never sees `[0,0,0]`.
5. `[EDGE]` Peel/collision separation — peeling TIEs recede (dist ≥ ~near-bound) and
   never enter `COCKPIT_HIT_RADIUS`; centerline TIEs (lateralOffset < 80) never peel
   and still reach the cockpit. AC#1 and AC#3 both hold without a race; the
   collision pass in `stepGame` is unchanged and runs every frame.
6. `[TEST]` Test suite is behavioral (drives the real `stepGame`), asserts observable
   state, and guards its `Math.min` spreads. No vacuous assertions (rule-checker #8).
7. `[DOC]` `moveEnemy` docstring and the `state.ts` constant comments accurately
   describe both phases and the values; no stale/misleading comments introduced.
8. `[SIMPLE]` `[SEC]` `[SILENT]` No unnecessary complexity (the `peeling` latch and
   3 constants are each justified and single-sourced); no security surface (pure
   client-side math sim); no swallowed errors / silent fallbacks (no try/catch, no
   error paths — the only fallbacks are the documented `??`/`|| 1` defaults above).

### Devil's Advocate

Assume this code is broken. Where would it fail? First suspicion: **a TIE that
never leaves.** If a peeling TIE's outward heading ever had a non-positive radial
component, `|pos|` could stall below `TIE_EXIT_RANGE` and the fighter would loiter
forever, neither ramming nor despawning — a soft-lock that slowly fills the slot
table. Refuted: the peel heading is `normalize(outward + sweepAxis·k)` with
`sweepAxis ⟂ outward`, so `heading · outward = 1/|outward + sweepAxis·k| > 0`; the
radial speed is strictly positive every frame, so `|pos|` grows monotonically and
crosses `TIE_EXIT_RANGE`. Second suspicion: **a confused designer reads
`TIE_PEEL_SWEEP = 1` as "no sweep"** and a future tweak to `0` makes TIEs reverse
straight back into the spawn cloud — ugly but not broken, and the comment documents
the 0/1 semantics. Third: **the lateral-offset gate at exactly `COCKPIT_HIT_RADIUS`
is a hard cliff** — a TIE at offset 79.9 rams, at 80.1 peels; under heavy waves a
cluster of near-centerline TIEs could all ram in one window and drain shields fast.
This is intended danger (AC#3), bounded by the 3-slot cap and the fire cadence; it
is a balance lever, not a defect. Fourth: **large `dt` tunneling** — a giant frame
could let an approaching TIE skip the 80-unit cockpit sphere and never register the
ram. True, but this is a pre-existing property of the 9-2 homing model, not
introduced here; the fixed-timestep loop avoids it, and peeling TIEs (moving
outward) cannot tunnel inward. Fifth: **could a fixture set `peeling:true` at the
origin and divide by zero?** Reachable only by hand-constructing such an Enemy; no
test or game path does, and normal flow guarantees `|pos| ≥ 80` before the latch.
None of these rise to a Critical/High defect.

### Deviation audit: complete — all 5 deviations ACCEPTED (see `### Reviewer (audit)`
under Design Deviations). No undocumented deviations found.

---

## Reviewer Assessment

**Verdict:** APPROVED

**Subagents:** preflight ✓ clean, rule-checker ✓ clean (17 rules / 52 instances /
0 violations); 7 others disabled via settings and assessed by the Reviewer directly.
All confirmed findings: 0. Dispatch coverage: `[EDGE]` `[SILENT]` `[TEST]` `[DOC]`
`[TYPE]` `[SEC]` `[SIMPLE]` `[RULE]` — see Observations.

**Data flow traced:** a spawned TIE → `moveEnemy` (approach: homes on the cockpit;
peel: thrusts outward once it reaches `TIE_NEAR_BOUND` off-centerline) → `stepGame`
drops it past `TIE_EXIT_RANGE` (slot freed) OR the unchanged cockpit-collision pass
removes it and costs a shield if a centerline TIE reaches `COCKPIT_HIT_RADIUS`.
Safe: every branch is a pure function of `(pos, bank, dt)` + seeded state.

**Pattern observed:** authentic-FEEL constants single-sourced + commented in
`state.ts` (matches `TIE_SWOOP_BIAS`/`TIE_BANK_ANGLE`); latched lifecycle flag on
`Enemy` mirrors the existing optional-field convention (`bank?`). state.ts:142–170,
state.ts:56.

**Error handling:** none required — pure deterministic sim, no IO/async/external
input. The two intentional defaults (`?? 0`, `|| 1`) are correct and documented.

**Tests:** 350/350 pass (7 new), tsc clean, working tree clean, zero regressions.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.