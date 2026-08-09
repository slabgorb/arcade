# sw10-2

## Problem

Problem: On the Death Star trench run's *surface* levels — the open battlefield the ship crosses before diving into the trench — enemy turret and bunker fire moved through the world at a walking pace while the ground and scenery around it rushed past 17 to 70 times faster. Why it matters: the world visibly outran the bullets meant to hit the player, breaking the illusion that the ship was flying at speed and making incoming fire look like it was standing still — or even drifting backward — relative to everything else on screen. This is a direct visual-fidelity regression from the same root cause already fixed once in the trench (PR #125): a bug fixed in one place but left live one phase over.

## What Changed

Think of the game world as a treadmill: the ground and every object on it (turrets, towers, bunkers, terrain) all move backward at the "treadmill speed" to simulate the ship flying forward. When the trench-run turrets fire their guns, that shot correctly rides the treadmill along with everything else, so it looks anchored to the world. The surface turrets, however, had their bullets built with old-style logic that ignored the treadmill entirely — the shot just pointed at the ship and moved at one fixed slow speed, no matter how fast the world was scrolling underneath it.

The fix reuses the exact math that made trench gunfire look right, and generalizes it so both the trench and the surface can share it: instead of hard-coding one scroll speed into the formula, the shot's velocity calculation now takes "how fast is the world scrolling this frame" as an input. The trench passes in its fixed scroll constant; the surface passes in its own ramped-up scroll speed (which increases as the level progresses). The shot's forward motion locks to that scroll rate, while its left-right and up-down motion is aimed to intercept the player ship's actual position — not just its position at the moment of firing.

One more related fix rode along: because these bullets now close distance much faster and more realistically, a bullet could theoretically pass all the way through the ship's hit zone between two single-frame position checks without ever registering as "inside" it — like a strobe light making a moving object look like it teleported past a trip-wire. The collision check for the surface cockpit hit was upgraded from a single-point check to one that also checks the path the bullet swept between frames, so fast shots can't skip past detection.

## Why This Approach

Rather than write brand-new logic for the surface case, the team recognized this was the same bug they'd already diagnosed and fixed for the trench — just showing up in a second location that shared the same underlying scrolling-world design. Generalizing the existing, already-tested trench fix (instead of duplicating it) means there's one formula to trust and maintain instead of two that could drift out of sync in the future. This is also lower-risk: the trench version of this logic was already proven correct in production, so extending it carries forward that confidence rather than introducing an unproven new code path.
