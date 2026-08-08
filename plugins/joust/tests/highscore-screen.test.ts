// tests/highscore-screen.test.ts
//
// Story jt10-7 — RED (Tyr / TEA). The shell HIGH-SCORE overlay: a new shell module
// plugins/joust/src/shell/highscoreScreen.ts exporting `layoutHighscoreScreen`,
// which lays the JOUST CHAMPIONS table out as glyph-placement ops the existing
// atlas/blit path can paint — the heading in FONT57 (the wide banner font), the
// score rows and the entry prompt in FONT35 (the tight score font). Same testable
// seam jt10-1's fontRender.ts established and jt10-5's selectScreen.ts reused:
// return layout DATA, paint pixels elsewhere (a human smoke test confirms pixels).
//
// This is a SHELL file — the jt1-7 purity scanner does not sweep it. What a node
// test CAN pin: the font per line, the row count tied to the table, the heading
// string tied to the CORE constant (so the ROM text is not re-hardcoded in the
// shell), colour threading, and the wiring lines. Screen POSITIONS are a human
// smoke test / reference capture — not invented here.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadHighscore, type JoustHighScore } from './helpers/highscore-contract.js'
import type { Rgba } from './helpers/select-contract.js'
import { FONT57 } from '../src/core/font57.js'
import { FONT35 } from '../src/core/font35.js'
import type { LaidOutText } from '../src/shell/fontRender.js'

const shellDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'shell')
const GREEN: Rgba = { r: 0, g: 255, b: 0, a: 255 }

interface HighscoreScreenLayout {
  readonly heading: LaidOutText
  readonly rows: readonly LaidOutText[]
  readonly prompt: LaidOutText | null
}

type HighscoreScreenModule = {
  layoutHighscoreScreen(colour: Rgba, table: readonly JoustHighScore[], prompt?: string | null): HighscoreScreenLayout
}

const TABLE: JoustHighScore[] = [
  { name: 'KEA', score: 4200, wave: 7 },
  { name: 'BOB', score: 3100, wave: 5 },
  { name: 'ZED', score: 900, wave: 2 },
]

/** Load the not-yet-built overlay with a self-describing failure (the
 *  loadSelectScreen pattern; the specifier is assembled so the bundler cannot
 *  resolve it statically and redden the whole FILE at collection). */
async function loadHighscoreScreen(): Promise<HighscoreScreenModule> {
  const specifier = ['..', '..', 'src', 'shell', 'highscoreScreen.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<HighscoreScreenModule>
    if (typeof mod.layoutHighscoreScreen !== 'function') throw new Error('no `layoutHighscoreScreen` export')
    return mod as HighscoreScreenModule
  } catch (e) {
    throw new Error(
      'high-score overlay not built yet — GREEN (Loki) creates plugins/joust/src/shell/highscoreScreen.ts ' +
        'exporting layoutHighscoreScreen(colour, table, prompt?): { heading, rows, prompt } — the ' +
        'CHAMPIONS_HEADING laid out in FONT57, one FONT35 row per table entry, and (when a prompt string ' +
        'is passed) the entry prompt in FONT35, all via fontRender.layoutText. Reuse CHAMPIONS_HEADING from ' +
        `core/highscore (never re-hardcoding 'JOUST CHAMPIONS' in the shell). (${(e as Error).message})`,
    )
  }
}

function readHighscoreScreenSource(): string {
  const p = join(shellDir, 'highscoreScreen.ts')
  if (!existsSync(p)) throw new Error('GREEN (Loki) must create src/shell/highscoreScreen.ts (jt10-7)')
  return readFileSync(p, 'utf8')
}

