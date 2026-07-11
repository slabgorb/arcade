**Total runtime: ~4 minutes**

**Scene 1 — Slide 1: Title (0:00–0:20)**
Open on the title slide ("Death Star Hull Fix — sw3-10"). One-line framing: "A visible rendering glitch on the game's signature target, found and fixed with a one-line-of-reasoning root cause."

**Scene 2 — Slide 2: Problem (0:20–0:55)**
Advance to the Problem slide. Say: "During our ROM-fidelity pass on Star Wars, we noticed the Death Star — the boss target in the space-combat phase — was rendering with a crossed, spiky artifact instead of a clean sphere." Point to the before-image on the slide (a screenshot of the spiked hull, captured before the fix from the same `models.html` view used in the live demo below).

**Scene 3 — Slide 3: What We Built (0:55–2:15) — LIVE DEMO**
Say: "Let me show you directly." Switch to terminal:
```
cd /Users/slabgorb/Projects/a-1
just serve
```
Wait for the server banner confirming `star-wars` is bound on port 5274. Open a browser to:
```
http://localhost:5274/star-wars/models.html
```
This loads the internal "Model Contact Sheet" dev tool, which renders every 3D model in the game — including the Death Star — directly from the current code, with no gameplay required. Point out the Death Star tile: a clean, solid-looking wireframe sphere with a small concave dish visible dead-center on the face pointed at the viewer. Say: "That's the fixed version — the same code that ships to players."

*Fallback:* If the dev server won't start or the browser can't reach it (port conflict, no network), skip to the **Before/After slide** (Scene 5 below) and narrate from the two static screenshots instead — same visual story, no live risk.

**Scene 4 — Slide 4: Why This Approach (2:15–2:55)**
Advance to the Why slide. Say: "We could have assumed the whole sphere was built backwards and rebuilt it — that's a much bigger, riskier change. Instead we used an automated test that renders exactly what a player sees, which proved the sphere was fine and isolated the bug to one decoration facing the wrong direction. That let us ship the smallest possible fix." Cite the concrete numbers on the slide: **1 file changed, +13/−8 lines, 719 of 719 automated tests passing.**

**Scene 5 — Before/After (2:55–3:25)**
Show the two side-by-side stills: "Before" (dish on the +X axis, rendering as a crossed spike on the sphere's side) and "After" (dish on the +Z axis, a clean concave dish centered on the camera-facing hull). This is the fallback slide if the live demo in Scene 3 can't run.

**Scene 6 — Roadmap (3:25–3:45)**
Advance to Roadmap. One line: "This closes out the Death Star geometry work started in story 11-7, and clears the way for the remaining ROM-fidelity polish stories this sprint."

**Scene 7 — Questions (3:45–4:00)**
Open the floor.