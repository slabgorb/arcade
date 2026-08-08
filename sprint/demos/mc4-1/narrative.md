# mc4-1

## Problem

Problem: In the Missile Command clone, every enemy missile fell at the same fixed speed no matter which wave you were on, and the player's own defense missile was tied to that exact same speed. Why it matters: the real 1980 arcade game got harder wave by wave — wave 1 gives a new player a moment to react, and the game ramps up from there. Our clone skipped that ramp: it played wave 1 as hard as wave 15, every single time, and because the player's missile moved no faster than the enemy's, shooting one down before it hit a city was closer to a coin flip than a skill. That's not just "too hard" — it's a game that no longer resembles the machine it's supposed to faithfully reproduce.

## What Changed

Picture the original 1980 machine's difficulty as a dial the arcade engineers tuned by hand — a set of lookup tables buried in the game's own code that say "wave 1 gets this many missiles, moving at this speed; wave 2 gets a few more, moving a little faster," and so on, up to a hard ceiling. Alongside that, a separate, deliberate rule: the player's own missile always outruns the enemy's.

Our clone had thrown that dial away and just left every wave locked at the hardest setting. This story went back to the original game's source code, pulled the real numbers out of it, and rebuilt the dial:

1. **Built a wave schedule** — a new, self-contained piece of code that, given a wave number, looks up exactly how many enemy missiles launch and how fast they fall, taken directly from the original 1980 data tables (wave 1: 12 missiles at roughly one-sixth speed; ramping up to a ceiling by wave 15).
2. **Wired the enemy missile's fall to that schedule** instead of a hardcoded number, so early waves are genuinely gentler and the difficulty climbs the way the arcade cabinet intended.
3. **Fixed the player's missile speed** — the original hardware moves the player's defense missile three times faster, per tick, than an enemy missile ever falls. Ours had them moving at the same speed. Now the defense missile is confirmed faster than any incoming missile, on every single wave.
4. **Tied every new number back to its source** — each constant cites the exact line of the original 1980 code it came from, so the fix can be independently checked, not just trusted.

## Why This Approach

We didn't hand-tune these numbers until the game "felt about right" — we read the actual instructions the original arcade hardware runs, pulled its real difficulty tables out, and reproduced the same math. That matters for two reasons. First, it's provably correct instead of a guess: every number in this change cites the precise source line it came from, so it can be audited later, not just taken on faith. Second, it's durable: because the schedule is one clean, isolated piece of logic, the next piece of work — actually spawning each wave's missiles using it — can plug straight in without repeating this research. Hand-tuning would have looked similar today but silently drifted from the real game with every future change, and would have needed to be thrown out and redone the moment anyone checked it against the source.
