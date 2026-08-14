# jt11-18

## Problem

**Problem:** In Joust, once the wooden bridge over the lava pit burns away, landing on that burned section made the player (or an enemy, or an egg) silently vanish off the bottom of the screen — instead of being grabbed by the lava troll, which is what's supposed to happen. On top of that, the lava itself was invisible: the burned-away area just showed as flat black, so players couldn't even see the hazard they'd fallen into. **Why it matters:** This is one of the signature moments of Joust — the lava troll reaching up to grab anyone careless enough to touch the burned shore. With both defects in play, players lost a life to what looked like a glitch (falling through the floor into nothing) rather than a scary, telegraphed hazard (a visible pool of lava with a troll ready to grab them). It broke the fairness and the feel of a classic, well-known arcade moment.

## What Changed

Think of it like a floor trap in a video game that was wired to nothing and painted invisible. This fix does two things:

1. **Reconnects the "grab" wire.** The game already knew, internally, that stepping on the burned bridge should trigger a lava-troll grab — but nothing was listening for that signal. We connected it: now, when a player, enemy, or falling egg touches the burned shore, the game correctly hands them off to the lava troll's grab instead of letting them fall forever off the bottom of the screen. As a safety net, we also added a hard floor at lava-depth so that even in edge cases nothing can slip through and disappear.
2. **Painted the lava.** The molten lava pool that should have been visible under the burned bridge simply wasn't being drawn at all — it was pure black, matching the background. We added the missing visual fill so players can now see the glowing lava hazard where the bridge used to be, which also stays visible as the bridge continues to burn away over the course of a wave.

## Why This Approach

Both problems traced back to the same root cause: a piece of game logic (or artwork) existed and was *correct*, but nothing downstream was actually using it — like a lamp that's plugged in but has no bulb. Rather than inventing new behavior from scratch, we located exactly where the original 1982 game's logic said "grab the player here" and "draw lava here," and wired the modern code up to match that original design faithfully. We deliberately kept the lava visual as a solid, glowing fill rather than a fully animated bubbling effect — that gets players the visible hazard they need immediately, while a more elaborate animated version is left as clearly-scoped future polish rather than blocking this fix. We also made sure this change didn't disturb the *existing*, correct once-per-wave troll behavior — both now work side by side without interfering with each other.
