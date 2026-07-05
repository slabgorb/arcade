---
story_id: A2-7
jira_key: ""
epic: A2
workflow: tdd
---
# Story A2-7: One shot destroys only one rock — bullet consumed on first hit, never both overlapping rocks

## Story Details
- **ID:** A2-7
- **Jira Key:** (none — local YAML tracking)
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-05T14:34:35Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-05T13:59:45Z | 2026-07-05T14:04:00Z | 4m 15s |
| red | 2026-07-05T14:04:00Z | 2026-07-05T14:20:30Z | 16m 30s |
| green | 2026-07-05T14:20:30Z | 2026-07-05T14:23:26Z | 2m 56s |
| review | 2026-07-05T14:23:26Z | 2026-07-05T14:34:35Z | 11m 9s |
| finish | 2026-07-05T14:34:35Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking, fixed by TEA): A2-9 (commit `dd42be8`) merged with a broken build — `tests/bullet.test.ts:420` constructs a `Ship` literal (`restShip`) missing the `visible` field required since A-16, failing `tsc --noEmit`. Affects `asteroids/tests/bullet.test.ts` (added `visible: true` to the literal — a one-line test-fixture fix, no behavior change). *Found by TEA during test design.*
- **Gap** (non-blocking, fixed by TEA): `tests/reference-velocities.test.ts` (from A-17) asserted a naive 1:1 mapping between raw ROM values and core's continuous-dt constants for `SAUCER_VERTICAL_SPEEDS` and `SAUCER_FIRE_INTERVAL`. A2-9 correctly discovered the ROM applies both inside an every-4th-frame gate (`UpdateScr` L6B93) and updated `src/core/saucer.ts` accordingly (÷4 speed, ×4 interval) but did not update this test file, leaving 2 assertions failing on develop. Affects `asteroids/tests/reference-velocities.test.ts` (updated both assertions to expect the ROM-confirmed ×4/÷4 conversion, per the same reasoning as A2-9's own code comments — verified this was a stale test, not a source regression, before touching anything). *Found by TEA during test design.*
- **Question** (non-blocking): The story's hypothesized root cause (`sim.ts:313-329`'s `findIndex` + `continue` resolving array-order rather than distance) does not reproduce. 7 new tests in `asteroids/tests/overlapping-rocks.test.ts` cover a bullet vs. two spatially-overlapping rocks — same size, different size, and a fast (111 lo-units/frame) tunneling shot through the overlap — and all 7 PASS against the current, unmodified collision loop: `working.findIndex(...)` returns exactly one match per bullet and `continue` consumes the bullet immediately after, so a single bullet already destroys at most one rock regardless of overlap. Recommend Dev do a manual playtest to confirm whether the reported symptom still occurs; one plausible alternate explanation is that `splitRock`'s children spawn at the exact parent position (no offset) and could be visually mistaken, mid-playtest, for "the other overlapping rock" also dying. These tests stand as permanent regression guards either way. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): Extended TEA's investigation before ruling out a fix. Reviewed every other code path that touches `state.rocks` for a second, independent destruction path TEA hadn't already ruled out: the renderer (`src/shell/render.ts:397`, `for (const rock of state.rocks) drawRock(...)`) is a stateless pass with no index-based keying or persistent per-rock explosion tracking that could visually double-kill a rock; the wave director (`src/core/waves.ts:119`) only spawns a fresh wave when `state.rocks.length === 0`, never independently destroys rocks; scoring (`applyScore` in the collision loop) is called exactly once per bullet hit, matching the single `splice`. No second destruction path exists anywhere in the codebase. Affects nothing (confirms TEA's finding — no fix needed). Cross-reference: the epic's very next story, A2-8 ("Subtle debris particles on every rock break — dim, short-lived scatter per reference footage"), independently targets the same visual gap this hypothesis points at — a destroyed rock currently vanishes with no particle feedback, which plausibly reads as ambiguous during fast-paced play. Recommend A2-8 as the actual fix for the playtest observation, not a further sim.ts change. *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (non-blocking): `overlapping-rocks.test.ts` covers only strict two-rock overlap. Missing: (a) a three-way overlap (the most plausible real trigger, since `splitRock` spawns both children at the exact parent position — a bullet arriving during a second concurrent split could face 3+ mutually-overlapping candidates in `working`, untested with the splice-based index shift beyond 2 array members); (b) an overlap straddling the toroidal wrap seam (the single-pass-per-bullet contract and `wrappedDelta`'s seam fold are each tested individually elsewhere but not together for an overlapping pair); (c) the exact hitbox-boundary distance where `segmentHitsBox`'s strict `<` comparison flips. Affects `asteroids/tests/overlapping-rocks.test.ts` (would need 2-3 additional test cases). *Found by Reviewer (via reviewer-test-analyzer) during code review.*
- **Question** (non-blocking): reviewer-test-analyzer independently confirmed, by checking out `origin/develop` at `dd42be8` in a scratch worktree, that A2-9's merge commit message claimed "340/340 tests green" while 2 tests in `reference-velocities.test.ts` were actually already failing at merge time. This diff quietly repairs that pre-existing regression as a drive-by fix (already logged by TEA above), but the underlying process question — how a PR merged to `develop` with a false "all green" claim and 2 known-red tests — is worth the team's attention independent of A2-7. Affects the asteroids repo's PR/CI process generally, not a specific file. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): The AC-5 determinism test (`overlapping-rocks.test.ts:112`) calls `scenario()` twice but both calls close over the SAME `rockA`/`rockB` object references (only the bullet is freshly constructed per call). Verified this is not a live bug — `updateRock`/`splitRock` in `src/core/rocks.ts` are pure and return fresh objects — but the test as written couldn't distinguish true replay-determinism from a hypothetical in-place-mutating step function, since a mutation would carry between calls and still produce `scenario() === scenario()` by coincidence. Affects `asteroids/tests/overlapping-rocks.test.ts:109-116` (would need each `scenario()` call to rebuild its own rock fixtures independently). *Found by Reviewer (via reviewer-test-analyzer) during code review.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

