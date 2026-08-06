# Story jt9-28 Context

## Title
Joust's written counts, derived or guarded: the README tallies, the eight stale seventeen-cue comments, and the three AC4 prose guards a falsehood walks through

## Metadata
- **Story ID:** jt9-28
- **Type:** chore
- **Points:** 5
- **Priority:** p3
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Joust — the remainder, re-ordered: apparatus, gameplay, geometry, brains, dossier

## Problem
jt5-7 derived three of joust's README counts (test files, claims, event kinds) and stamped two families as indicative (the test total, the six-number skipIf block). THREE COUNT FAMILIES WERE LEFT UNTOUCHED AND ARE ALREADY WRONG OR ROTTING.

(1) THE STATUS BLOCK'S STORY TALLIES, README.md:13-21 — "Thirty-six stories are archived across five epics", with per-epic counts (jt1 11, jt2 9, jt3 7, jt4 5, jt8 4). Found by jt5-7's Dev. These are hand-maintained and drift on every story that closes; sprint/archive/ is the authority and is trivially countable. Derive them, or mark them indicative with a date the way jt5-7 marked the skipIf block. Note the archive holds stories from every game, so the count must be filtered to joust's epics — a naive `ls sprint/archive | wc -l` is the wrong number and would ship a new false one.

(2) THE @shared SUBPATH RANGE, README.md:143 and the same sentence in jt5-1's description in sprint/epic-jt5.yaml. jt5-7's Reviewer corrected this from "between five and thirteen (centipede 5, ...)" to "six and thirteen (centipede 6, ...)" — centipede gained @shared/audio in cp5-1 (6122ae0) and the 2026-07-31 figure went stale. Measured 2026-08-02 with `grep -rhoE '@shared/[a-z0-9-]+' plugins/<game>/src | sort -u | wc -l`, which agrees on src-only and src+tests: centipede 6, red-baron 8, asteroids 10, tempest 10, star-wars 11, battlezone 13, joust 1. IT IS CLEANLY DERIVABLE — the grep above IS the derivation — and it rots every time any game adopts a shared module, which is a routine event. This is the strongest remaining candidate for a guard.

(3) THE HISTORICAL MEASUREMENT AT README.md:96 — "The Task 12 import measured that failure mode deliberately — 1280 passed | 566 skipped". Raised as a question by jt5-7's Dev and deliberately left: it reads as a record of a specific past event rather than a live claim, so it may be correct as history. Rule on it — either mark it explicitly historical with its date, or re-measure. Do not leave it ambiguous, because a reader cannot currently tell which it is.

WHY THIS IS ONE STORY: all three are the same defect class jt5-7 was filed for, in the same file, and (2) is the one with a real derivation available. The shape to copy is jt5-7's split — DERIVE what can be derived, stamp the rest INDICATIVE with a date and a stated reason — and the guard belongs beside the others in plugins/joust/tests/audio-seam-scope.test.ts, which already reads the README through flatten(). Read jt5-7's archived session before starting: it records why the test total and the skipIf block are NOT derivable (32 it.each sites expand; the skipIf block is self-referential), so do not re-litigate those two.

FOURTH ITEM, routed here by jt9-3's TEA (finding) and Reviewer (routing), 2026-08-03: THE DERIVED FILE COUNT SILENTLY TAXES EVERY STORY THAT ADDS A TEST FILE, AND THE README NEVER SAYS SO. Adding any new file under plugins/joust/tests/ reddens "jt5-7 AC5 — the suite FILE count matches what vitest actually discovers" (audio-seam-scope.test.ts), because README:48 states `# 104 files (derived + guarded)`. VERIFIED EMPIRICALLY by jt9-3's Reviewer, not merely reasoned: dropping one trivial probe file into that directory fails exactly that test with "README says 104 test files; vitest discovers 105". This is working AS DESIGNED and the guard should stay — but it means a test-count guard is silently influencing test PLACEMENT decisions. It already did: jt9-3's TEA cited it as one of two reasons for distributing three new guards into existing suites rather than opening wing-cues.test.ts. That was the right call there (the second reason, needing audio-thud's staging kit, was independently sufficient), but the cost has never been priced into any story's sizing and the README's contributor notes do not mention it. FIX: add one line to the README's contributor notes saying that adding a test file requires bumping the derived count in the same commit. Scope is one sentence; it belongs with the other README-count corrections rather than in a story of its own.

