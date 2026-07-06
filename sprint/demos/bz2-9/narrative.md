# Narrative

## Problem Statement
Problem: Unfair enemy spawns: enemies appear behind/out-of-view and fire instantly, killing the player within ~2s — fix spawn geometry + add a post-spawn fire grace so the opening is survivable. Why it matters: a defect was impacting functionality.

## What Changed
We implemented: Unfair enemy spawns: enemies appear behind/out-of-view and fire instantly, killing the player within ~2s — fix spawn geometry + add a post-spawn fire grace so the opening is survivable.
This delivers the following capabilities:
  - Newly spawned enemies do not materialize directly behind / on top of the player and fire before the player can react — no sub-2s unavoidable deaths from spawn.
  - Spawn placement biases toward the player's forward view cone (or a reactable bearing), not the rear blind spot.
  - A brief post-spawn grace prevents a just-spawned enemy from firing on the same frame/instant it appears.
  - Authentic ROM difficulty remains the ceiling for later levels — this fixes fairness, not the ratchet.

## Why This Approach
This approach addresses the root cause rather than symptoms.

## Before/After
Before: The system exhibited incorrect behavior that affected users.
After: Unfair enemy spawns: enemies appear behind/out-of-view and fire instantly, killing the player within ~2s — fix spawn geometry + add a post-spawn fire grace so the opening is survivable — the issue has been resolved and verified with tests.
