# Story df3-2 Context

## Title
World-wrap coordinate model + camera slide (the epic's riskiest seam): plugins/defender/src/core/world.ts — the BGL camera (defender/PHR6.SRC:215) + BGLX prev (defender/PHR6.SRC:216), the 16-bit HORIZONTAL WRAP at $10000, the pure worldX(entity)=onscreen+bgl helper (PLABX, defender/DEFA7.SRC:2432-2440), the SHIP-LEADS-SCROLL slide ported line-for-line (BGDELT / PV1..PV12, base $20 fwd / $70 rev, ±$40 step / ±$100 clamp, defender/DEFA7.SRC:2373-2431), and the vertical strip rule (YMIN=42 / YMAX=240, defender/PHR6.SRC:20-21; player-CLAMP DEFA7.SRC:2450,2461 vs object-WRAP DEFA7.SRC:2490-2496).

## Metadata
- **Story ID:** df3-2
- **Type:** story
- **Points:** 5
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Defender — the ship + the scheduler (phase 4a)

## Problem

Defender's scrolling, wrapping world + camera is the hardest coordinate problem in
the whole cabinet — no sibling has one (Joust is single-screen). It is also the
seam where fidelity most easily dies quietly: the camera *slide* is defined in
**display** space, so a plausible "world-absolute" rewrite passes a "did it scroll?"
test while the ship-leads offset or the slide clamp is subtly wrong. This story
lays the coordinate model down **in core, ported from the ROM line-for-line**, so
every later df3/df4 actor sits on citable ground.

## Technical Approach

**This is not a design fork.** Port the ROM's own representation (`ROM-always-wins`);
do not re-derive a tidier one whose math can't be cited.

- **The camera.** `BGL` "TERRAIN LEFT POINTER" (`defender/PHR6.SRC:215`) = the
  world-X of the screen's left edge. `BGLX` "OLD TERRAIN LEFT" (`defender/PHR6.SRC:216`)
  = last frame's camera, used to compute the per-frame scroll delta objects and
  stars ride. Both 16-bit.
- **The world is a 16-bit horizontal cylinder.** `BGL` and every world-X wrap at
  `$10000` with no explicit clamp — arithmetic on `Uint16`/`& 0xFFFF`.
- **Absolute world X is derived, not stored.** `worldX(entity) = onscreenX + BGL`,
  a pure helper matching `PLABX` (`defender/PHR6.SRC:335`; the ROM computes it at
  `defender/DEFA7.SRC:2432-2440` as `(PLAX16 >> ~2, masked $E0) + BGL`; init
  `#$2000!>2 + BGL` at `defender/DEFA7.SRC:1274-1276`).
- **The ship leads the scroll (the risky part).** `PLAY1`
  (`defender/DEFA7.SRC:2373-2431`) maps the ship's velocity to a target screen
  column — base `$20` facing-right (`PLADIR` positive), `$70` facing-left — then
  drives `BGDELT` (`±$40` slide steps, whole thing clamped to a `±$100` window) and
  accumulates `BGL += PLAXV − BGDELT` (`defender/DEFA7.SRC:2429-2431`). Port the
  `PV1..PV12` branch ladder as-is.
- **Vertical is a clamped strip, not a cylinder.** `YMIN=42` / `YMAX=240`
  (`defender/PHR6.SRC:20-21`, **decimal**). Player Y **clamps** to `[YMIN+1,238]`
  (`PLAUP`/`PLADN`, `defender/DEFA7.SRC:2450,2461`); object Y **wraps** at
  `[YMIN,YMAX]` (`VELO`, `defender/DEFA7.SRC:2490-2496`). Model both — do not share
  one "wrap Y" path.

Pure module; no scheduler dependency of its own (df3-3 wires the ship process to it).

## Scope

- **In scope:** `world.ts` — `bgl`/`bglx` camera state, 16-bit wrap, `worldX`
  helper, the ship-leads slide (`BGDELT`/`PV1..PV12`), the vertical clamp-vs-wrap
  helpers. Unit-tested in isolation.
- **Out of scope:** the ship's velocity/thrust machinery (df3-3 consumes this
  model), stars/laser (df3-4/5), any enemy world logic (df4).

## Acceptance Criteria

- [ ] `plugins/defender/src/core/world.ts` exists with `bgl`/`bglx` camera state and
      a **pure** `worldX(entity)` helper (`= onscreen + bgl`), unit-tested alone.
- [ ] The horizontal world **wraps at `$10000`**: a world-X advanced past `$FFFF`
      re-enters at the low end (pinned with explicit values), no clamp.
- [ ] **Coordinates are pinned, not just direction** (`routing != geometry`): a test
      asserts the exact `BGL` after N ticks of a known thrust input, AND the ship's
      target screen column at max velocity is `$20`-based facing-right vs `$70`-based
      facing-left (`defender/DEFA7.SRC:2385,2389`).
- [ ] The slide clamp is pinned: `BGDELT` steps are `±$40` and the slide window is
      `±$100` (`defender/DEFA7.SRC:2400-2431`); a mutant on either bound reddens.
- [ ] Vertical **two rules** are both pinned: player Y clamps `[YMIN+1,238]`; object
      Y wraps `[YMIN,YMAX]` — with `YMIN=42`/`YMAX=240` verified **decimal**.
- [ ] Every constant (`$20`/`$70`/`$40`/`$100` hex; `YMIN`/`YMAX` decimal) is backed
      by a `claims/*.json` entry, byte-verified by `citations.test.ts`.
- [ ] `purity.test.ts` green; comments cite `defender/<FILE>.SRC:<line>`.

## References

- **Epic context:** `sprint/context/context-epic-df3.md` — "THE core model" + guardrail 1 (routing≠geometry) and 2 (two vertical rules).
- **Design spec:** `docs/superpowers/specs/2026-08-15-defender-df3-ship-scheduler-design.md` §2, §4 (df3-2), §5.
- **Camera/world source:** `PHR6.SRC:215` (BGL), `:216` (BGLX), `:335` (PLABX), `:20-21` (YMAX/YMIN); `DEFA7.SRC:2373-2431` (PLAY1/PV1..PV12 slide), `:2432-2440` (PLABX calc), `:1274-1276` (init), `:2450,2461` (player clamp), `:2490-2496` (object wrap).
- **Memory:** `renderer-migration-routing-vs-geometry` (pin coordinates), `rom-always-wins-dont-ask` (port, don't re-derive).
- **Gates:** `citations.test.ts`, `purity.test.ts` (df1-1).

---
> **Architect-verified anchors** (current tree, 2026-08-15): `PHR6.SRC:215` = `BGL RMB 2 TERRAIN LEFT POINTER`, `:216` = `BGLX RMB 2 OLD TERRAIN LEFT`, `:335` = `PLABX RMB 2`, `:20` = `YMAX EQU 240`, `:21` = `YMIN EQU 42`; `DEFA7.SRC:2385` = `LDA #$20 +BASE`, `:2389` = `LDA #$70 -BASE`. Expect a Reviewer mutation battery over the slide math — this is the epic's riskiest seam. TEA re-pins at RED.

_Generated by `pf context create story df3-2`; body authored by Architect (df3 design spec)._
