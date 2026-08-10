# Story mc6-5 Context

## Title
Attract presentation: scrolling attract messages + THE END screen, rendered in shell, plus the high-score display slot mc7 fills with the ladder. Pin the ROM message strings + cadence at RED. REV-01 W3MAIN.MAC:891 / 5277 / 5331 attract

## Metadata
- **Story ID:** mc6-5
- **Type:** story
- **Points:** 3
- **Priority:** p3
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Missile Command — attract + state machine + pause (REV-01): the full MAINLINE attract/setup/play/pause loop

## Background (SM-Verified Facts)

This is the PRESENTATION/render layer. The `'attract'` phase already exists in state.ts (Phase union); prior stories (mc6-1/6-2/6-3/6-4/6-6) are DONE and the state machine is complete. This story renders the attract screen in the shell.

### ROM Citation Anchors (W3MAIN.MAC, REV-01 035820-01)

Message flow routing:
- **:5277** — `REFRESH ATTRACT MODE MESSAGES` (routine REFRESH) — the refresh cadence that drives message display
- **:5331** — `SCROLL ATTRACT MESSAGES ACROSS SCREEN` (routine SCROLL) — the scrolling behavior
- **:891** — `SMART CURSOR MOVER (ATTRACT)` — this is mc6-4's self-playing demo routine; NOT the message code. Messages anchor to 5277/5331 only.

**TEA responsibility:** Message-string data tables are referenced BY the REFRESH routine (starting at :5277); TEA must locate the exact string tables in W3MAIN.MAC before pinning them at RED. The "THE END" literal was not found near these cites — TEA must locate the exact game-over/THE END string in the ROM source before pinning it as a cited constant.

### High-Score Slot

The high-score **DISPLAY SLOT** this story creates is the container that story mc7-4 later FILLS with the 5-rung ladder. The seeded default ladder (7500 best → 6950 lowest) ALREADY EXISTS in core (core/highscore.ts `DEFAULT_HIGH_SCORES`, landed by mc7-1, pinned in tests/highscore.test.ts). **This story provides the slot/screen; it does NOT re-seed or re-pin the ladder values.** The current shell render (plugins/missile-command/src/shell/render.ts:281) draws only the ladder BEST as a HUD figure — there is no attract high-score SCREEN yet.

### Boundary Rule (Single Most Important Rule)

- `src/core/` = pure deterministic sim (no clock, seeded RNG only)
- `src/shell/` = render/audio/input/storage
- Message rendering is SHELL-side (src/shell/render.ts or similar)
- Any new src/core constants (e.g., cadence timings if they live in core) carry a claim gated by citations.test.ts
- `purity.test.ts` and the core-boundary scan must stay green

### Fidelity Notes

Ground truth is REV-01 (035820-01). Note any REV-01 <-> REV-03 attract/timing delta in claim notes if relevant.

## Problem
Render the attract mode presentation layer (messages + THE END screen) in the shell, and expose the high-score display slot that mc7-4 will fill with the ladder.

## Technical Approach

1. **Locate ROM message strings and cadence:** TEA scans W3MAIN.MAC around :5277 (REFRESH) and :5331 (SCROLL) to find the exact message-string data tables and cadence constants. Pin these at RED with citations. Locate the exact "THE END" string and its cadence.

2. **Render scrolling messages in shell:** Implement the attract message scroll in `src/shell/render.ts` or similar, sourcing strings and timings from the pinned ROM constants. Keep logic pure (state-driven, no clock calls); no RNG or clock in the render path.

3. **Render THE END screen:** Display the "THE END" screen at the appropriate point in the attract sequence (TEA defines the exact state/cadence).

4. **Define high-score slot:** Add a reserved region on the attract screen (layout/positioning) that mc7-4 can fill with the ladder render. Do not render the full ladder here — leave that to mc7-4. The slot should accommodate the 5-rung structure already seeded in core/highscore.ts.

5. **Verify core boundary:** Ensure `purity.test.ts` and the core-boundary scan stay green. Any new src/core constants carry a citations-gated claim.

## Scope
- In scope: scrolling attract messages (shell render), THE END screen, high-score display slot (layout/container), ROM cite pinning
- Out of scope: ladder rendering (mc7-4), default ladder values (already in core), authentic audio wiring, palette/stamps/blast curve

## Acceptance Criteria

**AC1:** During the `'attract'` phase, the shell renders scrolling attract messages with ROM message strings and scroll cadence pinned at RED with citations to W3MAIN.MAC :5277 (REFRESH) and :5331 (SCROLL). Message-string data tables are located in the ROM source and documented in code comments with cite references.

**AC2:** A "THE END" screen is rendered to the shell at the appropriate point in the attract sequence. The exact "THE END" string is located in W3MAIN.MAC, pinned at RED with a ROM cite, and its display cadence is documented.

**AC3:** The attract screen includes a high-score display region/slot (layout/positioning defined) that accepts a ladder data structure for mc7-4 to fill. The slot layout accommodates the 5-rung default structure already seeded in core/highscore.ts DEFAULT_HIGH_SCORES. The slot is not populated with a ladder in this story — that is mc7-4's responsibility.

**AC4:** No changes to the default high-score ladder values (DEFAULT_HIGH_SCORES in core/highscore.ts). Ladder seeding, values, and rendering remain the responsibility of mc7-1 and mc7-4.

**AC5:** The core boundary remains clean: message rendering logic uses no clock calls and no seeded RNG; purity.test.ts and the core-boundary scan remain green.

**AC6:** Any new src/core constants related to the attract flow (e.g., message cadence timings if they live in core) carry a claim gated by citations.test.ts with ROM cite references.

---
_Generated by `pf context create story mc6-5` from the sprint YAML._
