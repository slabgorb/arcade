# Demo Script — pm6-2

**Total run time: ~4 minutes**

**Slide 1: Title (0:00–0:15)**
Say: "Today I'm showing the first coffee-break cutscene in our Pac-Man clone — the scene players get after clearing level 2."

**Slide 2: Problem (0:15–0:45)**
Say: "Our game already paused between rounds, but the original arcade game rewards the player with an animated cartoon at that pause — Blinky chases Pac-Man, then a giant Pac-Man chases Blinky back. That's missing until today, and it's one of the most iconic moments in the whole game."

**Slide 3: What We Built (0:45–1:30)**
Say: "We built a small animation engine plus the actual Act 1 scene, both matched frame-for-frame against the original 1980 game code." Show the citation table briefly if audience is technical-curious — otherwise move straight to demo.

**Live demo (1:30–3:00):**
1. In terminal, start the dev server:
   ```
   just serve
   ```
2. Open `http://127.0.0.1:5270/pac-man/` in the browser.
3. Play through to clearing level 2 (or use the existing debug/level-skip control if the game exposes one — check with Dev before the demo for the fastest path to round 2's clear).
4. Narrate live as it plays: "Here's Pac-Man walking in... now Blinky picks up the chase... watch — right here the ghost turns blue and scared... and now here comes big Pac-Man for the chase back."
5. Point out: no screen flash, no strobing — just the two characters moving and animating.

**Fallback if live demo fails:** Show **Slide 5 (Before/After)** — a screen recording/GIF of the same sequence captured ahead of time, and narrate over it identically.

**Slide 4: Why This Approach (3:00–3:30)**
Say: "We didn't guess at the timing — we pulled it directly from the original game's source code, line by line, so this is authentic, not a re-creation. Every number is traceable, and we built safety nets so it can't quietly drift wrong later."

**Slide 5: Before/After (3:30–3:45)**
Show a static side-by-side: "Before" = frozen dark screen during the pause; "After" = a mid-chase frame from the cutscene.

**Roadmap (3:45–4:00)**
Say: "This is Act 1 of three. Acts 2 and 3 — including the actual 'ripped ghost' scene players may remember — are coming in the next story."

**Slide 7: Questions**
