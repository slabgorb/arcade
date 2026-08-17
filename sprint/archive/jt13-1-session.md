---
story_id: "jt13-1"
jira_key: "jt13-1"
epic: "jt13"
workflow: "tdd"
---
# Story jt13-1: Landed ostrich with centered joystick should zero stored velocity

## Story Details
- **ID:** jt13-1
- **Jira Key:** jt13-1
- **Workflow:** tdd
- **Type:** bug
- **Points:** 3
- **Priority:** p1
- **Repos:** arcade
- **Stack Parent:** none
- **Branch:** fix/jt13-1-landed-ostrich-zero-velocity
- **PR:** 513

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-17T20:16:53Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-17T18:51:45Z | 2026-08-17T18:53:58Z | 2m 13s |
| red | 2026-08-17T18:53:58Z | 2026-08-17T19:31:25Z | 37m 27s |
| green | 2026-08-17T19:31:25Z | 2026-08-17T19:40:57Z | 9m 32s |
| review | 2026-08-17T19:40:57Z | 2026-08-17T19:55:38Z | 14m 41s |
| green | 2026-08-17T19:55:38Z | 2026-08-17T20:05:45Z | 10m 7s |
| review | 2026-08-17T20:05:45Z | 2026-08-17T20:16:53Z | 11m 8s |
| finish | 2026-08-17T20:16:53Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Conflict** (non-blocking): jt13-1 deliberately overrides jt11-3's ROM-faithful momentum model. The current "landed mount keeps its velocity when neutral" behaviour is the ROM ground table's `onZero` self-loop (`GROUND_STATES`, `JOUSTRV4.SRC:7165-7168`), pinned on purpose by jt11-3. Affects `plugins/joust/src/core/flight.ts` (and likely `frame.ts` for the coast counter) — neutral input must now skid velocity to 0. Resolved by the owner's 2026-08-17 ruling (they own the design + have played the cabinet); recorded so Reviewer does not read the override as a fidelity regression. *Found by TEA during test design.*
- **Improvement** (non-blocking): the 1-frame grace requires per-frame memory ("consecutive neutral frames"), which must live on the **process** (like `facing`/`prevFlapHeld`), not the shared generated `EntityState`. Affects `plugins/joust/src/core/frame.ts` (`Process`/`ProcessSpec`) and `sim.ts`'s `SimProcess` mirror. *Found by TEA during test design.*
- **Question** (non-blocking, RESOLVED): whether centered-release should stop instantly or gradually, and whether instant-flip is in scope — both settled with the owner (skid over a few frames; instant-flip IN scope). No open question remains. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): the decel is velocity-only — during the ~4 skid frames the mount stays put (`posX += delta × dir`, and `dir === 0`) while cycling the RUNR animation, then stands (PLYBR/STANDR). The infinite run-in-place and the launch fling are gone, but there is a brief in-place run while the speed ramps down. Making the bird physically SLIDE forward as it skids (apply the rung delta along `facing` while neutral) is a small follow-up if the owner wants it; no current test requires it. Affects `plugins/joust/src/core/flight.ts` (`stepGround` delta). *Found by Dev during implementation.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Story requires overriding a sibling story's pinned ROM behaviour (jt11-3)**
  - Spec source: context-story-jt13-1.md AC-1/AC-3; sibling `plugins/joust/tests/ground-momentum.test.ts` (jt11-3)
  - Spec text: jt13-1 — "landing with no directional input zeroes stored horizontal velocity"; jt11-3 — "centering holds the running rung; touch-and-go keeps momentum" (ROM `onZero` self-loop, `JOUSTRV4.SRC:7165-7168`)
  - Implementation: New tests assert sustained neutral SKIDS `velXIndex` to 0 with a 1-frame grace. Because jt11-3's tests only ever take a single neutral step (the grace region) or reverse-skids, they stay GREEN under the current code and remain valid under the fix — so NO jt11-3 test was rewritten despite the owner authorising it. jt11-3's touch-and-go test now doubles as the guard forcing the grace.
  - Rationale: The grace model reconciles both stories, so deleting/rewriting jt11-3's ROM-cited assertions is unnecessary churn; the minimum-change path preserves its citations.
  - Severity: minor
  - Forward impact: If Dev implements decay WITHOUT the 1-frame grace, jt11-3's touch-and-go test goes red — that is the intended signal, not a regression to suppress. Reviewer: treat a red jt11-3 touch-and-go as "grace missing," not "restore the self-loop."

