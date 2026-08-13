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
import { DEFAULT_HIGH_SCORES, type MilliHighScore } from '../core/highscore.js'

/** The one-origin cabinet game id — the localStorage key prefix and the R2 key prefix
 *  are both this. Kept in one place so a stray 'milli'/'millepede' typo can't split the
 *  board across two keys. */
export const MILLI_HIGH_SCORE_GAME_ID = 'millipede'

/** The persistence seam ml7 wires: load-on-boot + save-on-commit, bound to the cabinet
 *  key with the base-shape { name, score } guard (battlezone/mc7 precedent). */
export function makeMilliHighScoreStorage(): HighScoreStorage<MilliHighScore> {
  return makeHighScoreStorage<MilliHighScore>(MILLI_HIGH_SCORE_GAME_ID, isHighScoreRow, '')
}

/** The ladder to boot with: the persisted board when the player has one, else the
 *  seeded ROM DEFAULT_HIGH_SCORES. `load()` returns [] for a first boot OR an
 *  unreachable/corrupt store, and an empty ladder would let ANY positive score qualify
 *  and blank the attract high-score readout — so the seeded 99$-block defaults stand
 *  until a real board is saved. */
export function loadHighScores(
  storage: HighScoreStorage<MilliHighScore>,
): readonly MilliHighScore[] {
  const saved = storage.load()
  return saved.length > 0 ? saved : DEFAULT_HIGH_SCORES
}
