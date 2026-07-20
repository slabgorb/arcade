# Story jt1-3: Image transcription

**Epic:** jt1 (Joust — foundation slice)
**Points:** 5 (p1)
**Workflow:** tdd
**Repo:** joust

## Acceptance Criteria

1. A test re-derives pictures.ts from the vendored JOUSTI.SRC byte-for-byte (frames, spans, palettes, COMCL5 expanded); it degrades to committed-fixture comparison when the tree is absent (CI).

2. Frame names traceable to JOUSTI.SRC labels; the 91-block inventory from pictures.md is complete and identified on the committed contact sheet (ostrich/stork/buzzard 14 each, riders 13, egg 6, troll hand 6, flame 4, poof 3, ptero 6, cliffs, transporter).

3. COMCL5 expands to CLIFF5's raw pixels via the transcribed RLE algorithm, cited to SYSTEM.SRC:927-1023; the expansion is pinned by test.

4. Zero hand-drawn pixel data: every byte in pictures.ts provably originates in the vendored source; citations suite green.

## Overview

Transcribe the merged images source (`JOUSTI.SRC` — the link target; entity `.SRC` files are artist provenance, per `pictures.md`) into a committed data module in `src/core/pictures.ts`. This covers both record formats (entity frames and background records), the COMCL5 RLE stream decoded via the NEWCL5/UNCOM algorithm, collision span tables, and the COLOR1/HICOLR palettes.

