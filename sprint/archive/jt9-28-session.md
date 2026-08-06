---
story_id: "jt9-28"
jira_key: "jt9-28"
epic: "jt9"
workflow: "tdd"
---
# Story jt9-28: Joust's written counts, derived or guarded: the README tallies, the eight stale seventeen-cue comments, and the three AC4 prose guards a falsehood walks through

## Story Details
- **ID:** jt9-28
- **Jira Key:** jt9-28 (local tracking only — no Jira integration)
- **Epic:** jt9 — Joust — the remainder, re-ordered
- **Workflow:** tdd
- **Repos:** arcade
- **Points:** 5
- **Priority:** p3
- **Stack Parent:** none (stack root)
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)
- **Branch:** none
- **PR:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-06T12:46:45Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-06T11:38:07Z | 2026-08-06T11:42:01Z | 3m 54s |
| red | 2026-08-06T11:42:01Z | 2026-08-06T12:16:45Z | 34m 44s |
| green | 2026-08-06T12:16:45Z | 2026-08-06T12:39:47Z | 23m 2s |
| review | 2026-08-06T12:39:47Z | 2026-08-06T12:46:45Z | 6m 58s |
| finish | 2026-08-06T12:46:45Z | - | - |

## Story Acceptance Criteria

**DERIVED COUNTS** — These assertions MUST fail first, then be proven to pass with new numbers inserted:

1. **README.md:13-21 status block story tallies are DERIVED:** The block currently reads "Thirty-six stories are archived across five epics (jt1 11, jt2 9, jt3 7, jt4 5, jt8 4)". Derive the archive count by filtering `sprint/archive/` for joust-epic stories only (`*-session.md` files matching `^(jt1|jt2|jt3|jt4|jt8)-`), count them per epic, and replace the stale figures with the measured counts. The total must sum correctly. A test in `plugins/joust/tests/audio-seam-scope.test.ts` asserts the README count matches the measured archive count (derived count assertion: editing either README number to an arbitrary value MUST redden the test).

2. **README.md:143 @shared subpath range is DERIVED:** The sentence currently reads "between five and thirteen (centipede 5, ...)". Derive the range with `grep -rhoE '@shared/[a-z0-9-]+' plugins/{centipede,red-baron,asteroids,tempest,star-wars,battlezone,joust}/src | sort -u | wc -l` per game and update the counts. The range now reads "between [MIN] and [MAX]" where MIN and MAX are the measured counts. A test in `plugins/joust/tests/audio-seam-scope.test.ts` asserts the range in the README matches the measured current range (derived count assertion: editing either boundary MUST redden the test). **PATH CORRECTION:** The description writes sample-bake paths repo-root-relative (`tools/sample-bake/...`), but they are actually plugin-relative (`plugins/joust/tools/sample-bake/...`). This is the real location in the codebase.

3. **README.md:96 Task 12 historical measurement — rule on ambiguity, not silence:** The line reads "The Task 12 import measured that failure mode deliberately — 1280 passed | 566 skipped". Rule explicitly: either (a) stamp it with a date and mark it as a historical record of a specific past event (past tense, with date), or (b) re-measure today and update the numbers. Do not leave a reader unable to tell whether this is history or a live claim. Whichever path is taken must be recorded in a commit message or as a Design Deviation if the ruling changes the text.

**INDICATIVE COUNTS** — These are stamped with a date and reason, holding them constant while the derivation mechanism is built but not yet applied:

4. **File-count guard side-effect documented:** Add one sentence to the README's contributor notes (or create them if missing) stating that adding a test file under `plugins/joust/tests/` requires bumping the derived file count in the same commit (because `audio-seam-scope.test.ts` AC5 reads the README's declared count). This is not a new count, only documentation of the existing constraint.

**GUARD REPAIRS** — Widen and repair the guards themselves:

5. **Widen audio-channel-role.test.ts count-guard read-set (lines 478 and 499):** The guard currently reads exactly two hardcoded files: `src/shell/audio.ts` and `src/main.ts`. Widen the read-set to include all of `plugins/joust/src/` + `tests/` + `tools/` and let the test go RED across all new matches. This widening will expose the eight stale seventeen-cue counts (next AC). After widening, the guard read-set is stated in the test file as a comment explaining why it searches those specific paths.

