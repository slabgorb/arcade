# Demo Script — pm5-4

**Total runtime: ~3 minutes**

**Scene 1 — Slide 1: Title (0:00–0:15)**
Open on the title slide ("Pac-Man HUD Fix: Reserve-Life Icons"). One line: "A small visual bug, fixed with a surgical, test-first change."

**Scene 2 — Slide 2: Problem (0:15–0:45)**
Show the reported screenshot side-by-side if available (the bottom row of icons as solid yellow discs overlapping the blue border wall). Say: "Every reserve life was showing up as a plain dot instead of Pac-Man's open mouth, and the icons were bleeding up into the wall below the maze."

**Scene 3 — Slide 3: What We Built (0:45–1:30)**
Explain the two-part fix in plain terms: correct sprite (open mouth, not closed), correct position (dropped ~4 pixels to clear the wall). Mention it's isolated to one function, `drawHud`, in the game's rendering code — no gameplay logic touched.

**Scene 4 — Live Demo (1:30–2:30)**
Run the dev server and show the game live:
```bash
just serve
```
Then navigate to `http://127.0.0.1:5270/pac-man/` in a browser, start a game, and let a life get lost (or just point at the HUD row at game start) to show the reserve-life icons at the bottom: five open-mouth Pac-Man icons sitting cleanly above the blue border wall, not overlapping it.

*Fallback:* if the dev server won't start or the browser demo hits an issue, skip to **Slide "Before/After"** and show the reported screenshot next to a screenshot of the fixed HUD (or describe the pixel-level test evidence: icons now measured at y=272–288, cleanly inside the reserved band, versus y=268–284 before, which bled 4 pixels into the wall).

**Scene 5 — Slide 4: Why This Approach (2:30–2:50)**
One line: "We wrote the failing checks first, confirmed they caught the exact bug, then made the smallest change that fixes it — so gameplay code stays untouched and the bug can't silently return."

**Scene 6 — Roadmap (2:50–3:00)**
Note this was found and fixed same-day as reported, and flag one small non-blocking cleanup item queued for later (tightening an older test filter that had been loosened to tolerate this exact overlap).

**Scene 7 — Questions (3:00+)**
Open floor.
