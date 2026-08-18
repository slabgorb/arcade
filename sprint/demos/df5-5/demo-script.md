# Demo Script — df5-5

**Total time: ~4 minutes**

**Slide 1: Title (0:00–0:15)**
Say: "Today I'm walking through two new emergency powers in our Defender clone — Smart Bomb and Hyperspace — faithfully ported from the original 1980 arcade game, with one important safety twist."

**Slide 2: Problem (0:15–0:45)**
Say: "Defender veterans know these two moves as their last line of defense. Our clone didn't have them yet. And naively porting them wasn't an option — the original game's Smart Bomb effect was a full-screen color flash, which is a real seizure risk for some players."

**Slide 3: What We Built (0:45–2:30) — LIVE DEMO**
Terminal setup, run before presenting:
```
just serve
```
This starts the dev server at `http://127.0.0.1:5270/`.

1. Open `http://127.0.0.1:5270/defender/` in the browser.
2. Start a game, let a few enemies spawn on screen.
3. Trigger **Smart Bomb** (per current keybind — check `plugins/defender/src/shell` input map if unsure). Narrate as it fires: "Watch — every enemy on screen clears instantly. Notice there's no screen flash; you get a fade/freeze effect instead. That's the accessibility swap."
4. Trigger **Hyperspace**. Narrate: "The ship teleports to a random point on the map. About one time in four, you'll come out of that jump in a bad spot and die on re-entry — that's straight from the original game, not a bug we introduced."
5. If time allows, trigger Hyperspace 3–4 more times to show the landing position varies each time.

**Fallback if the live demo fails (server won't start, browser issue, etc.):** Skip to the Before/After slide and narrate the same two moments from the static screenshots there instead. Do not attempt to debug the dev server live.

**Slide 4: Why This Approach (2:30–3:15)**
Say: "We didn't build this from zero — it reuses two systems from earlier work: enemy-clearing logic and a 'safe effects' system for dramatic moments. So this story was really about porting exact numbers from the original game's source code — timing, odds, positioning — and verifying every one of them automatically so they can never quietly drift out of sync with the source material. It also went through two rounds of review, and the second round caught real gaps we fixed before shipping."

**Roadmap (3:15–3:45)**
Say: "This closes out the emergency-powers piece of the Defender epic. It builds directly on the enemy-clearing and safe-effects work from earlier stories, and it's the same accessibility pattern — the ADR-0005 exception — that will guide any future power-up or big-moment effect across every game in the arcade, not just Defender."

**Questions (3:45–4:00)**
Open the floor.
