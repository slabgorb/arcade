# Demo Script — df4-1

Total runtime: ~5 minutes.

**Scene 1 — Slide 1: Title (0:00–0:20)**
Open on the title slide ("Defender: The Collision Referee"). State in one sentence: "This is the shared system that decides when a laser, a bomb, or the ship actually hits something in our Defender clone."

**Scene 2 — Slide 2: Problem (0:20–1:00)**
Explain the gap: Defender had eleven planned enemy types and weapons, and *none* of them had any way to detect a hit. Say: "Before today, if a laser flew straight through an enemy, nothing would happen — there was no referee on the field." Emphasize this blocks every future enemy story.

**Scene 3 — Slide 3: What We Built (1:00–2:30)**
Explain the three query types in plain terms — laser-vs-enemy, bomb-vs-player, ship-vs-enemy — using the "referee watching the field" framing. Mention the tests use placeholder "pretend enemies" since real enemy art isn't built yet, and that every number is checked against the original 1980 game's own code.

Live demo — run the actual automated proof:
```
npx vitest run --project defender plugins/defender/tests/collision.test.ts
```
Call out the result on screen: 26 tests, all green, running in well under a second. Say: "That's 26 separate scenarios — including the exact boundary case of two things just barely touching versus just barely missing — all passing."

*Fallback:* If the live terminal demo fails or the environment isn't available, switch to Slide 3b (a pre-captured screenshot of the same green 26/26 test run) and narrate it identically.

**Scene 4 — Slide 4: Why This Approach (2:30–3:30)**
Explain the test-first discipline (tests written and proven to fail, *then* made to pass) and the "copy the original game's own math, don't invent a fancier one" decision. Use the analogy: "We didn't build a better metal detector — we built the *same* metal detector the original arcade cabinet used, because a better one might beep at different things."

**Scene 5 — Before/After (3:30–4:00, optional)**
Slide showing: *Before* — no collision system, zero automated proof any hit detection works. *After* — a working, fully tested referee with 26 passing scenarios and every constant traceable to the original source code.

**Scene 6 — Roadmap (4:00–4:40)**
See below.

**Scene 7 — Slide: Questions (4:40–5:00)**
Open floor.
