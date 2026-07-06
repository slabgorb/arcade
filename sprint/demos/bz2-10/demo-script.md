**Total runtime: ~6 minutes**

**Scene 1 — Title (0:00–0:20)**
- **Slide 1: Title**
- Presenter says: "Today I'm showing the fix for Battlezone's unfair opening moments — the enemy tank AI overhaul."
- No live demo yet; just framing.

**Scene 2 — The Problem (0:20–1:30)**
- **Slide 2: Problem**
- Presenter explains: "Players spawn, get about two seconds of safety, and then face a tank that's already perfectly aimed at them — like walking into a room and a turret is already tracking your head."
- **Live demo:** Open terminal and run:
  ```
  cd battlezone && npm run dev
  ```
  Then open the browser to `http://localhost:5273/tempest/` — wait, correct URL is the Battlezone dev port (check `vite.config.ts` if unsure; if the exact port isn't at hand, skip live launch and go straight to fallback).
- Show the "before" recording/clip of a spawn where the enemy tank is already barrel-on to the player at spawn, firing the instant grace ends.
- **Fallback if live demo fails:** Jump to the Before/After slide and narrate the described symptom instead — "tank spawns aimed, fires within ~2 seconds every time."

**Scene 3 — What We Built (1:30–3:00)**
- **Slide 3: What We Built**
- Presenter says: "We gave the tank a mind of its own — three modes: charge, flank, and wander — and slowed its turning down to a realistic speed."
- **Live demo (if dev server is running):** Start a new game, let a tank spawn, and narrate its behavior in real time: "Watch — it's swinging out to the side rather than facing me. Now it's circling instead of driving straight at me. Now it's backing off after clipping that obstacle."
- Point out specific numbers on screen or in narration: turn rate cut from a near-instant snap to roughly a third of the old speed; the tank holds a minimum distance instead of ramming point-blank; it only fires when its aim is genuinely lined up, not just "close enough."
- **Fallback if live demo fails:** Show a recorded clip or the Before/After slide with the three behavior modes listed (charge / flank / wander) and describe each in one sentence.

**Scene 4 — Why This Approach (3:00–4:00)**
- **Slide 4: Why This Approach**
- Presenter says: "We didn't guess at this — we went back to the original 1980 arcade hardware's actual programming and ported the real enemy logic, then fine-tuned it for a modern play session."
- No live demo needed; this is a narrative/credibility slide.

**Scene 5 — Before/After (4:00–4:45)**
- **Slide: Before/After**
- Show side-by-side description or clips: "Before: tank spawns aimed, fires almost immediately, feels like a turret." / "After: tank maneuvers for several seconds — charges, breaks off, circles — before it ever gets a clean shot."
- If a recorded "after" clip is available, play it here; otherwise narrate from the Before/After section below.

**Scene 6 — Roadmap (4:45–5:15)**
- **Slide: Roadmap**
- Presenter says: "This fix travels together with the earlier spawn-safety fix — they ship as one pair once final playtesting confirms it feels right. Down the line, we can add difficulty scaling so tanks get more aggressive as a player's score climbs, the way the original game did."

**Scene 7 — Questions (5:15–6:00)**
- **Slide: Questions**
- Open floor.