// ─────────────────────────────────────────────────────────────────────────────
// AC5 — the heading is FONT57; the rows are FONT35, one per entry. Fonts are pinned
// by cell HEIGHT (FONT57 = 7, FONT35 = 5) and the heading's first glyph identity.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC5 layoutHighscoreScreen — heading + rows in the right two fonts', () => {
  it('the JOUST CHAMPIONS heading is laid out in FONT57 (the wide banner font)', async () => {
    const h = await loadHighscore()
    const { heading } = (await loadHighscoreScreen()).layoutHighscoreScreen(GREEN, TABLE)
    expect(heading.height, 'FONT57 cell height').toBe(FONT57.cellHeight)
    expect(heading.width, 'advance = CHAMPIONS_HEADING length × FONT57 cell').toBe(
      h.CHAMPIONS_HEADING.length * FONT57.cellWidth,
    )
    // Kills "the heading is drawn in the tight score font" — first glyph is FONT57 'J'.
    expect(heading.ops[0].glyph, "first glyph is FONT57 'J'").toBe(FONT57.glyphFor('J'))
  })

  it('there is exactly one FONT35 row per table entry, carrying that entry’s initials', async () => {
    const { rows } = (await loadHighscoreScreen()).layoutHighscoreScreen(GREEN, TABLE)
    // Kills "rows are dropped / duplicated" — the count tracks the table.
    expect(rows.length, 'one row per JOUST CHAMPIONS entry').toBe(TABLE.length)
    for (const row of rows) {
      expect(row.height, 'rows are the tight FONT35, not the banner font').toBe(FONT35.cellHeight)
    }
    // Kills "the row does not render its own initials" — the first row must contain
    // K, E and A somewhere in its ops (order/position is a human smoke test).
    for (const ch of ['K', 'E', 'A']) {
      expect(
        rows[0].ops.some((op) => op.glyph === FONT35.glyphFor(ch)),
        `row 0 renders initial '${ch}'`,
      ).toBe(true)
    }
  })

  it('the heading and the rows are in DIFFERENT fonts (kills a single-font collapse)', async () => {
    const { heading, rows } = (await loadHighscoreScreen()).layoutHighscoreScreen(GREEN, TABLE)
    expect(heading.height, 'banner font ≠ row font').not.toBe(rows[0].height)
  })

  it('an empty table renders the heading but no rows and no prompt', async () => {
    const { heading, rows, prompt } = (await loadHighscoreScreen()).layoutHighscoreScreen(GREEN, [])
    expect(heading.width, 'the heading is still drawn on an empty board').toBeGreaterThan(0)
    expect(rows.length, 'no entries → no rows').toBe(0)
    expect(prompt, 'no entry in progress → no prompt').toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC5/AC3 — when an entry is in progress the caller passes the RANK-SELECTED prompt
// string; the overlay lays it out in FONT35 verbatim. (main.ts picks champion vs
// lesser via promptForRank — the screen only renders the chosen line.)
// ─────────────────────────────────────────────────────────────────────────────
describe('AC5 the entry prompt line (rank-selected upstream)', () => {
  it('lays the given prompt out in FONT35 when one is supplied', async () => {
    const h = await loadHighscore()
    const { prompt } = (await loadHighscoreScreen()).layoutHighscoreScreen(GREEN, TABLE, h.PROMPT_CHAMPION)
    expect(prompt, 'a prompt was requested').not.toBeNull()
    expect(prompt!.height, 'the prompt is FONT35').toBe(FONT35.cellHeight)
    expect(prompt!.width, 'advance = prompt length × FONT35 cell').toBe(h.PROMPT_CHAMPION.length * FONT35.cellWidth)
  })

  it('threads the caller’s colour onto the heading, rows and prompt', async () => {
    const h = await loadHighscore()
    const { heading, rows, prompt } = (await loadHighscoreScreen()).layoutHighscoreScreen(GREEN, TABLE, h.PROMPT_LESSER)
    expect(heading.colour, 'heading colour').toEqual(GREEN)
    expect(rows[0].colour, 'row colour').toEqual(GREEN)
    expect(prompt!.colour, 'prompt colour').toEqual(GREEN)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC6 — the overlay REUSES the core heading constant; it does not re-transcribe the
// ROM text in the shell (one string, one citation, one place to drift). Source
// wiring: the only faithful pin a node test has for "which font each line uses".
// (lang-review #15/#25: anchor to imports/declarations, not bare keywords.)
// ─────────────────────────────────────────────────────────────────────────────
describe('AC6 the overlay reuses the core heading + the two fonts (source wiring)', () => {
  it('imports CHAMPIONS_HEADING from core/highscore — the ROM text is not re-hardcoded here', () => {
    const src = readHighscoreScreenSource()
    expect(src, 'highscoreScreen imports from core/highscore').toMatch(/from\s+['"][^'"]*core\/highscore(\.js)?['"]/)
    expect(src, 'highscoreScreen uses CHAMPIONS_HEADING rather than a literal').toContain('CHAMPIONS_HEADING')
    // Kills "the heading string was re-typed in the shell".
    expect(src, "no re-hardcoded 'JOUST CHAMPIONS' literal in the shell").not.toContain("'JOUST CHAMPIONS'")
  })

  it('lays the heading out in FONT57 with CHAMPIONS_HEADING, and rows/prompt in FONT35 (anchored to the layoutText calls)', () => {
    const src = readHighscoreScreenSource()
    // #15/#25: anchor to the actual layoutText CALL SITES, not bare whole-file tokens.
    // The heading call must pass FONT57 AND the core constant (not a literal); a
    // font swap or a re-hardcode reddens THIS specifically.
    expect(src, "heading = layoutText('FONT57', CHAMPIONS_HEADING, …)").toMatch(
      /layoutText\(\s*'FONT57'\s*,\s*CHAMPIONS_HEADING\b/,
    )
    // The rows/prompt lines lay out in FONT35 via layoutText.
    expect(src, "rows/prompt use layoutText('FONT35', …)").toMatch(/layoutText\(\s*'FONT35'\s*,/)
  })
})
