// tests/shell/render.rebel-force-board.test.ts
//
// sw7-3 RED — the high-score board's authentic framing, asserted at the ONLY
// text-identifiable seam (layoutText; the canvas sees anonymous strokes). Mirrors
// the font-text-seam mock (render.ts imports layoutText from './font'). Covers:
//
//   H-011  the board TITLE is the ROM's message RF2 <PRINCESS LEIA'S REBEL FORCE>
//          (TCMES.MAC:605), NOT 'HIGH SCORES'.
//          CRITICAL (refutation): there is NO bare <REBEL FORCE> message — RF1 is
//          `.NEXTMESS` which only RE-CENTRES the SAME title for the half-screen
//          initials layout; a lone 'REBEL FORCE' string is a fabrication.
//   H-020  board scores are comma-grouped (VW8DIG inserts VJNUMS commas —
//          TCMES.MAC:791), not the raw `String(e.score).padStart(6)` integer.
//
// Apostrophe caveat: the shared VGMSGA font has NO apostrophe glyph (GLYPH_CHARS
// is " 0123456789A-Z-,/_"; charGlyph degrades "'" to a blank space). So the
// on-screen title cannot carry the apostrophe in-scope — the title assertion
// therefore accepts LEIA'S or LEIAS. Raised as a Delivery Finding (adding the
// glyph is an out-of-scope @shared change).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '../../src/shell/render'
import { initialState, type GameState } from '../../src/core/state'
import type { HighScoreTable } from '@shared/highscore'

// Record the strings handed to layoutText. Trivial-but-valid geometry so render
// strokes without NaN and without the shared package needing to resolve.
const font = vi.hoisted(() => {
  const calls: { text: string }[] = []
  return {
    calls,
    layoutText(text: string, opts?: { letterSpacing?: number }) {
      calls.push({ text })
      const n = [...text].length
      const sp = opts?.letterSpacing ?? 0
      return { strokes: [{ points: [{ x: 0, y: 0 }, { x: 16, y: 0 }] }], width: 16 * n + sp * n }
    },
  }
})

vi.mock('../../src/shell/font', () => ({
  layoutText: font.layoutText,
  CELL_W: 16,
  CELL_H: 24,
  hasGlyph: () => true,
  charGlyph: () => ({ strokes: [], advance: 24 }),
  GLYPH_CHARS: ' 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-_,/',
}))

const W = 800
const H = 600

/** Proxy ctx: methods no-op, properties settable, measureText width 0. */
function makeCtx(): CanvasRenderingContext2D {
  const target: Record<string | symbol, unknown> = { canvas: { width: W, height: H } }
  const proxy = new Proxy(target, {
    get(t, prop) {
      if (prop === 'measureText') return () => ({ width: 0 })
      if (prop in t) return t[prop]
      return () => {}
    },
    set(t, prop, value) {
      t[prop] = value
      return true
    },
  })
  return proxy as unknown as CanvasRenderingContext2D
}

const texts = (): string[] => font.calls.map((c) => c.text)
// sw7-10 / H-017 re-seat: the hi-score board is no longer painted under the marquee —
// it is its OWN page in the attract rotation (PH$HIS, WSMAIN.MAC:338), so a board
// fixture has to sit on that page. Every assertion below is unchanged; only the page
// the board lives on moved.
const attract = (): GameState => ({
  ...initialState(1983),
  mode: 'attract',
  attract: { page: 'hiscore', pageAge: 0, crawl: [] },
})

// The authentic top + bottom seed rows — enough to exercise the title, the name
// display, and comma grouping without importing the (RED, not-yet-created) core
// module. Values are the BCD-decoded ROM ladder ends (OBI high, RLM low).
const BOARD: HighScoreTable<'wave'> = [
  { name: 'OBI', score: 1_285_353, wave: 4 },
  { name: 'RLM', score: 380_655, wave: 1 },
]

beforeEach(() => {
  font.calls.length = 0
})

