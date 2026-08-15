# Demo Script — jt11-17

**Total runtime: ~4 minutes**

**Slide 1: Title (0:00–0:15)**
- Say: "Today's story is a two-point bug fix on Joust's attract screen — the kind of change that's small in code but big in first-impression feel."

**Slide 2: Problem (0:15–1:00)**
- Say: "The attract screen says 'PRESS 1 OR 2 TO START.' Before this fix, pressing 1 or 2 didn't start the game — it took you to a second screen that asked the same question again. Anyone who's played this cabinet in the last sprint saw that double-ask."
- Show: A screenshot or the live attract screen at `http://127.0.0.1:5270/joust/` — point at the "PRESS 1 OR 2 TO START" text.

**Slide 3: What We Built (1:00–1:45)**
- Say: "We made pressing 1 or 2 do exactly what it says — start the game immediately, with the player count you actually pressed. No re-ask."
- Live demo, in a terminal, from the repo root:
  ```
  just serve
  ```
  Then in a browser, navigate to `http://127.0.0.1:5270/joust/`.
  - Wait for the attract screen to appear (loops automatically after a few seconds if idle).
  - Press **1** on the keyboard → a one-player game should start immediately, showing exactly one knight on screen.
  - Refresh, wait for attract to reappear, press **2** → a two-player game should start immediately, showing two knights.
  - **Fallback:** if the dev server doesn't come up or the browser demo hiccups, skip to a static screenshot of the one-player game in progress (one knight, HUD showing "1 PLAYER") and narrate the before/after verbally instead.

**Slide 4: Why This Approach (1:45–2:30)**
- Say: "Rather than build something new, we pointed the attract button-press at logic that already existed and was already proven — the exact same 'start the game with N players' code used at the second screen. Minimal change, minimal risk, fully tested before it shipped."

**Optional Before/After (2:30–3:00)**
- Show two side-by-side flow diagrams or screenshots:
  - Before: Attract → press 1 → Select screen ("1 or 2 players?") → press 1 again → Game starts.
  - After: Attract → press 1 → Game starts.

**Roadmap (3:00–3:30)**
- Say: "This closes out the attract-screen entry point. A related entry point — starting from the title screen — still goes through that second screen today, and that's intentional for now. A follow-up story may unify the two so every 'start' button behaves the same way everywhere in the game."

**Questions (3:30–4:00)**
