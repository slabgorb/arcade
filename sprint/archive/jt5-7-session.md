---
story_id: "jt5-7"
jira_key: "jt5-7"
epic: "jt5"
workflow: "tdd"
---
# Story jt5-7: Make the jt5 epic YAML truthful (epic opener, jt5-1, jt5-3) and fix joust's unguarded README counts

## Story Details
- **ID:** jt5-7
- **Jira Key:** jt5-7 (local tracking only — no Jira integration; CLAUDE.md: "No Jira — issue tracking is local via `sprint/` YAML files")
- **Epic:** jt5 — Joust audio — the sound subsystem joust shipped without
- **Workflow:** tdd
- **Repos:** arcade
- **Points:** 3
- **Priority:** p3
- **Stack Parent:** none (`depends_on` unset)
- **Branch:** main
- **PR:** none
- **Branch Strategy:** trunk-based — work lands directly on the default branch. `.pennyfarthing/repos.yaml` sets `branch_strategy: trunk-based` for the single `arcade` entry, and CLAUDE.md states "trunk-based — commit straight to `main`... There are no per-game remotes, no `develop` branches and no per-game PRs." The `feat/jt5-7-epic-yaml-truthful-readme-counts` ref is NOT a work branch: it was pushed at `main`'s tip (f4a2c95) with zero commits ahead, purely as the sibling-visibility signal a concurrent checkout probes with `git branch -r | grep jt5-7`. It was created with `git push origin main:refs/heads/...` rather than a checkout, so this session never leaves `main`. Delete it at finish, gated on a zero count.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-02T19:16:53Z
**Round-Trip Count:** 0
**Repos:** arcade

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-02T18:29:21Z | — | — |

## Story Acceptance Criteria

1. The EPIC description (sprint/epic-jt5.yaml:4) no longer opens with 'joust has no audio module at all' — that sentence is rewritten against the landed subsystem: src/shell/audio.ts, src/core/events.ts and src/shell/audio-dispatch.ts all exist, and jt5-2 uploaded the samples. A test or grep proves the refuted sentence is gone, not merely softened.

2. jt5-1's STORY description (sprint/epic-jt5.yaml:11) no longer carries the refuted 'between four and nine subpaths' (measured range is 5-13), the 'emitted as DATA on the step result' framing (stepGame returns a bare GameState; the stream is a field on it), or the dead 'pin-and-bump ceremony applies'. Its @shared ruling reads as SETTLED, consistent with the epic description's own 2026-07-31 amendment.

3. jt5-3's STORY description cites the wing-down cue at JOUSTRV4.SRC:6216-6218 (GOFLAP :6212 -> FLAST2 :6216), never :6207-6218. The cited span is re-opened and shown to contain 'LDX PDECSN,U / LDX DSNWD,X / JSR VSND', so the citation corroborates the claim instead of manufacturing corroboration.

4. All NINE FLAPS2/FLIPS2 sites are corrected in the same commit — claims/audio.json:130, src/core/flight.ts:437, and tests/audio-flap.test.ts (:20, :40, :195, :200, :387, :483, :636) — and the replacement states the MECHANISM: FLIPS2 (:6197) IS below the wing-up JSR VSND (:6184), FLAPS2 (:6170) is NOT below the wing-down JSR VSND (:6218) in either file order or control flow, being the fall-through the held path takes from FLAPLP's TSTB/BEQ GOFLIP (:6168-6169). The underlying law — holding never re-fires the cue — is preserved as TRUE of both loops. A grep proves zero surviving sites assert FLAPS2 sits below a JSR VSND.

5. The README's suite size and claim count are DERIVED, not transcribed, in plugins/joust/tests/audio-seam-scope.test.ts (reusing its existing readme()/flatten() helpers at :43-49): the test-file count and the check-citations.mjs claim count are computed and matched against the README's prose. Both assertions are PROVEN to fail — editing either README number to a wrong value reddens the suite — so a derived count is distinguishable from a hardcoded one.

6. The six-number skipIf reconciliation block (README.md:86-99) is re-measured to today's values and marked EXPLICITLY INDICATIVE with a 'measured 2026-08-02' stamp. It is deliberately NOT derived, and the reason is stated where the next reader meets it: the block is self-referential, so a test counting the literal under tests/ would itself be a file under tests/ carrying that literal and would change the number it guards.

7. The README's dev-server paragraph (README.md:55-63) is rewritten against the cabinet server that mg1-2 landed: 'just serve' serves the real plugin at /joust/ on 127.0.0.1:5270, pinned by tests/canonical-serve.test.mjs, which compares a game path against a nonsense control. The 'no way to open joust in a browser', the do-not-screenshot warning and the removed-port (5279) prose are gone.

8. The liveness sentence states a MEASUREMENT with its date and control, not an inference from a hostname: joust.slabgorb.com/ served '<title>Joust</title>' on 2026-08-02 while /banana-control/ served 'Not Found', and arcade.slabgorb.com/joust/ did the same. CLAUDE.md's rule ('do not infer a live game from a live hostname; request it') is satisfied on its face.

