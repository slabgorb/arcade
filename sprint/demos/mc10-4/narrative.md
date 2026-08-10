# mc10-4

## Problem

**Problem:** In Missile Command, the sky and structure colours were supposed to change as players progressed through waves — a "per-wave palette" that had already been built — but on screen the game never actually changed colour. No matter how far a player advanced, wave 17 looked exactly like wave 1. **Why it matters:** Visual escalation is a core feedback signal in this genre — players expect the game to visibly intensify as it gets harder. A palette that silently never updates makes all that prior colour-system work invisible to players, undercutting the sense of progression the earlier feature (mc9-2) was built to deliver.

## What Changed

Think of it like a dashboard gauge that's wired up correctly inside the instrument but never gets a live feed from the engine — so it just displays whatever it was set to at the factory, forever. The "per-wave colour palette" engine already existed and worked correctly when given a wave number. The problem was one missing connection: the game's drawing loop wasn't telling that engine which wave the player was actually on, so it always fell back to its default setting — wave 1. This fix adds that missing connection: one additional piece of information (`game.wave`, the player's current wave) is now passed into the drawing function on every single frame, so the colours the player sees always match the wave they're actually playing.

## Why This Approach

This was a "last mile" wiring bug, not a design problem — the hard part (building the wave-by-wave colour engine) was already done in a prior story. The engineering choice here was to fix it at the exact point of disconnection rather than touch anything else: find the one call in the rendering loop that was missing an argument, and supply it. No new systems, no redesign — just closing the gap between data that already existed (the current wave) and a system that already knew how to use it (the palette engine) but was never given it. This is the lowest-risk kind of fix: it changes one line of wiring and cannot introduce new behavior beyond "the colours now update."
