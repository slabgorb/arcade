# Story jt10-7 Context

## Title
High-score entry + JOUST CHAMPIONS table: initials entry (ENTER YOUR INITIALS / ENTER THY NAME MY LORD!) via @shared/highscore in the joust font

## Metadata
- **Story ID:** jt10-7
- **Type:** story
- **Points:** 5
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Joust cabinet lifecycle — attract/title, 1P·2P select, game over, high-score, and Joust's two fonts

## Problem
_No description in the sprint YAML — see the story title above and the epic context for scope._

## Technical Approach
_Approach hints to be refined by TEA/Dev. The story title above defines the
intended behavior._

## Scope
- In scope: the behavior described by the story title.
- Out of scope: unrelated changes.

## Acceptance Criteria

### AC1: Cabinet mode routing on game-over
When the game ends via `GOVER_OVER` and the player's final score **qualifies** for the high-score table (per `qualifiesForHighScore` against the persisted JOUST CHAMPIONS table), route the cabinet to 'highscore' mode. When the score does **not** qualify, route directly to 'attract' mode.
- **Testable:** Core test verifies the `stepCabinet` transition from 'gameover' → 'highscore' (when score qualifies) vs 'gameover' → 'attract' (when it does not), using a populated test table.

### AC2: Pure initials entry via stepNameEntry
The cabinet's 'highscore' mode accumulates exactly **3 initials** (A–Z, 0–9) into a core-held buffer via `stepNameEntry` driven by the player's joust controls:
- Joust **move left/right** selects the letter (cycling through A–Z, 0–9)
- Joust **flap** confirms the letter and advances to the next position
- After 3 letters, the buffer is complete and ready for commit
- **Testable:** Core test verifies the buffer state after each flap, and that the 3rd flap triggers a commit-ready signal.

### AC3: Rank-conditional prompt selection
The text shown to the player during initials entry depends on their score's rank in the table:
- **Rank 1 (Champion):** Display 'ENTER THY NAME MY LORD!' (MSGOD $67, PHRASE.SRC:115)
- **Rank 2–10 (Lesser):** Display 'ENTER YOUR INITIALS' (MSPEON $68, PHRASE.SRC:116)
- **Testable:** Core test verifies `promptForRank(rank)` returns the correct string for rank 1, rank 5, and rank 10+.

### AC4: High-score insertion and persistence
After initials are confirmed, `insertHighScore(table, score, initials)` adds the new entry to the high-score table, maintaining rank order and respecting the MAX_HIGH_SCORES (10) cap. The table is persisted via `makeHighScoreStorage(gameId: 'joust')` using single-origin localStorage.
- **Testable:** Core test verifies insertion into an empty and pre-populated table, correct ordering, and the 10-entry limit.

### AC5: JOUST CHAMPIONS table rendering
The persisted high-score table renders with:
- Table heading: 'JOUST CHAMPIONS' (TXHSP $0F, EQU.SRC)
- Entries displayed in joust's FONT35 (3×5 tight font)
- Each entry shows: **rank** · **initials** · **score** (in-game row format, faithful to ROM display)
- **Testable:** Render smoke test confirms the heading and at least one entry are drawn in FONT35; exact glyph bitmap verified by the font gate (jt10-1).

### AC6: ROM string citations
Every prompt text and table heading is byte-verifiable against the vendored reference tree (`reference/williams-source/joust/`) under the joust citation-gate convention:
- Prompts: MSGOD (PHRASE.SRC:115) and MSPEON (PHRASE.SRC:116)
- Table heading: TXHSP (EQU.SRC)
- Each literal is pinned via `//` comment citing the source line; the gate enforces a verbatim match or fails the build.

---

## Out of Scope (Filed Separately)
- **DAILY BUZZARDS table:** A daily-reset second table + associated timer and reset logic → filed as a follow-up epic by SM.

---
_Acceptance Criteria derived from epic jt10 design (docs/superpowers/specs/2026-08-07-joust-cabinet-lifecycle-design.md) and user-confirmed scope rulings (2026-08-08)._
