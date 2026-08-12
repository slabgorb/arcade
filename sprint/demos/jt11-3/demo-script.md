# Demo Script — jt11-3

**Total runtime: ~4.5 minutes**

**Scene 1 — Title (0:00–0:20) — Slide 1: Title**
Open on the title slide ("Ground Arrests Momentum — jt11-3"). One line: "Fixing a hidden physics bug in Joust's takeoff mechanic."

**Scene 2 — Problem (0:20–1:10) — Slide 2: Problem**
Explain the bug in plain terms: "If you landed fast and then walked slowly, taking off again launched you at your old fast speed." Show the before-state diagram (bird landing fast → walking slowly on a platform → launching at the *old* fast speed, not the walking speed).

**Scene 3 — What We Built (1:10–2:45) — Slide 3: What We Built**
Live demo. In a terminal:
```
just serve
```
Then open a browser to `http://127.0.0.1:5270/joust/` and play a short sequence: fly right at speed, land on a platform, walk left slowly for a couple of seconds, then flap to take off. Point out the bird now launches at the slow leftward walking speed, not the old fast rightward flight speed.

As a second, more precise proof point, run the automated test suite in a second terminal:
```
npx vitest run --project joust -t "ground-momentum"
```
Call out the passing `ground-momentum.test.ts` suite — this is the exact regression test the team wrote to pin this behavior (file `plugins/joust/tests/ground-momentum.test.ts`), so it's the mechanical proof, not just a visual impression.

*Fallback:* If the dev server or browser demo isn't cooperating live, skip straight to **Slide 5: Before/After**, which has the same landing→walk→takeoff sequence pre-captured, and narrate over it instead.

**Scene 4 — Why This Approach (2:45–3:30) — Slide 4: Why This Approach**
Explain that the fix reuses an existing, ROM-accurate data field (`flyVel`) that had been carried over from the original 1982 arcade source but never actually connected — so this isn't new tuning, it's finishing a wiring gap using data that was already validated against the original game.

**Scene 5 — Before/After (3:30–3:50) — Slide 5: Before/After**
Walk through the before/after table (below) side by side.

**Scene 6 — Roadmap (3:50–4:15) — Slide 6: Roadmap & Integration**
Note this closes out a known gap in the `jt11` "momentum" epic and sets up cleaner ground-to-air transitions for future joust physics work.

**Scene 7 — Questions (4:15+) — Slide 7: Questions**
Open the floor.
