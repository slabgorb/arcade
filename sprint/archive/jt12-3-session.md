---
story_id: "jt12-3"
jira_key: "jt12-3"
epic: "jt12"
workflow: "tdd"
---
# Story jt12-3: Wire the transporter player-side service queue + SELARE occupancy safety

## Story Details
- **ID:** jt12-3
- **Jira Key:** jt12-3
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/jt12-3-wire-transporter-player-queue-selare
- **PR:** https://github.com/slabgorb/arcade/pull/481 (MERGED into develop, merge commit 19658616)
- **Branch Strategy:** gitflow (feat/jt12-3-wire-transporter-player-queue-selare)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-16T21:05:05Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-16T18:30:00Z | 2026-08-16T18:46:04Z | 16m 4s |
| red | 2026-08-16T18:46:04Z | 2026-08-16T18:59:56Z | 13m 52s |
| green | 2026-08-16T18:59:56Z | 2026-08-16T20:38:38Z | 1h 38m |
| review | 2026-08-16T20:38:38Z | 2026-08-16T20:47:48Z | 9m 10s |
| red | 2026-08-16T20:47:48Z | 2026-08-16T20:50:56Z | 3m 8s |
| green | 2026-08-16T20:50:56Z | 2026-08-16T20:55:14Z | 4m 18s |
| review | 2026-08-16T20:55:14Z | 2026-08-16T21:05:05Z | 9m 51s |
| finish | 2026-08-16T21:05:05Z | - | - |

## Delivery Findings

- **Double-serve bug (found + fixed during GREEN).** The first cut of the player-queue serve
  re-queued the knight the SAME frame it was served: `due` is computed from the pre-serve
  sets, so the take-block ran again after the serve-block spliced the knight → it materialised
  TWICE (a duplicate `player#N` process). Caught by `audio-events.test.ts` AC3's rng
  fingerprint (`procs: …player#1,player#1,player#2,player#2`). Fixed with a `livePlayerNow`
  guard in the take-block (game.ts) — a knight the serve just spliced this frame is not
  re-queued. The rng cursor was UNMOVED throughout (my transforms are pure), which is what
  isolated the defect to play, not randomness.

## Design Deviations

