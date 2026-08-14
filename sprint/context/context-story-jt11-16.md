# Context: jt11-16 — Wire Title Cabinet Mode

## Story Title
Boot drops into the attract self-play demo and never shows the MARQUE/logo title screen -- wire the present-but-unreachable title cabinet mode

## Overview
The cabinet launches into attract (demo self-play) instead of showing the Joust logo/title first. The title machinery is complete across all three tiers (core data, shell layout, render) but reachable only from tests. The missing link is a transition that sets `cabinet.mode === 'title'` at boot.

## Acceptance Criteria (Derived)

### A1: Verify ROM AMODE/MARQUE Ordering (Blocking Research)
- **Requirement:** Determine the authentic Joust cabinet attract sequence from the ROM (AMODE / MARQUE ordering in JOUSTRV4.SRC).
- **Why:** The story offers two implementation approaches:
  - **Approach (1):** Boot into title with a dwell, then handoff to attract (shell-only; edits main.ts:382 plus title branch near main.ts:564-575)
  - **Approach (2):** Add title as an attract PAGE_ORDER page (edits core attract-scheduler.ts; subject to core/shell purity guard)
  - Which approach is faithful depends entirely on the original cabinet's AMODE/MARQUE sequence.
- **Success Criterion:** RED phase must document the ROM sequence with line citation; the chosen approach must cite this finding.

### A2: Wire Title Mode Entry
- **Requirement:** Implement the ROM-verified approach to transition boot into title mode (not directly attract).
- **Success Criterion:**
  - Cabinet.mode transitions to 'title' at boot (before attract).
  - Title displays with `renderTitleScreen()` (already dispatched at main.ts:609,612; no new render code needed).
  - Title automatically transitions to attract after a dwell period (ROM: AMODE's 256 x PCNAP 30, TB12REV1.SRC:77-78 = 7680 ticks).

### A3: Wire Start-Input Door from Title
- **Requirement:** Accept start input (Digit1/Digit2 or Numpad1/Numpad2) while on title mode to route to the select screen.
- **Note:** Shares the start-input logic with jt11-17 (see Sequencing below).
- **Success Criterion:** Pressing a start key transitions from title to select screen (cabinet.ts:90-92 -> enterPlaying path).

### A4: Retire Deferral Comment
- **Requirement:** Remove the self-admitted deferral comment at main.ts:277-280 ("`toTitle` has no caller ... wiring title into the attract cycle is deferred").
- **Success Criterion:** Comment removed; the story itself completes the deferral.

### A5: Verify No New Render Code
- **Requirement:** Confirm that `renderTitleScreen()` is already dispatched by the render switch and requires no additional wiring.
- **Evidence (verified against HEAD 2026-08-14):** main.ts:609,612 dispatch title mode: `else if (cabinet.mode === 'title')` → `renderTitleScreen()`.
- **Success Criterion:** Build and visual inspection on `/joust/` confirm title displays correctly.

## Technical Approach

### Phase 1: RED (TEA)

**Critical First Task:** Verify ROM AMODE/MARQUE ordering.
- Search JOUSTRV4.SRC for AMODE and MARQUE.
- Document the attract sequence (which page runs first, which transitions to which).
- Cite the exact line numbers and context.
- Determine which approach (1 or 2) matches the authentic sequence.

**Write Failing Tests:**
1. Boot mode transitions to 'title' (not 'attract') on first frame.
2. Cabinet remains in title mode for the correct dwell duration (7680 ticks = 256 x 30).
3. After dwell, cabinet transitions to attract (cabinet.mode === 'attract').
4. Pressing Digit1/Digit2 while in title mode routes to select screen (cabinet.mode === 'select').
5. Test the render switch dispatches `renderTitleScreen()` when cabinet.mode === 'title'.

**Line Cites (from verified correction block, current as of HEAD 2026-08-14):**
- Boot hardwires attract: `plugins/joust/src/main.ts:382` → `let cabinet: CabinetState = { mode: 'attract', ... }`
- Deferral comment: `plugins/joust/src/main.ts:277-280`
- `toTitle` definition: `plugins/joust/src/core/cabinet.ts:84-86`
- `'title'` in CabinetMode union: `plugins/joust/src/core/cabinet.ts:48`
- Render dispatch: `plugins/joust/src/main.ts:609,612`
- Render function: `plugins/joust/src/main.ts:287-303,311-318`

### Phase 2: GREEN (Dev)

**Approach Decision (ROM-dependent):**
- If ROM AMODE sequence boots title-first: implement Approach (1)
  - Edit `plugins/joust/src/main.ts:382` to set `mode: 'title'` instead of `mode: 'attract'`
  - Add a title-dwell state with auto-transition to attract (main.ts near 382 + new logic in main frame loop)
  - Add start-input handling in title mode near main.ts:564-575 (shared with jt11-17)
  - Retire comment at main.ts:277-280
- If ROM AMODE sequence includes title as an attract page: implement Approach (2)
  - Edit `plugins/joust/src/core/attract-scheduler.ts` (core file; subject to purity guard)
  - Add 'title' to PAGE_ORDER
  - Wire title render dispatch in renderAttract (main.ts:349-360)
  - Retire comment at main.ts:277-280

**Sequencing Note:**
- This story shares the start-input door near `main.ts:564-575` with **jt11-17** (which routes the pressed count into `startPlaying`).
- **DO NOT run jt11-16 and jt11-17 in parallel checkouts.** Coordinate sequencing: complete jt11-16 first, merge, then start jt11-17.

### Phase 3: Review
- Verify ROM citations in the chosen approach.
- Confirm title displays correctly on `/joust/` with visual inspection.
- Ensure start-input routing from title to select works correctly.
- Confirm all tests pass, including seeded-replay fixtures (if any player-movement paths changed).

## Dependencies & Sequencing

**Blocking Coordination:**
- **jt11-17** ("Attract CTA PRESS 1 OR 2 TO START routes to a select screen...") also edits the main.ts start-input door (main.ts:564-575).
- These two stories must be **sequenced, not parallelized:**
  1. Complete jt11-16 (title mode wiring).
  2. Merge jt11-16.
  3. Start jt11-17 against the merged state.

**No dependencies on prior stories** for this story itself (title machinery is complete and tested). However, this story enables the full attract→title→select→play flow that downstream stories may depend on.

## Verified Corrections (checked against HEAD 2026-08-14)

- **Boot hardwires attract:** main.ts:382 ✓
- **Deferral comment:** main.ts:277-280 ✓
- **toTitle definition:** cabinet.ts:84-86 ✓
- **'title' in CabinetMode union:** cabinet.ts:48 ✓
- **Render dispatch:** main.ts:609,612 ✓
- **PATH CORRECTIONS:**
  - `main.ts` → `plugins/joust/src/main.ts` (shell entry, directly under src/, NOT src/shell/)
  - `attract-scheduler.ts` → `plugins/joust/src/core/attract-scheduler.ts` (core file; matters for approach choice)

## Story Type & Effort
- **Type:** Bug (present-but-unwired)
- **Points:** 3
- **Priority:** P1
- **Workflow:** TDD (RED → GREEN → review)
