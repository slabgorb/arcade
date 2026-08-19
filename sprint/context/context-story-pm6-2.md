# Story pm6-2 Context

> ⚠ **DO NOT REGENERATE THIS FILE.** The Technical Approach, Scope, Dependencies and
> Design Notes are Architect-enriched from the pm6 epic plan. `pf context create`
> refills Technical Approach/Scope with placeholder text and would overwrite them.
> (They were overwritten once during pm6-2 RED and restored during review rework —
> do not re-run `pf context create` against this story.)

> ⚠ **CORRECTION (TEA / Atia, pm6-2 RED) — the title's "ripped Blinky" is refuted by
> the ROM.** In ACT 1 the chased-back ghost is the **blue FRIGHTENED** Blinky (image
> `#1c`, `pacman.asm:1a70`/`:1aa1`), NOT a ripped one. The **ripped/torn** Blinky
> (`#32`/`#33`, `pacman.asm:162d`, gated on the ACT-2 sub-state var `4e07`) is pm6-3's
> act-2 scene — and the epic already assigns "ripped-ghost / nail" to act 2, so the ROM
> and the epic agree; only this title conflated them. **Dev: anchor act 1 to the
> blue-frightened Blinky, never a ripped sprite.** Full evidence + all verified cites are
> in the session's Design Deviations (`.session/pm6-2-session.md`). The ACs below are
> otherwise good and are copied verbatim — AC2's own wording is "big-Pac-chase," which
> the ROM satisfies.

## Title
Cutscene player + ACT 1 (Blinky chase): a deterministic scripted-actor animation player in plugins/pac-man/src/core, and the first coffee-break cutscene — Blinky chases Pac across the screen, then a big Pac turns and chases a ripped Blinky back. Consumes pm3 baked sprites (CONSUMED, no new bake). RED-anchor the actor paths/timing against the quarry (Decision C). Runs during the pm6-1 intermission phase; gentle animation, NO strobe (Decision B).

## Metadata
- **Story ID:** pm6-2
- **Type:** story
- **Points:** 5
- **Priority:** p3
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Pac-Man intermissions + kill screen (pm6): the three between-level coffee-break cutscenes (Blinky-chase, ripped-ghost, worm) and the authentic level-256 kill screen — deferred in the pm1/pm3 specs, never materialized after pm4 was retargeted to the cabinet lifecycle

## Problem
The cutscene framework + the iconic act-1 scene. A pure, seeded, clock-free scripted-actor player drives sprite positions/frames over the intermission; act 1 is Blinky chasing Pac left-to-right, then big-Pac chasing Blinky right-to-left. The animation timing/paths are RED-anchored to the vendored source + dossier before the reducer is named (Decision C). Reuses pm3 sprites. Gentle motion, no strobe.

## Technical Approach
The cutscene framework + the iconic act-1 scene.

- **A pure scripted-actor player.** A seeded, clock-free cutscene player in `src/core` drives
  sprite positions/frames over the pm6-1 intermission phase — a small scripted timeline
  (actor, path, frame cadence) evaluated per tick. Same seed → same cutscene bit-for-bit
  (purity.test.ts green).
- **Act 1.** Blinky chases Pac forward; then a big Pac turns and chases the **blue-frightened**
  Blinky back (the ROM's `#1c` frightened sprite — NOT a ripped one; see the CORRECTION
  banner). Uses **pm3 baked sprites** (consumed — no new bake).
- **RED-anchor the motion (Decision C).** The actor paths, speeds and durations are pinned at
  RED against the vendored source (`plugins/pac-man/reference/source/pacman.asm`) + the
  dossier before the reducer is named — a wrong animation in prose ships GREEN. What is not
  yet anchored is anchored, not invented; genuinely structural values (call-counts, table
  lengths) are marked honest-uncited, never given a fabricated address.
- **Accessibility (Decision B).** Gentle animation — no >3 Hz large-area luminance strobe;
  render via pm3 palette/tiles. Every cited constant → `citations.test.ts` claim.

## Scope
- **In scope:** the pure scripted-actor cutscene player, act 1 (Blinky-chase / big-Pac),
  RED-anchored constants + citations, the seeded-replay determinism test.
- **Out of scope:** acts 2 & 3 (pm6-3, on this same framework); the kill screen (pm6-4); any
  new sprite bake (pm3 shipped them).

## Acceptance Criteria
- AC1: a PURE, seeded, clock-free scripted-actor cutscene player in src/core drives sprite position/frame over the pm6-1 intermission phase; purity.test.ts stays green and the same seed replays the same cutscene bit-for-bit.
- AC2: act 1 (Blinky-chase then big-Pac-chase) plays with the actor paths/timing RED-anchored to the vendored source (plugins/pac-man/reference/source/pacman.asm) + the dossier and cited (Decision C — not fabricated); the sprites are pm3 baked graphics (CONSUMED, no new bake).
- AC3: every cutscene constant (durations, positions, frame cadence) carries a citations.test.ts claim; no un-cited src/core value; a mutation to a path/timing constant reddens an animation assertion (not a coverage check).
- AC4: the cutscene is a gentle animation with NO >3 Hz large-area luminance strobe (Decision B, the standing Pac-Man accessibility ruling); it renders via pm3 palette/tiles.

## Dependencies
- **pm6-1** — the `intermission` phase the cutscene player runs in.
- **pm3** — the baked sprites (Blinky, Pac, big-Pac) — consumed, no new bake.
- **Blocks:** pm6-3 (acts 2 & 3 reuse this scripted-actor player).

## Design Notes
- **Decision C:** RED-anchor the actor paths/timing to `pacman.asm` + the dossier before
  naming the reducer — a wrong animation ships GREEN otherwise (the pm3 identity-first law
  applied to motion).
- **Decision B:** gentle animation, no >3 Hz large-area strobe (the standing Pac-Man
  accessibility ruling). Seeded/deterministic; citations gated.

---
_Generated by `pf context create story pm6-2` from the sprint YAML._