- **The occupancy AC's premise is refuted by the ROM (approved by the user: implement the
  faithful mechanic in full).** jt12-3's title says "gate serveEnemy on
  spawnProceeds(scanAreas(occupantYs), tier) so a materialisation DEFERS into an already-crowded
  third." Reading JOUSTRV4.SRC:5619-5715 for GREEN: (1) the empty-third SELARE census +
  preference is on the PLAYER re-create path (`CREPLY`), NOT the enemy — enemies take their
  VRAND pad via `FREET` with no census; (2) it NEVER defers on occupancy — it PREFERS a pad in
  an empty third (bottom TR4 → middle TR2/TR3 → top TR1) and FALLS THROUGH to the default create
  when no third is empty (`70$` → `CREALL`/`GOTTR`), so a knight is never starved. The served
  knight lands ON the pad (`GOTTR: LDD TPOSX,X → PPOSX`, :5710-5715). Built the faithful
  mechanic: `selectRespawnPad` (transporter.ts) + game.ts respawn wiring; the re-materialise
  now lands on an empty-third pad instead of the fixed `PLAYER1_SPAWN`/`PLAYER2_SPAWN`
  mid-screen point (which JOUSTRV4.SRC:1023/1039 shows is the FIRST-ever create only, never the
  re-create — retiring jt4-5's respawn-at-fixed-spawn fidelity gap). The refuted "defer" test
  group (`transporter-player-queue-wiring-jt12-3.test.ts`) was rewritten to pin the ROM
  behaviour (empty-third landing, preference order, never-starve). The story TITLE still asserts
  the refuted "gate serveEnemy / defers" premise — a later reader should trust this deviation
  and the tests, not the title. See [[joust-crep-respawn-transporter-pad]].

- **Fleet-wide golden re-baseline (12 goldens, 5 suites).** The faithful respawn (on a pad, +1
  frame CRELP delay) reshapes seeded-play trajectories, so downstream frame/fingerprint goldens
  shifted: `audio-events` (re-entry 958→959, 0x1002 advance 1650→5525, two fingerprints —
  rng UNMOVED), `audio-transporter-split` (re-entries +1: 605→606/958→959/224→225), `audio-thud`
  (seed 0x1035@505 stopped producing a clean thud → re-swept [0x1000,0x1120) to 0x1001@1713 by
  the test's own rule), `dumb-wingbeat` (AC5 player#2 lands on TR1; AC6 wing counts),
  `game.test` (P2's first kill 315→406, window widened). Each is a play-cascade, not a
  behaviour break; `demo-source`'s colour-denylist false-positive from a `#100/#200` ROM-operand
  comment was reworded.

## Sm Assessment

**Story:** jt12-3 — wire the transporter player-side service queue + SELARE occupancy safety (8pt, joust, TDD). Epic jt12's final story; predecessors jt12-1 and jt12-2 are both `done`.

**Board probes (clean):** No remote branch for jt12-3 before claim; no sibling `.session/` files across checkouts. No contention.

**Premise verified against the current tree (facts recorded in the context Technical Approach):**
- WIRING story, not build — every pure function it wires already exists in `plugins/joust/src/core/transporter.ts` (`scanAreas` :139, `spawnProceeds` :149, `takePlayerNumber` :179, `serveEnemy` :207, `nextServed` :216, SELARE/`selectArea` :95-141), shipped by jt12-1/jt12-2.
- Line-anchor drift: the title's `respawnPlayerProcess (sim.ts:630)` is actually `plugins/joust/src/core/sim.ts:644` (14 lines). ROM anchor `JOUSTRV4.SRC:5615-5676` is correct.
- Partial wiring present: `sim.ts` already imports `serveEnemy` (:121) and calls it (:1440). Work completes the players-first arbitration and adds the `spawnProceeds(scanAreas(occupantYs), tier)` occupancy gate.

**AC status:** epic block carries no `acceptance_criteria` field; the four assertions are embedded in the title (route through arbitration; gate on spawnProceeds; assert players-first branch; assert a crowded third defers a spawn). TEA to formalise these as the RED targets.

**Claim pushed:** commit on `feat/jt12-3-wire-transporter-player-queue-selare`, branch pushed to origin (sibling probe now lights up); story stamped `in_progress`.

**Handoff:** → TEA (Leeloo) for RED. Write failing tests proving (a) `respawnPlayerProcess` routes through `takePlayerNumber`+`nextServed` with players served before enemies, and (b) `serveEnemy` defers a spawn when `spawnProceeds(scanAreas(occupantYs), tier)` reports the target third already crowded. Confirm the existing `serveEnemy` call site rather than assuming nothing is wired.
## Tea Assessment

RED phase complete. New failing suite: `plugins/joust/tests/transporter-player-queue-wiring-jt12-3.test.ts` (4 tests: 3 RED wires + 1 green control).

**RED evidence (`npx vitest run --project joust transporter-player-queue-wiring-jt12-3`):** 3 failed | 1 passed. Each failure is on the WIRE line; every staging-validity assertion PASSED (the arrival was really serve-eligible today; P2 really re-entered), so each red is the missing wire, not a mis-stage.

**What the tests pin (both mechanics through their owning public seam):**

1. **SELARE occupancy gate — `stepSim` (`serveEnemies`).**
   - RED: a pending arrival drawn onto TR2 (middle third) with a crowded MIDDLE third must DEFER (stays pending, not materialised). Today serveEnemies has no occupancy gate → it serves → red.
   - GREEN control: the same arrival with MIDDLE empty (crowd moved to the TOP third) still serves — kills an "always-defer"/"wrong-third" mutant. Green today and after.

2. **Player-side queue — `stepGame` (game.ts respawn block).** Staged on the proven game-jt4-5 partner-kill (P1 kills P2, P2 keeps 2 lives → CREP re-create due).
   - RED: a re-entering knight draws a player number — `npserv` climbs past 0 (`takePlayerNumber`). Today no player path touches the queue → npserv pinned at 0.
   - RED: the knight is served through the players-first branch — `lpserv` climbs past 0. `lpserv` moves only via `servePlayer`, reachable only when `nextServed(q) === 'player'`, so lpserv>0 is direct proof the now-live players-first branch fired. Corroborated by observing `nextServed === 'player'` during the re-entry.

**Key finding for Dev (the non-obvious shape of this wire):**
- The enemy-side "players first" guard ALREADY EXISTS and is correct — `enemyTurn`'s `npserv === lpserv` clause defers enemies whenever a player holds an unserved number. It is simply DEAD because no player ever takes a number. The player-side wire is therefore *only* "make the re-entering knight draw NPSERV and be served through CRELP"; you do NOT need to add a players-first check to serveEnemies — it's there. (ROM: CREP1/CREP2 → LDA NPSERV → BRA CRELP, JOUSTRV4.SRC:5615-5618; the re-created player waits its turn in the same deli-counter, served ahead of enemies.)
- The respawn lives in `game.ts stepGame` and runs AFTER `stepSim` (which serves enemies). So the coupling threads through `sim.serviceQueue`: on re-entry, `takePlayerNumber(serviceQueue)`; splice `respawnPlayerProcess(id)` only when `nextServed(serviceQueue) === 'player'`, then `servePlayer`. A knight that just drew its number waits ≥1 frame in CRELP — that is what makes `nextServed === 'player'` observable and the enemy defer.
- **Blast-radius warning:** adding the SELARE occupancy gate to `serveEnemies` will change enemy arrival TIMING and can redden existing golden-timeline suites (`demo-jt11-4`, `transporter-occupancy-jt11-9`'s `enterViaPads` golden). Reconcile those in GREEN — a changed golden arrival frame is expected, not a regression, but confirm each is timing-only.

**Rule Coverage (lang-review/typescript.md):** This is a WIRING story — it adds no new types, constructors, or enums, so there are no new type-invariants to pin with rule tests; the behavioral suite IS the contract. Applicable checklist items land on Dev's `occupantYs`/queue threading, not on tests: use `??` (not `||`) around the optional `serviceQueue`/counters (0 is valid); keep `occupantYs`/pad arrays `readonly`; no `as unknown as` in production (`Tier` is a union, `nextServed`'s return is a 3-way union — handle all arms). Test self-check (Phase C): no vacuous assertions, no `let _ =`, every assertion reads a real value; the sole `as unknown as SimProcess` is the established test-helper pattern (jt12-2/game-jt4-5).

**Handoff → Dev (Korben):** GREEN the 3 wires minimally. Occupancy gate in `serveEnemies` (sim.ts); player-queue routing in the game.ts respawn block. Do not re-implement the enemy-side players-first guard — it exists. Watch the golden-timeline blast radius above.
## Dev Assessment

GREEN complete. **joust 3688/3688, orchestrator 505/505, `tsc --noEmit` clean.**

**What shipped (three parts, all ROM-faithful):**
1. **Player-side CRELP queue** (game.ts respawn block): a re-created knight draws NPSERV
   (`takePlayerNumber`) the frame it becomes due, waits its turn in `respawnQueue`, and is
   served only when `nextServed(serviceQueue) === 'player'` (`servePlayer` → LPSERV), ahead of
   enemies. The player counters live in the shared `sim.serviceQueue`, so the enemy service
   inside `stepSim` sees the waiting knight and defers (`enemyTurn`'s existing NPSERV==LPSERV
   guard — which was DEAD until a player finally took a number). Serve-before-take gives the
   ROM's one-frame CRELP wait.
2. **SELARE empty-third respawn** (`selectRespawnPad` in transporter.ts + game.ts): the served
   knight materialises ON a transporter pad in an empty third (bottom→middle→top preference,
   first-free fall-through, never starved), positioned at the pad in `respawnPlayerProcess`
   (sim.ts, now takes a `TransporterPad`).
3. **Double-serve fix** (`livePlayerNow` guard) — see Delivery Findings.

**Test seam:** `transporter-player-queue-wiring-jt12-3.test.ts` (5 tests) pins the player queue
(npserv/lpserv advance, players-first branch) and the SELARE landing (on a pad, empty-third
preference, ROM order, never fixed-spawn). `demo-jt8-6` updated for the new `respawnPlayerProcess`
signature. 12 downstream goldens re-baselined (Design Deviations) — rng cursor UNMOVED throughout,
confirming the change is deterministic play, not randomness.

**One authenticity simplification worth a Reviewer eye:** `selectRespawnPad`'s all-thirds-occupied
fall-through takes the deterministic first-free pad where the ROM seeds it from VRAND. The
empty-third preference (the actual safety) is exact; only the rare no-empty-third tiebreak differs,
and no seed is threaded to the game-layer respawn today.

**Handoff → verify/review:** the story TITLE still asserts the refuted "gate serveEnemy / defers
into a crowded third" premise (see Design Deviations) — trust the deviation + the rewritten tests,
not the title. Watch the `selectRespawnPad` VRAND simplification and the game↔sim serviceQueue
coupling (the one-sim seam holds in the no-respawn 30-frame window `game-jt4-5` checks).
## Round 1 — Subagent Results (superseded by round 2 below)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — GREEN (joust 3688/3688, orch 505/505, tsc clean, zero smells) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered (found the [HIGH] orphan race myself) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered (the `pad === null` and orphan paths are silent no-ops) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered (tests below) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered (comments match the ROM I re-read) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — hand-covered (no `!`, no `as unknown` in prod, unions handled) |
| 7 | reviewer-security | Yes | clean | 1 obs (non-security) | confirmed 0 sec; the ptero/troll census obs → confirmed as [LOW] fidelity (see below) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — hand-covered (logic is minimal; no dead code) |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed 1 (stale comment game-jt4-5.test.ts:349 — [RULE][DOC], LOW) |

**All received:** Yes (3 enabled returned: preflight clean, security clean+1 obs, rule-checker 1 finding; 6 disabled hand-covered)
**Total findings:** 3 confirmed (1 HIGH, 2 LOW), 0 dismissed, 0 deferred

### Reviewer (audit)

- **Deviation 1 (ROM refutes the "gate serveEnemy / defers" premise → built the empty-third
  PLAYER pad-safety)** → ✓ ACCEPTED by Reviewer: independently re-read JOUSTRV4.SRC:5619-5715.
  Confirmed the SELARE census + empty-third preference is on the PLAYER re-create path (CREPLY),
  never the enemy, and it PREFERS an empty third / falls through to a default create rather than
  deferring; `GOTTR` positions the served knight at the pad. `selectRespawnPad`'s order
  (bottom→middle→top, first-free fall-through) matches the ROM. Retiring the fixed-spawn re-entry
  is correct (LDX 100/200 at :1023/:1039 is the first-ever create).
- **Deviation 2 (fleet-wide 12-golden re-baseline)** → ✓ ACCEPTED by Reviewer: rule-checker #20
  found all six re-baseline classes compliant (mechanism named, suite green, values re-measured
  not guessed); rng cursor UNMOVED confirms deterministic play-cascade, not randomness.
- **UNDOCUMENTED (Reviewer-found): orphaned respawn across a wave advance.** Neither TEA nor Dev
  logged that `game.respawnQueue` is never reconciled against `stepSim`'s per-wave
  `serviceQueue` reset (sim.ts:2621). A knight mid-respawn when a wave advances is orphaned —
  see [HIGH] in the assessment. Severity: HIGH (reachable game-over hang / 1P softlock).

## Round 1 — Reviewer Assessment (REJECTED — all findings resolved in round 2 below)

**Verdict:** REJECTED (round 1 — superseded)

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | Orphaned respawn across a wave advance: a knight holding a CRELP number in `respawnQueue` when `stepSim` re-seeds `serviceQueue` per wave (sim.ts:2621) is never served — `nextServed` never returns `'player'` again (npserv=lpserv=0) and the take-block won't re-draw (still queued). Stays lives>0 && !out forever → co-op game-over never fires; **1P is a hard softlock** (only player never returns). REPRO CONFIRMED (constructed post-advance state: P2 never re-enters over 400 frames). Reachable when a wave clears ~1 frame after a death triggers a respawn. jt12-3 introduced it (pre-story respawn was immediate). | `plugins/joust/src/core/game.ts:511-567` (+ reset at `sim.ts:2621`) | Reconcile `respawnQueue` when the queue resets: drop/re-seat any entry whose `ticket ∉ [lpserv, npserv)` so an orphaned knight re-draws its NPSERV number. Add a regression test (the constructed-orphan repro, and ideally a natural death-then-advance sequence). |
| [LOW] | [SEC] SELARE census omits pteros/trolls: `entityOf` counts only player/enemy entities; pteros/trolls carry a direct `.entity` and occupy thirds too (ROM CREPLY walks ALL on-screen PIDs). Non-blocking — consistent with the pre-existing `occupied` computation (sim.ts:2687), not a regression. | `plugins/joust/src/core/game.ts:524-536` | Optional fidelity fix — include ptero/troll entities in the occupancy census (and, for consistency, the `occupied` pad check). |
| [LOW] | [RULE][DOC] Stale comment: still claims P2 "RE-ENTERS at PLAYER2_SPAWN (x=200), far from P1" — jt12-3 retired fixed-spawn re-entry (now a pad chosen by `selectRespawnPad`; none of PADS' x is 200). Suite stays green (assertions don't check x) but the comment is now false. | `plugins/joust/tests/game-jt4-5.test.ts:349-350` | Comment-only: reword to the pad-based re-entry. |

**Verified good:** [PRE] preflight GREEN (joust 3688/3688, orch 505/505, tsc clean, zero smells); [SEC] determinism intact (no clock/RNG/ambient state; purity guards 59/59); [RULE] 30 checks / 47 instances, only the one stale comment; the double-serve `livePlayerNow` guard is correct; `selectRespawnPad` matches ROM CREPLY/GOTTR; the no-respawn one-sim seam holds.

**Data flow traced:** a knight death → `takePlayerNumber(serviceQueue)` (NPSERV) → waits in `respawnQueue` → served when `nextServed==='player'` onto `selectRespawnPad`'s empty-third pad. Safe in the common path; BREAKS across a wave-advance queue reset (the [HIGH]).

**Handoff:** Back to Dev for fixes (the [HIGH] needs a regression test — route via TEA red rework).

### Reviewer (code review)

- **Gap** (blocking): a knight mid-respawn is orphaned when a wave advance re-seeds the service queue. Affects `plugins/joust/src/core/game.ts` (reconcile `respawnQueue` against the reset serviceQueue). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): SELARE occupancy census omits pteros/trolls. Affects `plugins/joust/src/core/game.ts` (`entityOf`). *Found by Reviewer during code review.*
- **Gap** (non-blocking): stale re-entry comment. Affects `plugins/joust/tests/game-jt4-5.test.ts:349-350`. *Found by Reviewer during code review.*
## Tea Assessment (rework — Reviewer [HIGH])

RED regression added for the Reviewer's orphaned-respawn finding:
`transporter-player-queue-wiring-jt12-3.test.ts` → new describe "REGRESSION (Reviewer [HIGH])",
2 tests, both RED (`2 failed | 5 passed`); staging assertions pass, the failures are on the
recovery assertion (the bug).

1. **Constructed post-advance orphan** — P2 absent-with-lives, holding ticket 0 in `respawnQueue`,
   `serviceQueue` RESET (npserv=lpserv=0), no enemies (wave keeps re-seeding). Asserts P2
   re-materialises within 400 frames. RED: it never does.
2. **Driven take-then-advance** — kill P2 (partner-joust), step one frame so it draws a REAL
   CRELP number, then strip enemies to force a wave advance (re-seeds the queue) before P2 is
   served, then assert recovery. RED: orphaned.

Both are behaviour-level ("a knight with lives MUST re-materialise") so ANY correct fix passes —
not coupled to a mechanism. Non-vacuity is proven by the staging assertions (P2 drew a real
number / has lives / starts absent) which pass on today's buggy code.

**Handoff → Dev (Korben):** GREEN by reconciling `respawnQueue` against the reset `serviceQueue`
in game.ts — re-seat/drop any entry whose `ticket` is outside `[lpserv, npserv)` so an orphaned
knight re-draws its number. Also address the two Reviewer LOWs while here: reword the stale
comment at `game-jt4-5.test.ts:349-350` (retired fixed-spawn re-entry → pad-based), and
optionally include ptero/troll entities in the SELARE census (`entityOf`, game.ts) for fidelity.
Re-run the FULL joust suite — the fix changes respawn recovery timing and may nudge a golden or two.
## Dev Assessment (rework — Reviewer [HIGH] + LOWs resolved)

GREEN. **joust 3690/3690 (incl. the 2 new orphan regressions), orchestrator 505/505, tsc clean.**

**[HIGH] Orphaned respawn — FIXED (game.ts:513).** Before the serve/take blocks, prune any
`respawnQueue` entry whose `ticket` is outside the live window `[lpserv, npserv)`. When a wave
advance re-seeds `serviceQueue` (npserv/lpserv reset below a waiting ticket), the stale entry is
dropped and the take-a-number loop re-draws that knight — so a player with lives always recovers.
Both TEA regression tests (constructed post-reset state + driven take-then-advance) are GREEN;
the normal path is unaffected (a valid waiting ticket is in-window and kept).

**[LOW] SELARE census — FIXED (game.ts entityOf).** Now `p.kind === 'enemy' ? p.enemy?.entity :
p.entity`, so knights, enemies, pterodactyls AND lava trolls all count toward the empty-third
census (CREPLY walks every active on-screen PID via SELARE); only eggs (no flight entity) are
excluded, matching the ROM's egg special-case in spirit. `occupied` (pads physically in use) is a
distinct concept (TCURUSE) and stays as-is. This nudged the 0x1002 wave-advance golden 5525->6179
(audio-events AC2) — re-baselined, suite green.

**[LOW] Stale comment — FIXED (game-jt4-5.test.ts:349-350):** reworded from "RE-ENTERS at
PLAYER2_SPAWN (x=200)" to the pad-based empty-third re-entry.

**Handoff → Reviewer:** all three findings resolved; the [HIGH] carries two behaviour-level
regression tests. One golden re-baseline (0x1002 5525->6179) from the census fix; rng cursor
still unmoved. Full suite + orchestrator + tsc all green.
## Subagent Results

Round 2 (re-review after the rework). Enabled: preflight, security, rule_checker. The other 6 are disabled — hand-covered.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — GREEN (joust 3690/3690, orch 505/505, tsc clean, zero smells) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled — hand-covered (adversarial no-stuck probe: 6 seeds × 6000f, worst absent-with-lives < 250f) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled — hand-covered (prune + re-draw path traced) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled — hand-covered (2 orphan regressions behaviour-level, non-vacuous) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled — hand-covered (stale comment fix verified) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled — hand-covered ([SEC] verified entityOf safety) |
| 7 | reviewer-security | Yes | clean | 0 | confirmed 0 — prune arithmetic + widened entityOf verified safe, purity 59/59 |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled — hand-covered (prune is one filter; minimal) |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed 1 [LOW][RULE] (removable `as unknown as SimProcess`, jt12-3 test:97); round-1 stale comment RESOLVED |

**All received:** Yes (3 enabled returned: preflight clean, security clean, rule-checker 1 LOW; 6 disabled hand-covered)
**Total findings:** 1 confirmed LOW (non-blocking), 0 dismissed, 0 deferred; all 3 round-1 findings RESOLVED

## Reviewer Assessment

**Verdict:** APPROVED (round 2)

All three round-1 findings are resolved and independently verified:

- **[HIGH] Orphaned respawn — FIXED & VERIFIED.** `game.ts:519` now prunes `respawnQueue` to the live `[lpserv, npserv)` window before serve/take, so a knight whose ticket is orphaned by a per-wave `serviceQueue` reset re-draws and recovers. Evidence: [TEST] the two TEA regression tests (constructed post-reset + driven take-then-advance) are GREEN; my adversarial no-stuck probe (6 seeds × 6000 frames of chaotic 2P play, many deaths + wave advances) found the worst absent-with-lives span < 250 frames; [SEC] security independently traced the half-open window and the re-draw (no orphan, no double-issuance, no overflow). The 2-player simultaneous-respawn case keeps both valid tickets and drops only truly-orphaned ones.
- **[LOW] SELARE census pteros/trolls — FIXED.** `entityOf` is now `p.kind === 'enemy' ? p.enemy?.entity : p.entity`, counting knights/enemies/pteros/trolls (CREPLY walks every active on-screen PID) and excluding eggs (no flight entity). Re-baselined the one shifted golden (0x1002 advance 5525→6179); rng cursor still UNMOVED.
- **[LOW][RULE][DOC] Stale comment — FIXED.** `game-jt4-5.test.ts:349-350` reworded to the pad-based re-entry; [RULE] rule-checker confirmed resolved.

**New round-2 finding (non-blocking):**

| Severity | Issue | Location | Decision |
|----------|-------|----------|----------|
| [LOW] | [RULE] `as unknown as SimProcess` double-cast is removable — the literal satisfies `SimProcess` (lint passes without it; sibling `playerProc` builds the same shape uncast). | `plugins/joust/tests/transporter-player-queue-wiring-jt12-3.test.ts:97` | CONFIRMED, downgraded to LOW with rationale: it is the established `enemyProc` idiom across the joust suite (`game-jt4-5`, `jt12-2`, `game.test`) — removing it only here creates local inconsistency; a fleet-wide cleanup is a separate concern. Non-blocking. |

**Verified good:** [PRE] preflight GREEN (joust 3690/3690, orch 505/505, tsc clean); [SEC] determinism intact (purity 59/59, no clock/RNG/ambient state, no unsafe cast/deref in the rework); [RULE] round-1 stale comment resolved, no new blocking rule violations; the orphan prune is correct for the normal path, the reset path, and 2-player simultaneous respawns.

**Data flow traced:** knight death → `takePlayerNumber` (NPSERV) → waits in `respawnQueue` (now pruned to the live window each frame) → served when `nextServed==='player'` onto `selectRespawnPad`'s empty-third pad; recovers across a wave-advance queue reset (the round-1 [HIGH], now fixed).

**Handoff:** To SM for finish-story.

### Reviewer (audit — round 2)

- Round-1 deviations (ROM refutation; 12-golden re-baseline) remain ✓ ACCEPTED.
- Round-1 [HIGH] orphaned respawn (previously UNDOCUMENTED) is now logged as a Delivery Finding and FIXED — verified resolved. No new undocumented deviations in the rework.

### Reviewer (code review — round 2)

- **Improvement** (non-blocking): removable `as unknown as SimProcess` cast at `plugins/joust/tests/transporter-player-queue-wiring-jt12-3.test.ts:97` — consistent with the suite's `enemyProc` idiom; clean up fleet-wide if desired. *Found by Reviewer during round-2 review.*
- All round-1 findings resolved; no blocking issues remain. *Reviewer round 2.*