**Critical constraint:** No ROM binaries are vendored. The gate is a vitest that re-derives every frame from the vendored `JOUSTI.SRC` text (and cross-checks `OSTRICH.SRC/*.PIC` provenance for at least one entity) and compares byte-exact. Radix traps are enforced (CORRECTED by TEA's census — the original '@ octal rows' claim was wrong for image data): pixel rows are $ HEX (13,724 rows; JOUSTI.SRC has ZERO @ literals), collision spans are bare DECIMAL (`7+COFF`), COMCL5 is % binary — an Elias-gamma BIT stream (SYSTEM.SRC:938-1023), NOT value/run pairs — and octal appears ONLY in the palettes (SYSTEM.SRC:908-923, JOUSTRV4.SRC:754-761). DMAFIX !X pre-XOR stands. Bake a contact-sheet artifact (93 blocks + COMCL5 expansion; `bake-models.mjs` precedent) for human review.

## Design Context

**Spec:** [`joust/docs/superpowers/specs/2026-07-19-joust-clone-design.md`](../../docs/superpowers/specs/2026-07-19-joust-clone-design.md)

Key architecture points (sections 2-3):
- Rendering: faithful raster, 292×240 logical canvas, integer-scaled, crisp pixels
- `COLOR1` palette (octal-radix trap: every palette byte is octal, e.g. `@077` = `$3F`, not `$77`)
- No remap PROM on Joust — nibbles are literal palette indices (proven by `williams.cpp:1656-1660, 1589`)
- Frames transcribed from `JOUSTI.SRC`, byte-gated against the source's own FCB/FDB data + `*.PIC` S-Records

## Ground Truth: The Dossier

Read all sections below from [`joust/docs/rom-study/`](../../docs/rom-study/):

### Pictures.md — Image Data, Formats, Palette
Key sections:
- **The image ROM source** (§1): `JOUSTI.SRC` is the merged, self-contained images module with 30-entry pointer table at `JOUSTI.SRC:18-49`, artist files (`OSTRICH.SRC`, `CLIFF.SRC`, …) are byte-identical upstreams.
- **Two record formats** (§2):
  - **Entity frames** — 3-word records via the `POSOFF` macro (`JOUSTI.SRC:12-13`): collision span pointer, position word (signed Xbyte, −Y offset), source pointer (first word there is w/h).
  - **Background/cliff records** — 4-word records (partial DMA blocks): collision, source, absolute_dest, w/h. Transporter records use literal DMA control `$0A00` instead of collision pointer.
- **Pixel format** (§3):
  - 4 bpp, 2 pixels/byte, high nibble = left pixel (`williamsblitter.cpp:159,171`)
  - One FCB row = one horizontal screen row
  - VRAM is column-major: `addr = xbyte·256 + y`, pixel X = 2·xbyte
  - Blit destination Y wraps within the low byte
- **Collision data** (§4):
  - Per-scanline (left,right) span pair, 4 bytes/row, biased by `COFF EQU $0200` (`JOUSTI.SRC:7`)
  - Sentinels: `$8000` = no collision, `$8100` = end of table
  - Only the mount collides; riders carry collision pointer 0
- **Palette** (§5):
  - Hardware: 16 palette bytes, `BBGGGRRR`, resistor-weighted DACs (`williams_v.cpp:342-343`)
  - Active game palette = first operand column of `COLOR1` (`SYSTEM.SRC:908-923`)
  - Rider bodies confirm mapping: PLY1R ≈ nibble 5 (P1 yellow, `JOUSTI.SRC:2054`), PLY2R ≈ nibble 7 (P2 light blue, `:2083`), PLY3R ≈ nibble 4 (enemy knight red, `:2114`)
  - Claims PIC-068/069/070 anchor these nibbles; PIC-051/052/053 describe the byte-identical $0707 size headers
  - Two more palettes: `HICOLR` (high-score page, 8 entries + 8 black, `JOUSTRV4.SRC:754-761`) and `NULL` (blanking, `:762`)
  - Only palette cycling: `INC RAMCOL+2` once per frame on high-score page (`JOUSTRV4.SRC:727`); lava shimmer is the `LAVA` process writing pixels (`SYSTEM.SRC:786-904`), not a palette effect
- **Playfield layout** (§6): Position (pixel X = 2·dest-high, Y = dest-low), sizes (2w × h px)
- **Frame inventory** (§7): 91 blocks total — ostrich/stork/buzzard 14 each, riders 13, egg 6, troll hand 6, flame 4, poof 3, ptero 6, cliffs + transporter

### Open Questions — Sect. 5: Images
- **ASH1R/L** (pterodactyl dissolve, `JOUSTI.SRC:2778-2781`): third, undecoded format (value/run pairs?). May be stubbed with consumer traced or explicitly deferred with a finding.

### Subsystems.md — Referenced sections
- §1 (process architecture): 40-slot cooperative scheduler, frame-quantized nap timers
- §3 (wave machine): co-op→survival degradation

## Vendored Tree: Reference Materials

**Pin:** `arcade/reference/williams-source/joust/` at commit `9bcfdb1`

### JOUSTI.SRC (merged images source)
- `JOUSTI.SRC:8` — `DMAFIX EQU $0404` (pre-XORs w/h for the SC1 blitter; blitter un-XORs at `williamsblitter.cpp:115-116`)
- `JOUSTI.SRC:7` — `COFF EQU $0200` (collision span bias)
- `JOUSTI.SRC:12-13` — `POSOFF` macro (entity frame format)
- `JOUSTI.SRC:18-49` — 30-entry pointer table
- `JOUSTI.SRC:54-290` — cliff/transporter placements
- `JOUSTI.SRC:749-752` — transporter records (4-word format with DMA control `$0A00`)
- `JOUSTI.SRC:759-803` — ostrich (18 records, 9 states × 2 facings) / stork (same)
- `JOUSTI.SRC:1668` — buzzard (18 records, same states)
- `JOUSTI.SRC:2046-2206` — riders (23 records: PLY1-5 R/L, standings)
- `JOUSTI.SRC:2054,2083,2114` — rider colour nibbles (PLY1R/2R/3R lines)
- `JOUSTI.SRC:2255` — egg (7 records)
- `JOUSTI.SRC:2376` — lava-troll hand (6 records)
- `JOUSTI.SRC:2481` — flame (4 records)
- `JOUSTI.SRC:2564` — death poof (3 records)
- `JOUSTI.SRC:2601` — pterodactyl (6 records)
- `JOUSTI.SRC:2778-2781` — ptero dissolve (ASH1R/L, undecoded third format)
- `JOUSTI.SRC:54/55` et al. — every cliff has a second variant one scanline shorter (consumer not found; possibly erase variant)
- `JOUSTI.SRC:594-740` — `COMCL5` (871 bytes of %-binary FCBs, RLE-compacted CLIFF5)
- `JOUSTI.SRC:2817` — `LENGTH EQU *` (module end marker)

### SYSTEM.SRC (RLE algorithm + process model)
- `SYSTEM.SRC:927-1023` — `NEWCL5`/`UNCOM` RLE algorithm (expands `COMCL5` to CLIFF5's raw pixels)
- `SYSTEM.SRC:782-784` — `LN EQU 16 / RN EQU 1 / BN EQU 17` (pixel format constants: 16 bytes per row, 1 pixel per nibble, 17 bytes wide)
- `SYSTEM.SRC:908-923` — `COLOR1` palette (first operand column is active game palette)
- `SYSTEM.SRC:786-904` — `LAVA` process (writes pixels, not palette cycling)

### JOUSTRV4.SRC (behavior target: red label / RV4, Oct '82)
- `JOUSTRV4.SRC:754-761` — `HICOLR` palette (high-score page, 8 entries + 8 black)
- `JOUSTRV4.SRC:762` — `NULL` palette (blanking)
- `JOUSTRV4.SRC:727` — `INC RAMCOL+2` (once per frame on high-score page)
- `JOUSTRV4.SRC:705-706` — `NULL` palette usage
- `JOUSTRV4.SRC:1112-1117` — `BCKYUP` (background consumer: un-XORs height, computes scanline, blits with control `$0A`)
- `JOUSTRV4.SRC:1126-1127` — `BRIDGE`/`BRIDG2` (lava shore, solid-colour fills)
- `JOUSTRV4.SRC:2407+` — `WCLFTB` (cliff table: CLIF1L, CLIF1R, CLIF2, CLIF4 + transporter; CLIF2 only has live transporter)
- `JOUSTRV4.SRC:6093-6098` — `WRHOR2` (entity consumer: adds position to CLSX/CLSY, loads source, post-increments past w/h)
- `JOUSTRV4.SRC:6098` — w/h at first word after source pointer

### OSTRICH.SRC (artist provenance, byte-identical upstream)
- `OSTRICH.SRC:12-31` — `ORUN1R` (20 pixel rows, verbatim in `JOUSTI.SRC:1369-1388`)

### RAMDEF.SRC (constants, structure definitions)
- `RAMDEF.SRC:144-152` — DMA block field offsets (collision, source, absolute_dest, w/h)

## Key Facts for Implementation

### Record Formats
1. **Entity frames** (3 words):
   - Word 0: Collision span pointer (0 = no mask, e.g. mounted riders)
   - Word 1: Position word (high byte = signed Xbyte offset, low byte = 256−Y offset)
   - Word 2: Source pointer (first word at source = w/h, then pixel rows follow)

2. **Background/cliff records** (4 words):
   - Word 0: Collision span pointer (or `$0A00` for transporters)
   - Word 1: Source pointer
   - Word 2: Absolute destination (column-major VRAM address)
   - Word 3: w/h (pre-XORed with `DMAFIX`)

### COMCL5 RLE Expansion
- Algorithm: `SYSTEM.SRC:927-1023` (`NEWCL5`/`UNCOM`)
- Input: 871 bytes of %-binary FCBs (value/run pairs)
- Output: CLIFF5's raw pixels (expanded background frame)
- Transcribe the algorithm byte-by-byte; test that expansion matches the vendored FCB data

### Collision Spans
- Per-scanline (left, right) pairs, 4 bytes/row
- Values biased by `COFF EQU $0200` so sentinels are negative:
  - `$8000` = no collision this scanline
  - `$8100` = end of table
- Example: `CSTN1R` collision table for ostrich running

### Palettes
1. **COLOR1** (active game palette, 16 bytes, octal radix):
   - `@077` (yellow) = P1
   - `@350` (light blue) = P2
   - `@017` (red) = enemy knight
   - Others: green, dark green, dark slate, etc.
2. **HICOLR** (high-score page, 8 entries + 8 black)
3. **NULL** (blanking)

**Format:** `BBGGGRRR` (resistor-weighted DACs)

### Radix Traps
- **$ hex rows** in pixel data (JOUSTI.SRC has zero @ literals; octal is palette-only — TEA census correction)
- **Decimal spans** in collision tables (default, unmarked)
- **% binary COMCL5** RLE value/run pairs
- **!X pre-XOR** on w/h (e.g. `$0707!XDMAFIX`)
- Every constant transcribed must carry a radix-cited comment + a claims entry

## Citation Gate (LIVE — jt1-2 merged)

- 158 claims in `docs/rom-study/claims/*.json` (jt1-2 delivered)
- Checker: `tools/audit/check-citations.mjs`
- CLI + suite must stay green
- **New numeric constants transcribed in this story should be anchored by new fully-qualified claims**
- Example claims for this story:
  - PIC-051/052/053: $0707 size headers (byte-identical across three riders)
  - PIC-068/069/070: rider colour nibbles (5 = P1 yellow, 7 = P2 blue, 4 = enemy knight)
  - PIC-071: WCLFTB cliff table (only CLIF2 has a live transporter)

## Byte Gate Requirement

No hand-authored pixel data anywhere. Every byte in `src/core/pictures.ts` must provably originate in the vendored source:

1. Vitest that re-derives every frame from `JOUSTI.SRC` text
2. Cross-check `OSTRICH.SRC/*.PIC` provenance for at least one entity
3. Degrades to committed-fixture comparison when the tree is absent (CI)
4. Citations suite green

## Contact-Sheet Artifact

Bake a contact-sheet image (91 blocks + COMCL5 expansion) for human review.

**Precedent:** `star-wars/` uses `bake-models.mjs` to generate a visual grid of all frame data for validation. Approach:
1. Render all 91 frames to a canvas (logical 292×240, integer-scaled)
2. Label each frame with its entity name and frame index
3. Include CLIFF5 with COMCL5 expansion
4. Commit the artifact in the story docs (as jt1-6 does for the final render)

## Notes

- ASH1R/L (pterodactyl dissolve, `open-questions.md` §5) may be stubbed with consumer traced or explicitly deferred with a finding (not a blocking AC).
- The citation gate is now live; every new numeric constant must anchor to a claim.
- Purity guard stays green (no window/document/Date.now/Math.random in src/core/).
