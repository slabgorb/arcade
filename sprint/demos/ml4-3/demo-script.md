# Demo Script — ml4-3

**Total runtime: ~5 minutes**

**Scene 1 — Slide 1: Title (0:00–0:20)**
Open on the title slide: "Millipede: Earwig, Inchworm & Bee Come to Life." State plainly: "Today we're showing three creatures from the original 1982 Millipede arcade game, rebuilt faithfully in our browser clone."

**Scene 2 — Slide 2: Problem (0:20–0:55)**
Explain the gap: three of the game's creatures — the earwig, inchworm, and bee — previously had no movement or scoring logic. Show a quick before/after visual if available, or simply state: "Without these, the board felt half-empty compared to the real cabinet."

**Scene 3 — Slide 3: What We Built (0:55–2:30)**
This is the live demo. In terminal, run:
```
just serve
```
Then open a browser to `http://127.0.0.1:5270/millipede/` (adjust the path if millipede isn't yet registered at that prefix — confirm via `src/host/registry.ts` beforehand).

Walk through:
1. Point out the earwig starting on screen and moving across it.
2. Point out the inchworm entering the field and inching along its path.
3. Point out the bee descending the screen — call out the moment it plants a mushroom, since that's a distinctive, easy-to-spot behavior.
4. Defeat one of each creature on screen and point at the score readout ticking up by the correct point value for each kill.

**Fallback if the live demo fails:** Skip to a pre-recorded 30-second screen capture of the same three interactions, or fall back to Slide 3a showing static screenshots of each creature mid-movement with callout labels ("earwig — EARWIG routine," "inchworm — WRMMV routine," "bee — BEEMV routine, planting a mushroom").

**Scene 4 — Slide 4: Why This Approach (2:30–3:30)**
Explain the "cite the source" discipline: every behavior traces back to a specific line in the original 1982 program. Show the citation file on screen briefly:
```
cat plugins/millipede/docs/rom-study/claims/11-earwig-inchworm-bee.json
```
Point out the specific citations: `EARWIG` (line 672), `WRMMV` (line 2559), `BEEMV` (line 56) — "these aren't approximations, they're traced to the exact original source."

**Scene 5 — Before/After (3:30–4:00, optional)**
If time allows, show a side-by-side: board with the three creatures inert/absent vs. board with all three active and scoring.

**Scene 6 — Roadmap (4:00–4:40)**
Cover what's next (see Roadmap section below).

**Scene 7 — Questions (4:40–5:00)**
Open floor.
