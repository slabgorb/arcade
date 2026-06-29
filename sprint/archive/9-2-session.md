---
story_id: "9-2"
jira_key: ""
epic: "9"
workflow: "tdd"
---
# Story 9-2: Port the RE'd TIE flight model to core/sim.ts (swoop/weave/bank approach)

## Story Details
- **ID:** 9-2
- **Jira Key:** (no Jira integration)
- **Workflow:** tdd
- **Stack Parent:** none
- **Repo:** star-wars
- **Points:** 3

## Acceptance Criteria
1. spawnTie / moveEnemy (or successors) implement the 9-1 approach model: TIEs follow curved/weaving paths, not a straight line to the origin
2. Motion is deterministic: identical (state, input, dt, seed) -> identical trajectories; covered by unit tests in tests/
3. Banking/orientation follows the path per the model, not just a static look-at (extends story 8-13)
4. Existing Wave-1 tests still pass; collisions/hit-tests unaffected; core stays pure

## Technical Approach
- **Source of Truth:** star-wars/docs/tie-flight-ai-model.md (RE'd model from story 9-1)
- **Implementation Area:** core/sim.ts — spawnTie/moveEnemy functions
- **Determinism:** Motion driven by seeded RNG in GameState; identical (state, input, dt, seed) must produce identical trajectories
- **Model Features:** Curved swoop/weave paths with banking per documented approach
- **Boundary Compliance:** Pure core (no DOM, no wall-clock time, no Math.random)
- **Testing:** Unit tests in tests/ validate determinism and trajectory correctness
- **Compatibility:** Existing Wave-1 tests must pass; collisions/hit-tests unaffected

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-29T13:53:05Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-29T13:08:26Z | 2026-06-29T13:10:51Z | 2m 25s |
| red | 2026-06-29T13:10:51Z | 2026-06-29T13:31:13Z | 20m 22s |
| green | 2026-06-29T13:31:13Z | 2026-06-29T13:43:00Z | 11m 47s |
| review | 2026-06-29T13:43:00Z | 2026-06-29T13:53:05Z | 10m 5s |
| finish | 2026-06-29T13:53:05Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### TEA (test design)
- **Gap** (non-blocking): the flight model MUST drive motion from each TIE's own speed (`|vel|`) so a `|vel| = 0` TIE stays put — combat-kill-loop.test.ts (8-16) uses vel-0 TIEs as fixed targets and framing.test.ts pins spawn `|vel| ≈ ENEMY_SPEED`. Watch the `x || default` vs `x ?? default` trap (0 is falsy but a valid speed). Affects `src/core/sim.ts` (moveEnemy/successor — derive heading from orientation, magnitude from `|vel|`). Pinned by tie-flight.test.ts "a stationary TIE … is not spuriously set in motion." *Found by TEA during test design.*
- **Improvement** (non-blocking): the model's full accelerate-from-rest kinematics (§4 zero initial velocity, §5.3 per-frame thrust ÷32/÷64) are out of 9-2's tested scope — 9-2 holds a constant approach speed while curving the heading. The §5.3 rates are per-cabinet-tick and not yet pinned to our `dt` (model §5.3 caveat). Affects `src/core/sim.ts`; recommend a later story (9-5, with the script VM / wave composition) port acceleration once the tick rate is confirmed. *Found by TEA during test design.*
- **Conflict** (non-blocking, resolved): AC3 (banking, "not just a static look-at") directly contradicts the 8-13 static-cockpit-look-at tests, so AC4 ("existing Wave-1 tests pass") cannot literally hold for them. Resolved by superseding the 3 conflicting tests (see Design Deviations). Affects `tests/core/tie-orientation.test.ts`. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): the 9-2 swoop is a single per-TIE constant banking bias (`Enemy.bank`); the model's full per-fighter behavior-script VM (§5.1) and per-wave maneuver scripts (§8) are not yet ported. Affects `src/core/sim.ts` (moveEnemy) / `src/core/state.ts` (`Enemy.bank` is the extension seam). Recommend 9-5 replace the constant bias with scripted roll/turn/dive choreography once the VM + wave tables are decoded. *Found by Dev during implementation.*
- No blocking findings during implementation.

