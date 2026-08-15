# Demo Script — df3-5

**Total time: ~4 minutes**

**Scene 1 — Slide 1: Title (0:00–0:15)**
Open on the title slide ("Defender: Laser Fire"). One sentence: "Today we're showing the player's ship being able to shoot for the first time."

**Scene 2 — Slide 2: Problem (0:15–0:45)**
State plainly: the Defender clone had a flyable ship but no weapon — pressing fire did nothing. Note that this blocked every later feature (hitting enemies, scoring, dying to enemy fire) since none of that can exist until shots exist.

**Scene 3 — Slide 3: What We Built (0:45–1:45)**
Explain the 4-shot cap and directional firing in plain terms (see "What Changed" above). No live demo yet — just the concept, ideally with a simple on-slide diagram: ship facing right → bolt fires right; 4 bolts already on screen → 5th press does nothing.

**Scene 4 — Live Demo (1:45–3:15)**
In terminal, from repo root:
```bash
just serve
```
Wait for the "ONE vite dev server" output confirming it's bound to `127.0.0.1:5270`. Open a browser to:
```
http://127.0.0.1:5270/defender/
```
- Fly the ship right, tap fire rapidly 5–6 times. Point out on screen: only 4 laser bolts are ever visible at once, no matter how fast fire is pressed.
- Turn the ship to face left, fire again. Point out the new bolt now travels left, matching the ship's facing.
- Let a bolt travel to the screen edge and point out it disappears cleanly (no lingering off-screen bolts, no visual glitch).

**Fallback:** If `just serve` fails to bind (port 5270 already held by another checkout — a known environment quirk) or the browser demo is otherwise unavailable, skip straight to a pre-recorded screen capture or fall back to Slide "Before/After" showing two static frames: ship with no bolts (before) vs. ship with 4 bolts mid-flight in both directions (after).

**Scene 5 — Slide "Before/After" if not shown live (3:15–3:30)**
Two side-by-side stills: "Before — ship cannot fire" / "After — up to 4 bolts on screen, directional."

**Scene 6 — Slide: Roadmap (3:30–3:50)**
One line: "Next up — making these shots actually destroy enemies." Point to the sibling story already scoped for that.

**Scene 7 — Slide: Questions (3:50–4:00)**
Open the floor.
