# Demo Script — SH3-4

**Total time: ~4 minutes**

**Scene 1 — Slide 1: Title (0:00–0:15)**
Open on the title slide. State: "Today's update: Pac-Man now shares its screen-display code with the rest of the arcade, and gets a sharper picture on modern screens as a result."

**Scene 2 — Slide 2: Problem (0:15–0:45)**
Present the problem in plain terms: Pac-Man built its own custom code to find the screen and resize it, and that resize code was stuck at standard sharpness — it never checked the player's actual screen resolution. Every other game already had this solved. Show no live demo here; stay on the slide.

**Scene 3 — Slide 3: What We Built (0:45–1:45)**
Explain the swap: Pac-Man now uses the arcade's shared "mount the screen" and "resize the screen sharply" tools, the same ones asteroids, star wars, and tempest already use — while deliberately keeping its own pixel-perfect scaling logic so the game still looks like a classic arcade cabinet, not a smoothed-out modern game.

*Live demo — terminal:*
```
just serve
```
Then open a browser to:
```
http://127.0.0.1:5270/pac-man/
```
Resize the browser window narrower and wider a few times. Call out: "Notice the maze stays perfectly centered and the pixels stay crisp and blocky at every size — that's the part we kept unchanged."

*Fallback:* If the dev server doesn't start or the browser demo has issues, skip straight to the Before/After slide (Scene 5) and narrate from the prepared screenshots instead.

**Scene 4 — Slide 4: Why This Approach (1:45–2:30)**
Explain the "share the mechanism, keep the game's own numbers" rule, and highlight the pause-menu investigation as an example of verifying before forcing a change — the team checked the assumption, found it didn't apply, and correctly left that part of the code alone rather than shoehorning in a feature that wasn't real.

*Optional live demo — terminal (if time allows):*
```
npx vitest run --project pac-man
```
Call out the result: all 277 tests pass, confirming nothing else in the game changed behavior.

*Fallback:* If the test run is slow or fails to display cleanly, state the result verbally ("277 out of 277 tests passing, verified before this went out") and move on — do not wait on the terminal.

**Scene 5 — Before/After (2:30–3:15)**
Show two side-by-side screenshots of the Pac-Man maze on a high-resolution display: "Before" (soft/standard sharpness, capped resolution) and "After" (crisper edges, same layout and centering). Emphasize: "Same game, same feel, sharper picture — free upgrade for anyone on a high-resolution screen."

**Scene 6 — Roadmap (3:15–3:45)**
Cover where this fits in the larger cleanup effort (see Roadmap section below).

**Scene 7 — Questions (3:45–4:00)**
Open the floor.
