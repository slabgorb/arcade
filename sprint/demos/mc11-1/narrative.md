# mc11-1

## Problem

Problem: In Missile Command, the enemy "Sputnik" plane was firing full-strength missile barrages even when the screen was already crowded with cruise missiles — a balancing rule from the original 1980 arcade cabinet that was silently disabled in our clone. Why it matters: this rule exists to keep the game *fair* under pressure — busy screens should ease off on new threats, not pile on. Without it, players facing multiple cruise missiles could be hit with an unfairly large incoming salvo on top of them, breaking the difficulty curve the original game was tuned around and making late-wave play feel arbitrarily punishing rather than authentically hard.

## What Changed

Think of the Sputnik plane as a fighter jet that flies across the top of the screen and launches missiles at your cities. The original 1980 game had a built-in "courtesy rule": if there are already cruise missiles on screen, the plane holds back and fires fewer missiles — two fewer for every cruise missile in play. Our clone had the rule *written* but never actually *turned on* — it was permanently checking against "zero cruise missiles on screen," even when there clearly were some. This update flips it on: the game now looks at the real, current number of cruise missiles on screen every time the plane decides how many missiles to fire, and clamps the salvo accordingly. We also removed a leftover code comment that incorrectly said this feature was already active, and added a new automated check that will fail loudly if this wiring ever breaks again.

## Why This Approach

This was a one-line "plumbing" fix, not a redesign: the difficulty-clamping logic already existed and had already been verified correct in isolation — it just wasn't receiving real data. Rather than rebuild any game logic, we traced the single spot where a placeholder value ("0") was being passed in instead of the live count, and swapped it for the real, on-screen number. Because the underlying rule was already trustworthy, the safest and lowest-risk fix was to correct the one wire connecting it to gameplay, verify it with a dedicated test that specifically checks this scenario, and update the surrounding test suite so it reflects how the game actually behaves now rather than how it used to (incorrectly) behave.
