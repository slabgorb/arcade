# ml13-3

## Problem

**Problem:** Millipede's "DDT" bomb — a bug-spray-themed power-up that clears out the caterpillar-like enemy train — had been built and proven correct in automated tests, but nobody had actually *watched* it happen on a live screen. **Why it matters:** Automated tests can prove the underlying logic is correct, but they can't see a screen. Two things only a human (or a real browser) can confirm: that the effect actually looks right to a player, and — critically — that it doesn't introduce a bright full-screen flash. The team has a standing safety commitment (from an earlier accessibility story, ml7-4) that no game in the arcade will ever flash in a way that could trigger a seizure in a photosensitive player. That promise had never been visually checked for this specific effect, so it was an open commitment, not a verified one.

## What Changed

Think of this as a final "does it actually look right" walkthrough, not new construction. The DDT bomb effect itself was already built and unit-tested weeks earlier. This piece of work sent someone into the actual live game, running in a real browser at `/millipede/`, to:

1. Drive the enemy segment train into an exploding DDT bomb and watch it die on screen.
2. Confirm the screen never flashes full-white or full-bright during the kill.
3. Write down what was observed so the record shows this was actually checked, not assumed.

No gameplay code was touched. The only files that changed are sprint bookkeeping — a note describing the check and a one-line status update. This is the software equivalent of a safety inspector walking the floor and signing a checklist, rather than an engineer redesigning the machine.

## Why This Approach

A prior team already wrote automated tests proving the bomb's *logic* was correct — the right enemies die, the right score is awarded. But "no full-screen flash" isn't something a logic test can see; it's a perceptual, on-screen property. The only reliable way to close that gap is to either look at the actual rendered pixels or trace every place the screen gets redrawn and confirm none of them react to the bomb going off. This story did both: a person played the live game and watched it happen, and — independently — the code that draws every frame was read line by line to confirm nothing changes color or flashes when the bomb detonates. Two independent checks landing on the same answer is stronger evidence than either alone, and it's why this was scoped as a lightweight verification task rather than bundled into new feature work.
