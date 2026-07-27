# Context — Story cp2-15: Frame order — reproduce the ROM mainloop sequence so PLAY precedes SHOOT and SHOOT scans slot 13 first

**Date:** 2026-07-27  
**Epic:** cp2  
**Workflow:** tdd  

## Story Summary

Reproduce the ROM mainloop sequence in the sim frame: PLAY (gun contact detection) must run BEFORE SHOOT (shot collision resolution), and SHOOT must scan slots in descending order from slot 13 (spider first) so the first match wins and ends the scan.

## Technical Context

### ROM Mainloop Order (CENTI4.MAC)

The ROM's mainloop runs in this order:
- `:30` MOTION — step centipede segments
- `:31` EXPLOD — explosion countdown for all creatures (slots 0-13)
- `:33` calls PLAY from inside BUGMV — detect gun contact (player dies if hit)
- `:34` SHOOT — resolve shot collisions (creatures die if hit)

### Current Sim Frame Order (src/core/sim.ts:354-502)

The current order in `stepPlayingFrame` is:
1. movePlayer
2. stepShot
3. resolveShotHit (segments)
4. stepCentipede
5. stepExplosions
6. stepSpiderExplosion (cp3-1)
7. stepSpider (cp3-1)
8. resolveSpiderShotHit (cp3-1)
9. stepSpiderKillTimer (cp3-1)
10. stepFleaExplosion (cp3-2, cp3-3)
11. resolveScorpionShotHit (cp3-3)
12. resolveFleaShotHit (cp3-2)
13. stepScorp (cp3-3)
14. stepFlea (cp3-2)
15. awardBonus
16. **checkPlayerContact (gun contact)** ← Currently at END, should be before SHOOT

### The Problem

**Two bugs are rooted in frame ordering:**

1. **PLAY-vs-SHOOT order**: checkPlayerContact runs AFTER all shot resolutions, but the ROM runs it BEFORE SHOOT. On a frame where a creature sits in BOTH the gun box and the shot box:
   - ROM: PLAY kills the PLAYER (MOBJP=0xFF at :1806), then SHOOT skips the slot (:2177-2178), no points awarded
   - Sim (current): shot resolves first, creature dies, player lives, points awarded (wrong)

2. **SHOOT scan order**: The ROM scans slots descending from 13, first match wins and ends scan (no further slots checked). Current sim resolves them in wrong order:
   - ROM order descending: slot 13 (spider) → 12 (flea/scorpion) → 0-11 (segments)
   - Sim order: segments first (resolveShotHit), then spider (resolveSpiderShotHit), then scorpion/flea
   - On a frame matching both spider window (|dV|<5, |dH|<10) and segment window (|dV|<5, |dH|<6):
     - ROM: kills spider, scores 300/900/600 (spider band)
     - Sim: kills segment, scores 10/100 (segment band)

### Regression Surface (AC-3)

The frame reorder affects every creature test because they all inherit from the shared frame skeleton:
- **cp2 tests**: segments (cp2-3, cp2-4, cp2-5) — motion, collision, death, RESTOR
- **cp3 tests**: spider (cp3-1), flea (cp3-2), scorpion (cp3-3), fragmented train (cp3-4)
- **cp4 tests**: attract demo (cp4-7) which auto-plays all creatures

All must remain green after reordering PLAY and SHOOT slots.

### Design: Reordered Frame Skeleton

The fix reorders shared code in `src/core/sim.ts`, not per-creature patches:

1. After `stepCentipede` + `stepExplosions` (motion phase):
2. **checkPlayerContact** (PLAY — gun contact) ← INSERT HERE
3. resolveShotHit (segments)
4. stepSpiderExplosion + stepSpider + resolveSpiderShotHit + stepSpiderKillTimer (spider, slot 13)
5. stepFleaExplosion + stepScorp + resolveSorpionShotHit + stepFlea + resolveFleaShotHit (flea/scorpion, slot 12)

This mirrors the ROM: motion, then PLAY before SHOOT, and SHOOT tests spider (13) before segments (0-11).

### Upstream Findings to Mark Resolved

Two Delivery Findings from cp3-1's review (sprint/archive/cp3-1-session.md) are resolved by this fix:

- **"PLAY runs after SHOOT in the sim; the ROM runs it inside BUGMV, before SHOOT"** (Reviewer finding, non-blocking)
  - Root cause: checkPlayerContact called at end of frame
  - Fix: move to before resolveShotHit

- **"SHOOT's scan priority is inverted — the ROM tests the spider first, the sim tests the segments first"** (Reviewer finding, edge-hunter retry)
  - Root cause: resolveShotHit (segments) runs before resolveSpiderShotHit (spider)
  - Fix: reorder creature resolution by descending slot

Both are cited to CENTI4.MAC:33-34 (mainloop PLAY vs SHOOT), :2171/:2292-2294 (SHOOT slot scan).

### Citations (CENTI4.MAC, revision.v4)

- `:33` — mainloop PLAY call
- `:34` — mainloop SHOOT call
- `:417` — PLAY is called inside BUGMV
- `:1806` — PLAY stamps MOBJP=0xFF (player death)
- `:2171` — SHOOT slot loop entry: `LDX I,13.`
- `:2177-2178` — SHOOT skips slot if creature is dead
- `:2202` — SHOOT window: |dV| < 5 (hex)
- `:2232` — SHOOT window: |dH| < 10. (decimal)
- `:2236-2249` — SHOOT PTS band/picture selection
- `:2266` — segment SHOOT window: |dH| < 6 (hex, from cp2-4)
- `:2292-2294` — SHOOT slot loop: `DEX / BMI 30$ / JMP 115$` (descend, exit on first match)

## Acceptance Criteria

### AC-1: Frame order matches the ROM mainloop

Frame order matches CENTI4.MAC:33-34/:417:
- MOTION/EXPLOD (steps all creatures)
- PLAY (gun contact resolved BEFORE SHOOT)
- SHOOT (shot collision, spider/flea/scorpion/segments in descending slot order)

Cited to mainloop and the ROM's documented PLAY/SHOOT order.

### AC-2: Spider priority in SHOOT

A shot inside both the spider window (|dV|<5 hex, |dH|<10 decimal per :2202/:2232) and a segment window (|dV|<5 hex, |dH|<6 hex per :2202/:2266) kills the SPIDER and scores the proximity band (300/900/600), not the segment.

Pinned by test replicating the frame state.

### AC-3: No regression across inherited surface

Every existing cp2 segment/shot/death test remains green (cp2-3, cp2-4, cp2-5 suites), cp3-1's spider lifecycle and render sweeps stay green, and the two cp3-1 Delivery Findings are marked resolved in the commit message. Suite, citations, and build all green.

Tests to re-pin from existing suites:
- cp2-3: segment motion, OBSTAC turns, poisoned dives, gun blocking
- cp2-4: segment collision, explosion, mushroom drop, NEWHD split, segment scoring
- cp2-5: death/RESTOR sweep, wave-1 loop
- cp3-1: spider lifecycle, BUGMV movement, eating, scoring, proximity bands
- cp3-2: flea ANTMV movement, seeding, collision
- cp3-3: scorpion SCORP movement, poison creation, collision
- cp3-4: fragmented train (segments after split)
- cp4-7: attract demo auto-play lifecycle

The frame reorder is shared code, so regressions surface immediately in any test that calls `stepPlayingFrame` or `step`.

