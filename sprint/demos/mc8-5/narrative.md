# mc8-5

## Problem

Problem: In Missile Command, two of the game's threats — cruise missiles and the Sputnik satellite — could appear on screen with no distinct warning sound, even though the audio "voice" for them had already been built in an earlier update and was just sitting unused. Why it matters: Arcade fidelity lives and dies on small sensory details. The original 1980 cabinet used a rising-and-falling siren tone to warn players when these fast, evasive threats were active, and its absence made those encounters feel flatter and less urgent than the source material intended, and less true to the game we're rebuilding.

## What Changed

Think of the sound system like a smoke detector that was fully wired and battery-installed, but nobody had connected it to the smoke sensor yet. A previous update (mc8-4) built the actual siren sound — a sweeping, oscillating drone — but nothing was telling it *when* to turn on or off. This update connects the wire: every frame of gameplay, the game now checks "is a cruise missile or Sputnik currently on screen?" and if so, the siren starts playing and its pitch keeps sweeping for as long as the threat is present. The moment those threats clear — they're destroyed, or the wave ends — the siren cuts out immediately. It's also smart enough to never make noise it shouldn't: if the game is paused or the round is over, the siren stays silent even if a threat happens to still be sitting on screen, so players never get a phantom sound during a frozen or ended screen.

## Why This Approach

Engineers reused a decision-making component that was already built and tested in a prior update — the piece of logic that answers "are cruise missiles or Sputnik currently active?" — rather than writing that logic twice. This story only had to answer a much narrower question: given that answer, when should the sound actually play? That kept the change small (about 20 lines in one file) and low-risk, since the hard part (detecting the threats, generating the actual siren tone) was already proven working elsewhere. The team also caught and closed a subtle gap during review: the first version only proved the siren went silent in two specific situations (round over, paused) but hadn't proven it stayed silent in every *other* non-gameplay moment (like the attract screen or between waves) if a threat happened to be lingering there. A dedicated test was added to lock that down, so the silence rule is now provably airtight across every phase of the game, not just the two anticipated ones.
