# Demo Script — df2-6

**Total run time: ~4 minutes**

**Slide 1: Title (0:00–0:15)**
Say: "Today I'm showing a small but important fix to Defender's opening screen — catching and correcting a graphics orientation bug before we build any gameplay on top of it."

**Slide 2: Problem (0:15–0:45)**
Show the `before-charset-garbled.png` image from `sprint/demos/df2-6/`. Say: "This is what the Defender title screen looked like before this fix — the letters are scrambled because the game was reading its graphics data in the wrong direction, like reading a spreadsheet by column instead of by row."

**Slide 3: What We Built (0:45–2:00)**
Show `after-still-frame.png`. Say: "And here's the corrected screen — you can clearly read 'DEFENDER' across the top, the green planet surface along the bottom, and the player's ship in the middle, all rendered in the correct upright orientation and original color palette."

Live demo portion — run the dev server and pull up the real page:
```
just serve
```
Then open a browser to `http://127.0.0.1:5270/defender/` and show the live rendered still frame matches the after-screenshot.

As a control, also navigate to `http://127.0.0.1:5270/nonsense/` and point out it falls back to the lobby page — proving the Defender page genuinely is its own distinct content, not just a generic "200 OK" placeholder.

*Fallback: if the dev server doesn't come up live, skip straight to showing `sprint/demos/df2-6/control-lobby-fallback.png` alongside `after-still-frame.png` side by side — same proof, pre-captured.*

**Slide 4: Why This Approach (2:00–2:45)**
Say: "We deliberately paused gameplay work to verify the visuals first. That's a standing rule on this project — confirm the screen looks right, in the right colors, before adding physics or movement. It's much cheaper to catch a pixel-ordering bug on a still picture than after the ship is flying around."

**Before/After (2:45–3:15)**
Show `before-charset-garbled.png` and `after-still-frame.png` side by side one more time for a clean visual contrast, plus mention: "307 out of 307 Defender tests pass, and all 498 cross-game orchestrator tests pass — nothing else in the game was disturbed by this fix."

**Roadmap (3:15–3:45)**
Cover the Roadmap & Integration talking points below.

**Questions (3:45–4:00)**
Open the floor.
