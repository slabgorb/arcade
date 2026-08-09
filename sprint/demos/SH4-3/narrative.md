# SH4-3

## Problem

**Problem:** Three of our seven arcade games — Centipede, Pac-Man, and Joust — each carried their own private copy of the math that decides how the game's picture is sized and centered on screen. Centipede's copy and Pac-Man's copy were, character for character, the exact same code (Pac-Man's file even had a code comment admitting it was copy-pasted from Centipede). Joust had a fourth, slightly different copy of the same idea. **Why it matters:** When four places all do the same job, a bug fix or improvement made in one place doesn't reach the other three — someone has to remember to copy it everywhere, and eventually someone forgets. That's how games quietly drift out of sync: one game's picture gets fixed or improved and its siblings don't, until a player notices the screen looks "off" in only one game. This story removes that risk before it causes a visible problem, and it directly unblocks the next game we're building on this pattern (Pac-Man), which needs this exact sizing logic — not the different one an earlier story had assumed it would reuse.

## What Changed

Think of each game's screen like a photo being fit into a picture frame that can be any size (a phone screen, a laptop, a big monitor). These raster games (Centipede, Pac-Man, Joust) are built from chunky retro pixels, so instead of stretching the photo to fill the frame — which would blur the pixels — the game picks the largest *whole* multiple (1x, 2x, 3x...) that still fits, and centers that in the middle of the frame with even letterboxing on the sides, like a widescreen movie on an old TV.

Previously, that "pick the biggest whole multiple and center it" logic was written out fully, three or four separate times, once per game. We moved that shared logic into one common location (`@shared/view`, the library all seven games already import from) as a single reusable function, and then had each of the three games call that one shared version instead of running their own private copy.

**Nothing changes about what a player sees.** The screen sizing, the pixel scale, and the centering are byte-for-byte the same as before — we verified this both with the existing test suites (which all still pass) and with 17 new tests written specifically to pin down this shared behavior. Joust kept one small game-specific quirk (it refuses to let its offset go negative on a tiny window) layered on top of the shared piece, exactly as before.

This also formally cancels an earlier plan (from a prior story, SH3-4) that assumed Pac-Man would reuse a *different* piece of shared code — one built for our vector games (Tempest, Asteroids, etc.), which scale by fractional zoom rather than whole-number pixel multiples. That plan was based on a wrong assumption about which games work alike; this story corrects the record.

## Why This Approach

We didn't invent new sizing behavior — we found four places quietly doing an identical (or near-identical) job and consolidated them into one. This is the software equivalent of noticing four employees independently keeping their own copies of the same spreadsheet and instead giving everyone access to one master copy: nobody's work changes, but updates only need to happen once.

We were careful to change *only* the plumbing, not the math. Every existing test still passes unchanged, and we added dozens more tests aimed specifically at proving the shared version behaves identically to each of the copies it replaced — including Joust's one quirky exception. That's why this is a low-risk, "invisible" change from a player's seat, even though it materially reduces future maintenance risk and rework for the team.

It also sets up faster, safer work going forward: the next new raster-style game (or any future work on Centipede, Pac-Man, or Joust's screen sizing) now has exactly one place to look and one place to fix.
