// tests/render.test.ts
//
// Story cp1-6 — RED phase (O'Brien / TEA). AC-2/AC-3/AC-4: the Canvas 2D renderer.
// src/shell/render.ts is the cp1-1 skeleton (black fillRect only) — every
// assertion here is RED.
//
// The atlas is INJECTED into render(ctx, atlas, state) so the draw logic is
// testable in node with a recording ctx + a fake atlas (the canvas that BUILDS the
// atlas lives in atlas.ts, source-read there). We pin:
//   • imageSmoothingEnabled = false (AC-2 crisp pixels)
//   • the screen-clear colour is the CLRCH background pen, not an invented '#000'
//   • mushrooms + the gun are blitted from the atlas (drawImage)
//   • mushroomStamp maps every damage code to the right cp1-3 STAMP (AC-1)
//   • render imports NO @shared/font and contains NO colour literal — every
//     colour comes from the palette module (AC-3 "no invented colours")

import { describe, it, expect } from 'vitest'
import { render, mushroomStamp } from '../src/shell/render'
import type { Atlas } from '../src/shell/atlas'
import { rgbCss, PLAYFIELD_PENS } from '../src/shell/palette'
import { LOGICAL_W, LOGICAL_H, cellScreenX, cellScreenY } from '../src/shell/layout'
import { createSim, DEATH_DELAY, PLAYER_EXPLODE_START, type SimState } from '../src/core/sim'
import { STAMPS } from '../src/core/pictures'
import { isMushroom, PLYFLD_STRIDE, PLYFLD_HEIGHT, MUSHROOM_FULL } from '../src/core/playfield'
import renderSrc from '../src/shell/render.ts?raw'

// ── recording fakes ──────────────────────────────────────────────────────────
interface FillCall {
  style: string
  args: number[]
}
function makeCtx() {
  const fills: FillCall[] = []
  let drawImageCount = 0
  const ctx = {
    imageSmoothingEnabled: true,
    fillStyle: '' as string,
    fillRect(...args: number[]) {
      fills.push({ style: String(this.fillStyle), args })
    },
    drawImage() {
      drawImageCount++
    },
    clearRect() {},
    save() {},
    restore() {},
  }
  return {
    ctx: ctx as unknown as CanvasRenderingContext2D,
    fills,
    drawImageCount: () => drawImageCount,
    smoothing: () => ctx.imageSmoothingEnabled,
  }
}
function makeAtlas() {
  const requested: string[] = []
  return {
    atlas: {
      image: {} as CanvasImageSource,
      rect(name: string) {
        requested.push(name)
        return { sx: 0, sy: 0, sw: 8, sh: 8 }
      },
    },
    requested,
  }
}

// Strip line and block comments so a colour word in prose can't fool the scan.
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

describe('cp1-6 render — mushroomStamp maps damage codes to cp1-3 STAMPS', () => {
  const known = new Set(STAMPS.map((s) => s.name))
  const cases: ReadonlyArray<[number, string]> = [
    [0x3f, 'MUSHROOM_FULL'],
    [0x3e, 'MUSHROOM_3_4'],
    [0x3d, 'MUSHROOM_1_2'],
    [0x3c, 'MUSHROOM_1_4'],
    [0x3b, 'POISON_MUSHROOM_FULL'],
    [0x3a, 'POISON_MUSHROOM_3_4'],
    [0x39, 'POISON_MUSHROOM_1_2'],
    [0x38, 'POISON_MUSHROOM_1_4'],
  ]
  it.each(cases)('cell 0x%s → %s', (cell, name) => {
    expect(mushroomStamp(cell)).toBe(name)
    expect(known.has(mushroomStamp(cell)), 'stamp exists in cp1-3 STAMPS').toBe(true)
  })
})

