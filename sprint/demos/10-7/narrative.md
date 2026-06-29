# Narrative

## Problem Statement
**Problem:** Enemy ships in the arcade game were displaying the wrong colors — spikes appeared purple and tankers appeared green, exactly backwards from the original 1981 Atari *Tempest* cabinet. Additionally, several on-screen text banners (GAME OVER, AVOID SPIKES, HIGH SCORES, PRESS START) were rendered in incorrect colors, breaking the visual authenticity players expect from a faithful arcade recreation. **Why it matters:** For players who grew up with Tempest, color is part of the game's identity and telegraphs threat type at a glance. Swapped enemy colors create visual confusion and undermine the authenticity that defines this project.

---

## What Changed
Two color values in the rendering layer had been accidentally swapped — think of it like mislabeling two paint cans. The code that draws spikes was reaching for the purple can and the code that draws tankers was reaching for the green can. We simply swapped the labels back to match the original machine. Then we corrected four banner text colors to match the original cabinet's palette: GAME OVER returns to green, AVOID SPIKES to white, and both HIGH SCORES and PRESS START to red. Nothing about how enemies move, attack, or are destroyed was touched — only which color gets painted on screen.

---

## Why This Approach
Color assignments live entirely in the render layer, isolated from game logic. That separation meant the fix was surgical: change the color constants, verify nothing else references them, ship. There was no risk of breaking gameplay behavior because the rendering code has no feedback path into the simulation. The minimal scope also made the change easy to verify visually — load the game, check the enemies, read the banners.

---
