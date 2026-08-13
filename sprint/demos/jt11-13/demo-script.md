# Demo Script — jt11-13

**Total time: ~4 minutes**

**Slide 1: Title (0:00–0:20)**
Open on the title slide ("High-Score Entry Echo: Joust"). One sentence: "Today we're closing a gap in the Joust high-score screen — players now see their initials as they type them."

**Slide 2: Problem (0:20–1:00)**
Show the "before" state described in the Problem Statement. Say: "Previously, a player who got a high score would hit the initials-entry screen, start typing, and see nothing happen — no letters, no cursor. It looked frozen." If you have the pre-fix build available, this is the moment to show a screenshot or short clip of the blank entry screen with keys being pressed and nothing appearing; otherwise, describe it verbally and move to Slide 3.

**Slide 3: What We Built (1:00–2:30) — LIVE DEMO**
Switch to terminal and run:
```
just serve
```
Then open `http://127.0.0.1:5270/joust/` in a browser.
- Play (or use a known high-score-triggering save state if available) until you trigger the high-score entry screen.
- Type three letters, e.g. `J`, `T`, `1` — narrate: "Watch the first box — as I press J, it appears immediately, and the arrow cursor moves to the second slot."
- Point out the two specific details called out in the code: the padded blank slots for untyped letters, and the arrow-shaped cursor glyph over the active slot.

**Fallback if the live demo fails (e.g., can't reliably trigger a high score in the time available):** Switch to Slide 3b, a pre-captured screenshot of the entry screen mid-typing (e.g., "JT_" with the cursor arrow over the third slot), and narrate the same two details from the static image.

**Slide 4: Why This Approach (2:30–3:15)**
Explain the ROM-accuracy angle in plain terms: "The team didn't invent this cursor behavior — they pulled it directly from the original 1982 Joust source code, so this isn't just 'a cursor,' it's the same cursor the arcade cabinet used." Mention it was built as a 2-point story with dedicated tests to lock the behavior in place.

**Roadmap (3:15–3:45)**
One slide, see outline below — frame this as part of the broader push to make every on-screen moment in Joust match the original cabinet, with the visual polish check still pending human review.

**Questions (3:45–4:00)**
Open the floor.