6. **Fix eight stale seventeen-cue comments (measured at grooming):** The counts are stale in:
   - `tests/audio-priority.test.ts:183` (it() title) and `:224`
   - `tests/audio-transporter-split.test.ts:65`, `:576`, `:851` (two of these are doubly stale — the second instance at :851 is also about the time player2Materialise entered SOUNDS)
   - `tools/sample-bake/bake-samples.mjs:152` ("The seventeen stand-ins" comment)
   - `tools/sample-bake/bake-samples.test.mjs:30`
   - `tools/sample-bake/deploy-assets.test.mjs:21`
   
   Update each from "seventeen" to "eighteen". DO NOT TOUCH: `tests/audio-transporter-split.test.ts:285` (reads "all seventeen-plus-one" and IS correct = 18); `src/core/events.ts:93` and `src/core/demo.ts:944` (count EVENT KINDS = 17, correct); the guard file's own `NUMBER_WORDS` table at `:446` and explanatory comments at `:481` and `:523` (contain "seventeen" legitimately). Controls that must stay GREEN: an unrelated header sentence can be reworded, and an inert comment inside the CHANNELS object can be inserted — both remain passing after the widening.

7. **Repair three AC4 prose guards from jt9-37 (shape defects, not literal misses):**

   a) **R1 — absolute-ban guard is too narrow:** Currently filters `/no longer/i AND /(anything|nothing|at all)/i` requiring BOTH clauses. A reworded falsehood omitting "no longer" passes all 2548 tests. Fix: either drop the `/no longer/` requirement, or add a second pattern for claims without tense markers (e.g., "channel/fence + absolute, no tense marker"). The message must state the two shapes it now guards.
   
   b) **R2 — docblock guard only forces a mention, not a claim:** Currently filters for sentence with `/\bchannel\b/ AND /(window|released?|expires?|expired|tick)/` (keyword co-occurrence), so the exact INVERSION of the demand satisfies it. Fix: acknowledge in the guard's message that this guard can only force a MENTION of the mechanism; the actual claim is already guarded by AC2's executable test trio, and this prose guard is a secondary mention check only.
   
   c) **R4 — header count guard is blind to determiners:** Regex `/(?:these|those|all|the) (word) cues/` requires a determiner, so a count with NO determiner is invisible, and a WRONG count ships when a RIGHT one two clauses later satisfies the precondition. Fix: either match `(word) cues` without a determiner AND exclude the known true pair-sentence by its own specific words, or assert on every number-word in the file. The message must state which counts it now guards.

8. **Prose guards MUST be verified with control mutants that must stay GREEN:** Any fix to the three guard shapes (AC7) must include: (a) RESOLUTION + PROXIMITY assertion — not just a regex — and (b) explicit CONTROL mutants that should stay green. Three failure modes for a prose guard in one file: own data interference, different sentence matching, line-wrapping splits the pattern. For AC7 shapes: assert that changing an unrelated header sentence or adding an inert comment inside CHANNELS stays green (those are the controls that have stayed green so far).

## Story Context
Full context: `sprint/context/context-story-jt9-28.md` — read before RED. Contains:
- Three explicit warnings from the description (preserved verbatim):
  - "a correction is itself a transcription — RE-MEASURE before editing, do not copy eighteen out of the text"
  - DO-NOT-TOUCH list: `tests/audio-transporter-split.test.ts:285` ("seventeen-plus-one" = 18, right); `src/core/events.ts:93`, `src/core/demo.ts:944` (EVENT KINDS=17, correct); guard file's `NUMBER_WORDS` and comments at :446/:481/:523 (legitimately contain "seventeen")
  - Prose guards go vacuous three ways (own data / different sentence / line-wrap) — assert by RESOLUTION + PROXIMITY and include CONTROL mutants that must stay GREEN
- Reference to jt5-7's archived session (why test total and skipIf block are NOT derivable)
- PATH CORRECTION: sample-bake tools paths are plugin-relative, not repo-root-relative

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

**TEA (RED), 2026-08-06 — the tree diverged materially from the 2026-08-03 groom. RE-MEASURED everything:**

- **The stale cue-count is TEN sites, not eight.** The groom's enumeration missed two, and both are exactly the shape a `(word) cues` guard is blind to: `tests/audio-priority.test.ts:14` "joust's **17** cues" (a DIGIT) and `tests/audio-transporter-split.test.ts:915` "today's seventeen cues" (the groom's `:851` text, moved). The groom's `:851` is now `:850` and is itself a digit ("**17** cues and 17 kinds" — the "17 kinds" is EVENT KINDS and must STAY 17). The widened guards catch all ten; hand-enumeration would have shipped two stale.

