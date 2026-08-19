# Story df7-1 Context

> ⚠ **DO NOT REGENERATE THIS FILE.** The Technical Approach, Scope, Dependencies and
> Design Notes are Architect-enriched from the df7 epic plan. `pf context create`
> refills Technical Approach/Scope with placeholder text and would overwrite them.

## Title
Phase machine core (PURE-first, the pm4/mc6 model): plugins/defender/src/core/phase.ts — a Phase union attract|setup|play|death|game-over (plus pause) and a pure MAINLINE dispatch (attract->setup->play->[pause]->death->game-over->attract), seeded and clock-free. CONSUMES df5-6 isGameOver(men<0, defender/DEFA7.SRC:1423) as the play->death/game-over edge (does NOT re-decide it). Cite the ROM mainline STATUS states (ST1 *ONE PLAYER START :1100, ST2 *TWO PLAYER START :1112) and the block-1 attract/hall entry (HALLOF defender/AMODE1.SRC:119; HALDIS attract :375). purity.test.ts green; the transition fn tested BEFORE the shell wires it (Decision A). The spine every other df7 story hangs off.

## Metadata
- **Story ID:** df7-1
- **Type:** story
- **Points:** 5
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Defender phase machine + attract + wiring + HUD + showcase (df7, phase 6-7): turn df1-df6's pure cores into a played-start-to-finish cabinet — the attract->setup->play->death->game-over phase machine (pure-first, pm4/mc6 model), the self-playing attract demo, the hall-of-fame name-entry flow, the HUD + scanner render, 2P alternating handoff, lobby showcase, and the full-lifecycle visual playtest

## Problem
Decision A: pure-first. The phase machine is a pure transition function in core — no clock, no rAF, seeded — mirroring mc6-1 (state.ts) and pm4's GamePhase. It consumes df5-6's men<0 game-over reducer as the play->death edge; game-over is not re-decided here. Wave/attract/setup are gated by the phase, driven by the shell. Every phase constant (timeouts, the mainline order) gated by a claims/*.json entry.

## Technical Approach
Build the phase machine as a **pure transition function** in `plugins/defender/src/core/phase.ts`,
mirroring mc6-1 (`state.ts`) and pac-man's `GamePhase`.

- **The Phase union:** `attract | setup | play | pause | death | game-over`. A pure
  `next(phase, event, state) → phase` dispatch encoding the MAINLINE loop
  `attract → setup → play → [pause] → death → game-over → attract`. Seeded, clock-free — no
  `rAF`, no `Date`, no `Math.random` (purity.test.ts green).
- **Consume df5-6's game-over, don't re-decide it.** The `play → death/game-over` edge reads
  `endgame.ts isGameOver(state)` (men<0, cited `defender/DEFA7.SRC:1423`). The machine never
  re-implements the men<0 test.
- **Cite the ROM mainline states.** `ST1 *ONE PLAYER START DEFA7.SRC:1100`,
  `ST2 *TWO PLAYER START :1112`, attract/hall entry `HALLOF AMODE1.SRC:119`, attract display
  `HALDIS :375`, `GAMEOV ROMF8.SRC:337`. Each phase timeout/cadence constant → a
  `claims/*.json` entry byte-verified under the df1-1 gate.
- **The shell drives it.** `phase.ts` owns no tick; the phases *gate* the df3 sim (attract
  runs a seeded driver, play runs real input, pause freezes). Test the transition table
  against synthetic states **before** any shell wiring (Decision A).

## Scope
- **In scope:** `phase.ts` (the Phase union + pure MAINLINE transition fn), the
  df5-6-`isGameOver` consumption at the play→death edge, the cited phase constants +
  `claims/*.json`, purity + transition-table mutation tests.
- **Out of scope:** the shell wiring / `main.ts` boot (df7-2); the attract driver (df7-3);
  hall-of-fame/name-entry (df7-4); HUD/scanner render (df7-5); 2P (df7-6). This story is the
  pure spine only — it paints nothing and binds no input.

## Acceptance Criteria
- AC1: plugins/defender/src/core/phase.ts defines a Phase union (attract|setup|play|pause|death|game-over) and a PURE, seeded, clock-free MAINLINE transition function (attract->setup->play->[pause]->death->game-over->attract); purity.test.ts stays green and the transition fn is tested against synthetic states BEFORE any shell wiring (Decision A, the pm4/mc6 pure-first split).
- AC2: the play->death/game-over edge CONSUMES df5-6 isGameOver (men<0, endgame.ts, cited defender/DEFA7.SRC:1423) — it does not re-implement or re-decide game-over; a test pins that the machine enters game-over exactly when the men counter falls below zero and not otherwise.
- AC3: the mainline phase order and every timeout/cadence constant is cited to the ROM (ST1 *ONE PLAYER START defender/DEFA7.SRC:1100, ST2 :1112, HALLOF defender/AMODE1.SRC:119, HALDIS attract :375, GAMEOV defender/ROMF8.SRC:337) with a claims/*.json entry byte-verified under the df1-1 gate; no un-cited src/core constant.
- AC4: the phase machine owns no rAF/tick (the shell drives it, phases gate the df3 sim); a mutation to the transition table (e.g. skipping death, or attract not returning from game-over) reddens a transition assertion (not a coverage check).

## Dependencies
- **df5-6** — `endgame.ts isGameOver` (men<0), consumed at the play→death edge.
- **df3** — `sim.ts` / `scheduler.ts` / seeded RNG (the phases gate the sim).
- **df1** — the citation gate + purity test.
- **Blocks:** every other df7 story (df7-2..df7-7 all hang off this phase machine).

## Design Notes
- **Decision A (pure-first, pm4/mc6):** the phase machine is core, seeded, clock-free; the
  shell wires it in df7-2. mc6-1 (`state.ts`) and pac-man `game.ts GamePhase` are the models.
- Line numbers from tool output only; RASM radix; colour by df2 index — the standing df* traps.

---
_Generated by `pf context create story df7-1` from the sprint YAML._
