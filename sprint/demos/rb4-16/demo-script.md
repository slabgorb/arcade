**Total run time: ~6 minutes**

**Scene 1 — Slide 1: Title (0:00–0:20)**
Open on the title slide ("Red Baron: Fixing the Enemy Plane's Tracking System"). One sentence: "Today I'm showing a fix to a bug that could silently freeze Red Baron's difficulty — and how we proved it's actually fixed, not just tested."

**Scene 2 — Slide 2: Problem (0:20–1:15)**
Explain the soft-lock bug in plain terms: after enough kills, the enemy plane could become permanently unreachable while all automated checks still said "pass." Show the key number on the slide: the old safety-net test's own comment claimed it caught this exact regression — but when the team deliberately reintroduced the bug, the test **stayed green**. That's the "fake green" finding that motivated re-verifying everything by hand.

**Scene 3 — Slide 3: What We Built (1:15–2:30)**
Walk through the leash metaphor: the enemy plane's boundary logic now runs on the same math the real 1980 arcade board used, anchored to the player's actual viewpoint instead of a fixed guess. Point out the three concrete outcomes: the old duct-tape boundary is gone, the fake-green test is now a real one (proven by intentionally breaking the code and watching it fail), and edge cases that could teleport or freeze the plane are now blocked.

**Scene 4 — Slide 4: Why This Approach (2:30–3:15)**
Explain the "fidelity first" principle and the discovery that unblocked this story: the original blocker was "we can't find the real math," and that turned out to be untrue — the source was in a file nobody had thought to check. State plainly that one constant is still an educated estimate, flagged for a future story, not hidden.

**Scene 5 — Slide 5: Before/After (3:15–4:45) — LIVE DEMO**
Run the game locally and show the plane tracking the player's viewpoint through a maneuver.

Terminal commands to run, in order:
```bash
cd red-baron
npm run dev
```
Then open `http://localhost:5277/` in a browser, start a mission, and bank/turn the plane while an enemy is on screen — call out that the enemy plane's weave visibly re-centers on the player's viewpoint as the camera moves, not on a fixed screen point.

Then show the actual verification numbers on the slide (these are the "planes stayed reachable" scores per difficulty level, measured automatically, higher is better):
- **Before (the honest baseline):** 600 / 208 / 44 / 32 / 17 reachable frames across the five difficulty levels.
- **After this fix:** 600 / 244 / 110 / 66 / 26 — reachable at every single level, and higher than the baseline at every level after the first.

**Fallback:** if `npm run dev` fails to start or port 5277 is already in use (a known trap when multiple local checkouts are running — check with `lsof -ti tcp:5277` before assuming it's broken), skip the live demo and present the Before/After numbers on Slide 5 as a static table instead; narrate the same point verbally: every difficulty level is now provably better than the honest starting point, not just "still passing."

**Scene 6 — Slide 6: Roadmap (4:45–5:30)**
Cover what's next: a follow-up story will resolve the one deliberately-deferred edge case (the outer-boundary rule, once the original design notes and the source code are reconciled with certainty), and another will refine the estimated scaling constant into an exact one derived from the arcade's math hardware. Note this fix builds directly on last sprint's plane-visibility rework and unblocks a cleaner enemy-AI baseline for future difficulty tuning.

**Scene 7 — Slide 7: Questions (5:30–6:00)**
Open the floor.