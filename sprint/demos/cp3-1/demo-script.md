**Total run time: ~7 minutes.** Presenter should have the `centipede` dev server pre-warmed in a background terminal before the talk starts (cold Vite starts can take 5–10 seconds and stall the demo).

**Scene 1 — 0:00–0:30 — Slide 1: Title**
Open on the title slide ("The Spider: Restoring Arcade-Authentic Enemy Behavior"). One sentence: "Today I'm showing how we fixed Centipede's Spider enemy to match the original 1981 arcade machine exactly — movement, scoring, and how it kills the player."

**Scene 2 — 0:30–1:30 — Slide 2: Problem**
Walk through the Problem Statement above verbatim in plain language: the Spider wasn't verified against the original game's code, which risked wrong movement, wrong mushroom damage, an inconsistent death sequence, and wrong scoring. Land on the stakes line: "Our whole pitch is byte-exact fidelity — this is the kind of gap that breaks that promise if we don't close it."

**Scene 3 — 1:30–3:30 — Slide 3: What We Built + LIVE DEMO**
Switch to the terminal and run:
```
cd centipede
npm run dev
```
Open `http://localhost:5278/` in the browser. Play (or use a pre-recorded seeded run) until the Spider spawns:
- Point out the Spider's wandering path across the bottom lane — call out that this exact path comes from the `BUGOFF`/`BUGMV` transcription, not a guess.
- Let the Spider cross a mushroom and pause to show the mushroom's damage state changing rather than the mushroom just vanishing.
- Deliberately let the Spider touch the player and show the death sequence — call out that this is the *same* explosion/respawn animation already used for a Centipede segment kill (not a second, separate one).
- Reset, then shoot the Spider at three different distances to show the score popup change: **300** when it's far away, **600** at mid-distance, **900** when it's close — matching the original arcade's proximity-based scoring documented in `CENTIP.DOC`.

Then switch to terminal and run the automated proof:
```
npm test -- citations
```
Point out the green output — every transcribed behavior is cross-checked against its cited source line. Then:
```
npm test
```
Point out the full suite passing, including the new deterministic, seeded Spider trajectory tests.

**Fallback if the live demo fails (server won't start, browser issue, etc.):** Skip straight to the **Before/After** slide and narrate the two recorded clips/screenshots there instead — do not troubleshoot live in front of the audience. Have the `npm test -- citations` and `npm test` terminal output pre-captured as a screenshot as backup evidence.

**Scene 4 — 3:30–4:30 — Slide 4: Why This Approach**
Cover the two key decisions from the Why This Approach section: transcribing from source instead of approximating, and reusing the existing death-sequence machinery instead of duplicating it. Emphasize: "one death sequence shared by every enemy means one fix benefits the whole game."

**Scene 5 — 4:30–5:15 — Before/After slide**
Show the two-column comparison (see Before/After section below) side by side. Keep this slide up for questions.

**Scene 6 — 5:15–6:15 — Roadmap slide**
Cover the Roadmap & Integration section below.

**Scene 7 — 6:15–7:00 — Questions**
Open the floor.