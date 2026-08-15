// tests/attract-showcase.test.ts
//
// Story ml9-1 — RED phase (TEA). The ATTRACT-MODE ENEMY-SHOWCASE SCREEN (the
// "cast of characters" screen: attract-mame-reference.png). A playthrough
// finding (owner): our cabinet has the self-playing silent demo (core/attract.ts)
// and the in-game HUD (core/hud.ts) but NOT the ROM's showcase screen, which
// names each creature, lists the HIGH SCORES, and prints the coin/bonus/copyright
// footer. main.ts render() currently draws the same gameplay screen for every
// phase — it never branches on state.phase.
//
// ─── GROUND TRUTH (ROM) ──────────────────────────────────────────────────────
// The creature-label table is MLATR.MAC:580-601 (the 80$ dispatch + 90$..99$
// entries). Each entry is a 4-byte header then the label as ROM CHAR CODES, the
// same vocabulary core/hud.ts places and shell/render.ts charTile routes:
//     space = 0x00,  A..Z = 0x01..0x1A,  0..9 = 0x20..0x29 (DIGITZ, hud.ts:33)
// Decoded from the BYTES (not the .ASCII comments — MLATR.MAC:601's comment reads
// "GROWTHS" but its bytes 00,00,07,12,0F,17,14,08,00,00 decode to GROWTH, and the
// reference screenshot agrees: GROWTH):
//     DDT BOMB  INCHWORM  EARWIG  DRAGONFLY  MILLIPEDE
//     SPIDER    BEETLE    BEE     MOSQUITO   GROWTH
// The HIGH SCORES table is core/highscore.ts DEFAULT_HIGH_SCORES (top row
// {name:'BBM', score:89175} — exactly the screenshot's first row). The footer is
// "1 COIN 1 PLAY" / "BONUS EVERY 15000" / "COPYRIGHT ATARI 1982" (screenshot;
// char codes built from the ROM charset above).
//
// ─── WHAT GREEN (Dev) MUST SHIP ──────────────────────────────────────────────
//   src/core/attract-showcase.ts — new pure module, the hud.ts shape:
//     showcasePlacements(highScores): readonly {col,row,stamp}[]
//         The cast labels + HIGH SCORES table + footer, as grid placements whose
//         `stamp` is a ROM char code (routed by shell/render.ts drawGridStamps).
//     SHOWCASE_BACKGROUND: number   // the blue attract background colour byte.
//   src/main.ts — render() branches on state.phase === 'attract' and draws the
//         showcase placements through drawGridStamps (the ml7-3 routing path).
//
// Exact screen coordinates are Dev's to derive and are proven at the VISUAL
// playtest (playbook §4) against attract-mame-reference.png — these tests pin the
// ROM CONTENT (which labels/text appear, read left-to-right per row), not the
// pixel layout.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { DEFAULT_HIGH_SCORES } from '../src/core/highscore'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SHOWCASE_SPECIFIER = ['..', 'src', 'core', 'attract-showcase'].join('/')

interface Placement {
  col: number
  row: number
  stamp: number
}

interface ShowcaseModule {
  showcasePlacements: (highScores: readonly { name: string; score: number }[]) => readonly Placement[]
  SHOWCASE_BACKGROUND: number
}

/** Self-describing loader (the ml1-1 pattern): RED proves the feature absent. */
async function loadShowcase(): Promise<ShowcaseModule> {
  try {
    const mod = (await import(/* @vite-ignore */ SHOWCASE_SPECIFIER)) as Partial<ShowcaseModule>
    if (typeof mod.showcasePlacements !== 'function') throw new Error('module has no showcasePlacements export')
    if (typeof mod.SHOWCASE_BACKGROUND !== 'number') throw new Error('module has no SHOWCASE_BACKGROUND export')
    return mod as ShowcaseModule
  } catch (e) {
    throw new Error(
      `src/core/attract-showcase.ts not built yet — GREEN (Dev) ships the attract showcase screen: ${
        e instanceof Error ? e.message : String(e)
      }`,
    )
  }
}

/** ROM char code -> display character (MLATR.MAC label vocabulary, hud.ts:33). */
function decodeChar(code: number): string {
  if (code === 0x00) return ' '
  if (code >= 0x01 && code <= 0x1a) return String.fromCharCode('A'.charCodeAt(0) + code - 0x01)
  if (code >= 0x20 && code <= 0x29) return String.fromCharCode('0'.charCodeAt(0) + code - 0x20)
  return '¿' // an inverted ? — any unexpected code shows up loudly in a diff
}

/**
 * Read the placements as text: group by row, order each row left-to-right by
 * col, decode each stamp. Returns one string per occupied row. This reads the
 * screen the way a player does, without asserting exact coordinates.
 */
