# Demo Script — mc8-7

**Total runtime: ~4 minutes**

**Scene 1 — Slide 1: Title (0:00–0:15)**
Presenter opens on the title slide ("Bonus-City Cue: Fixing the Timing"). One line: "A quick fix to make sure Missile Command's bonus-city sound plays at the right moment — not too early."

**Scene 2 — Slide 2: Problem (0:15–1:00)**
Show the "before" framing: the bonus-city chime played the instant the player's score crossed a threshold, sometimes a full wave before the city actually appeared. Say: "Imagine hearing a trophy fanfare before you've actually won the trophy — that's what was happening here."

**Scene 3 — Slide 3: What We Built (1:00–2:15)**
Live terminal demo. From repo root:
```
npx vitest run --project missile-command -t "mc8-7"
```
Expected output: the new test file `mc8-7-bonus-city-grant-timing.test.ts` passes, showing 2 scenarios green — "cue silent on mid-play score crossing" and "cue fires once at real wave-end grant." Point out the test names on screen as they scroll past.

*Fallback:* If the live test run fails to display cleanly (e.g., terminal too small, npm not installed on demo machine), switch to **Slide 3a (Before/After)** and narrate the same two scenarios from the static text instead.

**Scene 4 — Slide 4: Why This Approach (2:15–3:00)**
Explain the "trophy ceremony" analogy again briefly, and mention the restart-guard: "We also made sure starting a new game after 'Game Over' doesn't accidentally replay this sound."

**Scene 5 — Before/After (3:00–3:30)**
Show the before/after table (below). Narrate the specific values: before, cue fired at the score-threshold frame; after, cue fires only at the wave-end grant frame, once per grant.

**Scene 6 — Roadmap (3:30–3:50)**
One slide, one line: this is part of the broader mc8 epic tightening up audio-cue accuracy across Missile Command's wave transitions.

**Scene 7 — Questions (3:50–4:00)**
Open floor.