3 deviations

- **Followed story context over epic context on touching `src/core/sim.ts`**
  - Rationale: Per the spec-authority hierarchy, story context (priority 2) outranks epic context (priority 3). The epic doc also predates this story — it enumerates only A2-1/A2-2 and was never regenerated as A2-3 through A2-9 were added, several of which are core-sim bug fixes (A2-9 touched `bullet.ts`/`saucer.ts`). The "no sim changes" guardrail is stale, not a live constraint.
  - Severity: minor
  - Forward impact: Recommend SM/PM regenerate `context-epic-A2.md` so its guardrails and story sequencing reflect the epic's actual current scope (bug-fix stories A2-3 through A2-9), not just the original two polish stories.
- **RED-phase tests pass against current code — no failing test produced for this story's hypothesized bug**
  - Rationale: Verified by actually running the suite (not just code-reading) before concluding; confirmed via `git stash` that these results reflect the branch's inherited `develop` state, not something introduced by this story's setup. See the Delivery Findings "Question" entry above for the recommended next step.
  - Severity: major (changes the shape of the GREEN phase — there is no failing collision test for Dev to turn green)
  - Forward impact: Dev's GREEN phase should either (a) manually reproduce the playtest symptom to find the true trigger and add a test for it, or (b) confirm the symptom no longer reproduces and close the story with these 7 tests retained as regression guards.
- **No source code changes made — confirmed the AC is already satisfied by current behavior**
  - Rationale: A source change would be fixing something that isn't broken — the collision resolution already behaves correctly under every overlap configuration tested. Per minimalist-discipline ("is this necessary?"), no test demands a code change, so none was made.
  - Severity: major (this story closes with zero production code diff — an atypical TDD outcome)
  - Forward impact: Recommend SM/PM decide whether to close A2-7 as "verified correct, no fix needed" (tests retained as regression guards) or keep it open pending a live playtest. Recommend the actual playtest-perceived issue be tracked against A2-8 (debris particles on rock break), already in the epic backlog, rather than reopening this story's scope.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Followed story context over epic context on touching `src/core/sim.ts`**
  - Spec source: `sprint/context/context-epic-A2.md`, "Forward Notes" — "No new game mechanics or simulation changes in A2 — purely visual/UX polish... core sim (`src/core/`) remains untouched."
  - Spec text: epic guardrail restricts A2 to `src/shell/render/` and `src/shell/input.ts`.
  - Implementation: Wrote tests directly against `sim.ts`'s bullet-vs-rock collision loop (`asteroids/tests/overlapping-rocks.test.ts`), per the story context's technical approach (`context-story-A2-7.md`), which explicitly scopes the fix to `src/core/sim.ts:313-329`.
  - Rationale: Per the spec-authority hierarchy, story context (priority 2) outranks epic context (priority 3). The epic doc also predates this story — it enumerates only A2-1/A2-2 and was never regenerated as A2-3 through A2-9 were added, several of which are core-sim bug fixes (A2-9 touched `bullet.ts`/`saucer.ts`). The "no sim changes" guardrail is stale, not a live constraint.
  - Severity: minor
  - Forward impact: Recommend SM/PM regenerate `context-epic-A2.md` so its guardrails and story sequencing reflect the epic's actual current scope (bug-fix stories A2-3 through A2-9), not just the original two polish stories.

