# Story pt1-3 Context

## Title
star-wars: surface-run projection looks wrong — elements render very far from the player

## Metadata
- **Story ID:** pt1-3
- **Type:** bug
- **Points:** 3
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Playtest bug sweep 2026-08-19 (pt1)

## Problem
Playtest 2026-08-19: during the Death Star surface run, geometry (towers/bunkers)
appears much too distant.

**Research (2026-08-19): the LENS is not the bug — the surface phase carries two
incompatible world scales on different axes.** This is the deferred step 2 of the
sw10-1 lens audit (`docs/2026-08-08-star-wars-projection-audit.md` §6 —
"re-derive placements from ROM constants" — never done; §5 predicted exactly this).

## Findings — root cause

The projection is phase-independent: one `sceneProjection` (`render.ts:459-461`,
`FOV_Y = π/2` `gameRules.ts:16`, NEAR=1/FAR=9000 `wireframe.ts:19-20`, centred
square viewport `wireframe.ts:51-54`). No phase-specific FOV/z-scale exists.

**The mixed-unit defect:** horizontal/depth placement and pacing are 1:1 RAW ROM
units, while every vertical/size quantity is at the 1/30 presentation scale:
- Placement: `sim.ts:2109-2127` `mazeField()` drops raw WSGRND maze coords (out
  to $8000=32768) in unscaled; scroll speeds raw (`state.ts:738-745`);
  `OBJECT_CRASH_LATERAL = 1024` "in the maze's RAW lateral units"
  (`state.ts:716` — the in-tree admission).
- Size/height: `GROUND_MODEL_SCALE = 1/30` (`render.ts:259`, applied `:593`);
  `SKIM_ALTITUDE = 128` (=3840/30), `TOWER_HEIGHT = 352`, `MAX_SKIM_ALTITUDE =
  238` — all ÷30 (`state.ts:655-710`).
Objects are drawn ~30× too small for the distance they're placed at. At median
maze depth ≈17,584 a tower subtends NDC ≈ 0.013 (~0.6% of the viewport) — specks;
the trench at the same lens gives ~15-25× more presence per unit distance.
Compounding: `surface-grid.ts:21-28` `GRID_FAR = 6000` / `GRID_HALF_WIDTH = 3600`
— the drawn ground ends at 6000 while most towers stand at 12,000-34,000 (beyond
the floor), and the maze is ±32,768 wide vs a ±3,600 floor. Secondary:
`GRID_Z = 500` at 5,250-21,000 u/s = 10-42 rib recycles/s (grid aliasing —
watch the no-strobe ruling here).

**Audit trail:** sw7 re-based MOTION to raw units (B-008, D-022 remediated); sw4-3
re-based PLACEMENT to raw maze coords (D-001..D-012 CONFIRMED); but sizes/heights
stayed 1/30 and D-013 blessed that half separately. No finding pairs the halves —
this story should add a sibling finding to `pair-surface.json` recording the
mixed-unit defect, `remediated_by: "pt1-3"`.

**Fix shape (for TEA/Dev):** ground objects to 1:1 like every other model
(`GROUND_MODEL_SCALE = 1`), re-derive from ROM: `SKIM_ALTITUDE = GD$MDT = 3840`,
`MAX_SKIM_ALTITUDE = 0x1C00 = 7168`, `TOWER_HEIGHT = 0x58 × 120 = 10,560`; grow
`GRID_FAR`/`GRID_HALF_WIDTH` to the ROM draw window — **depth $100..$3C00
(256..15,360) plus a ±45° gate (|Y| < X)**, `WSGRND.MAC:761-772`. That makes a
1920-wide tower stand in a 2048 lane with crash lateral 1024 = its own radius —
coherent for the first time.

**⚠ Open research lead (pin before choosing the scale):** ground map coords pass
through `M$PSB2` which HALVES them, and the map wraps/tiles ("FLIP X OVER FOR
TIGHTER PACKING") — `WSGRND.MAC:747,751,756-759`, `WSGLOB.MAC:177`. The effective
depth may be coord/2 (an extra factor of 2 the port never applied) and the maze
may be a repeating tile, not a single pass. RED-anchor this before committing.

Other anchors: `GD$MDT` 3840 (WSOBJ.MAC `.PGND`, already cited `state.ts:645-655`);
tower `.PGND -4,0,58` (cited `state.ts:672-684`); `.S = 30.*4 = 120` raw/design
unit (cited `render.ts:250-258`); crash window `WSGRND.MAC:901-946`; play cube
±$7CFF `WSCPU.MAC:803-809`.

## Technical Approach
1. Land pt1-4 (fixed square canvas) FIRST — it pins the box the projection lands
   in (epic sequencing note).
2. Settle the M$PSB2 halving + tiling question against WSGRND (RED-anchor).
3. Re-derive the surface constants to one coherent 1:1 base (core `state.ts`,
   `surface-grid.ts`; shell `GROUND_MODEL_SCALE`); the re-scale spans the
   core/shell seam — render.ts may import core, never the reverse
   (`tests/core/core-purity.test.ts`).
4. Add the D-013-sibling finding + stamp; add a surface preset to
   `scenePresets.ts` (trench-only today — why this shipped unseen; a cheap
   regression net on scenes.html).
5. Citation gate: `ours` frozen at `3580752` (tag `audit/star-wars`) — code motion
   safe; source side is live, verify it ran (silently skips if the source dir is
   missing).

## Scope
- In scope: surface placement/size coherence, grid envelope, the finding, the
  scenes.html preset.
- Out of scope: the lens (sw10-1, correct); trench/space phases (already 1:1);
  input aim mapping (pt1-4/pt1-10 territory).

## Tests affected
- **The wall:** `tests/shell/render.ground-object-placement.test.ts:86-166`
  hard-pins `GROUND_MODEL_SCALE === 1/30`, `TOWER_HEIGHT === 352`,
  `SKIM_ALTITUDE === 128` — it IS the record of the wrong base; rewrite it as the
  record of the right one.
- `tests/core/surface-*.test.ts` (grid, maze-field fixture `SITE = [800, 0,
  SKIM_ALTITUDE]`, tower-geometry, visibility, hazard, pacing, aim-wysiwyg,
  bunkers, clear) — sweep for constant-coupled fixtures.
- `tests/core/sw10-1-authentic-lens.test.ts` — pins lens shape ONLY, explicitly
  defers placement ("sw10-2") — does not block.

## Acceptance Criteria
_TEA to define at RED. Suggested: AC1 one unit base across surface axes — an
object's drawn size at its crash distance subtends a pinned, human-scaled NDC
(tower at nearest row ≳ trench-wall presence order); AC2 the ground plane reaches
the ROM draw window ($3C00) so no tower stands beyond the floor; AC3 the M$PSB2
question settled and cited (or recorded as a Design Deviation); AC4 new finding
stamped; AC5 no grid strobe (Decision B), purity + citations green._

---
_Generated by `pf context create story pt1-3`; researched and expanded by Architect 2026-08-19._
