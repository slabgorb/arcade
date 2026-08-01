# Context — Story ad1-2: battlezone self-play attract demo

## Story ID
ad1-2

## Epic
ad1 — Attract demos — the self-play the cabinets owe the lobby

## Title
battlezone self-play attract demo — drive and duel unattended behind the attract text, then opt in

## Type
feature

## Points
1

## Background

REPURPOSED 2026-08-01 (user ruling at setup: 5pt tdd → 1pt trivial).

The story's substantive work already shipped in the bz1-10 era. The epic description's claim that battlezone shows "rotating text pages" is REFUTED on the current tree (likely pattern-matched from star-wars at filing).

**Measured census:**

- `plugins/battlezone/src/core/sim.ts:10` — "Attract is a SELF-PLAYING demo (story AC)" — attract runs the full battle step (stepGame calls stepBattle with the demoInput autopilot: patrol arc + pot-shots) including stepEnemies AND stepSaucer, so the tank drives and duels unattended, immortal, deterministic from the boot seed.

- `plugins/battlezone/src/main.ts:307-309` — "the demo battlefield keeps playing behind the text (attract)" — the story title's exact phrase, already a shipped comment.

- All 11 battlezone test files mention attract (bz1-10-era coverage).

**Unverified claim:** SM did not compare the autopilot's choreography against the 1980 ROM's actual attract behaviour. No divergence is claimed and none was measured. This epic demands existence of a self-play demo, not a choreography audit.

## Problem Statement

The lobby showcase carousel (uf1-6) frames each game's LIVE attract mode. Battlezone's attract demo is already a self-playing tank that drives and duels behind the attract text, but the game is not opted into the showcase carousel. The manifest's `showcase` field is set to `false`.

## Acceptance Criteria

1. plugins/battlezone/plugin.ts sets showcase: true (listed stays true; no other manifest field changes)
2. src/host/registry.ts is regenerated via npm run gen:registry in the same commit, and battlezone's registry entry carries showcase: true
3. Verified in the served lobby that battlezone appears in the showcase carousel and its attract demo visibly drives and duels behind the attract text (the battlefield moves - not a static text page)

## Technical Approach

**Step 1:** Flip `showcase: false` → `true` at `plugins/battlezone/plugin.ts:12`. No other manifest field changes. The field `listed` remains `true`.

**Step 2:** Regenerate `src/host/registry.ts` via `npm run gen:registry` in the same commit (not a separate one). Verify the regenerated file contains battlezone's entry with `showcase: true`.

**Step 3:** Serve the lobby locally (`just serve` on port 5270), navigate to the lobby index, and verify that:
- Battlezone appears in the showcase carousel
- The attract demo visibly drives and duels (the battlefield changes, not a static text page)

All substantive work — the autopilot logic, the battle step integration, and the test coverage — shipped in the bz1-10 era and is verified by the test suite. This story is the final opt-in flag.

## References

- Story description in sprint/epic-ad1.yaml (repurposed 2026-08-01)
- Plugin manifest: plugins/battlezone/plugin.ts
- Registry generation script: npm run gen:registry (runs scripts/gen-registry.mjs)
- Test coverage: plugins/battlezone/tests/ (all 11 test files reference attract)
- Demo code: plugins/battlezone/src/core/sim.ts:10, plugins/battlezone/src/main.ts:307-309

## Related Stories

- **ad1-1:** star-wars self-play attract demo
- **ad1-3:** asteroids self-play attract demo
- **ad1-4:** joust attract simulation
- **ad1-5:** red-baron attract demo
- **ad1-6:** red-baron control strings (paired with ad1-5)

## Context Validated
Yes — measured from the current tree and story description as of 2026-08-01.
