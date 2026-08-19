# Demo Script — df5-7

**Total runtime: ~5 minutes**

**Slide 1: Title (0:00–0:20)**
Say: "Today I'm showing you the first time our arcade game's full game loop has been verified running together on screen — not just individual pieces, but the whole experience, including a safety-critical decision we made along the way."

**Slide 2: Problem (0:20–0:50)**
Say: "Each piece of this game — the radar, the score display, the special-move effect, the high-score board — had been built and tested separately. But nobody had confirmed they all worked together, live, the way a player actually experiences them. And for this specific game, we also needed to confirm a safety feature was working correctly."

**Slide 3: What We Built (0:50–2:30) — LIVE DEMO**
Say: "Let me show you the actual game running."

Live demo commands (run from repo root in terminal):
```
just serve
```
Wait for the terminal to show the dev server is up on port 5270, then open a browser to:
```
http://127.0.0.1:5270/defender/
```
Narrate while the game loads and plays:
- Point to the scanner strip at the top: "See these markers? Those are enemies approaching from parts of the battlefield that aren't currently on screen — the radar."
- Point to the score/lives HUD: "Score and remaining lives, always visible."
- Let a wave or two pass: "Watch how the next wave is visibly harder than the last — more enemies, faster."
- Trigger or point out a smart-bomb moment: "This is the smart bomb. Notice it's a freeze-and-fade, not a flash — that's a deliberate accessibility decision, not a bug."
- Show the hall-of-fame screen: "And here's the high-score board, confirming that pathway renders too."

**Fallback if the live demo fails:** Skip to the pre-captured screenshot set (Slide "Before/After" — labeled screenshots of scanner, HUD, smart-bomb freeze-fade, and hall-of-fame entry) and narrate the same points from the static images.

**Slide 4: Why This Approach (2:30–3:30)**
Say: "Two things guided how we verified this. First, we've learned before that a page can 'load successfully' while showing nothing real — so we always compare against a nonsense control page to prove there's real content, not just a response. Second, safety comes before faithfulness to the original 1980s machine. The original may have used a harsher flash for this effect; we chose a softer fade specifically to protect players with photosensitive epilepsy, and today's check confirms that decision is holding up in the actual running game."

**Before/After (3:30–4:00)**
Show side-by-side: an early build with only individual pieces working in isolation vs. today's screenshot with all five elements visible together in one live session.

**Roadmap (4:00–4:40)**
See below.

**Questions (4:40–5:00)**
