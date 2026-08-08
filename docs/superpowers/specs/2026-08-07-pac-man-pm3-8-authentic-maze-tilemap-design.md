# pm3-8 — Authentic maze tilemap (fix the malformed board)

**Story:** pm3-8 · **Epic:** pm3 (Pac-Man — authentic graphics & the working tunnel)
**Date:** 2026-08-07 · **Workflow:** superpowers (plan-driven, two PRs)
**Status:** design approved, awaiting spec review

## Problem

With pm3-1..7 shipped, the game renders real double-line blue tile walls, but the
**maze shape itself is wrong** — the board is unrecognizable as Pac-Man (no clean
ghost house, corridors that don't close, scattered wall segments). Playtest
screenshot: `SCORE 10 / LIVES 3 / LEVEL 1`, `READY!`.

## Diagnosis (read-only, done in brainstorming)

Two candidate layers were named in the story; the malformed layer is isolated to
**one of them**:

- **Core `plugins/pac-man/src/core/maze.ts` `ROWS` table is CORRECT.** It is a
  faithful, recognizable 28×36 Pac-Man maze — symmetric halves, central ghost house
  (`HHHHHH`) with gate (`==`), one tunnel row (`T`), four energizers (`o`), the
  classic corridor structure. **Not the culprit.**
- **The shell autotiler in `plugins/pac-man/src/shell/render.ts` (`wallTileFor` /
  `MAZE_TILEMAP`) is the malformed layer.** It is a per-cell neighbour heuristic that
  paints one line/corner tile per wall cell facing open space. Re-rendering its own
  logic over the (correct) topology to ASCII reproduces stray line fragments inside
  thick wall blocks and around the ghost house — its own documented "notch/peninsula
  fallback … an approximation, not arcade-exact." The live screenshot is worse still,
  which additionally implicates the wall tile **art/orientation** (this repo has a
  known Pac-Man tile/sprite ROT90 asymmetry: tiles unrotated, sprites 90° CW).

**Conclusion: this is a shell-only fix. Core is untouched.**

## Root cause

The autotiler is a hand-built approximation (self-declared uncited in its own
header). Authentic Pac-Man does **not** derive its wall art from a neighbour
heuristic — the program ROM writes a specific, fixed arrangement of specific tile
indices into video RAM at level start. Approximating that per-cell arrangement with a
heuristic cannot be arcade-exact, and here the approximation is bad enough to be
unrecognizable. The fix is to source and render the **authentic per-cell tilemap**.

## Chosen approach: authentic byte-cited tilemap

Replace the heuristic autotiler with the **real** per-cell maze tile arrangement,
sourced from hardware ground truth, baked to committed JS, and cited under the
existing graphics citation gate. This matches the epic's whole "decode, don't guess —
MAME is the tiebreaker — bake to committed JS" philosophy.

> ## REVISION (2026-08-07): colour comes from MAME, monochrome by cell type
>
> **Discovered during implementation (Task 4):** feeding the authentic captured
> colour codes (`colorram & 0x1f`) through the existing pm3-3 `colourLookup` renders a
> **broken** maze — the dot tile (16) under its authentic code (16) resolves to black
> (invisible dots), and authentic wall tiles (208–251) resolve to peach+blue stripes.
> The captured `{tileIndex, colorCode}` pairing is real, but our `colourLookup` /
> pixel-plane convention does not reproduce what the cabinet displays for those codes,
> and fixing that is a shared-decode change (sprites, digits, fruit) out of this
> story's scope.
>
> **Resolution (owner decision — "bake resolved colours from MAME"):** a MAME
> framebuffer snapshot (224×288, the exact 28×8 × 36×8 tile grid, upright) is the
> colour ground truth. Its histogram shows the maze proper is strictly **two colours +
> black**: walls = blue `[33,33,255]` (= `HARDWARE_PALETTE[11]`), dots & energizers =
> peach `[255,184,174]` (= `HARDWARE_PALETTE[14]`). Everything else (near-white text,
> red/pink/cyan/orange/yellow) is sprites/HUD, not the maze.
>
> Therefore the maze renders the **authentic tile _shapes_** (the tile-ROM art the
> video-RAM indices reference) **coloured monochrome by core cell _type_** — every
> non-background pixel of a `wall` cell → blue, of a `dot`/`energizer` cell → peach.
> This is immune to the `colourLookup`/plane discrepancy (it never distinguishes pixel
> planes), needs no clean full framebuffer (only the two sampled colour values), and
> touches no shared decode. Real Pac-Man maze elements are each monochrome, so this is
> faithful, not a compromise.
>
> **Net effect on the sections below:** the bake emits a **tile-index grid** (not
> `{tileIndex, colorCode}`); `colorCode` and `colourLookup` play no part in the maze.
> `render.ts` keeps its HUD-row suppression (`isHudRow`) and gate handling; it swaps
> the autotiler for `TILES[MAZE_TILES[ty][tx]]` recoloured by `tileAt(tx,ty)`. The
> oracle and orientation check operate on tile indices exactly as written.

### Ground truth: a MAME video-RAM + colour-RAM dump

The maze wall layout is **not** a clean ROM table — the `0x35b5` table only places
dots (the routine at `pacman.asm:0x2448` writes tile `#10` into video RAM by offsets
from it). The authentic wall/dot/energizer arrangement is **video-RAM state** the
program ROM builds at level start.

- Run MAME headless on `~/roms/pacman.zip` (the same romset the pm3 graphics ROMs
  came from), let level 1 draw the maze, and dump `:maincpu` memory:
  - `0x4000–0x43FF` — tile-index RAM (walls, dots, energizers, HUD).
  - `0x4400–0x47FF` — colour RAM (authentic per-cell colour codes).
- MAME is the epic's declared tiebreaker; a memory dump is literal hardware state,
  the same class of artifact as decoding the GFX ROMs. The vendored
  `plugins/pac-man/reference/source/pacman.asm` provides the citation anchor (draw
  routines at `0x2448` / `0x2487`, video base `0x4000`, colour base `0x4400`).

### Data flow

```
~/roms/pacman.zip  ──(MAME headless + Lua autoboot dump)──▶  maze-vram.bin  (committed artifact)
                                                                   │
                                        (bake: video-RAM addressing → 28×36 grid)
                                                                   ▼
                                                       maze-tilemap-data.ts  (committed JS)
                                                                   │
                                                                   ▼
                                                render.ts reads the baked grid directly
```

Pac-Man's video RAM uses a rotated addressing layout (the middle 28×32 playfield in a
rotated/serpentine order, with the top/bottom two rows the split score area). The bake
applies that address→(col,row) mapping to unpack the dump into a flat 28×36 grid of
`{tileIndex, colorCode}`. Baking authentic colour RAM per cell gets non-uniform maze
colours (gate, etc.) right for free.

