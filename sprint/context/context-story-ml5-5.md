# Story ml5-5: COUNT3 new-head speed ramp + the 10k-boundary SCORE2 carry

## Background

**Deferral History:**
This story was identified during ml5-1 (waves + scoring core) as a deferred finding and routed forward. It was again deferred by ml5-2 (bonus life + lives + SELECT starting score) with routing findings. This story now implements the COUNT3 speed ramp tied to score boundaries, which affects new-head spawn timing based on the 10k-point milestone behavior in the original ROM.

**Scope & Context:**
The work extends `plugins/millipede/src/core/score.ts`, which contains the pure accumulator logic for scoring. The current code at `score.ts:44-45` carries a deferral note: "The COUNT3 new-head speed ramp (:1062-1069) is still deferred — this is the pure accumulator." This deferral note must be updated or removed as part of implementing this story.

The implementation lives alongside `awardScore` (the accumulator) and neighbors `bonus.ts::awardBonus` (from ml5-2). This new logic runs when a 10k-point boundary carry-out occurs in the score accumulation path.

**Purity Constraint:**
`score.ts` is part of the pure core simulation (scanned by the sim-clock-free / core-boundary purity test). It must remain free of:
- Date/time APIs
- Rendering APIs
- Shell imports (I/O, audio, rendering)
- Any non-deterministic side effects

## VERIFIED ROM ANCHOR

**Quarry:** `reference/original-source/millipede/MLSUB.MAC`

**SCORNG routine at MLSUB.MAC:1049 onward**
**COUNT3 ramp + SCORE2 carry block: MLSUB.MAC:1061-1075**

```
:1061  BCC 15$              # On adding PTS to SCORE1, skip this block UNLESS
                            # a carry propagates out of SCORE1
                            # (i.e., a 10,000-point boundary was crossed)

:1062  LDA OPTNS1           # Load difficulty options
       LSR                  # Shift: difficulty bit → carry

:1063  BCS 10$              # Branch if HARD (carry set)
                            # EASY path: fall through

:1064  CMP I,31             # Compare COUNT3 with 31
       BCC 12$              # If COUNT3 < 31, skip to 12$ (floor, no decrement)

:1065  10$: SBC I,2         # Subtract 2 from COUNT3
       STA X,COUNT3         # "INCREASE FREQUENCY OF NEW HEADS" (HARD or EASY)

:1069  12$: SED              # Set BCD mode (decimal)
       LDA X,SCORE2         # Load SCORE2 (10,000s digit-pair)
       ADC I,1              # Add 1 (binary mode reads as BCD increment)
       STA X,SCORE2         # Store updated SCORE2
       CLD                  # Clear BCD mode
```

**Constants Referenced:**
- `OPTNS1` (MLDEF.MAC:36): DIP/option register, bit position for HARD/EASY difficulty
- `COUNT3` (MLDEF.MAC:33): New-head spawn timer register
- `SCORE2` (MLDEF.MAC:29): 10,000s BCD digit-pair (high byte of score)

**Behavior Summary:**
1. On every 10,000-point boundary crossing (detected via carry out of SCORE1):
   - Read the difficulty bit from OPTNS1 (via LSR to carry)
   - **HARD:** Decrement COUNT3 by 2 (no floor)
   - **EASY:** Decrement COUNT3 by 2 only if COUNT3 ≥ 31; otherwise stay at 31 (floor = 31 = 3/8 seconds)
   - Increment SCORE2 by 1 (in BCD, via SED/ADC/CLD)

## CRITICAL DISAMBIGUATION ⚠️

**There is ALREADY a different COUNT3 ramp in the codebase — do not conflate them.**

In `plugins/millipede/src/core/millipede.ts` (around lines 331-350), there exists a **spawn-timer ramp** applied every time a new head spawns:
- **Constant:** `COUNT3_FLOOR = 0x60` (MT-32, MLSUB.MAC:809)
- **Step:** `COUNT3_STEP = 0x08` (MT-31, MLSUB.MAC:811)
- **Mechanism:** Decrements COUNT3 on spawn, clamped to a floor, speeding up new-head generation as the wave progresses

**This story (ml5-5) is NOT that spawn-timer ramp.**

ml5-5 implements the **score-boundary COUNT3 decrement (MLSUB.MAC:1061-1075):**
- Triggers: Every 10,000 points (not on spawn)
- Decrement: 2 per boundary (not 8 per spawn)
- Floor: 31 on EASY, no floor on HARD (not clamped to 0x60)
- Difficulty-gated: Yes (OPTNS1 LSR)

**TEA and Dev must NOT touch the spawn-timer ramp (lines 331-350). This story only extends the score accumulator.**

## Acceptance Criteria

**AC1: 10,000-Point Boundary Gate**
The COUNT3 decrement and SCORE2 increment trigger ONLY when the score crosses a 10,000-point boundary (i.e., when SCORE1 carry propagates). Mid-band score additions must not trigger this logic.

**AC2: HARD Difficulty Path**
When difficulty = HARD (OPTNS1 LSR → carry set):
- COUNT3 decrements by 2 per 10k-boundary crossing
- No floor (COUNT3 can decrement without limit)
- Measured in isolation: apply a 10k crossing with difficulty=HARD, verify COUNT3 reduced by exactly 2

**AC3: EASY Difficulty Path — Decrement**
When difficulty = EASY (OPTNS1 LSR → carry clear) and COUNT3 ≥ 31:
- COUNT3 decrements by 2 per 10k-boundary crossing
- Measured in isolation: apply a 10k crossing with difficulty=EASY and COUNT3=50, verify COUNT3=48

**AC4: EASY Difficulty Path — Floor**
When difficulty = EASY and COUNT3 < 31:
- COUNT3 does NOT decrement; remains at or above 31 (floor = 31 = 3/8 seconds)
- Measured in isolation: apply a 10k crossing with difficulty=EASY and COUNT3=30, verify COUNT3 stays at 30 (or ≥ 31 if already ≥ 31)

**AC5: SCORE2 Increment on Boundary**
On every 10,000-point boundary crossing (regardless of difficulty):
- SCORE2 (10,000s BCD digit-pair) increments by 1
- Measured independently: verify score-internal representation reflects the carry propagation (e.g., score transitions from 9,999 to 10,000 → SCORE2 increments)

**AC6: Purity Constraint**
The implementation in `score.ts` remains pure core:
- No Date/time APIs
- No rendering or I/O
- No imports from `shell/`
- Deterministic (seeded RNG if needed; none expected here)
- Passes the sim-clock-free purity test

**AC7: Deferral Note Resolution**
The deferral note at `score.ts:44-45` ("The COUNT3 new-head speed ramp (:1062-1069) is still deferred...") is updated to reflect that this feature is now implemented, or removed if no longer needed.

## Implementation Notes

- **Placement:** Extend the `awardScore` function or create a dedicated handler that runs after SCORE1 accumulation detects a carry.
- **Output Shape:** Dev's call — the spec defines the behavior (COUNT3 and SCORE2 updates), not the function signature. Ensure the core state (GameState or equivalent) is updated correctly.
- **No Conflation:** Verify that existing spawn-timer logic (lines 331-350, COUNT3_FLOOR/COUNT3_STEP) is NOT modified or disabled by this work.
