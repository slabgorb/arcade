# jt11-3

## Problem

**Problem:** When a player's bird landed on the ground and then took off again, it launched back into the air carrying its *previous* flight's speed — not the speed it actually had while running along the ground. **Why it matters:** This is a core feel-and-fairness bug in Joust's signature "flap to gain lift" mechanic. A player who landed while flying fast, then walked slowly across a platform, would unexpectedly rocket off the ground at the old fast speed on takeoff — an invisible inconsistency between what the player sees (a bird ambling along the ground) and what the game does (launches it like it's still going full speed). It's the kind of subtle physics mismatch that makes controls feel untrustworthy without a player ever being able to say exactly why.

## What Changed

Think of the bird's horizontal speed while airborne as a dial (`velXIndex`) that gets read whenever the bird takes off or lands. The bug was that this dial was **never updated while the bird was on the ground** — walking, running, or standing on a platform didn't touch it at all. So when the bird jumped back into the air, the game just re-read whatever the dial was left at from the *last* time it was flying, which could be completely different from how fast the bird was actually moving on foot.

The fix reconnects that dial to the ground. Each ground "rung" (idle, walk, run, etc.) already carried a speed value called `flyVel` — a leftover field, faithfully copied from the original 1982 arcade ROM's data tables, that the code had been storing but never actually using. Nobody was reading it. This story wires it up:

- **While on the ground:** the speed dial now continuously tracks the current ground rung's `flyVel`, flipped to negative if the bird is facing left.
- **On landing:** the speed dial resets to match the rung the bird lands on.
- **On takeoff:** the speed dial simply carries forward whatever the ground already set it to — which is now correct, instead of a stale leftover value.

## Why This Approach

Rather than inventing a new formula for "what speed should takeoff use," the team went back to the original arcade machine's own source code and found that the ROM already solved this problem — there was a data table (`flyVel`) attached to every ground animation state specifically for this purpose, and a documented ROM routine (`UPDNO2`) that keeps the flight-speed register in sync with it as the character moves. The port had copied that data table over but never wired it up — so the fix isn't new logic, it's finishing a connection the original design already called for. That makes it a low-risk change: it reuses data that's already validated against the source, rather than guessing at new tuning values.
