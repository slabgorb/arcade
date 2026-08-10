# Demo Script — mc10-3

**Total runtime: ~5 minutes**

**Slide 1: Title (0:00–0:20)**
Introduce the story: "Rebuilding the Missile Command HUD to match the original arcade cabinet." State that this is a visual-fidelity fix, three story points, shipped and merged today.

**Slide 2: Problem (0:20–1:00)**
Show the "before" description: top-left corner cluttered with "SCORE 001250", "AMMO 8 10 9", "WAVE 4  X1" in oversized lettering. Call out the two specific defects: (1) it doesn't match the real cabinet's centered layout, (2) two of the three readouts (AMMO, WAVE) are redundant with information already on screen.

**Slide 3: What We Built (1:00–2:15)**
Describe the "after": score centered at the top, high score centered directly beneath it, multiplier moved to bottom-center reading "2X". If a live build is available, run:
```
just serve
```
then open `http://127.0.0.1:5270/missile-command/` in a browser and play a short round, pointing at the centered score/high-score pair at the top and the "nX" multiplier at the bottom. Call out concrete values as they appear on screen, e.g. "watch the score climb past 1,250 while the high score stays fixed beneath it, and the multiplier flip from '1X' to '2X' after a streak."
*Fallback:* if the dev server doesn't come up or the browser isn't available, skip to a static side-by-side screenshot (before/after) prepared in advance — do not attempt to debug the dev server live.

**Slide 4: Why This Approach (2:15–3:00)**
Explain the "sign, not the lettering" analogy: the authentic pixel font was already verified in a prior story and intentionally left untouched; this story only fixed placement, size, and removed redundant readouts. Emphasize this kept the change small, low-risk, and easy to review.

**Before/After (3:00–3:45)**
Show the two screenshots side by side: cluttered top-left corner with oversized text on the left, clean centered score/high-score/multiplier on the right.

**Roadmap (3:45–4:15)**
See Roadmap section below — mention this closes out the mc10 HUD-fidelity epic's layout item and sets up remaining cosmetic polish (per-wave color).

**Questions (4:15–5:00)**
Open floor.
