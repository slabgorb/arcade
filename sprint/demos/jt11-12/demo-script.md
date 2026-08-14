# Demo Script — jt11-12

**Total runtime: ~4 minutes**

**Slide 1 — Title (0:00–0:15)**
Say: "This is jt11-12, a small cleanup story for Joust's enemy AI and terrain code — no new features, just fixing two loose ends left over from earlier destruction-related work."

**Slide 2 — Problem (0:15–0:55)**
Say: "When we added the ability to destroy cliffs during a match, we updated one of two places that check 'is this cliff solid' — the horizontal one. We missed the vertical one, the one enemies use right before launching a climb. So an enemy could still refuse to climb through a gap that the player had just blown open. Separately, two lookup functions that do almost the same math had drifted into two independent copies, which is a bug waiting to happen."
No live demo needed for this slide — it's context-setting.

**Slide 3 — What We Built (0:55–2:15)**
Say: "Two fixes. First, the vertical climb check now reads the same live destruction state the horizontal check already used — same rule, same source of truth, now applied everywhere it needs to be. Second, we merged the two copy-pasted column-lookup calculations into one shared helper, so they can't drift apart again."

Live demo — run the destruction-aware test suite to show the new behavior is covered and passing:
```
npx vitest run --project joust -t "cliffBlocksClimb"
```
Point out: this test file exercises the case where a cliff has been destroyed and confirms the enemy no longer treats it as blocking the climb — this is the exact scenario that was broken before this story.

Then show the full determinism/replay suite is still green (proving item 2's refactor changed nothing observable):
```
npx vitest run --project joust
```
Call out the pass count in the terminal output (expect all joust project tests green, no changes to counts from before this story).

**Fallback:** If the live terminal run fails or is unavailable, switch to Slide 5 (Before/After) and walk through the code diff screenshots instead — the diff itself (in `plugins/joust/src/core/enemy.ts` and `plugins/joust/src/core/flight.ts`) tells the same story without needing a live run.

**Slide 4 — Why This Approach (2:15–2:55)**
Say: "We didn't invent a new pattern here — we reused the exact mechanism from story jt11-5, which already solved this same 'stale terrain data' problem for the horizontal case. For the duplicated math, extracting one shared helper is the standard fix: same behavior today, one less place for the two functions to quietly disagree tomorrow."

**Slide 5 — Before/After (2:55–3:30)**
Walk through the Before/After table below verbally — emphasize: "same answers, fewer places that could give different answers by accident."

**Slide 6 — Roadmap (3:30–3:50)**
Say: "This closes out the last of the destruction-consumption follow-ups from jt11-5's review — the middle item on that list turned out to already be handled by a later story, jt11-18, so we didn't redo it. With this, every enemy decision path is now destruction-aware, not just the horizontal one."

**Slide 7 — Questions (3:50–4:00)**
Open floor.
