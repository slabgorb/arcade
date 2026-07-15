---
story_id: "rb4-4"
jira_key: "rb4-4"
epic: "rb4"
workflow: "tdd"
---
# Story rb4-4: WIRE UP THE DEAD MECHANICS — the returning ace is never imported and the player CANNOT DIE

## Story Details
- **ID:** rb4-4
- **Jira Key:** rb4-4
- **Workflow:** tdd
- **Type:** bug
- **Points:** 13
- **Priority:** p1
- **Repos:** red-baron
- **Branch:** fix/rb4-4-wire-dead-mechanics
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-15T08:47:40Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-15T07:23:32Z | 2026-07-15T07:26:45Z | 3m 13s |
| red | 2026-07-15T07:26:45Z | 2026-07-15T08:02:53Z | 36m 8s |
| green | 2026-07-15T08:02:53Z | 2026-07-15T08:24:15Z | 21m 22s |
| review | 2026-07-15T08:24:15Z | 2026-07-15T08:47:40Z | 23m 25s |
| finish | 2026-07-15T08:47:40Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Question** (non-blocking): the ROM's evade branch ORDER and side-polarity differ from returning-ace.ts's inferred nesting. EOLSEQ (RBARON.MAC:1081-1094) reads: wrong side (`ENSIDE EOR PLDELX / BPL "SORRY WRONG X"`) → death path; soft turn (`CMP I,1C / BCC`) → death path; only a correct HARD bank reaches BEFLAG, whose first time is free and 50/50 thereafter — whereas the module grants the freebie unconditionally and gives a level pass the coin flip. The EOR polarity also suggests the correct side may be OPPOSITE the sign stored in ENSIDE. AC-1 explicitly forbids rewriting the module in this story ("do not rewrite it, wire it"), so the wiring tests pin only drive/reach/coupling. Affects `src/core/returning-ace.ts` (a future fidelity story should re-derive the nesting from :1081-1094). *Found by TEA during test design.*
- **Conflict** (non-blocking): ground-collision LIVE units are blocked on rb4-5. The SCAPE silhouettes peak at ~24 picture units while the live eye is I4YPOS/4 ≈ 132, and the two scales only meet through the projection rb4-5 is rewriting (the ROM subtracts I4YPOS from object Y before the divide, RBGRND.MAC:277-283; today main.ts even draws mountains with eye [0,0,0]). The predicate is pinned unit-consistently (tests/core/ground-collision.test.ts) and its DRIVE is pinned in the cockpit; a real fly-into-a-mountain death needs the unit bridge, coordinated with rb4-5 (PR red-baron#26, open/CONFLICTING). Affects `src/core/ground-collision.ts` + rb4-5. *Found by TEA during test design.*
- **Improvement** (non-blocking): DSPLIF — the ROM displays the remaining lives every calc frame as LPLANE icons (`JSR DSPLIF ;DISPLAY PLAYER LIVES`, RBARON.MAC:824; DLIVES loop :1521-1528) — is unported and NOT pinned here (scope restraint). Follow-up story candidate: the lives HUD. Affects `src/main.ts` (draw). *Found by TEA during test design.*
- **Improvement** (non-blocking): ENDLFE WAITS for the score queue to drain before taking the life (`LDA SCRTAB+3 / BNE 10$`, RBARON.MAC:1202-1203) — game over should not fire while the count-up is still ticking. Not pinned (module coupling); Dev should gate the ENDLFE step on `pending === 0`. Affects `src/main.ts` wiring + `src/core/eol.ts`. *Found by TEA during test design.*
- **Question** (non-blocking): SCOREM defers its tick while other sounds play (`LDA A,POINT+4 / ORA A,POINT+2 / ORA EXCNTR / BNE 30$`, RBARON.MAC:1541-1544). Core cannot read shell audio state, so the contract omits it — acceptable descope, or should the tick defer on a core-visible proxy (e.g. frames since last explosion event)? Affects `src/core/score-countup.ts`. *Found by TEA during test design.*
- **Improvement** (non-blocking): lives.ts's header claim that the death sub-stages have "NO ROM-pinned durations" is REFUTED — EOGTMR seeds + .TIME1/.TIME2 (RBARON.MAC:505-506, 1061-1066, 1124-1126, 1163) pin them exactly (shells 28 calc frames, ground 13, starfield from 16). Dev should correct that comment when wiring `src/core/eol.ts`. Affects `src/core/lives.ts` (comment only). *Found by TEA during test design.*
- **Improvement** (non-blocking): rng-stream discipline for determinism — the ace's 50/50 rolls must NOT be drawn from the blimp's rng stream (`blimpRng`), or the seed-calibrated cockpit suites (and the blimp's own trajectory) shift. A dedicated seeded stream (same `Date.now()`-derived pattern) keeps every wiring test deterministic. Affects `src/main.ts`. *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): the death sequence has NO visuals yet — eol.ts exposes `eolStage` ('spiral' | 'starfield') and lives.ts's DEATH_SEQUENCE cursor still waits for the bullet-hole/spiral/starfield render story (findings §5). Affects `src/shell` (a future render story). *Found by Dev during implementation.*
- **Improvement** (non-blocking): GMEND0 = 0x82 "PLANES FLY AWAY" (RBARON.MAC:1068-1070, PLNZD0 sets the departure Z deltas) is not implemented — during a shells death the planes keep weaving instead of departing. Affects `src/main.ts` + `src/core/enemy.ts` (future fidelity story). *Found by Dev during implementation.*
- **Question** (non-blocking): TEA's ENDLFE-waits-for-the-score-drain suggestion (:1202-1203 — game over should not fire mid-count-up) is NOT implemented; ENDLFE fires when the EOGTMR runs out regardless of pending score. No test pins it; a kill just before a fatal crash could roll its ticks past the GAME OVER card. Affects `src/main.ts` `preMotionFrame`. *Found by Dev during implementation.*
- **Improvement** (non-blocking): the GAME OVER card is a terminal state — no restart input, no high-score entry (NW.HSC :1210-1212), no attract loop. The lobby/highscore contract (@arcade/shared/highscore) is the natural next story. Affects `src/main.ts`. *Found by Dev during implementation.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Death-channel durations pinned to the ROM's EOGTMR machine, correcting the AC's decode**
  - Spec source: context-story-rb4-4.md, AC-2
  - Spec text: "carry the ROM's own durations (.TIME1=16, .TIME2=28 calc frames = 1.536 s / 2.688 s at 96 ms)"
  - Implementation: tests/core/eol-sequence.test.ts pins ONE count-up timer with channel-dependent seeds — shells seed 0 → 28 frames (2.688 s), ground seeds 0x0F → 13 frames (1.248 s), starfield boundary at .TIME1=16 (RBARON.MAC:1061-1066, 1124-1126, 1163) — not per-channel durations of 16 and 28.
  - Rationale: .TIME1 is the spiral→starfield boundary INSIDE the sequence, not a channel's length; both channels terminate at .TIME2. The AC's parenthetical is a decode error; the ROM is the epic's authority (and the tp1-27 lesson: re-derive a constant from its consumer).
  - Severity: minor
  - Forward impact: Dev implements src/core/eol.ts to the ROM machine; the AC text stands corrected by the test citations.
- **AC-4 bonus-life wiring pinned at unit + producer level only (no cockpit BN test)**
  - Spec source: context-story-rb4-4.md, AC-4
  - Spec text: "Extra lives are awarded (BONUSL…), and the bonus-life event is EMITTED so the BN sound can fire"
  - Implementation: the BONUSL ladder, its option column, its FF table end, and the bonus-life emission are pinned in tests/core/score-countup.test.ts + events-have-producers; no booted-cockpit test drives a 2000-point run to hear BN.
  - Rationale: reaching 2000 needs ~7 kills against gun overheat and wave stalls — not deterministically stageable hands-off pre-GREEN; the unit + producer + dispatch (already wired) layers close the chain.
  - Severity: minor
  - Forward impact: none (Reviewer may eyeball BN in a live run).
- **AC-3 ground collision: predicate relations pinned, live-unit bridge and PCDX boundary left to Dev citation**
  - Spec source: context-story-rb4-4.md, AC-3
  - Spec text: "flying into a mountain kills you, via the ROM's GREND path (RBARON.MAC:4643-4645, D6=GROUND COLLISION), checked BEFORE motion each frame"
  - Implementation: depth gate (0x0201, :4634-4638), lane/altitude relations, totality, and the every-ground-frame DRIVE are pinned; the PCDX=0xC1 window value (:457) is cited but not boundary-pinned, and no end-to-end mountain death is staged.
  - Rationale: the silhouette units and the eye height only reconcile through rb4-5's projection rewrite (see Delivery Finding); staging both sides far from the window boundary keeps the tests correct under any faithful PCDX transcription.
  - Severity: minor
  - Forward impact: rb4-5 coordination; a follow-up may pin the PCDX boundary once the projection lands.
- **AC-1 attack cadence not pinned to an exact frame count**
  - Spec source: context-story-rb4-4.md, AC-1
  - Spec text: "the ROM calls EOLSEQ every calc frame (RBARON.MAC:825)"
  - Implementation: tests/ace-wiring.test.ts pins the per-calc-frame DRIVE (≥90% of frames consulted), the floor-triggered pass, the consumed freebie, repetition (≥2 attacks), and hit→crash coupling — but not "the attack resolves exactly 12 frames into the pass" (PLSTAT+7 == 0x0C, :1078-1080, cited as guidance).
  - Rationale: the returning plane's re-entry flight path (which PLSTAT+7 times) is explicitly a later render story per the module's own scope note; pinning its counter now would force unowned scope.
  - Severity: minor
  - Forward impact: the re-entry story should pin the 0x0C attack frame.
- **GAME OVER's on-screen form pinned as a /game over/i HUD text**
  - Spec source: context-story-rb4-4.md, AC-2
  - Spec text: "reaching zero ends the game"
  - Implementation: tests/dead-mechanics-wiring.test.ts requires a fillText matching /game over/i and no wave announce afterward.
  - Rationale: the ROM enters high-score entry (NW.HSC, :1210-1212), which is its own story; a minimal visible end-state is the smallest honest observable of "the game ended".
  - Severity: minor
  - Forward impact: a high-score-entry story supersedes the text card later; the test's regex survives (the card can host it).

### Dev (implementation)

- **Sibling re-pin: cockpit-draw-path's measured shell total 82 → 52**
  - Spec source: tests/shell/cockpit-draw-path.test.ts (the suite's own "measured, then pinned" protocol)
  - Spec text: "if a future change moves them, this fails and someone re-reads the numbers on purpose"
  - Implementation: re-measured under the pinned clock after the death model landed (the pilot dies mid-run; EOL clears GUN.ST so no new shells for 28 calc frames) and updated the literal with a citation comment.
  - Rationale: the suite explicitly invites a deliberate re-read on legitimate behavior change; the anti-vacuity floor holds (52 >> 0, all its other assertions pass untouched).
  - Severity: minor
  - Forward impact: none — the number remains a deterministic property of the code.
- **Shells death animates the war; only the GROUND channel freezes the world**
  - Spec source: context-story-rb4-4.md AC-3 ("checked BEFORE motion each frame") + RBARON.MAC:783-789
  - Spec text: "BIT GREND / BVS 20$ ;PLAYER RAN INTO GROUND" ahead of PFMOTN/NWPLNE/PLMOTN
  - Implementation: the BVS tests V = D6 (the GROUND bit), so only a ground death consumes whole frames; a shells death zeroes the pilot (no flight step, no trigger) while planes, wrecks, mountains and the airship keep stepping.
  - Rationale: ROM-faithful (D7-only GREND does not take the :783 branch), and the freeze-everything alternative broke the rb4-1 blimp lifecycle suites (a paused airship never crosses; frozen shells inflate the draw counts).
  - Severity: minor
  - Forward impact: the "planes fly away" departure (GMEND0=0x82) remains open — see Delivery Findings.
- **BEFLAG's free dodge is per-GAME, not per-pass**
  - Spec source: context-story-rb4-4.md AC-1; src/core/returning-ace.ts (beginPass arms firstPass)
  - Spec text: "first evasion free via BEFLAG, 50/50 thereafter"
  - Implementation: one ReturningAce object persists across deaths/respawns for the whole game; beginPass runs once (the ROM stores BEFLAG as a global the game start clears, not the pass).
  - Rationale: re-arming the freebie per pass would hand a free dodge after every respawn — not "FIRST TIME FREE"; TEA's wiring pin (`slice(1).every(!firstPassBefore)`) encodes the same reading.
  - Severity: minor
  - Forward impact: the re-entry flight-path story (which owns NWENME/PLSTAT+7 in full) should confirm when GMINIT clears BEFLAG.
- **Game over keeps the sim animating (attract's seat), gated rather than halted**
  - Spec source: context-story-rb4-4.md AC-2 ("reaching zero ends the game"); RBARON.MAC:1205-1212
  - Spec text: "BIT GAMODE / BPL INITIAL ;ATTRACT (RESTART) … JMP NW.HSC ;CHECK FOR HSTB ENTRY"
  - Implementation: gameOver stops waves, damage, attacks and firing, draws the card, but the yoke still flies and the leftover war animates behind it.
  - Rationale: the ROM parks in attract/high-score, worlds that keep moving; a hard-halted loop would also have deleted a visible airship mid-drift (the rb4-1 suites forbid exactly that).
  - Severity: minor
  - Forward impact: the high-score/restart story replaces the card with the real NW.HSC seat.

---
## Sm Assessment

Setup complete for rb4-4 (13 pts, p1, bug, tdd) — the story that turns the Red Baron clone back into a game. Session file, story context (sprint/context/context-story-rb4-4.md), and branch `fix/rb4-4-wire-dead-mechanics` (off red-baron develop @ f01c5c7, synced) are all verified on disk; story moved to in_progress, assigned slabgorb, started 2026-07-15.

**Scope routed to TEA (red phase):** six ACs — wire the never-imported returning-ace.ts (EOLSEQ every calc frame, RBARON.MAC:825; do NOT rewrite the evade logic, it is correct); make `lives` READ (two distinct death channels, .TIME1=16/.TIME2=28 calc frames = 1.536 s/2.688 s); GREND ground collision BEFORE motion (RBARON.MAC:783-784); BONUSL extra lives + bonus-life emission (RBARON.MAC:1602); SCOREM score count-up emitting score-tick so TK/TP/BN can fire (audio layer is already correct — producers are missing); and a totality test that every declared GameEvent has a producer.

**Hazards for the pipeline:** (a) FRMECNT=4 — all ROM durations above are CALC frames at ~10.4 Hz (96 ms), not display frames; the ~6x cadence trap is documented in the story context. (b) rb4-5's camera rewrite (red-baron PR #26, open, CONFLICTING) races this story on the same repo — expect develop to move mid-story; rb4-5 set to in_review to satisfy the merge gate (awaiting the user's merge). (c) Three ROM source copies disagree on line numbers — cite against the copy the repo's existing citations use.

**Handoff:** to Imperator Furiosa (TEA) for the red phase.
---
## TEA Assessment

**Tests Required:** Yes
**Reason:** n/a (13-pt p1 bug, tdd — the story that makes the game killable)

**Test Files:**
- `tests/core/score-countup.test.ts` — the SCOREM queue+drain machine + the BONUSL bonus-life ladder (contract for `src/core/score-countup.ts`; import-RED)
- `tests/core/ground-collision.test.ts` — the PLYCOL predicate behind GREND: 16-bit 0x0201 depth gate, lane/altitude relations, totality (contract for `src/core/ground-collision.ts`; import-RED)
- `tests/core/eol-sequence.test.ts` — the EOGTMR count-up: shells 28 / ground 13 calc frames, starfield at 16, ENDLFE at 28 (contract for `src/core/eol.ts`; import-RED)
- `tests/core/events-have-producers.test.ts` — AC-6 totality: every declared GameEvent has a producer in src/ (assertion-RED on exactly `score-tick` + `bonus-life`; scanner-teeth meta-tests green)
- `tests/ace-wiring.test.ts` — booted cockpit: returning-ace DRIVEN per calc frame, floor-triggered pass, BEFLAG freebie consumed, attacks repeat, hit→crash coupling, live PLDELX read (assertion-RED: 0 calls today)
- `tests/dead-mechanics-wiring.test.ts` — booted cockpit ×2 runs: HUD score COUNTS UP (≤ +100/frame) with TK/TP tones (fire-held run, kill at calc frame 7); hands-off long run: pilot dies, death FREEZES the horizon then thaws, ≥2 crashes then GAME OVER, war stops behind it
- `tests/ground-collision-wiring.test.ts` — booted cockpit: groundCollision consulted on every ground-wave calc frame with live mountains (staging meta-guard green — the MODECT ground slot demonstrably runs)
- `tests/helpers/boot-cockpit.ts` — the shared harness (rb4-1's booted-cockpit pattern + keys + fast 96 ms ticks = one calc frame per tick)

**Tests Written:** 55 new tests (18 assertion-RED + 30 unit tests behind import-RED + 7 green staging/keep guards) covering all 6 ACs
**Status:** RED (verified by testing-runner: 18 failed | 909 passed, 7 failed files, ZERO collateral — no pre-existing file fails)

**Quarry:** every citation resolved against the citable copy `~/Projects/red-baron-source-text/RBARON.MAC` (fingerprint anchors verified: :74 `.RADIX 16`, :621 `CALCNT =18`, :6217 `.RADIX 10`, :6281 `.RADIX 16`). Key derivations: SCOREM runs at NMEXIT every 4 ms NMI (RBGRND.MAC:236) so STINIT=0x18 → one +10 tick per 96 ms calc frame; the two GREND writers are :3758-3759 (0x80, shells) and :4643-4645 (0xC0, ground); BONUSL is BCD-thousands, option column × EXLIFE row (:1582-1608).

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| #1 type-safety escapes | no `as any`/`@ts-ignore` anywhere in the new suites; taps typed via `importOriginal<typeof import(...)>` | clean (self-check) |
| #3 exhaustiveness | events-have-producers = the PRODUCER half of the dispatch's `never` guard (consumer half already compiled) | failing (RED) |
| #4 null/undefined | hudScore null-handling; `?? -1`/`?? []` on optional reads; totality tests pin NaN/negative folds (queueScore, groundCollision, gmlevl-style clamps) | failing (RED) |
| #8 test quality | staging meta-guards ("this suite is not vacuous") in all 3 cockpit files; producer-scanner teeth tests; table-END test on BONUSL (no 4th award) | mixed by design (guards green, ACs red) |
| #10 input validation | degenerate-input tests on every new module boundary (NaN depth, NaN eye, negative points) | failing (RED) |

**Rules checked:** 5 of 13 lang-review rules apply to pure-core test design; the rest (React/async/build/perf) have no surface in this diff.
**Self-check:** 2 deliberate implication-guards in ace-wiring pass vacuously today (`every hit→crash` / `turnRate===0` over an empty call log) — their preconditions are enforced by the sibling RED tests ("consulted at all", "attacks REPEAT"), so they cannot stay vacuous post-GREEN. No other vacuous assertions found.

### Notes for The Word Burgers (Dev)

1. The three unit files' headers ARE the module contracts (exports, semantics, citations). Do not weaken a literal to make a test pass — every constant is cited to the fingerprinted source.
2. Wiring goes in main.ts's calc-frame loop (the assembled-events idiom). The cockpit taps watch the REAL modules — importing without calling, or calling with fabricated args (e.g. a non-zero turnRate hands-off), fails loudly.
3. Keep the ace's 50/50 rolls OFF the blimpRng stream (Delivery Finding: rng discipline) or the seed-calibrated staging shifts.
4. The death sequence must gate flight motion (the freeze test) — the ROM zeroes PLDELX/PLDELY (:1108-1113) and GREND gates PFMOTN (:783-785).
5. AC-2's ".TIME1=16 = shot-down duration" parenthetical is corrected by the eol-sequence suite (deviation logged): seeds 0/0x0F, both channels end at .TIME2=28.

**Handoff:** To **The Word Burgers (Dev)** for GREEN.
---
## Dev Assessment

**Implementation Complete:** Yes

**Files Changed (red-baron, branch `fix/rb4-4-wire-dead-mechanics`, commits c82d3bf + 35ac590):**
- `src/core/score-countup.ts` (new) — the SCOREM queue+drain machine + BONUSL ladder, to TEA's contracted API; the two dead events (`score-tick`, `bonus-life`) now have their producers here.
- `src/core/eol.ts` (new) — the EOGTMR two-channel death timer (shells 28 / ground 13 calc frames, starfield at .TIME1=16, ENDLFE at .TIME2=28).
- `src/core/ground-collision.ts` (new) — the PLYCOL predicate behind GREND (0x0201 16-bit depth gate, PCDX=0xC1 lateral window, altitude escape, totality).
- `src/core/returning-ace.ts` — ADDITIVE only: `ACE_ATTACK_FRAMES = 0x0C` (PLSTAT+7, :1078-1080). The evade logic is untouched, per AC-1.
- `src/core/lives.ts` — comment correction only (the refuted "no ROM-pinned durations" claim now points at eol.ts).
- `src/main.ts` — the wiring: a per-calc-frame `preMotionFrame` block mirroring the ROM's preamble (JSR EOLSEQ :825 → the ace drive/pass/attack off a dedicated rng stream; SCOREM tick in every state with INC LIVES on the BONUSL rung; ENDLFE → loseLife → respawn or GAME OVER; GREND checked before motion). Kills queue via `queueScore`; the HUD and wave sizing read `countUp.displayed`. Blimp damage routes through the same shells channel with its hit ROLL still drawn on every fire-frame (rng-stream discipline). GAME OVER: card drawn, waves/damage/firing stopped, the yoke still flies (the ROM's attract seat).
- `tests/shell/cockpit-draw-path.test.ts` — the measured-then-pinned shell total re-measured 82 → 52 per that suite's own protocol (its pinned-clock run now contains a death; comment documents it).

**Tests:** 969/969 passing (GREEN — testing-runner verified; tsc clean; `npm run build` clean). All 18 assertion-RED + 3 import-RED suites from TEA now pass; zero regressions.

**Key design facts for the Reviewer (Immortan Joe):**
1. **The freeze discriminant is GREND's D6** (`BIT GREND / BVS 20$`, :783-789): a GROUND death consumes whole frames (world + planes frozen); a SHELLS death grounds only the PILOT (PLDELX/PLDELY zeroed :1108-1113, GUN.ST cleared :1109-1110) while the war animates on. My first freeze-everything draft broke the rb4-1 blimp lifecycle suites — the fix was faithfulness, not test surgery.
2. **The pre-motion block is a brace-free call** (`if (preMotionFrame(events)) continue`) because tests/cockpit-boot.test.ts pins `step(` inside the accumulator with a no-`}`-between regex. The helper does its own simFrame/accumulator bookkeeping on consuming paths to keep `blimpFires(simFrame)` parity exact.
3. **rng-stream discipline held:** the ace rolls draw from `aceRng` (own seed); the blimp's per-shot roll is still drawn on every fire-frame with only the EFFECT gated — no sibling seed shifted.
4. **BEFLAG is per-game:** one `ace` object persists across respawns (the freebie never re-arms), matching the ROM's global and TEA's `slice(1).every(!firstPassBefore)` pin.

**Branch:** fix/rb4-4-wire-dead-mechanics (pushed — 35ac590)

**Handoff:** To the review phase.
---
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 1 advisory (branch behind develop) | confirmed 1 (resolved in-round: user rebased, Reviewer integrated + re-verified) |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 4 (1 high, 3 medium) + 5-mutation table | confirmed 4, all FIXED in-round (commit 1623f79); mutation re-proof RED |
| 5 | reviewer-comment-analyzer | Yes | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | Yes | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A (3 rule areas, 12 instances, 0 violations) |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 1 (minor citation mismatch) | confirmed 1, FIXED in-round (main.ts wave-gate comment → :783-789) |

**All received:** Yes (4 enabled returned — preflight, test-analyzer, security, rule-checker; 5 disabled via workflow.reviewer_subagents)
**Total findings:** 6 confirmed, 0 dismissed, 0 deferred — all 6 resolved in-round

## Reviewer Assessment

**Verdict:** APPROVED

This review covers BOTH the story diff AND the mid-review integration: while the specialists ran, rb4-5 (#26, the camera rewrite) and SH2-22 (#27, the synth persistentVoice migration) merged to develop; the user rebased the branch onto develop (8cdbd96) and the Reviewer resolved the one conflict (src/main.ts — their translated-world draw pipeline + our countUp.displayed and GAME OVER card), refreshed the repinned @arcade/shared v0.15.0, and re-verified the UNION tree: 990/990 tests, tsc clean, build clean, citations suite green, TOTAL_LIVE_SHELLS=52 holding unchanged on the union. This is a same-session TEA+Dev+Review pipeline, so per the tp1-10 discipline the adversarial subagents' MUTATION-PROVEN findings were treated as ground truth over my own recollection — and they earned it: the mutation pass caught MY OWN freeze test being scenery (below). The verdict rests on their evidence plus my serial re-verification, not on authorship confidence.

| Severity | Issue | Location | Status |
|----------|-------|----------|--------|
| [HIGH] [TEST] | The 'death FREEZES the playfield' test NEVER pressed the bank key — its pressKey gate (`crashes.length === 0`) was already closed by a same-iteration bookkeeping refresh; deleting the freeze gate in main.ts left it GREEN. The epic's cardinal sin (a guard that is scenery), in the story's own new suite. | tests/dead-mechanics-wiring.test.ts:151 | ✅ FIXED in-round (1623f79): one-shot boolean gate + a `bankHeld` staging assert; mutation re-proof: gate removal → exactly that test RED. |
| [MEDIUM] [TEST] | Two ace-wiring implication guards ("every hit costs", "live turnRate") pass vacuously over an empty rec.evade (mutation: attack-path removal). | tests/ace-wiring.test.ts:167,178 | ✅ FIXED: non-emptiness preconditions added (seed 12345 yields 2 hits / 5 evades, so they bind). |
| [MEDIUM] [TEST] | ACE_ATTACK_FRAMES (0x0C) lacked the pinned-value test every sibling hex constant carries. | src/core/returning-ace.ts | ✅ FIXED: pinned in tests/core/returning-ace.test.ts (0x0c = 12). |
| [LOW] [RULE] | Wave-gate comment cited :787-788 (the GRMODE gate) for the EOL plane-generation skip; the real mechanism is the BVS 20$ jump at :783-789. Real lines, wrong attribution — functionally harmless. | src/main.ts | ✅ FIXED: comment re-cited. |

### Subagent finding disposition (tagged)

- [PREFLIGHT] clean — 969/969 (pre-rebase), tsc 0, build 0, citations 115/115, tree clean, zero debug residue; flagged the branch 7 behind develop → resolved by the user's rebase + this review's integration verification (990/990 post-rebase). CONFIRMED.
- [TEST] 4 findings — the scenery freeze guard (HIGH, mutation-proven, fixed + re-proven RED), 2 vacuous implication guards (fixed), 1 missing constant pin (fixed). The other 4 of 5 mutations were RED-as-expected on first proof (whole-pending tick, score-tick event drop, GROUND_EOL_START=0, evadeCheck removal), each failing EXACTLY the intended test. CONFIRMED, all remediated.
- [SEC] clean — core purity independently verified on all 3 new modules + 2 edited (no Date/Math.random/DOM/shell imports; grep zero hits); determinism (aceRng seeded via createRng, consumed only via nextFloat, separate from blimpRng); no-throw contract on preMotionFrame traced (enemies[0] unreachable-when-empty via closesPast(+Infinity)=false; typed -1|1 side; no double-consume of the accumulator). CONFIRMED clean.
- [RULE] 1 minor violation in 78 instances across 15 rules — the citation mismatch (fixed). Rules #1-#13: ZERO type-safety escapes, zero ||-vs-?? misuse on the zero-legal numerics (pending/cooldown/displayed/timer/depth/eyeHeight), import type correct everywhere, mock signatures byte-matched to AudioEngine. The checker also independently BYTE-VERIFIED 20 ROM citations against the fingerprinted citable source — :507 STINIT, :505-506 .TIME1/.TIME2, :1064 ground seed, :457 PCDX, :4634-4638 the 16-bit depth gate, :1605-1608 BONUSL (with the decimal misreadings 16000/21000 refuted as absent), :1078-1080 PLSTAT+7, and a dozen more — all exact. CONFIRMED compliant.
- [EDGE] self-covered (disabled): the boundary work is in the unit suites — the BONUSL table END (no 4th award), the 0x0200/0x0201 depth-gate edge, pending==100 tick-size boundary, NaN/negative totality on every new module boundary; the accumulator/consumeFrame bookkeeping traced by [SEC] with no double-consume path. No blocking edge found.
- [SILENT] self-covered (disabled): no try/catch, no swallowed error in the diff; the one deliberate silence (blimp hit-roll drawn but effect gated while dying/game-over) is the rng-stream-discipline pattern, signposted in a comment and load-bearing for determinism. No finding.
- [DOC] self-covered (disabled): the diff's comments carry citations the rule-checker byte-verified; the one inaccurate attribution was caught by [RULE] and fixed; lives.ts's stale "no ROM-pinned durations" claim was already corrected by the story itself.
- [TYPE] self-covered (disabled): new types are readonly-field interfaces (ScoreCountUp, EolState) and closed string unions (EolChannel); no stringly-typed API, no unsafe cast ([RULE] corroborates: zero escapes).
- [SIMPLE] self-covered (disabled): the wiring is one helper + gates on the existing loop; the three modules are single-purpose with no speculative abstraction; ACE_ATTACK_FRAMES went to core rather than a main.ts literal per the repo's no-constants-in-main rule. Net scope matches the six ACs.

### Rule Compliance (lang-review typescript.md, per rule-checker's exhaustive pass + my spot-checks)

- **#1 type-safety escapes:** COMPLIANT — 0 `as any`/`as unknown as`/`@ts-ignore`/bare `!` across the whole diff; the helper's `rafCallback as ...` cast is null-guarded one line above (house pattern).
- **#2 generics/readonly:** COMPLIANT — readonly params on all new pure functions; `events: GameEvent[]` in preMotionFrame is an intentional output accumulator (house pattern at the call site).
- **#3 exhaustiveness:** COMPLIANT — EolChannel/EvadeResult are 2-arm unions consumed by explicit `===` branches, no switch added; the GameEvent dispatch's `never` guard is untouched and the producer half is now guarded by events-have-producers.
- **#4 null/undefined:** COMPLIANT — every `??` correct (`?.frame ?? -1`, `batches[0] ?? []`); the one `|| 0` (optionIndex) is the NaN-fold clamp idiom where `??` cannot substitute and 0 is the legitimate fold target.
- **#5 module/declaration:** COMPLIANT — `import type` on every type-only import in all new files.
- **#8 test quality:** COMPLIANT after remediation — 0 `as any` in assertions; mocks byte-match AudioEngine; the 3 vacuous-guard findings fixed and mutation-re-proven.
- **#10 input validation:** COMPLIANT — totality guards on every new module boundary, each with a dedicated degenerate-input test.
- **Core purity (the hard boundary):** COMPLIANT — [SEC] + [RULE] independently confirm all five touched core files.
- **Citation discipline (the epic's own rule):** COMPLIANT — 20 citations byte-verified against the fingerprinted quarry; the 1 mis-attributed comment fixed.

### Data flow traced

A shell leaves the muzzle (fire, gated `dying === null && !gameOver`) → stepGuns collides it with the wave → a kill queues `scoreKill(kind, depth)` into SCRTAB (`queueScore`, :3049) → preMotionFrame's SCOREM tick drains it +100/+10 per calc frame (STINIT=0x18 ≡ one calc frame; big ticks at half cadence) emitting `score-tick` small+large (SOUND 0 + SOUND 4, :1577-1580) → playEventSounds maps them to TK/TP → the HUD draws `countUp.displayed` (never jumping >100/frame — mutation-proven). The tick that crosses BONUSL[option][awarded] (:1582-1602, BCD thousands) also emits `bonus-life` (BN) and INC LIVES. Meanwhile the closest plane bores in to P_MNDP → beginPass records ENSIDE → every 0x0C frames evadeCheck reads the LIVE flight.turnRate against a dedicated seeded roll → 'hit' → beginEol('shells') + player-hit (CRSHSN) → 28 EOGTMR frames with the pilot grounded (flight not stepped; horizon frozen — mutation-proven) while the war animates (BVS is D6-only) → ENDLFE → loseLife → respawn (INITIAL_FLIGHT) or GAME OVER (card, waves/damage/firing stopped, yoke alive). Ground channel: groundCollision(toEye(flight)[1], mountains) BEFORE motion each live frame → 0xC0 → the 13-frame crash consuming whole frames. VERIFIED end-to-end by the booted-cockpit suites plus the five-mutation table.

### Wiring

The four dead mechanics all reach the player's senses: returning-ace drives per calc frame (tap-counted at 100% cadence), score-tick/bonus-life now have producers (AC-6 totality green, TK/TP audible in the drain window), the death channels reach the CRSHSN crash and the GAME OVER card, and groundCollision is consulted on every ground-wave frame with live mountains. VERIFIED — evidence: tests/{ace-wiring,dead-mechanics-wiring,ground-collision-wiring}.test.ts against the booted main.ts, all green on the union tree, with the drive-taps recording real invocations.

### Error handling / hard questions

Null/empty/huge: empty sky folds through closesPast(+Infinity)=false; NaN depth/eye/points fold to no-ops (unit-pinned); the accumulator cannot double-consume (traced by [SEC]); a 0 score/pending/cooldown is everywhere a real value, never a falsy casualty. Race conditions: single-threaded deterministic sim; the one cross-stream hazard (ace rolls contaminating blimpRng) is designed out and documented. Timeouts: the cockpit suites bound their runs and assert staging non-vacuity. Tenant isolation: N/A (client-only game). The known open holes are RECORDED, not silent: ENDLFE does not yet wait for the score drain (:1202-1203, finding), and live ground collisions await rb4-5's unit bridge (Conflict finding, now partially unblocked by the very merge this review integrated — re-scoped below).

### Challenge of VERIFIEDs

My strongest pre-subagent belief — "the freeze behavior is covered by the freeze test" — was CONTRADICTED by the test-analyzer's mutation #1 and the subagent was RIGHT (the staging never held the key). That finding survived my re-derivation of the gate logic line-by-line, was fixed, and the fix re-proven by re-running the same mutation to RED. Conversely, [SEC]'s clean verdict on preMotionFrame's bookkeeping matched my own trace exactly (no double-consume across the ground/shells/game-over branches). No VERIFIED above stands against any subagent finding.

### Devil's Advocate

Argue this ships broken. First: the rebase integrated a camera REWRITE nobody re-reviewed here — could rb4-5's translated world have silently broken my wiring semantics while the suites stayed green? The strongest counter is that the suites are behavioral, not structural: the freeze test watches actual horizon strokes under the NEW pipeline (roll+altitude), the blimp lifecycle suite re-ran against the union, and rb4-5's own 20 new tests ran green with my death model live — the two stories' test fleets cross-check each other. Second: the freeze fix could itself be wrong — pressing 'd' during death might alter SUBSEQUENT evade outcomes (side-matching skill dodges) and mask the second death. But the key releases after 10 frames, well inside the 28-frame sequence, and the game-over test still passed post-fix on the same seed — the timeline is unchanged. Third: TOTAL_LIVE_SHELLS staying 52 across the rebase looks almost TOO stable — did the pin go vacuous? No: the count is a sim-side sum (gunSteps), not a render sum; rb4-5 changed projection, not gun dynamics, so 52 persisting is the EXPECTED invariance, and the suite's own non-vacuity floor (armed frames > 10) still binds. Fourth: the ace's per-game BEFLAG means a respawned pilot gets no freebie — if the ROM clears BEFLAG at INITIAL, we are HARSHER than the cabinet. That is a recorded deviation with a named owner (the re-entry story), not a silent choice, and TEA's finding on the ROM's evade nesting already flags this whole block for a fidelity pass. Fifth: game over leaves the war animating — a stray shell in flight can still kill a plane and tick the score over the card; harmless, bounded (~7 frames of shell life), and the ROM's attract mode similarly keeps the world alive. Nothing here rises to Critical/High; what the devil found is already in the findings ledger with owners.

### Observations (>=6)

1. [VERIFIED] all 6 unified guards + 5 mutations bind — evidence: test-analyzer's mutation table (4/5 RED first pass) + my serial re-proof of the fixed freeze guard (gate removal → exactly 1 RED).
2. [VERIFIED] 20 ROM citations byte-exact against the fingerprinted citable quarry — evidence: rule-checker's independent line-prints, incl. the BONUSL decimal-misread refutation.
3. [VERIFIED] core purity + determinism across all five touched core files — evidence: [SEC] grep sweep + core-audio-free suite + aceRng stream isolation.
4. [VERIFIED] the union tree (rb4-5 + SH2-22 + rb4-4) is coherent — evidence: 990/990, tsc 0, build 0, the resolved draw call feeding countUp.displayed through the translated-world pipeline, TOTAL_LIVE_SHELLS invariant under the camera change.
5. [HIGH→fixed] [TEST] the scenery freeze guard — the story's own epic lesson applied to itself in-round.
6. [LOW→fixed] [RULE] the :787-788 citation mis-attribution — the only rule violation in 78 checked instances.
7. [VERIFIED] the two-channel EOGTMR machine corrects the AC's duration decode with the ROM as authority — evidence: :505-506/:1061-1066/:1124-1126 byte-verified; deviation stamped ACCEPTED below.

**Handoff:** To **The Organic Mechanic (SM)** for finish-story. APPROVED on the develop-rebased tree (1623f79, pushed). Carry-forwards: (a) the rb4-5 merge means the ground-collision unit bridge is now UNBLOCKED — the Conflict finding re-scopes to a follow-up story (live mountains vs eye units through the new projection); (b) the ROM evade-nesting fidelity question (TEA's finding) and the per-game BEFLAG deviation share that future ace story; (c) ENDLFE-waits-for-drain and the DSPLIF lives HUD remain filed follow-ups. SM owns PR creation; the USER merges the PR.

### Reviewer (audit)

Deviation audit — every logged entry stamped:

- **TEA: Death-channel durations pinned to the ROM's EOGTMR machine** → ✓ ACCEPTED by Reviewer: the rule-checker byte-verified :505-506 (.TIME1/.TIME2) and :1064 (the ground seed) against the citable quarry; the AC's parenthetical was a decode error and the ROM is the epic's authority.
- **TEA: AC-4 bonus-life wiring pinned at unit + producer level only** → ✓ ACCEPTED by Reviewer: the unit ladder + producer totality + already-wired dispatch close the chain; a deterministic 2000-point cockpit stage remains impractical, and BN is one `playTone` arm away from proven code.
- **TEA: AC-3 ground collision — predicate relations pinned, unit bridge deferred** → ✓ ACCEPTED by Reviewer, with a re-scope: rb4-5 has now MERGED (integrated in this review), so the bridge is unblocked — carried forward as a follow-up story, not a blocked conflict.
- **TEA: AC-1 attack cadence not pinned to an exact frame count** → ✓ ACCEPTED by Reviewer: the 0x0C constant itself is now pinned (review round 1) while the CADENCE stays unpinned pending the re-entry flight-path story — the right split.
- **TEA: GAME OVER form pinned as /game over/i HUD text** → ✓ ACCEPTED by Reviewer: minimal honest observable; the NW.HSC high-score seat is filed as a follow-up.
- **Dev: cockpit-draw-path re-pin 82 → 52** → ✓ ACCEPTED by Reviewer: the suite's own measured-then-pinned protocol; the number survived the rb4-5 rebase unchanged (sim-side sum, camera-independent), which corroborates it is a code property, not luck.
- **Dev: shells death animates the war; only ground freezes it** → ✓ ACCEPTED by Reviewer: the BVS 20$ branch tests V=D6 — I re-read :783-789 and the D6-only freeze is the faithful reading; the freeze-everything alternative demonstrably broke the rb4-1 blimp suites.
- **Dev: BEFLAG per-GAME, not per-pass** → ✓ ACCEPTED by Reviewer: matches the ROM's global-flag shape and TEA's own wiring pin; the open question (does GMINIT clear it per life?) is named and owned by the re-entry story.
- **Dev: game over keeps the sim animating, gated not halted** → ✓ ACCEPTED by Reviewer: the ROM parks in attract (a live world); a halted loop would delete a visible airship mid-drift, which the rb4-1 suites forbid.

No undocumented deviations found: the diff's behavior changes all trace to a logged entry or an AC.

### Reviewer (code review)

- **Improvement** (non-blocking): the ground-collision unit bridge is UNBLOCKED — rb4-5's translated-world projection merged during this review, so the SCAPE-units vs eye-height reconciliation (and a real fly-into-a-mountain death) can now be a straightforward follow-up story against the new pipeline. Affects `src/core/ground-collision.ts` + `src/main.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): post-game-over, shells already in flight can still kill and tick the score over the card for ~7 frames — harmless and bounded, but the future high-score/attract story should decide the authentic behavior. Affects `src/main.ts`. *Found by Reviewer during code review.*
---
## Impact Summary

**Delivery Findings: 13 (7 TEA, 4 Dev, 2 Reviewer) — none blocking; 2 closed in-story, the rest filed with owners.**

- **CLOSED in-story:** rng-stream discipline (ace rolls on a dedicated seeded stream — implemented); lives.ts stale "no ROM-pinned durations" header (corrected; eol.ts is the citable machine).
- **Re-entry flight-path story (future):** the ROM's evade branch nesting/polarity at RBARON.MAC:1081-1094 differs from returning-ace.ts's inferred ordering; BEFLAG's per-game vs per-life scope; the exact 0x0C attack-cadence pin; GMEND0=0x82 "planes fly away" departure.
- **Ground-collision follow-up (UNBLOCKED):** the SCAPE-units vs eye-height bridge was blocked on rb4-5's projection rewrite — rb4-5 merged DURING this story's review and was integrated (rebase, main.ts conflict resolved, 990/990 on the union) — a live fly-into-a-mountain death is now a straightforward follow-up.
- **Lives/HUD story (future):** DSPLIF LPLANE lives icons (:824, :1521-1528); death-sequence visuals (bullet-hole/spiral/starfield — eol.ts exposes eolStage).
- **High-score/attract story (future):** the GAME OVER card is a terminal seat for NW.HSC (:1210-1212); ENDLFE should wait for the score-queue drain (:1202-1203); post-game-over shells can tick the score over the card for ~7 frames.
- **Accepted descope:** SCOREM's tick deferral while other sounds play (:1541-1544) — shell audio state is unreadable from the pure core.

**Downstream:** the four dead mechanics are live — the game is winnable and losable for the first time. tp/bz/sw unaffected; red-baron develop carries rb4-4 + rb4-5 + SH2-22 combined (990 tests).

## Sm Assessment (finish)

Finish ceremony for rb4-4. Reviewer APPROVED (round 1, all 6 findings remediated in-round, freeze guard mutation-re-proven); PR red-baron#28 merged by the user at 2026-07-15T10:15:11Z (merge commit 1f04def). Preflight: develop synced, tree clean, 990/990 on the merged tree. The story ran TEA→Dev→Review in one session, absorbed the user's mid-review rebase onto rb4-5+SH2-22, and ships with 13 delivery findings compiled above. Archiving.
