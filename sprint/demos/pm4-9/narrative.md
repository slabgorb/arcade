# pm4-9

## Problem

Problem: Pac-Man's self-playing attract demo (shipped last sprint) ran silently — no title prompt, no score readout positioned where players expect it, and the game was invisible in the arcade lobby's showcase rotation. Why it matters: An arcade cabinet that doesn't visibly say "insert coin here" (or in our case, "push start") looks broken, not idle. Without the on-screen prompt and a correctly placed score display, a passerby watching the lobby has no cue that Pac-Man is playable, and it wasn't even in the rotation of games the lobby highlights to visitors.

## What Changed

Think of the arcade lobby as a row of cabinets in a room, each auto-playing a demo to lure people over — that's the "attract mode." Pac-Man already had ghosts and Pac-Man moving around by themselves (built last sprint), but the screen didn't *say* anything. This update adds three things a visitor would actually notice:

1. **A "PUSH START BUTTON" banner** now appears over the self-playing demo, using the exact wording from the original 1980 game's data.
2. **The scoreboard was reorganized** to match the original cabinet's layout: current score top-left, high score top-center, and lives/level moved to the bottom of the screen — previously the high score text was overlapping the play area, which a live playtest caught and this fixes.
3. **Pac-Man now joins the lobby's rotating spotlight** — a simple on/off switch was flipped so Pac-Man's demo appears alongside the other eight games when the lobby cycles through showcased titles.

One thing that was originally planned but deliberately *not* done: pre-filling a "starter" high-score list with fake scores. The original Pac-Man hardware never shipped with a default high-score table, so rather than invent one, the screen honestly shows "0" until a real player earns a score — a small integrity call that keeps the game faithful to the source material instead of dressing up an empty leaderboard.

## Why This Approach

The team chose to reuse existing pieces rather than build new ones: the high-score tracking logic already existed from a prior sprint, so this work was purely about *displaying* it, not rebuilding it — lower risk, smaller change. The banner text and score layout were pulled directly from the original arcade machine's own program data rather than guessed at, so the cabinet looks and reads exactly as it did in 1980.

The team also caught and fixed a safety issue along the way: an earlier design for "level complete" used a rapid white screen flash, which was removed in a prior sprint because the product owner has photosensitive epilepsy — flashing effects are strobe-triggering. This update follows that same rule: the new attract banner is drawn as steady, non-blinking text, never a full-screen flash. Where faithfulness to the original game would conflict with that safety rule, safety wins — that's now a standing rule for this project, not a one-off exception.

Finally, rather than trust the change on paper, the team drove the actual game in a browser (via automated Playwright testing) to visually confirm the new layout looked right over the live self-playing demo before calling it done.
