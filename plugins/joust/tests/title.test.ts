// tests/title.test.ts
//
// Story jt10-3 — RED (Tyr / TEA). The TITLE SCREEN (the ROM's MARQUE routine,
// ATT.SRC:50): the vector JOUST wordmark, the (C)1982 + EXTRA-MOUNT phrase lines
// in FONT57, and the marquee colour cycle. Core DATA + a pure cycle fn live in
// src/core/title.ts (under the jt1-7 purity boundary); the shell overlay
// src/shell/titleScreen.ts lays the phrase lines out via jt10-1's fontRender and
// reuses the core strings — the same "return layout DATA, paint pixels elsewhere"
// seam gameOverScreen (jt10-6) and selectScreen (jt10-5) established.
//
// All expected values + primary-source citations are stated in
// tests/helpers/title-contract.ts (the quarry is resolved there). "PRESENTED-BY"
// is deliberately absent: it exists in no revision of Joust's ROM (see the
// session Design Deviations — the story was retitled to drop it).

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FONT57 } from '../src/core/font57.js'
import type { Rgba } from '../src/shell/render.js'
import type { LaidOutText } from '../src/shell/fontRender.js'
import {
  loadTitleCore,
  loadTitleScreen,
  TITLE_COPYRIGHT_EXPECTED,
  TITLE_EXTRA_MOUNT_EXPECTED,
  TITLE_POINTS_SUFFIX_EXPECTED,
  LOGO_XOFFSETS_EXPECTED,
  LOGO_COLOURS,
  TITLE_COLOR_CADENCE_EXPECTED,
  TITLE_PALETTE_ROWS,
  TITLE_PALETTE_COLS,
  TITLE_PALETTE_ROW0_EXPECTED,
  TITLE_PALETTE_OCTAL_ANCHORS,
  TITLE_CYCLE_ROWS,
  type TitleScreenLayout,
} from './helpers/title-contract.js'

const here = dirname(fileURLToPath(import.meta.url))
const coreTitlePath = join(here, '..', 'src', 'core', 'title.ts')
const shellTitlePath = join(here, '..', 'src', 'shell', 'titleScreen.ts')
const mainPath = join(here, '..', 'src', 'main.ts')

const GREEN: Rgba = { r: 0, g: 255, b: 0, a: 255 }
const AMBER: Rgba = { r: 255, g: 191, b: 0, a: 255 }

