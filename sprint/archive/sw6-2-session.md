---
story_id: "sw6-2"
jira_key: "sw6-2"
epic: "sw6"
workflow: "tdd"
---
# Story sw6-2: A music cue that arrives before its buffer decodes is lost forever — the first-ever visitor hears no space theme, because @arcade/shared/audio's startSource silently no-ops on an unloaded buffer

## Story Details
- **ID:** sw6-2
- **Jira Key:** sw6-2
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 3
- **Priority:** p1

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-19T07:33:51Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-19T06:50:56Z | 2026-07-19T06:53:23Z | 2m 27s |
| red | 2026-07-19T06:53:23Z | 2026-07-19T07:05:09Z | 11m 46s |
| green | 2026-07-19T07:05:09Z | 2026-07-19T07:14:38Z | 9m 29s |
| review | 2026-07-19T07:14:38Z | 2026-07-19T07:26:48Z | 12m 10s |
| red | 2026-07-19T07:26:48Z | 2026-07-19T07:31:01Z | 4m 13s |
| green | 2026-07-19T07:31:01Z | 2026-07-19T07:32:21Z | 1m 20s |
| review | 2026-07-19T07:32:21Z | 2026-07-19T07:33:51Z | 1m 30s |
| finish | 2026-07-19T07:33:51Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Improvement** (non-blocking): AC-7 fleet survey, pre-checked for Dev: the consumers of `@arcade/shared/audio` are star-wars, tempest, asteroids, battlezone and red-baron (lobby and centipede do not import it). star-wars is the only cabinet whose FIRST music cue rides the unlock gesture (`star-wars/src/main.ts` — the same keypress runs `audio.resume()` and the run-start MusicEvent); the others' loops (thrust, saucer sirens, pulsar hum) are gameplay-triggered but any loop requested in the pre-decode window is affected today and inherits the fix on their next re-pin.
  Affects `star-wars/package.json` (re-pin to the new arcade-shared tag with an explicit `npm install "@arcade/shared@github:slabgorb/arcade-shared#<tag>"` — a plain `npm install` after editing the ref keeps the OLD commit in the lockfile).
  *Found by TEA during test design.*
- **Improvement** (non-blocking): `ready()`'s name remains misleading — it returns true once ANY ONE sample decodes (`buffers.size > 0`), not when the engine is ready. This story leaves its semantics unchanged (see deviation 4); while in the file, Dev could sharpen its doc comment to say "true once at least one sample has decoded — NOT a gate for any specific sound".
  Affects `arcade-shared/src/audio.ts` (doc comment only).
  *Found by TEA during test design.*

### Dev (implementation)

