# Story jt9-6 Context

## Title
An unarbitrated cue sharing the arbitrated voice's channel silences it without releasing its window

## Metadata
- **Story ID:** jt9-6
- **Type:** story
- **Points:** 2
- **Priority:** p3
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Joust — the remainder, re-ordered: apparatus, gameplay, geometry, brains, dossier

## Problem
jt5-5 put the arbitration in src/shared/audio.ts and guarded the case where an ACCEPTED cue never starts (a 404'd or still-decoding sample must not hold a silent window). One route to the same silent-window state is left open. `stopChannel(channel)` is reached from a plain `startSource` for a cue with NO priority; if that cue's channel happens to be the one the arbitrated voice is sounding on, the voice's SOURCE is stopped but `voiceFrames`/`voiceChannel` keep holding, so lower-priority arbitrated cues go on being refused by a voice nobody can hear. `stopLoop` already handles this correctly (`if (voiceChannel === channel) releaseVoice()`); the stealing path does not, and the asymmetry is the bug. REPRODUCED at review with a probe: manifest {loud:80 ch 'v', plain:no-priority ch 'v', quiet:10 ch 'w'}; play('loud'), play('plain') -> loud's source .stopped === true; play('quiet') -> still refused. NOT REACHABLE TODAY, which is why jt5-5 shipped: joust routes all seventeen cues as arbitrated, and none of the other six games passes `priorities` at all, so no manifest in the tree can mix an unarbitrated cue onto an arbitrated channel. It is a trap for the next cabinet that does. Fix is one line — release the voice inside `stopChannel` itself (which both paths share) rather than in `stopLoop` — plus a test with the mixed manifest above. Check the reverse too: an ARBITRATED cue that steals a channel out from under an unarbitrated sound is fine and should stay fine.

## SM Setup Corrections (2026-08-03, jt9-6 setup)

The text above is preserved as filed, but ONE premise in it is now FALSE and
downstream agents must not inherit it uncorrected.

**MEASURED FACT** (SM, checked against `main` at commit `77ef628`): the story
description's closing claim — "NOT REACHABLE TODAY ... a trap for the next
cabinet that does [pass `priorities`]" — no longer holds. `cp6-3`
(`feat(cp6-3): POKEY voice 0 is arbitrated`) landed upstream today and
centipede is now the SECOND game passing `priorities`/`frameDurations` to the
shared engine (`plugins/centipede/src/shell/audio.ts:227-228`). Cross-
referencing centipede's shipped `CHANNELS` map against the arbitrated set
(cues with `pokeyVoice === 0` in
`plugins/centipede/docs/rom-study/sound.fixture.json`) yields TWO channels
that hold BOTH an arbitrated and an unarbitrated cue:

- channel `alert`  — arbitrated=[playerDeath] — UNARBITRATED=[headBottom, waveClear]
- channel `impact` — arbitrated=[segmentKill, spiderKill, fleaKill, scorpionKill] — UNARBITRATED=[mushroom]

**SM's reading of severity — a CLAIM for TEA to re-measure, not a fact:**

- The `alert` overlap looks harmful. `playerDeath` carries `EXPLOSION_RANK = 1`
  and a 76-frame window. If `waveClear` or `headBottom` (both unarbitrated)
  plays while the explosion rings, `startSource` takes no refusal path, calls
  `stopChannel('alert')` which stops the explosion's SOURCE, but leaves
  `voicePriority=1` / `voiceFrames` / `voiceChannel` held. All four kill cues
  (`KILL_RANK = 0`, strictly lower) would then be refused for the remainder of
  ~76 frames by a voice nobody can hear.
- The `impact` overlap looks BENIGN under centipede's two-rank scheme: a stale
  `KILL_RANK=0` window refuses only strictly-lower ranks and nothing is lower
  than 0. Do not report it as a second live defect without measuring it.
- Whether either is reachable in real gameplay is UNSETTLED. cp6-3's own
  filing noted centipede's death pause is 48 frames of the 76, leaving
  roughly a 28-frame audible tail. TEA must settle reachability rather than
  assume it, and if a sweep asserts "no kill cue sounds", it needs a POSITIVE
  CONTROL proving the sweep can observe a kill cue at all.

**cp6-3 is still `status: in_progress`** in `sprint/epic-cp6.yaml` — a sibling
checkout has landed its GREEN and is mid-review. Do **NOT** edit `cp6-3`, its
epic entry, or any centipede file from this story. `jt9-6`'s scope is
`src/shared/audio.ts` plus its own tests. If centipede needs a change as a
result of this story's finding, that is a finding to file against centipede,
not work to do here.

## Technical Approach

Story scope per the filing: the fix is to release the arbitrated voice
inside `stopChannel` itself (the path BOTH `startSource`'s steal and
`stopLoop` share) rather than only in `stopLoop`. `stopLoop` already does
`if (voiceChannel === channel) releaseVoice()` correctly at
`src/shared/audio.ts:300`; the steal path at `:250` does not, and that
asymmetry is the bug. The story also asks explicitly to confirm the REVERSE
case stays correct: an ARBITRATED cue stealing a channel from an unarbitrated
sound is fine and must stay fine (that is the `:253-255` cross-channel
steal).

**BLAST RADIUS WARNING:** `src/shared/audio.ts` is shared code every game
imports. The verification command is the FULL `npx vitest run`, NOT
`--project joust`.

## Scope
- In scope: `src/shared/audio.ts` (the `stopChannel`/`startSource`/`stopLoop`
  voice-release asymmetry) and its own tests.
- Out of scope: any centipede file, `cp6-3`, or its epic entry — file a
  finding instead of editing them.

## Acceptance Criteria
_No acceptance criteria recorded in the sprint YAML — TEA to define during
the RED phase. At minimum: (1) a mixed-manifest test matching the filed
repro (loud:80 ch 'v' [priority], plain:no-priority ch 'v', quiet:10 ch 'w')
proving `stopChannel` releases the voice on the steal path; (2) a regression
test confirming the `:253-255` cross-channel steal (arbitrated cue stealing
an unarbitrated cue's channel) still behaves correctly; (3) a reachability
ruling — with a positive control — on the two centipede channel overlaps
above, filed as a finding rather than fixed here._

## Verification Baselines (measured at setup, 2026-08-03, commit `77ef628`)

Re-verify these; do not trust stale numbers carried forward from an earlier
story.

- `npx vitest run` (FULL suite, not `--project joust`): **755 files passed,
  11654 tests passed | 1 todo (11655 total)**.
- `npx vitest run --project joust`: 105 files passed, 2533 tests passed
  (unchanged from the last-known figure — confirms `cp6-3` did not touch
  joust).
- `npm run lint` (`tsc --noEmit`, repo-wide): clean, zero errors.
- `npm run test:orchestrator`: **390/390** passed.

## Harness Traps (apply to every phase of this story)

A broken harness reads exactly like a clean result:

- Verify a mutation actually changed the file (diff it) before believing any
  KILLED/SURVIVED outcome.
- Quote shell variables — an unquoted zsh var has previously made vitest see
  one bad arg and print "No test files found", giving a uniform false KILL.
- Never restore a mutated file with `git checkout --` while an uncommitted
  production fix is in the tree — snapshot and restore from the snapshot
  instead.
- Run test runners strictly sequentially, never two at once against the same
  working tree.

---
_Generated by `pf context create story jt9-6` from the sprint YAML, then
enriched by SM at setup with measured findings (see "SM Setup Corrections"
above)._
