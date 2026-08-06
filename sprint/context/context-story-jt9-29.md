# Story jt9-29 Context

## Title
The lava-troll looker in the three SMART brains — BOUNDR/B2UNDR/SHADOW, and why jt9-1's looker cannot fire without them

## Metadata
- **Story ID:** jt9-29
- **Type:** bug
- **Points:** 5
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Joust — the remainder, re-ordered: apparatus, gameplay, geometry, brains, dossier

## Problem
The lava-troll looker is not LINET's alone, and porting only LINET's leaves it unable to fire. Found by TEA during jt9-1's RED and upgraded from "three more gaps" to "the blocker" by Dev's measurement at GREEN.

THE SHAPE. The SAME eight instructions run in four brains, byte for byte, differing only in the branch target:
  LINET   :3725-3732  BEQ LNTUP     (ported by jt9-1)
  BOUNDR  :3787-3794  BEQ BODN1A
  B2UNDR  :3971-3978  BEQ B2DN1A
  SHADOW  :4230-4237  BEQ SHUPST
In the three SMART brains it is the brain's FIRST instruction; only in LINET does a promotion check sit above it. That asymmetry is why jt9-1 scoped to LINET (only LINET's sits in a wake-skipped prologue) and it is the reason these three are separate work: each branches into a different brain STATE, not into a shared flap. All four blocks re-derived and pinned in plugins/joust/tests/glide-prologue-source.test.ts.

WHY THIS IS A BLOCKER, NOT COMPLETENESS WORK - measured, not argued. jt9-1 shipped LINET's looker correct, wired to real scheduler adjacency (PPREV), and mutation-guarded. It still cannot fire in play. The troll's victim runs the dumb brain for ONE FRAME OUT OF 600 before promoting (wave 4 has budget room), and frame.ts promotes BEFORE the brain steps, so on the single wake its looker would first come due it is already running a smart brain whose looker is unported. Dev's differential: stepping the same demo with the troll in its ROM position versus at the list end produced byte-identical enemy state for 300 frames across three seeds.

THE ROM ALREADY ANSWERS THE OBVIOUS OBJECTION. PLAVT,U survives promotion by design - LNTSMT (:3764-3775) writes NSMART, PCHASE, PDECSN->DSMART and STX PJOY,U, and NOTHING ELSE. So the machine keeps one countdown running across the promotion boundary this port currently drops it at. jt9-1 pinned that fact in dumb-wingbeat.test.ts (the promoted-vs-fresh reference carries plavt).

ALREADY SHIPPED, DO NOT REBUILD: EnemyState.plavt, lavaTrollLooker() and its wave-scaled LNTLAV reload (DYTBL row 3, wired by jt9-1 after correcting a 'dead-in-rom' misreading that two tests had been guarding), the PPREV channel in frame.ts (lastRanKind), and insertTroll() in demo.ts placing a spawned troll before its victim per :6778. This story adds the three CALL SITES and their branch targets, nothing else.

EXPECT A DETERMINISM RE-BASELINE HERE, unlike jt9-1. jt9-1 moved exactly one promotion by one wake and no pin at all; this one makes a real behaviour reachable in play, which is a different shape. Read sprint/archive/jt9-1-session.md for the method - and for the discipline it cost most to learn: put a POSITIVE CONTROL beside any "the count is zero" assertion, and when a phase threads a new argument from a producer into a pure consumer, mutate the producer (hard-wire the argument to its default) or the wiring goes unguarded no matter how good the unit tests look.

ALSO NOTE the frame-boundary deviation jt9-1 logged: lastRanKind is re-initialised per stepFrame, while the ROM's PPREV is persistent RAM that carries across frames (RAMDEF.SRC:240). Unobservable today because insertTroll guarantees an enemy follows the troll; widening the set of processes that read PPREV is exactly what would make it observable, so re-assess it here.

## Technical Approach

### ROM References & Already-Shipped Components

The four looker blocks (byte-identical, differing only in branch target):
- **LINET** (JOUSTRV4.SRC:3725-3732) → BEQ LNTUP — **PORTED BY jt9-1, DO NOT REBUILD**
- **BOUNDR** (JOUSTRV4.SRC:3787-3794) → BEQ BODN1A — **THIS STORY ADDS THIS**
- **B2UNDR** (JOUSTRV4.SRC:3971-3978) → BEQ B2DN1A — **THIS STORY ADDS THIS**
- **SHADOW** (JOUSTRV4.SRC:4230-4237) → BEQ SHUPST — **THIS STORY ADDS THIS**

All four blocks are already pinned in `plugins/joust/tests/glide-prologue-source.test.ts`.

### Already Shipped, Do Not Rebuild
- `EnemyState.plavt` (the countdown field)
- `lavaTrollLooker()` function and its wave-scaled LNTLAV reload (DYTBL row 3, wired by jt9-1 after correcting a dead-in-rom misreading)
- `PPREV` channel in `frame.ts` (named `lastRanKind`)
- `insertTroll()` in `demo.ts` placing a spawned troll before its victim per JOUSTRV4.SRC:6778

### This Story's Scope: THREE Call Sites
Add the looker to **BOUNDR**, **B2UNDR**, and **SHADOW** brains (one per brain's decision routine leading to the three different branch targets above).

### Critical Testing Discipline (From jt9-1-session.md)
Read `sprint/archive/jt9-1-session.md` before starting for:
1. **Positive-control-beside-a-zero-count discipline** — any "count is zero" assertion needs a positive control showing the assertion CAN fail
2. **Mutate-the-producer-not-the-consumer** — when threading a new arg from a producer into a pure consumer, mutate the producer (hard-wire arg to default), or the wiring goes unguarded despite good unit tests

### Determinism & Re-baselining
Unlike jt9-1 (which moved only one promotion by one wake with no pin movement), this story makes a real behaviour reachable in play, so expect a determinism re-baseline. Re-find every moved pin by sweeping for its own precondition, never by nudging a number toward the new output.

### Frame-Boundary Deviation to Re-assess
**jt9-1 logged**: `lastRanKind` (the port's `PPREV` channel) is re-initialised per `stepFrame`, while the ROM's PPREV is persistent RAM that carries across frames (RAMDEF.SRC:240). Currently unobservable because `insertTroll` guarantees an enemy follows the troll, but widening the set of processes that read PPREV may make it observable — re-assess during this story.

## Scope
- In scope: wiring the lava-troll looker into the three SMART brains (BOUNDR, B2UNDR, SHADOW)
- In scope: any determinism re-baselining caused by making the looker reachable
- In scope: re-assessing the frame-boundary deviation for lastRanKind/PPREV persistence
- Out of scope: rebuilding already-shipped components (plavt, lavaTrollLooker, PPREV channel, insertTroll)

## Acceptance Criteria
_No acceptance criteria recorded in the sprint YAML — TEA to define during the RED phase._
_Guidance: define ACs that verify each of the three brain lookers (BOUNDR, B2UNDR, SHADOW) fires correctly when its preconditions are met, following the discipline from jt9-1's session archive._

---
_Generated by `pf context create story jt9-29` from the sprint YAML._
