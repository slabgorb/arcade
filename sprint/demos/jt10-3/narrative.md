# jt10-3

## Problem

**Problem:** Joust's title screen — the attention-grabbing marquee that displays the game's logo and promotional text between rounds of gameplay — didn't exist yet in our clone of this classic 1982 arcade game. **Why it matters:** The title screen is one of the most recognizable moments of any arcade cabinet — it's the "hello" a player sees before they ever touch the joystick. Getting it visually and behaviorally right (the glowing logo, the flashing colors, the exact wording) is what makes the difference between "a game that resembles Joust" and "a faithful recreation players trust."

## What Changed

Think of the original 1982 arcade machine's programming as old blueprints buried in a warehouse. This story dug up the exact blueprint for the title screen and rebuilt it piece by piece:

- **The JOUST logo itself** turned out to be drawn with connected lines (like a stencil or a laser light show), not a picture file as originally assumed. We rebuilt it stroke-by-stroke — 5 letters, dozens of line segments — to match the original artwork exactly.
- **The text on screen** now reads exactly what the real machine displayed: the copyright line ("(C) 1982 WILLIAMS ELECTRONICS INC.") and the bonus-life message ("EXTRA MOUNT EVERY ___,000 POINTS"), written in the game's own blocky retro typeface.
- **A color-flashing effect** — the title screen cycles through a sequence of colors, changing every 2.5 seconds, exactly matching the timing rhythm of the original cabinet.
- **A stale assumption was caught and corrected**: our design notes had assumed the screen also said "PRESENTED BY," but when we checked the original source code directly, that phrase appears nowhere in any version of the game. We removed it rather than inventing something that was never really there, and renamed the task to reflect the corrected scope.

## Why This Approach

Rather than eyeballing old screenshots or videos and approximating "close enough," the team went straight to the original 1982 source code — the actual instructions the arcade machine's hardware followed — and copied the exact text, exact shapes, and exact timing values byte-for-byte. Every value in the new code is footnoted back to the specific line of original source it came from, so anyone can double-check it later.

This "verify against the original, don't guess" discipline paid off immediately: it caught two wrong assumptions before they shipped — the logo isn't a picture (it's a line drawing), and "PRESENTED BY" was never real. Catching these early, before writing throwaway code around a wrong assumption, saved rework and kept the clone honest to the source material.

The visual polish (exact screen position, exact colors on screen) is intentionally left as a "good enough for now" placeholder, because the title screen isn't reachable by players yet — that final connection happens in a follow-up story. This story delivered the components; the next one turns the lights on.
