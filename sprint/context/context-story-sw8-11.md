# Story sw8-11 Context

## Title
Space phase END is TIME-boxed in the ROM, not kill-quota'd — PHESP1 advances to PH$SP2 on the PH.TIM music schedule (theme→theme B→descent→'GO AHEAD AND DESCEND', WSMAIN.MAC:1420-1448) with an endless TIE supply; our SPACE_WAVE_QUOTA=6 kill gate (state.ts:882, self-described 'chosen to play right… until deeper reverse-engineering recovers the real numbers') is that unrecovered number. Rule the divergence and port or ratify

## Metadata
- **Story ID:** sw8-11
- **Type:** bug
- **Points:** 3
- **Priority:** p3
- **Workflow:** tdd
- **Repo:** star-wars
- **Epic:** Cabinet feel: the flight and combat loop — render/experiential fidelity vs the cabinet longplay

## Problem

The space phase end condition diverges from the ROM. The cabinet uses a **time-boxed schedule** driven by the music (PH.TIM counter): PHESP1 advances to PH$SP2 after the music sequence completes (theme → theme B → descent → 'GO AHEAD AND DESCEND'), with an **endless TIE supply** during this time. Our implementation uses a **kill-quota mechanism** (SPACE_WAVE_QUOTA=6 TIEs), which is a "chosen to play right… until deeper reverse-engineering recovers the real numbers" divergence (self-described in the code comment at state.ts:881).

**This story is a "rule-the-divergence" story**, not a straight bug fix. The outcome is either:
1. Port the ROM's time-boxed music-schedule approach, OR
2. Formally ratify and document the kill-quota divergence as intentional design.

## ROM Source (Rule the Divergence)

**File:** `WSMAIN.MAC` lines 1420–1448  
**Context:** PHESP1 (space phase loop)

The ROM maintains a PH.TIM counter (lines 1415–1417) and checks milestone times:
- At PH.TIM = 2×20 frames (line 1418): theme music plays
- At PH.TIM = 2+7+1×20 (line 1433): theme B follows
- At PH.TIM = 2+7+1+9+1×20 (line 1437): descent music plays
- At PH.TIM ≥ 2+7+1+9+1+1×20 (line 1441): **LDA #PH$SP2 / STA PHASE** — advance to surface phase (line 1443–1444)

During the entire space phase (lines 1450–1454), the ROM refills the three alien slots unconditionally: every frame, if `WV.LIV < 3`, it calls `ADASHP` to spawn the next TSPWAV entry. **There is no kill quota; the phase times out on music schedule.**

**Source location:** `/Users/slabgorb/Projects/star-wars-1983-source-text/WSMAIN.MAC` (searchable copy of the 1983 source)

## Clone Implementation (Current Divergence)

**File:** `star-wars/src/core/state.ts` lines 875–884  
**Current code:**

```typescript
// A run escalates through the three phases in order (space -> surface ->
// trench); a phase is "cleared" when the player destroys its kill quota, at
// which point the run drops into the next phase. Authentic-FEEL like the Wave
// 1/2 constants: StarWars.asm carries no symbolic wave tables, so these are
// chosen to play right and single-sourced here for easy correction once deeper
// reverse-engineering recovers the real numbers.

/** TIEs to destroy to clear the space phase and dive to the Death Star surface. */
export const SPACE_WAVE_QUOTA = 6
```

**Mechanism:** The space phase ends when the player destroys `SPACE_WAVE_QUOTA` TIEs (checked in `sim.ts` during phase logic). This is NOT ROM-authentic but is kept because no music-schedule timer mechanism exists in the current codebase.

## Predecessor Story Notes

**sw8-7** (`sprint/archive/sw8-7-session.md`) — *TIE spawn cadence + on-screen density*

TEA's findings extracted in sw8-7 (filed this story as sw8-11):
> "the ROM's space phase END is TIME-boxed — PHESP1 advances to PH$SP2 on the PH.TIM music schedule (WSMAIN.MAC:1420-1448), with an endless TIE supply; our `SPACE_WAVE_QUOTA = 6` kill gate is the "unrecovered number" its own comment anticipates (state.ts:875-882)."

The sw8-7 DEV also confirmed that sw8-10 (TIE supply tail loop) becomes latent-but-relevant **if the quota rises or the phase becomes time-boxed** — making this story a prerequisite for sw8-10's full impact.

## Technical Approach

**Rule the divergence (TWO OUTCOMES ALLOWED):**

1. **Port the time-boxed schedule:**
   - Add a PH.TIM counter to `GameState` seeded/re-armed per phase.
   - Track music-schedule milestones (theme/theme-B/descent/GO-AHEAD).
   - Auto-advance PHASE on the final milestone, independent of kills.
   - Outcome: ROM-authentic space phase end; clock-driven, not quota-driven.

2. **Ratify the kill-quota divergence:**
   - Document the divergence formally in a design deviation (DEV session entry).
   - Cite the ROM rule + the play-testing rationale.
   - Update code comment to reflect intentional choice.
   - Outcome: "Authentic-feel" approach explicitly adopted and defended.

## Acceptance Criteria

TEA to define during RED phase. **Must allow both outcomes** (port or ratify). Example criteria:
- AC1: The ruling (ROM vs. current code) is grounded in primary source (WSMAIN.MAC verified).
- AC2: The chosen outcome (port or ratify) is justified with evidence (ROM time measurements, play-test feedback, or fidelity trade-offs).
- AC3: If porting: time-box tests pass; space phase exits on schedule, not kills. If ratifying: a design deviation is logged with reasoning.
- AC4: Predecessor story sw8-10 is re-evaluated for any latent impact (if schedule is ported, TWV2Z tail-loop becomes active).

## Scope
- In scope: the behavior described by the story title (end-phase condition).
- Out of scope: audio playback, render, camera (those are epic sw8 §6 manual QA).

---

**Predecessor Context:** Read `sprint/archive/sw8-7-session.md` for prior TEA/Dev/Reviewer findings on spawn cadence and TIE supply.

_Generated by `pf context create story sw8-11` from the sprint YAML and enriched by sm-setup._

---
_Generated by `pf context create story sw8-11` from the sprint YAML._
