# pm6-2

## Problem

Problem: When a Pac-Man player clears the second level, the original 1980 arcade cabinet doesn't just pause — it rewards them with a short animated cartoon: Blinky the ghost chases Pac-Man across the screen, then a giant Pac-Man turns the tables and chases a frightened Blinky back the other way. Our clone had the pause (built earlier) but not the cartoon. Why it matters: this "coffee break" cutscene is one of the most iconic, most-remembered moments in the entire game — it's the reward that made 1980 arcades linger in players' memories. Without it, our clone stops at the exact moment the original starts to delight. It also has to be built to the same accessibility standard as the rest of this project: no flashing or strobing effects, since large-area flicker can trigger photosensitive seizures.

## What Changed

Think of the original game's cartoon as a tiny puppet show with very precise stage directions written in 1980 machine code: "Pac-Man walks to this exact spot, then the ghost gives chase, then at this exact spot the ghost gets scared and turns blue, then a giant Pac-Man appears and chases it back to this other exact spot, and the show ends."

We built two things:

1. **A cutscene "player"** — a small, self-contained engine that can run one of these scripted mini-shows. It's deliberately simple and predictable: given the same starting conditions, it always plays out exactly the same way, frame for frame, every time. That predictability is what lets us test it reliably and guarantees the show never glitches or drifts.
2. **Act 1 itself** — the actual "Blinky chase, then big Pac-Man chase-back" scene, built by reading the original 1980 program's own instructions line-by-line and matching our version's positions, timing, and behavior against them. Every number that drives the scene (where actors start, when the ghost gets scared, how fast the mouths chew, how the ghost's legs wiggle) is tied directly back to a specific line in the original code — so if anyone changes those numbers later, they'll break in a way we notice immediately, not silently drift out of sync with the real game.

One correction came out of that fidelity check: the story's working title said the ghost gets "ripped" (torn apart) on the way back. Reading the original code showed that's wrong — in Act 1, the ghost that gets chased back is simply the same "scared blue ghost" sprite used elsewhere in the game, not a torn sprite. The torn-ghost version is a different scene (Act 2), planned for a later story. We fixed the behavior to match what the original game actually does rather than what the title assumed.

The cutscene reuses artwork that was already built and approved in an earlier story — no new artwork was created here, only the choreography that moves it around the screen.

## Why This Approach

We didn't invent the timing or movement of this scene — we extracted it directly from the original 1980 game's program code, the same way a film restoration project would work from the original camera negative rather than guessing from a fuzzy VHS copy. That matters for three reasons:

- **Authenticity**: players who remember the arcade original will see the same scene play out, not our best guess at what "felt right."
- **Traceability**: every timing number and position in our version is labeled with exactly which line of the original 1980 code it came from. If a fan or a future engineer questions "why does the ghost turn at this exact spot," there's a documented, verifiable answer.
- **Safety net against silent breakage**: we deliberately built the tests so that if someone accidentally changes one of these numbers in the future, a test immediately fails and points at the animation, not just an abstract checklist. That protects the scene from quietly drifting out of shape over time.

We also treated the "no strobing" accessibility rule as non-negotiable, even though the original arcade cabinet has no such constraint. The only motion in this scene is small, localized animation (mouths chewing, legs wiggling) — never a full-screen flash — which keeps the game safe for players sensitive to photosensitive triggers while still preserving the original's visual charm.