describe('cp1-6 render — draw behaviour (recording ctx + injected atlas)', () => {
  it('disables image smoothing (AC-2 crisp pixels)', () => {
    const c = makeCtx()
    const a = makeAtlas()
    render(c.ctx, a.atlas, createSim(1))
    expect(c.smoothing()).toBe(false)
  })

  it('clears the screen with the CLRCH background pen, not an invented #000', () => {
    const c = makeCtx()
    const a = makeAtlas()
    render(c.ctx, a.atlas, createSim(1))
    const bg = c.fills.find((f) => f.args[2] >= LOGICAL_W && f.args[3] >= LOGICAL_H)
    expect(bg, 'a full-screen background fillRect must happen').toBeTruthy()
    expect(bg!.style).toBe(rgbCss(PLAYFIELD_PENS[0]))
  })

  it('blits the gun and every mushroom from the atlas', () => {
    const c = makeCtx()
    const a = makeAtlas()
    const state = createSim(1)
    const mushrooms = Array.from(state.playfield.cells).filter(isMushroom).length
    expect(mushrooms, 'the seeded field has mushrooms to draw').toBeGreaterThan(0)
    render(c.ctx, a.atlas, state)
    expect(c.drawImageCount(), 'one drawImage per mushroom + the gun').toBeGreaterThanOrEqual(mushrooms + 1)
    expect(a.requested, 'the gun sprite is requested from the atlas').toContain('GUN')
  })

  it('requests the correct mushroom stamp for a planted damage state', () => {
    const c = makeCtx()
    const a = makeAtlas()
    const state = createSim(1)
    state.playfield.cells.fill(0)
    state.playfield.cells[5 * PLYFLD_STRIDE + 20] = MUSHROOM_FULL
    render(c.ctx, a.atlas, state)
    expect(a.requested).toContain('MUSHROOM_FULL')
  })
})

