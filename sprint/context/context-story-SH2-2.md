# Context: SH2-2 — Stand up pure @arcade/shared/font + purity guard

## Story ID
SH2-2

## Summary
Promote tempest's VGMSGA stroke-vector font into a pure, shared @arcade/shared/font module; implement a purity-guard test that fails on DOM references in pure subpaths; re-point tempest to consume the shared module and remove its local font assets.

## Specification References
- **Design Spec:** `docs/superpowers/specs/2026-07-08-shared-render-extraction-design.md` (full render-surface extraction strategy)
- **ADR-0002:** Font strategy — the cabinet converges on the ROM stroke-vector font (VGMSGA), retiring the non-commercial Vector Battle TTF cabinet-wide.
- **ADR-0003:** Render-surface extraction governance — font is a PURE subpath, protected by the purity guard; glow/view/compositor/phosphor are BROWSER subpaths (DOM-using, marked exempt).

## Technical Approach

### Phase 1: TEA (RED) — Failing Tests

The RED phase writes tests covering all four acceptance criteria before any implementation:

#### AC-1: @arcade/shared/font module exports
- A `tests/exports.test.ts` unit test (node env) that imports @arcade/shared/font and confirms the named exports:
  - `CELL_W`, `CELL_H` (numeric constants, monospace cell dimensions)
  - `VGMSGA` (glyph table: `{[char: string]: Stroke[]}`)
  - `layoutText(text: string, opts?: LayoutOpts) -> {strokes: Stroke[][], width: number}` (the layout engine)
