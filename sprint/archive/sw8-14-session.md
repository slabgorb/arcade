---
story_id: "sw8-14"
jira_key: "sw8-14"
epic: "sw8"
workflow: "tdd"
---
# Story sw8-14: music-bake pipeline cannot reproduce finish_ground.wav

## Story Details
- **ID:** sw8-14
- **Jira Key:** sw8-14
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** star-wars
- **Branch:** feat/sw8-14-music-bake-finish-ground
- **Assignee:** slabgorb

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-27T20:53:24Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-27T20:07:47+00:00 | 2026-07-27T20:14:10Z | 6m 23s |
| red | 2026-07-27T20:14:10Z | 2026-07-27T20:25:57Z | 11m 47s |
| green | 2026-07-27T20:25:57Z | 2026-07-27T20:37:19Z | 11m 22s |
| review | 2026-07-27T20:37:19Z | 2026-07-27T20:53:24Z | 16m 5s |
| finish | 2026-07-27T20:53:24Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (blocking): `REB` currently plays TWICE and this story is the fix. sw7-18 shipped
  the `finishGround` one-shot cue in the core, but `REB` also remains the tail segment of the
  LOOPING `towers` track — so the surface phase rings the rebel finish once per loop AND once
  from the cue. It is 16.03 s of a 27.04 s track (measured via `renderVoice`), so `towers`
  is majority-REB today. The ROM fires them as two separate cues (`PM4TH` at ground init,
  WSMAIN.MAC:1636; `PMREB` at `PH.TIM==14` in the per-frame `PHEGD`, :1673) — the identical
  shape sw8-12 split for TH5/THB. Ruled SPLIT and pinned by tests.
  Affects `star-wars/tools/music-bake/gen-music-data.mjs` (drop `REB` from `TRACK_SPEC.towers`,
  add `finishGround` to `TUNE_SPEC`) and `bake-music.mjs` (`OUTPUT_FILES`).
  *Found by TEA during test design.*

- **Gap** (blocking): RELEASE-ORDERING — `towers_theme.wav` changes CONTENT, not just the
  file list. It drops from ~27.0 s to ~11.0 s. Production currently serves the long
  concatenated version, so the bucket MUST be re-uploaded (`just deploy-assets` at the
  orchestrator) in the same window as the release that ships this code, exactly like sw8-12's
  standing `theme_b.wav` obligation. Uploading early makes production (still on the old code)
  lose the rebel finish entirely, since the old build has no `finishGround` fetch path — so the
  correct order is deploy-assets immediately before/with `just release star-wars`. Note that
  sw8-12's asset obligation is still outstanding, so ONE deploy-assets run now covers both.
  Affects the orchestrator `just deploy-assets` step (carry into the Impact Summary and the
  release checklist).
  *Found by TEA during test design.*

- **Gap** (non-blocking): `theme_b.wav` had NO bake quality coverage — sw8-12 added `themeB`
  to `TUNE_SPEC` and `OUTPUT_FILES` but not to the sw7-8 "bakes to real audio, not silence"
  list, so a silent or clipped theme B would ship under a green suite. Closed in this story's
  RED (test-only, logged as a deviation) rather than filed, since it is one entry in the very
  list `finishGround` had to join.
  Affects `star-wars/tools/music-bake/bake-music.test.mjs` (already fixed in RED — no Dev action).
  *Found by TEA during test design.*

- **Improvement** (non-blocking): the `buildFeeds` docstring in `bake-music.mjs:108-109` is
  STALE — it still says segments flatten "in the order WSMAIN fires them (space = TH5 then THB;
  towers = 4TH then REB)". The space half has been wrong since sw8-12, and the towers half goes
  wrong with this story. Dev is editing this file anyway; correct the sentence rather than leave
  a comment that documents a shape the data no longer has.
  Affects `star-wars/tools/music-bake/bake-music.mjs` (comment at the `buildFeeds` docstring).
  *Found by TEA during test design.*

- **Question** (non-blocking): with `REB` removed, `towers_theme.wav` is an 11.0 s loop where
  the cabinet plays 4TH once at ground entry and then sits under the rebel finish at
  `PH.TIM==14`. That loop-vs-one-shot divergence is sw3-5's standing adaptation (the same one
  `audio.ts:74-78` documents for `space`), NOT something this story introduces — but the
  comment block on `MUSIC.towers` does not say so the way `MUSIC.space` does. Worth a matching
  note in `audio.ts` so the next reader does not re-derive it. Not filed as a story: it is a
  one-comment change inside the story's own blast radius; if Dev judges it out of scope, file
  it rather than drop it.
  Affects `star-wars/src/shell/audio.ts` (the `MUSIC.towers` comment).
  *Found by TEA during test design.*

### Dev (implementation)

- **Gap** (blocking): **`finish_ground.wav` is a 404 in production RIGHT NOW — it was never
  uploaded at all.** The story title and TEA's first finding both say the asset "exists only
  in R2"; measured, it does not exist there either:
  `curl -sI https://arcade-assets.slabgorb.com/star-wars/music/finish_ground.wav` → **HTTP 404**.
  So since sw7-18 shipped the cue, the surface phase has fired `finishGround` at a file that
  isn't there. `audio.ts` degrades silently by contract ("a missing/undecoded track simply
  never plays", :227-228), so it fails soundlessly rather than throwing — which is why nobody
  heard it. This makes the story a live production fix, not only a reproducibility chore.
  Affects the orchestrator `just deploy-assets` step (the upload is what closes it).
  *Found by Dev during implementation.*

