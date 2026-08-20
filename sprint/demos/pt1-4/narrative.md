# pt1-4

## Problem

**Problem:** The Star Wars arcade game's on-screen display would stretch and distort to fill whatever browser window it was opened in — on a wide monitor, the cockpit gauges (the "HUD") would spread far apart from the game action in the center, breaking the visual layout the original 1983 arcade cabinet was designed around.

**Why it matters:** Players on ultrawide or unusually-shaped monitors were seeing a broken, unfaithful version of the game — instrument readouts separated from the action they're supposed to sit next to. This undermines the "authentic arcade cabinet" experience that is the whole point of the project, and it made Star Wars the visual outlier among the games in the lineup, most of which already handled this correctly.

## What Changed

Think of the original arcade cabinet as having a fixed-size screen — you couldn't stretch it wider or narrower, it was always the same shape. Our browser version was ignoring that and just filling whatever window size the player had, like a photo stretched to fit a frame it doesn't match.

This fix pins the game screen to that same fixed shape (4:3, the classic arcade ratio) no matter what size or shape the browser window is. The game now finds the largest version of that fixed-shape screen that fits inside the window, centers it, and fills the leftover space on the sides (or top/bottom) with plain black bars — exactly like watching an old TV show in "letterbox" format on a modern widescreen TV. Because the game area itself is always the correct shape, the cockpit gauges and the game action now always stay properly aligned with each other, on any screen.

## Why This Approach

Rather than inventing a new solution, the fix reused a pattern already proven in a sibling game (Battlezone), which is visually similar (both are first-person cockpit-style games). This is the same "letterboxing" technique streaming services and TVs have used for decades to show a fixed-shape picture correctly regardless of screen shape — a well-understood, low-risk approach rather than a custom one-off fix.

The team also caught and corrected a small precision issue during review: the code was initially calculating screen sharpness (for crisp visuals on high-resolution displays) indirectly, in a way that could drift by a tiny fraction of a percent. It was corrected to read the exact value directly, removing that drift entirely. The full game test suite (2,467 checks) passed after the fix, confirming nothing else in the game was disturbed.
