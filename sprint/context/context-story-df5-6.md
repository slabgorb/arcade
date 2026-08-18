# Story df5-6 Context

> ⚠ **DO NOT REGENERATE THIS FILE.** The Technical Approach, Scope, Dependencies and
> Design Notes are Architect-enriched from the df5 design spec. `pf context create`
> refills Technical Approach/Scope with placeholder text and would overwrite them.

## Title
End-of-game core (PURE-first; phase-wired in df7): plugins/defender/src/core/ — the men<0 -> game-over reducer reading the df5-3 men counter; final score -> hall of fame via @shared/highscore + @shared/name-entry (HALLOF *HALL OF FAME ENTRY defender/AMODE1.SRC:117,119; initials display :242; add-score :270 — CONSUMED, not re-implemented); the CMOS coin/credit ledger (* CMOS RAM ALLOCATION SLOT1/2/3/TOTPDC defender/ROMF8.SRC:16-38) mapped to one-origin localStorage. Ships the reducer + persistence, NOT the attract loop (df7 wires it). Consumes df5-3 (men counter) + @shared.

## Metadata
- **Story ID:** df5-6
- **Type:** story
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Defender — game structure & the scanner (phase 4c): waves, scoring + extra men, the humanoid rescue loop and the planet-explodes-to-mutant-space panic, the two emergency powers (smart-bomb + hyperspace, citing ADR-0005), and the pure end-of-game core

## Problem
Decision C: the end of the game is pure-first here, phase-wired in df7 (the pm4/mc6 split). df5-6 delivers the pure lives<0 -> game-over condition and the hall-of-fame + localStorage data flow; df7 wires it into the attract->play->death->game-over phase machine and renders the screens. The hall of fame is @shared (highscore + name-entry), NOT new persistence code — df5-6 maps Defender's score format onto them. The CMOS ledger -> localStorage ties to the ADR-0004 cross-origin-cookie retirement this monorepo already made (one origin, shared localStorage).

## Technical Approach
Build the **pure end-of-game core** in `plugins/defender/src/core/` (Decision C — pure-first
here, phase-wired in df7):

- **Game-over reducer (pure).** Signal end-of-game when the `df5-3` men counter falls below
  zero (`lives<0`), cited to the ROM condition. Pure/data — no phase-machine wiring, no
  attract loop (df7).
- **Hall of fame via `@shared`.** Commit the final score through `@shared/highscore` +
  `@shared/name-entry` (`HALLOF *HALL OF FAME ENTRY, AMODE1.SRC:117,119`; initials display
  `:242`; add-score `:270`). **Consume** the shared modules — do **not** re-implement
  persistence. Map Defender's score format onto the shared table.
- **CMOS → localStorage.** Model the CMOS coin/credit ledger (`* CMOS RAM ALLOCATION`:
  `SLOT1`/`SLOT2`/`SLOT3` coin totals, `TOTPDC` total paid credits, `ROMF8.SRC:16-38`) and
  persist to one-origin `localStorage` (the ADR-0004 cross-origin-cookie retirement this
  monorepo already made). Each ledger constant gated.
- **Deferral note.** Record that the phase-machine WIRING (attract→play→death→game-over) +
  HUD render defer to df7 (Decision C), and that 2P handoff defers to df7 (Decision D) with
  the `DEFA7.SRC:1179-1237` citations preserved in the design spec.

Consumes `df5-3` (the men counter) + `@shared`. No new `@shared` extraction.

## Scope
- **In scope:** the pure `lives<0` game-over reducer; final-score → hall of fame via
  `@shared` (no re-implementation); the CMOS ledger → `localStorage`, cited; the df7/2P
  deferral note; `claims/*.json`; `purity.test.ts` green.
- **Out of scope:** the attract loop + the phase machine + screen render (df7); 2P handoff
  (df7); the men counter itself (df5-3, consumed).

## Acceptance Criteria
- AC1: a PURE game-over reducer signals end-of-game when the df5-3 men counter falls below zero (lives<0), cited to the ROM condition; it is pure/data with no phase-machine wiring and no attract loop (that is df7 — Decision C); purity.test.ts stays green.
- AC2: the final score is committed to the hall of fame via @shared/highscore + @shared/name-entry (HALLOF, defender/AMODE1.SRC:119) — the shared modules are CONSUMED, not re-implemented; a test asserts Defender's score format maps onto the shared table and that no bespoke high-score persistence is introduced.
- AC3: the CMOS coin/credit ledger (SLOT1/SLOT2/SLOT3 coin totals, TOTPDC total paid credits, defender/ROMF8.SRC:16-38) is modelled and persisted to one-origin localStorage; every ledger constant has a claims/*.json entry verified byte-for-byte under the df1-1 gate.
- AC4: a Design note records that the phase-machine WIRING (attract->play->death->game-over) and the HUD render are deferred to df7 (Decision C), and that 2P alternating handoff is deferred to df7 (Decision D) with its DEFA7.SRC:1179-1237 citations preserved in the design spec.

## Dependencies
- **df1** — citation gate (df1-1) + purity test.
- **df5-3** — the men counter this reads for `lives<0`.
- **`@shared/highscore` + `@shared/name-entry`** — the hall of fame (consumed).
- **Blocks:** `df7` (wires this core into the attract→play→death→game-over phase machine).

## Design Notes
- **Decision C (RULED):** design spec §5 — pure-first here, phase-wired in df7 (the pm4/mc6
  split). Build **no** attract loop.
- **Hall of fame is `@shared`, not new code** — a test asserts no bespoke high-score
  persistence is introduced.
- **Decision D forward note:** 2P alternating handoff (`P1SW`/`P2SW`/`PLAYER START PROCESS`,
  `DEFA7.SRC:1179-1237`) is deferred to df7; the cocktail screen-flip is documented-not-ported
  (arcade is desktop-only, upright).
- Line numbers from tool output only; RASM radix (`$hex` vs bare decimal).

---
_Generated by `pf context create story df5-6` from the sprint YAML._
