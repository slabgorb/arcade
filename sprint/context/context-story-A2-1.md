# Story A2-1 Context

## Title
Make playfield clear — overlay the non-playable margin with a light mask so the play area reads as clearly bounded

## Metadata
- **Story ID:** A2-1
- **Type:** feature
- **Points:** 2
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** asteroids
- **Epic:** A2 (Asteroids — playtest followup)

## Problem
From the first live playtest of Asteroids (epic A), it became clear that players struggle to immediately perceive the playfield boundary. The play area is not visually delineated from the non-playable margin (the screen edges where no game objects spawn or interact). This ambiguity slows initial understanding and reads as incomplete.

## Technical Approach

**1. Identify the playfield bounds**
- The Asteroids playfield is a rectangular region defined in the core simulation (likely in `asteroids/src/core/`). Identify the exact pixel/coordinate bounds of the play area relative to the canvas.
- Example: if the playfield is 600×800 and centered in a 800×600 canvas, the margins are 100px on left/right and 0px on top/bottom.

**2. Render a margin mask overlay in the shell**
- Add a new rendering layer in `asteroids/src/shell/render/` that draws over the non-playable margin areas.
- The mask should cover:
  - Left margin (x < playfield_left)
  - Right margin (x > playfield_right)
  - Top margin (y < playfield_top)
  - Bottom margin (y > playfield_bottom)
- Render the mask as a semi-transparent dark overlay (e.g., `rgba(0, 0, 0, 0.3)`) so the playfield stands out distinctly.

**3. Integrate into the render pipeline**
- Call the margin-mask rendering function after the core playfield is drawn and before HUD elements.
- Ensure the mask does not obscure important UI (score, high score, lives, etc.).
- Test with different canvas aspect ratios and screen sizes.

**4. Testing approach (TDD: RED phase)**
- Unit tests for the mask region calculation: given playfield bounds, assert correct margins.
- Visual tests in the dev server (:5273): verify the mask visually delineates the play area.
- Regression tests: ensure existing playfield and HUD rendering are unchanged.

## Acceptance Criteria
- A visual mask is rendered over the non-playable margin areas, clearly delineating the playfield boundary
- The mask color and opacity are visually readable and do not obscure gameplay or UI elements
- The margin is consistently masked across all screen sizes and aspect ratios
- Visual appearance is verified in the dev server (:5273) and matches the design intent
- Tests validate the mask rendering logic; npm run build clean and tests green

## Key Files
- **Core:** `asteroids/src/core/` — identifies playfield bounds
- **Shell Render:** `asteroids/src/shell/render/` — adds mask rendering logic
- **Tests:** `asteroids/tests/shell/render/` (or similar) — unit and visual tests

## Related Context
- Epic A introduced the core Asteroids gameplay and visuals; A2-1 is the first UX polish story following the initial playtest.
- Sibling story A2-2 adjusts vector font letter spacing (separate concern).

## Notes
- The mask should be a simple visual overlay; no gameplay logic changes.
- Consider using CSS/Canvas compositing for the overlay (e.g., `globalAlpha` or a solid rectangle).
- Verify the mask appearance at different zoom levels and on different browser rendering engines (Chrome, Firefox, Safari).
