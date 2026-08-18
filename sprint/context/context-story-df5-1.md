# Story df5-1 Context

> ⚠ **DO NOT REGENERATE THIS FILE.** The Technical Approach, Scope, Dependencies and
> Design Notes are Architect-enriched from the df5 design spec. `pf context create`
> refills Technical Approach/Scope with placeholder text and would overwrite them.

## Title
Scanner core FIRST (RED first, TDD): plugins/defender/src/core/scanner.ts — port the ROM SCNR world->radar projection (*SCANNER defender/AMODE1.SRC:1180, bezel *SCANNER BEZEL :1225, vector JMP SCNR :115, init JSR SCINIT :476), reading the df3 world.ts model; every live object -> a blip (radar position + palette INDEX), with the $10000 horizontal wrap seam correct. Pure and clock-free, tested against SYNTHETIC object lists BEFORE any HUD draws it — the projection every later df5 story and df7's HUD inherit. NOT a re-derived minimap (Decision A). purity.test.ts stays green; every constant gated by a claims/*.json entry.

## Metadata
- **Story ID:** df5-1
- **Type:** story
- **Points:** 5
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Defender — game structure & the scanner (phase 4c): waves, scoring + extra men, the humanoid rescue loop and the planet-explodes-to-mutant-space panic, the two emergency powers (smart-bomb + hyperspace, citing ADR-0005), and the pure end-of-game core

## Problem
Decision A: ROM-always-wins. The scanner is a projection of the df3 world.ts model (BGL camera + $10000 wrap + worldX helper), not a second coordinate system — collision (df4-1) and the scanner read the SAME model (the df4 spec named this). A cleaner "world width / radar width" minimap would silently misplace the wrap seam and the off-camera attackers the player relies on the radar to see (routing != geometry, the df3 lesson). Pure; reads df3 world.ts; colour by df2 palette index only.

## Technical Approach
Port `SCNR` (`AMODE1.SRC:1180`, banner `*SCANNER :1178`) as a **pure projection** in
`plugins/defender/src/core/scanner.ts`:

- **Read the `df3` `world.ts` model — own no coordinate system.** Consume a passed-in world
  snapshot (ship, enemies, humanoids, lasers) through `world.ts` (BGL camera, the `$10000`
  horizontal wrap, `worldX(entity)=onscreen+bgl`). Pure — no clock, no globals.
- **Project world → radar strip.** Compress the full `$10000` world onto the radar strip
  width, plotting every live object as a blip at its radar-space position. The wrap seam is
  the ROM's: an object just past the `$10000` wrap plots on the correct side of the strip,
  not off the end.
- **A blip is position + palette INDEX.** Each blip carries a `df2` palette index (by object
  kind), never a hex colour. The shell (df7 HUD) draws them; `scanner.ts` returns data.
- **Bezel geometry.** Port the scanner bezel (`*SCANNER BEZEL AMODE1.SRC:1225`) dimensions
  as cited constants.
- **Named-projection test (pins Decision A).** A test names the `worldX`/`$10000`-wrap
  projection so a swap to a naive width-ratio minimap that moves the wrap seam or the
  off-camera blips reddens.
- **Synthetic-first.** Build and test against hand-constructed object lists — no enemy or
  HUD needed. Assert blip **coordinates**, not booleans.
- **Citation gate.** Every constant (strip dims/scale, the wrap modulus, bezel) → a
  `claims/*.json` entry byte-verified under the df1-1 gate.

Consumes `df3` `world.ts`. No `@shared` extraction — the projection is the ROM's with no
second consumer.

## Scope
- **In scope:** `scanner.ts` as a pure, clock-free projection of `df3` `world.ts`; the blip
  list (radar position + palette index) for every live object; the `$10000` wrap seam pinned
  by coordinates; the named-projection test pinning Decision A; bezel constants;
  `claims/*.json` for every constant; `purity.test.ts` green.
- **Out of scope:** the HUD render that draws the blips (df7); radar bezel art beyond
  geometry constants; any new enemy or effect; smart-bomb/hyperspace (df5-5). Scanner
  returns data — it paints nothing.

## Acceptance Criteria
- AC1: plugins/defender/src/core/scanner.ts exists as a PURE reducer (no fetch/canvas/Date/Math.random — purity.test.ts green) porting SCNR (defender/AMODE1.SRC:1180) as a projection of the df3 world.ts model; given a world snapshot it returns a blip list (radar-space position + palette index per object), owning no shell state.
- AC2: the projection is tested against SYNTHETIC object lists with the $10000 horizontal wrap seam pinned by COORDINATES (an object just past the wrap plots on the correct side of the radar strip), not just a boolean — an object off the visible camera still appears on the scanner at the right radar position.
- AC3: every scanner constant introduced (radar strip dimensions/scale, the wrap modulus, bezel geometry per defender/AMODE1.SRC:1225) has a claims/*.json entry verifying byte-for-byte against reference/original-source/defender/ under the df1-1 gate; no un-cited src/core constant; blip colour is a df2 palette INDEX, never a hex literal.
- AC4: the model is the ROM SCNR projection reading world.ts, NOT a re-derived minimap — a test names the world-model projection (worldX/$10000 wrap) so a swap to a naive width-ratio mapping that moves the wrap seam or the off-camera blips would redden (Decision A).

## Dependencies
- **df1** — dossier + citation gate (df1-1) + `src/core` purity test.
- **df2** — palette (blip colour by index) + framebuffer.
- **df3** — `world.ts` (the model projected) + scheduler.
- **Blocks:** `df5-7` (visual playtest shows the populated scanner); df7's HUD renders it.

## Design Notes
- **Decision A (RULED):** design spec §3 — port `SCNR`'s projection, do not re-derive a
  minimap. Full rationale: `docs/superpowers/specs/2026-08-17-defender-df5-game-structure-scanner-design.md`.
- Colour by `df2` palette **INDEX** only; line numbers from tool output only; RASM radix
  (`$hex` vs bare decimal) — the standing df* traps.

---
_Generated by `pf context create story df5-1` from the sprint YAML._
