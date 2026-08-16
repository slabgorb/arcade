# df4-1

## Problem

Problem: In the Defender arcade clone, nothing had a way to notice when two things touched — a laser hitting an enemy, an enemy's bomb hitting the player's ship, or the player's ship flying into an enemy. Why it matters: every enemy and weapon we build from here forward depends on this one shared "did they touch?" check. Without it working exactly like the original 1980 arcade board, nothing in the game can score a hit, take damage, or die the way players remember it — and every future enemy story would either duplicate this logic or get it wrong.

## What Changed

Think of this as building the referee for the game — the person watching the field who blows the whistle the instant two things touch. We ported the *exact* touch-detection logic from the original 1980 Defender arcade machine's own game code, rather than inventing a new, generic "did these two boxes overlap" checker from scratch.

This referee currently answers three specific questions, matching three real moments from the original game:
1. Did the player's laser hit something?
2. Did an enemy's bomb hit the player?
3. Did the player's ship crash into something?

Because none of Defender's enemies have been built yet in this codebase, we tested the referee using stand-in, made-up "pretend enemies" — simple placeholder objects with positions and sizes — to prove the touch-detection math is correct before any real enemy exists. It's like testing a metal detector on a table of test objects before taking it to the actual site. We also made sure every number we used (like exactly how big a laser's hit-box is) was checked byte-for-byte against the original game's source code, so nothing was guessed or approximated.

One thing was intentionally left for later: the original game actually does two rounds of checking — a quick, rough "are these two anywhere near each other" pass, and then, only if that passes, a much finer, pixel-by-pixel check using the actual on-screen graphics. We only built the first, rough pass in this story, because the finer pass needs real enemy artwork that doesn't exist in the codebase yet. That's a deliberate, documented decision, not an oversight.

## Why This Approach

We built the tests first, before writing any of the actual detection code, and watched them fail on purpose — this proves the tests are actually checking something real, not just rubber-stamping code that already happened to work. Only after that did we write the minimum code to make them pass.

We deliberately copied the original arcade game's own approach rather than reaching for a more "modern" or "elegant" collision-detection technique (the kind of thing you'd find in a general game-development toolkit). That's a conscious trade-off: a fancier, more efficient technique might change *which* hits count as hits in edge cases — for example, two things that just barely brush corners — and we need our game to feel exactly like the original cabinet, quirks and all, not just "close enough." This is the same "the ROM always wins" principle we've applied throughout the Defender port.

The code that does this touching-check has no dependencies on the screen, the clock, randomness, or anything else — it's a simple, predictable calculator: give it the same inputs, get the same answer, every time. That predictability is what lets every future enemy safely plug into this same referee without surprises.
