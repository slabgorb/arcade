# Story 8-4 Context

## Title
Wave 2 — Death Star surface: towers, laser turrets, terrain skim

## Overview
Implement the second playable wave of Star Wars: the Death Star surface phase where the player's cockpit skims the surface terrain while avoiding laser turrets and towers. This story focuses on **geometry reconstruction debt** inherited from the 8-2 model port: the `DEATH_STAR_SURFACE` and `SURFACE_TOWER` models still carry a nearest-neighbour heuristic for edge connectivity (inherited from 8-2) that renders as tangled wireframes in-game. The primary scope is re-authoring both models' edges using ring reconstruction (close each coplanar ring into a loop, add radial spokes/struts), guarding with an `inducedSingleCycle` topology test, and assigning each model a fixed display orientation (matching the authentic object-space axes to the in-game view). Gameplay for surface phase is secondary—terrain skim mechanics, turret spawning, and collision detection follow the same patterns established in Wave 1 (8-3) and rely on the corrected geometry.

## Metadata
- **Story ID:** 8-4
- **Epic:** 8 (Star Wars: vector cockpit shooter)
- **Repo:** star-wars
- **Points:** 5
- **Priority:** p3
- **Workflow:** tdd
- **Type:** feature
- **Depends On:** 8-3 (Wave 1 — space combat)

## Technical Context

### Architecture Boundary (Sacred)
`src/core/` is **pure and deterministic**: no DOM, no window, no canvas, no Date.now()/performance.now()/Math.random(). All 3D math and collision detection route through `src/core/math3d.ts` (the Math Box). Game state is carried in `GameState` with a seeded RNG. `stepGame(state, input, dt)` is referentially transparent.

### Geometry Connectivity (Read Before Starting)
**Critical:** Inherited rendering debt. See `sprint/context/context-epic-8.md` → **"Geometry connectivity (read before 8-4/8-5)"** for the full background. Summary:

- `reference/disasm/Object_3D_Data.asm` contains **vertex tables only**; line-segment connectivity is unrecoverable from the disassembly.
- The 8-2 port used a **nearest-neighbour heuristic** to auto-generate edges, which is well-formed (valid indices, no orphans) but **visually tangled**.
- **TIE fighters (8-3)** were fixed: edges rebuilt from ring structure, guarded by `inducedSingleCycle()` topology test.
- **`DEATH_STAR_SURFACE` and `SURFACE_TOWER` still carry tangled heuristic edges** and **WILL render wrong** until fixed in this story.
- **Re-author both models' edges** by identifying vertex rings (coplanar/equal-radius sets), closing each into a loop, adding radial spokes/struts, and guarding with `inducedSingleCycle()` (pattern reused from 8-3).
- **No new game constants or spawn rules in 8-4** — if needed, derive them from `reference/disasm/StarWars.asm` (for surface phase), but the focus is geometry and rendering.

### Display Orientation (Object-Space vs. In-Game View)
Authentic object-space axes do **not** match the in-game view. Rendering must apply a fixed orientation transform (e.g., a `rotationX`/`rotationZ` from the Math Box) to face the geometry correctly. Example from 8-3:
- TIE solar panels stack along the model's Y axis → `shell/render.ts` applies `TIE_ORIENT` to face them at the player.
- The **Death Star surface floor lies in y=0**; towers stand on +y; the trench (later, 8-5) also lies in y=0.
- **Determine the display orientation in this story** by examining the vertex data and the reference disassembly rendering code (if available) to infer the correct model-to-view transform.
- Store the per-model orientation as a `const` in `shell/render.ts` (e.g., `SURFACE_ORIENT`, `TOWER_ORIENT`), keyed by model type, and apply it at render time.
- **Eyeball every model on first render** — structural tests catch tangles but not orientation or scale.

### Source Material
- **Reference:** `star-wars/reference/disasm/Object_3D_Data.asm` — vertex tables for DEATH_STAR_SURFACE and SURFACE_TOWER
- **Reference:** `star-wars/reference/disasm/StarWars.asm` — surface phase spawn cadence, terrain skim rules, turret behaviour, scoring
- **Disassembly→story map:** See epic 8 context "Disassembly → story map" table
- **Re-expression rule:** Read the .asm tables; re-express game constants and geometry as typed TypeScript in `src/core/models.ts` and `src/core/state.ts`. Do NOT commit reference material into src/.

### Dependencies
- **Math Box (src/core/math3d.ts):** All 3D projection and collision math
- **Models (src/core/models.ts):** DEATH_STAR_SURFACE and SURFACE_TOWER 3D geometry (ported in 8-2, edges TBD in this story)
- **GameState (src/core/state.ts):** Extend with surface phase state (terrain skim position, turret spawns)
- **RNG (src/core/rng.ts):** Seeded random number generation for turret spawn timing
- **Test harness (tests/core/models.test.ts):** Reuse `inducedSingleCycle()` topology validation pattern from 8-3

