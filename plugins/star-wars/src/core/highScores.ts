// src/core/highScores.ts
//
// The ROM default high-score board (sw7-3 / H-015). A real cabinet's DOINTS
// (TCHSCR.MAC:701-716) copies 10 default entries — INTINT initials + INTSCR
// scores — into the table on a NOVRAM reset, so a fresh machine greets the
// player with the iconic Rebel names, not an empty ladder.
//
// The scores are PACKED BCD, not hex: `INTSCR: .WORD 0128,5353` is the
// decimal-digit string 0128'5353 = 1,285,353 (each nibble is a BCD digit). The
// initials are hex letter-indices A=1..Z=26: `INTINT: .BYTE 0F,02,09` =
// O(15) B(2) I(9) = OBI. Both decodes verified arithmetically against
// ~/Projects/star-wars-1983-source-text/TCHSCR.MAC:718-738.
//
// The ROM hi-score table carries no per-entry wave (and the ROM's board DISPLAY
// draws initials + score only — there is no wave column). Our HighScoreEntry<'wave'>
// schema still has the field, so a seeded default — which is NOT a real run — sets
// `wave: null`. sw8-20: null is the honest "no real run" encoding (Task 20 widened
// the domain field to `number | null` for exactly this), replacing the fabricated
// `wave: 0`, which invented a fact about a game nobody played. render.ts draws a
// null wave as a blank column (no "WAVE" label at all).
import type { HighScoreTable } from '@shared/highscore'

/** The ROM's 10 seeded high-score entries, highest first (INTINT / INTSCR). */
export const DEFAULT_HIGH_SCORES: HighScoreTable<'wave'> = [
  { name: 'OBI', score: 1_285_353, wave: null },
  { name: 'WAN', score: 1_110_936, wave: null },
  { name: 'HAN', score: 1_024_650, wave: null },
  { name: 'GJR', score: 872_551, wave: null },
  { name: 'MLH', score: 813_553, wave: null },
  { name: 'JED', score: 704_899, wave: null },
  { name: 'NLA', score: 518_000, wave: null },
  { name: 'EJD', score: 492_159, wave: null },
  { name: 'EAR', score: 384_766, wave: null },
  { name: 'RLM', score: 380_655, wave: null },
]

/**
 * DOINTS-on-reset: a fresh (empty) board gets the ROM defaults; a board that
 * already holds any real score is returned untouched — the ROM copies the
 * defaults on RESET only, never over a player's ladder.
 */
export function seedDefaultHighScores(loaded: HighScoreTable<'wave'>): HighScoreTable<'wave'> {
  return loaded.length === 0 ? [...DEFAULT_HIGH_SCORES] : loaded
}
