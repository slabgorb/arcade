# Context: pm5-2

## Story
**ID:** pm5-2  
**Title:** Resolve the Level-table mirror fields  
**Type:** Feature  
**Points:** 2  
**Workflow:** tdd  
**Repo:** arcade

---

## Rom Ruling

> ⚠ **ROM RULING — the story's either/or is ALREADY RESOLVED (do not re-open it)**
>
> The story title poses an either/or: "either wire a production consumer for frightenedSeconds/frightenedFlashes/elroy1/elroy2 (e.g. an attract/HUD readout) OR drop the four fields." The either/or has been resolved by fidelity constraint to the **DROP branch ONLY**. 
>
> **Rationale:** The real Pac-Man machine DISPLAYS NONE of these four values. `frightenedSeconds`/`frightenedFlashes` are behaviours (blue-ghost duration + end-of-fright blink), driven from `mode.ts` (`frightenedFramesForLevel`, `FRIGHT_FLASHES`) — never printed on screen. `elroy1`/`elroy2` are internal Cruise-Elroy dots-remaining thresholds (`mode.ts` `elroyThresholds`/`elroyStage`), consumed only as SPEED via `elroy1SpeedPct`/`elroy2SpeedPct` at `game.ts:709,711` — the threshold number is never on screen. Dossier confirms: the only claims mentioning these live in `docs/rom-study/claims/mode.json` (timing) and `sound.json` (ghost-eaten jingle); NO claim ties them to any HUD/attract/readout. `src/shell` renders none. Wiring an attract/HUD readout would INVENT cabinet behaviour that never existed — an anti-fidelity move. Fidelity forecloses it. The **DROP branch is the only ROM-faithful resolution** and it matches the 2pt/p3 estimate and the pm5 single-source epic (pm5-1 was itself a single-source cleanup).

---

## Background

The four target fields are on the `Level` readonly type at `plugins/pac-man/src/core/level.ts:49-60`:

- **`frightenedSeconds` (:51)** — doc: "reused from mode.ts, never a second literal" — **ZERO consumers** (prod OR test)
- **`frightenedFlashes` (:53)** — doc: "mode.ts's FRIGHT_FLASHES, reused" — **ZERO consumers**
- **`elroy1` (:59) / `elroy2` (:60)** — doc: "reused from mode.ts's elroyThresholds" — **ZERO production consumers**; read by exactly TWO test lines: `plugins/pac-man/tests/core/game.test.ts:466` (`lvl.elroy1 + 5`) and `:482` (`lvl.elroy2`).

Populated at `buildLevel`, `plugins/pac-man/src/core/level.ts:145-149` (`frightenedSeconds`/`frightenedFlashes`/`elroy1`/`elroy2`).

**DISTINCT and OUT OF SCOPE:** `elroy1SpeedPct`/`elroy2SpeedPct` (`level.ts:39,42`) ARE consumed (`game.ts:709,711`) — **DO NOT touch them.**

**Single source for the two test reads:** `elroyThresholds(level)` in `plugins/pac-man/src/core/mode.ts` (returns `{elroy1, elroy2}`).

---

## Acceptance Criteria

TEA: Write a failing test asserting the `Level` type no longer carries these fields and `buildLevel` no longer sets them, and repoint the two game.test.ts reads to source directly from `elroyThresholds(level)`.

1. **AC-1: Type removal & zero consumers**  
   The four fields (`frightenedSeconds`, `frightenedFlashes`, `elroy1`, `elroy2`) are removed from the `Level` type at `core/level.ts:49-60`. No production code reads them (verified by grep/type-check); test reads are repointed in AC-3.

2. **AC-2: buildLevel cleanup**  
   `buildLevel` (`core/level.ts:145-149`) no longer populates `frightenedSeconds`, `frightenedFlashes`, `elroy1`, `elroy2`.

3. **AC-3: Test reads repointed**  
   The two reads at `tests/core/game.test.ts:466` (`lvl.elroy1 + 5`) and `:482` (`lvl.elroy2`) are repointed to source `elroy1`/`elroy2` from `elroyThresholds(level)` (mode.ts) directly, keeping the assertions' meaning intact.

4. **AC-4: Regression guard — speed consumers unchanged**  
   `elroy1SpeedPct`/`elroy2SpeedPct` and their consumers in `game.ts:709,711` remain untouched and green.

5. **AC-5: Suite green**  
   `tsc --noEmit` (linter) + `npx vitest run --project pac-man` both pass with zero new failures.

---

## Testing Strategy

- **RED:** TEA writes a test asserting the four fields are removed from the `Level` type definition, and that `buildLevel` no longer populates them. Verify that the two game.test.ts reads fail until repointed to `elroyThresholds(level)`.
- **GREEN:** Dev removes the four fields, strips their population from `buildLevel`, and repoints both game.test.ts reads to derive from `elroyThresholds(level)` directly.
- **Regression:** Verify `elroy1SpeedPct`/`elroy2SpeedPct` consumers still read their values and game.ts:709,711 remain untouched and passing.

---

## Notes

- This is a **DELETE + REPOINT** story, not a refactor—the fields have never been read in production, only mirrored in tests.
- The ROM ruling confirms fidelity disallows the "wire a consumer" branch; proceed only with DROP.
- Single source for elroy thresholds: always derive from `mode.ts:elroyThresholds(level)`, not from a level field.
