# Demo Script — df7-5

**Total run time: ~4 minutes**

**Slide 1: Title (0:00–0:15)**
Say: "Today I'm showing the HUD and scanner render for Defender — the score, lives, wave number, and off-screen radar are now visible for the first time."

**Slide 2: Problem (0:15–0:45)**
Say: "Until this story, Defender's radar and HUD data existed under the hood, but nothing painted it to the screen. Players had no way to see their score, how many lives they had left, or spot enemies sneaking up from off-camera." Show a "before" screenshot or describe: a Defender play session with an empty strip where the scanner should be, and no score/lives/wave text anywhere onscreen.

**Slide 3: What We Built (0:45–1:45)**
Say: "We connected the existing off-screen enemy tracking and score tracking to the rendering pipeline. Now players see: their score in the top HUD, a lives icon count, the current wave number, and a scanner bar showing blips for every enemy currently off-camera, positioned to match their real in-world location."

Live demo:
1. In terminal, run: `just serve`
2. Open browser to `http://127.0.0.1:5270/defender/`
3. Start a game and let 2-3 enemies spawn off-screen (or use the "synthetic populated scanner" test fixture if available, per AC4)
4. Point out on screen: the scanner strip at the top showing blip dots for off-camera enemies, and the HUD showing score (e.g. "SCORE 00000"), lives count, and "WAVE 1"
5. Let the game run for ~10 seconds to show the HUD is stable — no flicker, no strobing

**Fallback:** If the live dev server demo fails, switch to **Slide "Before/After"** and show static before/after screenshots of the Defender play screen (no HUD → full HUD + scanner).

**Slide 4: Why This Approach (1:45–2:30)**
Say: "We didn't invent new game logic here — the enemy-tracking math and score/lives tracking already existed and were already tested. This story was purely about drawing what was already being calculated, using our existing color palette and font system so it stays visually consistent with the rest of the game, and matching the original arcade machine's radar layout so it's faithful to the source material."

**Before/After Slide (2:30–3:00)**
Show side-by-side: left side = gameplay with no HUD/scanner visible; right side = same gameplay moment with full HUD (score/lives/wave) and populated scanner strip visible.

**Roadmap Slide (3:00–3:30)**
Say: "This closes out the visual side of two earlier stories — the scanner math and the score tracking — that had been built but never connected to the screen. It also unblocks any future HUD polish work, like end-of-wave messaging or extra-life indicators, since the rendering scaffolding now exists."

**Slide: Questions (3:30–4:00)**
Open floor for questions.
