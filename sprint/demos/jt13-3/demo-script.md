# Demo Script — jt13-3

**Total runtime: ~4 minutes**

**Slide 1: Title (0:00–0:15)**
Presenter opens with: "Today's update fixes a small but visible bug on the Joust arcade attract screen — the bonus-life message now reads correctly."

**Slide 2: Problem (0:15–0:50)**
Show a static screenshot (or the live before-state if still available) of the broken screen. Point out the message reads only "EXTRA MOUNT EVERY" with a blank trailing off. Say: "This is the promotional message that tells players 'get 20,000 points and earn a free life' — except it never told them the 20,000 part."

**Slide 3: What We Built (0:50–2:00)**
Switch to a live demo of the fixed attract screen.
- Terminal command to start the local server:
  ```
  just serve
  ```
- Open a browser to `http://127.0.0.1:5270/joust/` and wait for the attract/demo loop to appear (no coin inserted, screen cycles automatically).
- Point to the line reading exactly: **"EXTRA MOUNT EVERY 20,000 POINTS"** — call out that it's now one complete, centered sentence with no gap.
- **Fallback:** If the live server doesn't come up in time, show the pre-captured "after" screenshot from the story's review notes (attract screen at 20,000 points, centered) and narrate the same point.

**Slide 4: Why This Approach (2:00–2:45)**
Explain in plain terms: "We checked the original 1982 machine's actual behavior, confirmed this message was always supposed to show a real number pulled from the game's settings, and fixed it to do exactly that — rather than deleting the message, which would have been the quicker but less faithful option."

**Before/After (2:45–3:15)**
Side-by-side slide: "EXTRA MOUNT EVERY" (broken, trailing off) vs. "EXTRA MOUNT EVERY 20,000 POINTS" (complete).

**Roadmap (3:15–3:40)**
See Roadmap & Integration section below — mention this is one of several attract-screen fidelity fixes in the current Joust polish sprint (jt13).

**Questions (3:40–4:00)**
Open floor.
