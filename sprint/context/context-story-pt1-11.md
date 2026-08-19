# Story pt1-11 Context

## Title
star-wars: difficulty selector missing its death-star illustrations, and the easy/medium/hard hit regions are offset left

## Metadata
- **Story ID:** pt1-11
- **Type:** bug
- **Points:** 2
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Playtest bug sweep 2026-08-19 (pt1)

## Problem
Playtest 2026-08-19: (a) no death-star illustrations on the difficulty tiers;
(b) the hit region is misaligned — you must hover LEFT of 'easy'.

## Findings (research complete — both halves root-caused)

**(b) The offset is a SCALE mismatch — 1.667× — between two maps of the same
quantity.** `shell/input.ts:22-25` maps mouse→aim over the full canvas
(`x = w/2 + aim·(w/2)`), but `drawSelect` (`render.ts:1688-1707`) draws labels at
`x = w/2 + aim·(0.3w)` (`:1698-1699`). Hit test: `sim.ts:867-882`
`hoverFromAim` — nearest choice within `SELECT_HIT_RADIUS = 0.18` in AIM units;
choices at `aim = [-0.5,-0.3]/[0,-0.3]/[0.5,-0.3]` (`state.ts:383-387`). Worked
example for EASY: drawn at `(0.35w, 0.59h)`; the aim value under that pixel is
`(-0.30,-0.18)`; distance to the hover centre = 0.233 > 0.18 → NOT hovering; the
circle lies further LEFT — exactly the report. MEDIUM's error (0.12) is inside
the radius, which is why only EASY/HARD feel broken. `drawSelect`'s own docstring
claims draw and hit-test agree — the `× 0.3` breaks the claim. (A third map,
`ndcToScreen`'s square, offsets the drawn RETICLE too at non-square windows —
pt1-4's square canvas removes that axis of disagreement.)

**(a) The arcade DID show death stars, and we already own the geometry.**
`WSMAIN.MAC:1039-1145` (SELECT A DEATH STAR): per choice the phase draws
`VJBMIN` — the MINIATURE BASE vector picture (`WSVROM.MAC:2658 BMIN:`, trench
chord + green disc), positions from `TDTH` (`.WORD 100.,-400. / -300.,000. /
100.,400.` — the 5-star picker rows are commented out). We already export the
model family: `models.ts:855-863` `DEATH_STAR`/`DEATH_STAR_TRENCH`/
`DEATH_STAR_DISH` (finding M-010, remediated sw7-15), and `render.ts:428-434`
`drawDeathStar()` strokes them in ROM colours. **No new model data needed** —
draw three small `drawDeathStar` billboards at the choice positions.

**Authentic layout details worth adopting (or consciously deviating):**
- The ROM's three stars are NOT collinear — EASY (−400,+100), MEDIUM (0,−300),
  HARD (+400,+100); ours are all at `aim.y = −0.3`.
- Missing chrome: `WAVE 1/3/5`, `NO BONUS`/`BONUS`, `400,000`/`800,000` per tier
  and the live COUNTDOWN digit (`PH.TIM/32`, `WSMAIN.MAC:1085-1099`) — positions
  in `TCMES.MAC:582-593`.
- ROM hit region is an axis-clipped diamond centred on the ILLUSTRATION
  (`WSMAIN.MAC:1102-1120`: |dy| < 72, |dx| < 52, sum < 80), tested against the
  same site the cursor draws at (`VWSITC` `:1083`) — draw and hit share one
  origin BY CONSTRUCTION, which is the structural lesson for the fix.
- Hover recolours the CURSOR (turquoise→yellow, `:1077-1082`); we highlight the
  label — fine, note it.
- Timeout default-to-EASY already ported (`state.ts:367`, `sim.ts:898-902`).

## Technical Approach
1. **One aim→screen map.** Make `drawSelect` place labels/illustrations through
   the SAME mapping `input.ts` uses (aim·(w/2), or a shared pure helper) so the
   `SELECT_HIT_RADIUS` circle sits on the drawn pixels by construction — the
   core/shell split demands reconciliation through a shared pure mapping, not a
   canvas measurement (`tests/core/core-purity.test.ts`).
2. Add the three `drawDeathStar` billboards at the choice positions (+ the
   WAVE/BONUS captions if adopting the full ROM chrome — recommended, it's all
   cited above).
3. Consider adopting the ROM's non-collinear `aim` values while at it (choices
   are core data `state.ts:383-387`; typed as "Dev's tunable pick geometry") —
   re-check `SELECT_HIT_RADIUS` non-overlap if moved.
4. Sequencing: after pt1-4 if possible (kills the third map); the scale fix is
   independent and can land first regardless.

## Scope
- In scope: draw/hit unification, illustrations, optionally the tier chrome +
  non-collinear layout.
- Out of scope: start semantics (pt1-10 — but note its select rising-edge guard
  touches the same `stepSelect`); canvas sizing (pt1-4).

## Tests affected
- `tests/shell/render.select-death-star.test.ts` — copy-only today; **the RED
  test is the gap itself:** for every choice, the pixel the label draws at must
  invert (through input.ts's own mapping) to an aim inside `SELECT_HIT_RADIUS`.
- `tests/core/select-death-star.test.ts` + `tests/support/select.ts` — feed
  `choice.aim` directly (position-agnostic) — survive a render-side fix; re-check
  radius overlap if `aim` values move.
- `tests/shell/render.death-star-picture.test.ts` (M-010 three-pen contract) —
  only if `drawDeathStar` itself is refactored.
- Citations: `ours` frozen at `3580752`; new chrome cites WSMAIN/TCMES lines above.

## Acceptance Criteria
_TEA to define at RED. Suggested: AC1 hovering the drawn label/star selects it —
draw→aim inversion inside the hit radius for all three choices at multiple window
shapes; AC2 each tier shows its miniature death star (VJBMIN-derived models);
AC3 tier chrome (WAVE/BONUS values) matches the cited ROM screen or is logged as
a deviation; AC4 the timeout default-to-EASY still holds._

---
_Generated by `pf context create story pt1-11`; researched and expanded by Architect 2026-08-19._
