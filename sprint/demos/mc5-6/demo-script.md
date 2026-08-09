# Demo Script — mc5-6

**Total runtime: ~4 minutes**

**Scene 1 — Slide 1: Title (0:00–0:15)**
Say: "Today's story is small but load-bearing — a one-line-sounding fix that unblocks the enemy bomber feature landing later this sprint." Advance to Slide 2.

**Scene 2 — Slide 2: Problem (0:15–0:50)**
Say: "Missile Command's original 1980 arcade machine could have 8 enemy missiles in the air simultaneously. Our clone capped it at 7. That 8th slot matters because it's reserved for the bomber plane's own missile — without it, the bomber has nothing to shoot with once the sky is full." Show the two competing numbers on screen: `MXICON = 7` vs `NICBMS = 8`.

**Scene 3 — Slide 3: What We Built (0:50–1:40)**
Say: "We traced the original assembly code and found MXICON(7) was never a hard cap — it's a "count minus one" storage trick the original programmers used. The real ceiling is NICBMS(8). We updated the swarm logic, the MIRV split-missile logic, and all the documentation to match."
**Live demo:** In terminal, run:
```
just serve
```
Then open a browser to `http://127.0.0.1:5270/missile-command/`. Start a game, survive to a later wave (press the number keys or wait ~90 seconds for wave escalation), and point out the ICBM count on screen reaching 8 simultaneous missiles instead of 7.
**Fallback:** If the live game demo doesn't reach 8 missiles in time or the dev server has an issue, skip to Slide "Before/After" and show the static before/after diff: "on-screen bound ≤ 7" (old) vs "on-screen bound ≤ 8" (new) from `plugins/missile-command/tests/mc4-playthrough.test.ts`.

**Scene 4 — Slide 4: Why This Approach (1:40–2:30)**
Say: "We didn't just change a number — we went to the source. This keeps our clone faithful to the original machine, which is the standard for every game in this arcade." Show the terminal running the verification suite live:
```
npx vitest run --project missile-command
```
Call out the result: "901 out of 901 tests passing." **Fallback:** If the test run is slow or noisy in the live terminal, show the pre-captured result screenshot instead: "901/901 passing, lint clean, 189 source citations verified."

**Scene 5 — Before/After (2:30–3:00)**
Show a side-by-side: **Before** — swarm caps at 7, bomber has no missile slot when the sky is full. **After** — swarm caps at 7 when the bomber is active (reserving its slot) and 8 when it isn't, matching the arcade original exactly.

**Scene 6 — Roadmap (3:00–3:30)**
Say: "This was a prerequisite. It clears the runway for the bomber's firing behavior, which is the next story in this arc." Advance to Roadmap slide (see below).

**Scene 7 — Questions (3:30–4:00)**
Open the floor.
