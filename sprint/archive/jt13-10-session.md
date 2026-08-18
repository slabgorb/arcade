---
story_id: "jt13-10"
jira_key: "jt13-10"
epic: "jt13"
workflow: "tdd"
---
# Story jt13-10: Lava death cinematic: ADDLAV break-free window, sink to FLOOR+20, and the SNPLAV/SNELAV cue

## Story Details
- **ID:** jt13-10
- **Jira Key:** jt13-10
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/jt13-10-lava-death-cinematic
- **PR:** 533

## Workflow Tracking
**Workflow:** tdd
**Repos:** arcade
**Phase:** finish
**Phase Started:** 2026-08-18T10:09:56Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-18T02:02:04Z | 2026-08-18T02:05:18Z | 3m 14s |
| red | 2026-08-18T02:05:18Z | 2026-08-18T02:32:12Z | 26m 54s |
| green | 2026-08-18T02:32:12Z | 2026-08-18T09:33:47Z | 7h 1m |
| review | 2026-08-18T09:33:47Z | 2026-08-18T10:09:56Z | 36m 9s |
| finish | 2026-08-18T10:09:56Z | - | - |

## Background

Follow-up to jt13-5, which shipped the essential non-gripped lava DEATH (a knight reaching FLOOR+7 is removed and loses a life) but deferred the ROM cinematic. Add, faithful to ADGFLR/ADDLAV (JOUSTRV4.SRC):

