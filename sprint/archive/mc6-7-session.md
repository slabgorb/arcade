---
story_id: "mc6-7"
jira_key: "mc6-7"
epic: "mc6"
workflow: "trivial"
---
# Story mc6-7: Block player fire/input while phase is 'pause'

## Story Details
- **ID:** mc6-7
- **Jira Key:** mc6-7
- **Workflow:** trivial
- **Stack Parent:** none
- **Type:** bug
- **Points:** 2
- **Priority:** p3

## Acceptance Criteria

1. `fireOrStart` in `plugins/missile-command/src/shell/input.ts` must guard against `phase === 'pause'` and no-op when paused
2. Fire/input actions (Z/X/C keydowns) during pause must NOT spend ammo
3. Fire/input actions (Z/X/C keydowns) during pause must NOT queue an ABM (air-burst missile)
4. Fire/input actions (Z/X/C keydowns) during pause must NOT emit a launch sound event
5. The guard must operate on the pre-keystroke phase (verify composition chain: `keydownReducer` → `pauseFromKey` → `nameEntryFromKey` → `fireOrStart`)
6. The `stepGame` sim freeze during pause remains correct (no regression)
7. Tests verify the pause guard with at least one keystroke that fires during pause phase

## Technical Context

**Premise verified TRUE:**
- `fireOrStart` (input.ts:130-139) currently guards phases `entry`, `attract`, and `over` but has NO `pause` guard
- During `phase === 'pause'`, a Z/X/C keydown falls through to `fireFromKey`, which spends ammo, queues an ABM, and emits a launch soundEvent
- The fix is to add pause-phase guard matching ROM PAUSE handler (MAINLINE JSRs PAUSE not PLAY, so ABMLAU never runs)

**Relevant seams for implementation:**
- Guard on pre-keystroke phase (note: `pauseFromKey` can flip play→pause within same keystroke)
- Core boundary is enforced: `src/core/` is pure sim; this fix is shell-only (`src/shell/input.ts`)
- Tests: `npx vitest run --project missile-command`

## Workflow Tracking
**Workflow:** trivial
**Phase:** finish
**Phase Started:** 2026-08-11T11:17:30Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-11T11:04:02Z | 2026-08-11T11:06:11Z | 2m 9s |
| implement | 2026-08-11T11:06:11Z | 2026-08-11T11:10:50Z | 4m 39s |
| review | 2026-08-11T11:10:50Z | 2026-08-11T11:17:30Z | 6m 40s |
| finish | 2026-08-11T11:17:30Z | - | - |

## Delivery Findings

### Dev (implementation)
- No upstream findings. The fire surface is keyboard-only: `main.ts` routes every launch
  through `keydownReducer` (Z/X/C). `pointerdown` only runs `beginSetupOnInput` (leave attract)
  and `pointermove` only sets the crosshair — there is no separate mouse-launch path to gate, so
  the single `fireOrStart` guard covers the whole input surface.

### Reviewer (code review)
- **Question** (non-blocking): `fireOrStart` still falls through to `fireFromKey` for the `setup`
  and `between` phases, so a fire key there launches an ABM and spends a round — the same latent
  class this story fixed for `pause`. Affects `plugins/missile-command/src/shell/input.ts`
  (consider gating `setup`/`between` too). Exposure is far lower than pause: both are single-frame
  auto-advancing phases (`setup`→`play` via `startGame`, `between`→`play` via `resumePlay`,
  game.ts:384/413), so the fire window is ~1 frame and practically unreachable by a human, unlike
  the player-held pause. Out of mc6-7's scope; noted for a possible follow-up, not a blocker.

## Design Deviations

### Dev (implementation)
- No deviations from spec. AC1 named `fireOrStart` as the guard site; the guard was added there and
  the composed `keydownReducer` inherits it. The title's alternative `/fireFromKey` site was not
  used — `fireFromKey` is the phase-unaware raw launcher and is only ever reached via `fireOrStart`,
  so guarding the composition entry point is both sufficient and the AC-named location.

