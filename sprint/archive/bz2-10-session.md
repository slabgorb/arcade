---
story_id: "bz2-10"
jira_key: ""
epic: "bz2"
workflow: "tdd"
---
# Story bz2-10: Authentic tank maneuvering AI — port the ROM goal-heading state machine (flank/wander/charge modes, ~22deg/s turn, standoff distance, reverse-on-collision) so enemy tanks jockey for a shot instead of spawn-aim-firing like a turret; the real fix for bz2-9's unsurvivable opening

## Story Details
- **ID:** bz2-10
- **Title:** Authentic tank maneuvering AI (ROM-faithful goal-heading state machine)
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** tdd
- **Type:** bug
- **Points:** 5
- **Priority:** p1
- **Repo:** battlezone
- **Stack Parent:** bz2-9 (base = feat/bz2-9-fair-enemy-spawns; SM will repoint after completion)

## Technical Approach

This story ports the authentic Atari ROM tank AI from the disassembled `reference/va-battlezone/` SourceGen listing (confirmed behavior @ 15.625 fps). The current `aiInput()` in `battlezone/src/core/enemies.ts` (~line 299) is a **beeline seeker** that welds its nose to the player and turns ~84°/s, making the tank always aimed and firing the instant spawn grace lifts — it plays like a gun turret, making bz2-9's spawn grace survivable but the tank unfair.

The ROM tank is a **goal-heading state machine**: it picks a goal heading (charge, flank ±90°, or wander ±45°) based on morale/game state, steers toward that goal at ~22°/s (44°/s super), holds a standoff distance (~1280 world units regular / ~2048 super), and reverses on obstacle hit. The barrel tracks the tank's movement goal, NOT the player, so it only has a shot window when the tank happens to maneuver into alignment.

### Key ROM behaviors (addresses + byte values from decode):
1. **Dispatch loop** `UpdateTank $6424`: checks if reversing; if so, back-up+turn until counter=0. Otherwise, if move_counter≠0 → steer toward goal. If move_counter=0 → pick new goal.
2. **Goal selection** `SetTankTurnTo $6534`: morale rubber-bands via enemy_score:
   - Player behind: `GoMild` ($6571) — wander ±≤45° off previous goal, move_counter=$40 (≈4.1s)
   - Even: `GoMedium` ($6553) — 7/8 chance flank (goal = player_angle XOR $40 = 90° off), 1/8 reverse, move_counter=$40
   - Player ahead / rez_protect==$ff / 50-50 / score≥100K: `GoHard` ($6589) — charge straight at player, move_counter=$04 (≈0.26s, re-locks almost every frame)
3. **Turn rate** `RotateLeft $638d` / `RotateRight $639b`: 0.5 unit (0.703°) per call. Regular big-turn = 2 calls/frame ≈ 22°/s; super = 4 calls ≈ 44°/s. Big turns rotate **without advancing**.
4. **Standoff** `SmallAngleCom $64c2`: advance only if dist_hi ≥ $05 (=1280 slow) / $08 (=2048 super); else circle in place. Fwd step = ¾·sin/cos ($6310); super ×2.
5. **Fire gate** `TryShootPlayer $6595`: rez_protect<$20 (≈2.05s ≈ our SPAWN_FIRE_GRACE 2s) hold gate. At low score, new gates relax at score≥2000/≥100K. `ShootOkay` ($65b6) fires only if |angle_to_player − facing| < $02 = ±2.81°. One shell, TTL 127 frames, along barrel, no leading.
6. **Obstacle collision** `HitSomething` $651a: random turn + reverse + move_counter=$30 (≈3.1s) + undo position. Player hit → undo only. No cover/pathfinding.
7. **Spawn** `CreateTank $69e8`: enemy_turn_to random (not pre-aimed), facing NOT reset, pos ≈ player_facing ± ~0-21° at hemisphere offsets, rez_protect=0.

