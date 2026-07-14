# Narrative

## Problem Statement
**Problem:** The previous update to Tempest's level-transition camera (shipped as tp1-31) shifted each of the game's 16 tunnel shapes up or down on screen to match the original 1981 arcade cabinet's framing — but the shift was too strong. On 8 of the 16 levels, the near edge of the tunnel (and the player's claw cursor riding on it) was pushed partly off the visible screen. It was visible even on level 1, and got worse the deeper a player went — the worst case (level 12) overshot the visible screen boundary by 87 units.

**Why it matters:** Tempest is played entirely by watching where your claw sits on the tunnel's rim. If part of that rim is cut off the screen, players lose track of their own cursor — it looks broken, not authentic, and undermines confidence in every other fidelity improvement shipped alongside it. Left alone, this would have been the first thing a returning player noticed.

## What Changed
Think of the camera nudge from the last update like zooming a photo in to match an old reference picture — except it zoomed in too far and cropped the edges of the frame. This fix adds a single "volume knob" that turns that zoom down to about a quarter of its original strength. Every one of the 16 tunnel shapes now sits comfortably inside the screen on both top and bottom, while still keeping the general "leans up" or "leans down" feel the original arcade machine gave each level. Nothing about how the game plays changed — only how snugly each level's tunnel fits inside the visible screen.

## Why This Approach
Three ways to fix this were on the table: turn the camera nudge down uniformly, shrink the tunnel itself, or put a hard ceiling on how far any single level could shift. The team chose the uniform "turn it down" option because it's the smallest possible change — one number — and it's the only option that preserves every level's relative up/down positioning exactly as the original 1981 machine intended. A hard ceiling would have flattened that distinction, making two different levels look identically framed and breaking an existing check that depends on consecutive levels looking visually distinct during the transition animation.

The exact amount to turn it down wasn't guesswork — it was calculated from the single worst-case level (level 12) with a small safety cushion built in, then double-checked by a second, independent pass of the same math. That second pass also proved a case broader than what the automated check requires: even the brief animated slide *between* two levels can't clip, not just each level once it settles.
