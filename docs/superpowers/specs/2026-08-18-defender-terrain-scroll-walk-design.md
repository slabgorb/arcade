# df5-11 — Defender terrain: render the true scroll walk, not the write-only ALTTBL

**Date:** 2026-08-18
**Author:** Architect (brainstormed)
**Status:** Design — pending user review, then writing-plans
**Supersedes numbers in:** `docs/adr/0006-defender-terrain-world-coordinate-reconciliation.md` (period math corrected here)

## Context

df5-9 made the Defender world scroll and left two coordinate-model flags. ADR-0006 first
ruled them, but its central numeric claim ("terrain period = `$8000` = half the `$10000`
cylinder, repeats twice per lap") was **inferred, not read from the draw path** — and it is
wrong. This spec is the result of verifying the ROM's actual terrain-draw code, and it
replaces that reasoning.

The whole question is: the decoded terrain is 1024 entries, the port's world is 256 columns,
and the live render (`composeFrame`) shows only a slice of the planet. What is the *faithful*
terrain, per the ROM?

## ROM ground truth (verified from the draw path — `reference/original-source/defender/`)

1. **1 screen pixel = `$20` world-units = one terrain column.** `BGINIT` sets the screen's
   right edge at `BGL + $2610` ("START ON RIGHT EDGE OF SCREEN", `BLK71.SRC:98`); Williams'
   raster is 304 raw / 292 visible, and `$2610 ÷ 304 = $20`. `BGINIT`'s `ANDB #$E0` ("FIND
   NEAREST PIXEL", `BLK71.SRC:96`) snaps to `$20` in the low byte — the pixel boundary is
   `$20`, definitively.
2. **The scrolling terrain is a ±1 random walk, 1 bit per column, 2048 columns = the whole
   `$10000` world, exactly once per lap.** The scroll generators `ADDR01`/`ADDL01`
   (`BLK71.SRC:307`, `:236`) step the offset ±1 and write one `TERTF` column per bit read;
   the bit reader `RFONR1`/`LFONR1` (`BLK71.SRC:435`, `:487`) consumes **one bit per column**
   (`RTCNT` 7→0, one `ASLA` per call, byte-advance wrapping at `TDATA+TLEN`). TDATA is `$100`
   bytes = 2048 bits = 2048 columns = `$10000 ÷ $20`. **Once per lap.**
3. **`ALTTBL` is write-only.** In the *entire* vendored source it appears exactly three times:
   its declaration (`BLK71.SRC:70`) and the two `BGALT` lines that fill it (`:382`, `:397`).
   Nothing reads it; the scroll never touches it. Yet the port's `decodeAltitudes` faithfully
   reproduces **`BGALT`** — the one table the cabinet does not render — and at half resolution
   (`BGALT` stores one entry per **2** offset-steps; the scroll stores one per **1**). So
   `BGALT`'s 1024 entries are a 2:1 decimation of the real 2048-column walk.
4. **MAME corroboration.** No MAME C++ is vendored (Williams is a bitmapped display; MAME just
   scans out the bitmap the CPU writes, so it cannot contradict the terrain math). It pins the
   visible raster at 292×240 (`williams.cpp:1601`), independently corroborated inside the tree
   by sibling title Joust's own assembler: `ERIGHT EQU 292 ... WRAP AROUND SCREEN`
   (`reference/williams-source/joust/JOUSTRV4.SRC:39`).

## The port's world is a coherent 8:1 decimation

The port renders everything — camera, entities, terrain — at 1 pixel = `$100` (`worldX >> 8`),
so its world is 256 columns (`WORLD_COLS = 0x10000 >> 8`). Against the ROM's `$20`/pixel that is
a uniform **8:1 zoom-out** (`$100 ÷ $20 = 8`; `2048 ÷ 8 = 256`). This is coherent — terrain and
entities share it, which is why df5-9 scrolls correctly — and it is **out of scope here**.
Re-scaling to the ROM's `$20`/pixel would rewrite the df3 seam (world/scanner/entities/collision
+ every df5-9 test); it is recorded as a known deviation, not touched.

**Consequence for the period:** 256 columns, once per lap, is *correct* (it is `2048 ÷ 8`).
ADR-0006's "should be twice per lap" was the error, not the shipped tiling. **Keep the period.**

## The actual defect

