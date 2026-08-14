# Demo Script — df1-7

**Total runtime: ~3 minutes**

**Scene 1 — Slide 1: Title (0:00–0:15)**
Say: "Quick fix to keep our project's own documentation honest with itself — the games roster count in CLAUDE.md." Advance to Slide 2.

**Scene 2 — Slide 2: Problem (0:15–0:45)**
Say: "Our CLAUDE.md file is the master reference every engineer and AI coding assistant reads first. It said we have 'nine faithful clones — five vector and four raster games.' But if you actually counted the names listed in that same sentence, there were ten — and an eleventh game, Millipede, wasn't named at all, even though it's live and shipped."
Live demo: open a terminal and run:
```
git show df1-5:CLAUDE.md | grep -n "faithful clones"
```
This shows the old, stale line for contrast. If this command fails (e.g., tag/commit not available in the demo environment), fall back to Slide "Before/After" instead and read the before/after text aloud.

**Scene 3 — Slide 3: What We Built (0:45–1:30)**
Say: "We corrected the count to eleven clones, six raster, and inserted Millipede into the sentence right after Centipede — its natural sibling — so the list still reads cleanly."
Live demo: run
```
git show HEAD:CLAUDE.md | grep -n "faithful clones" -A 3
```
This should print the corrected line: "eleven faithful clones — five vector: ... — and six raster: centipede (1981), millipede (1982), ... " If the repo state doesn't have this at HEAD, switch to Slide 4 (Before/After) and read the diff shown there.

**Scene 4 — Slide 4: Why This Approach (1:30–2:00)**
Say: "This is a one-point bugfix — the smallest safe change. But rather than stopping there, we filed a follow-up story, df1-9, because we found two more stale spots (a README build comment and a hosting table) and — more importantly — there was no automated guard stopping this drift from happening again the next time a game is added."

**Scene 5 — Before/After slide (2:00–2:25)**
Show the before/after table (below) side by side. No live demo needed here — just narrate the diff.

**Scene 6 — Roadmap slide (2:25–2:50)**
Say: "df1-9 is now queued in the backlog — it will add a test that automatically checks the roster count against the real, wired-up list of games, so this can't silently go stale a third time."

**Scene 7 — Questions slide (2:50–3:00)**
Open floor for questions.
