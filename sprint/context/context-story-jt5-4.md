# Story jt5-4 Context

## Title
The THUDs — apply the bounce collisionPass computes and discards, then cue it

## Metadata
- **Story ID:** jt5-4
- **Type:** story
- **Points:** 5
- **Priority:** p3
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Joust audio — the sound subsystem joust shipped without

## Problem
Two ROM cues are blocked on physics the sim computes and throws away. SNPTHD (:8124, 'AT LEAST 1 PERSON THUD''ED', call site :5014 'PLAYERS COLIDE') and SNETHD (:8106, 'ENEMIES THUD', call site :5019 'ENEMIES COLIDE'). collisionPass computes the bounce outcome and DISCARDS it — 'if (contact.outcome.kind !== "kill") continue' (plugins/joust/src/core/demo.ts, the joust pair loop) — and bounceTop, bounceBottom and bounceHorizontal in joust.ts have ZERO production callers. So a non-killing collision currently does nothing at all: no push, no separation, no sound. The work is APPLYING the bounce first; the cue is the easy half and must not land without it, because a thud announcing a collision the sim does not resolve is an audible lie. Same disease as uf1-11's troll grip one layer over: a faithful, tested, cited pure core with no caller.

## Acceptance Criteria

**DERIVED — no upstream acceptance_criteria in sprint YAML; these are SM-authored proposals for TEA to challenge and refine.**

1. **Apply the bounce outcome:** `resolveContacts` computes `outcome.kind === 'bounce'` but currently discards it. The core must apply the bounce physics — using `bounceTop`, `bounceBottom`, or `bounceHorizontal` from `joust.ts` — to separate the two entities' velocities before returning.

2. **Emit SNETHD for enemy-vs-enemy collision:** When two enemies collide (`contact.outcome.kind === 'bounce'` AND both party === 'enemy'), emit the `enemy-thud` event kind so `audio-dispatch.ts` can map it to the SNETHD cue.

3. **Emit SNPTHD for player-height-tie collision:** When two players collide at the same height (`ha === hb` AND `contact.outcome.kind === 'bounce'`), emit the `player-thud` event kind so `audio-dispatch.ts` can map it to the SNPTHD cue.

4. **Cue lands WITH the bounce, not after:** The thud event must be emitted in the same frame as the bounce is applied, in the collision-detection phase (demo.ts:986-994 / demo.ts:867), before the entity moves away.

5. **Remove thud entries from the deferred array:** After this story, remove `'player-thud'`, `'enemy-thud'`, and `'thud'` from the `audio-events.test.ts` deferred array (leaving only `'troll-grab'` for uf1-10/uf1-11).

6. **Tests verify exact cue order and moment:** Stage scenarios that produce non-killing collisions; assert that the exact cue stream is emitted (not just `toContain`); assert the collision-and-thud frame has the cue BEFORE any flight-cue changes (flight before collision, per jt5-11).

7. **Determinism digests must be re-baselined:** Applying the bounce moves entity velocities, so any jt2 seeded-replay script that produces a non-killing contact will diverge. Re-baseline the determinism digests; this is expected and load-bearing.

## Branch Map — ROM Collision Routing

**CRITICAL FOR IMPLEMENTATION:** The ROM has TWO separate thud paths with different continuations.

**Path 1 — SNETHD (enemy-vs-enemy or ptero-vs-ptero):**
- Condition: `JOUSTRV4.SRC:4960-4961` — `BITA #$04 / BNE OSTHT2` (enemies cannot kill each other)
- Cue emitted at `:5020 JSR VSND` → SNETHD
- Continuation: `:5028 OSTH11 JSR OSTBMP` — the bump routine (applies separation/velocity change)

**Path 2 — SNPTHD (player-height-tie):**
- Condition: `JOUSTRV4.SRC:5010 BEQ 1$` — both players at same height, nobody can kill
- Cue emitted at `:5015 JSR VSND` → SNPTHD
- Continuation: `:5016 LDX COLOBJ / :5017 BRA OSTXTT` — a **DIFFERENT continuation than SNETHD**

**AC5 ASYMMETRY:** The two paths do NOT share a continuation. Whether the player-involved tie bumps (applies velocity change) at all is OPEN. TEA must read `JOUSTRV4.SRC` to settle this from the machine, because "apply the bounce first" may mean two different things for the two cases.

## CUE_SOURCES Table

| Cue Kind | ROM Symbol | File:Line | Priority | Mechanism |
|----------|-----------|-----------|----------|-----------|
| `enemy-thud` | SNETHD | JOUSTRV4.SRC:8106 | 009 | Enemies collide (enemy-vs-enemy, ptero-vs-ptero) |
| `player-thud` | SNPTHD | JOUSTRV4.SRC:8124 | 020 | Players collide at same height |
| `thud` | *(same code $08)* | *(same cue)* | *(shared)* | Generic thud (both map to ROM $08) |

**Note:** jt5-5 owns priority arbitration (MEDIUM finding from jt5-3). Record both priorities here; do NOT implement arbitration in this story.

## Four Hazards

**HAZARD A — CUE LANDS WITH THE BOUNCE, NEVER AFTER:**
"a thud announcing a collision the sim does not resolve is an audible lie" (story description). Applying the bounce is the work; the cue is the easy half. An implementation that emits the thud while the birds still pass through has failed, even with green tests. The cue MUST land in the same frame as the velocity change.

**HAZARD B — THE GUARD WILL GO RED (EXPECTED):**
`audio-events.test.ts` holds `deferred = ['player-thud', 'enemy-thud', 'thud', 'troll-grab']`. After this story, the first three must be REMOVED (not renamed). A Dev who renames them to dodge the guard would satisfy the test and fail the story.

**HAZARD C — THE SEAM SUITE CANNOT SEE EMITTERS:**
The three sweeps (manifest, dispatch, coverage) all read the same `EVENT_KINDS`, so they agree with each other whether anything fires. jt5-3 beat this by staging the exact moment, asserting EXACT cue streams (not `toContain`), and asserting the frame BEFORE is clean. Reviewer deleted each emitter and got 13/5/5/1 reds. Do the same. A test that finds the kind in the manifest proves nothing.

**HAZARD D — APPLYING BOUNCE MOVES VELOCITIES, RE-BASELINES jt2 FINGERPRINTS:**
Today non-killing collisions are inert. After this story, they push birds apart. Any jt2 seeded-replay script producing a non-killing contact diverges from recorded digests. Re-baseline digests; treat that as the main risk. Make TEA decide up front which pins are legitimately re-baselined versus masking a real regression.

## Related Stories (Already Filed)

- **jt5-11** owns three unguarded wing-cue invariants. This story touches demo.ts:1109 (cue order); jt5-11 will pin the relative ordering.
- **jt5-5** owns sound priority arbitration (SNPTHD priority 020, SNETHD priority 009). Record in `CUE_SOURCES` here; do NOT implement arbitration.

## Premises Verified in Tree

✓ `demo.ts:867` reads exactly `if (contact.outcome.kind !== 'kill') continue`
✓ `resolveContacts` (demo.ts:986-994) computes bounce but applies nothing
✓ `bounceTop` (joust.ts:229), `bounceBottom` (joust.ts:242), `bounceHorizontal` (joust.ts:256) have ZERO production callers
✓ `JOUSTRV4.SRC:8124` — SNPTHD / `:8106` — SNETHD both verified
✓ Both cues sit at call sites `:5014` (SNPTHD) and `:5019` (SNETHD)

---
_Generated by `pf context create story jt5-4` from the sprint YAML, then SM-enhanced with branch map, hazards, and implementation notes._
