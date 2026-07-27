# Narrative

## Problem Statement
Problem: The written "rule book" for the Joust game clone said the collision test between two jousting characters included a fractional pixel value, but the original 1982 arcade machine's code does not — it compares whole pixels only. Why it matters: This project's entire premise is byte-for-byte fidelity to the original arcade hardware. A rule book that describes a law the machine doesn't actually follow can send a future contributor down the wrong path — reading the docs, "fixing" working code to match the wrong description, and breaking a collision outcome that was already correct. The bug wasn't in the game — it was in the paperwork describing the game, and it had already been flagged by two independent reviews as needing a fix.

## What Changed
Think of this like a cookbook that had the wrong ingredient list next to a recipe that was already being cooked correctly. The chefs (the actual game code and its tests) were already doing it right — comparing whole pixel positions, no fractions, when the game engine decides which of two colliding characters bounces and which one "loses" the joust. But the recipe card taped to the wall (the design documentation) still said "fractions count," which is backwards.

This fix rewrites that recipe card in three places:
1. **The joust collision rule** — corrected to say the game compares whole pixels only, ignoring the fraction, matching a specific memory-reading quirk in the original code.
2. **A related note about how a defeated enemy re-enters the screen** — corrected to say it comes back in from the far side of the screen, not the near side.
3. **A table-size note** — corrected to say a certain internal lookup table has 90 entries, not 80 (the original programmers left a stale comment in their own source code that miscounted it).

No game behavior changed. No code was touched. Only the descriptions were corrected to match what the game was already verified to do.

## Why This Approach
The safest fix for a "the docs are wrong" problem is to fix the docs — not touch working code. Here, the correct behavior had already been independently re-derived twice, straight from the original 1982 assembly source code, by two different reviewers using two different methods, and it was already locked in place by automated tests that were passing. That's about as much confidence as this kind of project can get.

Changing the code to match the wrong documentation would have introduced a real gameplay bug to "fix" a paperwork bug — the exact opposite of what fidelity work is for. So the rule was: touch only the words, verify every corrected sentence against the original source code citations and the passing tests, and leave the actual game logic and its test suite completely alone. A first pass at this fix was caught as incomplete by a second reviewer — three leftover instances of the old, wrong phrasing were still hiding in mirrored copies of the documentation — and those were run down and corrected in a second round before this was approved.

## Before/After
| | Before (wrong) | After (corrected) |
|---|---|---|
| **Joust collision rule** | Says the collision comparison includes a fractional pixel value ("fraction included") | Says the comparison uses whole pixels only, fraction excluded — matching a specific memory-offset quirk in the original game's code |
| **Enemy re-entry after defeat** | Says a defeated enemy re-enters from the near edge of the screen | Says it re-enters from the far edge of the screen |
| **Internal table size** | Says an internal game-data table has 80 rows | Says the table has 90 rows (the original programmers' own comment mislabeled it) |
| **Underlying game behavior** | Unchanged — the tested game code was always correct | Unchanged — documentation now agrees with it |
| **Risk profile** | Documentation contradicted a passing test suite, inviting a future incorrect "fix" | Documentation and passing test suite now agree, closing that risk |
