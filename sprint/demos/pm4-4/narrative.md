# pm4-4

## Problem

**Problem:** Players reported an invisible wall near the ghost house in our Pac-Man clone — Pac-Man could not move left-right past a certain spot, even though nothing looked like it should be blocking him. **Why it matters:** We didn't know if this was a deliberate design rule (the ghosts' home base is *supposed* to keep Pac-Man out) or an actual bug in how the game board was built. Shipping a maze with a stray wall in the wrong place breaks a core promise of an arcade clone — that the board plays exactly like the original — and could quietly block other in-progress features that depend on the same map data.

## What Changed

Think of the game board as a big grid of tiles, where each tile is labeled "wall," "path," "door," and so on. There's a special area in the middle — the "ghost house" — with a door (the "gate") that ghosts use to come and go, but Pac-Man is never supposed to walk through it.

We found that the *rule* saying "Pac-Man can't walk through the gate" was working correctly. The real problem was in the blueprint that draws the ghost house: the gate had been stamped one row too high, so it was floating out in the open hallway above the house instead of being embedded in the house's wall. That made it look and act like a wall was randomly blocking a hallway, when it should have just been a door set into the house itself.

The fix moved the gate down one row so it sits properly in the house's top wall, and widened the house's inside area by one row to make room. We also swept our internal documentation for a stale sentence that described the old (buggy) layout, so it wouldn't mislead anyone reading it later.

## Why This Approach

Before touching any code, we ran an investigation step to compare our game's ghost-house area against a screenshot from the authentic original arcade machine. This confirmed the gate was misplaced in our version — it wasn't a case of "the ghost house is supposed to work this way." Once that was confirmed, we made the smallest possible fix: correct the position data that draws the house, without touching the core rule that decides who can walk where (that rule was already correct and didn't need to change). This keeps the fix contained, low-risk, and easy to verify — we regenerated the board data from the corrected blueprint and re-ran the full test suite (286 tests) to confirm nothing else broke, including the spots where ghosts spawn.
