---
story_id: "jt5-6"
jira_key: "jt5-6"
epic: "jt5"
workflow: "tdd"
---
# Story jt5-6: SNPCR2 — give player 2 its own transporter cue instead of P1's

## Story Details
- **ID:** jt5-6
- **Jira Key:** jt5-6 (local tracking only — no Jira integration; `is_jira_enabled()` returns False for this project, per CLAUDE.md "No Jira — issue tracking is local via sprint/ YAML files")
- **Epic:** jt5 — Joust audio — the sound subsystem joust shipped without
- **Workflow:** tdd
- **Repos:** arcade
- **Points:** 5 (re-pointed 2 → 5 by the user's 2026-08-02 full-scope ruling — see below)
- **Priority:** p3
- **Stack Parent:** none (no dependencies; `depends_on` field is unset)
- **Branch:** main
- **PR:** none

  Trunk-based, so both fields are literal rather than placeholders. The story's six commits
  `51eb0d4..3fa5dfd` landed directly on `main` and are all pushed to `origin`; nothing was merged
  because there was nothing to merge. `.pennyfarthing/repos.yaml` sets `branch_strategy:
  trunk-based` and CLAUDE.md states "There are no per-game remotes, no develop branches and no
  per-game PRs". The `feat/jt5-6-snpcr2-player-2-transporter-cue` ref is NOT a work branch — it was
  pushed empty at `main`'s tip purely as the sibling-visibility signal a concurrent checkout probes
  with `git branch -r | grep jt5-6`, and it is deleted at finish.
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch `main`; `.pennyfarthing/repos.yaml` sets `branch_strategy: trunk-based` for the single `arcade` repo entry, `pf.git.repos.should_create_branch()` returns `False`, and CLAUDE.md states "trunk-based — commit straight to main... There are no per-game remotes, no develop branches and no per-game PRs." Three prior jt5 stories — jt5-1, jt5-2, jt5-5 — all recorded the identical decision in their session files. Work therefore lands directly on `main`. **Superseded in part — read the SM ruling in the SM Setup Assessment below:** the setup run declined to create `feat/jt5-6-snpcr2-player-2-transporter-cue` and the SM overrode that, because the branch is not a work branch. It was created at `main`'s tip and pushed with zero commits ahead, purely as the sibling-visibility signal a concurrent checkout probes with `git branch -r | grep jt5-6`. Nothing merges it; it is deleted at finish.)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-02T10:28:04Z
**Repos:** arcade

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-02T09:33:58Z | 2026-08-02T09:39:43Z | 5m 45s |
| red | 2026-08-02T09:39:43Z | 2026-08-02T10:03:47Z | 24m 4s |
| green | 2026-08-02T10:03:47Z | 2026-08-02T10:17:51Z | 14m 4s |
| review | 2026-08-02T10:17:51Z | 2026-08-02T10:28:04Z | 10m 13s |
| finish | 2026-08-02T10:28:04Z | - | - |

## Story Acceptance Criteria

**UPSTREAM CRITERIA — hand-authored by the SM in `sprint/epic-jt5.yaml` after
measuring the ROM (2026-08-02). Reproduced BYTE-FOR-BYTE below per explicit
setup instruction: do not reword, renumber, summarise, split or merge any of
these. If an AC looks wrong, say so in the SETUP_RESULT — do not edit it.**

1. A rom CueSource can express its table's FULL EXTENT — a line span or a second citation — and every one of the seventeen CUE_SOURCES records carries the real extent of its table, not just the defining FCB row. The multi-line tables are SNPCR1 (:8116-8118), SNPTED (:8091-8093) and the new SNPCR2 (:8119-8121); the other fourteen are single-row and must say so rather than being silently ambiguous.

2. Each cue's frame total is DERIVED from its cited extent rather than hand-transcribed in a parallel FRAME_DURATIONS map, and the operands are evaluated as assembler expressions (SNPCR2 is literally 30+13 and 165-13). The totals stay 450 for SNPCR1, 450 for SNPCR2 and 134 for SNPTED. Constraint, not a design ruling: bake-samples.mjs reaches this data under PLAIN node via type stripping, so whatever module holds it must still import nothing.

3. The two knights get DIFFERENT transporter cues: the core's player-materialise moment carries which knight it belongs to, and the dispatch routes player 1 to SNPCR1 and player 2 to SNPCR2. The ROM binds them per decision block — SNPCR1 at P1DEC :5552 and G1DEC :5544, SNPCR2 at P2DEC :5556 and G2DEC :5548.

4. The player-2 cue ships END TO END: a manifest row in audio-manifest.ts, its own SPECS entry in tools/sample-bake/bake-samples.mjs, a baked .wav, and `just deploy-assets` actually run with the new URL verified live (a real 200). A manifest row with no spec aborts the whole recipe under set -euo pipefail, star-wars staging included, so the deploy is part of the story and not a follow-up.

5. CUE_SOURCES.playerMaterialise stops misattributing its call site. Its cited row :5544 is G1DEC's block (label at :5542), while the comment above it asserts "P1DEC's decision block" — P1DEC's row is :5552. The cited line and the prose must name the SAME block, and the "both knights map here for now" sentence must go once they no longer do.

6. bake-samples.mjs's CLI gate survives a checkout reached through a symlink: `process.argv[1] === fileURLToPath(import.meta.url)` (:319) goes false there because the ESM loader realpaths the module URL while argv[1] keeps the caller's spelling, turning the CLI into a silent exit-0 no-op. Compare realpathSync of both sides.

## The User's Scope Ruling (2026-08-02) — record prominently

The story was filed at 2 points and has since accumulated three distinct
workstreams. The user was asked and ruled: **FULL SCOPE, re-pointed 2 → 5**
(already applied to `sprint/epic-jt5.yaml`, currently an uncommitted diff in
the working tree at setup time). All three are in scope for jt5-6:

  (i)   the SNPCR2 player-2 transporter cue, end to end including the
        deploy (AC3, AC4, AC5);
  (ii)  the structural `CueSource` extent fix across all seventeen records,
        folding `FRAME_DURATIONS` back in (AC1, AC2) — routed here by
        jt5-5's TEA, Dev AND Reviewer independently;
  (iii) the one-line `bake-samples.mjs` symlink/realpath CLI-gate fix
        (AC6) — routed here by jt5-2.

The user's stated reasoning for full scope: shipping SNPCR2 the workaround
way would add a SECOND instance of the exact workaround the finding was
filed against.

## Measured Background (verified at setup, 2026-08-02)

Primary source: `reference/williams-source/joust/JOUSTRV4.SRC` (repo root,
NOT `plugins/joust/reference/`). The file is CRLF; read with `awk` and
`tr -d '\r'` — a naive grep can mislead.

### Every ROM claim in the epic description was re-opened and is CORRECT

```
:8116  SNPCR1  FCB  070,!N$12!+$80,30      PLAYER 1 RE-CREATED (TRANSPORTER)
:8117         FCB  !N$14!+$80,255          PLAYER FADING IN  (TRANSPORTER)
:8118         FCB  !N$00!.$7F,165                    -> 30 + 255 + 165 = 450 frames
:8119  SNPCR2  FCB  070,!N$12!+$80,30+13   PLAYER 2 RE-CREATED (TRANSPORTER)
:8120         FCB  !N$15!+$80,255          PLAYER FADING IN  (TRANSPORTER)
:8121         FCB  !N$00!.$7F,165-13                 -> 43 + 255 + 152 = 450 frames
```
The format header at :8045-8049 is byte-exact as quoted, "PIRORITY" typo
included. Same priority (070), same opener (`!N$12!`), same 450-frame
total. They differ in the fade code (`!N$14!` vs `!N$15!`) and in a
13-frame shift moved from the tail to the head.

### The one falsehood in the description — bites this story directly

The description's ":5552, :5556" is correct for `P1DEC`/`P2DEC`. But the
SHIPPED code (`plugins/joust/src/shell/audio.ts`,
`CUE_SOURCES.playerMaterialise.callSite`) cites line **5544**, which
belongs to **`G1DEC`** (label at :5542) — not P1DEC. The comment
immediately above it (audio.ts:244-246) nevertheless asserts "Reached
through the DSNCRE field of **P1DEC's** decision block" — byte-exact
verbatim, so `tests/audio-rom-citations.test.ts` and the citation gate are
green on a misattribution (the gate re-opens only the quoted line and
cannot see what the surrounding prose claims). Measured layout — each
table is bound TWICE, once per family:
```
5542: G1DEC  FDB G1JOY,...   5544: FDB SNPLWU,...,SNPFAL,0,SNPCR1
5546: G2DEC  FDB G2JOY,...   5548: FDB SNPLWU,...,SNPFAL,0,SNPCR2
5550: P1DEC  FDB P1JOY,...   5552: FDB SNPLWU,...,SNPFAL,SNPTREF,SNPCR1
5554: P2DEC  FDB P2JOY,...   5556: FDB SNPLWU,...,SNPFAL,SNPTREF,SNPCR2
```
G-blocks and P-blocks differ in joystick source (G1JOY vs P1JOY) and in the
8th sound slot (`0` vs `SNPTREF`) — different block families, not
duplicates. HAZARD stated loudly: a Dev following only the description
would add SNPCR2 at :5556 (P2DEC) beside the existing (wrong) :5544
(G1DEC) citation — two different block families, silently mismatched. AC5
exists for exactly this; AC3 is the routing fix.

### The one stale claim (not false-at-writing)

"Low value alone; worth folding into jt5-2 if the samples are being
produced anyway." jt5-2 is **done** and archived (completed 2026-08-01),
so the fold-in option has expired. The samples ARE now being produced,
which lowers the marginal cost of one more — that half of the sentence
still holds.

### Three operational facts routed here by jt5-2, still true as of 2026-08-02

- **(A) The sample half has a concrete home.**
  `plugins/joust/src/shell/audio-manifest.ts` holds `SoundName`, `SOUNDS`
  and `FRAME_DURATIONS`, and is dependency-free by design — its own header
  (:10) says "Nothing here may gain an import — that would break the
  deploy-time bake while every vitest stayed green", because the bake
  reaches it under PLAIN `node` via type stripping. `audio.ts:83` imports
  from it and re-exports by identity. **Hard constraint on AC2:** today
  `CUE_SOURCES` lives in `audio.ts`, which DOES import `@shared`, so
  folding `FRAME_DURATIONS` into `CueSource` cannot simply move the data
  into `audio.ts`. TEA/Dev own resolving this; it is the central design
  tension of the story, stated but not prejudged.
- **(B) Expect the deploy to abort until the spec exists, by design.**
  `bakeSamples` throws `no synth spec for manifest cue '<name>' — a new
  cue must arrive with its own sound` (`bake-samples.mjs:305-306`) and `no
  FRAME_DURATIONS entry for '<name>'` (:311); `justfile:274-289` runs
  `deploy-assets` under `set -euo pipefail`, so a manifest row without a
  spec aborts the WHOLE recipe including star-wars staging. Nothing
  uploads; the bucket keeps last-good. This is by design, not a bug.
- **(C) The CLI gate fix (AC6), unfixed today.** `process.argv[1] ===
  fileURLToPath(import.meta.url)` is at `bake-samples.mjs:319`. Compare
  `realpathSync` of both sides — one line.

### Current shipped state of the data (all verified)

- `audio-manifest.ts` `SoundName` is a 17-member union; `SOUNDS` maps each
  to one `.wav`; `FRAME_DURATIONS` gives `playerMaterialise: 450 // SNPCR1
  :8116-8118 30 + 255 + 165`. Its doc comment (:59-82) already explains the
  `+$80` continuation trap in full and names the two multi-line offenders
  (SNPCR1 and SNPTED :8091-8093 = 134). Read it before designing anything.
- `audio.ts:122-158` defines `Citation { file, line, verbatim }` and
  `CueSource` as a discriminated union of `{kind:'rom', table, priority,
  romComment, source: Citation, callSite: Citation}` | `{kind:'invention',
  note}`. Exactly ONE `Citation` per table — the structural limitation AC1
  removes.
- `plugins/joust/tests/audio-priority.test.ts:241-243` already pins
  `frameDurations.playerMaterialise === 450` with the message "SNPCR1 runs
  :8116-8118 (30+255+165) — its cited row is only the first pair". Expect
  it to need re-pointing, not deleting.
- Other files that name SNPCR1 and will move under this story:
  `audio-dispatch.ts`, `tests/audio-events.test.ts:407`,
  `tests/audio-flap.test.ts:245` (hardcodes the :5544 G1DEC row verbatim)
  and `:436`, `tests/audio-rom-citations.test.ts:286`,
  `tools/audit/check-citations.mjs`.

### Prior-story quarry — TEA should read this before starting

`sprint/archive/jt5-5-session.md` is where this story's structural finding
was derived. Load-bearing lines: 134-140 (Reviewer), 158-164 (Dev), 182-190
(TEA) — three independent routings of the same finding; 275-285 and
443-451 (the 15x-error deviation, with the two-table comparison); 512-515
(why deriving was not available to jt5-5). Also
`sprint/archive/jt5-2-session.md` for the bake and deploy mechanics.

## SM Setup Assessment (2026-08-02)

**DEVIATION FROM TASK INSTRUCTIONS — branch not created.** The setup task
instructions asked for `feat/jt5-6-snpcr2-player-2-transporter-cue` to be
created and "pushed empty". This setup run did NOT do that. Evidence
weighed:
- `.pennyfarthing/repos.yaml`'s single `arcade` entry sets
  `branch_strategy: trunk-based`, and `pf.git.repos.should_create_branch()`
  returns `False` for it (verified by direct call at setup).
- CLAUDE.md: "One repo, one remote, one branch... trunk-based — commit
  straight to main. Just commit; no need to ask first. There are no
  per-game remotes, no develop branches and no per-game PRs."
- The three immediately preceding jt5 stories — jt5-1, jt5-2, jt5-5 — each
  recorded the identical trunk-based/branching-skipped decision in their
  own session files (`sprint/archive/jt5-1-session.md:59`,
  `jt5-2-session.md:16`, `jt5-5-session.md:15`).
- Stray local refs `feat/jt5-1-joust-audio-seam`,
  `feat/jt5-2-joust-samples-live-200` and
  `feat/jt5-5-sound-priority-arbitration` exist in this checkout but are
  each **0 commits ahead of `main`** (verified with `git rev-list --count
  main..<branch>`) — dead cruft, not evidence of an actual per-story
  branch workflow.

Given the tooling gate, the project's own governing document and three
directly preceding stories in the same epic all agree, this setup treated
the branch-creation instruction as a template mismatch rather than a
deliberate override and skipped it. Flagged here and in the SETUP_RESULT
for the calling SM to confirm or correct.

**Jira: skipped per Step 0.** `is_jira_enabled()` returned `False` at
setup — confirmed against CLAUDE.md's "No Jira — issue tracking is local
via sprint/ YAML files. The jira_key in a session file is just the story
id." Steps 1 (epic Jira create) and 3 (claim) were not run.

**Workflow permissions: none required.** `.pennyfarthing/workflows/tdd.yaml`
`.workflow.permissions` is `[]` — no grant prompts needed.

**Story context:** `sprint/context/context-story-jt5-6.md` generated via
`pf context create story jt5-6`, then hand-edited to (a) front the
`## Problem` section with a numbered correction block rather than deleting
the raw description, and (b) replace the generic `## Technical Approach`
and `## Scope` filler with the measured pointers above. `pf validate
context-story jt5-6` passes. The epic context
(`sprint/context/context-epic-jt5.md`) already existed and was not
touched.

**Status: NOT stamped by this setup run.** Per explicit task instruction,
`sprint/epic-jt5.yaml`'s `status: backlog` for jt5-6 is left as-is; the
calling SM stamps `in_progress` and pushes the claim. Note the epic YAML
already carries an uncommitted diff at setup time (points 2→5 and the six
ACs, applied before this run per the task's Critical Instruction #1) —
this setup run made no further edits to that file.

### SM ruling on the branch deviation — OVERRIDDEN, branch created (2026-08-02)

The setup run's reasoning is factually right on every point and lands on the wrong
conclusion, because it read the branch as a *work* branch. It is not. On a trunk-based
repo the empty claim branch carries no commits and nothing ever merges it: it exists
purely as a **sibling-visibility signal**. Per-checkout `.session/` files are never
committed and a sprint status stamp is invisible until pushed, so the only probe a
sibling checkout (`a-2`, `a-3`) has for "does anyone own this story?" is
`git fetch --prune && git branch -r | grep <story-id>`. That probe is what caught a
13-hour duplicate on sw8-8; skipping the push leaves the invisibility window open across
the whole RED phase.

So both halves of the claim were pushed, to the one remote:
- `origin main` — `51eb0d4`, the re-point + six ACs + `sprint/context/context-story-jt5-6.md`.
- `origin feat/jt5-6-snpcr2-player-2-transporter-cue` — created at `main`'s tip and pushed
  with **zero** commits ahead (`git rev-list --count origin/main..origin/feat/jt5-6-…` → `0`,
  run after the push). Work still lands directly on `main`; this ref is never merged and is
  deleted at finish under the same gated check.

The three stray `feat/jt5-*` refs the setup run found were the *residue of exactly this
pattern* from jt5-1/jt5-2/jt5-5, not cruft from an abandoned branch workflow — each was
deleted here after its own `main..<branch>` count came back `0`.

### SM setup measurement — what was re-opened before spawning setup

Every ROM claim in the epic description was re-opened against
`reference/williams-source/joust/JOUSTRV4.SRC` and **all of them hold** (both tables 450
frames, priority 070, `!N$12!` opener, differing in fade code and a 13-frame head-ward
shift). One claim did not: the description's ":5552, :5556" is right for `P1DEC`/`P2DEC`
but the *shipped* `CUE_SOURCES.playerMaterialise.callSite` cites `:5544`, which is
`G1DEC`'s row, under a comment asserting `P1DEC`'s block. Byte-exact verbatim, so the
citation gate is green on a misattribution — the unguarded-prose shape. AC5 owns it, and
the hazard for TEA/Dev is stated in the context: adding SNPCR2 at `:5556` beside a SNPCR1
at `:5544` silently mismatches two different block families.

The stale half of the description — "worth folding into jt5-2 if the samples are being
produced anyway" — expired when jt5-2 shipped. Recorded as refuted claim #2 in the
context's correction block rather than deleted, because the rest of that sentence
still holds and lowers this story's marginal cost.

The scope question was put to the user *before* setup rather than after, because TEA
writes a materially different RED for each branch: the story was filed at 2 points and had
since accumulated three workstreams from two later stories' findings. The user ruled full
scope and the story was re-pointed 2 → 5 in the same breath.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Improvement** (non-blocking): the frame the whole suite uses to stage a transporter re-entry
  belongs to the WRONG KNIGHT in its own comment. `tests/audio-events.test.ts:404` stages seed
  `0xface` frame 1889 and calls it "the ROM's CREP re-create — DSNCRE → SNPCR1 'PLAYER 1
  RE-CREATED (TRANSPORTER)'". Measured off the sim's own processes: the knight who re-enters on
  that frame is player **2**, so the machine's table there is SNPCR2 (:8119-8121). Harmless while
  jt5-1's payload-free moment mapped both knights onto one cue — and it is exactly the collapse
  this story removes, which is why the story's headline defect turns out to be observable at a
  fixture that predates it. Affects `plugins/joust/tests/audio-events.test.ts` (comment corrected
  in place by this RED; no assertion changed). *Found by TEA during test design.*
- **Improvement** (non-blocking): `CHANNELS` is now provably vestigial for arbitrated cues and the
  new cue makes it worse. jt5-5's Dev and TEA both raised that joust's thirteen `prio-N` channel
  entries stopped deciding anything once all seventeen cues shared one arbitrated voice; adding an
  eighteenth means adding another channel entry that routes nothing, purely to satisfy
  `CHANNELS gives every SOUNDS entry a voice`. Affects
  `plugins/joust/src/shell/audio.ts` (`CHANNELS`) and `tests/audio-manifest.test.ts`. Not in this
  story's scope (the ACs never mention it) and **needs filing** — jt5-5 left it unowned, and this
  story is the second one to have to feed it. *Found by TEA during test design.*
- **Gap** (non-blocking): AC4's real acceptance — a live `200` on the new asset URL — cannot be
  reached by any vitest, and nothing in the suite can see the bucket. `@shared/audio` degrades
  silently on a 404, so a missing upload is indistinguishable from working audio at runtime. The
  bake half is fully pinned here (spec present, file written, distinct bytes, matching 450-frame
  length), but the deploy half must be a `curl -sI` artifact pasted into this session by Dev, the
  same way jt5-2 discharged it. Affects `plugins/joust/tools/sample-bake/deploy-assets.test.mjs`
  (which pins the recipe, not the bucket). *Found by TEA during test design.*
- **Gap** (non-blocking): the bake's "a new cue must arrive with its own sound" gate — the one this
  story's AC4 leans on and the one that would abort `just deploy-assets` — is itself **unguarded**.
  `bake-samples.test.mjs:119` pins only the missing-`outDir` throw
  (`await expect(bakeSamples()).rejects.toThrow()`); nothing anywhere asserts that a manifest cue
  with no `SPECS` row throws. So the gate could be removed or weakened and every suite would stay
  green, while the next cue ships an unbaked `.wav` name into the bucket. Pinning it properly needs
  an injectable manifest (`SOUNDS` and `SPECS` are both module-scope in `bake-samples.mjs`), which
  is a refactor this story's ACs do not authorise. Affects
  `plugins/joust/tools/sample-bake/bake-samples.mjs` (`bakeSamples` would need to take its manifest,
  or export `SPECS`). **Needs filing.** *Found by TEA during test design.*
### Dev (implementation)

- **Improvement** (non-blocking): `runBehaviour`'s cue channel was typed `GameEventKind` — the WHOLE
  union — while it can only ever raise one of the four WING kinds. Making `player-materialise` carry
  a required payload turned that looseness into a compile error at `src/core/frame.ts:439`
  (`cues.push({ type: ran.cue })` is no longer a valid `GameEvent` for every kind). Fixed by
  narrowing the return type to a `WingCue` alias rather than casting, which is the honest reading —
  a behaviour pass raises wing edges, and the transporter re-entry belongs to `game.ts`'s respawn
  loop, the only place a knight's id is in scope. Worth knowing generally: **the next event kind that
  gains a payload will land on this same seam**, and a cast there would silently allow a
  payload-bearing kind to be constructed without its payload. *Found by Dev during implementation.*
- **Improvement** (non-blocking): `CHANNELS` is now measurably vestigial and this story fed it an
  eighteenth entry that routes nothing (`player2Materialise: 'prio-70'`), purely to satisfy
  `CHANNELS gives every SOUNDS entry a voice`. Third story in a row to have to do this — TEA raised
  it here, jt5-5's Dev and TEA raised it before that, and it remains unowned. Affects
  `plugins/joust/src/shell/audio.ts` (`CHANNELS`) and `tests/audio-manifest.test.ts`. **Needs
  filing.** *Found by Dev during implementation.*
- **Question** (non-blocking): the ROM binds each transporter table TWICE — `G1DEC`/`G2DEC`
  (:5544/:5548) and `P1DEC`/`P2DEC` (:5552/:5556) — and the two families differ in their joystick
  source and in the 8th sound slot (`0` vs `SNPTREF`). This RED requires the P-blocks, because
  those are the ones the story's own description cites and the only pair four lines apart. Nothing
  in the port models the G/P distinction at all, so what the G-blocks ARE (a demo/attract decision
  block? a two-player-game variant?) is unanswered and uncited anywhere in joust. Affects
  `plugins/joust/src/shell/audio.ts` (`CUE_SOURCES` call sites). Worth a Reviewer ruling on
  whether it needs its own story. *Found by TEA during test design.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)

- **`runBehaviour`'s cue type was NARROWED rather than cast**
  - Spec source: context-story-jt5-6.md, AC3; `tests/audio-transporter-split.test.ts`
  - Spec text: "the core's player-materialise moment carries which knight it belongs to"
  - Implementation: `src/core/frame.ts`'s `wingCue()` and `runBehaviour()` now return a
    `WingCue` alias (`Extract<GameEventKind, '...-wing-...'>`) instead of the full `GameEventKind`.
  - Rationale: making the payload REQUIRED (which TEA's deviation argues for, and which is what stops
    a future call site re-collapsing the two cues) broke `cues.push({ type: ran.cue })` at
    `frame.ts:439`, because a bare `{ type: kind }` is no longer a valid `GameEvent` for every kind.
    Two fixes were available. A cast would have compiled and kept the loose type, which is precisely
    the hole that lets a payload-bearing kind be constructed without its payload. Narrowing states
    what the function already does — a behaviour pass raises wing edges and nothing else.
  - Severity: minor
  - Forward impact: `runBehaviour` can no longer raise a non-wing cue without a deliberate type
    change. That is the intended guard, but it means a future story adding, say, a lava cue to the
    behaviour pass must widen `WingCue` rather than just returning a new string.

- **AC4's live 200 was discharged by RUNNING the deploy, and the blast radius was measured first**
  - Spec source: context-story-jt5-6.md, AC4
  - Spec text: "`just deploy-assets` actually run with the new URL verified live (a real 200)"
  - Implementation: staged the full `deploy-assets` bake to a temp dir and compared all 38 files
    against the live bucket BEFORE uploading; then ran `just deploy-assets` and verified the result.
  - Rationale: `deploy-assets` uploads star-wars' music and sfx alongside joust's, so it is a wider
    outward-facing action than this story's subject. jt5-2's session claims re-runs are
    byte-identical, but that is a claim with a timestamp on it and the upload is not reversible.
    Measured instead: **37 of 38 staged files were byte-identical to what was already live, and the
    single absent one was exactly `joust/sfx/player2_materialise.wav` (404)** — so the deploy was a
    single-key addition with no star-wars blast radius. Verified after the fact too: the new URL
    answers `HTTP/2 200` with `etag "3364a13db55ad1003c76dacd0ea197ec"`, byte-identical to the local
    bake; knight 1's asset is still 200 and unchanged; `star-wars/music/space_theme.wav` unchanged.
  - Severity: minor
  - Forward impact: none. The bake is deterministic, so a later re-run stays idempotent — now
    demonstrated across a process boundary rather than asserted.

- **The four WING cues keep citing the G-block (:5544) while the transporter cues moved to P-blocks**
  - Spec source: context-story-jt5-6.md, AC5
  - Spec text: "The cited line and the prose must name the SAME block"
  - Implementation: `playerMaterialise` moved to P1DEC :5552 and `player2Materialise` cites P2DEC
    :5556, but `playerWingDown`/`playerWingUp` still cite :5544 (G1DEC).
  - Rationale: AC5 names `CUE_SOURCES.playerMaterialise` specifically, and the wing cues carry no
    false claim — their comment says "the DECISION-BLOCK bindings (:5544 knights, :5560 buzzards)",
    which is true. The wings are IDENTICAL in both families (every one of the four rows opens
    `SNPLWU,SNPLWD`), so :5544 is a correct citation for them; re-anchoring would assert a precision
    this story did not measure. The transporter cues had to move because SNPCR1/SNPCR2 are exactly
    where the two families differ. **The stale half of that comment WAS fixed**: it used to say the
    wings cite "these same two lines" as `playerMaterialise`, which stopped being true with this
    change.
  - Severity: minor
  - Forward impact: `CUE_SOURCES` now cites both block families, which is honest but asymmetric. What
    the G-blocks actually ARE is unmodelled and unfiled — see the Delivery Findings.

### TEA (test design)

- **The extent is pinned as `continuation: Citation[]`, not as a line-span pair**
  - Spec source: context-story-jt5-6.md, AC1
  - Spec text: "A rom CueSource can express its table's FULL EXTENT — **a line span or a second
    citation** — and every one of the seventeen CUE_SOURCES records carries the real extent of its
    table"
  - Implementation: the RED requires `continuation: readonly Citation[]` on the `rom` variant —
    empty for a single-row table, one full `Citation` per continuation row otherwise. The extent is
    then `[source.line, source.line + continuation.length]`, and a separate test pins contiguity so
    that identity holds.
  - Rationale: the AC offers two shapes and TEA must pick one or the RED is unwritable (the
    assertions differ completely). A bare `lines: [from, to]` states an extent but leaves the
    continuation rows **unquoted**, so the citation gate still cannot re-open them — and the 15x
    error this story exists to prevent could still ship inside a correct-looking span. Quoting every
    row makes the whole table checkable by machinery that already exists.
  - Severity: minor
  - Forward impact: Dev must add ~2 rows of verbatim per multi-row table and `continuation: []` to
    fourteen records. If Reviewer prefers the span, the oracle and every extent test survive
    unchanged — only `the continuation rows are contiguous` and the byte-exact re-open would be
    rewritten.

- **AC2's derivation is required to be an EXPORTED function, which the AC does not say**
  - Spec source: context-story-jt5-6.md, AC2
  - Spec text: "Each cue's frame total is DERIVED from its cited extent rather than hand-transcribed
    in a parallel FRAME_DURATIONS map"
  - Implementation: `audio-manifest.ts` must export `framesFor(source)`, and it is tested against
    **synthetic** citations (a fabricated table, an expression-only row, a bare `!N$00` tail) as well
    as against every shipped record.
  - Rationale: "derived" is not observable from the outside — a hand-written map and a derived one
    hold identical values on the day they are written, and that is exactly how jt5-5's transcription
    passed. Applied only to the seventeen real records, a derivation could be `return
    FRAME_DURATIONS[name]` and satisfy everything. Synthetic inputs are the only way to tell a
    function from a lookup table.
  - Severity: minor
  - Forward impact: one new exported symbol on a module that must stay dependency-free. Dev is free
    to keep `FRAME_DURATIONS` exported (the bake and several suites read it) provided it is BUILT
    from `framesFor` — pinned by `every shipped FRAME_DURATIONS value IS framesFor of that cue's
    citation`.

- **The RED requires `CUE_SOURCES` to MOVE into `audio-manifest.ts`; no AC says where it lives**
  - Spec source: context-story-jt5-6.md, AC2 ("Constraint, not a design ruling") and the context's
    "central design tension"
  - Spec text: "bake-samples.mjs reaches this data under PLAIN node via type stripping, so whatever
    module holds it must still import nothing."
  - Implementation: `CUE_SOURCES` and `framesFor` must be exported from `audio-manifest.ts`, with
    `audio.ts` re-exporting `CUE_SOURCES` **by identity** (asserted with `toBe`, not `toEqual`).
  - Rationale: this is forced, not chosen. AC2 requires the bake's window to come from the citation;
    the bake cannot import `audio.ts` (it pulls `@shared` and dies under plain `node`); therefore the
    citation data must sit in the dependency-free module. The identity clause exists because a COPY
    would agree with itself forever while the real manifest drifted — the same failure
    `bake-samples.test.mjs` already guards for `SOUNDS`. `audio-manifest.ts still imports NOTHING`
    guards the move itself, and vitest resolves the `@shared` alias, so nothing else in the suite
    would notice the breakage.
  - Severity: minor
  - Forward impact: a file move for ~18 records plus a re-export line. Every existing consumer keeps
    importing from `audio.ts` unchanged.

- **The two cues are ADDITIVE (`playerMaterialise` + `player2Materialise`), not renamed to a
  symmetric pair**
  - Spec source: context-story-jt5-6.md, AC3
  - Spec text: "the dispatch routes player 1 to SNPCR1 and player 2 to SNPCR2"
  - Implementation: the existing `playerMaterialise` keeps its name, its `player_materialise.wav`
    and its citation (re-anchored to P1DEC per AC5); a new `player2Materialise` is added.
  - Rationale: the symmetric rename (`player1Materialise`/`player2Materialise`) reads better and
    costs a live asset — `player_materialise.wav` is already baked and uploaded to the assets
    bucket, and renaming it orphans that key while the new one propagates. The AC is silent on
    naming, and additive is the lower-risk reading.
  - Severity: minor
  - Forward impact: the manifest is now asymmetric in name (`playerMaterialise` means "knight 1").
    If Reviewer prefers symmetry, it is a rename plus one extra bucket upload, and only the string
    literals in this RED change.

- **A payload-free `player-materialise` DEGRADES to knight 1 at runtime rather than throwing**
  - Spec source: context-story-jt5-6.md, AC3; house precedent
  - Spec text: "the core's player-materialise moment carries which knight it belongs to"
  - Implementation: the TYPE must make `player` required (so the core cannot forget it — a compile
    error), but the dispatch must still return a cue for an event that arrives without one, pinned
    by `a materialise with no player still sounds SOMETHING`.
  - Rationale: this is the mg1-2/cp5-2 either-or shape, and it was settled from measured precedent
    rather than taste. Census RUN at test-design time rather than recalled (six games carry an
    `audio-dispatch.ts`; star-wars has none — it dispatches inline):

    | game | default arm | throws? |
    |------|-------------|---------|
    | tempest | `const _exhaustive: never` (:116) | no |
    | asteroids | `const _exhaustive: never` (:34, :61) | no |
    | battlezone | `const _exhaustive: never` (:77) | no |
    | red-baron | `const _exhaustive: never` (:71) | no |
    | centipede | `const unreachable: never` + `break` | no |
    | joust | `const _exhaustive: never` (:75) | no |

    So **5/5 of joust's siblings degrade and none throws** — the ruling stands. Two corrections to
    how this was carried in from cp5-2, both worth recording because the sloppy version was one
    keystroke from being written down as fact: the shared spelling is NOT universal (centipede says
    `unreachable`, not `_exhaustive`), and my first pass at this census was a `grep -c throw` that
    returned **5 for centipede** — every hit inside a COMMENT explaining that it does not throw.
    That is checklist rule 15's token-not-claim failure occurring inside the verification of a
    deviation, and it would have recorded a false refutation. The table above comes from reading the
    arms.

    The substantive reason: a throw inside `playEventSounds` runs inside the frame loop, so the
    failure mode is a frozen game rather than a missing sound. Type forbids; runtime survives.
  - Severity: minor
  - Forward impact: none. If Reviewer wants a throw, one test inverts.

- **AC4's live `200` is NOT asserted by any test — it is routed to a Dev deploy artifact**
  - Spec source: context-story-jt5-6.md, AC4
  - Spec text: "`just deploy-assets` actually run with the new URL verified live (a real 200)"
  - Implementation: the RED pins everything up to the bucket — the SPECS entry exists, the file is
    written, its bytes differ from knight 1's, and its length matches the same 450-frame window. The
    live request is not attempted.
  - Rationale: no vitest can see the bucket, and a network assertion in the suite would redden CI
    (which has no credentials) and every offline run. jt5-2 discharged the identical clause as a
    `curl -sI` artifact in its session; this follows that precedent rather than inventing a second.
  - Severity: **major** — this is the one AC clause with no mechanical guard, so it is the clause
    most likely to be reported done without being done.
  - Forward impact: **Dev must paste the `curl -sI` output for the new URL into this session, and
    Reviewer must refuse the story without it.** Recorded as a Delivery Finding too.

- **The RED edits two sibling test files rather than leaving them to redden during GREEN**
  - Spec source: context-story-jt5-6.md, Scope ("Out of scope: anything not named by the six ACs")
  - Spec text: the ACs name no test file but their own subject matter.
  - Implementation: `tests/audio-manifest.test.ts`'s `SOUNDS.length === EVENT_KINDS.length`
    assertion was re-seated to `>=` with the strong reachability sweep moved into this story's file;
    `tests/audio-events.test.ts:404`'s comment was corrected. No other assertion was touched.
  - Rationale: the count assertion becomes FALSE under a correct implementation (18 cues, 17 kinds),
    so leaving it would hand Dev a red that looks like a regression and invite "fixing" it by not
    splitting the cues — failing AC3 while appearing to succeed. A count was never the property
    anyway: a cue with no kind and a kind with no cue cancel out in it exactly.
  - Severity: minor
  - Forward impact: the weakened `>=` clause is deliberately the half that needs no dispatch; its
    strong replacement lives in `audio-transporter-split.test.ts` and is mutation-checked (M4).
---

### Reviewer (audit)

All ten deviations above are **✓ ACCEPTED**. Reviewed individually, not as a block:

- **TEA — `continuation: Citation[]` over a line span** → ✓ ACCEPTED. The rationale is correct and
  load-bearing: a span states an extent while leaving the continuation rows UNQUOTED, so the 15x
  error could still ship inside a correct-looking span. Mutation I10 (drifting one continuation
  verbatim by a single character) is caught only because the rows are quoted.
- **TEA — `framesFor` exported and tested with SYNTHETIC inputs** → ✓ ACCEPTED, and vindicated by
  measurement. Mutation I2 (read the first integer instead of the expression) yields
  `30 + 255 + 165 = 450` for SNPCR2 — the CORRECT total, by luck — so every total-based assertion
  passes under it. Only the synthetic test sees it. The deviation argued this in the abstract; the
  battery proved it.
- **TEA — `CUE_SOURCES` must move to `audio-manifest.ts`** → ✓ ACCEPTED. Forced, not chosen, and the
  identity re-export (`toBe`, not `toEqual`) is what keeps it honest.
- **TEA — additive naming (`playerMaterialise` + `player2Materialise`)** → ✓ ACCEPTED. Renaming would
  orphan a live bucket key for cosmetics; the asymmetry is documented where it is defined.
- **TEA — payload REQUIRED by the type, DEGRADING at runtime** → ✓ ACCEPTED, and the census backing
  it was re-run by the author rather than recalled, catching two errors in the recalled version.
  Independently confirmed here: `src/shared/audio.ts:232` refuses only strictly-lower priority.
- **TEA — AC4's live 200 routed to a deploy artifact** → ✓ ACCEPTED as the only workable option (no
  vitest can see the bucket; a network assertion would redden CI), and its `Severity: major` self-
  assessment was the right call — that is precisely the clause that gets reported rather than done.
  It was done; evidence verified in the Dev Assessment and spot-checked here.
