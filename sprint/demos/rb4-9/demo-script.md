**Setup (do this before the meeting, not live):** From the orchestrator root, confirm you're demoing your own checkout's server, not a stale one from another working copy:
```bash
PID=$(lsof -ti tcp:5277 | head -1)
lsof -a -p "$PID" -d cwd -Fn | grep '^n'
```
If that prints nothing (nobody's bound to 5277), start it fresh:
```bash
cd red-baron
npm install
npm run dev
```
Confirm it's serving from *this* checkout's path before you screen-share it.

---

**0:00–0:15 — Slide 1: Title**
"Red Baron: THE SCREEN IS MISSING THINGS." State the one-line hook: the player's own propeller — the single most-looked-at object in the game — wasn't being drawn at all.

**0:15–1:00 — Slide 2: Problem**
Walk the bullet list from the Problem Statement above. Land on the punch line: this single ticket closed *ten* separate audit findings (propeller, enemy propeller, depth-cueing, lives, windscreen damage, target-value readout, shot rendering, and a cosmetic banner fix) — cluster C8 of the fidelity audit.

**1:00–1:45 — Slide 3: What We Built**
Walk the five bullets from "What Changed." Don't demo yet — this slide is the checklist the live demo will now prove.

**1:45–2:30 — Slide 4: Why This Approach**
Explain the test-first process and name the one concrete catch: reviewer found a HUD test that could pass with the HUD completely missing, and it got fixed before merge. This is the "we don't just say it works, we prove it can't silently break" beat.

**2:30–4:30 — Live Demo** (references Slide 3's checklist)
Open `http://localhost:5277/` in the browser, already navigated to a screen where the player plane is airborne and at least one enemy biplane is visible.
1. Point at the player's nose: the propeller is visibly spinning through its blade cycle — call out that it's redrawing ~63 times a second, not tied to game logic speed.
2. Pan to the enemy biplane: point out its propeller is now rendered too — "this data already existed, it just wasn't being drawn."
3. Point out brightness: the plane's main body is visibly brighter than its wing struts — the two-tier depth effect.
4. Point at the HUD: read off the lives icons and the "PLANE ###" value readout next to the score.
5. Take a hit (or trigger one) and show a crack appear on the correct side of the windscreen.
6. Fire a shot and freeze-frame or slow down to show it renders as a dot, not a streak.

**Fallback:** If the dev server won't come up or the port is stale, skip straight to the **Before/After slide** and narrate from the two screenshots instead of live footage — do not attempt to debug the server live.

**4:30–5:00 — Before/After Slide**
Side-by-side screenshots: "Before" (bare-nosed plane, empty HUD, flat brightness, streaked shots) vs. "After" (spinning prop, populated HUD, two-tier brightness, dot shots).

**5:00–5:30 — Roadmap Slide**
Cover the "Roadmap & Integration" section below.

**5:30+ — Questions**