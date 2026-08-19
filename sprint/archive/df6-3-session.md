---
story_id: "df6-3"
jira_key: "df6-3"
epic: "df6"
workflow: "tdd"
---
# Story df6-3: The samples — synthesise one .wav per SOUNDS entry

## Story Details
- **ID:** df6-3
- **Jira Key:** df6-3
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/df6-3-defender-sound-samples
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-19T16:47:43Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-19T16:03:14Z | 2026-08-19T16:04:41Z | 1m 27s |
| red | 2026-08-19T16:04:41Z | 2026-08-19T16:16:23Z | 11m 42s |
| green | 2026-08-19T16:16:23Z | 2026-08-19T16:33:44Z | 17m 21s |
| review | 2026-08-19T16:33:44Z | 2026-08-19T16:43:26Z | 9m 42s |
| green | 2026-08-19T16:43:26Z | 2026-08-19T16:44:56Z | 1m 30s |
| review | 2026-08-19T16:44:56Z | 2026-08-19T16:47:43Z | 2m 47s |
| finish | 2026-08-19T16:47:43Z | - | - |

## Sm Assessment

**Story:** df6-3 — synthesise one `.wav` per SOUNDS entry for defender, upload via `just deploy-assets`, prove a live 200 for every manifest URL. 3pt, p2, tdd (phased).

**This is an ASSET story, and its acceptance is unusual — TEA/Dev must internalise it:**
- **The acceptance test is the CURL, not the VITEST (Decision B).** `@shared/audio` degrades silently on a 404 exactly as it does on working code (the star-wars sw3-5→sw8-14 gap, the standing Architect gotcha). A green suite therefore proves *nothing* about whether the asset actually exists at the URL. Proof = a live HTTP `200` for every manifest URL.
- **Derive the cue list from `SOUNDS` in `plugins/defender/src/shell/audio.ts` AT RUN TIME.** Do NOT hardcode a count (the jt5-2 lesson; matches the repo-wide "no count guards" rule). This story is LAST among the core three, so the SOUNDS set is complete and one upload pass suffices.

**Synthesis route (no source waveform exists):**
- The M6808 sound-board firmware is NOT vendored (roadmap sec 2), so no waveform can be baked from source. Synthesise each cue from MAME's Williams sound-board model (`williams.cpp:1540`) + the machine-local `defend.snd = video_sound_rom_1.ic12` (`williams.cpp:2002`) — the battlezone/jt5 synthesis route.
- The manifest's **source table** records which sound# each cue stands in for and marks any un-anchored cue **invention-pending** — do not silently fabricate authenticity.

**Delivery scope:**
- Extend `just deploy-assets` to bake+upload defender's cues. Upload is BY HAND — CI never touches the assets bucket (named plain `arcade`), not `arcade-lobby`.
- Flip the README/status line off `'silent'`.

**Routing:** Phased tdd → next agent is TEA (red). But note the inverted acceptance: the meaningful RED here is the live-URL probe, not a unit assertion that a silent-degrading loader can pass either way. TEA should design the red around the manifest/curl proof, not around `@shared/audio` behaviour.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** n/a

**Test Files:**
- `plugins/defender/tools/sample-bake/bake-samples.test.mjs` — the bake tool contract (AC1/AC2, the jt5-2 pair). Imports canonical `SOUNDS`/`CUE_SOURCES` from `audio.ts` (source of truth) and `bakeSamples`/`SOUNDS` from the not-yet-existing `./bake-samples.mjs`.
- `plugins/defender/tools/sample-bake/deploy-assets.test.mjs` — the upload path + status-line flip (AC2/AC3). Reads the justfile recipe body, `main.ts`, and `audio.ts` as text; a comment-aware `collapse()` un-wraps claims and an apparatus block proves the negatives are not inert.

**Tests Written:** 20 tests covering AC1, AC2, AC3 (AC4 is guarded indirectly — see below). **Acceptance for AC3's live-200 is the finish-phase curl, NOT this suite (Decision B).**
**Status:** RED — verified.

