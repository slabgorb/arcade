// src/shell/attractScreen.ts
//
// Story jt10-4 (GREEN, Yoda) — the shell ATTRACT BANNER layout. Lays a warning
// banner out as glyph-placement ops the existing atlas/blit path can paint — the
// same testable seam jt10-1's fontRender.ts established and jt10-5/jt10-6's
// selectScreen.ts / gameOverScreen.ts reused: return layout DATA, paint pixels
// elsewhere. The banners use FONT57 (the stylized wide banner font), matching the
// select START labels and the game-over banner.
//
// The ROM strings are REUSED from core/attract-scheduler (BANNERS) — never
// re-transcribed here, so each phrase has one spelling and one citation
// (pteroBanner: JOUSTRV4.SRC:80; lavaBanner: MESSEQU.SRC:156+:155). The screen
// POSITION is the caller's job (main.ts centres the laid-out banner); this module
// only decides the font, the string and the colour-cycle colour.

import { layoutText, type LaidOutText } from './fontRender.js'
import { BANNERS } from '../core/attract-scheduler.js'
import type { Rgba } from './render.js'

/** The attract pages that carry banner TEXT (the demo page draws the sim instead). */
export type BannerPage = 'pteroBanner' | 'lavaBanner'

/** The laid-out attract banner. */
export interface AttractBannerLayout {
  /** The warning phrase (BANNERS[page].text), in FONT57. */
  readonly banner: LaidOutText
}

/**
 * Lay the banner for `page` out in `colour`. FONT57, reusing the core ROM string.
 * Whole-pixel ops, origin-relative — the caller offsets them onto the backbuffer.
 */
export function layoutAttractBanner(page: BannerPage, colour: Rgba): AttractBannerLayout {
  return { banner: layoutText('FONT57', BANNERS[page].text, colour) }
}
