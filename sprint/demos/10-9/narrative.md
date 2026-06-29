# Narrative

## Problem Statement
Problem: Three authentic text banners from the 1981 Tempest arcade cabinet were missing entirely from our browser-based clone — players had no on-screen indication when their Superzapper recharged, no skill-level context during level selection, and no visual cue between waves. Why it matters: these banners are part of the original game's player communication language; without them the experience feels incomplete and off to anyone who remembers the cabinet, and the between-wave pacing loses the punctuation that tells players what just happened.

---

## What Changed
Three new on-screen text messages now appear at the right moments in the game:

1. **SUPERZAPPER RECHARGE** — When you enter a new level and your Superzapper is ready to use, a glowing blue banner flashes on screen for about two seconds. The Superzapper is Tempest's screen-clearing superweapon; players now know the moment it's available again.

2. **RATE YOURSELF / RANK / NOVICE / EXPERT** — The level-selection screen that appears before the game starts now shows a skill ladder. "RATE YOURSELF" appears in green at the top, "RANK" below it in red, and "NOVICE" and "EXPERT" bracket the numeric level chooser in red on each side. This is the authentic framing the original cabinet used to help players pick their difficulty.

3. **BONUS / TIME** — When a wave ends and the warp-dive animation plays, green "BONUS" and "TIME" labels now flash on screen. These are the between-wave summary markers that punctuate the transition to the next level.

All three use the exact color codes documented in the original 1981 ROM source study — nothing was guessed or invented.

---

## Why This Approach
The game is built in two strict layers: a "core" simulation (the physics and game logic, which never touches the screen) and a "shell" render layer (which draws everything the player sees). This work touched only the shell — no game logic was changed.

That boundary matters because it kept the change small and safe: adding a banner is purely about drawing text at the right moment, not about changing when a Superzapper fires or how many points you earn. The team reused the same glowing-text drawing helper already used for "GAME OVER" and "HIGH SCORES," so the new banners look and feel consistent with the rest of the game.

Before writing any of these banners, the team wrote automated tests that described exactly what each banner should look like and when it should appear — and then wrote code until those tests passed. The Reviewer caught two tests that weren't strict enough and sent the work back; the team tightened them, and the final suite of 15 banner-specific tests now proves each banner is wired to the right game state and uses the right color family.

---
