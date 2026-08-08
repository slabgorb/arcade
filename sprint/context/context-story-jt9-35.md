# Story jt9-35 Context

## Title
The stopChannel voice release ships with its channel condition unpinned — an unconditional releaseVoice() leaves all 11666 tests green

## Metadata
- **Story ID:** jt9-35
- **Type:** bug
- **Points:** 2
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Joust — the remainder, re-ordered: apparatus, gameplay, geometry, brains, dossier

## Problem
Reviewer battery on jt9-6: 14 novel mutants, none of them in TEA's M1-M6 or Dev's M2 re-run. jt9-6's fix — `if (voiceChannel === channel) releaseVoice()` at src/shared/audio.ts:222, below stopChannel's early return — is CORRECT and shipped. What nothing pins is its GUARD CONDITION. Three survivors, each proven NON-EQUIVALENT by a standalone probe importing the real module, each leaving the FULL suite (756 files / 11665 passed | 1 todo) completely green. (1) THE BIG ONE, and it is LIVE, not latent: replace that whole line with a bare `    releaseVoice()` (verbatim, four leading spaces, anchored by the `    try {` on the next line) -> 0 of 11666 tests fail. Probe: manifest {loud prio 80/76f ch v, n1 unarbitrated ch x, n2 unarbitrated ch x, quiet prio 10/20f ch w}; play(loud), play(n1), play(n2), play(quiet) -> 3 started sources with the shipped fix, 4 with the mutant. Two unarbitrated cues on a channel the voice does NOT own destroy arbitration. Why the existing guard misses it: `an unarbitrated cue on ANOTHER channel does not release the voice` runs on MIXED, where `noise` is the ONLY cue on channel `x`, so stopChannel(x) always hits `if (!prev) return` and an unconditional release never executes — the test name promises a stronger guarantee than the test delivers. REACHABLE IN CENTIPEDE TODAY: `spider-killed` maps to `spiderKill`, arbitrated on channel `impact` for 19 frames (plugins/centipede/src/shell/audio.ts:106,123 and PRIORITIES/FRAME_DURATIONS at :209-218), and the same kill also takes the `spider-stop` edge -> `stopLoop(spiderLoop)` on channel `voice-spider` (:133-134), appended at stepSim's single exit AFTER the one-shots (plugins/centipede/src/core/sim.ts:683-687). Under the mutant that stopLoop frees the kill's window instantly, with every test green. (2)+(3) THE ZERO-LENGTH WINDOW, latent: `    if (voiceChannel === channel && voiceFrames > 0) releaseVoice()` at the same site; the same `&& voiceFrames > 0` added to stopLoop's own release; and `&& voiceFrames > 0` added to the cross-channel steal condition at :266 — all three survive 11666 tests. Probe: {zap prio 5 with NO frameDurations entry ch v, plain unarbitrated ch v, boom prio 9/30f ch w}; play(zap), play(plain), play(boom) -> plain.stopped is false with the fix and true with the restrictor. That is the SAME stale-voiceChannel cross-channel steal `a released voice no longer reaches across to a channel it lost` pins, but that test only covers NONZERO windows. voiceFrames === 0 with voiceChannel set is reachable only from a priority whose frameDurations entry is missing or zero, and tick() can never clear it because it only acts while > 0, so only stopChannel/stopLoop can. Neither shipped cabinet has such a cue today (joust framesFor throws on frames <= 0, plugins/joust/src/shell/audio-manifest.ts:593-608; centipede windowFrames yields 76/19) — the same latent shape jt9-6 itself had before cp6-3 made it live. (4) Adjacent and also unpinned: inserting `      if (voiceChannel === channel) releaseVoice()` immediately above `      pending.set(channel, name)` — a parked loop that never sounded frees the window — survives all 11666. SCOPE: add engine tests to src/shared/tests/audio-voice-release.test.ts that kill the bare-releaseVoice mutant (an unarbitrated cue silencing something on a channel the voice does NOT own must leave the window alone) and the voiceFrames restrictor (an arbitrated cue with no frameDurations entry still owns its channel until something silences it). Re-run the verbatim strings above rather than reconstructing intent. Filed by Reviewer on jt9-6. CITATIONS RE-MEASURED 2026-08-03 by the Architect grooming pass, and every line anchor in the CENTIPEDE half of this story had drifted — by up to 33 lines, which is the failure that does not dangle but silently points at the WRONG REAL CODE. cp6-3 edited plugins/centipede/src/shell/audio.ts the same day (comment-only, but it moved the file) and the anchors predate it besides. THE MECHANISM IS UNCHANGED AND THE FINDING STANDS, re-verified symbol by symbol: spiderKill is still arbitrated on channel `impact`, spiderLoop still sits on `voice-spider`, and the same kill still takes both edges. The corrected anchors: the spiderKill channel entry :106 -> :109; the `spider-killed` -> `spiderKill` mapping :123 -> :136; the `spider-stop` -> `spiderLoop` mapping :133-134 -> :147; PRIORITIES/FRAME_DURATIONS :209-218 -> :242-248; and the `spider-killed` emit (previously line-cited, twice, and stale both times) is at plugins/centipede/src/core/sim.ts (the `spider-killed` event push — jt9-55 converted this citation to a symbol ref rather than a third line number). RE-MEASURE AGAIN AT SETUP rather than trusting this list — jt9-30 measured the drift rate for exactly these refs at HOURS, not months.

## Technical Approach
_Approach hints to be refined by TEA/Dev. The story title above defines the
intended behavior._

## Scope
- In scope: the behavior described by the story title.
- Out of scope: unrelated changes.

## Acceptance Criteria
_No acceptance criteria recorded in the sprint YAML — TEA to define during the RED phase._

---
_Generated by `pf context create story jt9-35` from the sprint YAML._
