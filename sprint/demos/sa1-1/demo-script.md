# Demo Script — sa1-1

**Total runtime: ~4 minutes**

**Slide 1: Title (0:00–0:15)**
Say: "Today's story is about giving the arcade a consistent look and feel across all eleven games."

**Slide 2: Problem (0:15–0:45)**
Say: "Before this change, every game handled the space around the game screen differently — no consistent frame, no shared visual language." No live demo needed here; stay on the slide.

**Slide 3: What We Built (0:45–2:15) — live demo**
1. In terminal, run:
   ```
   just serve
   ```
   Wait for `http://127.0.0.1:5270/` to come up.
2. Open a browser to `http://127.0.0.1:5270/tempest/` — point out the dark, consistent frame color around the vector display.
3. Open a second tab to `http://127.0.0.1:5270/pac-man/` — point out the same frame color (`#0a0a12`) appears around this raster game too, despite it rendering completely differently under the hood.
4. Open a third tab to `http://127.0.0.1:5270/joust/` — same frame treatment again.
   - **Fallback if `just serve` fails or the dev server won't start:** skip to the screenshots on Slide "Before/After" (prepare two static screenshots ahead of time — one of a game's old inconsistent margin, one of the new shared frame — as a backup asset).

**Slide 4: Why This Approach (2:15–3:00)**
Say: "We built this once as a shared piece and had each of the eleven games adopt it individually, testing after each one — so we could catch any issue with a single game, not the whole fleet at once."

**Before/After (3:00–3:30)**
Show the two prepared screenshots side by side: inconsistent per-game margin treatment (before) vs. the uniform dark frame (after) — call out the color match (`#0a0a12`) is now identical across every game.

**Roadmap (3:30–3:50)**
Say: "This is the first of five planned consistency stories — pause screens, mouse capture, volume controls, and control remapping are next, and they'll all build on this same shared foundation."

**Questions (3:50–4:00)**
Open the floor.
