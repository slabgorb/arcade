# Demo Script — mc8-5

**Total runtime: ~4 minutes**

**Scene 1 — Slide 1: Title (0:00–0:15)**
Open on the title slide ("Missile Command: Live Threat Audio"). One sentence: "We just wired up the warning siren for cruise missiles and Sputnik."

**Scene 2 — Slide 2: Problem (0:15–0:45)**
Narrate the problem statement above. Show a static screenshot (or the live game paused) of a cruise missile on screen with no accompanying callout — emphasize "this missile is on screen right now, and until today, it made no distinct sound."

**Scene 3 — Slide 3: What We Built (0:45–1:15)**
Walk through the "smoke detector" analogy from What Changed. Show the one-line rule on screen as a simple bullet: "Threat visible + game is actively playing → siren on. Threat gone, paused, or game over → siren off."

**Scene 4 — Live Demo (1:15–3:00)**
Note upfront: Missile Command's audio engine does not play in the plain local dev server due to a known browser-security quirk with how the dev server loads its sound worklet — so the live demo uses a production-style build, which is the only way to actually *hear* the result. This is expected, not a bug.

Terminal commands, run from the repo root, in order:
```
node scripts/build-app.mjs missile-command
npx vite preview
```
Wait for the preview server to print `http://127.0.0.1:5270/`. Then:
1. Open `http://127.0.0.1:5270/missile-command/` in a browser tab.
2. Click/press start to enter play.
3. Play until a cruise missile or the Sputnik satellite appears (roughly wave 2+ for cruise missiles) — call out the moment the sweeping siren tone starts, and note it rises and falls continuously while the threat is on screen.
4. Shoot down the threat (or let the wave end) — call out the exact moment the siren cuts to silence.
5. Pause the game mid-threat (if a threat is visible) to show the siren immediately goes silent even though the threat is still drawn on screen — this is the "phantom sound" bug the team specifically closed.

**Fallback if the live demo fails** (e.g., audio doesn't play, browser blocks autoplay, or a threat doesn't spawn in time): switch to Slide "Before/After" and play the pre-recorded 20-second clip of the siren engaging and disengaging (captured during QA), narrating the same beats — siren on at threat appearance, siren off at clear/pause/game-over.

**Scene 5 — Slide 4: Why This Approach (3:00–3:30)**
Cover the reuse point: "We didn't reinvent threat-detection — we plugged the existing detector into the existing siren, and closed one small gap where the code needed to prove it stays silent, not just usually silent."

**Scene 6 — Roadmap (3:30–3:50)**
See Roadmap section below.

**Scene 7 — Questions (3:50–4:00)**
Open floor.
