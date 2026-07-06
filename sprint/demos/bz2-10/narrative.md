# Narrative

## Problem Statement
**Problem:** In Battlezone, every enemy tank behaved like a stationary gun turret instead of a maneuvering vehicle — the moment it spotted the player, it locked its barrel on and never let go, turning to track at a snap-fast rate and firing the instant its brief spawn-safety window expired. **Why it matters:** This made the game's opening moments effectively unsurvivable — players would spawn, get a couple of seconds of grace, and then face an enemy that was already perfectly aimed and ready to fire, with no opportunity to react, maneuver, or outplay it. A previous fix (story bz2-9) addressed *when* enemies were allowed to fire, but a live playtest showed that fix wasn't enough — the deeper issue was *how* the enemy tank thought and moved, not just its firing timer.

## What Changed
Think of the old enemy tank AI like a lawn sprinkler that's been bolted to always point at one spot — it can spin fast, but it only ever aims at you. We replaced that with something closer to how a real opponent thinks: the tank now picks a *goal* — charge straight at you, swing out to flank you from the side, or wander to reposition — and only re-evaluates that goal periodically, the way a real driver commits to a maneuver before reassessing.

We also slowed down how fast the tank can turn (roughly a third of its old turning speed), so it behaves like a heavy vehicle jockeying for position rather than a turret snapping to face you. It now keeps its distance instead of driving straight at you point-blank, circling if it gets too close. If it bumps into an obstacle, it now backs up and turns away instead of getting stuck pushing against it. And its aim has to be genuinely lined up — not just roughly in your direction — before it's allowed to fire, so shots feel earned rather than guaranteed.

The net effect: the tank now visibly maneuvers — closing in, breaking off, circling around — and only gets a shot when it's actually earned one by lining up, rather than being aimed at you by default from the moment it exists.

## Why This Approach
Rather than inventing new enemy behavior from scratch, the team went back to the original 1980 arcade game's source logic and faithfully reproduced how the authentic enemy tank actually thought and moved. This matters for two reasons. First, it guarantees the fix isn't just "make it feel better by trial and error" — it's grounded in a real, battle-tested design that shipped in the original game and is already known to be fun and fair. Second, it fixes the root cause rather than a symptom: the earlier fix (bz2-9) only adjusted *when* enemies were permitted to fire, which helped a little, but the tank was still aimed and waiting the second that window opened. Only by decoupling the tank's movement and aim from "always face the player" does the opening moments actually become survivable and fun, because now the player has time and space to react before the enemy can line up a shot.

The team also tuned a few of the exact numbers (like turn speed and how forgiving the aim needs to be) slightly beyond the original 1980 values, because an exact byte-for-byte port turned out to be *too* passive in a modern play session — the team kept every tuning change within safety bounds validated by automated tests, so the tank stays authentic in spirit while feeling right in practice. This work is still pending one final check: a hands-on playtest by the product owner to confirm the tank "feels right" before this and the related bz2-9 fix are both marked complete together.

## Before/After
| | Before | After |
|---|---|---|
| **On spawn** | Enemy tank already aimed directly at the player | Enemy tank picks a maneuver (charge, flank, or wander) independent of the player's position |
| **Turning speed** | Snapped to face the player almost instantly | Turns at a realistic, much slower pace |
| **Distance** | Would drive straight at the player, point-blank | Holds a minimum distance and circles instead of ramming |
| **Hitting obstacles** | Could get stuck pushing against walls/obstacles | Backs off and turns away automatically |
| **Firing** | Fired as soon as its brief safety timer expired, already aimed | Only fires once it has genuinely maneuvered into alignment |
| **Overall feel** | Like walking into a room with a turret already tracking you | Like facing an opponent that has to jockey for position before it can take a shot |
