---
story_id: "jt9-7"
jira_key: "jt9-7"
epic: "jt9"
workflow: "tdd"
---
# Story jt9-7: CHANNELS is vestigial for arbitrated cues — three stories have now fed a map that routes nothing

## Story Details
- **ID:** jt9-7
- **Jira Key:** jt9-7
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 2
- **Priority:** p1
- **Branch:** main
- **PR:** none
- **Repos:** arcade

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-03T16:15:10Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-03T15:17:43Z | 2026-08-03T15:43:26Z | 25m 43s |
| red | 2026-08-03T15:43:26Z | 2026-08-03T15:43:40Z | 14s |
| green | 2026-08-03T15:43:40Z | 2026-08-03T15:54:17Z | 10m 37s |
| review | 2026-08-03T15:54:17Z | 2026-08-03T16:15:10Z | 20m 53s |
| finish | 2026-08-03T16:15:10Z | - | - |

### Branch and Context
**Branch Strategy:** trunk-based (branching skipped — work happens on the default branch, `main`)
**Context File:** sprint/context/context-story-jt9-7.md ✓ (created via `pf context create story jt9-7`, then enriched at setup — see "SM Setup Corrections" section there)
**Epic Context File:** sprint/context/context-epic-jt9.md ✓ (pre-existing, validated, not regenerated)

## Background

**Jira:** No Jira in this project — issue tracking is local via `sprint/` YAML (see CLAUDE.md). `jira_key` above is just the story id. Confirmed at setup: `is_jira_enabled()` → `0`; Jira create/claim steps were correctly skipped.

**Repo:** arcade (trunk-based, one repo, one remote, `main`). No feature branch is created for this story; work happens directly on `main` per `.pennyfarthing/repos.yaml`'s `branch_strategy: trunk-based`, confirmed via `pf.git.repos.should_create_branch()` → `False`.

**The decision this story asks for is NOT between two equal-cost options —
measured at setup, against `main` at commit `5cc5bc2`:**

`src/shared/audio.ts:69` declares `channels: Record<N, string>` as a
REQUIRED manifest field (no `?`, no default) — unlike `priorities?` (:82) and
`frameDurations?` (:87), both genuinely optional. So:
- **Keep `CHANNELS`, fix the test** — a joust-only change:
  `plugins/joust/src/shell/audio.ts` + `tests/audio-manifest.test.ts`.
- **Delete `CHANNELS`** — is **not type-legal today**: it first requires
  making `channels` optional in `src/shared/audio.ts`, a change to code all
  seven games import, with its own defaulting semantics to design from
  scratch — full-suite blast radius, not joust-only.

This repo's standing rule (CLAUDE.md) is reuse-first / extract-or-change-shared-only-once-a-second-consumer-proves-it; nothing here proves a second game needs an optional `channels`. That tilts toward "keep the map" as the lower-risk branch, but TEA/Dev must weigh and record the choice explicitly rather than inherit the story's "these are comparable options" framing. Full writeup, including the measured 18-cue count (the file's own `:51` header prose still says "seventeen" — stale, cheap to fix in the same commit) and the re-anchored `:86-97` citation (present at that exact line range, but its "still present tense" characterization does not hold as read today — re-verify before assuming it), is in `sprint/context/context-story-jt9-7.md` under "SM Setup Corrections."

**CONSTRAINT ROUTED HERE BY jt9-6's REVIEWER** (measured by another agent,
cite it, do not re-derive): `sprint/archive/jt9-6-session.md:651` — a cue
absent from a game's `channels` map gives `channel === undefined`, so
`voiceChannel` becomes `undefined`, not `null`; measured harmless because
`voiceChannel === null` implies a fully-released voice, so it behaves as a
coherent phantom channel key throughout and cannot match spuriously. Routed
explicitly to jt9-7 as a precondition for deleting joust's `CHANNELS`. Treat
as a claim to re-verify, not a fact to assume.

**Scope fence — do not touch, regardless of which branch is chosen:**
- `cp6-3` (centipede) and `sw8-27` (star-wars) are both `in_progress` in
  SIBLING checkouts right now. Do not edit any centipede or star-wars file,
  `sprint/epic-cp6.yaml`, or `sprint/epic-sw8.yaml`.
- `jt9-35` (p2, backlog, filed by jt9-6's Reviewer, pins jt9-6's new guard
  condition) is a separate story — do not absorb it here.

