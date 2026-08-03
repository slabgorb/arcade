# Story jt9-3 Context

## Title
Pin the three wing-cue invariants jt5-3 shipped unguarded

## Metadata
- **Story ID:** jt9-3
- **Type:** chore
- **Points:** 3
- **Priority:** p3
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Joust — the remainder, re-ordered: apparatus, gameplay, geometry, brains, dossier

## Problem

jt5-3's Reviewer ran a 24-mutation battery testing the wing-cue emission logic. Three of the mutations reddened ZERO of the 1979 tests at that time (current suite: 2499 tests). This indicates three behaviours the story deliberately chose are held in place by prose alone — no test guards them. The code is CORRECT, but unguarded. This story pins each behaviour with a test that verifies it by mutation: the test forbids a specific change, the mutation makes that change, the test reddens, the mutation is reverted.

## Verification Notes (Setup Measurement)

**Three invariants identified by jt5-3:**

1. **The pre-step `wasAirborne` read** — `plugins/joust/src/core/frame.ts:321`
   - **Current line number verified:** Line 321 contains `const wasAirborne = p.entity.airborne`
   - **Behaviour:** Reading the airborne state BEFORE the step (before `stepPlayerEntity` at line 329), not after
   - **Mutation test:** Changing the read to AFTER the step diverges the wing-cue stream: over 3000 frames at seed 0xbeef, count goes 1610 → 1609, with player-wing-up vanishing at frames 633 and 1732
   - **Guard strategy:** Stage a frame where the entity becomes airborne mid-step and assert which wing cue is emitted

2. **GameState.cues is never accumulated** — `plugins/joust/src/core/frame.ts:163-169`
   - **Current comment verified:** Lines 163-171 document that cues is "REBUILT from scratch every step, never accumulated (`stepFrame` never READS `state.cues`, only builds a fresh one)"
   - **Behaviour:** A fresh array is created each frame; the field is never read by stepFrame itself
   - **Mutation test:** Mutating stepFrame to accumulate cues instead of rebuilding reddens 0 tests (unguarded)
   - **Guard strategy:** Assert that `stepFrame` returns a fresh array per frame, not a mutated reference

3. **stepDemo emits flight cues before collision cues** — `plugins/joust/src/core/demo.ts` (story cited line 1109; actual location is lines 1272-1275)
   - **Current documentation verified:** Lines 1272-1275 document the order: `const cues: GameEvent[] = [...stepped.cues, ...collided.cues]` with comment "wing edges frame.ts's stepFrame detected… come FIRST: they belong to the flight-stepping phase, which runs before collisionPass ever sees this frame's processes"
   - **Behaviour:** Flight cues (from frame.ts stepping) are prepended to the stream; collision cues follow
   - **Mutation test:** Flipping the order reddens 0 tests (unguarded)
   - **Guard strategy:** Assert the relative order in a frame that produces both types of cue

**Line drift note:** The story description cited line 1109 for the third invariant. This line exists but refers to egg-catch narrowPhase logic. The actual invariant about flight-before-collision order is documented at lines 1272-1275. Line numbers have shifted since the story was filed (2026-08-01).

**Test count growth:** The story's mutation battery ran against 1979 joust tests. The current suite (at setup, 2026-08-03) contains 2499 tests — a 26% growth in 2 days (jt9-2 completed 2026-08-03, prior to this setup). This means the "0/1979" figure is a 2026-08-01 measurement; fresh mutations should be re-run against the current count to confirm the still-zero baseline.

**Audio seam pattern (memory, highly relevant):** Project memory notes "audio seam suites cannot see emitters" — the three-file audio seam's sweeps all read the same EVENT_KINDS tuple, so multiple cues could be deleted fully green if the test suite only reads a shared tuple. This is the exact same trap jt5-1 shipped in. A new guard must be VERIFIED BY MUTATION: make the forbidden change, watch it redden, revert. A test that survives a permissive mutant (one that cannot fail) proves nothing.

## Technical Approach

Each of the three invariants requires a mutation-verified test gate, following the discipline described in project memory "mutation DIRECTION must be restrictive":

1. **Wing-cue timing test** (frame.ts:321)
   - Create a test fixture where an entity transitions from grounded to airborne mid-step
   - Assert the specific wing cue emitted reflects the PRE-STEP airborne state
   - Mutation: Change frame.ts:321 to read `p.entity.airborne` AFTER line 329's `stepPlayerEntity`
   - Verify the mutation reddens this test

2. **Cues freshness test** (frame.ts:163-169)
   - Call `stepFrame` twice with the same inputs on the same state
   - Assert that the returned `cues` arrays are fresh instances (not shared or accumulated)
   - Mutation: Modify `stepFrame` to accumulate cues instead of rebuilding (`state.cues.push(...newCues)`)
   - Verify the mutation reddens this test

3. **Cue ordering test** (demo.ts:1272-1275)
   - Create a frame where both a flight cue (wing edge from stepping) and a collision cue (e.g., from a resolved joust) are emitted
   - Assert flight cues appear before collision cues in the returned `cues` array
   - Mutation: Swap the order in `const cues: GameEvent[] = [...collided.cues, ...stepped.cues]`
   - Verify the mutation reddens this test

**Test location:** All three tests belong in `plugins/joust/tests/wing-cues.test.ts` (new file, mirrors the three-invariant scope). Alternatively, distribute across existing test files if that follows the suite's patterns.

**Mutation verification discipline (critical):**
- Do NOT merge or commit any test that has not been verified to redden under its corresponding mutation
- Do NOT use permissive mutations (e.g., setting a boolean to always-true) — they cannot fail a `.toBe(true)` assertion
- After the test turns red, revert the mutation immediately and verify the test turns green again
- Record in the test comments which mutation it guards against

## Scope
- In scope: Write three tests, one for each unguarded invariant; verify each by mutation
- In scope: Update any test organization if needed to place guards in the right files
- Out of scope: Change production code for jt5-3's behaviour (it is correct); only add guards

## Acceptance Criteria (Derived from Story + Setup Verification)

1. **Test coverage for wing-cue timing:** A test asserts that `stepFrame` reads the airborne state BEFORE stepping. The test fails if the read is moved to after the step. Measured at setup: this behaviour is currently unguarded by any test.

2. **Test coverage for cues freshness:** A test asserts that `stepFrame` returns a fresh `cues` array per frame, never accumulated. The test fails if `stepFrame` is mutated to accumulate cues instead of rebuilding. Measured at setup: this behaviour is currently unguarded.

3. **Test coverage for cue ordering:** A test asserts the relative order of flight cues and collision cues — flight first, collision second. The test fails if the order is flipped in `stepDemo`. Measured at setup: this behaviour is currently unguarded.

4. **Mutation verification completed for all three:** Each test is committed ONLY after being verified to redden under its corresponding mutation. The mutation is then reverted and the test confirmed green again.

5. **joust test suite remains green and grows or holds:** `npx vitest run --project joust` passes before and after. No existing tests regress. The test count should not drop (these are additions, not removals).

6. **No production code changes.** This is a guard-addition-only story. jt5-3's behaviour is correct; it is unguarded.

---

_Context file created at setup by sm-setup on 2026-08-03 to document invariant locations and mutation verification discipline._
