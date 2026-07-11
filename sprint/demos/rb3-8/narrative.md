# Narrative

## Problem Statement
Problem: A flight-altitude safety limit in the Red Baron game was set roughly **half of what it should be**, because a number in the game's source data was read as base-10 (decimal) instead of base-16 (hexadecimal) — the format the original 1980 arcade code actually used. Why it matters: this altitude ceiling is a foundational constant that two upcoming features (ground-level flying and the scrolling horizon) are being built directly on top of. Left uncorrected, those features would have inherited a ceiling that caps the plane at less than half its authentic altitude range, and the mistake would have been much more expensive to trace and fix once buried inside two more features.

## What Changed
Think of it like reading a price tag. If a tag says "$180" but was actually printed in a foreign currency where "180" means something closer to "384" in dollars, you'd short-change yourself by more than half if you didn't convert it correctly.

The original 1980s arcade game's source code stored its numbers in hexadecimal (base-16), a numbering system common in old computer code but easy to misread as ordinary base-10 if you're not looking closely. One constant — the highest altitude the player's plane is allowed to reach — was accidentally read as a plain decimal number instead of being converted from hex. That made the calculated ceiling **720** when the true, correctly converted value is **1,536** — a difference of more than 2x.

We re-checked every related number against the original code using two independent proof points that only make sense in hexadecimal (one of them literally contains the letter "B", which is impossible in a normal decimal number — a dead giveaway of the correct format). We then corrected the one line of code where the misreading happened, updated the automated test that had — ironically — also been written to expect the wrong number, and confirmed nothing else in the game depended on the incorrect value.

## Why This Approach
This was a "measure twice, cut once" fix. Rather than just patching the one wrong number, we cross-checked it against three related constants that a prior story had already gotten right, using self-verifying evidence baked into the original game's code (values that are only internally consistent if read in hex). That gave high confidence the fix is correct — not just "correct enough to pass a test."

We also chose to fix the automated test itself, not just the game code. The test had been written to expect the old, wrong number (720), so it would have kept "passing" even with a broken game. Updating the test's expected value to match the true number (1,536) was part of the fix, not a shortcut around it — a test that quietly agrees with a bug isn't protecting anyone.

Finally, we confirmed the fix is self-contained: nothing else in the game reads this number directly (everything asks the code for the up-to-date value), so correcting it here automatically and safely fixes it everywhere it's used, with no follow-up patches required elsewhere.

## Before/After
| | Before (bug) | After (fixed) |
|---|---|---|
| Altitude ceiling (max height) | 720 | **1,536** |
| Altitude floor (min height) | 32 | 32 *(unchanged — coincidentally correct before)* |
| How the ceiling number was read | Plain decimal | Hexadecimal (matches original 1980s game code) |
| Automated test's expected value | Also asserted 720 (baked-in bug) | Corrected to assert 1,536 |
| Downstream features relying on this number | Would have inherited the wrong ceiling | Can now build on the verified, correct value |
| Verification | — | 335/335 tests passing; two independent proof-values from the original code confirm the hex reading |
