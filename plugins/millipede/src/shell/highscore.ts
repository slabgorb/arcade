// src/shell/highscore.ts
//
// Story ml5-4 (GREEN, Yoda) — the one-origin localStorage persistence seam. ml5-3
// landed the pure CORE ladder (src/core/highscore.ts: the table, qualify/insert,
// initials, and the seeded ROM DEFAULT_HIGH_SCORES); this SHELL module holds only
// load-on-boot and save-on-commit, exactly as the fleet's asteroids / joust / mc7
// consumers do. No new mechanism — a thin adapter over the shared @shared/highscore
// factory. The source's EAROM (MLTST.MAC:36-150) maps to localStorage here; it is NOT
// chip emulation.
//
// The whole cabinet serves from one origin (arcade.slabgorb.com/<id>/), so the board
// lives under highScoreKey('millipede') === 'millipede-high-scores' — the SAME key the
// lobby tile reads. A Millipede row is the base shape { name, score } with NO domain
// field (unlike tempest's `level` / asteroids' `wave`), so — following the battlezone /
// missile-command precedent — it binds the domain-agnostic base guard `isHighScoreRow`
// directly rather than makeHighScoreRowGuard(field).
//
// Deliberately UNWIRED: millipede's main.ts is still the attract-screen demo (ml7-3);
// the game state machine that reads this on boot and calls save() on a name-entry
// commit is ml7's job. This story delivers the module ml7 will call.

import { makeHighScoreStorage, isHighScoreRow, type HighScoreStorage } from '@shared/highscore'
import { type MilliHighScore } from '../core/highscore.js'

/** The one-origin cabinet game id — the localStorage key prefix and the R2 key prefix
 *  are both this. Kept in one place so a stray 'milli'/'millepede' typo can't split the
 *  board across two keys. */
export const MILLI_HIGH_SCORE_GAME_ID = 'millipede'

/** The persistence seam ml7 wires: load-on-boot + save-on-commit, bound to the cabinet
 *  key with the base-shape { name, score } guard (battlezone/mc7 precedent). */
export function makeMilliHighScoreStorage(): HighScoreStorage<MilliHighScore> {
  return makeHighScoreStorage<MilliHighScore>(MILLI_HIGH_SCORE_GAME_ID, isHighScoreRow, '')
}

/** Only A-Z / 0-9 / space in a name, and a score whose DECIMAL STRING is those same
 *  digits, are renderable by the millipede glyph encoder (attract-showcase.ts encodeChar
 *  throws on anything else). `isHighScoreRow` gates SHAPE only (`typeof name === 'string'
 *  && isFinite`), so a legacy-cookie seed or a hand-edited store can plant a lowercase
 *  name / a negative or fractional score that crashes the uncaught attract rAF loop.
 *  Filter to the RENDERABLE set here — the one place the untrusted board enters GameState
 *  — so the strict encoder still guards its ROM-constant callers (ml10-2 rework [SEC]).
 *
 *  The score bound is `<= Number.MAX_SAFE_INTEGER`, NOT merely `Number.isInteger && >= 0`:
 *  `Number.isInteger(1e21)` is `true`, but `String(1e21) === "1e+21"` and `encodeChar`
 *  throws on the `e`/`+`. JS switches Number#toString to exponent notation at exactly 1e21,
 *  and MAX_SAFE_INTEGER (~9e15) is well below that, so any admitted score stringifies to
 *  plain digits (ml10-2 rework r2 [SEC] residual — a 21-digit plain cookie / hand-edit). */
const RENDERABLE_NAME = /^[A-Z0-9 ]*$/
function isRenderableRow({ name, score }: MilliHighScore): boolean {
  return (
    RENDERABLE_NAME.test(name) &&
    Number.isInteger(score) &&
    score >= 0 &&
    score <= Number.MAX_SAFE_INTEGER
  )
}

/** The ladder to boot with: the persisted board, or EMPTY on a first boot (pt1-8: no
 *  built-in seed — the ROM DEFAULT_HIGH_SCORES ladder is no longer seeded here). `load()`
 *  returns [] for a first boot OR an unreachable/corrupt store, so a fresh cabinet starts
 *  clean and any positive score then qualifies (filling the board). Rows the millipede
 *  encoder cannot render are dropped (ml10-2 rework [SEC]); the board stays [] if that
 *  empties it. */
export function loadHighScores(
  storage: HighScoreStorage<MilliHighScore>,
): readonly MilliHighScore[] {
  return storage.load().filter(isRenderableRow)
}
