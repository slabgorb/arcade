# Narrative

## Problem Statement
Problem: In the Red Baron clone, the single most visible object on screen — the player's own spinning propeller — was invisible. So was the enemy biplane's propeller, the on-screen life count, the cracked-glass damage that should appear when the enemy ace hits you, and the readout showing the point value of the plane in your gunsight. Every object on screen also rendered at the same flat brightness no matter how far away it was, and gunfire looked like a smeared line instead of the sharp dot the original 1980 arcade cabinet drew.

Why it matters: These are the details a player notices in the first three seconds, whether or not they've ever played the original. A blank nose where a propeller should be, or gunfire that reads as a streak instead of a shot, breaks the illusion instantly and makes every other faithfully-rebuilt system look suspect by association. This story closes out ten separate findings from the fidelity audit in one pass, which is why it's the largest single ticket (13 points) in the Red Baron epic.

## What Changed
- **The propeller spins again.** The player's propeller now animates by cycling through its three blade positions, redrawn on the true screen-refresh clock (about 63 times a second) instead of the slower game-logic clock — the same fix ensures it looks smooth instead of stuttery.
- **The enemy plane got its propeller back too.** The shape data already existed in the code; it just was never being drawn. Now it is.
- **Distant things look distant.** We added a brightness ("intensity") channel to every shape the game draws, so objects further away render dimmer — matching how the real arcade hardware faded far-off objects. The player's plane specifically draws in two brightness tiers: a bright main body and dimmer wing struts, exactly like the original.
- **The heads-up display is no longer empty.** Remaining lives are now drawn as icons, cracks accumulate on the windscreen glass on the correct side when the enemy ace scores a hit, and a "PLANE ###" readout appears next to the score showing how many points the plane in your sights is worth.
- **Gunfire looks like gunfire.** Shots now render as dots, matching the original machine, replacing a streak effect that was never part of the source design. A two-color "GUNS HOT" banner that had been invented along the way was also replaced with the plain, single-color vector message the original game actually displayed.

## Why This Approach
Every behavior in this story was pulled directly from the original 1980 arcade machine's source rather than guessed at or "improved." The team's process was: pin down exactly what the original did, write tests that fail until the game matches it, then write the minimal code to make those tests pass — so nothing ships that isn't provably correct against the source of truth.

That discipline paid off mid-story: an independent review caught a HUD test that could technically pass even if both the lives icons *and* the windscreen cracks were deleted from the screen entirely — a gap that would have let a real regression slip through silently. That was fixed before sign-off, along with a few other test gaps (an unrendered damage readout, an unverified brightness effect), in one additional round of rework. The story is now fully approved with no open blocking issues — the remaining notes are minor, logged refinements for later (e.g., the windscreen crack currently appears in one step per hit rather than animating gradually the way the original's death sequence does).