- **Correction** to TEA's first finding, recorded rather than edited (append-only): the
  double-play was **LATENT, not live**. With the tune 404ing, production hears REB only from
  the towers loop — there is no audible double-play today. The double-play is what uploading
  `finish_ground.wav` would have CREATED had `REB` stayed in the towers track. TEA's ruling is
  right and its ROM reasoning is unaffected; only the "currently plays TWICE" framing is off,
  and the distinction matters to the Reviewer deciding what to listen for. Everything else in
  that finding measured out exactly (REB 16.03 s of a 27.04 s track).
  Affects nothing in the tree — record only.
  *Found by Dev during implementation.*

- **Gap** (non-blocking): the release-ordering picture, now measured file by file against live
  R2 rather than assumed:
  | file | live | after this story | action |
  |------|------|------------------|--------|
  | `finish_ground.wav` | **404** | 16.0 s | upload — closes the live bug |
  | `towers_theme.wav` | 2,596,056 B (~27 s) | 1,057,008 B (~11 s) | re-upload — CONTENT change |
  | `theme_b.wav` | 830,516 B | 830,516 B | byte-identical, no-op |
  | `space_theme.wav` | 607,956 B | 607,956 B | byte-identical, no-op |
  sw8-12's asset obligation is therefore already DISCHARGED (both its files are live and
  byte-identical to a fresh bake) — the only outstanding item is that sw8-12's CODE is not yet
  released. The ordering constraint TEA flagged survives but narrows to `towers_theme.wav`
  alone: uploading the 11 s towers before this code ships would strip REB from the loop while
  production still has no working `finishGround`, losing the rebel finish entirely. Correct
  order stands — `just deploy-assets` immediately before/with `just release star-wars`.
  Affects the orchestrator `just deploy-assets` step and the release checklist.
  *Found by Dev during implementation.*

### Reviewer (code review)

- **Conflict** (blocking, RECORD-ONLY — no code change): **Dev's release-ordering finding above
  is wrong on its central premise, and it is headed for the Impact Summary.** It claims
  "production still has no working `finishGround`", concluding that `deploy-assets` must wait
  for the release. Verified against `origin/main` (v0.0.31, the deployed code): production
  **already carries the cue** — `src/shell/audio.ts` fetches `finish_ground.wav` (1 ref) and
  `src/core/sim.ts` fires `{ type: 'tune', tune: 'finishGround' }` (1 ref). The fetch path is
  live; only the ASSET is missing. Two consequences: (a) `just deploy-assets` uploads the new
  11 s towers **and** `finish_ground.wav` in the SAME run — you cannot get one without the
  other — so the "strip REB from the loop while nothing replaces it" window does not exist;
  (b) running it is not merely safe but **urgent**, because it fixes a live 404 against
  already-deployed code, with no release required. The correct guidance is the inverse of what
  is written: run `just deploy-assets` promptly after merge; the release is independent. Note
  this matches the precedent already set for space — R2 serves the TH5-only `space_theme.wav`
  while production still runs pre-sw8-12 code, i.e. assets legitimately lead code here.
  Affects the sw8-14 Impact Summary and the release checklist — **SM must not copy the
  original ordering rationale into the archive.**
  *Found by Reviewer during code review.*

- **Improvement** (non-blocking): four comment-accuracy defects, **filed as sw8-15** (1 pt,
  chore, trivial, star-wars) rather than bounced, since none blocks: the "ringing twice" prose
  in `audio.ts:83` and `gen-music-data.mjs:270` asserts a double-play that never audibly
  occurred (the cue always hit a 404 — Dev's own Correction finding says so, but the source
  comments never got it); `events.ts:217` and `bake-music.test.mjs:201` both say "five" over
  seven-member lists; and `bake-music.mjs`'s CLI silently bakes ZERO files on an unknown
  `--only` value.
  Affects `star-wars/src/shell/audio.ts`, `tools/music-bake/gen-music-data.mjs`,
  `src/core/events.ts`, `tools/music-bake/bake-music.test.mjs`, `tools/music-bake/bake-music.mjs`
  (all owned by **sw8-15**).
  *Found by Reviewer during code review.*

## Impact Summary

_Compiled by SM at finish from the Delivery Findings, with the Reviewer's correction applied.
Written by hand rather than scraped: the scraper concatenates every phase's findings and would
have carried Dev's superseded release-ordering rationale into the permanent record — the exact
failure this project has hit before._

**Upstream Effects:**

- ⚠ **OPS — RUN `just deploy-assets` PROMPTLY (do not wait for a release).** This is the one
  action that completes the story in production. `finish_ground.wav` is a **live 404** today
  (verified twice, by Dev and Reviewer), and production `main` @ v0.0.31 **already fetches it
  and already fires the cue** — so the asset upload alone fixes the silent rebel finish
  against already-deployed code. One `deploy-assets` run uploads the new
  `towers_theme.wav` (~27 s → ~11 s) **and** `finish_ground.wav` together; you cannot get one
  without the other, so there is no window where towers loses REB with nothing replacing it.
  **Superseded:** TEA's and Dev's findings both say to hold the upload until the release, on
  the premise that "production has no working `finishGround` fetch path". That premise is
  false — Reviewer verified the path exists on `origin/main`. Do not follow the original
  ordering advice.
- ✅ **sw8-12's asset obligation is DISCHARGED.** `theme_b.wav` and `space_theme.wav` are live
  and byte-identical to a fresh bake. What remains outstanding for sw8-12 is only that its
  CODE is unreleased — production still runs pre-sw8-12 behaviour while R2 already serves the
  post-sw8-12 assets. That assets-lead-code state is established and accepted here.
- **Production asset content changes:** `towers_theme.wav` drops from 2,596,056 B to
  1,057,008 B. This is intended — REB moved to its own file at the ROM's own cue moment.
