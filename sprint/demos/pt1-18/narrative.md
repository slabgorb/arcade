# pt1-18

## Problem

**Problem:** In the Defender game, the entire game world was being squeezed onto a single screen at once — every enemy on the map was visible immediately, and the camera scrolling and radar scanner at the top of the screen were decorative only, with no effect on what the player could actually see or shoot. **Why it matters:** The original 1980 Defender arcade cabinet is built around exactly this tension — the world is nearly seven screens wide, you can only ever see a narrow slice of it, and the radar scanner is how you spot threats and hostages beyond your view. Collapsing the whole world onto one screen erased that core gameplay loop, made the game trivially easy (nothing could ever sneak up on you), and — because shooting logic hadn't caught up to what was actually drawn — created situations where a player's laser could visually pass through an enemy without registering a hit.

## What Changed

Imagine looking at a mile-long mural through a narrow window that slides along a track — you only ever see the few feet of mural lined up with the window, and you have to slide the window to see more. That's what Defender is supposed to feel like. Before this fix, it was as if someone had removed the wall around the window and let players see the entire mile-long mural at once.

This change puts the wall back. The game world (about 6.8 screens wide) now only shows the roughly one-seventh slice that lines up with the player's camera position — exactly matching the window size used by the original 1980 game. As the ship flies and the camera scrolls, new enemies and terrain slide into view from the edges instead of being visible the whole time. Enemies outside that visible slice are hidden from the main screen but still show up as blips on the radar scanner at the top, which is exactly how the original game worked — the scanner is now doing real work instead of just being decoration.

Just as important: the fix makes shooting, collisions, and rendering all agree on the same "visible window." Previously these three systems could disagree, meaning a shot could look like it missed (or hit) something it shouldn't have. Now what the player sees on screen is precisely what they can hit and be hit by.

## Why This Approach

Rather than inventing a new windowing scheme, the team went back to the original 1980 arcade machine's own source code to find the exact formula it used to decide what's "on screen" — a simple boundary check the original programmers wrote directly into the game's assembly code. Reusing that exact formula (rather than approximating it) guarantees the fix matches the authentic arcade experience players may remember, not just a plausible-looking recreation.

The team also made sure this single "visible window" rule was applied consistently everywhere it matters: drawing enemies on screen, detecting collisions between the ship and hazards, and checking whether a laser shot actually hit something. Previously these three systems could each have a slightly different idea of what was visible, which is what caused the "invisible hit" bug. Unifying them under one shared rule closes that gap for good.

To make sure this actually works in a real game session (not just in isolated tests), the team also played the game live and confirmed the behavior visually: with the fix in place, only 5 of 25 enemies on the map were visible on screen at any moment (the other 20 were correctly off-window but still visible on the radar), and the camera scrolled smoothly as the ship moved through the world. The full automated test suite (1,058 tests) also passed, including targeted tests that specifically try to break the visible-window boundary to prove it holds.
