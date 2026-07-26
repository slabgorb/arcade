**Total run time: ~5 minutes.** Deck order: Slide 1 (Title) → Slide 2 (Problem) → Slide 3 (What We Built) → Slide 4 (Why This Approach) → Slide 5 (Before/After) → Slide 6 (Roadmap) → Slide 7 (Questions).

**Scene 1 — 0:00–0:30 — Slide 1: Title**
Say: "Today I'm showing the return of a detail arcade veterans will recognize instantly — the X-wing cockpit frame." Advance to Slide 2.

**Scene 2 — 0:30–1:15 — Slide 2: Problem**
Show a screenshot of gameplay *without* the frame (a plain view with no border). Say: "This is what our clone looked like until this week — technically correct gameplay, but an empty-feeling view compared to the real cabinet." Advance to Slide 3.

**Scene 3 — 1:15–2:45 — Slide 3: What We Built (live demo)**
In a terminal, run:
```
cd star-wars
npm run dev
```
Wait for the "Local: http://localhost:5274/" message, then open `http://localhost:5274/` in the browser. Start a game and let it run through all three phases so the frame's persistence is visible:
- **Space phase:** point out the blue rails along the left and right edges and the blue/red shapes across the bottom.
- **Surface phase:** confirm the same frame is still present, unchanged, as the view changes underneath it.
- **Trench phase:** same check — the frame does not move or resize even as the 3D view zooms through the trench.

Call out explicitly: "Notice the frame doesn't track where I'm aiming — that's intentional, it's fixed to the screen, exactly like the original cabinet's gun sight."

**Fallback if the live demo fails** (port conflict, dev server won't start, etc.): skip straight to Slide 5 (Before/After), which has static before/after screenshots pre-captured from a working run, and narrate from those instead.

**Scene 4 — 2:45–3:30 — Slide 4: Why This Approach**
No live demo needed — talk through the slide. Optionally show the automated safety net by running:
```
npm test
```
Point out the summary line reading **`Test Files 177 passed (177) | Tests 1854 passed (1854)`** — "every one of the game's existing checks still passes; this feature added 17 new checks and broke nothing." If time is tight, skip the command and just cite the numbers from the slide.

**Scene 5 — 3:30–4:00 — Slide 5: Before/After**
Two side-by-side screenshots, same gameplay moment (space phase, center of screen): left labeled "Before — no frame," right labeled "After — cockpit frame present." This is also the fallback slide for Scene 3 if the live demo isn't available.

**Scene 6 — 4:00–4:30 — Slide 6: Roadmap**
Walk through the two sibling stories still queued in this same initiative (see Roadmap & Integration below).

**Scene 7 — 4:30–5:00 — Slide 7: Questions**
Open floor.