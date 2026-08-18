# Story df5-3 Context

> ⚠ **DO NOT REGENERATE THIS FILE.** The Technical Approach, Scope, Dependencies and
> Design Notes are Architect-enriched from the df5 design spec. `pf context create`
> refills Technical Approach/Scope with placeholder text and would overwrite them.

## Title
Scoring, the men counter + the extra man: plugins/defender/src/core/score.ts — per-enemy points, the humanoid P250/P500 score pop-ups (P250 OBI C25P1 defender/DEFB6.SRC:499, P500 OBI C5P1 :506, P5000 JSR SCORE :508; spawned LDX #P250/#P500 :959,962), the BONUS collect process (*BONUS COLLECT PROCESS defender/DEFA7.SRC:1786,1788), the men (lives) counter and the extra-man award. FIRST pin each score VALUE and which event pays it in the dossier, CITED, before naming the reducer (the df4 identity-first law, now applied to values). Consumes df4-1 collision (deaths) + df3 scheduler (pop-ups are processes).

## Metadata
- **Story ID:** df5-3
- **Type:** story
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Defender — game structure & the scanner (phase 4c): waves, scoring + extra men, the humanoid rescue loop and the planet-explodes-to-mutant-space panic, the two emergency powers (smart-bomb + hyperspace, citing ADR-0005), and the pure end-of-game core

## Problem
Scoring identity is a cited dossier task: P250/P500 and which rescue/kill event pays which are pinned from the ROM BEFORE the reducer is named — a wrong point value in prose ships GREEN. The men counter and extra-man award live here; df5-6 reads the men counter for the game-over condition (different file, coherent commit). Score pop-ups are df3 scheduler processes. Colour by df2 palette index only.

## Technical Approach
Build `plugins/defender/src/core/score.ts` (pure), **dossier-first**:

- **Identity-as-VALUES (do this first).** Before naming the reducer, map each score EVENT →
  its ROM VALUE in the dossier, cited: per-enemy points, the humanoid rescue/kill `P250`
  (`OBI C25P1, DEFB6.SRC:499`) / `P500` (`OBI C5P1, :506`) / `P5000 JSR SCORE (:508)`, and
  the `BONUS` collect (`*BONUS COLLECT PROCESS DEFA7.SRC:1786,1788`). A per-value
  `expectPopulated` assertion runs **before** any `rowCites`/coverage sweep (the df4
  identity-glossary-gate shape) so a wrong value cannot pass vacuously.
- **`score.ts` (pure).** Award those points on the cited events; every value → a
  `claims/*.json` entry byte-verified under the df1-1 gate; no un-cited `src/core` value.
- **The men (lives) counter.** Introduce the men counter; decrement on ship death; increment
  by the extra-man award at the ROM-cited threshold — crossing the threshold grants **exactly
  one** man, pinned by count, not a boolean.
- **Pop-ups are processes.** Score pop-ups spawn via the `df3` scheduler (`NEWP,STYPE`), not
  per-pop-up ticks.

Consumes `df4-1` collision (the death events) + `df3` scheduler. `df5-6` reads the men counter
for the game-over condition (a different file — commit coherently).

## Scope
- **In scope:** the cited score→value dossier mapping + the identity gate; `score.ts`
  awarding points; the men counter (decrement/award); the extra-man threshold pinned by
  count; pop-ups as scheduler processes; `claims/*.json`; `purity.test.ts` green.
- **Out of scope:** the game-over condition that reads the men counter (df5-6); the
  score/men HUD render (df7); the rescue **mechanic** that earns rescue points (df5-4
  delivers the mechanic, this story the points).

## Acceptance Criteria
- AC1: the dossier maps each score EVENT -> its ROM VALUE (per-enemy points, humanoid rescue/kill P250/P500 per defender/DEFB6.SRC:499,506, bonus collect per defender/DEFA7.SRC:1788), CITED, and a per-value expectPopulated assertion runs BEFORE any rowCites/coverage sweep so a wrong value cannot pass vacuously (the df4 identity-glossary-gate shape).
- AC2: plugins/defender/src/core/score.ts exists (PURE) awarding those points on the cited events; every score constant has a claims/*.json entry verified byte-for-byte under the df1-1 gate; no un-cited src/core value.
- AC3: a men (lives) counter is introduced, decremented on ship death and incremented by the extra-man award at the ROM-cited threshold; the award is tested by COORDINATES/COUNT (crossing the threshold grants exactly one man), not a boolean.
- AC4: score pop-ups are df3 scheduler processes (NEWP,STYPE), not per-pop-up ticks; purity.test.ts stays green; blips/HUD figures reach colour by df2 palette index only.

## Dependencies
- **df1** — citation gate (df1-1) + purity test.
- **df3** — scheduler (pop-ups are processes).
- **df4-1** — collision (the death events points hang off).
- **df4** — the enemy reducers (what dies) + df4-3 abduction (the rescue events df5-4 fires).
- **Blocks:** `df5-6` (reads the men counter for the `lives<0` game-over).

## Design Notes
- **Identity-as-values (df4 law, applied to values):** `P250`/`P500` and *which* event pays
  *which* are pinned from the ROM **before** the reducer is named — a wrong point value ships
  GREEN. Anchor the gate to per-value `expectPopulated` + mutation-prove, not a coverage
  sweep.
- **Shared surface with `df5-6`:** the men counter lives here; `df5-6` reads it. Different
  files — commit coherently, do **not** merge the stories (the jt9 file-surface rule).
- Line numbers from tool output only; RASM radix (`$hex` vs bare decimal).

---
_Generated by `pf context create story df5-3` from the sprint YAML._
