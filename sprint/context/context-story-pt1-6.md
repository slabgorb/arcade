# Story pt1-6 Context

## Title
defender/lobby: hook the lobby up to defender's attract feature

## Metadata
- **Story ID:** pt1-6
- **Type:** bug
- **Points:** 3
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Playtest bug sweep 2026-08-19 (pt1)

## Problem
Playtest 2026-08-19: defender's attract feature seems unhooked from the lobby.

**Architect research (2026-08-19) — REFRAME: the hookup already exists.** Defender
opted into the lobby showcase carousel in df7-7 (`plugins/defender/plugin.ts:21`
`showcase: true`; generated entry `src/host/registry.ts:124-133`; roster pinned by
`src/host/registry.test.ts:196-208`). The carousel is the lobby's one attract seam:
a single live iframe of `/<id>/` cycling through opted-in games
(`lobby/src/core/showcase.ts:32-89` pure state, `lobby/src/shell/showcase.ts:84-302`
DOM/clock, mounted from `lobby/src/main.ts:30-37`). The playtest symptom is real,
but its causes are three concrete gaps, not a missing registration:

## Findings — the three real gaps

**(a) The attract demo can die and never recover — a frozen GAME OVER slide.**
`composeFrame` short-circuits to the GAME OVER screen on `state.gameOver`
(`plugins/defender/src/core/scene.ts:383-388`). In attract, `advancePhase` reacts
only to `startRequested` — `gameOver` is ignored (`plugins/defender/src/core/phase.ts:74-75`),
and `advanceStart` reseeds only on `setup→play` and `game-over→attract`
(`src/core/start.ts:94-101`). `killPlayer` sets `rt.gameOver` at men<0
(`src/core/sim.ts:479-487`). So after the demo AI loses 3 men, `/defender/` shows a
static GAME OVER forever — and the lobby iframe's launch anchor is a click-shield
(`lobby/src/shell/showcase.ts:105-111`), so nothing can restart it. This fails the
liveness gate's frozen-frame definition (`tests/showcase-liveness.test.mjs:102-115`).
Reuse-first precedent: pac-man reseeds in-core on attract game-over
(`plugins/pac-man/src/core/game.ts:137-139, 428, 555`); joust has an attract
sub-cycle scheduler (`plugins/joust/src/core/attract-scheduler.ts`).

**(b) No attract screen — raw gameplay with no branding/PUSH START.**
`composeFrame` has no attract branch (only play field / GAME OVER / hall-of-fame),
so the showcase pane reads as "someone playing", not "DEFENDER demo". Every other
showcase game paints one: joust `shell/attractScreen.ts`, missile-command
`shell/attract.ts`, pac-man pm4-9, millipede `core/attract-showcase.ts`. NOTE the
standing defender trap: raster compose lives in **core**/scene.ts, not shell — an
attract overlay lands in `composeFrame` and must keep `purity.test.ts` green.

**(c) Defender is effectively unreachable in the rotation.**
The carousel always starts at index 0 (`lobby/src/core/showcase.ts:35`, pinned by
`lobby/tests/showcase.test.ts:39`) in registry order; defender is last of 9 at
`SLIDE_MS = 20_000` (`lobby/src/shell/showcase.ts:68`) — first visible at t≈160s,
20s per 180s cycle. The playtester very likely never saw it. A randomized start
index (or rotating persistence) is a lobby-side change that must update
`showcase.test.ts:39`.

**Defender's attract itself is sound:** pure `attractInput(sim)` auto-player
(`plugins/defender/src/core/attract.ts:64-83` — patrols, hunts landers, smart-bombs
on a camera-derived duty cycle), exits on `hasPlayerInput()` or start
(`attract.ts:88-92` → `phase.ts:74-75`), boots into attract at
`plugins/defender/src/main.ts:70`, stepped silent at `:145-150`.

## Technical Approach
Fix the three gaps, smallest change first:
1. **Attract self-reset (core):** on `gameOver` while `phase === 'attract'`, reseed
   the sim (the pac-man precedent) — in `advancePhase`/`advanceStart`, pure,
   deterministic (rand-driven, no clocks; purity gate armed over `src/core`).
2. **Attract framing (core scene):** an attract branch in `composeFrame` — wordmark
   + PUSH START over (or alternating with) the demo, per the fleet's pattern. No
   strobe (ADR-0005 / Decision B; df7-7's playtest test already asserts no-strobe).
3. **Rotation reachability (lobby):** randomize/persist the carousel start index in
   `createShowcase` (`lobby/src/core/showcase.ts:35`) so the 9th game is seen;
   update `lobby/tests/showcase.test.ts:39` ("starts on the first entry").
Verify with `just check-showcase-alive` (Playwright pixel-liveness, `justfile:382`).

## Scope
- In scope: the three gaps above (defender core attract-reset + attract framing;
  lobby start-index reachability).
- Out of scope: per-tile previews (the lobby has none — no iframe/gif/video per
  tile, `lobby/src/shell/tiles.ts:56-90`); a `?attract` query param (doesn't exist
  in defender); any manifest/contract change (`showcase: true` already suffices —
  `GameMeta` needs no new field for this).

## Tests affected
- `lobby/tests/showcase.test.ts` (esp. `:39` start-index), `showcase-dom.test.ts`,
  `lobby/tests/main.test.ts:151-171`, `lobby/tests/chrome.test.ts:146-250`.
- `src/host/registry.test.ts:176-208` (roster — unchanged if membership stays).
- Defender: `df7-3-attract.test.ts`, `df7-7-lifecycle-playtest.test.ts` (per-phase
  frames + no-strobe), `df7-1-phase.test.ts`, `purity.test.ts`.
- Gates: `tests/showcase-liveness.test.mjs` contract; `just check-showcase-alive`.

## Acceptance Criteria
_TEA to define at RED. Suggested: AC1 an attract-phase gameOver reseeds the demo
(no frozen GAME OVER — pinned in core); AC2 attract frames carry the DEFENDER
wordmark/PUSH START framing, no strobe; AC3 the carousel start index makes defender
reachable within one dwell cycle in practice; AC4 purity + df7-7 playtest tests
stay green._

---
_Generated by `pf context create story pt1-6`; researched and expanded by Architect 2026-08-19._
