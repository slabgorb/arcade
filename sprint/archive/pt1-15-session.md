---
story_id: "pt1-15"
jira_key: "pt1-15"
epic: "pt1"
workflow: "tdd"
---
# Story pt1-15: joust: egg-hatching spawns the rider mid-air instead of waiting for a buzzard to descend and collect it

## Story Details
- **ID:** pt1-15
- **Jira Key:** pt1-15
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** fix/pt1-15-egg-hatch-buzzard-pickup
- **Branch Strategy:** gitflow (feat/fix/{STORY_ID}-{SLUG})
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-20T19:12:07Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-20T17:55:16Z | 2026-08-20T17:57:49Z | 2m 33s |
| red | 2026-08-20T17:57:49Z | 2026-08-20T18:17:02Z | 19m 13s |
| green | 2026-08-20T18:17:02Z | 2026-08-20T18:41:52Z | 24m 50s |
| review | 2026-08-20T18:41:52Z | 2026-08-20T18:55:34Z | 13m 42s |
| green | 2026-08-20T18:55:34Z | 2026-08-20T19:08:22Z | 12m 48s |
| review | 2026-08-20T19:08:22Z | 2026-08-20T19:12:07Z | 3m 45s |
| finish | 2026-08-20T19:12:07Z | - | - |

## Sm Assessment

**Story:** pt1-15 — joust egg-hatching spawns the rider mid-air instead of waiting for a buzzard to descend and collect it. From the 2026-08-19 fleet playtest; p1, 3pt, tdd.

**Setup:** Session, context (`sprint/context/context-story-pt1-15.md`) and branch `fix/pt1-15-egg-hatch-buzzard-pickup` (cut from `develop`, gitflow) are in place. Story stamped `in_progress` and the claim pushed (commit `9cd8fe84` + branch) so sibling checkouts see it.

**Contention:** Clean. No remote branch and no sibling `.session/` for pt1-15 at setup. The a-2 checkout holds the neighbouring joust story **pt1-13** (troll-through-platform, branch `fix/pt1-13-...`) — its file neighbourhood (troll/spawn sim) is off-limits to avoid a collision.

**Premise (for TEA/Architect):** The "hatch → grounded rider → buzzard descends → mounts → threat" sequence is a ROM-fidelity *claim*, not verified fact. Verify against the joust ROM before it drives any RED test; correct the premise and derived ACs if the ROM disagrees. See Delivery Findings.

**Routing:** tdd/phased → next agent **TEA** (RED phase).

## Tea Assessment

**Premise verified against ROM — CONFIRMED.** Read the actual hatch routines in the
vendored `JOUSTRV4.SRC` (EGGLND :3224-3242 → buzzard create :3245-3276 → EGGMAN
cutscene :3279-3315 → EGGLLP :3316). The story's sequence is authentic, with one
correction to the prose: the collecting buzzard does **not** "descend" — it is created
`PVELY=0 NOT FALLING YET` (:3259), riderless (`& WITHOUT A RIDER`, :3260), and flies in
**horizontally** from the FAR edge at the man's cliff-level Y (brain `SEEKE`, "FETCH THE
LITTLE MAN"). Authentic order: **hatch → knight STANDS on the ground at its hatch spot
(EGGLLP, "WAIT UNTILL BUZZARD COMES OR KILLED BY PLAYER") → riderless buzzard flies in →
mounts (MOUNRI) → threat.**