## Story Context
Full context: `sprint/context/context-story-jt5-7.md` — read it before RED. Its
Technical Approach carries the ROM line table for debts 3 and 4, the measured
README drift table for debt 2, and the guard-quality note for prose assertions.

## SM Setup Assessment (2026-08-02)

Every claim in this story's original description was re-measured before handoff.
The story was filed 2026-08-01 by jt5-3's reviewer, jt5-3's SM and jt5-2's TEA;
five more jt5 stories have landed since, so its text was treated as a set of
claims to verify, not as background.

**Four debts survived as filed** (3, 4, 5, and the substance of 2).

**Debt 1 is misattributed — this is the finding that would have misdirected RED.**
The story is titled for "the epic description", but all three phrases it quotes
sit at `sprint/epic-jt5.yaml:11`, which is **jt5-1's story description**, not
`:4`, the epic description. The epic description already carries its own
2026-07-31 amendment settling the `@shared` question ("the 2026-07-30 collapse
ANSWERS that question by dissolving it"), so the claim that it "still frames the
adoption question as an open ruling" is false of the epic. Meanwhile the epic's
opening sentence — "joust has no audio module at all: no `src/shell/audio.ts`,
no `core/events.ts` event channel, no dispatch, and nothing under an
arcade-assets joust prefix" — is now false in all four particulars and the story
never named it. Scope ruled to cover both locations: the deliverable is a
truthful `epic-jt5.yaml`, and both live in that one file.

**Debt 2 rotted further than recorded**, and the deltas are in the context's
drift table (`81 files`→96, `897 claims`→938 at two sites, `111`→143, `109`→140).
User ruled SPLIT on its either/or: derive the two clean counts, mark the
six-number `skipIf` block indicative. That block is **self-referential** — a test
counting the literal under `tests/` is itself a file under `tests/` carrying it —
so deriving it would change the number it guards. The derivation has same-file
precedent: `audio-seam-scope.test.ts` already reads the README and already
guards refuted phrases.

**Debt 6 is resolved, not deferred.** CLAUDE.md's rule is "do not infer a live
game from a live hostname; request it", so it was requested with the nonsense
control the rule's own warning demands: `joust.slabgorb.com/` served
`<title>Joust</title>` on 2026-08-02 while `/banana-control/` served
`Not Found`; `arcade.slabgorb.com/joust/` behaved identically. The claim is TRUE
and should be written as a dated measurement naming its control — the single-origin
path is live too, and is the canonical URL.

**Re-pointed 1 → 3 and re-workflowed trivial → tdd.** Two YAML descriptions, a
README paragraph rewrite, a nine-site propagation fix and a new derived guard is
not a one-point chore, and `tdd`'s own trigger floor is 3 points. TDD is the
right shape because AC5's guard must be proven to fail first — a derived count
that never went red is indistinguishable from a hardcoded one — and because
AC4's nine-site fix has a partial-application failure mode the story's own text
warns about.

**Pre-flight checks:** no sibling race (local `main` == `origin/main` at f4a2c95,
jt5-7 still `backlog` on origin at setup); merge gate clear (no open PRs);
citation checker green at 938/938 before any edit.
## Design Deviations

### TEA (test design)

- **AC5's test-count half moved from "derived" to "indicative"**
  - Spec source: context-story-jt5-7.md, AC5
  - Spec text: "the test-file count and the check-citations.mjs claim count are computed and matched against the README's prose"
  - Implementation: the FILE count and the CLAIM count are derived and guarded. The README's raw TEST count (`1944`) is not — the guard only requires that the stale literal is gone and that what remains is marked indicative.
  - Rationale: it is not statically derivable. Measured 2026-08-02: 2001 `it(`/`test(` call sites against vitest's 2428, because 32 `it.each` sites each expand to N tests. Counting from within the suite is also self-referential. A guard that cannot go green is not a deliverable, so it belongs in AC6's column for the same reason the skipIf block does — a different mechanism, the same verdict.
  - Severity: minor
  - Forward impact: the README's test count will rot again. That is the accepted cost of the user's 2026-08-02 split ruling, and the indicative stamp is what makes it honest rather than silent.

- **AC4's guard is keyed on CLAIM SHAPE, not on the FLAPS2 label, and carries an escape clause**
  - Spec source: context-story-jt5-7.md, AC4
  - Spec text: "A grep proves zero surviving sites assert FLAPS2 sits below a JSR VSND."
  - Implementation: a census over three files matching refuted claim shapes (`below each`, `both loops/cues + below`, `re-enters below the cue`), plus a FLAPS2-proximity rule that is cleared by a nearby `above`/`bypass`/`fall-through`, judged over a 180-character window.
  - Rationale: a literal FLAPS2 grep is both too narrow and too broad. Measured: four of the seven sites in `audio-flap.test.ts` never say FLAPS2, so a label-keyed grep misses the majority; and the CORRECT sentence must name FLAPS2 beside the word "below", so an unqualified proximity rule flags the fix (measured twice — once for naming both labels, once because the countervailing "ABOVE" wrapped to the next line).
  - Severity: minor
  - Forward impact: the censor lives in `plugins/joust/tests/jt5-7-flap-wording.test.ts` and is exported, so a later story can widen the site list without re-deriving the rule.

- **AC1–AC3 are guarded from the ORCHESTRATOR suite, not joust's vitest project**
  - Spec source: context-story-jt5-7.md, Scope ("In scope: sprint/epic-jt5.yaml")
  - Spec text: the story's plugin-local ACs and its sprint-YAML ACs are listed together, with no suite named.
  - Implementation: `tests/jt5-7-epic-yaml-truth.test.mjs` under `npm run test:orchestrator`; only AC4–AC8 run under vitest.
  - Rationale: CLAUDE.md holds the two suites strictly disjoint — vitest owns the apps' `*.test.ts`, the orchestrator suite owns cabinet wiring. `sprint/epic-jt5.yaml` is at the monorepo root, and `tests/sprint-repo-routing.test.mjs` (mg1-4) already guards that same file family from the orchestrator suite. A joust vitest project reaching up to the repo root for sprint YAML would be the first of its kind.
  - Severity: minor
  - Forward impact: Dev must run BOTH suites to see this story green. `just ci` covers it; `npx vitest run --project joust` alone does not.

### Dev (implementation)

- No deviations from spec. All eight ACs implemented as written, including the two TEA logged (the test count treated as indicative, and AC1–AC3 guarded from the orchestrator suite). The tenth wording site TEA found was fixed in the same pass, which AC4's census required anyway.

### Reviewer (audit)

- **TEA's "test count moved to indicative"** → ✓ ACCEPTED by Reviewer: re-verified independently — 2001 static `it(`/`test(` call sites against vitest's 2463, and 32 `it.each` sites expand at runtime. The deviation is forced by the language, not chosen.
- **TEA's "AC4 keyed on claim shape, not the FLAPS2 label"** → ✓ ACCEPTED by Reviewer: and it is load-bearing, not stylistic. Four of the seven `audio-flap.test.ts` sites never say FLAPS2; a label-keyed guard would have passed with the majority of the defect intact. Confirmed by mutation M8 (a test name with no FLAPS2 in it reddens).
- **TEA's "AC1-AC3 guarded from the orchestrator suite"** → ✓ ACCEPTED by Reviewer: matches CLAUDE.md's two-suites rule verbatim, with `tests/sprint-repo-routing.test.mjs` (mg1-4) as same-file-family precedent. `npx vitest run --project joust` alone does NOT show this story green, which Dev correctly recorded as forward impact.
- **Dev's "No deviations from spec"** → ✓ ACCEPTED by Reviewer, with one correction that is NOT a deviation but a defect: AC2 was implemented exactly as written, and AC2 itself carried a wrong number (see finding R1). Dev followed the spec faithfully; the spec was wrong. That is a story-text defect inherited from setup, not an implementation deviation.
- **UNDOCUMENTED — none found.** Every difference between the ACs and the delivered artefact is either logged above or is finding R1.

## Delivery Findings

### TEA (test design)

- **Gap** (non-blocking): the FLAPS2 wording census finds TEN sites, not the nine the story lists. `plugins/joust/docs/rom-study/claims/audio.json:202` — the STFLY take-off claim — ends "...unlike walking off a ledge (STFALL, which re-enters below both cues)", the same refuted geometry, and no story named it. Affects `plugins/joust/docs/rom-study/claims/audio.json` (correct it in the same pass as the other nine; AC4's census will not go green until it is). *Found by TEA during test design.*

- **Improvement** (non-blocking): `plugins/joust/tests/audio-flap.test.ts:483` is named "WALKING off a ledge is silent". The ROM is narrower than that: STFALL plays `DSNFAL` at `JOUSTRV4.SRC:6141-6143` when `PFRAME,U` is negative — a *skidding* fall off a cliff sounds. The test's own assertion is about WING cues only and is correct; it is the name that overreaches. Affects `plugins/joust/tests/audio-flap.test.ts` (rename to scope it to wing cues, or note the skid exception). Out of jt5-7's scope — this is a naming accuracy point, not the "below" defect — so it needs an owner if not taken here. *Found by TEA during test design.*

- **Question** (non-blocking): AC5's derived FILE-count guard reddens for every future story that adds or removes a joust test file, which is the intended anti-rot behaviour but also a standing tax on unrelated stories. The failure message names the new number, so the fix is a one-line README edit. Flagging it so the Reviewer rules deliberately rather than discovering it on the next story. Affects `plugins/joust/README.md` and `plugins/joust/tests/audio-seam-scope.test.ts`. *Found by TEA during test design.*

- **Gap** (non-blocking): my own RED demonstrated the self-reference AC6 rests on. The comment written to explain why the `skipIf` block cannot be guarded quotes `skipIf(!vendoredAvailable)` verbatim, taking the tree-wide literal count from 143 to 144. Dev should stamp the block from a measurement taken AFTER this RED landed — the six numbers as of 2026-08-02, post-RED, are in the TEA Assessment below. *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): AC4's censor rule `both (loops|cues) … below` uses a 40-character window, and that window can span a sentence boundary. My first rewrite read "…skipping both cues. Both are pinned **below**." — where "below" meant "further down this file" and was innocuous — and the guard flagged it. Rewording to "pinned in the groups that follow" fixed it and reads better, so no guard change was needed. Worth knowing before someone writes "both cues" within a line of an innocuous "below" and concludes the guard is broken. Affects `plugins/joust/tests/jt5-7-flap-wording.test.ts` (no change required; this is a note for the next author). *Found by Dev during implementation.*

- **Gap** (non-blocking): the README's status block still says "Thirty-six stories are archived across five epics" and enumerates per-epic counts (jt1 11, jt2 9, jt3 7, jt4 5, jt8 4). Those are exactly the same species of unguarded, hand-maintained count this story was filed to deal with, and they are already drifting — the archive now holds more than thirty-six. They were NOT in jt5-7's scope (its debt (2) names the suite size, the claim count and the skipIf block specifically), so I left them. They need an owner. Affects `plugins/joust/README.md:13-21`. *Found by Dev during implementation.*

- **Question** (non-blocking): `plugins/joust/README.md` line 96 still reads "The Task 12 import measured that failure mode deliberately — 1280 passed | 566 skipped". That is a historical measurement of a specific past event, so it is arguably correct-as-history rather than stale, and I left it. If the Reviewer reads it as a live claim it needs the same indicative stamp the block above it now carries. Affects `plugins/joust/README.md`. *Found by Dev during implementation.*

### Reviewer (round 1)

- **Gap** (non-blocking, FIXED IN PLACE): the `@shared` subpath range was corrected to a number that had itself gone stale. Now derivable in one grep and filed as jt5-26 item (2) — a guard would have caught this, and its absence is why the defect reached review. Affects `sprint/epic-jt5.yaml`, `plugins/joust/README.md:143`. *Found by Reviewer during mutation review.*
- **Improvement** (non-blocking): jt5-26 is filed for the three count families this story did not own — the status block's story tallies (Dev's finding), the subpath range's missing derivation, and a ruling on the Task 12 historical measurement (Dev's question). All three of Dev's and TEA's deferred items now have an owner. *Found by Reviewer during finding triage.*

