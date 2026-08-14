# Demo Script — df1-5

**Total runtime: ~4 minutes**

**Scene 1 — Slide 1: Title (0:00–0:15)**
Open on the title slide ("Defender: Visual Boot Check & Roster Correction"). One sentence: "A quick verification story — did Defender actually render, and did our docs get the history right?"

**Scene 2 — Slide 2: Problem (0:15–0:45)**
State the two-part problem: (1) Defender's page returned "200 OK" but nobody had confirmed a human could actually see the game, and (2) the documentation wrongly said Joust was Williams' first title. Show the exact stale doc line on screen:
> `centipede (1981), the first Williams title joust (1982), missile-command (1980) and pac-man (1980)`

**Scene 3 — Slide 3: What We Built (0:45–2:00)**
Live terminal demo. Type exactly:
```bash
just serve
```
Wait for the dev server banner confirming it's bound to `http://127.0.0.1:5270/`. Then navigate a browser to:
```
http://127.0.0.1:5270/defender/
```
Show the rendered game: a full black canvas at the browser viewport size, page title "Defender." Then navigate to a nonsense path to show the contrast:
```
http://127.0.0.1:5270/banana/
```
Point out this shows the lobby's fallback page (title "Slabcade") — visually and structurally different from Defender's page, proving Defender is really its own thing and not just another "200 OK" copy of the fallback.

*Fallback if the live demo fails (port conflict, server won't start):* Skip to Slide 5 (Before/After) and show the saved description of the verification instead — center pixel confirmed opaque black `rgb(0,0,0,255)`, canvas visible at 1920×824, only a harmless favicon 404 in the console.

**Scene 4 — Slide 4: Why This Approach (2:00–2:45)**
Explain in plain terms: an automated "is the server up" check can't tell a working screen from a blank one, so this required one human look at real pixels. Show the corrected documentation line on screen:
> `centipede (1981), the first Williams title defender (1980), joust (1982), missile-command (1980) and pac-man (1980)`

**Scene 5 — Slide 5: Before/After (2:45–3:15)**
Side-by-side of the doc text before and after (see Before/After section below). Emphasize: same sentence, one factual correction, Defender now properly listed.

**Scene 6 — Slide 6: Roadmap (3:15–3:45)**
Mention the follow-up item filed to reconcile the full game count/roster numbers (a separate small item, tracked as df1-7), so the audience knows the remaining loose end is already captured, not forgotten.

**Scene 7 — Slide 7: Questions (3:45–4:00)**
Open floor.
