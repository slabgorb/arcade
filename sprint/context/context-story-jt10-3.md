# Story jt10-3: Title screen — MANDATORY CORRECTION BANNER (READ FIRST)

> ✅ **QUARRY RESOLVED (TEA/Tyr, 2026-08-08) — RED landed.** All three items below were resolved from primary source before RED. The authoritative, resolved answers now live in the session file (`.session/jt10-3-session.md`): its **Delivery Findings** (the pinned citations), **Design Deviations** (the "PRESENTED-BY" refutation → retitle; logo=vector not bitmap; cadence 87 not 88), and the **rewritten Acceptance Criteria**. The RED tests + expected values are in `tests/title.test.ts` and `tests/helpers/title-contract.ts`. The three sections below are kept as the QUESTIONS that were asked; read the session for the ANSWERS. **Dev (Loki): build to the failing tests + the session ACs, not to the open-question prose below.**
>
> **TL;DR of the answers:** logo = the VECTOR `LIST` polyline table (ATT.SRC:423-531), not a bitmap; strings = `MSCOPY '(C) 1982 WILLIAMS ELECTRONICS INC.'` (MESSEQU.SRC:129), `MSW17 'EXTRA MOUNT EVERY '` (:158), `MSW18 ',000 POINTS'` (:157), all FONT57; **there is no "PRESENTED BY"** in any revision (dropped, story retitled); cadence = **87** (ATT.SRC:173); palette = MARCOL (ATT.SRC:288-294). The screen is in ATT.SRC → shared across JOUSTRV1..4, no revision ambiguity.

## 1. JOUST LOGO GEOMETRY IS UNLOCATED

**What:** Where the logo picture is built in the ROM is **UNKNOWN**. The story title says "transcribe the JOUST logo picture" but its source location has not been pinned.

**What to do:** Search `reference/williams-source/joust/` for the logo-drawing routine:
- It is NOT among the entity `.PIC` files (`BUZZARD.PIC`, `CLIFF.PIC`, etc.) — verified by the design spec.
- Most likely location: an `ATT.SRC` picture routine (the attract-loop source file).
- Search for labels like `LOGOPIC`, `TITLELOGO`, `TITLEPR*`, or similar; or an embedded routine in an attract-page caller.
- Determine the encoding: nibble-packed bitmap (like glyphs), vector coordinates, or lookup table?
- Is colour hard-coded or indexed?

**Commit before RED:** the exact routine name, source file (e.g., `ATT.SRC`), source line, and any citations needed for the ACs.

## 2. TITLE PHRASING / REVISION IS UNRESOLVED