### Implementation plan:
1. Add `turnTo: number` (goal heading in degrees) and `moveCounter: number` to `Hostile` struct in `battlezone/src/core/enemies.ts`.
2. Rewrite `aiInput()` (~line 299) to steer toward `turnTo` instead of welds-to-player; decoupling is the core fix.
3. On moveCounter expiry, pick new goal via ROM-faithful charge/flank/wander odds + morale split (score-based).
4. Reduce turn rate cap from ~84°/s to ~22°/s (44°/s super) in `movement.ts` MAX_TURN_RATE; rotate-only during large turns (no advance).
5. Throttle forward movement: zero throttle when dist < ~1280 (slow) / ~2048 (super); circle instead of ram.
6. Tighten fire gate AIM_TOLERANCE from 0.3 → ~±0.049 rad (±2.8°, ROM-faithful ±2.81°). Keep one-shell/reload gate.
7. Add reverse-on-collision (~3s move_counter).
8. Keep bz2-9's SPAWN_FIRE_GRACE=2s (faithful rez_protect<$20).
9. Preserve determinism: seeded RNG only, non-mutating reducers, no Math.random/Date/DOM.
10. Full test suite green + tsc clean.

**ROM decode reference:** `/private/tmp/claude-501/-Users-slabgorb-Projects-a-2/a1edf856-3c95-49f1-bb25-e1f161314667/scratchpad/bz2-10-rom-tank-ai-spec.md`

## Acceptance Criteria

1. **Enemy tank heading is decoupled from the player** — tanks steer toward a goal heading that is frequently ~90° off (flank) or a random wander, re-picked periodically; the barrel is NOT permanently welded to the player.

2. **Turn rate is ROM-faithful** (~22°/s regular, ~44°/s super), rotating without advancing during large turns — not the current ~84°/s snap.

3. **Tanks hold a standoff distance** (~1280 world units regular / ~2048 super) and circle instead of ramming point-blank.

4. **Tanks reverse-and-turn on obstacle collision** (unstick), per ROM HitSomething (~3s).

5. **Fire is intermittent** (barrel must genuinely line up on the player, ~±2.8°), preserving the one-shell/reload gate; the opening is survivable (no sub-2s unavoidable spawn death) yet enemies stay lethal after maneuvering.

6. **Determinism/core-purity preserved**: seeded rng only, non-mutating reducers, no Math.random/Date/DOM; full test suite green + tsc clean.

7. **Live playtest confirms tanks "move around and try to get a beat on you"** (subjective fair-feel gate).

## Workflow Tracking
**Workflow:** tdd
**Phase:** review
**Phase Started:** 2026-07-06T13:02:20Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-06T00:06:58Z | 2026-07-06T10:21:20Z | 10h 14m |
| red | 2026-07-06T10:21:20Z | 2026-07-06T10:39:24Z | 18m 4s |
| green | 2026-07-06T10:39:24Z | 2026-07-06T11:10:58Z | 31m 34s |
| review | 2026-07-06T11:10:58Z | 2026-07-06T12:25:52Z | 1h 14m |
| green | 2026-07-06T12:25:52Z | 2026-07-06T13:02:20Z | 36m 28s |
| review | 2026-07-06T13:02:20Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Conflict** (non-blocking): Implementation-plan item 4 says lower `MAX_TURN_RATE` in `movement.ts`, but that constant is shared with the player's `stepTank` — lowering it slows the player too. Affects `battlezone/src/core/enemies.ts` (cap the enemy turn via the opposed treads `aiInput` commands; do NOT edit `movement.ts`). Guard test `AC-2 > the player tank still pivots at its full rate` enforces this. *Found by TEA during test design.*
- **Improvement** (non-blocking): the exact fire window (~±2.8°), turn rates, standoff byte, and flank/wander/charge odds are playtest-sensitive; the RED tests band them (no absolute constants) so a bz1-12-style retune stays green. Affects `battlezone/src/core/enemies.ts` (tune within the bands). *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): the maneuvering knobs (turn rates, fire cone, standoff, goal odds/periods) are tuned for in-sim engagement inside TEA's bands but want the AC-7 live playtest to true-up the subjective "fair feel". Affects `battlezone/src/core/enemies.ts` (retune within the bands — TEA's tests stay green). *Found by Dev during implementation.*
- **Question** (non-blocking): bz2-10 stacks on bz2-9 (spawn+grace); both fixes address the same unsurvivable-opening bug, so the SM should run ONE combined live playtest of the stacked branch before finishing either. Affects the finish flow. *Found by Dev during implementation.*

