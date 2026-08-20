# Demo Script — pt1-4

**Total runtime: ~4 minutes**

**Scene 1 — Slide 1: Title (0:00–0:15)**
State the story: "Star Wars: fixing the screen to a proper, consistent size." No live demo yet.

**Scene 2 — Slide 2: Problem (0:15–1:00)**
Show the *before* state. Open a terminal and start the local dev server:
```
just serve
```
Open a browser to `http://127.0.0.1:5270/star-wars/`, then resize the browser window to be very wide and short (drag it to simulate an ultrawide monitor). Point out how the HUD elements spread toward the far edges of the window while the 3D cockpit action stays centered — visibly disconnected.
*Fallback: if the dev server doesn't come up, use a pre-captured screenshot of the stretched layout (take one beforehand and keep it on the fallback slide).*

**Scene 3 — Slide 3: What We Built (1:00–2:15)**
Reload the same page after the fix (same URL, `http://127.0.0.1:5270/star-wars/`). Resize the browser window through several shapes live: very wide, very tall, and square. In every case, show that the game screen stays a fixed proportion, centered, with black bars filling the rest — HUD and action always aligned.
*Fallback: if live resizing isn't smooth in the room's screen-share, show two static screenshots side-by-side: "wide monitor" and "tall monitor," both with the game correctly centered.*

**Scene 4 — Slide 4: Why This Approach (2:15–3:00)**
No live demo. Explain the "letterboxing" analogy (old TV show on a widescreen TV) and mention this mirrors the same fix already used in the Battlezone game, so it's a proven pattern, not a one-off.

**Scene 5 — Before/After (3:00–3:30)**
Put the two earlier screenshots (stretched HUD vs. centered/letterboxed) side by side on one slide for a direct visual comparison.

**Scene 6 — Roadmap (3:30–3:45)**
Brief mention (see Roadmap section below).

**Scene 7 — Questions (3:45–4:00)**
Open floor.