function rowTexts(placements: readonly Placement[]): string[] {
  const byRow = new Map<number, Placement[]>()
  for (const p of placements) {
    const list = byRow.get(p.row) ?? []
    list.push(p)
    byRow.set(p.row, list)
  }
  return [...byRow.values()].map((list) =>
    list
      .slice()
      .sort((a, b) => a.col - b.col)
      .map((p) => decodeChar(p.stamp))
      .join(''),
  )
}

/** True if any single row's decoded text contains `needle`. */
function someRowContains(placements: readonly Placement[], needle: string): boolean {
  return rowTexts(placements).some((t) => t.includes(needle))
}

const CAST = ['DDT BOMB', 'INCHWORM', 'EARWIG', 'DRAGONFLY', 'MILLIPEDE', 'SPIDER', 'BEETLE', 'BEE', 'MOSQUITO', 'GROWTH']

describe('ml9-1 — attract showcase: the ROM cast of characters (MLATR.MAC:580-601)', () => {
  it('names every creature from the ROM 80$ label table', async () => {
    const { showcasePlacements } = await loadShowcase()
    const placements = showcasePlacements(DEFAULT_HIGH_SCORES)
    for (const name of CAST) {
      expect(
        someRowContains(placements, name),
        `showcase must label "${name}" (MLATR.MAC:580-601, decoded from bytes)`,
      ).toBe(true)
    }
  })

  it('does NOT print the .ASCII comment typo "GROWTHS" — the BYTES say GROWTH', async () => {
    // MLATR.MAC:601's comment reads "  GROWTHS  " but its bytes decode to GROWTH,
    // and the reference screenshot shows GROWTH. Guard the byte truth against a
    // Dev who transcribes the comment instead of the data.
    const { showcasePlacements } = await loadShowcase()
    const placements = showcasePlacements(DEFAULT_HIGH_SCORES)
    expect(rowTexts(placements).some((t) => t.includes('GROWTHS'))).toBe(false)
  })
})

describe('ml9-1 — attract showcase: HIGH SCORES table (core/highscore.ts)', () => {
  it('shows the top high-score row: initials and score (screenshot: 89175 BBM)', async () => {
    const { showcasePlacements } = await loadShowcase()
    const placements = showcasePlacements(DEFAULT_HIGH_SCORES)
    const top = DEFAULT_HIGH_SCORES[0]
    expect(top).toEqual({ name: 'BBM', score: 89175 })
    expect(someRowContains(placements, top.name), 'top initials BBM must appear').toBe(true)
    expect(someRowContains(placements, String(top.score)), 'top score 89175 must appear').toBe(true)
  })

  it('shows all eight high-score initials', async () => {
    const { showcasePlacements } = await loadShowcase()
    const placements = showcasePlacements(DEFAULT_HIGH_SCORES)
    for (const entry of DEFAULT_HIGH_SCORES) {
      expect(someRowContains(placements, entry.name), `high-score initials "${entry.name}" must appear`).toBe(true)
    }
  })
})

describe('ml9-1 — attract showcase: the footer (screenshot)', () => {
  for (const line of ['1 COIN 1 PLAY', 'BONUS EVERY 15000', 'COPYRIGHT ATARI 1982']) {
    it(`prints "${line}"`, async () => {
      const { showcasePlacements } = await loadShowcase()
      const placements = showcasePlacements(DEFAULT_HIGH_SCORES)
      expect(someRowContains(placements, line)).toBe(true)
    })
  }
})

describe('ml9-1 — attract showcase: the blue background', () => {
  it('exposes a blue-dominant background colour (screenshot: blue field)', async () => {
    const { SHOWCASE_BACKGROUND } = await loadShowcase()
    const { decodeColourByte } = await import('../src/core/palette')
    const { r, g, b } = decodeColourByte(SHOWCASE_BACKGROUND)
    expect(b, 'background blue channel must dominate red').toBeGreaterThan(r)
    expect(b, 'background blue channel must dominate green').toBeGreaterThan(g)
  })
})

describe('ml9-1 — main.ts renders the showcase in attract mode (comment-stripped source)', () => {
  it('render branches on the attract phase and draws showcase placements', () => {
    const stripComments = (src: string): string =>
      src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
    const src = stripComments(readFileSync(join(root, 'src', 'main.ts'), 'utf8'))
    // Wiring floor, not implementation dictation: the page must key rendering off
    // the attract phase and route the showcase's placements through the existing
    // grid blitter. Identifier + call-paren so an import or string cannot satisfy it.
    expect(src, "render must branch on state.phase === 'attract'").toMatch(/phase\s*===\s*['"]attract['"]/)
    expect(src, 'render must draw showcasePlacements(...)').toMatch(/showcasePlacements\s*\(/)
    expect(src, 'showcase placements route through drawGridStamps').toMatch(/drawGridStamps\s*\(/)
  })
})
