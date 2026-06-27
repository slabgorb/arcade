# Story 8-2 Context

## Title
Port authentic 3D vector models (Object_3D_Data → core/models)

## Overview
Port the 3D vector model data from the Star Wars arcade cabinet disassembly (Object_3D_Data.asm) into typed TypeScript definitions in star-wars/src/core/models.ts. The models are world-space vertex and edge data for TIE fighters, Death Star surface tiles, towers, and the trench. This is a test-driven implementation: RED phase writes comprehensive test cases asserting model shape, well-formedness, and authentic invariants from the disassembly; GREEN phase implements the real model definitions to pass those tests.

## Metadata
- **Story ID:** 8-2
- **Epic:** 8 (Star Wars: vector cockpit shooter)
- **Repo:** star-wars
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd
- **Type:** feature

## Technical Context

### Architecture Boundary (Sacred)
`src/core/` is **pure and deterministic**: no DOM, no window, no canvas, no Date.now()/performance.now()/Math.random(). All 3D math routes through `src/core/math3d.ts` (the Math Box, built in Wave 0). Models are world-space vertex/edge data only — no rendering, no screen-space math.

### Source Material
- **Location:** `star-wars/reference/disasm/Object_3D_Data.asm` (gitignored, never committed)
- **Content:** Motorola 6809E assembly tables defining 3D vector models — vertex arrays (X, Y, Z coordinates) and line-segment indices (edge pairs referencing vertices)
- **Models to recover:** TIE fighters, Death Star surface tiles, towers, the trench (per the disasm→story map in epic 8 context)
- **Re-expression rule:** Read the .asm tables as the authoritative specification; re-express vertex + edge data as typed TypeScript in `src/core/models.ts`. Do NOT move, commit, or import reference material into src/.

### Math Box (src/core/math3d.ts)
Already built in Wave 0 (story 8-1). Provides:
- `Vec3` type and operations
- `Mat4` (row-major) and matrix operations
- `rotationX/Y/Z`, `translation`, `perspective`, `transform` (with perspective divide)
- Right-handed, looking down −Z (OpenGL convention)

All 3D projection and collision math goes through the Math Box. Do not inline trig or matrix operations elsewhere.

### Acceptance Criteria (Test-Driven)
1. **RED phase (TEA/Han Solo):** Write failing tests asserting:
   - Model data shape: vertices as `Vec3[]`, edges as `[vertexIndex, vertexIndex][]`
   - Well-formedness: all edge indices are in valid range, no degenerate edges (both indices identical)
   - Authentic invariants ported from disassembly:
     - TIE fighter vertex count and symmetry properties
     - Death Star tiles vertex/edge counts
     - Tower and trench geometry constraints
   - Tests live alongside core (e.g., `src/core/models.test.ts`), run via vitest
   - Tests RED (failing) at end of phase

2. **GREEN phase (DEV/Yoda):** Implement model definitions:
   - Recover vertex and edge tables from Object_3D_Data.asm
   - Define typed, immutable model objects in `src/core/models.ts`
   - Export models for use by Wave 1 (8-3) and beyond
   - Make all tests pass
   - Tree remains clean: no reference/.asm in src/, no copy/vendor of disassembly

3. **Final state:**
   - Models are pure typed TS in `src/core/models.ts`
   - Every edge references valid vertices (no out-of-bounds, no degenerates)
   - `tsc --noEmit` exits 0
   - `npm run build` succeeds (tsc --noEmit && vite build)
   - `npm test` passes all vitest tests
   - Public repo (github.com/slabgorb/star-wars) contains no .asm or reference material

## Build & Test Commands
Run inside the star-wars subrepo:
```bash
cd star-wars
npm test                # vitest run (runs models.test.ts)
npm run build           # tsc --noEmit && vite build
```

## Workflow Phase: RED

**Agent:** TEA (Han Solo)
**Goal:** Write comprehensive, failing tests for model data shape and invariants
**Input:** This context document
**Output:** models.test.ts (RED, all tests fail) ready for DEV phase

**Phase Gate Condition:** All acceptance criteria have test coverage (tests fail, tree otherwise clean)

### RED Phase Checklist
- [ ] Create or update `star-wars/src/core/models.test.ts`
- [ ] Write tests for model shape (Vec3[] vertices, edge index pairs)
- [ ] Write tests for well-formedness (edge index bounds, no degenerates)
- [ ] Write tests for TIE fighter invariants (e.g., vertex count, symmetry)
- [ ] Write tests for Death Star tiles invariants
- [ ] Write tests for tower and trench invariants
- [ ] All tests RED (failing)
- [ ] Tree clean (no uncommitted .asm in src/)
- [ ] `npm test` shows all failures
- [ ] Record findings/deviations in session file

## Workflow Phase: GREEN

**Agent:** DEV (Yoda)
**Goal:** Port real model data from disassembly, make tests pass
**Input:** models.test.ts (RED), star-wars/reference/disasm/Object_3D_Data.asm
**Output:** models.ts (implementation), tests GREEN

**Phase Gate Condition:** Tests pass, tree clean, no debug code, correct branch

### GREEN Phase Checklist
- [ ] Read and understand Object_3D_Data.asm tables (TIE, Death Star, towers, trench)
- [ ] Implement model definitions in `star-wars/src/core/models.ts`
- [ ] All models typed as `{ vertices: Vec3[]; edges: [number, number][] }`
- [ ] Ensure immutability (const, readonly)
- [ ] `npm test` passes all vitest tests
- [ ] `npm run build` succeeds (tsc --noEmit && vite build)
- [ ] No reference/.asm files in src/ or git tracking
- [ ] No debug code or TODOs
- [ ] Branch clean and ready for review

## Dependencies
- **Depends on:** 8-1 (Wave 0 scaffold & Math Box)
- **Unblocks:** 8-3 (Wave 1 space combat), 8-4 (Wave 2 Death Star surface), 8-5 (Wave 3 trench run)

## References
- **Epic 8 context:** `sprint/context/context-epic-8.md`
- **Math Box source:** `star-wars/src/core/math3d.ts`
- **Disassembly map:** See epic 8 context "Disassembly → story map"
- **Tempest parallel:** `tempest/src/core/` (boundary enforcement pattern)
- **Orchestrator guide:** `arcade/CLAUDE.md` (reuse-first philosophy, no shared code yet)
- **Repo guide:** `star-wars/CLAUDE.md` (roadmap, boundary rule, ports)

---
_Generated by `pf context create story 8-2` for TDD workflow (RED → GREEN → review)._