1. The ADDLAV break-free window (CMPD #-0180 'BREAK FREE VELOCITY?', ~:6617) so a hard enough upward flap escapes within a limited window, after which lava gravity holds the bird down (today any flap that clears lava depth escapes — the window never closes)
2. The visible SINK — the body descends past FLOOR+7 to FLOOR+20 (:6568) with a pause before respawn, rather than being removed the same frame it touches the lava
3. The SNPLAV (player) / SNELAV (enemy) lava sound (ADGFLR loads them) — a NEW EVENT_KIND in core/events.ts wired through audio-manifest + audio-dispatch (none exists today; adding it ripples the audio-seam sweeps)

Reconcile the visible sink with jt11-18's burned-shore-grab maxY<=DEATH_Y assertions (they will need updating if the player sink is implemented at the frame layer).

## Acceptance Criteria

> ⚠ **CORRECTION (TEA RED, user ruling 2026-08-17): AC1 is RESCOPED.** ROM + code
> verification refuted AC1's premise — see "Design Deviations" below. The ADDLAV
> break-free window already ships ROM-faithfully in `troll.ts` (`BREAK_FREE_VY`,
> `stepGrip`/`escalateGrip`, driven live by `stepTrolls` in sim.ts) and belongs to the
> troll-GRIP path, NOT the non-gripped death. The non-gripped death (ADGCEI→ADGFLR)
> has NO break-free window in the ROM. AC1 is therefore delivered as a GREEN fidelity
> GUARD (assert no non-gripped window + the gripped window closes), not as new
> escape behaviour. AC2/AC3 are unchanged and are the real build.

1. A hard enough upward flap within the ADDLAV break-free window (CMPD #-0180, ROM :6617) escapes lava. After the window closes, lava gravity prevails and the knight cannot escape.
2. When a knight reaches lava (PPOSY>=FLOOR+7), the body is NOT removed the same frame; instead it sinks visibly from FLOOR+7 to FLOOR+20 (:6568) with a pause before respawn.
3. The SNPLAV (player) and SNELAV (enemy) lava-death sounds exist as new EVENT_KIND entries in core/events.ts and are wired through audio-manifest + audio-dispatch so they play when ADGFLR is triggered.
4. Tests in burned-shore-grab (jt11-18) that assert maxY<=DEATH_Y are reconciled with the visible sink behavior.

## Reconcile points & flags for TEA

**1. VERIFIED: No lava-sound EVENT_KIND exists yet.**
   - `plugins/joust/src/core/events.ts` EVENT_KINDS is a 17-entry tuple
   - SNPLAV/SNELAV appear only in comments
   - Adding a new kind ripples the audio-seam sweeps (audio-manifest + audio-dispatch + shell/audio.ts CUE_SOURCES)
   - Memory note: audio seam suites cannot see emitters — all read the one EVENT_KINDS tuple; delete emitters 1-by-1

**2. VERIFIED reconcile #1: Test assertion violation in jt11-18**
   - `plugins/joust/tests/burned-shore-grab-jt11-18.test.ts:210-211` asserts `maxY <= DEATH_Y` (FLOOR+7=230)
   - A visible sink to FLOOR+20 will violate this assertion
   - Update needed before GREEN can pass

**3. VERIFIED reconcile #2 (NOT named in story description — surface it): Test assertion violation in jt13-5**
   - `plugins/joust/tests/lava-death-jt13-5.test.ts:177-178` asserts the knight's deepest OBSERVABLE pixel is DEATH_Y-1
   - This is because the knight is REMOVED the same frame it reaches DEATH_Y
   - A visible sink to FLOOR+20 breaks this assertion too
   - TEA must reconcile BOTH jt11-18 and jt13-5 tests, not just the one the story names

**4. Current removal happens at frame.ts:320-325**
   - The comment there already names the deferred "sink to FLOOR+20" (JOUSTRV4.SRC:6523)
   - Notes the ROM does NOT clear PVELX on the non-gripped path
   - This is where the frame-layer removal logic lives

**5. FIDELITY NUANCE for TEA to resolve at the ROM (do not resolve in setup)**
   - jt13-5 established that `CLR PVELX` and the grip mechanics are the ADDLAV/troll-GRIP path, not general ADGFLR:6523
   - The story asks for the ADDLAV break-free window (CMPD #-0180 'BREAK FREE VELOCITY?', ~:6617)
   - TEA should open JOUSTRV4.SRC to confirm whether the break-free window governs the NON-gripped lava death or only the troll-gripped path before writing RED
   - Previous story (jt13-5) misattributed a ROM routine — verify the ROM carefully before implementing

## Delivery Findings

No upstream findings.

## Design Deviations

### DD-1 (TEA RED): AC1 break-free window is REFUTED — rescoped to a GREEN fidelity guard

**User ruling 2026-08-17: "Rescope + green guard".**

TEA opened the ROM (`reference/williams-source/joust/JOUSTRV4.SRC`) and the current core
before writing RED. Findings:

- The break-free test `CMPD #-$0180 / BLT ADLFRE` (:6616) lives inside **ADDLAV**
  ("ADD IN LAVA **TROLLS** GRAVITY", PATCH3, :6608-6642) — the routine `PADGRA` is
  patched to *only while a lava troll grips the bird*. It is a GRIP mechanic.
- The NON-gripped death is **ADGCEI → ADGFLR**: `CMPA #FLOOR+7 / BHS ADGFLR`
  (:6508-6509) sends the bird straight into the death cinematic with NO velocity
  escape. A non-gripped bird at lava depth cannot break free in the ROM.
- The break-free window is ALREADY implemented and production-wired: `troll.ts`
  `BREAK_FREE_VY = -0x180`, `stepGrip.escaped`, `escalateGrip` (grace-then-escalate so
  the window DOES close), driven live by `stepTrolls`/`escalateGrip`/`stepGrip`
  (`sim.ts:1020-1038`), covered by `troll.test.ts`. (The `events.ts:46-47` comment
  "beginGrip has zero production callers" is STALE — superseded by jt9-11; the caller
  is `sim.ts:1062`.)
- The story's parenthetical "(today any flap that clears lava depth escapes — the
  window never closes)" is false for both paths: the gripped window closes via
  escalateGrip; the non-gripped path has no window at all. Building AC1 literally
  (a non-gripped break-free window) would REGRESS fidelity.

**Resolution:** AC1 → a GREEN-on-arrival fidelity guard (no non-gripped break-free
window; the gripped window closes). AC2 (visible sink FLOOR+7→FLOOR+20) and AC3
(SNPLAV/SNELAV cue as a new EVENT_KIND) are the real RED build.

**Forward impact:** the story TITLE still says "ADDLAV break-free window" — a later
reader should read it as the guard, not new behaviour. Epic YAML `review_findings`/
description unchanged; this deviation is the record of the rescope.

### DD-2 (TEA RED): only the PLAYER non-gripped death sinks — the frame-level clamp STAYS

The visible sink is the ADGFLR player/enemy death booked one layer up in `sim.ts`
(removal at `sim.ts:2424`). The `frame.ts` `isLavaDeath` clamp to `DEATH_Y` is
jt11-18's on-screen backstop for the enemy/egg/raw-scheduler paths and must NOT be
disturbed. Reconcile carefully: `lava-death-jt13-5.test.ts:177-178` (player deepest
pixel = DEATH_Y-1, removed same frame) encodes the OLD player contract and is updated
to the sink; `burned-shore-grab-jt11-18.test.ts:210-211` must be checked to confirm
which path it exercises before touching it.

## Sm Assessment

Setup complete for jt13-10 (3pt, joust, TDD) — a follow-up to jt13-5, which merged
two commits before this setup. Before spawning setup I ran the sibling probes (no
remote branch, no session owns this story) and verified the four falsifiable premises
in the description against the current tree. All four are ACCURATE and fresh — no
correction block was needed:

- No lava-sound EVENT_KIND exists (`core/events.ts` `EVENT_KINDS` is a 17-entry
  tuple; SNPLAV/SNELAV appear only in comments). Adding one ripples the audio-seam
  sweeps.
- The current death removes the knight at FLOOR+7 (`core/frame.ts:320-325`); the
  comment there already names the deferred sink to FLOOR+20 (JOUSTRV4.SRC:6523).
- jt11-18's `maxY <= DEATH_Y` assertion is real
  (`tests/burned-shore-grab-jt11-18.test.ts:210-211`) and will need updating.

I surfaced ONE reconcile point the story description omits: a visible sink to
FLOOR+20 also breaks `tests/lava-death-jt13-5.test.ts:177-178`, which asserts the
knight's deepest observable pixel is DEATH_Y-1 (removed same frame). TEA must
reconcile BOTH jt11-18 and jt13-5, not just the one the story names.

One fidelity nuance is flagged for TEA to resolve at the ROM, not by me: jt13-5
established that `CLR PVELX` / grip mechanics belong to the ADDLAV/troll-GRIP path,
not general ADGFLR. TEA should open JOUSTRV4.SRC to confirm whether the requested
break-free window (CMPD #-0180, ~:6617) governs the non-gripped lava death or only
the gripped path before writing RED — the jt13-5 story previously misattributed a
ROM routine.

Story has no explicit ACs in the epic YAML (`acceptance_criteria: null`); setup
derived four from the description, and all five verified reconcile points are
recorded above in "Reconcile points & flags for TEA". Claim is stamped in_progress
and pushed on `feat/jt13-10-lava-death-cinematic`. Handing off to TEA for RED.
## Tea Assessment

RED authored by Tyr One-Handed. Before writing any test I opened the ROM
(`reference/williams-source/joust/JOUSTRV4.SRC:6508-6642`) and the current core to
settle the AC1 fidelity crux — that refutation and the user's "rescope + green guard"
ruling are recorded in Design Deviation DD-1 above. Net: AC1 is delivered as a GREEN
guard; AC2 (visible sink) and AC3 (SNPLAV/SNELAV cue) are the real RED build.

### RED state (verified: joust project 5 failed / 3759 passed; lint clean)

New file `plugins/joust/tests/lava-death-cinematic-jt13-10.test.ts`:
- **AC1 (GUARD — GREEN on arrival, must STAY green):**
  - the grip HAS a break-free window (a hard sustained flap escapes during grace);
  - the grip window CLOSES (after `escalateGrip` past the grace, the same flap no
    longer frees the victim — pull-before-compare);
  - the NON-gripped death gives NO velocity reprieve (a bird carrying `BREAK_FREE_VY`
    still dies, losing exactly one life). This guard bites if a future change smuggles
    a velocity break-free into the non-gripped path.
- **AC2 (RED):** the knight is NOT removed the frame it reaches the lava (it stays to
  sink); the body sinks to `FLOOR+20`.
- **AC3 (RED):** a non-gripped player lava death emits a distinct lava cue; the audio
  manifest wires both `SNPLAV` and `SNELAV`.

Reconciled (per DD-2 — only the PLAYER non-gripped path sinks; enemy/egg/frame-stepper
clamps at `DEATH_Y` are untouched):
- `lava-death-jt13-5.test.ts` A: flipped same-frame-removal → sink (now RED, part of
  the spec); B: widened the life-loss window 60→90 (sink defers the booking) and fixed
  the stale "deepest pixel = DEATH_Y-1" comment (stays GREEN on develop).
- `burned-shore-grab-jt11-18.test.ts` @210 (the `SHORE_ID` **player**): bound loosened
  `DEATH_Y` → `FLOOR+20`. Sites @267 (frame-stepper `fall`) and @323 (egg) KEPT at
  `DEATH_Y` — they are not the player sim-layer death.

### Required interface (TEA sets it so Dev's names are unambiguous)

Add TWO new `EVENT_KINDS` to `plugins/joust/src/core/events.ts`, parallel to
`player-death`/`enemy-death`:
- `player-lava-death`  → cue `SNPLAV` (JOUSTRV4.SRC:8123)
- `enemy-lava-death`   → cue `SNELAV` (JOUSTRV4.SRC:8105)

The `never`-default dispatch and the audio-seam sweeps will then FORCE the manifest +
dispatch wiring: add `cueFor` cases (`audio-dispatch.ts`), `CUE_SOURCES` entries with
`table: 'SNPLAV'`/`'SNELAV'` (`audio-manifest.ts`), and the `SoundName` union member.

### Implementation pointers for Dev (Loki)

- The non-gripped player death is removed at `sim.ts:2424` (the `grippedBy === undefined
  && isLavaDeath` filter). That same-frame removal is what AC2 replaces with the ADGFLR
  sink: keep the process present, sink `posY` FLOOR+7 → FLOOR+20 across frames, then
  remove/respawn. Emit the lava cue there (push `{ type: 'player-lava-death' }` /
  `'enemy-lava-death'` to `cues`), and ensure the life is still booked exactly once
  (game.ts:446 books on process disappearance — a deferred sink defers that; book the
  death mid-sink or preserve the single debit, whichever keeps jt13-5 B green at 90).
- Do NOT touch the `frame.ts` `isLavaDeath` clamp (`frame.ts:307-326`) — it is jt11-18's
  backstop for enemies/eggs/raw scheduler and DD-2 keeps it.
- The break-free window (AC1) already ships in `troll.ts` — do NOT re-add it anywhere.

### Rule Coverage

- **core/shell boundary (purity):** all new logic Dev will touch (sink, cue emit, event
  kinds) belongs in `src/core/`; the guard tests exercise it via `loadSim`/`loadGameExtra`
  with no DOM. The joust `core-boundary`/purity sweep ran green in the full suite.
- **Every test asserts meaningfully (self-checked):** no `let _ =`, no `assert(true)`,
  no is-None-on-always-None; each assertion (escaped, inLava, lives, posY, cue kinds,
  manifest tables) fails on a wrong implementation. Non-vacuity anchors present (starts
  at surface / descended into lava territory).
- **Citation discipline:** every ROM claim in the new file carries a JOUSTRV4.SRC line;
  the joust `comment-line-refs` guard (a `file.ts:line` colon in a joust comment reddens)
  — my new file cites only `JOUSTRV4.SRC:NNNN` and bare `sim.ts`/`frame.ts` names without
  a `.ts:line` colon; full suite stayed green, so the guard is satisfied.
- **Audio-seam sweeps:** adding the two EVENT_KINDS will ripple `audio-manifest`,
  `audio-dispatch`, `shell/audio.ts` CUE_SOURCES and the seam sweeps — AC3 pins the
  observable end (emit + SNPLAV/SNELAV tables); the sweeps enforce the rest mechanically.
## Dev Assessment

GREEN by Loki Silvertongue. All acceptance work landed; verified full joust
suite **3762 passed / 0 failed** (206 files), orchestrator **505 passed**, `npm run
lint` clean, and `node scripts/build-app.mjs joust` builds.

### What shipped
- **AC2 — visible sink.** `stepLavaDeath` (core/sim.ts) replaces jt13-5's same-frame
  removal: a non-gripped bird at lava depth is kept and sunk FLOOR+7 → FLOOR+20 (one
  pixel per ~3-frame nap), holds ~30 frames, then is removed (a player respawns via the
  transporter; an enemy is gone). A new `lavaSink` field carries the frozen X + descent;
  `frame.ts` skips a `lavaSink` body (mirroring the `grippedBy` skip) so the sim owns its
  position and no wing cue sounds from a corpse.
- **AC3 — the cue.** Two new EVENT_KINDS (`player-lava-death`→SNPLAV, `enemy-lava-death`
  →SNELAV) wired end-to-end: events.ts tuple, audio-dispatch `cueFor`, audio-manifest
  CUE_SOURCES (byte-exact ADGFLR citations :6534/:6538 + :8123/:8105), SoundName/SOUNDS,
  CHANNELS, bake synth specs, and the golden sha256 table. Emitted at the sink onset.
- **AC1 — green guard.** Untouched: the break-free window stays grip-only in troll.ts.

### Design Deviation DD-3 (Dev): enemy lava death WIRED — reverses DD-2's "player only"
DD-2 (TEA) scoped the sink to the player because jt13-5 did. AC3 names SNELAV (enemy),
and the project's audio-events rule forbids an unfirable cue, so SNELAV needs a real
emitter. **User ruling (2026-08-18): "Wire enemy lava death now."** So `stepLavaDeath`
handles enemies too (a non-gripped enemy at lava depth sinks and dies, emitting SNELAV).
This is more ROM-faithful (ADGFLR handles both) and — verified — broke **no** enemy/wave
test: enemies rarely reach lava depth in play, and the frame-stepper/egg clamps
(jt11-18 @267/@323) are on a different path and untouched.

### Delivery Finding: cue/kind count-prose sweep + AC6 guard retirement
Adding the cues moved the derived counts (cues 18→20, event-kinds 17→19), rippling the
audio count-prose the way jt5-6's transporter split did. Fixed every guarded "N cues"
total (audio.ts, main.ts, audio-priority, audio-transporter-split, audio-frames-edge-cases)
and the kind-count prose (events.ts "nineteen moments / eighteen of the nineteen",
sim.ts). **Retired the jt9-28 AC6 "no stale seventeen" ratchet**: it guarded the leftovers
of the old 17→18 transition and its own non-vaciuity FAILS once no "seventeen" remains —
this story corrected the last four "seventeen" sites, so the guard's subject is gone. The
dynamic **AC5** guard (`every "N cues" total == CUE_COUNT`) remains and is the ongoing,
number-agnostic protection; no coverage was lost.

### Reconcile confirmed green
jt13-5 A (same-frame removal → sink), jt13-5 B (life-loss window widened 60→130 for the
sink's deferred removal), jt11-18 @210 (player bound DEATH_Y → FLOOR+20). Enemy/egg/
frame-stepper clamps at DEATH_Y unchanged.

Handing to review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|------------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | Complete | Diff = sim.ts (stepLavaDeath/LavaSink), frame.ts skip, events/audio wiring, the jt13-10 test file, count-prose ripples; branch green | Data for analysis |
| 2 | reviewer-test-analyzer | Yes | Complete | 3 gaps: AC2 sink pinned only by deepestY≥FLOOR+20 (teleport passes); AC1 velocity-reprieve pinned only by final life count (transient grace passes); enemy branch of lavaEntityOf untested | Fixed round 2 |
| 3 | reviewer-comment-analyzer | Yes | Complete | Round-1 comment findings (stale/misleading) fixed & committed (6c41c84d); no new comment findings round 2 | Resolved |
| 4 | reviewer-rule-checker | Yes | Complete | `p.enemy!` non-null assertion in withLavaEntity departs from the file's `p.kind === 'enemy' && p.enemy` narrowing idiom (5× elsewhere) | Fixed round 2 |
| 5 | reviewer-edge-hunter | Skipped | disabled | — | — |
| 6 | reviewer-silent-failure-hunter | Skipped | disabled | — | — |
| 7 | reviewer-type-design | Skipped | disabled | — | — |
| 8 | reviewer-security | Skipped | disabled | — | — |
| 9 | reviewer-simplifier | Skipped | disabled | — | — |

**All received: Yes** — 3 of 3 enabled specialists (test_analyzer, comment_analyzer, rule_checker) returned, plus preflight; the six disabled subagents are Skipped.

## Reviewer Assessment

**Verdict: APPROVED** — Heimdall, the Thought Police. Two review rounds. Round 1
(4 subagents + a mutation battery) flagged stale comments (fixed, committed 6c41c84d)
and, more seriously, that the RED suite pinned the *outcomes* of the lava cinematic but
not its *mechanism*. On the user's ruling ("harden the tests now, then approve") I closed
those gaps in round 2 and verified each with the defeating mutant. All work is green:
`npm run lint` clean, `npx vitest run --project joust` **3765 passed** (206 files),
`npm run test:orchestrator` **505 passed**, `node scripts/build-app.mjs joust` builds.

### `[TEST]` — test-analyzer findings, all resolved and mutation-verified (round 2, commit 8bb11a9a)

Three real coverage gaps; each fix was proven by re-applying a mutant that the OLD
assertion waved through and confirming the NEW one goes RED:

1. **AC2 sink was outcome-only.** The suite asserted only `deepestY >= FLOOR+20`, so a
   mutant that teleports the body straight to FLOOR+20 on the onset frame passed. Added
   a gradual-sink test: still on the FLOOR+7 surface at frame 2, strictly mid-descent at
   frame 20, monotone, reaching FLOOR+20 only after ~39 frames. *Verified:* onset-teleport
   mutant (`y: DEATH_Y` → `LAVA_SINK_BOTTOM`) reddens the new test while the old `deepestY`
   check stays green.
2. **DD-1 no-reprieve was final-tally-only.** AC1's velocity-reprieve guard checked only
   the ending life count, so a transient-grace mutant (fly ~45 frames, THEN die) still
   lost exactly one life and passed. Added a commit guard: a non-gripped bird below the
   surface with a flap twice `BREAK_FREE_VY` (upward) is bound to `lavaSink` within two
   frames and stays bound. *Verified:* a faithful frame-counter grace mutant reddens the
   new guard (and the gradual + enemy tests) while the old life-count test stays green —
   the exact miss DD-1 documents.
3. **Enemy branch untested.** Disabling the enemy arm of `lavaEntityOf` left the whole
   suite green. Added an enemy behavioral test: a non-gripped enemy at lava depth sinks
   to FLOOR+20 and emits `enemy-lava-death` (SNELAV). *Verified:* deleting the enemy
   branch reddens only this test. Also pinned single cue-emission (player and enemy):
   the lava cue fires exactly once over the whole sink, not per frame — *verified* by a
   per-frame re-emit mutant.

### `[DOC]` — comment-analyzer: clean on round 2

Round-1 comment findings (stale/misleading comments in sim.ts / the RED file) were fixed
and committed in 6c41c84d before this round. The new tests carry ROM-cited, control-anchored
comments; no `.ts:line` colons (the joust `comment-line-refs` guard stays green). No open
comment findings.

### `[RULE]` — rule-checker: one idiom departure, fixed

`withLavaEntity` used `p.enemy!` (non-null assertion); the file establishes
`p.kind === 'enemy' && p.enemy` narrowing 5× elsewhere. Rewritten to that idiom with an
explicit fallthrough (commit 8bb11a9a). core/shell purity, audio-seam sweeps, count-prose
(CUE_COUNT AC5), and citation guards all green in the full suite. `[VERIFIED]` no rule
regressions.

### Non-blocking / routed

- **jt13-11** (already filed): the troll grip-drown path still removes a gripped victim
  same-frame with no sink and no SNPLAV/SNELAV cue — out of scope here, owned there.
- The `frame.ts` `lavaSink`/`grippedBy` skip stays a `(p as {...})` cast rather than a
  promoted `Process` field; kept deliberately consistent with the existing `grippedBy`
  cast on the adjacent line (promoting one and not the other would be less consistent).
  No action.

Nothing blocking remains. Handing to SM to merge the PR and finish jt13-10.