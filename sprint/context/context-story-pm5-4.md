# Story pm5-4 Context

<!-- DO-NOT-REGENERATE: hand-authored from the 2026-08-16 display-bug diagnosis.
     Do NOT overwrite with a `pf context create` / sm-setup stub — if it gets
     clobbered, `git checkout -- sprint/context/context-story-pm5-4.md`. -->

## Title
Reserve-life HUD icons render as closed-mouth discs and overlap the bottom border wall — fix the life-icon frame + HUD-band vertical anchor in drawHud

## Metadata
- **Story ID:** pm5-4
- **Type:** fix (visible render regression)
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** pm5 — Pac-Man grooming / redundant dead twins (this story is the odd one out: a real visible bug, not a groom)

## Problem
Reported 2026-08-16 with a screenshot: the bottom row of reserve-life icons renders as **solid yellow discs** (no mouth wedge) **and overlaps the blue bottom border wall** of the maze. Both defects are in the shell HUD renderer `plugins/pac-man/src/shell/render.ts` → `drawHud` (the pm4-11/pm4-12 bottom-band code). Neither touches core/sim; no ROM data is involved.

### Root cause 1 — discs instead of the Pac shape
`drawHud` draws each reserve life with `drawPacman(ctx, 8 + i * SPRITE_PX, BOTTOM, 'left', 0)` (render.ts:579). The last argument is the animation frame index, and frame **`0` is `PAC_CLOSED` (spriteIndex 48)** — the fully-closed mouth, which is exactly a solid circle (render.ts:208 defines `PAC_CLOSED`; render.ts:212 shows `left[0] === PAC_CLOSED`). The Pac-Man moving in the maze looks correct because its `animPhase` cycles through the open frames; the static life icon is pinned to the closed frame, so it reads as a disc. The cabinet's reserve-life icon is the **open-mouth, left-facing** Pac — `PAC_FRAMES.left[2]` = `{ spriteIndex: 44, flipX: true }` (the widest-open frame).

### Root cause 2 — icons overlap the bottom border wall
The life and fruit icons are 16px sprites (`SPRITE_PX = 16`, i.e. 2 maze tiles), but the bottom HUD band is only 2 rows tall — rows 34–35, y 272–288 (`MAZE.rows = 36`, `TILE_PX = 8`). They are anchored at `BOTTOM = (MAZE.rows - 2) * TILE_PX = 272` (row 34), and then `drawPacman`/`drawFruit` apply the **actor tile-centring offset of −4px** (`TILE_PX/2 − SPRITE_PX/2`, render.ts:373 / :415). That offset is correct when a sprite is centred on a single 8px actor tile, but for a HUD icon it shoves the top of the 16px sprite up to y 268 — **4px into row 33, which is the bottom border wall (y 264–272)**. So every icon bleeds a quarter of its height up over the blue wall, exactly as in the screenshot, and leaves a 4px gap at the band bottom (284–288).

This is the flip side of the pm4-12 fix: pm4-12 (see the `isHudRow` comment at render.ts:~536–542) narrowed the bottom band from 3 rows to 2 (rows 34–35) so the row-33 border wall would render instead of being blanked — but the HUD icons were never nudged down out of row 33, so now they sit on top of the wall pm4-12 restored.

## Technical Approach
Both fixes are contained to `drawHud` (render.ts:575–593):
1. **Frame:** pass an open-mouth frame index for the life icon instead of `0` — e.g. `drawPacman(ctx, x, y, 'left', 2)` so it resolves to `PAC_FRAMES.left[2]` (sprite 44, flipX) — the authentic left-facing open-mouth reserve-life pose. (Do not change `drawPacman` itself; the actor path is correct.)
2. **Vertical anchor:** offset the HUD icons down by `(SPRITE_PX − TILE_PX)/2 = 4px` to cancel the actor-centring offset baked into `drawPacman`/`drawFruit`, so the 16px sprite fills rows 34–35 (y 272–288) exactly and clears the row-33 wall. e.g. anchor at `BOTTOM + (SPRITE_PX - TILE_PX)/2`. Apply the same correction to the fruit row (`drawFruit(..., MAZE.rows - 2, ...)`, render.ts:591), which shares the identical off-by-4 overlap.

Keep `LIFE_ICON_CAP = 5` (pacman.asm:2b41-2b62) and the fruit-row window unchanged.

## Scope
- In scope: the two `drawHud` defects (life-icon frame, HUD-icon vertical anchor for both lives and fruit) in `plugins/pac-man/src/shell/render.ts`.
- Out of scope: core/sim, sprite ROM decode (`gfx-rom.ts` / `sprite-data.ts` are correct — the same sprites render fine for the in-maze actor), the top HUD band, and the other pm5 groom stories.

## Acceptance Criteria
- Reserve-life icons render as an **open-mouth, left-facing Pac-Man** (the sprite-44 open frame), not a solid closed-mouth disc — assert `drawHud` blits an open frame for the life icon, not `PAC_CLOSED`/frame 0.
- Reserve-life icons and the fruit/level row sit **entirely within the bottom HUD band (rows 34–35)** and do **not** overlap the row-33 bottom border wall — assert the HUD icons' vertical extent falls at/below y 272 (the top of row 34), i.e. the −4px actor offset is compensated.
- No regression to the in-maze Pac-Man chomp animation, the top HUD band (SCORE / HIGH SCORE), the fruit row's sliding window/cap, or `LIFE_ICON_CAP`.

---
_Hand-authored 2026-08-16 from the display-bug diagnosis; not generated from the sprint YAML._
