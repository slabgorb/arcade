# Narrative

## Problem Statement
Problem: The Superzapper — Tempest's screen-clearing emergency weapon — behaved incorrectly when the player pressed it on an empty board. Instead of doing nothing (and preserving the charge), it was registering as an activation, which could waste the player's limited emergency uses or trigger incorrect game-state animations when no enemies were present. Why it matters: Tempest's Superzapper has precise, well-documented rules going back to 1981. Players who know the original game expect the weapon to "know" when there's nothing to destroy. Breaking this erodes trust in the game's authenticity and can punish players unfairly by consuming a precious resource that should have been protected.

---

## What Changed
Think of the Superzapper like a fire extinguisher with exactly two charges. The original rule was: if there's no fire, pressing the handle does nothing — your extinguisher stays full. A recent code cleanup accidentally removed that "check for fire first" step, so pressing the Superzapper on a clear board started counting as a used charge even though nothing happened on screen. This fix puts the "is there actually anything here?" check back in place, restoring the original behavior: press on an empty board, nothing happens, your charges are untouched.

---

## Why This Approach
We had two valid paths: restore the classic behavior exactly, or keep the newer behavior but document and test it as an intentional deviation from the original. We chose to restore the original semantics because (1) no design decision was made to change the behavior — it was an accidental omission during a refactor, and (2) the original behavior is what players expect and what arcade accuracy demands. Pinning a deviation would mean permanently carrying technical debt to justify an unintentional regression. The cleaner path was the fix.

---

## Before/After
| Scenario | Before (broken) | After (fixed) |
|---|---|---|
| Player presses Superzapper, enemies on screen | Fires correctly | Fires correctly |
| Player presses Superzapper, board is empty | Activation event fires, charge decrements (2→1), nothing destroyed | No event fires, charge stays at 2, silent no-op |
| Player presses Superzapper (2nd press), one enemy left and it escapes | Charge spent, enemy survives — "wasted" | Same — charge is spent, enemy survives. Wasted but correctly spent. |
| Player presses Superzapper (2nd press), board is empty | Charge spent, nothing happens — unfair loss | Charge preserved, nothing happens — protected |
