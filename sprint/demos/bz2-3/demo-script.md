**Total runtime: ~5 minutes.** Presenter needs a terminal and a browser window side by side.

**Scene 1 — Slide 1: Title (0:00–0:20)**
Introduce the story: "Battlezone's camera was making everything look too close. Here's what we found and fixed." No live demo in this scene — just the title slide.

**Scene 2 — Slide 2: Problem (0:20–1:00)**
Describe the playtest finding in plain terms: obstacles and enemy tanks loomed up large/near, distance was hard to judge. If you have a recorded screenshot or GIF from the original playtest session, show it here as the "before" visual. If none is available, skip straight to narrating the symptom and rely on the live Scene 4 demo instead.

**Scene 3 — Slide 3: What We Built (1:00–2:15)**
Live terminal demo of the fixed game:
1. Open a terminal and run:
   ```
   cd /Users/slabgorb/Projects/a-3
   just serve
   ```
2. Open a browser to `http://localhost:5276/battlezone/`
3. Drive the tank forward toward a wireframe obstacle or enemy tank and narrate: "Notice the obstacle grows at a natural, steady rate as I approach — it doesn't loom up suddenly like it used to."
4. Point out the radar scanner in the corner of the screen — note that targeting/radar range is unchanged; only the picture you see changed.

**Fallback if the live server won't start or the browser demo misbehaves:** Skip to Slide 5 (Before/After) and present the numeric comparison instead — see the concrete numbers below. Do not attempt to debug the dev server live.

**Scene 4 — Slide 4: Why This Approach (2:15–3:15)**
No live demo. Narrate the "two settings got wired together" explanation from **What Changed** above. Optionally show the automated test proof:
```
cd battlezone
npm test -- scene-calibration
```
Call out the result verbally: "9 tests specifically pin this calibration, and all 389 tests in the game pass." If the test command fails to run live (e.g., dependencies not installed), state the numbers from memory instead — see Before/After below — and move on; do not troubleshoot npm live.

**Scene 5 — Slide "Before/After" (3:15–4:00)**
Present the concrete numbers as a simple visual (see **Before/After** section below): an object at the edge of the targeting zone used to land exactly at the edge of the screen (fully filling the frame); now it lands about 40% of the way from center to edge — comfortably inside the frame, which is what "correct distance" looks like on screen.

**Scene 6 — Slide: Roadmap (4:00–4:40)**
Walk through the sibling stories listed in **Roadmap & Integration** below — this is one of six fixes in the same playtest-followup epic, and the epic closes with a full live playtest of all of them together.

**Scene 7 — Slide: Questions (4:40–5:00)**
Open the floor. Likely question: "Is 90 degrees the final number?" Answer: it's the best-documented candidate and is loudly guarded by tests, but the final tuning call is made by eye during the epic-closing playtest (bz2-6), which can retune it if needed.