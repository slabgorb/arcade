// src/shell/highscoreScreen.ts
//
// Story jt10-7 (GREEN, Loki) — the shell HIGH-SCORE overlay. Lays the JOUST
// CHAMPIONS table out as glyph-placement ops the existing atlas/blit path can
// paint, the same testable seam jt10-1's fontRender.ts established and jt10-5's
// selectScreen.ts reused: return layout DATA, paint pixels elsewhere. The heading
// uses FONT57 (the wide banner font); the score rows and the entry prompt use
// FONT35 (the tight score font).
//
// The heading string is REUSED from core/highscore — never re-transcribed here, so
// the ROM text has one spelling and one citation. The PROMPT is passed in by the
// caller (main.ts picks champion vs lesser via promptForRank), so this module only
// lays out the chosen line. Screen POSITIONS are the caller's job (main.ts offsets
// each laid-out line onto the backbuffer); this module decides font, string and
// colour per line.

import { layoutText, type LaidOutText } from './fontRender.js'
import { CHAMPIONS_HEADING, type JoustHighScore } from '../core/highscore.js'
import type { Rgba } from './render.js'

/** The laid-out lines of the high-score screen. */
export interface HighscoreScreenLayout {
  /** The CHAMPIONS_HEADING (core/highscore), in FONT57. */
  readonly heading: LaidOutText
  /** One row per table entry (rank · initials · score), in FONT35. */
  readonly rows: readonly LaidOutText[]
  /** The rank-selected entry prompt in FONT35, or null when no entry is in progress. */
  readonly prompt: LaidOutText | null
}

/** One table row's text: rank, initials, score. Positions/spacing are a human
 *  smoke test; this is the faithful in-game row order (rank · initials · score). */
function rowText(rank: number, entry: JoustHighScore): string {
  return `${rank} ${entry.name} ${entry.score}`
}

/**
 * Lay the high-score screen out in `colour`. The heading goes in FONT57, each table
 * row and the (optional) entry prompt in FONT35. Whole-pixel ops, origin-relative —
 * the caller offsets them onto the backbuffer. `prompt` is the already-selected
 * prompt string (main.ts chose it via promptForRank); omit/null when just
 * displaying the board.
 */
export function layoutHighscoreScreen(
  colour: Rgba,
  table: readonly JoustHighScore[],
  prompt: string | null = null,
): HighscoreScreenLayout {
  return {
    heading: layoutText('FONT57', CHAMPIONS_HEADING, colour),
    rows: table.map((entry, i) => layoutText('FONT35', rowText(i + 1, entry), colour)),
    prompt: prompt !== null ? layoutText('FONT35', prompt, colour) : null,
  }
}