## TEA Assessment

**Tests Required:** Yes
**Reason:** n/a

**Test Files:**
- `tests/jt5-7-epic-yaml-truth.test.mjs` — AC1, AC2, AC3. node:test, orchestrator suite. Guards the epic description, jt5-1's description, and jt5-3's ROM citation.
- `plugins/joust/tests/jt5-7-flap-wording.test.ts` — AC4. The ten-site FLAPS2/FLIPS2 wording census plus the censor's own four controls. Exports `wordingViolations` for reuse.
- `plugins/joust/tests/audio-seam-scope.test.ts` — AC5, AC6, AC7, AC8 appended beside jt5-1's existing README assertions, reusing `readme()`/`flatten()`.

**Tests Written:** 27 tests covering 8 ACs — 17 failing (the targets), 10 passing (premises, controls and anti-gutting regression guards)
**Status:** RED (failing — ready for Dev)

| AC | Failing | Passing (controls/premises) |
|----|---------|------------------------------|
| AC1 epic opener | 1 | 1 anti-deletion + 2 premise |
| AC2 jt5-1 description | 3 | 1 anti-gutting |
| AC3 jt5-3 citation | 1 | 1 discriminator non-vacuity |
| AC4 nine (ten) sites | 2 | 4 censor controls + 1 labels-retained |
| AC5 derived counts | 3 | — |
| AC6 indicative + reason | 3 | — |
| AC7 dev-server paragraph | 2 | — |
| AC8 liveness measured | 2 | — |

