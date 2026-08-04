# Demo Script — cp7-2

**Total runtime: ~4 minutes**

**Scene 1 — Slide 1: Title (0:00–0:15)**
Open on the title slide ("Fixing the Train Entry Visual Glitch — Centipede"). One sentence: "A small but visible bug where enemies could appear on top of the score display has been fixed."

**Scene 2 — Slide 2: Problem (0:15–1:00)**
Show a static "before" screenshot (or describe verbally if unavailable) of the train entering with a segment overlapping the score/lives row at the top of the screen. Say: "At the very start of a wave, part of the enemy train could render on top of the score, lives, and high-score text — right when players are looking at that part of the screen."

**Scene 3 — Slide 3: What We Built (1:00–2:00)**
Live demo: run the game locally.
```bash
just serve
```
Navigate to `http://127.0.0.1:5270/centipede/` in the browser. Start a wave and watch the train enter — point out that no segment ever paints over the score line now; the HUD (score, lives, high score) stays clean and readable the entire time. If the live demo isn't available or the dev server won't start, fall back to Slide "Before/After" with the two side-by-side screenshots instead.

**Scene 4 — Slide 4: Why This Approach (2:00–2:45)**
Explain in plain terms: "We didn't move the enemy's position — that number is shared with the player's own controls, so touching it risked a bigger bug. Instead, we just told the screen not to draw anything in that reserved top strip, using the same rule already used for one of the other enemies."

**Scene 5 — Before/After (2:45–3:15)**
Side-by-side static images: left = segment overlapping score row, right = clean score row with train confined below it.

**Scene 6 — Roadmap (3:15–3:45)**
Slide listing this fix alongside related visual-fidelity work in the sprint.

**Scene 7 — Questions (3:45–4:00)**
Open floor.
