# Demo Script — jt9-25

**Total runtime: ~5 minutes**

**Scene 1 (0:00–0:30) — Slide 1: Title**
Open on the title slide ("Joust: The Egg Hatches Right"). One line: "A visual bug fix and a hidden animation, recovered from the original 1982 game data."

**Scene 2 (0:30–1:15) — Slide 2: Problem**
Say: "In the arcade original, when an egg matures it doesn't just pop into an enemy — it wiggles, pauses, then cracks four times before the enemy flies out. Our clone was skipping straight to the enemy. And separately, some egg artwork that's supposed to shift left on screen was rendering shifted right instead, because of how we were reading one number from the game's sprite data." Show the before screenshot/gif: an egg instantly becoming a buzzard with no animation.

**Scene 3 (1:15–2:15) — Slide 3: What We Built**
Say: "We found the original hatching-animation table in the game's source code, transcribed all 8 rows, and built a player that walks through it exactly — wiggle, pause, crack ×4, launch. That's 112 frames, about 1.9 seconds at 60fps, matching the original timing exactly." Show the after gif: the egg visibly performing the hatch sequence before the buzzard appears.

Live demo:
```bash
just serve
```
Navigate to `http://127.0.0.1:5270/joust/`, play until an egg matures, and pause on a hatching frame to point out the wiggle/crack animation frames. If the live demo isn't available or an egg doesn't hatch in time, fall back to **Slide "Before/After"** and show the two side-by-side gifs prepared in advance.

**Scene 4 (2:15–3:00) — Slide 4: Why This Approach**
Say: "We didn't estimate this — we located the exact original data table driving the sequence and transcribed it. Then we split the work: fix the low-level decoding bug first, in its own commit, proven to touch rendering only. Then build the animation on top of that verified fix. That way each piece could be checked independently before combining them."

**Scene 5 (3:00–3:45) — Before/After slide**
Present the before/after table (below). Emphasize the collectibility fix: "Previously, a player could grab an egg's points during the split-second it should already be committed to hatching. That's now closed — matching the original machine."

**Scene 6 (3:45–4:15) — Roadmap slide**
Say: "This closes out the egg-lifecycle work for this sprint and sets up the next piece: [sibling story reference below]."

**Scene 7 (4:15–5:00) — Questions**
Open floor.