- **AC7(c)'s prescribed R4 fix ("drop the determiner, match `(word) cues` with no determiner") is REFUTED by measurement.** There are 30+ TRUE "N cues" sentences across the audio subsystem — pairs ("two cues share a channel"), subsets ("15 cues come out right"), history ("six of eleven cues") — and `audio-manifest.ts:378` "these two cues MOVED in jt5-23" is a determined PAIR. The determiner was LOAD-BEARING, not R4's bug. Dropping it floods false positives. R4's real gap was (a) read-set (audio.ts only) and (b) digit-blindness, both closed instead by **Guard B** (a totality-gated `all|every|joust's|today's` + `N cues` derivation, word OR digit, `=== CUE_COUNT`) plus **Guard A** (a scoped ratchet: in the audio subsystem the word "seventeen" may appear only as an event-kind/`-plus-one` use). R4 itself is left intact (it correctly pins audio.ts's "these eighteen cues" total).

- **AC2 ruled INDICATIVE + date (user, 2026-08-06), not derived.** The @shared range rotted 6→9 (centipede) / 13→14 (battlezone) in FOUR DAYS — from other cabinets adopting `@shared/host-helpers`, nothing joust touched. A live cross-game derivation would redden joust's suite on unrelated fleet work. Stamp it like jt5-7's skipIf block. (Its cousin AC1 — the joust archive tally — IS derived, because only joust stories move it.)

- **DO-NOT-TOUCH, re-confirmed:** `src/core/demo.ts:1413` "six of the seventeen cued moments" is the 17 EVENT-EMISSION moments (`cues: GameEvent[]`, keyed by `EVENT_KINDS.length === 17`), NOT the 18 audio cues — same class as the groom's `demo.ts:944`. Allow-listed. Also `events.ts:14/:93`, `audio-transporter-split.test.ts:285` ("seventeen-plus-one"=18), the guard file's own `NUMBER_WORDS`/comments (excluded by scanning-self exclusion).

- **The "widened read-set" is scoped to the AUDIO subsystem** (audio*, sample-bake, core/events.ts, core/demo.ts), not literally all of src+tests+tools. The literal reading drags in `arena.test.ts`/`arena-contract.ts` (scanlines) and `difficulty-wiring.test.ts` (wave ordinals) that also spell "seventeen" with nothing to do with cues — coupling joust's cue guard to arena churn. Documented in the guard's own comment.

- **README's jt5-7-DERIVED counts have tracked correctly** (not in scope, noted): README:48 now reads "138 files" and "978 claim(s)" (were 104/938 at groom) — those guards did their job. Only the THREE unguarded families this story targets rotted.

- **The keystone holds:** `player2Materialise` is a fully live 18th cue (in SOUNDS/CHANNELS/CUE_SOURCES, SPECS row + priority). `CUE_COUNT === 18` is real, derived from `Object.keys(CUE_SOURCES).length`.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

**Dev (GREEN), 2026-08-06 — re-measured at fix time; three sites needed more than a token swap:**

1. **`priority.test.ts:14` was a genuine ROM re-derivation, not a count bump.** The comment is a quantified split — "15 of joust's 17 cues [parse from the cited row], TWO are wrong [multi-row `+$80` tables]", enumerating SNPCR1 and SNPTED byte-exactly. Adding player2Materialise (the 18th) makes it **15 single-row + 3 multi-row** (confirmed: exactly 3 cues carry a non-empty `continuation` — SNPCR1, SNPTED, SNPCR2). Bumping only "17→18" would have shipped a fresh arithmetic lie (15+2≠18). Fixed to "15 of 18 / THREE wrong" and added SNPCR2's byte-exact rows from `joustrv4.src:8119-8121` (cited row `30+13`=43, full `43+255+152`=450). Also fixed `:55-56` "all **17**, from CUE_SOURCES" ×2 — two more stale cue counts the guards DON'T catch (bare "all 17", no "cues" adjacent).

