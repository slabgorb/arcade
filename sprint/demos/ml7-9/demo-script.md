# Demo Script — ml7-9

**Total time: ~4 minutes**

**Scene 1 — Slide 1: Title (0:00–0:15)**
Say: "Today I'm showing the field-scroll feature in Millipede — story ml7-9." Advance to Slide 2.

**Scene 2 — Slide 2: Problem (0:15–0:50)**
Say: "In the original 1982 Millipede, the playing field visibly slides up or down when you kill certain enemies or when a wave resets. Our clone had the logic to do this, but it wasn't connected — so the field just sat still no matter what happened." Show a static screenshot of the millipede field with no scroll for contrast. Advance to Slide 3.

**Scene 3 — Slide 3: What We Built (0:50–2:15)**
Say: "We wired the scroll system into the live game loop, covering all five triggers from the original game: continuous scroll, beetle kill, mosquito kill, centipede re-lay, and death cancel."

*Live demo:*
1. In a terminal, start the dev server:
   ```
   just serve
   ```
2. Open `http://127.0.0.1:5270/millipede/` in a browser.
3. Play until you kill a beetle — call out: "Watch the field shift down by one row now."
4. Kill a mosquito — call out: "And up by one row here — opposite direction, exactly like the arcade."

*Fallback:* If the live demo doesn't cooperate (input lag, browser issue), switch to Slide 3 and show the before/after screenshots prepared in the deck instead — one frame pre-scroll, one frame post-scroll, beetle-kill case.

**Scene 4 — Slide 4: Why This Approach (2:15–2:50)**
Say: "We didn't write new scroll logic — that already existed and was tested. This story was purely about wiring it into the frame loop in the right order. That's actually the risky part: a review caught that one trigger was firing a frame too early, which we fixed and re-verified before shipping."

**Scene 5 — Before/After (2:50–3:15)**
Show the static-field screenshot next to the scrolled-field screenshot side by side.

**Scene 6 — Roadmap (3:15–3:40)**
Say: "This closes out a piece of work deferred from an earlier story, and it sets up the next one — the shot-hits-bomb scroll register is a known follow-up we've already filed."

**Scene 7 — Questions (3:40–4:00)**
Open floor.