**MEASURED NUMBERS DEV NEEDS** — snapshot at `6d9e127` rebased onto `1b897d2`, 2026-08-02.

⚠ **RE-MEASURE THE INDICATIVE ONES IMMEDIATELY BEFORE YOU WRITE THEM.** These
moved once already inside this RED phase: a sibling's jt5-8 RED landed two new
joust test files (`dumb-wingbeat.test.ts`, `dumb-wingbeat-source.test.ts`)
between my commit and my push, taking the file count 100 → 102 and the skipIf
figures up by five. The *derived* rows look after themselves — the guard
recomputes and will simply tell you the new number. The *indicative* rows are
transcription, and transcription is what this story exists to stop shipping.

| Figure | README says | Truth (this snapshot) | Guarded? |
|---|---|---|---|
| test files | 81 | **102** (99 `.ts` + 2 `.mjs` + 1 audit) | **derived** — guard prints the number |
| tests | 1944 | 2462 | no — *not derivable, mark indicative* |
| claims (twice, `:52` and `:139`) | 897 | **938** (same in normal AND degraded mode) | **derived** |
| EVENT_KINDS ("eleven ROM-cited moments") | eleven | **17** | **derived** (static import) |
| skipIf: executable call sites | 95 | **130** | no — self-referential |
| skipIf: literal occurrences | 111 | **149** | no |
| skipIf: inside comments | 16 | **19** | no |
| reconciliation | 95+16=111 | **130+19=149, holds** | no |
| `.skipIf(` lines | 109 | **145** | no |
| files mentioning / carrying | 30 / 29 | **41 / 39** | no |

