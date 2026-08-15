# df3-5

## Problem

Problem: In the Defender clone, the player's ship could move and turn, but couldn't shoot — there was no laser fire, no bullets crossing the screen, nothing standing between the player and the alien horde. Why it matters: Defender is fundamentally a shooting game; without working laser fire, the core "am I playing the real arcade classic?" test fails immediately for anyone who picks up the demo, and every downstream feature — hitting enemies, scoring points, dying to a Lander's return fire — has nothing to build on until shots actually exist and travel correctly across the screen.

## What Changed

Think of each laser bolt the player fires as its own tiny, self-contained "worker" that the game spawns, tracks, and eventually retires — exactly the same way the original 1980 arcade hardware handled it. When the player presses fire, the game checks: are there already 4 laser bolts on screen? If yes, nothing happens — the original machine capped concurrent shots at 4, and this clone matches that limit exactly. If there's room, a new bolt spawns from the front of the ship, in whichever direction the ship is currently facing (a bolt fired while facing right travels right; facing left, it travels left). Once spawned, each bolt travels in a straight line every frame until it either flies off the edge of the screen, at which point it's cleanly removed and the "slot" it occupied becomes available for the next shot.

This story deliberately stops there. The lasers fire, travel, and expire — but they don't yet interact with enemies. Making a laser actually destroy a Lander, Bomber, or Pod is scoped to a separate, upcoming story (df4) so this piece could be built, tested, and verified in isolation first.

## Why This Approach

The team modeled this feature directly against the original Defender arcade machine's own game logic (its assembly source code), not a modern reinterpretation. The original hardware enforced a hard 4-shot limit and handled each shot as an independent, self-managing unit inside its game loop — so the clone was built the same way, using the game's existing "scheduler" (the system that already manages independent moving things like the player ship) to also manage each laser bolt. Building it this way means the shooting mechanic will feel exactly like the 1980 original — same shot cap, same directional behavior, same lifecycle — rather than an approximation that "feels off" to players who know the source material. It also keeps the work cleanly separated: this story proves shots fire and travel correctly; a later story proves they hit things. That separation made it possible to verify each piece thoroughly instead of debugging fire, travel, and collision all at once.
