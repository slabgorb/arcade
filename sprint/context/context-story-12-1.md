# Story 12-1: Rim-anchored ROM CURSOR claw (replace depth-projected walker)

## Story Details
- **Story ID:** 12-1
- **Epic:** 12 (Tempest fidelity - round 2)
- **Title:** Rim-anchored ROM CURSOR claw (replace depth-projected walker)
- **Type:** bug
- **Points:** 5
- **Repos:** tempest
- **Workflow:** tdd

## Problem / Root Cause

The gameplay claw (`src/shell/render.ts` → `drawPlayer`, ~line 401) is built from INTERIOR tube depths run through `project()`: feet at the rim (`tube.near`, depth 1.0), `apex = project(tube, lane, 0.74…)` (depth 0.74), `apexIn = project(tube, lane, 0.90)` (depth 0.90). Story 10-12 replaced the linear far→near lerp with a true perspective divide (`perspectiveDepth`, `src/core/geometry.ts:37`, `FAR_RATIO = 60/300`). Under that divide, `perspectiveDepth(0.74) ≈ 0.36` and `perspectiveDepth(0.90) ≈ 0.64`, so the claw's body collapsed toward the vanishing point — its radial reach grew from ~62px (pre-10-12) to ~153px (now), so it visually dominates the tube instead of hugging the near rim. Separately, the shape itself is an INVENTED articulated "walker" (legs, knees, sine-wave gait) — not the authentic ROM CURSOR.

The ROM (`docs/tempest-1981-source-findings.md` §8) calls the player the CURSOR: 8 shapes NCRS1–NCRS8, each an ~8-unit vector delta chain (≈20px at our 300/112 scale), a compact claw pinned at the rim, **re-rolled per lane orientation** (a distinct stored shape per roll — NOT one sprite rotated). Today `src/shell/glyphs.ts:239` has a *stylized* stand-in — `playerClawGlyph(rotation)` / `clawBase()` (a chevron+crossbar built in story 6-8) — but it is (a) dead code (`drawPlayer` never calls it) and (b) NOT the byte-exact ROM shape. **This story replaces that stand-in with the authentic transcribed NCRS1–8 table** (see Authentic Shape Data below).

## Technical Approach (Architect Option B — Rim-anchored, Fixed-size, Screen-space)

Core principle: the claw is a FIXED-SIZE screen-space vector object pinned to the near rim — NEVER built from interior tube depths. This restores ROM fidelity AND structurally immunizes the claw against future projection reworks.

TDD extraction (this is why the story is TDD, not trivial): add a PURE, unit-testable function to `src/core/geometry.ts` — e.g. `clawTransform(tube, lane) → { anchor: Point, scale: number, rotation: number }` (or split into `clawAnchor` / `clawScale` / `clawRotation`). It computes:

- **anchor** = the rim lane-center at the CONTINUOUS lane (`project(tube, lane, 1.0)`), so the claw tracks smooth spinner motion;
- **scale** = tied to the rim lane-width (`laneWidth(tube, lane, 1.0)`) so the claw is ~20px on level 1 (~18% of a rim lane-width) and stays proportional across all 16 tube geometries — a FIXED pixel footprint, independent of interior-depth projection;
- **rotation** = so the glyph muzzle points INWARD (−radial toward the tube center), matching the NCRS per-lane roll.

This is pure math (returns screen-space Points, no canvas/DOM) — boundary-compliant per CLAUDE.md's Hard Architectural Boundary, and testable.

Then `drawPlayer` in `render.ts` is reduced to: call the pure transform, then `strokeGlyph(ctx, playerClawGlyph(roll), anchor.x, anchor.y, scale, rotation, blur)`. Reuse the existing shared glyph renderer `strokeGlyph` (`render.ts:71`) that every enemy/bullet already uses. `playerClawGlyph(roll)` is **rewritten** to return the authentic NCRS shape for that roll index from the transcribed table (see below). Keep `CLAW_COLOR` yellow, the glow (shadowBlur), the `s.mode === 'dying'` alpha fade, and the bright white muzzle-tip dot.

REMOVE from `drawPlayer`: `walkPhase`, `clawPrevLane`, `liftL`/`liftR`, the knee/leg articulation, and both depth-projected anchors (`apex` at 0.74, `apexIn` at 0.90).

DO NOT TOUCH `drawWarp` (`render.ts` ~846) — the warp-dive claw is INTENTIONALLY depth-projected as it dives into the tube; perspective is correct there.

### Authentic Shape Data (NCRS1–8) — IN SCOPE

The ROM re-rolls the claw shape per lane (8 distinct stored shapes), rather than rotating one silhouette. This story transcribes those 8 shapes byte-exact and selects by lane roll.

