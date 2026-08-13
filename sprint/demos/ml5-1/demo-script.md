# Demo Script — ml5-1

**Total runtime: ~5 minutes.**

**Scene 1 — Slide 1: Title (0:00–0:20)**
Open on the title slide. Say: "Today I'm showing you the difficulty and scoring engine we just built for Millipede, one of the games in our arcade collection — and how we proved it matches the original 1982 machine exactly."

**Scene 2 — Slide 2: Problem (0:20–1:00)**
Say: "Before this work, our version of Millipede had no way to decide how many beetles to send at a player, no working pause between waves, and no reliable way to add points to the score. Anything built on top of that — harder waves, bonus lives, a high-score table — would have been built on sand."

**Scene 3 — Slide 3: What We Built (1:00–2:30)**
Walk through the three pieces using concrete numbers:
- "The beetle count per wave now ramps: 1 beetle early on, climbing to 2, 3, 4, then 6 as the score crosses 70,000 / 140,000 / 210,000 / 400,000 / 700,000 points."
- "The wave-to-wave pause now correctly holds — it won't count down while the board is still resetting or a beetle is still alive."
- "Killing a beetle now awards its real point value — 300 points, in the demo I'm about to show — not a stand-in number."

If a live demo is possible, run it:
```
just serve
```
Then open `http://127.0.0.1:5270/millipede/` in a browser and narrate: "Watch the score climb as I clear beetles — that's the real scoring engine running live." Also run, to show the automated proof:
```
npx vitest run --project millipede
```
and point out the passing count (626 passed) as evidence every rule was verified.

*Fallback:* If the dev server or live test run fails for any reason, skip straight to **Slide 5 (Before/After)** and narrate the before/after numbers instead of a live run — do not troubleshoot on stage.

**Scene 4 — Slide 4: Why This Approach (2:30–3:30)**
Say: "Every one of these numbers — the beetle ramp, the pause timing, the point values — was checked byte-for-byte against the original arcade machine's source code before we wrote a line of new code. That's what lets us say with confidence this isn't a guess, it's a faithful match."

**Scene 5 — Slide 5: Before/After (3:30–4:15)**
Before: "No difficulty ramp — every wave felt the same regardless of score. No working inter-wave pause. No verified point values." After: "A score-driven difficulty ramp, a pause that correctly holds for in-flight action, and point-accurate scoring — all traceable to the original machine's rulebook."

**Scene 6 — Slide 6: Roadmap (4:15–4:45)**
See Roadmap section below.

**Scene 7 — Slide 7: Questions (4:45–5:00)**
Open the floor.
