# Demo Script — SH4-4

**Total runtime: ~3 minutes.** This is a backend consistency story with no visual change, so the demo leans on the deck and a quick code/test walkthrough rather than an on-screen gameplay difference.

**Scene 1 (0:00–0:20) — Slide 1: Title**
Say: "Today's story is a small but important cleanup across four of our arcade games — Red Baron, Star Wars, Missile Command, and Asteroids." Advance to Slide 2.

**Scene 2 (0:20–0:50) — Slide 2: Problem**
Say: "These four games each had their own copy of a basic 'keep this number in range' rule — used for things like scores, cursor position, and altitude limits. Three different spellings of the same idea existed in our codebase, and they didn't quite agree on how to handle an invalid number." Point to the on-slide callout showing the three code spellings side by side (nested `Math.max/min`, a ternary, and `Math.min(Math.max(...))`).

**Scene 3 (0:50–1:40) — Slide 3: What We Built**
Say: "We consolidated all of that into one shared, well-tested piece of code, used identically by all four games." Switch to terminal for a live proof point:
```
npx vitest run --project shared clamp
```
Expected output to narrate: all clamp tests pass (39 tests across `clamp.test.ts` and `clamp-adoption.test.ts`), including the specific test proving invalid numbers now safely resolve to the minimum bound.

**Fallback if the live demo fails:** Skip straight to Slide 3's static screenshot of the passing test run (already captured in the deck) and continue narrating from there — no need to debug live.

**Scene 4 (1:40–2:20) — Slide 4: Why This Approach**
Say: "We didn't just merge the code — we first proved, location by location, that all eight copies did the same thing, made one explicit decision about the one place they disagreed, and then verified the entire game suite — almost 15,000 automated checks — still passed afterward, confirming zero player-visible change." Show the terminal output (or slide screenshot) with the summary line: `14,659 passed, 0 failed`.

**Scene 5 (2:20–2:50) — Roadmap**
Say: "This is one of several small extraction stories cleaning up duplicated logic across the game library — you can see it on the roadmap slide alongside the related helper-consolidation work." Advance to Roadmap slide.

**Scene 6 (2:50–3:00) — Questions**
Open the floor.
