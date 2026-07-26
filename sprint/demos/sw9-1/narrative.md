# Narrative

## Problem Statement
**Problem:** The web version of the 1983 *Star Wars* arcade game was missing one of the cabinet's signature visual details — the red-and-blue cockpit frame that surrounds the screen the entire time you're flying, making you feel like you're sitting inside an X-wing fighter rather than looking at a bare game screen.

**Why it matters:** This project's whole promise is "the real arcade machine, in your browser" — not just a game inspired by it. A player who's seen the original cabinet (or its longplay footage) will immediately notice the frame is missing. Small gaps like this chip away at the "we nailed the recreation" story we're telling players, reviewers, and anyone comparing us to the real thing.

## What Changed
Picture the original arcade cabinet: as you fly through space, over the Death Star's surface, and down the trench, there's a fixed border around your view — blue gun barrels running down the sides and across the bottom, with red collars where they'd connect to the ship. It never moves, no matter which way you're steering. It's part of the furniture of the cockpit, always there while you're playing.

Our clone didn't draw any of that. We added it back — five separate pieces of "cockpit art" (two side rails, and three across the bottom) placed exactly where the original arcade math says they belong, in the correct blue and red. It shows up the instant gameplay starts — during the space, surface, and trench sections alike — and disappears again on the title/attract screen and the game-over screen, exactly like the original.

Nothing about how the game plays changed. This is purely something new drawn on top of the existing view — no new rules, no new state to track, nothing that affects scoring or difficulty.

## Why This Approach
Before writing a single line of drawing code, we had to answer a question the story itself flagged as open: **is this frame actually part of the original game, or is it just cabinet artwork** (like a plastic bezel bolted to the machine, which wouldn't belong in a faithful software port at all)?

We went back to the original 1983 source code and found the answer directly: the frame is drawn by the *game itself*, as five labeled pictures the original programmers called "PLAYER'S GUN SITE." That settles it — this is authentic game content we're obligated to include, not decoration we'd be inventing. Knowing that, we transcribed the exact shapes and colors the original code specifies, rather than approximating something that "looked about right."

We also caught and fixed a subtle numbers bug along the way: the original code's coordinate values could be misread as one numbering system when they're actually another, which would have shifted the frame's shape in a way that looked plausible but was wrong. We traced the actual arcade logic to confirm the correct reading before finalizing anything — the kind of check that's cheap to do up front and expensive to discover after players notice something looks slightly off.

Because this is purely a visual overlay with no gameplay impact, we kept it entirely isolated from the game's core rules engine — it can't accidentally affect scoring, collision, or anything a player depends on. The full automated test suite (1,854 checks) passed with zero regressions, and an independent reviewer signed off with no outstanding concerns before this shipped.
