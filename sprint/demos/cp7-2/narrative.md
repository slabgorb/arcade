# cp7-2

## Problem

Problem: In Centipede, when the train (chain of enemy segments) enters the playfield during a wave, some segments visually appear on the score/status line at the top of the screen instead of staying within the game field. Why it matters: This breaks the illusion of a clean arcade cabinet experience — enemies rendering on top of the score, lives, and high-score display looks broken and undermines confidence in the game's polish, especially in the first moments of a wave when players are forming their first impression.

## What Changed

Think of the screen as having two zones: the "playing field" where the action happens, and a reserved strip at the top for the score, lives, and high score (the HUD). The game's internal logic already knew that certain entry positions for the train counted as "off-screen" — a kind of staging area before segments walk onto the field. The bug was that the *drawing code* didn't respect that boundary the same way it does for other enemies, like the flea. The flea already has a clean rule: "if you're in the off-screen band, don't draw you." This story extends that exact same rule to the train, using the identical style of check that's already proven out elsewhere in the code, rather than inventing a new approach. The result: segments in that reserved band are simply skipped during drawing until they've moved into the actual visible playing field — the score line stays clean.

## Why This Approach

Engineers had two options: change *where* the train is calculated to sit (shift its numbers), or change *whether* it gets drawn at all at that position. They chose the second — a "draw gate" — because the underlying number that positions the train is shared code also used by the player's own gun. Changing that shared number to "fix" the train's appearance risked silently moving the player's gun position too, which would be a much bigger and riskier bug to introduce while fixing a small visual issue. By only gating what gets *painted* to the screen, the fix is surgical: the train's internal logic, scoring, and every existing behavior that depended on it stays completely untouched, while only the visual leak onto the score line is closed off.
