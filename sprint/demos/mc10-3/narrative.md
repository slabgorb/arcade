# mc10-3

## Problem

**Problem:** The Missile Command clone's on-screen scoreboard didn't match the real 1980 arcade cabinet — it showed programmer-invented text labels ("SCORE", "AMMO", "WAVE", "X1") crammed into the top-left corner, in oversized characters, instead of the clean, centered numeric display players actually remember from the arcade.

**Why it matters:** Fidelity is the entire product. Players who know the original game notice a wrong-looking scoreboard instantly, and it undercuts trust in every other part of the clone even when the gameplay underneath is accurate. The AMMO and WAVE labels were also redundant clutter — ammo is already shown by the missile-base stacks — so the HUD was both inauthentic and busier than it needed to be.

## What Changed

Think of the scoreboard as a sign above the game field. Before this change, it was a hand-lettered sign stuck in the corner listing every stat with a label, in text nearly twice the right size. Now it's rebuilt to match the real machine's sign: just the score number, centered at the top, with the player's best-ever score directly beneath it — no labels, no clutter. The "times multiplier" (how much extra a hit is worth) moved from that busy corner down to the bottom-center of the screen, shown simply as "2X" or "3X" instead of "WAVE 4  X2". The ammo and wave counters were deleted outright since that information is already visible elsewhere on screen (the missile stacks under each base). The lettering itself — the exact pixel-for-pixel font copied from the original game's ROM chip — was left completely untouched; only where and how big it's drawn changed, and the oversized text was corrected to half its previous size to match the authentic proportions.

## Why This Approach

The team already had the authentic 1980s-style lettering built and verified byte-for-byte against the original game's source code — that part was proven correct in an earlier story. This story's job was narrower and lower-risk: fix *where* that lettering gets drawn, not *what* it looks like. By explicitly keeping the font untouched and only changing layout and scale, the team avoided re-testing or re-verifying work that was already signed off, while still fixing the visibly wrong parts. Deleting the AMMO and WAVE readouts rather than repositioning them was a deliberate simplification — since that information is already shown elsewhere on screen, duplicating it would just add visual noise the original cabinet never had. This is a display-only change: the underlying game logic (scoring, ammo tracking, wave progression) was not touched at all, which kept the change contained and low-risk to ship.
