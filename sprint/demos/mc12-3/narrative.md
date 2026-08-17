# mc12-3

## Problem

**Problem:** Missile Command's crosshair aim didn't feel like the arcade cabinet it's cloned from. **Why it matters:** The original Missile Command machine is a trackball game — players spin a physical ball to sweep the crosshair, and the motion has weight and momentum. Our first pass at mouse aim mapped the mouse position directly onto the screen (move the mouse a little, the crosshair jumps that same distance). That was a deliberate stopgap: an earlier attempt at "relative" mouse movement (move the mouse, the crosshair moves relative to where it was) was so twitchy it was unusable — a tiny hand tremor translated into a huge, uncontrollable jump across the screen. So the team shipped the direct, 1-to-1 "absolute" version to get a playable game out the door, but it was explicitly logged as a placeholder, with a note to come back and build the real trackball feel later. This work is that follow-through: it delivers the smooth, trackball-like aiming the cabinet was always meant to have, using the same proven approach already running successfully in two sibling games (Centipede and Millipede).

## What Changed

Think of it like upgrading from "teleporting" your cursor to "steering" it.

- **Before:** Clicking and moving the mouse anywhere on screen instantly placed the crosshair at that exact spot — like a laser pointer. It worked, but it isn't how a trackball cabinet feels, and any attempt to make it feel more authentic (relative motion) made it jittery and hard to control.
- **After:** Clicking the game screen now "locks" your mouse to it (the same lock-and-capture trick browsers use for first-person games), and every small nudge of the mouse nudges the crosshair by a scaled-down, smoothed amount — just like spinning a trackball. Moving your mouse off the edge of your desk doesn't matter anymore, because the game isn't tracking an absolute screen position; it's tracking motion, the same way the real cabinet's trackball only ever reports "spun a bit this way."
- The team didn't invent new machinery to do this — they reused the exact same "mouse lock" and "motion scaling" building blocks already proven in two other games in the arcade (Centipede and Millipead), so the risk of introducing new bugs was low.
- The underlying game rules — how far the crosshair can travel, where the walls of the play area are — were left completely untouched. Only the *input* method changed, not the *rules* of the game.
- If a player's mouse ever loses the lock (they hit Escape, or click away), the game resets input state cleanly rather than letting the crosshair "drift" on its own.

## Why This Approach

The earlier team didn't make a wrong call — they made the right call *for that moment*. Shipping the simple, direct "point and place" aiming got a working, playable game to players quickly, without the risk of shipping something twitchy and frustrating. But they wrote it down clearly at the time: "this is a stand-in; a proper trackball feel is a good idea for later." This story is fulfilling that promise, not reversing a decision.

The key engineering insight that made it safe this time: the earlier twitchiness problem came from *unlocked* mouse motion, where a small movement of a fast mouse can spike wildly. Locking the mouse to the game screen changes the physics of the input entirely — it removes the "hit the edge of the screen" problem and gives the game clean, small motion increments to work with, which can then be smoothed (scaled down) into something that feels deliberate and weighty, like a real trackball. Because two other games in the arcade (Centipede and Millipede) already solved this exact problem successfully, this story reused their proven solution rather than inventing a new one — lower risk, faster delivery, and consistent behavior across the whole arcade. The game's core rules engine (which decides where the crosshair is allowed to go) wasn't touched at all, so there's no risk this introduced any new gameplay bugs — only how player input reaches that engine changed.
