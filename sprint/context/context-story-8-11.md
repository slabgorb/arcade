# Story 8-11: Fix Wave 2 Death Star surface geometry not visible during gameplay

**ID:** 8-11 | **Type:** bug | **Points:** 3 | **Priority:** p1 | **Workflow:** tdd

## Problem Statement

During Wave 2 (Death Star surface phase), the DEATH_STAR_SURFACE geometry does not render or is not visible during live gameplay, despite turrets and other elements rendering correctly. The phase is reachable (via story 8-8 phase-progression machinery) and turrets spawn and scroll correctly, but the floor geometry the player is skimming over is absent or clipped.

## Root Cause Analysis

The DEATH_STAR_SURFACE is positioned at Z=0 (at the cockpit camera location) in `src/shell/render.ts:88-90`:

```typescript
const floor: Vec3 = [0, -state.altitude, 0]
drawWireframe(ctx, DEATH_STAR_SURFACE, floor, proj, w, h, SURFACE_GLOW, SURFACE_ORIENT)
```

This causes the geometry to be:
1. **Behind or at the camera clip plane** — the near clip plane is NEAR=1 (`wireframe.ts:14`), so any vertex with z ≥ -1 is clipped out by `project()` (`wireframe.ts:32-36`).
2. **Spatially disconnected from turrets** — turrets spawn at Z = -SPAWN_DISTANCE = -1200 (`sim.ts:452`) and scroll toward the camera, but the surface floor is at Z=0, creating a spatial mismatch where the turrets appear to float.

The DEATH_STAR_SURFACE model vertices span Z from -3840 to +6720 in object space. After the SURFACE_ORIENT rotation (-90° about Z), these vertices require a world-space Z placement ahead of the camera (negative Z) to be visible and coincident with the turrets.

## Technical Approach

### AC-1: Surface Geometry Visibility
Position the DEATH_STAR_SURFACE at a Z distance ahead of the camera that:
1. Places it in front of the near clip plane (z < -NEAR).
2. Aligns spatially with turret spawning and scrolling (z ≈ -SPAWN_DISTANCE or deeper based on model extent).
3. Maintains visual coherence with the terrain-skim altitude adjustment (the Y offset `-state.altitude` is correct; the Z placement is the missing piece).

**Implementation:** Modify `src/shell/render.ts` (line 89–90) to calculate the surface's world position from sim state or a fixed Z offset that places it ahead of the camera and turrets. The exact Z value should be derived from:
- The DEATH_STAR_SURFACE vertex extents (min/max Z in object space after SURFACE_ORIENT rotation).
- The projection frustum (FAR clip plane at 5000 should not clip the back of the surface).
- Turret spawn distance for spatial consistency (turrets scroll from -SPAWN_DISTANCE toward the camera).

Suggested approach: Use a fixed Z placement like `[0, -state.altitude, -Z_SURFACE_PLACEMENT]` where Z_SURFACE_PLACEMENT is a single-sourced constant (analogous to TURRET_SCROLL_SPEED) chosen to keep the surface visible and not intersect the camera.

### AC-2: Turret/Surface Alignment Verification
Confirm that after the fix:
1. Turrets render on the surface floor (no floating turrets).
2. The surface floor scrolls correctly as turrets scroll toward the camera (altitude adjustments work with Z placement).
3. The altitude-skim mechanic works as intended (ship climbs/dives, terrain scrape at MIN_SKIM_ALTITUDE).

**Implementation:** In `src/shell/render.ts`, verify that turret base position `[tu.pos[0], tu.pos[1] - state.altitude, tu.pos[2]]` aligns with the surface's Y frame and that both share consistent Z positioning.

### AC-3: Live Eyeball Verification
Run the live game (Wave 2 playable via clear Wave 1 quota):
1. The Death Star surface floor is clearly visible and reads as a skimmable relief.
2. Turrets stand on the floor, not floating above or below it.
3. The camera altitude affects the visual distance to the floor (higher altitude → floor recedes).
4. No z-fighting, clipping, or render artifacts in the surface/turret overlap.

## Acceptance Criteria

- [ ] DEATH_STAR_SURFACE renders and is visible in the Wave 2 surface phase during live gameplay.
- [ ] Surface geometry is spatially aligned with turrets (no floating turrets, floor beneath them).
- [ ] Altitude-skim mechanics work correctly: ship climbs/dives, MIN_SKIM_ALTITUDE scrape event fires.
- [ ] No regression in other phases (Wave 1 space / Wave 3 trench).
- [ ] npm test passes; tsc --noEmit && vite build clean.
- [ ] Live eyeball: surface floor reads as convincing and playable (not tangled, not sparse, properly positioned relative to turrets).

## Test Plan

### Unit Tests (core)
- **Surface phase activation:** Verify `stepGame(...phase: 'surface'...)` maintains turret list and altitude state without errors.
- **Altitude mechanics:** Confirm altitude adjusts per yoke input, clamps to 0, triggers terrain-crash below MIN_SKIM_ALTITUDE.
- **Turret spawning/scrolling:** Confirm turrets spawn at Z=-SPAWN_DISTANCE, scroll toward camera, and fire correctly.

### Integration / Visual Tests
- **Live game (Wave 2):** Manually clear Wave 1 (6 TIE quota) and advance to surface phase.
  - [ ] Surface floor visible and reads as solid geometry.
  - [ ] Turrets render on top of the floor, not floating.
  - [ ] Altitude control works (yoke up/down changes visual distance to floor).
  - [ ] Turrets can be destroyed; wave clears after 4 turrets destroyed.
  - [ ] Game advances to trench phase on clear or game-over on shield loss.

### Regression Tests
- Wave 1 (space combat) unaffected: TIEs render, fire works, collisions work.
- Wave 3 (trench run) unaffected: trench floor renders, exhaust port visible, gameplay functional.

## Dependencies
- **Depends on:** 8-8 (phase-progression machinery; surface phase must be reachable).
- **Blocks:** None (but 8-12+ Wave 2 gameplay stories benefit from correct surface visibility).

## Notes
- This is a **render-layer bug** — the core `sim.ts` logic is correct; the shell's `render.ts` is missing the Z placement.
- The geometric data (DEATH_STAR_SURFACE vertices and edges) is correct as of 8-4 and 8-10 (topology validated).
- The altitude-framing fix for turrets (8-8, `render.ts:96`) is correct; this story extends it to the surface itself.
- No new constants beyond a Z_SURFACE_PLACEMENT offset; single-source it in `render.ts` or promote to `state.ts` if needed.
