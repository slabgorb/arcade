# Narrative

## Problem Statement
**Problem:** In *Red Baron*, the enemy plane's on-screen tracking system — the invisible "leash" that keeps it maneuvering in front of the player instead of drifting off-camera — was built on approximate math instead of the original 1980 arcade machine's real logic. That approximation had already caused a serious, hard-to-spot bug: after enough kills, the enemy plane could quietly become unreachable, freezing the difficulty progression while every automated check still reported "all green." **Why it matters:** A soft-locked enemy plane means the game silently stops being winnable exactly when a player is deepest into a session — the worst possible place for an invisible failure, and the kind of bug that erodes trust in "tests passing" as proof the game works.

## What Changed
Think of the enemy plane as being on an invisible leash held by the player's viewpoint. Previously, the leash was measured from the wrong reference point (a rough approximation of "screen space"), so as the player moved the camera, the leash could stretch or slip in ways the original 1980 game never allowed. This update rebuilds that leash system byte-for-byte from the actual original arcade machine's source code — the same math the physical Red Baron cabinet used in 1980 — so the plane now weaves and repositions relative to where the player is *actually looking*, not a fixed guess.

Along the way, the team also:
- **Retired an old duct-tape boundary fence** that was only ever a stand-in for the real system, now replaced by the authentic mechanism.
- **Closed a safety-net hole**: one of the automated regression checks was found to be "fake green" — it would still pass even if the exact bug this story fixes were reintroduced. That check was rebuilt and proven (by deliberately breaking the code and confirming the check actually caught it) to be a real guard now.
- **Hardened against edge cases** that could have let the plane teleport to the wrong side of the screen or get stuck permanently off-screen under unusual conditions.
- **Deliberately deferred one edge case** (an outer-boundary rule) rather than guess at it — the original design notes and the actual 1980 source code disagreed on which direction that rule should go, so the team flagged it for a follow-up story instead of shipping a guess.

## Why This Approach
The team's guiding principle for this whole game series is "fidelity first" — when in doubt, match the original arcade hardware's actual behavior rather than inventing a modern approximation. The previous, in-progress attempt at this fix had been paused specifically because it *looked* impossible to verify against the real source — but that turned out to be a research gap, not a real blocker: the original 1980 developer notes were sitting in a differently-named file the team hadn't checked yet. Once found, the real math was fully recoverable and byte-verifiable, which is a stronger, more trustworthy fix than a best-guess approximation.

One small piece of the original math (a precise internal scaling constant used in the arcade's custom math hardware) genuinely can't be read directly off a byte — it has to be inferred. Rather than pretend otherwise, the team picked the most defensible value by testing it against every known real-world checkpoint and documented it openly as an estimate for future refinement, instead of quietly baking in a guess.

Finally, before marking this "done," an independent reviewer intentionally tried to prove the fix was broken or the tests were lying — and found two real gaps (the "fake green" test, and an edge case that could freeze or misplace the plane). Both were fixed and re-verified by the same adversarial process before sign-off, so what's shipping has been stress-tested, not just tested.
