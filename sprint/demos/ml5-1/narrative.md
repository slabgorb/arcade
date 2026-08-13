# ml5-1

## Problem

Problem: Millipede's difficulty and scoring have no engine yet — the game can't decide how many beetles to throw at a player as they get better, can't pace the pause between waves, and can't reliably add points to the score or guarantee a legitimate zero-point event isn't silently dropped. Why it matters: without this, every later feature that depends on "how hard is this wave" or "how many points did that kill earn" — enemy pacing, bonus lives, the high-score table — has nothing solid to build on, and any first attempt risks drifting from how the original 1982 arcade cabinet actually behaved.

## What Changed

Think of the original arcade machine's rulebook as a locked box we're not allowed to guess at — we can only build what's written inside it, byte for byte. This story unlocked two chapters of that rulebook and built working code from them, matched line-for-line against the original game's source code:

- **"How many beetles this wave" (BEETLA):** As a player's score climbs, the game now ramps up how many beetles it's allowed to throw at them in a single wave — starting at just 1, climbing through 2, 3, 4, and topping out at 6 (or 4 on easy mode), with a final "everything we've got" tier once the score passes 700,000. This mirrors exactly how the original cabinet got harder as you got better.
- **"The pause between waves" (DELAY):** The short breather between one wave ending and the next beginning now counts down correctly, and — importantly — it correctly *pauses* that countdown if the board is still resetting, or the player is mid-explosion, or there are still beetles crawling around. It won't skip ahead early.
- **"Scoring" (SCORNG + PTS):** Killing something now reliably adds the correct number of points to the score, using the exact real point values already defined for each creature (not a placeholder number). A subtle-but-important rule: earning *zero* points on a legitimate action is different from the game being in "attract mode" (the idle demo loop) — the code now tells those two cases apart correctly, so a real 0-point event doesn't get silently swallowed as if it were a screensaver tick.

This is "the math," not "the picture" — the actual on-screen score display update is intentionally left for a follow-up story, since this piece is about getting the underlying numbers exactly right first.

## Why This Approach

Every rule shipped in this story is tied directly to a specific, citable line in the original 1980s arcade machine's source code — not an approximation or "close enough" guess. The team verified each of the five source citations by hand before writing a single line of new code, then wrote tests first that would only pass once the real behavior was replicated, and finally wrote the minimum code to satisfy those tests. This "prove it against the original, then build only what's proven" order is deliberate: it's far cheaper to catch a fidelity mistake in a five-minute code review than to ship a beetle ramp that feels wrong to players and have to reverse-engineer why weeks later. The scoring and difficulty logic was also kept as simple, self-contained calculators — no premature wiring into the rest of the game — so that a later "connect the wires" story can plug them in without this story's scope ballooning into an early, untested rewrite of the whole game loop.