- **TEA — editing two sibling test files during RED** → ✓ ACCEPTED. Leaving the count assertion to
  redden during GREEN would have invited "fixing" it by not splitting the cues, i.e. passing the
  suite while failing AC3.
- **Dev — `WingCue` narrowing instead of a cast** → ✓ ACCEPTED, and this is the deviation I would
  have flagged had it gone the other way. A cast at `frame.ts:439` is exactly the hole that lets a
  payload-bearing kind be constructed without its payload.
- **Dev — AC4 blast radius measured BEFORE uploading** → ✓ ACCEPTED. Replacing jt5-2's inherited
  "re-runs are byte-identical" with a 38-file comparison is the correct treatment of a claim with a
  timestamp on it, and it is what made an irreversible outward action safe to take.
- **Dev — wing cues keep citing the G-block while the transporter cues moved** → ✓ ACCEPTED with a
  caveat carried into the findings. The reasoning is sound (the wings are identical in both families,
  so `:5544` is true for them; the transporter tables are exactly where the families differ), but it
  leaves `CUE_SOURCES` citing two block families with no model of what distinguishes them. Filed.

**Undocumented deviations:** none found. Every divergence between the six ACs and the shipped code
was already logged by TEA or Dev.

**Reviewer's own change:** finding 1 (`id as PlayerId`) was fixed in place rather than bounced —
Medium, non-blocking, two tokens, and re-verified green with the guard still biting. Logged as a
Reviewer deviation for the record:

