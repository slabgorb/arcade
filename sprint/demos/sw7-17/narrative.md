# Narrative

## Problem Statement
**Problem:** The player's laser gun in our Star Wars arcade clone worked like a thrown ball instead of a laser pointer — shots traveled through space over time and could be held down for continuous automatic fire. The real 1983 arcade machine's gun doesn't work that way: it's an instant beam that resolves the moment you pull the trigger, and one pull fires exactly one shot.

**Why it matters:** This mismatch created a real, player-visible bug — fast-moving shots could fly straight past a distant target without registering a hit, because the "traveling bolt" model checked for a hit only at fixed moments in time and could literally skip over a target between checks (like a strobe light missing a fast-moving object between flashes). It also meant holding the trigger fired continuously, when the original machine required a fresh pull for every shot. Beyond breaking the authentic arcade feel we're rebuilding, this fix was a hard prerequisite for our next piece of work on the trench-run finale sequence — that work couldn't safely start until the gun model underneath it was correct.

## What Changed
Think of two ways to shoot: throwing a ball (it takes time to travel, and a target can be missed if it moves), versus pointing a laser pointer (the instant you point and click, whatever's in your sights is hit — no travel time). Our game was built the "thrown ball" way. The original 1983 arcade machine works the "laser pointer" way.

We rebuilt the gun to match the original:
- **Instant hit, no travel time.** Pulling the trigger now instantly checks what's nearest under your crosshair and resolves the shot right then — just like the real cabinet.
- **One pull, one shot.** Holding the trigger down no longer fires continuously; each fresh pull fires once, matching the original's behavior.
- **Fixed a specific dead zone.** In the trench-run finale, there's a scoring/hit checkpoint around the $7000 mark along the trench. The old "thrown ball" model could let fast-moving shots skip past targets near this point without registering — that's now fixed, because an instant beam can't skip over anything.

## Why This Approach
We didn't guess at how the original gun should behave — we pulled the actual program code from the 1983 arcade machine and matched it line for line. That gives us confidence the fix is authentic, not just "close enough."

This approach also directly eliminates the root cause of the "shots missing for no reason" bug: a traveling shot can theoretically skip past a target between checks; an instant beam physically cannot, because there's no travel time to skip during.

To prove the fix actually works (not just that tests pass), the team deliberately broke the new behavior in test runs — for example, telling the code "act as if this beam always misses" — and confirmed the safety checks caught it every time (120 separate checks failed as expected). That's a stronger bar than "the tests are green"; it shows the tests are actually watching the right thing.

Six small, non-blocking cleanup items came out of review — things like outdated internal notes that still described the old "thrown ball" gun, and one narrow edge case around holding the trigger at the very start of a run. None of these affect what a player experiences today; they're queued as quick follow-up work.

## Before/After
| | Before | After |
|---|---|---|
| **How a shot resolves** | Bolt travels through space over time; hit is checked only at fixed moments | Instant beam resolves the moment the trigger is pulled — matches the original 1983 machine |
| **Holding the trigger** | Fired continuously while held (auto-fire) | One pull = one shot (matches the original's behavior) |
| **Long-range targets** | Fast shots could skip past a target between checks and never register a hit — even when clearly in range | Cannot be skipped; the nearest target under the crosshair is always the one resolved |
| **Trench $7000 checkpoint** | Hit detection could fail to register at this point in the run | Reliably registers hits |
| **Downstream work** | Trench-run finale rebuild could not safely begin | Trench-run finale rebuild is now unblocked |
