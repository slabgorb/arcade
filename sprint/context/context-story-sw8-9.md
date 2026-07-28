# Context: sw8-9 — TIE in-front loiter — fighters converge & loiter IN FRONT (positive depth), never crossing behind

## Story Summary

TIEs currently fly PAST the cockpit (converging x→0 at negative depth, behind the eye) instead of loitering-and-converging IN FRONT as the longplay shows. Port the deferred §5 play-cube clamp (sub_8DE3) and implement §9-3 no-body-collision (only fireballs damage the player, not TIE bodies). This story depends on sw8-6 (field-crossing sweep, already shipped).

**Status:** TDD  
**Points:** 3  
**Workflow:** tdd  
**Repos:** star-wars  
**Depends on:** sw8-6 (DONE, merged; TIEs now sweep across the field)

---

## Problem Statement

### Bug Evidence (Confirmed in sw8-6 Dev Phase)

From `sprint/archive/sw8-6-session.md` (Dev Assessment):

> "The fix carries the offset (the sweep) but the fighter then flies **PAST** the cockpit, converging x→0 during/after the pass (at negative depth, behind the eye) rather than **loitering and converging while in front** as the longplay shows. Reproducing the in-front loiter needs the deferred §5 play-cube clamp (`sub_8DE3`, design sw8-2 AC3 'deferred tuning') + loiter/no-ram (the 9-3 'no body collision' item)."

**The mechanism:** sw8-6 fixed TIE spawn-heading to carry lateral offset across the field (field-crossing sweep vs centerline zoom). But without position clamping, offset TIEs still reach the origin and cross into negative depth (behind the camera eye), converging there instead of loitering IN-FRONT as the ROM design shows.

**Observable failure:** Playing a space wave, offset TIEs fly toward the cockpit, sweep across the screen (correct), then *pass through* the origin and vanish off-screen to the rear. The longplay shows TIEs stopping their convergence well before reaching the cockpit, loitering while firing, then peeling away at wave-end transition.

### Secondary Issue: TIE-Body Collision Damage

Currently, both TIE-bodies AND fireballs can damage the player's shield (collide with the cockpit). Per the ROM design (tie-flight-ai-model.md §7):

> "there is **no TIE-body ↔ ship collision anywhere** in the pipeline... **Only fireballs damage the player.** Player shots hit TIEs (crosshair targeting), kill sets explosion timer; **fireballs** hit the player (box test vs ship position)."

**Current code** (`src/core/sim.ts` lines 568-583): Both `standingEnemies` (TIE fighters) and `standingShots` (fireballs) filter through collision checks with the cockpit, dealing damage on hit. TIEs ram the player and cost a shield — inauthentic.

**Expected:** Only fireballs damage the player; TIEs loiter and peel away. Player beam can still destroy TIEs.

---

## ROM Design Reference

### §5 Play-Cube Position Clamp (from tie-flight-ai-model.md §5.3)

From the 1983 cabinet ROM, every frame after position integration (`sub_8DE3`):

- **Clamp target:** Each axis (X/Y/Z world) is clamped to the signed range `[$8300, $7CFF]` in 16-bit fixed-point units (≈ ±1.95 normalized units).
- **In our coordinate frame:** X (ROM depth) = our −Z; Y (ROM lateral) = our ±X; Z (ROM lateral) = our ±Y.
- **Bounds in our units** (raw ROM values are already in `models.ts`; divide by 16384 for normalized): each axis `± 31,999` (0x7CFF = 31,999 raw, 0x8300 = −32,256 raw wrapped).
- **Purpose:** Containment — keeps TIEs and player inside the play cube, preventing escape beyond level bounds.
- **Live location:** To be added to `star-wars/src/core/sim.ts` in the motion integration step, after `applyManeuver` updates position.
- **Citation:** `tie-flight-ai-model.md` §5.3; ROM `sub_8DE3` (WSCPU.MAC, address 8DE3).

### §9-3 No-Body-Collision (from tie-flight-ai-model.md §7)

The ROM's collision model:

1. **TIE-body vs cockpit:** No collision exists. Untouched TIEs loiter inside the play cube, firing, and peel away at wave-end transition (ROM `sub_8B86`).
2. **Fireball vs cockpit:** Box collision test (`sub_AAE4` vs ship position) — a hit decrements shield.
3. **Player beam vs TIE:** Crosshair targeting (`sub_B32B`) — a hit kills the TIE and scores points.

**Current divergence:** star-wars `sim.ts:568-583` lets both TIEs and fireballs collide with the cockpit, making TIEs lethal.

