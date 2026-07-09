# Story SH2-3 Context

## Title
Glyph audit across the three canvas games + extend the shared stroke table to cover every rendered character

## Metadata
- **Story ID:** SH2-3
- **Type:** story
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade-shared
- **Epic:** Shared render surface — extract font/glow/view/compositor into @arcade/shared and converge the cabinet on one vector treatment

## Problem
The VGMSGA alphabet covers what Tempest needed; the other games' HUDs will need glyphs it lacks. Enumerate every character asteroids, star-wars, and battlezone actually render (score digits, framing copy, punctuation, (c), radar/HUD labels, etc.), diff against the shared glyph table, and add any missing glyphs drawn in the same monoline VGMSGA style. This discovery gates the per-game migrations (SH2-4/5/6). Record the per-game glyph inventory in the story context.

## Prior Quarry (from SH2-2 archive)

### Font Module Architecture (SH2-2 completed)
The shared module `@arcade/shared/font` was promoted verbatim from tempest's `vecfont.ts` in SH2-2:
- **Location:** `arcade-shared/src/font.ts` (pure, no DOM)
- **Glyph table:** VGMSGA — a monoline ROM stroke-vector alphabet (80 characters: A–Z, 0–9, punctuation/symbols)
- **Exports:**
  - `layoutText(text, opts?) -> {strokes: Stroke[], width: number}` — returns cell-local stroke geometry + advance width
  - Optional `opts: { letterSpacing?: number }` — per-glyph horizontal offset (design §4.1, gates SH2-4's asteroids concern)
  - `GLYPH_CHARS` — string enumerating all supported characters (use for audit gap detection)
  - `charGlyph(c: string) -> VecGlyph | undefined` — accessor for a single glyph geometry
  - `hasGlyph(c: string) -> boolean` — predicate test
  - `CELL_W` / `CELL_H` — monoline cell dimensions (const, same for all glyphs; used for scaling at render)
- **Build:** `dist/font.js` exists (gitignored, built by `npm run build` or `pretest` hook); purity guard scans it as source text
- **Tests:** `arcade-shared/tests/font.test.ts` (27 tests, covering all shapes + letterSpacing)
- **Glyph geometry format:** each glyph is a **sequence of strokes** (polylines) + advance width; a stroke is an array of `[x, y, pen: 0|1]` (0=move, 1=draw) in cell-local coords

### Environment Constraints (from project memory)
- **arcade-shared tests are UNTYPED** — no root `tsconfig.json` in arcade-shared; vitest strips types from test files, so test files get **zero compile-time type checking**. Pin type contracts at **runtime** or via **source-text regex** (node:fs); never compile-only annotations (e.g., `readonly` on a test input won't be enforced). Fake `localStorage` is available on `globalThis`.
- **Purity guard** (`arcade-shared/tests/purity.test.ts`): scans built `dist/` as source text (comments included — do NOT name forbidden DOM globals even in comments). Fail-set: `document | window | canvas | FontFace`. The guard has adversarial self-tests and verifies `dist/font.js` = 0 hits. Pretest builds `dist/` before vitest runs (`npm run build` added to `pretest` hook).

## Technical Approach

### Discovery & Inventory (AC-1)
1. **Read the three render.ts files** in each game to identify all text rendering calls
2. **Extract the character set** from each game's HUD strings (uppercase, lowercase, digits, punctuation, symbols)
3. **Diff each set against `GLYPH_CHARS`** from the shared module (use `charGlyph()` for each char; `hasGlyph()` is a predicate)
4. **Collect the gap list** — characters in any game that `hasGlyph()` returns false for
5. **Document per-game inventory** — table in PR notes / story context + a consolidated gap list

### Game Reference Inventory

#### asteroids (`asteroids/src/shell/`)
- **Main HUD text:** score (7 digits), wave/lives/shield/hyperspace labels, copyright "(c)"
- **Likely inventory:** uppercase A–Z (labels), digits 0–9 (score), space, copyright, maybe punctuation (dash, slash)
- **Search:** `asteroids/src/shell/render.ts` (text rendering code)

#### star-wars (`star-wars/src/shell/`)
- **Cockpit text:** 3D-viewfinder labels (radar, roll, pitch, altitude, speed), copyright, cockpit-frame annotations
- **Likely inventory:** uppercase A–Z, digits, space, punctuation (colon, slash, dash for formatting)
- **Search:** `star-wars/src/shell/render.ts` (look for `ctx.fillText` / `loadVectorFont` calls)

#### battlezone (`battlezone/src/shell/`)
- **Green-vector HUD:** compass cardinal points (N, S, E, W), range/threat labels, copyright, maybe "BATTLEZONE" title
- **Likely inventory:** uppercase A–Z (cardinal points at minimum), possibly digits if range is numeric, space, punctuation
- **Search:** `battlezone/src/shell/render.ts`, check HUD rendering logic

### Implementation (AC-2 & AC-3)
1. For each glyph in the gap list, add to `arcade-shared/src/font.ts` in the `const ROM` map
2. Follow VGMSGA's monoline style (strokes only, no filled regions) — inspect existing glyphs (A, B, I, O, R, T) as reference
3. Test each glyph:
   - `hasGlyph(c)` → true
   - `charGlyph(c)` → valid `VecGlyph` with ≥1 stroke and positive advance width
   - `layoutText(c)` → `{strokes, width}` with proper geometry
   - All strokes cell-local (within CELL_W × CELL_H bounds)
4. Verify **full coverage:** `layoutText` with the full union of all games' text produces `{strokes, width}` with no missing chars

## Scope
- In scope: enumerate every character rendered by the three games; audit glyph coverage; add missing glyphs to the shared module; ensure full text representation.
- Out of scope: per-game migrations (SH2-4/5/6 use the complete font), afterglow porting, glow/view/compositor extraction.

## Acceptance Criteria
- A per-game glyph inventory (asteroids/star-wars/battlezone) is documented and diffed against the shared table; the gap list is explicit.
- Missing glyphs are added to @arcade/shared/font in the VGMSGA monoline style; layoutText unit tests cover each newly added glyph (strokes + advance width).
- layoutText can represent the full text set of all three canvas games with no missing/placeholder characters.

## Key Files & Paths
- **Shared font module:** `arcade-shared/src/font.ts` (add new glyphs here)
- **Shared tests:** `arcade-shared/tests/font.test.ts` (add AC-2 glyph tests here)
- **Game references:**
  - `asteroids/src/shell/render.ts` — text rendering
  - `star-wars/src/shell/render.ts` — cockpit labels
  - `battlezone/src/shell/render.ts` — green-vector HUD

## Notes for TEA (Red Phase)
- **Discovery task:** the RED phase writes the failing tests that assert AC-1 inventory + AC-2 new glyph checks. These tests read the game repos (asteroids/star-wars/battlezone) as a data source (grep/parse their render.ts), not as a build dependency.
- **Quarry artifacts:** the per-game inventory should be documented in an easy-to-read table in the PR notes / story context; the gap list is a checklist of characters to add.
- **Untyped tests reminder:** AC-2 glyph tests must assert geometry using runtime checks (strokes array length, advance width > 0, bounding checks) — not TypeScript type annotations.
- **Purity:** any new glyphs added to `src/font.ts` must remain pure (no DOM, no time, no randomness). The purity guard will re-run and should still pass.

---
_Enhanced with prior TEA quarry from SH2-2 and reference game audit strategy._
