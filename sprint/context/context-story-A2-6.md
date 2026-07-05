# Story A2-6 Context

## Title
Rock split vectors — fragments overlap after break (momentum over-conserved); retune split spread against ROM reference

## Metadata
- **Story ID:** A2-6
- **Type:** bug
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** asteroids
- **Epic:** A2 (Asteroids — playtest followup)

## Problem
During playtest of Asteroids, players observed that when a rock is shot and splits into fragments, the fragments **overlap after the break** because momentum is over-conserved — the split spread angle is too narrow. The two children spawn at the exact parent position with insufficient angular divergence, causing them to visually pile up and move together like a stuck unit rather than gracefully spreading like the original 1981 Asteroids arcade cabinet. The fix is to **retune the split spread angle against the ROM reference** so fragments visibly diverge in direction with authentic momentum distribution.

## Technical Approach

**1. Locate the rock splitting code**
- The split logic lives in `asteroids/src/core/rocks.ts`, specifically the `splitRock` function at lines 138–162.
- The key tunable constant is `SPLIT_SPREAD_ANGLE` (line 54), currently set to `Math.PI / 6` (30 degrees).
- The comment at line 49 explicitly marks this as "Feel-based provisional" — **verify vs quarry (A-17)**.
- This constant controls the angular divergence of each child's inherited heading:
  ```typescript
  const angle = parentAngle + (nextFloat(rng) * 2 - 1) * SPLIT_SPREAD_ANGLE
  ```
  Each child veers up to ±SPLIT_SPREAD_ANGLE radians off the parent's heading.

**2. Reference the 1979 Atari ROM for authentic split behavior**
- Consult the Asteroids ROM disassembly (sources: 6502disassembly.com and computerarcheology.com — both cited in `reference/velocities.ts`).
- The ROM split-velocity routine was the thinnest area in both disassembly fetches — the exact spread formula was not found in prior stories.
- However, the original cabinet's two children **visibly diverge in direction on split**, so a spread angle *must* exist in the ROM.
- Locate the ROM's rock-split code, ideally the angular spread value (angle delta per child, or a rotation register, or equivalent).
- If an exact numeric value cannot be located, look for gameplay reference footage from the cabinet and measure the visual divergence angle between child fragments post-split.

**3. Retune the split spread angle**
- Update `SPLIT_SPREAD_ANGLE` in `asteroids/src/core/rocks.ts:54` to match the ROM reference value (or your best measured approximation from cabinet footage).
- No other changes to the split logic: parent position, speed scaling, shape variant reroll, and rng consumption all remain as-is.
- The heading formula itself is unchanged; only the constant is updated.

**4. Testing approach (TDD: RED phase)**
- Unit tests verifying split behavior under the new angle:
  - **Test 1: Angular spread magnitude.** Spawn two child rocks from the same parent (multiple random seeds). Assert the angular difference between the two children's headings is consistent and matches the new SPLIT_SPREAD_ANGLE value (or document if ROM applies an asymmetric formula).
  - **Test 2: Divergence direction.** Verify children diverge **away from** each other, not towards. This is implicitly checked by the existing test at `asteroids/tests/rocks.test.ts:534`, which asserts each child stays within SPLIT_SPREAD_ANGLE of the parent heading — update that test's tolerance if the constant changes.
  - **Test 3: Momentum conservation (visual proxy).** Spawn a large rock with a known heading and speed, split it, and verify the magnitude of the sum of the two children's momentum vectors is within a reasonable tolerance of the parent's (allowing for the speed re-clamp at tier boundaries). This is not a strict physics test but a regression guard against accidental momentum loss.
  - **Test 4: Fast-bullet overlap regression (from A2-7).** Existing tests in `asteroids/tests/overlapping-rocks.test.ts` verify that bullet-vs-overlapping-rocks collision still resolves correctly. Ensure those 7 tests still pass after the spread angle change — wider spread might reduce the likelihood of tight overlaps, but the collision loop's behavior must not regress.

**5. Integration verification**
- Run the full test suite to ensure no regressions elsewhere.
- Manual playtest in `npm run dev` (:5275) to visually confirm fragments now diverge with authentic spacing (compare against cabinet reference footage).

