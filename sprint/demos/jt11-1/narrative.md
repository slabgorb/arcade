# jt11-1

## Problem

**Problem:** When a single player walked up to the Joust cabinet and pressed "1" to start a one-player game, the machine quietly set up the game as if two people were playing — spawning two knights and tracking two players' scores and lives — even though only one person was there. On top of that, the attract screen (the looping demo that plays when nobody's at the machine) never told anyone which button to press to actually start a game.

**Why it matters:** The phantom second player wasn't just wasted effort — it created a broken game state, an unused "ghost" knight sitting on the field with only a single life, ready to confuse scoring and gameplay. And a customer standing at the cabinet with no on-screen instructions for how to start playing is a customer who walks away instead of dropping a coin.

## What Changed

Think of starting a Joust game like ordering at a counter: the cashier (the game setup) needs to know how many people are ordering *before* they start preparing food (spawning knights, opening tabs for scorekeeping). Previously, the "number of people" info got lost between the counter and the kitchen — the kitchen always prepared for two, no matter what was ordered.

Now, when a player chooses "1 Player," that count travels all the way through: from the initial game setup, into the part of the code that actually creates the knights on screen. Ask for one player, get exactly one knight. Ask for two, get two, unchanged from before.

The good news is the rest of the system — how many lives you start with, what happens when your knight dies, how respawning works — was already smart enough to adjust itself based on how many players are actually in the game. It just needed accurate information coming in. Fixing the one broken handoff point fixed the whole chain downstream.

Separately, the attract screen (the idle demo loop) now displays a simple on-screen message — **"PRESS 1 OR 2 TO START"** — so anyone walking up to the cabinet immediately knows how to begin, without needing to already know the controls.

## Why This Approach

The engineering team traced the problem back to a single missing wire, not a systemic design flaw. The parts of the game that handle lives, deaths, and respawning were already built to read "how many players are active" from a shared source of truth and adjust automatically — they just weren't being told the truth about how many players there were.

Rather than rewriting those downstream systems (which were already working correctly), the fix was surgical: pass the real player count through the one place it was getting dropped, from game setup into the demo/knight-spawning logic. This is the lowest-risk kind of fix — it doesn't touch logic that was already correct, it just corrects the one broken data path feeding it. That's also why this shipped as a 5-point story rather than a larger rework: the blast radius was small and well-understood once the root cause was found.

The attract-screen prompt was a separate, additive change — a new visible label — that doesn't touch any existing game logic, so it carried no risk of destabilizing the core game loop.
