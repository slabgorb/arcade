// tests/attract-showcase-colour.test.ts
//
// Story ml9-3 — RED phase (TEA). The ATTRACT ENEMY-SHOWCASE per-section TEXT
// COLOURS. ml9-1 shipped the showcase CONTENT (labels, HIGH SCORES, footer) but
// draws every character through the census-default palette, so the whole screen
// prints GREEN (drawGridStamps' default flatPalette maps a glyph's pixel value 2
// to $E7 green — main.ts:160 passes no palette). The MAME reference
// (sprint/planning/ml9-playthrough-refs/attract-mame-reference.png) shows:
//   • HIGH SCORES title + all eight score/initials rows  → WHITE
//   • the footer (1 COIN 1 PLAY / BONUS EVERY 15000 / COPYRIGHT ATARI 1982) → WHITE
//   • every creature label (DRAGONFLY … DDT BOMB … SPIDER) → RED
//
// ─── GROUND TRUTH (ROM colour slots) ─────────────────────────────────────────
// The two inks are the CLRCH immediates, decoded through the ml2-3 active-low
// wiring (src/core/palette.ts):
//   WHITE = $00  (ANCOL+3, "LDA I,0" WHITE, MLIRQ.MAC:297) → rgb(255,222,255)
//   RED   = $1F  (ANCOL+2, "LDA I,1F" RED,  MLIRQ.MAC:294) → rgb(255,0,0)
// MLATR.MAC:580-610 writes no per-section colour, and both letters and digits
// use pixel value 2, so this CANNOT be a pixel-value distinction — the screen is
// SECTIONED and each section drawn through its own one-colour palette.
//
// ─── WHAT GREEN (Dev) MUST SHIP ──────────────────────────────────────────────
//   src/core/attract-showcase.ts — a new pure export that groups the existing
//     placements into coloured SECTIONS:
//        showcaseSections(highScores): readonly { ink: number; placements: Placement[] }[]
//     where `ink` is the section's ROM colour BYTE ($00 white / $1F red) and the
//     union of every section's placements is exactly showcasePlacements(highScores).
//   src/main.ts — renderAttractShowcase draws EACH section through a one-colour
//     palette built from its ink (the alphanumericPens shape), replacing the
//     single palette-less drawGridStamps(c, showcasePlacements(...)) call.
//
// The section→colour MAPPING is the pinned truth here; exact screen coordinates
// and the black-box cell backgrounds (attract-mame-reference.png shows BLACK
// panels behind the sprites, not blue show-through) are proven at the visual
// playtest (playbook §4). This file pins WHICH SECTION IS WHICH COLOUR.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { DEFAULT_HIGH_SCORES } from '../src/core/highscore'
import { decodeColourByte } from '../src/core/palette'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SHOWCASE_SPECIFIER = ['..', 'src', 'core', 'attract-showcase'].join('/')

const WHITE_BYTE = 0x00 // ANCOL+3, MLIRQ.MAC:297
const RED_BYTE = 0x1f // ANCOL+2, MLIRQ.MAC:294
const WHITE_RGB = { r: 255, g: 222, b: 255 }
const RED_RGB = { r: 255, g: 0, b: 0 }

interface Placement {
  col: number
  row: number
  stamp: number
}
interface ShowcaseSection {
  ink: number
  placements: readonly Placement[]
}
interface ShowcaseModule {
  showcaseSections: (highScores: readonly { name: string; score: number }[]) => readonly ShowcaseSection[]
  showcasePlacements: (highScores: readonly { name: string; score: number }[]) => readonly Placement[]
}

