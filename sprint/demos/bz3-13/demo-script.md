**Total runtime: ~3 minutes.** This is a small, low-drama story (1 point, purely cosmetic/documentation), so the demo should be brisk — the goal is "show it's right, move on."

**Slide 1: Title (0:00–0:15)**
Say: "Last story of the Battlezone fidelity epic — two small but important text corrections. One the player sees, one only we see."

**Slide 2: Problem (0:15–0:45)**
Say: "The initials-entry screen — the moment right after you get a great score — was showing 'HIGH SCORE' instead of 'GREAT SCORE.' Those are two different signs in the original 1980 game, and we'd hung the wrong one." Show the before/after text side by side if the slide has room: `HIGH SCORE` → `GREAT SCORE`.

**Slide 3: What We Built (0:45–1:45)**
Live demo — run the actual game locally and show the corrected screen:
```bash
cd /Users/slabgorb/Projects/a-1/battlezone
npm run dev
```
Navigate to `http://localhost:5276/`, play until game over (or use a debug/cheat entry point if the team has one), and let it reach the initials-entry screen. Point at the banner text reading **"GREAT SCORE"** above "ENTER YOUR INITIALS."

*Fallback if the live demo doesn't cooperate (build hiccup, no time to reach game-over):* skip straight to a static screenshot slide showing the corrected initials-entry screen, or narrate the before/after test assertion: `expect(lines[0]).toBe('GREAT SCORE')` plus `expect(lines).not.toMatch(/HIGH SCORE/)`.

**Slide 4: Why This Approach (1:45–2:30)**
Say: "Two rules: don't invent new text — we used a constant that was already sitting there, correct and unused. And don't silently edit historical quotes — the documentation fix preserves the original 1980 disassembly note exactly as written, with a correction added alongside it, because it turns out the *original* notes had the same error. We're not hiding that history, we're annotating it."

**Before/After (2:30–2:50, optional):**
- Before: banner reads "HIGH SCORE"; findings doc says `01=French, 10=German`.
- After: banner reads "GREAT SCORE"; findings doc quote preserved verbatim, with a bolded correction note stating `01=German, 10=French`, sourced to `BZONE.MAC:4102`.

**Roadmap (2:50–3:10):** See below.

**Questions (3:10+):** Open floor.