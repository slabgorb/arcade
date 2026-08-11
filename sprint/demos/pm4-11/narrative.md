# pm4-11

## Problem

**Problem:** The bottom of the Pac-Man screen — where the game tells you how many lives you have left and what level you're on — was showing plain typed-out text ("LIVES 3", "LEVEL 4") instead of the little Pac-Man and fruit icons the original 1980 arcade cabinet used. **Why it matters:** Long-time players recognize Pac-Man by those iconic bottom-corner icons — a row of small yellow Pac-Man heads for remaining lives, and a row of fruit (cherry, strawberry, orange, and so on) marking how far you've progressed. Placeholder text broke that recognition and made the clone feel unfinished next to the rest of the authentic recreation.

## What Changed

Think of it like swapping a placeholder "3 LIVES REMAINING" label for the actual three little Pac-Man icons lined up in the corner, the way the real machine did it. Concretely:

- **Bottom-left of the screen:** remaining lives now render as small Pac-Man sprite icons instead of a number/text readout.
- **Bottom-right of the screen:** the current level now renders as a row of fruit icons (the same fruit sprites already used elsewhere in the game — cherry, strawberry, etc.) instead of a "LEVEL N" label.
- **Top of the screen is untouched** — SCORE and HIGH SCORE still display exactly as before; only the bottom status band changed.
- The team reused existing drawing code (the same routines that already draw Pac-Man and the bonus fruit during gameplay) rather than building new art, so the icons match the rest of the game pixel-for-pixel.
- Two original-arcade quirks were deliberately preserved: the game caps how many life icons it will ever show at once (extra lives beyond that cap don't overflow the row, matching the original hardware), and the fruit icons follow the exact same fruit-per-level order the 1980 machine used.
- Accessibility was checked: this change does not introduce any full-screen flashing, consistent with the project's existing flash-safety commitment.

## Why This Approach

Rather than designing new icon art, the team reused the game's existing "draw a Pac-Man" and "draw a fruit" logic that already exists elsewhere in the codebase (score popups, the fruit bonus item). This is the simplest and safest option: it guarantees the HUD icons look identical to every other Pac-Man/fruit sprite already on screen, avoids maintaining a second copy of the artwork, and meant the team could focus effort on getting the *behavior* right — specifically, verifying against the original game's rules for how many life icons ever appear and which fruit shows at which level — rather than on drawing new pictures. Those two behavioral rules were tested first (before any visual code was written) specifically because they're easy to get subtly wrong and hard to notice by eye.