- Confirms the subpath map includes `font` as an exported entrypoint (package.json `exports["./font"]`).
- The prepare script (`prepare` in arcade-shared's package.json) runs the build, producing `dist/font.js`, `dist/font.d.ts`.

#### AC-2: Purity Guard Test
- A `tests/purity.test.ts` test file (node env, runs in CI) that:
  1. Reads the built `dist/` tree as source text (using node:fs and regex, not static analysis).
  2. Extracts the pure subpath files: `dist/math3d.js`, `dist/rng.js`, `dist/highscore.js`, `dist/loop.js`, `dist/font.js`.
  3. Fails the test if any pure subpath file contains the DOM globals: `document`, `window`, `canvas`, `FontFace`, `requestAnimationFrame`.
  4. Passes if none of the pure subpaths reference these globals.
  5. **Key insight (from arcade-shared-tests-untyped memory):** arcade-shared has no root tsconfig/vitest config; tests run in node with no compile-time type checking. The purity guard MUST pin type contracts at runtime via source-text regex over `dist/`, never via compile-only TypeScript annotations. A TS type guard would be silently stripped during the build.

#### AC-3: tempest re-exports from @arcade/shared/font
- An integration test in tempest (vitest) that:
  - Imports font from `@arcade/shared/font` (via the pinned git-URL dependency).
  - Confirms layoutText is callable and returns `{strokes, width}` with the expected shape.
  - Confirms CELL_W/CELL_H are accessible.
  - Verifies that `src/shell/font.ts` exports these from the shared module (re-export).

#### AC-4: TTF and 'Vector Battle' reference removal
- A lint/grep test or manual verification in tempest that:
  - Confirms `public/fonts/VectorBattle-e9XO.ttf` does NOT exist.
  - Confirms `src/tools/contactSheet.ts` contains NO reference to 'Vector Battle' or `FontFace`.

### Phase 2: DEV (GREEN) — Implementation

#### Step A: Extract @arcade/shared/font

1. **Source:** Tempest's `src/shell/vecfont.ts` (located at `/Users/slabgorb/Projects/a-1/tempest/src/shell/vecfont.ts`).
   - This file contains:
     - The VGMSGA glyph table (the ROM stroke-vector glyphs).
     - `layoutText(text, opts?)` function (layout engine, no DOM calls).
     - `CELL_W` and `CELL_H` constants.
   - Copy verbatim (or with minimal adjustments for module exports).

2. **Create arcade-shared/src/font.ts:**
   - Export: `VGMSGA` glyph table.
   - Export: `layoutText(text: string, opts?: LayoutOpts) -> {strokes: Stroke[][], width: number}`.
   - Export: `CELL_W`, `CELL_H` constants.
   - No DOM references, no global state.

3. **Update arcade-shared/package.json:**
   - Add to `exports` map: `"./font": { "import": "./dist/font.js", "types": "./dist/font.d.ts" }`.
   - Ensure the `prepare` script runs `npm run build` (it should already).

4. **Verify arcade-shared build:**
   - Run `npm run build` in arcade-shared.
   - Confirm `dist/font.js` and `dist/font.d.ts` are produced.
   - Confirm no DOM globals appear in `dist/font.js` (the purity guard will verify this).

5. **Push feat/SH2-2-shared-font-purity-guard to arcade-shared remote.**
   - This step MUST complete before tempest can resolve the pinned git-URL dependency (per arcade-shared-extraction-mechanics memory).
   - Once pushed, tempest's `npm install "@arcade/shared@github:slabgorb/arcade-shared#feat/SH2-2-shared-font-purity-guard"` will resolve the feat branch.

#### Step B: Implement purity-guard test (arcade-shared)

1. **Create `tests/purity.test.ts`:**
   ```typescript
   import { readFileSync } from 'fs';
   import { resolve } from 'path';
   import { describe, it, expect } from 'vitest';

   const DOM_GLOBALS = ['document', 'window', 'canvas', 'FontFace', 'requestAnimationFrame'];
   const PURE_SUBPATHS = ['math3d', 'rng', 'highscore', 'loop', 'font'];

   describe('purity guard', () => {
     it('pure subpaths must not reference DOM globals', () => {
       const distRoot = resolve(__dirname, '../dist');
       const violations: string[] = [];

       for (const subpath of PURE_SUBPATHS) {
         const filePath = resolve(distRoot, `${subpath}.js`);
         const source = readFileSync(filePath, 'utf8');

         for (const global of DOM_GLOBALS) {
           if (new RegExp(`\\b${global}\\b`).test(source)) {
             violations.push(`${subpath}.js references ${global}`);
           }
         }
       }

       expect(violations).toEqual([], violations.join('\n'));
     });
   });
   ```
   - This test reads `dist/` as source text and verifies no pure subpath contains DOM globals.
   - It must pass for the current pure core (math3d, rng, highscore, loop).
   - It must PASS for font (new), confirming font.js is pure.

#### Step C: Re-point tempest to @arcade/shared/font

1. **Update tempest/package.json:**
   - Change the @arcade/shared dependency from its current pinned version to the new feat branch:
     ```json
     "@arcade/shared": "github:slabgorb/arcade-shared#feat/SH2-2-shared-font-purity-guard"
     ```
   - Ensure other deps are stable (no other version changes).

2. **Run `npm install`:**
   - This installs @arcade/shared from the feat branch.
   - Note (from arcade-shared-extraction-mechanics memory): lock staleness may occur. If `npm install` reports stale lock info, force install:
     ```bash
     npm install "@arcade/shared@github:slabgorb/arcade-shared#feat/SH2-2-shared-font-purity-guard"
     ```

3. **Update tempest/src/shell/font.ts:**
   - Replace its contents with:
     ```typescript
     export { VGMSGA, layoutText, CELL_W, CELL_H } from '@arcade/shared/font';
     ```
   - font.ts now re-exports the shared module; it becomes a bridge for backwards compatibility (or can be inlined into callers and deleted later).

4. **Delete tempest/src/shell/vecfont.ts:**
   - This file is now superseded by @arcade/shared/font.
   - Search tempest codebase for imports of `vecfont` and repoint them to `font` (or to `@arcade/shared/font` directly).

5. **Delete tempest's TTF and reference:**
   - Delete `/Users/slabgorb/Projects/a-1/tempest/public/fonts/VectorBattle-e9XO.ttf`.
   - Open `/Users/slabgorb/Projects/a-1/tempest/src/tools/contactSheet.ts` and remove any reference to 'Vector Battle' or FontFace (search for `Vector Battle` and the font-family usage).

6. **Run tests and build:**
   - `npm test` in tempest → all tests green.
   - `npm run build` in tempest → production build succeeds, no errors.
   - Manual visual inspection in the browser (dev server) → text rendering unchanged, no visual regression.

### Key Playbook Mechanics (from prior SH-epic stories)

#### npm git-dep lock staleness
- After re-pointing tempest to the arcade-shared feat branch, the local lock file may report stale info.
- **Recovery:** Force install the pinned ref: `npm install "@arcade/shared@github:slabgorb/arcade-shared#feat/SH2-2-shared-font-purity-guard"`.
- The lock file self-repairs on the next `npm install`.

#### Push feat branch before games can resolve
- The arcade-shared feat branch MUST be pushed to origin before tempest can successfully `npm install` from it.
- If tempest tries to resolve the branch before it's pushed, `npm install` will fail (404 or "branch not found").
- **Order:** 1. Complete arcade-shared implementation, 2. Push feat branch to origin, 3. Update tempest's package.json + run npm install.

#### Provisional feat pins → tag + bump at release
- For now, tempest pins to the arcade-shared feat branch (a moving target).
- At release (SH-epic completion or version bump), the feat branch becomes a release tag (e.g., `@arcade/shared@v0.6.0`).
- The story context does not include release mechanics; DEV and Reviewer ensure the pin works; SM records the provisional ref at finish.

### Untyped Tests in arcade-shared (Node Env)
- arcade-shared has NO root tsconfig.json or vitest.config.ts.
- Tests run in node (not browser) with zero compile-time type checking.
- **Purity guard implication:** Cannot rely on TypeScript annotations or compile-only guards.
- **Must** read built `dist/` files as source text (node:fs + regex) to detect DOM globals.
- **Must** use runtime assertions, never compile-only type narrowing.

### File Locations (for DEV/Reviewer reference)

**Tempest current state:**
- Glyph table & layoutText: `/Users/slabgorb/Projects/a-1/tempest/src/shell/vecfont.ts` (to extract)
- Local font re-export module: `/Users/slabgorb/Projects/a-1/tempest/src/shell/font.ts` (to re-point)
- TTF asset: `/Users/slabgorb/Projects/a-1/tempest/public/fonts/VectorBattle-e9XO.ttf` (to delete)
- 'Vector Battle' reference: `/Users/slabgorb/Projects/a-1/tempest/src/tools/contactSheet.ts` (to remove)

**arcade-shared new module:**
- Source: `src/font.ts` (new)
- Built: `dist/font.js`, `dist/font.d.ts` (after `npm run build`)
- Purity guard test: `tests/purity.test.ts` (new)
- Package exports map: `package.json` `exports["./font"]` (update)

## Design Decisions & Rationale

- **Why VGMSGA over Vector Battle TTF?** The ROM stroke-vector font is:
  - On-brand (a shared visual language across the cabinet).
  - Technically superior (glowing strokes render at any scale, no bitmap/TTF jaggies).
  - Purity-compliant (glyph geometry is pure math, no DOM).
  - Proven (already working in tempest).

- **Why purity guard as a runtime regex test, not a compile-only type guard?**
  - arcade-shared tests run in node with no TypeScript compilation.
  - TypeScript annotations are stripped during the build.
  - A runtime check on the built `dist/` files is the only guarantee that the pure subpaths are actually DOM-free in the delivered artifact.

- **Why push arcade-shared feat branch before re-pointing tempest?**
  - npm resolves git-URL dependencies from the remote.
  - If the feat branch doesn't exist on origin, npm install fails with 404.
  - Local development uses a local path alias or manual npm link; CI/other checkouts require the remote branch.

## Testing Strategy (Phase 3: REVIEW)

- **Code review gates:**
  - Purity-guard test passes (proves font.js and other pure subpaths have zero DOM references).
  - tempest vitest + vite build green (proves re-export compiles and all tests pass).
  - Manual visual inspection (text rendering unchanged, no regression).
  - Git history clean (vecfont.ts deleted, font.ts re-exports, TTF removed, contactSheet cleaned).

## Acceptance Criteria Checklist (for closure)

1. ✓ @arcade/shared/font exports VGMSGA, layoutText, CELL_W/CELL_H; added to exports map; prepare build works.
2. ✓ tests/purity.test.ts fails on DOM globals in pure subpaths; passes for current pure core + new font.
3. ✓ tempest imports from @arcade/shared/font at pinned git-URL; vecfont.ts deleted; font.ts re-exports; vitest + vite build green.
4. ✓ VectorBattle-e9XO.ttf deleted; contactSheet.ts 'Vector Battle' reference removed.