### Reviewer (audit)
- **Dev's "guard site = `fireOrStart`, not `fireFromKey`"** → ✓ ACCEPTED by Reviewer: sound. AC1
  explicitly names `fireOrStart`; `fireFromKey` is the phase-unaware raw launcher reached only via
  `fireOrStart` (input.ts:83, 138), so guarding the composition entry point is both sufficient and
  the AC-named location. Placing the guard in `fireFromKey` would have been wrong (it has no phase
  concept and the sim never calls it during pause anyway).
- No undocumented deviations found. AC5's "guard operates on the pre-keystroke phase" is satisfied
  in substance: the only keystroke that changes phase before `fireOrStart` runs is the pause key
  (`escape`), which is never a fire key, so for every fire keystroke the phase `fireOrStart` reads
  equals the pre-keystroke phase. Verified by trace and by the composed `keydownReducer` test group.

## SM Assessment

**Board check (pre-setup):** Sibling probes run before spawning `sm-setup`. Branch probe
(`git fetch --prune && git branch -r | grep -Ei mc6-7`) found NO mc6-7 branch on the remote —
only `feat/mc10-6-…` (a-1 owns mc10-6) and the two long-lived branches. Session sweep across
`/Users/slabgorb/Projects/a-*/.session/` showed a-1 on mc10-6 and a-2 on pm4-8, neither touching
this story's files. mc6-7 was unclaimed and safe to start.

**Premise verified TRUE against the current tree.** The story asserts shell fire input is ungated
during pause. Confirmed by reading `plugins/missile-command/src/shell/input.ts`: `fireOrStart`
(lines 130-139) guards `entry`, `attract`, and `over`, but has no `pause` guard — so during
`pause` a Z/X/C keydown falls through to `fireFromKey`, spending ammo, queuing an ABM, and emitting
a `launched` soundEvent. The `stepGame` sim freeze during pause is already correct; only the shell
input path is ungated. No correction block was needed and ACs were derived faithfully from the
title.

**Seam risk flagged for Dev:** the composed reducer is `keydownReducer` → `pauseFromKey` →
`nameEntryFromKey` → `fireOrStart`, and `pauseFromKey` runs FIRST — a single keypress can flip
play→pause within the same keystroke. Decide deliberately whether the guard reads the
already-toggled phase inside `fireOrStart` or must capture the pre-keystroke phase in
`keydownReducer` (mirroring the existing `wasEntry` capture), so a lone pause-toggle keypress is
handled correctly and no fire leaks in the toggling frame.

