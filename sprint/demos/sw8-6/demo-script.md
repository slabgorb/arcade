**Total run time: ~5:30**

**Scene 1 — Title (0:00–0:30) — Slide 1: Title**
Presenter opens with: "Today's fix is about how TIE Fighters approach the player in our *Star Wars* arcade recreation — making them sweep across the screen the way they do on the real 1983 cabinet, instead of just zooming in on the crosshair."

**Scene 2 — Problem (0:30–1:30) — Slide 2: The Problem**
Play the reference clip `star-wars-longplay.mov` (original arcade cabinet footage) side by side with a short clip of our old behavior. Call out the specific visual tell: on the original, TIE Fighters visibly travel from one side of the screen toward the other as they approach. In our old build, they stay pinned near the center and just get larger — like a balloon inflating on the crosshair.

**Scene 3 — What We Built (1:30–3:00) — Slide 3: What We Built (Live Demo)**
Live in-browser demo. Exact terminal commands:
```
cd /Users/slabgorb/Projects/a-3
just serve
```
Then in a browser, go to `http://localhost:5274/`, start a game, and use the developer wave-jump shortcut (press `7`) to skip straight into a space-combat wave rather than waiting through the intro sequence. Let 2–3 TIE Fighters spawn and approach.

Specific data point to narrate live: two of the three fighters ("wingmen") spawn roughly a quarter-screen-width off-center, left and right of the player. Point out on-screen that they now visibly cross toward the middle as they close the distance, rather than appearing to sit still and grow.

**Fallback:** If the local server fails to start (e.g., port 5274 already in use, or the room's network/projector has issues), skip to **Slide 5: Before/After**, which has pre-captured stills/clips of the same moment, and note verbally that they were captured using this same wave-jump shortcut.

**Scene 4 — Why This Approach (3:00–4:00) — Slide 4: Why This Approach**
Explain in plain terms (per the section above): one starting-direction value was changed for newly-spawned fighters, nothing else. Optionally show the automated proof:
```
cd star-wars
npx vitest run tests/core/tie-approach-sweep.test.ts
```
Narrate the before/after: before the fix, the automated trajectory check *failed* (the measured "spread" value came out to about 0.032 when it needed to be above 0.048 to count as a real sweep); after the fix, all 6 checks in that file pass, confirming the spread widens several times over as a fighter closes in — the mathematical signature of "sweeping across" rather than "zooming in."

**Fallback:** If the test run is slow or the terminal isn't visible to the room, skip the live run and instead show the pre-captured terminal output (screenshot) included in the Slide 4 appendix/speaker notes.

**Scene 5 — Before/After (4:00–4:45) — Slide 5: Before/After**
Static side-by-side: "Before" screenshot (fighters centered, growing) vs. "After" screenshot (fighters visibly off-center, sweeping), with a thumbnail from `star-wars-longplay.mov` underneath both as the reference/ground truth.

**Scene 6 — Roadmap (4:45–5:15) — Slide 6: Roadmap**
Briefly note what's next (see Roadmap section below): fighters currently fly past the player rather than looping and hovering in front the way the original cabinet shows — that's a separate, already-identified follow-up.

**Scene 7 — Questions (5:15–5:30) — Slide 7: Questions**
Open floor.