=== MERGED 2026-08-03: jt9-36 AND jt9-37 FOLDED IN (Architect grooming pass) ===

All three are the same mechanism - a WRITTEN COUNT or a prose claim that no derivation checks - and two of them ask for the SAME line to change. Measured at grooming: the count guards in plugins/joust/tests/audio-channel-role.test.ts (:478 and :499) read exactly TWO hardcoded files, src/shell/audio.ts and src/main.ts. jt9-37 wants that read-set widened to all of plugins/joust/src/; jt9-36 wants it widened to tests/ and tools/. Disjoint site lists, identical one-line fix, and whichever landed second would rewrite the other work. Points 2 + 3 + 2 -> 5.

FOLDED IN FROM jt9-36 - EIGHT STALE SEVENTEEN-CUE COUNTS. jt5-6 made the joust cue union 18 (player2Materialise / SNPCR2). jt9-7 fixed the two LIVE-CODE sites it could reach (src/shell/audio.ts:51 and src/main.ts:167) and pinned both. RE-MEASURED AT THIS GROOMING PASS, and the count is confirmed EIGHT: tests/audio-priority.test.ts:183 ("declares a priority for all seventeen cues" - an it() TITLE, so it prints wrong on every run) and :224; tests/audio-transporter-split.test.ts:65, :576 and :851; tools/sample-bake/bake-samples.mjs:152 ("The seventeen stand-ins", directly above a SPECS object measured at 18); tools/sample-bake/bake-samples.test.mjs:30; tools/sample-bake/deploy-assets.test.mjs:21. Each ASSERTION is derived and correct - only the prose is stale, which is exactly the shape that survives a green suite. DO NOT TOUCH tests/audio-transporter-split.test.ts:285 ("all seventeen-plus-one of them today") - awkward, but it means 18 and is right - nor src/core/events.ts:93 or src/core/demo.ts:944, which count EVENT KINDS (17) and are correct. Also note tests/audio-transporter-split.test.ts:851 is stale TWICE: "today seventeen cues" and the sentence after it, "It bites the moment player2Materialise enters SOUNDS" - it entered SOUNDS at jt5-6 and is the eighteenth cue. RE-MEASURE before editing rather than copying eighteen out of this text; the standing lesson is that a correction is itself a transcription.

FOLDED IN FROM jt9-37 - THE THREE AC4 PROSE GUARDS A FALSEHOOD WALKS THROUGH. Filed from a novel battery of 11 against the GREEN tree, none of them in TEA 5-structural/8-prose battery or Dev 6. jt9-7 shipped prose is TRUE and its AC1/AC2/AC3 executable tests are strong; what is weak is the three AC4 PROSE guards. (1) R1, the absolute-ban guard: it filters on /no longer/i AND /(anything|nothing|at all)/i, so BOTH clauses are required, and the measured falsehood REWORDED without "no longer" passes all 2548 joust tests. FIX: drop the /no longer/ requirement, or add a second shape (channel/fence + absolute, no tense marker). (2) R2, the docblock guard: it filters for a sentence carrying /\bchannel\b/ AND /(window|released?|expires?|expired|tick)/ - KEYWORD CO-OCCURRENCE, not the claim - so the exact INVERSION of what it demands satisfies it. FIX: this guard can only ever force a MENTION; say so in its message and let the AC2 trio carry the claim, which it does. (3) R4, the header count guard: the regex is /(?:these|those|all|the) (word) cues/, so a count with NO determiner is invisible, and a WRONG count ships whenever a RIGHT one two clauses later satisfies the precondition. FIX: match `(word) cues` with no determiner and exclude the known true pair-sentence by its own words, or assert on every number-word in the file. (4) R11, coverage: src/shell/audio-manifest.ts carries two more live-code counts over the same 18-cue set (:96 "None is used today - all eighteen have one" and :575 "Three of these eighteen do exactly that") and changing :96 to seventeen leaves all 2548 green. CONTROLS that stayed GREEN and must keep doing so in any fix: an unrelated header sentence reworded, and an inert comment inserted inside the CHANNELS object.

