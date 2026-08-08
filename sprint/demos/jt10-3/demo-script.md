# Demo Script — jt10-3

**Total time: ~4 minutes**

**Scene 1 — Slide 1: Title (0:00–0:15)**
- Say: "Today I'm walking through the Joust title screen — the marquee a player sees before the game starts."

**Scene 2 — Slide 2: Problem (0:15–0:45)**
- Say: "Our Joust clone didn't have a title screen yet. And when we went looking for the blueprint, some of our assumptions about it — including one about what text it displayed — turned out to be wrong."
- Show: the corrected story title side-by-side with the original: strike through "PRESENTED-BY."

**Scene 3 — Slide 3: What We Built (0:45–2:00)**
- Say: "We rebuilt three things: the vector JOUST logo, the two lines of text, and the flashing color cycle."
- Live demo — open a terminal and run:
  ```
  npx vitest run --project joust tests/title.test.ts
  ```
  Narrate while it runs: "This is 20 checks, each one verifying our code matches the original source exactly — the copyright text, the logo's line coordinates, the 2.5-second color timing." Expect output ending in `20 passed`.
- Show the specific data: copyright string `(C) 1982 WILLIAMS ELECTRONICS INC.`, bonus text `EXTRA MOUNT EVERY ___,000 POINTS`, color-change cadence `87 ticks (~2.5 seconds)`, logo built from `5 letter groups, 15+ connected line strokes, 80+ points`.
- **Fallback:** if the live test run fails or the terminal isn't available, show a static screenshot slide of the `tests/title.test.ts` results (20 passed) captured earlier, and read the same data points aloud.

**Scene 4 — Slide 4: Why This Approach (2:00–2:45)**
- Say: "Every string and shape in this code is footnoted to the exact line of the original 1982 source it came from. That's what let us catch 'PRESENTED BY' as a myth before it shipped — we checked the primary source instead of trusting old notes."

**Scene 5 — Before/After (2:45–3:15)**
- Show: "Before" = blank title mode (nothing renders). "After" = logo geometry + two text lines + color-cycle data all in place, verified against source, ready to display.

**Scene 6 — Roadmap (3:15–3:45)**
- Say: "This story built the pieces. The next story in the sequence turns this into something a player actually sees on screen."

**Scene 7 — Questions (3:45–4:00)**
- Open floor.
