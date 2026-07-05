# Story A2-7 Context

## Title
One shot destroys only one rock — bullet consumed on first hit, never both overlapping rocks

## Metadata
- **Story ID:** A2-7
- **Type:** bug
- **Points:** 2
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** asteroids
- **Epic:** A2 (Asteroids — playtest followup)

## Problem
During playtest, a single player bullet destroyed both rocks when its swept path intersected two overlapping rocks simultaneously. Per the game spec, a bullet should be **consumed on its first rock hit** — destroying exactly one rock and leaving the second rock (or any others in the overlap) undamaged. The bug allows one shot to eliminate multiple targets in a single frame, breaking the collision resolution contract.

## Technical Approach

**1. Understand the current collision detection code**
- The collision loop lives in `asteroids/src/core/sim.ts`, lines 313–329 (`stepGame` function).
- It iterates through all live player bullets and checks each against rocks using `sweptOverlaps` (a path-segment-vs-AABB test in the rock's local toroidal frame).
- On a hit, it calls `working.findIndex(...)` to locate the first rock swept by the bullet's path.
- The hit rock is destroyed via `splitRock`, and the bullet is consumed with a `continue` statement (not added to `survivors`).

**Current logic:**
```typescript
const hit = working.findIndex((r) =>
  sweptOverlaps(bullet.pos, bullet.vel, r.pos, ROCK_HITBOX[r.size], frames),
)
if (hit !== -1) {
  // Destroy working[hit] and splice children in
  working.splice(hit, 1, ...splitRock(destroyed, rng))
  continue // Bullet is consumed
}
```

**2. Identify the root cause**
The bug likely stems from one or more of these scenarios:
- **Array-order collision:** `findIndex` returns the first matching rock in array iteration order, not the closest rock. If two overlapping rocks both match `sweptOverlaps` but the further one is processed first, the bullet might still collide with the closer rock on a second pass or in another code path.
- **Incomplete bullet consumption:** The `continue` statement should consume the bullet, but verify that the bullet is not being re-checked against remaining rocks in the same frame (e.g., if `sweptOverlaps` is called multiple times on the same bullet in different loop iterations).
- **Ambiguous overlap detection:** When two rocks overlap spatially, `sweptOverlaps` may return true for both. Ensure the collision resolution prioritizes the closest (first-hit) rock and prevents the bullet from being re-evaluated against others.

**3. Write failing tests (RED phase)**
Focus on the scenario that triggered the bug: two overlapping rocks and a bullet passing through the overlap.
- **Test 1: Bullet vs. two overlapping rocks (same size).** Place two medium rocks at slightly offset positions so their hitboxes overlap. Fire a bullet through the overlap region. Assert exactly one rock is destroyed and the bullet is consumed.
- **Test 2: Bullet vs. two overlapping rocks (different sizes).** Place a large and medium rock overlapping. Fire a bullet through the overlap. Assert the rock closer to the bullet's starting position is destroyed (or, if unclear, document the expected behavior and verify against the ROM).
- **Test 3: Fast bullet tunneling overlapping rocks.** A high-speed bullet (111+ lo-units/frame) whose swept path intersects two overlapping rocks should still destroy only one. This extends A-13's regression guard ("no tunneling") to the overlapping-rocks case.

**4. Inspect the collision loop for multi-pass issues**
- Verify there is only ONE pass over the `working` array per frame for each bullet.
- Confirm the `continue` statement is correctly positioned so the bullet does not proceed to saucer/ship checks after a rock hit.
- If needed, add a `break` or early return to the outer loop to guarantee single-rock destruction per bullet.

**5. Consider closest-hit semantics**
- If the root cause is array-order vs. spatial distance, consider sorting or filtering the rocks checked by each bullet. Options:
  - Sort rocks by distance from the bullet's starting position and check them in order (stop at the first hit).
  - Modify `findIndex` to a custom loop that tracks the closest hit instead of the first-in-array hit.
  - Use a spatial partition (e.g., grid or quadtree) if the number of overlapping-rock cases grows (currently unlikely given typical wave sizes).

**6. Verify against A-13's swept-collision contract**
- A-13 (2026-07-04) switched bullet-vs-rock from endpoint-only to `sweptOverlaps` to prevent fast shots tunneling small rocks.
- This story inherits that swept-collision test and must ensure it doesn't regress (one bullet still destroys one rock, not zero or multiple).
- The acceptance criteria mirror A-13's regression guard: test with **moving bullets** at cardinal muzzle speed (111 lo-units/frame) whose path crosses overlapping rocks.

## Acceptance Criteria
- **Overlapping rocks collision:** A fixed-seed script with two overlapping rocks of any mix of sizes: firing a player bullet through the overlap destroys exactly one rock and consumes the bullet; the second rock is left undamaged (unless its own children cause subsequent splits).
- **Distance-based or array-order semantics documented:** The test explicitly documents which rock is destroyed (e.g., "the rock that appears first in the working array" or "the rock closest to the bullet's origin") and asserts that behavior. If the behavior is non-deterministic or undefined, flag it for clarification.
- **Fast bullet regression guard:** A bullet at 111 lo-units/frame (cardinal muzzle speed) whose swept path crosses two overlapping rocks destroys only one; no tunneling regression.
- **Single-pass verification:** Inspection of the collision loop confirms exactly one pass per bullet per frame, with no re-evaluation of the same bullet against the rock set after a hit (the `continue` and loop structure enforce this).
- **Determinism:** Identical seed + input script + `dt` produce deeply-equal `GameState` across overlapping-rocks collisions; A-2's banned-globals guard continues to pass.
- **Build and tests clean:** `npm run build` (`tsc --noEmit && vite build`) and `npm test` (Vitest) both pass.

## Key Files
- **Core collision loop:** `asteroids/src/core/sim.ts`, lines 313–329 (the `stepGame` function's bullet-rock collision block).
- **Swept collision helper:** `asteroids/src/core/sim.ts`, line 127, `function sweptOverlaps(...)`.
- **Rock destruction logic:** `asteroids/src/core/rocks.ts`, `splitRock` function.
- **Tests:** `asteroids/tests/sim.test.ts` or `asteroids/tests/collision/` — add test cases for overlapping-rock scenarios.

## Related Context
- **Epic A, story A-13 (2026-07-04):** Introduced `sweptOverlaps` to prevent fast shots tunneling small rocks; this story ensures the swept-collision contract holds under overlapping-rock conditions (a regression guard).
- **Memory note:** "asteroids swept collision" — bullet-vs-rock uses swept segment test; fast shots tunneled small rocks before A-13's fix.

## Notes
- This story is **scope-minimal** (2 pts, bug fix): the collision resolution logic itself already exists; the fix is to ensure single-rock destruction per bullet under overlap, not a new mechanic.
- If the root cause is ambiguous after the RED phase, consult the original Asteroids arcade cabinet disassembly (reference/ quarry) for the canonical collision-resolution order (e.g., "closest rock" or "first-in-memory rock").
- No gameplay mechanic changes; no render or input changes; purely a collision determinism fix.

---
_Generated by `pf context create story A2-7` from the sprint YAML._