- **Reviewer replaced a narrowing cast at the emit site**
  - Spec source: TypeScript lang-review checklist, rule #1 (type safety escapes)
  - Spec text: "`as` casts that assert an unproven narrowing"
  - Implementation: `player: id as PlayerId` → `player: id === 2 ? 2 : 1`; removed the now-unused
    `PlayerId` import from `game.ts`.
  - Rationale: `createGame` takes an unclamped `playerCount`, so the cast asserted a range the
    signature does not guarantee. Not reachable today, so Medium; fixed in place because a REJECT
    cycle costs more than a two-token change, and rule-matching findings may not be dismissed.
  - Severity: medium
  - Forward impact: none. If joust ever gains a third knight, the fallback is now visible at the
    emit site instead of hidden behind an `as`.

## TEA Assessment

**Tests Required:** Yes
**Status:** RED (failing — ready for Dev)

**Test Files:**
- `plugins/joust/tests/audio-transporter-split.test.ts` — NEW. 44 tests across six groups: one
  ORACLE group (the ROM re-derived) and one per AC.
- `plugins/joust/tests/audio-manifest.test.ts` — re-seated (one assertion; see Design Deviations).
- `plugins/joust/tests/audio-events.test.ts` — one false comment corrected in place, no assertion
  touched.

**Tests Written:** 44, covering all 6 ACs
**Suite totals:** 125 files / 2913 tests — **29 failed, 2884 passed**.
Baseline before this story was 124 files / 2869 tests, all green. 2884 − 2869 = the 15
green-on-arrival guards; **no pre-existing test regressed**, and the only file with failures is the
new one. `npm run lint` (tsc --noEmit, repo-wide) exits 0 with no output — the RED fails in the
suite, never in the toolchain.