Re-derive the unguarded rows with:

```bash
npx vitest run --project joust                                  # files + tests
grep -ro 'skipIf(!vendoredAvailable)' plugins/joust/tests/ | wc -l   # literal occurrences
grep -rn '\.skipIf(' plugins/joust/tests/ | wc -l                    # comment-inclusive lines
```

**A red joust suite on `main` is not necessarily yours.** At handoff the project
showed 20 failures: 12 from this story (10 in `audio-seam-scope.test.ts`, 2 in
`jt5-7-flap-wording.test.ts`) and 8 from the sibling's jt5-8 RED in
`dumb-wingbeat.test.ts`. Attribute before debugging.

**ROM ANCHORS** (`reference/williams-source/joust/JOUSTRV4.SRC`, CRLF — read with `awk`):
`:6156-6157` STFALL ends `BNE FLAPS2`/`BRA FLIPS2` · `:6168-6169` `TSTB`/`BEQ GOFLIP` · `:6170` FLAPS2 · `:6176-6177` WINGDN/WINGFK · `:6182-6186` GOFLIP → `JSR VSND` (:6184) → `BRA FLIPS2` · `:6197` FLIPS2 · `:6207` GOTFIT `JSR SRCADA` · `:6212` GOFLAP · `:6216-6218` FLAST2 → `LDX DSNWD,X` → `JSR VSND` · `:6223` `TSTB`

### Rule Coverage

`.pennyfarthing/gates/lang-review/typescript.md` is a self-review checklist scoped to changed `.ts` files. This story ships no runtime type surface — it corrects prose and adds guards — so most checks are not applicable. Those that bear on the test code I wrote:

| Rule | Test(s) / action | Status |
|------|------------------|--------|
| #1 type-safety escapes (`as`) | replaced `await import(...) as {EVENT_KINDS?}` with a static `import { EVENT_KINDS }` | fixed |
| #1 type predicates without runtime validation | `derivedClaimCount` narrows `JSON.parse` via `Array.isArray` before any cast | applied |
| #2 missing `readonly` | `REFUTED` is `ReadonlyArray<readonly [RegExp, string]>`; `Violation` fields are `readonly` | applied |
| #4 `??` vs `||` | `(parsed as {claims?}).claims ?? []` and `lines[line-1] ?? ''` — `??` throughout, no `||` defaults | applied |
| test quality — vacuous assertions | every negative verified to MATCH the unchanged file first; every positive built from a token measured grep-count 0 | applied |

**Rules checked:** 5 of 5 applicable typescript.md checks have coverage or an applied fix
**Self-check:** 0 vacuous tests shipped. Three were caught and fixed during design: two guard drafts that flagged the correct fix (false positives, now pinned as controls), and AC8's date assertion, which a bare `/2026-08-\d\d/` would have let AC6's stamp satisfy from elsewhere in the file — now bound by proximity to the hostname.

**Handoff:** To Dev (Bicycle Repair Man) for implementation

## Dev Assessment

**Status:** GREEN — all eight ACs pass

