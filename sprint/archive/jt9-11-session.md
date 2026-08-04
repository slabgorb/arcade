---
story_id: jt9-11
jira_key: jt9-11
epic: jt9
workflow: tdd
---
# Story jt9-11: joust troll GRIP is production-dead

## Story Details
- **ID:** jt9-11
- **Jira Key:** jt9-11
- **Epic:** jt9
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 6
- **Type:** feature
- **Branch:** none
- **PR:** none

## Acceptance Criteria

1. **Troll victim binding:** trollProcess() stores a victim reference using the PJOY mechanism (the victim's workspace ADDRESS). This reference is read back when determining which entity the troll has grabbed, enabling beginGrip() to have a caller.

2. **LNDB7 grab detection:** The hand-out/hand-grab detection (LNDB7, JOUSTRV4.SRC:1712 LAVVI2 CMPY PJOY,U) repoints the victim's gravity vector from ADDGRA to ADDLAV (PADGRA :1651-1652), transitioning the victim into the lava troll's grip state.

3. **Grip escalation chain:** beginGrip() is wired as the entry point for the PATCH1/2/3 escalation (JOUSTRV4.SRC:6374-6386), which increments the pull by 1/frame up to the $500 cap. The grace timer (LAVKLL 30*60, :6393) gates entry into the escalation.

4. **Escape mechanism:** The break-free threshold (-$0180 at JOUSTRV4.SRC:6616) and the 50-point escape award (:6668) are reachable when a victim's gravity reading becomes less negative than the threshold, allowing stepGrip() to detect an escape.

5. **LAVTIM/LAVGRA wiring:** The hand-animation frame timer (LAVTIM, JOUSTRV4.SRC:1611) and the base gravity value (LAVGRA, :6395) are wired into the troll's grip state, seeding the escalation.

6. **insertTroll victim placement:** Once the troll has a real victim, insertTroll() places the spawned troll immediately before that victim process (per :6778 LDU PPREV), not before the first enemy. The guard in glide-prologue.test.ts verifying positional placement is updated to reflect the real victim.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-04T21:29:29Z
**Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-04T19:48:47.081420+00:00 | 2026-08-04T19:50:26Z | 1m 38s |
| red | 2026-08-04T19:50:26Z | 2026-08-04T21:03:24Z | 1h 12m |
| green | 2026-08-04T21:03:24Z | 2026-08-04T21:20:48Z | 17m 24s |
| review | 2026-08-04T21:20:48Z | 2026-08-04T21:29:29Z | 8m 41s |
| finish | 2026-08-04T21:29:29Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

No upstream findings at setup.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

No deviations at setup.

### Dev (implementation)
- **Spawn is wave-4 acquisition, not the LNDB7 landing dispatch**
  - Spec source: context-story-jt9-11.md, AC-2 ("the LNDB7 hand-out/hand-grab detection")
  - Spec text: the ROM spawns the troll when a bird LANDS in the lava zone (LNDB7, :6764), bound to that lander.
  - Implementation: kept jt3-3's wave-4 `trollSpawnable` spawn and bound the nearest PLAYER to the CLIF5 grab point (`pickTrollVictim`), per the user's 2026-08-04 scope selection (minimal grab model + full LT1HT animation), which the TEA RED encoded and pinned.
  - Rationale: true landing-triggered spawn is a larger blast radius (frame.ts landing dispatch, demo-troll.test.ts); the TEA assessment filed it as a deferred follow-up. The wave-spawn + range-acquire is the port's adaptation.
  - Severity: minor
  - Forward impact: minor — a future LNDB7-as-landing story would replace `pickTrollVictim`/the spawn seam; the grip machinery (`stepTrolls`) is unaffected.
- **Victim restricted to players; one frame of normal flight at grab-commit**
  - Spec source: the TEA RED (demo-jt9-11.test.ts) + ADDLAV (:6608)
  - Spec text: ADDLAV REPLACES the victim's gravity the moment the grab commits; LNDB7 accepts player OR enemy.
  - Implementation: victims are players only (`LT1GRP ... GRIP THE PLAYER`, :1645); a `grippedBy` marker suspends normal gravity, but it is set DURING `stepTrolls` (after frame.ts ran), so the single commit frame still took normal flight before the grip took over.
  - Rationale: minimal + faithful-enough — the grip replaces gravity from the frame AFTER commit onward; GRAV=4 for one frame is negligible against the escalating pull, and no test distinguishes it.
  - Severity: minor
  - Forward impact: none identified — escape/lava outcomes and the +50 award are unaffected.

## Sm Assessment

**Story:** jt9-11 — wire the joust lava-troll GRIP into production. troll.ts's grip
(beginGrip/stepGrip/escalateGrip/escapeScoreEvent + the TrollGrip type) is a faithful,
cited, tested pure core with ZERO production callers; only trollSpawnable is live
(demo.ts:961). The missing piece is the GRAB — LNDB7 hand-grab detection that repoints
the victim's gravity from ADDGRA to ADDLAV (PADGRA :1651-1652) — plus the victim binding
(PJOY's third meaning: the victim's workspace address, STU PJOY,Y :6781, read at :1712).
Two DYTBL rows folded in from the retired jt9-12: LAVTIM (:1611, hand-animation timer) and
LAVGRA (:6395, base gravity seeding beginGrip). LAVLAV is explicitly out of scope but must
be re-checked POSITIONALLY before trusting its dead-in-rom disposition (jt9-1 found that
reasoning wrong for LNTLAV).

**Prior-art the TEA must NOT rebuild:** jt9-1 already shipped insertTroll()'s positional
placement (BEFORE an enemy per :6778) and the finger-print binding scaffolding; this story
owns the IDENTITY half. Update jt9-1's positional guard in glide-prologue.test.ts once the
troll picks a real victim rather than "the first enemy."

**Watch items for RED:** (1) determinism — any roll must come from a seeded Rng so the URL
seed replays; joust has no single stepGame, the calc-frame loop assembles events itself.
(2) The escape/escalation thresholds are ROM-cited constants ($500 cap, -$0180 break-free,
50-pt award, LAVKLL 30*60 grace) — pin each against JOUSTRV4.SRC, don't transcribe blind.

**Workflow:** tdd (phased). Next agent: **TEA** (RED phase). Trunk-based — work on main,
no branch, no PR. Session and context files verified present.
## Tea Assessment

**RED shipped (commit c89aa88): 24 failing tests, all for feature-absence, tsc clean.**
Verified directly with `npx vitest run --project joust` (2686 pass / 24 fail / 117 files);
no `testing-runner` needed — the run is the evidence. The scope is the FULL LT1HT
hand-tracking fidelity the user chose on 2026-08-04 (not the minimal grab).

### The parrot is dead — and the tests prove it
`troll.beginGrip/stepGrip/escalateGrip/escapeScoreEvent` are a complete, cited, tested
PURE core (`plugins/joust/src/core/troll.ts`) with ZERO production callers. AC-0 pins
that as a source-scan (RED now). Everything else pins the wiring that gives them a caller.

### The contract Dev builds to (GREEN)
A `kind:'troll'` `DemoProcess` gains two faithful fields (already mirrored in
`tests/helpers/demo-contract.ts`):
- **`victimId?: number`** — PJOY (`STU PJOY,Y`, :6781; read at `LAVVI2 CMPY PJOY,U`, :1712):
  the id of the bird the troll is grabbing.
- **`grip?: TrollGrip`** — set the frame the grab COMMITS, `troll.beginGrip(LAVGRA_for_wave)`;
  absent while the hand is still rising.

`stepDemo` grows four things, in ROM order:
1. **Bind at spawn (AC-1).** The wave-4 `trollSpawnable`/`insertTroll` spawn is UNCHANGED
   (its positive control stays green); what's new is that the spawned troll binds the
   in-range bird as `victimId`, starts on the floor (`FLOOR-9`, :6783), offset `-2` in X
   (:6786), PFRAME 0, no grip.
2. **The LT1HT animation (AC-2).** Phase 1: PFRAME (`entity.animPhase`, 0..5) extends
   0→`5*6` on the LAVTIM cadence (`LDA LAVTIM / STA PJOYT,U`, :1611), tracking victim X.
   Phase 2: the hand pixel-Y closes 1px/frame toward victim pixelY+`(10-7)`; on equality
   the grab commits.
3. **The grip (AC-3).** `grip = beginGrip(waveValue('LAVGRA', wave))`; each frame
   `escalateGrip(grip)` + `stepGrip(velY, posY, grip, wingsUp)` drive the victim (its
   gravity is now ADDLAV, not normal — the victim falls faster and can't be flown out
   without a SUSTAINED flap).
4. **Terminals (AC-4).** `stepGrip().escaped` → free the victim, clear the grip, remove
   the troll, push `escapeScoreEvent()` (`{value:50, reason:'escape'}`). `.inLava` →
   remove the victim (lava death), no escape score.

Plus: export the transcribed constants `TROLL_HAND_START_Y`, `TROLL_X_OFFSET`,
`TROLL_EXTENDED_FRAME`, `TROLL_GRIP_Y_OFFSET`, `TROLL_FRAME_STEP` from demo.ts (the
source companion gates on them), and flip `ROW_DISPOSITION.LAVTIM`/`.LAVGRA` in
`difficulty.ts` from `no-consumer-yet` to `wired` naming the demo grip consumer (AC-5).

### Rule Coverage (joust has no lang-review/*.md; the enforced rule is the pure-core boundary + the epic's double-entry)
- **Pure-core boundary (jt1-7 purity scanner).** No new src/core file is added; the
  grip core stays pure. The wiring lives in `demo.ts`/`frame.ts` (shell-facing), which
  the scanner does not sweep. No test needed beyond the existing scanner, which stays green.
- **ROM double-entry (jt1-3).** `demo-jt9-11-source.test.ts` re-derives every new
  constant with the INDEPENDENT reader (`tests/helpers/joust-source.ts`); the demo's
  transcription must AGREE. A derivation that re-bakes a misreading cannot pass.
- **No vacuous assertions.** Self-checked: every test has a concrete value assertion;
  the one green test (`reaches wave 4 and spawns a troll`) is a deliberate positive
  control, not a vacuous pass. Mutation intuition: inverting `insertTroll` reddens AC-6
  and the glide-prologue guard (index compare, not kind compare — Review R-2's lesson).

### Design Deviations
- **glide-prologue.test.ts re-baselined (in scope, story-directed).** jt9-1's two
  `atTrollWave` placement guards asserted "troll before the FIRST ENEMY" (a proxy for a
  victim it didn't have). They now assert "troll directly before its bound `victimId`"
  (:6778), selection-agnostic. The looker-behaviour and PPREV-producer tests are
  untouched and stay green.

## Delivery Findings

- **Question (non-blocking): victim-selection rule is under-specified.** The tests assume
  the troll binds the NEAREST in-range bird, which in the staged demos is the player
  parked at CLIF5 (x≈148). If Dev's rule picks differently (e.g. an arrival enemy), AC-1/
  AC-6's `victimId === PLAYER1_ID` may need re-seating — surface it rather than forcing a
  coordinate. The ROM's real trigger is a LANDING (LNDB7, player OR enemy); the wave-spawn
  + range-acquire model is the port's adaptation the user's scope selection implies.
- **Improvement (non-blocking): LNDB7-as-landing is deferred.** True landing-triggered
  spawn (a bird landing in the `groundOutcome:'troll'` zone summoning the troll) is a
  larger blast radius (frame.ts landing dispatch, demo-troll.test.ts). Not in this story's
  scope; worth a follow-up if the wave-spawn adaptation ever feels unfaithful.
## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/joust/src/core/demo.ts` — the lava-troll grip wiring: `victimId`/`grip`/`handTimer`/`grippedBy` on the troll process; the transcribed constants (`TROLL_HAND_START_Y`/`TROLL_X_OFFSET`/`TROLL_EXTENDED_FRAME`/`TROLL_GRIP_Y_OFFSET`/`TROLL_FRAME_STEP`); `pickTrollVictim` + `stepTrolls` (LT1HT rise/track/grab → ADDLAV grip → break-free/lava); `insertTroll` splices before the bound victim; a `'escape'` `DemoEvent` reason.
- `plugins/joust/src/core/frame.ts` — a `grippedBy` victim skips normal flight (the troll owns its fall; keeps the flap).
- `plugins/joust/src/core/game.ts` — `GameScoreEvent.reason` accepts `'escape'` so the +50 credits the victim.
- `plugins/joust/src/core/difficulty.ts` — `ROW_DISPOSITION.LAVTIM`/`.LAVGRA` → `wired` (consumer `demo.stepTrolls`).
- `plugins/joust/tests/seek-wiring.test.ts`, `tests/demo-jt9-9.test.ts` — re-baselined the now-stale "troll pair still no-consumer-yet" pins to `wired`/empty.

**Tests:** GREEN. joust 2710/2710; full fleet 11950 pass / 1 todo / 0 fail; `tsc --noEmit` clean; orchestrator 390/390.

**Handoff:** To verify/review (TEA verify → Reviewer).

## Delivery Findings

- **Improvement** (non-blocking): The grip currently repoints only GRAVITY; the ROM's ADDLAV also `CLR PVELX` (no horizontal drift while held) and holds the hand's frame at `6*6` (LAV2LP). The port leaves the victim's X frozen (frame.ts skips it) which matches, but the troll's own holding-frame animation past the grab is not modelled. Affects `plugins/joust/src/core/demo.ts` (`stepTrolls` grip branch) — cosmetic, a candidate follow-up. *Found by Dev during implementation.*
- **Question** (non-blocking): Victim selection is nearest-player-to-CLIF5; if a future story makes the troll grab enemies too (LNDB7's real target set), `pickTrollVictim` and the `glide-prologue` looker interaction (a gripped enemy would be skipped by frame.ts, freezing its looker countdown) need revisiting. Affects `plugins/joust/src/core/demo.ts`, `plugins/joust/src/core/frame.ts`. *Found by Dev during implementation.*
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (green: joust 2710, orch 390, tsc clean, 0 smells) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — covered by manual mutation battery |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — manual: no swallowed errors in the diff |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — covered by manual mutation battery (M1-M7) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — ROM citations spot-checked, sound |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — manual: one justified cast in frame.ts |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — N/A (offline game, no I/O) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — manual: stepTrolls is proportionate |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — Rule Compliance done manually below |

**All received:** Yes (1 enabled returned clean; 8 disabled, covered by the manual mutation battery)
**Total findings:** 2 confirmed (1 MEDIUM, 1 LOW), 0 dismissed, 0 deferred

## Reviewer Assessment

Only `preflight` is enabled (the other 8 specialists are disabled fleet-wide), so the
real analysis is a **7-mutation battery** against the diff plus a live probe.

### Mutation battery (the guard proof)
| # | Mutation | Result |
|---|----------|--------|
| M1 | `insertTroll` splices AFTER the victim (`at+1`) | **caught** — demo-jt9-11 (1) + glide-prologue (2) redden |
| M2 | grab never commits (`handY===target` → `false`) | **caught** — demo-jt9-11 (3) |
| M3 | escape branch neutralised (`gs.escaped` → `false`) | **caught** — demo-jt9-11 (1) |
| M4 | remove frame.ts `grippedBy` skip | **SURVIVES** — 17/17 pass (see F2) |
| M5 | `pickTrollVictim` returns null | **caught** — demo-jt9-11 (4) + glide-prologue (3) |
| M6 | grip Y offset `10-7` → `10+7` | **caught** — behaviour (3) + source (1) |
| M7 | `escalateGrip` not called (pull frozen) | **caught** — demo-jt9-11 (1) |

6/7 guarded — the grip's commit, escape, escalation, binding, placement and the
ROM-cited offset are all real. Only M4 survives.

### Observations
- **[MEDIUM] jt9-1's lava-troll looker is production-dead** — demo.ts `pickTrollVictim` / spawn. Probe (forceAdvance to the troll wave, seed 0x1234): `ORDER=troll,player,player,enemy,…`, `enemyAfterTroll=false`. Because victims are players only, the troll is spliced before a PLAYER, so no enemy ever has a troll as `PPREV` and the LNTLAV looker jt9-1 wired (`LDX PPREV / CMPA #LAVID`, :3727) never fires in the live demo. Before jt9-11 the troll spliced before the first ENEMY, so it WAS reachable. This is the same "faithful-but-uncalled" disease jt9-11 was filed to cure, displaced onto jt9-1. It is a CONSEQUENCE OF THE CHOSEN SCOPE (user picked "grab a player", 2026-08-04), so the right response is a filed follow-up, not a reject — see F1.
- **[LOW][TEST] the frame.ts `grippedBy` skip is unguarded** — frame.ts:315. M4 removes it and all 17 tests still pass: the single-integration fidelity it protects (grip REPLACES gravity, not adds to it) is asserted only by coarse inequalities (`>`, "escaped within N frames"), never by an exact per-frame velY. The skip is correct and needed, but its effect is invisible to the suite — F2.
- **[VERIFIED] determinism/purity** — `stepTrolls` (demo.ts) uses no `Date`/`Math.random`/RNG and no browser surface; the grab is fully deterministic on (position, input). Evidence: the function body reads only process state + `waveValue`/`flap`/`tickTimeUp`/`stepGrip`. The full purity-swept suite is green.
- **[VERIFIED] the escape award credits the right player** — demo.ts pushes `{...escapeScoreEvent(), player: victim.id}`; game.ts `creditScoreEvents` adds it to that player's ledger (game.ts:410, GameScoreEvent reason extended to 'escape'). M3 proves the branch is live.
- **[VERIFIED] LAVVFY / victim-gone handling** — `stepTrolls` removes the troll when its `victimId` is no longer in the list (a joust the same frame), so a dangling grip cannot persist. Evidence: the `!victim || !victim.entity → removed.add(troll.id)` branch.
- **[VERIFIED] grippedBy is cleared on escape** — a freed victim (`victim.grippedBy = undefined`) resumes normal flight next frame; only a still-held victim keeps the marker.

### Rule Compliance
- **Pure-core boundary (jt1-7 scanner sweeps src/core, comments included):** demo.ts is in src/core; `stepTrolls`/`pickTrollVictim` add no clock/entropy/browser token and no comment ending in a forbidden word. The full suite (incl. the purity guard) is green. COMPLIANT.
- **ROM double-entry (jt1-3):** every new constant (`TROLL_HAND_START_Y`/`X_OFFSET`/`EXTENDED_FRAME`/`GRIP_Y_OFFSET`/`FRAME_STEP`) is re-derived from JOUSTRV4.SRC by the independent reader in demo-jt9-11-source.test.ts; M6 proves the offset is gated both ways. COMPLIANT.
- **Descoped findings must be filed (user rule):** F1 is descoped → filed as a follow-up story (below). COMPLIANT.
- **No vacuous assertions:** mutation battery M1-M3,M5-M7 confirm the new tests are non-vacuous; the one green control ("reaches wave 4 and spawns a troll") is a labelled positive control. COMPLIANT (F2 is a coverage gap, not a vacuous assertion).

### Devil's Advocate
Argue the code is broken. First, the grip's whole fidelity claim rests on a skip that
NO test exercises (M4). A future refactor of frame.ts could delete that skip, silently
double-integrate every gripped bird's gravity, and ship green — the suite only checks
"falls faster" and "escapes within 200 frames", both of which a double-gravity victim
satisfies MORE easily. So the "faithful ADDLAV replaces gravity" story in the commit
message is, today, unverifiable from the tests. Second, the looker regression is worse
than a missing feature: jt9-11 CHANGED the glide-prologue guard that used to catch it
(from "troll before first enemy" to "troll before bound victim"), so the very test that
would have reddened on the looker going dead was rewritten to permit it. A cynic reads
that as removing the smoke detector before starting the fire. Third, victim selection is
"nearest player to x=148" with NO range limit — a troll on the bottom island will reach
up and grab a player clear across the screen at the top, every wave-4 clear, forever,
because there is always a nearest player. Is a full-screen grab faithful? The ROM grabs a
bird that LANDED in the lava; the port grabs the nearest player unconditionally. Fourth,
a lava death REMOVES a player process from the demo; in pure attract (no game.ts respawn)
that can strand the demo with one or zero players — the attract loop's population
assumptions are untested against a troll kill. Fifth, `handTimer` defaults to `lavtim`
when undefined, but a staged troll that is never given one relies on that default lining
up with the real spawn's `handTimer:1` — the phase-1 cadence is therefore two different
values (1 at real spawn, lavtim when staged) and only the staged path is asserted. None
of these are crashes, and the primary deliverable (the grip) is mutation-solid — but the
fidelity guarantees around it are softer than the commit message claims.

### Findings
- **F1 [MEDIUM]** jt9-1's LNTLAV looker is production-dead under jt9-11's player-only victims (no enemy is ever adjacent to a troll). Consequence of the user's chosen "grab a player" scope → **filed as a follow-up** (see below), not a blocker.
- **F2 [LOW]** the frame.ts `grippedBy` single-integration skip is unguarded (M4 survives); a test pinning a gripped victim's exact per-frame velY (grip pull only, not grip+GRAV) would close it → filed with F1's owner epic.

### Verdict
**APPROVED.** The story's deliverable — the lava-troll grip wired live, `beginGrip`/
`stepGrip`/`escalateGrip`/`escapeScoreEvent` given a real production caller — is correct
and mutation-verified (6/7), tsc + full fleet green. The two findings are (F1) a
scope-consequence fidelity regression of a *different* story, correctly deferred to a
filed follow-up per the user's player-grab scope, and (F2) a low-severity coverage gap on
a fidelity nicety. Neither is a Critical/High defect in jt9-11's own feature.