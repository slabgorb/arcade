// tests/hud-jt11-2.test.ts
//
// Story jt11-2 — RED (O'Brien / TEA). The AUTHENTIC in-game HUD, replacing the
// jt4-5 dev bar (canvas fillText, self-described stand-in): score digits in the
// ROM's own score font, lives as stacked rider icons along the bottom row, all
// laid out by a new pure shell module `layoutHud` in src/shell/hudScreen.ts and
// painted through the existing paintText/blit paths in main.ts.
//
// ─── MEASURED CORRECTION TO THE STORY TITLE (the title is the spec, but its
// premise was measured first): the score font is FONT57, NOT FONT35. ──────────
// The mainline score display SCODSP (JOUSTRV4.SRC:7444-7487) draws each digit
// through BCDMSN/BCDLSN (JOUSTRV4.SRC:7492-7515) from `[FONT5]` with a $0307
// DMA window — "FONT SIZE IS 6X7 PIXELS" — and FONT5 is initialised from the
// MESSAGE ROM vector `FDB FONT57` (MESSAGE.SRC:37, "FOR BILL SO HE CAN USE THE
// NUMBERS"): digits L0-L9 (MESSAGE.SRC:347-443), 23-byte stride, 6x7 cells.
// FONT35's 4px digit cells cannot fill a $0307 window or the $0300 (6px) screen
// pitch of the digit column tables. font35's "used for scores" header prose
// describes the 3x5 BCD OUTPUT ROUTINES (BCD35/OUTB35), not the in-game HUD.
//
// ─── THE ROM GEOMETRY THIS FILE PINS (all measured, screen bytes are 2px) ────
//  • Digit columns (SCRPL1 JOUSTRV4.SRC:7417-7426, SCRPL2 :7430-7440): P1 units
//    at $36D9 → x=108, P2 units at $5DD9 → x=186; both rows at y=$D9=217; pitch
//    $0300 = 6px. Our 6-digit scoreBcd spans the 100,000s column ($27/$4E →
//    x 78/156) through units — the millions column exists in the ROM but a
//    3-byte BCD register never reaches it.
//  • Leading-zero blanking (the SCODSP walk): display from the most significant
//    NON-ZERO digit through units; a zero score shows the single units '0'
//    ("PUT UP SCORE ZERO" seeds only SCRINT, the units entry).
//  • Score colours (JOUSTRV4.SRC:52-54): PL1 EQU $5 ("YELLOW, FOR PLAYER 1"),
//    PL2 EQU $7 ("GREEN, FOR PLAYER 2") — COLOR1 palette indexes.
//  • Lives icons (INCLIV/DECLIV JOUSTRV4.SRC:5356-5420; P1DEC/P2DEC :5550-5554):
//    anchors DSCLOC $39D9 → P1 x=114 and $60D9 → P2 x=192, y=217; horizontal
//    stride 3 screen bytes = 6px; AT MOST 5 icons drawn (CMPA #5 / BHI skips
//    the DMA for the sixth man onward — lives beyond 5 exist but do not paint).
//  • The icon sprites: the ROM blits SCOPL1/SCOPL2 ("PLAYER n IMAGES LEFT",
//    JOUSTRV4.SRC:7521-7537) — 6x7 sitting players, NOT transcribed in
//    pictures.ts. The story prescribes the atlas-packed riders instead (PLY1R
//    for P1 — and its P2 twin PLY2R, so the green player is not handed yellow
//    icons); the SCOPL transcription is a filed follow-up, not this story.
//  • The authentic HUD carries NO wave number — the dev bar's WAVE line dies
//    with the dev bar.
//
// The seam is jt10-1/jt10-5's: layout returns DATA (glyph ops + icon blits), a
// node test pins fonts/geometry/derivation by identity, main.ts paints. main.ts
// wiring is pinned as comment-STRIPPED source text (the `?raw` idiom hardened:
// a grep satisfied by comment prose proves nothing, so comments are stripped
// and the stripper itself is controlled both ways).

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FONT57 } from '../src/core/font57.js'
import { FONT35 } from '../src/core/font35.js'
import { createGame, overlayReadout, type GameState } from '../src/core/game.js'
import { buildGameAtlas } from '../src/shell/render.js'
import type { LaidOutText } from '../src/shell/fontRender.js'
import { frameLoopBody } from './helpers/frame-loop.js'

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')
const mainPath = join(srcDir, 'main.ts')

interface Rgba {
  r: number
  g: number
  b: number
  a: number
}

/** One lives-icon blit op: an atlas block name at a whole-pixel destination. */
interface HudIcon {
  readonly name: string
  readonly x: number
  readonly y: number
}

