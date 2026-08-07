# Story jt10-1 Context

## Title
Font port: transcribe FONT35 (3x5) + FONT57 (5x7) from MESSAGE.SRC into pure core data, add a shell raster text renderer

## Metadata
- **Story ID:** jt10-1
- **Type:** story
- **Points:** 5
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Joust cabinet lifecycle — attract/title, 1P·2P select, game over, high-score, and Joust's two fonts

## Authoritative sources (read these first)
- **Acceptance criteria + Background:** the session file `.session/jt10-1-session.md`
  carries the 6 derived ACs and the Background. That is TEA's primary spec — do not
  re-derive ACs from this stub.
- **Design spec:** [docs/superpowers/specs/2026-08-07-joust-cabinet-lifecycle-design.md](../../docs/superpowers/specs/2026-08-07-joust-cabinet-lifecycle-design.md)
  ("The fonts" and "Testing strategy" sections).
- **Epic context:** [context-epic-jt10.md](./context-epic-jt10.md).

## Problem
Joust ships TWO raster fonts in the ROM, and neither is transcribed into the clone —
the shell draws only an `8px monospace` dev overlay. Every jt10 cabinet screen (title,
attract banners, 1P/2P select, game over, high-score entry) needs real Joust glyphs, so
this story is the epic's hard prerequisite: it blocks jt10-2 … jt10-7.

## Technical Approach
- **FONT35** — 3×5 glyphs, table begins `reference/williams-source/joust/MESSAGE.SRC:295`
  (`FONT35 FDB S0`). The tight font: scores, BCD, `CREDITS`. ROM routines
  CHR35 / PHR35 / BCD35 / OUTT35.
- **FONT57** — 5×7 glyphs, table begins `MESSAGE.SRC:241` (`FONT57 FDB L0`). The
  stylized wide font: banners/title. ROM routines OUTTEXT / ERTEXT.
- Deliverable: two **pure core data modules** (glyph bitmaps as transcribed data) plus a
  **shell raster text renderer** that lays a string out in a chosen font + colour via the
  existing atlas/blit path (`plugins/joust/src/main.ts` `blit`/`blitOp`,
  `plugins/joust/src/shell/render.ts`).
- This is joust's OWN raster font — **not** the shared vector `@shared/font`.

## Scope
- **In scope:** the two font data modules, glyph fixtures pinning them to MESSAGE.SRC
  under the citation guard, and the shell raster text renderer. Fonts + renderer only.
- **Out of scope:** any screen (title/attract/select/game-over/high-score) — those are
  jt10-2 … jt10-7. No `cabinet.ts`, no mode machine here.

## Constraints
- Both core modules are swept by the **jt1-7 purity scanner**: no clock, no ambient
  entropy, no browser surface, no shell import — and the scanner reads COMMENT TEXT, so
  the literal strings `window.` / `document.` must not appear even in comments.
- Each glyph transcription cites its `MESSAGE.SRC` line under the joust citation gate.
- Radix discipline is Motorola: bare decimal, `$` hex.

## Acceptance Criteria
Recorded in `.session/jt10-1-session.md` (6 ACs, derived from the design spec). Not
duplicated here to avoid drift — read them there.

---
_Hand-authored by SM at setup (2026-08-07); replaces the `pf context create` stub, whose
"no ACs" text contradicted the session file. Authoritative ACs live in the session file._
