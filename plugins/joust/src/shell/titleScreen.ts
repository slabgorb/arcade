// src/shell/titleScreen.ts
//
// Story jt10-3 (GREEN, Loki) — the shell TITLE OVERLAY layout (the ROM's MARQUE
// screen). Lays the copyright + extra-mount phrase lines out as glyph-placement
// ops the existing atlas/blit path can paint, and hands through the JOUST_LOGO
// vector geometry for the caller to stroke — the same "return layout DATA, paint
// pixels elsewhere" seam jt10-1's fontRender.ts established and jt10-5/jt10-6
// reused. The phrase lines use FONT57 (the stylized wide banner font), matching
// the game-over banner and the two select START labels.
//
// The ROM strings are REUSED from core/title (never re-transcribed here), so each
// has one spelling and one citation (MSCOPY/MSW17/MSW18 — MESSEQU.SRC:129/158/157).
// Screen POSITION and the per-frame cycle colour are the caller's job (main.ts);
// this module decides the font, the strings, the colour threaded in, and exposes
// the logo.

import { layoutText, type LaidOutText } from './fontRender.js'
import { TITLE_COPYRIGHT, TITLE_EXTRA_MOUNT, TITLE_POINTS_SUFFIX, JOUST_LOGO, type JoustLogo } from '../core/title.js'
import type { Rgba } from './render.js'

/** The laid-out title overlay. All strings reused from core/title (one home,
 *  one citation); this file re-types none of the ROM text, not even in comments. */
export interface TitleScreenLayout {
  /** TITLE_COPYRIGHT — MSCOPY $6C, MESSEQU.SRC:129 — in FONT57. */
  readonly copyright: LaidOutText
  /** TITLE_EXTRA_MOUNT — MSW17 $F7, MESSEQU.SRC:158 — in FONT57 (BCD level prints after it). */
  readonly extraMount: LaidOutText
  /** TITLE_POINTS_SUFFIX — MSW18 $F8, MESSEQU.SRC:157 — in FONT57. */
  readonly pointsSuffix: LaidOutText
  /** The vector JOUST wordmark (reused from core, not re-transcribed). */
  readonly logo: JoustLogo
}

/**
 * Lay the title overlay out in `colour`. FONT57 phrase lines reusing the core ROM
 * strings; the JOUST_LOGO geometry is passed through for the caller to draw.
 * Whole-pixel ops, origin-relative — the caller offsets them onto the backbuffer.
 */
export function layoutTitleScreen(colour: Rgba): TitleScreenLayout {
  return {
    copyright: layoutText('FONT57', TITLE_COPYRIGHT, colour),
    extraMount: layoutText('FONT57', TITLE_EXTRA_MOUNT, colour),
    pointsSuffix: layoutText('FONT57', TITLE_POINTS_SUFFIX, colour),
    logo: JOUST_LOGO,
  }
}
