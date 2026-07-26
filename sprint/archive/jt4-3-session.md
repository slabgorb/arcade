---
story_id: "jt4-3"
jira_key: "jt4-3"
epic: "jt4"
workflow: "tdd"
---
# Story jt4-3: Egg + gladiator wave types + the 2P bounties — complete all six types, co-op/survival/gladiator 3000, the PLYG1/2 polarity trap

## Story Details
- **ID:** jt4-3
- **Jira Key:** jt4-3
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-26T15:21:38Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-26T12:18:18.801922+00:00 | 2026-07-26T12:21:26Z | 3m 7s |
| red | 2026-07-26T12:21:26Z | 2026-07-26T14:39:59Z | 2h 18m |
| green | 2026-07-26T14:39:59Z | 2026-07-26T14:56:47Z | 16m 48s |
| review | 2026-07-26T14:56:47Z | 2026-07-26T15:21:38Z | 24m 51s |
| finish | 2026-07-26T15:21:38Z | - | - |

## Impact Summary

**Delivery findings compiled:** 8 total, 0 blocking, 8 non-blocking (routed forward or documented).

**Finding categories:**
- **Gaps** (6): partner-kill DETECTION not wired in stepGame/collisionPass (TEA + Dev, same seam); egg-hatch spawn not wired into spawnWaveEnemies — needs WAVEGG EGG1 placement transcription :2737-2776 (TEA + Dev); neither deferred wiring has an end-to-end test (Reviewer); `awardWaveBounty`'s extra-man re-check untested — no bounty-crossing-20,000 test (Reviewer, mutation-confirmed).
- **Improvements** (2): `recordPartnerKill` not idempotent vs a re-kill on the $80 claimed marker — ROM's DEC-keep-positive (:4688) not reproduced, `incd < 0` branch unreachable dead code (Reviewer); missing `readonly` on WaveGuards/WaveEndContext scalars vs fleet convention (Reviewer, Low).

**Routing:**
- **To jt4-4 (the loop story):** both live wirings (partner-kill detection event on collisionPass + arm/detect/award loop in stepGame; egg-hatch spawn via WAVEGG transcription), PLUS a wave-5 egg-spawn integration test and a live-gladiator-award integration test, PLUS the recordPartnerKill idempotence guard (test the branch or remove it).
- **To TEA at jt4-4 red:** a `ledger(19_000)`-style bounty-crossing test asserting lives increments and extraManAt re-arms.
- **Recorded only:** the `readonly` consistency nit; no ROM-citation discrepancies found (all cited lines verified by TEA and independently re-read by Reviewer).