2. **`deploy-assets.test.mjs:21` "the manifest holds seventeen" was irreducibly ambiguous** between cues(18) and event-moments(17) — both were 17 at its jt5-2 write-time (player2Materialise absent then, git 5008243), and the surrounding "ROM-cited moments" reads as event-kinds. Rather than assert either and risk a fresh falsehood, **removed the ambiguous number** — and the comment's whole "the README carries stale counts" premise is itself outdated (jt5-7 derived those counts). Guard satisfied (no "seventeen"), no wrong claim shipped.

3. **The guards catch a SUBSET.** GREEN surfaced stale cue counts the AC5/AC6 guards miss: `priority.test.ts:55` "all 17" (bare digit, no "cues"). Fixed opportunistically. A fully general prose-count guard is infeasible (established at RED); the residual is that bare "all N"/"N kinds"-adjacent digits escape. Not worth broadening the guard (bare-digit scanning is the false-positive minefield).

4. **`transporter-split:850/:915` carry pre-jt5-6 build-narrative** ("the moment player2Materialise enters SOUNDS", "(red today)") that now reads present-tense though player2Materialise landed at jt5-6 (`:842` in the same block already says "the manifest is 18"). Fixed ONLY the counts (17→18); the narrative is defensibly historical (describes how the jt5-6 guard was built) and rewriting it risks misdescribing the guard. **Residual, low-priority** — a follow-up could freshen that narrative to past tense.

5. **Pre-existing, NOT jt9-28:** `npm run test:orchestrator` has 2 failures ("audit/star-wars resolves to a reachable commit" / "…serve blobs at the audited paths") — a star-wars audit-tag/blob unreachable in this checkout. Confirmed identical (398/396/2) with my work stashed. `npm run lint` clean; joust vitest 2892/2892.

**Design Deviations (Dev):**

4. **Widened the AC7(b) extraction window** in `audio-channel-role.test.ts` from `+1600` to `+2800`. R2's comment is ~1.4k chars, pushing the expect MESSAGE past the old window so the capture returned NULL (the test stayed red even with a correct message). Assertion INTENT unchanged — it still checks the message says MENTION + AC2; only the slice was undersized.

**TEA (RED), 2026-08-06:**

1. **Guard mechanism ≠ the story's prescribed "drop R4's determiner."** Spec (AC7c / folded jt9-37) said match `(word) cues` with no determiner and exclude one pair-sentence. Measured: there is not ONE pair-sentence but 30+, so the determiner-drop is infeasible. Built a totality-gated derivation + a scoped seventeen-ratchet instead. Same GOAL (a determiner-less/digit stale count is caught), different, measured mechanism. Evidence in Delivery Findings.

2. **AC2 delivered as INDICATIVE + date, not DERIVED.** The session AC (written by sm-setup) says "@shared range is DERIVED." Overridden by an explicit user ruling 2026-08-06 after the fresh churn evidence. The AC text is left as-is; this deviation is the record of the change, so the epic YAML (which still says derived) and the session do not silently disagree.

3. **AC7(b)/R2 is a message-honesty fix, not a detector repair.** The story itself says R2's keyword-co-occurrence hole is unfixable (the AC2 trio carries the claim). The RED test therefore pins R2's expect MESSAGE (that it declares itself mention-only), not a detection behaviour.

## SM Assessment

**Setup by Baldur the Bright (SM), 2026-08-06.** State on arrival: `NEW_WORK_STATE`; the phase pointer read `setup`.

**Sibling probes (both clean).** `git fetch --prune` then `git branch -r | grep -Ei jt9-28` → no remote branch. Session sweep across `a-*/.session/` → only bz5-3 (a-2) and mc1-5 (a-3) live, neither touching joust. jt9-28 was unclaimed; claim now pushed (stamp+context on `main` at `755682a`/rebased onto `739ad8e`, empty branch `feat/jt9-28-written-counts-derived-or-guarded` pushed at tip).

**Premise verification before setup — the spec is CURRENT and ACCURATE.** This is a heavily-groomed 5pt story whose description IS the spec (2026-08-03 grooming pass folding jt9-36 + jt9-37 into the original README-counts story). Because the whole subject is stale written counts, I verified the cited surfaces against the working tree rather than trusting the groom blind:
- `README.md:13-21` status block reads exactly "Thirty-six stories … (jt1, 11) (jt2, 9) (jt3, 7) (jt4, 5) (jt8, 4)" — matches the description and sums to 36. The item-(1) premise is live.
- All cited guard/source files exist: `audio-seam-scope`, `audio-channel-role`, `audio-priority`, `audio-transporter-split` test files; `src/shell/audio-manifest.ts`.
- The "seventeen" prose sits exactly where the spec says (`bake-samples.mjs:152`, `bake-samples.test.mjs:30`, `deploy-assets.test.mjs:21` — plugin-relative, corrected below).

