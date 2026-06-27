# Story 8-3 Context

## Title
Wave 1 — space combat: cockpit crosshair, TIE fighters, fireballs, firing, 3D collisions, lives, score

## Overview
Implement the first playable wave of Star Wars: the space combat phase where the player's cockpit (first-person viewpoint through a crosshair) faces waves of incoming TIE fighters. The player fires projectiles to destroy TIE fighters and fireballs. Collisions with enemy fire or enemy contact reduce lives; destroying enemies increments score. This is test-driven: RED phase writes comprehensive acceptance criteria as failing tests covering gameplay mechanics (firing, collision detection, scoring, lives); GREEN phase implements the core game loop, enemy AI, firing system, and 3D collision detection to make tests pass.

## Metadata
- **Story ID:** 8-3
- **Epic:** 8 (Star Wars: vector cockpit shooter)
- **Repo:** star-wars
- **Points:** 5
- **Priority:** p2
- **Workflow:** tdd
- **Type:** feature
- **Depends On:** 8-2 (Port authentic 3D vector models)

## Technical Context

### Architecture Boundary (Sacred)
`src/core/` is **pure and deterministic**: no DOM, no window, no canvas, no Date.now()/performance.now()/Math.random(). All 3D math and collision detection route through `src/core/math3d.ts` (the Math Box, built in Wave 0). Game state (firing, collisions, lives, score) is carried in `GameState` with a seeded RNG. `stepGame(state, input, dt)` is referentially transparent.

### Source Material
- **Reference:** `star-wars/reference/disasm/StarWars.asm` (gitignored, never committed) — contains spawn cadence, wave/phase structure, scoring tables, and difficulty parameters for space phase
- **Disassembly→story map:** See epic 8 context "Disassembly → story map" table
- **Re-expression rule:** Read the .asm tables as authoritative specification; re-express game constants and mechanics as typed TypeScript in `src/core/state.ts` and rule functions. Do NOT move, commit, or import reference material into src/.

### Dependencies
- **Math Box (src/core/math3d.ts):** All 3D projection and collision math
- **Models (src/core/models.ts):** TIE fighter and player cockpit 3D geometry (ported in 8-2)
- **GameState (src/core/state.ts):** Already initialized with `phase: 'space'`, health, score, wave/level; extend with firing state and enemy spawns
- **RNG (src/core/rng.ts):** Seeded random number generation for enemy spawn timing and behaviour

### Acceptance Criteria (Test-Driven)
1. **RED phase (TEA/Han Solo):** Write failing tests asserting:
   - **Cockpit & crosshair rendering:**
     - Crosshair positioned at screen center when phase is 'space'
     - Crosshair updates orientation (rotation) based on mouse cursor
   - **Firing system:**
     - Player fires projectiles (fireballs) at mouse click
     - Each projectile has position, direction, velocity (3D in world space)
     - Projectiles exist for a bounded time before expiring
   - **Enemy spawning & movement:**
     - TIE fighters spawn at wave start, on a timed schedule from the disassembly
     - Enemies move in 3D using defined patrol/attack patterns (from disasm)
     - Enemy fireballs spawn and move toward player cockpit
   - **3D collision detection:**
     - Projectile↔TIE fighter: hit detection returns collision point and object pair
     - Enemy fire↔player cockpit: hit detection
     - All collision math uses `math3d.ts` transformations and bounding volumes
   - **Scoring:**
     - Destroying a TIE fighter increments score by a value from the disassembly
     - Score updates on HUD
   - **Lives & game over:**
     - Player starts with lives from disassembly constant
     - Collision with enemy or enemy fire decrements lives
     - When lives reach 0, wave ends (phase transitions or game ends — 8-3 spec says only space phase for now)
   - **Tests live alongside core** (e.g., `src/core/gameRules.test.ts` or `src/core/state.test.ts`), run via vitest
   - **Tests RED (failing)** at end of phase

2. **GREEN phase (DEV/Yoda):** Implement game mechanics:
   - Extend `src/core/state.ts` with firing state, enemy list, projectile list
   - Implement `stepGame(state, input, dt)` updates:
     - Advance time, update input (mouse position for crosshair rotation)
     - Spawn enemies on schedule from wave rules
     - Move projectiles, enemies, enemy fire
     - Detect collisions (projectile↔enemy, enemy fire↔cockpit)
     - Update score and lives on collision
     - Return new state
   - Recover spawn cadence, scoring tables, and difficulty from StarWars.asm
   - Ensure all 3D math and collision detection goes through `math3d.ts`
   - Make all tests pass
   - Tree remains clean: no reference/.asm in src/

3. **Rendering (src/shell/render.ts):**
   - Cockpit crosshair: small glowing vector (+) at screen center, rotated by mouse direction
   - TIE fighters: render from 3D model, project through Math Box to screen
   - Projectiles: small glowing vectors in flight path
   - Enemy fire: small glowing vectors
   - Enemies destroyed: visual effect (brief glow burst) → removal
   - HUD: lives and score as glowing vector text (no DOM/SVG, all canvas vector rendering)

