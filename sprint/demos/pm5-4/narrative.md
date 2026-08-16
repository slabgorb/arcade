# pm5-4

## Problem

Problem: In the Pac-Man arcade game, the row of icons at the bottom of the screen that shows how many lives a player has left was drawing the wrong picture — a plain solid yellow circle instead of Pac-Man's iconic open mouth — and those icons were visually cutting into the blue wall that borders the bottom of the maze. Why it matters: these HUD (heads-up display) icons are one of the most recognizable, most-looked-at pieces of the whole game screen. A player glances at them dozens of times per game to check their remaining lives, so a visibly broken, non-authentic sprite sitting crooked on top of a wall undermines the "faithful arcade clone" promise the whole project is built on — even though nothing about actual gameplay was affected.

## What Changed

Think of the reserve-life icons as little stamps the game presses onto the screen. Two things were wrong with that stamp:

1. **Wrong picture on the stamp.** The game was reaching into its box of Pac-Man pictures and grabbing the "mouth fully closed" one — which just looks like a solid dot — instead of the "mouth wide open" one that the real 1980 arcade machine uses for this exact spot. We swapped in the correct picture.
2. **Stamp placed too high.** The icons are pressed a little higher on the screen than they should be, because the code was using a positioning rule meant for Pac-Man's normal in-game body (which needs to be centered differently) rather than a rule meant for these fixed HUD icons. We nudged the stamp down by a few pixels so it sits neatly in its own reserved strip at the bottom of the screen instead of overlapping the wall above it.

Both changes live in one small, well-contained spot in the game's display code — nothing about how the game is played, scored, or simulated was touched.

## Why This Approach

This is a display-only bug — the game engine itself (scoring, collision, ghost behavior) was never wrong. That meant the safest and most surgical fix was to touch only the drawing code responsible for this one row of icons, and leave everything else — including the code that draws Pac-Man's body while he's actually moving around the maze, which was already correct — completely alone. Engineers wrote automated checks first that specifically captured "this pixel data should look like the open-mouth Pac-Man, not the closed one" and "these icons should sit inside their designated strip, not spill over the wall," confirmed those checks failed against the buggy code, then made the smallest possible change to make them pass. That order matters: it proves the fix genuinely addresses the reported problem rather than just looking right by coincidence, and it leaves a permanent guardrail so this exact bug can't quietly come back in a future change.
