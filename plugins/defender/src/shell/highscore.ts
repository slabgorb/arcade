// src/shell/highscore.ts — df5-6 (Korben Dallas / Dev). The one-origin localStorage
// persistence seam for the hall of fame. The core owns the pure board (core/highscore.ts);
// this SHELL module holds only load-on-boot / save-on-commit, a thin adapter over the shared
// @shared/highscore factory — exactly the asteroids / missile-command shape. It is the ONLY
// high-score localStorage toucher (purity keeps it out of core).
//
// The whole cabinet serves from one origin (arcade.slabgorb.com/<id>/), so the board lives
// under highScoreKey('defender') === 'defender-high-scores' — the SAME key the lobby tile
// reads (the ADR-0004 cross-origin-cookie retirement). Defender's row is the base shape
// { name, score } with no domain field (the battlezone precedent), so it binds the
// domain-agnostic base guard isHighScoreRow directly.

import { makeHighScoreStorage, isHighScoreRow, type HighScoreStorage } from '@shared/highscore'
import type { DefenderHighScore } from '../core/highscore.js'

/** The one-origin cabinet game id — the localStorage key prefix and the R2 key prefix are
 *  both this. Kept in one place so a stray 'def'/'defend' typo can't split the board. */
export const DEFENDER_HIGH_SCORE_GAME_ID = 'defender'

/** The persistence seam main.ts wires: load-on-boot + save-on-commit, bound to the cabinet
 *  key with the base-shape { name, score } guard (battlezone precedent). */
export function makeDefenderHighScoreStorage(): HighScoreStorage<DefenderHighScore> {
  return makeHighScoreStorage<DefenderHighScore>(DEFENDER_HIGH_SCORE_GAME_ID, isHighScoreRow, '')
}
