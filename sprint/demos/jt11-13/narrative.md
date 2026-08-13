# jt11-13

## Problem

Problem: When a player earned a high score in Joust and started typing their initials, the entry screen showed nothing back to them — no letters, no indication of which slot they were on. Why it matters: A player who just achieved something worth bragging about got dead silence from the screen at the exact moment they expected feedback. It reads as a broken or frozen game, which undermines the payoff of the achievement and doesn't match how the original 1982 arcade cabinet behaved.

## What Changed

Think of the high-score entry screen like a form with three blank boxes for your initials. Before this change, typing letters didn't show up in those boxes at all — it was like typing into a text field with invisible text. Now, as you press keys, your letters appear immediately in their slots, and a small arrow-shaped cursor sits over whichever slot you're currently filling in — just like the original arcade machine did in 1982. The team also made sure the untyped slots show as visible placeholders (not just empty space), so players can see the full three-letter frame from the moment the screen appears.

## Why This Approach

The engineering team traced this behavior back to the original Joust arcade machine's source code to make sure the recreation matches exactly how the real cabinet worked — right down to which pixel-font character was used for the cursor and how the blank slots were pre-filled. Rather than inventing new visual feedback, they reverse-engineered the authentic 1982 behavior and reused the game's existing screen-drawing plumbing to paint it, so the fix slots into the game the same way every other on-screen element already does. This keeps the whole experience feeling like the genuine arcade cabinet rather than a modern approximation.
