# sw11-2

## Problem

Problem: The gun turrets mounted on the trench walls in the Star Wars game clone were floating in front of the wall instead of sitting flush against it, and their barrels were pointing in the wrong direction on at least one side of the trench. Why it matters: This is a visual fidelity bug in a faithful arcade recreation — players trench-running toward the Death Star exhaust port would see turrets that look physically wrong (hovering, misaligned, aiming the wrong way), breaking the illusion the whole game is built to deliver and diverging from how the original 1983 arcade cabinet rendered the same scene.

## What Changed

Think of the trench turret like a picture frame that was designed to hang flat against a wall, but got nailed up floating a few inches off the wall and rotated sideways. The 3D "shape" of the turret (its geometry) was always correct — it's a flat plate with a gun barrel sticking out one side. The problem was that the code responsible for positioning and rotating it in the scene had lost its instructions during an earlier change, so every turret on both the left and right trench walls used one single, generic orientation — nobody told the code "the left-wall turret and the right-wall turret are mirror images of each other, and each needs to be rotated to lie flat against its own wall."

The fix restores that missing instruction: turrets are now rotated and mirrored based on which wall they're mounted to, so the left-wall gun and the right-wall gun correctly face into the trench channel and sit flush against their respective walls — matching the original arcade machine's design, which explicitly mounted left and right guns as mirror images of one another. The same check was applied to two other trench wall fixtures (a wall panel and a catwalk) that shared the same underlying placement logic, in case they had the same problem — they turned out to be fine.

## Why This Approach

The team traced this back to original 1983 arcade source code and confirmed, in black and white, that the game's designers built the left and right trench guns as intentional mirror images — not just "close enough" copies. That gave a precise target to hit rather than a guess. Because the underlying 3D shape of the turret was already correct, the cheapest and most reliable fix was to correct only the "where does it sit and which way does it face" logic — not touch the shape itself. This keeps the fix small, isolated to the rendering/placement layer, and avoids risk to the core simulation logic that the rest of the game depends on. The team also manually looked at the fixed turrets running in the browser, because a positioning/orientation bug like this can look correct in automated tests while still being visually wrong on screen — so a human eyeball check was the only way to be sure the fix actually looks right.
