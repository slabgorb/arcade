# pm4-7

## Problem

Problem: When a Pac-Man player finished clearing all the dots on a level, or lost a life to a ghost, the game jumped to the next moment instantly — no pause, no beat to register what just happened. Why it matters: That instant cut works against players, not for them. A level win flies by unrecognized, and a death drops you back into danger before you've processed losing a life. It also worked against a specific promise the team made earlier this sprint: no jarring full-screen effects, out of care for players with photosensitive epilepsy. An instant cut is the kind of abrupt visual change that undermines that promise even without an actual flash.

## What Changed

Think of the game as a simple traffic light that used to only know "stop" and "go" — the instant a level ended or a life was lost, it snapped straight to the next thing with no yellow light in between.

This story adds the yellow light. Now:
- **Clearing a level:** the game freezes on a still frame of the completed board for a short beat, then moves you into the next level.
- **Losing a life:** if you still have lives left, the game freezes during the death moment, then respawns you back at the ready position.
- **Losing your last life is untouched:** game over still happens instantly, exactly as it always did — this change only adds breathing room to the "you're still playing" outcomes.
- **A subtle edge case was handled:** if a player's last dot and a fatal ghost hit land on the exact same instant, death correctly takes priority over the level-clear celebration.

Under the hood, both pauses reuse the same well-tested internal "phase machine" that was built and proven in an earlier story (pm4-5) — this work just plugs the level-clear and death pauses into it, rather than inventing something new.

## Why This Approach

The engineering choice here was to reuse rather than reinvent. A previous story (pm4-5) had already built a solid, well-tested internal traffic-control system for switching between game phases (playing, ready, dying, level-clear, etc.), but it wasn't yet connected to the two moments that matter most to how a life or a level actually feels: dying and clearing a level. This story's job was purely wiring — connecting the existing machinery to real gameplay events — rather than building new pause logic from scratch. That kept the change small, focused, and easy to verify.

The team also deliberately did not invent a specific pause duration and market it as an authentic recreation of the original 1980 game — no verified source exists for that number, so the timing was chosen honestly and documented as such, rather than presented as more "authentic" than it is.

Two independent review passes were needed to get this right: the first review caught two issues — a shortcut that bypassed the shared traffic-control system for deaths, and a test that wasn't actually checking the right thing — both were fixed and re-verified before final approval.
