// src/shell/highscore.ts
//
// Story mc7-3 (GREEN, Yoda) — the one-origin localStorage persistence seam. The
// core owns the ladder (mc7-1 table, mc7-2 qualify/insert/entry); this SHELL module
// holds only load-on-boot and save-on-commit, exactly as the fleet's asteroids/
// joust/battlezone consumers do. No new mechanism — a thin adapter over the shared
// @shared/highscore factory.
//
// The whole cabinet serves from one origin (arcade.slabgorb.com/<id>/), so the
// board lives under highScoreKey('missile-command') === 'missile-command-high-scores'
// — the SAME key the lobby tile reads. Missile Command's row is the base shape
// { name, score } with NO domain field (unlike tempest's `level` / asteroids' `wave`),
// so — following the battlezone precedent — it binds the domain-agnostic base guard
// `isHighScoreRow` directly rather than makeHighScoreRowGuard(field).

import { makeHighScoreStorage, isHighScoreRow, type HighScoreStorage } from '@shared/highscore'
import { type MissileCommandHighScore } from '../core/highscore.js'

/** The one-origin cabinet game id — the localStorage key prefix and the R2 key
 *  prefix are both this. Kept in one place so a stray 'mc'/'missilecommand' typo
 *  can't split the board across two keys. */
export const MC_HIGH_SCORE_GAME_ID = 'missile-command'

/** The persistence seam main.ts wires: load-on-boot + save-on-commit, bound to the
 *  cabinet key with the base-shape { name, score } guard (battlezone precedent). */
export function makeMcHighScoreStorage(): HighScoreStorage<MissileCommandHighScore> {
  return makeHighScoreStorage<MissileCommandHighScore>(MC_HIGH_SCORE_GAME_ID, isHighScoreRow, '')
}

/** The ladder to boot with: the persisted board, or EMPTY on a first boot (pt1-8: no
 *  built-in seed — the ROM DEFAULT_HIGH_SCORES ladder is no longer seeded here). `load()`
 *  returns [] for a first boot OR an unreachable/corrupt store, so a fresh cabinet starts
 *  clean and any positive score then qualifies (filling the board). */
export function loadHighScores(
  storage: HighScoreStorage<MissileCommandHighScore>,
): readonly MissileCommandHighScore[] {
  return storage.load()
}