**What:** The reference title capture (a photograph of the real cabinet's title screen) shows `"PRESENTED BY:"` but the ROM source carries different variants:
- `PHRASE.SRC` has `NEW1 'THIS IS JOUST'` / `NEW2 'DESIGNED BY WILLIAMS ELECTROINCS INC.'`
- These **DISAGREE** on phrasing and on which JOUSTRV revision (1, 2, 3, or 4) the cabinet was running when captured.

**What to do:** Resolve which JOUSTRV revision matches the reference capture, then pin:
1. The three title-line text constants: 
   - `MS17 'EXTRA MOUNT EVERY '` (verify exact text + spacing)
   - `MS18 ',000 POINTS'` (verify exact text)
   - `COPYRGT '(C) 1982…'` (verify year + punctuation + spacing)
2. The opening banner ("PRESENTED-BY:" vs "THIS IS JOUST" vs alternative) and its source line.
3. Whether these live in `MESSAGE.SRC`, `MESSEQU.SRC`, `PHRASE.SRC`, or a JOUSTRV-specific variant.

**Commit before RED:** the exact message number, source line, and verbatim text (with spaces/punctuation) for each phrase.

## 3. TITLE COLOUR CYCLE CADENCE IS UNRESOLVED

**What:** The design spec cites `ATT.SRC:173` ≈ 2.5s for the title screen colour cycle. The exact timing, number of distinct colours, and colour index sequence must be verified.

**What to do:** In `reference/williams-source/joust/ATT.SRC:173` (or thereabouts):
1. Find the page-advance timing or wait routine that controls the colour cycle.
2. Is it ~88 ticks (matching `GOVWAT` from JOUSTRV4.SRC:678 for game-over screen hold)?
3. Confirm the tick rate: is one tick ≈28ms (1/37.5Hz)?
4. How many distinct colours cycle through? Which COLOR1 palette indices?
5. Does the cycle repeat at each page advance or globally?

**Commit before RED:** the exact frame/tick count, colour indices (in order), and the source line(s) that define the cadence.

---

# Background

Joust's cabinet lifecycle epic jt10 adds the full state machine and screens. Story **jt10-2** (DONE) laid the cabinet tier with the `'title'` mode. This story implements the **title screen** — the overlay displayed when `cabinet.mode === 'title'`, showing:
- The JOUST logo picture
- Three text lines in the ROM's FONT57 (5×7 stylized font)
- A colour cycle (~2.5s per frame group per `ATT.SRC:173`)

**Reuse:** jt10-1 ported FONT35 + FONT57 and provided a shell `layoutText` renderer. jt10-2 established the cabinet tier with mode `'title'` already in the `CabinetMode` union and the `toTitle(cab)` transition pinned.

**Constraint:** Pure raster font data (the strings) and colour indices live in `src/core/` (scanned by the jt1-7 purity boundary); shell owns render + colour cycling + timing.

**Specification source:** [docs/superpowers/specs/2026-08-07-joust-cabinet-lifecycle-design.md](../../docs/superpowers/specs/2026-08-07-joust-cabinet-lifecycle-design.md) — Screens table (Title row, line 125) and Open questions (line 180).

# Acceptance Criteria

**PROVISIONAL — PENDING TEA'S QUARRY ABOVE.** Each AC is phrased to become concrete once the three quarry items are resolved.

1. **Core title data module** — new `plugins/joust/src/core/` export (module name TBD by TEA after quarry) with:
   - `TITLE_LOGO_GEOMETRY` — transcribed bitmap/coordinates for the JOUST logo, citing its ATT.SRC routine location.
   - Three text constants (names TBD) — verbatim ROM strings for the title lines, each cited to its MESSAGE.SRC/PHRASE.SRC source line.
   - (Pending TEA's quarry resolution above.)

2. **Shell title overlay** — `plugins/joust/src/shell/titleScreen.ts` or inline in `main.ts` render:
   - Renders the logo bitmap at transcribed coordinates + colour.
   - Renders the three text lines via `layoutText(FONT57, text, colour)` + `paintText` glyph ops.
   - Colour indexing matches the transcribed ATT.SRC palette cycle.

3. **Colour cycle in main.ts** — when `cabinet.mode === 'title'`:
   - Frame counter / timestamp tracks elapsed time in title mode.
   - Cycles through transcribed colours (timing ≈2.5s, exact value TBD by TEA's quarry).
   - Paints the overlay with the current cycle colour.

4. **ROM fidelity + citations** — every element (logo geometry, text strings, colours, timing) cites its exact source line. Passes the joust citation gate.

5. **Vitest core suite** — `cabinet.test.ts` already covers `toTitle(cab)` mode transition (jt10-2); no new core logic tests. Core data module (if needed) is pure string/bitmap data, verified via citation gate.

6. **Purity preserved** — no new core logic. Shell owns render + cycle timing. No changes to `cabinet.ts` / `game.ts` / `frame.ts`.

# Notes for TEA (RED phase)

- **Jt10-1 (DONE) reference:** FONT57 is 6×7 cells (nibble-width 5×7 pixel-pairs → 6 pixels wide; actual cell height 7). Confirmed by jt10-5/jt10-6 sessions.
- **Shell overlay idiom:** Mirror jt10-5 (select screen) and jt10-6 (game-over screen). Both use `layoutText` + `paintText` filling glyph ops via `paintDissolve` (fillRect-per-pixel), not `blitOp`.
- **Purity scanner reads comments:** Avoid literals `window.` / `document.` even in comments (per jt1-7 guard).
- **Reference captures:** Check `docs/reference-captures/` for Joust title-screen photos; if none exist, rely on ROM source + dev-channel screenshots for colour verification.
- **Prior title-screen investigation:** None recorded in memory. This is the first setup for jt10-3.

---

*Context file generated at setup; session file is the authoritative AC carrier.*
