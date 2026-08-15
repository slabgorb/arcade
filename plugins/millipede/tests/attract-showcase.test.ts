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
 * Read the placements as WHOLE FIELDS: group by row, and within each row split
 * into maximal CONTIGUOUS-column runs (columns stepping by exactly 1). Each run
 * is one logical field — a label, a score, an initials triple — decoded and
 * trimmed. Returns the runs grouped per row.
 *
 * Contiguous-run (not substring-over-glued-row) matching is the review-round-1
 * fix: the earlier `rowTexts` concatenated every same-row placement with no gap
 * delimiter, so `someRowContains(_, 'BEE')` matched inside 'BEETLE' and
 * `someRowContains(_, 'ED')` matched inside 'MILLIPEDE' — both assertions could
 * never fail (mutation-confirmed). A run is bounded by real column gaps, so
 * unrelated fields never glue together and a token match is a WHOLE-field match.
 */
function rowTokenGroups(placements: readonly Placement[]): string[][] {
  const byRow = new Map<number, Placement[]>()
  for (const p of placements) {
    const list = byRow.get(p.row) ?? []
    list.push(p)
    byRow.set(p.row, list)
  }
  return [...byRow.values()].map((list) => {
    const sorted = list.slice().sort((a, b) => a.col - b.col)
    const runs: string[] = []
    let run: Placement[] = []
    const flush = (): void => {
      if (run.length) runs.push(run.map((p) => decodeChar(p.stamp)).join('').trim())
      run = []
    }
    for (const p of sorted) {
      if (run.length && p.col !== run[run.length - 1].col + 1) flush()
      run.push(p)
    }
    flush()
    return runs.filter((t) => t.length > 0)
  })
}

/** Every decoded whole-field token across every row. */
function allTokens(placements: readonly Placement[]): string[] {
  return rowTokenGroups(placements).flat()
}

/** True if some contiguous run decodes EXACTLY to `token` (whole-field match). */
function hasToken(placements: readonly Placement[], token: string): boolean {
  return allTokens(placements).includes(token)
}

const CAST = ['DDT BOMB', 'INCHWORM', 'EARWIG', 'DRAGONFLY', 'MILLIPEDE', 'SPIDER', 'BEETLE', 'BEE', 'MOSQUITO', 'GROWTH']

describe('ml9-1 — attract showcase: the ROM cast of characters (MLATR.MAC:580-601)', () => {
  it('names every creature from the ROM 80$ label table (whole-field match)', async () => {
    const { showcasePlacements } = await loadShowcase()
    const placements = showcasePlacements(DEFAULT_HIGH_SCORES)
    for (const name of CAST) {
      // hasToken is a WHOLE-field match, so 'BEE' does NOT match inside 'BEETLE'
      // (review round 1): deleting the BEE entry now reddens this, as it should.
      expect(
        hasToken(placements, name),
        `showcase must label "${name}" as its own field (MLATR.MAC:580-601, decoded from bytes)`,
      ).toBe(true)
    }
  })

  it('does NOT print the .ASCII comment typo "GROWTHS" — the BYTES say GROWTH', async () => {
    // MLATR.MAC:601's comment reads "  GROWTHS  " but its bytes decode to GROWTH,
    // and the reference screenshot shows GROWTH. Guard the byte truth against a
    // Dev who transcribes the comment instead of the data.
    const { showcasePlacements } = await loadShowcase()
    const placements = showcasePlacements(DEFAULT_HIGH_SCORES)
    expect(allTokens(placements).includes('GROWTHS')).toBe(false)
  })
})

