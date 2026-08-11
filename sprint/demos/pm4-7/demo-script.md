# Demo Script — pm4-7

**Total runtime: ~4 minutes**

**Slide 1: Title (0:00–0:15)**
Say: "Today I'm showing a small but meaningful change to Pac-Man — how the game responds when you win a level or lose a life."

**Slide 2: Problem (0:15–0:45)**
Say: "Right now, both of those moments happen instantly. Clear the last dot — snap, you're already on the next level. Get caught by a ghost — snap, you're already back playing. Players don't get a beat to register what happened. It's also a rougher, more jarring experience than we want, especially given our commitment to gentle visual transitions."
If live demo of the *old* behavior isn't available (this is a "before" state that no longer exists in the branch), skip straight to Slide 3 and describe it verbally instead.

**Slide 3: What We Built (0:45–2:00)**
Say: "We added a pause — a freeze frame — at both of those moments."
Live demo:
1. Run `just serve` from the repo root.
2. Open `http://127.0.0.1:5270/pac-man/` in a browser.
3. Play until you clear all dots on level 1 (or use dev/test shortcuts if available) — narrate: "Watch — the board freezes here on this exact cleared layout before advancing. No flash, no strobe, just a held still frame."
4. Continue playing and let a ghost catch Pac-Man with lives remaining — narrate: "Same idea here — the death moment holds for a beat before respawning you at the ready position."
5. If lives are reduced to 0, show that game over still happens immediately — no pause — to contrast the two behaviors.

Fallback if the live demo doesn't cooperate (e.g., timing is hard to hit live): switch to Slide "Before/After" and show two short screen recordings captured ahead of time, one of the level-clear freeze and one of the death freeze.

**Slide 4: Why This Approach (2:00–2:45)**
Say: "We didn't build new pause logic from scratch — we connected these two moments into a phase-tracking system we'd already built and tested in an earlier piece of work. That kept this change small and low-risk. We also handled an edge case: if you clear the last dot and get hit by a ghost in the very same instant, the game correctly treats that as a death, not a win."

**Before/After (2:45–3:15, optional)**
Show side-by-side: old instant-cut clip vs. new freeze-then-transition clip for both level-clear and death.

**Roadmap (3:15–3:45)**
Say: "This is one piece of a broader effort to make Pac-Man's transitions feel intentional rather than abrupt, and it builds directly on the no-flash commitment we made earlier this sprint."

**Questions (3:45–4:00)**