**RED evidence** (`npx vitest run --project defender`, full run 2 files failed / 69 passed):
- `bake-samples.test.mjs` — errors on load: `Cannot find module './bake-samples.mjs'` (the tool does not exist yet). Correct RED.
- `deploy-assets.test.mjs` — 4 failed / 6 passed. The 4 correct REDs:
  - `the recipe body stages the defender/sfx key prefix` — recipe bakes star-wars/joust/centipede only.
  - `the recipe invokes a defender bake script that EXISTS on disk` — no defender bake wired/on disk (the mis-anchor guard).
  - `main.ts no longer says the game ships silent` — status line still "Ships SILENT — no samples in the bucket yet."
  - `audio.ts no longer defers the bake to "a later df story"` — the df6-1 deferral is still present.
  The 6 intended-green guards/apparatus PASS: root probe, "extended not replaced" (star-wars/joust/centipede kept), bucket stays `arcade`, shell-fetch/upload prefix pair, and both `collapse()` apparatus tests.
- All other defender tests unchanged and green (no regressions).

**A self-inflicted apparatus bug was caught and fixed before handoff:** the first `collapse()` squashed whitespace only, leaving an interior `// ` between words of a wrapped claim — which made the `audio.ts` deferral negative falsely PASS (inert, green-by-absence). The apparatus test reddened it; `collapse()` now strips the `//`/`*` comment leader (the JS-comment twin of joust's `flatten()`), so the negative correctly REDs and the apparatus passes.

### Rule Coverage

The applicable lang-review discipline here is TEST-QUALITY (non-vacuity / non-inertness), not the type-system rules (this is a `.mjs` asset-tool surface):

| Rule | Test(s) | Status |
|------|---------|--------|
| No hardcoded count — derive at runtime | `one .wav per SOUNDS entry`, identity `toBe` | red (impl missing) |
| Negative assertions must not be inert | `collapse() + the negative regex actually match the stale status line` | green (apparatus) |
| Non-vacuity guard before set-equality | `the manifest is a bijection worth baking` | red (impl missing) |
| Refusal must be loud, by message | subprocess no-dir + `bakeFailure` message pins | red (impl missing) |
| Provenance total, no silent fabrication (AC1) | `every baked cue has a CUE_SOURCES record`, `each record is one of the three honest kinds` | (runs once bake loads) |

**Rules checked:** test-quality rubric fully applied — every negative has an inertness control, every set-equality has a non-vacuity guard, every message assertion pins the string.
**Self-check:** 1 inert-assertion bug found (the `collapse()` `//`-leader gap) and fixed. No `let _ =`, no `assert(true)`, no always-None asserts.

**Handoff:** To Dev (Korben Dallas) for GREEN — build `plugins/defender/tools/sample-bake/bake-samples.mjs` + the dependency-free `audio-manifest.ts` extraction, extend `deploy-assets`, flip the status lines. Then upload by hand and paste the curl 200s at finish. See Delivery Findings for the manifest-extraction gap.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/defender/src/shell/audio-manifest.ts` (NEW) — dependency-free `SoundName` + `SOUNDS`, so the plain-node bake can reach the cue list without `@shared`.
- `plugins/defender/src/shell/audio.ts` — imports + re-exports `SOUNDS`/`SoundName` from the manifest (identity preserved); status/deferral comments flipped off silent; `DEFAULT_BASE_URL` kept literal.
- `plugins/defender/tools/sample-bake/bake-samples.mjs` (NEW) — one synthesised `.wav` per SOUNDS entry, sized to each cue's ROM SNDTMR window (`SND_FRAMES`), deterministic (mulberry32 seeded from the cue name), plain-node-safe.
- `plugins/defender/src/main.ts` — audio-seam status comments flipped off silent.
- `justfile` — `deploy-assets` bakes `defender/sfx` alongside star-wars/joust/centipede, uploads to the plain `arcade` bucket, and prints a defender verify-curl.

**Tests:** defender project 983/983 GREEN; full cabinet 17849/17849 GREEN (1 todo); orchestrator 503/503; `npm run lint` (tsc --noEmit) clean.
**Branch:** feat/df6-3-defender-sound-samples (pushed).

### Acceptance Evidence (Decision B — the curl IS the test)

`just deploy-assets` uploaded to the `arcade` bucket (78 objects total; defender/sfx added, other games re-uploaded byte-identical). Every manifest URL, DERIVED from `SOUNDS` at run time (23 cues), returns a live **200** with **content-type `audio/wav`** — non-200 count **0**:

```
BASE = https://arcade-assets.slabgorb.com/defender/sfx/
200 audio/wav  lassnd.wav   200 audio/wav  lhsnd.wav    200 audio/wav  schsnd.wav
200 audio/wav  ufhsnd.wav   200 audio/wav  prhsnd.wav   200 audio/wav  tihsnd.wav
200 audio/wav  swhsnd.wav   200 audio/wav  lshsnd.wav   200 audio/wav  sshsnd.wav
200 audio/wav  ushsnd.wav   200 audio/wav  swssnd.wav   200 audio/wav  lpksnd.wav
200 audio/wav  apsnd.wav    200 audio/wav  sbsnd.wav    200 audio/wav  pdsnd.wav
200 audio/wav  rpsnd.wav    200 audio/wav  st1snd.wav   200 audio/wav  acsnd.wav
200 audio/wav  alsnd.wav    200 audio/wav  ahsnd.wav    200 audio/wav  ascsnd.wav
200 audio/wav  thrust.wav   200 audio/wav  lsksnd.wav
→ 23/23 live 200, 0 non-200
```

**AC4 (outstanding cues):** NONE. All 21 one-shots + `landerSuck` are `kind:'rom'` and `thrust` is `kind:'flag'` — every cue is ROM/flag-anchored (no `invention`), and all 23 baked and uploaded in one pass. No cue is un-sourced or un-uploaded, so no follow-up story is filed.

**Handoff:** To Reviewer (Zorg) for code review.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): Defender has NO `audio-manifest.ts` split yet — unlike joust, `SOUNDS`/`CHANNELS`/`CUE_SOURCES` live only in `src/shell/audio.ts`, which imports `@shared/audio`. The bake the justfile runs under PLAIN node (`node .../bake-samples.mjs`) cannot resolve `@shared`, so a bake that imports `audio.ts` is green under vitest and DEAD at deploy. Affects `plugins/defender/src/shell/audio.ts` + a new `plugins/defender/src/shell/audio-manifest.ts` (extract the dependency-free records; `audio.ts` re-exports the SAME objects so the `bake.SOUNDS === audio.ts SOUNDS` identity assertion holds). The subprocess test in `bake-samples.test.mjs` is what forces this — it will stay RED until the extraction is done. *Found by TEA during test design.*
- **Gap** (non-blocking): No SNDTMR frame windows are extracted for defender yet — the bake must size each `.wav` from the ROM's own arbitration window. Every FCB row's `verbatim` in `CUE_SOURCES` already carries the SNDTMR byte (e.g. `LASSND\tFCB\t$C0,$01,$30,$14,0 LASER`), so the window is derivable, not invented — mirror jt5-6's `framesFor`. Affects the new bake + manifest. *Found by TEA during test design.*
- **Improvement** (non-blocking): All 21 one-shots + `landerSuck` are `kind:'rom'` and `thrust` is `kind:'flag'` — every cue is ROM/flag-anchored, NONE is `invention`, so AC4 (file follow-ups for un-sourceable cues) should have an EMPTY outstanding list unless a cue fails to bake or upload. The honesty guard in `bake-samples.test.mjs` pins this. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): The SNDTMR window now lives in two places — `CUE_SOURCES[name].source.verbatim` (as text, in `audio.ts`) and `SND_FRAMES` (as arithmetic, in `bake-samples.mjs`). A future jt5-6-analog story could move `CUE_SOURCES` into `audio-manifest.ts` and derive `FRAME_DURATIONS` via a `framesFor`, collapsing the duplication to one source. Affects `plugins/defender/src/shell/audio-manifest.ts` + `plugins/defender/tools/sample-bake/bake-samples.mjs`. Not blocking — this is the jt5-2 (hand-sized) stage, not the jt5-6 (derived) stage. *Found by Dev during implementation.*
- **Gap** (non-blocking): The assets upload is a manual, credentialed production write (`just deploy-assets`, R2 creds in env) and is NOT part of CI. This run re-uploaded ALL games' assets (78 objects) because the recipe stages the whole tree; the bake is deterministic so the re-uploads are byte-identical. Affects nothing in-repo, but re-deploying defender means re-running the whole recipe by hand. *Found by Dev during implementation.*

### Reviewer (code review)
- **Conflict** (blocking): `bake-samples.mjs:44` carries a FALSE-provenance comment — it claims `FRAME_HZ` is "the same derivation `core/frame.ts` uses for its frame clock — a shared formula cannot drift the way a transcribed 60 could", but defender has NO `src/core/frame.ts` and no shared `FRAME_HZ` (verified: `ls`/grep both empty). The line is a verbatim copy from `plugins/joust/tools/sample-bake/bake-samples.mjs` (joust DOES have `core/frame.ts:93`). The VALUE `8_000_000 / (512 * 260)` is correct (board-facts.md:25), but the safeguard the comment asserts does not exist in defender. Affects `plugins/defender/tools/sample-bake/bake-samples.mjs` (rewrite the comment to cite defender's real source — board-facts.md — and drop the nonexistent shared-module claim). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `bakeSamples` is declared `async` but `await`s nothing (JS-2). It mirrors the joust sibling `bakeSamples` exactly (also async) and the recipe/tests `await` it harmlessly — keeping it is the one-idea-one-spelling fleet parity choice. Affects `plugins/defender/tools/sample-bake/bake-samples.mjs`. Non-blocking; recommend keep-for-parity. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 1 findings (0 Gap, 1 Conflict, 0 Question, 0 Improvement)
**Blocking:** 1 BLOCKING items — see below

**BLOCKING:**
- **Conflict:** `bake-samples.mjs:44` carries a FALSE-provenance comment — it claims `FRAME_HZ` is "the same derivation `core/frame.ts` uses for its frame clock — a shared formula cannot drift the way a transcribed 60 could", but defender has NO `src/core/frame.ts` and no shared `FRAME_HZ` (verified: `ls`/grep both empty). The line is a verbatim copy from `plugins/joust/tools/sample-bake/bake-samples.mjs` (joust DOES have `core/frame.ts:93`). The VALUE `8_000_000 / (512 * 260)` is correct (board-facts.md:25), but the safeguard the comment asserts does not exist in defender. Affects `plugins/defender/tools/sample-bake/bake-samples.mjs`.


### Downstream Effects

- **`plugins/defender/tools/sample-bake`** — 1 finding

### Deviation Justifications

5 deviations

- **Cue lengths sized from a hand-encoded `SND_FRAMES` in the bake, not a `framesFor` over `CUE_SOURCES`**
  - Rationale: This is defender's FIRST samples story (the jt5-2 analog); joust hand-sized in jt5-2 and only DERIVED from citations in the later jt5-6. Minimal extraction keeps the diff small and the risk low. The SNDTMR numbers are transcribed once, each with its FCB row in a comment.
  - Severity: minor
  - Forward impact: a future "derive the window from the citation" story (the jt5-6 analog) would move `CUE_SOURCES` into the manifest and replace `SND_FRAMES` with a `framesFor`. Until then, an edit to a cue's SNDTMR in `CUE_SOURCES` must be mirrored in `SND_FRAMES` (both cite the same FCB row).
- **`thrust` window is a judgement grain (24 frames), as it is a FLAG cue with no SOUND-TABLE row**
  - Rationale: A flag cue has no table to size it; a short loop grain is the honest choice, matching how `CueSource` treats `flag` as fully-cited-but-tableless.
  - Severity: minor
  - Forward impact: none.
- **Acceptance is the finish-phase curl, so no vitest asserts the live 200**
  - Rationale: This is Decision B and the jt5-2 model the story names. The 200 is proven by curl at finish, not here.
  - Severity: minor
  - Forward impact: Dev/Reviewer must NOT add a network test to "strengthen" the suite; the curl artifact in the session is the acceptance. SM finish must paste the curl output.
- **The `bake.SOUNDS === audio.ts SOUNDS` identity assertion prescribes a manifest-extraction architecture**
  - Rationale: Identity reds the instant the bake transcribes rather than re-exports; deep-equal only reds later, once a copy falls out of date. This is the proven fleet pattern (joust), not an invention.
  - Severity: minor
  - Forward impact: Dev must extract + re-export (see the Delivery Finding), not build a parallel list.
- **Exact usage-message strings are pinned as test contracts, reused from joust**
  - Rationale: Reusing joust's exact wording keeps one idea in one spelling across the fleet and makes "refuses loudly" a real, mutation-proof assertion rather than a bare throw.
  - Severity: minor
  - Forward impact: Dev matches these strings verbatim.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Cue lengths sized from a hand-encoded `SND_FRAMES` in the bake, not a `framesFor` over `CUE_SOURCES`**
  - Spec source: context-story-df6-3.md, AC1
  - Spec text: "each is synthesised informed by MAME's Williams sound-board model ... and the machine-local defend.snd"
  - Implementation: `bake-samples.mjs` carries `SND_FRAMES` (REPCNT*SNDTMR summed per FCB group, arithmetic shown per cue) rather than deriving the window by parsing `CUE_SOURCES[name].source.verbatim`. `CUE_SOURCES` stayed in `audio.ts` (only `SOUNDS`/`SoundName` moved to the dependency-free manifest).
  - Rationale: This is defender's FIRST samples story (the jt5-2 analog); joust hand-sized in jt5-2 and only DERIVED from citations in the later jt5-6. Minimal extraction keeps the diff small and the risk low. The SNDTMR numbers are transcribed once, each with its FCB row in a comment.
  - Severity: minor
  - Forward impact: a future "derive the window from the citation" story (the jt5-6 analog) would move `CUE_SOURCES` into the manifest and replace `SND_FRAMES` with a `framesFor`. Until then, an edit to a cue's SNDTMR in `CUE_SOURCES` must be mirrored in `SND_FRAMES` (both cite the same FCB row).
- **`thrust` window is a judgement grain (24 frames), as it is a FLAG cue with no SOUND-TABLE row**
  - Spec source: src/shell/audio.ts CUE_SOURCES (thrust: kind 'flag')
  - Spec text: "`thrust` is the one FLAG cue with no row" — THFLG side-path, no FCB/SNDTMR
  - Implementation: `SND_FRAMES.thrust = 24` (~0.4s), a held-loop grain, since there is no ROM arbitration window to size it.
  - Rationale: A flag cue has no table to size it; a short loop grain is the honest choice, matching how `CueSource` treats `flag` as fully-cited-but-tableless.
  - Severity: minor
  - Forward impact: none.

### TEA (test design)
- **Acceptance is the finish-phase curl, so no vitest asserts the live 200**
  - Spec source: context-story-df6-3.md, AC3
  - Spec text: "a live 200 is proven for EVERY manifest URL — the curl status codes are pasted into the session file as the acceptance evidence (Decision B: the curl is the test, NOT the vitest...)"
  - Implementation: The vitest pair pins the MACHINE that produces the assets (bake output is real/decodable/deterministic audio; recipe stages defender/sfx and invokes an on-disk bake; status lines flip). It deliberately does NOT hit the network — `@shared/audio` silent-degrade makes a 404 indistinguishable from a working fetch, so a network assertion would only pretend.
  - Rationale: This is Decision B and the jt5-2 model the story names. The 200 is proven by curl at finish, not here.
  - Severity: minor
  - Forward impact: Dev/Reviewer must NOT add a network test to "strengthen" the suite; the curl artifact in the session is the acceptance. SM finish must paste the curl output.
- **The `bake.SOUNDS === audio.ts SOUNDS` identity assertion prescribes a manifest-extraction architecture**
  - Spec source: context-story-df6-3.md, AC1
  - Spec text: "DERIVE the cue list from SOUNDS in plugins/defender/src/shell/audio.ts AT THE TIME THIS RUNS — do NOT hardcode a count (the jt5-2 lesson)."
  - Implementation: The test asserts object IDENTITY (`toBe`), not deep-equality, to make drift structurally impossible. That forces the jt5-2 shape: a dependency-free `audio-manifest.ts` re-exported by `audio.ts` and imported by the bake.
  - Rationale: Identity reds the instant the bake transcribes rather than re-exports; deep-equal only reds later, once a copy falls out of date. This is the proven fleet pattern (joust), not an invention.
  - Severity: minor
  - Forward impact: Dev must extract + re-export (see the Delivery Finding), not build a parallel list.
- **Exact usage-message strings are pinned as test contracts, reused from joust**
  - Spec source: context-story-df6-3.md, AC1/AC2 (no explicit message spec)
  - Spec text: (none — the ACs do not dictate error text)
  - Implementation: `bakeSamples` must throw `'usage: bakeSamples(outDir) — pass an explicit staging directory'` and the CLI must print `'usage: node bake-samples.mjs <outDir>'` to stderr on the no-dir path.
  - Rationale: Reusing joust's exact wording keeps one idea in one spelling across the fleet and makes "refuses loudly" a real, mutation-proof assertion rather than a bare throw.
  - Severity: minor
  - Forward impact: Dev matches these strings verbatim.
### Reviewer (audit)
All five TEA/Dev deviations are sound and stamped ACCEPTED:
- **TEA — acceptance is the finish-phase curl, no live-200 vitest** → ✓ ACCEPTED: Decision B is correct; a network assertion over a silent-degrading loader would be theatre. The curl (23/23 200) is pasted in the Dev Assessment.
- **TEA — identity `.toBe` prescribes the manifest-extraction shape** → ✓ ACCEPTED: identity is the only drift-proof guard; Dev implemented the extraction and `npx vitest` proves the same object instance.
- **TEA — exact usage-message strings reused from joust** → ✓ ACCEPTED: one-idea-one-spelling; makes "refuses loudly" mutation-proof.
- **Dev — cue lengths from hand-encoded `SND_FRAMES`, not a `framesFor`** → ✓ ACCEPTED: correct jt5-2 (hand-sized) stage; I re-derived all 23 windows against the `CUE_SOURCES` FCB rows byte-for-byte and every one matches. The duplication is logged as a non-blocking improvement for a future jt5-6-analog.
- **Dev — `thrust` window = 24 judgement frames (flag cue, no FCB)** → ✓ ACCEPTED: no ROM arbitration window exists for a flag cue; a short loop grain is the honest choice.

UNDOCUMENTED (not logged by TEA/Dev, caught in review):
- **The `FRAME_HZ` comment claims a shared `core/frame.ts` defender does not have.** Spec/repo rule TS-17 (no comment asserting a mechanism nobody re-ran). Code copied joust's true line into a tree where it is false. Severity: Medium. Filed as the blocking Delivery Finding above.

## Subagent Results

**Cycle: 1**

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — domain assessed via rule_checker (TS-17) + my own read |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 2, dismissed 0, deferred 0 |

**All received:** Yes (3 enabled returned; 6 disabled pre-filled as skipped)
**Total findings:** 2 confirmed (1 blocking Medium, 1 non-blocking Low), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** REJECTED — one confirmed false-provenance comment (repo rule TS-17); everything else is clean.

The code is functionally complete and well-tested — the only reason for the round-trip is a copy-paste comment that asserts a safeguard defender does not have. It is a one-line fix, but in a repo whose entire discipline is comment/citation honesty, a comment that lies about its own provenance cannot ship.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM] | `[RULE][DOC]` FRAME_HZ comment claims "the same derivation core/frame.ts uses ... a shared formula cannot drift" — defender has no core/frame.ts and no shared FRAME_HZ; verbatim copy from joust where it is true. The value is correct, the claimed safeguard is fictitious. | plugins/defender/tools/sample-bake/bake-samples.mjs:44 | Rewrite the comment to cite defender's real source (docs/rom-study/board-facts.md — 8 MHz over 512×260) and drop the nonexistent shared-`core/frame.ts` claim. |
| [LOW] | `[RULE]` `bakeSamples` is `async` with no `await` (JS-2). | plugins/defender/tools/sample-bake/bake-samples.mjs:302 | Non-blocking. Recommend KEEP for parity with joust's async `bakeSamples` (tests/recipe `await` it harmlessly); do not diverge the fleet for this alone. |

**Findings incorporated by source:**
- [SEC] reviewer-security: clean — no path traversal (outDir is a trusted build-time arg; filenames are static manifest values), no secrets, `invokedAsScript()` realpath logic sound, bucket name `arcade` correct, no `.wav` committed.
- [RULE] reviewer-rule-checker: 43 rules checked, 61 instances; 2 violations (both above). Independently confirmed: no core/frame.ts (blocking finding TRUE); async-no-await TRUE.
- [DOC] (comment-analyzer disabled) — assessed via rule_checker TS-17 + my own read: the FRAME_HZ comment is the one stale/false claim; all four "off-silent" status flips (main.ts ×2, audio.ts ×2) verified present and the stale silence prose verified GONE.
- [TEST] (test-analyzer disabled) — assessed via rule_checker TS-8 + my own read: identity `.toBe` (not deep-equal), non-vacuity guard precedes every set-equality, message assertions pin exact strings, the AC3 negatives are backed by a non-inertness apparatus block, distinctness hashes all 23. No vacuous assertions.
- [EDGE]/[SILENT]/[TYPE]/[SIMPLE] (disabled) — no evidence of unhandled paths, swallowed errors, type-invariant breaks, or over-engineering in my own read; the outDir guard fails closed on undefined/empty/0/negative windows.

**Data flow traced:** `SOUNDS` (audio-manifest.ts) → imported by the bake AND re-exported by audio.ts (same object, identity `.toBe` green) → `bakeSamples` writes one WAV per entry sized by `SND_FRAMES` (each = the cited FCB REPCNT×SNDTMR) → `just deploy-assets` stages `defender/sfx` → R2 `arcade` bucket → 23/23 live 200 audio/wav. Safe and verified end-to-end.

**Rule Compliance:** TS type-safety (no `as any`/`!`/`@ts-ignore`), Readonly Records, string-literal union (no enum), null handling (`Object.hasOwn` ternary + `!(frames>0)` fail-closed), `.js`-extension ESM imports with inline `type`, descriptive `throw new Error`, no thrown strings — all compliant. Sole violations: the two above.

**Handoff:** Back to Dev for the comment fix (green rework).
## Dev Assessment (rework — review round 1)

**Fix applied:** Reviewer round-1 blocking finding resolved — `bake-samples.mjs:44` FRAME_HZ comment rewrote to cite the real source (`docs/rom-study/board-facts.md:25`, the set_raw video chain `williams.cpp:1556`) and drop the false "shared `core/frame.ts`" claim copied from joust. Also states why the true 60.09615 Hz raster (not the sim's nominal 60 Hz, `core/sim.ts:454`) sizes each file.

**Reviewer Low finding (async-no-await):** left as-is — keeps parity with joust's async `bakeSamples`; recipe/tests `await` it harmlessly (Reviewer recommended keep-for-parity).

**Verification:** comment-only change; bake output byte-identical (23 files, unchanged). `npm run lint` clean; defender project 983/983 GREEN; commit `3803ea0e` pushed.

**Handoff:** Back to Reviewer for re-review (cycle 2).
## Subagent Results

**Cycle: 1**

**Method:** Targeted re-verification of the round-1 findings (protocol-sanctioned over a fresh generalist sweep) — the rework was a SINGLE comment (bake-samples.mjs:44) with byte-identical bake output (23 files unchanged), so a full re-dispatch would re-derive identical results. Each round-1 finding was re-probed directly, plus a green re-run (`npm run lint` + `npx vitest run --project defender`).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes (targeted) | clean | none | N/A — re-ran lint (clean) + defender project (983/983) |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — comment domain re-verified by hand (the fix IS a comment) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes (targeted) | clean | none | N/A — comment-only diff, no security surface touched |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes (targeted) | clean | none | round-1 finding #2 (false FRAME_HZ provenance) RESOLVED; finding #1 (async-no-await) kept-for-parity as recommended |

**All received:** Yes (3 enabled re-verified by targeted probe; 6 disabled pre-filled as skipped)
**Total findings:** 0 new; round-1 blocking finding resolved, round-1 Low finding accepted-as-is

## Reviewer Assessment

**Verdict:** APPROVED (re-review; supersedes the round-1 REJECTED verdict)

The single round-1 blocking finding is fixed. `bake-samples.mjs:44` no longer claims a shared `core/frame.ts` defender does not have; it now cites the real source — `docs/rom-study/board-facts.md:25` (60.09615 Hz = 8 MHz over 512×260, the set_raw video chain `williams.cpp:1556`) — and explains why the true raster (not the sim's nominal 60 Hz at `core/sim.ts:454`) sizes each file. Both cited anchors were verified present. The diff since round 1 is exactly those six comment lines; the bake output is byte-identical (23 files), `npm run lint` is clean, and the defender project is 983/983. No new surface, no collateral.

**Re-verification (cycle 2, targeted):**
- [RULE][DOC] FRAME_HZ provenance — RESOLVED. Grep confirms the false "same derivation core/frame.ts … a shared formula cannot drift" line is GONE; the new text cites board-facts.md:25 / williams.cpp:1556, both of which exist.
- [RULE] async-no-await (Low) — accepted as-is: matches joust's async `bakeSamples`, recipe/tests `await` it harmlessly; diverging the fleet for this alone is not warranted.
- [SEC] no security surface changed by a comment edit; round-1 security clean stands.
- Working-tree audit CLEAN (after restoring the pf-stamped `sprint/epic-df6.yaml` tracking file, a known audit-tree false-DIRTY).

**Acceptance (Decision B):** 23/23 manifest URLs return live 200 `audio/wav` (curl sweep pasted in the Dev Assessment); AC4 outstanding list empty (every cue ROM/flag-anchored, none invention). AC1–AC4 satisfied.

**Data flow traced:** `SOUNDS` (audio-manifest.ts) → bake + audio.ts re-export (identity `.toBe` green) → `bakeSamples` writes one WAV per entry sized by the cited FCB windows → `just deploy-assets` → R2 `arcade`/`defender/sfx/` → 23/23 live 200. Safe end-to-end.

**Pattern observed:** clean jt5-2-parity extraction (dependency-free manifest re-exported by the shell) at plugins/defender/src/shell/audio-manifest.ts:22.

**Error handling:** outDir guard fails closed on undefined/empty (bake-samples.mjs:305); frame-window guard `!(frames > 0)` fails closed on undefined/0/negative (bake-samples.mjs:316); `invokedAsScript()` realpath compare with string fallback (bake-samples.mjs:334).

**Handoff:** To SM for finish-story.