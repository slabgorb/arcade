# Story pm3-9: Authentic maze drives both — rebuild core/maze.ts topology from the byte-cited capture

**Plan-driven (superpowers workflow).** This story is executed via the superpowers brainstorm → spec → plan → subagent-driven-development flow, NOT the pf phased/stepped ceremony. The CANONICAL reference for scope, ACs, and tasks is the spec and plan below — this context doc is a pointer for routing, not the source of truth.

## Story Metadata
- **ID:** pm3-9
- **Title:** Authentic maze drives both — rebuild core/maze.ts topology from the byte-cited capture so render AND gameplay share one source
- **Type:** feature
- **Points:** 8
- **Epic:** pm3
- **Workflow:** superpowers (plan-driven)
- **Priority:** p2
- **Repo:** arcade

## Context Summary

Successor to pm3-8. pm3-8 made the pac-man RENDER authentic (MAME video-RAM capture → tile-index bake → monochrome-by-cell-type render), but `plugins/pac-man/src/core/maze.ts`'s topology was still pm1-3's non-byte-cited reconstruction, which genuinely diverged from the ROM (tunnel row, 68 dot cells, corridors). A shell-only authentic render cannot match a non-authentic core, so the board garbled. Owner decision (2026-08-07): the authentic maze must drive BOTH render and gameplay.

This story rebuilds `core/maze.ts`'s per-cell topology from the byte-cited attract capture (`plugins/pac-man/reference/graphics/maze-vram.bin`) via a build-time tool, so collision + dots + render share one source. It keeps `TOTAL_PELLETS = 244`, the pm3-2 tunnel-wrap (now at the authentic tunnel row 17), the core/shell purity boundary, and the GPL firewall (MAME capture + ROM geometry as source; shaunlebron read-only).

Along the way the Playwright visual check surfaced a separate shell render bug (maze wall-art tiles rendered 90°-rotated because the tile blit used the un-rotated `TILES`); it is fixed on this branch by routing the maze blit through the same ROT90 correction the digit glyphs already use.

## Pointers (source of truth)
- **Spec:** `docs/superpowers/specs/2026-08-08-pac-man-pm3-9-authentic-maze-core.md`
- **Plan:** `docs/superpowers/plans/2026-08-08-pac-man-pm3-9-authentic-maze-core.md`
- **Predecessor investigation ledger:** `.superpowers/sdd/2026-08-07-pac-man-pm3-8-authentic-maze-tilemap/progress.md`
- **This story's SDD ledger:** `.superpowers/sdd/2026-08-08-pac-man-pm3-9-authentic-maze-core/progress.md`
- **Branch:** `feat/pm3-8-authentic-maze-tilemap` (co-ships pm3-8 + pm3-9 as one deliverable — pm3-8 left the oracle RED-by-design; pm3-9 turns it green)
