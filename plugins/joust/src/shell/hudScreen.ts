// src/shell/hudScreen.ts
//
// Story jt11-2 (GREEN, Julia) — the AUTHENTIC in-game HUD layout, replacing the
// jt4-5 fillText dev bar. Lays each player's score digits and lives icons out
// as DATA (fontRender glyph ops + named blit ops) for main.ts to paint through
// its existing paintText/blit paths — the jt10-1/jt10-5 seam.
//
// Everything here is ROM-measured (see tests/hud-jt11-2.test.ts for the full
// derivation):
//  • The score font is FONT57, NOT FONT35 — the mainline score display SCODSP
//    (JOUSTRV4.SRC:7444-7487) draws digits through BCDMSN/BCDLSN from
//    `[FONT5]`, initialised from the MESSAGE ROM vector `FDB FONT57`
//    (MESSAGE.SRC:37): 6x7 cells at the $0300 (6px) column pitch.
//  • Digits come from the BCD REGISTER (the DSCORE bytes the core mirrors as
//    `scoreBcd`), leading-zero blanked as SCODSP walks: display from the most
//    significant non-zero digit through units; a zero score is the lone units
//    '0' ("PUT UP SCORE ZERO" seeds only SCRINT, the units entry).
//  • Digit columns (SCRPL1/SCRPL2, JOUSTRV4.SRC:7417-7440): units at $36D9 →
//    x=108 (P1) and $5DD9 → x=186 (P2), row y=$D9=217 — the text is anchored
//    at the units column and grows leftward.
//  • Score colours (JOUSTRV4.SRC:52-54): PL1 EQU $5, PL2 EQU $7 — COLOR1
//    palette indexes, threaded through by the caller's decoded palette.
//  • Lives icons (INCLIV/DECLIV + P1DEC/P2DEC, JOUSTRV4.SRC:5356-5420,
//    :5550-5554): anchors $39D9 → x=114 (P1) and $60D9 → x=192 (P2), stride
//    3 screen bytes = 6px, AT MOST 5 icons painted (CMPA #5 / BHI skips the
//    DMA from the sixth man on). The ROM blits its dedicated 6px SCOPL
//    sitting-player sprites — untranscribed, filed as jt11-9 — so this story
//    blits the atlas-packed riders instead: PLY1R for P1, its twin PLY2R for
//    P2 (the green rider — the yellow one is P1's). The riders decode 14x7,
//    wider than the 6px stride, so consecutive icons overlap into a fan.
//  • The authentic HUD carries NO wave number — that was the dev bar's line.

import { layoutText, type LaidOutText } from './fontRender.js'
import type { Rgba } from './render.js'
import type { OverlayReadout } from '../core/game.js'

/** One lives-icon blit op: an atlas block name at a whole-pixel destination. */
export interface HudIcon {
  readonly name: string
  readonly x: number
  readonly y: number
}

/** One player's HUD block: the laid-out score, its origin, and the icon row. */
export interface HudPlayerLayout {
  readonly score: LaidOutText
  readonly scoreX: number
  readonly scoreY: number
  readonly lives: readonly HudIcon[]
}

export interface HudLayout {
  readonly players: readonly HudPlayerLayout[]
}

// The ROM bottom row: $D9 = 217, shared by digits and icons.
const HUD_Y = 217
// Per player index (0 = P1, 1 = P2): units digit column, lives anchor, icon
// block name, and COLOR1 score-colour index — all cited in the header.
const UNITS_X = [108, 186] as const
const LIVES_X = [114, 192] as const
const ICON_NAME = ['PLY1R', 'PLY2R'] as const
const SCORE_COLOUR_INDEX = [5, 7] as const
// INCLIV's on-screen cap and the 3-screen-byte icon stride.
const MAX_ICONS = 5
const ICON_STRIDE = 6

/**
 * The displayed digit string for a 6-digit BCD register, SCODSP-blanked:
 * leading zeros suppressed, a zero score keeps the lone units '0'.
 */
function blankedDigits(scoreBcd: readonly number[]): string {
  const all = scoreBcd.map((b) => ((b >> 4) & 0xf).toString(16) + (b & 0xf).toString(16)).join('')
  const shown = all.replace(/^0+/, '')
  return shown === '' ? '0' : shown
}

/**
 * Lay the whole HUD out from the pure readout: per player, FONT57 score digits
 * anchored at the fixed units column, and up to five rider icons from the
 * lives anchor. Pure — the readout is untouched; the caller's palette entries
 * are threaded through by identity.
 */
export function layoutHud(readout: OverlayReadout, palette: readonly Rgba[]): HudLayout {
  return {
    players: readout.players.map((p) => {
      const i = p.player - 1
      const score = layoutText('FONT57', blankedDigits(p.scoreBcd), palette[SCORE_COLOUR_INDEX[i]])
      const last = score.ops[score.ops.length - 1]
      const lives: HudIcon[] = []
      for (let n = 0; n < Math.min(p.lives, MAX_ICONS); n++) {
        lives.push({ name: ICON_NAME[i], x: LIVES_X[i] + n * ICON_STRIDE, y: HUD_Y })
      }
      return { score, scoreX: UNITS_X[i] - last.x, scoreY: HUD_Y, lives }
    }),
  }
}