### Reviewer (code review)
- **Improvement** (non-blocking): the per-enemy orientation-DISTINCTNESS assertion that story 8-13 carried ("mirror TIEs must not share an orientation") was removed with the superseded static-look-at block and is not directly re-pinned in core; it is structurally guaranteed (orient derives from each TIE's own pos + bank) and the render mechanism is still guarded by `tests/shell/render.tie-orient.test.ts`. Affects `tests/core/tie-flight.test.ts` (could add a two-TIE distinctness assertion). *Found by Reviewer during code review.*
- **Question** (non-blocking): the bank ROLL direction (`Math.sign(bias)`) banks-into vs banks-away-from the swoop is not test-covered (orientation/scale escape structural tests per repo convention) — recommend an eyeball pass on the dev server during finish to confirm the swoop reads right on screen. Affects `src/core/sim.ts:527`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### TEA (test design)
- **Tests pin a constant-approach-speed model, not accelerate-from-rest**
  - Spec source: docs/tie-flight-ai-model.md §4 & §5.3; context-story-9-2.md AC-1
  - Spec text: "Initial velocity = 0 … The TIE then accelerates along its heading"; "Thrust per frame basis ÷32 (fast) or ÷64 (slow) per axis"
  - Implementation: tie-flight.test.ts asserts a CURVED-DIRECTION homing + banking model at PRESERVED speed magnitude (`|vel|` held as the heading turns); it does not assert acceleration from rest or variable speed.
  - Rationale: a zero/variable-speed spawn voids the 8-6 difficulty observable (framing.test.ts pins spawn `|vel| ≈ ENEMY_SPEED` and wave-2 > wave-1); the §5.3 rates are explicitly per-cabinet-tick and not pinned to our `dt` (model §5.3 caveat); model §10 blesses porting the confirmed kinematics + approximating the script for 9-2.
  - Severity: minor
  - Forward impact: full accelerate-from-rest + thrust deferred to a later story (logged as a Delivery Finding).
- **Superseded 8-13's static cockpit-look-at orientation tests**
  - Spec source: context-story-9-2.md AC-3; tests/core/tie-orientation.test.ts (story 8-13)
  - Spec text: AC-3 "Banking/orientation follows the path per the model, not just a static look-at (extends story 8-13)"
  - Implementation: removed the 3 "orientation faces the cockpit (static look-at)" tests; the new banking/path-following contract lives in tests/core/tie-flight.test.ts. Kept the still-true invariants in tie-orientation.test.ts (well-formed pure rotation, determinism).
  - Rationale: AC-3 directly contradicts a static look-at; keeping both contracts would leave the suite self-conflicting. Resolving now expresses one coherent contract.
  - Severity: minor
  - Forward impact: render.tie-orient.test.ts (shell) still passes (orientation still drives render); no other consumer of the static-look-at contract.
- **Widened space-combat.test.ts "TIEs close on the cockpit over time" to a ~1s window**
  - Spec source: context-story-9-2.md AC-1 & AC-4; tests/core/space-combat.test.ts (story 8-3)
  - Spec text: AC-1 "TIEs follow curved/weaving paths, not a straight line"; the test title "close on the cockpit over time"
  - Implementation: changed the assertion from a single 0.1875s step to 8 steps (~1s) of net inward progress.
  - Rationale: a curved/weaving path can arc laterally within any single sub-step; the cabinet invariant is net approach "over time," which the window faithfully preserves while accommodating the curve.
  - Severity: minor
  - Forward impact: none — the test's intent is unchanged; only the sampling window widened.

### Dev (implementation)
- **Approximated the per-fighter script VM + roll-burst/scripted-turn drivers with a single constant banking-swoop arc**
  - Spec source: docs/tie-flight-ai-model.md §5.1 (behavior-script VM) & §5.2 (roll burst ≈20.3°/frame, scripted pitch/yaw ≈4.5°/frame, homing steer); context-story-9-2.md AC-1
  - Spec text: "Each TIE runs a tiny bytecode interpreter … roll→turn→dive→fire"; "(a) Roll burst … (b) scripted pitch/yaw/roll … (c) Homing / steering"
  - Implementation: moveEnemy blends a homing heading (toward the cockpit) with one per-TIE lateral bias and a constant bank roll — a banking swoop arc — rather than a scripted maneuver state machine with discrete roll bursts and stepped yaw/pitch.
  - Rationale: model §10 explicitly sanctions for 9-2 "port the confirmed kinematics … and approximate the script choreography with a small hand-authored maneuver." The §5.2 angular rates are per cabinet-tick and not pinned to our `dt` (§5.3 caveat). The swoop delivers the headline behaviour the ACs require (curved/banking approach, not a beeline); the VM + per-wave scripts are §10 UNKNOWNs.
  - Severity: minor
  - Forward impact: 9-5 replaces the constant bias with scripted choreography; `Enemy.bank` is the seam (logged as a Delivery Finding).
- **Constant approach speed (|vel| preserved), not accelerate-from-rest**
  - Spec source: docs/tie-flight-ai-model.md §4 & §5.3; the TEA red-phase contract (tie-flight.test.ts) + TEA deviation above
  - Spec text: "Initial velocity = 0 … accelerates along its heading"; "Thrust per frame basis ÷32 / ÷64 per axis"
  - Implementation: `speed = |vel|` is held constant while only the heading turns; spawn keeps `vel = dir · waveParams.enemySpeed`.
  - Rationale: follows the TEA-pinned contract — preserves the 8-6 difficulty observable (framing.test.ts pins spawn `|vel|`) and the combat-kill-loop stationary fixtures (`|vel| = 0` stays put). Acceleration is deferred with the kinematics port.
  - Severity: minor
  - Forward impact: acceleration arrives with the §5 kinematics port (9-5).

### Reviewer (audit)
- **TEA — constant-approach-speed model (not accelerate-from-rest)** → ✓ ACCEPTED: sound. Holding `|vel|` is the only way to satisfy AC1+AC3 while keeping the 8-6 difficulty observable (framing.test.ts) and the 8-16 stationary fixtures; §10 sanctions the kinematics-only slice. The §5.3 rates being per cabinet-tick (unpinned to our dt) is correctly cited.
- **TEA — superseded 8-13's static cockpit-look-at tests** → ✓ ACCEPTED: AC-3 ("not just a static look-at") directly contradicts those assertions; keeping them would make the suite self-conflicting. The durable invariants (pure rotation, determinism) were correctly retained, and the new contract is pinned in tie-flight.test.ts. (Minor coverage note — per-enemy distinctness — logged as a Reviewer delivery finding, non-blocking.)
- **TEA — widened space-combat "closes over time" to a ~1s window** → ✓ ACCEPTED: the widened assertion still demands net inward progress (max-z strictly increases), so a sideways-drifting TIE still fails it — intent preserved, not loosened into vacuity. Verified against the changed hunk.
- **Dev — approximated the script VM with a single constant banking-swoop arc** → ✓ ACCEPTED: explicitly sanctioned by model §10 for 9-2; delivers the headline curved/banking approach the ACs require. `Enemy.bank` is a clean seam for the 9-5 script-VM port. The constant (non-decaying) bias means the TIE never settles into a lined-up final approach (a §5.2c fidelity gap) — acceptable for this slice and already captured as a deferred finding.
- **Dev — constant approach speed (|vel| preserved)** → ✓ ACCEPTED: follows the TEA-pinned contract; the implementation at sim.ts:523-524 holds `|vel|` exactly (unit heading × recomputed speed), no drift. Consistent with the TEA deviation above.

## Sm Assessment

Setup complete and ready for the red phase. The engagement is well-scoped:

- **Source of truth is fixed.** The RE'd flight model from story 9-1 lives at
  `star-wars/docs/tie-flight-ai-model.md`. 9-1 is merged; its branch is pruned.
  TEA and Dev must treat that doc as the authoritative spec for swoop/weave/bank.
- **The boundary is the real constraint.** This is pure-core work in
  `core/sim.ts`. No DOM, no wall-clock time, no `Math.random` — motion must be
  driven by the seeded RNG carried in `GameState`. The determinism AC (identical
  state/input/dt/seed → identical trajectory) is the load-bearing test.
- **Regression surface to watch:** existing Wave-1 tests, collisions, and
  hit-tests must stay green. Banking (AC 3) extends story 8-13's orientation
  work — verify it composes rather than replacing the look-at outright.

**Routing:** phased TDD → handing off to **tea** (Han Solo) for the red phase.
Write failing tests first that pin the curved-path and determinism contract
against the documented model before any implementation.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** 3-pt TDD story porting genuinely new sim behavior (curved/weaving/
banking TIE flight) into the pure core.

**Test Files:**
- `tests/core/tie-flight.test.ts` (NEW) — the full 9-2 contract: AC1 curved/
  weaving path, AC2 determinism + purity, AC3 banking-along-path (not a static
  look-at) + pure rotation, AC4 collisions/motion unaffected.
- `tests/core/tie-orientation.test.ts` (EDIT) — removed the 3 static-look-at
  tests superseded by AC3; kept the well-formed-rotation + determinism invariants.
- `tests/core/space-combat.test.ts` (EDIT) — widened "closes on the cockpit over
  time" to a ~1s window (accommodates the curve, preserves intent).

**Tests Written:** 11 in tie-flight.test.ts covering all 4 ACs.
**Status:** RED — 4 failing (the new curve + banking behavior). Type-clean
(`tsc --noEmit` passes). All 24 other suites green (339 passing, 4 failing).

#### RED failures — the contract Dev must turn green
| Test | AC | Message |
|------|----|---------|
| does not fly straight — bearing to origin turns | AC1 | expected 0 > 0.02 |
| bows off the straight spawn→cockpit line | AC1 | expected 4.2e-13 > 2 |
| not a static look-at during the approach | AC3 | expected 0 > 0.01 |
| rolls (banks) into its turns | AC3 | expected 0 > 0.01 |

### Rule Coverage

| Rule (lang-review TS) | Test(s) | Status |
|------|---------|--------|
| #4 null/undefined (`\|\|` vs `??`; 0 falsy-but-valid speed) | tie-flight "a stationary TIE … not spuriously set in motion" | passing guardrail |
| #1 type-safety escapes (no `as any`; full `Enemy` fixtures) | whole file compiles under `tsc --noEmit` | passing |
| #8 test quality (meaningful assertions; loop guarded by `expect(checked > 5)`) | self-check | done |

**Rules checked:** 3 of the applicable TS lang-review checks have explicit
coverage; the rest (React/JSX, async/Promise, enums, JSON.parse validation, build
config) are N/A for a pure-core math change.
**Self-check:** 0 vacuous tests — every test asserts a real comparison, and the
per-frame "nose leads travel" test guards against an empty loop with
`expect(checked).toBeGreaterThan(5)`.

#### Boundary guardrails (preservation — green now; go red if the model breaks)
- AC2 determinism (`identical seed → identical trajectories`, full-run replay)
  catches any `Math.random` / wall-clock leak.
- AC4 collision + stationary-TIE tests catch a regression in the hit-tests or the
  speed-preservation contract.

**Handoff:** To **Dev (Yoda)** for the GREEN phase — implement curved homing-steer
+ banking in `src/core/sim.ts` (moveEnemy/successor), **preserving `|vel|` as the
heading turns** (Delivery Finding 1). Source of truth: `docs/tie-flight-ai-model.md`
(§5 per-frame motion, §5.2 rotation drivers). Honor all three delivery findings.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/state.ts` — added `Enemy.bank?` (per-TIE swoop bias) and the
  `TIE_SWOOP_BIAS` / `TIE_BANK_ANGLE` tuning constants (single-sourced with the
  other Wave-1 numbers).
- `src/core/sim.ts` — rewrote `moveEnemy` (homing + swoop heading at preserved
  speed; bank-into-the-turn orientation) and `spawnTie` (seeds each TIE's swoop
  direction from the RNG); added the `UP` const and the math3d imports it needs
  (`length`, `cross`, `multiply`, `rotationZ`).

**Approach:** Each TIE thrusts along a heading that blends homing-toward-the-
cockpit with a per-TIE lateral bias (seeded at spawn), so it traces a banking
swoop arc instead of a beeline (AC1). `|vel|` magnitude is preserved as the
heading turns, so the 8-6 difficulty ramp and the combat-kill-loop stationary
fixtures stay intact (AC4). Orientation = look-along-heading rolled into the turn
— banking, not a level look-at (AC3, extends 8-13). Pure: heading and roll derive
only from position and the seeded bias — no time, no `Math.random` (AC2).

**Tests:** 343/343 passing (GREEN), all 25 suites. Type-clean (`tsc --noEmit`).
The 4 RED tie-flight tests (AC1 curve ×2, AC3 banking ×2) now pass; no regressions
(framing/difficulty/combat-kill-loop/tie-orientation/render.tie-orient all green).

**Branch:** feat/9-2-port-tie-flight-model (pushed).

**Rendering:** the shell already consumes `Enemy.orient` (story 8-13), so the
banking swoop reaches the screen with no shell change. Recommend eyeballing the
swoop on the dev server during the verify/review phase.

**Handoff:** To the next phase (TEA verify / Reviewer) per the workflow router.

## Subagent Results

Only `preflight` and `rule_checker` are enabled (`workflow.reviewer_subagents`); the
rest are pre-filled as Skipped/disabled and their domains were assessed by the Reviewer.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 smells; tests GREEN 343/343; tsc clean; build clean | N/A (raised 2 judgment calls, both resolved below) |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — edges reviewer-assessed (origin/degenerate, huge-bias) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — no try/catch or fallbacks in diff |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — tests reviewer-assessed (no vacuous; 1 LOW helper note) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — comments reviewer-assessed (accurate, cite the model doc) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — `bank?: number` reviewer-assessed (1 LOW Readonly note) |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — pure client core, no attack surface |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — moveEnemy is minimal; no dead code |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 19 rules; 2 LOW observations | confirmed 2 (LOW), dismissed 0, deferred 0 |

**All received:** Yes (2 enabled returned; 7 disabled pre-filled)
**Total findings:** 2 confirmed (both LOW, from rule-checker) + 3 reviewer-originated (all LOW), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

A faithful, well-scoped kinematics slice. The diff replaces the dead-straight
`pos += vel` with a banking swoop (homing heading + per-TIE lateral bias at
preserved speed) and a banked orientation — satisfying AC1 (curved), AC2
(deterministic/pure), AC3 (banking, not a static look-at) and AC4 (existing
contracts intact). 343/343 tests green, type-clean, clean build, zero rule
violations across 19 checks. No Critical/High issues; all findings are LOW and
non-blocking.

**Data flow traced:** `e.pos`/`e.vel`/`e.bank` → `moveEnemy` (sim.ts:516) →
heading=normalize(homing+swoop) → `vel`/`pos`/`orient` → `state.enemies` → render
consumes `orient` (story 8-13, guarded by tests/shell/render.tie-orient.test.ts).
Safe: pure function of position + seeded bias; no external state, no DOM, no time
beyond `dt`.

**Subagent dispatch tags (all 8 accounted for; disabled specialists reviewer-assessed):**
- `[RULE]` reviewer-rule-checker (enabled): 0 violations / 19 rules. Confirmed 2 LOW
  observations — (a) `moveEnemy(e: Enemy)` not `Readonly<Enemy>` (sim.ts:516),
  inconsistent with `advance(readonly Projectile[])`; (b) tie-flight `isPureRotation`
  (test:87) omits the bottom-row check the tie-orientation copy has. Both LOW,
  no practical consequence.
- `[TEST]` (specialist disabled — reviewer-assessed): no vacuous assertions; the
  RED tests fail for the right reasons (verified in red phase: cross-track ~0 not
  NaN). One LOW: per-enemy orientation distinctness not re-pinned in core (delivery
  finding). The widened space-combat window still asserts net inward progress.
- `[TYPE]` (disabled — reviewer-assessed): `Enemy.bank?: number` is a correct
  optional scalar; `?? 0` (sim.ts:522) handles the 0-is-valid case. LOW: field name
  `bank` reads as a roll angle but is the lateral swoop BIAS — slightly misleading.
- `[EDGE]` (disabled — reviewer-assessed): origin/degenerate heading handled (zero
  guards in normalize/cross; speed===0 early return sim.ts:519). Radial velocity
  `−speed/√(1+bias²) < 0` ⇒ range strictly decreases ⇒ the TIE always reaches the
  cockpit (no infinite orbit). No clamp on `bank` (theoretical only — set ±0.5
  internally).
- `[SILENT]` (disabled — reviewer-assessed): no swallowed errors, no try/catch, no
  silent fallbacks in the diff.
- `[DOC]` (disabled — reviewer-assessed): the new doc comments are accurate and cite
  `docs/tie-flight-ai-model.md §5`; the Enemy.orient/bank comments correctly note the
  8-13 → 9-2 evolution. No stale comments.
- `[SEC]` (disabled — reviewer-assessed): pure client-side game core, no secrets,
  no input parsing, no network/auth surface. N/A.
- `[SIMPLE]` (disabled — reviewer-assessed): moveEnemy is minimal and direct; no dead
  code, no over-engineering.

### Rule Compliance

Project rules in force: the star-wars **core-purity boundary** (CLAUDE.md) and the
**TypeScript lang-review checklist** (no `.claude/rules` or `SOUL.md` in this repo).

| Rule | Instances in diff | Verdict |
|------|-------------------|---------|
| Core never imports shell/ | sim.ts + state.ts imports (all `./state`,`./input`,`./events`,`./math3d`,`./gameRules`,`./rng`) | ✓ compliant |
| Core: no DOM/window/document/canvas | all new core code | ✓ compliant |
| Core: no `Math.random`/`Date`/`performance`/`rAF` | `Math.sign` (sim.ts:527, allowed/deterministic); `nextFloat(rng)` (sim.ts:539, seeded) | ✓ compliant |
| Time only via `dt`; randomness only via seeded RNG | `moveEnemy(e,dt)`; `bank` seeded at spawn | ✓ compliant (determinism tests prove it) |
| 3D math routes through math3d.ts | length/cross/normalize/add/scale/multiply/rotationZ/lookRotation — no ad-hoc trig in core | ✓ compliant |
| TS #1 type-safety escapes | no `as any`/`@ts-ignore`/`!` in core; test `as Vec3` are tuple narrowings | ✓ compliant |
| TS #4 `??` vs `||` (0 falsy-but-valid) | `e.bank ?? 0` (sim.ts:522), `e.vel ?? ZERO` (sim.ts:517) | ✓ compliant |
| TS #2 readonly params | `moveEnemy(e: Enemy)` not `Readonly<Enemy>` | ◐ LOW — non-blocking polish |
| TS #8 test quality | no vacuous assertions; helper bottom-row omission | ◐ LOW — non-blocking |

### Devil's Advocate

Suppose this code is broken. Where would it hurt? First, integration is forward
Euler (`pos += vel*dt`), so the path SHAPE is frame-rate dependent — a different
`dt` cadence traces a slightly different arc. But that is pre-existing (the old
moveEnemy integrated the same way), the shell drives a fixed timestep (CLAUDE.md),
and purity is unaffected (same input → same output), so it is not a regression.
Second, a huge `dt` could tunnel a TIE through the 80-unit cockpit sphere without
a collision — again pre-existing and bounded by the fixed timestep. Third, the
swoop bias is a CONSTANT that never decays: a confused future reader might expect
the TIE to "line up" for a straight final run (as the cabinet does, §5.2c), but it
spirals continuously until collision; I confirmed the radial velocity is always
negative so it does reach the cockpit and despawn — no stuck TIE, no leaked slot.
Fourth, `bank` is unclamped: a malformed external `bank` of 1e6 would drive the
forward component toward zero and make a TIE orbit almost forever — but `bank` is
only ever set to ±0.5 by spawnTie, so this is theoretical. Fifth, a malicious or
confused caller passing negative `dt` would push TIEs AWAY from the cockpit; the
loop never does this. Sixth — the real soft spot — the bank ROLL direction is not
test-covered: if `Math.sign(bias)` rolls the wrong way, the wings would tilt out of
the turn and look wrong, and no unit test would catch it (orientation/scale escape
structural tests by repo convention). That is the one thing finish/verify should
eyeball on the dev server. None of these rise to Critical or High: the simulation
is pure, deterministic, range-converging, and rule-clean. The worst real outcome is
a cosmetic bank-direction mismatch, which is a visual-polish follow-up, not a
correctness bug.

**Observations (≥5):**
- `[VERIFIED]` purity/determinism — sim.ts:516-528 read only `e.pos`/`e.vel`/`e.bank`/`dt` + math3d pure fns; `bank` seeded via `nextFloat(rng)` at sim.ts:539; no `Math.random`/`Date`/DOM. Complies with CLAUDE.md core-purity rule (rule-checker rules 14-18 concur). Evidence: tie-flight determinism tests green.
- `[VERIFIED]` `|vel|` preserved — sim.ts:523-524: `heading=normalize(...)` (unit) × `speed=length(e.vel)`; magnitude constant, no drift. Honors AC4/8-6; framing.test.ts green.
- `[VERIFIED]` collision contract intact — sim.ts:517 `e.vel ?? ZERO` + sim.ts:519 `speed===0` early return ⇒ vel-0 fixtures stay put; collision reads only `.pos`. combat-kill-loop + space-combat collision tests green.
- `[VERIFIED]` orient is a pure rotation — sim.ts:527 `multiply(lookRotation(heading), rotationZ(...))` = rotation×rotation; tie-flight "pure rotation" + tie-orientation "well-formed rotation" green.
- `[VERIFIED]` range strictly decreases ⇒ TIE reaches cockpit — radial velocity toward origin = `speed/√(1+bias²) > 0`; no infinite orbit / leaked slot.
- `[LOW]` `[RULE]` `moveEnemy(e: Enemy)` not `Readonly<Enemy>` at sim.ts:516 — inconsistent with `advance(readonly Projectile[])`; no mutation occurs (Vec3/Mat4 are readonly aliases).
- `[LOW]` `[RULE]`/`[TEST]` `isPureRotation` in tie-flight.test.ts:87 omits the bottom-row check its tie-orientation twin has — weaker assertion, no practical gap.
- `[LOW]` `[TYPE]` field name `bank` is the lateral swoop BIAS, not a roll angle — mildly misleading; `swoop`/`swoopBias` would read truer.
- `[LOW]` `[TEST]` per-enemy orientation distinctness (old 8-13 "mirror TIEs differ") not re-pinned in core — structurally guaranteed + render-guarded (delivery finding).

**Error handling:** the only failure modes are degenerate vectors (origin / `bank=0`), all handled by the zero-guards in `normalize`/`cross` and the `speed===0` early return (sim.ts:519) — no throws, no NaN paths.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.