function readOrThrow(p: string, who: string): string {
  if (!existsSync(p)) throw new Error(`GREEN (Loki) must create ${who} (jt10-3)`)
  return readFileSync(p, 'utf8')
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — the three title strings, transcribed VERBATIM. The value gate: a
// mis-spelled, mis-spaced, or invented ("PRESENTED BY") string reddens here.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 core title strings — the MARQUE phrases, verbatim', () => {
  it("TITLE_COPYRIGHT is MSCOPY $6C '(C) 1982 WILLIAMS ELECTRONICS INC.' (MESSEQU.SRC:129)", async () => {
    const { TITLE_COPYRIGHT } = await loadTitleCore()
    expect(TITLE_COPYRIGHT).toBe(TITLE_COPYRIGHT_EXPECTED)
    // The space after "(C)" is part of the ROM string — a collapsed "(C)1982" is drift.
    expect(TITLE_COPYRIGHT).toContain('(C) 1982')
  })

  it("TITLE_EXTRA_MOUNT is MSW17 $F7 'EXTRA MOUNT EVERY ' — with its trailing space (MESSEQU.SRC:158)", async () => {
    const { TITLE_EXTRA_MOUNT } = await loadTitleCore()
    expect(TITLE_EXTRA_MOUNT).toBe(TITLE_EXTRA_MOUNT_EXPECTED)
    // The trailing space matters: the BCD replay level prints right after it.
    expect(TITLE_EXTRA_MOUNT.endsWith(' '), 'MSW17 keeps its trailing space').toBe(true)
    // The ATT.SRC:67 COMMENT paraphrases it "EXTRA MAN AT" — the constant, not the
    // comment, is authoritative. Guard against transcribing the paraphrase.
    expect(TITLE_EXTRA_MOUNT).not.toContain('EXTRA MAN')
  })

  it("TITLE_POINTS_SUFFIX is MSW18 $F8 ',000 POINTS' (MESSEQU.SRC:157)", async () => {
    const { TITLE_POINTS_SUFFIX } = await loadTitleCore()
    expect(TITLE_POINTS_SUFFIX).toBe(TITLE_POINTS_SUFFIX_EXPECTED)
    expect(TITLE_POINTS_SUFFIX.startsWith(','), 'MSW18 keeps its leading comma').toBe(true)
  })

  it('carries NO "PRESENTED BY" line anywhere in core title data — it exists in no ROM revision', async () => {
    const mod = await loadTitleCore()
    const blob = JSON.stringify(mod)
    expect(blob.toUpperCase(), 'PRESENTED BY was refuted at quarry and dropped').not.toContain('PRESENTED')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — the JOUST logo is VECTOR geometry (LIST, ATT.SRC:423-531), not a bitmap.
// Pinned by ROM-derived invariants: five letter x-offsets spelling J-O-U-S-T, the
// CL1..CL4 colour set, both fill modes, and a substantial point count.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-2 JOUST_LOGO — the vector wordmark from LIST', () => {
  it('has five letter-groups (J,O,U,S,T)', async () => {
    const { JOUST_LOGO } = await loadTitleCore()
    expect(JOUST_LOGO.letters.length, 'five letters: J O U S T').toBe(5)
  })

  it('the letter x-offsets, left→right, are [5,68,110,170,222] — the LIST offsets (XPOS folded in)', async () => {
    const { JOUST_LOGO } = await loadTitleCore()
    const offsets = JOUST_LOGO.letters.map((l) => l.xOffset).sort((a, b) => a - b)
    // Kills a wrong XPOS, a dropped letter, or a bitmap stub with no offsets.
    expect(offsets).toEqual([...LOGO_XOFFSETS_EXPECTED])
    // Strictly increasing = the letters lay out left→right (the wordmark reads JOUST).
    for (let i = 1; i < offsets.length; i++) expect(offsets[i]).toBeGreaterThan(offsets[i - 1])
  })

  it('every stroke colour is one of CL1..CL4 ($11,$22,$33,$44), and all four are used', async () => {
    const { JOUST_LOGO } = await loadTitleCore()
    const colours = new Set<number>()
    for (const letter of JOUST_LOGO.letters)
      for (const s of letter.strokes) {
        colours.add(s.colorLeft)
        colours.add(s.colorRight)
      }
    for (const c of colours)
      expect(LOGO_COLOURS, `colour ${c} is not one of CL1..CL4`).toContain(c as (typeof LOGO_COLOURS)[number])
    for (const c of LOGO_COLOURS) expect(colours, `CL colour ${c} must appear`).toContain(c)
  })

  it('uses both fill modes (NOFILL and FILL), and the geometry is substantial (not a stub)', async () => {
    const { JOUST_LOGO } = await loadTitleCore()
    const fills = new Set<boolean>()
    let points = 0
    let strokes = 0
    for (const letter of JOUST_LOGO.letters)
      for (const s of letter.strokes) {
        fills.add(s.fill)
        strokes++
        points += s.points.length
        for (const p of s.points) expect(p.length, 'each point is an [x,y] pair').toBe(2)
      }
    expect(fills.has(true) && fills.has(false), 'both FILL and NOFILL strokes appear').toBe(true)
    // Teeth against a token/stub transcription. The real LIST has well over 100
    // points across ~50 strokes; these floors sit safely below that.
    expect(strokes, 'the LIST has many strokes').toBeGreaterThanOrEqual(15)
    expect(points, 'the LIST has many points').toBeGreaterThanOrEqual(80)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — the colour cycle: cadence 87 (NOT 88), the MARCOL palette (radix-exact),
// and a pure cycling selector over the 5 cycling rows that wraps.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-3 colour cycle — cadence, MARCOL palette, and the pure selector', () => {
  it('TITLE_COLOR_CADENCE is 87 (ATT.SRC:173), NOT the spec-guessed 88', async () => {
    const { TITLE_COLOR_CADENCE } = await loadTitleCore()
    expect(TITLE_COLOR_CADENCE).toBe(TITLE_COLOR_CADENCE_EXPECTED)
    expect(TITLE_COLOR_CADENCE, 'the spec estimate 88 is wrong').not.toBe(88)
  })

  it('TITLE_PALETTE is MARCOL: 6 rows × 8 bytes, every byte 0..255', async () => {
    const { TITLE_PALETTE } = await loadTitleCore()
    expect(TITLE_PALETTE.length, 'MARCOL row count').toBe(TITLE_PALETTE_ROWS)
    for (const row of TITLE_PALETTE) {
      expect(row.length, 'each MARCOL row is 8 bytes').toBe(TITLE_PALETTE_COLS)
      for (const b of row) {
        expect(Number.isInteger(b)).toBe(true)
        expect(b).toBeGreaterThanOrEqual(0)
        expect(b).toBeLessThanOrEqual(255)
      }
    }
  })

  it('row 0 is verbatim [0,0,7,63,5,255,232,232] — the $/@ mixed initial row (ATT.SRC:288)', async () => {
    const { TITLE_PALETTE } = await loadTitleCore()
    expect(TITLE_PALETTE[0]).toEqual([...TITLE_PALETTE_ROW0_EXPECTED])
  })

  it('the @ octal anchors are decoded by RADIX, not by digits (@300=192, not 300)', async () => {
    const { TITLE_PALETTE } = await loadTitleCore()
    for (const [row, col, value] of TITLE_PALETTE_OCTAL_ANCHORS) {
      expect(
        TITLE_PALETTE[row]?.[col],
        `MARCOL[${row}][${col}] must be the octal value ${value}, not its decimal digits`,
      ).toBe(value)
    }
  })

  it('titleColorRow cycles the 5 rows (MARCOL+8..MAREND) at the cadence, and wraps', async () => {
    const { titleColorRow, TITLE_COLOR_CADENCE: C } = await loadTitleCore()
    // Every result is a valid cycling-row index.
    for (const t of [0, 1, C, 3 * C, 10 * C]) {
      const r = titleColorRow(t)
      expect(Number.isInteger(r)).toBe(true)
      expect(r).toBeGreaterThanOrEqual(0)
      expect(r).toBeLessThan(TITLE_CYCLE_ROWS)
    }
    // Stable within one cadence window, then advances at the boundary.
    expect(titleColorRow(0), 'stable across a cadence window').toBe(titleColorRow(C - 1))
    expect(titleColorRow(C), 'advances after one cadence').not.toBe(titleColorRow(0))
    // A full cycle visits all 5 rows...
    const visited = new Set(Array.from({ length: TITLE_CYCLE_ROWS }, (_, i) => titleColorRow(i * C)))
    expect(visited.size, 'all 5 cycling rows appear over 5 windows').toBe(TITLE_CYCLE_ROWS)
    // ...and then wraps.
    expect(titleColorRow(TITLE_CYCLE_ROWS * C), 'wraps after 5 windows').toBe(titleColorRow(0))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4 — the shell overlay lays the phrase lines out in FONT57, tying each width
// to its CORE string length (a dropped/padded/mis-fonted char reddens), threads
// the caller's colour, and hands through the JOUST_LOGO geometry.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-4 layoutTitleScreen — the FONT57 phrase lines + the logo', () => {
  it('lays the copyright out in FONT57 (cell height 7), one op per character', async () => {
    const { TITLE_COPYRIGHT } = await loadTitleCore()
    const screen = (await loadTitleScreen<TitleScreenLayout>()).layoutTitleScreen(GREEN)
    const copyright = screen.copyright as LaidOutText
    expect(copyright.height, 'FONT57 cell height').toBe(FONT57.cellHeight)
    expect(copyright.width, 'advance = copyright length × FONT57 cell').toBe(
      TITLE_COPYRIGHT.length * FONT57.cellWidth,
    )
    expect(copyright.ops.length, 'one op per character of TITLE_COPYRIGHT').toBe(TITLE_COPYRIGHT.length)
    expect(copyright.ops[0].glyph, "first glyph is FONT57 '('").toBe(FONT57.glyphFor('('))
  })

  it('lays the extra-mount and points lines out in FONT57, widths tied to their core strings', async () => {
    const { TITLE_EXTRA_MOUNT, TITLE_POINTS_SUFFIX } = await loadTitleCore()
    const screen = (await loadTitleScreen<TitleScreenLayout>()).layoutTitleScreen(GREEN)
    const extra = screen.extraMount as LaidOutText
    const pts = screen.pointsSuffix as LaidOutText
    expect(extra.height).toBe(FONT57.cellHeight)
    expect(extra.width, 'EXTRA MOUNT width tied to core string').toBe(
      TITLE_EXTRA_MOUNT.length * FONT57.cellWidth,
    )
    expect(extra.ops.length).toBe(TITLE_EXTRA_MOUNT.length)
    expect(pts.width, ',000 POINTS width tied to core string').toBe(
      TITLE_POINTS_SUFFIX.length * FONT57.cellWidth,
    )
    expect(pts.ops.length).toBe(TITLE_POINTS_SUFFIX.length)
  })

  it("threads the caller's colour onto every line (two distinct colours, distinctly)", async () => {
    const g = (await loadTitleScreen<TitleScreenLayout>()).layoutTitleScreen(GREEN)
    const a = (await loadTitleScreen<TitleScreenLayout>()).layoutTitleScreen(AMBER)
    for (const line of ['copyright', 'extraMount', 'pointsSuffix'] as const) {
      expect((g[line] as LaidOutText).colour, `${line} carries GREEN`).toEqual(GREEN)
      expect((a[line] as LaidOutText).colour, `${line} carries AMBER`).toEqual(AMBER)
      expect((a[line] as LaidOutText).colour, `${line} colour is threaded, not hard-wired`).not.toEqual(
        (g[line] as LaidOutText).colour,
      )
    }
  })

  it('hands through the core JOUST_LOGO geometry (five letters), not a re-transcription', async () => {
    const { JOUST_LOGO } = await loadTitleCore()
    const screen = (await loadTitleScreen<TitleScreenLayout>()).layoutTitleScreen(GREEN)
    expect(screen.logo.letters.length, 'the overlay carries the 5-letter wordmark').toBe(5)
    expect(screen.logo, 'the overlay reuses the core JOUST_LOGO object').toBe(JOUST_LOGO)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-5/AC-6 — source wiring: the shell reuses the core strings (one string, one
// citation), main.ts renders the 'title' mode and drives the cycle, and each
// transcription cites its .SRC source. Node-testable pins for shell/main.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-5/AC-6 source wiring + citations', () => {
  it('core/title.ts cites its ROM sources (MESSEQU.SRC for strings, ATT.SRC for logo/palette/cadence)', () => {
    const src = readOrThrow(coreTitlePath, 'src/core/title.ts')
    expect(src, 'the phrase strings cite MESSEQU.SRC').toContain('MESSEQU.SRC')
    expect(src, 'the logo/palette/cadence cite ATT.SRC').toContain('ATT.SRC')
  })

  it('titleScreen reuses the core strings via layoutText+FONT57 — no re-hardcoded ROM text', () => {
    const src = readOrThrow(shellTitlePath, 'src/shell/titleScreen.ts')
    expect(src, 'imports the core title module').toMatch(/from\s+['"][^'"]*core\/title(\.js)?['"]/)
    expect(src, 'uses the jt10-1 raster renderer').toMatch(/layoutText\s*\(/)
    expect(src, 'names FONT57').toContain('FONT57')
    // The ROM strings must not be re-typed as literals in the shell.
    expect(src, 'no re-hardcoded copyright literal').not.toContain('WILLIAMS ELECTRONICS')
    expect(src, 'no re-hardcoded extra-mount literal').not.toContain('EXTRA MOUNT')
    expect(src, 'no re-hardcoded points literal').not.toContain(',000 POINTS')
  })

  it("main.ts renders the 'title' mode and drives the colour cycle via titleColorRow", () => {
    const src = readOrThrow(mainPath, 'src/main.ts')
    expect(src, 'imports the title overlay').toMatch(/from\s+['"][^'"]*shell\/titleScreen(\.js)?['"]/)
    expect(src, "handles the 'title' cabinet mode").toContain("'title'")
    expect(src, 'drives the colour cycle from the shell clock').toContain('titleColorRow')
  })
})