describe('ml9-1 — attract showcase: HIGH SCORES table (core/highscore.ts)', () => {
  it('shows the top high-score row: initials and score (screenshot: 89175 BBM)', async () => {
    const { showcasePlacements } = await loadShowcase()
    const placements = showcasePlacements(DEFAULT_HIGH_SCORES)
    const top = DEFAULT_HIGH_SCORES[0]
    expect(top).toEqual({ name: 'BBM', score: 89175 })
    expect(hasToken(placements, top.name), 'top initials BBM must appear').toBe(true)
    expect(hasToken(placements, String(top.score)), 'top score 89175 must appear').toBe(true)
  })

  it('shows all eight rows — every score AND every initials, co-located on one row', async () => {
    // Whole-field match (review round 1): 'ED' no longer matches inside 'MILLIPEDE'.
    // Co-location catches a pairing bug — score i next to initials i±1 — that a
    // "appears somewhere" check would miss.
    const { showcasePlacements } = await loadShowcase()
    const placements = showcasePlacements(DEFAULT_HIGH_SCORES)
    const groups = rowTokenGroups(placements)
    for (const entry of DEFAULT_HIGH_SCORES) {
      expect(hasToken(placements, entry.name), `initials "${entry.name}" must appear as a field`).toBe(true)
      expect(hasToken(placements, String(entry.score)), `score ${entry.score} must appear as a field`).toBe(true)
      const row = groups.find((g) => g.includes(String(entry.score)))
      expect(row, `a row must carry score ${entry.score}`).toBeDefined()
      expect(row, `score ${entry.score} and initials ${entry.name} must share a row`).toContain(entry.name)
    }
  })

  it('threads its highScores ARGUMENT — a distinct table shows, and the defaults do not leak', async () => {
    // Rule-checker round 1 (#18): every other test uses DEFAULT_HIGH_SCORES, so a
    // mutant that ignores the parameter and hardcodes the defaults passed. Feed a
    // disjoint table and assert IT renders while the defaults are absent.
    const { showcasePlacements } = await loadShowcase()
    const alt = [
      { name: 'ZAX', score: 13579 },
      { name: 'QWY', score: 24680 },
    ]
    const p = showcasePlacements(alt)
    for (const e of alt) {
      expect(hasToken(p, e.name), `arg initials ${e.name} must render`).toBe(true)
      expect(hasToken(p, String(e.score)), `arg score ${e.score} must render`).toBe(true)
    }
    expect(hasToken(p, 'BBM'), 'default initials must NOT leak when a different table is passed').toBe(false)
    expect(hasToken(p, '89175'), 'default score must NOT leak when a different table is passed').toBe(false)
  })
})

describe('ml9-1 — attract showcase: the footer (screenshot)', () => {
  for (const line of ['1 COIN 1 PLAY', 'BONUS EVERY 15000', 'COPYRIGHT ATARI 1982']) {
    it(`prints "${line}"`, async () => {
      const { showcasePlacements } = await loadShowcase()
      const placements = showcasePlacements(DEFAULT_HIGH_SCORES)
      expect(hasToken(placements, line)).toBe(true)
    })
  }
})

describe('ml9-1 — attract showcase: the blue background', () => {
  it('is the ROM GREYSC byte 0xF8, which decodes to pure blue', async () => {
    // Pin the byte itself (MLATR.MAC:604-605) so a washed-out or off-hue colour
    // that merely edged out red/green (review round 1) cannot pass.
    const { SHOWCASE_BACKGROUND } = await loadShowcase()
    expect(SHOWCASE_BACKGROUND).toBe(0xf8)
    const { decodeColourByte } = await import('../src/core/palette')
    const { r, g, b } = decodeColourByte(SHOWCASE_BACKGROUND)
    expect({ r, g, b }, '0xF8 through the active-low palette is pure blue').toEqual({ r: 0, g: 0, b: 255 })
  })
})

describe('ml9-1 — main.ts renders the showcase in attract mode (comment-stripped source)', () => {
  it('render branches on the attract phase and draws showcase placements', () => {
    const stripComments = (src: string): string =>
      src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
    const src = stripComments(readFileSync(join(root, 'src', 'main.ts'), 'utf8'))
    // Wiring floor, not implementation dictation: the page must key rendering off
    // the attract phase and route the showcase's placements through the existing
    // grid blitter.
    expect(src, "render must branch on state.phase === 'attract'").toMatch(/phase\s*===\s*['"]attract['"]/)
    // BIND the two calls (rule-checker round 1, #15/#25): showcasePlacements must
    // be an ARGUMENT to drawGridStamps, not merely both present somewhere — a
    // mutant that computes showcasePlacements then discards it, leaving the
    // pre-existing HUD drawGridStamps call to satisfy a loose grep, must redden.
    expect(src, 'showcasePlacements must be drawn via drawGridStamps, not discarded').toMatch(
      /drawGridStamps\s*\([^)]*showcasePlacements\s*\(/,
    )
  })
})
