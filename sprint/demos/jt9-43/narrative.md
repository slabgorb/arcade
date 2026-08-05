# jt9-43

## Problem

**Problem:** In our Joust arcade game clone, the "did they collide?" check for characters (the knight vs. buzzards, the knight catching eggs, buzzard vs. buzzard) was only checking whether two characters overlapped vertically and by rough distance — it wasn't checking their actual left-right (horizontal) position precisely enough. Two characters standing up to 15 pixels apart on screen could still register as "touching" if their basic outlines overlapped once the game's math ignored their horizontal offset.

**Why it matters:** This is a fidelity issue for a game that's meant to be a faithful recreation of the 1982 arcade original. Collisions — who dies, who survives a joust, who catches an egg — are the core of Joust's gameplay. If the collision check is blind to horizontal distance, players can occasionally win or lose encounters that the original arcade cabinet would have ruled differently, which erodes trust in the clone's authenticity and can make outcomes feel arbitrary or unfair.

## What Changed

Think of two paper cutouts sliding around on a table. To check if they overlap, you need to compare their positions in both the up-down direction AND the left-right direction. Our game's fine-grained collision check ("narrowPhase") was correctly comparing up-down position, but for left-right position, it was pretending both cutouts were always sitting in the exact same horizontal spot — even when they weren't.

We fixed this by pulling in the original 1982 game's own math (a term called "COLDX," short for "column delta-X") and folding it into our check. Now, before comparing whether two characters' shapes overlap, the game first shifts one character's shape sideways by however far apart they actually are on screen. This fix applies everywhere collisions are checked in the game: knight-vs-buzzard jousts, egg catching, and buzzard-vs-buzzard collisions — three separate systems, all sharing the same underlying flaw, now all fixed at once.

## Why This Approach

Rather than guessing at a fix, we went back to the original arcade machine's source code (preserved from 1982) and copied its exact logic, sign and all — not just "make it feel more accurate." We proved our fix matches byte-for-byte against specific lines of the original program.

We were also careful about a common trap: it would be easy to "fix" this in a way that looks right but is actually backwards (shifting the wrong direction) or too aggressive (rejecting collisions that should still count). So we built tests specifically designed to catch a backwards fix, and we made sure all the "characters standing in the same exact spot" test cases — which never should have been affected by this bug — stayed completely unchanged. That gave us confidence the fix only changes the cases it's supposed to change, and does so correctly.

Because this changes precisely *when* two characters count as touching, a small number of pre-existing test scenarios where two characters are a few pixels apart changed their outcome (e.g., which player wins a joust in a specific replay). We manually re-verified each of these against the original game's math to confirm the new outcome — not the old one — is the correct, authentic behavior.
