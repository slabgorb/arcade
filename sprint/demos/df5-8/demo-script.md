# Demo Script — df5-8

**Slide 1: Title (0:00–0:15)**
"Defender: Waves Are Live" — introduce that Defender's core gameplay loop is now wired end-to-end.

**Slide 2: Problem (0:15–0:45)**
Explain: the wave escalation logic existed and was fully tested in isolation, but it was never connected to the running game — so starting a game session produced an empty battlefield with nothing to fight. Show a "before" screenshot or description: ship on screen, no enemies, nothing happens.

**Slide 3: What We Built (0:45–2:00)**
Walk through the conveyor-belt analogy: the wave director now runs live inside the simulation.
- Live demo: run the dev server and open the game.
  - Terminal command: `just serve`
  - Browser: navigate to `http://127.0.0.1:5270/defender/`
  - Narrate what's on screen: on load, the field is empty (wave 0); within the first moment of play, wave 1 spawns its full complement of enemy landers spread across the world.
  - Let the player clear (or narrate clearing) all wave-1 enemies, and point out the wave counter advancing to wave 2 with a visibly larger group of enemies spawning — the escalation the original 1980 arcade cabinet is known for.
- **Fallback:** if the live dev server demo fails (port conflict, build issue), switch to Slide 5 (Before/After) and show the two annotated screenshots: "Before — empty battlefield, wave 0 forever" vs. "After — wave 1 spawned, wave counter visible, wave 2 shows more enemies."

**Slide 4: Why This Approach (2:00–2:45)**
Explain the tested-logic-plus-final-wiring approach in plain terms: the escalation rules were built and proven safe first; this story was the last, minimal step of plugging that proven logic into the live game — reducing risk versus building and wiring everything at once.

**Slide 5 (Before/After, if not already used as fallback) (2:45–3:15)**
Side-by-side: "Before" (static empty field) vs. "After" (wave 1 → wave 2 escalation, wave counter visible on state).

**Slide 6: Roadmap (3:15–3:45)**
Point to df5-7, the next story, which will do a full on-screen playtest now that waves actually drive play — this was the direct blocker df5-8 removes.

**Slide 7: Questions (3:45+)**
Open floor.
