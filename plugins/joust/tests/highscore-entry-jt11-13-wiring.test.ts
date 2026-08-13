// tests/highscore-entry-jt11-13-wiring.test.ts
//
// Story jt11-13 — RED (Han Solo / TEA). The one thing a player at the initials
// screen actually needs to see and today does NOT: the letters they type. Found by
// Reviewer during jt11-6. layoutHighscoreScreen is called (colour, table, prompt)
// and never receives the in-flight buffer; entryPrompt is fixed once on entry. So
// the screen shows the heading, the persisted rows and a static prompt, and gives
// ZERO feedback for a keystroke — while jt11-6's 'TYPE A-Z …' line actively invites
// the player to type and watch nothing happen.
//
// ─── THE ROM ECHOES EVERY CHARACTER, AT A CURSOR ─────────────────────────────
// ENTRET BSR OUTHSC 'WRITE THE CHARACTER' (TB12REV1.SRC:1267) → OUTHSC writes it at
// the cursor via OUTCHR (:1271-1276); WRCUR/ERCUR draw and erase a cursor glyph
// (:1287-1295). The buffer is pre-filled with CSPC spaces (:1901-1905), so the
// unentered slots show as blanks — which is why this port pads the buffer to
// MAX_INITIALS: all three slots are visible from the first frame. FONT35 already
// carries the cursor glyph (SARRW, keyed 'ARRW', MESSAGE.SRC:343) and the blank
// space glyph (SSPC), so no new font data is needed.
//
// ─── TWO SEAMS, PINNED SEPARATELY ────────────────────────────────────────────
// (1) the SHELL layout — layoutHighscoreScreen must expose the in-flight buffer as
//     its own laid-out `entry` line (FONT35, padded to MAX_INITIALS, with a cursor),
//     non-null exactly while an entry is in progress; and
// (2) the RENDER wiring — main.ts must thread entry.initials INTO that call and
//     PAINT screen.entry. A layout test alone leaves the line invisible (the
//     joust-drawlist-render-seam trap): laid out but never threaded, or threaded but
//     never painted, both pass a shell-only test and show a blank screen.
//
// The `entry` member is declared LOCALLY (not imported) so `tsc --noEmit` stays
// green while it does not yet exist, and the module is loaded through a
// runtime-assembled specifier so a missing field reddens each test with a
// self-describing message (the tp1-8 trap). Source guards strip comments and slice
// to the render function body — never a whole-file positive anchor (TS checklist
// #15/#25). No `<file>.ts:<line>` refs in these comments (comment-line-refs guard).

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FONT35 } from '../src/core/font35.js'
import { MAX_INITIALS } from '../src/core/highscore.js'
import type { LaidOutText } from '../src/shell/fontRender.js'
import type { Rgba } from '../src/shell/render.js'

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')
const mainPath = join(srcDir, 'main.ts')
const GREEN: Rgba = { r: 0, g: 255, b: 0, a: 255 }
const PROMPT = 'ENTER YOUR INITIALS'
const CURSOR = FONT35.glyphFor('ARRW') // SARRW — the cursor cross glyph

interface JoustRow {
  readonly name: string
  readonly score: number
  readonly wave: number
}

const TABLE: JoustRow[] = [
  { name: 'KEA', score: 4200, wave: 7 },
  { name: 'BOB', score: 3100, wave: 5 },
]

// The jt11-13 shape of the overlay: the existing lines plus the in-flight `entry`
// line. Declared locally so tsc stays green while the member does not exist.
interface Jt11_13Layout {
  readonly heading: LaidOutText
  readonly rows: readonly LaidOutText[]
  readonly prompt: LaidOutText | null
  readonly instructions: LaidOutText | null
  readonly entry: LaidOutText | null
}

interface HighscoreScreenModule {
  layoutHighscoreScreen(
    colour: Rgba,
    table: readonly JoustRow[],
    prompt?: string | null,
    initials?: string | null,
  ): Jt11_13Layout
}

async function loadScreen(): Promise<HighscoreScreenModule> {
  const specifier = ['..', '..', 'src', 'shell', 'highscoreScreen.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<HighscoreScreenModule>
    if (typeof mod.layoutHighscoreScreen !== 'function') throw new Error('module has no `layoutHighscoreScreen`')
    const probe = mod.layoutHighscoreScreen(GREEN, TABLE, PROMPT, 'A')
    if (probe.entry === undefined) throw new Error('the layout has no `entry` line for the in-flight buffer')
    return mod as HighscoreScreenModule
  } catch (e) {
    throw new Error(
      'the jt11-13 in-flight ENTRY line is not in src/shell/highscoreScreen.ts yet — GREEN threads the ' +
        'in-flight initials into layoutHighscoreScreen(colour, table, prompt?, initials?) and returns them as an ' +
        '`entry` LaidOutText in FONT35: the typed letters padded to MAX_INITIALS so all slots are visible ' +
        "(SSPC blanks), plus the cursor glyph (FONT35 'ARRW'/SARRW) marking the active slot, non-null exactly " +
        `while an entry is in progress. (${detail(e)})`,
    )
  }
}

