# ml12-1

## Problem

Problem: When a new wave of Millipede started, the caterpillar-like "train" of body segments spawned at the very top of the screen and was drawn directly on top of the score display, instead of appearing just below it. Why it matters: players couldn't read their score, lives, or level indicator during the split-second the train marched onto the field at the start of every wave — a jarring visual bug an alert player (the game's owner) caught during a routine playtest. It's the same family of bug the team had already fixed once before in a sibling game (Centipede), so it was recognizable on sight, but Millipede needed its own fix, verified against Millipede's own original game code rather than copied from Centipede's numbers.

## What Changed

Think of the game screen as a stack of paper: the scoreboard is printed on the top strip, and the game action is printed on the sheet below it. Every video frame, the game "stamps" each train segment's picture onto the stack at its current position. The investigation initially assumed the stamp was landing in the wrong *starting row* — as if the artist's stencil itself was misaligned — and that fixing it meant nudging where the train starts.

Digging into Millipede's original 1982 game code proved that assumption wrong: the train's starting position was always correct by the original design. The real problem was that the stamping process never checked whether a position was in the "reserved for scoreboard" strip before stamping — it stamped every segment everywhere, scoreboard strip included. The fix teaches the stamping process a simple rule taken directly from the original game's own logic: "if a segment's position falls in the reserved top strip, skip stamping it." This is the exact same kind of gate the team used for Centipede's version of this bug, just with Millipede's own boundary value.

## Why This Approach

The team's rule is simple: when the original 1980s game code and a bug report disagree about *where* the problem is, trust the original code. Here, the original code said the train's starting position was fine — so changing that position would have made the game less accurate to the arcade original, not more, while not even fixing the visible bug in every case. Instead, the team found that the original game itself has a rule for "this position is off the top of the visible screen, don't draw/collide it here" and simply applied that existing rule to the drawing step. That's a smaller, safer change than moving the train's spawn point, it's provably faithful to the original game (the exact boundary value was copied from the original code line-for-line), and a live before/after pixel check confirmed it eliminates the overlap with zero side effects on normal gameplay.
