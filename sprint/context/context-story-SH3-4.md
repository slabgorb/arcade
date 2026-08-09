# Story SH3-4 Context

> ⚠ **CORRECTION (verified 2026-08-08 by SM):** The story title in the sprint YAML is materially stale in three ways. The corrected scope below supersedes the title. TEA must use the corrected facts and acceptance criteria below, not a literal title reading.

## Title (SUPERSEDED — see Correction block above)
pac-man — adopt @shared/host-helpers mount + @shared/view letterbox for the DPR/resize handling in src/shell/layout.ts; fold the player-pause path onto @shared/pause ONLY IF core/mode.ts `paused` is player-pause and not ghost scatter/chase mode-state (verify first — reuse-first, do not force a false match)

## Metadata
- **Story ID:** SH3-4
- **Type:** story
- **Points:** 3
- **Priority:** p3
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Shared-module adoption — retire the straggler cabinets' per-game re-implementations of extracted shared code

## Background

The pac-man plugin re-implements canvas-mount and DPR-aware resize handling that already exists in the shared library. This story retires that duplication by adopting `@shared/host-helpers` and `@shared/view`.

**Correction 1 — File location:** The DPR/resize/mount lifecycle is NOT in `plugins/pac-man/src/shell/layout.ts` (which is a pure 40-line integer-scale calculator `fitIntegerScale` with no DOM, DPR, resize or canvas-mount code). The real work file is `plugins/pac-man/src/main.ts`:
- `main.ts:43-45` — manual `document.querySelector<HTMLCanvasElement>('#game')` + `getContext('2d')` boilerplate → replaced by `@shared/host-helpers` `mountCanvas(root, '#game')`
- `main.ts:56-61` — hand-rolled `resize()` setting `canvas.width = canvas.clientWidth` / `canvas.height = canvas.clientHeight` with NO devicePixelRatio handling (always 1×), plus `window.addEventListener('resize', resize)` → replaced by `@shared/view` `resizeToDisplay(canvas, cssW, cssH, rawDpr)`, which folds in MAX_DPR=2 cap + falsy-guard

**Correction 2 — @shared/pause adoption is VOID (do NOT adopt):** The story's conditional ("fold player-pause onto @shared/pause ONLY IF core/mode.ts `paused` is player-pause and not ghost scatter/chase mode-state") self-resolves to FALSE. The string "paused" appears in `core/mode.ts` ONLY in comment prose describing ghost mode-state bookkeeping (scatter/chase clock frozen during frightened mode) — there is no player-pause field in the code. This agrees with epic SH3's own OUT OF SCOPE clause, which explicitly names pac-man `@shared/pause` adoption as out of scope: "feature-gated shell furniture on missile-command and pac-man — adopting them is 'build the future feature ON shared', not 'retire duplication', and belongs to those epics."

**Correction 3 — Letterbox handling:** Keep pac-man's own `fitIntegerScale` — do NOT swap it for `@shared/view.letterbox`. The `@shared/view.letterbox` function is aspect-ratio / fractional-scale based; pac-man is a RASTER cabinet requiring WHOLE-NUMBER integer scale + crisp pixels (AC-2, ported from centipede). The only `@shared/view` piece to adopt is `resizeToDisplay` (the DPR/resize sizing). `fitIntegerScale` remains in `main.ts:213`.

## Technical Approach

In `plugins/pac-man/src/main.ts`, retire the hand-rolled canvas-mount + resize boilerplate in favour of the shared primitives:
1. Import and call `@shared/host-helpers` `mountCanvas` for `#game` canvas acquisition (replace main.ts:43-45)
2. Import and call `@shared/view` `resizeToDisplay` for DPR-aware resize lifecycle (replace main.ts:56-61)
3. Keep existing `fitIntegerScale` for raster letterbox (do NOT use `@shared/view.letterbox`)
4. Ensure DPR change (1× → up-to-2× backing store) gains crisp integer scaling and preserves letterbox centering

## Scope
- In scope: adopting `mountCanvas` and `resizeToDisplay` from shared library in `main.ts`; retiring hand-rolled canvas mount and resize handling
- Out of scope: `@shared/pause` adoption; `@shared/view.letterbox` adoption; changes to `fitIntegerScale` logic

## Acceptance Criteria

**AC-1: Mount canvas via @shared/host-helpers**
- `mountCanvas` replaces manual `document.querySelector<HTMLCanvasElement>('#game')` + `getContext('2d')` at main.ts:43-45
- Canvas is correctly mounted and 2D context acquired with no null errors

**AC-2: DPR-aware resize via @shared/view.resizeToDisplay**
- `resizeToDisplay` replaces hand-rolled resize at main.ts:56-61, gaining MAX_DPR=2 cap + falsy-guard
- Crisp integer pixels are preserved (integer-scale letterbox unchanged)
- Letterbox centering is unchanged
- DPR change from 1× to up-to-2× is measurable but rendering fidelity does not regress

**AC-3: Letterbox logic unchanged**
- `fitIntegerScale` remains in place and is called from main.ts:213 (or its equivalent post-refactor)
- No swap to `@shared/view.letterbox`

**AC-4: No determinism regression**
- This is a raster cabinet with no rng/loop determinism seeds touched
- Observable: compare a demo/replay render before and after; pixel-level centering and crisping must match or improve

---
_Generated by `pf context create story SH3-4` from the sprint YAML._
