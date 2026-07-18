**Total runtime: ~4 minutes**

**Scene 1 (0:00–0:20) — Slide 1: Title**
Open on the title slide: "Tempest Shape Fidelity — Closing the Loop on tp1-17." Say: "This is a small cleanup story — two story points — that finished off four loose ends left over from the bigger effort to make Tempest's enemies and player effects pixel-accurate to the 1981 arcade original."

**Scene 2 (0:20–0:50) — Slide 2: Problem**
Show the problem slide with the four bullet points (no shape test, wrong documentation, stale tool labels, unverified visual). Say: "None of these were bugs players would see today — but each one was a small risk. The biggest: the fuseball enemy's shape had no real safety net. Only its colors were being checked, not its actual geometry."

**Scene 3 (0:50–2:00) — Slide 3: What We Built — LIVE DEMO**
Switch to terminal. Run:
```
cd tempest
npm test -- tp1-36
```
Narrate while it runs: "This is the new fuseball shape guard — 6 tests checking all 113 points across the enemy's 4 animation frames (29, 29, 28, and 27 points per frame) against the original ROM source code." Point out the `PASS` output, 6/6 green.

Then run:
```
npm test -- citations
```
Say: "This is the project's citation gate — it verifies every claim about the original game's source code is accurately quoted. Still 25/25 green after our documentation fix, because we corrected a description, not a citation."

*Fallback: if either command fails to run live (e.g., dependency install issue), skip to Slide 5 (Before/After) and show the static test-output screenshot captured during development instead — do not attempt to debug live on stage.*

**Scene 4 (2:00–2:40) — Slide 4: Why This Approach**
Say: "We didn't just add a test and call it done — we proved the test works. During development, the team deliberately broke one point in the fuseball shape, watched the new test correctly fail, then restored it and confirmed it passed again. That's how you know a test has teeth, not just presence."

**Scene 5 (2:40–3:10) — Slide 5: Before/After**
Show the screenshot of the player's charge (bullet) mid-flight — the glowing 17-dot cluster (9 inner tinted dots + 8 outer yellow dots) blended into a capsule shape by the game's glow effect. Say: "This was the one item that could only be confirmed by eye. We fired a shot in a live game and captured it — it renders as an authentic glowing cluster, not a malformed artifact."

**Scene 6 (3:10–3:40) — Slide 6: Roadmap**
Say: "This closes out tp1-17 completely. It's one of several similar fidelity fixes this sprint — correcting audit claims, verifying wave parameters, freezing citation gates — all part of the broader push to make Tempest byte-exact with Dave Theurer's 1981 source."

**Scene 7 (3:40–4:00) — Slide 7: Questions**
Open for questions.