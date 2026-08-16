# Demo Script — mc11-1

**Total runtime: ~4 minutes**

**Scene 1 — Slide 1: Title (0:00–0:15)**
Open on the title slide. One line: "Fixing the Sputnik fairness rule in Missile Command." State the game and the one-sentence hook: "A 46-year-old arcade balancing rule was dormant in our clone — it's live again."

**Scene 2 — Slide 2: Problem (0:15–0:55)**
Walk through the Problem Statement above in plain terms: the plane should back off when cruise missiles are already threatening the player, but it wasn't. Show a single static screenshot (or hand-drawn mock if unavailable) of the Missile Command screen with 2 cruise missiles streaking down and a Sputnik plane about to fire — narrate: "Under the original rule, this plane should fire at most 2 missiles here instead of its usual 6. Until today, it was still firing 6."

**Scene 3 — Slide 3: What We Built (0:55–2:15)**
This is the live-demo core.
1. In terminal, start the dev server:
   ```
   just serve
   ```
2. Open a browser to `http://127.0.0.1:5270/missile-command/`.
3. Play (or use a saved fast-forward save state, if available) until a wave spawns with cruise missiles visibly on screen alongside a Sputnik plane.
4. Point out the salvo size on screen as the plane fires — narrate that with, say, 2 cruise missiles active, the plane's shot count visibly drops versus an empty-screen wave.
5. **Fallback if live play doesn't reach the right wave state in time:** switch to Slide 3 static content — a before/after code snippet (see Before/After slide below) plus the test output from Scene 4, and narrate the same point from the automated proof instead of live play.

**Scene 4 — Slide 4: Why This Approach (2:15–3:15)**
Switch to terminal to show the safety net:
```
npx vitest run --project missile-command plugins/missile-command/tests/mc11-1-sputnik-cruise-borrow.test.ts
```
Narrate while it runs: "This test specifically asserts that when cruise missiles are on screen, the plane's next salvo is clamped — it would have failed against yesterday's code and passes now." Show the green pass output as the payoff moment.

**Scene 5 — Before/After (3:15–3:35)**
One slide, two columns:
- *Before:* `sputnikFireCount(0, ...)` — always treated the screen as empty of cruise missiles.
- *After:* `sputnikFireCount(cruiseOnScreenPreSpawn, ...)` — uses the real, live count.
Narrate: "One number, but it's the difference between the rule existing on paper and the rule actually protecting the player."

**Scene 6 — Roadmap (3:35–3:50)**
Slide with the roadmap bullets below. One sentence: "This closes out the last piece of the mc5 cruise-missile feature and the mc11 fidelity-audit epic's plane-salvo finding."

**Scene 7 — Questions (3:50–4:00)**
Standard "Questions?" slide.
