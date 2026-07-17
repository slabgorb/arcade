**Total runtime: ~6 minutes**

**Slide 1: Title (0:00–0:15)**
Title card: "R11b — Instant-Hit Laser Fire: Matching the Original Arcade Gun." Presenter states in one sentence: "We fixed our laser gun to fire exactly like the real 1983 machine did."

**Slide 2: Problem (0:15–1:00)**
Walk through the before-state verbally: shots traveled over time, could be held for continuous fire, and could skip past distant targets without hitting them. Cite the concrete example: a target at one distance in the trench would die on a shot, but a target just ~800 units farther away — well within the gun's range — would never register a hit at all. Land the "why it matters" line: this wasn't just a feel issue, it blocked the next story (the trench-run rebuild) from starting safely.

**Slide 3: What We Built — LIVE DEMO (1:00–3:00)**
Run the game live to show the new gun feel.

Terminal commands to type, in order:
```
cd star-wars
npm run dev
```
Open `http://localhost:5274/` in the browser once Vite reports the server is ready.

In-game walkthrough:
1. Start a run, let it progress to the surface-combat phase.
2. Aim the crosshair at an oncoming tower or TIE fighter and tap the fire control **once** — call out that the target dies immediately, with the beam flashing instantly from the gun to the target (no travel time to watch).
3. Hold the fire control down for ~2 seconds and point out that the gun does **not** auto-fire — it stays silent until you release and pull again, demonstrating "one pull, one shot."
4. If time allows, continue into the trench sequence and call out the ~$7000 checkpoint mark, noting that hits now register reliably at that point in the run.

**Fallback if the live demo fails** (server won't start, port conflict, etc.): skip to the **Before/After slide** and narrate the two example data points verbally — the target 800 units farther out that used to survive every shot, and the one-shot-per-pull behavior — using the static comparison table instead of live footage. As a secondary fallback, run:
```
cd star-wars
npm test
```
and show the terminal output confirming **1501 of 1501 tests passing**, framing it as "every one of these checks is watching a specific piece of authentic gun behavior, and all of them hold."

**Slide 4: Why This Approach (3:00–4:00)**
Explain the reasoning in plain terms: we matched the original machine's actual program code rather than guessing, and we proved the fix works by breaking it on purpose in tests and confirming 120 separate checks caught the break. Mention the six minor follow-up items exist but don't affect players today.

**Slide 5: Before/After (4:00–4:45)**
Show the comparison table (below). Emphasize the "tunneling" fix as the headline player-facing improvement.

**Slide 6: Roadmap & Integration (4:45–5:30)**
Explain what this unblocks — see Roadmap section below.

**Slide 7: Questions (5:30–6:00)**
Open floor.