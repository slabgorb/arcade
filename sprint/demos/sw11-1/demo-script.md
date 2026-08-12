# Demo Script — sw11-1

**Total runtime: ~4 minutes**

**Scene 1 — Slide 1: Title (0:00–0:15)**
Presenter opens on the title slide ("Trench Gun Fidelity — sw11-1") and states in one sentence: "The trench run was too hard because our enemy guns were cheating — we fixed that by copying the original arcade machine's own rules."

**Scene 2 — Slide 2: Problem (0:15–0:55)**
Show the "Problem" slide. Say: "Our trench guns had perfect aim, fired six shots at once even in wave one, and would shoot you from anywhere — including point blank. The real 1983 cabinet never did any of that." If available, show a side-by-side clip: our OLD build vs. original cabinet footage of the trench run, calling out how much denser and more accurate our incoming fire is.

**Scene 3 — Slide 3: What We Built (0:55–2:15)**
Walk through the three fixes on-slide as three bullets (Aim / Concurrency / Eligibility), narrating each briefly:
- "Guns now fire a random-angle shot that slowly drifts toward you instead of an instant perfect shot."
- "Only 1 shot can be in the air on wave one (vs. our old flat 6) — scaling up as the game gets harder."
- "Guns only fire if you're above them, in the right height band, and not point-blank close."

**Live demo (2:15–3:15):** Presenter runs:
```
just serve
```
Then opens `http://127.0.0.1:5270/star-wars/` in a browser, flies into the trench, and narrates live: "Watch — shots are missing me now, and I'm not getting swarmed by 6 shots at once like before." Fly through one full trench pass showing shots drifting and missing.

**Fallback:** If the dev server or live gameplay hiccups, skip to a pre-recorded clip on **Slide "Before/After"** showing the old build (dense, accurate fire) next to the new build (sparse, drifting fire) side by side.

**Scene 4 — Slide 4: Why This Approach (3:15–3:35)**
"We didn't guess at the difficulty — we read the original game's actual code and copied its exact firing rules, then wrote tests that lock this behavior in place."

**Scene 5 — Before/After slide (3:35–3:50)**
Show two numbers/gifs side by side: "Old: up to 6 concurrent shots, perfect aim" vs. "New: 1 concurrent shot on wave one (scaling with difficulty), drifting/missing aim — matches the original arcade cabinet."

**Scene 6 — Roadmap (3:50–4:00)**
"This closes out the last of the three basegun mechanisms exposed by our earlier fidelity work — trench combat should now feel like the arcade original."

**Scene 7 — Questions (4:00+)**
Open floor.
