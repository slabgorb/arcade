# Story df2-6 Context

## Title
VISUAL playtest for orientation traps + still-frame proof: screenshot http://127.0.0.1:5270/defender/ showing planet + charset text + a sample object, compared against a nonsense control path (must DIFFER, not just return 200 — the canonical-serve lesson; the mechanical DIFFER check already runs in tests/canonical-serve.test.mjs). Confirm render orientation and colour BEFORE physics (playbook sec 4). Carry forward the df4 accessibility ruling as a note (no full-screen strobe downstream).

## Metadata
- **Story ID:** df2-6
- **Type:** story
- **Points:** 1
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Defender — framebuffer render + image-table transcription (phase 2): static pixels on screen before any physics

## Problem

This story is the visual gate for df2 — confirming that the static render pipeline
(framebuffer index surface + palette decode + charset blit + object/terrain gallery)
produces correct pixels with correct orientation and colour **before** any physics
or scheduler is added. df2-1/2/3/4/5 transcribe and prove data fidelity in isolation;
df2-6 confirms the integrated still-frame render matches cabinet expectations.

The playbook (`docs/playbooks/next-sprite-game.md` §4) calls this the "visual playtest
for orientation traps" — the gate that catches orientation drift (e.g., X-Y axis swap,
clipping boundaries) before physics makes the bug harder to spot.

## Technical Approach

The test is a **comparative screenshot**:

1. **Render path:** `http://127.0.0.1:5270/defender/` should serve the dev server,
   mounting the defender plugin (already set up by Vite in `vite.config.ts`).
   `plugins/defender/src/shell/main.ts` paints the static render (cleared framebuffer,
   text, object gallery, planet surface) — all data transcribed in df2-1/2/3/4/5.

2. **Screenshot proof:** Capture a frame showing:
   - **Planet surface** (BLK71 terrain render across the framebuffer bottom)
   - **Charset text** (MESS0 character set, a known string like "DEFENDER" or a status line)
   - **Sample object** (a single DEFB6 object from the gallery, e.g., UFO or laser)
   - **Framebuffer dimensions:** 292×240 visible raster (df1 fact)
   - **Orientation:** confirm axes align cabinet reality (X horizontal, Y vertical top-to-bottom)
   - **Colours:** verify palette bytes decode to expected RGB (spot-check a few palette entries)

3. **Canonical-serve lesson (the DIFFER check):**
   The test must verify the screenshot at `/defender/` **differs** from a nonsense
   control path (e.g., `/nonsense-path/` returns the lobby fallback).
   `tests/canonical-serve.test.mjs` already mechanically verifies this DIFFER pattern;
   this story **confirms visually** that the game render is not the fallback.

4. **Accessibility forward-note:** Record that df2 renders no full-screen strobe,
   and carry the df4/df7 constraint forward (smart-bomb/death effects must not strobe
   — freeze/fade/particle instead, owner has photosensitive epilepsy).

## Scope

**In scope:**
- Visual proof that the static render (cleared framebuffer, text, objects, terrain) appears on-screen
- Screenshot comparison confirming the render is not a fallback/404
- Spot-check orientation (axes correct, no flips) and colour fidelity (palette bytes decode correctly)
- Accessibility note: no strobe in df2; df4/df7 must inherit the constraint
- Integration test (first time all df2-1/2/3/4/5 pieces render together)

**Out of scope:**
- Physics, collision, animation
- Input, scroll, world-wrap, camera
- The scheduler or frame clock
- Individual piece fidelity (df2-1/2/3/4/5 gates prove those)
- Exhaustive pixel-perfect matching (spot-check orientation and colours; per-pixel matching is orchestrator suite scope)

## Acceptance Criteria

1. **Dev-server render proof** — `http://127.0.0.1:5270/defender/` serves the Defender
   plugin with the static render visible (main.ts paints cleared framebuffer + text +
   object gallery + planet surface from df2-1/2/3/4/5 transcriptions).

2. **Screenshot shows expected content** — A frame capture includes:
   - Planet surface at the framebuffer bottom (BLK71 terrain)
   - At least one line of charset text (MESS0)
   - At least one object from the DEFB6 gallery (e.g., UFO, laser, player ship)
   - All within the 292×240 visible raster boundary

3. **Canonical-serve DIFFER test** — Verify `/defender/` render **differs** from
   a nonsense control path (e.g., `/nonsense-defender/` or `/badpath/`); the DIFFER
   check in `tests/canonical-serve.test.mjs` already runs mechanically; the visual
   gate confirms it is not a fallback.

4. **Orientation spot-check** — Confirm by inspection:
   - X-axis horizontal (planet wraps left-right, not top-bottom)
   - Y-axis vertical top-to-bottom (objects at the top of the screen are near y=0)
   - No axis swap, no flips, no 90° rotations

5. **Colour spot-check** — Verify by inspection:
   - Palette entries render as expected RGBA (pick 2–3 entries from the palette, spot-check their on-screen colour)
   - No hard-coded hex literals (every colour is a palette index, decoded via `paletteToRgba`)
   - `colours-are-never-invented` rule holds

6. **Accessibility note recorded** — Session file or story notes record:
   - "df2 renders no full-screen strobe"
   - "df4/df7 inherit the constraint: smart-bomb/death effects must freeze/fade/particle, not strobe (owner photosensitive)"

7. **No debug code, tree clean** — No temporary tests, logging, or commented-out proof harnesses left behind.
   The static render is permanent shell code; proof is the visual output, not instrumentation.

---
_Generated by `pf context create story df2-6` from the sprint YAML._
