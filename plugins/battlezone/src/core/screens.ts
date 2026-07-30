// src/core/screens.ts
//
// Story bz1-10 — the attract/title and game-over screen CONTENT, as pure core
// data. The shell strokes these lines verbatim (layout/glow are shell
// concerns; WORDS are core data so they stay testable — the house split).
//
// The epic's coin-op descope is load-bearing here: the arcade has no money
// model, so these screens carry the game title, the board, and a plain
// press-start prompt — and nothing else. tests/core/screens.test.ts enforces
// the ban on rendered lines AND on this file's string literals.

import type { HighScoreTable } from './state'
import { MESSAGES } from './text'

/** The attract/title screen: title, the board (when there is one), the prompt.
 *  The board header, prompt, and game-over strings draw from the canonical ROM
 *  roster (core/text.ts) so the two sources cannot drift (bz1-12). */
export function attractLines(table: HighScoreTable): readonly string[] {
  const lines: string[] = ['BATTLEZONE', '']
  if (table.length > 0) {
    lines.push(MESSAGES.HIGH_SCORES)
    for (const entry of table) {
      lines.push(`${entry.name}  ${entry.score}`)
    }
    lines.push('')
  }
  lines.push(MESSAGES.PRESS_START)
  return lines
}

/** The game-over screen: the verdict and the run's score. */
export function gameOverLines(score: number): readonly string[] {
  return [MESSAGES.GAME_OVER, `${MESSAGES.SCORE} ${score}`, '']
}

/** The initials-entry screen (SH2-13): the prompt plus the buffer typed so
 *  far, with a cursor slot while the 3-char convention still has room. What
 *  the player types is exactly what commits — no auto-tagged constant. The
 *  banner is the ROM's qualifying-run congratulation, L1MSG = 'GREAT SCORE'
 *  (BZONE.MAC:4302), not a generic high-score label (bz3-13 / S-020). */
export function entryLines(initials: string): readonly string[] {
  return [
    MESSAGES.GREAT_SCORE,
    'ENTER YOUR INITIALS',
    '',
    initials.length < 3 ? `${initials}_` : initials,
    '',
    'TYPE A-Z  BACKSPACE FIXES  ENTER CONFIRMS',
  ]
}
