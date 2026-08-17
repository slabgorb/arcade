# Demo Script — df4-6

**Total time: ~4 minutes**

**Slide 1: Title (0:00–0:15)**
- Say: "Today I'm showing the Defender arcade clone's enemies coming alive on screen — appearing, fighting, and dying safely."

**Slide 2: Problem (0:15–0:45)**
- Say: "We had built enemy behaviors separately — spawning, dying, capturing — but never confirmed they worked together in the live game, and never confirmed our death effects were safe for players sensitive to flashing lights."
- Show: no live demo yet; just narrate the problem.

**Slide 3: What We Built (0:45–2:30)**
- Live demo: open a terminal and run:
  ```
  just serve
  ```
  Wait for the line confirming the server is on `http://127.0.0.1:5270/`.
- Open a browser to `http://127.0.0.1:5270/defender/`.
- Say: "Watch the enemies fade in as they materialize — that's the 'appear' effect."
- Let a laser hit an enemy; point out: "Notice it's a small spark right at the enemy, not a flash across the whole screen."
- Point out a lander picking up a humanoid: "This is the abduction sequence — the lander grabs the humanoid and starts carrying it off."
- **Fallback:** If the live server doesn't start or the browser doesn't load in time, switch to the pre-captured screenshot set from the test run (three images: materialize, localized kill spark, abduction) and narrate over those instead — no need to stall the room.

**Slide 4: Why This Approach (2:30–3:15)**
- Say: "We didn't just trust that the code existed — we took an actual screenshot of the running game and compared it against a nonsense page to prove our test was looking at something real. And we specifically confirmed no full-screen flash happens, because that's an accessibility commitment we're carrying forward into the next two features: smart bomb and hyperspace."

**Roadmap (3:15–3:45)**
- Say: "Next up, df5 adds the smart bomb and hyperspace effects — both of which will also need to freeze or fade instead of flash, following the same rule we just confirmed here."

**Questions (3:45–4:00)**
- Open floor.
