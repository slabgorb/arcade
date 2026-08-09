# Context: sw10-2 — Surface turret fire scroll-carry

**Story ID:** sw10-2  
**Epic:** sw10 — Star Wars projection & fire-frame fidelity  
**Workflow:** tdd  
**Points:** 3  
**Type:** bug  

---

## Summary

Surface turret fire must carry the surface-phase depth scroll the same way the trench gun fire does (PR #125 / sw10-1 post-work). The surface models ground scrolling toward the ship via `state.surfaceScrollZ`; objects ride that scroll, but turret/tower/bunker fire spawns with plain aim-at-ship velocity that omits the scroll component. Result: frame-consistency bug where the player outruns slow bullets while the world rushes past at 50× their muzzle speed.

This is the direct follow-up to the 2026-08-08 projection audit's open item (plugins/star-wars/docs/2026-08-08-star-wars-projection-audit.md §7).

---

## Reference: Trench Gun Fire (Already Shipped)

From PR #125, `gameRules.trenchGunFireVelocity(gunPos, shipPos)`:

- **Depth component IS the scroll** (negative, closing on cockpit at the scroll speed — as the walls do).
- **Lateral/vertical components LEAD the ship** — computed so the shot arrives at the ship's y/z position at the same instant its depth reaches the cockpit plane.
- **Degenerate guard:** gun at/past plane (depth ≤ 0) fires straight at the ship at scroll speed.
- **Swept collision:** because closing is fast (> hit sphere), the trench cockpit hit uses `gameRules.sweptCollides` to avoid tunnelling.

**Reference test:** `plugins/star-wars/tests/core/trench-fire-scroll-carry.test.ts`

---

## Surface Turret Fire (Current Bug)

**Files in play:**
- `plugins/star-wars/src/core/sim.ts` — surface turret/tower/bunker fire spawn block ~line 1132-1147
- `plugins/star-wars/src/core/gameRules.ts` — depth scroll constant (compare `TRENCH_SCROLL_SPEED` to surface equivalent)
- `plugins/star-wars/src/core/sim.ts` — `surfaceScrollZ` accumulation at ~line 1068

**The bug:**
```typescript
// Current (WRONG): plain aim-at-ship
vel: scale(normalize(sub(ship, muzzle)), ENEMY_SHOT_SPEED)

// Required: depth component carries surfaceScrollZ, lateral/vertical lead the ship
vel: gameRules.surfaceGunFireVelocity(muzzle, ship)
```

---

## Acceptance Criteria (TEA + Dev to detail in RED phase)

1. **RED phase:** Write a test that proves surface turret fire currently uses stale muzzle velocity (fails with current code).
2. **RED phase:** Test that the shot reaches the ship at its y/z position when depth reaches the cockpit plane.
3. **RED phase:** Test degenerate guard — gun at/past plane (depth ≤ 0).
4. **GREEN phase:** Implement `surfaceGunFireVelocity` helper (in gameRules.ts) or reuse/generalize `trenchGunFireVelocity`.
5. **GREEN phase:** Apply to surface turret fire spawn (sim.ts ~line 1139).
6. **Determine in RED:** If closing speed > hit sphere, verify whether swept collision is needed (as in trench).
7. **All tests pass:** Citation gates green, orchestrator suite stays green (~2361 tests after trench fix).

---

## Watch-outs

- **Proof before fix:** TEA must PROVE the bug reproduces in a failing test first. Verify that the surface phase actually advances muzzles each frame (don't assume symmetry with trench if surface geometry handles depth scroll differently).
- **Line-anchor reanchoring:** Editing sim.ts/gameRules.ts shifts comment-cited line# anchors. Expect citation reanchoring in the audit gate.
- **Core boundary:** sim.ts and gameRules.ts live in `src/core/` — pure sim, no clock/render logic.

---

## Background: Authentic Surface Scroll (from sw10-1 audit)

From `plugins/star-wars/docs/2026-08-08-star-wars-projection-audit.md`:

- **Authentic world basis:** X = straight ahead (depth, decreases toward player), Y = right, Z = up.
- **Perspective divide:** by depth (X) — `YP = Y·(1/X)`, `ZP = Z·(1/X)`.
- **Surface phase scroll:** pilot forward flight modeled as ground rushing past — `scrollSpeed` constant, accumulated into `surfaceScrollZ` each frame.
- **Objects on surface:** ships, turrets, terrain features all move on the same scroll; fire must too.

---

_Context file created by sm-setup; agents append findings during phases._
