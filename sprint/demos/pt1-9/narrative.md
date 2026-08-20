# pt1-9

## Problem

**Problem:** When picking a starting level in Tempest, players saw only a plain number — no idea what that board actually looked like, and no idea how much of a head-start bonus they'd earn for choosing a tougher level. **Why it matters:** A playtest on 2026-08-19 flagged this directly — the level-select screen is a decision point, and players were being asked to choose blind. Real 1981 Tempest cabinets showed players a preview of the level shape and the score bonus for skipping ahead; without that, our version was withholding information the original game always gave players, which makes an experienced player's chosen starting point feel arbitrary instead of a deliberate risk/reward call.

## What Changed

Think of the level-select screen as a restaurant menu that used to just say "Table 3" with no picture of the food. Now it shows a small preview of the level's board shape (the glowing tube shape, or "well," you'll actually play on) right on the select screen, and it shows exactly how many bonus points you'll earn for starting there in red text, matching the original arcade cabinet's color scheme.

Under the hood, the preview is drawn using the exact same board-shape data the game uses once you're actually playing — so what you see in preview is guaranteed to be what you get, not a separate hand-drawn picture that could drift out of sync. Same logic for the bonus number: it's pulled from the identical calculation that actually pays out the bonus when the level starts, so the number displayed is always the number you receive — never a mismatch.

The team also nudged the text spacing around so the new bonus line doesn't overlap the existing "spin knob" and "press fire" prompts.

## Why This Approach

The engineering team could have hand-built a separate picture for each level and a separate lookup table for bonus values, but that creates two sources of truth that can quietly drift apart — someone tweaks the actual bonus formula later and forgets to update the display table, and now the game is lying to players. Instead, they wired the preview and the bonus text directly to the same functions the live game already uses. That's a "single source of truth" approach: it's not just simpler to build, it's structurally impossible for the preview to show something the game doesn't actually deliver.

This also matched what the original 1981 arcade hardware did — showing the board shape and bonus was authentic period behavior, not a new invention — so the team verified against the original game's source material before building, rather than guessing at what "should" be shown.

One deliberate constraint: the preview uses a steady, non-flashing glow rather than any strobing effect, in keeping with the game's standing accessibility rule against rapid flashing visuals.
