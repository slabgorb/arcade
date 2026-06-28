**Setup:** Have `npm run dev` running in `tempest/` (or star-wars repo on branch `fix/8-16-combat-kill-loop`) at `http://localhost:5273`. Have two browser tabs: one on the game, one idle as fallback. Have the slide deck open in presenter mode.

---

**Slide 1 — Title (0:00–0:30)**
Introduce the story: "Today we're closing out the p1 bug that made Wave 1 of the Star Wars shooter unwinnable by shooting. This was the single most visible break in the playtest — the cannon did nothing."

---

**Slide 2 — Problem (0:30–1:30)**
Walk through the before state. Say: "Every bolt fired in Wave 1 missed every TIE fighter, 100% of the time. The only way the wave ended was if a TIE rammed the cockpit. You couldn't win by shooting — you could only survive by luck or lose by ramming."

Show the Before/After slide to visualize the two states side by side.

*Fallback: if the live game isn't running, describe the symptom from the session log: "TEA's automated test proved it — the simulation showed `enemies.length = 1` after firing, meaning the enemy was still alive."*

---

**Slide 3 — What We Built (1:30–3:00)**
Live demo: open `http://localhost:5273` in the browser. Point the crosshair at a TIE fighter and fire. The enemy should flash or explode and the kill counter should increment. Then let the wave clear naturally by shooting all enemies.

Say: "You can see the bolt now travels exactly through the center of the crosshair. The wave clears by kills, not by collision."

*Fallback if live demo fails:* Show the test output slide — "The automated test suite shows 264 tests passing including 5 new tests covering this exact kill loop."

At terminal, type:
```bash
cd star-wars && npm test -- --reporter=verbose combat-kill-loop
```
This will print the 5 new test names: `centred shot destroys a TIE dead ahead`, `off-centre TIE under the crosshair is destroyed by fire`, `firing line projects onto the crosshair (vertical)`, `shooting the final TIE clears space→surface`, `a ramming TIE does NOT clear the wave`.

---

**Slide 4 — Why This Approach (3:00–4:00)**
"We traced the bolt from mouse click to collision and found the hit-detection was fine. The break was the launch direction. Fixing the wrong layer would have introduced risk without solving the problem."

Point to the architecture diagram if available: core simulation (pure math, no pixels) ↔ shell (screen, input, rendering).

---

**Before/After slide (4:00–4:30)**
Walk through the comparison table (see Before/After section below).

---

**Roadmap slide (4:30–5:00)**
Connect to Wave 2 and the broader combat arc. See Roadmap section below.

---

**Questions (5:00+)**

---