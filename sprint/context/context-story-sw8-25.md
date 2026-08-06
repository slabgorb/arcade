# Story sw8-25 Context

## Title
The guard's association rule binds a quote to the WRONG citation in a columnar table — it reports a correct citation as stale and names the previous entry's line

## Metadata
- **Story ID:** sw8-25
- **Type:** bug
- **Points:** 3
- **Priority:** p3
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Cabinet feel: the flight and combat loop — render/experiential fidelity vs the cabinet longplay

## Problem
Found by Dev during sw8-23's GREEN phase, worked around rather than fixed, and the workaround is itself the reproduction.

THE DEFECT. checkCitations' association rule takes the delimited span IMMEDIATELY adjacent to a citation (within 4 characters of punctuation) as that citation's verbatim. 'unwrap' first rejoins comment-continuation lines into one string. Together, those two rules mis-pair whenever a comment lays out citation/quote pairs in a COLUMN — a very common shape in this codebase:

  //   WSMAIN.MAC:1636  PHIGD (ground INIT, PH.TIM just zeroed):
  //                      JSR PM4TH   ";BATTLE MUSIC IN FOURTHS"
  //   WSMAIN.MAC:1673  PHEGD (the PER-FRAME ground handler), guarded by

After unwrap, the closing quote of entry 1 is separated from entry 2's citation by a single space. gapOk accepts it, so ';BATTLE MUSIC IN FOURTHS' — which belongs to :1636 — is bound to :1673 as its 'before' quote. The guard then reports WSMAIN.MAC:1673 as stale and helpfully names :1636 as where it 'moved to'.

WHY THIS IS THE WORST OUTPUT SHAPE. The citation is CORRECT (JSR PMREB really is at :1673). The tool does not merely miss a defect — it manufactures one, and attaches a specific, plausible, wrong line number to it. A reader who trusts the hint 'fixes' a correct citation into a wrong one, and the guard then goes green on the corruption. This is the same family as td1-14's first-occurrence defect but arrives from the opposite direction: there the quote is right and the line is ambiguous; here the line is right and the quote belongs to someone else.

REPRODUCTION, exact. Take plugins/star-wars/tools/music-bake/music-data.test.mjs at commit ac7eb34~1 (before sw8-23's workaround), run the guard, and it reports 'WSMAIN.MAC:1673: quoted verbatim is not in the cited span — it is now at WSMAIN.MAC:1636'. sw8-23 worked around it by leading the line with the routine name ('PHEGD  WSMAIN.MAC:1673 …') so a non-punctuation token separates the two entries — the citation was never touched, because touching it would have written a false record into the tree.

DIRECTION FOR A FIX (not prescriptive). Bound the 'before' search so it cannot cross another citation: if any citation lies between a candidate quote and this one, the quote is not ours. That is checkable from the already-sorted citation list in extractCitations. Whatever the mechanism, the RED must include the columnar fixture above and must assert the correct citation stays CLEAN, not merely that some error changes.

NOT sw8-26: that story is about the guard being silent on what it did not cover (a failed opt-out, an unreadable file). This one is about the guard being LOUD and WRONG about something it did cover. Different failure direction, different code — quoteFor's adjacency window versus checkTree's reporting.

NOT td1-14: that story owns the relocation SEARCH (refuse to guess between duplicate verbatims; widen the window for a multi-instruction run). This one is upstream of it — the wrong quote is chosen before any search happens, so td1-14's fixes would faithfully relocate a quote that was never this citation's.

---

ADDED at sw8-19's finish — a THIRD occurrence, reproduced during ORDINARY AUTHORING rather than in legacy prose. Raised as a Question by TEA, then hit independently by SM during the finish chore.

TEA's occurrence: writing a ROM span BARE (':3898-3918') in a new comment that also mentioned 'gameRules.ts' made the association rule bind the span to gameRules.ts — a 272-line file — and correctly report it out of range, raising the tree-wide count to 30 against sw8-18's ratchet ceiling of 29. Three tests red with NO source change at all. Fixed by spelling the filename ('WSMAIN.MAC:3898-3918'); count back to 29.

SM's occurrence, same ceremony: the finish chore added 11 lines to sim.ts, shifting every line below :159 by 11. The guard flagged the ':N' refs it could resolve, but 'surface-traversal-end.test.ts' also carries SIX bare ':N' spellings — (:1122-1123), (:1145-1150), (:965-969) — that the guard never mentions, sitting in the same comment block as the ':N' refs it does. Re-anchoring only what the guard reports leaves a comment where some numbers are correct and their neighbours are silently wrong, which is worse than uniformly stale. All 11 were shifted by hand.

SO THE OPEN QUESTION FOR THIS STORY, which its owner should rule on rather than inherit: the two spellings fail in OPPOSITE directions and this story currently owns only the first.
  - A bare span NEAR A DIFFERENT FILENAME is bound to the wrong file and reported LOUD AND WRONG — this story's exact defect class, but arriving from a NEW file rather than a drifted one, so a fix aimed only at columnar tables may not catch it.
  - A bare span near NO filename is bound to nothing and evades the gate ENTIRELY — silent, and arguably sw8-26's shape ('the guard is silent about what it did not cover') rather than this one's.

Both were measured in this repo within one story. Whether they belong here, in sw8-26, or in a story of their own is a scoping call; what should NOT happen is each being rediscovered a third time. Note the interaction with sw8-24, which sweeps the 29: a sweep that re-anchors only guard-visible citations will leave the bare ones stale by construction.

## Technical Approach
_Approach hints to be refined by TEA/Dev. The story title above defines the
intended behavior._

## Scope
- In scope: the behavior described by the story title.
- Out of scope: unrelated changes.

## Acceptance Criteria
_No acceptance criteria recorded in the sprint YAML — TEA to define during the RED phase._

---
_Generated by `pf context create story sw8-25` from the sprint YAML._