**Story delivery:** all 4 ACs satisfied (AC-1 at the dispatch/routing level its wording scopes to — Reviewer ruled the live-wiring deferral acceptable under the epic's jt4-4 loop-consolidation assignment). 45 new tests (28 behaviour + 17 source double-entry), claims JT43-001..011; suite 1480/1480 green, tsc + vite green, independent ROM diff clean, polarity mutation-proven. Verdict: APPROVED (round 1). Merged as joust#35 (squash, e9ca8ca).

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): partner-kill DETECTION is not yet wired in the sim — `demo.ts` `collisionPass` removes a player-vs-player joust loser but records no partner-kill and attributes no winner (`resolveContacts` scores enemy kills only). For the bounties to be LIVE end-to-end, `stepGame` must detect a player process removed by another player and call `recordPartnerKill`, analogous to jt4-2's mount-death detection. Affects `src/core/demo.ts` / `src/core/game.ts` (the stepGame wiring). jt4-3 pins the pure award/guard functions; the sim wiring is arguably jt4-4's loop concern (the story scopes the bounties to accrue into jt4-1's registers). *Found by TEA during test design.*
- **Gap** (non-blocking): the egg wave changes HOW the ground complement enters (hatched from eggs, not materialised via pads); `eggWaveSpawnsEggs` must be wired into `demo.ts` `spawnWaveEnemies` for the egg-wave behaviour to change the sim, mirroring `spawnWavePteros`. Affects `src/core/demo.ts`. *Found by TEA during test design.*
- No ROM-citation discrepancies: every line the story context cites (JOUSTRV4.SRC:2586-2591, 2628-2631, 2634-2635, 2642-2728, 2697-2700, 2703-2705, 4691-4698, 6282-6284) was read directly and matches the transcription in the tests. *Found by TEA during test design.*

### Reviewer (code review)
- **Gap** (non-blocking): the two live sim wirings deferred to jt4-4 (partner-kill DETECTION in `stepGame` + egg-hatch spawn in `demo.ts` `spawnWaveEnemies`) have NO end-to-end test in the suite this story. jt4-4 must not only wire both but land a wave-5 egg-spawn integration test and a live-gladiator-award integration test, so the epic's "all six wave types live end-to-end" claim gets a real gate before jt4 closes. Affects `src/core/demo.ts`, `src/core/game.ts` (jt4-4). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `recordPartnerKill` is not idempotent against a repeat gladiator kill by an already-claimed winner — a second `INC` on the `$80` (modelled as +128) marker yields 129, which `awardWaveBounty` no longer recognises as claimed, so the bounty would be LOST. The ROM's `DEC ,Y` "(KEEP THE NBR POSITIVE)" (JOUSTRV4.SRC:4688) preserves `$80` on re-increment; the model's `incd < 0` branch documents this but does not reproduce it (the modelled marker is positive, so a re-INC takes the count-up path) — the branch is therefore unreachable dead code (independently confirmed by reviewer-test-analyzer: deleting it keeps both suites green). Unreachable this story (detection deferred) and in normal 2P play (the gladiator loser is dead after the one kill), hence non-blocking — but jt4-4 must guard against it if a gladiator loser can respawn-and-be-rekilled before wave end, and should either test the branch or remove it. Affects `src/core/game.ts` `recordPartnerKill` (jt4-4 consumer). *Found by Reviewer during code review.*
- **Gap** (non-blocking): `awardWaveBounty`'s extra-man re-check (`awardExtraMen`, faithful to the design ruling "SCRLEV runs on every score change") is untested — no jt4-3 test drives a bounty across the 20,000 threshold, so deleting the wrapper stays green (mutation-confirmed by reviewer-test-analyzer). The shipped code is correct and the idiom is pinned in jt4-1/jt4-2; TEA should add a `ledger(19_000)`-style bounty-crossing test that asserts `lives` increments and `extraManAt` re-arms. Affects `src/core/game.ts` `awardWaveBounty` + `tests/game-bounty.test.ts`. *Found by Reviewer during code review (via reviewer-test-analyzer).*
- **Improvement** (non-blocking): `WaveGuards`/`WaveEndContext` scalar fields (`plyg1`/`plyg2`) and the `guards`/`ctx` parameters lack `readonly`, though the functions' JSDoc claims purity (lang-review #2). Locally consistent with game.ts's own jt4-1/jt4-2 style (`PlayerLedger`/`GameState` scalars also unmarked) and purity is behaviorally tested, so no correctness risk — but the fleet convention (`demo.ts`/`enemy.ts`/`frame.ts` mark scalars `readonly`) makes it a worthwhile type-enforcement consistency fix. Affects `src/core/game.ts` + `tests/helpers/game-contract.ts` (the mirrored interfaces). *Found by Reviewer during code review (via reviewer-rule-checker).*

### Dev (implementation)
- **Gap** (non-blocking): the live partner-kill DETECTION seam is NOT wired into `stepGame` this story. TEA's own finding is confirmed: `demo.ts` `collisionPass` removes a player-vs-player joust loser with NO event and does not distinguish an enemy-kill from a partner-kill, so a process-set diff alone (the jt4-2 mount-death analogue) cannot tell WHO killed the removed player. Wiring detection faithfully needs (a) `collisionPass` to emit a distinguishable partner-kill event and (b) the full arm-at-wave-start (`armWaveGuards` by resolved type) / award-at-wave-end (`awardWaveBounty` off WCOSCR/WGLSCR) loop. Both are the jt4-4 loop concern (the epic scopes jt4-3 to the pure functions accruing into jt4-1's registers). The pure `recordPartnerKill` + `awardWaveBounty` are fully built and tested here; only the sim hook is deferred. Affects `src/core/demo.ts` (a new partner-kill event on `collisionPass`) + `src/core/game.ts` (`stepGame` arm/detect/award). *Found by Dev during implementation.*
- **Gap** (non-blocking): `eggWaveSpawnsEggs` is built and unit-pinned but NOT yet wired into `demo.ts` `spawnWaveEnemies`. Making the egg wave (wave 5, status $08) hatch its ground complement AS EGGS requires transcribing WAVEGG's egg placement (the EGG1 table + the 2 pre-mature hatchings, JOUSTRV4.SRC:2737-2776) into real `eggProcess`/`EggState` positions — a genuine sub-feature TEA deliberately scoped out (unreachable in a unit window; details untranscribed). Rather than ship a guessed, unverifiable placement into the deterministic sim, the wiring is deferred to jt4-4 with the predicate ready to consume. Affects `src/core/demo.ts` `spawnWaveEnemies`. *Found by Dev during implementation.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Egg-wave behaviour pinned at the dispatch/predicate level, not a wave-5 sim integration**
  - Spec source: context-story-jt4-3.md, AC-1
  - Spec text: "The egg wave type spawns its wave as eggs … through jt2-5's WJSRTB dispatch"
  - Implementation: tests pin `eggWaveSpawnsEggs(status, players)` (a pure predicate flowing through `dispatchWaveType`, the exact shape of jt3-4's `pteroWaveSpawnCount`) + `waveTypeBehaviour('egg')==='spawnEggs'` + the WAVEGG source (JOUSTRV4.SRC:2737, 2 pre-mature hatchings :2776), rather than an end-to-end assertion on a live egg wave.
  - Rationale: the first egg wave is wave 5 (status $08); reaching it deterministically means clearing four waves (hundreds of frames), impractical in a unit window. The ptero precedent (jt3-4) pins its analogue purely and Dev wires it into `demo.ts` (`spawnWavePteros`); egg follows the same seam.
  - Severity: minor
  - Forward impact: Dev must wire `eggWaveSpawnsEggs` into `demo.ts` `spawnWaveEnemies` (as `spawnWavePteros` wires the ptero count) for the behaviour to be live in the sim; a Reviewer may want a follow-up wave-5 integration test.
- **All three bounties modelled at wave-end via `awardWaveBounty`, not credited at kill-time**
  - Spec source: context-story-jt4-3.md, AC-2
  - Spec text: "gladiator 3000 to the FIRST partner-killer (JOUSTRV4.SRC:2642-2728,4691-4698)"
  - Implementation: co-op/survival award at wave end (WCOSCR/WSUSCR) and the gladiator bounty (which the ROM credits at the kill, SPDGLA :4697-4698) are unified through one `awardWaveBounty(players, type, ctx)` that reads the end-of-wave PLYG guard state.
  - Rationale: one wave-end award seam keeps all three bounties in one pure function and is observably equivalent — the guard the flip leaves claimed marks the first killer. Accrues into jt4-1's registers per the story.
  - Severity: minor
  - Forward impact: Dev may credit the gladiator bounty at kill-time or wave-end as long as `awardWaveBounty`'s contract holds; the partner-kill DETECTION wiring in the sim is a separate seam (see Delivery Findings).
- **`recordPartnerKill`'s claimed-marker representation left to Dev; pinned only through `awardWaveBounty`'s observable**
  - Spec source: context-story-jt4-3.md, AC-3
  - Spec text: "displaced instructions preserved as ******** comments" / SPDGLA INC ,Y (:4685-4694)
  - Implementation: tests pin `armWaveGuards`' exact cited values (0 / −1) and the co-op counter going non-zero after a partner-kill, but NOT the gladiator "claimed" marker's numeric value ($80) — only that `awardWaveBounty` credits the first killer.
  - Rationale: the $80 marker is an implementation detail the ROM uses for GLADn message routing, not scoring; over-pinning it would couple the test to a byte irrelevant to the bounty. The `********`-comment preservation of the displaced `JMP EMSGS` (PATC11, :6284) is a game.ts code-comment concern verified in the source suite, not a behavioural gate.
  - Severity: minor
  - Forward impact: none — the behaviour is fully pinned via `awardWaveBounty`.

### Dev (implementation)
- **jt4-3 exports live on the extended `src/core/game.ts`, not a separate `game-bounty.ts` module**
  - Spec source: task brief ("new core module, game-bounty area")
  - Implementation: the contract loader `loadGameBounty()` resolves the jt4-3 surface off `src/core/game.js` via `loadGameExtra → loadGame` (the jt4-2 idiom), so `armWaveGuards`/`recordPartnerKill`/`awardWaveBounty`/`waveTypeBehaviour`/`eggWaveSpawnsEggs` were added to `game.ts` alongside the jt4-1/jt4-2 surface (one session-layer module), and the claims file is named `game-bounty.json`.
  - Rationale: a separate module would not satisfy the contract's own loader; the tests define the seam.
  - Severity: none (naming only).
- **The gladiator "claimed" marker is modelled as `$80` and read by `awardWaveBounty`**
  - Spec source: SPDGLA (JOUSTRV4.SRC:4691-4694) + TEA deviation (marker value left to Dev)
  - Implementation: `recordPartnerKill` flips gladiator's armed −1 to 0, clears BOTH bytes ("ONLY 1 GLADIATOR IN THE WAVE"), and stamps the winner `GLADIATOR_CLAIMED = 0x80` ("INDICATE TRUE WINNING GLADIATOR"); `awardWaveBounty('gladiator', …)` pays whichever guard carries `$80`. A later kill by the other player only bumps its cleared-0 byte to a non-award positive, so the FIRST killer keeps the bounty.
  - Rationale: faithful to the ROM's own $80 sentinel and observably correct for the first-killer-only + polarity tests.
  - Severity: minor (the numeric marker is an internal detail, not pinned by a test per TEA).

## Sm Assessment

Setup complete and verified on disk. Session file created; story context generated at
sprint/context/context-story-jt4-3.md from the epic YAML (epic context untouched, md5 verified).
Feature branch feat/jt4-3-egg-gladiator-waves created from develop @ dc85ed6 in the joust repo
(jt4-2 merged as joust#34, no open PRs, merge gate clear). Story jt4-3 moved to in_progress in
sprint/epic-jt4.yaml. Jira: local YAML tracking only (no Jira in this project).

Scope for TEA: three ACs from the story context — (1) egg + gladiator wave-type behaviours through
jt2-5's WJSRTB dispatch, (2) the three 2P bounties (co-op 3000 voided by partner-kill, survival
3000 deathless, gladiator 3000 first-killer), (3) the PLYG1/2 polarity inversion + PATC11 boot
cleanup, plus determinism/purity/citation guards. Primary source: JOUSTRV4.SRC lines cited in the
story context; design spec docs/superpowers/specs/2026-07-22-joust-jt4-epic-design.md (joust repo).

Run mode: subagent-driven peloton (user-directed) — SM drives TEA/Dev/Reviewer as foreground
subagents; phase state advanced via complete-phase at each hop.

Handoff: red phase → tea.

## Tea Assessment

**Tests Required:** Yes
**Status:** RED (failing — ready for Dev / Korben)
**Branch:** feat/jt4-3-egg-gladiator-waves  |  **Commit:** 72607be

### Test strategy

jt4-3 completes epic jt4's "all six wave types" and pays the three 2P bounties the WJSRTB
dispatch skeleton has routed for free. Following the house double-entry idiom (jt4-1/jt4-2), I
pinned the four ACs through the game.ts SESSION LAYER (the epic's ruled seam — bounties accrue
into jt4-1's registers), consuming jt2-5's `dispatchWaveType`:

- **Contract** (`tests/helpers/game-contract.ts`, extended — the jt4-2 pattern): added
  `loadGameBounty()` (self-describing "not built yet" failure) + the jt4-3 surface —
  `armWaveGuards` (the PLYG1/2 polarity), `recordPartnerKill` (SPDGLA INC), `awardWaveBounty`
  (the three 3,000 bounties), `waveTypeBehaviour` (all six types), `eggWaveSpawnsEggs` (egg
  through dispatch) — plus `GameState.guards` (the PATC11 boot seed) and re-exported
  `ResolvedWaveType`/`RawWaveType`/`PlayersAlive`.
- **Behaviour** (`tests/game-bounty.test.ts`, 28 tests): AC-1 egg+gladiator through dispatch
  (ptero unchanged; all six carry a behaviour or the cited RTS no-op); AC-2 the three bounties
  each with its NON-award path (co-op voided by partner-kill, survival gated on PLYD, gladiator
  first-killer only); AC-3 the polarity inversion pinned with BOTH meanings (same partner-kill
  VOIDS co-op but AWARDS gladiator) + PATC11 boot cleanup + solo degrade; AC-4 four seeded
  scenarios replay bit-for-bit + purity. Each test names the mutant it kills.
- **Source** (`tests/game-bounty-source.test.ts`, 17 tests): the independent-reader
  re-derivation (WGLAD/WAVEGG entries, 3000=SCRHUN $30, the 0-vs-−1 polarity, the PLYD/PATC11
  gates, SPDGLA) + JT43-* claim coverage (all cited regions, id well-formedness/uniqueness,
  verbatim byte-gate).

**The 3,000 pass-through discipline:** every bounty is asserted as `decodeDvalue('SCRHUN', $30)`,
never a fresh literal — a change to the jt4-1 SCRHUN decode would redden the bounties, killing
the "hardcoded 3000" mutant. The polarity trap is the load-bearing test: `armWaveGuards` returns
the exact cited values (co-op 0, gladiator −1) and the SAME `recordPartnerKill` produces OPPOSITE
award outcomes across the two polarities.

**Test Files:**
- `tests/game-bounty.test.ts` — behaviour suite (28 tests, 4 ACs)
- `tests/game-bounty-source.test.ts` — provenance + JT43-* claim coverage (17 tests)
- `tests/helpers/game-contract.ts` — contract extended with `loadGameBounty()` + jt4-3 types

### Red counts (verified)

- **New tests: 45** (28 behaviour + 17 source). **33 FAIL, 12 pass.**
  - All 28 behaviour tests fail via `loadGameBounty()` — the clean "jt4-3 … not built yet"
    self-describing error (module has no `armWaveGuards` export). Missing behaviour, not a
    typo/import — verified.
  - 5 source failures: 4 module cross-checks (module absent) + 1 JT43 claim-coverage gate
    (docs/rom-study/claims/game-bounty.json not committed yet).
  - The 12 "passing" source tests are the INDEPENDENT-READER half of the double-entry: they
    verify the vendored ROM lines (WGLAD/WAVEGG, CLR/LDA #-1, SCRHUN $30, PLYD, PATC11, degrade),
    which already exist — the same RED-phase behaviour as jt4-1/jt4-2's source companions. Two
    JT43 guards (uniqueness, verbatim) pass vacuously over the empty JT43 set and bite once Dev
    commits the claims.
- **Pre-existing suite: GREEN** — 54 files / 1435 tests still pass; total now 56 files / 1480
  tests (33 fail | 1447 pass). No existing test modified or regressed. `tsc --noEmit` clean.

### Rule coverage (joust house rules)

| Rule / discipline | Test(s) | Status |
|---|---|---|
| Pure core (no mutation) | AC-4 purity: awardWaveBounty / armWaveGuards / recordPartnerKill | failing |
| ROM double-entry (independent reader) | game-bounty-source.test.ts (WGLAD/WAVEGG, polarity, SCRHUN $30, PLYD, PATC11) | source-side green / module-side failing |
| Claims committed + byte-gated | JT43 coverage + id uniqueness + verbatim byte-gate | failing (coverage gate) |
| Caveated values pass through, not re-litigated | bounty == decodeDvalue('SCRHUN', $30), not a literal | failing |
| guard-must-be-mutation-tested | every it() names the mutant it kills | failing |
| No vacuous assertions | AC-4 non-vacuous check (awards actually moved score) | failing |

### What Dev (Korben) must build (game.ts + demo.ts + claims)

`armWaveGuards(type)` (coop 0 / gladiator −1, else 0); `recordPartnerKill(guards, winner)`
(SPDGLA INC — co-op counts up, gladiator flips −1→claimed, first killer only);
`awardWaveBounty(players, type, ctx)` (co-op 3000 each unless a guard is non-zero; survival 3000
to each alive+deathless player; gladiator 3000 to the flip-claimed first killer; all via
`decodeDvalue('SCRHUN',$30)`); `waveTypeBehaviour(type)` (nop→noop … survival→survivalBonus);
`eggWaveSpawnsEggs(status,players)` (=== dispatch 'egg') WIRED into demo.ts `spawnWaveEnemies`
like `spawnWavePteros`; seed `GameState.guards={plyg1:0,plyg2:0}` in `createGame` (PATC11);
preserve the displaced `JMP EMSGS` as a `********` comment; commit
`docs/rom-study/claims/game-bounty.json` (JT43-*). See Delivery Findings for the two sim-wiring
Gaps (partner-kill detection + egg-spawn routing) that make the behaviour live end-to-end.

**Handoff:** To Dev (Korben) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes (test-gated surface); two live-sim wirings deferred to jt4-4 (see Delivery Findings)
**Status:** GREEN
**Branch:** feat/jt4-3-egg-gladiator-waves | **Commit:** 74998ad (74998adf76967cb94e15284bef80204d48cd53cc) — pushed: NO (SM finishes)

**Files Changed:**
- `src/core/game.ts` — extended the jt4-1/jt4-2 session-layer module with the jt4-3 surface:
  `WaveGuards` / `WaveEndContext` / `WaveBehaviour` types + `GameState.guards`; constants
  `BOUNTY_DIGIT $30`, `GLADIATOR_ARM -1`, `GLADIATOR_CLAIMED $80`; `waveTypeBehaviour`,
  `eggWaveSpawnsEggs`, `armWaveGuards`, `recordPartnerKill`, `awardWaveBounty`; `createGame`
  seeds `guards {0,0}` (PATC11) with the displaced `JMP EMSGS` kept as a `********` comment;
  `stepGame` carries the guards forward.
- `docs/rom-study/claims/game-bounty.json` — NEW, JT43-001..011 (all cited regions; byte-gate + checker green).

**How each mechanic is implemented (one line each):**
- **Egg wave type** — `eggWaveSpawnsEggs(status,players) === (dispatchWaveType(status,players)==='egg')`, the jt3-4 `pteroWaveSpawnCount` shape; `waveTypeBehaviour('egg')==='spawnEggs'`; egg never degrades by player-count.
- **Gladiator wave type** — `armWaveGuards('gladiator') → {-1,-1}` (arms PvP); solo it dispatches to `'nop'` → `armWaveGuards('nop') → {0,0}` (WGLAD no-op law); `waveTypeBehaviour('gladiator')==='gladiatorBounty'`.
- **Co-op 3000 bounty** — `awardWaveBounty('coop',…)` pays `decodeDvalue('SCRHUN',$30)=3000` to each ALIVE player IFF both guards are 0; any non-zero guard (a partner-kill) VOIDS the whole team bonus (COOP3, ORA/BEQ).
- **Survival 3000 bounty** — pays each player who is `alive[i] && !died[i]` (the PLYD deathless gate); a survivor who died this wave banks nothing; per-player independent.
- **Gladiator 3000 bounty** — pays the ledger whose guard carries `$80` (the SPDGLA claimed marker) — the FIRST partner-killer only; un-fought wave ({-1,-1}) pays nothing.
- **The PLYG1/2 polarity trap** — the SAME two bytes arm at OPPOSITE values (co-op `CLR`→0, gladiator `LDA #-1`→−1); `recordPartnerKill` applies SPDGLA's single `INC ,Y` to the winner's byte, so the SAME partner-kill leaves a non-zero counter that VOIDS in co-op but flips −1→$80 to AWARD in gladiator. `createGame` boots the guards to {0,0} (PATC11) so a stale −1 never mis-awards.

**Bounty pass-through discipline:** every 3000 is `decodeDvalue('SCRHUN', 0x30)` (jt4-1's decode), never a fresh literal — a change to the SCRHUN decode reddens all three bounties.

**Tests:** 1480/1480 passing across 56 files (GREEN) — the 33 RED jt4-3 tests now pass, 1447 pre-existing untouched. `tsc --noEmit` + `vite build` green. Citations checker: 815 claims verified, exit 0.

**Deferred (documented as Delivery Findings, confirming TEA):** live partner-kill DETECTION in `stepGame` (needs a new `collisionPass` partner-kill event + the arm/award loop) and the egg-hatch spawn into `demo.ts` `spawnWaveEnemies` (needs WAVEGG's untranscribed egg placement). Both are the jt4-4 loop concern; the pure functions are fully built and tested. No existing test exercises either path (wave 5 / live gladiator award are unreachable in a unit window), so neither is verifiable by the suite this story.

**Handoff:** To Reviewer (Thought Police) for review.

## Subagent Results

Enabled specialists (`workflow.reviewer_subagents`): preflight, test_analyzer, security, rule_checker. The other five are disabled and pre-filled as skipped (they do not block the gate). All four enabled specialists were spawned against the jt4-3 diff (`dc85ed6..74998ad`, joust) and returned; the working tree was verified clean afterward (they mutation-tested and reverted — `git status` empty, constants intact).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (1480/1480 green, tsc+vite+lint exit 0, tree clean, 0 smells, all constants cited) | N/A |
| 2 | reviewer-edge-hunter | Skipped / disabled | disabled | — | — |
| 3 | reviewer-silent-failure-hunter | Skipped / disabled | disabled | — | — |
| 4 | reviewer-test-analyzer | Yes | findings | 3 (mutation-confirmed coverage gaps) + 1 doc nit | confirmed 3, dismissed 0, deferred 0 — all non-blocking (Medium/Low), forward-carried |
| 5 | reviewer-comment-analyzer | Skipped / disabled | disabled | — | — |
| 6 | reviewer-type-design | Skipped / disabled | disabled | — | — |
| 7 | reviewer-security | Yes | clean | none (purity boundary intact; computed-key `[claimKey]` proven safe — literal 'plyg1'/'plyg2' only, no proto-pollution; no untrusted I/O) | N/A |
| 8 | reviewer-simplifier | Skipped / disabled | disabled | — | — |
| 9 | reviewer-rule-checker | Yes | findings | 1 (Low: missing `readonly`); 12/13 TS groups + all 4 joust rules pass; rule-10 JSON.parse assessed compliant (trusted repo file) | confirmed 1 (Low), non-blocking |

**All received:** Yes (4 enabled returned; 5 disabled, skipped)
**Total findings:** 4 confirmed (0 Critical, 0 High, 2 Medium, 2 Low), 0 dismissed, 0 deferred-unaddressed — all non-blocking and forward-carried to TEA/jt4-4.

### Finding decisions (with tags)

- **[TEST] awardExtraMen integration untested** (`src/core/game.ts:461` awardWaveBounty), Medium, non-blocking — CONFIRMED. The shipped code IS correct (it calls `awardExtraMen`, faithful to the design ruling "SCRLEV runs on every score change"), but no jt4-3 test drives a bounty crossing the 20,000 extra-man threshold, so deleting the wrapper stays green. Coverage gap on correct code, not a defect. Mitigated: the same idiom is pinned in jt4-1/jt4-2's `creditScoreEvents`/`bookDeath`. Fix: add a `ledger(19_000)`-style bounty-crossing test. Not dismissed — a real gap; downgraded to Medium because the code is correct.
- **[TEST] stepGame guards carry-forward untested** (`src/core/game.ts:333`), Medium (inert plumbing this story), non-blocking — CONFIRMED, corroborates the Reviewer/TEA/Dev jt4-4 deferral finding. `stepGame` returns `guards: game.guards`; removing it leaves all 1480 green because nothing reads guards from a stepped game yet (detection is jt4-4). Fix belongs with jt4-4 when the seam goes live (seed non-default guards, assert carry-forward across a frame).
- **[TEST] recordPartnerKill `incd < 0` branch is unreachable dead code** (`src/core/game.ts:417`), Low, non-blocking — CONFIRMED, corroborates my own Delivery Finding (the branch is documented as mirroring ROM `DEC ,Y` :4688 but is not reachable from any modeled guard value, and does NOT reproduce the ROM's `$80`-preserve-on-re-INC). Fix in jt4-4: add a test forcing it, or remove the branch so it stops reading as a verified ROM claim.
- **[RULE]/[TYPE] missing `readonly` on `WaveGuards`/`WaveEndContext` fields + `guards`/`ctx` params** (`src/core/game.ts:94-111,410,442`), Low, non-blocking — CONFIRMED. The functions' JSDoc claims purity; marking the scalar fields/params `readonly` would enforce it at the type level (lang-review #2). Downgraded to Low, NOT dismissed: locally consistent with game.ts's own jt4-1/jt4-2 convention (`PlayerLedger`/`GameState` scalars are also unmarked) and the tuples in `WaveEndContext` already ARE `readonly`; purity is behaviorally pinned by the AC-4 tests, so there is no correctness risk — but the fleet convention (demo.ts/enemy.ts/frame.ts mark scalars readonly) makes this a worthwhile consistency fix.
- **Doc nit (not a finding):** a handful of `it()` blocks lack the explicit "Kills …" mutant comment ~20 siblings carry; the test-analyzer mutation-checked several and confirmed they DO catch regressions — a documentation-consistency soft-deviation, not a vacuous test.

**Verdict impact:** none of the four confirmed findings is Critical or High; the shipped code is correct in every case (all four are coverage/type-enforcement gaps, not behavioral defects). Security clean; preflight clean; rule-checker 12/13 groups + all joust rules pass. APPROVED stands.

## Reviewer Assessment

**Verdict:** APPROVED

Specialist tags: [TEST] [RULE] [TYPE] (security [SEC] N/A / clean — pure core, no I/O, auth, or external input surface; the `reviewer-security` specialist returned clean).

**Specialist subagents:** all 4 enabled (preflight, test-analyzer, security, rule-checker) spawned + returned; results + finding decisions recorded in `## Subagent Results` above. 4 confirmed findings, all Medium/Low and non-blocking; 0 Critical/High. Tree verified clean after their mutation-testing.

**Suite + build (re-run by Reviewer, not trusted from Dev):**
- `npm test` → 56 files / 1480 tests PASSING, exit 0 (matches the claim). The "3 citation error(s)" + "jt1-9-empty … refusing to report success" lines in the output are the citation checker's own NEGATIVE self-tests (deliberately fed broken/empty input), not failures.
- `npm run build` (`tsc --noEmit && vite build`) → green, exit 0.
- Working tree clean after the mutation-check (`git status` empty; `GLADIATOR_ARM` restored to −1 via `git checkout` of the working copy only).

**ROM independent diff (read JOUSTRV4.SRC directly — did NOT trust the tests' citations):** CLEAN. Every cited region verified line-by-line against `/Users/slabgorb/Projects/a-2/reference/williams-source/joust/JOUSTRV4.SRC` (LF-only, no CRLF issue):
- WJSRTB 2586-2591 — six FDB entries; egg→WAVEGG@2590, gladiator→WGLAD@2589. ✓
- Degrade laws — co-op→survival solo @2628-2631; gladiator no-op solo @2697-2700 (→WAVRT2 RTS@2716). ✓
- PLYG1/2 POLARITY — co-op `CLR`→0 @2634-2635; gladiator `LDA #-1`→−1 @2703-2705. Transcribed correctly in BOTH directions. ✓
- Co-op bounty — `LDA PLYG1 / ORA PLYG2 / BEQ` void-guard @2642-2644; `LDA #$30 / JSR SCRHUN` @2651-2652. ✓
- Survival — `LDA PLYD1 / BNE ENDTS` deathless gate @2677-2678. ✓
- Gladiator — SPDGLA `INC ,Y`@4685, `BEQ SPDGLA`@4687, `DEC ,Y` keep-positive@4688, `CLR PLYG1/2`@4691-4692, `LDA #$80` "INDICATE TRUE WINNING GLADIATOR"@4693, `LDA #$30` "SCORE 3,000"@4697. ✓
- PATC11 — `CLR PLYG1` "RESET 3,000 POINT TRIGGER"@6282, `CLR PLYG2`@6283, displaced `JMP EMSGS` "(OLD INSTRUCTION)"@6284, preserved as a `********` comment in `createGame`. ✓
- SCRHUN — "THOUSANDS & HUNDREDS BCD DIGIT"@7342 → $30 = 3×1000 = 3000; `decodeDvalue('SCRHUN',0x30)===3000` is the pass-through, never a literal. ✓
- All 11 JT43-* claim verbatims match their cited lines; the byte-gate + source re-derivation tests EXECUTED here (vendored tree present → `vendoredAvailable` true, not silently skipped).

**Mutation-check (polarity):** flipped `GLADIATOR_ARM` −1→0 → 8 tests RED across both suites (arming, the polarity-inversion, all gladiator-bounty paths, and the non-vacuous determinism guard). The polarity is genuinely pinned, not scenery. Restored; tree clean.

**Test quality:** every non-award path is pinned — co-op void (both players, not just the killer's share), survival non-deathless (PLYD gate), gladiator second-killer-gets-nothing + nobody-killed-no-bounty. The determinism block carries an explicit NON-VACUOUS assertion (awards moved score / void paid neither). Pass-through discipline (`decodeDvalue('SCRHUN',$30)`, not a `3000` literal) is enforced. Double-entry intact: `loadGameBounty` is a genuine dynamic import of the built module; the independent source reader is not imported by the contract, so the two derivations stay separate.

**Data flow traced:** a partner-kill → `recordPartnerKill(armWaveGuards(type), winner)` → `awardWaveBounty(players, type, ctx)` → the entitled ledger's `score`/`scoreBcd` (+ extra-man re-check). The SAME kill VOIDS in co-op and AWARDS in gladiator — the inversion is observable and tested.

**Pattern observed:** `game.ts` stays pure core — imports only `./demo.js`, `./wave.js`, `./flight.js`; no shell import, no `Date.now`/`Math.random`/entropy. The purity sweep is `it.each` over a live `readdirSync(src/core, {recursive})`, so it swept the new `game.ts` surface automatically (`tests/purity.test.ts:211`). `WAVE_BEHAVIOUR` is a frozen total `Record<ResolvedWaveType, WaveBehaviour>` — tsc proves every resolved type carries a behaviour.

**Error handling:** pure functions, no throws on the hot path; index-out-of-range is impossible (`paid.has(i)` is only consulted over the actual ledger array; extra `alive`/guard indices in a 1P game are never read).

**Ruling on the deferral question (the big one): the deferral is ACCEPTABLE — not a blocking scope hole.**
- AC-2, AC-3, AC-4 are fully and unambiguously satisfied by live, tested behaviour (the three bounties + non-award paths; the polarity inversion + PATC11 boot cleanup in `createGame`; determinism + purity).
- AC-1's own wording — "the egg wave type spawns its wave as eggs AND the gladiator wave arms PvP **through jt2-5's WJSRTB dispatch**" — scopes it to the dispatch-routing level. `eggWaveSpawnsEggs` flows through `dispatchWaveType`; `armWaveGuards` is keyed on the dispatch-resolved type; `waveTypeBehaviour` routes all six. That routing IS satisfied and tested.
- The two DEFERRED items are (a) live partner-kill DETECTION in `stepGame` and (b) the egg-hatch SPAWN into `demo.ts spawnWaveEnemies`. Both fall to jt4-4, which the epic design explicitly assigns "the wave-to-wave loop … consolidate stepDemo's loop under stepGame" (spec §Stories/jt4-4, §Design rulings "matured across the epic (its wave-to-wave loop consolidated in jt4-4)"). The detection+arm+award loop IS that loop concern.
- The egg-spawn deferral is additionally justified: a faithful spawn needs WAVEGG's EGG1 placement table (:2780-2799+), which is OUTSIDE jt4-3's citation scope and untranscribed. Shipping a guessed placement into the deterministic sim would violate the citation discipline the whole regime exists to enforce — deferring until it is transcribed is the correct call, not a shirk.
- The deferral is fully documented and forward-carried (TEA + Dev Delivery Findings + Design Deviations), so it is transparent, not smuggled past review.
- Forward carry (non-blocking, logged as a Reviewer Delivery Finding): jt4-4 must close BOTH wirings and land a wave-5 egg-spawn integration test + a live-gladiator-award integration test, and guard `recordPartnerKill` against a same-winner re-kill losing the `$80` claim.

**Deviation audit:**
- TEA — egg pinned at dispatch/predicate level (not wave-5 integration): ACCEPTED (AC-1 "through the dispatch" wording + ptero precedent + wave-5 unreachable in a unit window).
- TEA — all three bounties modelled at wave-end via `awardWaveBounty` (gladiator credited at kill-time in ROM): ACCEPTED (observably equivalent; the flip-claimed guard marks the first killer; more faithful than an alive-gate since the ROM credits at kill-time).
- TEA — gladiator claimed-marker value left to Dev: ACCEPTED (behaviour fully pinned via `awardWaveBounty`).
- Dev — jt4-3 surface on `game.ts` not a separate module: ACCEPTED (the contract loader defines the seam).
- Dev — `$80` claimed marker modelled as +128 read by `awardWaveBounty`: ACCEPTED with a LOW forward note (the model's `incd<0` branch does not reproduce the ROM's `DEC`-keep-positive on a same-winner re-INC — see Reviewer Delivery Finding; unreachable this story).
- No UNDOCUMENTED deviations found.

**Observations (5+):** (1) ROM diff clean across all 8 cited regions + $80 marker + displaced-instruction comment; (2) polarity mutation-proven (8 reds); (3) non-award paths all pinned + non-vacuous determinism; (4) purity boundary held and actually swept; (5) pass-through discipline enforced (3000 = decode, not literal); (6) `recordPartnerKill` same-winner re-kill divergence (LOW, jt4-4).

**Findings:** 0 Critical, 0 High, 0 Medium blocking. 4 confirmed non-blocking (2 Medium test-coverage: awardExtraMen-bounty integration + stepGame guards carry-forward; 2 Low: recordPartnerKill `incd<0` dead branch + missing `readonly` on WaveGuards/WaveEndContext). All are coverage/type-enforcement gaps on CORRECT code, forward-carried to TEA/jt4-4. None block. See `## Subagent Results` for per-finding decisions.

**Handoff:** To SM for finish-story.