- **RED-phase tests pass against current code — no failing test produced for this story's hypothesized bug**
  - Spec source: `sprint/context/context-story-A2-7.md`, "Write failing tests (RED phase)" and Acceptance Criteria.
  - Spec text: tests were expected to fail against the array-order collision bug, then Dev's GREEN phase would fix `sim.ts`.
  - Implementation: All 7 tests in `overlapping-rocks.test.ts` pass unmodified against current `sim.ts` — the single-pass-per-bullet `findIndex`/`continue` contract already prevents one bullet from destroying two rocks in every scenario tested (same-size overlap, different-size overlap, fast-tunnel overlap).
  - Rationale: Verified by actually running the suite (not just code-reading) before concluding; confirmed via `git stash` that these results reflect the branch's inherited `develop` state, not something introduced by this story's setup. See the Delivery Findings "Question" entry above for the recommended next step.
  - Severity: major (changes the shape of the GREEN phase — there is no failing collision test for Dev to turn green)
  - Forward impact: Dev's GREEN phase should either (a) manually reproduce the playtest symptom to find the true trigger and add a test for it, or (b) confirm the symptom no longer reproduces and close the story with these 7 tests retained as regression guards.

### Dev (implementation)
- **No source code changes made — confirmed the AC is already satisfied by current behavior**
  - Spec source: `sprint/context/context-story-A2-7.md`, Acceptance Criteria (all 5).
  - Spec text: expected a `sim.ts` collision-loop fix (distance-based or explicit array-order semantics) to make TEA's tests pass.
  - Implementation: Made no changes to `src/core/sim.ts` or any other source file. Independently re-verified TEA's finding by auditing every other code path touching `state.rocks` (renderer, wave director, scoring) for a second destruction path — none exists. All 5 ACs are already met: exactly one rock destroyed per bullet (AC-1), array-order semantics documented and tested (AC-2), fast-bullet regression guard holds (AC-3), single-pass loop confirmed by code + test (AC-4), determinism holds (AC-5).
  - Rationale: A source change would be fixing something that isn't broken — the collision resolution already behaves correctly under every overlap configuration tested. Per minimalist-discipline ("is this necessary?"), no test demands a code change, so none was made.
  - Severity: major (this story closes with zero production code diff — an atypical TDD outcome)
  - Forward impact: Recommend SM/PM decide whether to close A2-7 as "verified correct, no fix needed" (tests retained as regression guards) or keep it open pending a live playtest. Recommend the actual playtest-perceived issue be tracked against A2-8 (debris particles on rock break), already in the epic backlog, rather than reopening this story's scope.

## Sm Assessment

- **Jira:** Skipped — project uses local YAML sprint tracking only (no Jira integration; see CLAUDE.md "No Jira" note).
- **Story context:** Written (`sprint/context/context-story-A2-7.md`). Root cause: the bullet/rock collision loop in `asteroids/src/core/sim.ts:313-329` uses `findIndex()` + `sweptOverlaps()` to find the first rock a bullet hits, but the "first" semantic (array order, not spatial distance) can let one bullet resolve against more than one rock when two rocks spatially overlap. Acceptance criteria cover: distance-based collision semantics (nearest hit wins, not array order), dedicated overlapping-rock test cases, a fast-bullet regression guard (111 lo-units/frame swept path, per prior A-13 saucer-collision work), and determinism verification.
- **Branch:** `fix/A2-7-one-shot-one-rock` created in `asteroids`, based on `develop` (gitflow), not on `main`/`develop` directly.

## TEA Assessment

