# Story sw4-3 Context

## Title
Surface maze port — transcribe WSGRND.MAC TOWER MAZES into pure-data src/core/surfaceMazes.ts (per-wave TOWER/BUNKER/BISHOP hex coords, prefix structure base⊂T3, TTWRS counts, wave→maze map); replace random turret spawns with the fixed authored field scrolling in; reconcile TTWRS vs byte_98CB quota in-story (spec §C)

## Metadata
- **Story ID:** sw4-3
- **Type:** story
- **Points:** 5
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** star-wars
- **Epic:** Star Wars — world-metric & threat restoration (1983 source-true distances)

## Authoritative Sources (read these first)
1. **Design spec §C** (spec-authority): `star-wars/docs/superpowers/specs/2026-07-11-world-metric-threat-restoration-design.md` — section §C is the source of truth for this story.
2. **Epic context** (sprint-side distillation): `sprint/context/context-epic-sw4.md` — see the sw4-3 story block and "Cross-story constraints & guardrails".
3. **ROM source:** `~/Projects/star-wars-1983-source-text/WSGRND.MAC` (LF-normalized greppable copy) — `TOWER MAZES` section: per-wave `TOWER`/`BUNKER`/`BISHOP` maps (top view, X ±right / Y forward, hex coords) and `TTWRS` counts. Wave→maze map lives in source comments (e.g. `TBUNK` = wave 2 bunkers-only; `TDIFF`=07; `T3DIFF`=16).

## Problem
The surface wave currently spawns turrets **randomly** at compressed distance (~1,200; ~26× too shallow vs the ROM's `$7C00` reach) with an **invented** layout. The 1983 ROM ships a **hand-authored per-wave tower maze** (`WSGRND.MAC` `TOWER MAZES`). This story replaces the random spawner with the real authored field, ported as data.

## Technical Approach
- **New pure-data module** `src/core/surfaceMazes.ts` — data only, in the spirit of `models.ts`. Transcribe each maze as entries `{ x, y, kind: 'tower'|'bunker'|'bishop', typeDigit }`.
- **Coordinate mapping:** source frame X ±right / Y forward (hex) → our X lateral / −Z depth, **UNSCALED** (`models.ts` already uses raw ROM units, so ROM distances port 1:1).
- **Prefix structure:** each maze's `T3*` extended form appends after a mid-table `MAZEND`. Encode this as **one entry list + two lengths** (base length ⊂ T3 length), not two duplicated lists.
- **Wave→maze map** and **`TTWRS` counts** ported from source comments/tables.
- **Sim change:** the maze is a **fixed field** at authored coordinates that translates in with the *existing* surface scroll — entities are **not** spawned one-by-one. Remove/replace the random turret spawner.
- **Rendering/collision:** bunkers and bishops ride the **existing tower render/collision path** (bunker model already exists per sw3-11). No new render path.

## In-Story Reconciliation Decision (required)
sw3-3's `byte_98CB` towers-remaining quota vs the mazes' `TTWRS` counts. **If they disagree for a wave, MAZE DATA WINS for placement.** Quota reconciliation is an in-story decision, documented as a deviation in the session file (already stubbed under "Design Deviations").

## Scope
**In scope:** the pure-data maze module; unscaled coordinate transcription with preserved prefix structure; wave→maze map + TTWRS; replacing the random turret spawner with the fixed translating field; TTWRS↔byte_98CB reconciliation (maze wins).

**Out of scope:** turret/tower **fire** behavior (aim, cadence) — **placement only**. Sibling scope must not be absorbed: sw3-1 (score values incl. fireball 33), sw3-7 (trench PRNG), sw3-15 (exhaust-port window), space-wave constants (sw4-1/sw4-2).

## Acceptance Criteria
1. **`src/core/surfaceMazes.ts` exists as pure data** (no sim/render imports) transcribing `WSGRND.MAC` `TOWER MAZES` as `{ x, y, kind, typeDigit }` entries.
2. **Geometry is EXACT and unit-tested:** transcribed maze coordinates and `TTWRS` counts match the ROM source values (these are exact constants — pin them in tests). Coordinate mapping is unscaled (X ±right→X lateral, Y forward→−Z depth).
3. **Prefix structure preserved:** each maze encodes one entry list + two lengths (base ⊂ T3 extended form after `MAZEND`); a test asserts the base slice and the extended slice resolve to the correct entry sets.
4. **Wave→maze map ported:** the documented wave associations hold (e.g. wave 2 → `TBUNK` bunkers-only), unit-tested.
5. **Random turret spawning is gone:** the surface wave places the authored field at maze coordinates and translates it in with the existing surface scroll; entities are not spawned one-by-one at random positions.
6. **Bunkers/bishops use the existing tower render/collision path** (no new path introduced).
7. **Reconciliation documented:** the TTWRS↔`byte_98CB` decision (maze wins) is recorded in the session file's Design Deviations.
8. Star-wars build + test suite green (`npm run build && npm test` in `star-wars/`).

---
_Enriched by SM from the curated epic context and spec §C. TEA refines exact test values against WSGRND.MAC during RED._
