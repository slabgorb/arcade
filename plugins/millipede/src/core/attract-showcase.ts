// src/core/attract-showcase.ts
//
// Story ml9-1 (GREEN, Loki / Dev) — the ATTRACT-MODE ENEMY-SHOWCASE SCREEN: the
// ROM's "cast of characters" attract screen (attract-mame-reference.png). Names
// every creature, lists the HIGH SCORES, and prints the coin/bonus/copyright
// footer. This is a SEPARATE surface from core/attract.ts (the self-playing
// silent demo) and core/hud.ts (the in-game HUD) — main.ts cycles attract mode
// between the demo and this screen (the ROM MLATR behaviour).
//
// ─── GROUND TRUTH (ROM) ──────────────────────────────────────────────────────
// The creature-label table is the MLATR 80$/90$..99$ table (MLATR.MAC:580-601):
// each entry is a 4-byte header then the label as ROM CHAR CODES. The names below
// are decoded from the BYTES, not the .ASCII comments — MLATR.MAC:601's comment
// reads "GROWTHS" but its bytes decode to GROWTH (and the screenshot agrees).
//   space = 0x00; A..Z = 0x01..0x1A (self-verified via the MLATR.MAC:601 byte
//   decode above — hud.ts:33 documents only the digits); 0..9 = 0x20..0x29 (DIGITZ, hud.ts:33)
// The HIGH SCORES table is core/highscore.ts DEFAULT_HIGH_SCORES. The blue
// background is BKGND #0F8 (MLATR.MAC:604-605, GREYSC) — active-low wiring drives
// only the three blue lines, so palette.ts decodes $F8 to pure blue.
//
// The screen COORDINATES here are a hand-laid approximation of the reference
// screenshot (the ROM 80$ header positions use a playfield addressing this
// clone does not model); they are proven at the VISUAL playtest (playbook §4),
// while the LABEL/TEXT content is the pinned ROM truth (tests/attract-showcase.ts).
//
// PURE: a deterministic function of its input only — no clock, no entropy, no
// browser surface (the ml1-1 purity sweep covers this directory).

import type { HudPlacement } from './hud'
import type { MilliHighScore } from './highscore'
import { HEAD_PIC, HEAD_COLOR } from './millipede'
import { SPIDER_PIC, SPIDER_COLOR } from './spider'
import { BEETLE_PIC, BEETLE_COLOR } from './beetle'
import { BEE_PIC, BEE_COLOR } from './bee'
import { DRAGONFLY_PIC, DRAGONFLY_COLOR } from './dragonfly'
import { MOSQUITO_PIC, MOSQUITO_COLOR } from './mosquito'
import { EARWIG_PIC, EARWIG_COLOR } from './earwig'
import { INCHWORM_PIC, INCHWORM_COLOR } from './inchworm'

/** BKGND #0F8 (MLATR.MAC:604-605) — pure blue through the active-low palette. */
export const SHOWCASE_BACKGROUND = 0xf8

/** ROM char code for one display character (MLATR label vocabulary, hud.ts:33). */
function encodeChar(ch: string): number {
  if (ch === ' ') return 0x00
  if (ch >= 'A' && ch <= 'Z') return 0x01 + (ch.charCodeAt(0) - 'A'.charCodeAt(0))
  if (ch >= '0' && ch <= '9') return 0x20 + (ch.charCodeAt(0) - '0'.charCodeAt(0))
  throw new RangeError(`attract-showcase: no ROM char code for ${JSON.stringify(ch)}`)
}

/** Place a string left-to-right from (startCol, row), one char code per cell. */
function place(text: string, startCol: number, row: number): HudPlacement[] {
  return [...text].map((ch, i) => ({ col: startCol + i, row, stamp: encodeChar(ch) }))
}

/**
 * The creature cast — name + hand-laid grid position (col, row; row 0x1F is the
 * top line, matching drawGridStamps). Names are the MLATR.MAC:580-601 bytes; the
 * positions approximate attract-mame-reference.png (HIGH SCORES down the centre,
 * creature panels down the two edges, the trio along the bottom).
 */