**Trivial (phased) workflow.** Handing off to Dev for the `implement` phase. Scope is shell-only
(`src/shell/input.ts`) plus its test; the core boundary must stay intact. 2 points, p3.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/missile-command/src/shell/input.ts` — one `if (state.phase === 'pause') return state`
  guard added to `fireOrStart`, grouped with the existing `entry` guard, with a ROM-anchored comment
  (MAINLINE JSRs PAUSE not PLAY; ABMLAU never runs — W3MAIN.MAC:615/:617). The composed
  `keydownReducer` inherits the gate; no change needed there.
- `plugins/missile-command/tests/mc6-7-pause-fire-gate.test.ts` — new RED→GREEN test (10 cases):
  `fireOrStart` inert while paused (each of Z/X/C: no ABM, no ammo, no launch cue, phase held; whole
  board value-unchanged); the composed `keydownReducer` seam inert while paused; and a CONTROL group
  proving the SAME fixture in `'play'` still launches (the gate suppresses real behaviour, not an
  inert board).

**Seam decision (the SM-flagged risk):** the guard lives in `fireOrStart` and reads the
possibly-already-toggled phase — this is complete and correct because no single keystroke both
toggles pause AND fires: fire keys (Z/X/C) are not pause keys (only `escape` is, per `@shared/pause`).
Traced all three transitions — already-paused + fire key (gated), play + Escape unpause-toggle
(Escape is not a fire key, no leak), pause + Escape unpause (falls to `fireFromKey('Escape')` → null
base → no-op). No pre-keystroke capture in `keydownReducer` was needed.

**Tests:** 10/10 on the story test; 1307/1307 across the full `missile-command` project (74 files);
`npm run lint` (tsc --noEmit) clean. Core purity sweep green (fix is shell-only).

**Branch:** feat/mc6-7-gate-fire-during-pause (pushed, `55541b3d`)

**Handoff:** To review (Obi-Wan / Reviewer).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — tests 1307/1307 mc + 457/457 orchestrator green, tsc clean, 0 smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — assessed test quality myself (see Rule Compliance / observations) |
| 5 | reviewer-comment-analyzer | Yes | clean | none | N/A — independently verified every ROM citation (W3MAIN.MAC:615/:617, MAINLINE sign-dispatch, MAXMIS full ammo, Heimdall provenance) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — no type change (guard returns the same `GameState`); assessed myself |
| 7 | reviewer-security | Yes | clean | none | N/A — backend-less client game; the guard only narrows the input surface |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — change is already minimal (one guard line) |
| 9 | reviewer-rule-checker | Yes | clean | none (0 violations / 29 rules) | N/A — mutation-tested the guard (7/10 red on deletion, 3 CONTROL green); provenance verified vs mc6-3-session.md:235-240 |

**All received:** Yes (4 enabled returned, all clean; 5 disabled via `workflow.reviewer_subagents`, pre-filled as Skipped)
**Total findings:** 0 confirmed blocking, 0 dismissed, 1 deferred (non-blocking Question — setup/between fire gap, logged in Delivery Findings)

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** a `keydown` event → `main.ts` `keydownReducer(event.key, game)` →
`pauseFromKey → nameEntryFromKey → fireOrStart`. For a paused game + fire key (Z/X/C):
`pauseFromKey` returns unchanged (Z/X/C are not the pause key `escape`), `nameEntryFromKey` returns
unchanged (phase ≠ `entry`), and `fireOrStart` now hits `if (state.phase === 'pause') return state`
(input.ts:141) → the launch path (`fireFromKey`) is never reached. Safe: no ammo spent, no ABM
queued, no `launched` soundEvent. The unpause keystroke (`escape` while paused) is unaffected —
`pauseFromKey` flips to `play`, then `fireOrStart('Escape', play)` falls to `fireFromKey`, whose
`fireKeyToBase('Escape')` is `null` → state returned unchanged.

**Pattern observed:** the new guard (input.ts:141) is idiomatically identical to the sibling `entry`
guard directly above it (input.ts:135) — comment-then-early-return, mc-tag + ROM citation in a `//`
comment (never JSDoc, per the file convention). Good pattern, correctly followed.

### Rule Compliance (typescript.md + arcade CLAUDE.md)
- **Core/shell purity (CLAUDE.md):** COMPLIANT — the change is entirely in `src/shell/input.ts`;
  no `src/core/` file touched, no `Date`/`Math.random`/DOM introduced. Purity sweep green (preflight).
- **Type safety (rule 1-2):** COMPLIANT — no `any`, no cast, no `!`; `fireOrStart`'s signature is
  unchanged and `GameState`'s array fields remain `readonly`.
- **Phase union exhaustiveness (rule 3):** COMPLIANT — `Phase` is a string-literal union; the guard
  extends the existing if-cascade in the file's established shape.
- **Module `.js` extensions (rule 5):** COMPLIANT — test imports carry `.js`
  (`../src/core/game.js`, `../src/shell/input.js`); no new source imports.
- **Test quality (rule 8/15/18/26):** COMPLIANT — real assertions on `abms`/`bases`/`soundEvents`/
  `phase`, a whole-board `toEqual`, the composed-seam group, and a discriminating CONTROL group.
  Rule-checker independently mutation-tested (delete guard → 7/10 red, 3 CONTROL green).
- **ROM-citation convention (rule 17/29):** COMPLIANT — `W3MAIN.MAC:615/:617` is reused verbatim
  from the already-committed `MC-ANCH-W3MAIN-615` anchor (comment-analyzer + rule-checker both
  verified against the source), not fabricated; carried in a `//` comment, not JSDoc.

### Observations (≥5)
- `[VERIFIED]` The pause guard is complete, not partial — `fireKeyToBase` accepts only `z/x/c`
  (input.ts:51-62) and `pauseFromKey` toggles only on `escape` (via `isPauseKey`), so fire keys and
  the pause key are disjoint; no single keystroke both toggles pause and fires. evidence:
  input.ts:51-62, 186-188 + the composed test passes 3/3.
