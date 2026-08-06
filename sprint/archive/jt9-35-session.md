---
story_id: "jt9-35"
jira_key: "jt9-35"
epic: "jt9"
workflow: "tdd"
---
# Story jt9-35: The stopChannel voice release ships with its channel condition unpinned — an unconditional releaseVoice() leaves all 11666 tests green

## Story Details
- **ID:** jt9-35
- **Jira Key:** jt9-35
- **Repos:** arcade
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** none (trunk-based strategy — work on main)
- **PR:** none
- **Points:** 2
- **Type:** bug
- **Priority:** p2

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-06T03:08:38Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-06T00:37:16Z | 2026-08-06T00:41:21Z | 4m 5s |
| red | 2026-08-06T00:41:21Z | 2026-08-06T00:48:57Z | 7m 36s |
| green | 2026-08-06T00:48:57Z | 2026-08-06T03:01:25Z | 2h 12m |
| review | 2026-08-06T03:01:25Z | 2026-08-06T03:08:38Z | 7m 13s |
| finish | 2026-08-06T03:08:38Z | - | - |

## Background

Reviewer battery on jt9-6: 14 novel mutants, none of them in TEA's M1-M6 or Dev's M2 re-run. jt9-6's fix — `if (voiceChannel === channel) releaseVoice()` at src/shared/audio.ts:222, below stopChannel's early return — is CORRECT and shipped. What nothing pins is its GUARD CONDITION. Three survivors, each proven NON-EQUIVALENT by a standalone probe importing the real module, each leaving the FULL suite (756 files / 11665 passed | 1 todo) completely green.

(1) THE BIG ONE, and it is LIVE, not latent: replace that whole line with a bare `    releaseVoice()` (verbatim, four leading spaces, anchored by the `    try {` on the next line) -> 0 of 11666 tests fail. Probe: manifest {loud prio 80/76f ch v, n1 unarbitrated ch x, n2 unarbitrated ch x, quiet prio 10/20f ch w}; play(loud), play(n1), play(n2), play(quiet) -> 3 started sources with the shipped fix, 4 with the mutant. Two unarbitrated cues on a channel the voice does NOT own destroy arbitration. Why the existing guard misses it: `an unarbitrated cue on ANOTHER channel does not release the voice` runs on MIXED, where `noise` is the ONLY cue on channel `x`, so stopChannel(x) always hits `if (!prev) return` and an unconditional release never executes — the test name promises a stronger guarantee than the test delivers.

REACHABLE IN CENTIPEDE TODAY: `spider-killed` maps to `spiderKill`, arbitrated on channel `impact` for 19 frames (plugins/centipede/src/shell/audio.ts:109,136 and PRIORITIES/FRAME_DURATIONS at :242-248), and the same kill also takes the `spider-stop` edge -> `stopLoop(spiderLoop)` on channel `voice-spider` (:147), appended at stepSim's single exit AFTER the one-shots (plugins/centipede/src/core/sim.ts:563). Under the mutant that stopLoop frees the kill's window instantly, with every test green.

(2)+(3) THE ZERO-LENGTH WINDOW, latent: `    if (voiceChannel === channel && voiceFrames > 0) releaseVoice()` at the same site; the same `&& voiceFrames > 0` added to stopLoop's own release; and `&& voiceFrames > 0` added to the cross-channel steal condition at :266 — all three survive 11666 tests. Probe: {zap prio 5 with NO frameDurations entry ch v, plain unarbitrated ch v, boom prio 9/30f ch w}; play(zap), play(plain), play(boom) -> plain.stopped is false with the fix and true with the restrictor. That is the SAME stale-voiceChannel cross-channel steal `a released voice no longer reaches across to a channel it lost` pins, but that test only covers NONZERO windows. voiceFrames === 0 with voiceChannel set is reachable only from a priority whose frameDurations entry is missing or zero, and tick() can never clear it because it only acts while > 0, so only stopChannel/stopLoop can. Neither shipped cabinet has such a cue today (joust framesFor throws on frames <= 0, plugins/joust/src/shell/audio-manifest.ts:593-608; centipede windowFrames yields 76/19) — the same latent shape jt9-6 itself had before cp6-3 made it live.

(4) Adjacent and also unpinned: inserting `      if (voiceChannel === channel) releaseVoice()` immediately above `      pending.set(channel, name)` — a parked loop that never sounded frees the window — survives all 11666.

