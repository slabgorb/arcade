# Demo Script — sw10-2

**Total runtime: ~4 minutes**

**Scene 1 — Slide 1: Title (0:00–0:15)**
Open on the title slide: "Surface Turret Fire: Closing the Loop on the Trench Scroll Fix." State the one-liner: "Enemy bullets on the surface levels now move at the speed the world is actually flying past you."

**Scene 2 — Slide 2: Problem (0:15–1:00)**
Show the problem slide bullet: "Surface turret fire moved at a fixed 300 units/sec while the ground scrolled past at up to 70x that speed." Explain in plain terms: picture standing on a moving walkway at the airport — everything around you glides by, but if someone tossed a ball at you and it just... floated in place, you'd immediately notice something was wrong. That's what players saw on surface levels.
*Live demo (optional):* run the game locally and navigate to a surface level to visually point out slow-moving turret fire against fast-scrolling terrain.
```
just serve
```
Then open `http://127.0.0.1:5270/star-wars/` in a browser, and navigate to a surface-phase level.
*Fallback:* if the dev server won't start or the surface level isn't quickly reachable, skip straight to Slide 6 (Before/After) and narrate the difference from the still frames/description instead.

**Scene 3 — Slide 3: What We Built (1:00–2:00)**
Show the "What We Built" slide bullets: "Reused the trench's proven bullet-speed formula, taught it to accept any scroll speed, and applied it to surface turret fire. Also hardened the hit-check so fast bullets can't skip past the ship undetected." Walk through the treadmill analogy from "What Changed" above.
*Live demo (optional):* run the targeted test suite to show the fix is verified.
```
npx vitest run --project star-wars -t "surface-fire-scroll-carry"
```
*Fallback:* if the command errors or tests take too long to display cleanly, show the terminal output already captured in the team's PR description instead, or skip to Slide 4.

**Scene 4 — Slide 4: Why This Approach (2:00–2:45)**
Show the "Why This Approach" slide: "One shared formula, not two divergent ones — we extended code already proven correct in the trench rather than writing new logic from scratch." Emphasize this reduces future maintenance risk.

**Scene 5 — Slide 5: Before/After (2:45–3:30)**
Show the before/after slide side by side (see table below). Narrate: "Before, a surface turret's shot crawled at a flat 300 units per second no matter what. After, that same shot's forward speed locks to the world's scroll rate — so it now feels anchored to the battlefield the way the trench shots already did."

**Scene 6 — Slide 6: Roadmap (3:30–3:50)**
Show the roadmap slide, connecting this fix to the broader sw10 fidelity epic (see below).

**Scene 7 — Slide 7: Questions (3:50–4:00)**
Open the floor for questions.
