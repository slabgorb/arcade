# Narrative

## Problem Statement
Problem: In the space dogfight sequence, only 3 TIE fighters could ever appear on screen, and the first one didn't show up until about 1.6 seconds after the wave started — leaving players staring at an empty sky. Why it matters: the whole appeal of this scene on the original 1983 arcade cabinet is an immediate, chaotic swarm of fighters the instant the fight begins; a slow, sparse opening undercuts the "feels just like the real machine" promise that's core to this project.

## What Changed
Imagine flipping on the real 1983 arcade cabinet: the moment the space battle starts, three TIE fighters are already swirling around you, and the instant you shoot one down, another pops in immediately to keep the pressure constant. Our version, until now, had a hidden "warm-up timer" that made players wait roughly a second and a half before anything appeared, then trickled fighters in slowly over the next few seconds. We found and removed that invented waiting period. Now the fight opens at full intensity almost instantly (within about 1/20th of a second — faster than the eye can perceive as a delay), and any fighter that's shot down is replaced on the very next moment, matching the cabinet exactly. The 3-fighter cap itself was already correct and untouched — that ceiling is authentic to the original game.

## Why This Approach
Rather than guessing at a better timer value, the team went back and read the original 1983 game's actual program logic — the code that ran on the arcade hardware. It turned out the real machine has no waiting timer at all: every single frame it just checks "do I have fewer than 3 fighters alive?" and if so, adds one immediately. Our clone had invented a countdown clock that simply doesn't exist in the original — likely an early simplification. So the fix was to delete that invented mechanism entirely rather than tune its speed, which is both more faithful to the source and results in simpler code than before.
