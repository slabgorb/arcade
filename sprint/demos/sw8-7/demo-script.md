**Scene 1 (0:00–0:15) — Slide 1: Title**
Open on "Restoring Cabinet-Authentic TIE Fighter Density." Say: "Today we're closing a small but very visible gap between our Star Wars: Warp Speed clone and the 1983 arcade original — how many enemy fighters appear and how fast they show up."

**Scene 2 (0:15–0:45) — Slide 2: Problem**
Show the before state: cap of 3 fighters (correct), but first fighter not appearing until ~1.6 seconds in, full density not reached until ~4.5 seconds. Say: "Picture starting a wave and staring at empty space for over a second and a half before the fight even begins — that's not the arcade experience, and it made our dogfight feel sparse instead of chaotic."

**Scene 3 (0:45–1:45) — Slide 3: What We Built — LIVE DEMO**
Terminal commands:
```
cd /Users/slabgorb/Projects/a-1/star-wars
npm run dev
```
Open `http://localhost:5274/` in a browser, start a game, and use the dev phase-skip key to jump directly to space combat rather than playing through the ground phase. Point out: within the first couple of frames, three TIE fighters are already on screen and moving; shoot one down and call out that a replacement fighter appears on the very next frame, with no pause.
Fallback: if the dev server or phase-skip doesn't cooperate live, jump to the Before/After slide (Scene 5) and narrate from the two recorded clips/screenshots instead.

**Scene 4 (1:45–2:15) — Slide 4: Why This Approach**
Say: "We didn't guess at a better number — we read the original 1983 program's own logic, which has no spawn timer at all; it just tops the fighter count up every frame. So we deleted the invented ~1.5-second countdown rather than retune it — more faithful, and less code."

**Scene 5 (2:15–2:35) — Before/After slide**
Show side-by-side stats: "Before: first fighter ~1.6s, full density ~4.5s" vs. "After: full density (3 fighters) within ~50ms, refill on the very next step, every time."

**Scene 6 (2:35–2:55) — Slide: Roadmap**
Preview the two follow-up stories this work surfaced and filed: sw8-10 (matching the original's exact fighter-replacement pattern) and sw8-11 (matching the space battle's duration to the original's timed music cue instead of a fixed kill count).

**Scene 7 (2:55–3:15) — Questions**
Open the floor.