- `[VERIFIED]` No unpause regression — `fireFromKey('Escape', …)` short-circuits on
  `fireKeyToBase===null` (input.ts:84-85), so the phase `fireOrStart` may already have toggled to
  `play` does not cause an accidental fire. evidence: input.ts:83-85.
- `[VERIFIED]` AC1-4/6/7 covered — the test asserts, per fire key, no ABM / no ammo / no launch cue
  / phase held, a whole-board value-equality, the composed `keydownReducer` seam, and a CONTROL
  group proving non-vacuity. AC6 (sim freeze) is a pre-existing green guard in `pause.test.ts` AC2.
  evidence: mc6-7-pause-fire-gate.test.ts:47-96.
- `[VERIFIED]` Core boundary intact — shell-only change; orchestrator suite (457) and the game's
  purity sweep both green. evidence: preflight result.
- `[DOC]` (comment-analyzer, clean/confirmed) The ROM citation and the "mc6-3 Heimdall review
  flagged as ungated" provenance are both accurate — comment-analyzer verified the source lines
  (W3MAIN.MAC:615=`.SBTTL PAUSE STATE`, :617=`PAUSE:`, MAINLINE sign-dispatch, `MAXMIS` full ammo);
  no stale or misleading comment in the diff.
- `[RULE]` (rule-checker, clean/confirmed) 0 violations across 29 rules; the guard is idiomatically
  identical to the sibling `entry` guard, its citation is reused from a committed anchor (not
  fabricated), and the guard was independently mutation-tested (delete → 7/10 red, 3 CONTROL green).
- `[SEC]` (security, clean/confirmed) No security-relevant impact — backend-less client game, no
  auth/PII/tenant/injection surface; the guard only narrows the input surface (fire is now provably
  inert during pause), never widens it.
- `[MEDIUM → non-blocking Question]` `setup`/`between` fire is still ungated — a latent parallel to
  this bug, but ~1-frame windows and out of scope. Logged in Delivery Findings for a follow-up.

### Devil's Advocate
Argue the code is broken. First attack: the guard reads `state.phase` *after* `pauseFromKey` has
run inside `keydownReducer`, so on the very keystroke that toggles pause the guard could act on the
wrong phase and either swallow a legitimate fire or leak one. I traced this: the only key that moves
the phase before `fireOrStart` is the pause key (`escape`), and `escape` is not a fire key, so on a
*fire* keystroke the phase is never mutated mid-chain — the guard's read equals the pre-keystroke
phase in every fire case. The pause-toggle keystroke itself carries no fire. So the attack fails.
Second attack: does the guard block the player from *unpausing*? If `fireOrStart` no-oped all input
during pause, Escape-to-resume would be eaten. But resume runs through `pauseFromKey` (which flips
to `play`) before `fireOrStart` sees the state, and even then Escape is a non-fire key that
`fireFromKey` ignores — so unpause is untouched. Third attack: could a paused game's queued input,
mouse, or auto-cursor still fire? MC has no mouse-launch path (`pointerdown` only leaves attract,
`pointermove` only moves the crosshair), and the sim is frozen during pause (`stepGame` pause
branch, game.ts:378), so the attract auto-cursor driver does not run either — the keyboard path was
the whole surface, and it is now gated. Fourth attack: an empty/destroyed-base edge — but the guard
returns *before* any base is inspected, so ammo state is irrelevant while paused. Fifth: a
confused user mashing Z/X/C under the pause overlay expecting to fire — they now correctly get
nothing, matching the ROM (MAINLINE JSRs PAUSE, not PLAY). The one genuine residue the devil found
is the `setup`/`between` fall-through, which I have logged as a non-blocking follow-up. Nothing here
rises to Critical or High.

**Error handling:** the reducer is total over `Phase` and pure — no throw path, no null deref; a
non-fire key or a spent base is already handled by `fireFromKey` (input.ts:83-92). Inputs are
`KeyboardEvent.key` strings, browser-constrained; no untrusted boundary.

**Handoff:** To SM for finish-story.

---

**Branch:** feat/mc6-7-gate-fire-during-pause
**Created:** 2026-08-11T11:04:02Z