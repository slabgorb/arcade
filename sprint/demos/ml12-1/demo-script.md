# Demo Script — ml12-1

**Total runtime: ~5 minutes**

**Scene 1 — Slide 1: Title (0:00–0:20)**
Say: "Today's fix: the Millipede scoreboard was getting run over by the train at the start of every wave. Here's what broke, why, and how we fixed it — with proof."

**Scene 2 — Slide 2: Problem (0:20–1:00)**
Say: "During a routine playtest, the owner caught the train — that's the segmented caterpillar enemy — spawning directly on top of the score display. It's the same shape of bug the team already fixed once in Centipede, so it was recognizable immediately, but Millipede needed its own investigation." Show the "before" screenshot/description: score/lives/level text obscured by overlapping sprite pixels along the top strip of the screen.

**Scene 3 — Slide 3: What We Built (1:00–2:15)**
Say: "We added a simple checkpoint to the drawing code: before stamping any train segment onto the screen, ask 'is this position inside the reserved scoreboard strip?' If yes, skip it." Live demo (terminal):
```
just serve
```
Then open a browser to `http://127.0.0.1:5270/millipede/` and let a wave start — narrate that the train now marches in fully below the score line, with no overlap, exactly as the wave begins.
*Fallback if the live server doesn't come up cleanly:* skip to the static "Before/After" slide and show the two pixel-count numbers below instead of the live browser.

**Scene 4 — Slide 4: Why This Approach (2:15–3:15)**
Say: "We didn't move the train's starting point, because the original 1982 game code confirms that starting point was always correct. The real bug was that nothing checked the scoreboard boundary before drawing. So we borrowed the original game's own 'off the top of the screen' rule and used it as a drawing gate — the same fix pattern already proven in Centipede." Show the two cited constants side by side: the (correct, unchanged) spawn value and the (new) off-screen boundary value the fix uses.

**Scene 5 — Before/After (3:15–4:00)**
Say: "We measured this with actual pixels, not just a visual glance." Show the numbers: **523 scoreboard pixels overlapped by the train before the fix, 0 after** — measured directly against the shipped rendering code, with a control run confirming the count really does jump back to 523 when the fix is removed (proving the check isn't a false positive).

**Scene 6 — Roadmap (4:00–4:30)**
Say: "This same checkpoint can be reused. We already found that several enemy types — bees and other flying insects — enter the screen at the same risky starting row and are not yet gated. That's flagged as fast-follow work using the exact same fix we just built."

**Scene 7 — Questions (4:30–5:00)**
Open the floor.
