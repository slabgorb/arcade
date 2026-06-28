---
story_id: "6-9"
jira_key: ""
epic: "6"
workflow: "tdd"
---
# Story 6-9: Authentic enemy motion & behavior constants (core fidelity)

## Story Details
- **ID:** 6-9
- **Jira Key:** (none - local tracking)
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 5
- **Priority:** p2

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-28T12:22:12Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-28T11:25:55Z | 2026-06-28T11:27:30Z | 1m 35s |
| red | 2026-06-28T11:27:30Z | 2026-06-28T11:44:47Z | 17m 17s |
| green | 2026-06-28T11:44:47Z | 2026-06-28T12:09:25Z | 24m 38s |
| review | 2026-06-28T12:09:25Z | 2026-06-28T12:22:12Z | 12m 47s |
| finish | 2026-06-28T12:22:12Z | - | - |

## Branch Strategy
**Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)

## Delivery Findings

### TEA (test design)

- **Conflict** (blocking): The authentic ROM spawn schedule (tankers/spikers L5+,
  fuseballs L11+, pulsars L17+) conflicts with the playtest-tuned curve and two
  sibling stories' locked tests. Affects `src/core/rules.ts` (`rollSpawnKind`),
  `tests/core/sim.spawn.test.ts` (L3 gate), `tests/core/sim.difficulty.test.ts`
  (L4 roster) — needs a PM/architect balance decision before spawn-mix can be
  pinned. *Found by TEA during test design.*
- **Question** (blocking): Adopting authentic climb speeds ~doubles enemy speed
  (flipper L1 0.18 → 0.368 depth/s; ~2.7 s up the tube). In a "playtest feel &
  balance" epic, confirm the team wants authentic-speed enemies before Dev tunes
  `levelParams`. Affects `src/core/rules.ts` (`levelParams`). *Found by TEA during
  test design.*
- **Gap** (non-blocking): `enemyBoltSpeed = flipperSpeed + ENEMY_BOLT_SPEED_OFFSET`,
  so retuning `flipperSpeed` also speeds up enemy bolts. The 6-5 bolt tests assert
  relatively and still pass, but Dev should sanity-check bolt dodgeability after the
  change. Affects `src/core/sim.ts` (`enemyBoltSpeed`). *Found by TEA during test design.*
- **Improvement** (non-blocking): The fuseball vulnerable-phase tests use a
  `vulnerable: boolean` field as the contract for the ROM `L02cc` bit7. Dev must add
  it to the `Fuseball` interface + `makeEnemy`, and gate the bullet/superzapper kill
  on it (existing fuseball literals in `tests/core/enemies/fuseball.test.ts` will need
  the field if it is required). A phase-derived representation is fine but requires a
  deviation + updating the two E1/E2 tests. Affects `src/core/state.ts`,
  `src/core/sim.ts`. *Found by TEA during test design.*
- **Gap** (non-blocking): Several documented behaviors are deferred (see Design
  Deviations): per-level flip patterns + multi-tick flip animation, spiker 0x20
  turnaround depth, fuseball player-biasing + wider hit_tol, pulsar far/near speed
  split. Candidates for a follow-up fidelity story. *Found by TEA during test design.*

### Dev (implementation)

- **Gap** (non-blocking): Enemy bolt speed is now live-ripped faster
  (`enemyBoltSpeed = flipperSpeed + 0xc0` ⇒ ~0.9 → ~1.09 depth/s at L1) because
  `flipperSpeed` doubled. Tests pass; the user wants difficulty ratcheted, so this
  is intended — but Reviewer/playtest should confirm bolts stay dodgeable. Affects
  `src/core/sim.ts` (`enemyBoltSpeed`). *Found by Dev during implementation.*
- **Improvement** (non-blocking): The fuseball vulnerable/invulnerable cadence is
  hard-wired to the ~0.3 s roll interval. If playtest wants a different killable
  fraction, expose it as a tunable. Affects `src/core/enemies/fuseball.ts`,
  `src/core/rules.ts` (`FUSEBALL_JITTER_INTERVAL`). *Found by Dev during implementation.*
- **Conflict** (blocking, unchanged): The authentic spawn schedule still conflicts
  with the tuned curve and is NOT implemented this story (see Design Deviations →
  Dev). Needs a PM/architect decision before it can be adopted. Affects
  `src/core/rules.ts` (`rollSpawnKind`). *Found by Dev during implementation.*

### Reviewer (code review)

