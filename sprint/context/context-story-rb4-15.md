# Story rb4-15: THE BLIMP IS THE WRONG MACHINE — an APPROACHING airship (Z-closing, N.PLNZ-gated, ÷4 fire, GMLEVL>=2), not a lateral drifter

## Story Metadata
- **ID:** rb4-15
- **Epic:** rb4
- **Points:** 8
- **Type:** refactor
- **Priority:** p1
- **Workflow:** tdd
- **Repository:** red-baron
- **Depends On:** rb4-1

## Story Description

Split from rb4-6 AC-5 (user ruling 2026-07-16): the blimp rewrite test blast radius (~25 tests across 5 files, several with module-import collection risk) dwarfs the enemy stepper, so it got its own story. The blimp is an APPROACHING airship, NOT the constant-depth lateral drifter we ship (CD-005 certified-correct = CONFIRMED FALSE by the coverage review — it borrowed the plane div-by-2). Derived from the CITABLE quarry ~/Projects/red-baron-source-text/RBARON.MAC (md5 497db93e..., 6294 lines, .RADIX 16 from :74 — NOT the CRLF sibling reference/red-baron/). ROM MACHINE: (1) INITBP :1425-1426 Z MSB=10/LSB=0 -> ENTERS at Z=0x1000=4096; BLMOTN :4259-4265 adds -0x80 to Z each calc-frame -> CLOSES 0x80=128/frame; :4266-4270 clears BLOBJ when Z<0x100 -> ~32 frames entry-to-gone. (2) Spawn gate :2325-2331 LDA N.PLNZ / CMP I,4 / BCC skip -> gated behind FOUR planes appearing, then RANDOM / AND I,0C -> a 1-in-4 roll. (3) SHLAUN :4027-4030 LDA FRAME / AND I,3 (1 OUT OF 4 FRAMES) -> fires only FRAME&3==0 = 2.604 shots/s, NOT every 2nd frame. (4) SHLAUN :4038-4041 LDX GMLEVL / DEX / DEX / BMI skip (NO GROUND SHELLS @ LOWER LEVELS) -> fires only GMLEVL>=2. NEW blimp.ts surface: exports BLIMP_Z_START=0x1000, BLIMP_CLOSE_SPEED=0x80, BLIMP_PLANE_GATE=4; signatures blimpFires(frame,level) and shouldSpawnBlimp(planeCount,roll). SIBLING RE-SEAT MAP (all assert the old drifter): blimp.test.ts L250/262/274/291/326 (drift model), L354/360 (div-by-2 cadence / no level gate), L301 (constant cruise depth), L179/183/192/202 (BLIMP_SPAWN_CHANCE + shouldSpawnBlimp(roll) signature — the 25% roll SURVIVES as the second ROM gate AND 0C, so UPDATE do not delete), L349 (single-arg blimpFires); screen-scale.test.ts L190/208/285/316 drift-across geometry [WARN: module import L71 of blimpDriftPerFrame/blimpOffScreen — deleting them crashes the WHOLE file incl unrelated debris/LOD tests; keep a shim or re-seat the import], L224/243/256 despawn semantics; cockpit-loop.test.ts L316/335/355 drift premise [WARN: destructures shouldSpawnBlimp/BLIMP_SPAWN_CHANCE/blimpOffScreen L90/92], L367/407 despawn+sighting; depth-scale.test.ts L263 (blimp mid-field -> now Z0=4096 > 3/4 P_INDP); blimp-wiring.test.ts L67 (main.ts uses shouldSpawnBlimp for the 25% roll -> now the N.PLNZ gate). SURVIVE (do not touch): blimp geometry/scoring(flat 200)/explosion/collision, biplane, enemy-fire, multiplane-wiring, returning-ace, determinism. Independent of rb4-6 enemy.ts/waves.ts (different module) but SEQUENCE AFTER rb4-6 to avoid main.ts + shared-test-file conflicts. A ready-made RED suite (blimp-approach.test.ts) was drafted during rb4-6 RED; re-derive from the ROM citations above (do not trust a copied file). Depends on rb4-1 (the Z/close constants are hex).

## ROM Citations & References

**CITABLE QUARRY:** ~/Projects/red-baron-source-text/RBARON.MAC (md5 497db93e..., 6294 lines, .RADIX 16 from :74 — NOT the CRLF sibling reference/red-baron/)

### ROM Entry Points

