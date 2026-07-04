# Epic A2 Context

## Title
Asteroids — playtest followup

## Overview
Follow-up epic from the first live playtest of the Asteroids slice (epic A). Captures polish and clarity fixes surfaced by playing the game in the browser. Sequenced after epic A; tagged p2. Focus areas: visual clarity (playfield boundary), typography polish.

## Metadata
- **Epic ID:** A2
- **Repo:** asteroids
- **Priority:** p2
- **Status:** backlog

## Background
Epic A (faithful 1979 vector clone) landed the core gameplay: ship flight, rock splitting, waves, saucers. The first live playtest revealed usability and visual polish gaps that don't affect core mechanics but improve player onboarding and aesthetic cohesion.

## Key Findings from Epic A Playtest

1. **Playfield boundary ambiguity (A2-1).** Players don't immediately recognize where the play area ends and the non-playable margin begins. The screen edge reads as arbitrary rather than a bounded arena. Solution: overlay a light mask over the margin.

2. **Typography cramping (A2-2).** Vector font letter spacing is too tight, reducing readability of score/UI. Adjust glyph spacing for legibility without sacrificing the hand-drawn aesthetic.

## Cross-Story Guardrails (inherited from epic A)

All stories in A2 work within the established rendering and input contracts from epic A:

- **Render entry point:** `render(ctx, state, W, H, input)` in `src/shell/render.ts` (stateless, called once per frame).
- **Projection:** `toScreen(x, y, view)` maps world lo-units → screen; `strokePoly(ctx, pts, view, color, close)` strokes glowing vector shapes.
- **Hard boundary:** renderer lives in `src/shell/`, imports only core types and constants, reads `GameState` immutably.
- **Input:** `createInputController()` in `src/shell/input.ts` maps keydown/keyup → core `Input`.
- **Visual verification:** any story that changes the rendered scene must eyeball-verify in the dev server (`:5275`) before "done".

## Story Sequencing

- **A2-1** (2 pts, TDD) — Playfield margin mask (visual clarity)
- **A2-2** (1 pt, trivial) — Vector font letter spacing (typography polish)

Both are independent and can be worked in parallel once A2-1 is complete.

## Forward Notes

- No new game mechanics or simulation changes in A2 — purely visual/UX polish.
- After A2, the next epic (A3) will focus on content: new waves, saucer variations, extended gameplay.
- Keep all A2 changes localized to `src/shell/render/` and `src/shell/input.ts` where applicable; core sim (`src/core/`) remains untouched.