**Scope:** add engine tests to src/shared/tests/audio-voice-release.test.ts that kill the bare-releaseVoice mutant (an unarbitrated cue silencing something on a channel the voice does NOT own must leave the window alone) and the voiceFrames restrictor (an arbitrated cue with no frameDurations entry still owns its channel until something silences it). Re-run the verbatim strings above rather than reconstructing intent. Filed by Reviewer on jt9-6.

**CITATIONS RE-MEASURED 2026-08-03 by the Architect grooming pass**, and every line anchor in the CENTIPEDE half of this story had drifted — by up to 33 lines, which is the failure that does not dangle but silently points at the WRONG REAL CODE. cp6-3 edited plugins/centipede/src/shell/audio.ts the same day (comment-only, but it moved the file) and the anchors predate it besides. THE MECHANISM IS UNCHANGED AND THE FINDING STANDS, re-verified symbol by symbol: spiderKill is still arbitrated on channel `impact`, spiderLoop still sits on `voice-spider`, and the same kill still takes both edges.

**Anchors re-verified clean at setup 2026-08-06 (SM).**

## Acceptance Criteria

This story has no explicit acceptance_criteria defined in the epic YAML. Scope is drawn from the description:

1. Add engine tests to src/shared/tests/audio-voice-release.test.ts that kill the bare-releaseVoice mutant — an unarbitrated cue silencing something on a channel the voice does NOT own must leave the window alone. Re-run the verbatim mutant string: `    releaseVoice()` with four leading spaces, anchored by `    try {` on the next line.

2. Add tests that kill the voiceFrames restrictor mutant — an arbitrated cue with no frameDurations entry still owns its channel until something silences it. Re-run the verbatim mutant strings: `    if (voiceChannel === channel && voiceFrames > 0) releaseVoice()` at src/shared/audio.ts:222, the same `&& voiceFrames > 0` added to stopLoop's own release, and `&& voiceFrames > 0` added to the cross-channel steal condition at :266.

3. Tests must import the real src/shared/audio.ts module and exercise the exact paths identified in the scope.

4. The full suite (11666 tests) must turn RED on each mutant and GREEN with the shipped fix in place.

## Delivery Findings

**GREEN (Dev) — jt9-35 confirm-green, no implementation.** The jt9-6 fix is already on `main`; the
4 new tests pass against it (shared project 558/558; the 4 jt9-35 tests green; `npm run lint` clean).
`src/shared/audio.ts` untouched. My only change is the committed test file (`383187b4`, additive to
`src/shared/tests/audio-voice-release.test.ts`).

