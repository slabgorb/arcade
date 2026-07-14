**Total runtime: ~5 minutes.**

**Slide 1: Title (0:00–0:20)**
Say: "Today I'm showing 'The Framing' — a fidelity fix that makes our Tempest clone's playfield move exactly like the 1981 original." Advance to Slide 2.

**Slide 2: Problem (0:20–1:00)**
Say: "On the real cabinet, the tube isn't fixed in the center of the screen — it shifts around depending on the level, and slides smoothly into place when a new level starts. Our clone had neither effect: dead-center every time, and an instant snap on level change." No live demo yet — stay on the slide.

**Slide 3: What We Built — LIVE DEMO (1:00–2:45)**
Say: "Let me show you the difference directly in the running game."

Terminal commands (run before the meeting or live, narrating as it starts):
```
cd tempest
npm run dev
```
Then open `http://localhost:5273/` in a browser.

Demo steps:
1. On the title/level-select screen, tap the **Right Arrow** key repeatedly to dial the level selector up. Call out the on-screen level number as you go — this mirrors the rotary knob on the original cabinet.
2. Select **Level 1** and start the game. Point out the tube is roughly centered — Level 1's offset is small.
3. Return to the level-select screen, dial up to **Level 13**, and start. This level has the single largest screen offset in the ROM table — point out how far the tube has visibly shifted from center compared to Level 1.
4. Let the level complete (or note where a spike/enemy pushes you off) and watch the transition into the next level — call out the smooth glide of the tube sliding to its new position, rather than a hard jump cut.

Fallback if the live demo hiccups (dev server won't start, browser issue, etc.): switch to **Slide "Before/After"** and show the paired screenshots/GIF of Level 1 vs. Level 13 framing, plus the recorded transition clip. If no visual assets are available live, fall back to narrating the automated proof instead: run
```
npx vitest run tests/core/tp1-31.screen-z.test.ts tests/core/tp1-31.camera-slide.test.ts tests/shell/tp1-31.framing.test.ts
```
and show the terminal output — **13 tests passed**, each one pinned to an exact original-source value for one of the 16 levels.

**Slide 4: Why This Approach (2:45–3:30)**
Say: "We didn't estimate these positions — we extracted them directly from the original 1981 assembly code, byte by byte, for all 16 levels. A first attempt actually got the math wrong by a factor of 6.4x, which we caught with a dedicated test before it ever shipped. That test still runs on every future change, so that specific mistake can never come back unnoticed."

**Slide 5: Before/After (3:30–4:00)**
Show the side-by-side: default-centered tube (old behavior) vs. Level 13's shifted tube (new behavior), plus a short clip of the level-start glide.

**Slide 6: Roadmap (4:00–4:30)**
See Roadmap & Integration section below — cover the connection to the earlier "far ring" work and the upcoming dive-camera story.

**Slide 7: Questions (4:30–5:00)**
Open the floor.