### Built-in correctness oracle

The baked grid's **dot and energizer cells must equal core `maze.ts` `ROWS`' dot and
energizer cells.** This single cross-check simultaneously (a) validates the video-RAM
unpacking/addressing and (b) confirms core gameplay topology and shell render agree.
If a mismatch surfaces, it is a real bug to resolve (most likely a tiny core `ROWS`
correction, kept minimal); the authentic dump is the oracle.

## Components

### New — extraction & bake tooling (dev-only; the baked `.ts` is what ships)

- **`scripts/pac-man/dump-maze-vram.mjs`** (or a `just` recipe) — invokes MAME with a
  Lua `-autoboot_script`, headless (`-video none -sound none -seconds_to_run N`),
  waits for the level-1 maze draw, writes `0x4000–0x47FF` to
  `plugins/pac-man/reference/graphics/maze-vram.bin`, and records SHA-1/CRC32 in
  `plugins/pac-man/reference/PROVENANCE.md`. One-time, reproducible, human-run — never
  CI, never runtime.
- **`scripts/pac-man/bake-maze-tilemap.mjs`** — reads the committed `maze-vram.bin`,
  applies the video-RAM→(col,row) unpack, emits
  `plugins/pac-man/src/shell/maze-tilemap-data.ts` (the committed 28×36
  `{tileIndex, colorCode}` grid). Same shape/precedent as `tile-data.ts` and
  `palette-data.ts`.

### Changed — `plugins/pac-man/src/shell/render.ts`

- Reads `maze-tilemap-data.ts` directly to paint the maze.
- **Retires:** `wallTileFor`, the `MAZE_TILEMAP` autotiler, the `WALL_H_TILE` /
  `WALL_V_TILE` / `WALL_CORNER_*` constants, and the `isHudRow` wall-suppression
  logic. Sprite/glyph rendering (pm3-5/6) and the palette path are untouched.

### Unchanged — core

`core/maze.ts` `ROWS` stays the gameplay topology (walkability, tunnel, `TOTAL_PELLETS
= 244` at `pacman.asm:20e6`, derived `DOT_COUNT`). pm3-2's tunnel position-wrap is
unaffected. The core/shell purity boundary holds.

### Gate & tests

- **Citation gate:** add a `maze-tilemap` claim to
  `plugins/pac-man/docs/rom-study/claims/graphics.json` citing the MAME dump +
  `pacman.asm` draw routine; extend `tools/audit/check-citations.mjs` to cover it
  (the pm3-1 pattern).
- **Invariant test** — `plugins/pac-man/tests/shell/maze-tilemap.test.ts`:
  - dimensions are 28×36;
  - baked dot + energizer cells **== core `maze.ts`** dot/energizer cells (the oracle);
  - energizer count == 4;
  - the tunnel row is walkable edge-to-edge;
  - a recognizable-structure assertion (the ghost-house block is present).
  These guard against a future re-bake or edit silently re-malforming the board.

## Testing strategy

- The invariant test above is the primary automated guard.
- **Visual confirmation is required** (per repo convention: playtest via Playwright,
  headless, on its own port) — the malformation was only caught visually, so the fix
  must be confirmed the same way before the story closes.

## Out of scope

- No change to core gameplay, movement, dots, or the tunnel wrap (pm3-2).
- No change to sprites (pm3-5), fruit/score numerals (pm3-6), overlays (pm3-7),
  palette (pm3-3), or the tile decode (pm3-4's `tile-data.ts` itself).
- Deferred pm4/ad1 items (intermissions, kill screen, attract demo) unaffected.

## Constraints carried from the epic

- Core/shell boundary holds (purity sweep armed on `maze.ts`).
- `TOTAL_PELLETS` stays 244 (`pacman.asm:20e6`); `DOT_COUNT` stays derived from the
  table, not hardcoded.
- GPL firewall: `shaunlebron/pacman` stays a read-only oracle, zero lines copied;
  MAME is the tiebreaker. The baked tilemap is hardware state (a memory dump), not
  copied source.
- Silent-404 trap avoided by design: the tilemap is baked to committed JS — zero
  runtime asset fetch.

## Deliverables (two PRs)

1. **Design PR** — this spec + the implementation plan.
2. **Implementation PR** — extraction + bake tooling, committed `maze-vram.bin` +
   PROVENANCE, baked `maze-tilemap-data.ts`, `render.ts` retiring the autotiler,
   citation-gate extension, invariant test, and a visual-confirmation screenshot.
