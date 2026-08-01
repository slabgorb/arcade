# uf1-14

## Problem

**Problem:** In our Star Wars arcade clone, enemy TIE fighters were using an outdated, mismatched rule to decide "can the player actually see me?" — and when that rule got it wrong, TIEs that were literally off the edge of the screen could still open fire on the player. **Why it matters:** This breaks the core fairness contract of the game. A player should never lose a life to something they couldn't see coming. Depending on the screen's shape, the game was either too easy (letting the player dodge fire from enemies who, per the original 1983 machine's rules, "shouldn't" be visible) or too easy in the wrong direction (silencing enemies on the far edges of wide screens that the player genuinely could see and should have to fight).

## What Changed

Think of the game's 3D view like a flashlight beam coming out of the player's cockpit — everything inside the beam is "on screen," everything outside it is "off screen." The original 1983 arcade cabinet had a specific, fixed-shape screen, so the game's "am I visible?" check was built around that one fixed beam shape (a symmetric cone, 45 degrees in every direction).

Our version, though, doesn't draw the world with that old fixed shape — it draws a beam shaped to match today's screen (which can be a laptop, an ultrawide monitor, a square window, anything). The bug was that the game's "can I be seen?" check never got updated to match the *new* beam shape — it kept checking against the *old* 1983 cabinet's beam.

The result:
- **Straight up/down:** the old check was too generous by 15 degrees — enemies just above or below the visible screen were still allowed to shoot, because the check thought they were "in view" when the player's actual screen ended well before that.
- **Left/right on wide monitors:** the opposite problem — on an ultrawide screen, enemies genuinely visible near the far left/right edges were incorrectly judged "off screen" and unfairly went silent, by as much as 8.4 degrees.

The fix re-calculates the "am I visible?" check to match the *actual* beam shape being drawn on the player's actual screen, at every screen shape (measured and verified at four representative shapes: ultrawide, standard widescreen, traditional 4:3, and square).

## Why This Approach

The team deliberately kept the *style* of the original 1983 game's rule intact — it's still a simple, fast "is this point inside a pyramid-shaped beam?" check, exactly like the arcade machine used, so the game logic is still period-faithful and consistent with everything else already validated against the original ROM. What changed is only the *math describing the pyramid's shape* — swapped from "the fixed shape of a 1983 screen" to "the shape of the beam our renderer is actually drawing right now, for whatever screen the player has." That's the smallest possible change that fixes the fairness bug without touching or risking anything else the game does (rendering, scoring, enemy movement, collision, all untouched).

This was also verified as a *real* fix, not just a code change that looks right: the team wrote tests that reproduce the actual bug in gameplay terms — an enemy positioned above the visible screen was recorded firing 30 times over a several-second window before the fix, and 0 times after; an enemy on the far edge of an ultrawide screen that was wrongly silenced before the fix now fires correctly. The full game test suite (2,046 checks covering every part of the game) stayed 100% green throughout, confirming nothing else broke.
