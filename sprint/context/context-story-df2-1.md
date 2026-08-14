# Story df2-1 Context

## Title
Render seam skeleton (RED first): the pure core framebuffer + the shell render/blit boundary, painting a cleared 292×240 still — pixels, not physics.

## Metadata
- **Story ID:** df2-1
- **Type:** story
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd (phased: setup → RED/TEA → GREEN/Dev → review/Reviewer → finish/SM)
- **Repo:** arcade
- **Epic:** df2 — Defender framebuffer render + image-table transcription (phase 2)
- **Design spec:** `docs/superpowers/specs/2026-08-14-defender-df2-framebuffer-transcription-design.md` §2 (render seam), §5 (df2-1 line), §6 (traps)
- **Epic context:** `sprint/context/context-epic-df2.md` — inherit its guardrails; this story does not restate them.

## Problem
`plugins/defender/` boots a black canvas (`main.ts`, df1-1 scaffold) but has **no
core and no render seam**. Every later df2 story (palette, charset, object tables,
terrain) needs a surface to draw into and a shell to put it on screen. This story
lays that seam — and only that seam — as the first RED-first slice of df2.

It is the direct analog of joust's `jt1` foundation (`plugins/joust/src/core/` ↔
`plugins/joust/src/shell/render.ts`), re-derived for this board. The seam must
exist and be proven before any transcribed data can be trusted to render.

## Technical Approach

Three files, one boundary. Core emits **palette indices**; the shell decides
**pixels**; nothing in the shell reaches back across the boundary.

1. **`plugins/defender/src/core/framebuffer.ts` — PURE.**
   - A 292×240 **visible** index surface: a `Uint8Array` of length `292*240`,
     each element a 4-bit palette **index** (0–15), NOT a colour.
   - `createFramebuffer()` → the surface (+ its `width`/`height`), and
     `clear(fb, index)` → fills every cell with one index.
   - No colour, no canvas, no `Date`, no `Math.random`, no `fetch`, no shell
     import. It must keep `plugins/defender/tests/purity.test.ts` green — that is
     a hard gate, not a preference.
   - Width/height are the visible raster: **292×240**, a MAME board fact
     (`williams.cpp:1601`). MAME is GPL: cite it in **prose only**, never a
     backtick citation, never copy a line. No `claims/*.json` entry is required
     for a schema-only board constant, but the value is stated once and sourced.

2. **`plugins/defender/src/shell/render.ts` — SHELL.**
   - `LOGICAL_WIDTH = 292`, `LOGICAL_HEIGHT = 240` live here (mirror joust's
     `render.ts`), not in core.
   - `indexToRgba(index)` → an RGBA for a palette index using a **TEMPORARY
     identity/placeholder palette**. df2-2 replaces this with the transcribed
     16-entry CRAM palette; this story must make that swap a one-function change,
     so the placeholder is isolated and clearly marked `// TEMPORARY: df2-2`.
   - `render(ctx, fb)` → integer up-scale the index surface to the canvas via
     `@shared/view` `fitIntegerScale` (reuse — do not hand-roll scaling), decode
     each index through `indexToRgba`, blit.
   - **Colours are never invented** (the epic's standing rule): the placeholder is
     the ONLY colour source, reached by index; no scattered hex literals. Later
     stories add the real palette; the discipline starts here.

3. **`plugins/defender/src/main.ts` — SHELL wiring.**
   - Keep `mountCanvas` (`@shared/host-helpers`, already present).
   - Build a framebuffer, `clear` it to a background index, `render` it once per
     `requestAnimationFrame` — but **step no clock and hold no game state**. This
     is a static still: the rAF loop only re-paints the same cleared frame on
     resize. Pixels, not physics.

## Scope
- **In:** the pure `framebuffer.ts` core; the `render.ts` shell (logical dims,
  placeholder index→RGBA, `fitIntegerScale` blit); `main.ts` painting one cleared
  framebuffer through the seam. RED tests first (TEA).
- **Out (df2-2..6 / df3+):** the real transcribed palette; charset; object/terrain
  image tables; ANY animation, scroll, input, enemies, ship, the frame clock, the
  scheduler. No transcription and no `claims/*.json` authoring in this story — the
  only ROM-sourced number is the 292×240 visible raster (prose-cited).

## Acceptance Criteria

- **AC1 — Pure core surface.** `plugins/defender/src/core/framebuffer.ts` exports a
  framebuffer factory and `clear(fb, index)`. The surface is a `Uint8Array` sized
  `292 × 240`; after `clear(fb, n)` every cell equals `n`. Values are treated as
  4-bit indices (0–15).
- **AC2 — Core stays pure.** `plugins/defender/tests/purity.test.ts` passes with the
  new core file present: no `fetch`, canvas, `Date`, or `Math.random` in
  `src/core/`, and no shell import from core.
- **AC3 — Shell owns colour + dimensions.** `plugins/defender/src/shell/render.ts`
  exports `LOGICAL_WIDTH = 292` and `LOGICAL_HEIGHT = 240` and an `indexToRgba`
  (or equivalent) that maps a 0–15 index to an RGBA via a clearly-marked temporary
  placeholder palette — no colour literals scattered elsewhere in the file.
- **AC4 — Integer-scaled blit via shared code.** `render()` up-scales the index
  surface to the canvas through `@shared/view` `fitIntegerScale` (reused, not
  re-implemented) and paints every index through the shell decode. A cleared
  framebuffer produces a single uniform colour filling the letterboxed logical
  area.
- **AC5 — Static still, no clock.** `main.ts` paints a cleared framebuffer through
  the seam and steps no clock / holds no game state; `/defender/` renders a solid
  (non-black-fallback) frame distinct from the lobby SPA fallback. (The mechanical
  DIFFER check already runs in `tests/canonical-serve.test.mjs`; df2-6 does the
  visual screenshot proof — this story only needs the seam wired.)
- **AC6 — df2-2 swap is one function.** The placeholder palette is the single point
  df2-2 will replace; the temporary decode is isolated and commented so swapping in
  the transcribed 16-entry CRAM palette touches one function, not the blit path.

## Fidelity guardrails inherited from the epic context (do not re-argue)
Core/shell boundary is the top rule (`purity.test.ts`); colours are never invented;
the placeholder is explicitly temporary (df2-2); the 292×240 value is a prose-only
MAME board fact (GPL wall); new TS comments cite ROM as `defender/<FILE>.SRC:<line>`
if they cite at all — but this story introduces no ROM data, only the seam. Full
list: `sprint/context/context-epic-df2.md` → Background.

---
_Generated by `pf context create story df2-1`; Problem / Technical Approach /
Acceptance Criteria authored by SM (Grand Admiral Thrawn) from the df2 design spec._