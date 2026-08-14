# Epic df2 Context

## Title
Defender — framebuffer render + image-table transcription (phase 2): static pixels on screen before any physics

## Overview
Second Defender epic and phase 3 of the framebuffer-raster cabinet build (docs/playbooks/next-sprite-game.md, graphics phase in its Joust image-transcription form — no tile/sprite ROMs, no colour PROM decode; all graphics are inline FCB/FDB tables in the vendored source). Produces the core/shell render seam (plugins/defender/src/core/framebuffer.ts pure index surface + src/shell/render.ts index->RGBA blit) and the GENERATED-data + independent-gate transcription of the palette, the MESS0 character set, the DEFB6/SAMEXAP7 object image tables and the BLK71 terrain — rendered as a STATIC still (cleared framebuffer, text, object gallery, planet surface). PIXELS, NOT PHYSICS: no ship, scheduler, enemies, scroll or input (those are df3/df4); transcribed object/terrain tables land INERT, drawn by a static proof harness only. Stands on df1 (DONE): the dossier at plugins/defender/docs/rom-study/ and the citation gate + src/core purity test at plugins/defender/tests/ — every constant df2 introduces re-opens under the df1-1 gate (no src/core value without a claims/*.json entry). Render facts from df1: visible raster 292x240 (MAME williams.cpp:1601, board fact prose-only), 16-entry colour RAM CRAM EQU $C000 (defender/PHR6.SRC:13) with the PCRAM RMB 16 pseudo-palette shadow (defender/PHR6.SRC:219) copied to CRAM each frame by the IRQ (DEFA7.SRC:1968-1994); pixels are 4-bit palette INDICES, two per byte, never RGB. Reuse-first: scripts/transcribe-pictures.mjs + plugins/joust/tests/pictures-gate.test.ts (generated-data + independent-reader gate PATTERN — the reader is re-derived because the RASM dialect differs from joust's MAC65: $hex/bare-decimal, !>/!. operators, no octal/binary/local labels, brief.md sec 2); @shared/view fitIntegerScale + letterbox; @shared/host-helpers mountCanvas; @shared/font conventions where the raster charset maps. THE ONE ARCHITECTURAL DECISION (df2-2): Defender is the SECOND Williams-framebuffer game to need a palette-byte->RGBA decode, so the CLAUDE.md 'extract on the second game' bar is exactly met — IF Defender's CRAM byte format is the same 3-3-2 (BBGGGRRR) joust's paletteToRgba already decodes; that IS a board fact, read from MAME in prose (williams.cpp palette init), never guessed — if it matches, extract paletteToRgba to @shared/ and re-point BOTH games; if it differs, keep local, do not force-share divergent hardware. Traps carried in (so no story re-discovers them): streams-are-not-rasters (record an encoding discriminant per block, refuse to raster a non-raster — joust COMCL5/ASH lesson); colours-are-never-invented (render shell scans clean of hard-coded colour hex; every colour is a transcribed palette entry by index); line-numbers-from-tool-output-only (centipede drift, why the gate exists); comment ROM refs as defender/<FILE>.SRC:<line> not TS file.ts:line. Design + full story rationale: docs/superpowers/specs/2026-08-14-defender-df2-framebuffer-transcription-design.md; roadmap parent: docs/superpowers/specs/2026-08-13-defender-cabinet-roadmap-and-df1-design.md sec 4 df2 (approx 18 pts). OUT OF SCOPE: ship/scheduler/world-wrap (df3), menagerie + collision + materialize/explode animation (df4), game structure + scanner (df5), sound (df6), phase machine/attract/HUD/showcase (df7). ACCESSIBILITY FORWARD-NOTE (binds df4/df7, recorded df1): the original's smart-bomb/death full-screen flashes become freeze/fade — owner photosensitivity, the one exception to ROM-always-wins; df2 renders no strobe.

## Metadata
- **Epic ID:** df2
- **Repo:** arcade

## Background

Cross-story constraints and guardrails for every `df2-*` story. The Overview is
the *what*; this is the *how-and-why-not* — the walls each story inherits so none
is re-argued mid-epic.

### The scope wall — pixels, not physics

`df2` renders **static** data and nothing else. It is the playbook's "visual
playtest for orientation traps **before** physics" (`docs/playbooks/next-sprite-game.md`
§4). Concretely, a story is out of scope the moment it needs *time*:

- **IN:** a pure framebuffer index surface; the palette; transcribed charset,
  object-image and terrain tables; a static blit of each to prove the bytes render.
- **OUT:** ship movement/thrust, the process scheduler, world-wrap + camera,
  enemies, collision, materialize/explode **animation**, input, scroll, the frame
  clock. Object and terrain tables land **INERT** — transcribed and byte-verified,
  drawn only by a static proof harness. `df3` steps them; `df2` does not.

If a story finds itself reaching for the timebase or `requestAnimationFrame` beyond
a single paint, it has crossed into `df3`. `main.ts` steps no clock this epic.

### The render seam (the core/shell boundary — the single most important rule)

`plugins/defender/tests/purity.test.ts` (shipped by `df1-1`) scans `src/core/` and
fails on `fetch`/canvas/`Date`/`Math.random`. Honour it exactly as joust does:

- **`src/core/framebuffer.ts`** — pure. A 292×240 visible index surface
  (`Uint8Array` of 4-bit palette **indices** 0–15, two per byte in the ROM's
  packing) plus pure compositors (`clear`, `blitGlyph`, `blitBlock`, `blitTerrain`).
  No colour, no canvas, no clock, no entropy.
- **`src/core/pictures.ts`** (+ charset/terrain modules) — pure DATA + one pure
  decoder, **GENERATED** from the vendored source; every record carries its
  file+line span so an independent-reader gate can re-derive and refuse any
  non-matching byte. Hand-authoring a pixel is structurally impossible, not a rule
  to remember (joust's `pictures.ts` header is the model).
- **`src/shell/render.ts`** — SHELL. index→RGBA via the transcribed palette;
  integer up-scale to canvas via `@shared/view` `fitIntegerScale`; blit. Never
  reaches back across the boundary. **Core hands the shell indices and positions;
  the shell decides pixels.**

### Fidelity guardrails (carried in, so no story re-discovers them)

1. **Colours are never invented.** Every colour drawn is a transcribed palette
   **entry reached by index** — never a hard-coded hex literal, never a "close
   enough" modern palette. Port joust's *test*, not just the intent: the render
   shell suite must scan itself clean of colour-hex literals. A plausible substitute
   is the easiest way to lose fidelity while everything still renders.
2. **Streams are not rasters.** Joust hit compressed picture formats (COMCL5
   Elias-gamma, ASH run-length) that blit as convincing noise if treated as pixel
   grids. Every transcribe gate records an `encoding` discriminant **per block** and
   refuses to raster a non-raster. Assume Defender's inline tables may carry their
   own packing until a story proves a block is raw raster.
3. **RASM ≠ MAC65 — re-derive the reader, don't lift joust's.** The vendored
   dialect is Williams RASM: `$` hex, **bare decimal**, `!>` (shift/byte) and `!.`
   (bit-mask) operators, no octal, no binary, no local labels (`brief.md` §2). Joust's
   transcriber reads MAC65 (`@` octal, `%` binary, `!X` XOR). A byte re-radixed on
   the way in is a silent fidelity bug. The pattern is reused; the parser is new.
4. **Line numbers from tool output only.** Copy every `:line` from `grep -n`/`awk`,
   never from memory or arithmetic — the centipede one-off drift is *why* the
   citation gate exists (`brief.md` §line-number discipline).
5. **Citation vocabulary is fixed.** Every `src/core` constant is backed by a
   `plugins/defender/docs/rom-study/claims/*.json` entry, byte-verified by
   `citations.test.ts` against `reference/original-source/defender/`. Prose cites
   the vendored tree as `` `defender/<FILE>.SRC:<line>` ``. MAME (`williams.cpp` /
   `williams_m.cpp`) wins **only** on board facts the source never states, cited in
   prose, **never** backtick-cited, never copied (GPL). New TS comments cite ROM as
   `defender/<FILE>.SRC:<line>`, **not** `file.ts:<line>` — the comment-line-ref
   guard reddens on TS-style line refs (`.SRC` exempt).

### The render facts `df1` settled (do not re-litigate)

- **Visible raster 292×240** — MAME `set_visarea`, `williams.cpp:1601` (board fact,
  prose-only). Memory raster is wider (304-column); only 292×240 is shown. Logical
  constants live in the **shell** (mirror joust's `LOGICAL_WIDTH/HEIGHT`).
- **16-entry colour RAM.** `CRAM EQU $C000` (`defender/PHR6.SRC:13`) is the live
  hardware palette; `PCRAM RMB 16  PSEUDO COLOR RAM` (`defender/PHR6.SRC:219`) is the
  RAM shadow the game mutates; the IRQ copies pseudo→CRAM each frame
  (`DEFA7.SRC:1968-1994`). Blink effects (`#$1111` normal / `#$DDDD` blink into
  `PCRAM`, `defender/AMODE1.SRC:255,259`) prove pixels are 4-bit **indices**, never RGB.
- **Banked block map** (provenance, the clone flattens it): block 1 = AMODE1
  attract/hall-of-fame; block 2 = **MESS0 charset/messages** (`SELECT CHARS`,
  `defender/DEFA7.SRC:2030-2031`); block 3 = ROMC0/ROMC8 diagnostics; block 7 =
  **BLK71 terrain + waves**; resident $D000-$FFFF = DEFA7/DEFB6/ROMF8/SAMEXAP7 (so
  DEFB6 object graphics and SAMEXAP7 appearances are resident, not banked).
- **OQ-1/OQ-2/OQ-4 are resolved** (`open-questions.md`): CB1 video IRQ,
  COUNT240/CA1 never enabled (beam polled), `$C3FC` is the screen-flip write. None
  gate a static render — they bind `df3`'s IRQ/scroll seam. Recorded so `df2` skips them.

### The one architectural decision — `df2-2`, palette decode extraction

Defender is the **second** Williams-framebuffer game to need a palette-byte→RGBA
decode, so `CLAUDE.md`'s "extract into `src/shared` only once a **second** game
proves the duplication is real" bar is **exactly** met — *conditioned on* Defender's
`CRAM` byte format being the same 3-3-2 (`BBGGGRRR`) joust's `paletteToRgba` already
decodes. That format is a **board fact**: read it from MAME in prose (`williams.cpp`
palette init, at the pin `df1-4` recorded in `board-facts.md`), never guessed.

- **If it matches** (expected — same Williams video family): extract `paletteToRgba`
  into `@shared/` as a Williams 3-3-2 decoder and re-point **both** joust and defender.
- **If it differs:** defender keeps its own decoder; do not force-share divergent
  hardware.

The palette **entries** themselves are always transcribed from the vendored source
under the gate (source wins on software facts; MAME only on the byte *format*).

### Reuse ledger (extend, don't reinvent)

| Need | Reuse |
|------|-------|
| Generated-data + independent-gate **pattern** | `scripts/transcribe-pictures.mjs` + `plugins/joust/tests/pictures-gate.test.ts` (parser re-derived — see guardrail 3) |
| Citation gate + `src/core` purity scan | `plugins/defender/tests/audit/citations.test.ts` + `purity.test.ts` (df1-1, ml1-1-hardened) — enroll here |
| Integer up-scale / letterbox | `@shared/view` `fitIntegerScale`, `letterbox` |
| Canvas mount | `@shared/host-helpers` `mountCanvas` (already in `main.ts`) |
| Text layout conventions | `@shared/font` where the raster charset maps (ROM cell pixels transcribed, not vector glyphs) |
| Palette decode | joust's `paletteToRgba` — extract per `df2-2` decision above |

### Sequencing & sprint

`df2-1` (the RED render seam) lands **first** — it defines the boundary the four
transcription stories (`df2-2/3/4/5`, parallelisable by file surface) write into;
`df2-6`'s visual gate runs **last**. Hardening/mutation follow-ups are Reviewer-filed
and grouped by **file surface** (the jt9 gotcha), not folded in ahead of time. The
epic is indexed into active sprint 2634 (18 pts); if PM defers Defender phase-2 to
the next sprint, remove `df2` from `current-sprint.yaml` `epics:` — the shard stays
groomed and simply un-indexes.

### Accessibility forward-note (binds `df4`/`df7`; `df2` renders no strobe)

The original's smart-bomb and death effects flash the full screen. The owner has
photosensitive epilepsy, so those become **freeze/fade/particle** effects — the one
standing exception to ROM-always-wins, decided at the roadmap, not retrofitted.
`df2` draws only static frames, so nothing here strobes; the note is carried forward
so `df4`/`df7` inherit it as a hard constraint, not a rediscovery.

---
_Generated by `pf context create epic df2` from the sprint YAML; Background authored
by Architect (df2 design, `docs/superpowers/specs/2026-08-14-defender-df2-framebuffer-transcription-design.md`)._
