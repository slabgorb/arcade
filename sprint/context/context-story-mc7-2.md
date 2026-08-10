# Story mc7-2 Context

## Title
Name-entry 'entry' phase + initials buffer in core, reusing @shared/name-entry: a qualifying score on phase over routes to entry; stepNameEntry drives the 3-char initials buffer over the ROM charset; commit inserts into the table then returns to attract/over. Slots into mc6-1's phase machine. REV-01 W3DSUP.MAC:4064 TAKE INITIALS

## Metadata
- **Story ID:** mc7-2
- **Type:** story
- **Points:** 5
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Missile Command — high-score ladder + name entry (REV-01): reuse @shared/highscore + @shared/name-entry

## Problem
Missile Command (REV-01) needs the name-entry step of its high-score flow: when a
finished game's score qualifies for the ladder, the cabinet takes the player's 3-char
initials, then inserts the completed entry into the table. This is the "TAKE INITIALS"
routine of the ROM display processor (`W3DSUP.MAC:4064`). This story adds the pure-core
half only — the `entry` phase, the initials buffer, and the commit-into-table transition.
Persistence (shell localStorage) is **mc7-3**, out of scope here.

## Verified Dependencies (SM confirmed against the current tree — treat as established fact)
- **mc6-1 phase machine — DONE.** `plugins/missile-command/src/core/state.ts` defines
  `Phase = play | between | over | attract | setup | pause` with a pure `nextPhase`
  dispatch (MAINLINE: `attract -> setup -> play -> [pause] -> over -> attract`, per
  `W3MAIN.MAC:475`). This story adds a new **`entry`** phase on the `over -> attract`
  seam: a *qualifying* score at `over` routes to `entry`; a non-qualifying score keeps
  the existing `over -> attract` path.
- **`@shared/name-entry` — REUSE, do not re-implement.** Exports
  `stepNameEntry(buffer: string, key: string, maxLength: number): string` at
  `src/shared/name-entry.ts:22`. Drive the 3-char initials buffer through it.
- **mc7-1 high-score table — DONE.** `plugins/missile-command/src/core/highscore.ts`
  exports `qualifiesForHighScore(table, score)` and `insertHighScore(table, entry)`
  (consumers over `@shared/highscore`, ladder depth `MC_HIGH_SCORE_DEPTH`). The `entry`
  route is gated by `qualifiesForHighScore`; **commit** inserts via `insertHighScore`.

## ROM Ground Truth
- REV-01 (035820-01). `W3DSUP.MAC:4064 TAKE INITIALS` — the 3-char initials entry and
  its charset. Any new `src/core` constant (charset, buffer length = 3, cursor bounds)
  must carry a citation-gated claim; do not hard-code an uncited literal.

## Technical Approach (hints for TEA/Dev — behavior, not prescription)
1. Add `'entry'` to the `Phase` union in `state.ts` and route `over -> entry` on a
   qualifying final score (else keep `over -> attract`).
2. Hold the initials buffer in core `GameState` (pure). Advance it with
   `stepNameEntry` over the ROM charset from `W3DSUP.MAC:4064` (3 chars).
3. On commit, `insertHighScore` the finished entry into the mc7-1 table, then leave
   `entry` back to `attract`/`over` per the ROM.

## Acceptance Criteria (DERIVED from the title — TEA to firm up at RED)
- **AC1** — A game-over state whose score *qualifies* (`qualifiesForHighScore` true)
  transitions `over -> entry`; a non-qualifying score does **not** enter `entry`.
- **AC2** — In `entry`, the 3-char initials buffer is driven by `@shared/name-entry`
  `stepNameEntry` over the ROM charset cited from `W3DSUP.MAC:4064`; the buffer never
  exceeds 3 chars.
- **AC3** — Commit inserts the completed entry into the mc7-1 core table via
  `insertHighScore`, then the phase returns to `attract`/`over`.
- **AC4** — Every new `src/core` constant (charset, length, bounds) is citation-gated;
  `tests/audit/citations.test.ts` stays green.
- **AC5** — `purity.test.ts` stays green: all new logic is in `plugins/missile-command/src/core/`,
  pure (no clock/DOM/RNG-at-call), and reuses `@shared/name-entry` rather than
  re-implementing the stepper.

## Scope
- **In scope:** the `entry` phase, the pure initials buffer, the qualify-gated route and
  the commit-into-table transition — all in `plugins/missile-command/src/core/`.
- **Out of scope:** shell persistence / localStorage (mc7-3), ladder display + seeded
  defaults (mc7-4), attract/state-machine ownership (mc6), audio (mc8), palette (mc9).

## Commands
- Tests: `npx vitest run --project missile-command` (never run directly — via testing-runner).
- Type check: `npm run lint` (repo-wide `tsc --noEmit`).

---
_Authored by SM from the epic-mc7 spec + tree-verified dependencies (story YAML had null description/AC)._
