# Demo Script — sw11-2

**Total runtime: ~4 minutes**

**Slide 1: Title (0:00–0:15)**
Say: "Today I'm walking through a visual bug fix in our Star Wars trench-run sequence — turrets that were floating off the wall and aiming the wrong direction."

**Slide 2: Problem (0:15–0:55)**
Say: "In the trench-run scene, defense turrets are mounted on both side walls. They're supposed to sit flush against the wall and point their barrels into the channel, toward the player. Instead, they were floating off the wall surface, and on one wall the barrel was pointing backward — away from where it should be aiming."
Show: a static side-by-side screenshot (captured ahead of time) of the broken turret floating off the wall vs. the corrected flush turret. If no screenshot is available, skip to Slide 3 and narrate the description instead.

**Slide 3: What We Built (0:55–2:00)**
Say: "The turret's shape was always correct — flat base, one barrel. What was missing was the instruction telling the game which way to rotate that shape depending on which wall it's on. We restored that per-wall mirroring logic."
Live demo: start the dev server and load the trench scene.
```
just serve
```
Then in a browser, navigate to `http://127.0.0.1:5270/star-wars/` and progress into the trench-run sequence (or use the level's normal entry point) to visually show turrets on both walls sitting flush with barrels facing into the channel.
Fallback: if the live server doesn't come up cleanly or the trench sequence isn't reachable in the demo build, fall back to Slide 6 (Before/After) with the prepared screenshots.

**Slide 4: Why This Approach (2:00–2:45)**
Say: "We didn't guess at the fix — we went back to the original 1983 arcade source code, which explicitly defines the left gun and right gun as mirror images of each other. That gave us an exact target. Since the 3D shape itself was fine, we only touched the positioning logic, keeping the change small and low-risk."

**Slide 5: Before/After (2:45–3:15)**
Show: the two screenshots side by side — "Before: turret floats off wall, barrel misaimed" / "After: turret flush against wall, barrel aimed into trench on both sides."

**Slide 6: Roadmap (3:15–3:40)**
Say: "This closes out a rendering-fidelity item in the Star Wars epic. It also gave us a reusable pattern — checking wall-mounted fixtures for correct per-side orientation — that we already applied to two related trench elements this same pass."

**Slide 7: Questions (3:40–4:00)**
Open floor.
