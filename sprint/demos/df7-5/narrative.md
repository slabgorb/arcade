# df7-5

## Problem

Problem: Defender's on-screen radar — the strip at the top of the screen that shows where enemies are lurking outside the visible play area — was being calculated by the game's brain but never actually drawn. Score, remaining lives, and the wave number were in the same boat: tracked internally, but invisible to the player. Why it matters: A player can't see enemies coming from off-screen or track their own progress without this information onscreen. In the original 1980 Defender, the radar strip is one of the signature things that makes the game playable at speed — without it, players are flying blind against threats they can't anticipate.

## What Changed

Think of it like this: the game had already done the math to figure out "where are the bad guys relative to me" and "what's my score" — but nobody had built the TV screen to display any of it. This change builds that screen.

- **The radar strip now shows up.** Enemies that are off-camera now appear as blips on a scanner bar, positioned accurately based on where they actually are in the game world — matching the layout of the original arcade cabinet's scanner bezel.
- **The HUD (heads-up display) now shows score, lives, and wave number**, drawn using the game's authentic-looking pixel font and its official color set — not made-up colors, but colors pulled from the same palette system used everywhere else in the game for consistency.
- **Nothing flickers.** The display is stable frame-to-frame — no flashing or strobing, which matters both for a smooth look and for accessibility (some display styles can trigger discomfort for photosensitive players, so this was deliberately avoided).
- Under the hood, the "figuring out where things are" logic and the "drawing it on screen" logic remain cleanly separated — the game's core simulation still doesn't know or care how anything gets painted to the screen, it just supplies the data.

## Why This Approach

The team that maintains this game has a hard rule: game logic and screen-drawing logic never mix. That's what let this story be scoped as "just drawing" — someone already built the underlying scanner math and the score/lives tracking in earlier work; this story's entire job was to take that existing, trustworthy data and finally put it on screen, rather than re-deriving any of the game logic.

Every visual constant (positions, colors, layout) is tied back to a documented citation from the original game's source material, so the display isn't guesswork — it matches the authentic arcade cabinet's design. And colors are pulled from the shared color palette by reference (an index), not hardcoded — so if the palette is ever refined project-wide, this HUD updates automatically instead of drifting out of sync.
