# Demo Script — pt1-25

**Total run time: ~5 minutes**

**Slide 1: Title (0:00–0:15)**
Say: "Today's story: Defender's three biggest moments — dying, the smart bomb, and hyperspace — finally have visual feedback on screen."

**Slide 2: Problem (0:15–1:00)**
Say: "Until now, these three moments were silent. You'd hear a sound, your life count would drop, but the screen wouldn't react at all. Here's what that looked like."
- Show the *before* clip/screenshot: player ship dies, HUD life counter drops from 3 to 2, but no visual change on the play field.
- Callout: "No explosion, no flash, no feedback — it just... happens."

**Slide 3: What We Built (1:00–2:30)**
Say: "We wired up an effects system that was already built but never connected — and made a deliberate safety call along the way."
- Live demo (preferred): run `just serve`, open `http://127.0.0.1:5270/defender/` in a browser, play until a life is lost.
  - Show the soft screen fade on death.
  - Fire the smart bomb (bomb key) and show its distinct screen-wide fade, separate from the individual enemy explosion bursts.
  - Trigger hyperspace (hyperspace key) and show the effect around the jump.
- **Fallback if live demo fails:** show the recorded before/after GIFs prepared for this story (death fade, smart-bomb wash, hyperspace effect) and narrate over them.
- Callout: "Notice this is a soft, dim wash — not a bright flash. That's deliberate, covered in the next slide."

**Slide 4: Why This Approach (2:30–3:30)**
Say: "The original 1980 machine used a full-screen white flash for these moments. We don't recreate that — full-screen strobing light is a known seizure trigger for people with photosensitive epilepsy, and this project has a standing rule that player safety outranks arcade-exact authenticity."
- Show a simple before/after comparison: "ROM behavior: full white flash" vs. "Our version: bounded, dim, single-pulse wash — automatically checked by two independent safety tests on every build."

**Before/After (3:30–4:00)**
Show side-by-side: silent death (no visual change) vs. new fade-on-death; no bomb feedback vs. new bomb wash; instant silent teleport vs. new hyperspace effect.

**Roadmap (4:00–4:30)**
Cover briefly — see next section.

**Slide: Questions (4:30–5:00)**
Open floor.