### The ORACLE / RED split — read this before judging the green count

15 of the 44 pass on arrival, and that is the design, not a botched RED:

- **7 ORACLE tests** implement the sound-table format header (`JOUSTRV4.SRC:8045-8049`) directly and
  walk each table by its `+$80` continuation bit. They are the evidence base: every number the RED
  groups demand is *derived from the machine* rather than transcribed by me. They pass because the
  ROM already says what it says.
- **8 controls and regression guards** that must stay green THROUGH the change (the manifest module
  importing nothing, the direct CLI path still working, other kinds ignoring the payload, …).

Every one of the 15 was mutation-tested. See the table below.

### What the ORACLE established (and one thing it overturned)

| table | extent | frames | cited row alone |
|-------|--------|--------|-----------------|
| SNPCR1 | :8116-8118 | **450** | 30 (15× short) |
| SNPCR2 | :8119-8121 | **450** | 43 |
| SNPTED | :8091-8093 | **134** | 30 |

Exactly three of the eighteen cited tables are multi-row; the other fifteen stop on their defining
row. `SNECRE` is the shape that catches naive parsers — its second code is a bare `$00`, not
`!N$00!`, so the M.S. bit is clear and the table STOPS; a parser keyed on the `!N$` spelling instead
of on the bit runs off the end of it into SNEDIE.

