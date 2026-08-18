# Demo Script — mc12-5

**Total runtime: ~4 minutes**

**Scene 1 — Slide 1: Title (0:00–0:15)**
Open on the title slide ("Missile Command: Ready-Missile Marker Fix"). One sentence: "A small but telling rendering bug in our arcade fidelity work — and the systemic fix behind it."

**Scene 2 — Slide 2: Problem (0:15–1:00)**
Show a side-by-side screenshot: the small automated-test canvas (256px) where the marker looks fine, next to the full display (955px) where it renders as a visibly oversized square dot. Say: "This passed every automated test — green across the board — but looked wrong to a human eye on the real screen. That gap is exactly what we call the 'green-vitest, wrong-pixels' blind spot."

**Scene 3 — Slide 3: What We Built (1:00–2:00)**
Walk through: "We went back to the original 1980 Missile Command assembly source — the actual code that ran on the arcade hardware — to confirm the marker's true size. Then we replaced the old shortcut math with the same proper scaling unit the rest of the renderer already uses." If doing a live demo, run:
```
just serve
```
then navigate to `http://127.0.0.1:5270/missile-command/` in a browser at full window size and point out the ready-missile stack marker at the bottom of the play field — now correctly sized relative to the missile base graphics. **Fallback:** if the dev server or browser demo isn't available, skip straight to a pre-captured before/after screenshot pair (see Before/After section) on this same slide.

**Scene 4 — Slide 4: Why This Approach (2:00–2:45)**
Explain: "This is the second time we've found this exact pattern — an arbitrary '/200' left over from old code, instead of the shared scaling system everyone else uses. Rather than patch this one spot, we fixed it the same way as last time, and added a test that checks marker size at real display resolution, not just the small test canvas, so it can't sneak back in a third time."

**Scene 5 — Before/After (2:45–3:15)**
Show the two screenshots again, this time labeled: "Before: ~10px oversized square marker at full display resolution" vs. "After: correctly sized marker matching the original hardware's proportions."

**Scene 6 — Roadmap (3:15–3:45)**
"This closes out the last known instance of this bug pattern in the renderer. It also leaves us with a reusable safeguard — a display-resolution size guard — that future fixes in this game and others can copy directly."

**Scene 7 — Questions (3:45–4:00)**
Open the floor.
