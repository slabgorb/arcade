# Story A2-9 Context

## Title
Bullet range too short — retune bullet lifetime/travel distance against ROM reference

## Metadata
- **Story ID:** A2-9
- **Type:** bug
- **Points:** 2
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** asteroids
- **Epic:** A2 (Asteroids — playtest followup)

## Problem
During live playtest of Asteroids, players reported that bullets dissipate too quickly and don't travel far enough across the playfield to effectively engage distant targets (large asteroids or saucers). The current bullet lifetime and travel distance do not match the 1979 Atari Asteroids ROM reference, resulting in shorter effective range and reduced tactical depth compared to the original arcade game.

## Technical Approach

**1. Identify bullet lifecycle parameters in the core simulation**
- Locate the bullet entity definition and lifecycle code in `asteroids/src/core/sim.ts` (or similar).
- Identify the parameters that control:
  - Bullet lifetime (frames before dissipation or time-to-live in ms)
  - Bullet velocity/speed (units per frame or similar)
  - Maximum travel distance (if enforced separately)

**2. Reference the 1979 Atari ROM for authentic bullet behavior**
- Consult the authentic Asteroids ROM disassembly or reference documentation to determine:
  - How long a bullet lives before dissipating (in frames, ticks, or time units)
  - The bullet velocity in the original game (screen units per frame or equivalent)
  - Any constraints on maximum travel distance
- Calculate the expected maximum travel distance: `lifetime_frames × velocity_per_frame`

**3. Retune bullet parameters to match ROM reference**
- Update the bullet lifetime and velocity in the core sim to match the ROM reference values.
- Ensure the retune is applied consistently to all bullet instances (player-fired and saucer-fired, if different in ROM).
- Avoid changing other bullet properties (collision detection, spawn location, etc.).

**4. Testing approach (TDD: RED phase)**
- Unit tests that verify bullet lifetime and velocity match the ROM reference values.
- Behavioral tests that confirm a bullet spawned on screen travels the expected maximum distance before dissipating (testable via frame-count simulation).
- Visual verification in the dev server (:5275): spawn a bullet in various positions and confirm it travels the expected distance across the playfield.
- Regression tests: ensure existing rock-collision and saucer-collision detection is unchanged.

## Acceptance Criteria
- Bullet lifetime matches the ROM reference (exact frame count or equivalent time unit)
- Bullet velocity matches the ROM reference (screen units per frame or equivalent)
- Calculated maximum travel distance = lifetime × velocity matches the expected ROM reference distance
- A bullet spawned on screen travels the full expected distance before dissipating (within a tolerance of ±1 frame or ±1 pixel)
- Player-fired bullets and saucer-fired bullets (if tracked separately in ROM) have correct respective ranges
- Visual appearance in the dev server (:5275) confirms bullets now reach distant targets; npm run build clean and tests green

## Key Files
- **Core Simulation:** `asteroids/src/core/sim.ts` — bullet entity definition, lifecycle, and parameters
- **Constants:** `asteroids/src/core/constants.ts` (or similar) — bullet lifetime, velocity constants
- **Tests:** `asteroids/tests/core/` — unit and behavioral tests for bullet range

## Related Context
- Epic A2 focuses on visual polish and clarity fixes from the initial playtest; A2-9 addresses a gameplay usability gap (range) identified by players.
- Sibling stories A2-6 and A2-7 also involve bullet/rock mechanics (split spread and collision). Coordinate if either story changes bullet velocity or collision logic.
- The Asteroids core simulation (`src/core/sim.ts`) is the single source of truth for bullet behavior; no shell-layer rendering changes needed.

## Notes
- The ROM reference is canonical; match it exactly or justify any deviation (e.g., for readability or test-ability).
- Consider whether saucer-fired bullets should have a different range than player-fired bullets (check ROM).
- Verify the retune works correctly at all wave levels (if difficulty scales bullet speed/lifetime in the ROM).