## Acceptance Criteria (Test-Driven)

### RED Phase (TEA/Han Solo): Write Failing Tests
1. **Model geometry validation:**
   - DEATH_STAR_SURFACE and SURFACE_TOWER models exist in `src/core/models.ts`
   - Each model has a vertices array and an edges array
   - Edges array contains valid indices (no out-of-bounds or negative indices)
   - No duplicate edges (ring closure + spokes are well-formed)
   - **`inducedSingleCycle()` test passes:** Assert that grouped vertices (by ring) form single closed loops with no self-crossing
   - Tests live in `tests/core/models.test.ts` or extend it

2. **Display orientation (structural):**
   - DEATH_STAR_SURFACE has a defined orientation transform (e.g., as a const in render.ts or passed to render function)
   - SURFACE_TOWER has a defined orientation transform
   - Transforms are applied consistently when rendering (mock render test or integration test)

3. **Terrain skim mechanics (gameplay):**
   - Player's Y-position is constrained to skim the surface (y ≈ 0, with small clearance)
   - Terrain collision: player hits DEATH_STAR_SURFACE if Y drops below minimum skim height
   - Turret spawning: turrets spawn on timed schedule (from disasm constants)
   - Turret firing: each turret emits projectiles toward the player
   - Player collision with turret fire decrements lives

4. **All tests RED (failing)** at the end of this phase, ready for GREEN phase

### GREEN Phase (DEV/Yoda): Implement Geometry & Gameplay
1. **Re-author DEATH_STAR_SURFACE edges:**
   - Identify coplanar rings from vertex data
   - Close each ring into an ordered loop around its centroid (counterclockwise, no self-cross)
   - Add radial spokes from ring rims to central points
   - Add struts connecting stacked rings
   - Replace the nearest-neighbour heuristic edges with the reconstructed ring-based edges
   - Ensure `inducedSingleCycle()` test passes with the new edge structure

2. **Re-author SURFACE_TOWER edges:**
   - Apply the same ring reconstruction pattern
   - Validate with `inducedSingleCycle()`
   - Ensure the tower's octagonal base and vertical stacks form proper loops

3. **Define display orientations:**
   - Compute the transform(s) needed to align each model to the in-game coordinate system (floor in y=0, up in +y)
   - Add `SURFACE_ORIENT` and `TOWER_ORIENT` consts to `shell/render.ts`
   - Apply the transforms at render time

4. **Implement terrain skim mechanics:**
   - Extend `src/core/state.ts` with surface phase state (player terrain altitude, turret list, turret firing state)
   - Implement terrain collision (Y-position constraints)
   - Implement turret spawning rules from disasm constants (spawn schedule, count)
   - Implement turret firing rules (projectile creation, direction toward player)
   - Implement collision detection: turret fire ↔ player cockpit (reuse pattern from 8-3)
   - Update lives on collision

5. **Rendering (src/shell/render.ts):**
   - Render DEATH_STAR_SURFACE with the reconstructed edges and display orientation
   - Render SURFACE_TOWER (one or more) with the reconstructed edges and display orientation
   - Render turrets (as glowing vector enemies on the surface)
   - Render turret fire (projectiles)
   - Render terrain collision indicator (visual feedback if player dips too low)
   - HUD: lives and score (carry forward from Wave 1)

6. **Final state:**
   - `src/core/models.ts`: DEATH_STAR_SURFACE and SURFACE_TOWER edges replaced with ring-reconstructed versions
   - `tests/core/models.test.ts`: `inducedSingleCycle()` tests passing for both models
   - `src/shell/render.ts`: SURFACE_ORIENT and TOWER_ORIENT consts, applied at render time
   - `src/core/state.ts`: surface phase state structures
   - `src/core/gameRules.ts` (or equivalent): turret spawn and firing rules
   - All game math in `src/core/`, all rendering in `src/shell/render.ts`
   - Every collision computed in 3D via `math3d.ts`
   - `tsc --noEmit` exits 0
   - `npm run build` succeeds
   - `npm test` passes all vitest tests
   - Public repo contains no .asm or reference material
   - Player can skim the surface, avoid towers/turrets, fire at turrets, and see collisions

## Build & Test Commands
Run inside the star-wars subrepo:
```bash
cd star-wars
npm test                # vitest run
npm run build           # tsc --noEmit && vite build
npm run dev            # vite dev server → http://localhost:5274
```

## Workflow Phase: RED

**Agent:** TEA (Han Solo)
**Goal:** Write comprehensive, failing tests for Death Star surface geometry and gameplay
**Input:** This context document, epic 8 context, context-epic-8.md geometry section, star-wars/reference/ (vertex data, disasm constants)
**Output:** tests/core/models.test.ts extensions (RED, all tests fail) ready for DEV phase