**One correction carried into the ACs and context (not a scope change).** The description writes the sample-bake tooling paths repo-root-relative (`tools/sample-bake/…`); they are plugin-relative (`plugins/joust/tools/sample-bake/…`). Recorded in AC2 and the context so RED targets real paths.

**ACs were `null` in the epic YAML — DERIVED here (8 ACs).** No verbatim epic text to diff against; they render the description's three folded items faithfully (README-count derivation/ruling, guard read-set widening + eight stale-comment fixes, three prose-guard shape repairs), preserving the three standing warnings (a-correction-is-itself-a-transcription; the DO-NOT-TOUCH list of legitimately-17 sites; prose guards go vacuous three ways → assert by resolution+proximity with control mutants). TEA should treat the derived ACs as the primary spec and RE-MEASURE every count at RED time — do not copy "eighteen" out of the prose.

**Routing.** tdd (phased) → next owner **TEA (Tyr One-Handed)** for RED.

## TEA Assessment

**RED by Tyr One-Handed (TEA), 2026-08-06.** Eight failing tests across the two existing README/prose-guard suites (NO new test file — the derived file-count guard stays green). Verified: `npx vitest run --project joust` → **8 failed | 2884 passed (2892)**, exactly the 8 new tests, zero collateral; `npm run lint` clean. Commit `0706df1` (rebased onto `fdaac37`).

**The RED, by AC (each fails for a re-measured reason, not a spelling):**

