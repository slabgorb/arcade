# Story uf1-2 Context

## Title
joust DYTBL difficulty engine is production-dead — wire difficultyValue as the per-wave source

## Metadata
- **Story ID:** uf1-2
- **Type:** story
- **Points:** 5
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** joust
- **Epic:** Unwired features — ported-but-unconsumed mechanics found by the 2026-07-28 fleet sweep

## Problem
joust/src/core/difficulty.ts holds DIFFICULTY_TABLE — 28 DYWORD rows byte-gated against JOUSTRV4.SRC:7304-7331 (LAVTIM, LAVGRA, LAVLAV, EGGWT, EGGWT2, the BODN/BOUP buzzard rows, the HUDN/HUUP hunter rows, the SHDN/SHUP shadow-lord rows, BOLETM/HULETM/SHLETM/SHCLTM) — plus the IWAVE walk engine that reads them: difficultyValue, ga1StartColumn, stepNibble and GA1_DEFAULT. Every one of those has ZERO production references. The module IS imported by src/core/wave.ts and src/core/arena.ts, but only for the three retrofit knobs emytimForWave, lavaLevelForWave and seedBudgetForRow, and all three are hand-written walks that never touch a row. Net effect: none of the ROM's per-wave escalation — enemy energy, dive rate, velocity, wing-up and wing-down cadence, egg wait, bolt time, lava timing and gravity — reaches the running game, and no consumer module references a row name at all. This story establishes the SEAM and wires a proven subset rather than all 28 rows at once: the jt2 retrofit note in difficulty.ts:38 already rules that this module is the SOURCE for per-wave knobs, so the walk should feed the existing consumers rather than living beside them. Expect a real blast radius on jt2's seeded determinism replays — the retrofit's own bar was that realized values reproduce bit-for-bit, so any row that changes a wave's realized value is a deliberate, logged deviation, not a silent drift. Size the subset so the remaining rows are inventoried into a follow-up instead of growing this story.

## Technical Approach

_SM verified the sweep's premise against the tree at branch point `279b1df`
(v0.0.7) before handoff. What follows is **verified ground**, not restated
assertion — TEA should not re-derive it, but should challenge anything marked
OPEN._

### VERIFIED — the dead-symbol claim is true

`grep -rn "\b<sym>\b" src --include="*.ts"` outside `src/core/difficulty.ts`
returns **zero hits** for every one of:

`DIFFICULTY_TABLE` · `difficultyValue` · `ga1StartColumn` · `stepNibble`
· `GA1_DEFAULT` · `DYTBL_ROW_COUNT`

So the walk engine and all 28 rows are genuinely production-dead. The engine
itself is already built, ROM-cited and (per jt3-1, joust#26) tested — this
story is **wiring, not authoring**. Do not rewrite `difficultyValue`.

### VERIFIED — the three existing seams

The module is imported by exactly three production files, all for the retrofit
knobs and none for a row:

| Consumer | Line | Imports |
|---|---|---|
| `src/core/wave.ts` | 24 | `emytimForWave as difficultyEmytim`, `seedBudgetForRow` |
| `src/core/arena.ts` | 51 | `lavaLevelForWave as difficultyLava` |
| `src/core/demo.ts` | 66 | `emytimForWave` (re-exported via `wave.ts:294`) |

`wave.ts:294`, `wave.ts:306` and `arena.ts:340` are thin delegators — the
retrofit already landed. `enemy.ts`'s two "difficulty" hits (lines 114, 117) are
`BODNVY`/`HUDNVY` prose, not a table reference.

### AC-4 may already be satisfied — CHECK BEFORE BUILDING

The story asks that `emytimForWave` / `lavaLevelForWave` / `seedBudgetForRow` be
"reconciled with the table rather than duplicated." `difficulty.ts:38-52`
already rules they are **not DYTBL rows at all** — they are the other knobs
computed in the same IWAVE pass, each carrying its own citation
(`JOUSTRV4.SRC:2202-2205`, `:1929-1933`, `:2075-2077`). That is the
"documented as deliberately separate with the ROM citation" arm of AC-4, already
written. TEA should **verify that reading against JOUSTRV4.SRC and record it**,
not re-litigate it — and if it holds, AC-4 costs a confirmation, not a change.

### OPEN — for TEA to decide, not SM

1. **Which subset.** AC-1 names the floor: the lava rows plus the buzzard
   energy-and-wing rows. The story explicitly forbids all 28 at once and
   requires the remainder be inventoried (AC-6). Pick the subset in RED.
2. **Where each wired row lands.** Lava rows point at `arena.ts`; the
   BODN/BOUP buzzard rows point at `enemy.ts`. Neither seam exists yet —
   how the per-wave value reaches the consumer (threaded arg vs. computed at
   wave construction) is a design call, but note the fleet rule: `src/core`
   is the pure deterministic sim, so no module-scope mutable wave state.
3. **The determinism blast radius (AC-5).** This is the real risk. jt2's
   seeded replays assert bit-for-bit reproduction of realized values. Any
   wired row that changes wave N's realized value is a *deliberate, logged
   deviation with its JOUSTRV4.SRC citation* — never a silent drift. Expect
   `demo-jt2-9-*.test.ts` and the jt3 suites to move. Establish the baseline
   BEFORE changing anything so the delta is attributable.

### ROM quarry

`JOUSTRV4.SRC` — DYTBL rows `:7304-7331`; GA1 tiers `:930-939`; the IWAVE walk
and clamp `:1890-1926`; wave-1-skips-the-walk `:1883`; the once-per-wave call
site `:2099`; the RAM seed + timer `:945-946`.

## Scope
- **In scope:** wiring a proven subset of DYTBL rows (lava + buzzard
  energy/wing at minimum) through their real consumers; confirming or
  correcting the AC-4 retrofit ruling; inventorying the unwired remainder.
- **Out of scope:** rewriting the walk engine (it is landed and tested);
  wiring all 28 rows; any change to `streamForceFields`-style unrelated
  subsystems. The remaining rows go to a follow-up story per AC-6 — file it,
  do not leave it as prose.

## Acceptance Criteria
- difficultyValue drives at least the lava rows and the buzzard energy-and-wing rows through their real consumers, so a later wave observably differs from wave 1 on each wired dial.
- ga1StartColumn and the GA1 tier buckets (0-3, 4-6, 7 and above) select the start column that seeds each wired row, with GA1_DEFAULT 5 as the shipped operator setting.
- The IWAVE walk semantics hold for every wired row: the walk runs wave minus 1 times, clamps at END by the signed comparison, and holds flat forever after.
- The three retrofit knobs emytimForWave, lavaLevelForWave and seedBudgetForRow are reconciled with the table rather than duplicated — either sourced from it or documented as deliberately separate with the ROM citation for why.
- jt2's seeded determinism replays still reproduce, or every changed realized value is logged as a deviation with its JOUSTRV4.SRC citation.
- The rows NOT wired by this story are inventoried in the epic or a follow-up story, so the remaining gap is tracked rather than rediscovered by the next sweep.

---
_Generated by `pf context create story uf1-2` from the sprint YAML._
