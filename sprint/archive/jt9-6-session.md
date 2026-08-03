---
story_id: "jt9-6"
jira_key: "jt9-6"
epic: "jt9"
workflow: "tdd"
---
# Story jt9-6: An unarbitrated cue sharing the arbitrated voice's channel silences it without releasing its window

## Story Details
- **ID:** jt9-6
- **Jira Key:** jt9-6
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 2
- **Priority:** p3
- **Branch:** main
- **PR:** none
- **Repos:** arcade

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-03T14:50:21Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-03T14:01:01Z | 2026-08-03T14:20:29Z | 19m 28s |
| red | 2026-08-03T14:20:29Z | 2026-08-03T14:20:39Z | 10s |
| green | 2026-08-03T14:20:39Z | 2026-08-03T14:27:24Z | 6m 45s |
| review | 2026-08-03T14:27:24Z | 2026-08-03T14:50:21Z | 22m 57s |
| finish | 2026-08-03T14:50:21Z | - | - |

### Branch and Context
**Branch Strategy:** trunk-based (branching skipped — work happens on the default branch, `main`)
**Context File:** sprint/context/context-story-jt9-6.md ✓ (created, and enriched at setup with the SM's measured cp6-3 cross-reference — see "SM Setup Corrections" section there)
**Epic Context File:** sprint/context/context-epic-jt9.md ✓ (pre-existing, validated)

## Background

**Jira:** No Jira in this project — issue tracking is local via `sprint/` YAML (see CLAUDE.md). `jira_key` above is just the story id.

**Repo:** arcade (trunk-based, one repo, one remote, `main`). No feature branch is created for this story; work happens directly on `main` per `.pennyfarthing/repos.yaml`'s `branch_strategy: trunk-based`, confirmed via `pf.git.repos.should_create_branch()` → `False`.

**Scope:** `src/shared/audio.ts` (shared code every game imports) plus its own tests. Do NOT touch `cp6-3`, its epic entry, or any centipede file — `cp6-3` is `status: in_progress` in `sprint/epic-cp6.yaml`, landed upstream today (commit `77ef628`, `feat(cp6-3): POKEY voice 0 is arbitrated`) and is mid-review in a sibling checkout. If this story's finding implies a centipede change, file it — do not make it here.

**MEASURED FACT (SM, at setup, against `main` at commit `77ef628`):** the story description's premise that this bug is "NOT REACHABLE TODAY ... a trap for the next cabinet that does [pass `priorities`]" is now FALSE. `cp6-3` makes centipede the SECOND game passing `priorities`/`frameDurations` to the shared engine (`plugins/centipede/src/shell/audio.ts:227-228`). Cross-referencing centipede's shipped `CHANNELS` map against its arbitrated set (`pokeyVoice === 0` cues in `plugins/centipede/docs/rom-study/sound.fixture.json`) finds TWO channels holding both an arbitrated and an unarbitrated cue:
  - channel `alert`  : arbitrated=[playerDeath] — UNARBITRATED=[headBottom, waveClear]
  - channel `impact` : arbitrated=[segmentKill, spiderKill, fleaKill, scorpionKill] — UNARBITRATED=[mushroom]

Full detail, including the SM's (unverified) severity read on each overlap and the harness traps, is in `sprint/context/context-story-jt9-6.md` under "SM Setup Corrections" — TEA should read that section before the RED phase and re-measure reachability rather than assume it.

**Story scope (per filing):** release the arbitrated voice inside `stopChannel` itself (the path both `startSource`'s steal at `src/shared/audio.ts:250` and `stopLoop` share), rather than only in `stopLoop`'s existing `if (voiceChannel === channel) releaseVoice()` at `:300`. Also confirm the REVERSE case stays correct: an arbitrated cue stealing a channel from an unarbitrated sound (the cross-channel steal at `:253-255`) is fine today and must stay fine.

**Verification baselines (measured at setup, 2026-08-03, commit `77ef628` — do not trust older figures, this repo's shared code changed today):**
- `npx vitest run` (FULL suite — this story's blast radius is shared code, so `--project joust` alone is NOT sufficient verification): **755 files passed, 11654 tests passed | 1 todo (11655 total)**.
- `npx vitest run --project joust`: 105 files passed, 2533 tests passed (matches the last-known figure — confirms `cp6-3` did not touch joust).
- `npm run lint` (`tsc --noEmit`, repo-wide): clean.
- `npm run test:orchestrator`: **390/390** passed.

**Harness traps (from prior stories, apply here too):**
- Verify a mutation actually changed the file (diff it) before believing any KILLED/SURVIVED outcome.
- Quote shell variables — an unquoted zsh var has previously made vitest see one bad arg and print "No test files found", a uniform false KILL.
- Never restore a mutated file with `git checkout --` while an uncommitted production fix is in the tree — snapshot and restore from the snapshot.
- Run test runners strictly sequentially, never two at once against the same working tree.

**Commit discipline:** any commit in this story uses `git commit -F -` with a quoted heredoc — never `git commit -m` with backticks (they run as shell commands and are deleted from the message).

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): the filing names TWO routes into `stopChannel` and there are THREE. The third, `src/shared/audio.ts:254` (an arbitrated cue's cross-channel steal), reaches the SAME silent-window state by a different door when the replacement source throws inside the `:256` try-block: the voice's source is stopped at `:254`, the claim at `:273-277` never runs, and the stale window survives in the `catch`. Not mentioned anywhere in the story or in jt5-5. Now covered by `an arbitrated cue whose source fails to build releases the voice it silenced`, and closed by the same one-line fix. *Found by TEA during test design.*
- **Gap** (non-blocking): the defect has a SECOND observable nobody had looked for — a stale `voiceChannel` (not just a stale window) makes the next accepted arbitrated cue reach across at `:253-255` and stop a source on a channel the voice no longer owns. This is what makes centipede's `impact` overlap not merely benign, and it fails independently of every refusal assertion (mutant M6 proves it). *Found by TEA during test design.*
- **Question** (non-blocking, ANSWERED — no action): centipede's two mixed channels (`alert`, `impact`) are LATENT, not live. Measured against `plugins/centipede/src/core/sim.ts:1042` (`if (state.delay > 0) return stepDeathFrame(state)`), which freezes all enemy motion for the whole `DEATH_DELAY = 0x30` = 48-frame pause, plus the respawn re-lay at `sim.ts:889` (`newd: false`) and `sim.ts:904` (every segment back to `v = 0xf8 = 248`). Earliest possible `head-reached-bottom` after a `player-died` is F+169 against a 76-frame window; `wave-cleared` needs ~336 frames. NO centipede file needs to change and NO centipede story is filed, because jt9-6's engine fix closes the trap for every cabinet at once. *Found by TEA during test design.*
- **Improvement** (non-blocking, in scope for THIS story, no separate filing): `stopLoop`'s `:300` release is NOT made redundant by the fix, contrary to the SM's read — pinned by `stopLoop still frees a window whose sample already ended` and proven by mutant M3. Dev must keep it. *Found by TEA during test design.*

### Reviewer (code review)
- **Gap** (non-blocking): the guard's CHANNEL CONDITION ships unpinned. Replacing
  `if (voiceChannel === channel) releaseVoice()` with a bare `releaseVoice()` fails
  **0 of 11666** tests, and a probe against the real module proves it is not
  equivalent (3 started sources vs 4). Reachable in centipede today via
  `spiderKill` (arbitrated, `impact`, 19f) + the same kill's `spider-stop` →
  `stopLoop('spiderLoop')` on `voice-spider`. Filed as **jt9-35**. *Found by
  Reviewer during code review.*
- **Gap** (non-blocking): the ZERO-LENGTH arbitrated window is untested anywhere in
  the repo — `&& voiceFrames > 0` added to this fix, to `stopLoop`'s release, or to
  the cross-channel steal all survive 11666 tests. Latent (neither shipped cabinet
  has a duration-less arbitrated cue). Filed as **jt9-35**. *Found by Reviewer
  during code review.*
- **Question** (non-blocking, ANSWERED — routed to **jt9-7**): a cue absent from a
  game's `channels` map gives `channel === undefined`, so `voiceChannel` becomes
  `undefined`, not `null`. Measured: it behaves as a coherent phantom channel and
  CANNOT match spuriously, because `voiceChannel === null` implies a fully-released
  voice — so `===` vs `==` at the new guard is a genuine equivalent mutant. This is
  a constraint jt9-7 needs before it deletes joust's `CHANNELS`. *Found by Reviewer
  during code review.*
- **Improvement** (non-blocking, no separate filing — jt9-35 covers it): TEA's
  citation `plugins/centipede/src/core/sim.ts:904` for "every segment back to
  `v = 0xf8`" is one hop indirect — that line is `segs: createCentipede(...)`; the
  constant is `plugins/centipede/src/core/centipede.ts:64` (`CENT_ENTER_V = 0xf8`),
  applied at `centipede.ts:230`/`:237`/`:257`. The substance and the whole
  reachability ruling hold; only the line-to-quote mapping is loose. *Found by
  Reviewer during code review.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Test count and reach:** the filing asks for "a test with the mixed manifest above" (one test, one route). The suite is 11 tests over FOUR routes, because the mixed-manifest repro alone cannot distinguish the two candidate placements of the fix, cannot see the `:254` throw path, and cannot see the stale-`voiceChannel` axis. Reason: three of the six recorded mutants survive a battery built only from the filed repro.
- **No acceptance criteria existed in the sprint YAML.** Defined at RED (AC-1..AC-5, listed in the TEA Assessment below) rather than inherited.

## Sm Assessment

**Routing:** tdd (phased) → red → TEA. 2-point p3 bug-fix story, scoped to
`src/shared/audio.ts`.

**Story premise re-opened at setup, and one load-bearing claim in it is now
stale:** the filed description says this defect is "NOT REACHABLE TODAY ...
a trap for the next cabinet that does [pass `priorities`]" because joust was
the only game passing `priorities`/`frameDurations`. That is now FALSE.
`cp6-3` (`feat(cp6-3): POKEY voice 0 is arbitrated`, commit `77ef628`,
landed today) makes centipede the second such game. Cross-referencing
centipede's shipped `CHANNELS` map against its arbitrated set
(`pokeyVoice === 0` in `plugins/centipede/docs/rom-study/sound.fixture.json`)
finds two channels holding both an arbitrated and an unarbitrated cue:
channel `alert` (arbitrated `playerDeath`; unarbitrated `headBottom`,
`waveClear`) and channel `impact` (arbitrated `segmentKill`, `spiderKill`,
`fleaKill`, `scorpionKill`; unarbitrated `mushroom`). Full detail, plus my
(unverified) severity read on each overlap, is in `sprint/context/
context-story-jt9-6.md` and the Background section above — **TEA decides
reachability, does not inherit my read.**

**Scope fence — do not cross it.** `cp6-3` is `status: in_progress` in
`sprint/epic-cp6.yaml`; a sibling checkout has it mid-review. This story
touches `src/shared/audio.ts` and its own tests only. Any centipede
consequence of this story's fix (or of the overlap above) is a finding to
file, not work to do here.

**The fix's shape, per the filing, re-confirmed against the code at
setup:** `stopChannel` (`src/shared/audio.ts:206-216`) stops the channel's
source but never touches `voicePriority`/`voiceFrames`/`voiceChannel`.
`stopLoop` (`:291-301`) already guards this correctly with
`if (voiceChannel === channel) releaseVoice()` at `:300`. The steal path
inside `startSource` (`:250`, `stopChannel(channel)` before the new source
starts) does NOT carry that guard, so a same-channel unarbitrated steal
silences the arbitrated voice's source while leaving its window held.
Moving the release into `stopChannel` itself covers both callers. The
REVERSE case — an arbitrated cue's cross-channel steal at `:253-255`
(`stopChannel(voiceChannel)` when `voiceChannel !== channel`) — must stay
exactly as it behaves today; TEA should write a regression test for it, not
just the forward case.

**A DECISION THE STORY CALLS "one line" BUT WHICH HAS TWO ANSWERS, ONLY ONE
CORRECT — TEA settles it, I am naming it, not prescribing it.** `stopChannel`
opens with an early return:

```
206  function stopChannel(channel: string): void {
207    const prev = live.get(channel)
208    if (!prev) return          <-- the fork
209    live.delete(channel)
```

`releaseVoice()` can go ABOVE that guard or BELOW it, and the two are not
equivalent. An arbitrated cue's window deliberately OUTLIVES its sample —
that is what `frameDurations` is for — and when the sample ends naturally,
`onended` (`:263-266`) deletes the channel's `live` entry while `voiceFrames`
keeps counting. So there is a real state in which the voice holds a window
and `live.get(channel)` is already empty. Release ABOVE the guard and an
unarbitrated trigger on that channel cuts the window short having stopped
nothing audible — a new defect, in the opposite direction, invisible to any
test that only plays the two cues while the first is still sounding. Release
BELOW the guard and the window survives, which is the behaviour I read as
correct. **I have not measured this; it is a claim.** TEA should decide it
deliberately and pin the losing placement as a mutant, because a battery
built only from the story's own scenario cannot tell the two apart.

**Third caller, easy to miss when reasoning about "both paths":**
`stopChannel` has THREE call sites, not two — `:250` (steal own channel),
`:254` (an arbitrated cue stealing the voice's OTHER channel), and `:297`
(inside `stopLoop`, which then releases again at `:300`). Putting the release
inside `stopChannel` makes `:300` redundant and makes `:254` release-then-
immediately-reclaim. Both look benign to me and neither is verified. Note
`:254`'s reclaim only happens if the source actually starts — the claim at
`:273-276` sits inside the `try` — so a throw there would now leave the voice
released where today it stays held. Whether that is a regression or an
improvement is a judgement call the engine's own comment at `:269-272`
("a sound that never sounded must not hold a window") appears to answer, but
TEA should make it explicitly rather than inherit it.

**Verification baselines, measured fresh at setup (do not carry forward
older figures — shared code changed today):**
- `npx vitest run` (FULL suite; this story's blast radius is `src/shared`,
  so `--project joust` alone does not verify it): 755 files / 11654 tests
  passed, 1 todo.
- `npx vitest run --project joust`: 105 files / 2533 tests passed
  (unchanged from the last-known figure).
- `npm run lint`: clean.
- `npm run test:orchestrator`: 390/390.

**Branch:** none. Trunk-based; work lands on `main`.

## Tea Assessment

**Tests Required:** Yes
**Status:** RED — 4 failing, 7 passing, ready for Dev.

**Test Files:**
- `src/shared/tests/audio-voice-release.test.ts` — NEW. 11 tests over the four
  routes into `stopChannel`. Follows this directory's idiom (its own fake
  WebAudio surface, so no other audio suite can break it), plus one capability
  none of the others has: `sourceThrowsOnCall`, which makes the Nth
  `createBufferSource()` throw so the `:256` try-block's failure path is
  reachable without a browser.

**Tests Written:** 11 tests covering 5 ACs (defined here — the sprint YAML had none).

- **AC-1** An unarbitrated cue that SILENCES the arbitrated voice releases its
  window, on every route into `startSource` (`play` and `startLoop`).
- **AC-2** An unarbitrated cue that silences NOTHING — a different channel, or
  the same channel after the sample already ended — leaves the window alone.
- **AC-3** The voice's `voiceChannel` is released too, so a later arbitrated cue
  does not reach across at `:253-255` to a channel the voice no longer owns.
- **AC-4** The reverse case is unchanged: an arbitrated cue still steals a
  sounding unarbitrated cue's channel, same-channel and cross-channel both, and
  still claims its own window afterwards.
- **AC-5** `stopLoop`'s own release at `:300` survives, and a manifest with no
  `priorities` cannot tell this story shipped.

**RED set (4 — these are the defect):**
1. `an unarbitrated cue that silences the arbitrated voice releases its window`
2. `the same steal through startLoop() releases it too`
3. `a released voice no longer reaches across to a channel it lost`
4. `an arbitrated cue whose source fails to build releases the voice it silenced`

**GREEN set (7 — each names the wrong fix it kills; none is decoration):**
`an arbitrated window survives an unarbitrated cue that stopped nothing` (M2, M5) ·
`an unarbitrated cue on ANOTHER channel does not release the voice` (M4) ·
`an arbitrated cue re-taking its own channel still holds the voice` (release-and-forget-to-reclaim) ·
`an arbitrated cue still steals the channel of a sounding unarbitrated cue` ·
`an arbitrated cue still reaches across channels to stop the voice (:253-255)` (the POSITIVE CONTROL for #3 above) ·
`stopLoop still frees a window whose sample already ended` (M3) ·
`unconditional channel stealing and the clock both still behave`.

### The fix Dev should write

Inside `stopChannel`, **BELOW** the `if (!prev) return` early return:

```
    const prev = live.get(channel)
    if (!prev) return
    live.delete(channel)
    if (voiceChannel === channel) releaseVoice()
```

Do **not** delete `stopLoop`'s `:300`. Do not put it at the `:250` call site.
Both are proven wrong below.

### Mutation battery — 6 mutants, every one killed

Driver: `scratchpad/mutate.py`. Each mutant was applied from a byte-identical
snapshot of `src/shared/audio.ts` (sha `a5b7b79d…`), `git diff`'d to PROVE the
replacement landed before any verdict was believed, run alone and sequentially,
then restored from the snapshot (never `git checkout --`). Verbatim insertions:

| id | mutation (exact text) | killed by | tests failed |
|----|----------------------|-----------|--------------|
| **M1** | *the intended fix* — `    if (voiceChannel === channel) releaseVoice()` inserted AFTER `live.delete(channel)` | *(none — this is the target)* | **0 of 11** |
| **M2** | same line inserted BEFORE `if (!prev) return` — the ABOVE-the-guard placement | `an arbitrated window survives an unarbitrated cue that stopped nothing` | 1 |
| **M3** | M1, plus deleting `stopLoop`'s comment + `    if (voiceChannel === channel) releaseVoice()` at `:298-300` | `stopLoop still frees a window whose sample already ended` | 1 |
| **M4** | `    if (priority === undefined) releaseVoice()` inserted before the refusal test at `:232` — "release on every unarbitrated trigger" | `an unarbitrated cue on ANOTHER channel does not release the voice` (+2 more) | 3 |
| **M5** | `    if (voiceChannel === channel) releaseVoice()` inserted after `stopChannel(channel)` at the `:250` CALL SITE instead of inside `stopChannel` | `an arbitrated window survives…` and `an arbitrated cue whose source fails to build…` | 2 |
| **M6** | M1 with `releaseVoice()` replaced by `{ voicePriority = 0; voiceFrames = 0 }` — counters cleared, `voiceChannel` left stale | `a released voice no longer reaches across to a channel it lost` | 1 |

M2 and M5 are the ones that matter: both are plausible one-line readings of the
story, both turn all four RED tests green, and both introduce the opposite
defect. A battery built only from the filed repro cannot tell them from M1.

### Rulings

**C3 — the placement fork. RULING: BELOW the early return. MEASURED.**
An arbitrated window deliberately outlives its own sample: jt5-5's design note is
that the window is frames from the ROM table, "never in wall-clock, and never in
the length of a `.wav` we happen to have baked" (`audio-priority.test.ts:33-35`),
and `onended` at `:264-266` clears `live` while `voiceFrames` keeps counting. So
`live` empty + window held is a NORMAL state, and releasing above the guard lets a
cue that stopped nothing cut a live window short. M2 demonstrates it, M1 does not.
The SM's unmeasured belief was correct; it is now measured.

**C4 — the third caller. RULING: the `:254` reclaim is an IMPROVEMENT, and the
throw path is a SECOND LIVE ROUTE TO THE SAME DEFECT that the filing missed.**
The engine's comment at `:269-272` says a sound that never sounded must not hold a
window. Today, when an arbitrated cue stops the voice at `:254` and then throws at
`:257`, the voice's source is silenced and the OLD window survives in the `catch` —
exactly the audible-silence state that comment forbids, reached without any
unarbitrated cue at all. Releasing inside `stopChannel` fixes it. The
release-then-reclaim ordering is safe: `stopChannel(channel)` at `:250` nulls
`voiceChannel` in the same-channel case, so `:253`'s `voiceChannel !== channel`
test then skips a steal that had nothing left to steal; the cross-channel case is
unaffected. Pinned from both sides by `an arbitrated cue re-taking its own channel
still holds the voice` and `an arbitrated cue still reaches across channels to stop
the voice`.
**Corollary, against the SM's read:** `:300` is NOT made redundant. When the
arbitrated sample has already ended, `stopChannel` correctly releases nothing while
`stopLoop`'s explicit "silence this channel" still means silence — M3 proves the
deletion regresses. The asymmetry (`stopLoop` releases unconditionally, `play` only
when it silenced something) is deliberate and is shipped jt5-5 behaviour: not a
defect, so nothing is filed.

**C1 — severity of the two centipede overlaps. RULING: SM half right.**
- `alert` (arbitrated `playerDeath` rank 1 / 76 frames vs unarbitrated
  `headBottom`, `waveClear`): **mechanism confirmed harmful.** A stale rank-1
  window refuses all four rank-0 kill cues for the rest of the window while
  nothing is audible. Reproduced generically as the `MIXED` manifest.
- `impact` (four kills rank 0 / 19 frames vs unarbitrated `mushroom`):
  **benign on the refusal axis, NOT benign overall.** The refusal reasoning is
  correct — refusal is strictly-lower and nothing ranks below 0 — but it is not
  the only consequence. The stale `voiceChannel` makes the next accepted
  arbitrated cue stop an unrelated live source on `impact` via `:253-255`.
  Reproduced as the `IMPACT` manifest (`kill` → `mush` → `death`, and `mush` is
  stopped). This axis is invisible to every refusal assertion: M6 passes all of
  them and fails only this one. **Do not report `impact` as benign.**

**C2 — reachability in real gameplay. RULING: NOT REACHABLE today, for both
`alert` cues. Measured, with the guard named.**
- `plugins/centipede/src/core/sim.ts:1042` — `if (state.delay > 0) return
  stepDeathFrame(state)`. `stepDeathFrame` (`:770-946`) never calls
  `stepCentipede`/`stepSpider`/`stepFlea`/`stepScorp`/`stepShot`/`movePlayer` and
  takes no `input`: the world is frozen for the whole pause, and both
  `head-reached-bottom` (`:681`) and `wave-cleared` (`:741`) live inside
  `stepPlayingFrame`.
- `DEATH_DELAY = 0x30` = 48 frames (`sim.ts:78`) is a hard FLOOR — the countdown
  is held while the RESTOR sweep runs (`:801-802`), so a real pause is longer.
- The respawn re-lay puts `newd: false` (`:889`) and every segment back to
  `v = 0xf8 = 248` (`:904`), and the only mutator of `v` moves at most 2/frame
  (`centipede.ts:292`). Earliest `head-reached-bottom` is therefore
  `F+49+120 = F+169` against a 76-frame window — margin over 2×. `wave-cleared`
  needs 12 kills at ~28 frames per shot ≈ 336 frames.
- `tick()` is exactly one per sim frame (`audio-dispatch.ts:63`, driven from
  `main.ts:203` inside the per-step callback), at `FRAME_HZ = 15750/263`, and it
  runs BEFORE the cue loop — so the window covers F+1…F+75, narrower than 76.
- The same-frame case is real and HARMLESS: `sim.ts:681` pushes `headBottom`
  and `:711` appends `playerDeath` after it, so the death steals `alert` and
  claims the voice — the correct direction.
- **Positive control on this "no kill cue sounds" verdict:** the claim is not a
  zero-count sweep. It rests on named guards plus arithmetic, and the engine-side
  test `an arbitrated cue still reaches across channels to stop the voice
  (:253-255)` proves the mechanism the other assertions deny CAN be observed in
  this harness at all.
- **Consequence: no centipede file changes and no centipede story is filed.**
  There is no live centipede defect to descope — jt9-6's engine fix closes the
  trap for all seven cabinets at once. The overlap is latent, and it stays
  latent only while `sim.ts:1042` holds.

### Verification

Measured this phase, sequentially, one runner at a time:
- `npx vitest run --project shared tests/audio-voice-release.test.ts`:
  **4 failed | 7 passed (11)** — the RED state, re-confirmed after the battery
  with the engine byte-identical to the snapshot.
- `npx vitest run` (FULL, with mutant M1 applied — the blast-radius answer):
  **756 files / 11665 tests passed | 1 todo**. Setup baseline was 755 / 11654 + 1
  todo; the deltas are exactly this story's one file and eleven tests. The fix
  regresses nothing in any of the seven games, the lobby, the host or the shared
  library. M1 was then reverted from the snapshot — no implementation is committed.
- `npm run lint`: clean.
- `npm run test:orchestrator`: **390/390**.
- `git status` after the battery: only the new test file is untracked;
  `src/shared/audio.ts` sha matches the snapshot (`a5b7b79d…`).

**Handoff:** To Dev for GREEN. One line, below the guard, and leave `:300` alone.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/shared/audio.ts` — `stopChannel` (`:206-224`) now releases the arbitrated
  voice (`if (voiceChannel === channel) releaseVoice()`) immediately after
  `live.delete(channel)`, BELOW the `if (!prev) return` early return, before the
  `try { prev.stop(); prev.disconnect() }` block. `releaseVoice()` (`:132-136`,
  pre-existing helper) clears `voicePriority`, `voiceFrames` AND `voiceChannel`
  together, closing both the stale-window/refusal axis and the stale-
  `voiceChannel`/cross-channel-steal axis in one call. `stopLoop`'s own release
  at (now) `:308` is unchanged. Added a comment at the fix site recording WHY
  the release must sit below the guard (an arbitrated window legitimately
  outlives its sample; `onended` can already have cleared `live` while the
  window still holds, and releasing above the guard would let a cue that
  stopped nothing cut that window short) — that reasoning is invisible from the
  code alone and TEA's assessment names this exact placement as the trap most
  likely to get "simplified" back to the wrong answer.

**Design Deviations:** None. Implemented exactly the fix TEA's assessment
specified — same call (`releaseVoice()`), same guard clause
(`voiceChannel === channel`), same position relative to `if (!prev) return`
(below) — and left `stopLoop`'s `:300`-era release untouched per TEA's C4
ruling.

**Delivery Findings:** None from this phase. All findings raised during RED
(TEA's Gap ×2, Question, Improvement — see `## Delivery Findings` above) were
already resolved by TEA's own measurement: the two Gaps are closed by this same
fix (no separate action), the Question is answered (no centipede file changes,
no centipede story needed — the overlap is latent and closes fleet-wide from
this one engine fix), and the Improvement (`stopLoop`'s `:300` is not
redundant) was honored by not touching it. Nothing new surfaced during
implementation.

**Independent verification, beyond re-running TEA's battery:**
- Snapshotted the fixed file (`sha256 cae77a5e…`), then mutated it in place to
  move the identical `if (voiceChannel === channel) releaseVoice()` line ABOVE
  the `if (!prev) return` guard (TEA's M2 shape, constructed independently
  rather than copy-pasted from the assessment) — `diff` against the snapshot
  confirmed the mutation actually landed before trusting any result.
- Ran `npx vitest run --project shared src/shared/tests/audio-voice-release.test.ts`
  against the mutant: **1 of 11 failed** — exactly
  `an arbitrated window survives an unarbitrated cue that stopped nothing`,
  matching TEA's recorded M2 result precisely (1 test, same name).
- Restored the file from the snapshot (never `git checkout --`, per the
  harness-trap warning), re-diffed against the snapshot to confirm a byte-exact
  restore, and re-ran the target file: 11/11 passing again.
- Ran test runners strictly sequentially throughout; all shell variables/paths
  quoted; read full output on every run rather than trusting exit codes.

**Tests:** 11/11 passing in `src/shared/tests/audio-voice-release.test.ts`.

**Full-suite verification (this phase, sequential):**
- `npx vitest run` (full suite, fix in place): **756 files / 11665 tests
  passed | 1 todo (11666 total)**. Matches TEA's measured target exactly —
  deltas from the setup baseline (755/11654+1 todo) are exactly this story's
  one new test file and its 11 tests; nothing else regressed across any of the
  seven games, the lobby, the host or the shared library.
- `npm run lint` (`tsc --noEmit`, repo-wide): clean.
- `npm run test:orchestrator`: **390/390** passed.
- `git status --porcelain`: only `src/shared/audio.ts` modified — no test file,
  no centipede file, no epic/sprint YAML touched.

**Branch:** none (trunk-based; committing straight to `main` per
`.pennyfarthing/repos.yaml`).

**Handoff:** To Reviewer (SM dispatches).

## Subagent Results

Eight of the nine reviewer specialists are `false` in `.pennyfarthing/config.local.yaml`
(`reviewer_subagents:` — silent_failure_hunter, test_analyzer, comment_analyzer,
type_design, security, simplifier, edge_hunter, rule_checker). Their work was done
in-thread by a 14-mutant battery plus a standalone non-equivalence probe, which is
what actually finds things on this epic.

| Subagent | Status | Result |
|----------|--------|--------|
| reviewer-preflight | run in-thread | Full `npx vitest run` **756 files / 11665 passed \| 1 todo (11666)**; `npm run lint` clean; `npm run test:orchestrator` **390/390**. All three match the story's targets exactly. |
| reviewer-edge-hunter | disabled (config) | Replaced by mutants R1–R14 + the `pending`/`onended`/`undefined-channel` probes. 3 survivors. |
| reviewer-test-analyzer | disabled (config) | Replaced by R14/R2/R12: `an unarbitrated cue on ANOTHER channel does not release the voice` is weaker than its name (its "other channel" is always idle). Filed jt9-35. |
| reviewer-silent-failure-hunter | disabled (config) | Reviewed by hand: the release sits ABOVE `try { prev.stop() }`, so a throwing `stop()` cannot strand a held window. R6 proves the ordering is equivalent either way. |
| reviewer-comment-analyzer | disabled (config) | The new 12-line comment at `audio.ts:210-221` was re-read against measurement: every claim in it is true and matches R1/R11/R13. TEA's `sim.ts:904` citation is one hop loose — logged as a Delivery Finding. |
| reviewer-type-design | disabled (config) | `voiceChannel: string \| null` can hold `undefined` at runtime from a missing `channels` entry; measured harmless, routed to jt9-7. |
| reviewer-security | disabled (config) | N/A — no I/O, auth, or untrusted input in the diff. |
| reviewer-simplifier | disabled (config) | The inverse: the diff's risk is that it is TOO simple to simplify further. R14/R2 are exactly those simplifications and both ship green. |
| reviewer-rule-checker | disabled (config) | Checked by hand against CLAUDE.md: shared code, blast radius verified with the FULL suite (not `--project joust`); no centipede/cp6-3 file touched. |

All received: Yes

## Reviewer Assessment

**Verdict:** APPROVED

The one-line fix is **correct**, correctly placed, and correctly documented. TEA's
placement ruling (BELOW the early return) is re-confirmed from two directions I built
independently. What the battery found is not a defect in the code — it is that the
half of the guard that keeps the fix from destroying arbitration is pinned by nothing
in the repo. That is a test gap on shipped-correct code, so it is **filed (jt9-35)**,
not rejected.

### Novel mutation battery — 14 mutants, none of them TEA's M1–M6 or Dev's M2

Driver `scratchpad/reviewer-battery.py`. Every mutant was applied from a byte-identical
snapshot of `src/shared/audio.ts` (sha256 `cae77a5e95c7…`, the same file Dev shipped),
the anchor asserted to match **exactly once**, a unified diff **printed as proof the
replacement landed** before any verdict was believed, one runner at a time, then
restored from the snapshot — never `git checkout --` — with the sha re-verified after
every single mutant. Final restore sha `cae77a5e95c7…`, byte-exact.

Baseline for every row: `--project shared` = 554 tests; `ALL` = 11666.

| id | mutation (VERBATIM — re-run the string, do not reconstruct it) | verdict | reddens |
|----|----------------------------------------------------------------|---------|---------|
| **R1** | delete the line `    if (voiceChannel === channel) releaseVoice()` | KILLED 4 | all four RED tests. **Ran against ALL 11666: still exactly 4, all in the new file.** |
| **R2** | `    if (voiceChannel === channel && voiceFrames > 0) releaseVoice()` | **SURVIVED** | nothing — 554/554, and **11665 passed \| 1 todo on the FULL suite** |
| **R3** | `    if (voiceChannel === channel && voicePriority > 0) releaseVoice()` | KILLED 1 | `a released voice no longer reaches across to a channel it lost` |
| **R4** | `    if (voiceChannel === channel) voiceChannel = null` | KILLED 4 | the three window tests **plus** `stopping an arbitrated loop frees the window immediately` (`audio-priority.test.ts` — cross-file coverage exists) |
| **R5** | `    if (voiceChannel === channel) voiceFrames = 0` | KILLED 1 | `a released voice no longer reaches across to a channel it lost` |
| **R6** | the same line moved BELOW the `try { prev.stop(); prev.disconnect() } catch {…}` block | SURVIVED (equivalent — proven, see below) | — |
| **R7** | the same line moved ABOVE `    live.delete(channel)`, still below `if (!prev) return` | SURVIVED (equivalent — proven) | — |
| **R8** | `    if (voiceChannel == channel) releaseVoice()` (loose equality) | SURVIVED (equivalent — proven) | — |
| **R9** | `    if (priority !== undefined && voiceChannel !== null && voiceChannel !== channel && voiceFrames > 0) {` | **SURVIVED** | nothing |
| **R10** | `stopLoop`'s release becomes `    if (voiceChannel === channel && voiceFrames > 0) releaseVoice()` | **SURVIVED** | nothing |
| **R11** | `    if (!prev) {` / `      if (voiceChannel === channel) releaseVoice()` / `      return` / `    }` — M2 by a second spelling | KILLED 1 | `an arbitrated window survives an unarbitrated cue that stopped nothing` |
| **R12** | `      if (voiceChannel === channel) releaseVoice()` inserted above `      pending.set(channel, name)` | **SURVIVED** | nothing |
| **R13** | `onended` becomes `if (live.get(channel) === source) { live.delete(channel); if (voiceChannel === channel) releaseVoice() }` | KILLED 1 | `an arbitrated window survives an unarbitrated cue that stopped nothing` |
| **R14** | `    releaseVoice()` — the guard condition deleted, the call kept | **SURVIVED** | nothing — 554/554, and **11665 passed \| 1 todo on the FULL suite** |

### The survivors are not equivalent — measured, not argued

A survivor proves nothing until you show the mutant actually behaves differently.
`scratchpad/probe.mjs` imports the REAL `src/shared/audio.ts` on a fake WebAudio
surface and writes nothing to the repo. Run against HEAD, then R14, then R2:

- **R14.** Manifest `{loud: 80/76f ch v, n1 ch x, n2 ch x, quiet: 10/20f ch w}`;
  `play(loud) → play(n1) → play(n2) → play(quiet)`. **HEAD: 3 started sources.
  R14: 4.** Two *unarbitrated* cues on a channel the voice does **not** own destroy
  arbitration outright. Zero of 11666 tests notice.
- **R2.** Manifest `{zap: prio 5 with NO frameDurations entry ch v, plain
  unarbitrated ch v, boom: 9/30f ch w}`; `play(zap) → play(plain) → play(boom)`.
  **HEAD: `plain.stopped === false`. R2: `true`.** That is precisely the
  stale-`voiceChannel` cross-channel steal TEA's `a released voice no longer reaches
  across to a channel it lost` pins — but only for windows with frames left.
- **R6 / R7 / R8 are genuinely equivalent, and that is a result too.** R6/R7:
  nothing between `if (!prev) return` and the claim at `:286-290` reads voice state
  except `:266`, and `releaseVoice()` never reads `live`. R8: `voiceChannel === null`
  **implies** a fully-released voice (it is only ever `null` initially or straight
  out of `releaseVoice()`), so `null == undefined` can only re-release an already
  released voice. **That answers the "could `voiceChannel === undefined` match
  spuriously?" question: no.** A cue missing from `channels` makes `channel`
  `undefined`, `voiceChannel` becomes `undefined` (not `null`), and the engine then
  treats it as a coherent phantom channel key throughout. Routed to jt9-7.

### Why the existing suite misses R14 — the one vacuous-by-omission assertion

`an unarbitrated cue on ANOTHER channel does not release the voice` reads like the
guard's own condition. It is not. It runs on `MIXED`, where `noise` is the **only**
cue on channel `x`, so `stopChannel('x')` always hits `if (!prev) return` and an
unconditional release never executes at all. The test is real and it kills TEA's M4;
it simply cannot see a mutant that fires only when the *other* channel had something
live on it. None of the other ten tests puts two cues on one non-voice channel.

**And this one is live, not latent.** `plugins/centipede/src/shell/audio.ts`:
`spider-killed → spiderKill`, arbitrated on channel `impact` for 19 frames
(`:106`, `:123`, `PRIORITIES`/`FRAME_DURATIONS` at `:209-218`); the *same* kill also
takes the `spider-stop` edge → `stopLoop('spiderLoop')` on channel `voice-spider`
(`:133-134`), appended at `stepSim`'s single exit **after** the one-shots
(`plugins/centipede/src/core/sim.ts:683-687`). Under R14 that `stopLoop` frees the
kill's own window instantly, in a shipped cabinet, with every test green.

### Is the guard scenery? — answered plainly

**Its entire observable footprint across 756 files and 11666 tests is the 4 RED tests
in `src/shared/tests/audio-voice-release.test.ts`.** R1 (the null mutant) reddens
those four and nothing else. joust's 105 files see nothing; centipede's
`tests/voice0-contention.test.ts` sees nothing. That is not a defect — the new file
*is* the guard's coverage, and it is genuine coverage (R1, R3, R4, R5, R11, R13 all
die there). But it means every future regression of this fix has exactly one file
standing between it and production, and jt9-35 exists because half the guard is not
even in that file.

### Claims I was told to re-measure rather than inherit

- **TEA's refutation of the SM's "`impact` is benign" — CONFIRMED, independently.**
  I did not re-run M6. R3 (`&& voicePriority > 0`, a restrictor nobody had tried)
  reddens *exactly* `a released voice no longer reaches across to a channel it lost`
  and nothing else. A rank-0 arbitrated voice really does need releasing, and the
  damage really is on the cross-channel-steal axis, not the refusal axis. **Do not
  report `impact` as benign.**
- **TEA's ruling that `stopLoop`'s release is NOT redundant — CONFIRMED, and
  strengthened.** R4 (a partial release inside `stopChannel`) reddens
  `stopping an arbitrated loop frees the window immediately` in
  `audio-priority.test.ts` — so the `stopLoop` axis has jt5-5-era cross-file
  coverage too, not just this story's `stopLoop still frees a window whose sample
  already ended`. Caveat now filed as jt9-35: a *restrictor* on that same line
  (R10) still survives.
- **TEA's centipede reachability ruling (C2) — CONFIRMED. Five citations re-opened,
  four exact, one loose.** `sim.ts:1042` = `if (state.delay > 0) return
  stepDeathFrame(state)` ✓ exact. `sim.ts:889` = `newd: false, // CT-90: CENTPC
  clears NEWD on every re-lay` ✓ exact, and it is the respawn branch, not the
  wave branch at `:941`. `sim.ts:78` `DEATH_DELAY = 0x30` ✓. `sim.ts:681`
  `head-reached-bottom` ✓, `sim.ts:741` `wave-cleared` ✓. **`sim.ts:904` is one hop
  indirect** — that line is `segs: createCentipede(...)`; `v = 0xf8` lives at
  `centipede.ts:64` (`CENT_ENTER_V`) and is applied at `centipede.ts:230`/`:237`/
  `:257`. Substance holds. The arithmetic also holds with margin to spare: 248→8 is
  240 v-units, `descend` (`centipede.ts:289-296`) moves `dv` per frame, so even at
  `centis = 4` that is 60 + 49 = 109 frames against a 76-frame window. Ruling stands:
  no centipede story is owed on reachability.

### Mandatory review steps

- **Data flow traced.** `manifest.channels[name]` → `channel` (`:238`) → `stopChannel`
  → `live.get/delete` → the new `voiceChannel === channel` compare → `releaseVoice()`
  → read back at `:245` (refusal) and `:266` (cross-channel steal) → re-claimed at
  `:286-290`. Safe because the only reader between the release and the claim is
  `:266`, and the release can only flip `voiceChannel` to `null` there, which turns
  the steal OFF — a steal that had nothing left to steal.
- **Wiring.** The engine is reached by all seven games through `createAudioEngine`;
  only joust and centipede pass `priorities`, and both were verified by the full run.
- **Error handling.** The release sits above `try { prev.stop() }`, so a `stop()`
  that throws on an already-ended node still leaves the voice released and `live`
  cleared — consistent with the pre-existing `live.delete(channel)` on the same side
  of the try. R6 shows either side of the try behaves identically.
- **Null/undefined inputs.** Covered by R8 above; `undefined` channels are coherent.
- **Race.** `onended` cannot double-release (R13 shows the suite would catch a
  release added there) and cannot re-clear a channel it no longer owns (the
  `live.get(channel) === source` identity check at `:278`).
- **Security.** N/A — no I/O, no auth, no untrusted input.
- **Pattern.** `src/shared/audio.ts:210-221`: a 12-line comment justifying a
  one-line guard, naming the losing placement. Good pattern, and R11/R13 confirm
  every claim it makes is measured rather than asserted.
- **Parallel-checkout race check:** `git fetch origin` → `origin/main` == `HEAD`,
  0 ahead / 0 behind, no sibling jt9-6 commits. `cp6-3` untouched upstream.
- **Scope fence honoured:** no centipede file, no `sprint/epic-cp6.yaml`, no cp6-3
  artefact modified. Only `src/shared/audio.ts` (Dev's, unmodified by me),
  `sprint/epic-jt9.yaml` (status + the new jt9-35) and this session file.

### Deviation audit

- TEA, "Test count and reach: 11 tests over four routes rather than the filed one" —
  **ACCEPTED.** Justified by measurement: R1 alone shows the filed repro's route is
  one of four, and R11/R13 show two of the extra tests carry their own weight.
- TEA, "No acceptance criteria existed in the sprint YAML; defined AC-1..AC-5 at RED"
  — **ACCEPTED.** All five are met. Note for the record that AC-2's "an unarbitrated
  cue that silences NOTHING" is satisfied as written; the case jt9-35 adds is an
  unarbitrated cue that silences SOMETHING ELSE, which no AC covered.
- Dev, "Design Deviations: None" — **ACCEPTED, verified.** The shipped line is
  character-for-character the line TEA specified, in the specified position, and
  `stopLoop`'s release is untouched.
- **UNDOCUMENTED:** none found.

### Findings

| Severity | Issue | Location | Disposition |
|----------|-------|----------|-------------|
| [MEDIUM] | The guard's `voiceChannel === channel` condition is pinned by nothing in the repo; a bare `releaseVoice()` is green on all 11666 and destroys arbitration (live in centipede) | `src/shared/audio.ts:222` | **Filed jt9-35** (p2, 2pts, epic jt9) |
| [MEDIUM] | The zero-length arbitrated window is untested; `&& voiceFrames > 0` survives at three separate sites | `audio.ts:222`, `:266`, `:313` | **Filed jt9-35** |
| [LOW] | The `pending` park path can be given a wrong-place release with no test noticing (R12) | `audio.ts:257` | **Filed jt9-35** (item 4) |
| [LOW] | TEA's `sim.ts:904` citation is one hop from the value it quotes | session file, TEA C2 | Corrected in Delivery Findings above; ruling unaffected |
| [INFO] | `voiceChannel` can hold `undefined` at runtime despite its `string \| null` type | `audio.ts:128`, `:289` | Measured harmless; routed to **jt9-7** (which must not delete joust's `CHANNELS` without it) |

No Critical and no High. Nothing blocks.

### Verification (mine, sequential, one runner at a time)

- `npx vitest run` (FULL): **756 files / 11665 passed | 1 todo (11666)** — the story's
  target, reproduced from a clean tree before any mutation.
- `npm run lint` (`tsc --noEmit`, repo-wide): **clean**.
- `npm run test:orchestrator`: **390/390**.
- Post-battery: `src/shared/audio.ts` sha256 `cae77a5e95c7…`, byte-identical to the
  committed file; `git status --porcelain` shows no stray probe or test file.

**Handoff:** To SM for finish. jt9-35 is filed and in backlog.