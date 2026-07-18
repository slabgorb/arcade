# Narrative

## Problem Statement
**Problem:** In the Star Wars arcade recreation, the "flying over the Death Star surface" section — the stretch between the opening space battle and the trench run — played nothing like the original 1983 machine, and was barely playable to boot. The ship flew at one unchanging, unauthentic speed, the level only ended once every single gun tower was destroyed, and those towers were tiny 2-pixel targets that were effectively impossible to hit. That combination meant a single pass over this section could drag on for **almost a full minute** while the player tried to hit something they couldn't realistically see. On top of that, Wave 1 of the game had an invented ground-flying section bolted on that never existed in the original cabinet at all.

**Why it matters:** This game is being built as a faithful, historically accurate recreation of a specific 1983 arcade machine — every speed, timer, and rule is meant to match what the original hardware actually did. A section of the game that runs 3x too long, ends on an unfair kill-everything condition, and includes content the original never had breaks that promise and makes the game frustrating to play, not authentically challenging.

## What Changed
Think of this like fixing a treadmill that was stuck on one slow speed and had no "stop" button except finishing an impossible task. Four coordinated fixes landed together:

1. **The ship now speeds up, like the original.** Instead of one flat cruising speed, the ship now starts at a modest pace and steadily accelerates to a much faster top speed as you fly — matching the exact acceleration curve programmed into the original arcade board.
2. **The level now ends on a clock, not a body count.** Instead of requiring the player to destroy every tower (which was nearly impossible), the section now ends automatically after the ship completes a fixed number of passes over the terrain — about 18 seconds, matching the original. Destroying towers still earns bonus points; it's just no longer the only way out.
3. **Ground defenses now "wake up" in stages, like the original.** As the player flies repeated passes over the terrain, different groups of enemy defenses activate in waves rather than all being live from the first second — restoring a staged-difficulty behavior that was present in the original game data but had been dropped in the recreation. This was restored across all 19 different ground layouts in the game.
4. **Wave 1 no longer has a ground-flying section that was never in the original game.** That was something added to this recreation by mistake; it's been removed so Wave 1 now goes straight from the space battle into the trench run, exactly as the 1983 machine did.

## Why This Approach
This fix could only happen now because of work completed just before it: a separate story replaced the game's "traveling laser bolt" weapon with an instant-hit laser (like the original arcade's), which shipped one day earlier. Without that fix, the authentic faster ship speeds this story introduces would have made the towers **completely** unhittable — the old slow-traveling laser simply couldn't keep up with a ship moving 3-4x faster. In other words, this story was intentionally sequenced right after its prerequisite so the accelerated, authentic flight speed would actually be playable the moment it landed.

The team also made one deliberate judgment call worth flagging: destroyed defenses currently don't come back once the player has passed them, but the way they "arrive" in the flight path was simplified rather than being an exact frame-by-frame recreation of the original's repeating pattern. This was a scoped, documented trade-off to ship the core fidelity fix now, with the more granular refinement logged as a natural next step rather than blocking this release.

## Before/After
| Aspect | Before | After |
|---|---|---|
| Flight speed | Flat, unchanging speed the whole section | Accelerates from ~5,250 to ~21,000 units/second, matching the original |
| How the section ends | Only when every tower is destroyed | Automatically after 5 passes over the terrain (~18 seconds) |
| Typical section length | Up to ~57 seconds (often stuck trying to hit unhittable targets) | Fixed at ~18 seconds |
| Tower destruction reward | Required to finish the section | Optional — still earns a 50,000-point bonus, no longer blocks progress |
| Ground defenses | All active immediately, uniform across the pass | Activate in stages as the player completes more passes (restored across all 19 terrain layouts) |
| Wave 1 | Included a ground-flying section not present in the original 1983 machine | Skips straight from the space battle to the trench run, as in the original |
