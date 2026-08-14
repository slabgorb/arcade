# Defender — `df2` framebuffer + transcription design (pixels on screen)

**Architect:** Emperor Palpatine · **Date:** 2026-08-14 · **Phase:** playbook §3
(graphics), Joust form — image-table transcription, no tile/sprite-ROM decode.
**Epic opened:** `df2` (framebuffer render + image transcription → static pixels)
**Predecessor:** `df1` — DONE (`sprint/epic-df1.yaml`; dossier at
`plugins/defender/docs/rom-study/`, citation gate + `src/core` purity test at
`plugins/defender/tests/`). Every constant `df2` introduces is re-opened under the
`df1-1` gate — no `src/core` value without a `claims/*.json` entry.
**Roadmap parent:** `docs/superpowers/specs/2026-08-13-defender-cabinet-roadmap-and-df1-design.md`
§4 `df2` (≈18 pts). This document sharpens that paragraph into the render seam and
the groomed story cut, using what `df1` actually settled.

> **Scope wall.** `df2` is **pixels, not physics** (playbook §4: *visual playtest
> for orientation traps before physics*). It renders **static** data: a cleared
> framebuffer, the character set, the object image gallery, the planet terrain.
> No ship, no scheduler, no enemies, no scroll, no input — those are `df3`/`df4`.
> The transcribed object/terrain tables land here **INERT**, drawn by a static
> proof harness only; later epics animate them.

---

## 1. What `df1` settled that this seam stands on

- **Board = pre-blitter Williams framebuffer.** Software-drawn bitmap, no SC1
  blitter, no tile/sprite ROMs, no colour PROM decode step. **All graphics are
  inline `FCB`/`FDB` tables in the program source** — so the playbook's
  "graphics-ROM decode" phase is an **image-table transcription** phase, exactly
  as Joust's `jt1` did it (`brief.md` §1).
- **Visible raster 292×240.** MAME `set_visarea` window, `williams.cpp:1601`
  (board fact, prose-only per the GPL wall; recorded `board-facts.md`). Memory
  raster is wider (304-column); only 292×240 is shown. Logical surface constants
  live in the shell, mirroring joust's `render.ts` `LOGICAL_WIDTH/HEIGHT`.
- **16-entry colour RAM.** `CRAM EQU $C000  COLOR RAM ADDR` (`defender/PHR6.SRC:13`)
  is the live 16-byte hardware palette; `PCRAM RMB 16  PSEUDO COLOR RAM`
  (`defender/PHR6.SRC:219`) is the RAM shadow the game mutates. The IRQ copies the
  pseudo palette to `CRAM` each frame (`brief.md` §render, `DEFA7.SRC:1968-1994`).
  Pixels are **4-bit palette indices** (0–15), two per byte — never RGB. The blink
  effects prove the indirection: hall-of-fame writes index words like `#$1111`
  ("NORMAL COLOR") / `#$DDDD` ("BLINK COLOR") straight into `PCRAM`
  (`defender/AMODE1.SRC:255,259`).
- **Timebase.** Nominal 60 Hz / 16-msec tick; exact 60.09615 Hz recorded as a
  separate number (`brief.md` §3). `df2` renders a **still** — it does not step a
  clock — so the timebase is inert here; it binds in `df3`'s scheduler.
- **OQ-1/OQ-2/OQ-4 resolved** (`open-questions.md`): CB1 video IRQ, COUNT240/CA1
  never enabled (beam polled), `$C3FC` is the screen-flip write. None of these
  gate a static render; they matter to `df3`'s IRQ/scroll seam. Recorded so `df2`
  does not re-litigate them.

## 2. The render seam (core emits indices; shell owns colour and canvas)

The single most important rule in every game is the `src/core` (pure sim) /
`src/shell` (render/audio/input/storage) boundary, enforced by
`plugins/defender/tests/purity.test.ts`. The framebuffer seam honours it exactly
as joust's does:

```
src/core/framebuffer.ts   pure. A 292×240 (visible) index surface: Uint8Array of
                          4-bit palette indices. Pure compositors write indices
                          into it (clear, blitGlyph, blitBlock, blitTerrain).
                          No canvas, no colour, no clock, no entropy.
src/core/pictures.ts      pure DATA + one pure decoder. GENERATED from the
  (+ charset/terrain)     vendored source by a transcribe tool; every record
                          carries its file+line span; a gate re-derives it with an
                          INDEPENDENT reader and refuses any non-matching byte.
src/shell/render.ts       SHELL. index→RGBA via the transcribed palette; integer
                          up-scale to the canvas via @shared/view fitIntegerScale;
                          blit. Colours are NEVER invented (joust's standing rule).
```