### Dev (implementation)
- **Skid decelerates velocity but does not slide the mount laterally**
  - Spec source: context-story-jt13-1.md ⚠ REFINED SPEC item 1; owner ruling "skid to 0 over a few frames"
  - Spec text: "sustained neutral coasts `velXIndex` to 0 within a few frames … no infinite run-in-place"
  - Implementation: `stepGround` sheds one FRCONV rung per frame after the grace (velXIndex 8→6→4→2→0); `posX` is unchanged during those frames because the ground delta is gated by `input.dir` (0 when neutral). The bird decelerates in place, then stands.
  - Rationale: The RED tests pin `velXIndex → 0` and no launch-fling, not lateral travel; the minimal change that makes them green leaves the existing `posX = state.posX + delta × input.dir` untouched, avoiding disturbance to every other locomotion/position assertion.
  - Severity: minor
  - Forward impact: A few frames of run-animation-without-travel remain during the skid (vs a physical slide). Filed as a non-blocking Delivery Finding for the owner to rule on; trivial follow-up if a slide is wanted.

### Reviewer (audit)
- **TEA jt11-3-override deviation** → ✓ ACCEPTED: the grace model genuinely leaves jt11-3 green (rule-checker ran 34/34 jt11-3+jt1-6; every jt11-3 `dir===0` call is single-step or a reverse loop, never reaching the new decel). The claim holds.
- **Dev velocity-only-skid deviation** → ✓ ACCEPTED: pinned by the RED tests (velXIndex→0, no fling), not lateral travel; the owner already has a non-blocking finding to rule on a physical slide. Sound.
- **UNDOCUMENTED divergence (Reviewer-found):** the diff inserted `neutralNextId` between `stepGround`'s pre-existing docstring and its declaration, orphaning the doc onto the helper and leaving `stepGround` undocumented. Not a spec deviation but a self-introduced doc defect — filed as finding [DOC]/F3, Severity: Medium.

## SM Assessment

**Setup complete — routing to TEA (Tyr One-Handed) for RED.**

**Board pre-flight (all clean):**
- Sibling branch probe: no `jt13` branch on origin. Session sweep: siblings hold ml12-3 (a-2) and df4-5 (a-3) — neither touches jt13. No local session existed. Uncontested.
- Merge gate: zero open PRs on slabgorb/arcade.
- Repo is gitflow — branch `fix/jt13-1-landed-ostrich-zero-velocity` cut from `develop`; claim committed + pushed so the branch is visible to sibling probes; story stamped `in_progress`.

**Premise verified LIVE (not stale):** The description's claim — a landed ostrich with a centered joystick keeps its stored horizontal velocity — matches current code. `plugins/joust/src/core/flight.ts:454-476` seeds PVELX from the incoming FLYVEL on landing (FRCONV) and nothing clears it when the stick is centered. No stale numbers or already-applied fix. The description was copied forward as current fact.

**Scope for TEA/Dev:**
- Fix lives in `plugins/joust/src/core/` (pure sim — core/shell boundary applies). Primary seam: `flight.ts` landing/FRCONV; secondary: `arena.ts land()`.
- ACs were DERIVED (epic YAML carried none): landing with centered joystick → PVELX = 0; no in-place run; no full-speed launch off residual velocity.
- **Regression guard is load-bearing:** landing WITH directional input must still preserve the intended directional velocity. The fix must key on center-detection, not zero unconditionally. TEA: write that guard alongside the RED test so Dev cannot pass by nuking all landing velocity.

**Related epic context (not this story):** jt13-5 also clears PVELX but in the lava-death path — different mechanism, don't conflate.

## TEA Assessment

**Tests Required:** Yes
**Reason:** Behavioural gameplay bug in the pure sim; the spec is testable at the frame/process level.