**Where the data lives (fetch, don't guess):**
- Disassembly: **`charlesUnixPro/Tempest-Source-Code`** → `tempest.a65` (verified rev-3 ROM).
- Claw shapes: **`_pv_t3` point-vector graphics 1–8, lines 14368–14463**. (Graphic **0** in that same table, l.14355–14365, is the *flipper* bowtie — already transcribed in `docs/ux/2026-06-27-enemy-roster-rom-extract.md` §A, a template for the `pv_draw dx,dy` delta format.)
- Shape-selection logic (which graphic for which cursor position): **`draw_player` l.12954–12972**.
- Cross-check: the book-sourced `docs/tempest-1981-source-findings.md` §8 quotes `NCRS1`, `NCRS4`, `NCRS8` verbatim — use these to validate the transcription (⚠️ that doc warns of occasional OCR/typo artifacts in book listings; the disassembly is authoritative).

**Transcription target:** put the 8 delta chains into `src/shell/glyphs.ts` as authentic `GlyphStroke` data (same origin-centred, y-up→y-down convention the other glyphs use), and have `playerClawGlyph(roll)` index the correct one. Orientation is then achieved by **shape-selection** (roll → graphic 1–8), matching the ROM; the transform's `rotation` may reduce to fine-alignment or zero — TEA/Dev to determine from `draw_player`.

**Roll mapping:** 16-lane closed tubes vs 8 stored shapes — derive the roll index from lane angle per `draw_player`'s selection (likely 8 rolls with mirroring, or lane→roll quantization). Open (15-lane) sheets clamp. This mapping is part of the pure, testable transform.

## Acceptance Criteria

1. A new PURE function in `core/geometry.ts` computes the claw's anchor+scale+rotation from `tube`+`lane`; it is unit-tested and depends only on rim points + rim lane-width — NOT on `perspectiveDepth` of any interior depth.

2. Regression guard (test): changing `FAR_RATIO` / the perspective mapping does NOT move or resize the claw body. The claw's on-screen footprint is bounded and small (target ~18–22px on level 1) and does not stretch toward the vanishing point.

3. The gameplay claw renders the authentic ROM CURSOR shape (transcribed NCRS1–8) via `playerClawGlyph`, yellow, glowing — the articulated walker is gone.

4. The claw follows the continuous player lane smoothly and scales proportionally across all 16 tube geometries (closed and open).

5. `drawWarp` is unchanged; all pre-existing tests stay green; the game runs (visual check via `npm run dev` + `src/tools/contactSheet.ts`).

6. No core-boundary violations — the new geometry function is pure (no DOM/canvas/Date/performance/Math.random/requestAnimationFrame).

7. **Byte-exact shapes:** `src/shell/glyphs.ts` carries the 8 authentic claw shapes transcribed from the disassembly (`_pv_t3` graphics 1–8, l.14368–14463). A unit test asserts the transcribed deltas for graphics 1/4/8 match the book §8 samples (`NCRS1`/`NCRS4`/`NCRS8`), and that each chain closes (deltas sum to 0,0) as the ROM shapes do.

8. **Per-lane re-roll:** `playerClawGlyph(roll)` selects the correct authentic shape per lane (roll→graphic mapping derived from `draw_player` l.12954–12972), so the claw visibly re-rolls as the player rotates around the tube — not a single shape spun. The roll-from-lane mapping is pure and unit-tested (correct index per lane, closed-tube wrap and open-sheet clamp).

## Reuse Map (Pragmatic Restraint — Build Almost Nothing New)

Reuse (unchanged): `project`, `laneWidth`, `radialUnit`, `strokeGlyph` (render.ts:71), the `GlyphStroke`/`Glyph` types and `pv_draw`/delta conventions in `glyphs.ts`.

Net-new: (1) a pure geometry transform (anchor+scale, roll-from-lane) + tests; (2) the byte-exact NCRS1–8 shape table replacing the stylized `clawBase`, driven by `playerClawGlyph(roll)` + tests; (3) a ~50-line-shrink rewrite of `drawPlayer`. The stylized `clawBase` chevron is discarded in favor of the transcribed shapes.

## Out of Scope (Deferred Follow-ups)

- **Backfilling the empty `sprint/archive/10-3-session.md`** (separate hygiene task; SM to handle).

## Key Files

- `src/core/geometry.ts` — add pure claw transform + roll-from-lane mapping (+ tests in `tests/core/`)
- `src/shell/render.ts` — rewrite `drawPlayer` (~401–465); leave `drawWarp` alone
- `src/shell/glyphs.ts` — **transcribe** authentic NCRS1–8 into the glyph table; rewrite `playerClawGlyph(roll)` to select by roll (+ tests)
- **Ref (authoritative):** `charlesUnixPro/Tempest-Source-Code` `tempest.a65` — `_pv_t3` graphics 1–8 (l.14368–14463), `draw_player` (l.12954–12972)
- **Ref (checked-in):** `docs/ux/2026-06-27-enemy-roster-rom-extract.md` §A (flipper graphic-0 = `pv_draw` format template) & §G (claw pointer); `docs/tempest-1981-source-findings.md` §8 (NCRS1/4/8 cross-check)