4. **Final state:**
   - `src/core/state.ts`: extended with firing, enemy, and projectile state
   - `src/core/gameRules.ts` (or equivalent): enemy spawn, firing, collision, scoring rules
   - All game math in `src/core/`, all rendering in `src/shell/render.ts`
   - Every collision computed in 3D via `math3d.ts`
   - `tsc --noEmit` exits 0
   - `npm run build` succeeds (tsc --noEmit && vite build)
   - `npm test` passes all vitest tests
   - Public repo (github.com/slabgorb/star-wars) contains no .asm or reference material
   - Player can fly the cockpit, fire at enemies, see collisions and score updates, and lose when lives reach 0

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
**Goal:** Write comprehensive, failing tests for Wave 1 gameplay mechanics
**Input:** This context document, epic 8 context, star-wars/reference/disasm/StarWars.asm (for constants)
**Output:** gameRules.test.ts (RED, all tests fail) ready for DEV phase

**Phase Gate Condition:** All acceptance criteria have test coverage (tests fail, tree otherwise clean)

### RED Phase Checklist
- [ ] Create `star-wars/src/core/gameRules.test.ts` (or extend state.test.ts)
- [ ] Write tests for cockpit crosshair (position, rotation)
- [ ] Write tests for firing system (projectile creation, lifetime)
- [ ] Write tests for enemy spawning (spawn schedule, count, movement patterns)
- [ ] Write tests for 3D collision detection (projectile↔enemy, enemy fire↔cockpit)
- [ ] Write tests for scoring and lives (collision events, state updates)
- [ ] All tests RED (failing)
- [ ] Tree clean (no uncommitted .asm in src/)
- [ ] `npm test` shows all failures
- [ ] Record findings/deviations in session file

## Workflow Phase: GREEN

**Agent:** DEV (Yoda)
**Goal:** Implement Wave 1 game mechanics, make tests pass
**Input:** gameRules.test.ts (RED), star-wars/reference/disasm/StarWars.asm (spawn cadence, scoring, difficulty)
**Output:** Implement game rules, projectile/enemy management, collision detection

**Phase Gate Condition:** Tests pass, tree clean, no debug code, correct branch

### GREEN Phase Checklist
- [ ] Extend `src/core/state.ts` with firing, enemy, projectile state structures
- [ ] Implement enemy spawning rules from disassembly (wave structure, spawn times)
- [ ] Implement firing system (`stepGame` handles click → projectile creation)
- [ ] Implement 3D collision detection using `math3d.ts` transforms
- [ ] Implement scoring rules (point values from disasm for each enemy type)
- [ ] Implement lives system (start value, decrement on collision)
- [ ] `npm test` passes all vitest tests
- [ ] `npm run build` succeeds (tsc --noEmit && vite build)
- [ ] No reference/.asm files in src/ or git tracking
- [ ] No debug code or TODOs
- [ ] Branch clean and ready for review
- [ ] Update `src/shell/render.ts` to draw crosshair, enemies, projectiles, HUD

## Workflow Phase: REVIEW

**Agent:** Reviewer (Leia)
**Goal:** Verify gameplay is authentic, collision math is correct, tests comprehensive
**Input:** Implementation, passing tests, branch
**Output:** Approval or rework request

**Review Focus:**
- Are enemy spawn patterns authentic to the disassembly?
- Are collision volumes (3D bounding shapes) correctly defined?
- Is all projection math routed through `math3d.ts`?
- Are scoring values correct from disasm?
- Do tests cover key gameplay paths (spawn, fire, collide, score)?
- Is the core deterministic (no `Date.now()`, `Math.random()` in core)?

## Dependencies
- **Depends on:** 8-2 (Port authentic 3D vector models)
- **Unblocks:** 8-4 (Wave 2 Death Star surface), 8-6 (framing/HUD), 8-7 (audio)

## References
- **Epic 8 context:** `sprint/context/context-epic-8.md`
- **Math Box source:** `star-wars/src/core/math3d.ts`
- **Models source:** `star-wars/src/core/models.ts` (from 8-2)
- **Game state:** `star-wars/src/core/state.ts`
- **RNG:** `star-wars/src/core/rng.ts`
- **Disassembly map:** See epic 8 context "Disassembly → story map"
- **Tempest parallel:** `tempest/src/core/`, `tempest/src/shell/` (boundary enforcement, loop, render patterns)
- **Orchestrator guide:** `arcade/CLAUDE.md` (reuse-first philosophy, no shared code yet)
- **Repo guide:** `star-wars/CLAUDE.md` (roadmap, boundary rule, ports)

---
_Generated by setup for TDD workflow (RED → GREEN → review)._