**Test Files:**
- `plugins/joust/tests/ground-release-decel-jt13-1.test.ts` — release-skids-to-zero, no-launch-fling, and the grace / held-direction / instant-flip guards.

**Tests Written:** 9 tests (5 failing RED, 4 passing guards) across the 4 refined ACs.
**Status:** RED (failing — ready for Dev)

**What the RED proves (verified by running the full joust project):** on the current tree a running mount held NEUTRAL keeps `velXIndex = ±8` for 24+ frames (the ROM `onZero` self-loop) and a from-rest flap is impossible, so the launch flings ~24px. The 5 failing tests are exactly those two facts; the 4 guards (grace holds the rung 1 frame, held-direction keeps running, instant-flip re-signs, and the held-launch CONTROL that travels >4px) pass today and pin the behaviour the fix must preserve.

**Owner rulings incorporated (2026-08-17):** verified the bug from the owner's screen recording of the live build; input is BUTTONS (neutral = no L/R held). Rulings: (1) neutral SKIDS velocity to 0 over a few frames; (2) 1-frame GRACE before decay preserves touch-and-go; (3) instant-flip IS in scope. This overrides jt11-3's ROM self-loop — see Delivery Findings + Design Deviations. The refined spec is prepended to `context-story-jt13-1.md` as a ⚠ block.

### Rule Coverage

| Rule / invariant | Test(s) | Status |
|------|---------|--------|
| Core stays pure (no DOM/clock/random) | fix adds no such deps; existing `purity`/`sim-clock-free` guards cover | n/a (unchanged) |
| No negative-zero in `velXIndex` (jt11-3 trap) | `.toBe(0)` (Object.is) in the skid-to-rest tests rejects `-0` | passing guard |
| velocity only while a direction is held | `release skids … to zero` (×4) | **failing (RED)** |
| no launch fling from rest | `no horizontal fling` + `CONTROL … DOES travel` | **failing (RED)** / control passing |
| touch-and-go grace preserved | `GRACE: one centered frame HOLDS the rung`; jt11-3 `ground-momentum` | passing guard |
| instant flip preserved (in scope) | `INSTANT FLIP … within 2 frames` | passing guard |

**Rules checked:** applicable joust invariants (core purity, no-−0, momentum-only-while-held, grace, instant-flip) all have test coverage; the lang-review type-design rules (validated constructors, non_exhaustive, tenant context, etc.) do not apply to a pure behavioural fix.
**Self-check:** 0 vacuous tests — every assertion checks a concrete value, and the fling test is discriminated by an explicit CONTROL case.

