# Story pm4-4 Context

## Title
[INVESTIGATION] Ghost-house wall/traversal audit: the reported 'wall Pac-Man cannot cross' is likely the AUTHENTIC gate/house bar (maze.ts isWalkable(..,'pac-man') correctly returns false for house/gate). Visual playtest (Playwright headless, per the arcade playtest memo; STATIC screenshots only — boss has epilepsy) to decide whether it is that rule (close as no-op with evidence) or a maze-authoring artifact in maze.ts's row table (fix the table only). May close without a code change.

## Metadata
- **Story ID:** pm4-4
- **Type:** chore
- **Points:** 2
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Pac-Man — cabinet lifecycle (attract + state machine + freeze pauses) + fidelity/accessibility fixes

## Problem
The investigation is **RESOLVED by the boss (visual oracle)** and the SM has verified
it in code. It is **branch (b): a maze-authoring artifact — a real geometry bug that
needs a code fix.** It will **not** close as a no-op.

Reported symptom (boss): the ghost-house gate bar blocks Pac-Man's **left↔right (lateral)**
passage. Blocking Pac-Man from **entering** the house is correct and authentic; blocking
lateral passage across the corridor is the bug.

**Verified NOT the cause — leave it alone:** the walkability RULE is correct.
`plugins/pac-man/src/core/maze.ts:117-128` returns `false` for `'gate'`/`'house'` tiles
when `actor === 'pac-man'` and `true` for `'ghost'`. The rule is fine; the tiles are in
the wrong place.

**Root cause — the geometry stamp.** The ghost-house/gate is hand-stamped from ROM
geometry (the attract capture over-paints the house with a GAME OVER banner) in
`plugins/pac-man/tools/bake-core-maze.mjs:57-63`, which bakes the committed
`plugins/pac-man/src/core/maze-topology.generated.ts`. Current constants:
```js
const HOUSE_TOP = 15, HOUSE_BOT = 18, HOUSE_L = 11, HOUSE_R = 16
const GATE_ROW = 14, GATE_L = 13, GATE_R = 14
```
The gate `==` is stamped at **row 14, cols 13-14** — the **open lateral corridor one row
above the house top** — and **no house-top wall row flanks it**. So the gate floats in
the traffic lane and bars lateral movement. Current baked rows 14-19:
```
    0123456789012345678901234567
14: ######.##    ==    ##.######   ← gate sits in the lateral corridor (BUG)
15: ######.## #HHHHHH# ##.######   ← house interior, but NO top wall
19: ######.## ######## ##.######   ← house bottom wall (correct)
```

Reference (static PNGs, epilepsy-safe):
- Authentic arcade: `sprint/demos/pm4-4/reference/real-pacman-authentic-house.png`
- Our clone (buggy): `sprint/demos/pm4-4/reference/our-clone-gate-blocks-lateral.png`

## Technical Approach
Fix the **stamp**, not the rule, and regenerate — never hand-edit the generated file
(`tests/core/maze-topology.test.ts` re-derives it and asserts equality).

**Target shape** (authentic Pac-Man map — confirm exact rows against **Dossier ch.3
"The Maze"** and anchor the citation at RED; the numbers below are the SM's strong
hypothesis, not a mandate):
```
14: ######.##          ##.######   ← lateral corridor FULLY OPEN (Pac-Man crosses here)
15: ######.## ###==### ##.######   ← house TOP WALL with the 2-tile gate recessed into it
16: ######.## #HHHHHH# ##.######   ← interior (top)
17: T     .   #HHHHHH#   .     T   ← interior + warp row (unchanged)
18: ######.## #HHHHHH# ##.######   ← interior (bottom)
19: ######.## ######## ##.######   ← bottom wall (unchanged)
```
i.e. the house is authored **one row too high**: shift the gate into a real top-wall row
and drop the interior one row. Proposed constants (confirm at RED):
`GATE_ROW = 15` (gate lives in the top wall), house interior `HOUSE_TOP = 16, HOUSE_BOT = 18`.
This also requires **adding a top-wall stamp** — the baker today stamps only interior `H`
and the two gate tiles; row 15 must become `#` across cols 10-17 **except** the gate at
13-14. Row 14's cols 13-14 revert to captured path (space), re-opening the corridor.

**Guardrails / blast radius the fix MUST respect:**
- **Dot/energizer invariants.** `maze.ts` throws at module load if the table's dot count
  ≠ `TOTAL_PELLETS(244) − energizers`. The re-opened corridor tiles were captured as
  *space*, not dots, so the count should hold — **verify** it after regenerating (run the
  pac-man vitest project). Do not let the stamp overwrite any `.`/`o`.
- **Ghost spawn/home coords move in lockstep.** Ghosts spawn *inside* the house. If the
  interior shifts down a row, hardcoded house/home tile coords in
  `plugins/pac-man/src/core/house.ts` and `game.ts` (spawn, home target, gate-exit path)
  must move with it — otherwise ghosts spawn in a wall or the exit path breaks. Check
  these before claiming green.
- **Tunnel row unchanged.** `TUNNEL_ROW` is derived from the `'T'` tiles (row 17); the fix
  must not move them.

**Verify** with a **static-screenshot** Playwright headless playtest (boss has
photosensitive epilepsy — no motion/strobe capture) per the arcade playtest memo: Pac-Man
crosses the house-top corridor left↔right, still cannot enter the house, ghosts still exit.

## Scope
- **In scope:** the ghost-house/gate geometry stamp in `bake-core-maze.mjs`, regenerating
  `maze-topology.generated.ts`, and any lockstep move of ghost house/home coords in
  `house.ts`/`game.ts` that the geometry shift forces. Static-screenshot verification.
- **Out of scope:** the `isWalkable` rule (correct as-is); any non-house maze tiles;
  render/shell changes.

## Acceptance Criteria
_(Starting point — TEA to finalize/expand at RED, anchoring the geometry citation to
Dossier ch.3.)_
- Pac-Man can traverse the house-top **lateral corridor** left↔right:
  `isWalkable(x, <corridor-row>, 'pac-man')` is `true` across the span the gate used to block.
- Pac-Man still **cannot** enter the house or cross the gate: `isWalkable` is `false` for
  every `gate`/`house` tile with `actor === 'pac-man'` (rule unchanged; gate now lives in
  the top wall).
- Ghosts can still exit through the gate (`isWalkable(gate, 'ghost') === true`) and the
  house exit path in `house.ts`/`game.ts` still works.
- `tests/core/maze-topology.test.ts` passes against the **regenerated** file (no hand-edit).
- `DOT_COUNT`/energizer invariants in `maze.ts` still hold (module loads; pac-man vitest green).
- Static-screenshot playtest confirms Pac-Man crossing the corridor and the gate no longer
  barring lateral passage.

---
_Generated by `pf context create story pm4-4` from the sprint YAML._