Core hands the shell **palette indices and positions**; the shell decides pixels
and never reaches back across the boundary. This is the seam joust proved
(`plugins/joust/src/core/pictures.ts` ↔ `plugins/joust/src/shell/render.ts`), one
board later; `df2` re-derives it against *this* tree, it does not import joust's.

## 3. Reuse-first ledger (what `df2` consumes vs writes)

**The best code is the code we did not write.** Before any new module, this is the
existing infrastructure `df2` extends:

| Need | Reuse | New only where |
|------|-------|----------------|
| Generated-data + independent-gate pattern | `scripts/transcribe-pictures.mjs` + `plugins/joust/tests/pictures-gate.test.ts` (the exact shape joust's `pictures.ts` header describes) | a **defender** transcribe tool + gate — the *source dialect differs* (RASM `$`hex/bare-decimal, `!>`/`!.` operators; NOT joust's MAC65 `@`octal/`%`binary/`!X`-XOR — `brief.md` §2), so the reader is re-derived, not copied |
| Citation gate + `src/core` purity scan | `plugins/defender/tests/audit/citations.test.ts` + `purity.test.ts` (df1-1, already shipped, ml1-1-hardened) | nothing — every `df2` claim enrolls here |
| Integer up-scale / letterbox | `@shared/view` `fitIntegerScale`, `letterbox` | nothing |
| Canvas mount | `@shared/host-helpers` `mountCanvas` (already in `main.ts`) | nothing |
| Text layout conventions | `@shared/font` where the ROM charset maps to glyphs | the ROM's own `MESS0` cell pixels are transcribed, not `@shared/font`'s vector glyphs — this is a **raster** charset |
| **Williams 3-3-2 palette decode** | joust's `paletteToRgba` (BBGGGRRR → RGBA, `plugins/joust/src/shell/render.ts`) | **See §4 — a genuine extraction candidate, conditioned on df2-2's finding.** |

## 4. The one real architectural decision: extract the palette decode, or not

