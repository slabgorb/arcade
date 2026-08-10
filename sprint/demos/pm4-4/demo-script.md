# Demo Script — pm4-4

**Total time: ~4 minutes**

**Scene 1 — Slide 1: Title (0:00–0:15)**
State the story: "Ghost-house wall investigation — was it a bug or a rule?"

**Scene 2 — Slide 2: Problem (0:15–0:45)**
Show the reference screenshot side-by-side comparison image:
`sprint/demos/pm4-4/reference/real-pacman-authentic-house.png` (authentic arcade)
next to
`sprint/demos/pm4-4/reference/our-clone-gate-blocks-lateral.png` (our clone, before the fix)
Point out the gate sitting one row above the house wall in our version — floating in the open hallway.

**Scene 3 — Slide 3: What We Built (0:45–2:00)**
Live terminal demo. Run:
```bash
npx vitest run --project pac-man
```
Call out the specific result: **286/286 tests passing**, including the 2 new tests that specifically check "the gate is a door set in a wall, not a lane" and 3 regression guards confirming all four ghosts (Blinky, Pinky, Inky, Clyde) still spawn in the correct spots.
*Fallback if the live run fails or is slow:* show the static test summary already captured in the session notes — "286/286 GREEN (pac-man suite, including 2 RED→GREEN drivers for lateral passage + 3 spawn regression guards)."

**Scene 4 — Slide 4: Why This Approach (2:00–2:45)**
Explain verbally (no live demo needed): we verified the game *rule* was already correct, so we only touched the map blueprint, not the game logic — smallest safe fix, confirmed against the authentic arcade screenshot rather than guesswork.

**Scene 5 — Before/After (2:45–3:15)**
Show the same two reference screenshots again side-by-side, now paired with the "after" description: gate recessed into the house's top wall at row 15, matching the authentic layout.

**Scene 6 — Slide: Roadmap (3:15–3:45)**
Note the forward link to the upcoming "ghosts return home" feature (pm4-3), which will read this corrected map data.

**Scene 7 — Questions (3:45–4:00)**
Open floor.

*Note on live demo safety: only static screenshots are used in this walkthrough — no flashing or strobing visuals, per accessibility requirements.*
