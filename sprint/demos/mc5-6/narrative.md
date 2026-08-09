# mc5-6

## Problem

**Problem:** Missile Command's enemy ICBM swarm was artificially capped at 7 missiles on screen at once, when the original 1980 arcade machine actually allowed 8. **Why it matters:** This isn't just a number to fix on a spreadsheet — that "missing" 8th slot is specifically reserved for the enemy bomber plane's own missile. With the cap wrong, the bomber (landing later this sprint in story mc5-2) would have nowhere to fire into once the sky was already full of ICBMs, breaking one of the game's signature late-wave threats before it ever ships.

## What Changed

Think of the screen as a parking lot with a fixed number of spaces for enemy missiles. We had it posted as "7 spaces available," but a careful re-read of the original game's own logic (down to the exact assembly instructions) showed the real lot has 8 spaces — the "7" was a leftover of how the original programmers counted (starting from 0 instead of 1, an old-school programming shorthand). We corrected our code, our internal documentation, and every test that checked "how many missiles can appear at once" to reflect the true number: 8. When the enemy bomber is active, it now reliably reserves the 8th and final space for itself, matching how the arcade original behaved.

## Why This Approach

Rather than guessing at what "felt right," the team went back to the original 1980 game's source code line-by-line to settle a subtle disagreement between two numbers that both appeared to describe "the missile limit" but actually meant different things — one was the true limit, the other was an internal counting quirk. Once the real number was confirmed against the original source, every part of the game that referenced the old, wrong number was updated together in the same change, so nothing was left half-corrected. This was done carefully with a full test suite (901 automated checks) to make sure raising the cap didn't introduce any new bugs, and a two-person review caught two minor wording issues in the documentation before sign-off.
