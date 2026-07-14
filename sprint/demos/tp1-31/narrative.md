# Narrative

## Problem Statement
**Problem:** In the original 1981 Tempest cabinet, the tube you play on isn't locked to the center of the screen — for most of the 16 levels, the entire playfield is nudged off-center, and when a new level begins, the camera doesn't snap into place, it glides there. Our clone was missing both effects: every level's tube sat dead-center, and level transitions popped instantly instead of easing in.

**Why it matters:** This project's entire value proposition is that these are faithful clones of the original arcade machines — not "inspired by," but byte-for-byte accurate to what players experienced in 1981. A tube that's always perfectly centered, with no easing on level start, is a visible tell that breaks the illusion for anyone who's played the real cabinet. This was a known, tracked gap (flagged as "DB-008" in our fidelity audit against the original source code) — this story closes it.

## What Changed
Think of the tube (the funnel-shaped playfield) as sitting on a small track that can slide left, right, up, or down depending on which of the 16 levels you're on — that's exactly what the original 1981 machine did, and we'd never reproduced it. We pulled the exact positioning numbers for all 16 levels straight out of the original game's source code, so each level now sits exactly where it sat on the real cabinet.

We also added the "glide": when you finish a level and the next one begins, the tube now eases into its new position over about eight frames (roughly an eighth of a second) instead of teleporting there instantly — again, matching the original's feel exactly.

As a bonus fix found along the way, we corrected two related visual bugs: the starfield warp effect was drifting half a screen off-center, and the glowing "vanishing point" marker at the center of the tube wasn't tracking correctly on some levels. Both are now fixed.

## Why This Approach
The team went straight to the source: the actual 1981 assembly-language code for the Tempest arcade board, which still exists and can be read line by line. Rather than eyeballing "close enough" numbers, they extracted the exact per-level position values the original programmers used.

That precision mattered — a first pass at reading those numbers produced values 6.4 times too large, because the original code stores them in a compressed, pre-converted format. The team caught this with an automated test that specifically checks for that exact mistake, so it can never silently creep back in.

The positioning logic itself lives in the game's core simulation engine (the same deterministic "brain" that also handles scoring, collisions, and enemy behavior), not just in the drawing code. That matters because it keeps the game's behavior reproducible and testable — the visual team can trust that what's on screen is a direct, provable reflection of the same rules the original cabinet followed, not a cosmetic approximation bolted on afterward.
