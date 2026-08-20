# pt1-25

## Problem

Problem: In the Defender arcade clone, three of the game's biggest moments — losing a life, firing the smart bomb, and jumping through hyperspace — happened completely silently on screen. The sound played and the game state updated (a life was lost, a bomb was spent, the ship teleported), but nothing visually told the player it happened.

Why it matters: These are the three highest-drama moments in the whole game — the ones the original 1980 arcade cabinet used a dramatic full-screen flash to punctuate. Without any visual payoff, dying feels like nothing, the smart bomb (an emergency panic button) doesn't feel like it did anything, and hyperspace looks like a bug rather than a feature. That's a broken first impression for a screen-recording, a trade-show demo, or a new player's first five minutes — the exact moments people decide whether the clone "feels right."

## What Changed

The visual "reaction" system for big moments was actually already built and tested in an earlier story — it just wasn't switched on. Think of it like a stage crew that had lighting cues fully rehearsed, but no one ever called "go" during the actual show.

This story wired up the three "go" cues:
- **Dying** now triggers a soft screen fade, no matter how you died (crashed into an enemy, or ran out of luck warping through hyperspace).
- **Firing the smart bomb** now triggers its own screen-wide fade, separate from the individual enemy explosions it also causes.
- **Jumping through hyperspace** now triggers a screen effect around the jump.

Critically, the original 1980 machine used a **full-screen white flash** for these moments — the kind of rapid, high-contrast strobe that can trigger seizures in people with photosensitive epilepsy. This project has a standing rule (documented in ADR-0005) that player safety always wins over arcade-perfect authenticity. So instead of recreating the flash, the team built a "safe variant": a dim, sparse, quickly-fading wash across the screen that reads visually as "something big just happened" without ever strobing or filling the whole screen with bright light.

## Why This Approach

The team chose to reuse an already-built, already-tested effects system rather than build something new — this was purely a wiring gap, not a missing feature. That kept the change small, low-risk, and fast (a handful of files, all in the game's core logic layer).

The bigger decision was the safety substitution. Rather than trying to "tone down" the original flash effect on the fly, the engineers set a hard, measurable bound on how much of the screen can light up and how bright it can get, then proved it against two independent automated safety checks that already exist in the project (one checks no single color ever dominates the screen, another checks the screen never gets more than 90% repainted in a burst). That means the safety guarantee isn't just "we eyeballed it" — it's continuously verified by tests every time the code changes in the future.

During review, the team also caught and flagged that the test proving "this can never be a full white flash" wasn't actually strong enough — it would have stayed green even if someone accidentally reintroduced the dangerous flash. That's logged as a known follow-up gap, not shipped as a false sense of security.
