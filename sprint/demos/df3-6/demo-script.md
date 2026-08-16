# Demo Script — df3-6

**Slide 1: Title (0:00–0:15)**
Brief intro: "Defender's ship now flies." No technical detail — just frame the story: the game went from a static picture to a live, playable scene.

**Slide 2: Problem (0:15–1:00)**
State the problem: the Defender screen was frozen — a single unmoving frame — despite five completed engineering stories' worth of flight, scrolling, and weapons logic sitting unused. Show a static screenshot of the "before" state if available (the pre-change frozen frame) or describe it verbally: "This is what testers saw no matter what key they pressed."

**Slide 3: What We Built (1:00–3:30)**
This is the live-demo slide.
1. Open a terminal and start the local game server:
   ```
   just serve
   ```
   Wait for the "ready" output (a few seconds), confirming the dev server is running on `http://127.0.0.1:5270/`.
2. In a browser, navigate to `http://127.0.0.1:5270/defender/`.
3. Point out on screen: the ship sprite over a field of scrolling stars, a green planet surface along the bottom.
4. Hold the thrust key (`D` or the right arrow) for 3 seconds — narrate: "Watch the stars scroll past — that's the world moving under the ship, not the ship moving off-screen. The ship stays slightly ahead of center in the direction it's facing, just like the original 1980 arcade machine."
5. Tap the reverse key (`A` or left arrow) — the ship flips to face the other direction and the scroll direction follows.
6. Press up/down (`W`/`S` or arrow keys) — show the ship moving vertically and stopping cleanly at the top and bottom of its flight lane.
7. Press fire (space or enter) — a laser streak fires and travels across the screen.
8. **Proof-of-life comparison:** open a second tab to a deliberately broken address, `http://127.0.0.1:5270/defender-xyzzy/`, and show it falls back to the arcade's lobby menu — visibly different content from the live, moving `/defender/` page. Narrate: "This proves we're not just getting a generic 'page loaded OK' response — the game page is genuinely different, and genuinely animating."
9. **Fallback if the live demo doesn't cooperate** (server won't start, port conflict, etc.): skip to the pre-captured screenshot stored with this story (ship over the starfield, laser streak visible, green terrain along the bottom) and narrate the same beats from the still image, noting it was captured from an identical live browser session during testing.

**Slide 4: Why This Approach (3:30–4:30)**
Explain the reuse-not-rebuild decision and the "thinking vs. drawing" separation in plain terms (see Why This Approach above). Mention the nonsense-URL comparison technique as the team's way of proving real change, not just "it loads."

**Before/After (4:30–5:00, optional):**
Side-by-side: "Before" = static screenshot, same frame forever, keys have no visible effect. "After" = the live browser demo (or fallback screenshot) with visible motion.

**Roadmap (5:00–5:45):**
See Roadmap & Integration below — cover the two known follow-up refinements and how this unlocks enemy work next.

**Questions (5:45+):**
Open floor.
