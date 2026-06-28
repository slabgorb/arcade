# Narrative

## Problem Statement
Problem: In Wave 1 of the Star Wars cockpit shooter, firing the cannon did nothing — TIE fighters were completely invulnerable to player shots. The only way to clear the wave was to physically ram into enemies, which is backwards from cabinet behavior and makes the game unplayable as a shooting game. Why it matters: shooting is the core verb of the experience. A player who fires and sees no effect will think the game is broken — because it was. This made Wave 1 a dead end for anyone who picked up the controls.

---

## What Changed
Imagine pointing a laser pointer at a target on a curved mirror. If you aim where the target *looks like it is*, the beam misses — you have to account for the curvature. That's exactly what was happening here.

The game draws the world in 3D perspective — objects far away appear smaller, nearby objects appear larger. But the aiming code treated the screen as if it were completely flat. So when a player put the crosshair on a TIE fighter and fired, the bolt flew in the direction the crosshair *geometrically occupied* rather than where the fighter actually was in 3D space. Every shot overshot the target by a predictable factor — roughly 1.7× in the vertical direction.

The fix corrects the aiming math to account for the game's field of view: the bolt now travels along the true line of sight through the crosshair, not past it. A second fix aligned the on-screen reticle's up/down orientation to match the bolt's actual path, so the visual feedback is honest. Five automated tests now lock in both behaviors so they can't regress silently.

---

## Why This Approach
The investigation showed the hit-detection system itself — the code that checks whether a bolt touched a TIE — was already correct and had been tested since Wave 0. The actual break was earlier in the chain: the *direction* the bolt was launched from. Fixing the collision check would have been the wrong surgery.

The team kept the fix in the pure game simulation layer (no screen-coordinate math), which preserves a design rule: gameplay physics lives in one place and knows nothing about pixels or window sizes. The screen's aspect ratio (width divided by height) is fed in from the shell, keeping the core logic testable and deterministic regardless of display size. This approach means the fix works on any screen shape and can be verified automatically in CI without a running browser.

---

## Before/After
| Scenario | Before (broken) | After (fixed) |
|---|---|---|
| Player aims crosshair at TIE and fires | Bolt flies past the TIE — enemy unaffected | Bolt travels through the crosshair — TIE is destroyed |
| All TIEs killed by player fire | Wave does not clear | Wave clears immediately |
| Player rams a TIE | Wave clears (wrong — collision was treated as a kill) | Wave does NOT clear from ramming alone |
| Automated test: fire at TIE under crosshair | `enemies.length = 1` (miss, enemy lives) | `enemies.length = 0` (hit, enemy dead) |
| Automated test: wave-clear condition | Stayed in `space` phase after kills | Advances to `surface` phase after all TIEs eliminated |
| Mouse aim: move cursor up | Reticle moved up, bolts flew *down* | Reticle moves up, bolts fly up — consistent |
| Build + test suite | 261 passing, 3 failing (kill loop tests RED) | 264 passing, 0 failing |
