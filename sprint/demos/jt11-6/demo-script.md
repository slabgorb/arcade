# Demo Script — jt11-6

**Total runtime: ~4 minutes**

**Scene 1 — Slide 1: Title (0:00–0:15)**
Presenter opens on the title slide ("Joust: High-Score Entry Fix — jt11-6"). One line: "A qualifying high score used to vanish if you looked away. Here's the fix."

**Scene 2 — Slide 2: Problem (0:15–1:00)**
Show the entry screen as it looked before this fix — three blank underscores, no on-screen guidance. Narrate: "If you earn a high score in Joust and then step away from this screen without pressing the confirm button, your score is gone. No warning, no save." If a recording of the old behavior isn't available, fall back to describing it verbally over a static screenshot of the blank entry screen.

**Scene 3 — Slide 3: What We Built (1:00–2:15)**
Live demo in the running game (or fallback to a short screen recording if the live build isn't reachable):
- Play until a qualifying score is reached (or use a debug/dev shortcut to force high-score qualification if available).
- Show the entry screen now displaying on-screen text, e.g. "◀ ▶ SELECT LETTER · FLAP TO CONFIRM."
- Enter three initials (e.g. "ABC"), then deliberately do nothing.
- Let the timeout elapse on screen and show the game auto-committing "ABC" to the board.
- Navigate to the lobby leaderboard and point out "ABC" now appears in the joust high-score list — same list the game itself reads from.
- **Fallback:** if live capture fails, show a pre-recorded 20-second clip of this exact sequence, or Slide 3a with three static screenshots (instructions visible → timeout countdown → name on leaderboard).

**Scene 4 — Slide 4: Why This Approach (2:15–3:00)**
Explain in plain terms: "We didn't invent this timeout — we pulled it from the original 1982 arcade machine's own code, so this now behaves the way the real cabinet did." Show a single slide callout: "Verified against original ROM source (JOUSTRV4.SRC)."

**Scene 5 — Roadmap (3:00–3:30)**
Slide showing this fix sits inside the broader jt11 epic on Joust polish, and that two related follow-up items (jt11-13, jt11-14) were filed from this review to track adjacent refinements.

**Scene 6 — Questions (3:30–4:00)**
Open floor.
