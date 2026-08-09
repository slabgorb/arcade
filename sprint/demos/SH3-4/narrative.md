# SH3-4

## Problem

Problem: Pac-Man's on-screen display was hand-built one piece at a time inside the game itself, including the code that finds the screen and the code that resizes it when the window changes size — and that resize code never adjusted for high-resolution ("Retina"/high-DPI) displays, so it was permanently capped at standard sharpness no matter how good the player's screen was. Why it matters: Every other game in the arcade already uses a shared, tested piece of code for this exact job. Leaving Pac-Man on its own one-off version meant extra code to maintain, no guarantee it behaved the same as its siblings, and a display that couldn't take advantage of sharper screens even though the shared tooling already supported it.

## What Changed

Think of it like a shop that used to build its own cash register and its own scale from scratch, even though every other shop in the mall was using the mall's standard-issue, pre-tested equipment. This update swaps Pac-Man over to that standard equipment for two specific jobs:

1. **Finding and preparing the screen** — instead of Pac-Man writing its own custom lookup code (with its own custom error messages if something went wrong), it now calls the same shared "mount the canvas" helper every other game in the arcade uses.
2. **Resizing the screen when the window changes** — instead of a resize routine that only ever drew at standard sharpness, Pac-Man now calls the shared resize helper, which automatically detects how sharp the player's screen is (up to a sensible cap) and draws at that higher quality.

One thing was deliberately **not** changed: Pac-Man keeps its own logic for scaling the picture up in whole-number steps (so pixels stay crisp and blocky, the way a classic arcade game should look). The shared library also offers a general-purpose scaling tool, but that tool is built for smooth/fractional scaling — using it here would have blurred Pac-Man's pixel art, so the team intentionally left that piece alone.

The team also checked whether Pac-Man's pause feature could be moved onto the shared "pause" building block. After investigating, they found that the thing in Pac-Man's code that looked like it might be a player pause was actually unrelated internal bookkeeping for the ghosts' behavior — not a real pause feature at all. Rather than force a change that didn't actually fit, they correctly left it alone and documented why.

## Why This Approach

The engineering principle here is "don't rebuild what's already been built and proven." The arcade project maintains one shared toolbox that all seven games draw from, so that a fix or improvement made once benefits every game instead of needing to be re-applied seven times by hand. Pac-Man, along with two other newer games, had fallen behind on adopting that shared toolbox — this story is part of a focused cleanup effort to catch it up.

Just as important as what was changed is what wasn't. The team's rule was "match the shared behavior, keep the game's own specific numbers and rules." That's why the crisp, blocky pixel-scaling logic stayed put — swapping it for the shared general-purpose version would have made the game look wrong. And that's why the pause-menu idea was investigated rather than blindly implemented — the team verified the underlying assumption first and found it didn't hold, avoiding wasted work and a bad forced-fit. This "verify before you force it" discipline is exactly the kind of guardrail that keeps a shared-code cleanup effort from accidentally breaking things it touches.

Before shipping, the team ran Pac-Man's full automated test suite (277 tests) and the project's type-checker — both came back completely clean, giving confidence the swap didn't change any visible behavior except the intended sharpness improvement.
