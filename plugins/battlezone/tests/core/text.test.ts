// tests/core/text.test.ts
//
// Story bz1-12 — RED phase (Furiosa / TEA). The capstone's message-string
// fidelity: the in-game / screen text the cabinet displayed, pulled string-
// for-string from the ROM and committed to pure core so no checkout depends on
// the gitignored quarry.
//
// WHY A CORE MODULE (epic ruling): the ROM text-string table lives only in
// `reference/rom-quarry/Battlezone.dis65` (string table @ $7571+, the English
// roster), and `reference/` is gitignored — "extracted data must land in
// committed core/ source so no other checkout needs the quarry"
// (context-epic-bz1.md). bz1-12's technical approach names the sink explicitly:
// "pull the exact ROM text strings ... into a typed core module (e.g.
// core/text.ts) cited to that source."
//
// Pinned surface (ABSENT until GREEN — the module-load failure IS the RED
// signal, the house pattern used by screens.test.ts / framing.test.ts):
//   core/text.ts : export const MESSAGES — a record of the ROM message
//                  strings, values ROM-fixed. TEA pins the module path + the
//                  named export `MESSAGES` and that its values are strings;
//                  the KEY names are Dev's to design (assertions read
//                  Object.values, never keys). Only the string VALUES are
//                  ROM-canonical and non-negotiable.
//
// SOURCE (Battlezone.dis65, English string table, rev2):
//   $7571 'ENEMY TO ' · $7573/75/77 'LEFT'/'RIGHT'/'REAR'
//   $7585 'HIGH SCORE      000'   → label 'HIGH SCORE'
//   $7587 'ENEMY IN RANGE'        $7589 'MOTION BLOCKED BY OBJECT'
//   $7591 'GAME OVER'             $7593 'PRESS START'
//   $7595 'SCORE     000'         → label 'SCORE'
//   $7597 'HIGH SCORES'           $7601 'GREAT SCORE'
//   $7613 'BONUS TANK AT '        → label 'BONUS TANK AT'
//   ($7609 '  COIN    PLAY', $7611 'INSERT COIN' are the coin-op roster —
//    DESCOPED, see the ban below; the arcade has no money model.)
//
// The ROM font's character set is " ', 0-9, A-Z, ' ', '-', '(C)', '(P)'"
// (dis65 VgStr @ $5720) — NO lowercase glyphs exist. A lowercased or
// paraphrased string is therefore un-renderable AND wrong; the no-lowercase
// sweep below catches paraphrase mechanically.
import { describe, it, expect } from 'vitest'
import { MESSAGES } from '../../src/core/text'
import { attractLines, gameOverLines } from '../../src/core/screens'

/** The module's string values, trailing-space-normalized (the ROM padded some
 *  labels, e.g. 'BONUS TANK AT ' — the words are the contract, not the pad). */
const values = Object.values(MESSAGES).map((s) => s.trimEnd())

// The ROM roster as a VERBATIM TRANSCRIPTION contract: each string must appear
// string-for-string, not paraphrased (AC-2). This is a DATA-presence check, NOT
// a claim that every entry is rendered (Immortan Joe, review round-1: the roster
// implied a completeness the game lacked). Two tiers:
//   WIRED — reaches a render path, and its producer is exercised elsewhere:
//     GAME OVER / PRESS START / HIGH SCORES / SCORE  → the screens.ts tests below
//     ENEMY IN RANGE / MOTION BLOCKED BY OBJECT      → tests/core/alerts.test.ts
//   RESERVED — transcribed ROM data, no display surface wired yet (HIGH SCORE
//     in-game label, GREAT SCORE, BONUS TANK AT, ENEMY TO / LEFT / RIGHT / REAR).
//     Kept verbatim so a future surface pulls the authentic string, not a
//     paraphrase; wiring is a follow-up (see the Dev/Reviewer session findings).
// Presence + no-paraphrase is asserted for BOTH tiers; rendering is asserted
// only for the WIRED tier (by its producer), so this file no longer overstates
// coverage.
const ROM_ROSTER = [
  'ENEMY IN RANGE',
  'MOTION BLOCKED BY OBJECT',
  'GAME OVER',
  'PRESS START',
  'SCORE',
  'HIGH SCORE',
  'HIGH SCORES',
  'GREAT SCORE',
  'BONUS TANK AT',
  'ENEMY TO',
  'LEFT',
  'RIGHT',
  'REAR',
] as const

describe('bz1-12 — core/text.ts carries the ROM message roster verbatim', () => {
  it('exports MESSAGES as a non-empty record of strings', () => {
    expect(typeof MESSAGES).toBe('object')
    expect(MESSAGES).not.toBeNull()
    const vals = Object.values(MESSAGES)
    expect(vals.length).toBeGreaterThan(0)
    for (const v of vals) expect(typeof v).toBe('string')
  })

  for (const phrase of ROM_ROSTER) {
    it(`contains "${phrase}" string-for-string (no paraphrase)`, () => {
      expect(values).toContain(phrase)
    })
  }
})

describe('bz1-12 — the strings honour the ROM font and the coin-op descope', () => {
  it('every message is upper-case only — the vector font has no lowercase glyph', () => {
    for (const v of Object.values(MESSAGES)) {
      expect(v, `"${v}" contains a glyph the ROM font cannot draw`).not.toMatch(/[a-z]/)
    }
  })

  it('no coin-op begging leaks into the text module (descope, enforced module-locally)', () => {
    // screens.test.ts sweep covers shell/ + main.ts + core/screens.ts but NOT
    // core/text.ts; this module needs its own ban or a coin string ships unswept.
    for (const v of Object.values(MESSAGES)) {
      expect(v, `"${v}" carries coin-op text`).not.toMatch(/coin|credit|insert|quarter|free\s*play|¢/i)
    }
  })
})

describe('bz1-12 — the screen modules render the canonical roster (no drift)', () => {
  // Review round-1 (Immortan Joe): the earlier versions were vacuous —
  // gameOverLines(0)[0] IS MESSAGES.GAME_OVER by import, so asserting it is a
  // member of Object.values(MESSAGES) can never fail; and the board-header test
  // never actually called attractLines with a board. These now drive the
  // PRODUCER and compare against a hard-coded ROM literal, so a paraphrase in
  // either screens.ts OR text.ts is caught.
  const SAMPLE_TABLE = [{ name: 'KAV', score: 12_345 }]

  it('the game-over verdict screens.ts renders is exactly the ROM GAME OVER', () => {
    expect(gameOverLines(0)[0].trimEnd()).toBe('GAME OVER')
    expect(values).toContain('GAME OVER') // and the canonical roster carries it
  })

  it('the attract prompt screens.ts renders is exactly the ROM PRESS START', () => {
    const attract = attractLines([]).map((l) => l.trimEnd())
    expect(attract).toContain('PRESS START')
    expect(values).toContain('PRESS START')
  })

  it('the attract board, when populated, renders the ROM HIGH SCORES header', () => {
    // Drive the producer with a real table — the weaker version only re-checked
    // module membership and would pass even if attractLines stopped emitting it.
    const attract = attractLines(SAMPLE_TABLE).map((l) => l.trimEnd())
    expect(attract).toContain('HIGH SCORES')
    expect(values).toContain('HIGH SCORES')
  })
})
