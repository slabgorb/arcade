# Narrative

## Problem Statement
**Problem:** A prior update (tp1-17) taught the game to draw four enemy/player shapes exactly as they appeared in the original 1981 arcade hardware, but left four loose ends: the "fuseball" enemy's shape had no strong safety-net test, one piece of audit documentation described a shape incorrectly, an internal design tool showed outdated colors/labels for two shapes, and nobody had actually looked at a screenshot of the player's bullet effect in a live game to confirm it looked right.

**Why it matters:** Without a real shape-level test, a future code change could quietly distort the fuseball enemy and nobody would notice until a player did. Incorrect documentation about how shapes are built can mislead the next person who touches this code into "fixing" something that isn't broken. And stale labels in the internal design tool erode trust in that tool as a reference. None of these were breaking the game today, but each was a small, avoidable risk of things going wrong later or leading someone astray.

## What Changed
Think of this as tightening four loose bolts left over from a bigger repair job:

1. **Added a real "shape checker" for the fuseball enemy.** Previously, the automated tests only checked that the fuseball used the right colors — they didn't check its actual shape. Now there's a dedicated test that checks every single point (113 points across its 4 animation frames) against the original 1981 source code, so if anyone ever accidentally nudges a point out of place, the test catches it immediately instead of shipping a subtly wrong-looking enemy.
2. **Fixed a documentation mistake.** An earlier audit note claimed that three variants of the "spiker" enemy's spiral shape were each hand-drawn separately. That wasn't true — checking the original source code showed they're actually just the same shape mathematically rotated 90, 180, and 270 degrees. The note now says that correctly.
3. **Fixed stale labels in the internal design tool.** A tool developers use to preview all the game's shapes at once still said the spiker enemy was orange (it now ships green) and called the fuseball "tri-colour" (it actually has 5 colors). These were just outdated labels — nothing about how the game actually looks was wrong, only how the tool described it.
4. **Visually confirmed the player's bullet effect.** The player's "charge" attack is a glowing cluster of 17 dots. It had only ever been checked as raw data before — nobody had watched it fire in a real, running game. It was confirmed live: started the game, fired a shot, and captured a screenshot showing the glowing dot cluster rendering correctly mid-flight.

## Why This Approach
Rather than re-opening the original shape-fidelity work, this story specifically mopped up the small, well-defined items flagged as follow-ups from it — a pattern the team uses to keep each unit of work small and reviewable instead of letting "almost done" tasks pile up. For the fuseball, the team chose to add a "mutation-tested" guard: they deliberately broke one point in the shape on purpose, confirmed the new test caught it, then put the shape back and confirmed the test went green again. That's the standard way to prove a test isn't just present but actually working — a test that never fails when it should is worse than no test at all. For the documentation fix, engineers hand-verified the correct behavior against the original 1981 source code before changing a single word, so the correction itself is trustworthy. The label fixes were treated as purely cosmetic — no game logic was touched, keeping the change low-risk. And for the visual check, rather than trusting the data alone, someone actually watched the game run and took a screenshot, because "the numbers are right" and "it looks right on screen" aren't always the same thing.

## Before/After
| Item | Before | After |
|---|---|---|
| Fuseball enemy shape testing | Only colors checked (5 colors, 4 frames) — shape itself unguarded | Full shape check: all 113 points across 4 frames verified against original source, proven to catch real breaks |
| Audit documentation (spiral shape) | Claimed the shape was "re-authored" — factually wrong | Corrected: confirmed to be an exact 90/180/270-degree rotation of the original shape |
| Internal design tool labels | Spiker shown as orange; fuseball called "tri-colour" | Spiker shown as green (matches shipped color); fuseball correctly described as 5-colour |
| Player bullet effect | Only verified as raw data — never seen rendering live | Confirmed live in-game with a screenshot showing the 17-dot glow cluster mid-flight |
