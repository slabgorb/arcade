// tests/hud.test.ts
//
// Story ml7-3 — RED phase (TEA). The HUD as PURE CORE GEOMETRY: score, lives,
// high score and the DDT bombs, each reduced to pinned (col,row,stamp)
// placements before any canvas is involved. The epic's law is "routing !=
// geometry" (cp7's lesson: routing tests pass while a flipped/mis-scaled HUD
// ships) — so the COORDINATES are pinned HERE, in a core unit test, as
// literals measured from the vendored 1982 source, and the shell's only job is
// to blit what this module says (tests/hud-render.test.ts pins that routing).
//
// ─── THE ROM'S OWN TOP-ROW MAP (upright; every offset is PLYFLD-relative) ────
// The playfield is indexed offset = col*$20 + row (conway.ts CW-11), so the
// UPSCRE/DLIVES addresses decode to columns of the single top row $1F:
//   P1 score   PLYFLD+$1F  → col  0, row $1F  (MLSUB.MAC:1915)  cols 0-5
//   P1 lives   PLYFLD+$0DF → col  6, row $1F  (MLSUB.MAC:509)   cols 6-11
//   high score PLYFLD+$19F → col 12, row $1F  (MLSUB.MAC:1950)  cols 12-17
// (P2's arms — PLYFLD+$31F score, PLYFLD+$25F reversed lives — are NOT ported:
// the clone has no 2-player game. Logged as a TEA deviation in the session.)
// Each character advances +$20 = one column (CHAR, MLIRQ.MAC:658-659). Digits
// are stamps $20-$29 (DIGITZ "DIGITS ARE 20-29", MLIRQ.MAC:691); a suppressed
// leading zero writes stamp 0 (the blank path leaves A=0). The ship icon is
// stamp $1F over six fixed slots (DLIVES, MLSUB.MAC:507/518). DDT bombs draw
// TWO stamps per intact entry — DDT at the entry's offset, DDT+1 one column
// over at +$20 (DDTS2, MLSUB.MAC:443/460/470) — and DDTS2 skips vacant (hi=0)
// and exploding (hi>=$14) entries.
//
// ─── WHAT GREEN (Dev) MUST SHIP — src/core/hud.ts (PURE, purity-swept) ───────
//   export const HUD_ROW = 0x1f, SCORE_COL = 0, LIVES_COL = 6, HISCORE_COL = 12
//   export const LIVES_SLOTS = 6, SHIP_STAMP = 0x1f
//   export const DIGIT_STAMP_BASE = 0x20, BLANK_STAMP = 0
//   export interface HudPlacement { col: number; row: number; stamp: number }
//   export function sixDigitStamps(value: number): readonly number[]
//       Six stamps with the ROM's zero suppression: leading zeros blank until
//       the first non-zero digit, the LAST PAIR always renders (SEC MLSUB.MAC:
//       1924 / CLC :1929). Values wrap mod 1e6 (three BCD pairs).
//   export function hudPlacements(i: {score;lives;highScore}): HudPlacement[]
//       Exactly 18 placements on row HUD_ROW, in reading order: score cols
//       0-5, lives cols 6-11 (min(lives,6) ships then blanks), high score
//       cols 12-17. Blanks are REAL placements (stamp 0) — the ROM writes
//       them to erase.
//   export function ddtCount(table): number        — intact entries (drawn set)
//   export function ddtPlacements(table): HudPlacement[]
//       Two stamps per intact entry, in reading order per bomb:
//       {col,row,DDT_STAMP} then {col+1,row,DDT_STAMP+1}.
//   Claims: GREEN generates docs/rom-study/claims/16-hud.json (HD-*) —
//   tests/audit/hud-claims.test.ts is the claims arm.

import { describe, it, expect } from 'vitest'
import { DDT_STAMP, DDTST, DDTST_ATTRACT, ddtOffset, type DdtEntry } from '../src/core/ddt'

// COMPUTED specifier (the centipede bonus-lives.test.ts pattern): tsc cannot
// resolve it, so the RED tree stays lint-clean while the module does not
// exist; vitest resolves it at runtime, relative to this file.
const HUD_SPECIFIER = ['..', 'src', 'core', 'hud'].join('/')

interface HudPlacement {
  col: number
  row: number
  stamp: number
}

