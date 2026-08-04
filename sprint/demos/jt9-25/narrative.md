# jt9-25

## Problem

Problem: When Joust's eggs finished hatching, the game jumped straight from "settled egg" to "flying enemy" on a single frame, always drawing the same generic egg picture — and a bug in how sprite positions were decoded meant left-leaning egg art was being placed on the wrong side of the screen. Why it matters: The original 1982 arcade game plays a short, distinctive hatching animation before an enemy emerges, and it briefly lets players see — and even grab — the egg one last time. Skipping that animation broke the authentic feel of the clone, and a related decoding bug meant some egg artwork could render out of position. Worse, a loophole let players "steal" an egg's points at the exact moment it should have already committed to hatching, which shouldn't be possible in the real game.

## What Changed

Think of an egg's life like a stoplight sequence the original game follows exactly: wiggle left, wiggle up, wiggle right, pause... crack, crack, crack, crack — then out flies the enemy. We found the original game's internal timing table that drives this exact sequence and rebuilt it faithfully, so eggs now visibly go through that full performance instead of instantly swapping into an enemy.

Along the way we also fixed a separate, related bug: the game reads a small number that tells it how far left or right to shift certain sprite art, and for art meant to shift *left*, that number needs to be read as a "negative" value. The code was reading it as always positive, so left-shifted art (like some of the egg-hatching frames) would appear in the wrong spot. We fixed the reading so negative shifts work correctly.

Finally, because eggs now spend more time visibly hatching, we closed a loophole: an egg that has already committed to hatching can no longer be scooped up and collected by the player as if it were still a plain, sitting egg — matching how the original machine behaves.

## Why This Approach

We didn't guess at timing or invent an animation that "looked about right" — we located the original game's actual internal data table that drives this sequence, transcribed it, and built the code to walk through it exactly as the original hardware does. This is the same evidence-based approach used throughout the project: change nothing until you can point to the exact original data backing it.

We split the work into two focused changes: first the low-level decoding fix (which changes rendering only, with zero effect on gameplay outcomes), then the animation feature that uses it. That let us prove each piece independently — the decoding fix couldn't have broken any game logic because nothing else depended on it yet, and the animation work builds cleanly on top of a proven foundation. When building the animation surfaced two side-effects (the enemy-counting logic and the collectibility loophole), we treated those as separate, deliberately labeled fixes rather than quietly bundling them in, so anyone reviewing the change later can see exactly what shifted and why.
