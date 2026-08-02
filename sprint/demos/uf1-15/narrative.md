# uf1-15

## Problem

**Problem:** The alien TIE fighters in our *Star Wars* arcade clone decide when they have the player "in their sights" — the moment that triggers their attack maneuvers — using a number the original development team admitted they invented. The code literally contained a note reading `TODO(playtest): this 12° is INFERRED`. It was never checked against the real 1983 arcade machine's source code.

**Why it matters:** This game is a faithful recreation of a 40-year-old arcade classic, and matching the original machine's exact behavior — not just "looking right," but playing exactly as the cabinet did — is the whole point of the product. A guessed number sitting quietly inside flight-AI logic is a hidden authenticity gap: it makes TIE fighters feel subtly wrong today, and it's the kind of unverified assumption that quietly corrupts everything built on top of it later. Left alone, it also stays as a flashing "we don't actually know this" sign in code that future work would keep building around.

## What Changed

Think of the original 1983 arcade machine's programming as a blueprint that's been sitting in a drawer for 40 years. Nobody had gone back to check whether our TIE fighters' "you're in my sights" rule matched that blueprint — it was just a best guess: an invisible 12-degree cone in front of each fighter.

We finally opened the blueprint. And it turns out the original machine didn't use a cone-shaped sighting zone at all — it used a tube (a cylinder) running along the length of the fighter, of a very specific, calculable width. Nobody previously realized this, including the game's own decades-old internal comment, which was itself wrong about the shape.

We translated that original math into today's code, then double- and triple-checked our work: we found two *other* distances the original game measures the exact same way, ran our new formula against them, and got suspiciously clean, round numbers both times — which is essentially impossible unless the formula is right. A second reviewer then independently re-opened the original 1983 source files and re-checked every citation line-by-line before signing off. Along the way we also fixed several small "pointer" errors in our own code comments that had been referencing the wrong lines of the original source, and added a safety guard so a bad calculation fails loudly instead of silently disabling the feature.

The bottom line for players: TIE fighters now decide when to break into attack maneuvers using the real arcade machine's own rule, not a guess. This does **not** change how often they shoot at you — that's governed by a separate, already-verified system — it changes the timing and shape of their attack-approach behavior, making dogfights track closer to the original 1983 experience.

## Why This Approach

We could have just taken the "12-degree cone" assumption at face value and tried to convert it into cleaner code. Instead, the team went back to primary source — the actual 1983 program listing — *before* writing any fix, and that step is what revealed the assumption itself was wrong (it's a tube shape, not a cone).

Rather than trust that single discovery, we required independent proof: the same conversion formula was tested against two completely different in-game measurements that we already knew the correct answers to. Both landed on exact, round values — the kind of result that essentially can't happen by coincidence if the underlying math were wrong. Then a second, independent reviewer re-derived every citation from the original source files themselves rather than trusting the first pass's notes, and caught two citation errors the first pass had gotten backwards.

This is slower than shipping a plausible guess, but it's the only way to actually retire a guess — replace it with a verified answer, confirmed two independent ways, not a more confident-looking guess.
