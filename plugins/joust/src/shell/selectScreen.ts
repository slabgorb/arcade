// src/shell/selectScreen.ts
//
// Story jt10-5 (GREEN, Loki) — the shell SELECT-OVERLAY layout. Lays the three
// coin-up lines out as glyph-placement ops the existing atlas/blit path can paint,
// the same testable seam jt10-1's fontRender.ts established: return layout DATA,
// paint pixels elsewhere. The two START labels use FONT57 (the stylized wide
// banner font); CREDITS uses FONT35 (the tight score font).
//
// The ROM strings are REUSED from core/select — never re-transcribed here, so the
// text has one spelling and one citation. Screen POSITIONS are the caller's job
// (main.ts paints each laid-out line at its chosen offset); this module only
// decides the font, the string and the colour per line.

import { layoutText, type LaidOutText } from './fontRender.js'
import { SEL_ONE_PLAYER, SEL_TWO_PLAYER, SEL_CREDITS } from '../core/select.js'
import type { Rgba } from './render.js'

/** The three laid-out lines of the 1P/2P start-select screen. */
export interface SelectScreenLayout {
  /** ONE PLAYER START, in FONT57. */
  readonly onePlayer: LaidOutText
  /** TWO PLAYER START, in FONT57. */
  readonly twoPlayer: LaidOutText
  /** CREDITS (static, no coin economy), in FONT35. */
  readonly credits: LaidOutText
}

/**
 * Lay the select screen out in `colour`. The banners go in FONT57, the credits row
 * in FONT35; each reuses the core ROM string. Whole-pixel ops, origin-relative —
 * the caller offsets them onto the backbuffer.
 */
export function layoutSelectScreen(colour: Rgba): SelectScreenLayout {
  return {
    onePlayer: layoutText('FONT57', SEL_ONE_PLAYER, colour),
    twoPlayer: layoutText('FONT57', SEL_TWO_PLAYER, colour),
    credits: layoutText('FONT35', SEL_CREDITS, colour),
  }
}