- **Follow-up filed: sw8-15** (1 pt, chore, trivial, star-wars) — comment accuracy (the
  "ringing twice" prose overstates a double-play that never audibly occurred; three catalogue
  counts read "five" against seven members) plus a silent `--only <unknown>` no-op in the bake
  CLI. Nothing was descoped without an owner.
- **No unguarded gap left by this story except one, stated plainly:** nothing in the suite
  compares R2 against the bake, so a stale bucket stays invisible to CI. That is why the
  deploy-assets step above is called out rather than assumed.

**Blocking:** None. Reviewer verdict APPROVED — no Critical or High findings; 8-mutation
battery returned 0 survivors; 1953/1953 tests and `tsc` clean on the merged base.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 net-new (3 pre-existing `console.log` in CLI tooling) | confirmed 0, dismissed 1, deferred 0 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed directly (mutation battery M1-M8, CLI `--only` probe) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed directly (found the `--only` silent no-op, filed sw8-15) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed directly (8-mutation battery; 0 survivors) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed directly (4 stale/false comments found, filed sw8-15) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain assessed directly (four-catalogue key agreement proven) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — domain assessed directly (build tooling, no untrusted input; see Rule Compliance) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain assessed directly (no new abstractions; diff is data relocation) |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — domain assessed directly (javascript.md walked rule by rule below) |

