# Narrative

## Problem Statement
**Problem:** In the space combat scenes of our *Star Wars* arcade recreation, enemy TIE Fighters flew straight at the player and simply grew bigger as they closed in — like a photo zooming in on a fixed point — instead of visibly sweeping across the screen the way they do in real footage of the original 1983 arcade cabinet.

**Why it matters:** This project's entire value proposition is that these are faithful recreations of the original arcade machines, not just "inspired by" games. A moment as central as the TIE Fighter attack run is one of the most recognizable pieces of the original experience — getting it visually wrong undermines the authenticity the whole project is built on, even though nothing was technically "broken" (the game still ran, scored, and played correctly).

## What Changed
Think of each TIE Fighter as a little toy plane that always flies in a straight line in whatever direction its nose is pointed the instant it's placed on the board.

Previously, when a fighter appeared, we pointed its nose directly at one exact spot: the player's cockpit. That meant no matter where a fighter started — off to the left, off to the right, or dead center — it immediately beelined for that single point. Because it was aimed *exactly* at the target from the very first instant, it collapsed toward the center almost immediately, and all that was left to see was it getting bigger. That reads to the eye as "zooming in," not "flying across."

The fix: fighters now start out pointed straight ahead — same direction, every fighter, regardless of where it spawns — rather than aimed at the cockpit. Since a fighter flies in the direction it's pointed, one that starts off to the side now genuinely travels across the field as it closes in, carrying that left/right position with it. The fighter's existing steering behavior (unchanged) then gradually curves it back toward center later in its approach, exactly matching the sweeping, crossing pattern seen in the original cabinet footage.

It's a single, precisely-targeted change to how a fighter is aimed the moment it's born — nothing about how it flies, fires, or is destroyed was touched.

## Why This Approach
The team didn't rewrite the flight or steering system, even though that was the first suspect. Instead, they traced the visual bug back to its earliest possible cause: the instant a fighter is created, before any flying even happens. Since a "nose pointed at the exact target" is a much stronger and more literal instruction than anything downstream in the flight logic, fixing *that* one starting condition was enough to fix the entire visual pattern — no other system needed to change.

This is also the more historically accurate choice, not just the smaller one. The team had previously decoded the original 1983 game's source code and found the actual instruction: fighters are told to face straight down the runway, not aimed at the player. So this fix aligns our code more closely with the real 1983 program, not just with what "looks right."

Because it's such a small, surgical change, the team was able to verify it thoroughly: nearly 1,900 automated checks across the entire game still pass, nothing else visibly changed, and — importantly — they specifically checked that enemies didn't become *easier* by accident (e.g., firing less often because they're no longer beelining at the player). It turned out enemies actually stayed in the fight slightly longer and fired somewhat more, which is a bonus, not a regression.
