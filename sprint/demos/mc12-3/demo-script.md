# Demo Script — mc12-3

**Total runtime: ~6 minutes**

**Slide 1: Title (0:00–0:20)**
Say: "Today I'm walking through a small but meaningful fix to Missile Command's controls — making the aiming feel like the real arcade cabinet." No demo action; just the title slide.

**Slide 2: Problem (0:20–1:15)**
Show the *before* behavior. Open a terminal and start the local dev server:
```
just serve
```
Navigate the browser to `http://127.0.0.1:5270/missile-command/`. Start a game, and (if the old absolute-aim build is still checked out on a branch/tag for comparison) move the mouse a small amount to show the crosshair jumping the exact same distance — a "laser pointer" feel. Narrate: "This works, but it's not how the physical cabinet's trackball feels — there's no weight, no momentum, just direct teleporting." If you don't have the old build handy, skip the live comparison and describe it instead, then move to Slide 5 (Before/After) later for the visual contrast.

**Slide 3: What We Built (1:15–3:00)**
Live demo on the current build (already running from the command above). Click the game canvas to trigger the pointer lock — call out that the cursor disappears (a small "lock" indicator), showing the browser has captured mouse motion. Slowly move the mouse a small amount and show the crosshair moving a small, smoothed amount in response (the story's scaling factor is 0.35 — roughly a third of the raw mouse motion, so a big real-world mouse sweep becomes a controlled, cabinet-like nudge). Show the crosshair stopping cleanly at the edges of the ~256×222 play field (it can't run off-screen). Press Escape to exit the lock, then click again to show the lock re-engaging cleanly with no leftover drift.

**Slide 4: Why This Approach (3:00–4:00)**
No live demo — talk through the reasoning slide: "We reused the exact same trackball-locking mechanism already working well in two other games in this arcade, Centipede and Millipede, instead of building something new. And we didn't touch a single line of the game's core rules — only how mouse input reaches those rules changed. That's why this shipped with very low risk."

**Slide 5: Before/After (4:00–4:45)**
Side-by-side description or two short clips: "before" clip showing direct 1:1 mouse placement; "after" clip showing the locked, scaled trackball motion. If a recorded "before" clip isn't available, use the static description on the slide (see Before/After section below) instead of attempting a live re-demo.

**Slide 6: Roadmap (4:45–5:15)**
Talk through how this fits with the rest of the arcade's control-authenticity work (see Roadmap section below).

**Slide 7: Questions (5:15–6:00)**
Open the floor.

**Fallback plan:** If `just serve` fails to start (port conflict, etc.) or the live demo is otherwise unavailable, skip straight to Slide 5 (Before/After) and present it as static before/after descriptions rather than live footage — the narrative holds without the live click-through.
