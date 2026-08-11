# SH4-4

## Problem

**Problem:** Four of our arcade games — Red Baron, Star Wars, Missile Command, and Asteroids — each independently wrote their own version of a basic "keep this number in bounds" rule (for example, keeping a player's score, aircraft altitude, or targeting cursor within its allowed range). Three slightly different versions of this same rule existed side-by-side in the codebase, and they didn't all behave the same way in one edge case: what happens when the number being checked is invalid (`NaN`, a mathematical "not-a-number" state that can occur from a bad calculation).

**Why it matters:** When the same basic behavior is implemented three different ways across four games, every future bug fix or feature addition to that behavior has to be found and applied in up to eight separate places — and it's easy to miss one. That's how small inconsistencies quietly creep into different games over time. Fixing this now, while the inconsistency was small and low-risk, prevents it from becoming a harder, riskier cleanup later — and it removes an entire category of "we fixed it in game A but forgot game B" bugs before they can happen.

## What Changed

Think of it like four restaurants in the same chain each writing their own recipe for a side dish that should taste identical everywhere. This story consolidated those four recipes into one shared recipe card, used by all four kitchens.

In plain terms:
- We found the "keep a number between a minimum and maximum" logic duplicated 8 times across 4 games, written 3 different ways.
- We picked **one official version** of this logic and decided exactly how it should behave in the tricky "invalid number" case (it now safely falls back to the minimum value, matching the one game — Red Baron — that already handled this carefully).
- That one official version now lives in our shared code library, and all four games use it instead of their own copies.
- We deliberately left alone a handful of *different* clamping helpers used elsewhere (things like velocity limits or menu-index wrapping) — those are genuinely different tools for different jobs and weren't touched.
- Nothing about how any game looks or plays changed. This is invisible to players — it's a behind-the-scenes reliability and maintainability improvement, not a feature.

## Why This Approach

We only merge duplicated code once we can prove, side by side, that the duplicates are actually doing the exact same thing — not just that they look similar. Before writing a single line of the fix, we opened all 8 locations across the 4 games and confirmed the logic was truly identical in every case except one (the invalid-number handling), and explicitly decided which behavior should win before building anything. That decision-first approach avoids a common trap: quietly picking one version's behavior by accident and shipping a subtle change no one intended.

We also verified that after making the change, every single one of the games' existing automated checks — nearly 15,000 of them — still passed, confirming no visible behavior changed for players. And we made sure the fix didn't overreach: several similar-looking helpers that serve different purposes were explicitly left untouched, so we solved exactly the problem in scope and nothing more.