interface HudModule {
  HUD_ROW: number
  SCORE_COL: number
  LIVES_COL: number
  HISCORE_COL: number
  LIVES_SLOTS: number
  SHIP_STAMP: number
  DIGIT_STAMP_BASE: number
  BLANK_STAMP: number
  sixDigitStamps: (value: number) => readonly number[]
  hudPlacements: (i: { score: number; lives: number; highScore: number }) => HudPlacement[]
  ddtCount: (table: readonly DdtEntry[]) => number
  ddtPlacements: (table: readonly DdtEntry[]) => HudPlacement[]
}

/** Self-describing loader (the ml1-1 pattern): RED proves the feature absent. */
async function loadHud(): Promise<HudModule> {
  try {
    const mod = (await import(/* @vite-ignore */ HUD_SPECIFIER)) as Partial<HudModule>
    if (typeof mod.hudPlacements !== 'function') throw new Error('no hudPlacements export')
    if (typeof mod.sixDigitStamps !== 'function') throw new Error('no sixDigitStamps export')
    if (typeof mod.ddtPlacements !== 'function') throw new Error('no ddtPlacements export')
    if (typeof mod.ddtCount !== 'function') throw new Error('no ddtCount export')
    return mod as HudModule
  } catch (e) {
    throw new Error(
      `src/core/hud.ts not built yet — GREEN (Dev) ships the pure HUD geometry: ${
        e instanceof Error ? e.message : String(e)
      }`,
    )
  }
}

/** A DdtEntry from a DDTST-style absolute word (e.g. 0x10cd). */
const entryFromWord = (word: number): DdtEntry => ({ lo: word & 0xff, hi: word >> 8 })

describe('ml7-3 — the HUD anchors are the ROM addresses, decoded to grid literals', () => {
  it('pins the top-row columns UPSCRE/DLIVES lay out', async () => {
    const hud = await loadHud()
    // Derivations shown as literals so a wrong constant cannot self-confirm:
    // offset -> col is >>5, offset -> row is &0x1f (conway.ts CW-11 indexing).
    expect(hud.HUD_ROW).toBe(0x1f) // PLYFLD+$1F & $1F — the single reserved top row
    expect(hud.SCORE_COL).toBe(0) // $01F >> 5 (MLSUB.MAC:1915)
    expect(hud.LIVES_COL).toBe(6) // $0DF >> 5 (MLSUB.MAC:509)
    expect(hud.HISCORE_COL).toBe(12) // $19F >> 5 (MLSUB.MAC:1950)
    expect(hud.LIVES_SLOTS).toBe(6) // DLIVES LDA I,6 (MLSUB.MAC:507)
    expect(hud.SHIP_STAMP).toBe(0x1f) // "PICTURE OF SHIP" (MLSUB.MAC:518)
    expect(hud.DIGIT_STAMP_BASE).toBe(0x20) // "DIGITS ARE 20-29" (MLIRQ.MAC:691)
    expect(hud.BLANK_STAMP).toBe(0) // the suppressed-zero path writes A=0
  })
})

describe('ml7-3 — sixDigitStamps carries the DIGIT2 zero-suppression law', () => {
  it('renders score 0 as four blanks and "00" — the last pair never suppresses', async () => {
    const { sixDigitStamps } = await loadHud()
    // SEC on SCORE2/SCORE1 (MLSUB.MAC:1924), CLC on SCORE0 (:1929): 000000
    // shows exactly "    00", never "000000" and never fully blank.
    expect(sixDigitStamps(0)).toEqual([0, 0, 0, 0, 0x20, 0x20])
  })

  it('suppresses exactly the LEADING zeros', async () => {
    const { sixDigitStamps } = await loadHud()
    expect(sixDigitStamps(12345)).toEqual([0, 0x21, 0x22, 0x23, 0x24, 0x25])
    expect(sixDigitStamps(40)).toEqual([0, 0, 0, 0, 0x24, 0x20])
    // The first non-zero digit clears the carry for good: interior and
    // trailing zeros all render (DIGITZ 10$: CLC, MLIRQ.MAC:687-691 region).
    expect(sixDigitStamps(500070)).toEqual([0x25, 0x20, 0x20, 0x20, 0x27, 0x20])
    expect(sixDigitStamps(89175)).toEqual([0, 0x28, 0x29, 0x21, 0x27, 0x25])
  })

  it('wraps mod 1e6 — the score is three BCD pairs, exactly like the ROM registers', async () => {
    const { sixDigitStamps } = await loadHud()
    expect(sixDigitStamps(1_089_175)).toEqual(sixDigitStamps(89175))
  })
})