| AC | Test (file) | Fails now because | GREEN = Dev makes it pass by |
|----|------|------|------|
| AC1 | `audio-seam-scope`: status tallies DERIVED | archive holds jt8=**6** (README says 4), total **38** (says 36) | update the status block: jt8 4→6, "Thirty-six"→"Thirty-eight". Guard derives from `sprint/archive` — **RE-MEASURE at fix time**, a story may close before then. |
| AC2 | `audio-seam-scope`: @shared INDICATIVE + date | "between six and thirteen"/"centipede 6" present, no dated stamp | re-measure the range (grep `@shared/[a-z0-9-]+` per game; ~9–14 today but re-run), rewrite the sentence to current numbers, add "indicative, measured 2026-08-06" **beside** it. |
| AC3 | `audio-seam-scope`: Task 12 dated | the "1280 passed \| 566 skipped" SENTENCE has no date (the nearby 2026-08-02 is the indicative block's, excluded by the control) | date the Task 12 sentence as history — e.g. "The Task 12 import (2026-07-DD) measured…". Find the real date if you can; any `20\d\d-\d\d-\d\d` in that sentence passes. |
| AC4 | `audio-seam-scope`: file-count cost documented | no contributor note | add one sentence: adding a `tests/*.test.ts` requires bumping the derived file count in the same commit. Needs both a "adding a … test file" phrase and a bump/update/derived-count word. |
| AC5 | `audio-channel-role`: totality "N cues" = CUE_COUNT | 5 totality claims say 17 (`joust's 17 cues`, `all seventeen cues`×2, `Today there are 17 cues`, `today's seventeen cues`) | fix those five to eighteen/18. |
| AC6 | `audio-channel-role`: no stale "seventeen" | 8 word-sites spell seventeen (the 5 above minus digits, plus `seventeen real records`×2, `stand-ins`, `Williams tables`, `today`) | fix all ten cue-count sites → eighteen/18. **RE-MEASURE `CUE_COUNT`; do NOT copy "eighteen" from prose.** DO NOT touch the "17 kinds" on `transporter-split:850`, `demo.ts:1413`, `events.ts`, `transporter-split:285`. |
| AC7a | `audio-channel-role`: R1 tense-less absolute | `channelDecidesNothing` (extracted, shared with the LIVE R1 guard) misses "…nothing at all" without "no longer" | repair the predicate BODY to catch a channel/fence + UNQUALIFIED absolute. **Controls pin `audio.ts:51` ("nothing BEYOND…") and `:94` ("no longer decides WHICH") must stay FALSE**, and the live R1 guard must stay green over ALL of audio.ts — watch `:39` ("no comparison at all") and `:61` ("nothing in this manifest"), which mention no channel/fence and must not be caught. |
| AC7b | `audio-channel-role`: R2 mention-honesty | R2's expect MESSAGE (not its comment) doesn't say mention-only/AC2 | reword R2's `expect(qualified, …)` message to state it only forces a MENTION and the AC2 trio carries the claim. Avoid a `)` inside the message (the capture is non-greedy). |

**Sequencing for Dev:** the README fixes (AC1–4) and the count fixes (AC5/6) are independent and can land in either order; do the R1 predicate repair (AC7a) LAST and re-run the whole joust suite after it, since it touches a predicate the live guard shares.

**Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`):** this is a test/prose/doc story — it adds NO `src/` module, so the production-module checklist (#1 type-safety escapes, #2 over-broad generics, #4 `||` vs `??`, #5 import extensions) is exercised by the existing `NEW_MODULES` scan in `audio-seam-scope.test.ts`, unchanged and green. The new test code itself carries no `as any`/`@ts-*`, uses `??`, and type-checks clean under the root tsconfig. #3 (switch exhaustiveness) N/A. Every new test asserts a measured value with a positive precondition and synthetic pos/neg controls (AC8) — self-checked for vacuity: no `assert(true)`, no `let _ =`, no always-true assertion.

**Handoff → Dev (Loki Silvertongue), GREEN.**

## Dev Assessment

**GREEN by Loki Silvertongue (Dev), 2026-08-06.** All 8 RED tests pass; `npx vitest run --project joust` → **2892/2892**, `npm run lint` clean. Commit `6d87476` (rebased onto `160a65a`). Re-verified green on the merged tree after two sibling rebases (mc1-4, centipede release — neither touches joust). 7 files changed (README + 4 joust test files + 2 sample-bake tools).

**Everything was RE-MEASURED at fix time, not copied from prose** (the story's standing warning). CUE_COUNT re-derived = 18; archive tally re-derived (jt8=6, total=38); @shared range re-measured (9–14) and stamped indicative; Task 12 dated to the 2026-07-30 monorepo migration.

**Three sites needed judgment beyond a token swap — see Delivery Findings for full reasoning:** (1) `priority.test.ts:14` was a real ROM re-derivation (15 single-row + 3 multi-row; added SNPCR2's byte-exact rows) — bumping only the total would have shipped 15+2≠18; (2) `deploy-assets.test.mjs:21`'s number was irreducibly cue-vs-event ambiguous, so I removed it rather than assert a possible falsehood; (3) `transporter-split:850/:915` build-narrative left as historical (counts fixed).

**Two things for the Reviewer to weigh:** (a) I widened the AC7(b) extraction window (`+1600`→`+2800`) — a genuine test-mechanics bug (message was past the slice), assertion intent unchanged; verify I didn't weaken it. (b) The guards catch a SUBSET — `priority.test.ts:55` "all 17" (bare digit) escaped AC5/AC6 and I fixed it opportunistically; broadening to bare digits is the false-positive minefield established at RED, so I left the guard as-is.

**Not jt9-28:** 2 pre-existing orchestrator failures (star-wars audit blobs), confirmed by stash-and-rerun.

**Handoff → Reviewer (Heimdall).**

## Reviewer Assessment

**Reviewed by Heimdall (Reviewer), 2026-08-06.**

**Verdict:** APPROVED

## Subagent Results
| # | Specialist | Received | Status | Findings | Decision |
|---|------------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (2892/0 joust, lint clean; 2 orchestrator failures pre-existing, zero joust files) | N/A |

All 8 analysis specialists (edge_hunter, silent_failure_hunter, test_analyzer, comment_analyzer, type_design, security, simplifier, rule_checker) are disabled in `workflow.reviewer_subagents`; their coverage was supplied by the Reviewer's own 9-mutation battery (below).

All received: Yes

### Mutation battery — every guard bites (9/9 reddened, then reverted clean)
| # | Mutation | Guard that must redden | Result |
|---|----------|------------------------|--------|
| M1 | README `jt8, 6`→`jt8, 9` | AC1 archive tally | ✓ red |
| M2 | `18 cues`→`19 cues` (transporter) | AC5 totality cue count | ✓ red |
| M3 | `eighteen`→`seventeen` (bake-samples) | AC6 seventeen ratchet | ✓ red |
| M4 | remove Task 12 date | AC3 history stamp | ✓ red |
| M5 | inject the falsehood into audio.ts | AC7a **live** R1 guard | ✓ red |
| M6 | revert `channelDecidesNothing` to jt9-7 shape | AC7a meta-test (repair is load-bearing) | ✓ red |
| M7 | drop `AC2` from R2 message | AC7b mention-honesty | ✓ red |
| M8 | remove contributor note | AC4 doc | ✓ red |
| M9 | range back to `six and thirteen` | AC2 indicative ratchet | ✓ red |

### Correctness — no NEW falsehood shipped
- **SNPCR2 rows byte-EXACT** to `joustrv4.src:8119-8121`; math verified (`30+13`=43, `165-13`=152, `43+255+152`=450). The re-derivation is real: exactly 3 cues carry a non-empty `continuation` (SNPCR1, SNPTED, SNPCR2), so "15 single-row + THREE multi-row = 18" is correct — a bare total bump would have shipped 15+2≠18.
- **jt8=6** derivation correct (jt8-1,2,3,4,6,7 archived; jt8-5 is a skipped id). Total 38.
- **@shared 9–14** re-measured live, matches the README's indicative-dated claim exactly.
- **R1 not overfit:** 7/7 phrasing variants classify correctly; it catches multiple falsehood shapes and spares the true scoped/bounded/unrelated sentences. audio.ts's ONLY channel/fence+absolute sentence is the true scoped `:51`, so the live guard is not vacuously green.
- **DO-NOT-TOUCH intact:** `events.ts:93` / `demo.ts:1413` still read 17 (event kinds/moments), correctly NOT bumped. Every residual "seventeen"/"17 cues" is in the guard's own self-excluded file or a synthetic control.

### For SM at finish (documented deviations, not blockers)
1. AC2 delivered INDICATIVE, not DERIVED as the epic-YAML AC text says — a recorded 2026-08-06 user ruling. Reconcile the epic's `review_findings`/AC note so the YAML and the shipped README agree.
2. The count guards catch a SUBSET (bare `all 17`/digit-without-`cues` escape); Dev fixed `priority.test.ts:55` opportunistically. Broadening is the false-positive minefield established at RED — left as-is by design.
3. Low-priority residual: `transporter-split:850/:915` retain pre-jt5-6 build-narrative ("enters SOUNDS", "(red today)"); counts fixed, narrative left as historical. Candidate follow-up.

**Handoff → SM (Baldur the Bright), finish.**
## Impact Summary

**jt9-28 — APPROVED, no blockers (blocking_count: 0). Trunk-based; RED `fdaac37` + GREEN `160a65a` on origin/main.**

Fixed joust's three unguarded README count families and repaired the prose/cue-count guards jt9-37/jt9-36 filed:
- **README:** status tallies DERIVED (jt8 4→6, total 36→38); @shared range marked INDICATIVE + dated 2026-08-06 (nine–fourteen) per user ruling (fleet churn); Task 12 dated as history (2026-07-30 migration); contributor note on the derived file-count.
- **Cue counts → 18:** TEN stale sites fixed (TEA re-measured; grooming's "eight" undercounted two — a digit `priority.test.ts:14` and a moved `transporter-split:915`). `priority.test.ts:14` required a real ROM re-derivation (15 single-row + 3 multi-row; SNPCR2 byte-exact from `joustrv4.src:8119-8121`). `deploy-assets:21`'s irreducibly cue-vs-moment-ambiguous number removed rather than mis-asserted.
- **Guards:** R1 repaired to catch a tense-less unqualified channel/fence absolute while sparing the true scoped `audio.ts:51`/`:94`; R2 made honestly mention-only, deferring to the AC2 trio. The prescribed "drop R4's determiner" was REFUTED by measurement (30+ true pair/subset "N cues") and replaced by a totality-gated derivation + a scoped seventeen-ratchet.

**Verification:** joust vitest 2892/2892, lint clean; Reviewer's 9-mutation battery all reddened; SNPCR2 math + bytes confirmed; DO-NOT-TOUCH event-kind 17s intact. 2 orchestrator failures are PRE-EXISTING (star-wars audit blobs, zero joust files).

**Non-blocking, for the record:** (1) AC2 INDICATIVE not DERIVED (user ruling — epic YAML AC still says derived; reconcile `review_findings`). (2) Guards catch a subset by design (bare digits escape). (3) transporter-split narrative residual — candidate follow-up.