describe('cp1-6 render — no shared /font, no invented colours (AC-3)', () => {
  it('does NOT import @shared/font (score/level use ROM tiles — epic ruling)', () => {
    expect(renderSrc).not.toMatch(/@shared\/font/)
  })

  it('draws text via the ROM tile layout, not a font module', () => {
    // The renderer composes glyphs from layoutText (CHAR_/DIGIT_ tiles).
    expect(renderSrc).toMatch(/layoutText/)
  })

  it('sources every colour from the palette module — no colour literals in render code', () => {
    const code = stripComments(renderSrc)
    expect(code, 'no hex colour literals').not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(code, 'no rgb()/rgba()/hsl() literals').not.toMatch(/\b(?:rgba?|hsla?)\s*\(/)
    // cp2-1 R3 hardening: a CSS colour keyword (e.g. strokeStyle = 'gold') and a
    // hand-built {r,g,b} both slipped past the old scan. Deny them too.
    expect(code, 'no CSS colour keyword').not.toMatch(
      /['"](?:red|green|blue|gold|lime|cyan|magenta|yellow|white|black|orange|purple|pink|gray|grey|silver|maroon|navy|teal|olive|aqua|fuchsia)['"]/i,
    )
    expect(code, 'no inline {r,g,b} colour literal').not.toMatch(/\{\s*r\s*:\s*\d+\s*,\s*g\s*:\s*\d+\s*,\s*b\s*:\s*\d+/)
    expect(renderSrc, 'colours come from the palette module').toMatch(/palette/)
  })
})

// cp2-11 — RED phase (O'Brien / TEA). AC-1: USER-REPORTED — the clone draws a
// 'LEVEL 1' HUD label (render.ts:100), but the real cabinet draws NO level
// indicator in ANY state. The rev-4 display set is the MESG message table
// (CENIR4.MAC:16, strings MESS0..MES10 at :67-110) + the '1980 ATARI' copyright
// (CENTI4.MAC:12); a full-tree grep proves no LEVEL/WAVE/ROUND/STAGE string or
// digit-writer exists — those words occur only in comments. Cited:
// docs/rom-study/claims/08-render-color.json CL-12. These pins go RED until Dev
// deletes the drawText(..., 'LEVEL 1', ...) call.
describe('cp2-11 render — the cabinet draws NO level indicator (any state)', () => {
  // Reconstruct the HUD text actually blitted from the atlas request log:
  // a CHAR_x stamp is the glyph x, a DIGIT_n stamp is the digit n, and every
  // sprite/mushroom stamp (GUN, SHOT, HEAD*, MUSHROOM*) is skipped. layoutText
  // drops spaces, so 'SCORE 0' reconstructs as 'SCORE0' — searching for the
  // spaceless run 'LEVEL' cannot be fooled by the score label.
  function drawnHudText(requested: readonly string[]): string {
    return requested
      .map((s) => {
        const ch = /^CHAR_(.)$/.exec(s)
        const dg = /^DIGIT_(.)$/.exec(s)
        return ch ? ch[1] : dg ? dg[1] : ''
      })
      .join('')
  }

  // render() consumes no phase/gameOver field for the HUD, so these constructed
  // states all exercise the same unconditional text path — the point is to pin
  // AC-1's "attract, play, death, game-over" explicitly.
  const states: ReadonlyArray<[string, SimState]> = [
    ['attract / fresh play', createSim(1)],
    ['mid-play, high score', { ...createSim(2), score: 123456 }],
    ['player death', { ...createSim(3), delay: DEATH_DELAY, playerExplode: PLAYER_EXPLODE_START }],
    ['game over', { ...createSim(4), gameOver: true, lives: 0 }],
  ]

  it.each(states)('emits no LEVEL text in state: %s', (_label, state) => {
    const c = makeCtx()
    const a = makeAtlas()
    render(c.ctx, a.atlas, state)
    const text = drawnHudText(a.requested)
    // cp2-12 re-pin: this guard used to assert the literal 'SCORE' word draws,
    // to keep the LEVEL-absence pin below from passing on an empty string. But
    // cp2-12 removes that UNCITED label — UPSCRE draws raw digits, no 'SCORE'
    // text (CL-13; the rev-4 HUD has no in-play text label, CL-12). So the
    // anti-vacuous guard now pins the SCORE DIGITS instead: every digit of the
    // score must render. Order-agnostic (a per-digit toContain, not a substring)
    // so it survives whatever glyph order Dev emits. Same purpose, still green
    // before and after the label drop; the LEVEL-absence assertion is untouched.
    for (const digit of String(state.score)) {
      expect(text, 'the score digits still draw — guards the LEVEL-absence pin against a vacuous pass').toContain(digit)
    }
    expect(text, 'no LEVEL label is ever blitted (AC-1)').not.toContain('LEVEL')
  })

  it('render source carries no LEVEL HUD label — no drawText of a level string', () => {
    const code = stripComments(renderSrc)
    expect(code, "no 'LEVEL' glyph run in the render source").not.toMatch(/LEVEL/i)
    expect(code, 'no drawText(...) call carries a LEVEL label').not.toMatch(/drawText\([^)]*LEVEL/i)
    // The rev-4 display set (CL-12) has no level/wave/round/stage text at all.
    expect(code, 'no LEVEL/WAVE/ROUND/STAGE HUD label — display set is MESG + copyright').not.toMatch(
      /\b(?:LEVEL|WAVE|ROUND|STAGE)\b/i,
    )
  })
})

// cp2-12 — RED phase (O'Brien / TEA). USER-REPORTED (live play + a reference
// screenshot of the real cabinet): the HUD belongs on the ROM's single top row
// v=0x1F, ABOVE the playable field — NOT drawn inside it. The rev-4 layout,
// upright (all CK* mirror vars zeroed, CENTI4.MAC:742-751):
//   • P1 score  — six raw BCD digits at 0x041F, columns h0-5  (UPSCRE, CL-13)
//   • P1 lives  — ship/gun ICONS at 0x04DF, columns h6-11     (DLIVES, CL-15)
//   • high score — six raw BCD digits at 0x059F, columns h12-17 (CL-14)
// Each field is six consecutive columns because CHAR advances +0x20 (one
// column) per glyph (CL-16). v = addr & 0x1F = 0x1F for all three, which maps
// to screen row cellScreenY(PLYFLD_HEIGHT-1) === 0 (the top row; layout.test).
// The 'SCORE' text prefix the clone drew is UNCITED — UPSCRE emits bare digits,
// and the rev-4 in-play HUD has no text label at all (CL-12/CL-13) — so it goes.
//
// Contract pinned here for Dev:
//   1. render() gains a 4th parameter: the HIGH SCORE. It is a SHELL-domain,
//      persisted value (@shared/highscore), threaded in by the shell
//      entry — NOT a new field on the pure SimState. The current 3-arg render
//      ignores the 4th arg (JS), so every high-score pin below is RED until Dev
//      adds the parameter. The cast keeps tsc green in RED (the 3-arg signature
//      cannot yet name the 4th arg). Make it OPTIONAL (default) so the existing
//      3-arg call sites (cp1-6/cp2-11 tests) keep compiling.
//   2. Lives render as N gun icons (the existing GUN stamp), one per remaining
//      life, capped at 6 columns — never digits (DLIVES draws ship pictures).
//   3. Every HUD element is placed via cellScreenX(h) for its ROM h-range, so
//      it stays consistent with the field's proven orientation and lands on the
//      v=0x1F row. The exact left/right screen edge + digit reading order is
//      Dev's to confirm against the AC-3 screenshot; these pins are order- and
//      edge-agnostic (band membership + sorted multisets), so a correct layout
//      passes however Dev resolves the reversal.
//
// cp2-14 UPDATE — that last sentence was the bug. "Passes however Dev resolves
// the reversal" is exactly what let the horizontal MIRROR through: the bands are
// derived from cellScreenX (so they move WITH the mirror) and the digits are
// compared as SORTED MULTISETS (so reading order is discarded). The cp2-12
// Reviewer filed this as a LOW finding and cp2-14 acts on it. These pins are
// kept as-is — they still correctly pin band MEMBERSHIP, which is their job —
// and the missing absolute left/right + reading-order pins now live in
// tests/orientation-flip.test.ts. Do not treat this block as an orientation
// fence; it is not one, by construction.
describe('cp2-12 render — the HUD sits on the ROM v=0x1F top row (UPSCRE / DLIVES / high score)', () => {
  // v=0x1F -> the top screen row; derived, never hardcoded 0.
  const HUD_ROW_Y = cellScreenY(PLYFLD_HEIGHT - 1)

  // The high-score contract (item 1 above). Cast so this RED phase typechecks
  // against the current 3-arg render; renderHud === render at runtime.
  type RenderWithHigh = (ctx: CanvasRenderingContext2D, atlas: Atlas, state: SimState, highScore: number) => void
  const renderHud = render as unknown as RenderWithHigh

  // A name+position recording harness (the cp2-11 request-log only kept names).
  // blit() calls atlas.rect(name) immediately before ctx.drawImage(...,x,y,...),
  // so the pending name pairs with the very next drawImage.
  interface HudBlit {
    name: string
    x: number
    y: number
  }
  function makeHudRecorder() {
    const blits: HudBlit[] = []
    let pending: string | null = null
    const atlas = {
      image: {} as CanvasImageSource,
      rect(name: string) {
        pending = name
        return { sx: 0, sy: 0, sw: 8, sh: 8 }
      },
    }
    const ctx = {
      imageSmoothingEnabled: true,
      fillStyle: '' as string,
      fillRect() {},
      drawImage(_img: unknown, _sx: number, _sy: number, _sw: number, _sh: number, x: number, y: number) {
        blits.push({ name: pending ?? '<none>', x, y })
        pending = null
      },
      clearRect() {},
      save() {},
      restore() {},
    }
    return { ctx: ctx as unknown as CanvasRenderingContext2D, atlas: atlas as unknown as Atlas, blits }
  }

  // Screen-x band spanned by ROM columns [hLo..hHi] via the renderer's own
  // cellScreenX (which reverses columns — see layout.ts). Bands are disjoint:
  // score [h0-5] and lives [h6-11] and high score [h12-17] never overlap.
  const bandX = (hLo: number, hHi: number) => {
    const a = cellScreenX(hLo)
    const b = cellScreenX(hHi)
    return { min: Math.min(a, b), max: Math.max(a, b) }
  }
  const SCORE_BAND = bandX(0, 5)
  const LIVES_BAND = bandX(6, 11)
  const HIGH_BAND = bandX(12, 17)
  const inBand = (x: number, band: { min: number; max: number }) => x >= band.min && x <= band.max
  const digitOf = (name: string): string | null => /^DIGIT_(\d)$/.exec(name)?.[1] ?? null
  const digitsInBand = (blits: readonly HudBlit[], band: { min: number; max: number }): string =>
    blits
      .filter((b) => b.y === HUD_ROW_Y && inBand(b.x, band) && digitOf(b.name) !== null)
      .map((b) => digitOf(b.name)!)
      .sort()
      .join('')

  // ── AC-1: the P1 score is six raw digits at h0-5 on the v=0x1F row ──────────
  it('draws the six P1-score digits at columns h0-5 on the v=0x1F row (UPSCRE 0x041F, CL-13)', () => {
    const r = makeHudRecorder()
    renderHud(r.ctx, r.atlas, { ...createSim(2), score: 123456 }, 987654)
    // sorted multiset — order-/edge-agnostic; a 6-digit score is exactly 6 glyphs.
    expect(digitsInBand(r.blits, SCORE_BAND), 'score 123456 renders as six digits in the h0-5 band').toBe('123456')
  })

  // ── AC-1: the high score is six raw digits at h12-17 on the v=0x1F row ──────
  it('draws the six high-score digits at columns h12-17 on the v=0x1F row (0x059F, CL-14)', () => {
    const r = makeHudRecorder()
    renderHud(r.ctx, r.atlas, { ...createSim(2), score: 123456 }, 987654)
    expect(digitsInBand(r.blits, HIGH_BAND), 'high score 987654 renders as six digits in the h12-17 band').toBe(
      '456789',
    )
  })

  // ── AC-1: NO text label — UPSCRE is raw digits; the rev-4 HUD has no 'SCORE'
  // word (CL-12/CL-13). Every HUD-row glyph is a DIGIT_ or a GUN icon; there is
  // no CHAR_ (letter) glyph on the row. RED: the clone still prefixes 'SCORE'.
  it('draws NO alphabetic label on the v=0x1F HUD row (raw digits, no SCORE text)', () => {
    const r = makeHudRecorder()
    renderHud(r.ctx, r.atlas, { ...createSim(2), score: 123456 }, 987654)
    const letters = r.blits.filter((b) => b.y === HUD_ROW_Y && /^CHAR_/.test(b.name)).map((b) => b.name)
    expect(letters, 'no CHAR_ letter glyph on the HUD row — UPSCRE draws bare digits').toEqual([])
  })

  // ── AC-2: lives render as gun ICONS (never digits), count follows the life
  // count, capped at 6 columns (DLIVES TEMP1=6). ──────────────────────────────
  const liveCounts: ReadonlyArray<number> = [0, 1, 2, 3, 5, 6]
  it.each(liveCounts)(
    'draws one HUD gun icon per life at columns h6-11 for lives=%i (DLIVES 0x04DF, cap 6, CL-15)',
    (lives) => {
      const r = makeHudRecorder()
      renderHud(r.ctx, r.atlas, { ...createSim(2), lives }, 987654)
      // Only lives icons blit GUN on the HUD row; the player's own gun draws in
      // the field (never the reserved top row), so the y-filter isolates lives.
      const icons = r.blits.filter((b) => b.y === HUD_ROW_Y && b.name === 'GUN')
      expect(icons.length, 'one gun icon per remaining life, capped at 6').toBe(Math.min(lives, 6))
      for (const icon of icons) {
        expect(inBand(icon.x, LIVES_BAND), `life icon at x=${icon.x} must sit in the h6-11 band`).toBe(true)
      }
    },
  )

  // ── AC-2: the icon count strictly increases/decreases with the life count. ──
  it('life icons increase and decrease with the life count', () => {
    const iconsFor = (lives: number): number => {
      const r = makeHudRecorder()
      renderHud(r.ctx, r.atlas, { ...createSim(2), lives }, 987654)
      return r.blits.filter((b) => b.y === HUD_ROW_Y && b.name === 'GUN').length
    }
    expect(iconsFor(4), 'more lives -> more icons').toBeGreaterThan(iconsFor(2))
    expect(iconsFor(2)).toBeGreaterThan(iconsFor(1))
    expect(iconsFor(1)).toBeGreaterThan(iconsFor(0))
  })

  // ── AC-1: no HUD glyph strays into the playable field — every score/high/
  // lives glyph sits on the v=0x1F row. ───────────────────────────────────────
  it('keeps every HUD glyph on the v=0x1F row, never in the playable field', () => {
    const r = makeHudRecorder()
    renderHud(r.ctx, r.atlas, { ...createSim(2), score: 123456, lives: 3 }, 987654)
    // digits are HUD-only; GUN-on-the-HUD-row are lives icons (player gun excluded).
    const hud = r.blits.filter((b) => digitOf(b.name) !== null || (b.name === 'GUN' && b.y === HUD_ROW_Y))
    expect(hud.length, 'the HUD actually drew glyphs — guards against a vacuous pass').toBeGreaterThan(0)
    for (const b of hud) {
      expect(b.y, `HUD glyph ${b.name} must sit on the v=0x1F row (y=${HUD_ROW_Y}), not a field row`).toBe(HUD_ROW_Y)
    }
  })

  // ── AC-2 (PM-27, render-side): the v=0x1F row is the HUD's alone — no mushroom
  // ever blits on it. The sim already refuses the row (MUSHER guard CT-46,
  // tests/shoot-train.test.ts; seeding skips it, tests/playfield.test.ts); this
  // pins the RENDER-side manifestation so a future HUD change cannot leak the
  // reserved row into the field or vice-versa. (Invariant — green now.)
  it('never blits a mushroom on the reserved v=0x1F HUD row (PM-27)', () => {
    const r = makeHudRecorder()
    renderHud(r.ctx, r.atlas, createSim(7), 987654) // a seeded field full of mushrooms
    const anyMush = r.blits.some((b) => /^(?:POISON_)?MUSHROOM_/.test(b.name))
    expect(anyMush, 'the seeded field has mushrooms to draw — guards against a vacuous pass').toBe(true)
    const mushOnHudRow = r.blits.filter((b) => /^(?:POISON_)?MUSHROOM_/.test(b.name) && b.y === HUD_ROW_Y)
    expect(mushOnHudRow.map((b) => b.name), 'no mushroom on the reserved score row').toEqual([])
  })
})
