# Story df4-1 Context

## Title
Collision core FIRST (RED first, TDD): plugins/defender/src/core/collision.ts — port the ROM COLIDE object-pointer-list box hit test (defender/DEFA7.SRC:2904-2907), the collision-picture return (RET+2=COLLISION PICT, defender/DEFA7.SRC:2553) and the screen-collision address model (CENTMP, defender/DEFA7.SRC:3008), exposed as the three cited query shapes: laser-vs-object (defender/DEFA7.SRC:2775-2787), bomb-vs-player (defender/DEFA7.SRC:2699), ship-vs-object (defender/DEFA7.SRC:3130-3142). Pure and clock-free, tested against SYNTHETIC object lists (no enemy needed yet); the shared seam every df4 enemy inherits. purity.test.ts stays green; every constant gated by a claims/*.json entry.

## Metadata
- **Story ID:** df4-1
- **Type:** story
- **Points:** 5
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Defender — the menagerie (phase 4b): one cited reducer per enemy, the shared collision seam, and the first effects that kill — with the photosensitivity accessibility exception decided here

## Problem
df3 gave us a ship flying a scrolling, wrapping world with lasers that fire and travel but **hit nothing**. df4 populates the world with enemies, and every one of them collides through a single shared seam. This story builds that seam FIRST — before any enemy exists — so each later enemy story (df4-3/4/5) inherits a ready, gated hit test rather than re-inventing one. It is RED-first and stands only on df1/df2/df3, all shipped.

The seam is not a generic collision library: it is a **port of the ROM's own** `COLIDE` object-pointer-list box test. This is Decision A (RULED, ROM-always-wins) in the design spec — a tidier quadtree/AABB would silently change *which overlaps count*, and routing ≠ geometry (the df3 lesson).

## Technical Approach
Port `COLIDE` (`defender/DEFA7.SRC:2904-2907`, banner `*COLLISION DETECT` at :2904) as a **pure reducer** in `plugins/defender/src/core/collision.ts`:

- **Object-pointer-list scan.** `COLIDE` walks the object pointer table and tests each candidate against a box. Model this as a scan over a **passed-in snapshot** of the object list plus the querying box — the function owns no shell state, reads no clock, allocates no globals.
- **Return the hit, not a boolean.** Return which object was hit *and* the collision picture, per `RET+2=COLLISION PICT` (`defender/DEFA7.SRC:2553`). Box-boundary cases (just-touching vs just-clear) are pinned by **coordinates**, not a bare boolean.
- **Screen-collision address model.** Port the `CENTMP` screen-address model (`defender/DEFA7.SRC:3008`) that `COLIDE` uses to locate the collision on screen.
- **Three distinct query shapes**, each a cited call site of `COLIDE`:
  | Query shape | ROM line | df4 meaning |
  |-------------|----------|-------------|
  | laser-vs-object | `defender/DEFA7.SRC:2775-2787` (`JSR COLIDE` @2787) | player laser hits an enemy |
  | bomb-vs-player | `defender/DEFA7.SRC:2699` | an enemy/mine hits the player |
  | ship-vs-object | `defender/DEFA7.SRC:3130-3142` (`JSR COLIDE` @3142) | player ship touches an enemy |
- **Named traversal.** A test names the object-list traversal so that a swap to a tidier structure that changes which overlaps count would redden (pins Decision A mechanically).
- **Tested against SYNTHETIC object lists.** No enemy is needed to build or test this — construct object lists by hand in the test and assert coordinate outcomes.
- **Citation gate.** Every constant introduced (box dimensions, the CENTMP model) gets a `claims/*.json` entry verifying byte-for-byte against `reference/original-source/defender/` under the df1-1 gate.

Consumes: df3 `world.ts` (display-space / `worldX` coordinate model the boxes live in). No `@shared` extraction — the collision model is the ROM's with no second consumer (the "extract on the second game" bar is not met).

## Scope
- **In scope:** `plugins/defender/src/core/collision.ts` as a pure, clock-free reducer; the three cited query shapes; coordinate-pinned box-boundary tests over synthetic object lists; the named-traversal test pinning Decision A; `claims/*.json` entries for every new constant; `purity.test.ts` stays green.
- **Out of scope:** any enemy reducer (df4-3/4/5); materialize/explode effects (df4-2); rendering/animation of a hit; the scanner and smart-bomb collision consumers (df5). This story wires no enemy — it is the seam they will all call.

## Acceptance Criteria
- AC1: plugins/defender/src/core/collision.ts exists as a PURE reducer (no fetch/canvas/Date/Math.random — purity.test.ts green) porting COLIDE (defender/DEFA7.SRC:2907) as an object-pointer-list scan over a passed-in snapshot; it returns the hit (which object, and the collision-picture per defender/DEFA7.SRC:2553), owning no shell state.
- AC2: the three cited query shapes are distinct and tested against SYNTHETIC object lists — laser-vs-object (defender/DEFA7.SRC:2775-2787), bomb-vs-player (defender/DEFA7.SRC:2699), ship-vs-object (defender/DEFA7.SRC:3130-3142) — with box-boundary cases (just-touching vs just-clear) pinned by COORDINATES, not just a boolean (routing != geometry, the df3 lesson).
- AC3: every collision constant introduced (box dimensions, the CENTMP screen-address model per defender/DEFA7.SRC:3008) has a claims/*.json entry that verifies byte-for-byte against reference/original-source/defender/ under the df1-1 gate; no un-cited src/core constant.
- AC4: the model is the ROM object-list scan, NOT a re-derived quadtree/AABB library — a test names the object-list traversal so a swap to a tidier structure that changes which overlaps count would redden (Decision A).

## Dependencies
- **df1** — dossier + citation gate (df1-1) + src/core purity test.
- **df2** — framebuffer render seam, palette, charset, object/terrain tables (INERT).
- **df3** — scheduler, world/camera coordinate model (`worldX`), ship, stars, laser (the thing that finally hits).
- **Blocks:** df4-3, df4-4, df4-5 all consume this seam; build it first.

## Design Notes
- **Decision A (RULED):** design spec §2 — port COLIDE's object-list model, do not re-derive. Full rationale: `docs/superpowers/specs/2026-08-16-defender-df4-menagerie-design.md`.
- **Line numbers from tool output only; RASM radix** (`$hex` vs bare decimal) — the standing df* citation traps.

---
_Generated by `pf context create story df4-1` from the sprint YAML._
