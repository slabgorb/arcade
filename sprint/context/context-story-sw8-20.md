# Story sw8-20: star-wars: the ten ROM default high scores should carry wave null, not the fabricated wave 0

> **⚠ RULING:** User ruling 2026-08-06, settled before setup.
>
> **Display:** Null rows show no WAVE.
>
> Concretely:
> - Change the ten DEFAULT_HIGH_SCORES rows (plugins/star-wars/src/core/highScores.ts:21-30) from `wave: 0` to `wave: null`.
> - Fix drawHighScoreBoard so a null-wave row drops the "WAVE" label ENTIRELY (truly blank column — no "WAVE", no value), matching the ROM defaults which carry no level info.
> - Real player runs (a finite wave number) still render "WAVE N" exactly as today. Only null rows change.
> - Also update the highScores.ts comment (:14-16) so it states the value is `null` and why (no real run → honest null encoding, per Task 20's `number | null` widening), replacing the "wave: 0 clone artifact" note.

## Story Type
Feature

## Story Points
2

## Background

The ROM's default high-score table (INTINT initials + INTSCR scores, ~/Projects/star-wars-1983-source-text/TCHSCR.MAC:718-738, copied by DOINTS) carries ONLY initials + score. There is NO per-entry wave/level field in the ROM defaults.

The ROM high-score DISPLAY routine (TCHSCR.MAC, "DISPLAY THE HIGH SCORE TABLE") draws initials (INITLS) + score (HSCORS) ONLY. The ROM board has NO wave/level column at all. The entire "WAVE" column in our clone is an invention of the shared HighScoreEntry<'wave'> schema.

The arcade's monorepo migration (Task 20) widened HighScoreEntry's domain field to `number | null` specifically so a row with no real run can say so instead of inventing one, on the standing ruling that the cabinet must not invent a fact about a player's game.

Currently, the ten default rows in plugins/star-wars/src/core/highScores.ts (lines 21-30) use `wave: 0` as a marker for "no real run", and the comment at lines 14-16 acknowledges this is "a clone artifact, not a ROM value". However, when rendering these rows, the current code in plugins/star-wars/src/shell/render.ts (function drawHighScoreBoard, ~line 1652) builds the row as `${rank}  ${e.name}  ${pts}  WAVE ${wave}`.trimEnd(). For a null wave, the VALUE blanks but the literal label "WAVE" REMAINS, so a null row currently renders a dangling "WAVE" with no number — not a clean blank. The render must be fixed to drop the "WAVE" label entirely when wave is null, so null rows display with a truly blank column, matching the ROM defaults which carry no level information.

This story was declined from the monorepo migration's Task 20 review on 2026-07-31 because:
1. It is a DATA change inside a game's src/core, not the mechanical call-site update the main.ts carve-out authorises.
2. Nothing in the seeding task needed it, since the seed never touches DEFAULT_HIGH_SCORES.
3. It is a ROM-fidelity display decision with its own test file, so it deserves its own review rather than riding along in a migration commit.

The user has now ruled that null rows show no WAVE, settling the previously open question about the faithful render.

## Acceptance Criteria

1. The ten default rows encode 'no real run' as null rather than the fabricated 0, or the story records a ROM citation showing the cabinet really does display 0 for its defaults and closes as won't-fix.

2. Whatever is chosen, the value and the reason are stated in the file so the next reader does not re-derive it — the current comment already flags 0 as a clone artifact without acting on it.

3. The board's rendering of the default rows is asserted by a test that distinguishes a blank column from the string '0' and from the string 'null'. String(null) is 'null', a truthy non-empty string, so an assertion satisfied by 'a value was drawn' is satisfied by every wrong answer.

4. The existing star-wars high-score test file is updated rather than duplicated, and the change is proven non-vacuous by mutation.

## Files in Scope

- **plugins/star-wars/src/core/highScores.ts** — Change DEFAULT_HIGH_SCORES rows (21-30) from `wave: 0` to `wave: null`; update the comment (14-16) to explain why
- **plugins/star-wars/src/shell/render.ts** — Fix drawHighScoreBoard (~line 1652) to omit "WAVE" label when wave is null
- **plugins/star-wars/tests/core/default-high-scores.test.ts** — Update existing DATA test to verify the null encoding
- **plugins/star-wars/tests/shell/render.rebel-force-board.test.ts** — Update existing RENDER test to distinguish blank column from '0' and 'null' strings; prove non-vacuous by mutation

## Test Strategy

### Core Data Test
Update the existing test to verify the ten default rows now carry `wave: null` instead of `wave: 0`. Prove the test is non-vacuous by a mutation that restores `wave: 0`.

### Render Test
The existing render test must:
1. Verify that a null-wave row renders with a blank column (no "WAVE" label, no value)
2. Distinguish this from the string '0' (which would render as "WAVE 0")
3. Distinguish this from the string 'null' (which would render as "WAVE null", a truthy non-empty string)
4. Prove each assertion is non-vacuous by mutation (e.g., a mutant that removes the null-wave branch must redden this test)

## Delivery Notes

TEA must not re-open the settled display question. The user ruling is final: null rows show no WAVE. The implementation is only the mechanics (data + render fix + test updates).