interface HudPlayerLayout {
  readonly score: LaidOutText
  readonly scoreX: number
  readonly scoreY: number
  readonly lives: readonly HudIcon[]
}

interface HudLayout {
  readonly players: readonly HudPlayerLayout[]
}

interface HudReadoutPlayer {
  player: number
  score: number
  scoreBcd: readonly number[]
  lives: number
}

interface HudReadout {
  wave: number
  players: HudReadoutPlayer[]
}

type LayoutHud = (readout: HudReadout, palette: readonly Rgba[]) => HudLayout

/** Load the not-yet-built HUD layout module with a self-describing failure (the
 *  loadSelectScreen pattern; the specifier is assembled so the bundler cannot
 *  resolve it statically and redden the whole FILE at collection). */
async function loadHudScreen(): Promise<{ layoutHud: LayoutHud }> {
  const specifier = ['..', '..', 'src', 'shell', 'hudScreen.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as { layoutHud?: LayoutHud }
    if (typeof mod.layoutHud !== 'function') throw new Error('no `layoutHud` export')
    return mod as { layoutHud: LayoutHud }
  } catch (e) {
    throw new Error(
      'HUD layout not built yet — GREEN (Julia) creates plugins/joust/src/shell/hudScreen.ts exporting ' +
        'layoutHud(readout, palette): { players: [{ score, scoreX, scoreY, lives }] } — per player, the ' +
        'scoreBcd digits leading-zero-blanked and laid out in FONT57 via fontRender.layoutText in ' +
        'palette[5] (P1) / palette[7] (P2), scoreX/scoreY placing the units digit at the fixed ROM ' +
        'units column (P1 x=108, P2 x=186, y=217), and lives as up to FIVE {name, x, y} icon blit ops ' +
        "('PLY1R' for P1, 'PLY2R' for P2) at 6px stride from the ROM anchors (P1 x=114, P2 x=192, " +
        `y=217). (${(e as Error).message})`,
    )
  }
}

/** A 16-entry synthetic palette of DISTINCT objects, so colour threading is
 *  provable by IDENTITY — a layout that hard-codes an rgb or grabs the wrong
 *  index cannot return the exact palette entry object. */
function palette16(): Rgba[] {
  return Array.from({ length: 16 }, (_, i) => ({ r: i * 16, g: 255 - i * 16, b: i, a: 255 }))
}

function readout(p1: Partial<HudReadoutPlayer>, p2?: Partial<HudReadoutPlayer>): HudReadout {
  const line = (player: number, over: Partial<HudReadoutPlayer>): HudReadoutPlayer => ({
    player,
    score: 0,
    scoreBcd: [0, 0, 0],
    lives: 5,
    ...over,
  })
  const players = [line(1, p1)]
  if (p2) players.push(line(2, p2))
  return { wave: 1, players }
}

