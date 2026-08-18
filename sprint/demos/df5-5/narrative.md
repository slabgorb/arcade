# df5-5

## Problem

Problem: Our Defender arcade clone was missing two of the original game's signature "panic button" moves — Smart Bomb and Hyperspace — the emergency escapes that seasoned players lean on when the screen fills up with enemies. Why it matters: without them, the game feels incomplete to anyone who remembers the 1980 original, and simply copying the original's escape-hatch effects wholesale would have reintroduced a full-screen strobing flash that's a known trigger for photosensitive seizures.

## What Changed

Two new emergency powers are now live in Defender, both faithfully rebuilt from the original arcade machine's source code:

- **Smart Bomb** — press the button and every enemy currently on screen is instantly cleared. It's a limited-use panic button, exactly as it worked in 1980.
- **Hyperspace** — press the button and your ship teleports to a random spot on the battlefield to escape danger. But it's a gamble: about 1 in 4 times, you come out of the jump in a bad spot and die on re-entry — a real risk, straight from the original game's design, not a bug.

The one thing we deliberately did *not* copy: the original game signaled a Smart Bomb with a jarring full-screen color flash. That kind of rapid, large-area flashing is a documented seizure trigger, so instead the moment is conveyed with a softer freeze/fade/particle effect — same dramatic "big moment" feeling, none of the flash risk. This substitution is formally logged and tied to our accessibility policy, not a quiet judgment call.

The random teleport landing spot also isn't left to chance in the literal sense — it draws from the same controlled, repeatable randomness system the rest of the game already uses, so behavior stays fair and testable rather than relying on raw unpredictable randomness.

## Why This Approach

We didn't build this from scratch — we reused two things already proven out in earlier work: the system that clears enemies off-screen, and the "safe effects" system that already knows how to present big dramatic moments (freezes, fades, particle bursts) without ever flashing the whole screen. That meant this story was mostly about porting the *exact* numbers and timing from the original game's source code — how long the bomb takes to charge, how the teleport landing spot is calculated, how often re-entry kills you — and proving each one against the source, byte for byte.

Every single game-behavior number introduced here is traceable back to a specific line in the original 1980 source code and is checked automatically so it can never silently drift. The team also ran this through two rounds of independent code review, and the second round caught real gaps — an under-specified death-risk calculation and a couple of mislabeled source citations — that were fixed before release. Nothing shipped that wasn't fully verified.
