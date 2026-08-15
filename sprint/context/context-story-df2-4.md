# Story df2-4 Context

## Title
Object image tables (DEFB6 + SAMEXAP7) transcription — INERT. DEFB6 inline object graphics (the OBI object-image headers, e.g. UFO at defender/DEFB6.SRC:1) and SAMEXAP7 "SAM EXPLOSIONS AND APPEARANCES" (defender/SAMEXAP7.SRC:6-7). GENERATED module + independent gate; each block records an encoding discriminant (refuse to raster a non-raster). Data lands INERT, proven only by a static gallery blit — no animation, no collision (df4).

## Metadata
- **Story ID:** df2-4
- **Type:** story
- **Points:** 4
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Defender — framebuffer render + image-table transcription (phase 2): static pixels on screen before any physics

## Background

**ROM Structure (vendored at `reference/original-source/defender/`):**

- **DEFB6 (DEFB6.SRC)** — Inline object graphics. The `OBI` object-image *headers* (references, e.g. `OBI UFOP1,UFOKIL,$3333` in the UFO process at `defender/DEFB6.SRC:7`) point at the picture **descriptors** this story transcribes: `LABEL FCB W,H` + `FDB <data-ptrs>`, with the raster pixel data at the data labels (e.g. the UFO picture `UFOP1` at `defender/DEFB6.SRC:1954`, pixels `UFOD10` at `:2122`). NOT `DEFB6.SRC:1` — that is the UFO *process/AI code*, not picture data.
- **SAMEXAP7 (SAMEXAP7.SRC:6-7)** — "SAM EXPLOSIONS AND APPEARANCES" is the explosion/appear *engine CODE* (APST/EXST/EXPU vector routines), NOT a pixel table — it holds no raster data. It is the non-raster block the encoding discriminant refuses to raster.

**Design Pattern (from df2-3 precedent):**

This story follows the established transcription pattern from df2-3 (MESS0 charset):
- `scripts/transcribe-<module>.mjs` — tool to extract and codegen the data
- `plugins/defender/src/core/<module>-data.ts` — GENERATED data module
- `plugins/defender/src/core/<module>.ts` — pure reader/decoder
- `plugins/defender/tests/<module>-gate.test.ts` — independent gate re-derives from source, refuses non-matching bytes
- `plugins/defender/tests/<module>-blit.test.ts` — static blit proof

**Key Trap: Encoding Discriminant**

Defender inline tables may carry their own packing (streams-are-not-rasters). Each transcribe gate must record an `encoding` discriminant per block and refuse to raster non-raster streams (joust COMCL5/ASH lesson).

**Citation Gate (df1-1)**

Every new `src/core` constant requires a `claims/*.json` entry under `plugins/defender/tests/audit/`. No `src/core` value without audit coverage.

**Scope Wall**

Data lands INERT — proven only by a static gallery blit. No animation, no collision, no scheduler. Keep `purity.test.ts` green (src/core stays clock-free).

## Technical Approach

Follow the df2-3 pattern (completed 2026-08-15). Copy the shape from these **concrete df2-3 artifacts** — do NOT chase `scripts/transcribe-pictures.mjs`, which the epic prose names but which **does not exist**:
- `scripts/transcribe-charset.mjs` — the transcribe/codegen tool to model the new one on
- `plugins/defender/src/core/charset-data.ts` — the GENERATED data module (model `objects-data.ts` on it)
- `plugins/defender/src/core/charset.ts` — the pure reader
- `plugins/defender/tests/charset-gate.test.ts` — the INDEPENDENT-reader gate (re-derives from source, refuses non-matching bytes)
- `plugins/defender/tests/charset-blit.test.ts` — the static blit proof

ROM source lives at `reference/original-source/defender/` — the `defender/<FILE>.SRC:<line>` citations are shorthand for that directory (verified: `DEFB6.SRC`, `SAMEXAP7.SRC` both present). Comment ROM refs as `defender/<FILE>.SRC:<line>`, never as a TS `file.ts:line`.

Steps:
1. Extract DEFB6 and SAMEXAP7 object-image records from vendored source
2. Build transcribe tool (model on `scripts/transcribe-charset.mjs`)
3. Generate data module with encoding discriminant per block
4. Implement independent gate that refuses non-matching bytes
5. Render a static object gallery to prove data fidelity
6. Enroll every constant in the citation gate (df1-1)

## Scope

**In scope:**
- DEFB6 inline object-image headers (e.g., UFO) transcription
- SAMEXAP7 explosions/appearances transcription
- GENERATED module + independent gate with encoding discriminant
- Static gallery blit proof
- Citation gate compliance (df1-1)
- Keep `purity.test.ts` green

**Out of scope:**
- Object animation (df4)
- Collision detection (df4)
- Scheduler integration (df3)
- Input handling (df3)

## Acceptance Criteria

1. **DEFB6 + SAMEXAP7 transcription** — Extract DEFB6 (object-image headers, e.g., UFO) and SAMEXAP7 (explosions/appearances) blocks from vendored source into a GENERATED `plugins/defender/src/core/objects-data.ts` module. Each transcribed block records its source file+line span.

2. **Encoding discriminant gate** — Implement independent gate (`plugins/defender/tests/objects-gate.test.ts`) that:
   - Re-derives DEFB6/SAMEXAP7 bytes from source using an independent reader
   - Refuses any non-matching byte (block integrity check)
   - Records an `encoding` discriminant per block
   - Refuses to raster non-raster streams (discriminant check)
   - Gate must pass in RED (failing tests before dev writes code)

3. **Static gallery blit proof** — Implement `plugins/defender/tests/objects-blit.test.ts` that:
   - Blits a gallery of transcribed objects into the framebuffer
   - Verifies pixel-by-pixel correctness against ground truth
   - Proves data fidelity without animation or collision

4. **Citation gate compliance (df1-1)** — Every new `src/core` constant (palette index, offset, etc.) must:
   - Enroll in `plugins/defender/tests/audit/claims/` with source file+line citation
   - Pass `citations.test.ts` audit gate (already in place from df1-1)

5. **Purity test remains green** — All changes to `src/core/` (including new objects readers) must:
   - Stay clock-free and deterministic
   - Pass `purity.test.ts` (no side effects, no entropy, no canvas/colour)

6. **No animation or collision** — Object data lands INERT, proven only by static blit. No scheduler, no physics, no game loop integration in this story (df3/df4 concerns).

---
_Generated by `pf context create story df2-4` from the sprint YAML._