- **Gap** (non-blocking): `music/finish_ground.wav` 404s on R2 — observed in BOTH instrumented browser runs today (control and fix), with a companion "Unable to decode audio data" console error. The `finishGround` tune shipped in star-wars code (sw7-18, `src/shell/audio.ts:106`) but its baked asset was never uploaded (or awaits upload from another checkout's in-flight work). It is a one-shot on the `tune` channel, so this story's pending-loop fix does not touch it — it silently never plays, the epic's original bug shape wearing a tune.
  Affects `arcade-assets.slabgorb.com/star-wars/music/finish_ground.wav` (upload the sw7-18 bake to the R2 bucket, or confirm the owning checkout's release is pending).
  *Found by Dev during implementation.*
- **Improvement** (non-blocking): star-wars' current pin is `v0.13.1`; the sw6-2 re-pin will land on a tag cut ABOVE `v0.16.0`, so three minor versions of arcade-shared changes ride along with this one fix. The star-wars re-pin PR must run that game's FULL suite + build, not just an audio smoke check.
  Affects `star-wars/package.json` (re-pin risk surface — Reviewer should treat the version jump, not the audio fix, as the thing to verify).
  *Found by Dev during implementation.*

### Reviewer (code review)

- **Gap** (non-blocking): the sw6-2 mutation matrix (6 mutations, 5 caught) is recorded only in this session file; the two that produced findings become permanent guards once TEA lands the rework tests, but the matrix itself is worth re-running whenever `src/audio.ts`'s pending mechanism is next touched.
  Affects `arcade-shared/tests/audio-pending-loop.test.ts` (the rework tests should cite their mutation in a comment so the next reviewer re-runs it).
  *Found by Reviewer during code review.*

## Impact Summary

**Delivery Findings Status:** 5 findings logged (3 non-blocking improvements, 2 non-blocking gaps)
**Blocking Issues:** None

### Findings Summary

#### Improvements (Non-Blocking)

1. **Fleet audio-engine consumers inherit the fix on next re-pin**
   - Found by: TEA (test design)
   - Detail: arcade-shared consumers (star-wars, tempest, asteroids, battlezone, red-baron) all have @arcade/shared/audio in their dependency trees. Only star-wars' first music cue rides the unlock gesture, so only star-wars re-pins in this story. The other four games inherit the pending-loop fix for free on their next version bump, when they re-pin to a new arcade-shared tag (currently: v0.13.1 → v0.17.0 observed in star-wars).
   - Impact: star-wars immediately benefits from the cold-load music race fix; other games get the fix passively and maintain forward compatibility.

2. **`ready()` function name is misleading; documentation updated**
   - Found by: TEA (test design)
   - Detail: AC-5 deviation explicitly left `ready()` unchanged (returns `buffers.size > 0`, true once ANY sample decodes) rather than redefining it to mean "all decoded". The sharpened doc comment in src/audio.ts:48-50 now states clearly: `ready()` returns true once at least one sample has decoded — NOT a gate for any specific sound.
   - Impact: Prevents future re-gates of startLoop/startSource on `ready()`, which would silently re-introduce the decode race (small SFX always arrive before ~5 MB music).

3. **star-wars version jump verified for full-suite stability**
   - Found by: Dev (implementation)
   - Detail: Re-pin from v0.13.1 to v0.17.0 carries three minor versions of arcade-shared changes. Star-wars' FULL suite (1674 tests) + tsc + vite build all green on the jump; lockfile re-resolved correctly (not stale-ref trapped by plain `npm install`).
   - Impact: Version-jump risk surface clear; no hidden collateral from intermediate arcade-shared changes.

#### Gaps (Non-Blocking; Action Items for Later Stories)

1. **`music/finish_ground.wav` 404s on R2 — upload pending from sw7-18**
   - Found by: Dev (implementation)
   - Detail: Observed in BOTH instrumented browser runs (control and fix) with "Unable to decode audio data" console error. The `finishGround` tune shipped in star-wars code (sw7-18, src/shell/audio.ts:106) but its R2 asset upload was never completed (or awaits upload from another checkout's in-flight work).
   - Impact: This story's pending-loop fix does NOT touch one-shots (play path), so finish_ground's 404 is unchanged—it silently never plays today and will continue to silently never play. Forward: sw7-18's owner should confirm the asset is uploaded or file a follow-up for the upload.

2. **Mutation matrix for pending-mechanism defects should be documented and re-run on next touch**
   - Found by: Reviewer (code review)
   - Detail: The sw6-2 mutation matrix (6 mutations, 5 caught; two coverage gaps closed in round 2 via commit 63c0847) is recorded only in this session file. The two new guard tests cite their mutations inline, but the full matrix is worth re-running whenever src/audio.ts' pending mechanism is next touched.
   - Impact: Forward guidance: any future story touching the pending map or decode resolution should cite this matrix in its test comments so the next reviewer re-runs it.

### Round-1 Rejection Closure

Round 1 identified two mutation-proven coverage gaps (marked [HIGH] and [MEDIUM] in the round-1 assessment). Both are CLOSED as of commit 63c0847:

- **[HIGH] CLOSED:** "direct-start supersede leaves the suite green"→ now guarded by new test "a DIRECT start on the channel supersedes an older pending loop", red under the cited mutation.
- **[MEDIUM] CLOSED:** "N:1 shared-file fan-out is unguarded"→ now guarded by new test "one decode starts pending loops on EVERY channel sharing that file", red under the cited mutation.

All round-1 findings are archived findings—none are blocking, and none should be resurrected as current blockers.

### Upstream Effects

- **arcade-shared main/tag carry no automatic deploy** — no production effect until a consumer re-pins and a subsequent game release happens.
- **star-wars develop is not production** — the space theme goes LIVE only at the next `just release star-wars`.
- **Fleet re-pin strategy:** other audio-engine consumers (tempest, asteroids, battlezone, red-baron) inherit the fix on their next version bump; timeline is per-game (no coordinated release).
- **AC-8 residue (human cold-cache listen):** instrumented browser experiment recorded; literal empty-cache hard-refresh/listen remains for the finish-phase user.

### Non-Blocking Status

All findings are explicitly non-blocking. The story is APPROVED (round 2) and the Finish Ceremony has been executed (both PRs merged, arcade-shared v0.17.0 released, star-wars re-pinned). No fixes are required for story completion.

### Deviation Justifications

### Deviation Justifications

5 deviations

- **AC-7 (fleet re-pin) is not covered by a unit test**
  - Rationale: A test that reaches across the subrepo boundary is a CI-only lie — each subrepo is checked out ALONE on GitHub Actions, so `../../` paths pass locally and vanish in CI (the lb2-8 lesson).
  - Severity: minor
  - Forward impact: Reviewer must verify the new tag exists, star-wars' pin moved to it (lockfile re-resolved, not just the ref edited), and the session names the consumers checked.
- **AC-8 (cold-load browser acceptance) is not unit-tested**
  - Rationale: The AC itself excludes unit-test coverage; the race is only real under genuine fetch/decode latency. Port trap applies: prove the server's cwd with `lsof` before trusting what you hear (sibling checkouts pin the same ports).
  - Severity: minor
  - Forward impact: Dev performs and records the cold-load check before handoff to review; Reviewer confirms it happened against THIS checkout's server.
- **AC-6's "trace" pinned as `console.warn` naming the failing FILE**
  - Rationale: The AC names no mechanism. `console.warn` is the minimal browser-observable trace requiring no API change; the filename is the datum the engine holds on every path (buffers are keyed by filename). Requiring a failed-files record falls out: request-after-failure must warn immediately instead of pending forever.
  - Severity: minor
  - Forward impact: Dev implements the warn on the shared failure path plus a failed-file record. If the Reviewer prefers a different trace channel, the three warn tests are the seam to re-pin — the invariant is "a trace exists and slow ≠ missing", not the specific logger.
- **AC-5 resolved as leave-`ready()`-unchanged and document why it cannot be the gate**
  - Rationale: Redefining `ready()` (e.g. to all-decoded) would redden the shipped SH2-16 suite and change a published API no consumer needs changed. The record the AC demands: `ready()` cannot gate the music start because it goes true as soon as ANY sample decodes — the small SFX always beat the ~5 MB music, so a `ready()`-gated start would fire while the music buffer is still absent and silently no-op exactly as today.
  - Severity: minor
  - Forward impact: none — the pinned fires-on-its-own-decode contract makes any future `ready()` re-gating attempt fail loudly.
- **AC-7's star-wars re-pin deferred to the finish phase (tag does not exist yet)**
  - Rationale: The tag cannot exist before the arcade-shared merge + version bump. Pinning star-wars to the feature branch instead would be churn (the branch dies at merge) and star-wars' own code needs no change. The fix WAS verified end-to-end in star-wars regardless, via a local dist overlay (see Dev Assessment).
  - Severity: minor
  - Forward impact: The finish ceremony must (1) merge the arcade-shared PR, (2) bump/tag arcade-shared, (3) `npm install "@arcade/shared@github:slabgorb/arcade-shared#<tag>"` in star-wars (forced re-resolve — editing the ref alone keeps the old lockfile commit), (4) open+merge the star-wars re-pin PR, (5) run star-wars' full suite/build on the jump from v0.13.1.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **AC-7 (fleet re-pin) is not covered by a unit test**
  - Spec source: context-story-sw6-2.md, AC-7
  - Spec text: "THE FIX IS SHARED, SO THE FLEET INHERITS IT — the change lands in `arcade-shared` and ships as a tagged version; star-wars re-pins to that tag in the same PR-set"
  - Implementation: No test spans the arcade-shared → star-wars re-pin; the step is routed to Dev (perform) and the Reviewer (verify) via a Delivery Finding.
  - Rationale: A test that reaches across the subrepo boundary is a CI-only lie — each subrepo is checked out ALONE on GitHub Actions, so `../../` paths pass locally and vanish in CI (the lb2-8 lesson).
  - Severity: minor
  - Forward impact: Reviewer must verify the new tag exists, star-wars' pin moved to it (lockfile re-resolved, not just the ref edited), and the session names the consumers checked.
- **AC-8 (cold-load browser acceptance) is not unit-tested**
  - Spec source: context-story-sw6-2.md, AC-8
  - Spec text: "THE ACCEPTANCE TEST IS A COLD LOAD IN A REAL BROWSER, NOT A GREEN VITEST … No unit test can prove this; verify it in the browser and say so in the session."
  - Implementation: No unit test; the check is a manual hard-refresh with an empty cache, START on the first keypress, space theme audible from the first note — recorded in the session by whoever performs it.
  - Rationale: The AC itself excludes unit-test coverage; the race is only real under genuine fetch/decode latency. Port trap applies: prove the server's cwd with `lsof` before trusting what you hear (sibling checkouts pin the same ports).
  - Severity: minor
  - Forward impact: Dev performs and records the cold-load check before handoff to review; Reviewer confirms it happened against THIS checkout's server.
- **AC-6's "trace" pinned as `console.warn` naming the failing FILE**
  - Spec source: context-story-sw6-2.md, AC-6
  - Spec text: "A request for a sound that FAILED to load must not sit pending indefinitely with no trace."
  - Implementation: Tests require `console.warn` with the failing filename in its arguments on all three failure paths (pending-then-fetch-fails, pending-then-decode-fails, request-after-known-failure), plus a no-warn guard for merely-slow decodes ("slow is not missing").
  - Rationale: The AC names no mechanism. `console.warn` is the minimal browser-observable trace requiring no API change; the filename is the datum the engine holds on every path (buffers are keyed by filename). Requiring a failed-files record falls out: request-after-failure must warn immediately instead of pending forever.
  - Severity: minor
  - Forward impact: Dev implements the warn on the shared failure path plus a failed-file record. If the Reviewer prefers a different trace channel, the three warn tests are the seam to re-pin — the invariant is "a trace exists and slow ≠ missing", not the specific logger.
- **AC-5 resolved as leave-`ready()`-unchanged and document why it cannot be the gate**
  - Spec source: context-story-sw6-2.md, AC-5
  - Spec text: "Either make `ready()` mean what its name says, or leave it and record explicitly in the session why it cannot be the gate."
  - Implementation: `ready()` semantics untouched (SH2-16's suite pins `buffers.size > 0` and stays green). A new test pins the correct gate instead: with the tiny SFX decoded (`ready() === true`) and the theme still decoding, the pending loop must NOT have started; it starts exactly when ITS OWN buffer lands.
  - Rationale: Redefining `ready()` (e.g. to all-decoded) would redden the shipped SH2-16 suite and change a published API no consumer needs changed. The record the AC demands: `ready()` cannot gate the music start because it goes true as soon as ANY sample decodes — the small SFX always beat the ~5 MB music, so a `ready()`-gated start would fire while the music buffer is still absent and silently no-op exactly as today.
  - Severity: minor
  - Forward impact: none — the pinned fires-on-its-own-decode contract makes any future `ready()` re-gating attempt fail loudly.

### Dev (implementation)

- **AC-7's star-wars re-pin deferred to the finish phase (tag does not exist yet)**
  - Spec source: context-story-sw6-2.md, AC-7
  - Spec text: "the change lands in `arcade-shared` and ships as a tagged version; star-wars re-pins to that tag in the same PR-set (git-URL dependency, so force the install: `npm install \"@arcade/shared@github:...#ref\"`)"
  - Implementation: GREEN delivers the arcade-shared implementation only (branch `fix/sw6-2-music-cue-decode-race`, pushed). The star-wars branch carries no commit yet; the re-pin happens at finish, after the arcade-shared PR merges and the version/tag is cut, as its own star-wars PR in the same finish ceremony.
  - Rationale: The tag cannot exist before the arcade-shared merge + version bump. Pinning star-wars to the feature branch instead would be churn (the branch dies at merge) and star-wars' own code needs no change. The fix WAS verified end-to-end in star-wars regardless, via a local dist overlay (see Dev Assessment).
  - Severity: minor
  - Forward impact: The finish ceremony must (1) merge the arcade-shared PR, (2) bump/tag arcade-shared, (3) `npm install "@arcade/shared@github:slabgorb/arcade-shared#<tag>"` in star-wars (forced re-resolve — editing the ref alone keeps the old lockfile commit), (4) open+merge the star-wars re-pin PR, (5) run star-wars' full suite/build on the jump from v0.13.1.
- No other deviations — the implementation follows TEA's pinned contract exactly (per-channel pending map, loop-only, last-request-wins, stopLoop cancel, fires-on-own-decode, `console.warn` naming the file on both failure paths).

### Reviewer (audit)

Every logged deviation audited; none found undocumented beyond the two noted below as review observations (not spec deviations):

- **TEA: AC-7 (fleet re-pin) is not covered by a unit test** → ✓ ACCEPTED by Reviewer: a cross-subrepo path test is green locally and absent/vacuous in CI (subrepos check out alone) — routing to the finish ceremony + Reviewer verification is the only honest coverage.
- **TEA: AC-8 (cold-load browser acceptance) is not unit-tested** → ✓ ACCEPTED by Reviewer: the AC's own text excludes unit-test proof; Dev's instrumented control-vs-fix browser experiment (with `lsof` cwd proof on both runs) satisfies the verifiable half; the human listen stays a finish-step item.
- **TEA: AC-6's "trace" pinned as `console.warn` naming the failing FILE** → ✓ ACCEPTED by Reviewer: minimal browser-observable trace, no API change, and the three warn tests + slow-no-warn guard pin exactly the invariant that matters (slow ≠ missing). The warn-per-call behaviour on repeated requests against a failed file is noted as a LOW observation in the assessment, not a flaw in the deviation.
- **TEA: AC-5 resolved as leave-`ready()`-unchanged and document** → ✓ ACCEPTED by Reviewer: redefining `ready()` would redden the shipped SH2-16 suite for zero consumer need; the fires-on-its-own-decode test pins the correct gate, and the required record exists (deviation text + sharpened doc comment at src/audio.ts:48-50).
- **Dev: AC-7's star-wars re-pin deferred to the finish phase** → ✓ ACCEPTED by Reviewer: the tag cannot exist before the arcade-shared merge; the 5-step finish plan is recorded and the fix was still verified end-to-end in star-wars via the dist overlay. The finish Reviewer/SM must execute all 5 steps — the plain `npm install` lockfile trap is real.

## Sm Assessment

Setup complete and verified on disk, not just claimed by the setup subagent:

- Session file `.session/sw6-2-session.md` exists with story fields, workflow `tdd`, phase history starting at setup (no pre-advanced red row).
- Story branches `fix/sw6-2-music-cue-decode-race` created off `develop` and checked out in BOTH subrepos: `arcade-shared` (where the defect lives, `src/audio.ts` startSource silent no-op) and `star-wars` (the consumer that loses its first space-theme cue).
- Story status moved to `in_progress` in `sprint/epic-sw6.yaml`; started date recorded.
- Story context `sprint/context/context-story-sw6-2.md` written with the full problem narrative (decode race behind the unlock gesture) and eight acceptance criteria, including the runtime-only test constraint for arcade-shared's untyped node-env suite, the loop-vs-one-shot scoping, last-request-wins + single-music-channel invariant, cancel-before-decode, the `ready()` red-herring note, the 404-vs-slow distinction, the shared-tag re-pin fleet step, and the cold-cache browser acceptance check. Epic context file untouched (verified via `git status` — only the new story context is unstaged).
- Jira: explicitly skipped — this project tracks locally via sprint YAML; jira_key is the story id.

Routing: workflow `tdd` is phased; next owner is TEA (red). TEA should start from the story context ACs — the first one mandates reproducing the defect as a failing runtime test in arcade-shared before any fix. Primary implementation surface is `arcade-shared/src/audio.ts` (startSource / the decode resolution around line 89 / stopLoop); star-wars changes should be limited to the version re-pin plus whatever the browser acceptance check requires.

## TEA Assessment

**Tests Required:** Yes
**Reason:** n/a (bug story; AC-1 mandates reproducing the defect in a failing runtime test first)

**Test Files:**
- `arcade-shared/tests/audio-pending-loop.test.ts` — the sw6-2 RED suite (14 tests: 12 red, 2 labeled keep-guards green). Extends the SH2-16 fake-WebAudio pattern with PER-FILE DECODE GATES (`release(file)`) so decode ORDER is controllable — the resurrection trap only shows when the stale file decodes last.

**Tests Written:** 14 tests covering ACs 1–6 (AC-7/AC-8 routed — see deviations)
**Status:** RED (12 failing for the pinned mechanism, verified twice — ready for Dev)

**The contract Dev implements (spelled out in the test-file header):**
- `startLoop` on an undecoded buffer records a PENDING start, keyed PER CHANNEL (the same shape as the `live` map). The decode of that file starts the loop on its channel, stealing whatever sounds there.
- LAST REQUEST WINS per channel, in BOTH decode orders: a stale pending track never starts behind (or steals from) the current one, and the latest request steals a loop already sounding when its decode lands.
- `stopLoop` clears the channel's pending start as well as its live voice.
- One-shots (`play`) NEVER pend — an early laser is dropped for good (keep-guard).
- The pending start fires on ITS OWN buffer's decode — never gated on `ready()` (which the tiny SFX flip true long before the ~5 MB music decodes).
- A FAILED load leaves a trace: `console.warn` naming the file, on pending-at-failure AND on request-after-failure; a merely-SLOW decode never warns.
- Pre-resume behaviour unchanged: `startLoop` before `resume()` stays a silent no-op (SH2-16's suite pins it; the race window this story fixes opens AT the unlock gesture).

**RED verification (testing-runner `sw6-2-tea-red`, cross-checked by a direct full run):**
- Full arcade-shared suite: 25 files, 506 tests — 494 pass, 12 fail, ALL 12 in `audio-pending-loop.test.ts`. Zero collateral. (Runner total 506 ≠ 14 = sum of the named file, so the run was NOT scope-narrowed.)
- Failure-reason audit: every red fails on the missing mechanism itself — "expected 1 source, got 0" (no pending start exists) or "expected warn, got none" (failure path is silent). The two greens are exactly the two labeled `KEEP:` guards, each carrying a positive control so it cannot pass vacuously.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| #1 type-safety escapes (src/audio.ts) | `audio-source-rules.test.ts` (existing, file-scoped — covers Dev's diff) | green guard |
| #2 generic contract not collapsed | `audio-source-rules.test.ts` generics block (existing) | green guard |
| #4 `Map.get()` miss handled | entire new suite — the story IS the unguarded `buffers.get` miss path | failing |
| #5 relative imports carry `.js` | `audio-source-rules.test.ts` ESM block (existing — covers any import Dev adds) | green guard |
| #7 async failure paths observable | AC-6 trace tests (warn on the shared `.catch`) | failing |
| #8 test quality self-check | 0 vacuous assertions; `as never` on fixture manifests only (house pattern); every universal "never starts" paired with a positive existence assert | done |

**Rules checked:** 6 of 6 applicable lang-review rules have coverage (tests are runtime-only by necessity — arcade-shared's suite is vitest-stripped, per AC-1's own warning; `tsc` covers only `src/`)
**Self-check:** 1 fixture defect found and fixed during the failure-reason audit (`release()` raced its own decode gate — now drains microtasks until the gate exists; logged to the TEA sidecar)

**Handoff:** To Dev (The Word Burgers) for GREEN. Implementation surface is `arcade-shared/src/audio.ts` only (pending map beside `live`, the decode `.then` at ~line 89 gains the pending replay, the `.catch` gains the trace + failed-file record, `stopLoop` clears pending). Commit `ce19742` on `fix/sw6-2-music-cue-decode-race` (arcade-shared). The star-wars branch has no commits yet — it exists for the re-pin (AC-7) and the cold-load browser check (AC-8), both routed via deviations/findings. Reminder from the SM: `npm test` in arcade-shared runs `pretest` (a tsc build) — a plain `npx vitest run` is faster for the inner loop.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `arcade-shared/src/audio.ts` — the pending-loop mechanism, +74/−9, entirely inside the one file TEA scoped: a `pending: Map<channel, name>` beside `live` (loop requests only, last request per channel wins); `startPendingFor(file)` runs at the decode's `.then` and starts the remembered loop with the normal steal path; `failLoad(file)` at the `.catch` records the failed file and `console.warn`s (naming file + logical name) for any pending loop parked on it; `startSource` pends loops / drops one-shots / warns on known-failed files; `stopLoop` clears the channel's pending entry before stopping the live voice. Doc comments updated (header carve-out, `startLoop`/`stopLoop`/`ready()` contracts — the `ready()` sharpening is TEA's non-blocking finding, comment-only).

**Tests:** 506/506 passing (GREEN) — full arcade-shared suite, 25 files; the sw6-2 suite is 14/14; the tsc `pretest` build passes. Verified by testing-runner `sw6-2-dev-green` and cross-checked by a direct run (totals match; not a scope-narrowed run).
**Branch:** `fix/sw6-2-music-cue-decode-race` (arcade-shared, pushed; commits `ce19742` test + `8e68e77` feat). No PR created — SM owns that at finish.

**AC-8 browser verification (instrumented, this checkout, controlled experiment):**
Served THIS checkout's star-wars on spare port 5294 (`lsof` confirmed the listener's cwd is `a-2/star-wars` — the sibling-checkout port trap was checked both times). Instrumented `AudioBufferSourceNode.start` (split loop vs one-shot) and `decodeAudioData` completion, pressed ENTER (start) as the first gesture:
- **Control (shipped v0.13.1 engine):** ENTER at t=14756 ms; music decodes completed ~t=18000; one-shot SFX fired throughout the run; **loop starts: NONE, ever** — the space theme was lost exactly as the story describes, live, with `space_theme.wav` fetched 200 and decoded 3 s after the cue.
- **Fix (built dist overlaid into `star-wars/node_modules/@arcade/shared/dist/audio.js`, vite cache cleared, `--force`):** ENTER at t=10968 ms (request lands pre-decode); decodes began landing t=14283; **exactly ONE looping source started at t=14287** — the space theme rings from the first run, honoured the moment its own buffer decoded, no double-start, no stale track.
- What this does NOT prove: an actual empty-cache human listen (agents have no ears). The full cold-cache eardrum check remains for the user/Reviewer at finish, per AC-8's own wording — the instrumented halves (request-before-decode, loop-starts-on-decode, first run) are proven above.
- Note: the local overlay in star-wars' `node_modules` is left in place (it matches what ships after the re-pin and is wiped by any `npm install`); `music/finish_ground.wav` 404s in both runs — pre-existing, filed as a Dev finding, not this story's regression.

**Handoff:** To the verify phase (Imperator Furiosa / TEA) — simplify + quality-pass, then Immortan Joe for review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (1 anomaly note: transient mutation-test dirty tree, resolved) | confirmed 0, dismissed 0, deferred 0 — totals re-verified serially on a clean tree |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer's own edge enumeration (see assessment) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer's own audit (see assessment) |
| 4 | reviewer-test-analyzer | Yes | findings | 2 | confirmed 2 (1 high → [HIGH], 1 medium → [MEDIUM]), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — new doc comments hand-audited against behaviour (see assessment) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — types covered by rule-checker checks #1/#2 (clean) |
| 7 | reviewer-security | Yes | clean | none | N/A — full taint trace to developer manifest; pending/failed bounded |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — Reviewer's own pass found one LOW (duplicated warn string) |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A — 18 rules, 54 instances enumerated, 0 violations |

**All received:** Yes (4 enabled returned — preflight, test-analyzer, security, rule-checker; 5 disabled via settings and pre-filled)
**Total findings:** 2 confirmed, 0 dismissed, 0 deferred

## Round 1 Reviewer Assessment (superseded — REJECTED, reworked and closed in round 2)

**Verdict:** REJECTED

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | [TEST] Unguarded load-bearing NEW behaviour: removing the direct-start supersede (pending.delete(channel) at src/audio.ts:202) leaves the ENTIRE suite green — mutation-proven twice, independently (test-analyzer, then Reviewer's own serial run: both audio suites 40/40 green under the mutation, control green after restore). Without that line, a loop pending on a channel survives a DIRECT start of an already-decoded sound on the same channel and resurrects when its decode lands, stealing the channel back — the stale space theme re-conquering towers on a fast phase edge where the newer track decoded first. The code is CORRECT; the guard does not exist, so the next refactor can delete it and ship green. | src/audio.ts:202 / tests/audio-pending-loop.test.ts | TEA: add a guard test — startLoop(space) with space.wav gated (pending) → startLoop(towers) with towers.wav ALREADY decoded (direct start; assert towers rings) → release space.wav → assert still exactly one ringing source and it is towers (no resurrection, towers.stopped stays false). Prove it by the same mutation (remove line 202 → RED). |
| [MEDIUM] | [TEST] startPendingFor's multi-match fan-out is unguarded: inserting a break after the first match (src/audio.ts:101-108) keeps all 506 green. The N:1 shared-file design (several logical names → one file, the asteroids case, pinned in this file's own header) means one decode can legitimately owe starts to MULTIPLE channels; today no test parks two pending loops on two channels sharing one file. | src/audio.ts:101-108 / tests/audio-pending-loop.test.ts | TEA: add a shared-file manifest ({ a: 'theme.wav', b: 'theme.wav' }, channels 'music'/'ambient'), pend both before the gated decode, release, assert BOTH start. Mutation-prove with the break. |
| [LOW] | [SIMPLE] Duplicated warn string at src/audio.ts:116 and :193 (two identical template literals), and the request-after-failure path warns on EVERY call — a consumer cueing a failed loop per-frame would spam the console. Music cues are phase-edge-rare today, so this does not block; a small warnFailed(name, file) helper and/or once-per-file semantics would tidy it. | src/audio.ts:116,193 | Optional for Dev in the rework commit; not required for approval. |

**Data flow traced:** first user gesture → main.ts unlockAudio → resume() (context + load()) → fetch(manifest.baseUrl + file) [developer config, no user data] → decodeAudioData → buffers/failed → same gesture's run-start MusicEvent → startLoop → startSource → pending (per channel) → decode lands → startPendingFor → source.start() → master GainNode → destination. Safe because no user-controlled value enters the engine at any point; the only string interpolation (the warn) uses manifest-sourced name/file exclusively ([SEC] taint-traced by the security specialist, clean).

**Pattern observed:** the pending map deliberately mirrors the existing live map's shape (channel-keyed, one entry per channel) at src/audio.ts:90-94 — good pattern reuse; the mechanism inherits the steal/onended lifecycle instead of inventing a parallel one (startPendingFor delegates to the normal startSource path at src/audio.ts:105).

**Error handling:** the load() .catch no longer swallows silently for the loop path — failLoad (src/audio.ts:111-119) records the failed file and warns naming it; request-after-failure warns at src/audio.ts:192-195; a merely-slow decode never warns (pinned by the slow-is-not-missing test). Pre-existing silent paths (ctor failure, pre-resume no-ops, one-shot drops) unchanged and still pinned by the SH2-16 suite ([SILENT] audit — Reviewer's own, specialist disabled).

**Observations (beyond the findings table):**
1. [VERIFIED] The core pending mechanism is genuinely guarded — removing the startPendingFor(file) call (src/audio.ts:135) reddens 9 of 14 story tests (test-analyzer mutation 1); last-request-wins reddens 2 (mutation 3); each KEEP guard reddens under its overshoot mutation (mutations 2 and 4: stopLoop-cancel and one-shots-pend). Five of six requested mutations caught.
2. [VERIFIED] The failed-load trace is guarded on both trigger sides — mutation 5 (remove the failed.has branch, src/audio.ts:192) reddens the request-after-failure test; the pending-at-failure side is covered by the fetch-fail and decode-fail warn tests.
3. [VERIFIED] Fixture integrity — the fake-WebAudio decode gates self-assert existence before opening (release() drains microtasks then expects the gate, tests/audio-pending-loop.test.ts), and the test-analyzer found no fixture bugs; the earlier release()-races-its-own-gate defect TEA found and fixed is recorded in the TEA sidecar.
4. [RULE] Clean across the full checklist — 18 rules enumerated over 54 instances (rule-checker): generic <N extends string> contract intact end-to-end, zero type-safety escapes in src/audio.ts, no new relative imports, correct ?? usage throughout, tsc strict build clean.
5. [EDGE] (Reviewer's own — specialist disabled) A decoded ONE-SHOT on a channel with a pending loop cancels that pending loop via the same direct-start supersede — consistent with the engine's one-voice-per-channel steal semantics (a one-shot already steals a RINGING loop), and no fleet consumer mixes one-shots and loops on one channel today. Unpinned behaviour; acceptable, noted for the record. Also checked: Map-delete-during-iteration in startPendingFor/failLoad is safe JS; pending ≤ channel count and failed ≤ file count (bounded); decoded-path behaviour is byte-identical pre/post fix apart from a no-op delete, so rapid startLoop callers (tempest pulsar hum) are unaffected.
6. [DOC] (Reviewer's own — specialist disabled) Every new/changed doc comment checked against behaviour: the header carve-out, startLoop/stopLoop contracts, the sharpened ready() comment, and load()'s exception note all state what the code does — no stale or aspirational claims.
7. [VERIFIED] Dev's browser experiment methodology is sound and independent of the suite: lsof cwd proof against the sibling-checkout port trap on BOTH server starts, prototype instrumentation (loop-vs-one-shot split), a CONTROL run on the shipped engine reproducing the defect (loopStarts empty), then the fix showing exactly one loop start 4 ms after its decode. The sibling-race check also ran: no sw6-2 work merged upstream in arcade-shared or the orchestrator.

### Rule Compliance

Per .pennyfarthing/gates/lang-review/typescript.md, enumerated by the rule-checker over every declaration in the diff and spot-verified by me: #1 type-safety escapes — 5 instances checked, 0 violations (as never fixture casts are the documented house pattern); #2 generics/interfaces — 8 instances, 0 violations (pending: Map<string, N> properly generic-typed); #3 enums — none in diff; #4 null/undefined — 12 instances, 0 violations (all Map.get results guarded, ?? used on optionals); #5 modules — no new relative imports, dynamic '../src/audio' matches repo test convention; #6 JSX — N/A; #7 async — 7 instances, 0 violations; #8 test quality — the two coverage-gap findings above ARE this rule's output (mutation-proven unverified behaviour); otherwise 0 violations, no vacuous assertions, mocks match the real WebAudio surface; #9 build/config — untouched, strict build clean; #10 input validation — no user input surface; #11 error handling — parameterless catch matches file style, failure now traced; #12 performance — bounded sync loops in async callbacks only; #13 fix-regression meta-check — clean. Project-specific: generic contract, no-escapes, and .js-extension rules all independently re-confirmed by the still-green audio-source-rules suite.

### Devil's Advocate

Assume this is broken and I'm shipping it anyway. The strongest attack: the mechanism trusts that pending entries and buffers can never disagree about "current". The direct-start supersede at src/audio.ts:202 is the only thing standing between the engine and a stale theme resurrecting over a track the game legitimately started — and I have now proven with two independent mutation runs that no test notices its removal. In a codebase whose review history is littered with "a guard must be mutation-tested" lessons, approving an unguarded load-bearing line in a SHARED library consumed by five cabinets is exactly how a future simplification commit (that line looks redundant next to startPendingFor's own delete!) silently reintroduces a channel-theft bug that only manifests on cold-cache phase edges — the least-tested moment in every game. Second attack: the N:1 shared-file design is advertised in this very file's header as a load-bearing feature (asteroids), and startPendingFor's fan-out over it is equally unguarded — a break survives 506 green tests. Third: a confused consumer could call startLoop per-frame against a failed file and flood the console — real, but LOW: no fleet consumer cues music per-frame, and each warn is an honest trace of a genuinely lost cue. Fourth: two engine instances (star-wars runs sfx + music engines side by side) — pending maps are per-instance closures, no cross-talk possible. Fifth: could the pending start fire into a paused/abandoned game? Only until the next phase edge's startLoop/stopLoop replaces it — same exposure as any ringing loop today. The first two attacks stand; they are the rejection.

**Handoff:** Back to Imperator Furiosa (TEA) for the two guard tests — testable findings, red rework path. No production code change is required for [HIGH]/[MEDIUM] (the implementation is correct; the verification is incomplete); the LOW warn-helper tidy is optional for Dev if a commit happens anyway.

## TEA Assessment — Round 2 (rework red)

**Tests Required:** Yes (two guard tests ordered by the round-1 review)
**Reason:** Both review findings are keep-behaviour guards on CORRECT code — their red proof is red-UNDER-MUTATION, performed and recorded below, not a red tree.

**Test Files:**
- `arcade-shared/tests/audio-pending-loop.test.ts` — +2 tests (now 16), commit `63c0847`, pushed:
  1. "a DIRECT start on the channel supersedes an older pending loop — no late resurrection" (closes the [HIGH]: pending space on gated decode, direct-started towers, late space decode → still exactly towers ringing).
  2. "one decode starts pending loops on EVERY channel sharing that file (N:1 manifest)" (closes the [MEDIUM]: two names/two channels on one gated file, one release → both start, same shared buffer).
  Each test's comment cites its mutation so the next reviewer re-runs it (the Reviewer's round-1 finding asked for exactly this).

**Mutation proof (run serially, tree restored + control-run after — the git-checkout restore is safe here because HEAD is the desired committed state):**
- Mutation A (delete the direct-start `pending.delete`, src/audio.ts:202): 15/16 green, ONLY the new supersede guard red.
- Mutation B (`break` after startPendingFor's first match): 15/16 green, ONLY the new N:1 guard red.
- Control: full arcade-shared suite **508/508** green on the restored tree; `git status` clean.

**Rule Coverage:** unchanged from round 1 (the two additions are runtime behavioural guards; no new rule surface).
**Self-check:** both new tests carry positive existence assertions (source counts + ringing checks) — no vacuous halves.

**Deviations:** none new — round-2 scope is exactly the review's two ordered tests. (One process note, logged here rather than as a deviation: a first mutation attempt ran from the orchestrator root and touched nothing — the FileNotFoundError proved no mutation applied; re-run correctly from arcade-shared. The stray root-level `npx vitest run` observed 35 pre-existing failures in OTHER repos' suites — known noise, e.g. the test-orchestrator audio MISMATCH — irrelevant to arcade-shared's 508/508.)

**Handoff:** To The Word Burgers (Dev) for the green phase — expected a no-op on production code (the review required none); Dev re-verifies GREEN and decides on the optional [LOW] warn-helper tidy.

## Dev Assessment — Round 2 (rework green)

**Implementation Complete:** Yes (no production change — the round-1 review required none; the two ordered guard tests landed in TEA's rework commit `63c0847`)
**Files Changed:** none this round (production). Test delta is TEA's: `tests/audio-pending-loop.test.ts` +2 guards.

**[LOW] warn-helper tidy: deliberately SKIPPED.** No test requires it, both warn sites are 1 line and intentionally identical, and an unforced refactor in a review rework round adds diff surface for zero behaviour change — minimalist discipline. The once-per-file warn idea stays available to any future story that meets real console spam (none of the fleet cues music per-frame today).

**Tests:** 508/508 passing (GREEN) — full arcade-shared suite, 25 files; story file 16/16; pretest tsc build passed; working tree clean. Verified by testing-runner `sw6-2-dev-green-r2`, matching the serial control run recorded in TEA's round-2 assessment.
**Branch:** `fix/sw6-2-music-cue-decode-race` (arcade-shared) — `ce19742` red, `8e68e77` feat, `63c0847` rework guards; all pushed.

**Deviations:** none this round.
**Delivery findings:** none new this round.

**Handoff:** To Immortan Joe (Reviewer) for round-2 review — scope is the delta since round 1: commit `63c0847` (two guard tests) + the skip decision above.

## Reviewer Assessment

**Verdict:** APPROVED

**Round-2 scope:** the delta since the round-1 rejection — commit `63c0847` (tests/audio-pending-loop.test.ts, +56 lines, two guard tests, NO production change) plus Dev's decision to skip the optional [LOW] tidy. The round-1 review's full-pipeline verification (subagent table above, `All received: Yes`, 18-rule enumeration, taint trace) covers the unchanged production code; this round re-verified the two ordered fixes with the Reviewer's own hands on the committed tree:

- [TEST] Round-1 [HIGH] CLOSED — mutation A (delete the direct-start supersede, src/audio.ts:202) now reds EXACTLY the new guard test ("a DIRECT start on the channel supersedes an older pending loop"), 15/16 remaining green; the test stages the analyzer's prescribed scenario (pending gated theme + already-decoded direct start + late stale decode) and its comment cites the mutation for the next reviewer. Re-run this round by the Reviewer directly: red under mutation, 508/508 green restored, tree clean.
- [TEST] Round-1 [MEDIUM] CLOSED — mutation B (`break` in startPendingFor's fan-out) now reds EXACTLY the new N:1 guard ("one decode starts pending loops on EVERY channel sharing that file"), which also pins the shared-buffer identity (both sources get the ONE filename-keyed buffer). Re-run this round by the Reviewer directly: red under mutation, green restored.
- [SIMPLE] Round-1 [LOW] — Dev's skip ACCEPTED: the tidy was explicitly optional, no test demands it, and an unforced refactor mid-rework adds diff surface for zero behaviour. The once-per-file-warn idea stays on record in the round-1 table for any future story that meets real spam.
- [VERIFIED] Suite state — full arcade-shared 508/508 (25 files), story file 16/16, pretest tsc build green, working tree clean; confirmed by testing-runner `sw6-2-dev-green-r2` AND the Reviewer's serial control run this round.
- [VERIFIED] The delta commit touches ONLY the test file (git show 63c0847 --stat: 1 file, +56) — no unreviewed production drift entered during the rework.
- [RULE] / [SEC] / [EDGE] / [SILENT] / [DOC] — unchanged production code; round-1 clean results stand (rule-checker 18 rules/54 instances clean, security taint-trace clean, Reviewer's own edge/silent/doc audits recorded above).

**Data flow traced:** unchanged from round 1 (gesture → resume/load → fetch of manifest-config URLs → decode → buffers/failed → startLoop → per-channel pending → startPendingFor → source → master gain → destination; no user-controlled data enters the engine).
**Pattern observed:** the two new guards follow the suite's established staging idioms (decode gates + release, positive existence assertions paired with every negative) and each cites its mutation inline — the exact practice the round-1 Delivery Finding requested.
**Error handling:** unchanged; the failed-load trace paths remain pinned by the three warn tests + the slow-is-not-missing guard.

**All eight review dimensions stand covered across the two rounds: [EDGE] [SILENT] [TEST] [DOC] [TYPE] [SEC] [SIMPLE] [RULE].**

**Deviation audit round 2:** no new deviations were logged in the rework (TEA round 2 and Dev round 2 each state none); all five round-1 stamps stand.

**AC-7/AC-8 residue for the finish ceremony (unchanged):** the star-wars re-pin (5-step plan in Dev's round-1 deviation) and the human cold-cache listen remain finish-phase obligations — approved as routed, not as done.

**Handoff:** To The Organic Mechanic (SM) for finish-story.

## Finish Ceremony (SM) — AC-7 executed, with receipts

1. **arcade-shared PR #19** (fix/sw6-2-music-cue-decode-race → develop) squash-merged as `88fc6f1` (verified `state: MERGED`, 2026-07-19T07:35:45Z). Trial-merge beforehand: develop had not moved; merged-tree suite 508/508.
2. **Release v0.17.0** cut via the sanctioned `just release arcade-shared minor` (a direct `git push origin develop` is hook-blocked by design — the release script IS the blessed path): gated on tests+build, bumped on develop (`3d3d734 chore(release): v0.17.0`), merged to main (`2a00a7d`), tagged `v0.17.0`, all pushed. (An earlier hand-rolled `npm version minor` bump was reset before running the script — no duplicate bump landed.)
3. **star-wars re-pin**: forced re-resolve `npm install "@arcade/shared@github:slabgorb/arcade-shared#v0.17.0"` — lockfile resolves to `2a00a7d`, the tag's own commit (NOT a stale ref; the plain-install trap avoided). Full star-wars suite **1674/1674 (143 files)** + tsc/vite build green on the v0.13.1 → v0.17.0 jump. Committed `ae43cd8`, **PR #112** squash-merged to star-wars develop as `fda4a80` (verified MERGED, 2026-07-19T07:39:48Z).
4. **Consumers checked** (AC-7 "say which"): tempest, asteroids, battlezone, red-baron also consume `@arcade/shared/audio` and inherit the fix on their next re-pin; lobby and centipede do not import it. Only star-wars' first music cue rides the unlock gesture, so only it re-pins in this story.
5. **Production note:** star-wars `develop` is not production — the space theme goes LIVE at star-wars' next `just release star-wars`. arcade-shared main/tag carry no deploy.
6. **AC-8 residue (human ear):** the instrumented cold-load control-vs-fix browser experiment is recorded in the Dev Assessment; the literal empty-cache LISTEN remains for the user — hard-refresh with cache disabled, ENTER on the first keypress, the space theme should sound from the first run's first note. Port trap: prove the server's cwd with `lsof` first.