**Verification baselines (measured fresh at setup, 2026-08-03, commit
`5cc5bc2`):**
- `npx vitest run --project joust`: **105 files passed, 2533 tests passed**
  (matches the story's stated baseline).
- `npm run lint` (`tsc --noEmit`, repo-wide): clean.
- `npm run test:orchestrator`: **390/390** passed.
- `npx vitest run` (FULL suite): **2 files failed | 755 passed (757)**,
  **10 tests failed | 11670 passed | 1 todo (11681)** — reproduced exactly.
  The 2 failing files (`sw8-27-remediation.test.ts`,
  `gun-visibility-and-shape.test.ts`) are a SIBLING checkout's `sw8-27`
  mid-RED on `main` — EXPECTED, NOT ours, do not "fix" or attribute to this
  story. If this story stays joust-only, `--project joust` + lint +
  orchestrator suffices; the FULL run is only required if
  `src/shared/audio.ts` is touched.

Full detail (technical approach for both branches, scope, suggested minimum
ACs, harness traps) is in `sprint/context/context-story-jt9-7.md` — read it
before the RED phase.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Conflict** (non-blocking): the story context and `src/shared/audio.ts:70-75` both state that joust is
  the ONLY cabinet passing `priorities` ("Six of this arcade's seven cabinets ... pass neither map ...
  The seventh, joust"). **Measured false**: `plugins/centipede/src/shell/audio.ts:227` passes one too,
  built by a filter over POKEY voice 0 (`:209-211`), and centipede's own docblock at `:204-208` names
  three cues (`mushroom`, `headBottom`, `waveClear`) deliberately left OUTSIDE arbitration under a user
  ruling of 2026-08-03, keeping "plain per-channel stealing". This is not cosmetic — it is what turned
  SM's crux from a hypothesis into a shipped precedent, and it inverts the reuse-first argument.
  Filed as **td1-19**. *Found by TEA during test design.*
- **Gap** (non-blocking): `src/shared/audio.ts` has **no default for an absent `channels` map**.
  `startSource` reads `manifest.channels[name]` at `:238`, above and outside the `try/catch` at `:269`
  that makes every other failure a silent degrade, so an absent map is a `TypeError` on the first cue —
  not a degrade. The story's phrase "let the engine default" therefore names behaviour that does not
  exist. Pinned here as an executable test that will redden the day a default is added. Filed as
  **td1-20** (the costed version of the deletion branch, so the option is not lost by this ruling).
  *Found by TEA during test design.*
- **Gap** (non-blocking): six stale "seventeen" cue counts remain in joust's audio TEST comments —
  `tests/audio-priority.test.ts:183` and `:224` (both are `it()` TITLES, so they print wrong on every
  run) and `tests/audio-transporter-split.test.ts:65`, `:576`, `:851`. Every assertion is derived and
  correct; only the prose is stale, which is the shape that survives a green suite. Out of this story's
  file list. Filed as **jt9-36**. *Found by TEA during test design.*
- **Improvement** (non-blocking, FIXED HERE not filed): the story asked whether the `CHANNELS` docblock's
  "the engine continues to route by channel, so the map is live wiring" is still accurate. It is — but the
  sentence beside it, "a shared channel can no longer buy or deny a cue **anything**", is measurably
  **false**, and so is the header's "the fence no longer decides **anything** for these ... cues". Both
  are true only while the arbitrated window is held. Measured on the real engine (AC2 below). Guarded by
  a RED test that bans the claim by SHAPE, not spelling. *Found by TEA during test design.*

### Dev (implementation)

- No upstream findings during implementation. Both counts (18 cues via the `SoundName` union / `CHANNELS`
  keys, 18 distinct `.wav` filenames via `SOUNDS` values) were re-measured independently — by grepping the
  union in `audio-manifest.ts` and by importing the manifest under `node --experimental-strip-types` and
  taking `new Set(Object.values(SOUNDS)).size` — rather than copied from TEA's write-up or the story
  prompt, per the standing "a correction is itself a transcription" caution. Both matched TEA's numbers
  exactly.

### Reviewer (code review)

- **Gap** (non-blocking): jt9-7's three AC4 PROSE guards each pass on a false sentence. Measured by a
  novel 11-mutant battery on the GREEN tree — a false absolute phrased without the words "no longer",
  the docblock guard satisfied by the **inverted** claim (it matches keyword co-occurrence, not the
  claim), and a wrong determiner-free count hidden behind a correct decoy — all leave **2548/2548**
  green. Affects `plugins/joust/tests/audio-channel-role.test.ts` (widen the shapes; the AC2 trio is
  what actually carries the claim). Filed as **jt9-37**. *Found by Reviewer during code review.*
- **Gap** (non-blocking): both count guards read only `src/shell/audio.ts` and `src/main.ts`.
  `plugins/joust/src/shell/audio-manifest.ts:96` ("all eighteen have one") and `:575` ("Three of these
  eighteen") are live-code counts over the same 18-cue set and are unguarded — changing `:96` to
  "seventeen" left 2548/2548 green. Affects the guard's file list. Filed under **jt9-37** (4). *Found by
  Reviewer during code review.*
- **Gap** (non-blocking): jt9-36's stale-count inventory was itself under-counted — its title said six,
  it enumerated five, and the real number is **eight**: three more sites live outside `tests/`, in
  `plugins/joust/tools/sample-bake/` (`bake-samples.mjs:152`, `bake-samples.test.mjs:30`,
  `deploy-assets.test.mjs:21`). **jt9-36 updated in place** with all eight and the re-measured totals.
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking, FIXED IN PLACE): three line citations inside the file TEA committed went
  stale under Dev's own GREEN commit in the same story — `audio.ts:151-158` (now `:157-164`) at
  `audio-channel-role.test.ts:33` and `:72`, and `audio.ts(162,45)` (now `(168,45)`) at `:14`. The
  comment at `:72` claiming the reference "cannot drift from it" was one of them. Re-anchored on symbols
  and corrected; `td1-20`'s copy of `(162,45)` corrected too. *Found by Reviewer during code review.*
- **Improvement** (non-blocking, FIXED IN PLACE): two RED-phase comments in
  `audio-channel-role.test.ts` were left present-tense and are false after GREEN — "Two sentences match
  today" (the GREEN removed both) and "none of `window`, `release`, `expire`, `tick` appears in that
  docblock at all" (adding them WAS the fix). Past-tensed, with the current non-vacuity basis named.
  *Found by Reviewer during code review.*
- **Question** (non-blocking): `td1-19`'s evidence line for centipede moved from `:227` to `:239` between
  TEA's measurement and this review, and `cp6-3` pushed that file again during the review itself.
  `td1-19` amended to say **grep for the `priorities:` line, do not trust either number**. *Found by
  Reviewer during code review.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

1 deviation

- **New tests landed in a NEW file rather than only in the one the story names.**

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Scope widened by two files beyond the story's declared list:** the story scopes the change to
  `plugins/joust/src/shell/audio.ts` + `tests/audio-manifest.test.ts`. Added: (1)
  `plugins/joust/src/main.ts:167`, which says "The seventeen `.wav` files it will fetch" — the SAME
  measured off-by-one the story names at `audio.ts:51`, one word, and the repo's standing rule is to fix
  a prose defect in place rather than open a cycle for it; (2) `plugins/joust/README.md:48` (105 -> 106
  test files), which is not a choice — `the suite FILE count matches what vitest actually discovers`
  (`tests/audio-seam-scope.test.ts:376`) is an existing DERIVED guard and adding any test file reddens it.
- **The story's "delete the map" option was declined, not deferred silently.** Spec framed the two
  branches as comparable; measured, they are not (three legs in the TEA Assessment below). The deletion
  branch is filed as **td1-20** with its measurements attached, so the ruling narrows today's scope
  without closing the option.
- **New tests landed in a NEW file rather than only in the one the story names.**
  `tests/audio-manifest.test.ts` is jt5-1's, and its `createAudioEngine builds an engine with the shared
  surface` test needs the REAL `@shared/audio`; the behavioural half of jt9-7 needs a fake
  `AudioContext` installed per test. Splitting keeps jt5-1's file honest. The story's named test IS
  re-aimed in place, and the stale "Eleven cues carry nine distinct ROM priorities" comment beside it
  (measured: 18 cues, 13 priorities) is corrected by DERIVING both sides.

### Dev (implementation)

- No deviations from spec. TEA's RED tests fully specified the four prose guards (count, no-absolute ban,
  docblock window/release requirement) and the pre-existing derived README guard; the fix is the minimal
  prose rewrite each one demands, confined to the same three files TEA's own deviation entry above already
  widened the story to (`audio.ts`, `main.ts`, `README.md`). No `CHANNELS` map value, no test file, and no
  file outside `plugins/joust/` was touched.

## Sm Assessment

**Routing:** tdd (phased) → red → TEA. p1, 2 points. A **decide-then-do** story: the
decision is the deliverable, and the code change is small either way.

**THE STORY PRESENTS TWO OPTIONS AS COMPARABLE. MEASURED, THEY ARE NOT.**
`src/shared/audio.ts:69` declares `channels: Record<N, string>` as a REQUIRED manifest
field — no `?`, no default — unlike `priorities?` and `frameDurations?` right below it.
So "delete joust's map and let the engine default" is **not type-legal today**. It is not
a joust edit at all; it is a change to the shared engine's public manifest type, compiled
against all seven cabinets, with defaulting semantics that would have to be designed. The
other branch ("keep it and make the test assert what it actually guarantees") is a
two-file joust change. Weigh that asymmetry against this repo's standing reuse-first rule
before treating deletion as the tidy option.

**THE CONSTRAINT THE STORY NAMES IS TRUE TODAY — I measured it rather than trusting the
filing.** The filing says removing the map is only safe while all 18 joust cues carry a
priority. Brace-matched `CUE_SOURCES` in `plugins/joust/src/shell/audio-manifest.ts`:
exactly **18 top-level entries, every one `kind: 'rom'`**. `PRIORITIES` is built at
`plugins/joust/src/shell/audio.ts:151-158` by walking `CUE_SOURCES` and assigning
`source.priority` **only when `source.kind === 'rom'`**. So today every cue is arbitrated
and the constraint is satisfied.

**AND THAT IS EXACTLY WHY THE CONSTRAINT IS THE WRONG THING TO LEAN ON — this is the
argument I most want TEA to engage with, and it is mine, so treat it as a CLAIM.**
`PRIORITIES` is DERIVED, not declared. `CueSource` has a second arm, `kind: 'invention'`,
which is a supported typed thing joust can add at any time — jt9-5 gave it a REQUIRED
`frames` field precisely so inventions could be first-class. The moment joust gains its
first invention cue, that cue gets no priority, falls outside arbitration, and is routed
BY CHANNEL. Centipede already ships three such inventions (`mushroom`, `headBottom`,
`waveClear`). So "all 18 carry a priority" is not a property of the design; it is a
coincidence of the current cue list, and nothing enforces it. Delete `CHANNELS` and the
`Record<SoundName, string>` completeness check — the thing that today makes a cue with no
channel a COMPILE error — goes with it, so the first invention would route to
`undefined` silently. jt9-6's Reviewer measured that `undefined` behaves as a coherent
phantom channel key and cannot match spuriously, which means it would not crash; it would
just quietly put every unarbitrated cue on one shared phantom channel.

**TWO PROSE CLAIMS IN THE FILING, ONE STALE AND ONE REAL — do not fix the one that is
already fixed.**
- STALE: the filing says the header comment "still describes the fence in the present
  tense". It does not. The docblock above `CHANNELS` (`plugins/joust/src/shell/audio.ts`,
  approx `:86-97`) already reads "The channel no longer decides which cue wins. Until
  jt5-5 it did..." — someone corrected it and the story text did not catch up. Re-anchor
  and re-read before touching it.
- REAL, and NOT named by the filing: the header comment at approximately `:51` says the
  fence "no longer decides anything for these **seventeen** cues". The measured count is
  **18** (`grep -c "seventeen"` returns 1, `"eighteen"` returns 0). jt5-6 added the
  eighteenth cue and this sentence was not re-measured — the same shape as the
  `correction-is-itself-a-transcription` lesson. Fix the number by MEASURING it, not by
  copying 18 out of this assessment.
- One more to judge, not assume: the same docblock asserts "the engine continues to route
  by channel, so the map is live wiring, just no longer the arbitration." Decide whether
  that is still accurate given every joust cue is arbitrated — channel is still used for
  `live`/`pending` bookkeeping and by `stopChannel`, so it may be true in a narrower sense
  than it reads.

**Routed here by jt9-6's Reviewer (measured by another agent — re-open, do not inherit):**
a cue absent from a game's `channels` map yields `channel === undefined`, so `voiceChannel`
becomes `undefined` rather than `null`; it cannot match spuriously because `voiceChannel
=== null` implies a fully-released voice. Cited in `sprint/archive/jt9-6-session.md`
(around `:537-543` and `:651`).

**Scope fence.** `cp6-3` (centipede) and `sw8-27` (star-wars) are BOTH in progress in
sibling checkouts. Touch no centipede or star-wars file, and neither epic YAML. `jt9-35`
covers pinning jt9-6's new guard condition — do not absorb it.

**Baselines, measured fresh at setup (commit `5cc5bc2`):**
- `npx vitest run --project joust`: 105 files / 2533 tests passed.
- `npm run lint`: clean. `npm run test:orchestrator`: 390/390.
- FULL `npx vitest run`: 755 of 757 files pass; **2 files / 10 tests FAIL and they are NOT
  ours** — a sibling has `sw8-27` mid-RED on `main`
  (`plugins/star-wars/tests/audit/sw8-27-remediation.test.ts` and
  `plugins/star-wars/tests/core/gun-visibility-and-shape.test.ts`). Do not "fix" them and
  do not read them as a regression. If this story stays joust-only, `--project joust` is
  the verification; if it touches `src/shared/audio.ts`, the full run is mandatory and
  those 10 are the expected floor.

**Branch:** none. Trunk-based; work lands on `main`.

## Tea Assessment

**Tests Required:** Yes
**Status:** RED (5 failing — 4 jt9-7 guards + 1 pre-existing derived guard this story trips)

---

### THE DECISION — **KEEP `CHANNELS`**, and make the test assert what it guarantees

The story's primary deliverable. Three legs, each **re-measured** here against `main` at `5cc5bc2`
rather than inherited from the filing or from SM.

**Leg 1 — deletion is not a joust change, and there is nothing to "let default".**
`src/shared/audio.ts:69` declares `channels: Record<N, string>` REQUIRED (SM's measurement, confirmed).
Dropping the `channels:` line gives `plugins/joust/src/shell/audio.ts(162,45): error TS2345`. Beyond
type-legality, and **not previously measured by anyone**: there is no default to fall back on.
`startSource` reads `manifest.channels[name]` at `src/shared/audio.ts:238` — **above and outside** the
`try/catch` at `:269` that makes every other failure in this engine a silent degrade. An absent map is
`TypeError: Cannot read properties of undefined`, on the first cue of the first game. Blast radius of
fixing that properly: 6 production `channels:` sites across five manifest-building cabinets, plus 24
manifest literals in `src/shared/tests/`.

**Leg 2 — SM's crux is not a hypothesis; a second cabinet already ships it.** SM argued that `PRIORITIES`
is DERIVED (`plugins/joust/src/shell/audio.ts:151-158`, `if (source.kind === 'rom')`), that `CueSource`
has an `invention` arm jt9-5 made first-class, and that joust's total priority coverage is therefore a
coincidence of today's 18-cue list. Engaging with it as instructed, I found the argument is **stronger
than stated**: `plugins/centipede/src/shell/audio.ts:227` passes `priorities` too — so joust is *not*
the only arbitrated cabinet, contrary to both the story context and `src/shared/audio.ts:70-75` — and
centipede's docblock at `:204-208` names three cues (`mushroom`, `headBottom`, `waveClear`) deliberately
held OUTSIDE arbitration under a user ruling of 2026-08-03, where they "keep plain per-channel
stealing". The configuration SM predicted for joust is **live in production today, one cabinet over**.
That also inverts the reuse-first test: the second consumer does not want `channels` optional, it needs
`channels` *precisely because* it has unarbitrated cues. Filed as **td1-19**.

**Leg 3 — the test three stories "had to feed" was redundant with `tsc`, which is why it read as a tax.**
Measured by mutation: deleting `extraMan: 'prio-100'` from `CHANNELS` gives
`error TS2741: Property 'extraMan' is missing ... but required in type 'Readonly<Record<SoundName, string>>'`.
CI runs `npm run lint` **before** the vitest project. So `CHANNELS gives every SOUNDS entry a voice`
asserted only what the compiler already refuses — the map was fed by the TYPE, not by that test.
Deleting the assertion costs nothing; replacing it with claims the type *cannot* make is a strict gain.

**AND THE HOLE THAT WAS ACTUALLY OPEN.** Two mutations of `CHANNELS` survive **all 2533 joust tests and
`tsc`**: splitting one ROM priority across two channels (`enemyWingUp: 'prio-6'` -> `'prio-6b'`) and
renaming a channel to a priority the ROM does not have (`prio-6` -> `prio-99`). The old rule checked one
direction only and `continue`d past any channel holding fewer than two cues, so a split hid in the skip.
The header has claimed the strong form since jt5-5 — "cues on one channel are exactly the cues at one
ROM priority" — and nothing pinned it. **That gap, not the map, was the real defect.**

**One SM claim corrected, one confirmed.** SM flagged the header's "seventeen" (REAL) and said the
docblock's tense was already fixed (STALE — confirmed, left alone). SM also asked me to judge whether
"the engine continues to route by channel, so the map is live wiring" still holds. It does — but the
sentence beside it does not. **"a shared channel can no longer buy or deny a cue anything" is measurably
FALSE**, and so is the header's "the fence no longer decides anything". Both hold only while the
arbitrated window is HELD. Measured on joust's real engine: after the window is released, a cue on the
SAME channel stops a still-ringing source and a cue on a DIFFERENT channel does not — the *only*
difference being the channel. Reachable whenever the sim runs ahead of the audio clock (`pumpFrames`
catch-up, `MAX_CATCHUP_SECONDS`).

**jt9-6's routed constraint, re-opened not inherited.** Its *harmless* half holds: a cue absent from a
present `channels` map keys `undefined` coherently, nothing crashes, nothing matches spuriously. What it
did not say is what the completeness check is worth — priced here: two holed cues key `live` on the same
`undefined` and steal from each other across ROM priorities they never shared. Its scope also needed
narrowing: it is about a cue missing from a *present* map. An **absent map** is a different case, and it
throws (Leg 1).

---

### Test Files

- `plugins/joust/tests/audio-channel-role.test.ts` — NEW. 15 tests. The decision and its measurements in
  the header; AC1 what the map IS (priority partition both directions, channel count, naming
  convention); AC2 what it DOES (three behavioural tests on joust's real engine); AC3 what deletion
  would cost (no engine default -> throws; phantom-channel pricing); AC4 the prose guards.
- `plugins/joust/tests/audio-manifest.test.ts` — MODIFIED. Re-aimed `CHANNELS gives every SOUNDS entry a
  voice` (the assertion three stories fed) and recorded *why* it was weak; corrected the stale
  "Eleven cues carry nine distinct ROM priorities" comment by DERIVING both sides.

**Tests Written:** 15 new + 2 re-aimed, covering 4 ACs. **11 are GREEN ON ARRIVAL and say so** — they are
the decision's evidence and the characterization of a mechanism nothing pinned, and each is proven to
bite by the battery below.

### RED tests (what Dev must make GREEN)

| # | Test | What Dev changes |
|---|------|------------------|
| 1 | `the audio header's cue count is the number of cues there are` | `audio.ts:51` "seventeen" -> the measured count |
| 2 | `main.ts counts the .wav files the engine will fetch` | `main.ts:167` "seventeen" -> the measured distinct-file count |
| 3 | `no sentence claims the channel stopped mattering ENTIRELY` | remove the absolute from `audio.ts:51` **and** `:93` |
| 4 | `the CHANNELS docblock names the case where the channel still decides` | add the released-window sentence to the `CHANNELS` docblock |
| 5 | `the suite FILE count matches what vitest actually discovers` (PRE-EXISTING, `audio-seam-scope.test.ts:376`) | `plugins/joust/README.md:48` 105 -> 106 |

**Do not measure the counts from this document — re-measure them.** The correction is itself a
transcription; that is how jt5-7 shipped a wrong "centipede 5". All four guards compare a spelled
number-word against a value derived at runtime, never a literal.

### Mutation battery

Every mutation `git diff`ed before its verdict was believed; every restore from a snapshot and
`cmp`-verified byte-exact; runners strictly sequential; every shell variable quoted. Scripts and full
output in the scratchpad (`battery.sh`, `battery-prose.sh`).

**Structural** (file: `plugins/joust/src/shell/audio.ts`), verdicts vs the NEW tests:

| ID | Exact mutated string | Verdict |
|----|----------------------|---------|
| M1 | `  enemyWingUp: 'prio-6b',` (was `'prio-6'`) — SPLITS one ROM priority | RED x3: `iff`, `exactly as many channels`, `NAMED for the ROM priority`. **Survives all 2533 old tests + `tsc`** |
| M2 | `  enemyThud: 'prio-6',` (was `'prio-9'`) — MERGES two priorities | RED x4, including jt5-1's own `cues sharing a channel share the ROM's priority` — control that the old property still bites |
| M3 | `: 'prio-99',` x2 (was `: 'prio-6',`) — consistent WRONG rename | RED x1: `NAMED` only. Partition tests GREEN — the two properties are independent, not duplicates. **Survives all 2533 old tests + `tsc`** |
| M4 | `: 'voice-` x18 (was `: 'prio-`) — global rename | RED x1: `NAMED` only. Partition GREEN |
| M5 | **CONTROL** — swap the `enemyThud`/`enemyWingDown` lines, no semantic change | **GREEN** (baseline 4 only) |

**Prose.** A harness-draft fix was applied first (reverted, never committed) to prove the guards are
*satisfiable* — a guard nobody can satisfy is worse than none — then mutated on top of it:

| ID | Exact mutated string | Verdict |
|----|----------------------|---------|
| P0 | the draft fix alone | **GREEN 15/15** — all four guards satisfiable |
| P1 | `these nineteen cues` (a WRONG value, not the old one) | RED — count guard |
| P2 | `// the fence settles nothing that the priority does not; the map is kept` — clause DELETED | RED — count guard (positive precondition; deleting the sentence is not a way to make its number right) |
| P3 | **CONTROL** — same sentence re-wrapped across a different line break | **GREEN** |
| P4 | **CONTROL** — `SIXTEEN of the nineteen carry no payload` in `core/events.ts` (a different claim, different file — 17 EVENT KINDS, correctly) | **GREEN** — resolution holds |
| P5 | ` * The channel no longer decides anything at all.` — a REWORDED absolute, not the old spelling | RED — the guard bans by SHAPE, so a reworded absolute cannot slip through |
| P6 | the required window sentence moved OUT of the docblock into the file header | RED — proximity holds |
| P7 | **CONTROL** — `rather than an unroutable cue.` (unrelated word inside the docblock) | **GREEN** |

### Verification at handoff

- `npx vitest run --project joust`: **106 files, 2548 tests, 5 failed** (the table above). Baseline was
  105 / 2533 / 0.
- `npm run lint`: **clean**. `npm run test:orchestrator`: **390/390**.
- Full suite NOT required: **no file under `src/shared/` was touched** (`git diff --stat -- src/shared/`
  is empty), and no source file at all was modified — TEA wrote tests only.
- Sibling `sw8-27` mid-RED on `main` is untouched and stays the expected floor of any full run.

### Scope fence honoured

No centipede or star-wars file was edited (centipede was READ only, for the td1-19 measurement); neither
`sprint/epic-cp6.yaml` nor `sprint/epic-sw8.yaml` was touched. **jt9-35 was not absorbed.**

**Findings filed (standing rule — every descoped finding ends with a story id):** **td1-19** (shared
docblock false about who passes `priorities`), **td1-20** (the costed deletion branch), **jt9-36** (six
stale test-comment counts).

**Handoff:** To Dev for implementation. `.session/jt9-7-handoff-red.md`.

## Dev Assessment

**Implementation Complete:** Yes

**Decision reaffirmed, not relitigated:** kept `CHANNELS`; made only the prose changes TEA's RED tests
required. No `CHANNELS` value, no test file, and no file outside `plugins/joust/` changed.

**Files Changed:**
- `plugins/joust/src/shell/audio.ts` — two prose fixes, both re-measured independently rather than copied:
  (1) the file-header paragraph (was `:51`): `seventeen` → `eighteen` (re-measured: `SoundName` union /
    `CHANNELS` keys = 18, via `grep`), and the false absolute `"the fence no longer decides anything for
    these ... cues"` reworded to the true, narrower claim — the fence settles nothing *while the arbitrated
    window holds the voice*, and once released a shared channel decides again whose tail gets cut.
  (2) the `CHANNELS` docblock (was `:86-97`): removed the false absolute `"a shared channel can no longer
    buy or deny a cue anything"`, replaced with the accurate mechanism — arbitration governs while the
    window holds, and once it is released `stopChannel` (a real, existing function at `src/shared/audio.ts:206`,
    called unconditionally from `startSource`) again lets same-channel cues cut a still-ringing one off.
    Kept the two sentences already true and non-absolute (`"no longer decides which cue wins"`, `"no
    longer the arbitration"`) untouched, per TEA's note that they must survive.
- `plugins/joust/src/main.ts` — `:167` `seventeen` → `eighteen` (re-measured: `new
  Set(Object.values(SOUNDS)).size` = 18 distinct `.wav` filenames, via `node --experimental-strip-types`
  importing the manifest directly, not counted by hand).
- `plugins/joust/README.md` — `:48` quick-start file count `105` → `106`, matching the pre-existing derived
  guard (`audio-seam-scope.test.ts:376`) that reddens on any test-file-count drift; TEA's new file made it
  trip.

**Independent verification (re-measured, not re-run of TEA's numbers):**
- 18-cue count and 18-distinct-file count both derived fresh (see above), not copied from TEA's write-up
  or the story prompt — both matched TEA's numbers exactly.
- Own mutation battery (distinct from TEA's — targeted at MY diff, not the `CHANNELS` map, since this
  story's fix touched only prose): every mutation `git diff`ed to confirm it landed, restored from a
  byte-`cmp`-verified snapshot (never `git checkout --` on the uncommitted fix), runners strictly
  sequential.
  - Count guard, wrong value (not the old spelling): `eighteen` → `nineteen` in the header → RED (`"these
    nineteen cues" — joust ships 18`). Restored, confirmed byte-exact.
  - Absolute-ban guard, a REWORDED absolute (not the original spelling, proving the guard bites on SHAPE):
    `"just no longer the arbitration."` → `"and the channel no longer matters at all."` → RED (`no sentence
    claims the channel stopped mattering ENTIRELY`). Restored, confirmed byte-exact.
  - Docblock window-guard regression check: deleted my added release/window sentence from the `CHANNELS`
    docblock → RED (`the CHANNELS docblock names the case where the channel still decides`) — proves the
    sentence is load-bearing for that guard, not decorative. Restored, confirmed byte-exact.
  - `main.ts` count guard, wrong value: `eighteen` → `twenty` → RED (`"twenty .wav files" — the manifest
    names 18 distinct files`). Restored, confirmed byte-exact.
  - README count guard, wrong value: `106` → `107` → RED (`README says 107 test files; vitest discovers
    106`). Restored, confirmed byte-exact.
  - CONTROL (must stay GREEN): re-wrapped the new header sentence across different line breaks, no content
    change → GREEN, 28/28 in the two affected test files — proves the guards read by resolved sentence, not
    by raw line text.
  - Final restore of all three files verified byte-identical to the pre-mutation snapshot via `cmp` before
    running the full verification below.

**Tests:** `npx vitest run --project joust`: **106 files passed (106), 2548 tests passed (2548)** —
baseline (measured at RED) was 105 files / 2533 tests, +1 file (TEA's new `audio-channel-role.test.ts`)
and the 5 RED tests now GREEN, 0 failures.
`npm run lint`: **clean** (`tsc --noEmit`, repo-wide).
`npm run test:orchestrator`: **390/390** passed.
Full `npx vitest run` NOT run: joust-only change, no file under `src/shared/` touched
(`git diff --stat -- src/shared/` empty) and no file outside `plugins/joust/` touched at all
(confirmed via `git diff --stat -- plugins/centipede/ plugins/star-wars/ sprint/epic-cp6.yaml
sprint/epic-sw8.yaml` — all empty).

**Branch:** main (trunk-based; no branch created, per `.pennyfarthing/repos.yaml` `branch_strategy:
trunk-based`).

**Scope fence honoured:** no centipede or star-wars file touched; neither `sprint/epic-cp6.yaml` nor
`sprint/epic-sw8.yaml` touched; `jt9-35` not absorbed; no test file edited to make it pass — only the
three production/doc files TEA's RED named.

**Handoff:** To Reviewer.

## Reviewer Assessment

**Verdict:** APPROVED (with five prose/citation defects **fixed in place**, and three gaps filed)

The decision is sound and independently re-measured, the shipped prose is **TRUE** against the engine as
it stands *after* jt9-6, and the executable tests (AC1/AC2/AC3) are strong — a novel battery reddened
them from three different directions. What is weak is the three **AC4 prose guards**: four novel mutants
carrying false statements survive all 2548 tests. That is test-strength work, not a shipped defect, and
it is filed as **jt9-37** rather than bounced, because a REJECT would cost a full cycle to harden guards
on prose that is currently correct.

---

### 1. The load-bearing claims, re-measured rather than inherited

Every one of these was re-opened from the source, not read out of TEA's or Dev's write-up.

| Claim | Source | Verdict |
|---|---|---|
| `channels` is REQUIRED — deletion is not type-legal | dropped the `channels: CHANNELS,` line, ran `npm run lint` | **CONFIRMED.** `plugins/joust/src/shell/audio.ts(168,45): error TS2345`. TEA recorded `(162,45)`; **Dev's own GREEN moved it six lines** — see §4 |
| Deleting one `CHANNELS` entry is a compile error, so the map was fed by the TYPE | deleted `extraMan: 'prio-100',`, ran `npm run lint` | **CONFIRMED.** `audio.ts(104,14): error TS2741: Property 'extraMan' is missing …` |
| CI lints BEFORE it runs the vitest project | `.github/workflows/deploy.yml` | **CONFIRMED.** `npm run lint` `:178` → `test:orchestrator` `:198` → `npx vitest run --project "$APP"` `:204` |
| `manifest.channels[name]` is read ABOVE and OUTSIDE the try/catch | `src/shared/audio.ts` | **CONFIRMED.** read at `:238`, `try {` at `:269`; `channels: Record<N, string>` at `:69`, `stopChannel` at `:206`. An absent map is a `TypeError`, not a degrade |
| The old assertion `continue`d past any channel with <2 cues | `plugins/joust/tests/audio-manifest.test.ts:211` | **CONFIRMED** — `if (names.length < 2) continue`, verbatim |
| centipede passes `priorities`, so joust is not the only arbitrated cabinet (td1-19) | `plugins/centipede/src/shell/audio.ts` (READ only) | **CONFIRMED** in substance — `priorities: PRIORITIES`. The LINE drifted `:227` → `:239` between TEA's measurement and this review, and `cp6-3` pushed that file again *during* the review. td1-19 amended to say grep, not trust a number |
| 18 is right on BOTH counts | imported the manifest under node type-stripping | **CONFIRMED.** `SOUNDS`=18, distinct `.wav`=18, `FRAME_DURATIONS`=18, `CHANNELS`=18, distinct channels=13, `EVENT_KINDS`=17 (so `events.ts:93` / `demo.ts:944` are correctly 17, as jt9-36 says) |
| **Dev's NEW prose claim is true after jt9-6** | read `stopChannel` `:206-229` + `tick` `:322-327` + mutants R9/R10 | **CONFIRMED.** `tick()` calls `releaseVoice()` when the counter reaches zero, clearing `voiceChannel`; after that the cross-channel steal at `:266` is dead (`voiceChannel !== null` is false) while `stopChannel(channel)` at `:263` still runs — so a SHARED channel cuts the tail and a DIFFERENT one does not. jt9-6's `if (voiceChannel === channel) releaseVoice()` inside `stopChannel` is a no-op on this path and does not disturb the claim |

**"No third site survives" — it does not hold.** See §5: three more stale `seventeen` sites exist outside
`tests/`, and jt9-36's own inventory was under-counted.

---

### 2. The novel mutation battery — 9 mutants + 2 controls, none in TEA's 13 or Dev's 6

Method: a Python driver applied each edit by unique-anchor replacement (anchor uniqueness **asserted**, so a
missed anchor aborts rather than printing a false KILL); every mutant was `diff -u`'d against a snapshot and
its added/removed line counts printed **before** its verdict was believed; `vitest --reporter json` was
parsed for failing test names; every file was restored by copy from the snapshot and re-verified with
`filecmp` byte-exact; runs strictly sequential; no shell interpolation anywhere.

Baseline: **106 files / 2548 tests, 0 failures.**

| ID | File | Exact mutated string (VERBATIM) | Verdict |
|----|------|--------------------------------|---------|
| **R1** | `plugins/joust/src/shell/audio.ts` | ` * routing power the map keeps. A shared channel buys and denies a cue nothing`<br>` * at all. What the grouping still says is TRUE and worth` | **SURVIVED** 2548/2548 |
| **R2** | `plugins/joust/src/shell/audio.ts` | ` * window is released the channel is released with it, so a shared channel`<br>` * decides nothing about whose tail gets cut and the map keeps no routing power.` | **SURVIVED** 2548/2548 |
| **R3** | `plugins/joust/src/shell/audio.ts` | `// what the priority already decided for seventeen cues; the map is kept` | KILLED ×1 — `the audio header's cue count is the number of cues there are` |
| **R4** | `plugins/joust/src/shell/audio.ts` | `// what the priority already decided for seventeen cues; all eighteen cues stay`<br>`// routed either way, and the map is kept` | **SURVIVED** 2548/2548 |
| **R5** | `plugins/joust/src/main.ts` | `// only the first call does work. The \`.wav\` files it will fetch are NOT` | KILLED ×1 — `main.ts counts the .wav files the engine will fetch` |
| **R7** | `plugins/joust/src/shell/audio.ts` | `  eggHatched: 'prio-45b',` **and** `  pteroDeath: 'prio-65',` | KILLED ×5 — `cues share a channel if and only if…`, `each channel is NAMED for…`, jt5-3 AC7, jt5-1 AC4, jt5-4 |
| **R9** | `src/shared/audio.ts` | `    const destination = master`<br>`    if (voiceFrames > 0) stopChannel(channel)` | KILLED ×2 — `ONCE the window is released, a SHARED channel still cuts a ringing cue off`, `a cue MISSING from a present map shares one phantom channel` |
| **R10** | `src/shared/audio.ts` | `    // MUTANT R10 — cross-channel steal removed` (replacing the 3-line `if (priority !== undefined && voiceChannel !== null && voiceChannel !== channel) { stopChannel(voiceChannel) }`) | KILLED ×1 — `WHILE the window is held, the channel decides nothing — the voice reaches across it` |
| **R11** | `plugins/joust/src/shell/audio-manifest.ts` | ` * behind it. None is used today — all seventeen have one.` | **SURVIVED** 2548/2548 |
| **C1** | `plugins/joust/src/shell/audio.ts` | `// decision rather than by oversight.` — CONTROL | **GREEN** ✅ as required |
| **C2** | `plugins/joust/src/shell/audio.ts` | `  // jt9-7 review control — an inert comment inside the map` inserted above `  enemyThud: 'prio-9',` — CONTROL | **GREEN** ✅ as required |

Plus two `tsc` probes (drop `channels: CHANNELS,`; delete `extraMan: 'prio-100',`) — both restored byte-exact.
`src/shared/audio.ts`, `plugins/joust/src/shell/audio.ts` and `plugins/joust/src/main.ts` were all
`cmp`-verified byte-identical to their pre-battery snapshots afterwards.

**The four survivors, judged honestly — all four are REAL HOLES, none is an equivalent mutant:**

- **R1 — the shape-ban only bans one tense.** The filter is `/no longer/i` **AND** `/(anything|nothing|at
  all)/i`; both clauses are required. "A shared channel buys and denies a cue nothing at all." is the
  *exact* falsehood jt9-7 exists to delete, reworded without "no longer" — and it ships green. Dev's own
  reworded-absolute mutant kept the words "no longer", so it tested the easy half.
- **R2 — the strongest finding.** `the CHANNELS docblock names the case where the channel still decides`
  matches on **keyword co-occurrence** (`channel` + one of `window|released?|expires?|expired|tick`), not on
  the claim. The **inverted** sentence — the channel decides *nothing* once released — carries both keywords
  and passes. Dev could have "fixed" the docblock by restating the falsehood in different words and gone
  green on the first try. The claim is genuinely carried by the AC2 trio, not by this guard.
- **R4 — a decoy defeats the count guard.** The regex requires a totality determiner, so a determiner-free
  count is invisible; the positive precondition catches that **only** when no other claim matches (R3, which
  reddened). Add a correct sibling and a WRONG count ships. Given that "seventeen" survived three stories in
  prose, this is the exact failure mode the guard was written for.
- **R11 — the guards read two files, not the plugin.** `audio-manifest.ts:96` ("all eighteen have one") and
  `:575` ("Three of these eighteen") are live-code counts over the same 18-cue set, in the same directory,
  and unguarded.

All four filed as **jt9-37** (p2, 2 pts), with every verbatim string and both controls recorded there.

**What the battery also proved GOOD, and is worth saying:** R7 was designed to break the partition while
holding the channel COUNT at 13 — and the counting test stayed green while the `iff` and `NAMED` tests
reddened, plus three pre-existing jt5 tests. So `there are exactly as many channels as the ROM has distinct
priorities` is not what catches a split; `NAMED` and `iff` are, and they are not redundant with each other
(TEA's M3 showed the converse). R9 and R10 confirm the AC2 tests measure the real engine — remove either
half of the mechanism Dev's prose cites and the corresponding test reddens. The behavioural half of this
story is solid.

---

### 3. Mandatory analysis

**Data flow traced, end to end.** Pure core emits a `GameEvent` → `audio-dispatch.ts` → joust's
`createAudioEngine` → shared `startSource(name, loop)`. There: `manifest.sounds[name]` `:237` and
`manifest.channels[name]` `:238` are read **unguarded**; then the arbitration refusal `:245`; then the
buffer lookup `:246`; then `stopChannel(channel)` `:263`; then the cross-channel steal `:266`; then node
construction inside `try` `:269`. **Safe because** both unguarded reads are on `Record<SoundName, …>` —
total over the cue union and a compile error to hole — and `name` is typed `SoundName`, so no runtime value
can reach them off-union. That single unguarded access is precisely what AC3's `an absent channels map
THROWS` pins, and the day the engine grows a default that test reddens and td1-20 becomes worth re-costing.
Good design: the test is a tripwire on someone else's future change.

**Wiring.** The AC2/AC3 behavioural tests call joust's **real** `createAudioEngine` with a fake
`AudioContext`/`fetch` — nothing between `CHANNELS` and the assertion is stubbed — so they prove the map is
actually wired, not merely well-formed. Verified by R9/R10: a change in `src/shared/audio.ts` reddens joust
tests, which is only possible if the seam is live.

**Pattern, good:** `PRIORITIES` is DERIVED from `CUE_SOURCES` (`audio.ts:157-164`, `if (source.kind ===
'rom')`) rather than retyped — one idea, one spelling — and the new tests read the priority through the same
`romPriority` helper, so the test cannot drift from the source. **Pattern, bad:** hardcoded line-number
citations inside comments; three of them drifted **inside this very story** (§4).

**Error handling.** Every failure path in this engine is a silent degrade by design (ctor failure `:191`,
fetch/decode `:176`, one-shot arriving early `:250`, node construction `:291`), and `stopChannel` guards its
own `prev.stop()` `:223-228` so a already-ended node cannot abort a cut-in. The single exception is the
`channels` read, and it is now documented AND pinned. Null/empty: an empty `CHANNELS` is `TS2741`; a name
off the union is a compile error; `frameDurations` missing is explicitly "holds for zero frames".

**Security.** Nothing to attack. No auth, no secrets, no user-supplied strings: `fetch(manifest.baseUrl +
file)` composes a compile-time constant with values from a typed `const` map, so there is no injection
surface and no path traversal. Test-side `readFileSync` resolves from `import.meta.url`. No new dependency,
no network in CI. This diff is prose plus tests.

**Hard questions.** Huge/degenerate inputs: n/a, the cue set is a closed union. Timeouts: none introduced.
Races: the decode-vs-play race is handled by `pending`/`failed` and is untouched here. One forward-looking
brittleness, non-blocking: if a `kind: 'invention'` cue is ever added, `romPriority` returns `undefined` for
all of them, so `new Set(NAMES.map(romPriority))` collapses every invention into ONE set member and the
pairwise `iff` test would demand that all inventions share one channel. That is a future-tense concern owned
by **td1-20** (which is the story that would introduce such a cue's design) — it is not wrong today, and
today's non-vacuity assertion at the foot of `each channel is NAMED…` makes the change visible.

---

### 4. Fixed in place (cheap prose defects — a REJECT would have cost a cycle for these)

All in `plugins/joust/tests/audio-channel-role.test.ts` unless noted. Suite re-verified green afterwards.

1. `:14` — `audio.ts(162,45)` → **`(168,45)`**, re-measured by actually producing the TS2345. Dev's GREEN
   added six prose lines above the call site.
2. `:33` and `:72` — `src/shell/audio.ts:151-158` → **`:157-164`**, re-anchored on the symbol
   `const PRIORITIES`. The comment at `:72` asserting the reference "cannot drift from it" was itself one of
   the drifted citations; it now distinguishes the value (cannot drift) from the line (did).
3. The absolute-ban comment — "Two sentences match today" was **false after GREEN** (the GREEN removed both,
   so the matching set is empty). Past-tensed, survivors re-anchored to `:94` / `:101-102`, and the R1 gap
   named with its story id.
4. The docblock-guard comment — "Non-vacuous today by measurement: none of `window`, `release`, `expire`,
   `tick` appears in that docblock at all" was **false after GREEN** (adding them WAS the fix). Rewritten to
   say what keeps it honest now (the deletion mutant), and the R2 gap named with its story id.
5. `sprint/epic-td1.yaml` — td1-20's copy of `(162,45)` corrected to `(168,45)` with an anchor instruction;
   td1-19's centipede `:227` annotated with the observed drift to `:239` and an instruction to grep.

These are the same defect class the story exists to fight — prose that ships green because the guards check
names and wording, not truth — appearing in the story's own artefacts.

---

### 5. Findings filed (standing rule: every descoped finding ends with a story id)

| Sev | Finding | Location | Disposition |
|-----|---------|----------|-------------|
| MEDIUM | Three AC4 prose guards each pass on a false sentence (R1 reworded absolute, R2 inverted claim, R4 decoyed wrong count) | `plugins/joust/tests/audio-channel-role.test.ts` | **jt9-37** (NEW, p2, 2 pts, tdd) |
| MEDIUM | Both count guards read only `audio.ts` + `main.ts`; `audio-manifest.ts:96`/`:575` hold unguarded 18-counts | `plugins/joust/src/shell/audio-manifest.ts` | **jt9-37** item (4) |
| LOW | jt9-36's inventory was under-counted — title said six, body named five, the real number is **eight**; three sites live in `tools/sample-bake/` (`bake-samples.mjs:152`, `bake-samples.test.mjs:30`, `deploy-assets.test.mjs:21`), and `audio-transporter-split.test.ts:851` is stale twice | joust `tools/` + `tests/` | **jt9-36 UPDATED in place** (title + description, with re-measured totals) |
| LOW | Line-citation drift in td1-19 / td1-20 | `sprint/epic-td1.yaml` | **FIXED in place** |
| INFO | The three AC1 tests are not independent today: `NAMED` implies both partition tests while every cue is `kind: 'rom'`. They diverge only once an `invention` cue exists | `audio-channel-role.test.ts` | Owned by **td1-20** (the story that would add one); no action now |

Nothing Critical. Nothing High. **No blocking finding.**

---

### 6. Deviation audit

- **TEA — scope widened to `src/main.ts:167` and `README.md:48`.** **ACCEPTED.** `main.ts` is the same
  measured off-by-one and the standing rule is to fix a prose defect in place; the README is not a choice at
  all — `the suite FILE count matches what vitest actually discovers`
  (`tests/audio-seam-scope.test.ts:376`) is a DERIVED guard (globs the test tree, anchored to the
  `--project joust` command line, explicitly NOT a first-match `/(\d+) files/` scan) and any new test file
  reddens it. Re-read the guard: derived on both the discovery side and the anchor side. Not a hardcoded
  pin on both sides.
- **TEA — the deletion branch declined rather than deferred.** **ACCEPTED**, and correctly discharged:
  td1-20 exists, is costed, and jt9-7 leaves an executable tripwire that reddens if the premise changes.
- **TEA — new tests in a new file.** **ACCEPTED.** The fake-`AudioContext` lifecycle would contaminate
  jt5-1's file, which needs the real `@shared/audio`. The story's named test IS re-aimed in place.
- **Dev — none declared.** **ACCEPTED** — the diff is exactly the three files TEA's RED named, no map value
  touched, no test edited to pass.
- **UNDOCUMENTED (Reviewer audit):** the GREEN commit shifted three line citations in the file the RED
  commit had just written, and left two RED-phase comments present-tense and false. Not a deviation from
  spec, but it was undeclared. Fixed in place (§4).

---

### 7. Verification

- `npx vitest run --project joust`: **106 files / 2548 tests, 0 failures** — re-run AFTER my in-place fixes.
- `npm run lint`: **clean** (`tsc --noEmit`, repo-wide).
- `npm run test:orchestrator`: **390/390**.
- Full `npx vitest run` deliberately NOT used as a gate: sibling `sw8-27` is mid-RED on `main` and its
  failures are not ours. Nothing in this review changed a file under `src/shared/` — the two engine mutants
  (R9, R10) were restored and `cmp`-verified byte-identical.
- **Scope fence honoured:** no centipede or star-wars file was written (centipede was READ only, to re-open
  td1-19); neither `sprint/epic-cp6.yaml` nor `sprint/epic-sw8.yaml` touched; `src/shared/audio.ts` NOT
  fixed (that is td1-19); jt9-35 and jt9-36 not absorbed.
- **Sibling race:** `git fetch origin` at review start and again at the end. `cp6-3` landed `67d305c`
  mid-review, touching `plugins/centipede/**` and `.pennyfarthing/**` only — **no overlap** with this
  story's files. Rebased onto it before committing.


## Subagent Results

`.pennyfarthing/config.local.yaml` disables **eight of the nine** reviewer specialists
(`silent_failure_hunter`, `test_analyzer`, `comment_analyzer`, `type_design`, `security`, `simplifier`,
`edge_hunter`, `rule_checker` — all `false`). Only `preflight` is enabled, and it was run. The work those
eight would have done was done by hand and by the mutation battery in §2, which is what actually finds
things in this project.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | joust 106 files / 2548 tests GREEN; orchestrator 390/390; lint clean; 0 console.log, 0 skips, 0 TODO/FIXME; working tree within scope | N/A — independently matched my own three runs |
| 2 | reviewer-comment-analyzer | N/A — DISABLED in `config.local.yaml` | done by hand | 3 drifted line citations + 2 present-tense-false comments | CONFIRMED — fixed in place (§4) |
| 3 | reviewer-test-analyzer | N/A — DISABLED in `config.local.yaml` | done by mutation battery | 4 survivors on the AC4 prose guards | CONFIRMED — filed as jt9-37 (§2) |
| 4 | reviewer-edge-hunter | N/A — DISABLED in `config.local.yaml` | done by hand | every early return in `startSource` enumerated; one unguarded read at `:238` | CONFIRMED but already pinned by AC3 — no action |
| 5 | reviewer-silent-failure-hunter | N/A — DISABLED in `config.local.yaml` | done by hand | five silent-degrade paths, all intentional and documented | DISMISSED — by design; the one non-degrading path is AC3's throw test |
| 6 | reviewer-type-design | N/A — DISABLED in `config.local.yaml` | done by measurement | TS2345 and TS2741 both produced, not quoted; `Record` vs `Partial<Record>` asymmetry | CONFIRMED — it is the invariant the whole decision rests on |
| 7 | reviewer-security | N/A — DISABLED in `config.local.yaml` | done by hand | none — no auth, no secrets, no user-supplied strings, no injection surface | N/A (§3) |
| 8 | reviewer-simplifier | N/A — DISABLED in `config.local.yaml` | done by hand | AC1's three tests are partially redundant while every cue is `kind: 'rom'` | DOWNGRADED to INFO — owned by td1-20 |
| 9 | reviewer-rule-checker | N/A — DISABLED in `config.local.yaml` | done by hand | none — reuse-first and descoped-findings-must-be-filed both honoured | N/A |

**All received: Yes**

**Handoff:** To SM for finish-story.