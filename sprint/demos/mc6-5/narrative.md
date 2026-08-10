# mc6-5

## Problem

Problem: When nobody is playing Missile Command, the screen showed almost nothing — no title, no "insert your quarter here" style prompt, no leaderboard, and no proper ending after a game finished. Why it matters: In the original 1980 arcade cabinet, that idle screen was the game's storefront window — flashing "MISSILE COMMAND," scrolling "PRESS START," showing off the high-score list, and closing every round with a dramatic "THE END." Without it, our version looked unfinished the moment nobody was actively playing, and players had no visual cue for how to start or how a game had ended.

## What Changed

Think of an arcade cabinet sitting idle in a room, waiting for someone to walk up. We rebuilt that "waiting" experience for Missile Command:

- **A proper title screen**: "MISSILE" and "COMMAND" now display at the top of the screen when no one is playing, exactly like the original 1980 machine.
- **A scrolling message**: "PRESS START" now slides smoothly across the bottom of the screen, inviting anyone who walks by to play — recreating the classic arcade marquee effect.
- **A "HIGH SCORES" showcase area**: We built and positioned the display frame where the leaderboard will appear (a companion project, already in progress, will fill in the actual score numbers).
- **A proper ending**: When a game is lost, the screen now displays "THE END" during the explosion sequence, giving players clear closure instead of just cutting away.

Every piece of text and the exact speed of the scrolling message were pulled directly from the original 1980 game's source code — down to the precise timing (the message shifts every second video frame) — so this isn't a modern reinterpretation, it's a faithful recreation of what arcade-goers saw over 45 years ago.

## Why This Approach

Rather than inventing new wording or a modern "Press Start" animation style, the team went back to the original manufacturer's technical documents to find the exact words, spacing, and timing the machine used in 1980. This matters for two reasons: first, it guarantees the game feels authentic to anyone who remembers the arcade original; second, it avoids guesswork — every piece of text is backed by a verified citation to the original source material, so there's no ambiguity about "is this right?"

We also deliberately separated concerns: this piece of work only builds the *display* (the title, the scrolling banner, and the reserved leaderboard frame). The actual high-score *numbers* are being wired in by a closely related, already-started effort. This kept the work focused and avoided two teams stepping on the same code at the same time — the display frame was built first so the numbers have somewhere to land.

One small adaptation: because our version of the arcade is free-to-play (no coin slot), we dropped the original's "INSERT COINS" and "CREDITS" messages, since they don't apply to a browser game. Everything else matches the original exactly.