**The overturned claim, and it is the story's own headline defect showing up early.** Seed `0xface`
frame 1889 — the one transporter re-entry the entire suite stages, at
`tests/audio-events.test.ts:404` — re-enters knight **TWO**, not knight one. Its comment there called
it *"SNPCR1 'PLAYER 1 RE-CREATED (TRANSPORTER)'"*. Measured off the sim's own processes across three
seeds, not reasoned: `0xbeef` gives knight 2 at frame 214 and knight 1 at 372, which is what let the
payload be pinned from both sides. Corrected in place, and the story's central behaviour is now
observable at a fixture that predates it.

### Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`)

| Rule | Test(s) | Status |
|------|---------|--------|
| #8 test quality — no `as any` to force types | mirror types + `load()` throughout; zero `as any` | passing |
| #15 source-text assertion matching a TOKEN not the CLAIM | `the "both knights map here" scope comment is gone` — alternation over the CLAIM, not one spelling, because the two files word it differently | failing |
| #15 every guard mutation-tested | M1-M10 below, 10/10 | passing |
| #15 bounds pinned, not loose | `framesFor` totals pinned to 450/450/134 exactly | failing |
| #17 comments asserting a mechanism nobody re-ran | the fleet dispatch census was RUN and tabulated in the deviation, not recalled | passing |
| #18 fixture whose value IS the expectation | `the payload is the LOOP's id` uses two frames with DIFFERENT ids — a hardcoded `player: 1` dies | failing |
| #18 a helper that reimplements an algorithm is untested code | the ORACLE parser is exactly this; mutation-tested itself by M8/M9 | passing |

**Rules checked:** 7 of the 18 applicable; the remainder (React/JSX, async, bundle, enum) have no
surface in this story.
**Self-check:** **2 vacuous tests were written and removed rather than shipped.** One asserted that
`bake-samples.mjs` imports from `audio-manifest.ts` — already true, and true whatever Dev does. The
other compared the baked filenames to the manifest, where both sides are read from the same object
and move together. Both are recorded in the file so they are not re-added as "missing coverage"; the
second was repaired by adding the clause that bites (the new file by name).

### Mutation battery — 10/10 caught, every anchor asserted its own landing

Each mutation asserts `source.count(anchor) == 1` before applying and prints `ANCHOR MISS` otherwise:
a mutation that fails to apply is indistinguishable from a guard that does not bite, and would score
this suite as safer than it is. Source restored from a `cp` backup between every run.

