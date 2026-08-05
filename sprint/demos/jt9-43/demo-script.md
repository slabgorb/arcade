# Demo Script — jt9-43

**Total runtime: ~5 minutes**

**Scene 1 (0:00–0:20) — Slide 1: Title**
Say: "Today I'm walking through a collision-accuracy fix in our Joust clone — a bug that made character collisions blind to horizontal distance."

**Scene 2 (0:20–1:00) — Slide 2: Problem**
Say: "In the original 1982 Joust, whether your knight collides with a buzzard depends on both how far apart they are vertically AND horizontally. Our clone was correctly checking vertical distance, but for horizontal distance, it was comparing shapes as if they were always in the exact same spot — even when they were up to 15 pixels apart." Show the problem statement slide with the plain-language explanation (no code).

**Scene 3 (1:00–2:30) — Slide 3: What We Built**
Say: "We fixed the horizontal check across all three places collisions happen in the game: jousting encounters, egg catching, and buzzard-vs-buzzard hits." If doing a live demo:
- Run: `npx vitest run --project joust -t "jt9-43"`
- Point out the terminal output showing all jt9-43 tests passing (5 unit tests + 6 integration tests + 3 source-verification tests, all green).
- Narrate: "These tests specifically prove two characters standing 10 pixels apart no longer incorrectly register as touching, while characters standing in the exact same spot are unaffected."
- **Fallback:** If the live terminal demo fails to run (e.g., environment issue), skip to Slide "Before/After" and show the static before/after description instead — no need to re-attempt the command.

**Scene 4 (2:30–3:15) — Slide 4: Why This Approach**
Say: "We didn't guess at this fix — we went back to the original 1982 game code, found the exact three lines that do this horizontal math, and copied that logic exactly, including tests designed to catch a backwards or overly strict fix."

**Scene 5 (3:15–4:00) — Before/After (optional slide)**
Say: "Before: two characters 10 pixels apart could wrongly register a hit. After: that same scenario correctly clears, matching the original arcade cabinet. We also confirmed that a small number of existing game replays changed outcome — for example, in one scripted test replay, Player 2 now loses a joust at frame 50 instead of Player 1 at frame 49 — and we manually verified each of these matches the authentic, corrected physics rather than being an accidental side effect."

**Scene 6 (4:00–4:30) — Slide: Roadmap**
Say: "This closes out one of the last known collision-accuracy gaps in Joust's core geometry work."

**Scene 7 (4:30–5:00) — Slide: Questions**
Open the floor.