**Expected:** Remove TIE-body collision. Only fireballs hit the player.

---

## Acceptance Criteria

### AC-1: Position Clamp Applied (Unit-Testable)

The play-cube clamp (`sub_8DE3`) is ported and applied to every TIE position each frame, after `applyManeuver` updates position.

- **What to test:** After a TIE's position is moved via `applyManeuver`, that position is clamped to the axis-aligned box `[−PLAY_CUBE_BOUND, +PLAY_CUBE_BOUND]` (each axis independently).
- **ROM constant:** Bounds are per `tie-flight-ai-model.md` §5.3 — the raw values `0x7CFF` (≈ 31,999) and `0x8300` (wrapped ≈ −32,256), *or* equivalent normalized units if rescaled.
- **Evidence of port:** Code comment in `sim.ts` cites `sub_8DE3` / WSCPU.MAC address and links to the model spec.
- **File:line:** `star-wars/src/core/sim.ts`, in or near the space-phase enemy-motion step (currently post-`applyManeuver`, ~line 430).
- **Test type:** Deterministic unit test (`tests/core/tie-clamp.test.ts` or similar) — seed RNG, run `stepGame` with a TIE on a flight path that would breach the bounds, assert final position is clamped. E.g., a TIE aimed straight forward (+Z in their local frame) starting at the far spawn should not exceed `pos[2] > 0` (behind the eye at negative depth).

### AC-2: TIE-Bodies Never Reach Negative Depth (Render Verification)

With AC-1 in place, TIEs converge x→0 and y→0 *within* the clamped play cube, at positive depth (in front of the cockpit eye at `pos[2] = 0`).

- **Observable:** Offset TIEs sweep across the field (from sw8-6), then slow their convergence and loiter while firing, never crossing `pos[2] < 0` (negative depth).
- **Longplay reference:** `star-wars-longplay.mov`, waves 1–2, offset TIE approach.
- **Test:** Manual playtest — serve THIS checkout on a spare port; watch a space wave with offset TIEs; verify they sweep, converge slowly, and loiter in-screen before peeling away at wave-end transition. No off-screen rear vanish.
- **Render test (if applicable):** A trajectory-probe test similar to sw8-6's `tie-approach-sweep.test.ts` can assert that `max(pos[2])` over a full TIE lifetime is `<= some positive threshold` (e.g., `< 0` is a fail; loitering TIEs converge but stay in-front).

### AC-3: TIE-Body Collision Removed (Unit-Testable)

TIE-bodies no longer collide with the cockpit and deal damage. Only fireballs can hit the player's shield.

- **What to test:** Run `stepGame` with a TIE spawned very close to the cockpit (e.g., `pos = [0, 0, 500]` just in front); step the simulation to let the TIE reach the cockpit origin. After each step, verify `state.lives` does NOT decrease (no shield damage from TIE body). Verify player-beam collision with the TIE still kills it (`state.enemies[i]` is removed from the list after a hit).
- **Fireball test (guard):** Spawn a fireball at the cockpit and step; verify it DOES damage the player (`state.lives` decrements) and is removed.
- **File:line pointers:** `star-wars/src/core/sim.ts`, lines 568–583 (the space cockpit-collision block). Remove TIE-body collision; keep fireball collision.
- **Evidence of fix:** Code comment cites tie-flight-ai-model.md §7 ("only fireballs damage the player") and story sw8-9; audit finding to be filed/updated for the collision model.

### AC-4: No Regression on Beam/Fireball Collision (Green Guard)

Removing TIE-body collision does NOT break player-beam targeting (TIEs can still be shot) or fireball-vs-cockpit damage (fireballs still hit the player). Existing tests (`space-combat.test.ts`, `homing-fireball.test.ts`) remain green.

- **What to test:** Full suite green after the change; spot-check that `beamHit` (player laser hitting TIEs) and fireball convergence tests pass unchanged.
- **File:line:** `star-wars/src/core/sim.ts`, lines 487–506 (beam collision vs TIEs/fireballs) and lines 576–583 (fireball-vs-cockpit block).

### AC-5: Citations Green (Audit Integrity)

Any touched audit finding or newly-cited ROM constant stamps its `remediated_by` line and the citations gate passes.

- **Test:** `npm test -- citations` must pass (no orphaned or malformed citations).
- **File:** `star-wars/docs/audit/findings/*.json` (if findings are touched).

### AC-6: No Regression on Full Suite

Full vitest suite green (1793/1793 or higher if new tests are added). No pre-existing tests broken by position clamping or collision removal.

- **Test:** `npm test`, then `npm run build` (tsc + vite).

---