| # | mutation | guard that caught it |
|---|----------|----------------------|
| M1 | add an import to `audio-manifest.ts` | manifest still imports NOTHING |
| M2 | `respawnPlayerProcess(id)` → `(1)` | the sim really re-enters BOTH knights |
| M3 | route any `player === 2` event to the new cue | the routing is the PAYLOAD's doing |
| M4 | add a manifest cue no event can reach | every cue is reachable from some event |
| M5 | return `null` for a payload-free materialise | it still sounds SOMETHING |
| M6 | disable the CLI gate entirely | the direct path still works |
| M7 | make the gate always true | importing does NOT bake |
| M8 | truncate the ORACLE to the cited row | SNPCR1 totals 450 |
| M9 | ORACLE reads the first integer, not the expression | SNPCR2 totals 450 |
| M10 | manifest entry with no synth spec | the new cue has a synth spec |

M9 is the one worth keeping: it proves the exact error AC2 names — reading `165-13` as `165` — is
caught rather than merely warned about.

### What Dev needs to know

1. **`CUE_SOURCES` and `framesFor` must land in `audio-manifest.ts`, not `audio.ts`.** This is forced
   by AC2, not a preference: the bake needs the citation, and it cannot import `audio.ts` (which
   pulls `@shared` and dies under plain `node`). `audio.ts` re-exports `CUE_SOURCES` **by identity**
   — asserted with `toBe`, so a copy fails.
2. **Expect `tests/audio-manifest.test.ts` to have already been re-seated for you.** Its
   `SOUNDS.length === EVENT_KINDS.length` assertion becomes FALSE under a correct implementation
   (18 cues, 17 kinds). Left alone it would read as a regression and invite "fixing" it by not
   splitting the cues — passing the suite while failing AC3.
3. **The one AC clause with no mechanical guard is AC4's live `200`.** Everything up to the bucket is
   pinned. `just deploy-assets` and a `curl -sI` of the new URL must be run and the output pasted
   into this session, or the story is not done. Recorded as a major deviation and a Delivery Finding
   because it is the clause most likely to be reported done without being done.
4. **The payload is required by the TYPE, optional at RUNTIME.** Make `player` non-optional on the
   `player-materialise` member so the core cannot forget it; keep the dispatch returning a cue when
   it is absent. `playEventSounds` runs inside the frame loop — a throw there freezes the game.
5. **`src/core/events.ts`'s own comment ("The members carry no payload today…") becomes false with
   this story.** It is not currently guarded by a test; fix it with the change.

**Handoff:** To Bicycle Repair Man (Dev) for GREEN.
---

## Dev Assessment

**Implementation Complete:** Yes
**Tests:** 2913/2913 passing (GREEN) across 125 files — `npx vitest run --project joust --project shared`.
Orchestrator suite 372/372. `npm run lint` (tsc --noEmit, repo-wide) exits 0 with no output.
Every one of TEA's 29 failing tests is green; **no test was weakened or deleted to get there**.

**Files Changed:**
- `src/shell/audio-manifest.ts` — `CUE_SOURCES`, `Citation`, `CueSource` moved in from `audio.ts`;
  `continuation: readonly Citation[]` added to all 18 records; `framesFor()` added;
  `FRAME_DURATIONS` is now DERIVED and no longer hand-written. Still imports nothing.
- `src/shell/audio.ts` — re-exports the moved names by identity; `player2Materialise` channel.
- `src/core/events.ts` — `PlayerId`; `player-materialise` carries a required `player`.
- `src/core/game.ts` — the respawn loop emits `player: id`.
- `src/core/frame.ts` — `WingCue` narrowing (see deviations).
- `src/shell/audio-dispatch.ts` — routes knight 2 to `player2Materialise`.
- `tools/sample-bake/bake-samples.mjs` — `SPECS.player2Materialise`; `invokedAsScript()` realpath gate.
- `tests/audio-priority.test.ts` — the ROM expectation table gains its 18th row.

### How each AC was discharged

| AC | Evidence |
|----|----------|
| 1 | `continuation` on all 18 records; the suite cross-checks each declared extent against a ROM re-derivation, and re-opens every continuation row byte-exact |
| 2 | `framesFor()` evaluates the assembler expressions; `FRAME_DURATIONS` is `framesFor` applied to the citations, so the two cannot drift. `audio-manifest.ts` still has ZERO imports |
| 3 | `player` required on the moment; dispatch routes 1→SNPCR1, 2→SNPCR2; proven at two measured sim frames with different ids |
| 4 | **Deployed and verified live** — see below |
| 5 | `playerMaterialise.callSite` re-anchored :5544→:5552; both transporter cues now cite P-blocks; the "both knights map" claim removed from `audio.ts` AND `game.ts` |
| 6 | `invokedAsScript()` compares `realpathSync` of both sides; the symlinked-CLI test now bakes instead of exiting 0 empty |

### AC4 — the one clause with no mechanical guard, discharged with evidence

TEA flagged this as the clause most likely to be reported done without being done, so it was run and
the output is quoted, not summarised.

