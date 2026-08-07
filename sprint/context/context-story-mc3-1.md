# Story mc3-1: Enemy warheads: ICBM straight-flight reducer, stateful cities/bases, and the minimal spawner

## Background

Plan tasks 1-3 (docs/superpowers/plans/2026-08-07-missile-command-mc3-core-loop.md). The enemy-side data model that mc3-2/3/4 all build on. (a) src/core/icbm.ts — a PURE reducer mirroring abm.ts: launchIcbm(origin,target)/stepIcbm(icbm) fly a straight line at unit speed from a top-edge origin to a ground target and snap on arrival. Cite UPDATE ICBM POSITIONS (W3MAIN); unit speed only (per-wave enemy-speed table is mc4). (b) src/core/field.ts (append, do not alter existing cited exports) — stateful City{pos,alive} and Base{pos,alive,ammo} plus createCities() (6 live) and createBases() (3 live, ammo=MAXMIS) and export const MAXMIS=10 (reuses existing claim MC-MAXMIS). (c) src/core/spawn.ts + claims/spawn.json — a MINIMAL seeded spawner (mc4 replaces it) driven by the REAL ROM mechanism: keep at most MXICON(7) on screen, launch while remaining budget NICBMS(8)>0 and the highest ICBM has fallen below LAUHGT(202/0xCA), placing each at a random top-edge column (seeded @shared/rng) aimed at a random live structure. New claims MC-NICBMS/MC-MXICON/MC-LAUHGT; replace any bare top-edge 256/210 with cited HMAX/TOPSCR-derived consts (grep them first) so the AC3 guard stays green. Depends on nothing new; blocks mc3-2/3/4.

> ⚠ Setup note (measured 2026-08-07):
> - **CLAIMS PATH:** the description writes `claims/spawn.json`, but this game's claims live at `plugins/missile-command/docs/rom-study/claims/`. The new spawner claim file is `plugins/missile-command/docs/rom-study/claims/spawn.json`. Do NOT create a top-level `plugins/missile-command/claims/` directory.
> - **Existing claims:** The reuse claim `MC-MAXMIS` exists (glossary + citations, W3COMN.MAC:29 = `MAXMIS=10.` decimal). New claims MC-NICBMS / MC-MXICON / MC-LAUHGT do not yet exist — expected.
> - **Template exports:** `abm.ts` exports `launchAbm(origin,target)` / `stepAbm(abm)` — the mirror template for `icbm.ts`.
> - **Field.ts exports:** `field.ts` already exports NCITY, START_CITIES, NMISBA, CITIES, BASES — APPEND City/Base/createCities/createBases/MAXMIS, do not alter these.
> - **New files:** `spawn.ts` does NOT yet exist — it's a new file (correct).
> - **Magic number guard:** There is currently NO bare `256`/`210` literal in `src/core/`. The description's "replace any bare top-edge 256/210 with cited HMAX/TOPSCR consts" is therefore a FORWARD guard on the new spawner (do not introduce bare magic top-edge numbers; use cited consts), not a cleanup of existing code. TOPSCR=222 (decimal) is the relevant cited value.

## Reference

- Plan: docs/superpowers/plans/2026-08-07-missile-command-mc3-core-loop.md (tasks 1-3)

## Acceptance Criteria

1. src/core/icbm.ts exists as a pure reducer (launchIcbm/stepIcbm): an ICBM launches parked at origin (arrived=false), closes on its target monotonically, snaps exactly to it on arrival, is idempotent once arrived, and does not mutate its input; icbm.test.ts passes and purity.test.ts stays green.
2. icbm.ts cites W3MAIN and the ICBM motion routine (UPDATE ICBM POSITIONS/UPDPOS) in a source-of-truth comment.
3. field.ts gains City/Base types and createCities()/createBases(): createCities() returns 6 live cities at the cited CITIES positions; createBases() returns 3 live bases at the cited BASES positions each with ammo=MAXMIS=10; the pre-existing field exports and their claims are unchanged.
4. src/core/spawn.ts exports NICBMS=8, MXICON=7, LAUHGT=202 and spawnIcbms(current,liveTargets,remaining,rng): never exceeds MXICON on screen; launches nothing when remaining=0 or no live targets; holds fire while a live ICBM is still above LAUHGT (screen non-empty); otherwise launches toward a random live target from a top-edge column and decrements the budget; deterministic for a given seed.
5. claims/spawn.json carries MC-NICBMS(8)/MC-MXICON(7)/MC-LAUHGT(202) with byte-exact verbatim from W3COMN.MAC, and any top-edge column/height constant is claim-backed; citations.test.ts (incl. the AC3 no-uncited-literal guard) and purity.test.ts pass for every new src/core module.