## Acceptance Criteria
- The `SPLIT_SPREAD_ANGLE` constant in `asteroids/src/core/rocks.ts:54` is updated to the ROM reference value (or justified as the best available approximation if the exact ROM value is ambiguous).
- All existing split tests in `asteroids/tests/rocks.test.ts` (lines 471–605) pass with the updated constant; in particular, the "spread is real" and "heading within spread" tests (lines 534–544) remain valid.
- The 7 overlapping-rocks collision tests from A2-7 (`asteroids/tests/overlapping-rocks.test.ts`) still pass — wide spread does not regress bullet-vs-rock collision resolution.
- A new unit test documents the updated SPLIT_SPREAD_ANGLE value and verifies the ROM reference derivation (or explains why a specific ROM value was not found).
- Manual visual playtest confirms child rocks now visibly diverge post-split (no longer overlapping); momentum distribution matches cabinet feel.
- `npm run build` (`tsc --noEmit && vite build`) and `npm test` (Vitest) both pass.
- Session findings + deviations logged per TEA's and subsequent agents' discoveries.

## Key Files
- **Split logic:** `asteroids/src/core/rocks.ts`, lines 49–162 (SPLIT_SPREAD_ANGLE constant + splitRock function)
- **Existing split tests:** `asteroids/tests/rocks.test.ts`, lines 471–605 (split constants, splitRock tests)
- **Collision regression guards:** `asteroids/tests/overlapping-rocks.test.ts` (7 tests from A2-7)
- **ROM reference:** `asteroids/reference/velocities.ts` (pattern for ROM-sourced constants)
- **Related constants:** `asteroids/src/core/rocks.ts`, lines 28–65 (ROCK_HITBOX, ROCK_SPEED_MIN/MAX, SPLIT_SPEED_SCALE — all "provisional" pending A-17's ROM verification)

## Related Context

### Sibling stories
- **A2-7** (done, fix/A2-7-one-shot-one-rock): "One shot destroys only one rock — bullet consumed on first hit, never both overlapping rocks." Defined the collision loop semantics and the `sweptOverlaps` test helper. Split spread angle affects the tightness of post-split overlaps; wider spread may reduce the frequency of overlapping-rocks edge cases. Verify A2-7's tests still pass.
- **A2-9** (done, fix/A2-9-bullet-range): "Bullet range too short — retune bullet lifetime/travel distance against ROM reference." Successfully sourced ROM values from 6502disassembly.com and computerarcheology.com and updated the bullet lifetime constants. Notes in the A2-9 session (`sprint/archive/A2-9-session.md`) mention the ROM reference locations; use the same sources for rock split.
- **A2-8** (backlog, "Subtle debris particles on every rock break"): Independent of split spread, but visually related. A2-7's review findings suggested A2-8 may address the playtest observation ("fragments seem to die together") via particle feedback, complementary to this story's spread-angle fix.

### Historical context
- **Epic A, story A-13** (merged): Introduced `sweptOverlaps` for bullet-vs-rock collision to prevent fast shots tunneling small rocks. A-13's tests are inherited by A2-7 and extended; ensure they still pass after any collision-loop edge cases are affected by wider post-split spread.
- **A-17** (planned): Full ROM verification pass for all provisional constants across the asteroids sim. SPLIT_SPREAD_ANGLE is explicitly marked for verification in `src/core/rocks.ts:54`; A2-6 is an early opportunistic swap before A-17 runs.

### Technical notes
- The ROM split-spread formula was the thinnest area in both disassembly fetches and was not recovered during A-7's initial port. A2-6 is the first chance to locate and retune it.
- Child speed scaling (`SPLIT_SPEED_SCALE`) is separate from angular spread and is NOT in scope for this story (marked "A-17" in comments). Focus exclusively on angle.
- Each child rerolls its shape variant (via `nextInt(rng, ...)`) and consumes randomness, so changes to spread angle do not affect subsequent wave spawns (RNG determinism is preserved).
- The `splitRock` function is pure and non-mutating; all testing is seeded-RNG determinism, not state tracking.

## Notes
- If the exact ROM split-spread formula is not recoverable from the disassembly, measure the visual angle from arcade cabinet video reference footage (look for a rock splitting and estimate the angle between child trajectories visually).
- Prefer online disassembly sources (6502disassembly.com, computerarcheology.com) over hand-written notes; verify against at least two independent sources as done in A2-9.
- Small angle changes can have large visual impact due to the quadratic spread formula (each child can veer up to ±angle). Red phase's tests should guide the exact value.

---
_Generated by `sm-setup` for story A2-6._