`composeFrame` calls `blitTerrain(fb, decodeAltitudes(TERRAIN_BLOCK), TERRAIN_COLOUR, camera >> 8,
WORLD_COLS)`. `decodeAltitudes` returns 1024 `BGALT` entries; `blitTerrain` tiles them `mod 256`,
so it draws `BGALT[0..255]` — the **first quarter** of the world's profile — stretched across the
whole lap. Three-quarters of the planet is never seen, and the quarter shown is at half the
authentic resolution (`BGALT`'s 2:1 decimation).

## Design

Render the live terrain from the **true scroll walk**, decimated to the port's 256-column lap.

### New decode: `decodeScrollSurface(block, worldCols = WORLD_COLS)` (in `terrain.ts`)

- Walk **all** `block.bytes.length * 8` bits (2048) of TDATA, MSB-first (matching `RFONR1`'s
  `ASLA` and the existing `decodeAltitudes` bit order), stepping the offset **±1 per bit** from
  base `$E0` (`BASE_OFFSET`), byte-masked (`& 0xff`) — i.e. `BITS_PER_ENTRY = 1`, the scroll's
  rate, not `BGALT`'s 2.
- Sample the full `fullLen`-entry walk down to `worldCols` entries at stride `fullLen / worldCols`
  (`2048 / 256 = 8`): `surface[k] = fullWalk[k * stride]`, `k ∈ [0, worldCols)`. `fullWalk[j]` is
  the offset after `j` steps (`fullWalk[0] = $E0`), so `surface[k]` is the offset at the k-th
  `$100` boundary — exactly what a `$100`-granularity terrain shows.
- Assert `fullLen % worldCols === 0` (fail loud otherwise); `worldCols` cited to the `$10000`
  cylinder, never a magic number. Pure/deterministic — no clock, no entropy; `purity.test.ts`
  stays green.

### Call site: `composeFrame` (`scene.ts:202`)

Replace `decodeAltitudes(...)` with `decodeScrollSurface(require_(TERRAIN, TERRAIN_BLOCK, ...))`.
The `blitTerrain(fb, surface, TERRAIN_COLOUR, camera >> 8, WORLD_COLS)` call is **unchanged** —
it now receives a 256-entry whole-world surface, so its `mod 256` tiling is identity and it draws
the whole planet once per lap, seamless at the wrap (df5-9's won invariant — `WORLD_COLS` period,
untouched).

### `blitTerrain` — unchanged

Same signature, same tiling logic. Minimal blast radius: the only new code is the decode.

### The static title still (`composeStaticFrame`, `scene.ts:83`) — adopts the same surface ✓ DONE

Resolved: `composeStaticFrame` decodes via `decodeScrollSurface` at camera 0, passing an explicit
`WORLD_COLS` period so the strip fills the full raster (cylinder tiling). One decoder feeds both
the still and the live game — no divergence. The still-frame tests use property assertions, not
golden terrain pixels, so no fixture re-baseline was needed.

### `decodeAltitudes` (BGALT) — RETIRED ✓ DONE

Resolved: with no production caller and a decode of a write-only ROM table, `decodeAltitudes` was
removed along with its `BGALT`-specific tests, replaced by `decodeScrollSurface` and its tests in
`terrain-blit.test.ts`. `blitTerrain`'s cylinder-fill was also made explicit (an optional `period`
opts into full-width tiling) because the old `period === length` heuristic stopped discriminating
once the surface length equals `WORLD_COLS`.

## Scope / non-goals

- **In:** the live-scroll terrain source (`composeFrame`), the new pure decode, the still-frame
  surface, ADR-0006's numeric correction, df5-11's ACs.
- **Out:** the df3 `$100`/pixel world scale (the 8:1 zoom-out) — a separate, un-storied deviation.
- **Out:** the ≤1px terrain/entity jitter (Q2) — ADR-0006 accepted it as cosmetic-and-faithful;
  unchanged. (Note: with `$20`-native terrain it would be intended ROM behavior, but at the port's
  `$100` scale terrain and entities share the grid, so the ≤1px flooring shimmer stands as-is.)

## Test impact (for TEA)

- **New:** unit tests for `decodeScrollSurface` — 1-bit/column ±1 walk, 2048→256 stride-8 sampling,
  `fullLen % worldCols` guard, base `$E0`, MSB-first, byte-wrap; cite `RFONR1`/`ADDR01`.
- **Re-baseline (expected, legitimate):** any df5-9 / still-frame / terrain-blit fixture whose
  digest pins terrain pixels changes, because the terrain content correctly changes. The df5-9
  *seamless-wrap* and *no-snap* assertions must still hold (period unchanged).
- **Green throughout:** `purity.test.ts`, the df1 citation gate, `terrain-gate.test.ts`.
- **Gate:** a df5-7-style visual playtest of `http://127.0.0.1:5270/defender/` (DIFFER from a
  nonsense control) confirming the whole planet now scrolls past once per lap and reads correctly.

## Downstream doc edits (this pass)

- **ADR-0006:** delete the `$8000`/half-cylinder/twice-per-lap claim; record 1px=`$20`, the
  2048-column ±1 walk (once per lap), `ALTTBL` write-only, the port's coherent 8:1 decimation,
  and that the period 256 is therefore correct. Q2 ruling stands.
- **df5-11 ACs:** drop "$8000 / twice per lap"; keep period 256/once; retarget from "sample the
  1024 `BGALT` table" to "decode the 2048-column ±1 scroll walk, decimate 8:1 to the 256-col lap."