**Blast radius measured BEFORE uploading** (`deploy-assets` also ships star-wars' music and sfx, so
it is a wider outward action than this story's subject). All 38 staged files were compared against
the live bucket: **37 byte-identical, 1 absent — exactly `joust/sfx/player2_materialise.wav` (404).**
A single-key addition, no star-wars blast radius. That replaces jt5-2's "re-runs are byte-identical"
claim with a measurement.

```
$ curl -sI https://arcade-assets.slabgorb.com/joust/sfx/player2_materialise.wav
HTTP/2 200
content-type: audio/wav
content-length: 330264
etag: "3364a13db55ad1003c76dacd0ea197ec"
last-modified: Sun, 02 Aug 2026 10:14:54 GMT
```

- The live etag `3364a13d…` is byte-identical to the local bake — the upload is the file that was built.
- `player_materialise.wav` still 200, md5 `394600769253d83b9101343bbb6d67fb` — **unchanged**.
- `star-wars/music/space_theme.wav` md5 `8d7359d3…` — **unchanged**.
- Both transporter samples are 330264 bytes: the same 450-frame ROM window, different audio.

### Worth the Reviewer's attention

1. **`CUE_SOURCES` moved modules.** It is re-exported from `audio.ts` by identity (asserted with
   `toBe`), so every existing consumer is untouched — but the diff looks larger than the change is.
2. **`FRAME_DURATIONS` is no longer a source of truth**, it is an output. Editing a number there is
   now impossible without editing the citation it is derived from, which is the point of AC2.
3. **`SOUNDS` is 18 and `EVENT_KINDS` is 17, deliberately.** One moment reaches two cues. The old
   count assertion was re-seated by TEA; reachability is swept against the real dispatch instead.
4. **The `WingCue` narrowing in `frame.ts` is a type change in the core**, made instead of a cast.
   It is the seam the next payload-bearing event kind will land on.

**Handoff:** To the Thought Police (Reviewer) for code review.
---

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 1 (uncommitted `sprint/epic-jt5.yaml`) | confirmed 0, dismissed 1, deferred 0 |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | N/A — Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | N/A — Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | Skipped | disabled | N/A — Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | Skipped | disabled | N/A — Disabled via settings |
| 6 | reviewer-type-design | Yes | Skipped | disabled | N/A — Disabled via settings |
| 7 | reviewer-security | Yes | Skipped | disabled | N/A — Disabled via settings |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | N/A — Disabled via settings |
| 9 | reviewer-rule-checker | Yes | Skipped | disabled | N/A — Disabled via settings |

**All received:** Yes (1 enabled specialist returned; 8 disabled via `workflow.reviewer_subagents`)
**Total findings:** 3 confirmed, 1 dismissed (with rationale), 0 deferred

**preflight's dismissed finding:** it reported `git status` NOT clean — `M sprint/epic-jt5.yaml`. Dismissed:
that is `pf handoff complete-phase`'s own `in_progress → in_review` status stamp, written by the
tooling between GREEN and this phase. It is sprint bookkeeping, not application code, and committing
it is part of the finish ceremony.

**preflight's "3 citation error(s)" note — independently verified, not taken on trust.** It appears in
the vitest output and preflight judged it pre-existing noise. Confirmed by reading the source: the
text is emitted by `tools/audit/check-citations.mjs:323` and the block is produced *by a passing
test* — `tests/audit/citations.test.ts:1048` deliberately creates an empty `mkdtempSync(…'jt1-9-empty-')`
directory to prove the gate refuses to report success over an empty claim set. It is expected output,
and `git diff c1fcb83..HEAD` touches no citation or audit file.

**With 8 of 9 specialists disabled, an 11-mutation battery against the SHIPPED implementation is the
review.** Each mutation asserted its own landing (anchor count == 1, `ANCHOR MISS` printed otherwise),
and source was restored from a `cp` backup between runs.

| # | mutation of the shipped code | result |
|---|------------------------------|--------|
| I1 | `framesFor` ignores continuation rows | CAUGHT (+6) |
| I2 | `evaluateOperand` reads the first integer only | CAUGHT (+1) |
| I3 | `framesInRow` counts the priority byte as a duration | CAUGHT (+47) |
| I4 | dispatch re-collapses both knights onto SNPCR1 | CAUGHT (+3) |
| I5 | emitter hardcodes knight 1 | CAUGHT (+3) |
| I6 | the two cues share ONE `.wav` file | CAUGHT (+3) |
| I7 | player 2's synth spec is a COPY of player 1's | CAUGHT (+1) |
| I8 | SNPCR2 loses a continuation row | CAUGHT (+4) |
| I9 | `playerMaterialise` reverts to the G1DEC call site | CAUGHT (+3) |
| I10 | a continuation verbatim drifts by one character | CAUGHT (+1) |
| I11 | CLI gate reverts to the raw argv comparison | CAUGHT (+1) |

**11/11 caught — no coverage gap found.** Re-run after the fix below with the new anchor: hardcoding
the emitter still reddens 3 tests, so the fix did not weaken the guard.

**I2 is the result worth keeping, and it vindicates a TEA design decision.** It was caught by exactly
ONE test, and that is structural rather than thin coverage: reading the first integer of each operand
gives `30 + 255 + 165` for SNPCR2 — **450, the correct total, by luck**, because the ROM moves 13
frames from the tail to the head rather than adding them. Every total-based assertion in the suite
passes under that mutation. Only `framesFor reads the EXPRESSION, not the first integer in it`, which
feeds `framesFor` a SYNTHETIC single-row citation, can see it. TEA's deviation argued exactly this
("a derivation only ever applied to the real records could be a lookup table wearing a function's
clothes") and the battery proves the argument was load-bearing, not stylistic.

## Reviewer Assessment

**Verdict: APPROVED** — no Critical or High findings. One Medium was confirmed and FIXED in place
(below); two Lows are filed rather than fixed.

### Findings

**1. [MEDIUM] `id as PlayerId` asserted a range the signature does not guarantee — `src/core/game.ts:489`. CONFIRMED and FIXED.**
This is a type-safety escape (TypeScript checklist rule #1) introduced by this story, and rule-matching
findings may not be dismissed. `createGame(seed, playerCount = 2)` builds `Array.from({length: playerCount})`
ledgers with **no clamp** (`game.ts:317-319`), so nothing in the type system stops a third ledger
existing; the respawn loop's `id` is a plain `number`, and the cast would then have produced a value
`PlayerId` declares impossible, which the dispatch would silently route to knight 1.
*Not reachable today* — `src/main.ts:156` is `createGame(SEED)` and every test uses the default — which
is why this is Medium rather than High. Fixed in place rather than bounced: `player: id === 2 ? 2 : 1`
states the fallback where it is decided instead of hiding it behind an `as`, and the now-unused
`PlayerId` import was removed. Re-verified: lint clean, 2913/2913 + 372/372 green, and the emitter
mutation still reddens 3 tests.

**2. [LOW] `framesInRow` silently drops a trailing odd token — `src/shell/audio-manifest.ts`.**
The pair loop is `for (let i = 0; i + 1 < pairs.length; i += 2)`, so a row with an odd token count (a
code with no duration) has its tail silently ignored and the cue's window comes out short with no
error. It is *defended*, but only indirectly: every defining row is re-opened byte-exact by
`audio-rom-citations.test.ts` and every continuation row by this story's suite, so a malformed row
cannot match the file. The defence is a different mechanism than the failure, which is what makes it
worth recording. **Needs filing** — a `throw` on an odd token count would make it direct.

**3. [LOW] `framesFor` returns 0 for an `invention` cue, and the bake then reports the wrong reason.**
`framesFor` opens `if (source.kind !== 'rom') return 0` (`audio-manifest.ts:525`), so an invented cue
gets `FRAME_DURATIONS[name] === 0`; `bake-samples.mjs:310-312` tests `if (!(frames > 0))` and throws
`no FRAME_DURATIONS entry for '<name>' — the ROM window sizes the file`. There IS an entry — it is 0,
because the cue has no ROM table to size it. Unreachable today (all 18 cues are `kind: 'rom'`), but
`CueSource`'s `invention` arm exists precisely so a later story can use it, and that story will hit a
misleading error. **Needs filing.**

### Observations

- **[VERIFIED] `audio-manifest.ts` is still dependency-free — the constraint the whole module move
  hangs on.** Zero import statements; preflight confirmed it independently (the only three `import`
  hits are prose in the header explaining why there must be none), the suite guards it, and mutation
  M1 (adding a real import) reddens it. Without this the deploy-time bake breaks while every vitest
  stays green — the exact failure the file's own header warns about.
- **[VERIFIED] `CUE_SOURCES` is re-exported by identity, not copied — `audio.ts:128-129`.** The suite
  asserts `toBe` (same object), not `toEqual`. A copy would agree with itself forever while the real
  manifest drifted, which is the failure `bake-samples.test.mjs` already guards for `SOUNDS`.
- **[VERIFIED] Sharing `prio-70` between the two transporter cues is ROM-faithful, not a shortcut.**
  `src/shared/audio.ts:232` refuses only `priority < voicePriority` — *strictly* lower — so an equal
  priority takes the voice. That matches `CMPA SPRI / BLO NOSND` (SYSTEM.SRC:767-768), which branches
  away only on lower. Two knights re-materialising on one frame therefore steal from each other in
  the port exactly as in the machine.
- **[VERIFIED] The one non-null assertion added to source is proven on the line above it.**
  `pairs[i + 1]!` in `framesInRow` sits inside `for (let i = 0; i + 1 < pairs.length; i += 2)`, whose
  guard is precisely the assertion. No `as any`, no `: any`, no `@ts-ignore`, no `@ts-expect-error`
  anywhere in the added source (swept twice — the first sweep was a false positive, see below).
- **[VERIFIED] AC4 is real, not reported.** The clause with no mechanical guard was the one most at
  risk of being claimed rather than done. It was done: the new URL answers `HTTP/2 200` with etag
  `3364a13db55ad1003c76dacd0ea197ec`, byte-identical to the local bake; the blast radius was measured
  BEFORE the upload (37 of 38 staged files already byte-identical live, the single absent one being
  exactly the new sample); knight 1's asset and star-wars' `space_theme.wav` are unchanged after.
- **[VERIFIED] The two `as` casts remaining in the new code are the `Object.keys`/`Object.fromEntries`
  idiom**, not narrowing assertions — `audio-manifest.ts:539-540`. TypeScript types `Object.keys` as
  `string[]` and `fromEntries` as `{[k: string]: T}` regardless of input, so a cast is unavoidable;
  the same idiom is pre-existing at `audio.ts:153`. No invariant is being asserted.
- **[PROCESS] My own verification produced a token-not-claim false positive twice, which is the
  defect class checklist rule #15 exists for.** A `grep -c throw` over centipede's dispatch scored 5
  — every hit inside a comment explaining that it does *not* throw — and a `grep -E '!\.'` for
  non-null assertions matched ROM verbatims like `!N$16!.$7F`. Both were caught by reading the hits
  instead of the count. Recorded because the rule is usually applied to the code under review, and it
  applies just as hard to the greps used to review it.

### Rule Compliance — TypeScript lang-review checklist, rule by rule

| # | Rule | Instances in diff | Verdict |
|---|------|-------------------|---------|
| 1 | Type safety escapes | 3 `as` (2 × `Object.keys`/`fromEntries` idiom, 1 import alias), 1 non-null assertion, **1 narrowing cast** | **1 VIOLATION → finding 1, fixed.** Rest compliant |
| 2 | Generic/interface pitfalls | `CueSource` union, `Citation`, `AudioManifest<N>` | Compliant — discriminated union preserved, no widening |
| 3 | Enum anti-patterns | none (union types, not enums) | N/A |
| 4 | Null/undefined handling | `framesFor` invention arm, `invokedAsScript` catch, `pairs[i+1]!` | Compliant; the invention arm's downstream effect is finding 3 |
| 5 | Module/declaration issues | `CUE_SOURCES` moved module; `audio.ts` re-export | Compliant — identity preserved, asserted with `toBe` |
| 6 | React/JSX | none | N/A |
| 7 | Async/Promise | `bakeSamples` awaited in both new call paths | Compliant |
| 8 | Test quality | 44 new tests; no `as any`; mocks match real signatures | Compliant — 2 vacuous tests were removed by TEA before handoff, recorded in-file |
| 9 | Build/config | none touched | N/A |
| 10 | Security: input validation | `evaluateOperand` rejects anything outside `[0-9+-*]` and throws | Compliant — deliberately not `eval` |
| 11 | Error handling | bake throws on missing spec/duration; `invokedAsScript` falls back | Compliant; message accuracy is finding 3 |
| 12 | Performance/bundle | `FRAME_DURATIONS` computed once at module load | Compliant |
| 13 | Fix-introduced regressions | the `WingCue` narrowing in `frame.ts` | Compliant — narrowing, not casting; full suite green |
| 14 | Derived edges in one branch | `wingCue` unchanged in behaviour | Compliant |
| 15 | Source-text assertions matching a TOKEN | 3 in the new suite (`both knights map` alternation, manifest imports regex, stale-claim sweep) | Compliant — anchored to the CLAIM via alternation, and each mutation-tested (M1, and I9/I10 for the citations) |
| 16 | Accessible names | none | N/A |
| 17 | Comments asserting an unrun mechanism | the fleet dispatch census; the SNPCR1/SNPCR2 extents; the "both knights map" removals | Compliant — the census was RUN and tabulated, the extents are cross-checked against a ROM re-derivation, and the stale claims are swept from both files |
| 18 | Defect in the test apparatus | the ORACLE parser reimplements the ROM's table-walk | Compliant — mutation-tested itself (M8, M9), and the payload fixture uses two DIFFERENT ids so a constant cannot pass |

### Devil's Advocate

Argue this is broken. The most dangerous thing here is not the code, it is that **one agent wrote the
tests, the implementation and this review**, so every "verified" carries the same blind spot. The
mutation battery is the only part of this review that could have said no, which is why it was run
against the shipped source rather than against a reading of it.

Where would a real defect hide? Start with the derivation, because it is new machinery replacing
hand-written numbers, and hand-written numbers at least fail loudly. `evaluateOperand` parses a
grammar with a regex and a lookbehind split. Lookbehind is not universally supported in older JS
engines — but this runs under Node ≥ 22.18 (`package.json` engines) and in Vite's browser bundle for
modern targets, and the same file already relies on type stripping that landed in 22.18, so the floor
is real and enforced. What about an operand the ROM has that I never fed it? The evaluator throws on
anything outside its grammar rather than returning a wrong number, and `FRAME_DURATIONS` is built at
module load — so an unparseable operand crashes the module at import, loudly, in every test and in the
bake. That is the right failure direction. But note the corollary: **`framesFor` running at module
load means a bad citation is now a crash rather than a wrong number.** That is a real behavioural
change nobody asked for, and it is better, but a reviewer should say it out loud.

Now the confused user. A future contributor adds an eighteenth ROM cue, copies a neighbouring record,
and forgets `continuation: []`. Does anything catch it? Yes — the field is required by the type, so it
will not compile. Adds a cue to `SOUNDS` without a `CUE_SOURCES` entry? `Record<SoundName, CueSource>`
makes that a compile error too. Adds one without a synth spec? The bake throws and `deploy-assets`
aborts under `set -euo pipefail`. Adds one the dispatch cannot reach? The reachability sweep reddens.
The seams are genuinely closed.

The malicious case is thin — this ships static audio to a public bucket and parses a vendored text
file that is not attacker-controlled. `evaluateOperand` is the only parser, it is not `eval`, and it
rejects rather than executes. The stressed-filesystem case is `realpathSync` throwing in
`invokedAsScript`, which is caught and falls back to raw equality: worst case the CLI behaves exactly
as it did before this story, which is the pre-existing bug, not a new one.

The residue I cannot fully dismiss: **the G-block/P-block distinction is still unmodelled.** This
story moved two citations from G1DEC to P1DEC/P2DEC on the grounds that the P-blocks are the ones the
description cites and the only pair four lines apart — but nothing here establishes what the G-blocks
ARE, and four wing cues still cite `:5544`. That asymmetry is now baked into `CUE_SOURCES` and is
honest only as far as it goes. It is filed as a Question, and it should be answered before another
story cites either family.

### Deviation Audit

All ten logged deviations reviewed. Stamps appended in the `## Design Deviations` section.

- **TEA ×7** — all ACCEPTED. The two that carry real weight: pinning the extent as `continuation:
  Citation[]` rather than a line span (a span leaves continuation rows unquoted, so the 15× error
  could still ship inside a correct-looking span), and requiring `framesFor` to be an exported
  function tested with synthetic inputs — which mutation I2 proved was load-bearing, not stylistic.
- **Dev ×3** — all ACCEPTED. The `WingCue` narrowing is the right call over a cast, and the AC4
  blast-radius measurement replaced jt5-2's inherited "re-runs are byte-identical" claim with a
  measurement, which is the correct treatment of a claim with a timestamp on it.
- **UNDOCUMENTED deviations found:** none. Every divergence I could identify between the six ACs and
  the shipped code was already logged.

### Findings filed — every carried-forward item has an owner

"Out of scope" is not a disposition until it has a story id. All four are filed in
`sprint/epic-jt5.yaml` with full descriptions carrying the measured quarry (ROM lines, file:line
call sites, and the constraint that blocks the obvious fix), not just a title:

| id | pts | what |
|----|-----|------|
| **jt5-20** | 2 | `CHANNELS` is vestigial for arbitrated cues — three stories have now fed a map that routes nothing. Carries the constraint that blocks the obvious delete: `src/shared/audio.ts` still routes UNARBITRATED names by channel |
| **jt5-21** | 2 | the bake's synth-spec gate is itself unguarded — only the missing-`outDir` throw is pinned. Carries why jt5-6 could not close it (`SOUNDS`/`SPECS` are module-scope, so the throw needs an injectable manifest) |
| **jt5-22** | 2 | `framesFor` edge cases — the odd-token silent drop and the invention-cue misleading bake error (findings 2 and 3 above) |
| **jt5-23** | 3 | what ARE G1DEC/G2DEC — `CUE_SOURCES` now cites two decision-block families with no model of either. Carries the measured layout and the exact two fields that differ |

Two traps hit while filing, both previously recorded and both re-confirmed: `pf sprint story add`
mints its OWN id (jt5-20..23, not guessable) and writes **no description at all**, so the quarry dies
unless a `--description` follows; and it auto-wrote `repos: pennyfarthing` on all four, which
`story update` has no flag to fix — corrected by a surgical rewrite and verified by parsing, not by
eye. Also verified the round-trip did not truncate any sibling: jt5-6 still has 6 acceptance
criteria, jt5-1 six, jt5-5 seven.

**Handoff:** To The Announcer (SM) for the finish ceremony.
---

## Impact Summary

Compiled at finish from this story's Delivery Findings. **One review round, verdict APPROVED,
blocking count 0.** Every finding below is non-blocking, and every one that survives the story has a
filed owner — none is left resting on "out of scope".

**What shipped.** joust's two knights now sound their own ROM transporter tables. `SNPCR1`
(:8116-8118, bound at P1DEC :5552) is player 1's; `SNPCR2` (:8119-8121, P2DEC :5556) is player 2's,
and it is a genuinely different sound rather than a second name for the same sample — the ROM opens
it 13 frames later (`30+13`) and gives those frames back off its silent tail (`165-13`), with fade
code `!N$15!` against SNPCR1's `!N$14!`. Both hold the voice for 450 frames. The cue is live in the
assets bucket, verified by request rather than by test.

**The structural half is the more valuable half.** `CueSource` can now express a table's whole
extent, and every cue's frame window is DERIVED from its citation instead of hand-transcribed beside
it. That closes a defect the citation gate structurally could not see: the gate re-opens the QUOTED
LINE, so `SNPCR1 FCB 070,!N$12!+$80,30` was byte-perfect and fifteen times short, and shipped green.
`FRAME_DURATIONS` is no longer a source of truth — it is `framesFor` applied to the citations, so a
window and the evidence for it can no longer drift apart. This is what jt5-5's TEA, Dev and Reviewer
each independently asked for.

**Findings carried forward — all filed, all with their quarry in the description:**

| finding | source | disposition |
|---------|--------|-------------|
| `CHANNELS` is vestigial for arbitrated cues — third story running to feed a map that routes nothing | TEA + Dev (and jt5-5 before them) | **jt5-20** (2pt) |
| the bake's synth-spec gate is itself unguarded — only the missing-`outDir` throw is pinned | TEA | **jt5-21** (2pt) |
| `framesInRow` silently drops a trailing odd token; `framesFor` returns 0 for an invention cue and the bake then reports the wrong reason | Reviewer (2 × LOW) | **jt5-22** (2pt) |
| the ROM binds each table twice (G-family and P-family); the port models neither, and `CUE_SOURCES` now cites both | TEA, confirmed by Reviewer | **jt5-23** (3pt) |

**Findings resolved inside the story, not carried:**
- A false comment at `tests/audio-events.test.ts:404` attributed the suite's only staged transporter
  re-entry to knight 1. Measured off the sim's processes: it is knight **2**. Corrected in place, and
  it turned the story's headline defect into something observable at a fixture that predates it.
- The Reviewer's one MEDIUM — `id as PlayerId` asserting a range `createGame`'s unclamped
  `playerCount` does not guarantee — was fixed in the review round (`b1358ea`) rather than bounced.
- `runBehaviour`'s cue type was narrowed to `WingCue` rather than cast. Worth knowing forward: that
  is the seam the next payload-bearing event kind will land on.

**One AC had no mechanical guard, and that was the risk worth naming.** AC4's live `200` cannot be
asserted by any vitest — the engine degrades silently on a 404, so a green suite says nothing about
the bucket. It was discharged by running the deploy and quoting the result: the new URL answers
`HTTP/2 200` with etag `3364a13db55ad1003c76dacd0ea197ec`, byte-identical to the local bake. The
blast radius was measured *before* the upload (37 of 38 staged files already byte-identical live, the
one absent being exactly the new sample), which replaced jt5-2's inherited "re-runs are
byte-identical" claim with a measurement.
