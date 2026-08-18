# mc12-5

## Problem

Problem: The marker showing how many missiles a player has left ("ready missiles") was drawing at the wrong size on real screens — a small dot was rendering roughly 2.5x too big, appearing as a noticeably oversized square instead of a crisp marker. Why it matters: This is a visual fidelity bug in a faithful arcade recreation — players and reviewers comparing this clone against the original 1980 Missile Command cabinet would see an artifact that doesn't match the source hardware, undermining trust in the accuracy of the whole game.

## What Changed

Think of the game's rendering code as a recipe that scales drawings to fit different screen sizes. Deep in that recipe, one specific ingredient — the size of the "ready missile" marker dot — was calculated using an old, arbitrary shortcut (dividing by the number 200) instead of using the game's proper, consistent scaling system. That shortcut happened to look fine on the small canvas used for automated testing, which is why no automated test ever caught it — but on the actual, larger display size the arcade cabinet uses, it produced a marker roughly 10 pixels wide instead of the correct, smaller size the original hardware intended.

The team went back to the original 1980 arcade machine's source code (specifically the assembly instructions that draw missiles) to confirm exactly what size that marker was supposed to be, then rewired the marker to use the same proper scaling unit already used everywhere else in the renderer. They also added an automated check that specifically verifies the marker's size at full display resolution — not just the small test canvas — so this class of bug can't silently creep back in.

## Why This Approach

This wasn't a new bug — it was the same root cause as a very similar issue fixed one story earlier (mc12-4), just hiding in a second location. Rather than patch the symptom (just changing the number), the team traced it to its source: a leftover "magic number" (200) that had no real meaning tied to the original arcade hardware, only convenient math for one screen size. Every other measurement in this renderer is expressed in a proper shared unit that scales correctly to any screen; bringing this marker in line with that system fixes it permanently and consistently, rather than swapping one arbitrary number for another. Checking the original machine's source code first, rather than guessing at a "close enough" size, ensures the fix matches what the real 1980 cabinet actually displayed — accuracy comes from the source material, not estimation.
