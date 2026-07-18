**Total runtime: ~6 minutes.** Presenter should have the game running in a browser tab *before* the walkthrough begins (see setup below) to avoid dead air during the live segment.

**Pre-demo setup (do this before the meeting starts, not live):**
```bash
cd star-wars
npm install
npm run dev
```
Confirm the dev server is up by opening `http://localhost:5274/` in a browser tab and leaving it loaded on the title screen. Keep this tab open and minimized.

---

**Scene 1 — Title (0:00–0:30) — Slide 1: Title**
Open on the title slide. One line, spoken: "Today I want to walk you through a fix to how our Star Wars arcade recreation handles the ground-attack section of the game — it went from nearly unplayable to matching the original 1983 machine." Move immediately to the problem.

**Scene 2 — The Problem (0:30–1:45) — Slide 2: Problem**
Narrate the before-state using concrete numbers, no live demo yet:
- "The ground-flying section ran at one flat speed and only ended when every tower was destroyed."
- "Those towers are 2 pixels wide on screen. At the old speed, one pass over this section could take **almost 57 seconds** — nearly a minute of trying to hit something you can barely see."
- "Separately, Wave 1 had a ground-flying section bolted onto it that the original 1983 cabinet never had at all."
If you have a pre-recorded 15-second clip of the old behavior, play it here. **Fallback if no clip is available:** skip directly to describing the numbers above and move to Slide 3 — do not attempt to reproduce the old, buggy build live.

**Scene 3 — What We Built, live demo (1:45–3:30) — Slide 3: What We Built**
Switch to the browser tab already running on `http://localhost:5274/`. Say: "Let me show you the fixed version directly."
1. From the title screen, press **8** — this is a developer shortcut built into the dev build that jumps straight to the ground-attack section (Wave 2's BUNK terrain), so we don't have to play through the space battle first.
2. Call out on screen: "Watch the speed readout — it starts slow and visibly accelerates as we fly." (Speeds up from roughly 5,250 units/second toward a cap of 21,000 units/second over the course of the pass.)
3. Point out defenses activating in stages as the pass counter increments — narrate: "Not everything is live at once — you'll see additional defenses activate as we complete more passes over the terrain."
4. Let it run to completion — call out when the section ends automatically at the 5th pass, roughly 18 seconds in, regardless of how many towers are still standing.
5. If a tower was destroyed during the pass, point out the bonus score award (50,000 points) that still triggers even though it's no longer required to end the level.

**Fallback if the live demo fails** (dev server won't start, port conflict, browser issue): switch immediately to Slide 5 (Before/After) and walk through the static comparison numbers instead — do not troubleshoot live in front of the audience.

**Scene 4 — Why This Approach (3:30–4:15) — Slide 4: Why This Approach**
Explain the sequencing dependency in plain terms: "This only works because we'd already replaced the ship's weapon with an instant-hit laser the day before — without that change, the faster authentic speed you just saw would have made every target impossible to hit." Mention the one scoped trade-off (simplified repeat-pattern for defenses) as a known, documented next step, not a gap.

**Scene 5 — Before/After (4:15–5:00) — Slide 5: Before/After**
Present the comparison table (see Before/After section below) side by side. No live demo needed here — this is the recap slide.

**Scene 6 — Roadmap (5:00–5:40) — Slide 6: Roadmap**
Walk through the Roadmap & Integration section below at a high level — what this unblocks, what's still queued.

**Scene 7 — Questions (5:40–6:00) — Slide 7: Questions**
Open the floor.