**PRE-EXISTING RED ON MAIN — NOT jt9-35 (mc1 / missile-command landing).** The full cabinet-wide
suite (`npx vitest run`) shows **6 failing tests across 3 files**, all from the eighth cabinet
(`missile-command`, epic mc1) that a sibling checkout (a-3) landed on `main` via mc1-1 (`f1454ea5`)
and mc1-2 (`881ef907`, completed `0ea1fbe9`). Both stories are marked `status: done`, yet main is red:
- `host/registry.test.ts` (4 failed) — the test-side `MANIFESTS` map and its counts ("seven
  manifests", "six games", "covers every plugins/ directory") were never updated for the 8th game;
  `Object.keys(MANIFESTS)` lacks `missile-command` while `dirNames()` (filesystem scan) has it. The
  committed `registry.ts` DOES list it in `GAMES` (added by mc1-1), so this is purely the test file
  not importing the new manifest.
- `lobby/tests/main.test.ts` (2 failed) — lobby tile-grid expectations ("one tile per LISTED
  registry game", listed order) not updated for the new game.
- `missile-command/tests/field.test.ts` (file errors on load) — `ENOENT` on
  `plugins/missile-command/reference/source/W3COMN.MAC`, a vendored ROM reference source absent from
  THIS checkout (likely gitignored like other games' reference trees; may pass in a-3's checkout/CI).

None of the six touch `src/shared/audio.ts` or the audio suite. Verified: my commit's diff is the
audio test file ALONE, and the registry/lobby/missile-command tests do not import shared audio. This
red predates and is independent of jt9-35. **Out of jt9-35's scope** — fixing it here would sweep
another epic's work into this story (minimalist-discipline violation). Flagged to the user for a
proper mc1 wiring fix / new bug story.

**Filed as `mc1-5`** (p1 bug, repos: arcade, tdd) per the user's ruling to proceed jt9-35 to review
and track the mc1 breakage separately. jt9-35 proceeds to review on its own merits; the Reviewer will
see the 6 mc1 reds in a full run — they are documented here and owned by mc1-5, not jt9-35.

## Design Deviations

No deviations recorded.

## Sm Assessment

**Setup complete — handing to TEA for RED.** 2pt TDD test-hardening story: the shipped jt9-6 guard
(`if (voiceChannel === channel) releaseVoice()`, src/shared/audio.ts:222) is correct and stays; the
job is to add engine tests that KILL three survivors currently leaving the full suite (11666) green.

**Contention cleared.** Sibling probes at setup: a-1 owns jt9-20, a-3 owns mc1-2 — neither touches
this file. `cp6-3` (voice-0-contention), which edits the same shared audio + centipede territory this
story cites, is **merged into main with no live session** — no live contention. No branch or session
for jt9-35 existed anywhere. Claim pushed: commit on `origin main` (epic stamp + context) plus empty
visibility branch `fix/jt9-35-pin-stopchannel-voice-release-guard`.

**Citations re-verified clean at setup (2026-08-05/06).** Every anchor in the description holds
against the current tree — no drift since the 2026-08-03 Architect pass, despite jt9-30 measuring the
drift rate for these refs in HOURS. Confirmed symbol-by-symbol: shared audio.ts:222 (guard) and :266
(cross-channel steal); centipede shell audio.ts :109 (`spiderKill:'impact'`), :136
(`spider-killed`→`spiderKill`), :147 (`spider-stop`→`spiderLoop`), :242-248 (PRIORITIES/FRAME_DURATIONS);
centipede core sim.ts:563 (spider-kill emit region). TEA can trust the Background anchors as current.

**ACs are DERIVED, not copied.** The epic YAML's `acceptance_criteria` is `null` (the jt8-6 shape), so
the four ACs in the Acceptance Criteria section were drawn from the description's explicit **Scope**
block — they are flagged as derived and match it faithfully. TEA: treat the description's SCOPE as the
binding spec.

**For TEA (RED):** the story says explicitly *"Re-run the verbatim strings above rather than
reconstructing intent."* Apply the EXACT mutant strings — the bare `    releaseVoice()` (four leading
spaces, anchored by `    try {`), and the `&& voiceFrames > 0` restrictors at the three release sites —
importing the real src/shared/audio.ts module. Each survivor must go RED; all are green today, which is
the defect. Mutant (4) (release above `pending.set`) is adjacent/unpinned but outside the stated SCOPE —
TEA's call whether to cover it, not required by the derived ACs.

## Tea Assessment

**RED complete — 4 mutation-catching tests added, each proven non-vacuous and targeted.**
Committed `68af8ccd` on `main`. This is a mutation-HARDENING story: the jt9-6 fix already
shipped and is correct, so the new tests PASS on the shipped code (15/15 in the file, 558/558
across the shared project, `npm run lint` clean). "RED" was demonstrated the only way it can be
for a hardening story — by applying each **verbatim** mutant string from the description one at a
time and watching exactly its test redden, then reverting. `src/shared/audio.ts` is clean
(untouched); only the test file changed.

**What I added** to `src/shared/tests/audio-voice-release.test.ts` — a `jt9-35` describe block +
three manifests (`FOREIGN`, `ZEROWIN`, `ZEROLOOP`). Each test carries premise assertions (the
mutant line was actually REACHED / the control cue actually started) so the discriminator can't
pass vacuously.

**RED proof — mutant applied verbatim → exactly its test fails (1 failed | 3 passed each run):**

| Mutant (verbatim, applied at the cited line) | Test that reddens | Observed |
|---|---|---|
| A: bare `    releaseVoice()` at :222 (drops the guard) | "an unarbitrated cue silencing a source on a channel the voice does NOT own leaves the window intact" | 4 sources start, not 3 |
| B: `    if (voiceChannel === channel && voiceFrames > 0) releaseVoice()` at :222 | "a zero-length arbitrated window is still released when its own channel is silenced" | stale voiceChannel → `boom` steals `plain` (`.stopped` true, want false) |
| C: `&& voiceFrames > 0` on the :266 cross-channel steal | "an accepted arbitrated cue steals a zero-length voice's channel — one voice, even at zero frames" | `zap` keeps sounding beside `boom` (`.stopped` false, want true) |
| D: `&& voiceFrames > 0` on stopLoop's :313 release | "stopLoop frees a zero-length arbitrated window whose sample already ended" | stale voiceChannel → `boom` steals `plain` (`.stopped` true, want false) |

Each mutant killed EXACTLY its own test — no cross-triggering — which confirms the four tests pin
four distinct guard properties, not one property four times. Mutant B/D both exploit a stale
`voiceChannel`, but via different release sites (`stopChannel` :222 vs `stopLoop` :313); D's scenario
ends the sample first (`onended`) so :222 is never reached and only :313 can free the window.

**Why the jt9-6 suite missed all four:** its `an unarbitrated cue on ANOTHER channel does not
release the voice` test uses `noise` as the ONLY cue on channel `x`, so `stopChannel(x)` always hits
`if (!prev) return` and the release line at :222 is never executed. FOREIGN puts two cues on the
foreign channel so the second one reaches the line. The zero-length-window class (voiceChannel set,
voiceFrames 0) was simply never constructed — it needs a priority with a missing `frameDurations`
entry, which no jt9-6 manifest had.

**Reachability confirmed live (not just synthetic):** the mutant-A shape is reachable in centipede
today per the description — `spider-killed`→`spiderKill` (arbitrated on `impact`) and the same kill's
`spider-stop`→`stopLoop(spiderLoop)` (`voice-spider`). Anchors re-verified at setup. The synthetic
manifests reproduce that shape in the SHARED suite so it does not depend on one game's numbers.

### Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`)
- **#26 (assertion terms all local to the test):** every discriminator reads `created.sources[i]
  .started/.stopped` — state driven by the code under test through the fake WebAudio surface, not
  values derived inside the test. No arithmetic-about-itself assertions.
- **#15 (source-text token match, not the claim):** N/A by design — these are behavioural tests
  observing the engine's effects, not source-text/citation assertions.
- **Vacuity self-check (TEA critical rule):** each test has ≥1 meaningful `expect` plus premise/control
  guards; proven non-vacuous by the mutant runs (each discriminator flips under its mutant). No
  `let _ =`, no `assert(true)`, no `as any` (engine cast is via the shared `mkLoadedEngine` helper).
- **#17 (mechanism nobody re-ran):** the RED table above IS the re-run — verbatim strings, observed
  results, reverted after.

**Scope note for Dev (GREEN):** there is NO implementation work. The fix (jt9-6) is already on
`main` and the tests are green against it — GREEN is a confirm-green, not a code change. Do not
modify `src/shared/audio.ts`. Mutant (4) (release above `pending.set`, :257) is adjacent/unpinned
but explicitly OUT of the story's SCOPE and not covered — left for a follow-up if the Reviewer wants
it, per the SM note above.
## Dev Assessment

**GREEN confirmed — no implementation, as designed.** jt9-35 is a mutation-hardening story; the
jt9-6 fix is already on `main`. Per TEA's note and the minimalist discipline, I made NO code change:
`src/shared/audio.ts` is untouched (`git status --short` empty). The 4 jt9-35 tests pass against the
shipped code, the shared project is 558/558, and `npm run lint` is clean.

**Full cabinet-wide suite is RED for unrelated reasons — see Delivery Findings.** `npx vitest run`
reports 6 failures across host/registry, lobby, and missile-command — all from the sibling `mc1`
(8th cabinet) landing, none touching shared audio. Diagnosed each precisely, proved none is jt9-35's,
filed as **mc1-5** (p1 bug) per the user's ruling. jt9-35 goes to review on its own merits.

**For the Reviewer:** the four new tests were mutation-proven in RED — each of the four verbatim
mutants (bare `releaseVoice()` at :222; `&& voiceFrames > 0` on the :222 release, the :266 steal, and
stopLoop's :313 release) reddens EXACTLY its own test and no other (see the Tea Assessment table).
When you run the full suite you WILL see the 6 mc1 reds; they are mc1-5, documented in Delivery
Findings, not regressions from this story. Restrict `-t "jt9-35"` or `--project shared` to see this
story's green in isolation.
## Reviewer Assessment

**Verdict: APPROVED** — no Critical/High/Medium findings. One LOW/informational note (a scoped-out
survivor). This is a test-only, mutation-hardening change to `src/shared/tests/audio-voice-release.test.ts`
(+156 lines, commit `383187b4`); `src/shared/audio.ts` is byte-identical before and after (verified
`git status` clean after the rule-checker's mutation probes; guards at :222/:266/:313 intact).

Observations (behavioural review of a mutation-hardening test set — the burden of test-quality review
fell on me directly because `test_analyzer` is DISABLED in `workflow.reviewer_subagents`; I compensated
with a full hand-trace of all four tests plus the rule-checker's empirical mutation re-run):

- [VERIFIED] Test A (:583) discriminator `startedSources(created).length === 3` reads engine-driven
  state (`FakeSource.started`, set inside `startSource()`), not test-local values. Premise
  `sources[2].started` (:589) proves n2's `stopChannel('x')` passed `if (!prev) return` and REACHED the
  :222 line — so the discriminator cannot pass vacuously. Reddens (→4) only under the bare-`releaseVoice()`
  mutant. Non-vacuous. Complies with typescript.md #26.
- [VERIFIED] Test B (:608) discriminator `sources[1].stopped` reads `FakeSource.stop()` called from
  `stopChannel()`. Isolates the :222 `&& voiceFrames > 0` restrictor via a zero-length window
  (`zap` has a priority, no `frameDurations` → voiceFrames 0, voiceChannel set) whose stale
  `voiceChannel` lets `boom` steal at :266. Traced: passes under mutants A/C/D, red only under B.
- [VERIFIED] Test C (:633) discriminator `sources[0].stopped` pins the one-voice invariant at
  voiceFrames 0 — an accepted `boom` must silence a zero-window `zap` via the :266 steal. Isolates the
  :266 `&& voiceFrames > 0` restrictor.
- [VERIFIED] Test D (:651) discriminator `sources[1].stopped` pins `stopLoop`'s OWN release (:313) via
  the already-ended-sample path (`onended()` clears `live`, so `stopChannel` finds nothing and :222
  never runs — only :313 can free the window). Isolates the :313 restrictor. Guarded by a
  `toBeTypeOf('function')` premise on `onended` (:654).
- [RULE] rule-checker: 0 violations across 27 TypeScript checks, and it INDEPENDENTLY re-ran the
  mutation battery — applied each of the four verbatim mutants to `audio.ts` one at a time, confirmed
  each reddens EXACTLY its named test with 14/15 otherwise green, restored the file. Confirms #15
  (every guard mutation-tested), #18 (no fails-by-passing), #23 (mutants re-runnable, red == blast
  radius), #26 (no all-local assertions). CONFIRMED — matches my hand-trace exactly.
- [SEC] security: clean — no secrets, no `as any`/`eval`, no unsafe global mutation (the AudioContext
  stub save/restore is the pre-existing `beforeEach`/`afterEach`, untouched). CONFIRMED.
- [VERIFIED] Preflight green: 15/15 in-file, 558/558 shared project, `npm run lint` clean. The 6
  cabinet-wide failures are the sibling mc1/missile-command landing (filed as mc1-5), NOT this story —
  none imports shared audio; jt9-35's only change is the audio test file.
- [LOW] Coverage gap, out of scope: mutant (4) — inserting `if (voiceChannel === channel) releaseVoice()`
  above `pending.set(channel, name)` (audio.ts:257) — is an unpinned survivor this story does NOT cover.
  It is explicitly labelled "Adjacent and also unpinned" in the description and is absent from the
  derived ACs (which name only the bare-release mutant and the voiceFrames restrictor). Legitimate
  follow-up candidate; not a defect in jt9-35. Recommend filing if the team wants the guard fully sealed.

### Rule Compliance (`.pennyfarthing/gates/lang-review/typescript.md`)
Exhaustively checked by rule-checker (27 checks, 39 instances, 0 violations) and cross-confirmed by my
trace. Key applicable checks:
- **#1 (type-safety escapes):** no `as any`/`@ts-ignore`/non-null added; `onended?.()` is guarded by a
  preceding `toBeTypeOf` assertion. Compliant.
- **#8 (test quality — `as any` in assertions / mock mismatches):** none; `created.sources[i]` types
  flow from the existing `Created`/`FakeSource` interfaces. Compliant.
- **#15 (mutation-test requirement) / #18 (fails-by-passing) / #23 (re-runnable mutants) / #26
  (all-local assertions):** all compliant — the four tests are textbook mutation-killers, each
  empirically red under exactly its mutant. Compliant.
- **#7 (async):** all four `it` callbacks are `async` and `await mkLoadedEngine(...)`. Compliant.

### Devil's Advocate
Arguing this is broken. First attack: index fragility. Every discriminator indexes `created.sources[0..2]`
by creation order; if a future engine change ever created a `BufferSourceNode` for a REFUSED cue, the
indices would silently shift and the assertions would test the wrong node. I checked `startSource()`:
the refusal at :245 returns BEFORE `ctx.createBufferSource()`, and the early-drop for undecoded buffers
returns too, so a refused/dropped cue never pushes a source — the ordering is deterministic for these
fixtures. Not broken, but the tests ARE coupled to that internal ordering; a note for future refactors.
Second attack: do the tests pin the SPEC or merely over-fit four mutants? A hardening story's spec IS
"kill these mutants," and the derived ACs say exactly that, so the fit is correct — except mutant (4),
which survives; a confused dev could add an unconditional release above `pending.set` and ship green.
That is the single strongest "it's broken" argument and I have recorded it as the LOW finding; it is a
deliberate, documented scope boundary, not an oversight. Third attack: liveness. The tests use synthetic
manifests (FOREIGN/ZEROWIN/ZEROLOOP), not centipede's real manifest, so they prove the shared-engine
invariant but not that centipede's `spider-killed`/`spider-stop` pair actually triggers it in play. That
is acceptable for the SHARED suite (a centipede-specific liveness test belongs to centipede), and the
reachability claim's anchors were re-verified at setup — but it means "reachable in centipede today" is
argued, not directly exercised here. Fourth attack: could `afterEach` fail to restore globals and leak
the fake AudioContext into another file? The restore is unconditional and pre-existing; each suite
carries its own stub. No leak. Conclusion: the code is sound; the only real gap is the scoped-out
mutant (4), already recorded.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (15/15, 558/558, lint clean; mc1 reds → mc1-5) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain reviewed by Reviewer directly (hand-trace of all 4 tests) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — citation anchors (:222/:266/:313) checked by Reviewer |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — type checks covered by rule-checker #1/#8 |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 27 checks | N/A (independently mutation-verified all 4 mutants) |

**All received:** Yes (3 enabled returned; 6 disabled via settings, pre-filled)
**Total findings:** 1 confirmed (LOW, out-of-scope survivor — informational), 0 dismissed, 0 deferred
## Impact Summary

**jt9-35 — mutation-hardening, test-only, no implementation.** The jt9-6 fix (stopChannel voice-release
guard, `if (voiceChannel === channel) releaseVoice()` at src/shared/audio.ts:222) is already on main and
correct. Four new tests added to src/shared/tests/audio-voice-release.test.ts (+156 lines, commit
`383187b4`) pin the guard CONDITION against four survivors that left the full suite green:
1. bare `releaseVoice()` at :222 — an unarbitrated cue silencing a source on a channel the voice does
   NOT own must leave the window intact (FOREIGN manifest).
2. `&& voiceFrames > 0` on the :222 release — a zero-length window (priority, no frameDurations entry)
   is still released when its own channel is silenced (ZEROWIN).
3. `&& voiceFrames > 0` on the :266 cross-channel steal — an accepted arbitrated cue steals a
   zero-length voice's channel; one voice, even at zero frames (ZEROWIN).
4. `&& voiceFrames > 0` on stopLoop's :313 release — stopLoop frees a zero-length window whose sample
   already ended (ZEROLOOP via the onended path).
Each mutant reddens EXACTLY its own test (independently mutation-verified by the Reviewer's rule-checker:
14/15 pass, 1 fail per mutant; cross-confirmed by SM/TEA hand-trace). Verified green: shared project
558/558, the 4 jt9-35 tests, `npm run lint` clean, src/shared/audio.ts byte-identical (untouched).

**Reviewer verdict: APPROVED** — no Critical/High/Medium. One LOW/non-blocking finding: mutant (4)
(release above `pending.set`, :257) is an unpinned survivor explicitly scoped out of jt9-35 — follow-up
candidate, not a defect.

**Cabinet-wide note:** the full `npx vitest run` shows 6 failures (host/registry, lobby,
missile-command) from the sibling mc1 (8th cabinet) landing — unrelated to jt9-35, filed as **mc1-5**
(p1 bug). jt9-35's own scope is fully green.