describe('ml7-3 — hudPlacements: the full 18-cell top row, pinned as literals', () => {
  it('lays score, lives and high score at the ROM columns, in reading order', async () => {
    const { hudPlacements } = await loadHud()
    const R = 0x1f
    // toEqual on the FULL array: identity + ordering pinned, so a regenerated
    // or reordered row cannot satisfy a mere count.
    expect(hudPlacements({ score: 12345, lives: 3, highScore: 89175 })).toEqual([
      // score, cols 0-5 (UPSCRE, MLSUB.MAC:1915)
      { col: 0, row: R, stamp: 0 },
      { col: 1, row: R, stamp: 0x21 },
      { col: 2, row: R, stamp: 0x22 },
      { col: 3, row: R, stamp: 0x23 },
      { col: 4, row: R, stamp: 0x24 },
      { col: 5, row: R, stamp: 0x25 },
      // lives, cols 6-11 (DLIVES, MLSUB.MAC:509/518): ships then blanks
      { col: 6, row: R, stamp: 0x1f },
      { col: 7, row: R, stamp: 0x1f },
      { col: 8, row: R, stamp: 0x1f },
      { col: 9, row: R, stamp: 0 },
      { col: 10, row: R, stamp: 0 },
      { col: 11, row: R, stamp: 0 },
      // high score, cols 12-17 (MLSUB.MAC:1950)
      { col: 12, row: R, stamp: 0 },
      { col: 13, row: R, stamp: 0x28 },
      { col: 14, row: R, stamp: 0x29 },
      { col: 15, row: R, stamp: 0x21 },
      { col: 16, row: R, stamp: 0x27 },
      { col: 17, row: R, stamp: 0x25 },
    ])
  })

  it('clamps lives to the six DLIVES slots and shows zero lives as six blanks', async () => {
    const { hudPlacements } = await loadHud()
    const lives = (n: number): number[] =>
      hudPlacements({ score: 0, lives: n, highScore: 0 })
        .slice(6, 12)
        .map((p) => p.stamp)
    expect(lives(0)).toEqual([0, 0, 0, 0, 0, 0])
    expect(lives(6)).toEqual([0x1f, 0x1f, 0x1f, 0x1f, 0x1f, 0x1f])
    // DLIVES draws six slots, period — a seventh life cannot overflow the row.
    expect(lives(7)).toEqual([0x1f, 0x1f, 0x1f, 0x1f, 0x1f, 0x1f])
  })
})

describe('ml7-3 — ddtPlacements: two stamps per intact bomb (DDTS2)', () => {
  it('decodes the attract-mode DDTST table to its pinned grid cells', async () => {
    const { ddtCount, ddtPlacements } = await loadHud()
    // DDTST_ATTRACT = [0x10a3, 0x1084, 0x1086, 0x0000] (ddt.ts DD-38..41):
    // three intact bombs, one vacant slot.
    const table = DDTST_ATTRACT.map(entryFromWord)
    expect(ddtCount(table)).toBe(3)
    expect(ddtPlacements(table)).toEqual([
      // $0a3 -> col 5, row 3; DDT at the offset, DDT+1 one column over
      { col: 5, row: 0x03, stamp: 0x6e },
      { col: 6, row: 0x03, stamp: 0x6f },
      // $084 -> col 4, row 4
      { col: 4, row: 0x04, stamp: 0x6e },
      { col: 5, row: 0x04, stamp: 0x6f },
      // $086 -> col 4, row 6
      { col: 4, row: 0x06, stamp: 0x6e },
      { col: 5, row: 0x06, stamp: 0x6f },
    ])
    // The literal 0x6e above IS the ddt.ts DDT_STAMP (MLDEF.MAC:203, DD-4) —
    // asserted once so the literals cannot drift from the module they mirror.
    expect(DDT_STAMP).toBe(0x6e)
  })

  it('skips vacant and exploding entries exactly as DDTS2 does', async () => {
    const { ddtCount, ddtPlacements } = await loadHud()
    const intact = entryFromWord(DDTST[0]) // 0x10cd -> col 6, row $0d
    const vacant: DdtEntry = { lo: 0, hi: 0 } // "NO ENTRY" (DD-18)
    const exploding: DdtEntry = { lo: 0xcd, hi: 0x14 } // >= $14 (DD-19)
    expect(ddtCount([intact, vacant, exploding])).toBe(1)
    expect(ddtPlacements([intact, vacant, exploding])).toEqual([
      { col: 6, row: 0x0d, stamp: 0x6e },
      { col: 7, row: 0x0d, stamp: 0x6f },
    ])
    // Cross-check the offset arithmetic against the ddt.ts decoder itself.
    expect(ddtOffset(intact)).toBe(0x0cd)
  })
})