## Technical Approach

### 1. Port the Play-Cube Clamp (AC-1)

**File:** `src/core/sim.ts`, space-phase enemy-motion block (around line 430).

**Current code:**
```typescript
const movedEnemies = standingEnemies
  .map((e) => applyManeuver(e, e.vm?.twist ?? 0, e.vm?.move ?? 0, dt))
```

**Approach:**
- Define `PLAY_CUBE_BOUND` constant (ROM values 0x7CFF / 0x8300, or rescale to world units).
- After `applyManeuver`, clamp each TIE's `pos[0]`, `pos[1]`, `pos[2]` to `[−PLAY_CUBE_BOUND, +PLAY_CUBE_BOUND]`.
- Add code comment citing `sub_8DE3` and the model spec.

**Example pattern:**
```typescript
const clampBound = PLAY_CUBE_BOUND // e.g., 32000 (raw) or 1.95 (normalized)
const clamped = {
  ...moved,
  pos: [
    Math.max(-clampBound, Math.min(clampBound, moved.pos[0])),
    Math.max(-clampBound, Math.min(clampBound, moved.pos[1])),
    Math.max(-clampBound, Math.min(clampBound, moved.pos[2])),
  ] as Vec3,
}
```

### 2. Remove TIE-Body Collision Damage (AC-3)

**File:** `src/core/sim.ts`, lines 568–583 (space cockpit-collision block).

**Current code:**
```typescript
const liveEnemies = standingEnemies.filter((e) => {
  if (collides(e.pos, ship, COCKPIT_HIT_RADIUS)) {
    damage++
    events.push({ type: 'player-death', cause: 'enemy' })
    return false
  }
  return true
})
```

**Fix:** Keep the fireball loop, remove TIE loop entirely (or keep it for other logic but skip collision check):
```typescript
// NO TIE-BODY collision (tie-flight-ai-model.md §7: only fireballs damage the player)
const liveEnemies = standingEnemies // no collision test for TIE bodies
```

Keep the fireball block unchanged.

### 3. Write Tests (AC-1, AC-3, AC-4, AC-6)

**Red tests:**
- TIE position clamp applied: a TIE at the boundary stays within bounds.
- TIE-body collision removed: a TIE at the cockpit does NOT damage the player.
- Fireball collision preserved: a fireball at the cockpit DOES damage the player.

**Green guards:**
- `beamHit` (player laser) still kills TIEs.
- `homing-fireball.test.ts` and `space-combat.test.ts` remain green.
- Full suite green.

---

## Reference Material

- **Bug confirmation:** `sprint/archive/sw8-6-session.md` — sw8-6 Dev phase finding (lines ~170–173).
- **ROM design:** `star-wars/docs/tie-flight-ai-model.md` §5.3 (play-cube clamp), §7 (loiter/no-body-collision).
- **Deferred scope from sw8-2:** `sprint/archive/sw8-2-session.md` (AC3 notes) and `sprint/context/context-story-sw8-2.md` (AC3 spec).
- **Cabinet reference:** `star-wars-longplay.mov` (waves 1–2, TIE approach/loiter/peel-away).
- **Current implementation:**
  - Motion/clamp site: `src/core/sim.ts`, lines 420–430 (enemy motion), line 1979 (applyManeuver).
  - Collision site: `src/core/sim.ts`, lines 568–583 (space cockpit collision).
  - TIE spawn/approach: `src/core/sim.ts`, line 2067 (spawnTie), line 1938 (aimOrient steering).
- **1983 ROM source:** `~/Projects/star-wars-1983-source-text` (WSCPU.MAC, WSMAIN.MAC).

---

## Story Dependencies

- **Depends on:** sw8-6 (field-crossing sweep; delivers the lateral-offset carry, leaving TIEs to pass through to negative depth).
- **Unblocked by:** sw8-7 (spawn cadence; independent concern), sw8-2 findings (already rules the play-cube clamp and no-ram; sw8-9 implements both).

---

## Definition of Done

1. **Position clamp ported:** `PLAY_CUBE_BOUND` constant defined, clamp applied post-`applyManeuver` for all TIE positions, ROM citation present.
2. **TIE-body collision removed:** `sim.ts` lines 568–583 no longer loop TIEs for cockpit collision; fireballs still collide.
3. **Tests green:** Red tests for clamp/collision pass; green guards + full suite 1793+/1793+ pass; `npm test -- citations` green.
4. **No regressions:** `beamHit` (player laser) and fireball mechanics work unchanged; manual playtest confirms TIE behavior matches longplay.
5. **Code review approved.**
6. **Merged to develop.**