Joust decodes a palette byte as `BBGGGRRR` (2 blue / 3 green / 3 red, widened to
8 bits) in `paletteToRgba`. Defender is the **second** Williams-framebuffer game to
need a palette-byte→RGBA decode. The extraction bar in `CLAUDE.md` ("extract into
`src/shared` only once a **second** game proves the duplication is real") is
therefore *exactly* met — **if** Defender's `CRAM` byte format is the same 3-3-2.

That "if" is a **board fact**, not a source fact, so it is answered the way the
epic mandates board facts are answered: **from MAME in prose** (`williams.cpp`
palette init), never guessed, never copied. `df1-4` pinned the MAME object
(`board-facts.md`: mamedev/mame @ `aaac1f637a8cbf23724b61ea578d70a32f2cf4fe`) but
not the palette format specifically — so **`df2-2` reads it there.**

**Recommendation (Architect):**
- If the format matches (expected — same Williams video family), **`df2-2` extracts
  `paletteToRgba` into `@shared/` as a Williams 3-3-2 decoder and re-points BOTH
  joust and defender at it.** One decoder, one place someone already debugged.
- If it differs, defender keeps its own decoder in `src/shell/render.ts` and the
  extraction does not happen. **Do not force-share divergent hardware.**

Either way the *pixel* data — the palette **entries** themselves — is transcribed
from the vendored source under the gate, never from MAME (source wins on software
facts; MAME wins only on the byte *format*).

## 5. Story cut (≈18 pts, TDD, gate before constants)

Mirrors joust's `jt1` arc (skeleton → generated pictures + gate → render shell),
bound to this tree's file→subsystem map. Each story is single-sided-cited into
`reference/original-source/defender/`; MAME appears in prose only.

- **`df2-1` — Render seam skeleton (RED first).** `src/core/framebuffer.ts`: a
  pure 292×240 index surface + `clear(index)`; `src/shell/render.ts`: index→RGBA
  (temporary identity palette until df2-2) + `fitIntegerScale` blit; `main.ts`
  steps nothing, paints a cleared framebuffer. Establishes the core/shell seam and
  keeps `purity.test.ts` green. Visible 292×240 pinned to `williams.cpp:1601`
  (schema-only, prose). **(3 pts)**
- **`df2-2` — Palette: the 16-entry CRAM/PCRAM model + the 3-3-2 decode decision.**
  Transcribe Defender's default palette bytes into a gated table; model the
  `PCRAM`(`defender/PHR6.SRC:219`)→`CRAM`(`defender/PHR6.SRC:13`) per-frame copy as
  a pure "resolve 16 indices" step. Read the byte **format** from MAME in prose
  (§4) and, if it is the 3-3-2 joust already decodes, **extract `paletteToRgba`
  to `@shared/` and re-point joust + defender**; else keep local. **(3 pts)**
- **`df2-3` — Character set (`MESS0`) transcription + text writer.** `MESS0` is the
  charset/message block, banked block 2 (`SELECT CHARS`, `defender/DEFA7.SRC:2030-2031`;
  header `defender/MESS0.SRC:1`). GENERATED charset module + independent gate; a
  pure `blitGlyph` into the framebuffer; render a known string. **(4 pts)**
- **`df2-4` — Object image tables (`DEFB6` + `SAMEXAP7`) transcription (INERT).**
  `DEFB6` inline object graphics (the `OBI` object-image headers, e.g. UFO at
  `defender/DEFB6.SRC:1`) and `SAMEXAP7` "SAM EXPLOSIONS AND APPEARANCES"
  (`defender/SAMEXAP7.SRC:6-7`). GENERATED module + gate; data lands INERT, proven
  only by a static gallery blit. No animation, no collision (that is `df4`). **(4 pts)**
- **`df2-5` — Terrain + mini-terrain (`BLK71`) + static planet surface.** `BLK71`
  "TERRAIN, MINI-TERRAIN DATA AND PLAYER EXPLOSION", banked block 7
  (`defender/BLK71.SRC:1-8`; `TLEN EQU $100`, `defender/BLK71.SRC:17`). Transcribe
  the terrain vectors; render a **static** planet surface across the framebuffer
  bottom — the roadmap's "static planet + text early". **(3 pts)**
- **`df2-6` — VISUAL playtest for orientation traps + still-frame proof.**
  Screenshot `http://127.0.0.1:5270/defender/` showing planet + charset text + a
  sample object, compared against a **nonsense control path** (must DIFFER, not
  just return 200 — the `canonical-serve` lesson). Confirm the render orientation
  and colour before physics (playbook §4). Carry forward the `df4` accessibility
  ruling as a note (no full-screen strobe anywhere downstream). **(1 pt)**

Total **18 pts**. Hardening/mutation follow-ups are Reviewer-filed and grouped by
**file surface** (the jt9 gotcha), not folded in ahead of time.

## 6. Traps carried into `df2` (so a story does not re-discover them)

- **Streams are not rasters.** Joust hit compressed picture formats (COMCL5
  Elias-gamma, ASH run-length) that blit as convincing noise if treated as pixel
  grids. Defender's inline tables **may** carry their own packing — each transcribe
  gate must record an `encoding` discriminant per block and refuse to raster a
  non-raster, exactly as joust's `buildAtlas` does.
- **Colours are never invented.** The render shell must scan clean of hard-coded
  colour hex literals; every colour is a transcribed palette entry reached by
  index (joust's standing render rule — port the *test*, not just the intent).
- **Line numbers from tool output only** (`grep -n`), never memory/arithmetic — the
  centipede one-off drift is why the gate exists (`brief.md` §line-number
  discipline). Comment-line-ref guards apply: cite ROM as `defender/<FILE>.SRC:<line>`,
  not TypeScript `file.ts:line`, in new comments.
- **RASM ≠ MAC65.** The defender reader is re-derived, not lifted from joust's
  transcriber: `$`hex + bare decimal, `!>`/`!.` operators, no octal/binary/local
  labels (`brief.md` §2). A byte re-radixed on the way in is a silent fidelity bug.

## 7. Handoff

`df2` is groomed and materialized as `sprint/epic-df2.yaml` (backlog). Ready for
**Grand Admiral Thrawn** (`/pf-sm`) to sequence — `df2-1` first (the RED seam),
then the three transcription stories (`df2-2/3/4/5` parallelisable by file
surface), then `df2-6`'s visual gate last. The one open decision that is a
sprint-planning call, not mine: whether the 18 pts land in the active sprint 2634
(already 491/528, ends 2026-08-25) or the next — flagged, PM/SM owns it.