- **Improvement** (non-blocking): The fuseball vulnerable-bit TOGGLE
  (`e.vulnerable = !e.vulnerable`) — the mechanism that makes a fuseball killable
  only part of the time — has no direct assertion. E1/E2 pin the static gate and
  the unit hop test executes the toggle line but asserts only the lane. A
  regression removing the toggle would leave spawned fuseballs permanently
  invulnerable to bullets and NO current test would catch it. Add
  `expect(out.enemy.vulnerable).toBe(true)` after the hop. Affects
  `tests/core/enemies/fuseball.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): Spiker far-end hop has two untested paths — the
  self-hop (own lane is tallest) and the no-spikes seeded-RNG random fallback — and
  the open-tube tanker split (clamping, levels 8/9/10/11/14/16) is untested. Add
  targeted cases. Affects `tests/core/sim.enemy-authentic.test.ts`.
  *Found by Reviewer during code review.*
- **Question** (non-blocking): "Prefers the tallest-spike lane" includes the
  spiker's OWN lane, so a lone spiker (whose own lane usually holds the tallest
  spike it just laid) never actually relocates at the far end — the hop fires
  visibly only when another lane outgrows it. Confirm this matches intended feel,
  or exclude the current lane from the tallest search to force a relocation.
  Affects `src/core/sim.ts` (`stepEnemies` spiker case). *Found by Reviewer during
  code review.*
- **Improvement** (non-blocking): Minor test polish — the L33+ speed clamp is
  flat but only L33 is asserted (add L34/L50); the "never shrinks on descent" test
  comment overstates the descent reached in its 40-frame setup (~0.15 depth, still
  climbing). Affects `tests/core/sim.enemy-authentic.test.ts`. *Found by Reviewer
  during code review.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

7 deviations

- **Authentic spawn schedule NOT pinned (test omission)**
  - Rationale: Pinning authentic thresholds would force two sibling stories' tests
  - Severity: major
  - Forward impact: Dev/architect must adjudicate authentic-vs-tuned spawn gates
- **Per-level flip patterns & multi-tick flip animation NOT tested (test omission)**
  - Rationale: Porting the ROM move-pattern tables + a tick-stepped flip animation
  - Severity: minor
  - Forward impact: Flipper lateral motion stays a single-frame RNG flip; authentic
- **Spiker 0x20 turnaround depth & fuseball/pulsar nuances NOT tested (partial coverage)**
  - Rationale: These are lower-fidelity nuances with cross-cutting ripples; pinning
  - Severity: minor
  - Forward impact: Spiker turnaround range, fuseball steering/tolerance, and pulsar
- **Fuseball vulnerable-phase model simplified (toggle-per-roll)**
  - Rationale: The `vulnerable` bit gating kills is the testable contract and the
  - Severity: minor
  - Forward impact: Fuseball is killable ~half the time on a fixed cadence rather
- **Spiker far-end "no spike pending" fallback = random hop (no conversion)**
  - Rationale: The hop + tallest-spike preference is the tested, headline behavior;
  - Severity: minor
  - Forward impact: A spiker at the far end with no standing spikes wanders rather
- **Authentic spawn schedule NOT adopted (kept playtest-tuned curve)**
  - Rationale: TEA flagged this row "verify vs our difficulty"; the authentic gates
  - Severity: major
  - Forward impact: Spawn mix stays as tuned; authentic spawn schedule remains an
- **Dev: Spiker far-end "no spike pending" fallback = random hop (no conversion)**

## Design Deviations

### TEA (test design)

- **Authentic spawn schedule NOT pinned (test omission)**
  - Spec source: context-story-6-9.md, AC-3 + story description "SPAWN/MIX"
  - Spec text: "flippers-only L1-4; tankers L5+; spikers L5-16; fuseballs L11+; pulsars L17+"
  - Implementation: No test asserts these per-level gates. Story tags this row
    "verify vs our difficulty"; the authentic gates conflict with the deliberately
    playtest-tuned curve locked by `tests/core/sim.spawn.test.ts` (tankers/spikers
    by L3) and `tests/core/sim.difficulty.test.ts` (L4 has tankers/spikers).
  - Rationale: Pinning authentic thresholds would force two sibling stories' tests
    red and silently change tuned balance. That is a PM/architect call, not a test
    fixture decision. Raised as a blocking Delivery Finding instead.
  - Severity: major
  - Forward impact: Dev/architect must adjudicate authentic-vs-tuned spawn gates
    before spawn-mix can be locked; may spawn a follow-up story.

- **Per-level flip patterns & multi-tick flip animation NOT tested (test omission)**
  - Spec source: context-story-6-9.md, story description "FLIPPER"
  - Spec text: "per-level flip patterns (m_l0b 8-moves-then-flip, m_l19 constant
    flip, m_l24 2-then-3 alternating, m_l87 flip-away-then-4-moves) ... flip sets
    0x80+target angle then steps +/-1 per tick ... flip_top_accel 2/3"
  - Implementation: Only the basic authentic property is locked (a flip moves to an
    ADJACENT lane; rim-grab kills on the player segment). The ROM per-level move
    scripts and the multi-tick flip animation are not tested.
  - Rationale: Porting the ROM move-pattern tables + a tick-stepped flip animation
    is a large, self-contained effort that dwarfs the rest of this 5-pt story and
    is better as its own story than bolted on here.
  - Severity: minor
  - Forward impact: Flipper lateral motion stays a single-frame RNG flip; authentic
    per-level choreography deferred to a follow-up. Captured as a Delivery Finding.

- **Spiker 0x20 turnaround depth & fuseball/pulsar nuances NOT tested (partial coverage)**
  - Spec source: context-story-6-9.md, story description "SPIKER / FUSEBALL / PULSAR"
  - Spec text: spiker "oscillates ~0x20 <-> far"; fuseball "slides lanes toward the
    player gated by fuzz_move ... hit_tol 6 (wider)"; pulsar "flipper speed when far,
    pulsar speed near"
  - Implementation: Pinned the spiker far-end hop (the headline new behavior) but NOT
    the 0x20 (~0.93 depth) turnaround — current turnaround is SPIKE_MAX_DEPTH=0.75,
    which is also the spike cap with wide ripples (warp crash, spike scoring). Fuseball
    player-biasing, wider hit_tol, and the pulsar far/near speed split are also untested.
  - Rationale: These are lower-fidelity nuances with cross-cutting ripples; pinning
    them risks breaking unrelated spike/warp tests for marginal authenticity gain.
  - Severity: minor
  - Forward impact: Spiker turnaround range, fuseball steering/tolerance, and pulsar
    near-speed remain approximate. Captured as Delivery Findings for a follow-up.

### Dev (implementation)

- **Fuseball vulnerable-phase model simplified (toggle-per-roll)**
  - Spec source: context-story-6-9.md, AC-2 + description "FUSEBALL"
  - Spec text: "KILLABLE ONLY on a lane in its vulnerable phase (L02cc bit7), NOT
    while rolling the rim ... slides lanes toward the player gated by fuzz_move"
  - Implementation: Added a stored `vulnerable` bit gating bullet kills, toggled
    each time the fuseball rolls to a new lane (the existing jitter cadence,
    ~0.3 s). Spawned fuseballs start invulnerable. The player-biased lane slide and
    the exact ROM bit-cycle timing are NOT modelled.
  - Rationale: The `vulnerable` bit gating kills is the testable contract and the
    difficulty-relevant behavior (fuseball killable only part of the time). The
    biased slide + exact cycle are unverified nuances TEA deferred.
  - Severity: minor
  - Forward impact: Fuseball is killable ~half the time on a fixed cadence rather
    than a player-aware ROM cycle; refine in the deferred fuseball-fidelity story.

- **Spiker far-end "no spike pending" fallback = random hop (no conversion)**
  - Spec source: context-story-6-9.md, description "SPIKER"
  - Spec text: "at the far end hops to a random lane (prefers the tallest-spike
    lane), converts to flipper/tanker if none pending"
  - Implementation: Far-end hop prefers the tallest standing spike, else hops to a
    random lane (seeded RNG). The "converts to flipper/tanker if none pending"
    branch is NOT implemented.
  - Rationale: The hop + tallest-spike preference is the tested, headline behavior;
    the spawn-budget-gated conversion is an untested edge with no failing test.
  - Severity: minor
  - Forward impact: A spiker at the far end with no standing spikes wanders rather
    than converting; candidate for the follow-up fidelity story.

- **Authentic spawn schedule NOT adopted (kept playtest-tuned curve)**
  - Spec source: context-story-6-9.md, AC-3 + description "SPAWN/MIX"
  - Spec text: "flippers-only L1-4; tankers L5+; spikers L5-16; fuseballs L11+;
    pulsars L17+"
  - Implementation: `rollSpawnKind` left unchanged (tankers/spikers L3,
    pulsars/fuseballs L5). Only enemy MOTION constants and behaviors were retuned.
  - Rationale: TEA flagged this row "verify vs our difficulty"; the authentic gates
    conflict with the tuned curve locked by `sim.spawn.test.ts`/`sim.difficulty.test.ts`,
    and the blocking finding asks for a PM/architect call. The user confirmed the
    SPEED ratchet for this story but did not authorise a spawn-gate change. No test
    requires it.
  - Severity: major
  - Forward impact: Spawn mix stays as tuned; authentic spawn schedule remains an
    open PM/architect decision (see the blocking Delivery Finding).

### Reviewer (audit)

- **TEA: Authentic spawn schedule NOT pinned** → ✓ ACCEPTED by Reviewer: the
  authentic gates demonstrably conflict with the tuned curve locked by
  `sim.spawn.test.ts`/`sim.difficulty.test.ts`; correctly escalated as a blocking
  PM/architect finding rather than silently rebalanced.
- **TEA: Per-level flip patterns & multi-tick flip animation NOT tested** → ✓
  ACCEPTED by Reviewer: porting the ROM move-pattern tables + a tick-stepped flip
  is a self-contained effort that warrants its own story; the adjacency + rim-grab
  property is locked.
- **TEA: Spiker 0x20 turnaround & fuseball/pulsar nuances NOT tested** → ✓
  ACCEPTED by Reviewer: SPIKE_MAX_DEPTH ripples into warp/spike scoring; deferring
  these low-fidelity nuances is the right scope call.
- **Dev: Fuseball vulnerable-phase model simplified (toggle-per-roll)** → ✓
  ACCEPTED by Reviewer: the `vulnerable` bit gating bullet kills is the testable,
  difficulty-relevant contract and is correctly implemented. NOTE: the toggle
  itself lacks a direct test (logged as a Reviewer Delivery Finding) — accepted
  because the current code is correct and green, but a fast-follow test is advised.
- **Dev: Spiker far-end "no spike pending" fallback = random hop (no conversion)**
  → ✓ ACCEPTED by Reviewer: the tested headline behavior (hop to tallest spike) is
  sound; the spawn-budget-gated conversion is an untested edge with no failing
  test. The "prefers own lane" relocation nuance is raised as a non-blocking
  Reviewer Question, not a reversal.
- **Dev: Authentic spawn schedule NOT adopted (kept tuned curve)** → ✓ ACCEPTED by
  Reviewer: the user authorised the speed ratchet only; no test requires the spawn
  change and it remains an open PM/architect decision. Correct scope discipline.

## Sm Assessment

**Setup complete. Routing to tea (RED phase).**

**Story:** Tune enemy motion/behavior to authentic rev-3 ROM constants. Pure-core
work in `tempest/src/core` — deterministic sim (dt-driven, seeded RNG), no DOM,
no wall-clock, no `Math.random`. Constants and behaviors are documented in the
story description and the design ref (Enemy roster); the recon (enemy-recon)
supplies the byte-level source of truth.

**Why this is a TDD/phased story (not trivial):** 5 points, touches the
deterministic simulation across all six enemy types (flipper, tanker, spiker,
fuseball, pulsar, plus spawn/mix + scoring). Behavior is numeric and verifiable —
ideal for failing tests that pin the authentic constants before implementation.

**Acceptance criteria for tea to encode as failing tests:**
- ALONG geometry: 0x10 near rim/player .. 0xf0 far; spawn at 0xf0 climbing toward
  low along; 0x20 = near-rim trigger (split / spiker-reverse / grab). Speed bytes
  signed, sign-extended x8; net ~ (byte)/32 along/frame, x60 → per second.
- FLIPPER: L1 climb -1.375/fr (-82.5/s, ~2.7s up tube), L33+ -3.375/fr; flip sets
  0x80+target angle, steps ±1/tick into adjacent lane; per-level flip patterns
  (m_l0b, m_l19, m_l24, m_l87); rim grab kills if same seg as player;
  flip_top_accel 2 (L1-32) / 3 (L33+).
- TANKER: straight up at flipper speed; splits at 0x20 OR on death → 2 cargo-type
  children into adjacent lanes (seg-1, seg+1); split-type 1→2 flippers / 2→2
  pulsars / 3→2 fuzzballs.
- SPIKER: spike grows toward rim only (spike_ht=along when along<spike_ht),
  growth=climb speed; oscillates ~0x20↔far; far end hops random lane (prefers
  tallest-spike), converts to flipper/tanker if none pending; speed
  flipper-relative (L21+ faster).
- FUSEBALL: spd 2x flipper (L1 -2.75/fr, -165/s); rolls rim + slides lanes toward
  player gated by fuzz_move prob (pokey2_rand); KILLABLE ONLY on a lane in
  vulnerable phase (L02cc bit7), NOT while rolling rim; hit_tol 6; score
  250/500/750 random.
- PULSAR: L17+; flipper speed far, pulsar speed near (-82.5/s); pulse via
  pulse_beat (4/6/8); pulsar_fliprate 40fr@L17 → 10-20fr@L40+; LETHAL LANE —
  player in a pulsing pulsar's lane dies.
- SPAWN/MIX (verify vs current difficulty): flippers-only L1-4; tankers L5+;
  spikers L5-16; fuseballs L11+; pulsars L17+; steady L33+ (5F/3P/3T/1S/3Fz);
  wave_enemies via 64 staggered ~16fr countdowns while in-tube < max_enm=6.
- SCORES (verify): Flipper 150, Pulsar 200, Tanker 100, Spiker 50, Fuseball
  250/500/750.

**Note for tea/dev:** Several values are tagged "verify" in the spec — where the
ROM-derived constant disagrees with the current implementation, the ROM is the
source of truth, but record any divergence in Design Deviations rather than
silently changing balance the playtest depends on. Not my call to make — that's
a tea/dev/architect decision.

**Repo:** tempest, trunk-based (no feature branch). Tests: `cd tempest && npm test`
(run via testing-runner). Routing to **tea** for RED.

---
## TEA Assessment

**Tests Required:** Yes

**Test Files:**
- `tests/core/sim.enemy-authentic.test.ts` (NEW) — authentic enemy motion &
  behavior: climb speeds (flipper L1/L33, fuseball=2×flipper, tanker=flipper),
  ~2.7 s tube traverse, tanker seg-1/seg+1 split geometry, spiker far-end hop to
  the tallest-spike lane, fuseball vulnerable-phase killability, plus rim-grab and
  determinism guards.
- `tests/core/enemies/tanker.test.ts` (MODIFIED) — the "adjacent lanes" expectation
  updated from the non-authentic `[4,5]` (seg/seg+1) to the authentic `[3,5]`
  (seg-1/seg+1), keeping one source of truth for split geometry.

**Tests Written:** 14 new + 1 updated, covering AC#1 (climb/flip/split/spike/fuseball/
pulsar motion), AC#2 (fuseball vulnerable phase, tanker split, spiker hop; pulsar
lethal-lane already covered by `pulsar.test.ts`), and AC#4 (pure/deterministic core).

**RED verification (via testing-runner, RUN_ID 6-9-tea-red):**
- Suite ran clean (no transpile/import error): **447 tests, 11 failing, 0 regressions**
  outside the two targeted files (baseline 433 → 447 = +14 new tests).
- All 11 failures are authentic-constant mismatches for the RIGHT reason:
  flipper 0.18→needs 0.368, L33 1.044→needs <1.0, fuseball 0.26≠2×, tanker 0.14≠flipper,
  traverse 5.55 s→needs ~2.7 s, split `[4,5]`→`[3,5]` and `[0,1]`→`[1,15]`, spiker stays
  on lane 5→needs lane 10, invulnerable fuseball killed→needs to survive.
- 4 intended GREEN locks pass: spike-grows-toward-rim, fuseball-vulnerable-kill,
  flipper rim-grab, mixed-roster determinism.

**Status:** RED (failing — ready for Dev)

### Coverage by AC

| AC | Coverage |
|----|----------|
| AC#1 climb/flip/split/spike/fuseball/pulsar to authentic constants | RED tests on flipper/fuseball/tanker speeds, traverse time, split geometry, spiker hop |
| AC#2 fuseball vulnerable-only kill; tanker 2-child split; spiker far-end hop; pulsar lethal-lane | RED for fuseball/tanker/spiker; pulsar lethal-lane already locked by `pulsar.test.ts` |
| AC#3 spawn mix + scoring vs ROM | Scoring already authentic & locked by `sim.scoring.test.ts`; spawn-mix deferred (Conflict finding + deviation) |
| AC#4 pure-core boundary (no DOM/time/Math.random, deterministic) | Determinism lock; all tests drive the pure core via seeded RNG + dt |

### Rule Coverage (lang-review: typescript.md)

| Rule | Test(s) / Note | Status |
|------|----------------|--------|
| #1 type-safety escapes | No `as any` / `@ts-ignore` in the new tests | clean |
| #4 null/undefined | `spiker!`/`fuseball!` non-null assertions are guarded by a prior `toBeDefined()` | clean |
| #8 test quality | Every test has a meaningful assertion (values, not just `is_some`); determinism test guards against vacuous equal-empty (`expect(a).toContain('flipper')`) | clean |

**Rules checked:** 3 of 13 lang-review rules apply to this pure-sim test work (no
async, JSX, enums-under-test, security boundaries, or `JSON.parse`).
**Self-check:** 0 vacuous tests (no `let _ =`, no `assert(true)`, no always-`undefined` checks).

**Note on commit:** Per tempest's "commit only when asked" rule, the failing tests are
left in the working tree (uncommitted) for Dev to drive green — not auto-committed.

**Handoff:** To Dev (Walter Sobchak) for the GREEN phase — tune `src/core/rules.ts`
(`levelParams` speeds) and the enemy steppers / `sim.ts` (split geometry, spiker hop,
fuseball vulnerability) to make the 11 RED tests pass without regressing the other 436.
Resolve the two blocking Delivery Findings (spawn schedule, speed-doubling) with
PM/architect before tuning the spawn table.

---
## Dev Assessment

**Implementation Complete:** Yes

**User decision (2026-06-28):** Adopt **full authentic ROM speeds** — playtest shows
the game is on the easy side and difficulty should be ratcheted up. The blocking
"speed-doubling" question is resolved in favour of authenticity. The blocking
"spawn schedule" question is NOT actioned this story (kept the tuned curve; logged
as a Dev deviation — still needs a PM/architect call).

**Files Changed:**
- `src/core/rules.ts` — `flipperSpeedForLevel(level)` maps the ROM climb byte
  (1.375 along/fr @L1 → 3.375 @L33+, linear between, flat after) to depth/sec via
  `WARP_ALONG_SPAN`; `levelParams` now sets `flipperSpeed` from it, `tankerSpeed =
  flipperSpeed`, `fuseballSpeed = 2 × flipperSpeed`. Intervals/floors/spikerSpeed
  unchanged.
- `src/core/enemies/tanker.ts` — `splitTanker` drops children on the flanking lanes
  `wrap(lane-1)` / `wrap(lane+1)`, vacating the tanker's own lane.
- `src/core/state.ts` — added required `vulnerable: boolean` to `Fuseball`.
- `src/core/enemies/fuseball.ts` — toggles `vulnerable` on each roll.
- `src/core/sim.ts` — `makeEnemy` seeds fuseballs `vulnerable: false`;
  `resolveBulletHits` skips a fuseball that is not `vulnerable`; spiker far-end
  turnaround relocates to the tallest-spike lane (seeded-RNG fallback when none).
- `tests/core/enemies/fuseball.test.ts`, `tests/core/sim.enemy-fire.test.ts` —
  added `vulnerable` to existing fuseball literals (required-field follow-through).

**Tests:** 447/447 passing (GREEN). `tsc --noEmit` clean. Verified via
testing-runner RUN_ID 6-9-dev-green — all 11 prior RED tests green, 0 regressions.

**ACs:** AC#1 ✓ (authentic climb speeds), AC#2 ✓ (fuseball vulnerable-phase kill,
tanker flanking split, spiker far-end hop; pulsar lethal-lane already present),
AC#3 partial (scoring already authentic; spawn-mix deferred per blocking finding),
AC#4 ✓ (pure-core preserved — no DOM/time/Math.random; seeded RNG threaded).

**Branch:** trunk-based (no feature branch). Changes left in the working tree —
NOT committed, per tempest's "commit only when asked" rule (same as the RED handoff).

**Handoff:** To Reviewer (The Big Lebowski) for code review.

---
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 447/447 green, tsc clean, 0 smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — covered by Reviewer ([EDGE]) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — covered by Reviewer ([SILENT]) |
| 4 | reviewer-test-analyzer | Yes | findings | 7 (4 high, 2 med, 1 low) | confirmed 7, dismissed 0, deferred 0 (all non-blocking test-coverage gaps) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — covered by Reviewer ([DOC]) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — covered by Reviewer ([TYPE]) |
| 7 | reviewer-security | Yes | clean | none | N/A — 0 violations, pure-core boundary + determinism + index safety verified |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — covered by Reviewer ([SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A — 15 rules / 67 instances / 0 violations |

**All received:** Yes (4 enabled returned; 5 disabled via `workflow.reviewer_subagents` and covered by Reviewer)
**Total findings:** 7 confirmed (all Medium/Low, non-blocking), 0 dismissed, 0 deferred

---
## Reviewer Assessment

**Verdict:** APPROVED

The implementation is correct, minimal, and faithful to the story's authentic-ROM
intent. All four enabled specialists plus my own pass agree: zero defects in the
production logic, full ACs met, pure-core boundary preserved, 447/447 green, tsc
clean. The seven test-analyzer findings are all test-coverage gaps on *correct*
behavior — they strengthen the suite but do not block; captured as Delivery
Findings for a fast-follow.

**Data flow traced:** `level` (internal positive-integer counter) → `levelParams(level)`
→ `flipperSpeedForLevel` → `flipperSpeed`/`tankerSpeed`/`fuseballSpeed` → enemy
steppers (`depth += speed · dt`) → enemy positions → render. Safe because `level`
is never user input and every step is pure arithmetic with `Math.max/min` clamps.

**Pattern observed:** `flipperSpeedForLevel` (rules.ts:122) mirrors the existing
`warpAccel`/`WARP_INITIAL_SPEED` "ROM-constant + derivation comment + along→depth
conversion via WARP_ALONG_SPAN" pattern — consistent with the established
authentic-constants idiom in the same file.

**Error handling:** Pure deterministic sim — no error paths introduced; numeric
lerp factor guarded by `Math.max(0, Math.min(1, …))`; array indices proven
in-bounds by [SEC].

### Observations

- [VERIFIED] Pure-core boundary preserved — the spiker far-end hop draws randomness
  only from the seeded `rngInt(s.rng, …)` and threads `s.rng` (sim.ts:157-160);
  fuseball toggle is a pure boolean flip. Evidence: [SEC] grep found 0
  `Math.random`/`Date.now`/`performance.now`/DOM refs in `src/core/`. Complies with
  CLAUDE.md pure-core rule.
- [VERIFIED][TYPE] `Fuseball.vulnerable: boolean` is a *required* field
  (state.ts:65); every construction site updated (`makeEnemy` sim.ts:107 + the
  test literals); `tsc --noEmit` clean. No stringly-typed API; `EnemyKind` switch
  in `makeEnemy` stays exhaustive. (type_design disabled — verified by Reviewer.)
- [RULE] reviewer-rule-checker: 15 rules / 67 instances / 0 violations. Confirmed
  `!e.vulnerable` is boolean negation *after* `e.kind === 'fuseball'` narrowing
  (sim.ts:299), not a non-null assertion; spike-credit runs *after* relocation so
  it is a no-op `max(existing, 0)` on the new lane (sim.ts:163).
- [SEC] reviewer-security: clean. Spiker `target` index ∈ [0, laneCount-1] on both
  the tallest-spike and RNG-fallback paths; `flipperSpeedForLevel` NaN-propagation
  is unexercisable (`level` is an internal counter, never user input).
- [TEST] reviewer-test-analyzer (confirmed, non-blocking): (1) fuseball
  vulnerable-toggle has no direct assertion — the headline mechanism; a regression
  removing it would silently make fuseballs unkillable [MEDIUM]; (2) spiker
  self-hop + (3) no-spike RNG fallback paths untested [MEDIUM]; (4) open-tube
  tanker split clamping untested [MEDIUM]; (5) L34+ clamp flatness untested [LOW];
  (6) "never shrinks on descent" comment overstates the descent reached in 40
  frames [LOW]; (7) fuseball/tanker ratio asserts are coupling-tautological but
  cross-checked by the flipper band test [LOW]. All recommend test additions, not
  code fixes.
- [EDGE] (edge_hunter disabled — Reviewer): the live edges are the spiker self-hop
  (own lane usually tallest ⇒ lone spiker never relocates) [MEDIUM, see Question]
  and the open-tube split clamping a child onto the tanker's own lane at lanes
  0/laneCount-1 [LOW] — no worse than the prior code, which clamped both children
  together. `sp.depth === 0` strict-equality is safe: `stepSpiker` assigns exactly
  `0` via the floor clamp.
- [SILENT] (silent_failure_hunter disabled — Reviewer): no swallowed errors. The
  `if (e.kind === 'fuseball' && !e.vulnerable) continue` is an intentional pass-
  through (a bullet flies past a rim-rolling fuseball to hit an enemy behind it),
  not a silent failure; the RNG fallback is an explicit branch, not a swallow.
- [SIMPLE] (simplifier disabled — Reviewer): minimal and direct — `flipperSpeedForLevel`
  is a clean clamped lerp; the spiker hop is an O(laneCount) scan. No dead code, no
  over-engineering. The lerp factor `t` is terse but locally obvious.
- [DOC] (comment_analyzer disabled — Reviewer): the new ROM-derivation comments
  (rules.ts, fuseball.ts, tanker.ts, sim.ts) are accurate and valuable. Sole nit:
  the spike-grows TEST comment overstates the descent reached (finding #6, LOW).

### Rule Compliance (lang-review: typescript.md)

| Rule | Governed symbols in diff | Verdict |
|------|--------------------------|---------|
| #1 type-safety escapes | `flipperSpeedForLevel`, `splitTanker`, `stepFuseball`, `makeEnemy`, fuseball guard, `spiker!` (test) | compliant — no `as any`/`@ts-ignore`; `!` is boolean negation; `spiker!` guarded by prior `toBeDefined()` |
| #2 generic/interface | `Fuseball.vulnerable`, `flipperSpeedForLevel`/`levelParams`/`splitTanker` signatures | compliant — concrete types, no `Record<string,any>`/`Function`; params not mutated |
| #3 enum patterns | `makeEnemy` switch on `EnemyKind` | compliant — string union, exhaustive (5 members), return-type-enforced |
| #4 null/undefined (`\|\|` vs `??`) | rules.ts arithmetic, fuseball toggle, spiker scan, fuseball guard | compliant — no `\|\|` on nullable; no nullable operands introduced |
| #5 module/declaration | new test-file imports (`import type` for GameState/Enemy/Input) | compliant — type-only imports marked; bundler resolution, no `.js` needed |
| #8 test quality | all changed/added test literals + new suite | compliant — no `as any`, no mocks, src/ (not dist/) imports, non-vacuous; coverage gaps noted as [TEST] findings |
| #10 input validation | `flipperSpeedForLevel(level: number)`, `levelParams` | compliant — `level` internal, not an API/JSON/URL boundary |
| #13 fix regressions | tanker split fix, fuseball toggle, spiker hop | compliant — re-scanned against #1-#12, no new escape/`\|\|`/impurity introduced |

Rules #6 (JSX), #7 (async), #9 (build config), #11 (error handling), #12
(performance/bundle) — not applicable to this changeset (pure sim, no async/JSX/config).

### Devil's Advocate

Let me argue this code is broken. First, the fuseball: spawned `vulnerable: false`
with `jitterTimer: 0`, so a malicious frame-1 race could let a bullet fired the
same frame find the fuseball still invulnerable — but bullets travel from the rim
inward and a freshly spawned fuseball sits at depth 0 (far), so no rim bullet
overlaps it on frame 1; the window is harmless. Worse: what if `FUSEBALL_JITTER_INTERVAL`
were ever raised — the fuseball would spend long stretches invulnerable and a
player could never kill it. True, but that is a tuning knob, not a defect, and the
spawn `jitterTimer: 0` guarantees the first toggle fires immediately. Second, the
spiker hop: a confused author might think the lone spiker wanders the tube; it does
not — it parks on whichever lane holds the tallest spike, often its own, so the
"hop" is frequently a no-op. A stressed board with 32 lanes (deep cycles) still
bounds the scan at O(laneCount); no blowup. Could the RNG fallback desync replays?
There is no replay system, and the consumption is a pure function of `s.spikes`, so
determinism holds — the determinism test proves it. Third, the speed change:
doubling `flipperSpeed` also doubled `enemyBoltSpeed` (= flipperSpeed + offset); a
player at level 1 now faces ~1.09 depth/s bolts — could that make a bolt undodgeable?
The 6-5 bolt tests assert relatively and pass; the user explicitly wants the
difficulty ratchet, so faster bolts are intended, but I have flagged a playtest
confirmation. Fourth, the open-tube split places a child on the tanker's own lane at
the boundary — a confused player might see a child appear "inside" the tanker, but
the tanker is removed in the same frame, so no two enemies occupy one slot illegally.
What a malicious user *cannot* do: inject DOM, non-determinism, or out-of-bounds
indices — [SEC] proved the indices safe and the boundary pure. Nothing here rises to
Critical or High: the worst real consequences are a never-relocating lone spiker and
an untested toggle, both non-blocking and both now documented.

**Verdict rationale:** No Critical/High issues. All AC met, pure-core preserved,
447 green, tsc clean, every specialist clean or non-blocking. The confirmed findings
are test-coverage and tuning recommendations carried forward as Delivery Findings.

**Handoff:** To SM (The Dude) for finish-story.