/** Self-describing loader (the ml1-1 pattern): RED proves the feature absent. */
async function loadShowcase(): Promise<ShowcaseModule> {
  try {
    const mod = (await import(/* @vite-ignore */ SHOWCASE_SPECIFIER)) as Partial<ShowcaseModule>
    if (typeof mod.showcaseSections !== 'function') throw new Error('module has no showcaseSections export')
    if (typeof mod.showcasePlacements !== 'function') throw new Error('module has no showcasePlacements export')
    return mod as ShowcaseModule
  } catch (e) {
    throw new Error(
      `ml9-3: src/core/attract-showcase.ts showcaseSections() not built yet — GREEN (Dev) ` +
        `ships sectioned per-colour placements (white HIGH SCORES/footer, red creature labels): ${
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
  return '¿'
}

/**
 * Whole-field tokens of a placement list: group by row, split each row into
 * maximal contiguous-column runs (the ml9-1 review-round-1 fix so a token is a
 * WHOLE field, not a substring glued across a row).
 */
function tokensOf(placements: readonly Placement[]): string[] {
  const byRow = new Map<number, Placement[]>()
  for (const p of placements) {
    const list = byRow.get(p.row) ?? []
    list.push(p)
    byRow.set(p.row, list)
  }
  const out: string[] = []
  for (const list of byRow.values()) {
    const sorted = list.slice().sort((a, b) => a.col - b.col)
    let run: Placement[] = []
    const flush = (): void => {
      if (run.length) {
        const t = run.map((p) => decodeChar(p.stamp)).join('').trim()
        if (t.length) out.push(t)
      }
      run = []
    }
    for (const p of sorted) {
      if (run.length && p.col !== run[run.length - 1].col + 1) flush()
      run.push(p)
    }
    flush()
  }
  return out
}

/** The one section whose whole-field tokens include `token` (or undefined). */
function sectionOf(sections: readonly ShowcaseSection[], token: string): ShowcaseSection | undefined {
  return sections.find((s) => tokensOf(s.placements).includes(token))
}

const CAST = ['DDT BOMB', 'INCHWORM', 'EARWIG', 'DRAGONFLY', 'MILLIPEDE', 'SPIDER', 'BEETLE', 'BEE', 'MOSQUITO', 'GROWTH']
const FOOTER = ['1 COIN 1 PLAY', 'BONUS EVERY 15000', 'COPYRIGHT ATARI 1982']

describe('ml9-3 — the ROM colour bytes decode to the reference inks', () => {
  it('$00 is WHITE and $1F is RED through the active-low wiring', () => {
    // Not test-local arithmetic (checklist #26): the inks come from the real
    // src/core/palette.ts decode, so a wiring change is caught here too.
    expect(decodeColourByte(WHITE_BYTE)).toEqual(WHITE_RGB)
    expect(decodeColourByte(RED_BYTE)).toEqual(RED_RGB)
    expect(WHITE_RGB).not.toEqual(RED_RGB)
  })
})

describe('ml9-3 — attract showcase sections (core/attract-showcase.ts)', () => {
  it('showcaseSections returns coloured sections, each with an ink byte and placements', async () => {
    const { showcaseSections } = await loadShowcase()
    const sections = showcaseSections(DEFAULT_HIGH_SCORES)
    expect(Array.isArray(sections)).toBe(true)
    expect(sections.length).toBeGreaterThan(0)
    for (const s of sections) {
      expect(typeof s.ink, 'each section carries a numeric colour byte').toBe('number')
      expect(Array.isArray(s.placements)).toBe(true)
    }
  })

  it('the sections PARTITION the showcase text — union === showcasePlacements, nothing lost or added', async () => {
    const { showcaseSections, showcasePlacements } = await loadShowcase()
    const key = (p: Placement): string => `${p.col},${p.row},${p.stamp}`
    const union = showcaseSections(DEFAULT_HIGH_SCORES)
      .flatMap((s) => s.placements)
      .map(key)
      .sort()
    const flat = showcasePlacements(DEFAULT_HIGH_SCORES).map(key).sort()
    expect(union).toEqual(flat)
  })

  it('every creature label is in a RED ($1F) section (MLATR.MAC:594-601; attract-mame-reference.png)', async () => {
    const { showcaseSections } = await loadShowcase()
    const sections = showcaseSections(DEFAULT_HIGH_SCORES)
    for (const name of CAST) {
      const sec = sectionOf(sections, name)
      expect(sec, `label "${name}" must live in a section`).toBeDefined()
      expect(sec!.ink, `label "${name}" section ink must be RED $1F`).toBe(RED_BYTE)
      expect(decodeColourByte(sec!.ink)).toEqual(RED_RGB)
    }
  })

  it('the HIGH SCORES title and every score/initials row are in a WHITE ($00) section', async () => {
    const { showcaseSections } = await loadShowcase()
    const sections = showcaseSections(DEFAULT_HIGH_SCORES)
    for (const token of ['HIGH SCORES', ...DEFAULT_HIGH_SCORES.map((e) => String(e.score)), ...DEFAULT_HIGH_SCORES.map((e) => e.name)]) {
      const sec = sectionOf(sections, token)
      expect(sec, `high-score field "${token}" must live in a section`).toBeDefined()
      expect(sec!.ink, `high-score field "${token}" section ink must be WHITE $00`).toBe(WHITE_BYTE)
      expect(decodeColourByte(sec!.ink)).toEqual(WHITE_RGB)
    }
  })

  it('every footer line is in a WHITE ($00) section (attract-mame-reference.png)', async () => {
    const { showcaseSections } = await loadShowcase()
    const sections = showcaseSections(DEFAULT_HIGH_SCORES)
    for (const line of FOOTER) {
      const sec = sectionOf(sections, line)
      expect(sec, `footer "${line}" must live in a section`).toBeDefined()
      expect(sec!.ink, `footer "${line}" section ink must be WHITE $00`).toBe(WHITE_BYTE)
    }
  })

  it('labels and high-scores are DIFFERENT inks — a single-colour mutant dies here', async () => {
    const { showcaseSections } = await loadShowcase()
    const sections = showcaseSections(DEFAULT_HIGH_SCORES)
    const labelInk = sectionOf(sections, 'DRAGONFLY')?.ink
    const scoreInk = sectionOf(sections, 'HIGH SCORES')?.ink
    expect(labelInk).toBe(RED_BYTE)
    expect(scoreInk).toBe(WHITE_BYTE)
    expect(labelInk).not.toBe(scoreInk)
  })

  it('threads the highScores ARGUMENT — a distinct table colours through, defaults do not leak', async () => {
    // A sections impl that ignores its parameter and hardcodes the defaults
    // passes every DEFAULT_HIGH_SCORES test above; feed a disjoint table.
    const { showcaseSections } = await loadShowcase()
    const alt = [
      { name: 'ZAX', score: 13579 },
      { name: 'QWY', score: 24680 },
    ]
    const sections = showcaseSections(alt)
    for (const e of alt) {
      const sec = sectionOf(sections, String(e.score))
      expect(sec, `arg score ${e.score} must render in a section`).toBeDefined()
      expect(sec!.ink, `arg score ${e.score} must be WHITE $00`).toBe(WHITE_BYTE)
    }
    expect(sectionOf(sections, '89175'), 'default score must NOT leak when a different table is passed').toBeUndefined()
  })
})

describe('ml9-3 — main.ts draws each showcase section through its own palette', () => {
  it('branches on the attract phase, uses showcaseSections, and drops the palette-less flat draw', () => {
    const stripComments = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
    const src = stripComments(readFileSync(join(root, 'src', 'main.ts'), 'utf8'))
    // (a) still keys rendering off the attract phase (ml9-1 wiring floor).
    expect(src, "render must branch on state.phase === 'attract'").toMatch(/phase\s*===\s*['"]attract['"]/)
    // (b) the sectioned API is the source of the showcase draw now.
    expect(src, 'main.ts must render via showcaseSections').toMatch(/showcaseSections\s*\(/)
    // (c) NEGATIVE guard (checklist #25 — safe over the whole file): the old
    // palette-less flat draw that renders the whole screen green must be gone.
    // Its presence == the green-everywhere bug, so its absence is the fix.
    expect(
      src,
      'the palette-less drawGridStamps(c, showcasePlacements(...)) flat draw must be replaced by per-section draws',
    ).not.toMatch(/drawGridStamps\s*\(\s*\w+\s*,\s*showcasePlacements\s*\([^)]*\)\s*\)/)
  })
})