### Dev (R2 rework)
- **Improvement** (non-blocking): the R1 review's test-debt (obs. 4 vacuous AC-3, obs. 5 no per-seed floor, obs. 6 single-pair divergence + no super-tank AC-3/AC-4, obs. 7 stale comment/missing message) is all resolved this rework — hardened + mutation-tested. No new upstream findings. Affects `battlezone/tests/core/enemies-maneuver.test.ts`, `enemies.test.ts` (already changed). *Found by Dev during R2 rework.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Enemy turn-rate cap tested via commanded treads, not the shared `MAX_TURN_RATE`**
  - Spec source: context-story bz2-10, Implementation plan item 4
  - Spec text: "Reduce turn rate cap from ~84°/s to ~22°/s (44°/s super) in `movement.ts` MAX_TURN_RATE"
  - Implementation: Test `AC-2 > player tank still pivots at its full rate` pins `stepTank`'s full-opposed pivot at `MAX_TURN_RATE` (must stay); the enemy turn-rate drivers observe the enemy through `stepEnemies` and require it to command gentler opposed treads.
  - Rationale: `MAX_TURN_RATE` is shared with the player's `stepTank`; lowering it slows the player (the SM watch-item). The ROM slows the enemy's commanded rotation, not the physics cap.
  - Severity: minor
  - Forward impact: Dev must cap the enemy turn inside `aiInput`'s tread outputs; editing `movement.ts` `MAX_TURN_RATE` will fail the guard.

### Dev (implementation)
- **Morale rubber-band simplified to fixed goal odds**
  - Spec source: context-story bz2-10, Technical Approach #2 / Implementation plan #3
  - Spec text: "SetTankTurnTo $6534: morale rubber-bands via enemy_score … pick new goal via ROM-faithful charge/flank/wander odds + morale split (score-based)"
  - Implementation: fixed goal odds (CHARGE 0.4 / FLANK 0.42 / wander 0.18); no `enemy_score` morale tracking, so the goal mix is score-independent.
  - Rationale: `enemy_score` is an internal ROM tally we don't model; fixed odds already produce the maneuvering behavior TEA pins, and the morale nuance is playtest-tunable, not load-bearing for the fix.
  - Severity: minor
  - Forward impact: a later story could add score-based morale (charge harder when the player is winning); current behavior is uniform.
