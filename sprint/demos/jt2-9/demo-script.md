**Total runtime: ~9 minutes**

**Slide 1: Title (0:00–0:30)**
Say: "Today's story is a playtest follow-up on Joust — real bugs a real player found in the first two-player demo, and what we did about each one."

**Slide 2: Problem (0:30–1:30)**
Show the "before" screenshot `jt2-9-render.png`. Point out the character standing at bottom-center — call out that feet visually rest on the ledge here already look close, but explain verbally: "this is the base render before the fix — every sprite type had its own few-pixel sink depending on its art, invisible until you compare characters side by side." Then show `jt2-9-players.png` and point at the small, dim sprite floating alone at the bottom-left corner, off the platform — "that's Player 2. It's not sitting on a ledge, it's not colored distinctly from the environment, and it's disconnected from where Player 1 is." State the four bugs verbally: feet clipping, no turning, joust-feel confusion, Player 2 render.

**Slide 3: What We Built (1:30–3:30)**
Walk through the four fixes in plain language (use the "What Changed" bullets above verbatim as talking points). Hold up `jt2-9-fixed.png` at the end of this slide and keep it on screen — Player 1 (yellow rider) stands correctly on the bottom platform, Player 2 (now rendered in a distinct blue) stands correctly on the middle platform, both clearly seated on their ledges.

**Slide 4: Why This Approach (3:30–4:30)**
Make the "verify before you fix" point: the joust-feel bug looked like a joust-rule bug but wasn't — re-checking the original game's logic first prevented a wrong fix. Use this as the one memorable line: "we almost fixed the wrong thing, and checking the source data first is what caught it."

**Live Demo (4:30–7:00):**
```
cd joust
npm install
npm run dev
```
Open `http://localhost:5279/` in a browser. Let the attract-mode demo run for ~15 seconds so both riders appear on screen — point out both are now visibly distinct colors and both sit flush on their platforms (no floating, no sinking). Then tap the left/right arrow keys during a grounded moment and call out the visible turn/flip as the character changes direction — this is the turning fix landing live.

**Fallback if the dev server won't start or the port is already in use:** skip straight to the Before/After slide below and narrate off the three static screenshots (`jt2-9-render.png`, `jt2-9-players.png`, `jt2-9-fixed.png`) instead of the live browser — the visual story is the same either way.

**Slide 5 — Before/After (7:00–7:45)**
Show the before/after screenshots side by side (see Before/After section below) and narrate the specific deltas: "17-pixel float, now a 1-pixel seat"; "one indistinct sprite off the platform, now two distinctly colored, correctly seated riders."

**Slide 6: Roadmap (7:45–8:15)**
Cover the roadmap points below — this story closes the loop the very first playtest opened, and flags two small follow-ups for later stories rather than gold-plating them now.

**Slide 7: Questions (8:15–9:00)**
Open the floor.