HOW TO SEQUENCE THIS STORY, since it is now three things. Widen the guard read-set ONCE, to plugins/joust/src/ + tests/ + tools/, and let it go red across all eight stale sites plus whatever the widening newly catches; fix the sites; then repair the three guard SHAPES above, because a shape repair on a narrow read-set has to be re-verified after widening anyway. The README counts (items 1-3 of the original story) are independent of the guard and can land in their own commit either side. Beware the standing trap this epic has hit twice: a prose guard goes vacuous three ways - via the file OWN data, via a different sentence, and via line-wrapping - so assert by RESOLUTION and PROXIMITY, and include CONTROL mutants that must stay GREEN. The guard file own NUMBER_WORDS table at :446 and its explanatory comments at :481 and :523 all contain the word seventeen legitimately; a naive widening that reads its own file will red on them.

## Background

### Three Explicit Warnings (Preserved from Description)

1. **"a correction is itself a transcription — RE-MEASURE before editing, do not copy eighteen out of the text"**
   - The standing lesson: when fixing stale counts, re-measure at FIX time rather than copying the replacement from the story text itself. The description says "eighteen" is correct, but you MUST verify this against the tree BEFORE editing any file.

2. **DO-NOT-TOUCH List** (counts or text that ARE correct and must not be altered):
   - `tests/audio-transporter-split.test.ts:285` — reads "all seventeen-plus-one of them today"; this awkward phrasing means 18 and IS correct. Do not change it.
   - `src/core/events.ts:93` and `src/core/demo.ts:944` — both count EVENT KINDS, which is 17. These are correct and must stay 17.
   - The guard file's own `NUMBER_WORDS` table at `:446` and explanatory comments at `:481` and `:523` — these legitimately contain the word "seventeen" as part of the code structure and must not be edited.

3. **Prose guards go vacuous three ways:**
   - Via the file's OWN data (reading NUMBER_WORDS or comments that contain "seventeen")
   - Via a DIFFERENT sentence (the same falsehood stated elsewhere satisfies the guard)
   - Via line-wrapping (a regex split across a line boundary doesn't match)
   - FIX: assert by RESOLUTION and PROXIMITY, and include CONTROL mutants that must stay GREEN.

### Path Correction (from SM premise-verification)

The description writes sample-bake tooling paths as repo-root-relative (`tools/sample-bake/...`). They are actually **plugin-relative**:
- `plugins/joust/tools/sample-bake/bake-samples.mjs:152` ("The seventeen stand-ins")
- `plugins/joust/tools/sample-bake/bake-samples.test.mjs:30`
- `plugins/joust/tools/sample-bake/deploy-assets.test.mjs:21`

Use the plugin-relative paths when navigating and editing.

### Reference: jt5-7's Pattern

Read `sprint/archive/jt5-7-session.md` to understand why certain counts cannot be derived:
- Test file count: DERIVABLE (counts from vitest discovery)
- Claims count: DERIVABLE (counted from dossier)
- Event kinds: DERIVABLE (static import)
- **Test total (1944 vs 2463):** NOT DERIVABLE — 32 `it.each` sites expand at runtime
- **skipIf block (six numbers):** NOT DERIVABLE — self-referential (a test counting the literal is itself a file under tests/)

Do NOT re-litigate these two decisions. This story's counts (items 1-3 above) are independent and have different derivability.

## Technical Approach

1. **Sequence: Widen the guard read-set first**, to expose all eight stale sites, then fix them, then repair guard shapes
2. **README counts** (items 1-3 of the original story) can land in their own commit either side of the guard work
3. **Mutate with a WRONG value** to prove the guard is not vacuous — do not rely on re-reading the diff
4. **Include CONTROL mutants** that must stay GREEN (unrelated header rewording, inert CHANNELS comment)

## Scope
- In scope: README count corrections (items 1-3), file-count side-effect documentation, guard widening and shape repairs, eight stale seventeen-cue comment fixes
- Out of scope: test total, skipIf block (learned from jt5-7), unrelated changes

## Acceptance Criteria

See `.session/jt9-28-session.md` for the full eight ACs:

**AC1-AC2:** README story tallies and @shared range are DERIVED with guards
**AC3:** Task 12 measurement is ruled as history or re-measured
**AC4:** File-count guard side-effect is documented
**AC5-AC6:** Count-guard read-set is widened and eight stale comments are fixed
**AC7:** Three prose guard shapes are repaired
**AC8:** Guard fixes include RESOLUTION + PROXIMITY + CONTROL mutants

---
_Generated by `pf context create story jt9-28` from the sprint YAML._
