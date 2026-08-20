# ADR-0006: Defender terrain-vs-world coordinate reconciliation (1024-entry surface, ≤1px jitter)

**Status:** Accepted
**Date:** 2026-08-18
**Author:** Architect
**Story:** df5-9 (world scroll) left two coordinate-model flags for Architect; this ADR rules both.

## Context

df5-9 made the Defender world scroll: `composeFrame` now camera-offsets the planet
surface and the world-space entities, and `blitTerrain` tiles the decoded terrain at the
world period so it no longer snaps when the camera (`BGL`) wraps the `$10000` cylinder.
That shipped, tested, and closed df5-9's acceptance. It also surfaced two coordinate-model
questions the story deliberately did **not** resolve, punting each to Architect (df5-9
session, "Out of scope — flag for Architect"):

1. **Data size vs world width.** `decodeAltitudes` returns **1024** entries, but the
   entity/camera world is **256** columns (`WORLD_COLS = 0x10000 >> 8`). df5-9 tiles the
   surface at 256 (seamless, verified), so **only entries 0–255 are ever drawn — 768 of
   the 1024 (75%) are dead**, and the planet shows a quarter of its authentic profile,
   repeated once per lap.

2. **Terrain-vs-entity sub-pixel jitter.** Entities are placed at `wrap16(worldX − camera)
   >> 8` (the flooring includes the camera's sub-column fraction), while terrain is shifted
   by whole columns at `camera >> 8`. Under sub-column camera motion the two disagree by
   ≤1 column — a shimmer of the terrain against the entities riding it.

Both reduce to one root fact, which the ROM settles unambiguously.

### What the ROM actually does (BLK71.SRC — verified from the draw path)

> **Correction (2026-08-18):** an earlier draft of this ADR claimed the terrain period was
> `1024 × $20 = $8000`, "half the cylinder, repeats twice per lap." That was *inferred* from
> table-size × granularity, never read from the draw code, and it is **wrong**. Reading the
> scroll generators settles it. See `docs/superpowers/specs/2026-08-18-defender-terrain-scroll-walk-design.md`.

- **1 screen pixel = `$20` world-units = one terrain column.** `BGINIT` sets the screen's
  right edge at `BGL + $2610` ("START ON RIGHT EDGE OF SCREEN", BLK71:98); Williams' raster
  is 304 raw / 292 visible, and `$2610 ÷ 304 = $20`. `ANDB #$E0` ("FIND NEAREST PIXEL",
  BLK71:96) snaps to `$20` in the low byte — the pixel boundary is `$20`.
- **The scrolling terrain is a ±1 walk, 1 bit per column, 2048 columns = the whole `$10000`
  world, exactly ONCE per lap.** `ADDR01`/`ADDL01` (BLK71:307,236) step the offset ±1 and
  write one column per bit read; `RFONR1`/`LFONR1` (BLK71:435,487) consume **one bit per
  column** (`RTCNT` 7→0, byte-advance wrapping at `TDATA+TLEN`). TDATA is `$100` bytes = 2048
  bits = 2048 columns = `$10000 ÷ $20`.
- **`ALTTBL` is write-only.** In the whole vendored source it appears three times — its
  declaration (:70) and the two `BGALT` lines that *fill* it (:382,:397). **Nothing reads
  it.** The scroll never uses it. Yet `decodeAltitudes` reproduces `BGALT` — the one table
  the cabinet does not render — and at half the scroll's resolution (`BGALT` stores 1 entry
  per **2** steps; the scroll, 1 per **1**). So `BGALT`'s 1024 entries are a 2:1 decimation
  of the real 2048-column walk.

### The scale the port committed to at df3

The port renders everything — camera, entities, terrain — at `worldX >> 8`, i.e. **1 pixel =
`$100`, 256 columns per lap** (`WORLD_COLS = 0x10000 >> 8`). Against the ROM's `$20`/pixel
that is a uniform **8:1 zoom-out** (`$100 ÷ $20 = 8`; `2048 ÷ 8 = 256`): the port shows the
whole world at once where the cabinet shows ~a quarter (`$2610` of `$10000`). This is a real,
pre-existing deviation, but it is *coherent* — terrain and entities share it, which is why
df5-9 scrolls correctly — and it is a *df3-seam* decision (camera, scanner, entity placement,
collision, every df5-9 test depend on it). **Out of scope here; recorded, not touched.**

**Because the decimation is uniform, the period 256 (once per lap) is CORRECT** — it is
`2048 ÷ 8`. The real defect is not the period but the terrain *source*: the port fills the lap
from the write-only `BGALT` table (`BGALT[0..255]` = the first quarter of the world, stretched
across the lap) instead of the true 2048-column scroll walk decimated 8:1.

## Decision

### Q1 — 1024 vs 256: the period is correct; the terrain SOURCE is the defect. Fixed by df5-11.

- **The period 256 (once per lap) is correct, not a compromise.** It is the ROM's 2048-column
  world decimated 8:1 by the port's coherent `$100`/pixel scale. **Do not** revert to tiling
  modulo the 1024 table length (the ~36-row snap R1 fixed), and **do not** re-tile to "twice
  per lap / `$8000`" — that earlier claim was wrong (see the Correction above). `WORLD_COLS`
  stays as the period, a named constant cited to the `$10000` cylinder.
- **The defect is the source.** The lap is filled from `BGALT[0..255]` — the first quarter of
  the world's profile, at half the scroll's resolution — stretched across the whole lap. The
  faithful surface is the true **2048-column ±1 scroll walk** (`RFONR1`/`ADDR01`) decimated
  8:1 to the 256-column lap, so one lap shows the whole planet once. This is isolated to the
  terrain decode; it does **not** touch the df3 world scale.
