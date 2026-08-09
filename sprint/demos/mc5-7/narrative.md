# mc5-7

## Problem

**Problem:** In our Missile Command clone, Wave 1 was ending after only 8 enemy missiles instead of the 12 the original 1980 arcade machine throws at players. **Why it matters:** Wave 1 is a new player's first impression of the game's difficulty and pacing. Ending it a third early makes the opening wave noticeably easier than the arcade original, which undercuts the "faithful clone" promise this whole project is built on — and it's the kind of subtle mismatch that veteran players of the original cabinet would notice immediately, even if they couldn't say exactly why the game "felt off."

## What Changed

Think of Wave 1 as a delivery truck with a fixed number of packages to drop off before it moves on to Wave 2. The truck was accidentally loaded with 8 packages when the original game's blueprint calls for 12. We relabeled the truck's manifest so it now loads the correct 12.

Concretely: the game was mixing up two different numbers that happen to live near each other in the original game's logic — "how many enemy missiles are allowed on screen at once" (a cap of 8) versus "how many missiles Wave 1 is scripted to launch in total" (a budget of 12). Those are two separate dials in the original 1980 machine, and our code had wired Wave 1's total budget to the wrong one. We corrected the wiring so Wave 1 now draws from the right number, and we corrected two internal reference documents (a glossary and a research brief) that had been describing the "on-screen cap" dial with language that actually belonged to the other one — so future work on this game doesn't repeat the same mix-up.

## Why This Approach

This was a one-line root-cause fix, not a rewrite: once we traced the original arcade machine's source code and found the exact instruction that loads Wave 1's missile count, it was clear our game was reading from the wrong constant. Rather than patching the symptom (e.g., special-casing Wave 1's missile count), we pointed the game at the same schedule-driven value the original engineers used, so every future wave inherits the correct pattern automatically instead of needing its own manual fix. We also updated the two "showing our work" documents that describe these constants for future engineers — an easy trap to fall into is fixing the code but leaving the paper trail pointing at the old, wrong explanation, which just re-plants the same bug for the next person.
