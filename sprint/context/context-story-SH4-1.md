# Context: SH4-1 — Lift the 3-D model/sheet dev-tool helpers into a new pure @shared/model-view

## Background

This story extracts three helper functions that are currently duplicated across game dev-tools and core modules. These are verified byte-identical or near-identical implementations that belong in the shared library.

**The three helpers:**
1. `cellRects(w,h,count,cols)` — grid partitioner
   - BYTE-IDENTICAL across three files (md5 90a04d31…):
     - `plugins/red-baron/src/tools/sheetLayout.ts:51-66`
     - `plugins/star-wars/src/core/modelView.ts:44-59`
     - `plugins/tempest/src/core/modelView.ts:16-31`
   - Red-baron's own header comment calls its copy "the THIRD copy … a genuine candidate for extraction"

2. `fitDistance(radius,fovY)` — camera fit distance
   - BYTE-IDENTICAL in two files (md5 b495785f…):
     - `plugins/red-baron/src/tools/sheetLayout.ts:44-48`
     - `plugins/star-wars/src/core/modelView.ts:37-41`
   - Tempest has no fitDistance implementation

3. `modelBounds` — bounding sphere
   - NEAR-identical in two files, but signatures DIFFER:
     - Red-baron: `modelBounds(points: readonly Vec3[])`
     - Star-wars: `modelBounds(model: Model3D)` (iterates `model.vertices`)
   - **Decision:** Adopt red-baron's `readonly Vec3[]` signature for the shared version

---

## SCOPE CORRECTION

**Critical scope clarifications — read first before implementation:**

1. The title says these helpers are "on no game's render path." That is DEFENSIBLE only in the production sense: star-wars imports `modelBounds` into `plugins/star-wars/src/shell/debug-overlay.ts:234`, which is `import.meta.env.DEV`-gated in `main.ts:81,293` and tree-shaken out of production builds. So it never runs in a shipped game — but it IS a SHELL module, so the extraction DOES edit shell code, not just dev-tool `tools/` code.

2. Adopting red-baron's `readonly Vec3[]` signature means every star-wars call site currently passing a `Model3D` must switch to passing `.vertices`. The call sites that MUST change:
   - `plugins/star-wars/src/tools/contactSheet.ts:80` → `modelBounds(m)` → `modelBounds(m.vertices)`
   - `plugins/star-wars/src/tools/contactSheet.ts:135` → `modelBounds({ name, vertices, edges: [] })` → pass `.vertices`
   - `plugins/star-wars/src/shell/debug-overlay.ts:234` → `modelBounds(model)` → `modelBounds(model.vertices)`
   - `plugins/red-baron/src/tools/contactSheet.ts:86` already passes `.points` — NO change needed.

3. After extraction, the three existing definition sites (red-baron sheetLayout.ts, star-wars modelView.ts, tempest modelView.ts) should import from / re-export `@shared/model-view` rather than redefining. star-wars & tempest `core/modelView.ts` are under the purity rule, but @shared is already a legal core import (math3d, rng), so this is clean.

4. `@shared` is a directory alias (`@shared/*` → `src/shared/*`) already declared in vite.config.ts, vitest.config.ts and tsconfig.json — a NEW file `src/shared/model-view.ts` needs NO new alias registration.

5. Existing tests that will need re-pointing/verifying: 
   - `plugins/tempest/tests/core/modelView.test.ts`
   - `plugins/star-wars/tests/core/modelView.test.ts`
   - `plugins/red-baron/tests/tools/sheetLayout.test.ts`
   - `plugins/star-wars/tests/core/tie-perspective-scale.test.ts` (consumes modelBounds)
   - `plugins/star-wars/tests/shell/debug-overlay.test.ts` (consumes modelBounds)

---

## Acceptance Criteria

1. **AC-1: Create src/shared/model-view.ts with all three functions**
   - Create a new pure module `src/shared/model-view.ts`
   - Export `cellRects(w,h,count,cols)` — grid partitioner (byte-identical from existing implementations)
   - Export `fitDistance(radius,fovY)` — camera fit distance (byte-identical from existing implementations)
   - Export `modelBounds(points: readonly Vec3[])` — bounding sphere with red-baron's readonly Vec3[] signature

2. **AC-2: All three functions are byte-identical or faithful to existing logic**
   - cellRects must be byte-identical to red-baron/star-wars/tempest versions
   - fitDistance must be byte-identical to red-baron/star-wars versions
   - modelBounds must compute identical sphere bounds using the red-baron algorithm

3. **AC-3: Update all call sites to use @shared/model-view**
   - Red-baron tools/sheetLayout.ts imports/re-exports from @shared/model-view
   - Star-wars core/modelView.ts imports/re-exports from @shared/model-view
   - Tempest core/modelView.ts imports/re-exports from @shared/model-view
   - All star-wars call sites passing Model3D are updated to pass .vertices instead

4. **AC-4: All existing tests pass**
   - plugins/tempest/tests/core/modelView.test.ts passes
   - plugins/star-wars/tests/core/modelView.test.ts passes
   - plugins/red-baron/tests/tools/sheetLayout.test.ts passes
   - plugins/star-wars/tests/core/tie-perspective-scale.test.ts passes
   - plugins/star-wars/tests/shell/debug-overlay.test.ts passes
   - Full orchestrator suite passes (npm run test:orchestrator)

5. **AC-5: @shared/model-view is properly typed and importable**
   - Module is importable as `@shared/model-view` via existing alias
   - All functions are properly TypeScript-typed
   - No new tsconfig/vite/vitest alias registration needed

---

## Implementation Notes

- This is a pure, dev-tool-only extraction — debug-overlay and contact sheets only
- The shared functions will be tested in the shared library test suite
- All game-specific call sites must remain green after the extraction
- Verify that all imports resolve correctly before proceeding to review
