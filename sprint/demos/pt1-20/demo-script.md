# Demo Script — pt1-20

**Total runtime: ~4 minutes**

**Scene 1 — Slide 1: Title (0:00–0:15)**
Open on the title slide. One line: "Defender: Making Controls Discoverable." State the story points (2) and that this is a small, focused fix.

**Scene 2 — Slide 2: Problem (0:15–0:45)**
Narrate the problem statement above. Say explicitly: "If you sat a new player in front of Defender today, they would not know how to reverse direction or drop a smart bomb unless someone told them." Show the story ticket title on screen: *"defender: in-game controls are undiscoverable — add on-screen control hints (reverse/thrust/fire/smart-bomb), pt1-20."*

**Scene 3 — Slide 3: What We Built (0:45–2:30) — LIVE DEMO**
Switch to the live browser demo.
- Terminal command to start the dev server:
  ```
  just serve
  ```
- Navigate to `http://127.0.0.1:5270/defender/`
- Let the game load to the attract screen, then start a game.
- Point out the on-screen control hints as they appear: the reverse indicator, the thrust hint, the fire prompt, and the smart-bomb hint.
- Trigger each control live on screen so the audience sees the hint paired with the actual action: reverse thrust, fire a shot, and use the smart bomb.
- **Fallback:** If the dev server fails to start or the browser demo doesn't load, switch immediately to Slide 3a (a pre-captured screenshot or short screen recording of the in-game hints, taken ahead of time) and narrate over it instead of troubleshooting live.

**Scene 4 — Slide 4: Why This Approach (2:30–3:15)**
Explain the reasoning above: on-screen hints instead of a separate tutorial, kept lightweight to preserve the classic arcade feel.

**Scene 5 — Before/After (3:15–3:45)**
Show a simple side-by-side: "Before" (clean screen, no indication of controls) and "After" (same screen, with the hint labels visible). This is the clearest visual proof of the change for a non-technical audience.

**Scene 6 — Roadmap (3:45–4:00)**
Transition to the roadmap slide (see below).

**Scene 7 — Questions**
Open the floor.
