# mc5-5

## Problem

**Problem:** In Missile Command, incoming missiles were launching as fast as the game engine could spawn them — filling every available "slot" on screen — which left no room for the Sputnik satellite and cruise missile to ever join the attack. **Why it matters:** Two of the game's signature threats were effectively invisible. Players who reached the waves where the satellite and cruise missile were supposed to appear never saw them, because the regular missile swarm had already claimed every opening. This story ports the original 1980 arcade machine's actual traffic-control rule so all three threat types can coexist, the way the original cabinet always played.

## What Changed

Think of the screen as a parking garage with a fixed number of spaces. The old code let the regular missile swarm grab every open space the instant it became free — so by the time the satellite or cruise missile tried to pull in, there was never a spot left.

We ported the original arcade machine's exact "how many can launch this instant" rule, taken directly from the 1980 source code (a routine the original programmers called `ICNORM`). That rule caps new missile launches at 4 per cycle, and — critically — it looks at how many spaces are already reserved for cruise missiles and the satellite's escort plane before deciding how many spots the regular swarm is allowed to take. If the satellite is on screen, the swarm automatically launches fewer missiles that cycle, leaving room for the satellite to fire. It's the same math the original machine used to balance its threats — we just hadn't wired it in yet.

## Why This Approach

We didn't invent a new rule — we copied the original arcade game's rule byte-for-byte from its source code, because that's the version that was actually tuned and shipped in 1980. Rather than guessing at a "fair" cap or bolting on a workaround after the fact (which an earlier attempt tried and which starved the satellite even worse), this fix goes to the root: the swarm never over-fills its allotment in the first place, so there's always room left over for everything else. This keeps our clone faithful to the original cabinet's pacing and guarantees the fix holds up in every wave, not just the ones we happened to test.