- **Tracked and specced.** Per ROM-always-wins the deviation is named, not silently kept.
  Filed as **df5-11**, designed in
  `docs/superpowers/specs/2026-08-18-defender-terrain-scroll-walk-design.md`, gated on a
  visual playtest.

### Q2 — ≤1px terrain/entity jitter: Accept. Cosmetic, and faithful. No story.

- The shimmer is inherent to flooring two quantities independently: terrain floors `camera`
  (`camera >> 8`) while entities floor `worldX − camera`. For any real `a,b`, `floor(a) −
  floor(b) ∈ {floor(a−b), floor(a−b)+1}`, so the disagreement is **≤1 column, bounded, never
  cumulative.**
- It **matches the ROM**, where the terrain hardware redraws in `$20` column chunks (`ANDB
  #$E0`) while entities ride the sub-`$20`-smooth camera (`BGL` integrates `BGDELT`/`PLAXV`
  in sub-column steps). The port reproduces the same relationship one column later. Removing
  it would be *less* faithful, not more.
- **Do not gold-plate this.** If a future playtest ever judges it distracting, the isolated
  fix is to floor the terrain against the same rounded camera the entities are measured from
  (offset entities by `(worldX − (camera & ~0xFF)) >> 8`). That is a one-line change reserved
  for evidence of a real visual problem — not to be done pre-emptively.

### The df3 `$100`/column world scale is a known, accepted deviation — explicitly NOT in scope here.

Re-scaling the world to the ROM's `$20`/column granularity (2048 columns/lap, cabinet-correct
world-per-screen) would rewrite `world.ts`, the scanner, every entity placement, collision, and
all df5-9 tests. That blast radius is unjustified by these two cosmetic flags. It is recorded
here as a deviation and left un-storied; if it is ever pursued it is its own epic-scale seam, not
a rider on the terrain fix.

## Consequences

- **No change to shipped code from this ADR.** df5-9 stays as merged; df5-11 carries the Q1
  work under TDD when scheduled.
- Q2 is closed permanently as accept/cosmetic — the df5-9 reviewer's two open flags are both
  now ruled (Q1 → df5-11, Q2 → accepted).
- **df5-11 is gated on a visual playtest** (df5-7 style): the screenshot at `/defender/` is the
  judge that the whole planet now scrolls past once per lap and reads correctly. df5-11's
  invariants: fill the 256-column lap from the true 2048-column ±1 scroll walk decimated 8:1
  (the whole world, once per lap — NOT the write-only `BGALT` table); keep `WORLD_COLS` as the
  period; scroll-locked and seamless at the wrap (df5-9's won invariant, non-negotiable);
  `purity.test.ts` green.
- ROM-always-wins is upheld: the two deviations (¼-profile terrain; `$100` world scale) are
  named and tracked rather than buried.

## References

- `plugins/defender/src/core/terrain.ts` — `decodeScrollSurface` (the scroll walk; replaced the
  write-only-`BGALT` `decodeAltitudes` in df5-11), `blitTerrain` (explicit-`period` cylinder tiling).
- `plugins/defender/src/core/world.ts` — `WORLD_COLS`, `wrap16`, the `$100`/column model.
- `plugins/defender/src/core/scene.ts` — `composeFrame` terrain + entity camera-offset (df5-9).
- `reference/original-source/defender/BLK71.SRC` — `ALTTBL RMB TLEN*4` write-only (:70,:382,:397);
  `BGINIT` `ANDB #$E0` / `ADDD #$2610` (:95-116); scroll generators `ADDR01`/`ADDL01` (:307,:236);
  bit readers `RFONR1`/`LFONR1` (:435,:487) — 1 bit/column.
- `reference/original-source/defender/PHR6.SRC` — `BGL` "TERRAIN LEFT POINTER" (:215).
- `reference/williams-source/joust/JOUSTRV4.SRC:39` — `ERIGHT EQU 292` corroborates the 292 raster.
- `docs/superpowers/specs/2026-08-18-defender-terrain-scroll-walk-design.md` — the df5-11 design.
- df5-9 session (archived): the two Architect flags (`sprint/archive/df5-9-session.md`).
- ADR-0005 — the ROM-always-wins framing this ADR operates under.

---

## Amendment (2026-08-19, pt1-18)

This ADR's `>> 8` / 256-columns-per-lap / `$100`-per-pixel model described the whole live
view when it was written. **pt1-18 superseded it for the live in-game scroll.** The live
view now projects world objects through a *visible window* — `projectWorldX` in `world.ts`:
an object is on-screen iff `(worldX − camera) & 0xffff < 150*64` (the ROM's own object-
visibility test, `DEFA7.SRC:2527-2530` `CMPD #150*64 / BHS OPLP`), and that 9600-unit window
is stretched across the 292px raster (~32.9 world-X per pixel), so the world is a ~6.8-screen
scrolling cylinder rather than one screen showing everything. The terrain scroll follows at
the matching zoom (`decodeScrollSurface(block, 2048)`, `camera >> 5`).

The `>> 8` / `WORLD_COLS` model in this ADR still governs the **static title screen**
(`composeStaticFrame`, camera 0, no scroll). Everything else here — the `BGL` camera, the
scroll walk, the cylinder-tiling rationale — stands unchanged; only the world-X→pixel *scale*
of the live view moved.
