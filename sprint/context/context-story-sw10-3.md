# Story sw10-3 Context

## Title
Migrate the trench phase to the ROM-native world basis — sim scroll/collision index+sign flips, channel/detail/obstacle/wedge generators to native output, and trench-furniture model bakes (sw10-1 AC#2 remaining phase)

## Metadata
- **Story ID:** sw10-3
- **Type:** refactor
- **Points:** 5
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Star Wars projection & fire-frame fidelity

## Problem

**Background (sw10-1 AC#2 remaining phase):**
Story sw10-1 unified the lens to be authentic (symmetric ~90° FOV, divide-by-depth, native X-fwd/Y-right/Z-up world basis) and retired the per-model *_ORIENT axis hacks for SPACE and SURFACE phases. The TRENCH phase migration was carved out to sw10-3 as an approved scope split — the 13 red test files (trench/exhaust-port/port-arming) are deliberate deferrals, not regressions.

This story completes AC#2's remaining phase: migrate the trench sim (scroll/collision indices + sign flips), trench generators (channel/detail/obstacle/wedge), and trench-furniture model bakes (EXHAUST_PORT, TRENCH_TURRET, SQUARE, CATWALK) to the native world basis, turning those 13 red tests green.

## Technical Approach

The native remap is proven (via sw10-1 DEV progress markers): `toNative([x,y,z]) = [-z,x,y]` (basis.ts, pure). The frozen convention applies verbatim to the trench:

1. **Trench SIM layer** (`sim.ts` `stepTrench` ~1294–1730):
   - `trenchView` indices: `[lateral, height, 0]` → native `[0, right, up]`
   - Scroll direction: `pos[2] + SCROLL` → `pos[0] - SCROLL` (depth axis sign flip)
   - Despawn condition: `pos[2] > 0` → `pos[0] < 0`
   - All subsequent consumers (onFieldSide, inBand, inDepth, fire-range, window, reachedCockpit) reindex accordingly
   - Keep `sim.ts` net-line-neutral or re-anchor citations (53/53 gate remains active)

2. **Trench generators** (native output):
   - `trench-channel.ts`: rails and ribs permuted to native via `toNative` (author-native like surfaceGrid)
   - `trench-detail.ts`: wall panels permuted to native
   - `trenchFarEnd`: cap permuted to native
   - `trench-obstacles.ts`: OBSTACLE_STATIONS and WALL_SLOT spawns permuted to native
   - `trench-wedges.ts`: spawnPort and portDistance adapted to native indices

3. **Trench render path** (`render.ts` trench block ~530–567):
   - `trenchPlacement` port placement permuted to native via `toNative`
   - `EXHAUST_PORT`, `TRENCH_TURRET`, `SQUARE`, `CATWALK` models **baked to native** (drawn with IDENTITY orient, so models must embed the remap)
   - Port arrow reads native depth

4. **Model bakes** (`models.ts`):
   - EXHAUST_PORT (ROM `.WP PORT`): add `bakeRom` to native and update `romCompare` ROM_TO_BAKE
   - TRENCH furniture (TURRET/SQUARE/CATWALK): authored here (not ported), confirm if in romCompare

5. **Test sweep** (~24 trench files):
   - Position-literal sweep: seat `[lat,vert,-D]` → `[D,lat,vert]`, depth reads, up/right index flips, velocity signs
   - Dev-owned orient/nose/axis-semantic tests (no parallel agents for these)
   - The 13 currently-red files will turn green; no space/surface regression expected

## Scope
- In scope: trench phase migration to native basis (sim + generators + render + model bakes + tests)
- Out of scope: exhaustPort re-derivation from ROM (AC#5 deferral, → sw10-2); space/surface (already done by sw10-1)

## Acceptance Criteria

**AC#1 — Trench SIM migrated to native indices:**
- `trenchView` reads native right (Y-axis) and up (Z-axis)
- Scroll advances native depth (X-axis), despawn on native X sign boundary
- All collision/position consumers (onFieldSide, inBand, inDepth, fire-range, window, reachedCockpit) reindex correctly
- `npm run lint` clean; citation gate 53/53; net-line-neutral `sim.ts`

**AC#2 — Trench generators and render emit native coordinates:**
- `trench-channel`, `trench-detail`, `trenchFarEnd`, `trench-obstacles`, `trench-wedges` all permute output via `toNative`
- Port placement and floor render native depth
- `EXHAUST_PORT`, `TRENCH_TURRET`, `SQUARE`, `CATWALK` models baked to native (world space)
- romCompare audits updated for baked models

**AC#3 — Trench test suite turns green (13 files):**
- All ~24 trench-phase test files sweep position literals to native
- Orientation/nose tests updated per dev-owned conventions (conjugate for dynamic, P-multiply for static)
- Full suite: 2328 passed, 0 failed in trench/port/exhaust-port domains (up from 52 failed / 13 files)

**AC#4 — Line-anchor tax managed:**
- Every edit to `sim.ts`/`gameRules.ts`/`trench-obstacles.ts` keeps net-line-neutral or re-anchors per `tools/audit/reanchor-citations.mjs`
- Citation gate stays green (53/53); checkTree audit clean

## Critical Notes

- **Line-anchor sensitivity:** star-wars `sim.ts` and `gameRules.ts` are comment-citation anchored and supply line-number refs to test fixtures (sw8-27). Edits that change line count must re-anchor — use `pf audit reanchor-citations` after all sim changes complete. The frozen citation `trenchGunFireVelocity` in `gameRules.ts:84` is ALREADY NATIVE (fixed by sw10-1 dev); migrate only its TRENCH CALLER, do NOT double-flip. See `[[star-wars-sim-edit-reanchor-tax]]` memory entry.

- **Deferred design docs:** State/sim comments in state.ts:870–872, sim.ts:1563–1564, trench-obstacles.ts:82–84 carry falsified 60°/30° FOV rationale (now π/2). These annotate AC#1's sim migration — fold corrections into this story's AC#1 (rationale re-derived per native basis, not deferred).

- **Placement constants:** SPAWN_DISTANCE, trench dimensions, camera height re-expression from OpenGL to native (axis flip only, no re-derivation). Documented in sw10-1 session: AC#5 holds the re-derivation deferral (→ sw10-2).

- **Dev pattern:** Static model bakes use `P · orient_old` (not conjugate); dynamic flight models use `P · M · Pᵀ` conjugate. Proven in sw10-1 (`basis.ts`, `models.ts`, scratch proofs). Apply both correctly per context.

---
_Generated by `pf context create story sw10-3` from the sprint YAML._
