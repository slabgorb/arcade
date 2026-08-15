---
story_id: "ml7-12"
jira_key: "ml7-12"
epic: "7"
workflow: "tdd"
---
# Story ml7-12: Wire the HITDDT register so a shot-detonated bomb and player-death-by-DDT suppress the continuous-scroll arm

## Story Details
- **ID:** ml7-12
- **Jira Key:** ml7-12
- **Workflow:** tdd
- **Repos:** arcade
- **Branch:** feat/ml7-12-hitddt-scroll-suppression
- **PR:** 410
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-15T12:04:39Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-15T11:39:16Z | 2026-08-15T11:41:34Z | 2m 18s |
| red | 2026-08-15T11:41:34Z | 2026-08-15T11:52:30Z | 10m 56s |
| green | 2026-08-15T11:52:30Z | 2026-08-15T11:55:47Z | 3m 17s |
| review | 2026-08-15T11:55:47Z | 2026-08-15T12:04:39Z | 8m 52s |
| finish | 2026-08-15T12:04:39Z | - | - |

## Acceptance Criteria

**AC 1:** HITDDT register is set when a shot detonates a DDT bomb (MILLI.MAC:2060 anchor)
- Verify that when `resolveShot` encounters a DDT explosion outcome, the resulting GameState includes `hitDdt: true`
- The flag must survive the `shot.ts:59` mapping that currently drops it

> ⚠ **CORRECTED during RED — see Delivery Finding [Conflict] below.** The story title's
> "player-death-by-DDT" is a misnomer. ROM `:1805 INC HITDDT` sits in the `PLAY: CHECK FOR
> PLAYER COLLISION` routine (MILLI.MAC:1750) and fires on ANY player-collision death, not a
> DDT-specific one. AC2 is pinned to any player death (matching the ROM and sim.ts's existing
> `touchedBySegment || stepped.playerHit` path).

**AC 2:** HITDDT register is set when the player dies from any collision (MILLI.MAC:1805 anchor, PLAY routine)
- Verify that when the player is killed by a segment/creature this frame, the resulting GameState sets `hitDdt: true`
- HITDDT is a persistent register (cleared only at :508), so it holds the auto-scroll OFF from death through respawn until wave restart — which the frame-local `playerDead` gate (SC-8) cannot do

**AC 3:** HITDDT register is cleared at wave start (CENTPC:508 anchor)
- Verify that at the beginning of each new wave, `hitDdt` is reset to `false` in GameState
- The clearing must happen before continuous scroll can fire during the new wave

**AC 4:** The scroll gate reads the modelled HITDDT register instead of hardcoded false
- Verify that `plugins/millipede/src/core/scroll.ts:98` reads `gate.hitDdt` from GameState instead of a hardcoded `false` value
- ScrollGate construction (sim.ts:324) must receive the GameState's `hitDdt` value instead of `false`

## Delivery Findings

**[Conflict] AC2 mis-scope — "player-death-by-DDT" is any-collision death (TEA, RED).**
The epic YAML had `acceptance_criteria: null`; the ACs above were DERIVED by sm-setup from the
story title, which reads "player-death-by-DDT (:1805)". Verifying the anchor against the ROM
(`grep HITDDT` over `reference/original-source/millipede`) found HITDDT is INC'd at exactly two
sites — `MILLI.MAC:2060` (shot detonates a bomb) and `MILLI.MAC:1805`. Line 1805 is inside
the PLAY routine (`PLAY:` entry at :1750; `.SBTTL PLAY-CHECK FOR PLAYER COLLISION` at :1744),
beside `PEXPLD` (player-explosion sound), `NOCENT`, `SLOW`, and the `:1812 STA SCROLC` this port
already reproduces (ml7-9 AC6). It fires on ANY player-collision death — there is NO DDT-specific
death site. AC2 corrected to any player death; the RED test pins `touchedBySegment` death.
**Forward-impact:** the story TITLE and the epic YAML title still say "player-death-by-DDT" — a
later reader should map that to any-collision death, not add a DDT-death path. Same shape as the
jt9-8 derived-AC trap.

**[Note] AC1 tests the observable, not shot.ts's return type (TEA, RED).**
The story says "resolveShot computes hitDdt:true but shot.ts drops it." Every `ShotOutcome` of
`kind: 'ddt'` corresponds to a real detonation (`shot.ts:59`: `hit.kind === 'exploded'` ⇒
`hitDdt: true`; the mid-explosion no-entry case returns `kind: 'pass'`). So `field.kind === 'ddt'`
in sim.ts is a faithful proxy for "set HITDDT" — Dev may set it there without changing shot.ts's
return type, or carry the flag through; the RED test pins the observable `state.hitDdt`, not the
internal representation, to avoid over-coupling.

## Design Deviations

None yet.

## Sm Assessment