const CAST: readonly { name: string; col: number; row: number; pic?: number; color?: number }[] = [
  { name: 'DRAGONFLY', col: 0, row: 29, pic: DRAGONFLY_PIC, color: DRAGONFLY_COLOR }, // top-left
  { name: 'MOSQUITO', col: 22, row: 29, pic: MOSQUITO_PIC, color: MOSQUITO_COLOR }, // top-right
  { name: 'BEE', col: 26, row: 24, pic: BEE_PIC, color: BEE_COLOR }, // right
  { name: 'EARWIG', col: 0, row: 20, pic: EARWIG_PIC, color: EARWIG_COLOR }, // mid-left
  { name: 'BEETLE', col: 23, row: 20, pic: BEETLE_PIC, color: BEETLE_COLOR }, // mid-right
  { name: 'INCHWORM', col: 0, row: 15, pic: INCHWORM_PIC, color: INCHWORM_COLOR }, // lower-left
  { name: 'GROWTH', col: 12, row: 12 }, // centre (a mushroom — field graphic, no MOBJ pic)
  { name: 'DDT BOMB', col: 0, row: 4 }, // bottom-left
  { name: 'MILLIPEDE', col: 10, row: 4, pic: HEAD_PIC, color: HEAD_COLOR }, // bottom-centre
  { name: 'SPIDER', col: 23, row: 4, pic: SPIDER_PIC, color: SPIDER_COLOR }, // bottom-right
]

/** One creature's showcase sprite: its MOBJ picture, colour attribute, and the
 *  grid cell of its name label (the sprite is drawn just above the name). */
export interface ShowcaseSprite {
  readonly pic: number
  readonly color: number
  readonly col: number
  readonly row: number
}

/** The cast members that have a motion-object picture, for the shell to blit
 *  next to each name (GROWTH/DDT BOMB have no MOBJ picture and are omitted). */
export function showcaseSprites(): ShowcaseSprite[] {
  return CAST.filter((c): c is Required<typeof c> => c.pic !== undefined && c.color !== undefined).map((c) => ({
    pic: c.pic,
    color: c.color,
    col: c.col,
    row: c.row,
  }))
}

/** The coin/bonus/copyright footer (screenshot; charset per the header above). */
const FOOTER: readonly { text: string; col: number; row: number }[] = [
  { text: '1 COIN 1 PLAY', col: 8, row: 19 },
  { text: 'BONUS EVERY 15000', col: 6, row: 18 },
  { text: 'COPYRIGHT ATARI 1982', col: 5, row: 1 },
]

const HIGH_SCORES_TITLE = { text: 'HIGH SCORES', col: 9, row: 31 }
const HS_SCORE_COL = 10
const HS_INITIALS_COL = 17
const HS_TOP_ROW = 29

/**
 * Every grid placement of the attract enemy-showcase screen, for the given
 * high-score table: the HIGH SCORES title + eight rows, the creature cast, and
 * the footer. `stamp` is a ROM char code — shell/render.ts drawGridStamps + the
 * ml7-6 charTile map route it to the sheet.
 */
export function showcasePlacements(highScores: readonly MilliHighScore[]): HudPlacement[] {
  const out: HudPlacement[] = []

  out.push(...place(HIGH_SCORES_TITLE.text, HIGH_SCORES_TITLE.col, HIGH_SCORES_TITLE.row))
  highScores.forEach((entry, i) => {
    const row = HS_TOP_ROW - i
    out.push(...place(String(entry.score), HS_SCORE_COL, row))
    out.push(...place(entry.name, HS_INITIALS_COL, row))
  })

  for (const c of CAST) out.push(...place(c.name, c.col, c.row))
  for (const f of FOOTER) out.push(...place(f.text, f.col, f.row))

  return out
}
