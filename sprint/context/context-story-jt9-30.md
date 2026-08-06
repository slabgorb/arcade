# Story jt9-30 Context

## Title
Comment-body <file>.ts:<line> refs in the joust suite become symbol refs — 86 distinct refs across 30 test files; the 283 JOUSTRV4.SRC citations are OUT of scope

## Metadata
- **Story ID:** jt9-30
- **Type:** chore
- **Points:** 3
- **Priority:** p3
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Joust — the remainder, re-ordered: apparatus, gameplay, geometry, brains, dossier

## Problem
Descoped out of jt9-2 on 2026-08-02 by SM, with the user's decision, after measurement.

jt9-2 carried a Reviewer finding from jt8-3 — "comment-body enemy.ts:<line> refs go stale every time the file grows" — naming two sites: audio-flap.test.ts:536 ("enemy.ts:540") and difficulty-wiring.test.ts:27 ("enemy.ts:115/118"). BOTH ARE ALREADY FIXED, by uf1-9, and there are now ZERO enemy.ts:<number> refs anywhere in the joust suite. audio-flap.test.ts:543 reads "`stepEnemyDetailed` (enemy.ts) ... UPDATED BY uf1-9"; difficulty-wiring.test.ts:33-35 reads "enemy.ts's BOUNDR_DOWN_BRAKE / B2UNDR_DOWN_BRAKE ... named rather than line-cited, because uf1-9 grew that file and the numbers moved (:115/:118 -> :266/:273)". THE OLD NUMBERS IN THAT SECOND COMMENT ARE A HISTORICAL NOTE EXPLAINING THE REPAIR, NOT A LIVE DEFECT — do not "fix" them; deleting them destroys the record.

What IS live is the finding's PRINCIPLE, at a scale jt9-2's 2 points never covered: 86 distinct <our>.ts:<line> refs across 30 joust test files (102 occurrences). That is this story.

MEASURED 2026-08-02 from plugins/joust/tests:
  grep -rhoE '\b[a-z0-9-]+\.ts:[0-9]+' *.test.ts | sort -u | wc -l   -> 86 distinct
  same without sort -u                                               -> 102 occurrences
  grep -rlE '\b[a-z0-9-]+\.ts:[0-9]+' *.test.ts | wc -l              -> 30 files
Re-measure at fix time; these counts drift.

HARD EXCLUSION — the 283 ROM citations of the form JOUSTRV4.SRC:<line> (and .MAC/.SRC generally) are OUT OF SCOPE and MUST NOT be converted. They cite an immutable primary source, they are the repo's citation idiom, and they are pinned by the citation gates. Converting one is an active regression.

TWO TRAPS THIS STORY MUST NOT FALL INTO:
1. Not every <our>.ts:<line> occurrence is a COMMENT-BODY ref. Some sit inside assertion strings or in code that reads a source file and pins a line deliberately. Classify before converting; a deliberate pin is not a stale comment.
2. A ref being present does not make it stale. Decide up front whether the story converts ALL comment-body refs on principle (line numbers are never stable anchors) or only the demonstrably-stale ones — and if the latter, each of the 86 needs its cited line re-opened and checked. Say which, in the ACs, before RED.

Prior art for the conversion: uf1-9's own edits to audio-flap.test.ts and difficulty-wiring.test.ts are the template — name the symbol, and where the number carried information, keep it as an explicit historical note rather than deleting it.

THE DRIFT RATE IS HOURS, NOT MONTHS — routed here by jt9-3's TEA (finding) and Reviewer (routing), 2026-08-03, with a worked example. jt5-3's story text cited demo.ts:1109 for the flight-cues-before-collision-cues concatenation. That was CORRECT when written: at jt5-3's own GREEN commit (8ef35a1, 2026-08-01) demo.ts:1109 was exactly that statement. jt5-4 (af3fed4, THE SAME DAY) moved it to :1174; it is :1275 today. Three positions in three days, by two unrelated stories — and today's :1109 is unrelated egg-catch narrowPhase logic, so the stale ref does not dangle, it silently points at the WRONG REAL CODE, which is the worse failure. Two consequences for this story's ACs: (a) state the drift rate in them, because a reader who thinks these refs rot over months will under-prioritise; (b) the same rot affects <file>.ts:<line> refs in STORY and EPIC YAML text, where no gate can ever catch it — decide explicitly whether this story's remit stops at test comments (as currently scoped) or extends to sprint YAML, and say so rather than leaving it implied.

STALENESS RATE MEASURED (jt9-38 GREEN, 2026-08-03): of the 51 demo.ts:<line> refs that jt9-38's insertions moved, the checkable subset (refs whose comment quotes a backticked identifier) was sampled against HEAD and 14 of 16 DO NOT RESOLVE - HEAD:797 is blank, HEAD:1288 is ': null', HEAD:955 is toPteroEntity where the comment wants nextWaveBcd. That answers this story's own open question 2: convert ALL comment-body refs on principle rather than only the demonstrably-stale ones - at ~87% already stale, classifying is more work than converting. jt9-38 deliberately did NOT re-anchor them (shifting an already-wrong pointer preserves a wrong referent while making it look maintained), and added zero new <our>.ts:<line> refs, so this story's counts of 86 distinct / 102 occurrences / 30 files are unchanged.

## Technical Approach
_Approach hints to be refined by TEA/Dev. The story title above defines the
intended behavior._

## Scope
- In scope: the behavior described by the story title.
- Out of scope: unrelated changes.

## Acceptance Criteria
_No acceptance criteria recorded in the sprint YAML — TEA to define during the RED phase._

---
_Generated by `pf context create story jt9-30` from the sprint YAML._
