// src/shell/gameOverScreen.ts
//
// Story jt10-6 (GREEN, Loki) — the shell GAME-OVER OVERLAY layout. Lays the
// game-over banner out as glyph-placement ops the existing atlas/blit path can
// paint, the same testable seam jt10-1's fontRender.ts established and jt10-5's
// selectScreen.ts reused: return layout DATA, paint pixels elsewhere. The banner
// uses FONT57 (the stylized wide banner font), matching the two select START labels.
//
// The ROM string is REUSED from core/cabinet (GAME_OVER_TEXT) — never re-transcribed
// here, so the text has one spelling and one citation (MSGOVR $00, MESSEQU.SRC:18).
// The screen POSITION is the caller's job (main.ts paints the laid-out banner at its
// chosen offset); this module only decides the font, the string and the colour.

import { layoutText, type LaidOutText } from './fontRender.js'
import { GAME_OVER_TEXT } from '../core/cabinet.js'
import type { Rgba } from './render.js'

/** The laid-out game-over banner. */
export interface GameOverScreenLayout {
  /** The game-over message (GAME_OVER_TEXT), in FONT57. */
  readonly banner: LaidOutText
}

/**
 * Lay the game-over banner out in `colour`. FONT57, reusing the core ROM string.
 * Whole-pixel ops, origin-relative — the caller offsets them onto the backbuffer.
 */
export function layoutGameOverScreen(colour: Rgba): GameOverScreenLayout {
  return { banner: layoutText('FONT57', GAME_OVER_TEXT, colour) }
}
