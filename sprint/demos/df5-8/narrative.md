# df5-8

## Problem

Problem: In the Defender game clone, the "wave" system — the logic that spawns waves of enemy landers and escalates them as players clear the field — was built and fully tested, but never actually connected to the running game. Why it matters: Without this connection, players never encountered enemies. The game had all the ingredients for a Defender playthrough but nothing wired up to make waves of aliens actually appear, land, or ramp up in difficulty as the player kept playing — which meant the game was not really playable yet, and the next milestone (a full on-screen playtest, story df5-7) had nothing to test.

## What Changed

Think of it like building a working conveyor belt in a factory but never plugging it into power. The "wave director" (built earlier, in story df5-2) already knew all the rules for Defender's enemy waves — how many aliens should appear in wave 1, how that number should grow in wave 2, wave 3, and so on, matching the original 1980 arcade game's difficulty curve. But it was just sitting there unused.

This change plugs that wave director into the actual running simulation:
- When a fresh game starts, no enemies appear yet — the wave director waits for the very first tick of the game clock.
- As soon as the game starts running, the wave director checks the battlefield. If it's empty, it spawns the correct number of enemies for the current wave, spread out evenly across the game world.
- The simulation now continuously watches how many enemies are still alive. Only once every enemy on the field has been defeated does the director advance to the next wave and spawn a fresh, larger group of enemies — mirroring the escalating difficulty of the original arcade cabinet.
- The current wave number is now visible as part of the live game state, so the on-screen display (and future playtesting) can show players which wave they're on.

## Why This Approach

The team deliberately kept the "wave logic" (the rules for how waves escalate) separate from the "wiring" (the code that actually calls those rules during gameplay) in earlier work. That separation is valuable because it let the wave rules be tested thoroughly in isolation, with no risk of that testing being polluted by unrelated game mechanics.

This story's job was narrowly scoped: take that already-proven wave logic and connect it to two things already built — the game's live enemy tracker and its internal event scheduler — without changing any of the wave rules themselves. It's the equivalent of running the final wire from a tested circuit board into the machine's power supply, rather than re-engineering the circuit board.

A key engineering discipline preserved here: the game must behave identically every time it's given the same starting conditions (a "seed"), with no reliance on real-world clock time or random chance outside of that seed. This determinism is what allows the team to write reliable automated tests and reproduce bugs — so the placement of new enemies across the battlefield is calculated with simple, predictable math rather than anything resembling true randomness.