**Files changed (5):**
- `sprint/epic-jt5.yaml` — AC1 (epic description opening), AC2 (jt5-1's description), AC3 (jt5-3's citation extent). Applied through `pf sprint epic update` / `pf sprint story update`, never by hand-editing the YAML; integrity re-parsed afterwards (25 stories, no empty AC lists, no conflict markers, jt5-8's concurrent claim intact).
- `plugins/joust/docs/rom-study/claims/audio.json` — AC4, claims JT53-001 and JT53-008. Patched through `json.load`/`json.dumps` at the file's own 2-space indent, so the diff is 2 lines changed, not a whole-file reformat.
- `plugins/joust/src/core/flight.ts` — AC4, the jt5-3 comment block.
- `plugins/joust/tests/audio-flap.test.ts` — AC4, seven sites (two comments, three test names, one row rationale, one inline comment).
- `plugins/joust/README.md` — AC5, AC6, AC7, AC8.

**No behaviour changed.** Every edit is prose, a comment, a test name, a claim
field or a YAML description. The one source file touched (`flight.ts`) had only
its comment block rewritten — no expression, constant or control flow was
altered, which is why the jt2 seeded-replay digests and the flap suite's own 35
tests are untouched and green.

**Numbers written into the README, and how each is held:**

| Figure | Written | Held by |
|---|---|---|
| test files | 102 | **derived** — `walk()` + vitest's include pattern; guard prints the new number on drift |
| claims (both sites) | 938 | **derived** — counted from the dossier |
| event kinds | 17 | **derived** — static `import { EVENT_KINDS }` |
| tests | ~2460, indicative | stamped 2026-08-02; not statically derivable |
| skipIf 130 / 149 / 19 / 145 / 41 / 39 | indicative | stamped 2026-08-02, with the self-reference reason stated in the README itself |

**Gates:**

| Gate | Result |
|---|---|
| joust vitest | 101 / 102 files pass — the one failure is the sibling's jt5-8 RED (`dumb-wingbeat.test.ts`, 8 tests) |
| orchestrator | **382 / 382** |
| full cabinet vitest | 744 / 745 files, 11397 passed — same single sibling file |
| lint (`tsc --noEmit`) | clean |
| citation gate | `checked 938 claim(s) / all claims verified` |

**A red joust suite on `main` is not this story's.** jt5-8 is in RED concurrently
in a sibling checkout. Attribute by file before debugging: everything in
`dumb-wingbeat.test.ts` is theirs.

**Handoff:** To Reviewer (The Argument Professional)

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean — assessed directly, not spawned | none | N/A |
| 2 | reviewer-edge-hunter | Yes | Skipped / disabled (`config.local.yaml:18`) | none | N/A |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped / disabled (`config.local.yaml:12`) | none | N/A |
| 4 | reviewer-test-analyzer | Yes | Skipped / disabled (`config.local.yaml:13`) | none | N/A |
| 5 | reviewer-comment-analyzer | Yes | Skipped / disabled (`config.local.yaml:14`) | none | N/A |
| 6 | reviewer-type-design | Yes | Skipped / disabled (`config.local.yaml:15`) | none | N/A |
| 7 | reviewer-security | Yes | Skipped / disabled (`config.local.yaml:16`) | none | N/A |
| 8 | reviewer-simplifier | Yes | Skipped / disabled (`config.local.yaml:17`) | none | N/A |
| 9 | reviewer-rule-checker | Yes | Skipped / disabled (`config.local.yaml:19`) | none | N/A |

**All received:** Yes (8 of 9 disabled by project config; preflight's domain assessed directly)
**Total findings:** 3 confirmed, 0 dismissed, 0 deferred

**How coverage was obtained instead.** Eight specialists are disabled in
`.pennyfarthing/config.local.yaml`, and per the gate's rule 4 a disabled or
failed specialist's domain must be assessed by the Reviewer rather than claimed.
Preflight's mechanical work was done directly — `npx vitest run --project joust`,
`npm run test:orchestrator`, `npm run lint`, the citation gate and `git status`
were each run and are quoted below. The analytical domains were covered by a
**21-mutation battery** against every guard this story added, which is what
finds defects here: self-re-reading the diff produced nothing, and the battery
produced three. Fourteen mutations reddened correctly; three exposed dead or
vacuous guards (all now fixed and re-proven); the remainder were flawed
mutations of my own that I re-ran honestly rather than reporting.

## Reviewer Assessment

**Verdict:** APPROVED — three findings, all fixed in place during review and each mutation-proven, per the standing rule to fix prose and small guard defects rather than spend a reject cycle.

**Round:** 1

### Findings

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| R1 | HIGH | The replacement prose carried a NEW false count: "between five and thirteen subpaths (centipede 5, …)". centipede consumes SIX — it gained `@shared/audio` in cp5-1 (`6122ae0`). Both measurement methods agree. In a story whose entire contract is not shipping false counts, this is the finding that mattered. | **FIXED** — corrected to six-to-thirteen in jt5-1's description and at `README.md:143` (which carried the same sentence, unguarded and untouched by the story). Derivation filed as jt5-26 item 2. |
| R2 | MEDIUM | `[TEST]` The event-kind guard never compared the number. Named "the event-channel count matches EVENT_KINDS in source", with a failure message interpolating `EVENT_KINDS.length` — but the only assertion was `not.toMatch(/eleven ROM-cited moments/i)`, a ban on one WORD. Writing "3 ROM-cited moments" passed cleanly, so AC5's third count was transcribed, not derived. | **FIXED** — now extracts the digit and compares to `EVENT_KINDS.length`. Mutation "3 ROM-cited moments" reddens 1. |
| R3 | MEDIUM | `[TEST]` The file-count guard took the FIRST `/(\d+)\s+files/` match and the README holds three such strings (`:48`, `:115`, `:118`). With a decoy "102 files" above the quick start and the command line reading 999, the guard passed. | **FIXED** — anchored to the `--project joust` command line. The decoy now reddens 1. |

**Bonus guard added while fixing R2.** `CUE_SOURCES` carries a `kind: 'invention'`
escape hatch (jt5-1 AC5) and nothing pinned that no shipped cue uses it — so the
README's adjective "ROM-cited" could have gone false silently while the count
stayed right. Measured 18 `kind: 'rom'` instances and zero inventions; now
guarded. Mutating one cue to `invention` reddens 1.

### Observations

- `[VERIFIED]` **AC3 asserts by RESOLUTION, not by matching digits** — evidence: truncating the cited span to `:6216-6217` (dropping `JSR VSND`) reddens 2, and moving it to `:5000-5010` reddens 2, while BOTH `:6216-6218` and `:6212-6218` pass. A digit-matching guard could not behave that way. This is the single best design decision in the story: the obvious RED would have rebuilt the defect one layer up.
- `[VERIFIED]` **The AC4 census bites on all three file classes** — `flight.ts` full comment revert reddens 2, one reverted test NAME reddens 1, and reverting the unfiled tenth site (`audio.json` JT53-008) reddens 1.
- `[VERIFIED]` **Census scope is complete today** — a tree-wide grep for the refuted phrasings outside the three censused files returns nothing, and no other game's sources mention FLAPS2. TEA's decision to hardcode the site list rather than glob is therefore currently lossless.
- `[VERIFIED]` **No behaviour changed** — `flight.ts`'s diff is comment-only; `tests/purity.test.ts` and `audio-flap.test.ts`'s own 35 tests are green (142 tests across the 5 touched suites). The jt2 seeded-replay digests are untouched because no expression was edited.
- `[VERIFIED]` **The claim-JSON edit preserved formatting** — `git diff --numstat` reports 2 insertions / 2 deletions on an 18KB file, so the round-trip wrote at the file's own indent rather than reformatting the dossier.
- `[VERIFIED]` **CLAUDE.md's two-suites rule is honoured** — sprint YAML is guarded from `tests/*.test.mjs` under node:test, never from a vitest project; precedent `tests/sprint-repo-routing.test.mjs`.
- `[LOW]` The README's "~2460 tests" is 2463 after the guard I added. It is explicitly stamped indicative, so this is within the story's own ruling and needs no change.
- `[LOW]` Dev's rewrite at `audio-flap.test.ts:46` had to avoid "both cues … pinned **below**" because the censor's 40-char window spans a sentence boundary. Dev reworded rather than weakening the guard — the right call, and recorded as a Dev finding for the next author.

### Rule Compliance

Rules read: `CLAUDE.md` (root), `plugins/joust/README.md` conventions, `.pennyfarthing/gates/lang-review/typescript.md`. No `SOUL.md` or `.claude/rules/` exists in this repo.

| Rule | Governed items in the diff | Verdict |
|---|---|---|
| CLAUDE.md — core/shell boundary; `src/core` is pure | `flight.ts` (the only `src/` file touched) | Compliant — comment-only edit; `purity.test.ts` green. The scanner reads comment TEXT, and the new comment introduces no `window.`/`document.` token. |
| CLAUDE.md — the two suites do not overlap | `tests/jt5-7-epic-yaml-truth.test.mjs` (node:test), `plugins/joust/tests/*` (vitest) | Compliant — sprint YAML guarded only from the orchestrator suite. |
| CLAUDE.md — never hand-edit sprint YAML to add stories | jt5-26 | Compliant — `pf sprint story add` + `--description` update; 26 stories parse, no empty AC lists, no conflict markers. |
| CLAUDE.md — trunk-based, commit straight to `main` | 3 commits | Compliant — no branch, no PR; the claim ref sits at `main`'s tip unchanged. |
| typescript.md #1 — type-safety escapes | `derivedClaimCount`, the `EVENT_KINDS` import, `wordingViolations` | Compliant — no `as any`, no double-cast, no `@ts-ignore`. `JSON.parse` narrows through `Array.isArray` before its one cast. Dev replaced a dynamic-import cast with a static import during green. |
| typescript.md #2 — `readonly` on collections | `REFUTED`, `Violation`, `SITES` | Compliant — `ReadonlyArray<readonly [RegExp, string]>`, `readonly` fields, `as const`. |
| typescript.md #4 — `??` vs `||` | `?? []`, `?? ''`, `?? 0` sites | Compliant — `??` throughout; no `||` default where `0`/`''` is valid. |
| typescript.md #7 — async/promise | the two suites | Compliant — the one `async` test Dev wrote was made synchronous by the static import; no floating promises. |

### Devil's Advocate

Argue this is broken. The strongest case: **this story is a machine for producing
confident-sounding numbers, and it has already produced a wrong one.** Finding R1
is not a slip, it is the predicted failure mode — a human transcribed a figure
from a story description written two days earlier, in a change whose entire
purpose was to stop people transcribing figures from stale sources. If it
happened once inside a three-hour story, the prior on the remaining unguarded
numbers is bad. The status block still asserts "Thirty-six stories archived", the
skipIf block asserts six numbers, and the test total asserts one; none is
guarded, all are stamped with a date that will look authoritative to a reader six
months out. A date stamp makes a number *auditable*, not *true*, and the README
now reads as though everything in it has been checked.

Second line of attack: the guards are prose regexes, and prose regexes rot in
both directions. R2 and R3 were both silent-green paths that survived TEA's
design, Dev's implementation and a first pass of my own battery — they were found
only because I mutated in ways the authors had not anticipated. There is no
argument that a fourth such path does not exist; there is only the observation
that 21 mutations did not find one. The census in particular bans phrasings
rather than asserting truth: a future author who writes "FLAPS2 precedes the cue"
— false, and semantically identical to the defect — trips nothing, because the
censor keys on the word "below". The guard prevents the *sentence* from
recurring, not the *error*.

Third: the escape clause is a genuine hole by construction. `CONTRADICTS` clears
any match within 180 characters of "above", "bypass", "skips" or "fall-through".
A file that discusses the asymmetry correctly in one paragraph can therefore
assert the falsehood in the next, and the guard clears both. I measured that: a
partial revert of `flight.ts` that left the corrective vocabulary nearby produced
zero reds, and only a full-block revert reddened. That is a real limit and it is
now documented rather than fixed, because narrowing the window would flag the
correction itself — the two failure modes are in tension and 180 was chosen with
evidence.

What survives all of this: no behaviour changed, every claim now in the tree was
opened against the ROM or re-measured today, the three counts that CAN be derived
are derived and mutation-proven, and the ones that cannot are labelled with the
reason. The residue is filed as jt5-26 rather than left implicit. That is a
defensible state to ship — not a clean one.

### Gates

| Gate | Result |
|---|---|
| orchestrator (`node:test`) | **382 / 382** |
| joust vitest | 101 / 102 files — the one failure is the sibling's jt5-8 RED (`dumb-wingbeat.test.ts`, 8 tests), attributed and not this story's |
| lint (`tsc --noEmit`) | clean |
| citation gate | `checked 938 claim(s) / all claims verified` |
| mutation battery | 21 mutations: 14 bit correctly, 3 exposed defects (fixed + re-proven), 4 were flawed mutations re-run honestly |

**Handoff:** To SM (The Announcer) for the finish ceremony.
## Impact Summary

**Shipped.** The jt5 epic YAML no longer contradicts the stories that landed
under it, and joust's README no longer states counts nothing checks. Three
counts are now DERIVED and mutation-proven (test files, dossier claims, event
kinds); two families are stamped INDICATIVE with a date and a stated reason (the
test total, which 32 `it.each` sites make non-derivable, and the six-number
skipIf block, which is self-referential). Ten prose sites — one more than the
story filed — now describe the flap loops' BYPASS geometry instead of asserting
a "below" that was true of FLIPS2 and false of FLAPS2. No behaviour changed
anywhere: every edit is prose, a comment, a test name, a claim field or a YAML
description.

**Findings raised and how each was closed:**

| Source | Finding | Closure |
|---|---|---|
| SM (setup) | Debt 1 misattributed — the quoted phrases live in jt5-1's description, not the epic's, and the epic's real stale sentence was unnamed | Scope re-targeted to both locations before RED; AC1/AC2 split so each is independently falsifiable |
| SM (setup) | Debt 6 was an unmeasured liveness claim | Measured with a nonsense control (CLAUDE.md's "request it"); written into the README as a dated measurement |
| TEA (red) | The census finds TEN sites, not nine — `audio.json:202` carried the same defect unfiled | Fixed in the same pass; AC4's census would not go green without it |
| TEA (red) | The test count is not statically derivable (2001 call sites vs 2463) | Logged as a deviation, moved to the indicative column, accepted by Reviewer |
| TEA (red) | AC5's derived file count taxes every future story that adds a test file | Raised for a deliberate ruling; Reviewer accepted it as the intended anti-rot behaviour, and the failure message names the new number |
| Dev (green) | The README's story tallies (`:13-21`) are the same unguarded species, out of scope | **Filed as jt5-26 item 1** |
| Dev (green) | The Task 12 "1280 passed \| 566 skipped" line is ambiguous between history and live claim | **Filed as jt5-26 item 3** |
| Dev (green) | The censor's 40-char window can collide with innocuous adjacent prose | Reworded rather than weakening the guard; recorded for the next author |
| Reviewer (r1) | **The corrected subpath range was itself stale** — centipede is 6, not 5 | Fixed in the YAML and at `README.md:143`; **derivation filed as jt5-26 item 2** |
| Reviewer (r1) | The event-kind guard banned a word, never compared the number | Fixed; mutation-proven |
| Reviewer (r1) | The file-count guard's first-match rule was decoy-vacuous | Anchored to the command line; mutation-proven |

**Known limit, documented not fixed.** The AC4 censor clears any match within 180
characters of "above"/"bypass"/"fall-through". A file may therefore explain the
asymmetry correctly in one paragraph and assert the falsehood in the next.
Narrowing the window flags the correction itself — the two failure modes are in
tension, and 180 was chosen with measured evidence on both sides. Recorded in
the test's own header and in the Reviewer's Devil's Advocate.

**Carry-forward:** jt5-26 (2 pts, p3, backlog) owns the three count families this
story did not.
