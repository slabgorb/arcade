# Story pm6-4 Context

> ⚠ **DO NOT REGENERATE THIS FILE.** The Technical Approach, Scope, Dependencies and
> Design Notes are Architect-enriched from the pm6 epic plan. `pf context create`
> refills Technical Approach/Scope with placeholder text and would overwrite them.

## Title
The level-256 kill screen: the authentic right-half tile/glyph CORRUPTION when the internal level counter rolls past a byte. Model it pure in core (the level byte, pacman.asm:6075 'ld a,(#4e13)'; behaviour docs/rom-study/glossary.md:392) and render the garbled right half. Retire the level.ts:63/:140 'out of scope' stubs. ACCESSIBILITY: render the corruption STATIC/faithful, NOT strobing (Decision B — accessibility outranks ROM fidelity).

## Metadata
- **Story ID:** pm6-4
- **Type:** story
- **Points:** 3
- **Priority:** p3
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Pac-Man intermissions + kill screen (pm6): the three between-level coffee-break cutscenes (Blinky-chase, ripped-ghost, worm) and the authentic level-256 kill screen — deferred in the pm1/pm3 specs, never materialized after pm4 was retargeted to the cabinet lifecycle

## Problem
The famous split-screen kill screen: at level 256 the level counter rolls and the right half of the maze renders as corrupted glyphs (the game becomes unplayable — the authentic bug). Model the roll + the corrupted-tile region purely, render it via pm3 tiles, and retire the two level.ts stubs that flag it out-of-scope (plugins/pac-man/src/core/level.ts:63, :140). Decision B: the corruption is a STATIC garbled tilemap, never a strobe.

## Technical Approach
The famous split-screen kill screen — modelled pure, rendered **static** (accessibility).

- **Model the roll.** At level 256 the internal level counter rolls past its byte and the
  right half of the maze renders as corrupted glyphs (the game becomes unplayable — the
  authentic bug). Model the roll + the corrupted-tile region purely in `src/core`, cited to
  the level-byte read `pacman.asm:6075` (`ld a,(#4e13) ; Load level #`) and the behaviour doc
  `docs/rom-study/glossary.md:392`. A test pins it fires at the authentic level, not before.
- **Render via pm3 tiles.** The corrupted right half is drawn from pm3 baked tiles as a
  garbled tilemap; the left half stays playable-looking per the bug.
- **Accessibility (Decision B) — the load-bearing constraint.** The owner has photosensitive
  epilepsy; the corruption renders **STATIC**, never a >3 Hz large-area strobe. If the
  authentic behaviour would flicker, render the safe static variant and log a Design
  Deviation citing the accessibility ruling (as pm4's safety-strobe removal already did).
- **Retire the stubs.** Remove the `plugins/pac-man/src/core/level.ts:63` and `:140`
  "out of scope, epic pm1's DEFERRED list" comments — the deferral is now implemented.

## Scope
- **In scope:** the pure level-256 roll + corruption model (cited), the static garbled-tile
  render via pm3, the accessibility static-not-strobe guarantee (+ deviation if needed),
  retiring the two `level.ts` stubs.
- **Out of scope:** the intermissions (pm6-1..pm6-3); a strobing/flickering kill screen
  (Decision B forbids it); new tile bakes (pm3 shipped them).

## Acceptance Criteria
- AC1: the level-256 roll is modelled pure in core — the internal level byte rolling past its range (pacman.asm:6075 'ld a,(#4e13) ; Load level #'; behaviour docs/rom-study/glossary.md:392, cited) triggers the right-half tile/glyph corruption; a test pins it fires at the authentic level, not before; purity.test.ts stays green.
- AC2: the corrupted right half renders via pm3 baked tiles (CONSUMED) as a STATIC/faithful garbled tilemap; the left half stays playable-looking per the authentic bug; every corruption constant carries a citations.test.ts claim under the gate.
- AC3: ACCESSIBILITY (Decision B, the standing Pac-Man ruling): the kill screen has NO >3 Hz large-area luminance strobe — it is static; if the authentic behaviour would flicker, the safe static variant renders and the substitution is logged as a Design Deviation citing the accessibility ruling.
- AC4: the plugins/pac-man/src/core/level.ts:63 and :140 "out of scope, epic pm1's DEFERRED list" stubs are retired (the deferral is now implemented); no un-cited src/core value remains.

## Dependencies
- **pm3** — the baked tiles the corrupted right half renders from — consumed.
- **`level.ts`** — the module modelling the level table; retire its `:63`/`:140` out-of-scope
  stubs here.
- **Independent** of pm6-1..pm6-3 (a separate deferred item) — can be built in parallel.
- **Blocks:** pm6-5 (the playtest captures the kill screen).

## Design Notes
- **Decision B is load-bearing:** the corruption renders STATIC, never a strobe — the owner
  has photosensitive epilepsy and accessibility outranks ROM fidelity; a flickering-authentic
  variant is substituted for a static one and logged as a Design Deviation.
- Cited to `pacman.asm:6075` + `glossary.md:392`; retire the two `level.ts` stubs.

---
_Generated by `pf context create story pm6-4` from the sprint YAML._