**Tests Required:** Yes
**Test Files:**
- `asteroids/tests/overlapping-rocks.test.ts` (new) — bullet vs. two spatially-overlapping rocks: same size (3 tests), different size (2 tests), fast/tunneling shot through the overlap (1 test), and determinism (1 test). 7 tests total.

**Tests Written:** 7 tests covering all 5 ACs in `context-story-A2-7.md`
**Status:** GREEN, not RED — see Delivery Findings "Question" entry and Design Deviations above. All 7 tests pass against the current, unmodified `sim.ts` collision loop; the story's hypothesized array-order bug does not reproduce in any tested overlap scenario. These are retained as regression guards regardless of Dev's next step.

**Also fixed (out of A2-7's scope, required to satisfy the "build and tests clean" AC):**
- `tests/bullet.test.ts` — one-line fixture fix (missing `Ship.visible`), broken by A2-9 (`dd42be8`).
- `tests/reference-velocities.test.ts` — updated 2 stale assertions to the ROM-confirmed ×4/÷4 saucer-cadence conversion A2-9 introduced in `src/core/saucer.ts` but didn't backport to this test file.

### Rule Coverage

TypeScript lang-review checklist (`.pennyfarthing/gates/lang-review/typescript.md`): this story is a pure `src/core/` determinism fix with no React/JSX, async, or external-input surface, so most of the 13 checks don't apply. Applicable checks:

| Rule | Test(s) | Status |
|------|---------|--------|
| #1 type-safety escapes (no `as any`/`@ts-ignore`) | all tests in `overlapping-rocks.test.ts` | passing (none used) |
| #8 test quality (meaningful assertions, no vacuous checks) | self-checked every test — each asserts exact rock counts/positions/bullet consumption, no `let _ =` or bare `is_some()`-style checks | passing |

**Rules checked:** 2 of 13 applicable lang-review rules have explicit coverage (the rest are inapplicable to this story's scope).
**Self-check:** 1 vacuous/incorrect assertion found in my own first draft (inverted small-rock-count check) and fixed before handoff; 0 remaining.

**Handoff:** To Dev — see Delivery Findings and Design Deviations for the required judgment call on the GREEN phase (investigate for a true reproduction, or confirm-and-close with these tests as guards).

## Dev Assessment

**Implementation Complete:** Yes — no source code changes required.
**Files Changed:** None (source unchanged). Test files added/fixed by TEA in the prior commit (`2778e45`) are retained as-is.

**Investigation performed:** Audited every code path touching `state.rocks` beyond the collision loop TEA already checked — the renderer (stateless pass, no per-rock keying), the wave director (only spawns when the field is fully empty), and scoring (one `applyScore` call per hit, matching the one `splice`). No second destruction path exists anywhere in the codebase. Confirmed all 5 ACs in `context-story-A2-7.md` are already satisfied by current behavior.

**Tests:** 696/696 passing (GREEN) — includes the 7 new `overlapping-rocks.test.ts` tests, unmodified.
**Branch:** `fix/A2-7-one-shot-one-rock` (pushed)

**Conclusion:** The story's reported bug does not reproduce in `src/core/sim.ts`. The likely real cause of the playtest observation is a visual-clarity gap (a destroyed rock currently vanishes with no particle feedback) that the epic's next story, A2-8, already targets — recommend tracking the playtest follow-up there rather than in this story.

**Handoff:** To Reviewer, with a recommendation to close A2-7 as "verified correct, no fix needed," retaining the 7 new tests as permanent regression guards.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | N/A | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | N/A | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 4 | confirmed 4, dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | N/A | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | N/A | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | N/A | Skipped | disabled | Disabled via settings |
| 8 | reviewer-simplifier | N/A | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none (22 instances checked across 13 rules) | N/A |

**All received:** Yes (3 enabled, all returned; 6 disabled, pre-filled)
**Total findings:** 4 confirmed, 0 dismissed, 0 deferred

### Rule Compliance (from reviewer-rule-checker, TypeScript lang-review checklist)

Diff is test-only (3 files, no `src/` changes). All 13 checklist rules checked against every changed file; 22 rule instances enumerated, 0 violations.

| Rule | Applicable | Instances | Result |
|------|-----------|-----------|--------|
| #1 Type safety escapes | Yes | 3 files | Compliant — no `as any`/`@ts-ignore`/unwarranted `!` anywhere |
| #2 Generic/interface pitfalls | Yes | 3 helper fns (`rockAt`, `bulletAt`, `playing`) | Compliant — `Partial<T>` used correctly as override params, full type returned |
| #3 Enum anti-patterns | No enums in diff | 0 | N/A |
| #4 Null/undefined handling | Yes | 2 (`survivor?.pos`, `find()`+`toBeDefined()`) | Compliant — defensive checks before use |
| #5 Module/declaration issues | Yes | 7 imports | Compliant — `type` modifier used correctly on type-only imports; no `.js`-extension violation (matches project's `moduleResolution: bundler` convention, confirmed against pre-existing `collision.test.ts`) |
| #6 React/JSX | No .tsx files | 0 | N/A |
| #7 Async/Promise | Yes (pre-existing wrapper, only literals changed) | 2 | Compliant |
| #8 Test quality | Yes | 3 files | Compliant — no mock-type mismatches, no `dist/` imports, no `as any` in assertions |
| #9 Build/config | No config files in diff | 0 | N/A |
| #10 Security/input validation | Pure unit tests, no user input | 0 | N/A |
| #11 Error handling | No error-handling code in diff | 0 | N/A |
| #12 Performance/bundle | Test files only | 0 | N/A |
| #13 Fix-introduced regressions | Yes | 2 (Ship fixture fix, ×4/÷4 factor fix) | Compliant — re-scanned against #1-#12, `tsc --noEmit` clean, full suite green |

**Tenant isolation audit:** N/A — this is a single-player arcade game with no multi-tenant data model; no trait methods or structs in this diff carry tenant-scoped fields.

## Design Deviations

### Reviewer (audit)

- **TEA: "Followed story context over epic context on touching `src/core/sim.ts`"** → ✓ ACCEPTED by Reviewer: spec-authority hierarchy correctly applied (story context outranks epic context); independently confirmed the epic doc (`context-epic-A2.md`) only enumerates A2-1/A2-2 and predates A2-3 through A2-9, several of which (A2-9 itself) already touch `src/core/`. The "no sim changes" guardrail is demonstrably stale, not a live constraint.
- **TEA: "RED-phase tests pass against current code — no failing test produced"** → ✓ ACCEPTED by Reviewer: verified independently via reviewer-test-analyzer's mutation testing (see Rule Compliance / findings below) — the tests are not vacuous, they correctly go red under two distinct reintroductions of the hypothesized bug, and green against current `sim.ts`. TEA's empirical verification (via `git stash` against `develop`) rather than assumption was the right call.
- **Dev: "No source code changes made — confirmed the AC is already satisfied by current behavior"** → ✓ ACCEPTED by Reviewer: Dev's investigation (renderer, wave director, scoring) plus this review's independent mutation-testing confirmation together rule out every destruction path in the codebase. The conclusion is sound given the ACs as written (which specify only two-rock overlap scenarios — see findings below for what remains genuinely untested).

No undocumented deviations found beyond what's already logged — TEA had already flagged the A2-9 build/test breakage in Delivery Findings before this review started.

## Reviewer Assessment

**Verdict:** APPROVED

**Scope:** Test-only diff (3 files, +133/-5), correctly re-scoped against `origin/develop` after discovering local `develop` was stale (missing A2-9/`dd42be8`). No production source changed in this story's own diff.

**Data flow traced:** `overlapping-rocks.test.ts`'s fixtures (`rockAt`/`bulletAt`/`playing`) → `stepGame()` → the bullet-vs-rock collision loop (`sim.ts:313-329`) → asserted `GameState.rocks`/`GameState.bullets`. Safe: every fixture is a fresh literal (zero-velocity, isolated from step-order), `stepGame` never mutates its input (independently re-confirmed by `[TEST]`'s mutation testing showing the loop's `working`/`survivors` arrays are rebuilt, not aliased), and every assertion checks the ACTUAL returned state, not a mock.

**Pattern observed:** New tests correctly mirror the house convention already established in `collision.test.ts` (identical `rockAt`/`bulletAt`/`playing` helpers, `CENTER` constant, `DT = 1/60`) rather than inventing a parallel style — good reuse discipline for a test-only PR.

**Error handling:** N/A — no error-handling code in this diff (pure unit tests, no I/O, no user input).

**Security analysis:** N/A — single-player local-state game, no auth/tenant/network surface in this diff.

**Hard questions:**
- *Null/huge inputs?* `survivor?.pos` and `find()`+`toBeDefined()` (rule-checker item #4) handle the "not found" case defensively rather than crashing — but see the [TEST] finding on the AC-5 test's shared-reference weakness for a related, lower-stakes gap.
- *Race conditions?* N/A, synchronous pure functions only.
- *What did TEA/Dev NOT test?* Three-way overlap and wrap-seam overlap — see [TEST] findings below. Both are non-blocking because the AC as written only specifies two-rock scenarios, but both are plausible real-world triggers given how `splitRock` spawns co-located children.

**Incorporate subagent findings:**
- `[TEST]` 4 findings, all Medium/Low severity, all confirmed (see Delivery Findings and Design Deviations above for full detail): 2 missing edge cases (three-way overlap, wrap-seam overlap — Medium), 1 missing boundary case (exact hitbox-distance — Low), 1 test-design nit (AC-5 shared object references — Low, verified not a live bug).
- `[RULE]` Clean. 22 rule instances checked across all 13 TypeScript lang-review rules, 0 violations.
- Preflight: clean, 696/696 tests, build clean (`tsc --noEmit && vite build`), no code smells.

**Challenge VERIFIEDs against subagent findings:** My own "tests are meaningful regression guards" conclusion (formed independently while reading the diff, before subagents returned) is corroborated, not contradicted, by `[TEST]`'s mutation-testing evidence — no VERIFIED needed downgrading. My initial read of the AC-5 determinism test as unremarkable WAS contradicted by `[TEST]`'s shared-reference observation; downgraded to a logged, non-blocking Improvement finding rather than left silently VERIFIED.

**Challenge VERIFIEDs against project rules:** No project rule in the TypeScript checklist requires independent object construction per test-repeat call (the AC-5 finding is a test-design best-practice observation, not a rule violation) — rule-checker's "clean" verdict and this finding coexist without contradiction.

### Devil's Advocate

Assume this diff is broken. The strongest attack: Dev and TEA concluded "no bug, no fix needed" based on exactly three hand-picked overlap geometries, all well inside hitbox bounds, all with motionless rocks, all with a single stationary or single fast-moving bullet — none of which resembles the actual reported playtest conditions (a live, fast-paced game with drifting rocks, chain splits, and rapid-fire bursts). A confused stakeholder reading "verified correct, no fix needed" could reasonably conclude the bug is fully resolved, when in fact only a narrow slice of the state space was exercised. If the real trigger is (as reviewer-test-analyzer suggests) a three-rock cluster from a fresh chain-split — two co-located children plus a third nearby rock, all still converging when the player's next shot arrives within a frame or two — none of the seven new tests would have caught it, because none constructs more than two rocks. Similarly, if the real trigger involves the toroidal wrap seam (rocks drifting near x=0/WORLD_W, a genuinely common occurrence over a long play session as the seeded RNG scatters rocks across the whole field), the interaction between the single-pass-per-bullet contract and `wrappedDelta`'s seam-folding is untested for overlapping pairs specifically. A malicious framing: this PR could be seen as manufacturing false confidence — closing a real, player-reported bug on the strength of tests engineered to pass, dressed up with extensive documentation that reads as more authoritative than the evidence supports. The mitigating counter-evidence is real, though: mutation testing (an adversarial technique in its own right) proves the existing tests DO catch the specific array-order/continue-omission failure modes the story's technical approach hypothesized, and the code-path audit (renderer, wave director, scoring) rules out every OTHER mechanism by which "one bullet, two dead rocks" could arise in the current codebase — not just the one collision-loop line. The residual risk is narrow and specific (three-way overlap, wrap-seam overlap), not open-ended, and both gaps are now explicitly logged as findings rather than silently absent. That's the difference between "verified within a documented, bounded scope" and "falsely declared fixed" — but it's a fine line, and closing this story should not be read as "the playtest bug definitely cannot recur," only as "it does not recur under the specific mechanism hypothesized, within the geometries tested."

**Handoff:** To SM for finish-story. Recommend the finish-story write-up (or a follow-up story) carry forward: (1) the two Medium edge-case gaps as candidate additional regression tests, (2) the A2-9 "false all-green merge" process question for team visibility, (3) the recommendation to track the actual playtest symptom against A2-8 rather than reopening A2-7.