# Story jt11-6 Context

## Title
High-score entry UX: persistence wiring is verified CORRECT (game writes and lobby reads the same joust-high-scores key via shared highScoreKey - highscore.ts:118-120,497,580-588; lobby chain tiles.ts:109 -> storage.ts:42-43 -> readLocalTableRaw; qualify gate afterGameOver cabinet.ts:119-122 wired to the persisted table main.ts:375, pinned by highscore-wiring.test.ts:72-84). The felt bug is the commit gate: nothing saves until exactly 3 initials entered AND FLAP (Space) pressed on a rising edge (main.ts:483-488) - abandoning the entry screen writes nothing. Fix: on-screen instruction on the entry screen (which keys cycle letters, PRESS FLAP TO CONFIRM) + a ROM-style entry timeout that auto-commits the current initials so a walked-away qualifying score still persists. Verify the ROM entry-timeout behavior in JOUSTRV4.SRC before choosing the timeout law - cite it.

## Metadata
- **Story ID:** jt11-6
- **Type:** bug
- **Points:** 2
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Joust — cabinet experience: start flow, HUD, landing physics, transporter cadence, lava shore, high-score UX

## Problem
_No description in the sprint YAML — see the story title above and the epic context for scope._

## Technical Approach
_Approach hints to be refined by TEA/Dev. The story title above defines the
intended behavior._

## Scope
- In scope: the behavior described by the story title.
- Out of scope: unrelated changes.

## ROM Research Notes

**ROM Source:** `/Users/slabgorb/Projects/a-3/reference/williams-source/joust/JOUSTRV4.SRC` (8139 lines)

**Finding:** High-score name entry GAMEND routine is referenced (line 688) but defined as external (EQU.SRC: `GAMEND RMB 3`). Searched JOUSTRV4.SRC for explicit timeout constants for the name entry screen — found MESSAGE PAGE timeout (30 seconds, line 782) and other event timeouts, but NOT an explicit high-score name entry screen timeout in the available source.

**Recommendation:** Locate GAMEND module source or check alternate joust ROM revisions (JOUSTRV1-V3.SRC) before implementing timeout. Document chosen timeout with ROM citation per existing audit standards.

## Acceptance Criteria

### (A) On-screen entry instructions
- Add visible text on the high-score name-entry screen (cabinet mode 'highscore', rendered by renderHighscoreScreen main.ts:232-238)
- Text: instructions on keys that cycle letters and "PRESS FLAP (SPACE) TO CONFIRM"
- Placed legibly without obscuring entry prompt or table rows
- Verify by screenshot with and without entry in progress

### (B) ROM-cited entry timeout that auto-commits initials
- **BLOCKING RESEARCH STEP:** Locate and cite the ROM high-score name entry timeout law
  - Path: `/Users/slabgorb/Projects/a-3/reference/williams-source/joust/JOUSTRV4.SRC`
  - If not found in V4: document search, specify alternate source, cite it
- Timeout expressed in **core ticks** (game sim clock, not wall milliseconds)
  - Store in entry state or CabinetState (not Date.now())
- Shell step (main.ts frame function, cabinet.mode === 'highscore'):
  - Decrement timeout counter by 1 tick per frame
  - When timeout reaches 0 AND entry.initials.length === 3: auto-commit via commitEntry
- Test: seeded-replay with entry state, verify auto-commit at expected tick count
- Include ROM cite as code comment with line number and timing value

---
_Context enriched with ROM research and acceptance criteria. Generated stub expanded by sm-setup._
