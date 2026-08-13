# ml4-3

## Problem

Problem: Three creatures in the Millipede game clone — the earwig, the inchworm, and the bee — had no working behavior. They couldn't move, react to the player, or score points, which meant the game world felt empty and incomplete compared to the original 1982 arcade cabinet.

Why it matters: A faithful arcade recreation lives or dies on whether every creature behaves exactly like players remember. Missing or wrong creature behavior is the kind of gap that veteran arcade players notice immediately — it breaks the illusion of an authentic port and undermines trust in the whole project.

## What Changed

Think of the game board as a stage, and each creature as an actor who needs stage directions. This update gives three actors their scripts, copied word-for-word from the original 1982 game's source code:

- **The earwig** now knows how to start on screen and scurry around it, following the exact same movement pattern as the original arcade machine (sourced from the original program's `EARWIG` routine).
- **The inchworm** now knows how to enter the playing field and inch its way across it, matching the original's `WRMMV` routine.
- **The bee** now knows how to fly down the screen toward the player, matching the original's `BEEMV` routine — and, notably, the bee can also plant a mushroom obstacle as it moves, exactly as it did in 1982.

All three creatures now award the correct number of points when the player defeats them, matching the original scoring table.

Under the hood, every rule these creatures follow is written down and linked directly back to the specific line of the original arcade game's source code it came from — so anyone can verify "yes, this matches the real 1982 machine" line by line.

## Why This Approach

Rather than guessing at "close enough" behavior or eyeballing it from old gameplay videos, the team went back to the actual 1982 program source and copied the real logic — line by line — for how each creature moves and scores. Every rule is cited to its exact source location, so there's a paper trail proving fidelity to the original rather than a developer's best guess.

This also followed a "write the test first" discipline: before any creature behavior was built, tests were written that described exactly how each creature should behave — and those tests initially failed (proving they weren't accidentally passing on old code). Only then was the actual behavior built to make those tests pass. A review pass afterward caught a subtle gap — an early test wasn't strict enough to catch a certain kind of timing bug in the earwig's movement — so the tests were strengthened before this was called done. That extra rigor means future changes to these creatures are far less likely to silently break something a player would notice.
