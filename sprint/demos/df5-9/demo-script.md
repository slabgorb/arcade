# Demo Script — df5-9

**Total runtime: ~4 minutes**

**Scene 1 — Slide 1: Title (0:00–0:15)**
Open on the title slide. Say: "Today I'm walking through a visual bug fix in world scrolling — df5-9 — where the ground and enemies weren't moving correctly as the ship flew through the level."

**Scene 2 — Slide 2: Problem (0:15–1:00)**
Show Slide 2. Say: "Here's the issue: as the ship moved forward, the terrain and the enemies were drawn at fixed positions on screen, instead of shifting with the camera. That meant the ground looked frozen, and enemies appeared to be in the wrong spot relative to the ship." If you have a captured screenshot or short clip of the broken behavior, show it now — call out that the terrain stripes aren't moving even though the ship is flying.

**Scene 3 — Slide 3: What We Built (1:00–2:15)**
Show Slide 3. Say: "We fixed the frame-drawing logic so that everything in the world — terrain and enemies — is offset by the camera's position before it's drawn." Switch to a live terminal demo:
```
just serve
```
Then open `http://127.0.0.1:5270/red-baron/` (or the relevant game path for df5-9) in a browser, and fly the ship forward. Narrate: "Watch the terrain scroll smoothly under the ship now, and the enemy stays anchored to its position in the world rather than sliding with the screen."

*Fallback:* If the live demo doesn't come up cleanly (server port conflict, browser issue), fall back to Slide 3's before/after screenshots or a pre-recorded clip of the corrected scrolling.

**Scene 4 — Slide 4: Why This Approach (2:15–2:50)**
Show Slide 4. Say: "We fixed this once, in the shared frame-drawing step, rather than patching each object individually. That means terrain and every enemy type use the same camera math, so this class of bug can't reappear piecemeal as new objects are added."

**Scene 5 — Before/After (2:50–3:20)**
Show the Before/After slide side by side (or two short clips back-to-back). Point out: "Before: ground looks static, enemy position looks disconnected from the ship's movement. After: ground scrolls continuously, enemy stays correctly anchored in world space."

**Scene 6 — Roadmap (3:20–3:40)**
Show the Roadmap slide. Briefly connect this fix to the broader visual-fidelity work across the game's rendering pipeline (see Roadmap section below).

**Scene 7 — Questions (3:40–4:00)**
Show the Questions slide and open the floor.
