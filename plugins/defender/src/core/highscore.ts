// src/core/highscore.ts — df5-6 (Korben Dallas / Dev). The PURE hall-of-fame data flow.
// Defender CONSUMES @shared/highscore + @shared/name-entry (design spec §7: this is where
// df5 consumes @shared, not where it adds to it) — it maps Defender's score format onto the
// shared table and does NOT re-implement the table logic or the initials stepper.
//
// ROM ground truth: *HALL OF FAME ENTRY / HALLOF (AMODE1.SRC:117,119); the board is initials
// + score (CRHSTD RMB 12), i.e. the @shared base row { name, score } with no domain field —
// the battlezone / missile-command precedent (bind the base guard, domain key '').
//
// Pure core: no localStorage (that is the shell seam, src/shell/highscore.ts). The WIRING of
// WHEN a game-over commits a score / enters initials is df7 (Decision C).

import {
  qualifiesForHighScore,
  insertHighScore,
  type HighScoreEntryBase,
} from '@shared/highscore'
import { stepNameEntry } from '@shared/name-entry'

/** A Defender hall-of-fame row: the @shared base shape (initials + score), no domain field. */
export type DefenderHighScore = HighScoreEntryBase

/** Arcade initials are three characters (the ROM's HALL OF FAME INITIALS ENTRY). */
export const INITIALS_LENGTH = 3

/**
 * Step the initials buffer with one keypress, consuming the shared 3-char name-entry
 * stepper (HALL OF FAME INITIALS ENTRY, AMODE1.SRC:242). A thin cap wrapper — the stepper
 * itself is @shared, not re-implemented here.
 */
export function stepInitials(buffer: string, key: string): string {
  return stepNameEntry(buffer, key, INITIALS_LENGTH)
}

/**
 * Commit a completed game's score to the board: if it qualifies, return a NEW table with the
 * entry inserted in descending order (both via the shared table logic); otherwise the table is
 * unchanged. Maps Defender's { name, score } onto the shared table — the *ADD SCORE AND
 * INITIALS TO LIST* flow (AMODE1.SRC:270). Pure; df7 decides when to call it.
 */
export function commitHighScore(
  table: readonly DefenderHighScore[],
  entry: DefenderHighScore,
): DefenderHighScore[] {
  if (!qualifiesForHighScore(table, entry.score)) return table.slice()
  return insertHighScore(table, entry)
}
