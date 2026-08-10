# Demo Script — mc10-4

**Total runtime: ~3 minutes**

**Scene 1 — Slide 1: Title (0:00–0:15)**
Open on the title slide ("Missile Command: Per-Wave Palette Fix — mc10-4"). One sentence: "A one-line fix that makes the battlefield visibly change as the game progresses."

**Scene 2 — Slide 2: Problem (0:15–0:45)**
State plainly: "The game was built to change colour as waves advance — but it never did. Every wave looked like wave 1." If you have a captured screenshot of wave 1 and wave 17 side-by-side both showing the same black sky, show it here as the "before" evidence. If no screenshot is available, skip straight to narrating the bug and rely on the live demo in Scene 4 to prove it instead.

**Scene 3 — Slide 3: What We Built (0:45–1:15)**
Explain the fix in one sentence: "We passed the player's current wave number into the drawing code — one extra piece of information the colour engine was already built to use." Show the diff snippet on-screen:
```
- drawFrame(context, game, canvas.width, canvas.height)
+ drawFrame(context, game, canvas.width, canvas.height, game.wave)
```

**Scene 4 — Slide 4: Why This Approach (1:15–1:45)**
"We didn't rebuild anything — the colour system already existed from a prior story. This was purely about connecting live game data to it."

**Live demo (1:45–2:45):**
1. In terminal, from the repo root, run:
   ```
   just serve
   ```
2. Open `http://127.0.0.1:5270/missile-command/` in a browser.
3. Play (or use dev tools to fast-forward, if available) until the wave counter shows a later wave (e.g. wave 5 or higher).
4. Point out the sky/background colour has visibly shifted away from the wave-1 palette.
5. **Fallback if live demo fails:** show the automated test output instead — run `npx vitest run --project missile-command -t "mc10-4"` in terminal and show the two passing assertions: "the FROZEN 4-arg paint... yields the WAVE-1 sky" and "the WIRED paint... yields the wave-17 sky, which DIFFERS from wave 1." Narrate: "This test proves the fix — before the change, wave 17 painted with wave-1 colours; after, it paints with its own."

**Scene 5 — Before/After slide (2:45–3:00)**
Show the before/after table (below) for 10 seconds, no narration needed beyond "this is the concrete before and after."

**Scene 6 — Roadmap (3:00–3:15)**
One sentence: "This closes out the visual foundation work for Missile Command's wave progression."

**Scene 7 — Questions (3:15+)**
Open floor.
