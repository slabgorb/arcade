# Story pt1-8 Context

## Title
millipede + missile-command: erase the built-in high score

## Metadata
- **Story ID:** pt1-8
- **Type:** bug
- **Points:** 2
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Playtest bug sweep 2026-08-19 (pt1)

## Problem
Playtest 2026-08-19: both games ship a pre-seeded "built-in" high-score ladder.
Remove it so tables start clean, consistent with the rest of the fleet.

## Findings (research complete — both games)

**Only these two games seed a full board.** Fleet pattern: asteroids/battlezone/
centipede/joust/tempest/defender all boot with a bare `storage.load()`; star-wars
is the one partial precedent (`seedDefaultHighScores`, `plugins/star-wars/src/main.ts:65`).

**This is a conscious deviation FROM the ROM, and that must be recorded:** both
machines genuinely seed on power-on — missile-command `W3MAIN.MAC:481 JSR INIINI`
runs `INIINI` (`W3DSUP.MAC:3726`, `STRINI`/`SCOINI` `:3746-3748`) every boot
because the cabinet has NO persistent store; millipede's is the EAROM-init block
(`MLTST.MAC:97-112`). The browser cabinet HAS persistence (localStorage), so
keeping the seed is a divergence in the other direction. Record the removal as a
deliberate deviation in code comment + dossier; the existing claims are facts
about the MACHINE and stay (no orphan-claim check exists in either gate — verified).

**Missile-command seed points:**
- `src/core/highscore.ts:42-48` `DEFAULT_HIGH_SCORES` (5 rows, DFT 7500 … MJP
  6950, cited to `W3DSUP.MAC:3746-3748`); depth 5 at `:37`.
- `src/core/game.ts:177` — `createPlayGame()` seeds `highScores: DEFAULT_HIGH_SCORES`
  (every fresh state: attract, restart, over→attract at `game.ts:379`).
- `src/shell/highscore.ts:35-39` — empty-storage fallback to the defaults
  (rationale comment `:30-34`).
- Boot: `src/main.ts:50-51`; saves whole ladder at `:138-140` — so today the first
  real score PERMANENTLY persists 4 ROM rows into localStorage.
- Symptoms: HUD HI shows 7500 on a virgin browser (`render.ts:329` — has `?? 0`,
  safe when empty); qualification floor is 6950 (`@shared/highscore`
  `qualifiesForHighScore`, `src/shared/highscore.ts:81-90`); the LOBBY reads
  localStorage directly and says "NO SCORE" while the game says HI 7500
  (`lobby/src/shell/storage.ts:37`) — an inconsistency this story fixes for free.

**Millipede seed points:**
- `src/core/highscore.ts:52-61` `DEFAULT_HIGH_SCORES` (8 rows BBM 89175 … DFW
  41916, from `MLTST.MAC:97-112`); depth 8 `:42`.
- `src/core/game-state.ts:175` seed; `src/shell/highscore.ts:65-70` fallback;
  boot `src/main.ts:53,57`, save `:105-107`.
- **HAZARD:** `src/main.ts:292` reads `state.highScores[0].score` UNGUARDED — an
  empty ladder throws inside the rAF loop (the freeze class
  `tests/highscore-hostile-board.test.ts` exists for). Needs `?.`/`?? 0`.
- `src/core/attract-showcase.ts:138-154` iterates the board — safe empty, but the
  showcase high-score page renders title-only; acceptable, note it.
- `@shared/highscore` migration seed from the legacy cookie
  (`src/shared/highscore.ts:303-307`) is unrelated — leave it.

**Intended consequence in both:** with an empty board, any positive score
qualifies (`qualifiesForHighScore` table<depth → true). That's the clean-board
behavior, not a bug.

## Technical Approach
Same minimal shape in both games — stop SEEDING, keep the cited constants:
- mc: `game.ts:177` → `highScores: []`; `shell/highscore.ts:39` → return
  `storage.load()` verbatim.
- ml: `game-state.ts:175` → `[]`; `shell/highscore.ts:69` → verbatim; guard
  `main.ts:292`.
Keep `DEFAULT_HIGH_SCORES` exported in both (cited ROM decodes; several
source-derived tests use them as fixtures; deleting strands claims across 6+ test
files for zero gain). Record the deviation (code comment + dossier note citing
`W3MAIN.MAC:481` / `MLTST.MAC:97`).

## Scope
- In scope: the two seed points + two fallbacks, the millipede `main.ts:292`
  guard, deviation notes, test rewrites below.
- Out of scope: deleting the constants/claims; @shared/highscore changes; other
  games; the lobby (it already behaves correctly).

## Tests affected
**missile-command:** `tests/highscore.test.ts:66-72,134-215` (defaults block +
qualify fixtures keyed on the seeded board, 6949/6950/6951 boundary);
`tests/mc7-3-name-entry-wiring.test.ts:373-377` ("falls back to the seeded ROM
ladder" — THE pin to invert); `tests/mc6-5-attract-presentation.test.ts:214-249`;
`tests/mc7-4-ladder-display.test.ts:248-265` ("seeded default ladder is UNTOUCHED
(lock)" — retire); `mc7-2`/`mc11-3` use the ladder as a full-board fixture —
survive if the export stays. `tests/citations-source.test.ts:591-637` derives from
source only — unaffected.
**millipede:** `tests/highscore.test.ts:69-89` (decode equality — keep, it tests
the constant not the seeding); `tests/high-score-persistence.test.ts:141-146,
181-188,216-225,241-246` (four fallback assertions — invert);
`tests/highscore-wiring.test.ts:22,43,239,268` (createGame seeds — invert);
`tests/attract-showcase*.test.ts` (switch fixture boards to local literals);
`tests/highscore-hostile-board.test.ts` (extend: empty board never throws);
`tests/audit/high-scores-claims.test.ts` (claims stay → stays green).

## Acceptance Criteria
_TEA to define at RED. Suggested: AC1 a virgin browser shows an empty ladder in
both games (HUD HI 0 / no rungs) and the first real score enters name entry; AC2
localStorage never contains a ROM-seeded row; AC3 millipede's rAF loop survives an
empty board; AC4 the deviation from `INIINI`/EAROM-init is recorded with
citations; AC5 both citation gates stay green with the claims retained._

---
_Generated by `pf context create story pt1-8`; researched and expanded by Architect 2026-08-19._
