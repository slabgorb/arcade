# Demo Script — pm4-9

**Total runtime: ~4 minutes**

**Slide 1: Title (0:00–0:15)**
Introduce: "Pac-Man's attract screen — making the demo actually invite you to play."

**Slide 2: Problem (0:15–0:45)**
Show a screenshot (or the live app before this change, if available) of the silent demo with no prompt and the high-score text overlapping the maze. Say: "The ghosts were chasing Pac-Man, but nothing on screen told you this was a game you could join."

**Slide 3: What We Built (0:45–2:30) — LIVE DEMO**
1. In terminal, run:
   ```
   npm install
   just serve
   ```
2. Open a browser to `http://127.0.0.1:5270/` — this is the arcade lobby. Point out Pac-Man now appears in the rotating showcase carousel alongside the other eight games (it was previously excluded).
3. Click into Pac-Man, or navigate directly to `http://127.0.0.1:5270/pac-man/`.
4. Let the demo run for ~10 seconds without touching any key. Narrate what's on screen:
   - Top-left: `SCORE 0`
   - Top-center: `HIGH SCORE` with the persisted best score beneath it (or `0` on a fresh browser profile)
   - Center of the maze: the yellow **"PUSH START BUTTON"** prompt, steady text, no blinking
   - Bottom-left: `LIVES 3`, bottom-right: `LEVEL 1`
5. Point out the ghosts are eating Pac-Man automatically as part of the self-playing demo — when that happens, note the maze visibly resets to a full board and the demo keeps looping, so the display is never "stuck."

*Fallback if the live demo fails to load or the dev server won't start:* Show **Slide 3b** — a pre-captured screenshot of the Pac-Man attract screen (title banner + repositioned HUD) saved from the team's own Playwright playtest run, and narrate the same points from the static image.

**Slide 4: Why This Approach (2:30–3:15)**
Explain the ROM-fidelity choice (banner text and score layout pulled from the original game's own data) and the accessibility decision (no default fake high scores, no flashing — steady text only, because the product owner has photosensitive epilepsy).

**Roadmap (3:15–3:45)**
Reference what came right before (the self-playing demo itself) and what's still ahead (deciding whether clearing the board, not just losing, should also reset the demo — currently only a Pac-Man "death" resets it).

**Questions (3:45–4:00)**