**Phase Gate Condition:** All acceptance criteria have test coverage (tests fail, tree otherwise clean)

### RED Phase Checklist
- [ ] Extend `tests/core/models.test.ts` with geometry validation tests
- [ ] Write tests for DEATH_STAR_SURFACE ring closure and spoke/strut connectivity
- [ ] Write tests for SURFACE_TOWER ring closure and connectivity
- [ ] Write tests validating both models pass `inducedSingleCycle()` check
- [ ] Write tests for display orientation (transform is defined and applied)
- [ ] Write tests for terrain skim mechanics (Y-position constraints, collision detection)
- [ ] Write tests for turret spawning (schedule, count from disasm constants)
- [ ] Write tests for turret firing and collision with player
- [ ] All tests RED (failing)
- [ ] Tree clean (no uncommitted .asm in src/)
- [ ] `npm test` shows all failures
- [ ] Record findings/deviations in session file

## Workflow Phase: GREEN

**Agent:** DEV (Yoda)
**Goal:** Implement geometry reconstruction and terrain skim gameplay
**Input:** tests/core/models.test.ts (RED), star-wars/reference/ (vertex data, disasm constants)
**Output:** Reconstructed model edges, display orientations, terrain skim mechanics

**Phase Gate Condition:** Tests pass, tree clean, no debug code, correct branch

### GREEN Phase Checklist
- [ ] Analyze DEATH_STAR_SURFACE and SURFACE_TOWER vertex rings from src/core/models.ts
- [ ] Re-author DEATH_STAR_SURFACE edges: ring loops + spokes + struts
- [ ] Re-author SURFACE_TOWER edges: ring loops + spokes + struts
- [ ] Verify both models pass `inducedSingleCycle()` tests
- [ ] Define SURFACE_ORIENT and TOWER_ORIENT consts in shell/render.ts
- [ ] Apply orientation transforms at render time
- [ ] Extend `src/core/state.ts` with surface phase state (terrain altitude, turrets)
- [ ] Implement terrain collision (Y-position constraints)
- [ ] Implement turret spawning rules from disasm (spawn schedule, count)
- [ ] Implement turret firing and collision detection (reuse pattern from 8-3)
- [ ] Update `src/shell/render.ts` to render surface, towers, turrets, terrain feedback
- [ ] `npm test` passes all vitest tests
- [ ] `npm run build` succeeds (tsc --noEmit && vite build)
- [ ] No reference/.asm files in src/ or git tracking
- [ ] No debug code or TODOs
- [ ] Branch clean and ready for review
- [ ] Eyeball the rendered models in dev server — verify orientation, scale, no tangling

## Workflow Phase: REVIEW

**Agent:** Reviewer (Leia)
**Goal:** Verify geometry reconstruction is correct, orientation is authentic, collision math is sound
**Input:** Implementation, passing tests, branch
**Output:** Approval or rework request

**Review Focus:**
- Do both model edges form proper ring-based geometry (no nearest-neighbour tangles)?
- Do the `inducedSingleCycle()` topology tests pass with no false positives?
- Is the display orientation authentic to the original cabinet render (disassembly confirmation)?
- Are turret spawn patterns correct from the disassembly?
- Is terrain skim collision detection correct (Y-constrained, velocity-aware)?
- Is all 3D math routed through `math3d.ts`?
- Do tests cover key geometry and gameplay paths?
- Is the core deterministic (no `Date.now()`, `Math.random()` in core)?
- Render the models live in the dev server and confirm no visual artifacts

## Dependencies
- **Depends on:** 8-3 (Wave 1 — space combat)
- **Unblocks:** 8-5 (Wave 3 — trench run), 8-6 (framing/HUD), 8-7 (audio)

## References
- **Epic 8 context:** `sprint/context/context-epic-8.md` (architecture, reference material, geometry debt)
- **Epic 8 geometry section:** `sprint/context/context-epic-8.md` → "Geometry connectivity (read before 8-4/8-5)"
- **Math Box source:** `star-wars/src/core/math3d.ts`
- **Models source:** `star-wars/src/core/models.ts` (DEATH_STAR_SURFACE, SURFACE_TOWER vertex data)
- **8-3 context:** `sprint/context/context-story-8-3.md` (pattern reference: TIE edge reconstruction, inducedSingleCycle test)
- **8-3 topology test:** `tests/core/models.test.ts` (inducedSingleCycle function)
- **Game state:** `star-wars/src/core/state.ts`
- **RNG:** `star-wars/src/core/rng.ts`
- **Disassembly map:** See epic 8 context "Disassembly → story map"
- **Render reference:** `star-wars/src/shell/render.ts` (TIE_ORIENT pattern for per-model orientation)
- **Tempest parallel:** `tempest/src/core/`, `tempest/src/shell/` (boundary enforcement, loop, render patterns)

---
_Generated by setup for TDD workflow (RED → GREEN → review)._
