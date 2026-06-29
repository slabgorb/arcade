**Setup (before the presentation):** Load the arcade at `http://localhost:5273/tempest/` in a browser. Start a game and reach the end of a level so the tube is clear of enemies but the level hasn't advanced yet. Have the browser DevTools console open in a second tab for the fallback.

---

**Scene 1 — Slide 1 (Title): 0:00–0:30**
Open with the arcade booting. Let the attract mode run for five seconds showing the Tempest logo and tube graphics. Say: "This is Tempest — a faithful recreation of Atari's 1981 vector classic. Today we're talking about one of its most iconic weapons."

---

**Scene 2 — Slide 2 (Problem): 0:30–1:30**
Switch to the slide. Point to the Superzapper description: "Two charges, screen-clearing power, strict rules about when it fires." Explain the regression: "A cleanup in Sprint 10 accidentally removed a four-word guard — `if enemies is empty, stop` — and that broke 40 years of expected behavior." Show the before behavior (if a recording is available): player presses Superzapper on a clear board, charge counter ticks down from 2 to 1 with nothing destroyed.

*Fallback if recording unavailable:* Show the before/after slide directly and describe the behavior verbally.

---

**Scene 3 — Slide 3 (What We Built): 1:30–2:30**
Live demo. In the running game, clear the board of enemies. Press the Superzapper key (`Z` or mapped fire key). The weapon does NOT fire, the charge counter stays at 2, no animation plays. Say: "Nothing happened — and that's exactly correct. The game checked the board, found zero enemies, and preserved the charge." Repeat once so the audience sees it clearly.

*Fallback if live game unavailable:* Show a side-by-side screenshot: left panel shows charge counter going 2→1 with empty board (broken), right panel shows counter holding at 2 (fixed).

---

**Scene 4 — Slide 4 (Why This Approach): 2:30–3:15**
Return to slides. Two-bullet comparison: "Option A — restore original behavior (chosen). Option B — document the new behavior as intentional." Explain in one sentence why Option A won: "There was no design intent behind the change, so carrying it forward would mean defending a mistake forever."

---

**Scene 5 — Before/After Slide: 3:15–3:45**
Walk through the comparison table. Point to the "Wasted-but-not-spent" row and say: "This phrase comes directly from the original Tempest design documentation. The weak shot — your second Superzapper press — can miss if there's only one enemy and it escapes. That shot is wasted, but the charge is still marked used. Empty-board press is different: nothing fires, nothing is spent."

---

**Scene 6 — Roadmap: 3:45–4:15**
One sentence: "This fix unlocks the next Superzapper stories — adding the visual zap animation and the enemy-kill cascade — on a foundation that now correctly matches the original arcade rules."

---

**Scene 7 — Questions: 4:15+**
Open floor.

---