1. **INITBP (RBARON.MAC :1425-1426):** Z MSB=10/LSB=0 → ENTERS at Z=0x1000=4096
2. **BLMOTN (RBARON.MAC :4259-4265):** adds -0x80 to Z each calc-frame → CLOSES 0x80=128/frame
3. **Z clear (RBARON.MAC :4266-4270):** clears BLOBJ when Z<0x100 → ~32 frames entry-to-gone
4. **Spawn gate (RBARON.MAC :2325-2331):** LDA N.PLNZ / CMP I,4 / BCC skip → gated behind FOUR planes appearing, then RANDOM / AND I,0C → a 1-in-4 roll
5. **SHLAUN fire cadence (RBARON.MAC :4027-4030):** LDA FRAME / AND I,3 (1 OUT OF 4 FRAMES) → fires only FRAME&3==0 = 2.604 shots/s, NOT every 2nd frame
6. **SHLAUN level gate (RBARON.MAC :4038-4041):** LDX GMLEVL / DEX / DEX / BMI skip (NO GROUND SHELLS @ LOWER LEVELS) → fires only GMLEVL>=2

## New blimp.ts Surface

### Constants
- `BLIMP_Z_START = 0x1000` (entry Z depth)
- `BLIMP_CLOSE_SPEED = 0x80` (Z closure per frame)
- `BLIMP_PLANE_GATE = 4` (spawn gate: require 4 planes)

### Functions
- `blimpFires(frame: number, level: number): boolean`
- `shouldSpawnBlimp(planeCount: number, roll: number): boolean`

## Sibling Test Re-Seat Map

All assertions listed below assert the old drifter model and must be updated:

### blimp.test.ts
- L250/262/274/291/326: drift model assertions
- L354/360: div-by-2 cadence and level-gate assertions
- L301: constant cruise depth assertions
- L179/183/192/202: BLIMP_SPAWN_CHANCE + shouldSpawnBlimp(roll) signature — the 25% roll SURVIVES as the second ROM gate AND 0C, so UPDATE do not delete
- L349: single-arg blimpFires assertions

### screen-scale.test.ts
- L190/208/285/316: drift-across geometry assertions
- L224/243/256: despawn semantics assertions
- **[WARN]** module import L71 of blimpDriftPerFrame/blimpOffScreen — deleting them crashes the WHOLE file incl unrelated debris/LOD tests; keep a shim or re-seat the import

### cockpit-loop.test.ts
- L316/335/355: drift premise assertions
- L367/407: despawn+sighting assertions
- **[WARN]** destructures shouldSpawnBlimp/BLIMP_SPAWN_CHANCE/blimpOffScreen L90/92

### depth-scale.test.ts
- L263: blimp mid-field assertions (now Z0=4096 > 3/4 P_INDP)

### blimp-wiring.test.ts
- L67: main.ts uses shouldSpawnBlimp for the 25% roll → now the N.PLNZ gate

## Story Constraints

### SURVIVE (Do Not Touch)
- blimp geometry
- scoring (flat 200)
- explosion
- collision
- biplane
- enemy-fire
- multiplane-wiring
- returning-ace
- determinism

### Sequencing
Independent of rb4-6 enemy.ts/waves.ts (different module) but SEQUENCE AFTER rb4-6 to avoid main.ts + shared-test-file conflicts.

### RED Suite Notes
A ready-made RED suite (blimp-approach.test.ts) was drafted during rb4-6 RED; re-derive from the ROM citations above (do not trust a copied file).

## Acceptance Criteria

- The blimp is an APPROACHING airship: it enters at Z=0x1000=4096 and CLOSES 0x80=128/calc-frame, despawning when Z<0x100 (~32 frames) — NOT a constant-depth lateral drifter.
- Spawn is GATED behind FOUR planes having appeared (N.PLNZ>=4, RBARON.MAC:2325-2327), then the 1-in-4 RANDOM roll — not a bare 25% roll available at any time.
- Fires 1-in-4 calc frames (FRAME&3==0, SHLAUN:4027-4030 = 2.604 shots/s), NOT every 2nd frame.
- Fires ONLY at GMLEVL>=2 (SHLAUN:4038-4041); the early sky is safe from the airship.
- Re-seat the ~25 drifter-model sibling tests across blimp/screen-scale/cockpit-loop/depth-scale/blimp-wiring per the description map, handling the screen-scale/cockpit-loop module-import collection risk (keep a shim or re-seat the import).
- Depends on rb4-1 (the Z/close constants are hex, .RADIX 16).

## Notes

This story is part of the Red Baron ROM fidelity remediation epic (rb4). The blimp was previously implemented as a constant-depth lateral drifter, but the coverage review identified that it should be an approaching airship with specific Z-closing mechanics, spawn gating, and fire cadence constraints derived from the authentic Atari 1980 source code.