describe("sw7-3 H-011 — the board title is PRINCESS LEIA'S REBEL FORCE, not HIGH SCORES", () => {
  it('draws the ROM RF2 title above the ladder', () => {
    render(makeCtx(), attract(), W, H, BOARD)
    expect(
      texts().some((t) => /^PRINCESS LEIA'?S REBEL FORCE$/.test(t)),
      `no board title matched PRINCESS LEIA['S] REBEL FORCE; saw: ${JSON.stringify(texts())}`,
    ).toBe(true)
  })

  it('no longer draws the generic HIGH SCORES header', () => {
    render(makeCtx(), attract(), W, H, BOARD)
    expect(texts()).not.toContain('HIGH SCORES')
  })

  it('does NOT draw a bare REBEL FORCE (the .NEXTMESS RF1 fabrication trap)', () => {
    // Guard, per the CRITICAL warning: bites if Dev reads RF1's comment as a
    // separate short string and draws a lone 'REBEL FORCE'. The full title
    // "PRINCESS LEIA'S REBEL FORCE" is a DIFFERENT array element, so this stays
    // green for the correct fix (toContain is exact-element, not substring).
    render(makeCtx(), attract(), W, H, BOARD)
    expect(texts(), 'a lone REBEL FORCE string is not in the ROM').not.toContain('REBEL FORCE')
  })
})

describe('sw7-3 H-020 — board scores are comma-grouped (VW8DIG), not the raw integer', () => {
  it('groups every board score with commas', () => {
    render(makeCtx(), attract(), W, H, BOARD)
    const all = texts().join('\n')
    expect(all, 'top score should read 1,285,353').toContain('1,285,353')
    expect(all, 'low score should read 380,655').toContain('380,655')
    // The seeded names must still show alongside the grouped scores.
    expect(all).toContain('OBI')
    expect(all).toContain('RLM')
  })

  it('does not draw the raw ungrouped integer (String(e.score).padStart)', () => {
    render(makeCtx(), attract(), W, H, BOARD)
    const all = texts().join('\n')
    expect(all).not.toContain('1285353')
    expect(all).not.toContain('380655')
  })
})

// sw8-20 — a row with no real run (the ten ROM defaults; also a row migrated
// across the ADR-0004 origin boundary) carries name + score only, so its `wave`
// is an honest `null`. The ROM's high-score DISPLAY (TCHSCR.MAC) draws initials +
// score and has NO wave column at all, so the faithful render for a null row is a
// truly BLANK column — no value AND no "WAVE" label.
//
// USER RULING (sw8-20, 2026-08-06): null rows show no WAVE. The three wrong
// answers this block must each redden by name:
//   1. `WAVE 0`     — the fabricated 0 (invents a fact about a player's game)
//   2. `WAVE null`  — String(null): a truthy non-empty string a vague "something
//                     was drawn" assertion would accept
//   3. `WAVE`       — the pre-sw8-20 dangling label: `${...} WAVE ${wave}` with
//                     wave='' leaves the bare word "WAVE" after trimEnd()
// The correct fix drops the "WAVE" label entirely when wave is null. Real rows
// (a finite wave) are unchanged and still render "WAVE N".
describe('sw8-20 — a null-wave row renders a truly blank column: no value AND no WAVE label', () => {
  const MIGRATED_BOARD: HighScoreTable<'wave'> = [{ name: 'JPX', score: 149_830, wave: null }]

  it('draws the string "null" nowhere for the null row\'s wave (String(null) trap)', () => {
    render(makeCtx(), attract(), W, H, MIGRATED_BOARD)
    const all = texts().join('\n')
    expect(all, `wave column drew the string "null"; saw: ${JSON.stringify(texts())}`).not.toMatch(
      /WAVE\s*NULL/,
    )
  })

  it('draws no "WAVE 0" for the null row (the fabricated-0 trap)', () => {
    render(makeCtx(), attract(), W, H, MIGRATED_BOARD)
    const all = texts().join('\n')
    expect(all, `wave column fabricated a 0; saw: ${JSON.stringify(texts())}`).not.toMatch(
      /WAVE\s*0/,
    )
  })

  it('draws no bare "WAVE" label at all when the only row is null (the dangling-label trap)', () => {
    // The board title is "PRINCESS LEIA'S REBEL FORCE" — no WAVE token — so on a
    // board whose only entry is null, ANY "WAVE" in the drawn text is the label
    // leaking through. This is the assertion that reddens the current source,
    // whose null row emits " 1  JPX  149,830  WAVE".
    render(makeCtx(), attract(), W, H, MIGRATED_BOARD)
    const all = texts().join('\n')
    expect(all, `a null row must show no WAVE label; saw: ${JSON.stringify(texts())}`).not.toMatch(
      /WAVE/,
    )
  })

  it("still draws the null row's name and score", () => {
    render(makeCtx(), attract(), W, H, MIGRATED_BOARD)
    const all = texts().join('\n')
    expect(all).toContain('JPX')
    expect(all).toContain('149,830')
  })

  it('an ordinary row on the same board still shows its real wave (only null rows change)', () => {
    const mixed: HighScoreTable<'wave'> = [...BOARD, ...MIGRATED_BOARD]
    render(makeCtx(), attract(), W, H, mixed)
    const all = texts().join('\n')
    expect(all).toContain('WAVE 4')
  })

  // Pin the EXACT row string the fixed code emits: rank " 1", two-space
  // separators, name, score — and NOTHING after it. toContain on the texts()
  // ARRAY is exact-element (not substring), so the old dangling-label output
  // " 1  JPX  149,830  WAVE" does NOT satisfy it — a distinct, longer element.
  // Any stand-in (a fabricated 0, '?', or the leftover label) fails it by name.
  it('draws the null row as the exact blank string " 1  JPX  149,830", nothing trailing', () => {
    render(makeCtx(), attract(), W, H, MIGRATED_BOARD)
    expect(
      texts(),
      `expected the exact row " 1  JPX  149,830" with no trailing wave column; saw: ${JSON.stringify(texts())}`,
    ).toContain(' 1  JPX  149,830')
  })
})