- **Turn rate & fire cone tuned above the raw ROM bytes (within TEA's bands)**
  - Spec source: context-story bz2-10, AC-2 / AC-5
  - Spec text: "~22°/s regular, ~44°/s super"; fire "~±2.8°"
  - Implementation: `TANK_TURN_RATE` 0.4×MAX (~34°/s), super 0.7× (~59°/s); `FIRE_CONE` 0.12 rad (~±6.9°).
  - Rationale: at the raw ROM 22°/s + ±2.8°, the slow-turning tank almost never aligns enough to close or fire inside the sim — it breaks the existing "closes distance"/"fires within 30s" tests and AC-5 lethality. Tuned up for engagement, kept inside TEA's bands (regular < ½ the player pivot; cone ≪ the pre-bz2-10 ±17° and still holds fire at 0.2 rad). PROVISIONAL — AC-7 playtest true-up.
  - Severity: minor
  - Forward impact: the AC-7 live playtest may retune; TEA's banded tests stay green through it.
- **`charge` modeled as a continuous live-pursuit re-lock**
  - Spec source: bz2-10 ROM decode (GoHard, `move_counter=$04`)
  - Spec text: "GoHard $6589 — charge straight at player, move_counter=$04 (≈0.26s, re-locks almost every frame)"
  - Implementation: `charge` recomputes `goalHeading = live bearing` every step over `CHARGE_PERIOD`, instead of discrete $04 re-picks.
  - Rationale: continuous re-lock is behaviorally equivalent to the ROM's near-every-frame re-lock and simpler than a 0.26s re-pick loop; determinism preserved (draws no extra rng during a charge).
  - Severity: minor
  - Forward impact: none.

### Dev (R2 rework — flank-dominance retune, review obs. 5)
- **Charge follows through to a shot, then must break off (GoHard persist + no back-to-back charge)**
  - Spec source: Reviewer Assessment obs. 5 (R1) + bz2-10 ROM decode (GoHard persists via `enemy_score`; GoMedium 7/8 at even score)
  - Spec text: R1 review: "~1/3 of seeds the tank charges straight in … lower `CHARGE_CHANCE` toward ROM flank-dominance and add a per-seed floor"; ROM: GoHard is entered while the player is ahead and re-locks near every frame until it fires, then flank (GoMedium) dominates.
  - Implementation: the goal-repick now (a) auto-EXTENDS an un-aligned charge (`|errPlayer| > FIRE_CONE`) with no rng draw so a charge always follows through to its shot, and (b) forbids a charge from re-picking charge (a would-be repeat falls through to flank). Net: the tank jockeys — charge in → fire once → break off to flank → re-approach — and can never sit barrel-on as a turret.
  - Rationale: pure odds-lowering could not deliver a per-seed turret floor — some seed always rolls `charge` several times in a row (measured: seeds 7/23 charged 3× consecutively → aimed 95%+ of the run regardless of `CHARGE_CHANCE`). The structural "no consecutive charge" caps every seed; the "persist until the shot" half keeps a facing-away tank lethal (it no longer quits a sweep mid-turn and wanders off). Both are closer to the ROM than the R1 fixed-burst charge. Determinism preserved (the persist branch draws no rng).
  - Severity: minor
  - Forward impact: `CHARGE_PERIOD` now bounds only the barrel-on hold AFTER alignment (kept short, 2.0s); a later score-based morale model would sit on top of this without changing the follow-through/break-off shape.
- **Goal odds/period retuned flank-dominant (within TEA's bands)**
  - Spec source: Reviewer Assessment obs. 5 (R1) — "lower `CHARGE_CHANCE` toward ROM flank-dominance"
  - Spec text: ROM GoMedium (flank) is 7/8 at even score.
  - Implementation: `CHARGE_CHANCE` 0.4 → 0.3, `FLANK_CHANCE` 0.42 → 0.5 (wander 0.18 → 0.2), `CHARGE_PERIOD` 3.0 → 2.0. Measured result (12-seed AC-1 harness): mean aimed-fraction 0.62 → 0.30, **max per-seed 1.0 → 0.65** (was a full turret at seed 65535), every seed now flank-dominant; standoff/lethality/determinism unchanged.
  - Rationale: shifts the felt behavior toward the ROM's flank-dominant even-score profile the R1 review flagged as the #1 playtest watch-item. Still PROVISIONAL inside TEA's banded tests — the AC-7 live playtest is the arbiter.
  - Severity: minor
  - Forward impact: the AC-7 live playtest may nudge these; the new per-seed floor (`< 0.85`) prevents a retune from silently re-introducing a turret.
- **`enemies.test.ts` "approach" test re-pinned from net-displacement to engagement (min-distance)**
  - Spec source: bz1-7 test `AI — approach > closes distance over open ground` (beeline-era expectation) vs bz2-10 AC-1 (heading decoupled from the player)
  - Spec text: old assertion `d1 < d0 - 1000` — the END position must be net-closer than the start.
  - Implementation: now asserts `min(distance over the run) < d0 - 10_000` — the tank must ENGAGE (close into weapons range at least once), not necessarily end net-closer.
  - Rationale: a flank-dominant tank jockeys (charge in, break off to a ±90° flank, re-approach), so a flank leg can legitimately leave it back near the ring at the final frame; the beeline-era net-displacement check is no longer the right invariant. Engagement (did it close in?) is. The new bound is far stronger than the old (10k vs 1k of closing).
  - Severity: minor
  - Forward impact: none — this is the correct invariant for the maneuvering AI; future AI stories keep it.

## Sm Assessment

**Setup complete.** Story bz2-10 (authentic tank maneuvering AI) is scoped, contexted, and branched — routing to TEA for the red phase.

**Why this story exists:** bz2-9's live playtest FAILED. Its spawn-hemisphere + 2s fire grace are ROM-faithful and stay, but the felt bug is deeper — the enemy AI (`aiInput`, `enemies.ts:299`) is a beeline seeker welded to the player at ~84°/s, so it plays like a gun turret. The History Men decoded the authentic ROM tank (goal-heading state machine: flank/wander/charge, ~22°/s turn, standoff, reverse-on-collision, intermittent fire). bz2-10 ports that. Full decode in the technical approach above + scratchpad spec.

**Branch:** `feat/bz2-10-tank-maneuvering-ai`, repointed onto `feat/bz2-9-fair-enemy-spawns` tip (user-approved reset) so it builds on the spawn+grace base. `enemies.ts` confirmed carrying bz2-9's changes. bz2-9 + bz2-10 merge together once the opening plays fair; bz2-9 stays open until then.

**Watch-item for TEA/Dev (non-blocking):** the implementation plan notes reducing `MAX_TURN_RATE` in `movement.ts` — verify that constant is NOT shared with the player tank (`stepTank`), or the player gets slowed too. The enemy likely needs its own turn-rate cap. Worth a test that pins player turn rate unchanged.

**Handoff:** To Imperator Furiosa (TEA) for red — write failing tests against the ROM behavior model (goal-heading decoupled from player, ~22°/s turn, standoff distance, reverse-on-collision, intermittent ±2.8° fire), holding the determinism/purity line.

## TEA Assessment

**Tests Required:** Yes
**Reason:** Behavior change to the deterministic core (enemy AI) — full TDD.

**Test Files:**
- `battlezone/tests/core/enemies-maneuver.test.ts` — 13 tests pinning the ROM goal-heading maneuvering model at the exported sim surface (`stepEnemies` / `stepTank`). Relative/banded assertions, no absolute ROM constants (the `enemies-aggro.test.ts` pattern) so a bz1-12-style playtest retune stays green. Constructs `Hostile`/`EnemyState` literals in the current shape, so Dev is free to add optional goal fields (`?? default`, the `reload ??` idiom).

**Tests Written:** 13 covering all 6 ACs — **8 RED drivers** (fail on the current beeline AI) + **5 regression guards** (green now, must stay green).

**Status:** RED confirmed. testing-runner (full battlezone suite): 700 passing, only the new drivers failing; `tsc --noEmit` clean; all 43 sibling test files green (fire-gate driver added post-run → 8 drivers red now, re-verified + tsc clean).

RED drivers → AC:
- **AC-1** heading decoupled: peak aim-error swings well off-player (flank/wander); tank not aimed on most frames.
- **AC-2** turns like a tank: regular enemy turn rate < half the player pivot; super out-turns regular.
- **AC-3** standoff: a tank beyond the standoff never rams to point-blank.
- **AC-4** unstick: a tank shoved at a pyramid backs off instead of wedging.
- **AC-5** intermittent fire: the fire gate tightens — a loosely-aimed (~11°) tank holds fire.
- **AC-6** determinism: the seed steers the maneuver — different seeds diverge.

Guards (green, must stay green):
- **AC-2 watch-item:** player full-opposed pivot stays exactly `MAX_TURN_RATE` — the enemy slow-down must live in commanded treads, not the shared cap.
- **AC-5:** opening fire-grace intact (bz2-9); a maneuvering tank is still lethal (fires over time).
- **AC-6:** identical seed → identical trajectory; no NaN/Infinity leaks.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| Core-purity / determinism (epic non-negotiable) | `identical seed → identical trajectory`; `seed steers the maneuver` | guard green / RED |
| #4 null/undefined & finite math | `headings and positions stay finite` (no NaN) | guard green |
| #8 test quality (meaningful assertions) | self-checked — every test asserts a banded behavior with a message | pass |
| Shared-constant regression | `player tank still pivots at its full rate` | guard green |

**Rules checked:** determinism (epic), finite-math (#4), test-quality (#8), + the shared-constant regression guard. N/A to this pure sync sim: #1 type escapes, #6 React/JSX, #7 async, #10 input validation, #11 error handling.
**Self-check:** 0 vacuous tests — no `let _ =`, no `assert(true)`, no always-null `toBeNull` (the fire-gate `toBeNull` is on a value that is non-null today → a real RED).

**Handoff:** To The Word Burgers (Dev) for GREEN — port the goal-heading state machine per the technical approach + scratchpad spec. Cap the enemy turn via commanded treads (NOT `movement.ts`). Preserve bz2-9's grace and the determinism/purity line.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `battlezone/src/core/enemies.ts` — replaced the bz1-7 beeline `aiInput` with the ROM goal-heading state machine. New `aiDrive` steers toward a GOAL heading (usually decoupled from the player) at a capped enemy turn rate expressed as opposed-tread components (so the shared `MAX_TURN_RATE` — the player's pivot — is untouched). New optional `Hostile` fields (`goal` / `turnTo` / `moveCounter` / `reversing`, the `reload ??` idiom) carry the maneuvering state: **charge** (live pursuit that closes + lines up a shot) / **flank ±90°** / **wander ±45°**, re-picked on a countdown; a **standoff** distance (circle, don't ram); **reverse-on-collision** (unstick); and a **tightened fire cone** so fire is intermittent. bz2-9's spawn grace + barrier reload are preserved.

**Tests:** 708/708 passing (GREEN). `tsc --noEmit` + `vite build` clean. All 13 bz2-10 drivers green; all 43 sibling test files green — no regressions (dt=0 no-op, aggro ratchet, roster, respawn/spawn fairness, approach/fire all intact).
**Branch:** `feat/bz2-10-tank-maneuvering-ai` (pushed; based on `feat/bz2-9-fair-enemy-spawns` so it carries the spawn+grace base).

**Design notes:**
- The enemy turn cap lives in the treads `aiDrive` commands — `movement.ts` `MAX_TURN_RATE` is untouched, so the player-pivot guard stays green (the SM/TEA watch-item, enforced).
- Turn rates, fire cone, standoff, and goal odds are tuned for in-sim engagement inside TEA's behavioral bands and flagged PROVISIONAL (see Deviations). **AC-7 (live playtest / "fair feel") is the user's subjective gate — deferred to finish, like bz2-9.**
- Determinism/purity held: all randomness via the carried seed (`nextFloat`), non-mutating reducers, no `Math.random`/`Date`/DOM; frozen-time (dt=0) is a spatial no-op.

**Handoff:** To Immortan Joe (Reviewer) for code review.

### Dev Assessment — R2 rework (flank-dominance retune)

**Trigger:** R1 review APPROVED but flagged obs. 5 — the provisional `CHARGE_CHANCE=0.4` left ~1/3 of encounters charge-dominated (seed 65535 aimed 100% of the run, a full turret). User chose the retune toward ROM flank-dominance + the test-hardening from obs. 4/6/7.

**What changed (implementation):**
- `src/core/enemies.ts` — goal-repick rewrite: a charge now (a) PERSISTS until it takes its shot (auto-extend while `|errPlayer| > FIRE_CONE`, no rng draw) and (b) cannot re-pick charge back-to-back. Retuned flank-dominant: `CHARGE_CHANCE` 0.4→0.3, `FLANK_CHANCE` 0.42→0.5, `CHARGE_PERIOD` 3.0→2.0. `MAX_TURN_RATE`, standoff, fire cone, bz2-9 grace/reload all UNTOUCHED.

**What changed (tests, per R1 obs.):**
- `enemies-maneuver.test.ts` — AC-1 per-seed turret floor (`max aimed < 0.85`, obs. 5) + stale `AIM_TOLERANCE` comment fixed (obs. 7); AC-3 rewritten to a forced-charge approach that is **mutation-proven non-vacuous** (`STANDOFF=0` → rams to 16 → fails, obs. 4) + super-tank wider-standoff coverage (obs. 6); AC-4 super-tank reverse-on-collision coverage (obs. 6); AC-6 divergence now multi-pair "most diverge" + missing determinism message added (obs. 6/7).
- `enemies.test.ts` — the beeline-era "approach" test re-pinned from net-displacement to engagement/min-distance (logged deviation; a jockeying tank need not end net-closer).

**Measured effect (12-seed AC-1 harness):** mean aimed-fraction 0.62 → 0.30; **max per-seed 1.0 → 0.65** (no turret); every divergence pair now separates; facing-away tank still fires (follows through at ~6s, all probe seeds).

**Tests:** 710/710 passing (GREEN, +2 coverage tests). `tsc --noEmit` + `vite build` clean. Determinism/core-purity intact (`enemies-purity.test.ts` green; persist branch draws no rng).
**Branch:** `feat/bz2-10-tank-maneuvering-ai` (rework committed on top of `14478fb`).

**Handoff:** To Immortan Joe (Reviewer) for RE-review of the retune delta. Still HELD for the user's AC-7 live playtest — do NOT finish; bz2-10 + bz2-9 merge together once the opening plays fair.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 | 708/708 green, build clean, 0 smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings (self-covered) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled (self-covered) |
| 4 | reviewer-test-analyzer | Yes | findings | 5 | confirmed 5, dismissed 0 |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled (self-covered) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled (self-covered) |
| 7 | reviewer-security | Yes | clean | 0 | clean, 0 violations |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled (self-covered) |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed 1 (stale comment) |

**All received:** Yes
**Total findings:** 6 confirmed, 0 dismissed, 0 deferred — all non-blocking (test-quality + one doc); zero implementation-correctness defects.

## Reviewer Assessment

**Verdict:** APPROVED — finish HELD for the user's live playtest (AC-7), like bz2-9 / bz1-12. One playtest-tuning concern surfaced (see obs. 5).

**Scope reviewed:** bz2-10 delta (`feat/bz2-9-fair-enemy-spawns...HEAD`): `src/core/enemies.ts` (beeline `aiInput` → `aiDrive` goal-heading state machine + `goal`/`turnTo`/`moveCounter`/`reversing` fields, standoff, reverse-on-collision, tightened fire cone) + `tests/core/enemies-maneuver.test.ts`. 4 enabled subagents returned; 5 disabled, self-covered.

**Observations (tagged):**
1. [VERIFIED] The maneuvering is real and correct. `aiDrive` steers toward a goal (charge live-pursuit / flank ±90° / wander ±45°) as opposed-tread components; the shared `MAX_TURN_RATE` is untouched (the player-pivot guard is green — the SM/TEA watch-item held). Standoff, reverse-on-collision, and the tightened fire cone are present and exercised end-to-end (13 drivers green). Working tree verified matching `14478fb`.
2. [SEC] security subagent: clean, 0 violations. No impurity (`Math.random`/`Date`/DOM); non-mutating reducers (fresh literals); the sole `/dt` division guarded by `dt > 0` (no NaN; `Math.sign(0)=0` safe); deterministic rng draw order. Corroborated by my read + `enemies-purity.test.ts`.
3. [RULE] rule-checker: 17 rules / 52 instances / **1 violation** — a stale test comment (`enemies-maneuver.test.ts:138` names `AIM_TOLERANCE`, deleted by this diff). All four new fields `readonly` + read via `??` (never `||`); no type escapes; the tuned turn-rate/fire-cone comments honestly disclose they were raised above the raw ROM bytes. CONFIRMED (non-blocking, doc-only).
4. [TEST] test-analyzer #1 (CONFIRMED, high — test debt, not a code defect): the AC-3 standoff test (`:192`) passes even with `STANDOFF=0` for its seed (555 never approaches) — vacuous for the seed it uses. Harden so the tank actually approaches (do it at the playtest-retune).
5. [TEST] test-analyzer #2 (CONFIRMED, high — **the key finding**): AC-1's mean-aggregate hides per-seed turret behavior — 4/12 seeds are aimed ≥0.955 (seed 65535 = 1.0, a full turret the entire run); the mean margin is thin (0.62 vs 0.7 cutoff). Signals the provisional charge/flank tuning leaves ~1/3 of encounters charge-dominated — more turret-prone than the ROM's flank-dominant even-score behavior (GoMedium 7/8). → **the #1 live-playtest watch-item**; if it still feels turret-y, lower `CHARGE_CHANCE` toward ROM flank-dominance and add a per-seed floor to AC-1.
6. [TEST] test-analyzer #3/#5 (CONFIRMED, med): E4 divergence uses one seed pair (some pairs alias to bit-identical trajectories); AC-3/AC-4 cover only `tank`, not `super-tank` (`SUPER_STANDOFF`, super reverse untested). → test-hardening at the retune.
7. [TEST/DOC] test-analyzer #4 + rule-checker (CONFIRMED, low): one AC-6 assertion missing a message; the stale `AIM_TOLERANCE` comment. → trivial cleanup.
8. [EDGE] (self-covered — subagent disabled): the collision heuristic (`advancing && gained < STALL_EPSILON`) cannot false-trigger in open ground — even the slowest crawl gains ~24 units ≫ 1; only a real hard-stop reads ~0. dt=0 no-op verified (roster test green).
9. [SILENT/DOC/TYPE/SIMPLE] (self-covered): no swallowed errors (pure reducer, `Math.max`/`Math.min` clamp the arithmetic); comments accurate post-fix; `goal` is a string union (rule-preferred over enum); minimal (1 rewritten fn + goal fields + consts, no dead code, one preserved rng-draw discipline).

### Rule Compliance (lang-review mapping)
- **#1 type escapes** — none. **#2 generics/readonly** — new fields `readonly`, no `Record<string,any>`. **#3 enums** — `goal` string union (preferred). **#4 null/undefined** — all new fields use `??`, never `||` (0 is a valid heading/timer). **#5 module** — `MAX_TURN_RATE` imported as a value; `.js` omitted per bundler resolution. **#6/#7/#10/#11** — n/a (pure sync sim). **#8 test quality** — meaningful banded assertions; one missing message + one stale comment (obs. 7). **#9 build** — tsc + vite clean. **#12 perf** — O(1) hot-path arithmetic. **#13 regressions** — none in the 42-line hunks. **Core-purity (epic)** — clean (obs. 2), green under `enemies-purity.test.ts`.

### Devil's Advocate
Assume it's broken. **Still a turret sometimes?** YES — for ~1/3 of seeds the tank charges straight in (test-analyzer #2). NOT a code bug (the tuning does exactly what it says), but a robustness gap against the user's "stop the turret" goal: the ROM is flank-dominant at even score, and the provisional `CHARGE_CHANCE=0.4` over-charges. The user's live playtest (AC-7) is the arbiter; if it still reads turret-y, lower charge toward ROM flank-dominance (banded tests stay green; add a per-seed floor so a retune can't silently reintroduce turrets). **NaN/∞?** Closed — `/dt` guarded, `Math.min`/`Math.max` bound the arithmetic. **Determinism drift?** rng draw order is state-determined; determinism tests green. **Player slowed?** No — `MAX_TURN_RATE` untouched; the guard test pins the player pivot. **Wedging?** Reverse-on-collision unsticks; the "never inside a footprint" test is green (stepTank hard-stop backs it). **Weakest spot:** the per-seed turret variance (obs. 5) and the test-debt (obs. 4/6) — captured as non-blocking, because the code is correct and the values are provisional-pending-playtest by design. Conclusion: no Critical/High **code** defects; the diff is correct, pure, ROM-grounded, and green. The residual is a tuning-robustness call for the live playtest.

**Handoff:** To SM (The Organic Mechanic) for finish — HELD for the user's live playtest, during which the charge/flank balance (obs. 5) is the thing to feel for.

## Reviewer Assessment — R2 (re-review of the flank-dominance retune delta `14478fb..560a82f`)

**Verdict:** APPROVED — still HELD for the user's AC-7 live playtest (bz2-9/bz2-10 finish together). No Critical/High. The R1 obs. 5 charge/flank concern is the thing this rework targets; the live playtest remains the arbiter.

**Scope:** commit `560a82f` only — `src/core/enemies.ts` (goal-repick: charge PERSISTS to its shot then must break off; odds retuned flank-dominant) + the two test files. Independently re-reviewed (adversarial Reviewer + test-analyzer/edge-hunter subagents), verified on a confirmed-clean tree.

**Verification:** full suite **710/710 green**, `tsc --noEmit` + `vite build` clean. **AC-3 mutation-proven non-vacuous** — `STANDOFF=0` → minDist 1280→16 → fails the `>800` floor; a never-advance mutant → 20000 → fails the `<4000` ceiling (both bounds load-bearing). Persist branch (a) proven live (disabling it fails tests). Determinism `.toEqual` green; persist branch draws NO rng and preserves the non-charge draw order.

**Non-negotiables cleared:** core purity/determinism intact (no `Math.random`/`Date`/DOM; `enemies-purity.test.ts` green); `dt=0` spatial no-op holds; `movement.ts` `MAX_TURN_RATE` untouched (player-pivot guard green); no hang/wedge/NaN (O(1) reducer, `moveCounter ∈ [0, CHARGE_PERIOD]`, reverse-on-collision breaks a physical wedge, persist threshold `FIRE_CONE` coincides with the fire gate at aggro=1 → charge stops exactly when it can fire → break off).

**Observations (all non-blocking, Low/Med):**
1. [TEST/MED] AC-6 divergence `>= 4/6` tolerates up to 2 silently-aliasing pairs (today all 6 diverge, min 2700) — deliberate anti-flake tradeoff, documented.
2. [TEST/MED] the re-pinned `enemies.test.ts` "approach" test is a coarse "engages" smoke check against a stationary player (a `wander` mutant also passes) — the real charge-pursuit proof lives in AC-3; still far stronger than the old net-displacement check. Acceptable as the correct post-maneuvering invariant.
3. [FEEL/LOW → AC-7] against a player strafing faster than `TANK_TURN_RATE`, persist can keep a tank charging without firing (bounded, deterministic, actively pursuing — not a hang); a gameplay-feel property for the live playtest.
4. [DOC/LOW] the post-charge break-off folds the excluded charge mass into flank (effective ~0.8/0.2 flank/wander) — consistent with the flank-dominant intent; undocumented split, doc nit only.
5. [LOW] the `dt=0` repick isn't `dt>0`-guarded and `Math.max(0,x-dt)` doesn't guard NaN dt — **pre-existing** (identical in 14478fb), consistent with the documented dt=0 house semantics; out of scope for this delta.

**Handoff:** To SM (The Organic Mechanic) for finish — **HELD** for the user's AC-7 live playtest (`cd battlezone && npm run dev`). Do NOT run `pf sprint story finish` yet; bz2-10 + bz2-9 merge together once the opening truly plays fair. During the playtest, feel for whether the tank now "moves around and tries to get a beat on you" (charge in → break off → re-approach) rather than sitting barrel-on.