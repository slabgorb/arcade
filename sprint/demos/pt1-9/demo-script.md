# Demo Script — pt1-9

**Total runtime: ~4 minutes**

**Slide 1: Title (0:00–0:15)**
Say: "Today's update: Tempest's level-select screen now shows you what you're choosing before you commit."

**Slide 2: Problem (0:15–0:45)**
Say: "During playtesting on August 19th, we found that picking a starting level was a total guess — you saw a number, nothing else. No preview of the board, no idea what bonus you'd earn for starting harder. Original 1981 Tempest cabinets showed both. Ours didn't."

**Slide 3: What We Built (0:45–2:00)** — live demo
Run the dev server:
```
just serve
```
Open `http://127.0.0.1:5270/tempest/` in the browser.
- Get to the level-select screen (via the attract mode → start prompt).
- Spin through levels using the input control (arrow keys or configured knob input) and call out on-screen:
  - At **Level 1**: point out the small circular board preview shape.
  - At **Level 2**: spin forward, point out the shape changes to a square.
  - At **Level 3**: spin forward, point out the shape changes to a cross/X, and read the bonus text aloud: **"BONUS 6000"** in red.
- Say: "That number and that shape are not decorative — they're pulled from the exact same code that draws the real board and pays the real bonus once you hit start."

*Fallback if the dev server or live spin-through fails:* Switch to **Slide 5 (Before/After)** and walk through the two static screenshots instead — narrate the same L1/L2/L3 shape-and-bonus story from the images.

**Slide 4: Why This Approach (2:00–2:45)**
Say: "We didn't hand-draw pictures or hard-code a bonus table. The preview and the bonus number both read live from the game's actual level-shape and scoring logic. That means the display can never fall out of sync with what actually happens when you press start — because it's not a copy, it's the same source."

**Slide 5: Before/After (2:45–3:15)**
Show two side-by-side screenshots of the select screen — before (plain number, no shape, no bonus text) and after (shape preview + red "BONUS 6000" line, evenly spaced from the other prompts).

**Slide 6: Roadmap (3:15–3:45)**
Say: "This closes out audit finding SC-011 from our fidelity review. It's one of several playtest-driven fixes going out this sprint alongside Star Wars input and difficulty-selector work."

**Slide 7: Questions (3:45–4:00)**
