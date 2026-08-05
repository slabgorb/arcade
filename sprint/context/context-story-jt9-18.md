# Story jt9-18 Context

## Title
The level-flight block, read once: BOLEV2 forces a glide wake after every level flap, and PPVELX is snapshotted at the decide rather than read live

## Metadata
- **Story ID:** jt9-18
- **Type:** story
- **Points:** 5
- **Priority:** p3
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Joust — the remainder, re-ordered: apparatus, gameplay, geometry, brains, dossier

## Problem
Found by Dev during uf1-9's GREEN, confirmed by the Reviewer. joust's LEVEL flight flaps on every falling wake; the ROM cannot. BOFAST (JOUSTRV4.SRC:3931-3934) raises the flap bit AND sets PJOY to BOLEV2 — and BOLEV2 (:3936-3938) does nothing except point PJOY back at BOLEV1 and fall through into BOLEVA's CLRB. So the wake AFTER a level flap is a FORCED GLIDE, and the fastest a level-flying bounder can beat its wings is every other wake. The port's level law is a plain per-wake test — 'flap iff falling' in pursue()'s fallthrough, plugins/joust/src/core/enemy.ts — with no such state, so a bird that keeps falling flaps every single wake. WHY IT WAS LEFT: uf1-9 owned the eleven DYTBL cadence rows and this is not one of them (BOLEV2 is a state, not a row; the only row in that block is BOLETM, which uf1-9 wired as the DECISION interval and which is now correct). Building it inside uf1-9 would have widened that story's determinism blast radius for no AC. THE TWINS ARE B2LEV2 and the shadow's SHLEV/SHLEP equivalents — enumerate them before assuming this is one branch; uf1-9's census found the analogous decision-timer family had SIX sites where the story claimed four. EXPECT A RE-BASELINE: halving a level flyer's flap rate moves the jt2 seeded replays. uf1-9 re-baselined 21 pins by sweeping for each test's OWN precondition rather than nudging numbers, and two had to change SEED because the precondition had an empty solution set on the old one — read sprint/archive/uf1-9-session.md before starting.
=== MERGED 2026-08-03: jt9-19 FOLDED IN (Architect grooming pass) ===
Both stories rewrite the SAME twenty lines of plugins/joust/src/core/enemy.ts, and the two sentences each was filed to correct are already sitting next to each other in that file: the PPVELX docblock at :93-106 (which says the live read "re-stores every wake", the premise jt9-19 exists to retire) and the BOLEVA comment at :679 (which says LDB #$01 and CLRB "are re-decided every wake (:3926-3938)", the premise THIS story exists to retire). One ROM read of the level-flight block :3903-3940 answers both, and both move the same jt2 seeded replays, so kept apart the second story re-baselines pins the first just moved - and a reviewer cannot tell that second move from a nudge. Points 3 + 3 -> 5.
FOLDED IN FROM jt9-19 - PPVELX IS SNAPSHOTTED AT THE DECIDE, NOT READ LIVE. The gap was OPENED deliberately by jt8-2 and uf1-9 is what closed its precondition. HomingState says it plainly: "The decision timers belong to a later story (uf1-9 owns the TIME UNTIL NEXT DECISION rows), so there is no moment here at which a snapshot could honestly be taken and homingWake compares the target LIVE index instead." That reasoning was correct then and is now spent. THE ROM: PPVELX (OLD PLAYERS X VELOCITY, RAMDEF.SRC:209) is written at exactly THREE sites across the smart brains - BOLEV (LDA PVELX,X / STA PPVELX,U, :3907-3908), B2LEV (:4058-4059) and SHLEP (:4281-4282) - and each sits IMMEDIATELY BEFORE that brain decision-timer load (BOLETM :3909, HULETM :4060, SHUPTM :4283). So the snapshot is taken once per level-flight decide and then READ, never rewritten, by BOLEVB throttle (LDA PPVELX,U / CMPA PVELX,U, :3939-3940) until the interval expires. Note :3939-3940 is INSIDE the same block as this story BOLEV2, which is the mechanical reason these two are one read.
CHECK FIRST, because it may be a no-op for one brain: jt8-2 argued the live read is snapshot-EQUIVALENT for SHLEP under the per-wake collapse, since a brain that re-decides every wake re-stores every wake. uf1-9 changed that premise too - the shadow level branch is now HELD for its SHUPTM interval rather than re-decided each wake - so RE-DERIVE the equivalence rather than inheriting it. The bounder and hunter were never equivalent: their intervals are 21 wakes at wave 1, which is 21 wakes of comparing against a value the ROM froze.
ORDER AND COMMITS. Enumerate the twins for BOTH halves before writing anything - uf1-9 census found SIX sites where the backlog claimed four, so B2LEV2 and the SHLEV/SHLEP equivalents are to be counted, not assumed. Then land the two behaviours as SEPARATE COMMITS with ONE joint re-baseline commit last: merging the STORY does not merge the COMMITS, and a single sweep stating which digests moved and why is what this epic standing rule is actually protecting.

## Technical Approach
_Approach hints to be refined by TEA/Dev. The story title above defines the
intended behavior._

## Scope
- In scope: the behavior described by the story title.
- Out of scope: unrelated changes.

## Acceptance Criteria
_No acceptance criteria recorded in the sprint YAML — TEA to define during the RED phase._

---
_Generated by `pf context create story jt9-18` from the sprint YAML._