**Handoff:** To Dev (Loki Silvertongue) for implementation. Make the 5 RED tests pass WITHOUT reddening the existing suite (jt11-3 `ground-momentum` + `ground-locomotion` must stay green — a red jt11-3 touch-and-go means the grace is missing, per the Design Deviation). Coast memory goes on the process, not `EntityState`. Full-cabinet green required (vitest + orchestrator + lint).

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/joust/src/core/flight.ts` — `stepGround` gains an optional 4th arg `coast` (default 0) + a `neutralNextId(current, coast)` helper. On sustained neutral (`coast >= 1`) a run rung sheds one FRCONV step per frame (PLYFR→PLYER→PLYDR→PLYCR→PLYBR); `coast === 0` returns the untouched `onZero`, so every legacy 2-/3-arg caller and jt11-3's single-step tests are byte-identical.
- `plugins/joust/src/core/frame.ts` — `stepPlayerEntity` threads `coast` into `stepGround`; the process step reads `p.coast`, and computes `nextCoast = airborne || dir !== 0 || wasAirborne ? 0 : coast + 1` (airborne/steering/just-landed reset the grace; sustained grounded-neutral counts up). New `ProcessSpec.coast?` field, homed on the process like `facing`/`prevFlapHeld`.
- `plugins/joust/src/core/sim.ts` — mirrored `SimProcess.coast?` so it rides the `stepSim`→`stepFrame` round-trip.

**Design summary:** the fix is the owner's deliberate override of jt11-3's ROM `onZero` self-loop. The 1-frame grace (coast 0) is what keeps jt11-3 green untouched — its touch-and-go test now enforces the grace. The decel is velocity-only (no lateral slide) — logged as a non-blocking finding/deviation for the owner.

**Tests:** jt13-1 file 9/9 GREEN. Full cabinet GREEN:
- joust project: 3699/3699
- full vitest (all apps): 17140 passed, 1 todo, 0 fail
- orchestrator: 505/505
- lint (`tsc --noEmit`, repo-wide): clean

**Branch:** `fix/jt13-1-landed-ostrich-zero-velocity` (pushed)

**Handoff:** To Reviewer (Heimdall) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 (11/11 jt13-1, joust 3701/3701, orchestrator 505/505, lint clean, 0 smells) | confirmed 0 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | clean | 0 blocking (all 4 round-1 fixes mutation-confirmed genuine; 2 non-blocking low notes) | fixes closed |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 (F3/F4 verified fixed; 2 NEW comment nits — both corrected in 9364eb3f) | confirmed + fixed |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | 0 (30 rules, 0 violations; rule #15 confirmed fixed) | confirmed clean |

**All received: Yes** (round 2 — 4 enabled returned; 5 disabled Skipped).

**Reviewer's own round-2 mutation re-verification:** Mut A (grace `coast<1`→`coast<2`) now FAILS the exact-ladder test; Mut B (drop `|| wasAirborne`) now FAILS the touch-and-go test. Both previously-surviving mutants are killed — independently reproduced by test-analyzer and rule-checker. Both reverted; core clean vs HEAD.

**Shared-tree race noted & cleared:** test-analyzer observed a transient untracked `zzdebug-jt13.test.ts` (concurrent-checkout race — the documented hazard); it self-cleared. Final `git status` shows no stray files, core == HEAD, suite 11/11.

## Reviewer Assessment

**Verdict:** APPROVED (round 2)

**Round-1 → round-2 resolution — all findings closed and mutation-verified:**
- [DOC] F3 — `stepGround` docstring restored above its declaration + `coast` param documented (comment-analyzer verified ordering).
- [TEST] F1 — new full-pipeline touch-and-go-after-landing test; the drop-`wasAirborne` mutant now reddens (test-analyzer + rule-checker + my own run all reproduced `expected 6 to be 8`).
- [TEST] F2/F5 — exact FRCONV ladder `[8,6,4,2,0,0]` pinned + bound tightened `<= 5`; the 2-frame-grace and 2-rung-skip mutants now redden (rule #15 satisfied).
- [TEST] F6 — left-facing no-fling mirror added (distinct negation/sign path).
- [TEST] F7 / [DOC] F4 — instant-flip scope note + `stepPlayerEntity` "unchanged" claim scoped to the jt1-6 migration; the F4 claim was independently verified TRUE against the jt1-5 replay fixture (airborne-always → coast forced 0).
- Two round-2 comment nits (landing frame count; literal-5 ceiling) found by comment-analyzer, corrected in `9364eb3f`.

**Specialist coverage (round 2):** [TEST] fixes genuine, no new issues. [DOC] F3/F4 fixed, 2 nits corrected. [RULE] 30 rules / 0 violations. [EDGE] [SILENT] [TYPE] [SIMPLE] disabled; [SEC] disabled — n/a (internal sim state, no external input). [SIMPLE] manual pass: the change stays minimal (one helper, one param, one mirrored field).

**Runtime correctness:** unchanged since round 1 and re-affirmed — no Critical/High. `?? 0` correct for falsy-but-valid 0, no −0, core/shell purity intact, `FRCONV[rung-1]` index-safe (guarded by `rung > 0`), `coast` survives serialization spreads.

**Non-blocking notes carried to the record (NOT defects, none block the merge):** the ~4-frame stationary skid (Dev's filed finding — owner to rule on a physical slide); unbounded `coast` growth while standing (harmless JS integer, never re-enters decel); partial-rung touch-and-go untested (owner ruling is scoped to the full-speed immediate-flap case).

**Handoff:** To SM (Baldur the Bright) for finish-story.

---

## Subagent Results — Round 1 (history)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 (all gates green; joust 3699/3699, orchestrator 505/505, lint clean, 0 smells) | confirmed 0 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 5 | confirmed 3 (F1,F2,F5→dupes), 2 low noted (F6,F7) |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 | confirmed 1 (F3), 1 low (F4) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed 1 (F5, rule #15); 29 rules clean |

**All received: Yes** (4 enabled returned; 5 disabled pre-filled as Skipped).

**Reviewer's own mutation battery (independent backstop, 5 specialists disabled):**
- Mut A: grace `coast < 1` → `coast < 2` — **SURVIVED** all 9 (grace width unpinned → F2).
- Mut B: drop `|| wasAirborne` from `nextCoast` — **SURVIVED** all 34 incl. jt11-3 (touch-and-go-after-landing untested → F1). Independently reproduced by test-analyzer across the full 3699-test suite.
- Both reverted; tree clean (`git diff` empty on core files).

### Devil's Advocate

Assume this is broken. Where would it bite? (1) **The `wasAirborne` grace is a ghost.** Two independent mutations prove no test exercises the landing-frame reset. A future "simplifier" deletes `|| wasAirborne` as redundant, the suite stays green, and every real touch-and-go silently launches one rung slower — the exact flap-hop feel the owner filed this story to protect, regressed invisibly. That is the single most likely future break, and nothing guards it. (2) **Unbounded coast.** A bird standing still forever increments `coast` every frame with no cap; over a long attract/idle it grows without bound. Harmless as a JS number and it never re-enters the decel branch (PLYBR has FRCONV index 0 → `onZero`), but it is unnecessary state growth and it now rides in every serialized player process as an ever-changing integer — any future snapshot/replay fixture that captures the whole process (not just `.entity`) would see churn. The green suite says none does today; a new one could. (3) **The stationary skid still "runs in place" for ~4 frames** — the very symptom the owner reported, now finite instead of infinite. Correct per the tests, but a confused owner re-watching could reasonably say "it STILL runs in place briefly." Dev filed it; the owner must actually rule. (4) **Enemies share `stepGround`.** If any enemy caller were ever upgraded to pass a non-zero `coast`, the decel would silently apply to buzzards — but grep confirms only frame.ts's player path threads it, and enemies stay on the 3-arg overload (coast 0). Safe today, fragile to a careless future 4th-arg add. (5) **`FRCONV[rung-1]`** looks like an index-OOB risk, but it is guarded by `rung > 0` and fuzzed clean by rule-checker. No throw. Net: the runtime is correct; the danger is entirely in what the tests DON'T pin.

## Reviewer Assessment — Round 1 (REJECTED → resolved in Round 2)

**Verdict:** REJECTED (round 1 — test-hardening + a self-introduced doc defect; runtime behaviour is correct)

**Specialist coverage:** [TEST] test-analyzer — findings (F1/F2/F5/F6/F7). [DOC] comment-analyzer — findings (F3/F4). [RULE] rule-checker — 1 finding (F5), 29 rules clean, core-purity/determinism/no-−0/index-safety all empirically verified. [EDGE] disabled. [SILENT] disabled. [TYPE] disabled. [SEC] disabled — n/a (internal sim state, no external input). [SIMPLE] disabled — I ran a manual simplicity pass: the change is minimal (one helper, one param, one field ×2 mirrors); no over-engineering.

**Runtime correctness:** VERIFIED correct by 4 specialists + my mutation battery + full cabinet green (17140/0). No Critical/High. `neutralNextId` coherent (skid states also reach rest via their existing `onZero` chain); `coast=0` default preserves every legacy caller and all enemies; `?? 0` correct for the falsy-but-valid 0; no −0; core/shell boundary intact.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM] | F3 — `stepGround`'s pre-existing docstring is orphaned onto the new `neutralNextId` helper; `stepGround` left undocumented (defect introduced by THIS diff) | `flight.ts:347-373` | Move the "One frame of ground movement…" docstring back to directly above `export function stepGround(`; `neutralNextId` keeps its own doc. |
| [MEDIUM] | F1 — the `wasAirborne` landing-grace branch (owner-ruled touch-and-go: immediate next-frame flap after a REAL landing keeps momentum) is untested; mutation-confirmed 2× | `frame.ts:419-420` / new test file | Add a full-pipeline test: an airborne player lands via `stepSim` this frame, then one `{dir:0,flap:true}` frame → assert `velXIndex` == the landed rung's full flyVel (kills the drop-`wasAirborne` mutant). |
| [LOW] | F2/F5 — decel ladder shape unpinned + `zeroBy <= 20` is 5× looser than the measured 4 (a 2-rung-skip or slowed decel ships green) | test file `:267-280` | Pin the exact trail `[8,6,4,2,0,…]` for one direction and tighten the bound (e.g. `<= FRCONV.length`). |
| [LOW] | F6 — no left-facing no-fling mirror (a left-only launch-sign bug would pass) | test file `:302-337` | Add a mirrored left-facing case to the no-fling block. |
| [LOW] | F7/F4 — instant-flip test guards PRE-EXISTING routing (its "(in scope)" label overstates); `stepPlayerEntity` "unchanged/bit-for-bit" docstring now looser | test `:367`, `frame.ts:279` | Note the instant-flip test guards pre-existing flip routing against coast-collateral; scope the "unchanged" claim to the jt1-6 migration. |

**Note on severity vs blocking:** no finding is Critical/High, so none is a hard PR blocker. I am nonetheless rejecting round 1 because F3 is a documentation defect introduced by this very diff (should not ship) and F1 leaves the owner's explicit touch-and-go ruling with zero regression coverage — both are cheap and directly harden what the owner cares about. F2/F5/F6/F7/F4 are optional polish to fold in while the file is open.

**Handoff:** Back to Dev (Loki Silvertongue) for fixes — F3 + F1 required, the rest recommended. Re-review (round 2) after.
## Dev Assessment — Round 2 (rework)

**Rework of Heimdall's round-1 findings — all addressed.**

| Finding | Action |
|---------|--------|
| F3 [DOC] stepGround docstring orphaned | Moved the "One frame of ground movement…" docstring back above `stepGround`; documented the new `coast` param there. `neutralNextId` keeps its own doc. |
| F1 [TEST] wasAirborne touch-and-go untested | Added section 4: a real airborne→CLIF5 landing via `stepSim`, then an immediate-next-frame flap → asserts launch at the landed rung (8). Kills the drop-`wasAirborne` mutant (verified: launch decays to 6 → RED). |
| F2/F5 [TEST] decel ladder + loose bound | "decel is a SKID" now pins the exact FRCONV trail `[8,6,4,2,0,0]` and tightens `zeroBy <= 5`. Kills the 2-frame-grace / 2-rung-skip mutants (verified RED). |
| F6 [TEST] no left-facing no-fling mirror | Added a left-facing no-fling case mirroring section 1. |
| F7 [TEST] instant-flip label overstates | Added a scope note: it guards PRE-EXISTING flip routing against coast collateral, not new coast logic. |
| F4 [DOC] stepPlayerEntity "unchanged" stale | Scoped the "verbatim/bit-for-bit" claim to the jt1-6 migration; noted jt13-1's `coast` addition. |
| F8 (nit) section-2 `describe` async | Dropped the needless `async`. |

**Mutation re-verification:** both previously-surviving mutants now redden — Mut A (grace `coast<1`→`coast<2`) fails the exact-ladder assertion; Mut B (drop `|| wasAirborne`) fails the touch-and-go test. Both reverted.

**Process note:** the round-1 mutation `git checkout` wiped my uncommitted F3/F4 doc edits (the known "mutation-battery + checkout wipes uncommitted fixes" trap); re-applied and committed immediately. Separately, pf had rebased this branch onto the advanced `origin/develop` (a sibling's df4-5 merge), so the branch was force-pushed with lease to sync — `develop` is an ancestor of HEAD, tree verified green post-rebase.

**Tests:** jt13-1 file 11/11. Full cabinet GREEN: joust 3701/3701, all-apps vitest 17177 passed / 1 todo / 0 fail, orchestrator 505/505, lint clean.

**Branch:** `fix/jt13-1-landed-ostrich-zero-velocity` (rebased on develop, force-pushed).

**Handoff:** Back to Reviewer (Heimdall) for round 2.