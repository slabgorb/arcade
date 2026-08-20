# pt1-16

## Problem

**Problem:** In Joust, when the shore troll grabs an enemy rider and pulls it toward the lava, the enemy never fights back — it just sinks. A player could stand back and let every enemy on the screen get dragged in and drown, clearing an entire wave without actually playing.

**Why it matters:** Joust is a skill game built around risky mid-air combat. If waiting near the lava beats playing the game, the challenge collapses and the experience stops matching the arcade original it's meant to faithfully reproduce.

## What Changed

Think of each enemy bird as a tiny robot pilot. When the troll grabs a *player's* bird, the human flaps the controller to struggle free. But when the troll grabbed an *enemy's* bird, that robot pilot went completely silent — it never sent a single "flap" command, so it had no way to escape. It was designed to lose every time.

The fix teaches the enemy's robot pilot to keep reacting while it's caught, the same way it reacts while flying normally: if it's sinking, flap. That single change gives gripped enemies a real, if imperfect, chance to escape — exactly like the original 1982 arcade machine intended, where a grabbed enemy could break free early in the grab but was still doomed if the troll held on too long.

## Why This Approach

We didn't invent new behavior — we corrected a mismatch against the original game's logic. The original arcade code was studied directly, and it confirmed enemies were always meant to keep struggling while caught, escaping either by flapping hard enough or by climbing high enough out of the troll's reach. The team implemented exactly that dual escape path, then verified it two separate times against a critical-review pass, tightening details (like making sure the escape flap only triggers on a genuine new button-press, not while already flapping) so the fix precisely matches the arcade original — no more, no less. Enemies still drown if the troll holds them too long, preserving the game's real risk.