**This story is the deferred jt9-25 follow-up.** `demo-jt9-25.test.ts` header records the
explicit **user scope decision (2026-08-04)**: jt9-25 built the EGGMAN cutscene and
DEFERRED the standing-knight vulnerability (EGGLLP). The 2026-08-19 playtest re-filed it
as this p1 bug. The port confirms the gap in two places: the `remountEnemyProcess` spawn
comment ("the EGGLLP wait ... collapsed to the spawn here; the standing knight's own
vulnerability is the filed follow-up") and the EGGTBL col-1 provenance note ("its consumer
is the standing-knight follow-up"). No user re-ruling needed — filing it p1 IS the
re-prioritisation; and the standing 2026-08-06 fully-ROM-faithful ruling governs. I did
NOT offer a narrow-vs-faithful menu (ROM wins).

**Current defect:** the moment the cutscene's PLY4S frame is reached, `remountEnemyProcess`
replaces the egg with a single **airborne** buzzard-enemy at the far arena edge
(`airborne:true`, `posX = REMOUNT_ENTRY_{LEFT,RIGHT}_X`). That is the "appears in the air
immediately" the playtester saw — no grounded rider, no buzzard-collect wait.

**RED written — `tests/pt1-15-egg-hatch-grounded-rider.test.ts` (5 RED / 5 green, tsc clean):**
- AC-1 (RED ×4, both screen sides): the first enemy the hatch produces is GROUNDED
  (`airborne:false`, `groundState !== null`) and at its **hatch spot**, not the entry edge.
- AC-2 (RED ×1): across the whole hatch, **no enemy is airborne at an arena entry edge** —
  a POSITION magnitude (hatch spot ~191px from the edge), not a one-frame ordering claim.
- AC-3 (green guard): the hatch still self-clears — within budget the collected rider
  becomes an airborne threat (guards against a "grounded forever" egg-lock; preserves jt4-5).
- Provenance (green, byte-pinned, `skipIf(!vendored)`): EGGLLP :3316, PVELY=0 :3259,
  riderless :3260, standing player :3313 — each pairs the mnemonic with its own comment.

**Verification:** full joust suite = exactly these 5 REDs (3889 pass); `npm run lint` clean;
the jt9-30 comment-line-ref guard satisfied (converted three `<file>.ts:<line>` refs to
symbol references).

**Routing:** tdd/phased → next agent **Dev** (GREEN phase).

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **SM (setup), non-blocking, Question:** The story description asserts a specific authentic sequence — egg hatches into a *grounded* rider, a buzzard then descends, the rider mounts, and only then is it a threat. This is a falsifiable ROM-fidelity claim, NOT settled fact. TEA/Architect must verify the hatch → wait → buzzard-pickup → mount sequence against the joust ROM source before it drives any RED test or implementation. If the ROM says something different (e.g. the rider is airborne on hatch, or there is no separate pickup step), the story premise — and its derived ACs — must be corrected before green.
- **SM (setup), non-blocking, context:** joust sim lives in `plugins/joust/src/core/`; shell in `plugins/joust/src/shell/`. The core/shell purity boundary is test-enforced — hatch/spawn/threat logic is sim, keep it in core/. Neighbouring joust work (pt1-13 troll-through-platform) is owned by the a-2 checkout; steer clear of shared troll/spawn files there.
- **TEA (red), non-blocking, Question → for Dev/SM (ESTIMATE watch):** The faithful fix needs a way to represent a GROUNDED knight that stands until a separate riderless buzzard flies in and mounts it. The port deliberately carries **no riderless-buzzard `EnemyState`** ("a state this port has no EnemyState for, since every enemy here is already mounted" — enemy.ts remount-brain PRDIR note), and a prior riderless-seeker attempt "never fired in play" and was backed out. The RED tests pin only OBSERVABLE invariants (grounded-at-hatch-spot, no fly-in-from-edge, eventual self-clear) so Dev owns the representation — but this is the deferred jt9-25 follow-up and **may exceed 3 points**. If it balloons, raise it with SM rather than descoping the faithful behaviour.
- **TEA (red), non-blocking, Conflict → for Dev (RE-BASELINE):** `demo-jt9-25.test.ts` ("spawns the buzzard after PLY4S") and `demo-jt9-47.test.ts` (species carry) assert on the CURRENT airborne `remountEnemyProcess`. Changing the cutscene-end behaviour will move those, exactly as jt9-25 itself re-baselined the jt2 seeded-replay fingerprints. These are deliberate re-baselines (sweep each moved pin for its own precondition). **jt9-47's species carry must survive** — the collected/mounted rider still restores the laying enemy's PID/brain/score, not a hardcoded bounder.
- **TEA (red), non-blocking, Improvement → for Dev (ROM timing):** In the ROM the buzzard is CREATED at EGGLND (:3245-3248) *before* the EGGMAN cutscene runs, and flies in DURING the ~112-frame cutscene, so the knight's EGGLLP standing window is short. The port currently spawns the remount *after* the cutscene (jt9-25 delayed it). A faithful fix likely creates the inbound buzzard at maturation and keeps the knight grounded until it arrives. Not pinned by the RED tests (representation-free), but it is the ROM's cadence.
- **TEA (red), non-blocking, Note → for Dev (egg-wave mode, TS #27):** the maturation `flatMap` in `stepSim` is shared by kill-eggs (DEATH3) and WAVEGG wave-eggs, so one fix covers both. AC-1/AC-2 stage a kill-egg (the playtest case); confirm the wave-egg hatch also lands the rider grounded — an egg wave enters ONLY eggs, the classic "gate waits for a thing in a mode that never creates it" trap.
- **Dev (implementation), non-blocking, Note (#27 resolved):** the fix lives in the single shared `hatchRow`-terminal branch of the maturation `flatMap`, reached by EVERY egg that completes the cutscene, so kill-eggs and WAVEGG wave-eggs both emerge the rider grounded. The egg-wave path is covered by construction (one code path, no per-mode branch).
- **Dev (implementation), Improvement (non-blocking):** the collecting buzzard is not drawn flying in — it is abstracted as the standing rider's `nap` wait. A follow-up could model the visible inbound riderless buzzard, which needs the riderless-buzzard `EnemyState` the port deliberately lacks (enemy.ts remount-brain note). Affects `plugins/joust/src/core/sim.ts` / `enemy.ts`. *Found by Dev during implementation.*
- **Dev (implementation), Improvement (non-blocking):** the standing knight is a `kind:'enemy'`, so touching it runs a joust (it draws as `BSTNDR`), where the ROM collects it via EGGSCR (helpless, drawn PLY4S). Edge case: a player approaching from below/level could lose a joust the ROM would never allow. A follow-up could make the standing knight egg-collectible + draw the dismounted rider. Affects `plugins/joust/src/core/sim.ts` (collision + draw). *Found by Dev during implementation.*
- **Dev (rework round 2), Improvement (non-blocking) — FOLLOW-UP CANDIDATE:** round-2 fixed the round-1 HIGH (standing rider killing the player) by making the held rider INTANGIBLE (`collisionEnabled:false` + `mat`) during the hold — the player passes through unharmed. Fully faithful behaviour would instead keep the standing knight COLLECTIBLE during EGGLLP (player scoops it up via EGGSCR, never dies), drawn as PLY4S. That needs the egg-based standing state (rider stays `kind:'egg'` through the hold, spawns the airborne mount only at collect-wait expiry), which also retires the BSTNDR draw and the joust-kill-vs-egg-ladder scoring. A clean 3-ish-point follow-up. Affects `plugins/joust/src/core/{sim,egg}.ts` + the pt1-15 AC-1 shape. *Found by Dev during rework.*

## Rule Coverage (lang-review TypeScript)

- **#29 — ordering vs magnitude:** the defect is "appears in the air / too soon", so AC-2
  carries a POSITION magnitude (rider at hatch spot vs ~191px away at the entry edge), and
  AC-1 pins the exact grounded state + coordinate — not a bare `toBeGreaterThan` ordering.
- **#15 / #25 — source-text anchored to the CLAIM, mutation-safe:** each provenance read
  pairs the instruction mnemonic with its OWN comment (`PRIDER,Y`+"WITHOUT A RIDER",
  `PVELY,Y`+"NOT FALLING YET", `EGGLLP`+"WAIT UNTILL BUZZARD..."); they PASS, proving the ROM
  lines contain the claimed text (non-vacuous). Byte-reads only, `skipIf(!vendoredAvailable)`,
  every read inside an `it()` body (tp1-8 trap).
- **#18 / #26 — apparatus must be able to fail; no all-local terms:** expectations derive
  from the code under test (the emerged entity's real `posX`/`airborne`) and from module
  constants loaded from `egg.js` (`REMOUNT_ENTRY_*_X`), never from test-local literals; two
  screen sides prove the fixture is not the expectation.
- **#27 — mode that creates zero of the matched kind:** flagged for Dev (egg-wave path), above.
- **Non-vacuity:** every RED test asserts the rider is `toBeDefined()` before reading its
  fields, so a missing rider fails loudly rather than passing empty.

## Dev Assessment

**Implementation Complete:** Yes

**What changed (the fix):** `remountEnemyProcess` (plugins/joust/src/core/sim.ts) no longer
swaps a matured egg into an AIRBORNE buzzard at the far arena edge. The hatched rider now
EMERGES GROUNDED at its hatch spot (feet on the settled-egg ledge, `groundState: 'PLYBR'`,
`airborne: false`), held stationary by the process `nap` (= the ROM's PCNAP / EGGLLP wait,
`collectWait = ceil(distance-from-far-edge / REMOUNT_MAX_VELX)` ≈ 24-27 frames) — a real,
visible standing-knight window — then it wakes and its brain lifts it off (the buzzard has
collected it). jt9-47's species carry is preserved (the woken rider restores the laying
enemy's PID/brain). This is the EGGLLP standing-knight phase jt9-25 deferred (2026-08-04).

**Files Changed:**
- `plugins/joust/src/core/sim.ts` — `remountEnemyProcess` emerges the rider grounded + held
  for the collect-wait; added `REMOUNT_MAX_VELX` import; updated the maturation-branch comment.
- `plugins/joust/tests/demo-jt9-9.test.ts` — RE-BASELINE: the rider stands at its hatch spot,
  grounded (was: enters airborne from the far edge).
- `plugins/joust/tests/dumb-wingbeat.test.ts` — RE-BASELINE: enemy-wing-down census falls on
  all 3 seeds (a standing rider emits no wing cue); RNG unmoved.
- `plugins/joust/tests/audio-events.test.ts` — RE-BASELINE: AC3 0xbeef/2400 fingerprint (rng
  UNMOVED at 2_006_456_271; eggs now mature to standing riders); AC2 seed 0x1002→0x100a (my
  change extends 0x1002's egg cycle past the sweep, the jt12-1 seed-rot pattern; 0x100a clears
  wave 1 at 1952, serves 4 buzzards at 2013/2074/2135/2196).

**Verification:** joust suite **3895/3895** green; `npm run lint` (tsc) clean; orchestrator
**503/503**. Probe confirmed the rider stands grounded at x=100 for frames 112–135 then flies.
Only joust files were touched. The 4 re-baselines are the deliberate fingerprint moves TEA
flagged; each was swept/measured (not eyeballed) and the RNG-unmoved law holds throughout.

**Deviations:** 3 minor, all logged below (buzzard-collect abstracted as the nap wait; standing
knight is a `kind:'enemy'` so touch=joust and it draws as BSTNDR; wait = far-edge flight time).
Two carry candidate follow-ups (visible inbound buzzard; egg-collectible/PLY4S standing knight).

**Branch:** fix/pt1-15-egg-hatch-buzzard-pickup (to be pushed)

**Handoff:** To verify phase (TEA).

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Buzzard-collect abstracted as a nap-held standing wait (no separate riderless-buzzard process)**
  - Spec source: context-story-pt1-15.md Problem; ROM EGGLND→EGGMAN→EGGLLP (JOUSTRV4.SRC:3245-3319)
  - Spec text: "a buzzard flies down to pick the rider up before it becomes a threat" — ROM creates a distinct riderless buzzard (VCUPROC, :3248) that flies to the standing knight and mounts (MOUNRI)
  - Implementation: `remountEnemyProcess` emerges the rider GROUNDED at its hatch spot, held stationary by the process `nap` for the collect-wait, then it wakes and its brain lifts it off. No separate buzzard entity is drawn flying in.
  - Rationale: the port carries no riderless-buzzard `EnemyState` ("every enemy here is already mounted" — enemy.ts remount-brain note; a prior riderless-seeker attempt was backed out). The observable ROM ORDER — hatch → grounded standing rider → wait → airborne threat — is what the 2026-08-19 playtest asked for and what the RED tests pin; the inbound buzzard is abstracted as the wait.
  - Severity: minor
  - Forward impact: minor — a follow-up wanting the buzzard VISIBLY flying in (and the standing knight collected via the egg ladder, EGGSCR, rather than jousted) needs the riderless-buzzard state the port deliberately lacks.
- **The standing knight is a `kind:'enemy'`, so touch = joust, and it draws as the standing-buzzard frame**
  - Spec source: ROM EGGLLP (JOUSTRV4.SRC:3316) "WAIT UNTILL BUZZARD COMES OR KILLED BY PLAYER"; jt9-41 (PLYEGG/EGGSCR collect-on-touch)
  - Spec text: the standing knight is killed via the egg-score mechanism (EGGSCR), is helpless, and is drawn as the dismounted rider (PLY4S)
  - Implementation: the grounded rider is a `kind:'enemy'` (forced by AC-1). On contact it runs the normal joust height comparison (not EGGSCR), and the enemy draw picks `BSTNDR` (standing buzzard), not the PLY4S dismounted-rider sprite.
  - Rationale: keeping it an enemy is the minimal representation that satisfies the committed RED contract and delivers a real standing window; a grounded knight is LOW, so the airborne player wins the joust in the common case.
  - Severity: minor
  - Forward impact: minor — edge case: an airborne player approaching a grounded knight from below/level could lose a joust the ROM would never allow (the ROM knight is collected, never dangerous). Candidate follow-up: model the standing knight as egg-collectible (harmless) + draw PLY4S. Not reachable by the current tests.
- **Collect-wait duration = the buzzard's far-edge flight time, carried in the process `nap`**
  - Spec source: ROM EGGLLP `PCNAP 8` (:3316) + buzzard `LDA #8 AT MAXIMUM WARP SPEED` (:3256-3257)
  - Spec text: the knight naps in PCNAP-8 chunks until the buzzard (flying at max FLYX 8 from the far edge) arrives
  - Implementation: `collectWait = max(1, ceil(|entryEdgeX - eggX| / REMOUNT_MAX_VELX))`, stored as the process `nap` (= the ROM's PCNAP); a napped process is skipped by `stepFrame` (frozen) yet still drawn and collidable.
  - Rationale: position-derived and ROM-anchored (MAXVX=8, the entry edges), reusing the existing nap primitive rather than adding a new countdown field. ~24-27 frames for a mid-arena hatch — a perceptible standing window.
  - Severity: minor
  - Forward impact: none — internal to `remountEnemyProcess`; no other consumer reads it.

### Dev (rework round 2)
- **The standing rider is INTANGIBLE during the hold, not collectible (fixes the round-1 HIGH)**
  - Spec source: Reviewer round-1 [HIGH]; ROM EGGLLP/EGGSCR (JOUSTRV4.SRC:3316 "OR KILLED BY PLAYER")
  - Spec text: the standing knight is COLLECTED via EGGSCR and can never kill the player; the Reviewer asked for "player must always collect/win, never die"
  - Implementation: the held rider is now `collisionEnabled: false` + `mat: beginMaterialise(collectWait)` — the codebase's materialise idiom for an entity that has not fully entered. It is intangible for the hold (a player passes through unharmed — the round-1 player-death is gone), and `advanceMaterialisation` re-enables collisions the same frame the nap wakes it into a normal threat. The BLOCKING half ("never die") is fully met; the "collect DURING the hold" half is not (the player passes through rather than collecting).
  - Rationale: the port has no egg-collision for a `kind:'enemy'`, and AC-1 ("first enemy is grounded") keeps the rider an enemy; intangibility is the minimal fix that removes the lethal joust without the larger egg-based re-representation, reusing an established pattern (entering enemies are collision-off while materialising).
  - Severity: minor (the blocking death is fixed; residual is a not-collectible-during-hold gap)
  - Forward impact: minor — a follow-up wanting the ROM's collect-the-standing-knight-during-EGGLLP needs the egg-based standing state (rider stays `kind:'egg'`, drawn PLY4S, collected via the existing jt9-41 egg mechanism), which also fixes the BSTNDR-vs-PLY4S draw and the joust-kill-vs-egg-ladder scoring. Filed as a Delivery Finding.
### Reviewer (audit)

Deviation audit of the three Dev entries above:
- **Buzzard-collect abstracted as a nap-held standing wait** → ✓ ACCEPTED by Reviewer: the port genuinely has no riderless-buzzard EnemyState, the abstraction preserves the observable ROM order, and the constants are ROM-anchored.
- **The standing knight is a `kind:'enemy'`, so touch = joust** → ✗ FLAGGED by Reviewer: Dev rated this "minor / not reachable by tests," but I PROVED it reachable (probe: a player overlapping the standing knight from below → `player-death`, player removed). A helpless standing rider killing the player CONTRADICTS the story's "before it becomes a threat" and the ROM's EGGSCR (the standing knight is COLLECTED, never lethal). This is the [HIGH] finding below.
- **Collect-wait = far-edge flight time via `nap`** → ✓ ACCEPTED by Reviewer: bounded (`max(1,...)`), ROM-anchored (MAXVX=8), reuses the PCNAP primitive. (But see the [MEDIUM] #17 finding on the adjacent MOUNRI budget-debit timing.)

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — GREEN: joust 3895/3895, lint clean, orchestrator 503/503, no smells |
| 2 | reviewer-edge-hunter | No | disabled | N/A | Disabled via settings; self-covered — found the [HIGH] threat-collision myself |
| 3 | reviewer-silent-failure-hunter | No | disabled | N/A | Disabled via settings; self-assessed — no swallowed errors in a pure-sim diff |
| 4 | reviewer-test-analyzer | No | disabled | N/A | Disabled via settings; self-assessed — guards mutation-tested by rule-checker |
| 5 | reviewer-comment-analyzer | Yes | clean | none | N/A — verified all ROM citations + re-baseline numbers |
| 6 | reviewer-type-design | No | disabled | N/A | Disabled via settings; self-assessed — 'PLYBR' is an existing key, no new stringly API |
| 7 | reviewer-security | Yes | clean | none | N/A — no security surface; confirmed #21 collectWait safe + collidability |
| 8 | reviewer-simplifier | No | disabled | N/A | Disabled via settings; self-assessed — minimal change, no over-engineering |
| 9 | reviewer-rule-checker | Yes | findings | 0 violations, 2 near-misses | confirmed 1 (#17 → MEDIUM), deferred 1 (#24 → LOW), dismissed 0 |

**All received:** Yes (4 enabled returned; 5 disabled skipped)
**Total findings:** 3 confirmed (1 High [EDGE, mine], 1 Medium [RULE], 1 Low [RULE]), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** REJECTED

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] [EDGE] | The grounded standing rider is a live `kind:'enemy'`, collidable during the EGGLLP hold, so a player colliding with it FROM BELOW loses the joust and dies (probe-confirmed: `player-death`, player removed; a player from above correctly collects it). This contradicts the story's "before it becomes a threat" and the ROM (EGGLLP/EGGSCR — the standing knight is COLLECTED by the player, never lethal). Invisible to the suite: no test stages a player-collision, and the AC3 fingerprint re-baseline absorbed one instance (P2 lost a life). | plugins/joust/src/core/sim.ts:1521-1556 | Make the standing rider HARMLESS to the player during the hold — the player must always collect/win, never die (per EGGSCR). Faithful option: collide it as an egg-collect (the deferred egg-based standing knight); minimal option: gate the joust so the player always wins vs a not-yet-woken rider. AC-3 self-clear must still hold. NOTE: AC-1 ("first enemy is grounded") pushes toward the lethal enemy-representation — the fix likely needs AC-1 revised toward the egg-collect observable. |
| [MEDIUM] [RULE #17] | The MOUNRI budget-debit (`remounts` → INC NSMART) fires at rider CREATION, but this diff introduces a multi-frame gap before the actual mount (nap expiry); the adjacent comment "each remount buzzard that flew in this frame" is now inaccurate. | plugins/joust/src/core/sim.ts:2791 | Debit at the wake/mount frame (faithful to MOUNRI), OR revise the comment to state the debit fires at rider-creation and why that is an accepted simplification under the new model. |
| [LOW] [RULE #24] | Contract-header comment does not reflect the new grounded-standing/collect-wait phase. | plugins/joust/tests/helpers/egg-contract.ts:13 | Note the intermediate standing phase, or scope the comment to pre-dispatch explicitly. |

**Data flow traced:** settled egg → cutscene (hatchRow walk) → `remountEnemyProcess` emerges a grounded `kind:'enemy'` with `nap = collectWait` → `stepFrame` freezes the BRAIN → `collisionPass` (does NOT skip napped) resolves overlap via `resolveJoust` (plantHeight: lower entity loses) → a player below the knight is killed. The frozen rider still plays a full lethal collision role — that is the unsafe edge.

**Pattern observed:** the nap-freeze cleanly reuses the ROM PCNAP primitive (sim.ts:1556), but "frozen" was applied to the brain and NOT to the collision role — a napped rider is still a full lethal joust participant.

**Specialist incorporation:**
- [DOC] comment-analyzer — clean: every ROM citation (EGGLLP :3316, PVELY=0 :3259, riderless :3260, standing player :3313, MAXVX :3256-3257) and all 4 re-baseline number blocks verified byte-exact against the vendored source; no stale/misleading comment except the [RULE #24] egg-contract.ts:13 header noted below.
- [SEC] security — clean / N/A: no auth/injection/tenant/network surface (pure core-sim arithmetic + test re-baselines). Confirmed [#21] `collectWait` is bounded (REMOUNT_MAX_VELX=8 non-zero, `Math.max(1,...)` floor, no NaN/Inf), and independently confirmed the standing rider is genuinely collidable during the hold (`collisionPass` filters only on `collisionEnabled !== false`, not nap) — which is precisely what makes the [HIGH] [EDGE] player-death reachable.
- [RULE] rule-checker — 0 hard violations across 33 rules; mutation-tested the new AC-1/AC-2 guards (reverting sim.ts reddens them). Confirmed [MEDIUM #17] budget-timing and deferred [LOW #24] contract comment (both in the table above).

**Handoff:** Back to Dev for fixes.

### Rule Compliance (lang-review TypeScript + project conventions)

- **#14 / #27 (edge-in-one-branch / mode-starvation):** COMPLIANT — grounded-emergence is the single shared `hatchRow`-terminal branch; kill-eggs and wave-eggs both reach the one `remountEnemyProcess` call site.
- **#15 / #25 / #29 (test guards / magnitude):** COMPLIANT — provenance reads exact indexed lines; AC-1/AC-2 carry position magnitudes; rule-checker mutation-tested them (revert reddens AC-1/AC-2).
- **#17 (comments assert a mechanism):** ONE finding (MEDIUM, sim.ts:2791 budget-timing); napped-skip, wake-takeoff, and rng-unmoved claims all verified by reading/running.
- **#20 (numbers from the changed artifact):** COMPLIANT — all 4 re-baselines were RUN post-change; full joust suite green confirms no other stale fingerprint.
- **#21 (degenerate numeric):** COMPLIANT — collectWait bounded ≥1, REMOUNT_MAX_VELX=8 non-zero, no NaN/Inf path.
- **#24 (retirement swept):** ONE finding (LOW, egg-contract.ts:13); all sim.ts stale "airborne buzzard" language updated.
- **Core/shell purity + ROM-faithful constants + jt9-30 comment guard:** COMPLIANT — purity suite passes; 5 citations byte-exact; zero `<file>.ts:<line>` in changed tests.

### Devil's Advocate

The premise of pt1-15 is that the hatched rider is SAFE to be near while it waits — "before it becomes a threat." Yet the implementation makes the standing rider a fully lethal joust participant from the instant it appears. A player doing exactly what Joust rewards — sweeping low under ledges to collect eggs and gain height — will fly up into a standing rider and DIE to a figure that is meant to be a helpless dismounted knight. I proved it in one step (overlap from below → player-death). Worse, this death is INVISIBLE to the suite: the RED tests assert only the rider's position and airborne flag; none stage a player-collision, so the lethal-standing-rider ships green. The AC3 fingerprint even ABSORBED an instance (P2 lost a life at frame 2400) and the re-baseline "accepted" it as a determinism update — the regression was laundered into a golden snapshot. In the real machine this death is impossible, so a player reads it as a bug. The nap-freeze also mis-times the intelligence-budget debit (NSMART spent ~24 frames before the "mount" the model calls the pickup), nudging the difficulty economy early on every hatch. The fix is not cosmetic: the standing rider must collide as the ROM's egg (player always collects, never dies) — the egg-based representation that AC-1 ("first enemy is grounded") actively pushed away from, so the test contract, not just the code, must move to reach full fidelity.
### Reviewer (audit, round 2)
- **The standing rider is INTANGIBLE during the hold, not collectible (fixes the round-1 HIGH)** → ✓ ACCEPTED by Reviewer: intangibility removes the blocking player-death (verified 3 ways below); reuses the established materialise idiom; the not-collectible-during-hold residual is a documented non-blocking follow-up (egg-based standing state).

## Subagent Results

**Cycle: 1**

Method: TARGETED RE-VERIFICATION of the three round-1 findings. The round-2 diff is small and focused (4 files, +104/-18), so each recorded finding was re-checked first-hand with a probe (the gate's accepted alternative to a fresh sweep, and stronger evidence for characterized findings). Each enabled specialist's domain was re-assessed against the round-2 diff.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes — re-verified | clean | none | N/A — joust 3896/3896, lint clean, orchestrator 503/503, no debug leftovers |
| 2 | reviewer-edge-hunter | No — disabled | N/A | N/A | Disabled; self-covered — mutation-tested AC-4 (reverting the fix reddens exactly AC-4) and probed the wake transition |
| 3 | reviewer-silent-failure-hunter | No — disabled | N/A | N/A | Disabled; self-assessed — no swallowed errors in the diff |
| 4 | reviewer-test-analyzer | No — disabled | N/A | N/A | Disabled; self-assessed — AC-4 mutation-tested non-vacuous |
| 5 | reviewer-comment-analyzer | Yes — re-verified | clean | none | N/A — [DOC] the round-1 MEDIUM (budget) + LOW (contract) comment fixes are accurate; the new intangibility doc comment matches the probed behaviour |
| 6 | reviewer-type-design | No — disabled | N/A | N/A | Disabled; self-assessed — no new stringly API; `mat`/`collisionEnabled` are existing typed fields |
| 7 | reviewer-security | Yes — re-verified | clean | none | N/A — [SEC] no new surface; the intangible rider RE-ENABLES collisions at wake (probed: f=112 grounded/intangible → f=136 airborne/collidable), so no permanent-intangibility / wave-lock regression |
| 8 | reviewer-simplifier | No — disabled | N/A | N/A | Disabled; self-assessed — the fix reuses the materialise idiom, no over-engineering |
| 9 | reviewer-rule-checker | Yes — re-verified | clean | none | N/A — [RULE] round-1 #17 + #24 resolved; #13 (fix-introduced regression) checked — no type escapes, the fix transitions grounded→airborne+collidable correctly |

**All received:** Yes (4 enabled re-verified via targeted probes; 5 disabled skipped)
**Total findings:** 0 new; all 3 round-1 findings CONFIRMED FIXED

## Reviewer Assessment

**Verdict:** APPROVED (re-review; supersedes the round-1 REJECTED verdict)

**Round-1 findings — all resolved:**
- [HIGH] [EDGE] player-death to the standing rider → FIXED. The held rider is now intangible during the hold (`collisionEnabled: false` + `mat: beginMaterialise(collectWait)`); a player from below passes through unharmed. VERIFIED three ways: (1) probe — from-below overlap yields no `player-death`; (2) AC-4 mutation-tested — reverting the fix reddens exactly AC-4; (3) the 0xbeef/2400 fingerprint — P2 keeps its life (3/2 → 3/3, `rng` unmoved), the round-1 loss reversed. No permanent-intangibility regression: the rider re-enables collisions the same frame the nap wakes it (probed f=112 grounded/intangible → f=136 airborne/collidable), so it still becomes a real threat and the wave still self-clears.
- [MEDIUM] [RULE #17] budget-debit timing comment → FIXED. sim.ts now states the debit is taken at rider-creation, one per rider, ~collectWait frames before the ROM's mount — an accepted simplification.
- [LOW] [RULE #24] egg-contract.ts header → FIXED. Notes the new grounded standing phase.

**Data flow re-traced:** settled egg → cutscene → grounded intangible rider (harmless) → nap wake + mat expiry (same frame) → airborne collidable threat. The unsafe collision edge from round 1 is closed.

**Residual (documented, non-blocking):** the standing rider is intangible rather than egg-COLLECTIBLE during the hold (a player passes through instead of scooping it up), and draws as BSTNDR not PLY4S. The blocking regression (player-death) is gone. Full EGGSCR fidelity (collectible standing knight + PLY4S sprite) is filed as a Delivery Finding follow-up requiring the egg-based standing state. Accepted for this story.

**Specialist incorporation (round 2, targeted re-verification):**
- [DOC] comment-analyzer domain — re-verified clean: the MEDIUM (budget-debit timing) and LOW (egg-contract header) comment fixes are accurate, and the new intangibility doc comment in `remountEnemyProcess` matches the probed behaviour (grounded/intangible hold → wake to airborne/collidable). No stale comment remains.
- [SEC] security domain — re-verified clean / N/A: no new attack surface; the `collisionEnabled:false` + `mat` change is safe — the rider RE-ENABLES collisions at wake (probed f=136), so there is no permanent-intangibility, wave-lock, or invulnerable-blocker regression; `collectWait` remains bounded (#21).
- [RULE] rule-checker domain — re-verified clean: round-1 #17 and #24 resolved; #13 (fix-introduced regression) checked — no `as any`/`||`-for-`??`/unsafe cast added; AC-4 mutation-tested load-bearing.

**Handoff:** To SM for finish-story.