/** A caught `unknown`'s message, narrowed rather than cast (TS checklist #11). */
function detail(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/** The `entry` line, or a self-describing throw — TS narrows the union so no test
 *  body needs a cast that asserts away the very `null` pole it is testing. */
function requireEntry(screen: Jt11_13Layout): LaidOutText {
  const laid = screen.entry
  if (laid === null) throw new Error('the layout returned no `entry` line while an entry was in progress')
  return laid
}

/** True if `laid` paints `ch`'s FONT35 glyph anywhere in its ops. */
function paints(laid: LaidOutText, ch: string): boolean {
  const g = FONT35.glyphFor(ch)
  return laid.ops.some((op) => op.glyph === g)
}

/** True if `laid` paints the cursor glyph anywhere in its ops. */
function paintsCursor(laid: LaidOutText): boolean {
  return laid.ops.some((op) => op.glyph === CURSOR)
}

function readMain(): string {
  if (!existsSync(mainPath)) throw new Error('src/main.ts is missing')
  return readFileSync(mainPath, 'utf8')
}

/** Strip block + line comments so a guard cannot be satisfied by a mention in prose
 *  (source-guards-must-strip-comments). */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

/**
 * The body of `renderHighscoreScreen` ONLY — bounded by code on both sides (the
 * function signature above, its column-0 closing brace below), never the whole file
 * (TS checklist #25). Comments already stripped by the caller. Asserts both markers
 * were found before slicing (indexOf -1 would otherwise yield a wrong window).
 */
function renderHighscoreBody(strippedSrc: string): string {
  const needle = 'function renderHighscoreScreen(): void {'
  const at = strippedSrc.indexOf(needle)
  if (at < 0) throw new Error('main.ts has no `function renderHighscoreScreen(): void {`')
  const end = strippedSrc.indexOf('\n}', at)
  if (end < 0) throw new Error('renderHighscoreScreen has no column-0 closing brace')
  return strippedSrc.slice(at, end)
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — the echo. The felt bug: a keystroke produces no on-screen change. The
// entry line must render the letters the player has typed.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 the entry line echoes the typed initials', () => {
  it('lays the in-flight buffer out as its own FONT35 line in the screen colour', async () => {
    const { layoutHighscoreScreen } = await loadScreen()
    const laid = requireEntry(layoutHighscoreScreen(GREEN, TABLE, PROMPT, 'K'))
    expect(laid.height, 'FONT35 cell height — the tight score font, not the banner').toBe(FONT35.cellHeight)
    expect(laid.colour, 'painted in the screen colour, like every other line').toEqual(GREEN)
  })

  it('every letter typed so far appears as its glyph — a partial buffer shows what was typed', async () => {
    const { layoutHighscoreScreen } = await loadScreen()
    const laid = requireEntry(layoutHighscoreScreen(GREEN, TABLE, PROMPT, 'KE'))
    // THE bug, pinned: type K then E, both must be on screen.
    expect(paints(laid, 'K'), "the entry line paints the typed 'K'").toBe(true)
    expect(paints(laid, 'E'), "the entry line paints the typed 'E'").toBe(true)
  })

  it('a full three-letter buffer paints all three letters', async () => {
    const { layoutHighscoreScreen } = await loadScreen()
    const laid = requireEntry(layoutHighscoreScreen(GREEN, TABLE, PROMPT, 'ZED'))
    for (const ch of ['Z', 'E', 'D']) {
      expect(paints(laid, ch), `the entry line paints '${ch}'`).toBe(true)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — the slots. The ROM pre-fills the buffer with CSPC spaces, so all
// MAX_INITIALS slots are visible from the first frame. A partial or empty buffer
// must still lay out the full field, not collapse to the typed width.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-2 all MAX_INITIALS slots are visible (CSPC pre-fill)', () => {
  it('a one-letter buffer still spans all three slots', async () => {
    const { layoutHighscoreScreen } = await loadScreen()
    const laid = requireEntry(layoutHighscoreScreen(GREEN, TABLE, PROMPT, 'K'))
    // Kills "the line is only as wide as what was typed" — one letter would be 1 cell.
    expect(laid.width, 'the field spans MAX_INITIALS cells even for a 1-char buffer').toBeGreaterThanOrEqual(
      MAX_INITIALS * FONT35.cellWidth,
    )
  })

  it('an empty buffer (just entered) still lays out the three blank slots', async () => {
    const { layoutHighscoreScreen } = await loadScreen()
    const laid = requireEntry(layoutHighscoreScreen(GREEN, TABLE, PROMPT, ''))
    // The moment the screen appears there is nothing typed yet — the slots must
    // still be there, or the player sees an empty screen and the bug is only masked.
    expect(laid.width, 'three slots are laid out for an empty buffer').toBeGreaterThanOrEqual(
      MAX_INITIALS * FONT35.cellWidth,
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — the cursor. FONT35's SARRW glyph marks the active slot while there is room
// to type (the ROM's WRCUR). It must not SHADOW an already-typed letter — it points
// at the NEXT slot, not over the last one entered.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-3 a cursor marks the active slot', () => {
  it('the cursor glyph is available in FONT35 (fixture guard — SARRW keyed as ARRW)', () => {
    // Non-vacuity for the tests below: if CURSOR were undefined, `paintsCursor`
    // could pass on an op that also carries an undefined glyph. Anchor it to a real
    // glyph first.
    expect(CURSOR, "FONT35.glyphFor('ARRW') resolves to the cursor glyph").toBeDefined()
  })

  it('an empty buffer shows the cursor at the first slot', async () => {
    const { layoutHighscoreScreen } = await loadScreen()
    const laid = requireEntry(layoutHighscoreScreen(GREEN, TABLE, PROMPT, ''))
    expect(paintsCursor(laid), 'the cursor is shown while there is a slot to fill').toBe(true)
  })

  it('with one letter typed, the cursor is shown AND the letter is not shadowed', async () => {
    const { layoutHighscoreScreen } = await loadScreen()
    const laid = requireEntry(layoutHighscoreScreen(GREEN, TABLE, PROMPT, 'K'))
    // Both must be present: the cursor points at slot 2, 'K' stays in slot 1. A naive
    // "overwrite slot 0 with a cursor" impl loses the letter and fails here.
    expect(paints(laid, 'K'), "the typed 'K' survives").toBe(true)
    expect(paintsCursor(laid), 'the cursor is also shown, at the next slot').toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4 — the entry line tracks the entry state: shown while entering, absent on the
// plain board (parallel to the jt11-6 instructions line). Telling a spectator's
// board to show a blinking initials field would be noise.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-4 the entry line is present only while entering', () => {
  it('the plain board (no in-flight buffer) carries no entry line', async () => {
    const { layoutHighscoreScreen } = await loadScreen()
    expect(layoutHighscoreScreen(GREEN, TABLE).entry, 'the default is the board, not an entry').toBeNull()
    expect(layoutHighscoreScreen(GREEN, TABLE, null).entry, 'no prompt → no entry line').toBeNull()
  })

  it('an in-progress entry (even empty) carries the entry line', async () => {
    const { layoutHighscoreScreen } = await loadScreen()
    expect(layoutHighscoreScreen(GREEN, TABLE, PROMPT, '').entry, 'entering → shown').not.toBeNull()
    expect(layoutHighscoreScreen(GREEN, TABLE, PROMPT, 'AB').entry, 'entering → shown').not.toBeNull()
  })

  it('the heading, rows and prompt still lay out — the line is added, not swapped in', async () => {
    const { layoutHighscoreScreen } = await loadScreen()
    const screen = layoutHighscoreScreen(GREEN, TABLE, PROMPT, 'A')
    expect(screen.rows.length, 'one row per table entry').toBe(TABLE.length)
    expect(screen.prompt, 'the rank-conditional prompt survives').not.toBeNull()
    expect(screen.heading.height, 'the heading is still the FONT57 banner').toBeGreaterThan(FONT35.cellHeight)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-5 — the render seam (main.ts). A layout the render path never threads or never
// paints is invisible (joust-drawlist-render-seam). Both halves are pinned against
// the renderHighscoreScreen BODY, comments stripped.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-5 main.ts threads the buffer in and paints the entry line', () => {
  it('renderHighscoreScreen threads the in-flight entry.initials INTO layoutHighscoreScreen', () => {
    const body = renderHighscoreBody(stripComments(readMain()))
    // Kills "laid out but never fed" — today the call is (colour, table, entryPrompt)
    // and the buffer never reaches the layout, which is the whole bug.
    expect(body, 'the layoutHighscoreScreen call passes entry.initials').toMatch(
      /layoutHighscoreScreen\([^)]*entry\.initials/,
    )
  })

  it('renderHighscoreScreen PAINTS screen.entry', () => {
    const body = renderHighscoreBody(stripComments(readMain()))
    // Kills "threaded but never painted" — the layout is data; only paintText puts it
    // on the backbuffer. Its Y is a human smoke test, as with every other line here.
    expect(body, 'renderHighscoreScreen paints screen.entry').toMatch(/paintText\(\s*screen\.entry/)
  })
})