Setup verified clean. Sibling probes ran before setup: no `feat/ml7-12` branch anywhere, and the only live sessions in sibling checkouts were jt11-14 (a-2) and df2-3 (a-3) — ml7-12 was unowned. Local `develop` synced to `31d4e78c` before branching.

I measured every falsifiable claim in the epic description against the current millipede core and all held (no correction block needed):
- `scroll.ts:64` `ScrollGate.hitDdt: boolean` exists; `scroll.ts:98` gates the continuous arm on `!gate.hitDdt`.
- `sim.ts:324` builds the gate with `hitDdt: false` hardcoded (ml7-9); the comment at sim.ts:318-323 explicitly names ml7-12 as the follow-up and calls this `false` "unmodelled".
- GameState has no HITDDT field yet.
- `ddt.ts:225` `resolveShot` DDT path already returns `hitDdt: true`; `shot.ts:59` drops it when mapping to `{kind:'ddt', points}`.

`acceptance_criteria` was `null` in the epic YAML, so sm-setup DERIVED four ACs from the verified premise; each cites its ROM anchor (MILLI.MAC:2060 set-on-shot, :1805 set-on-death, CENTPC:508 clear-at-wave-start, and the gate-reads-register wiring). TEA should treat the ROM anchors as citation targets to confirm, not as pre-verified.

`sm-setup` again omitted `**Repos:**` from the session — added `arcade` by hand. Claim committed on the feature branch (epic stamp + context) and pushed; the spurious `epic-jt11.yaml` reorder from the status mutation was reverted to keep the commit surgical. Status stamped `in_progress`.

Handing to TEA for the RED phase.

## Tea Assessment

**RED verified.** 6 new failing tests appended to `plugins/millipede/tests/scroll-wiring.test.ts`
(ml7-12 is the direct completion of ml7-9, which left `hitDdt` hardcoded `false` — same file, same
helpers, no new-file census risk). Full millipede project: **6 failed / 1262 passed** (only the new
tests fail; all 22 existing ml7-9 tests and 75 other files untouched). Commit `877e25b1`.

**What each test drives, and why the RED is honest:**
- **AC1 set-on-detonation** — a shot detonates the placed bomb through `stepGame` (fixture mirrors
  shot.test.ts: `ddtPlace`→`ddtRestore` at base 0xCD, shot at (0xC7,0x66)); asserts `score===80`
  (non-vacuity: the bomb really blew) then `out.hitDdt===true`. RED: `false`.
- **AC1 control** — a shot hitting a MUSHROOM at the same cell chips it (`0x7F→0x7E`, anchor passes)
  but leaves `hitDdt` clear — proves the set is DDT-gated, not fire-gated. RED on the register.
- **AC2 set-on-death** — a player standing on a live segment dies (`out.player.alive===false`
  anchor), then `out.hitDdt===true`. Pins ANY player death (see the [Conflict] finding). RED.
- **AC2 control** — a no-death frame leaves `hitDdt` clear. RED on the register.
- **AC3 clear-at-wave** — `hitDdt:true` + a frame that lays the next wave (`out.wave===1` anchor,
  CENTPC :503/:508); asserts `out.hitDdt===false`. RED: stays `true` (nothing clears it yet).
- **AC3 PERSIST (green anchor, PASSES now)** — `hitDdt:true` + no wave laid ⇒ stays `true`. This
  passes today only because `stepGame` spreads `...state`; once Dev threads the register the pair
  (clear vs persist) becomes the restrictive test distinguishing a real register from a per-frame
  recompute. Cleared ONLY at :508.
- **AC4 SUPPRESSION (the one purely-behavioural RED)** — `fourTrain()` + `frame 0x1E` arms the
  continuous arm (ml7-9 AC3 proved this); with `hitDdt:true` it must NOT scroll. Reds because
  sim.ts:324 hardcodes `false` so the arm fires regardless — asserts the marker stayed / no
  down-scroll fingerprint. Independent of the field's existence.
- **AC4 CONTROL (green anchor, PASSES now and after)** — the identical armed frame with `hitDdt`
  clear scrolls down. The differential floor: the ONLY change between case and control is the
  register, so a vanishing scroll is attributable to it alone.

**Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`).** This is a 2pt register-wiring
story; the applicable checks are test-quality, all satisfied by the ACs + controls:
- **#18/#21 non-vacuity** — every register assertion carries a same-frame anchor (score 80 /
  player dead / wave advanced / mushroom chipped) so none can pass on an empty frame.
- **#15 mutation-direction / restrictive** — AC3's clear-vs-persist pair and AC4's
  suppression-vs-control pair are restrictive: a permissive implementation (never clear, or ignore
  the register) fails at least one side.
- **#26 differential floor** — AC1 (mushroom control), AC2 (no-death control) and AC4 (arm control)
  each isolate the single variable under test against an otherwise-identical frame.
No src/core changes, so the purity sweep, the citations gate and the audit dossier-sweep are
untouched by this phase (all ROM anchors are in test comments, which those gates do not scan).

**Note for Dev (GREEN):** add `hitDdt: boolean` to `GameState` (default `false` in `createGame`),
set it `true` in `stepPlay` when `field.kind === 'ddt'` (AC1) and when `playerDied` (AC2), clear it
`false` in the wave-start block (`if (chkend.waveReady)`, AC3), thread `state.hitDdt` through the
return and into the `scrollGate` at sim.ts:324 replacing the hardcoded `false` (AC4). Watch the
ordering: the gate reads the value AFTER this frame's set/clear (a bomb detonated THIS frame should
suppress THIS frame's arm — the ROM INCs before SCROLL runs at :46).

Handing to Loki Silvertongue (Dev) for GREEN.

## Dev Assessment

**GREEN.** Full millipede project **1268/1268 pass** (the 6 ml7-12 tests now green, no regressions);
`npm run lint` (repo-wide `tsc --noEmit`) clean. Commit `777f9410`, pushed.

**Implementation (exactly TEA's map, minimal):**
- `game-state.ts` — added `hitDdt: boolean` to `GameState` (MLDEF.MAC:373) and `hitDdt: false` to
  `createGame`. `createGame` also feeds the fresh-game/attract/game-over paths, so those start clear.
- `sim.ts stepPlay` — `let hitDdt = state.hitDdt` carries the register forward (the persist), then:
  - set `true` on `field.kind === 'ddt'` (the shot detonated a bomb, MILLI.MAC:2060);
  - set `true` on the player-collision death branch (`touchedBySegment || stepped.playerHit`,
    MILLI.MAC:1805 — any death, per the [Conflict] finding);
  - cleared `false` in the wave-start block (`if (chkend.waveReady)`, CENTPC MILLI.MAC:508);
  - the `scrollGate` now reads `hitDdt` (was the hardcoded `false`), and `hitDdt` is returned.
- Updated the stale sim.ts:318-324 comment (it said the input "is not wired … deferred (ml7-12)")
  to describe the now-wired register and the INC-before-SCROLL read order.

**Ordering (the one subtlety TEA flagged):** the sets (steps 3/7) and the clear (wave block, step 9)
all run before the gate is built (step 9b), so the gate reads the register as it stands after this
frame's set/clear — matching the ROM's INC-before-SCROLL order (:29/:1805 → :508 → :46). A bomb
detonated this frame suppresses this frame's arm; a wave laid this frame clears the flag before the
arm is consulted. The other stepGame branches (`...state` spreads / `createGame`) preserve or reset
the register correctly with no extra code.

**Design Deviations:** none — implemented the corrected AC2 (any player death) and the observable
AC1 (set on `kind === 'ddt'`, no change to `shot.ts`'s return type, per TEA's [Note]).

Handing to Heimdall (Reviewer).

## Reviewer Assessment

**VERDICT: APPROVED** (round 1). No Critical, High, or Medium-correctness findings. One
Medium-clarity comment defect was found and FIXED during review (commit `bc7abca6`); everything
else is clean across four specialists plus my own pass on the disabled dimensions.

**What the change is:** a minimal, faithful wiring of the HITDDT register (MLDEF.MAC:373). A new
`GameState.hitDdt: boolean`, set on a shot-detonated bomb (MILLI.MAC:2060) and any player-collision
death (:1805, the PLAY routine), cleared at wave start (CENTPC :508), and read by the scroll gate
(SC-9) — completing what ml7-9 left hardcoded `false`. 8 new tests, 5-mutant-killing coverage.

**Findings and disposition:**
1. **[Medium, clarity — FIXED]** The test comment and the session's `[Conflict]` finding conflated
   two ROM lines: they attributed the `.SBTTL "PLAY-CHECK FOR PLAYER COLLISION"` quote to `:1750`,
   but that header is at `:1744`; `:1750` is the `PLAY:` entry label. Verified against
   `reference/original-source/millipede/MILLI.MAC` (SBTTL 1744, PLAY: 1750). A comment-only
   wrong-line/quote pairing that reddens nothing (the millipede citation gate does not scan
   `src/core` or `tests` comments), but a misleading permanent record. Split into `:1744` (header)
   and `:1750` (entry) in both places; re-ran scroll-wiring (30/30 green). Commit `bc7abca6`.
2. **[Low, informational — accepted]** sim.ts:328 compresses the mainloop order as
   "(:29/:1805 then :46)". Accurate (both INCs run before SCROLL at :46) but `:1805` is not literally
   inside `:29`/SHOOT — PLAY is called from several sites. The comment-analyzer explicitly said no
   fix required; the claim is true, only the notation is terse. Left as-is.
3. **[Informational — no defect]** The citations gate scans only `docs/rom-study/claims/*.json` and
   the dossier prose, not `src/core`/`tests` comments — pre-existing behaviour, not this story's.
   All new inline citations were hand-verified accurate (finding #1 excepted, now fixed).

**My independent pass (disabled subagents: edge_hunter, silent_failure_hunter, type_design,
security, simplifier):**
- **All-paths / read-before-assign:** `hitDdt` is assigned before every read; the gate reads it
  after all set/clear sites; every other `stepGame` return path (`stepAttract`, `stepDeath`,
  `stepGameOver`, `entry`) preserves via `...state` or resets via `createGame` correctly. No omitted
  field, no path reads it uninitialised. (Rule-checker independently traced the same and agreed.)
- **Ordering race:** a death and a wave-start cannot occur in the same frame — `waves.ts:54-57`
  blocks `waveReady` while `playerExploding` — so the death-set never races the wave-clear
  (rule-checker verified against `waves.ts` source; I concur).
- **Suppression scope:** `hitDdt` gates only the continuous arm (scroll.ts:97-104), not queued
  SCROLC sources — faithful to SC-9 ("skips the continuous-scroll arm only").
- **Type design:** ROM `HITDDT .BLKB 2` is INC'd and tested `!= 0`; a `boolean` faithfully models
  the non-zero test (nothing reads a magnitude) and matches ml7-9's `ScrollGate.hitDdt: boolean`.
- **Silent failure / simplification:** none — pure state threading, no error handling, no dead code,
  minimal (`let` + four assignments + one gate wire + one return).

**Test quality (test-analyzer 5-mutant battery, independently confirmed):** every single-line
implementation mutant — drop each SET site, drop the CLEAR, drop the gate wire, or clear-every-frame
instead of persisting — is killed by exactly one dedicated test. Every `out.hitDdt` assertion
carries a load-bearing same-frame anchor (score 80 / player dead / wave 1 / mushroom chipped),
all independently re-verified non-vacuous. The AC4 suppression/control and AC3 clear/persist pairs
are genuine single-variable differentials. No implementation coupling (`hitDdt` is the story's
public deliverable). Rules #15, #18/#21, #26 satisfied.

**Gates:** millipede 1268/1268, orchestrator 498/498, `tsc --noEmit` clean, no code smells.

**Specialist findings incorporated:**
- **[TEST]** (reviewer-test-analyzer): ran a 5-mutant battery — every single-line mutant (drop each
  SET, drop the CLEAR, drop the gate wire, clear-every-frame) killed by a dedicated test; all
  `out.hitDdt` anchors non-vacuous; AC3 clear/persist and AC4 suppression/control are genuine
  single-variable differentials; no implementation coupling. Rules #15/#18/#21/#26 satisfied. **0
  findings — no action.**
- **[DOC]** (reviewer-comment-analyzer): the stale "unwired/deferred/unmodelled" comment is fully
  gone with no orphaned survivor in `src/`; all ROM citations hand-verified accurate EXCEPT one —
  a `:1744` (SBTTL) vs `:1750` (PLAY: entry) conflation in the test comment and the session
  `[Conflict]` finding (Medium clarity). **FIXED during review, commit `bc7abca6`** (30/30 green
  after). Plus one Low (accepted, accurate-but-terse mainloop shorthand) and one informational note.
- **[RULE]** (reviewer-rule-checker): 0/30 checklist violations; independently traced all `stepGame`
  return paths (no read-before-assign, no omitted field), verified the death/wave-start race cannot
  occur (`waves.ts:54-57`), and confirmed `boolean` faithfully models the `.BLKB 2` non-zero flag.
  **0 findings — no action.**

## Subagent Results

| # | Subagent | Status | Verdict | Findings | Notes |
|---|----------|--------|---------|----------|-------|
| 1 | reviewer-preflight | Received | Pass | 0 | 1268 millipede + 498 orchestrator green, tsc clean, no smells |
| 2 | reviewer-test-analyzer | Received | Pass | 0 | 5-mutant battery, all killed; anchors non-vacuous; #15/#18/#21/#26 satisfied |
| 3 | reviewer-comment-analyzer | Received | Pass w/ nits | 1 Medium (fixed), 1 Low, 1 info | citation conflation :1744 vs :1750 — FIXED |
| 4 | reviewer-rule-checker | Received | Pass | 0 | 0/30 violations; verified all-paths + waves.ts race + citations |
| 5 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — covered by my manual pass |
| 6 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — covered by my manual pass |
| 7 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — covered by my manual pass |
| 8 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — pure core, no attack surface |
| 9 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — covered by my manual pass |

**All received: Yes** (4 enabled subagents returned; 5 disabled via `workflow.reviewer_subagents`).

Handing to Baldur the Bright (SM) for the finish ceremony.