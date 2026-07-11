# Narrative

## Problem Statement
Problem: Blimp cabinet integration — wire the tested blimp core (src/core/blimp.ts, rb2-10) into main.ts: spawn on the ~25% BLMOTN roll, drift-step each calc-frame, render BLIMP_PICTURE BROADSIDE (add a yaw — the ROM geometry is authored nose-on along local z), fire at the player on the ÷2 cadence via a real enemy-shell→player-damage path, collide/score(flat 200)/explode through the shared guns/scoring/explosion seams, and DESPAWN when it drifts off-screen (step is unbounded by design). Resolve the Enemy-vs-Blimp 'kind' plumbing (widen the union or adapt in main.ts). NB: the blimp DRIFTS across (non-weaving) — this corrects rb2-10 AC-3's stale 'weaving motion' wording.. Why it matters: users needed a better interface.

## What Changed
We implemented: Blimp cabinet integration — wire the tested blimp core (src/core/blimp.ts, rb2-10) into main.ts: spawn on the ~25% BLMOTN roll, drift-step each calc-frame, render BLIMP_PICTURE BROADSIDE (add a yaw — the ROM geometry is authored nose-on along local z), fire at the player on the ÷2 cadence via a real enemy-shell→player-damage path, collide/score(flat 200)/explode through the shared guns/scoring/explosion seams, and DESPAWN when it drifts off-screen (step is unbounded by design). Resolve the Enemy-vs-Blimp 'kind' plumbing (widen the union or adapt in main.ts). NB: the blimp DRIFTS across (non-weaving) — this corrects rb2-10 AC-3's stale 'weaving motion' wording..

## Why This Approach
This approach prioritizes user experience and accessibility.