/** The expected FONT57 glyph sequence for a digit string, by identity. */
function glyphsOf(text: string) {
  return [...text].map((ch) => FONT57.glyphFor(ch))
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — the score digits are FONT57 (the measured ROM score font), derived from
// the BCD register with the SCODSP leading-zero blanking.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 layoutHud — score digits: FONT57, BCD-derived, leading-zero blanked', () => {
  it('a zero score is the single units digit — FONT57 slashed-zero, by glyph identity', async () => {
    const { layoutHud } = await loadHudScreen()
    const [p1] = layoutHud(readout({ scoreBcd: [0, 0, 0] }), palette16()).players
    expect(p1.score.ops.length, "zero score displays exactly '0' (SCRINT seeds only the units entry)").toBe(1)
    expect(p1.score.ops[0].glyph, "the glyph is FONT57's '0' (L0, the slashed zero) — not FONT35's").toBe(
      FONT57.glyphFor('0'),
    )
    expect(p1.score.height, 'FONT57 cell height (7) — FONT35 (5) would prove the wrong font').toBe(
      FONT57.cellHeight,
    )
  })

  it('blanking walks to the most significant NON-ZERO digit: 50 → "50", 250 → "250"', async () => {
    const { layoutHud } = await loadHudScreen()
    const fifty = layoutHud(readout({ scoreBcd: [0x00, 0x00, 0x50] }), palette16()).players[0]
    expect(fifty.score.ops.map((o) => o.glyph), 'BCD 000050 blanks to two digits "50"').toEqual(glyphsOf('50'))
    const twoFifty = layoutHud(readout({ scoreBcd: [0x00, 0x02, 0x50] }), palette16()).players[0]
    expect(twoFifty.score.ops.map((o) => o.glyph), 'BCD 000250 blanks to "250"').toEqual(glyphsOf('250'))
  })

  it('a full six-digit score shows all six digits at the FONT57 6px pitch', async () => {
    const { layoutHud } = await loadHudScreen()
    const [p1] = layoutHud(readout({ scoreBcd: [0x99, 0x99, 0x50] }), palette16()).players
    expect(p1.score.ops.map((o) => o.glyph), 'BCD 999950 → six digits').toEqual(glyphsOf('999950'))
    expect(
      p1.score.ops.map((o) => o.x),
      'digits advance by the FONT57 cell (6px = the ROM $0300 column pitch; FONT35 would advance 4)',
    ).toEqual([0, 6, 12, 18, 24, 30])
  })

  it('digits derive from the BCD REGISTER, not the numeric score (synthetic divergence)', async () => {
    // A layout that formats `score` instead of decoding `scoreBcd` produces the
    // right pixels on every real GameState (the core keeps them in sync), so only
    // a DIVERGENT synthetic input can tell derivation from transcription. The
    // display source of truth in the ROM is the DSCORE BCD area itself.
    const { layoutHud } = await loadHudScreen()
    const [p1] = layoutHud(readout({ score: 123_450, scoreBcd: [0x99, 0x99, 0x00] }), palette16()).players
    expect(
      p1.score.ops.map((o) => o.glyph),
      'BCD 999900 wins over score=123450 — the digits read the register',
    ).toEqual(glyphsOf('999900'))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — geometry: units column fixed, text grows leftward; per-player colours.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-2 layoutHud — the ROM columns: units-anchored digits, PL1/PL2 colours', () => {
  it('P1 digits end at the units column x=108, y=217, however many digits show', async () => {
    const { layoutHud } = await loadHudScreen()
    const pal = palette16()
    const zero = layoutHud(readout({ scoreBcd: [0, 0, 0] }), pal).players[0]
    const lastZero = zero.score.ops[zero.score.ops.length - 1]
    expect(zero.scoreX + lastZero.x, "the lone '0' sits AT the units column ($36D9 → x=108)").toBe(108)
    expect(zero.scoreY, 'the score row is the ROM bottom row ($D9 → y=217)').toBe(217)
    const full = layoutHud(readout({ scoreBcd: [0x99, 0x99, 0x50] }), pal).players[0]
    const lastFull = full.score.ops[full.score.ops.length - 1]
    expect(full.scoreX + lastFull.x, 'six digits still END at x=108 — the text grew leftward').toBe(108)
    expect(full.scoreX, 'so six digits START at the 100,000s column ($27D9 → x=78)').toBe(78)
  })

  it('P2 digits end at the units column x=186 on the same row', async () => {
    const { layoutHud } = await loadHudScreen()
    const [, p2] = layoutHud(readout({}, { scoreBcd: [0x99, 0x99, 0x50] }), palette16()).players
    const last = p2.score.ops[p2.score.ops.length - 1]
    expect(p2.scoreX + last.x, 'P2 units column ($5DD9 → x=186)').toBe(186)
    expect(p2.scoreX, 'six P2 digits start at $4ED9 → x=156').toBe(156)
    expect(p2.scoreY, 'same bottom row').toBe(217)
  })

  it('score colours are the players` OWN palette entries — P1 palette[5], P2 palette[7], by identity', async () => {
    const { layoutHud } = await loadHudScreen()
    const pal = palette16()
    const { players } = layoutHud(readout({}, {}), pal)
    expect(players[0].score.colour, 'P1 score colour is COLOR1 index 5 (PL1 EQU $5)').toBe(pal[5])
    expect(players[1].score.colour, 'P2 score colour is COLOR1 index 7 (PL2 EQU $7)').toBe(pal[7])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — lives: rider icons from the atlas, ROM anchors, 6px stride, capped at 5.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-3 layoutHud — lives as rider icons along the bottom row', () => {
  it('P1: three lives are three PLY1R blits at x 114/120/126, y 217', async () => {
    const { layoutHud } = await loadHudScreen()
    const [p1] = layoutHud(readout({ lives: 3 }), palette16()).players
    expect(p1.lives, 'anchor $39D9 → x=114, stride 3 screen bytes = 6px').toEqual([
      { name: 'PLY1R', x: 114, y: 217 },
      { name: 'PLY1R', x: 120, y: 217 },
      { name: 'PLY1R', x: 126, y: 217 },
    ])
  })

  it("P2: two lives are two PLY2R blits from the $60D9 anchor — the GREEN rider, not P1's yellow", async () => {
    const { layoutHud } = await loadHudScreen()
    const [, p2] = layoutHud(readout({}, { lives: 2 }), palette16()).players
    expect(p2.lives).toEqual([
      { name: 'PLY2R', x: 192, y: 217 },
      { name: 'PLY2R', x: 198, y: 217 },
    ])
  })

  it('at most FIVE icons paint (INCLIV CMPA #5) — eight lives still show five; zero shows none', async () => {
    const { layoutHud } = await loadHudScreen()
    const eight = layoutHud(readout({ lives: 8 }), palette16()).players[0]
    expect(eight.lives.length, 'the sixth man onward exists but does not paint').toBe(5)
    expect(eight.lives[4], 'the fifth icon lands at x=114+4*6').toEqual({ name: 'PLY1R', x: 138, y: 217 })
    // The exact boundary, independent of the far-above-cap case (round-2 [TEST]
    // finding): five lives is five icons — not four (an off-by-one under the
    // cap) and not gated away by a > vs >= slip at the bound.
    const five = layoutHud(readout({ lives: 5 }), palette16()).players[0]
    expect(five.lives.length, 'lives=5 paints exactly 5 icons').toBe(5)
    const none = layoutHud(readout({ lives: 0 }), palette16()).players[0]
    expect(none.lives, 'no lives, no icons').toEqual([])
  })

  it('the atlas actually packs BOTH rider blocks the layout names, at the transcribed 14x7', () => {
    // A layout op naming a block the atlas lacks blits NOTHING (blit returns on a
    // missing slot) — wire the names to the packed atlas so that failure mode is
    // impossible to ship silently. MEASURED: the ROM header $0707 is 7 BYTES wide
    // (JOUSTI.SRC:2054) and each byte is two nibble pixels, so the rider decodes
    // to 14x7 — WIDER than its 6px stride, so consecutive icons deliberately
    // overlap into a fanned stack. The ROM's own 6px-wide SCOPL lives icon
    // (JOUSTRV4.SRC:7521-7537) is untranscribed; swapping it in is the filed
    // follow-up, not this story.
    const atlas = buildGameAtlas()
    for (const name of ['PLY1R', 'PLY2R'] as const) {
      const slot = atlas.blocks[name]
      expect(slot, `atlas block ${name} exists`).toBeTruthy()
      expect({ w: slot.width, h: slot.height }, `${name} is the transcribed 14x7 rider`).toEqual({ w: 14, h: 7 })
    }
  })

  it('a 1P game lays out exactly one player block, and layoutHud never mutates its input', async () => {
    const { layoutHud } = await loadHudScreen()
    const solo = readout({ scoreBcd: [0x00, 0x02, 0x50], lives: 4 })
    const before = JSON.stringify(solo)
    const laid = layoutHud(solo, palette16())
    expect(laid.players.length, 'one readout line → one HUD block').toBe(1)
    expect(JSON.stringify(solo), 'pure — the readout is untouched').toBe(before)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4 — the selector: overlayReadout carries scoreBcd through to the shell.
// (The story's blessed core touch — a SELECTOR extension, not a sim change. The
// jt4-5 output pins in game-jt4-5.test.ts are extended alongside this file.)
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-4 overlayReadout — each player line carries its BCD register', () => {
  it('players[i].scoreBcd IS the ledger register (identity — a projection, not a copy)', () => {
    const state: GameState = createGame(0x1234)
    const r = overlayReadout(state)
    expect(r.players[0].scoreBcd, 'P1 line hands the shell the very DSCORE bytes').toBe(state.players[0].scoreBcd)
    expect(r.players[1].scoreBcd, 'P2 line likewise').toBe(state.players[1].scoreBcd)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-5 — main.ts wiring: the dev bar is GONE, the HUD is painted per frame, over
// the sim. Comment-STRIPPED source, controlled both ways.
// ─────────────────────────────────────────────────────────────────────────────
function readMain(): string {
  if (!existsSync(mainPath)) throw new Error('src/main.ts is missing — the shell entry')
  return readFileSync(mainPath, 'utf8')
}

/** Strip // line comments and block comments, so prose cannot satisfy (or
 *  false-fail) a wiring assertion. Coarse but sufficient for this file: main.ts
 *  holds no string literal containing a comment opener. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

// A single import statement's specifier + brace-list (the select-wiring helper),
// so an assertion can check a symbol is imported FROM a module, not merely named.
function importsFrom(src: string, moduleMatch: RegExp, symbol: string): boolean {
  const importRe = /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+['"]([^'"]+)['"]/g
  for (const m of src.matchAll(importRe)) {
    const [, names, spec] = m
    if (moduleMatch.test(spec) && names.split(',').some((n) => n.trim().replace(/\s+as\s+.*/, '') === symbol)) {
      return true
    }
  }
  return false
}

describe('AC-5 main.ts — the dev bar is replaced by the authentic HUD', () => {
  it('control: the comment stripper strips prose and keeps code', () => {
    const src = readMain()
    const stripped = stripComments(src)
    // GOVWAT is cited only in comments; paintText( is code. If either side of
    // this control fails, every absence assertion below is vacuous — fix the
    // stripper before reading the rest of the wall.
    expect(src, 'precondition: the GOVWAT cite is present in raw source').toContain('GOVWAT')
    expect(stripped, 'stripped source loses comment prose').not.toContain('GOVWAT')
    expect(stripped, 'stripped source keeps code tokens').toContain('paintText(')
  })

  it('the fillText dev bar is GONE: no canvas text API, no 8px monospace, no drawOverlay', () => {
    const stripped = stripComments(readMain())
    expect(stripped, 'no fillText — the HUD is glyph ops + blits, never canvas text').not.toMatch(/\bfillText\b/)
    expect(stripped, 'the dev-bar font literal dies with it').not.toContain('8px monospace')
    expect(stripped, 'the drawOverlay stand-in is REPLACED, not left beside the HUD').not.toMatch(
      /\bdrawOverlay\b/,
    )
  })

  it('the WAVE line dies with the dev bar — the authentic HUD shows no wave number', () => {
    const stripped = stripComments(readMain())
    expect(stripped, 'no WAVE text template in the shell').not.toMatch(/WAVE\s*\$\{/)
  })

  it('main.ts imports layoutHud from shell/hudScreen and calls it', () => {
    const src = readMain()
    expect(importsFrom(src, /shell\/hudScreen(\.js)?$/, 'layoutHud'), 'layoutHud imported from hudScreen').toBe(
      true,
    )
    expect(stripComments(src), 'and actually called').toMatch(/\blayoutHud\s*\(/)
  })

  it('the frame loop paints the HUD each playing frame, AFTER the sim (digits sit over the island)', () => {
    // The HUD row (y=217, 7px tall) overlaps the island rows (y 211-243), so the
    // paint ORDER is load-bearing exactly as jt11-1's prompt paint is: sim first,
    // HUD over it. Anchoring on the `frame` declaration and slicing FROM it
    // excludes every helper DEFINITION above (the jt4-5 vacuity lesson) — only a
    // real per-frame call satisfies this. The overlayReadout-per-frame pin lives
    // in render-jt4-5 and stays in force: keep an overlayReadout( call inside the
    // frame fn (e.g. drawHud(overlayReadout(...))) or that suite reddens.
    // jt11-10 (b): bound to the frame fn's closing brace via the AST (helpers/frame-loop),
    // then strip comments from THAT body — not a slice to EOF. A paint call outside the
    // loop can no longer satisfy this even if a decl is added after `frame` in main.ts.
    const loopBody = stripComments(frameLoopBody(readMain()))
    const hudCall = loopBody.search(/\b(?:drawHud|layoutHud)\s*\(/)
    expect(hudCall, 'the loop reaches the HUD painter (drawHud(...) or layoutHud(...)) per frame').toBeGreaterThan(
      -1,
    )
    const simCall = loopBody.indexOf('paintSim(')
    expect(simCall, 'the playing branch paints the sim').toBeGreaterThan(-1)
    expect(simCall, 'sim first, HUD over it — the order keeps the digits legible').toBeLessThan(hudCall)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Guard — the two fonts stay distinguishable: if FONT35 ever grew 6px digit
// cells (or FONT57 shrank), the font-identity pins above would go blind.
// ─────────────────────────────────────────────────────────────────────────────
describe('resolution control — the font-identity pins can actually tell the fonts apart', () => {
  it('FONT57 and FONT35 differ in cell size and digit-glyph identity', () => {
    expect(FONT57.cellHeight, 'FONT57 cell is 7 rows').toBe(7)
    expect(FONT35.cellHeight, 'FONT35 cell is 5 rows').toBe(5)
    expect(FONT57.cellWidth, 'FONT57 pitch 6px (the ROM $0300 column stride)').toBe(6)
    expect(FONT35.cellWidth, 'FONT35 pitch 4px').toBe(4)
    expect(FONT57.glyphFor('0'), 'the two zero glyphs are distinct objects').not.toBe(FONT35.glyphFor('0'))
  })
})
