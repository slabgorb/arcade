# Demo Script — ml12-2

**Total runtime: ~4 minutes**

**Scene 1 — Slide 1: Title (0:00–0:15)**
Open on the title slide ("Millipede: Edge-Turn Fix — ml12-2"). One sentence: "We fixed a visible bug where broken enemy segments could run off one side of the screen and reappear on the other."

**Scene 2 — Slide 2: Problem (0:15–1:00)**
Narrate the bug in plain terms: "When you shoot the millipede train mid-body, the front piece of the broken-off section would sometimes run in a straight line right off the edge of the screen — and pop back out the other side, over and over." If a recorded clip of the bug is available, play it here (5–10 seconds, looped once). If no clip exists, describe it verbally and move straight to Slide 3 — do not attempt to reproduce the bug live, since it depended on hitting a mid-body shot at the right moment.

**Scene 3 — Slide 3: What We Built (1:00–2:15)**
Live demo: run the dev server and show the fixed behavior in the browser.
- Terminal command: `just serve`
- Navigate to `http://127.0.0.1:5270/millipede/`
- Start a game, let the millipede train approach the right edge, and shoot a body segment near the middle of the train to split it.
- Point out on screen: the newly-exposed front segment of the broken piece reaches the screen edge, turns, and drops down a row — it does not cross over to the left side.
- Fallback if the live demo doesn't cooperate (train doesn't split at the right moment, or dev server issues): switch to Slide 3b, a static before/after GIF pair showing the old wrap-around bug next to the new turn-and-drop behavior.

**Scene 4 — Slide 4: Why This Approach (2:15–3:00)**
Explain in plain terms: "Every enemy segment now checks 'am I at the wall?' the same way the lead segment always did. In a normal, unbroken train this changes nothing you'd ever see — it only matters for the broken-off pieces that were actually glitching." Mention that a fuller fix matching the original hardware's exact internal mechanism is tracked separately for later polish, but this closes the visible bug now.

**Scene 5 — Before/After (3:00–3:30)**
Show the before/after slide side by side: "Before" clip/GIF of the segment vanishing off-screen and reappearing; "After" clip/GIF of the same segment hitting the edge and turning down like normal. Call out: no screen flash or strobe was introduced (accessibility check passed).

**Scene 6 — Roadmap (3:30–3:50)**
One slide, two bullets: "Full head-promotion-on-split mechanism (matching original hardware exactly) is future polish work." "This fix is the safe, low-risk stand-in that closes the bug players can see today."

**Scene 7 — Slide: Questions (3:50–4:00)**
Open floor for questions.