**All received:** Yes (1 enabled specialist returned; 8 disabled via `workflow.reviewer_subagents`, each domain assessed directly and recorded above)
**Total findings:** 2 confirmed (1 Medium record-defect, 1 Low bundle → sw8-15), 1 dismissed (pre-existing `console.log` in CLI tooling — these are the bake scripts' user-facing progress output, not debug leftovers; `bake-music.mjs:250` prints the per-file summary `just deploy-assets` relies on), 0 deferred

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **The towers track DROPS its `REB` tail — scope widened past the story title**
  - Spec source: context-story-sw8-14.md, "Open question routed to TEA"; story title
    (session file), which names only TUNE_SPEC + OUTPUT_FILES + the carve-out
  - Spec text: "TEA must settle, from the ROM callers rather than from convenience,
    whether the towers track keeps its `REB` tail once the standalone one-shot exists…
    Either answer is defensible; the one that is not defensible is picking silently."
  - Implementation: ruled SPLIT. `music-data.test.mjs` now pins `towers → ['SW4']`
    (was `['SW4','REB']`), and a new catalogue-wide test pins every ROM tune to
    EXACTLY ONE home so `REB` cannot sit in both the towers track and the new
    `finishGround` tune.
  - Rationale: the ROM fires them as two separate cues at two different times —
    `JSR PM4TH` at ground **init** (WSMAIN.MAC:1636, `PH.TIM` freshly zeroed) and
    `JSR PMREB` from the per-frame `PHEGD` at `PH.TIM == 14` (WSMAIN.MAC:1673).
    sw6-1 concatenated them only because "our engine has no notion of a timed
    one-shot follow-on" (music-data.test.mjs:264-269) — a premise sw7-18 KILLED when
    it shipped the `finishGround` cue in `sim.ts:940`. So today `REB` already rings
    twice: once per iteration of the LOOPING towers track, and once from the core's
    one-shot. That is the identical double-play sw8-12 fixed for `THB`, still live
    for `REB`. Adding `finishGround` to the bake without this would harden the
    double-play into a reproducible asset.
  - Severity: major
  - Forward impact: `towers_theme.wav` gets SHORTER (4TH only) and must be
    re-uploaded — see the blocking Delivery Finding on release ordering. Dev
    re-seats `ROM_MAPPING`/`ROM_TUNE_INDICES` in `music-data.test.mjs`. The audible
    result (REB once, at the ROM's moment) is the Reviewer's to verify.

- **The manifest-agreement test's positional scrape replaced with a block-bounded parse**
  - Spec source: story title — "drop the carve-out in bake-music.test.mjs's
    manifest-agreement test"
  - Spec text: drop the carve-out (the `const { finishGround, ...bakedTunes }` destructure)
  - Implementation: the carve-out is dropped AND `scrape(marker, count)` is replaced by
    a parse bounded to the object literal, so the assertion sees every manifest entry.
  - Rationale: dropping the destructure alone leaves the deeper mask intact. The old
    helper stops after `count` matches, so the next tune added to `audio.ts` without a
    bake entry would again pass silently — the exact "test that agrees by not looking"
    sw8-12 named. A carve-out removed while its mechanism survives is a fix in
    appearance only.
  - Severity: minor
  - Forward impact: the manifest count is no longer a magic number Dev must remember
    to bump; a future tune with no `OUTPUT_FILES` entry fails loudly.

- **`themeB` added to the bake quality gate alongside `finishGround` (test-only)**
  - Spec source: context-story-sw8-14.md, Scope — "In scope: … any sibling pin re-seat
    that the change forces"
  - Spec text: scope is `finishGround`
  - Implementation: the sw7-8 "bakes to real audio, not silence" list gains BOTH
    `finishGround` (RED) and `themeB` (passes on arrival).
  - Rationale: sw8-12 added `themeB` to `TUNE_SPEC` and `OUTPUT_FILES` but not to this
    gate, so a silent or clipped `theme_b.wav` would ship green today — the same
    uncovered-baked-asset hole this story exists to close, one array entry away, in
    the very list I am editing. Writing the guard for one sibling while knowingly
    leaving the other bare is not a defensible test design.
  - Severity: minor
  - Forward impact: none beyond ~8s more bake time in the suite; no source change.

### Dev (implementation)

- **Re-seated the track-voice count pin 20 → 16 (a test TEA did not re-seat)**
  - Spec source: the RED contract — `music-data.test.mjs`, "gives every one of the 20
    track voices real music, terminated properly"
  - Spec text: `expect(voices).toHaveLength(20)`, commented "5 segments x 4 voices
    since sw8-12 moved THB to the TUNES catalogue"
  - Implementation: 16, commented "4 segments x 4 voices: every track is
    single-segment since sw8-14 moved REB…"
  - Rationale: pure arithmetic from the ruling TEA already pinned in three other
    places (`ROM_MAPPING`, `ROM_TUNE_INDICES`, the AC-6 segment pin). Dropping the
    towers REB segment removes exactly four track voices; the same test's own comment
    records the identical 24→20 re-seat sw8-12 made. Coverage is not lost — REB's four
    voices are walked by `tune-data.test.mjs`'s "every tune carries four raw voice
    streams, each properly terminated", which iterates `TUNE_ROM` and now includes
    `finishGround`. I did NOT weaken the assertion (it is still an exact count).
  - Severity: minor
  - Forward impact: none. Flagged for the Reviewer because a Dev editing a test count
    is exactly the move that hides a real regression — the cross-check to run is that
    `allVoices()` still equals 4 tracks × 4, and that the tune-side walk covers REB.

- **Re-anchored two audit citation line numbers (U-009, U-024) after a comment insertion**
  - Spec source: story scope — the ACs touch only the bake pipeline
  - Spec text: no AC mentions `docs/audit/findings/pair-audio.json`
  - Implementation: `ours.line` 92 → 98 (U-009) and 143 → 149 (U-024) in
    `pair-audio.json`; nothing else in either finding changed.
  - Rationale: forced, not chosen. The 6-line `MUSIC.towers` comment TEA asked for
    shifted two lines that the citation gate pins verbatim, and `tests/audit/citations`
    went red on both. Only the line NUMBERS moved — both `verbatim` strings still match
    their new lines exactly, so this is a re-anchor, not a re-citation. I deliberately
    did NOT touch `remediated_by` (no defect was removed), and left the stale inline
    "audio.ts:79"/"audio.ts:94" references in the `claim` prose alone: they predate this
    story, the gate does not read them, and rewriting an auditor's claim text to tidy
    numbers would corrupt the record.
  - Severity: minor
  - Forward impact: none — but any future edit to `src/shell/audio.ts` above line 98
    will shift these again. Re-run `npm test -- citations` after ANY edit to that file.

### Reviewer (audit)

All five logged deviations audited. No undocumented deviation found — I diffed the
implementation against the RED contract and every departure was already logged.

- **TEA: towers drops its `REB` tail (scope widened past the story title)** → ✓ **ACCEPTED**.
  The ROM citations are exact — I re-derived them from the primary source independently:
  `JSR PM4TH` is at WSMAIN.MAC:**1636** and `JSR PMREB` at :**1673**, and the guard is
  `CMPA #14.` at :1671 — the trailing dot forces DECIMAL, so 14 is 14 and not 0x14=20. That
  radix trap is the one this repo has been bitten by before and it was handled correctly.
  The scope widening was explicitly delegated to TEA by the SM context, and the alternative
  (add `finishGround`, keep `REB` in towers) would have baked a double-play into a
  reproducible asset. Sound ruling, correctly evidenced.
- **TEA: positional scrape replaced with a block-bounded parse** → ✓ **ACCEPTED**. Mutation M6
  proves the bound is load-bearing (removing it fails 2 tests), and the guard-the-guard test
  is not vacuous. The `=== -1` checks are the rule-#4-correct form — `indexOf` returns a
  falsy `0` for a marker at byte 0, and `if (!start)` would have been a latent bug.
- **TEA: `themeB` added to the bake quality gate** → ✓ **ACCEPTED**. Closes a real
  uncovered-asset hole sw8-12 left, in the one list `finishGround` had to join; test-only,
  no source consequence. Cheaper here than as a separate story.
- **Dev: track-voice count pin 20 → 16** → ✓ **ACCEPTED**, and I ran the cross-check Dev
  asked for rather than taking it on trust. `allVoices()` = 4 tracks × 1 segment × 4 voices
  = 16, arithmetically forced. Coverage is NOT lost: `tune-data.test.mjs`'s "every tune
  carries four raw voice streams, each properly terminated" walks `TUNE_ROM`, which now
  includes `finishGround`. Mutation M7 confirms the pin is still exact — restoring `20`
  fails. This is the move that most often hides a regression; here it does not.
- **Dev: re-anchored U-009 / U-024 citation line numbers** → ✓ **ACCEPTED**. Line numbers
  only (92→98, 143→149), both `verbatim` strings still match their new lines, `remediated_by`
  correctly untouched — the repo has been burned before by writing a phantom fix into the
  audit, and that trap was avoided. Leaving the stale inline `audio.ts:79`/`:94` references
  in the auditors' `claim` prose was the right call: the gate does not read them, and editing
  an auditor's claim text to tidy numbers corrupts the record.

## Sm Assessment

**Story:** sw8-14 — 1pt chore, star-wars, tdd. A reproducibility gap, not a
behaviour change: `finish_ground.wav` ships and plays today, but exists only in R2
and cannot be rebuilt from this repo.

**Setup state found:** partial. A session skeleton and the branch
`feat/sw8-14-music-bake-finish-ground` already existed (clean, even with
`origin/develop`); the session was missing Repos/Branch/Assignee and the story was
still `backlog`. Completed rather than re-cut — no new branch.

**Pre-handoff checks:**
- Merge gate: **clear** — `gh pr list -R slabgorb/star-wars --state open` returns `[]`.
- Sibling-checkout race: **none** — fetched and grepped `origin/develop`; the only
  recent sw8 hit is sw8-12's own merge (32d5cbc), which is the story that *filed*
  this one.
- Branch: exists, clean, 0 ahead / 0 behind `origin/develop`.
- Jira: **skipped deliberately** — this project has no Jira; `jira_key` is the story id.
- Context: **hand-authored**, not the `pf context create` stub. Committed at 506410c
  so it survives any later regeneration. Do not regenerate it.

**Routing notes for TEA (Mr. Praline):**
- The quarry is pre-extracted in `sprint/context/context-story-sw8-14.md`: the
  sw8-12 archive finding that filed this story, plus verified line anchors for
  `TUNE_SPEC`, `TRACK_SPEC`, `OUTPUT_FILES`, and the carve-out to remove.
- **One open question is routed, not answered:** `REB` / TUNTAB 19-22 already
  renders as the towers track's tail segment, so adding a standalone `finishGround`
  makes the same ROM tune render into two files. Whether towers keeps its `REB`
  tail is a ROM-caller question (WSMAIN.MAC:1636 `PM4TH`, :1673 `PMREB` — two
  separate `JSR PM*` sites) and belongs to TEA's contract. Either answer is
  defensible; picking silently is not. A towers change forces a `music-data.test.mjs`
  segment-pin re-seat.
- No ACs exist in the sprint YAML — TEA defines them in RED. The context lists the
  expected contract *shape*, not the wording.
- Standing ops obligation inherited from sw8-12: assets go live only via the
  orchestrator's `just deploy-assets`, ordered against the next star-wars release.
  Carry it into the Impact Summary; do not silently overwrite a production asset.

**Scope discipline:** anything found outside the bake-pipeline scope must be filed
as a story (`pf sprint story add`), not left as an archive note.

**Verdict:** setup complete, gate conditions met, handing off to TEA for RED.

## TEA Assessment

**Tests Required:** Yes
**Reason:** n/a — this is a chore by points, but it changes generated audio DATA and a
production asset's contents. The chore bypass (docs/config/deps/covered-refactor) does not
apply to a change that alters what the cabinet plays.

**Test Files:** (all modified, none new — the pins for this pipeline already had homes)
- `tools/music-bake/tune-data.test.mjs` — seats `finishGround` in the ROM oracle (`REB`,
  TUNTAB 19-22 → `REBV1..REBV4`, read off SWMUS.MAC:27) and widens the catalogue to seven.
- `tools/music-bake/music-data.test.mjs` — re-rules `towers` to `['SW4']` (`ROM_MAPPING`,
  `ROM_TUNE_INDICES`, the AC-6 pin, and the AC-4 radix-trap pin that reads the same table),
  plus a new `sw8-14` suite pinning every ROM tune to exactly one home.
- `tools/music-bake/bake-music.test.mjs` — drops the carve-out, replaces the positional
  scrape with a literal-bounded parse, and seats `finishGround` + `themeB` in the
  real-audio/no-clipping gate.

**Tests Written:** 6 new tests + 6 re-seated pins, covering 4 ACs (below)
**Status:** RED — 9 failing across the three suites, 58 passing, no parse or import errors.
Verified by `testing-runner` (run `sw8-14-tea-red`, 100 s wall clock).

### Acceptance criteria (defined here — the sprint YAML carried none)

| AC | Criterion | Pinned by | RED today |
|----|-----------|-----------|-----------|
| AC-1 | `finishGround` renders to real, unclipped, ROM-scale audio (≥12 s; measured 16.03 s) through the same gate as its siblings | `bake-music.test.mjs` — "bakes finishGround to real, unclipped audio…" | yes — `unknown track "finishGround"` |
| AC-2 | `OUTPUT_FILES` equals the shell `MUSIC` + `TUNES` manifests **whole**, no destructured exception, and the comparison is bounded to each literal rather than to a remembered count | `bake-music.test.mjs` — "emits filenames that AGREE…" + "scrapes each manifest WITHIN its own literal" | yes — missing `finishGround` |
| AC-3 | The `finishGround` segment resolves TUNTAB 19-22 to `REB` / `REBV1..REBV4`, one segment, four terminated voices | `tune-data.test.mjs` ×3 | yes — `TUNES.finishGround` undefined |
| AC-4 | `REB` lives in exactly one place — the `finishGround` tune, never also the `towers` loop — and no ROM tune is dropped or double-homed | `music-data.test.mjs` — the `sw8-14` suite ×4, plus the re-seated AC-5/AC-6/AC-4 pins | yes ×3 (and the double-home guard is the trap-catcher for the naive fix) |

**The trap this contract is built around:** the tempting one-line change is to add
`finishGround` to `TUNE_SPEC` and stop. That leaves `REB` in `TRACK_SPEC.towers` and bakes a
double-play into a reproducible asset. "double-homes nothing at all" and "gives REB one home
only" pass today and fail on that change — they exist to catch the fix, not the bug.

### Rule Coverage

Checklist: `.pennyfarthing/gates/lang-review/javascript.md` (the changed files are `.mjs`).
No `.claude/rules/*.md` and no `SOUL.md` exist in this repo.

| Rule | Test(s) / evidence | Status |
|------|--------------------|--------|
| #1 silent error swallowing | `scrapeManifest` throws on a missing marker or unclosed literal; the old helper returned `{}` silently and that is exactly how the gap hid | enforced in RED |
| #4 equality & falsy coercion | `scrapeManifest` guards with `=== -1`, not `if (!start)` — `indexOf` legitimately returns falsy `0` for a marker at byte 0 | enforced in RED |
| #7 regex safety | `g` flag used only with `matchAll` (never stateful `test()`); no nested quantifiers, no user input in `RegExp` | enforced in RED |
| #8 test quality | no `toBeTruthy`, no vacuous `not.toThrow`, no `.only`/`.skip`, no snapshots; every new assertion compares exact values — grep-verified over the added lines | enforced in RED |
| #9 module & scope | `const` throughout; no `var` added | enforced in RED |
| #10 error handling | both throws are `Error` objects with descriptive, marker-naming messages | enforced in RED |
| #2, #3, #5, #6, #11, #12 | not applicable — no async, no user input, no DOM, no child_process/fs-write, no deps or secrets touched in these test files | n/a |

**Rules checked:** 6 of 6 applicable lang-review rules have coverage; 6 are not applicable.
**Self-check:** 0 vacuous tests found in what I wrote. I did not find vacuous tests in the
pre-existing suites, but I did find a *masking* one — the count-bounded `scrape` — and replaced
its mechanism rather than only removing the carve-out it was hiding behind.

**Handoff:** To Dev (Bicycle Repair Man) for implementation. Two source files carry the whole
change — `gen-music-data.mjs` (`TUNE_SPEC` += `finishGround`, `TRACK_SPEC.towers` -= `REB`) and
`bake-music.mjs` (`OUTPUT_FILES` += `finishGround`, and the stale `buildFeeds` docstring).
Note `music-data.mjs` is GENERATED — regenerate it, do not hand-edit; its header and the
provenance tests say so.

## Dev Assessment

**Status:** GREEN — 1953/1953 tests pass across 185 files, 0 skipped; `tsc --noEmit` clean.
Verified by `testing-runner` (run `sw8-14-dev-green-2`, full suite, 100 s).
**Branch:** `feat/sw8-14-music-bake-finish-ground`, pushed. No PR (SM opens it at finish).

**Files changed (6):**

| File | Change |
|------|--------|
| `tools/music-bake/gen-music-data.mjs` | `TUNE_SPEC` += `finishGround` (REB, TUNTAB 19-22); `TRACK_SPEC.towers` −= `REB`; caller-table and one-shot comments updated |
| `tools/music-bake/music-data.mjs` | REGENERATED via `node tools/music-bake/gen-music-data.mjs` — never hand-edited |
| `tools/music-bake/bake-music.mjs` | `OUTPUT_FILES` += `finishGround`; corrected the stale `buildFeeds` docstring and the `CATALOGUE` comment |
| `src/shell/audio.ts` | `MUSIC.towers` gains the loop-vs-one-shot divergence note (TEA's Question finding) |
| `docs/audit/findings/pair-audio.json` | re-anchored U-009 (92→98), U-024 (143→149) — line numbers only |
| `tools/music-bake/music-data.test.mjs` | track-voice count 20 → 16 (see deviation) |

**AC status:** all four met.
- **AC-1** — `finishGround` bakes to 16.0 s, peak 0.595, unclipped, through the shared gate.
- **AC-2** — `OUTPUT_FILES` equals both manifests whole; the bounded-scrape guard passes.
- **AC-3** — segment resolves `REB` / `REBV1..REBV4`, one segment, four terminated voices.
- **AC-4** — `REB` has exactly one home; the double-home guard and the "covers every ROM tune"
  sweep both pass. I did NOT take the shortcut those tests exist to catch.

**Beyond the unit tests — the deliverable actually runs.** The CLI path is what
`just deploy-assets` invokes and no unit test drives it, so I ran it end to end:
`node tools/music-bake/bake-music.mjs <dir>` writes all **11** files (4 MUSIC + 7 TUNES),
`finish_ground.wav` among them at 16.0 s. Before this change it wrote 10 and could not
produce that file at all.

**Data integrity proof.** REB is RELOCATED, not re-derived: its four voice byte streams and
`voiceLabels` are byte-identical before and after (diffed the old `music-data.mjs` against the
new via `git show HEAD:`), `SW4` is untouched, and towers went 2 segments → 1. So the ROM data
did not change — only which catalogue entry owns it.

**Three regressions found and fixed during GREEN** (first full-suite run was 3 red, not 0):
1. `music-data.test.mjs` 20-voices pin — arithmetic fallout of the segment drop; re-seated to
   16 with the tune-side coverage cross-check written into the comment. Logged as a deviation.
2. + 3. `tests/audit/citations` ×2 — the `audio.ts` comment shifted two pinned lines. Re-anchored
   U-009 and U-024. Logged as a deviation; `remediated_by` deliberately untouched.

**Two findings that change the story's premise** — see Delivery Findings, both recorded there
in full: `finish_ground.wav` is a **404 in production today** (never uploaded, not merely
unreproducible), so this is a live fix; and the double-play TEA ruled against was **latent**,
not live — it is what uploading the asset would have created. The measured release picture is
in the third finding: only `towers_theme.wav` carries an ordering constraint; sw8-12's two
assets are already live and byte-identical to a fresh bake.

**Scope:** nothing descoped. TEA's non-blocking Improvement (stale docstring) and Question
(`audio.ts` comment) are both DONE in this commit rather than deferred; no follow-up story is
owed.

**Handoff:** To Reviewer (The Argument Professional). Worth their attention: the towers/REB
ruling is the load-bearing decision here and it changes a production asset — the ROM evidence
is WSMAIN.MAC:1636 vs :1673; and a Dev editing a test count (deviation 1) deserves the
cross-check I named there.

## Reviewer Assessment

**Verdict:** APPROVED — no Critical or High findings. 1 Medium (a record defect, not code)
and 1 Low bundle, **filed as sw8-15**.

**Data flow traced:** SWMUS.MAC `.BYTE` streams (radix-16, trailing-dot-decimal) →
`gen-music-data.mjs` `TUNE_SPEC.finishGround` → `parseTuntab()` resolves TUNTAB 19-22 →
`REBV1..REBV4` → generated `music-data.mjs` `TUNES.finishGround.voices` → `bake-music.mjs`
`CATALOGUE` → `buildFeeds` → vendored POKEY → `finish_ground.wav` → R2 → `audio.ts` `TUNES`
fetch → `TUNE_CHANNELS.finishGround = 'tune'` → cued by `sim.ts:940`. **Safe because every
link is pinned**: I proved all four catalogues carry the identical 7 keys
(`events.ts` `TuneName` union, `audio.ts` `TUNES`, `music-data` `TUNES`, `OUTPUT_FILES`
tune subset) — a mismatch anywhere in that chain is a 404, i.e. silence, which is the exact
bug this epic exists to end.

**Pattern observed:** ROM-caller-truth over entry-point labels, applied consistently —
`gen-music-data.mjs:250-270`. The comment block earns its keep by naming the *callers*
(`PHIGD` vs `PHEGD`) rather than the tune labels, which is what makes the split defensible
rather than aesthetic. This is the same discipline as the `⚠ PMBEN is NOT the towers theme`
warning directly above it.

**Error handling:** `scrapeManifest` (`bake-music.test.mjs:85-95`) throws a named `Error` on
a missing marker or unclosed literal where the old helper returned `{}` silently — a genuine
improvement, since that silence is how the gap survived two stories. **Counter-example found:**
`bake-music.mjs:236` `if (only && only !== track) continue` — an unknown `--only` value bakes
ZERO files and exits 0. Probed, not assumed: `--only finishGroundd` → 0 files, exit 0;
`--only finishGround` → 1 file. It bypasses `bakeTrack`'s own `unknown track` throw, and the
same CLI *does* validate unknown flags — inconsistent. Pre-existing, non-blocking → sw8-15.

### Observations

1. `[VERIFIED]` **The towers/REB ruling is ROM-correct.** Evidence: `JSR PM4TH` at
   WSMAIN.MAC:1636 (in `PHIGD`, phase entry, `PH.TIM` just zeroed) and `JSR PMREB` at :1673
   (in the per-frame `PHEGD`, guarded by `CMPA #14.` at :1671). Two callers, two moments —
   re-derived from the primary source myself, not taken from the diff's comments. Complies
   with CLAUDE.md's "prefer the original 1983 source over the disasm" rule.
2. `[VERIFIED]` **The ROM data was relocated, not re-derived.** `REB`'s four voice byte
   streams and `voiceLabels` are byte-identical before/after (old `music-data.mjs` from
   `git show HEAD:` vs regenerated), `SW4` untouched, towers 2 segments → 1. So no tune was
   silently re-transcribed under cover of a refactor.
3. `[VERIFIED]` **`music-data.mjs` was regenerated, not hand-edited** — the header and
   provenance tests demand it, and the generator's own console summary reports
   `4 tracks + 7 tunes, 44 voices`. The sha256 provenance pins still pass.
4. `[MEDIUM]` **Dev's release-ordering finding is wrong on its premise** and would have gone
   into the permanent Impact Summary. `origin/main` (v0.0.31 = production) already fetches
   `finish_ground.wav` and already fires the cue — so `deploy-assets` should run *promptly*,
   not wait for the release. Full correction recorded in Delivery Findings. Record-only, no
   code change.
5. `[LOW]` **Two shipped comments assert a double-play that never audibly happened**
   (`audio.ts:83`, `gen-music-data.mjs:270`) — the cue always hit a 404. Dev's own Correction
   finding establishes this; the source comments did not receive it. → sw8-15.
6. `[LOW]` **Three catalogue counts read "five" against seven members** —
   `events.ts:217`, `bake-music.test.mjs:201`, and (defensibly, so NOT filed)
   `gen-music-data.mjs:91`, which is explicitly scoped "(sw7-8)" and describes why flattening
   exists rather than inventorying the catalogue. → sw8-15.
7. `[LOW]` **`--only <unknown>` silently bakes nothing** (`bake-music.mjs:236`). → sw8-15.
8. `[VERIFIED]` **Every guard can actually fail.** With 8 of 9 specialists disabled, I ran an
   8-mutation battery instead of re-reading: OUTPUT_FILES entry removed, REB double-homed,
   TUNTAB index off-by-one, tune mislabelled, finishGround pointed at the 0.44 s knell,
   scrape bound removed, voice pin loosened to 20, and the shell manifest entry removed.
   **8 caught, 0 survivors.** The double-home trap (M2) fails 6 tests — the naive one-line
   version of this story cannot land.
9. `[VERIFIED]` **No stale sibling pins left behind.** Grepped for `4TH then REB` and
   two-segment towers assumptions; the only hit is `music-data.test.mjs:264`, which is the
   historical DECISION record and remains true as written (the *cabinet* does play them in
   sequence) with the re-rule appended directly beneath it.
10. `[VERIFIED]` **Branch is not stale.** `git merge origin/develop` in a scratch worktree →
    "Already up to date"; the branch sits 2 ahead of `origin/develop` and contains td1-9
    (`ccd9282`). Full suite re-run on that tree: 1953/1953, `tsc` clean.

### Rule Compliance — `.pennyfarthing/gates/lang-review/javascript.md`

Changed `.mjs`/`.ts` files walked rule by rule. No `.claude/rules/*.md` or `SOUL.md` exists
in this repo; CLAUDE.md's ROM-fidelity and core/shell rules are folded in.

| # | Rule | Every governed instance in the diff | Verdict |
|---|------|--------------------------------------|---------|
| 1 | Silent error swallowing | `scrapeManifest` (2 throws, both named); `buildFeeds`; the CLI arg parser; `bakeTrack`'s `unknown track` throw | **1 violation** — `bake-music.mjs:236` `--only` no-op (pre-existing) → sw8-15 |
| 2 | Promise/async pitfalls | None — every changed function is synchronous; no `await`, no `.then`, no `forEach` with an async callback anywhere in the diff | pass (vacuously) |
| 3 | Prototype pollution | `{ ...MUSIC, ...TUNES }`, `{ ...music, ...tunes }`, `entries[key] = file` — all keyed by a regex-matched `\w+` from a repo-owned source file, never user input; no `Object.assign` on external data | pass |
| 4 | Equality / falsy coercion | `start === -1`, `end === -1` (the falsy-`0` trap, correctly avoided); `only !== track`; `n !== lastF`; `f.audc !== lastC`; `seg.tune` comparisons — all strict, no `==` introduced | pass |
| 5 | DOM / browser security | No `innerHTML`, `document.write`, or `eval` in the diff. `audio.ts` change is comment-only | pass |
| 6 | Node.js specific | No `child_process`, no variable `require`, no secrets. `readFileSync(..., 'utf8')` in the test helper is explicitly encoded; the generator's `'latin1'` read is deliberate and unchanged | pass |
| 7 | Regex safety | `/\/\/[^\n]*/g` and `/(\w+):\s*'([\w.]+\.wav)'/g` — no user input, no nested quantifiers, no catastrophic backtracking; the `g` flag is used with `matchAll`, never with stateful `test()` | pass |
| 8 | Test quality | All new/changed assertions checked: no `toBeTruthy`, no vacuous `not.toThrow`, no `.only`/`.skip`, no snapshots. Exactness independently proven by the 8-mutation battery | pass |
| 9 | Module & scope | `const` throughout; no `var`; no circular imports (`music-data.test.mjs` gained `TUNES` from a module it already imported) | pass |
| 10 | Error handling patterns | Both new throws are `Error` objects with messages naming the failing marker — not bare strings, not message-less | pass |
| 11 | Input validation | No API handler, no user-facing boundary. The only external input is `process.argv`, and unknown *flags* throw — see rule 1 for the *value* gap | pass (with #1's exception) |
| 12 | Dependency/config hygiene | No dependency change; no secrets; the 3 `console.log` calls are the bake CLI's intended progress output (`just deploy-assets` reads it), not debug leftovers | pass |
| 13 | Fix-introduced regressions | The three GREEN-phase fixes re-scanned: the voice-count re-seat kept an exact assertion (M7 proves it), and the citation re-anchor changed only integers — no new instance of #1-#12 | pass |

**Tenant isolation:** not applicable — this is a single-player browser game with no backend,
no auth, and no multi-tenant data. There are no trait methods handling tenant data and no
structs with tenant fields. Recorded explicitly rather than skipped.

### Devil's Advocate

Let me argue this change is broken. The strongest case: **it makes production worse before it
makes it better.** The moment this merges, `towers_theme.wav` on R2 is stale relative to the
repo — and the story's whole premise is that a bucket wipe loses assets. We have now created a
second file whose R2 copy diverges from what the pipeline produces. If nobody runs
`deploy-assets`, the divergence is permanent and invisible: every test passes, the bake is
reproducible, and production quietly plays a 27-second towers loop the repo can no longer
justify. The suite cannot catch this, because no test compares R2 against the bake. That is a
real, unguarded gap — and it is precisely the class of bug this epic exists to end, merely
moved from `finish_ground.wav` to `towers_theme.wav`. I pressed on it and concluded it is
**mitigated but not eliminated**: the two blocking Delivery Findings name the upload
explicitly, and my corrected finding makes it urgent rather than deferred. But the honest
statement is that this story's correctness now depends on an ops step no test enforces.

Second line of attack: **is the ruling itself over-reach for a 1-point chore?** A reviewer
should be suspicious when a "chore" changes a production asset's content by 60%. If the ROM
reading were wrong, we would be shipping a mutilated towers theme fleet-wide on the authority
of one agent's reading. That is why I re-derived the line numbers from the primary source
rather than trusting the diff's own comments — 1636 and 1673 are correct, the `CMPA #14.`
radix is correct, and `sim.ts:940` genuinely already cues the tune. The evidence holds.

Third: **what if `finishGround` never actually fires in the surface phase?** The cue is
speed-threshold-based (`SURFACE_FINISH_GROUND_SPEED`), not PH.TIM-based — an adaptation from
sw7-18, not this story. If the player dies early or the phase ends before the threshold, the
tune never plays and REB is now heard *nowhere*, where before it at least rang in the loop.
This is a genuine behavioural narrowing that no test in this story covers. I checked:
`tests/core/surface-traversal-end.test.ts:226` pins "cues exactly one finishGround tune during
the surface traversal" and :251 pins the space-run negative, so the fire path is guarded for
the nominal traversal — but the early-death case is not pinned here and is inherited from
sw7-18's contract, not introduced by this diff. Not a blocker; worth knowing.

Fourth: a confused maintainer reading `audio.ts:83` will believe REB used to ring twice and
may "verify" that by listening to production, hear it once, and conclude the fix already
shipped. That is the concrete harm behind finding 5, and it is why I filed rather than waved
it through.

**Handoff:** To SM for finish-story. **SM: do not copy Dev's release-ordering rationale into
the Impact Summary — use the Reviewer correction in Delivery Findings.** The story is
incomplete in production until `just deploy-assets` runs, and that run is safe to do
immediately after merge.