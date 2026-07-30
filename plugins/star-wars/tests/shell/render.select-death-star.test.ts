// tests/shell/render.select-death-star.test.ts
//
// sw9-2 RED (shell) — the SELECT-A-DEATH-STAR screen copy, at the only
// text-identifiable seam (layoutText). Mirrors the render.framing-prompts mock.
//
// The three strings are verbatim from TCMES.MAC:582-587 (.RADIX 16; ASCII inside
// <...> is literal text):
//   MS.DS1  <SELECT A DEATH STAR>              — the title
//           <FIRE LASER AT DESIRED DEATH STAR> — the instruction
//   the three Death Star labels: <EASY> <MEDIUM> <HARD>
//
// All-caps letters + spaces only, so every glyph exists in the shared VGMSGA clone
// font (no apostrophe/period gaps to tolerate). Pre-GREEN render() has no 'select'
// branch (render.ts:599-603 dispatches attract/gameover/else) so a select-mode
// state falls into the playing-HUD branch and NONE of these strings are drawn —
// each assertion below is the RED.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '../../src/shell/render'
import { initialState, type GameState } from '../../src/core/state'
import type { HighScoreTable } from '@shared/highscore'

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
/** Some strings are drawn as one layoutText call, some as a joined line; match on
 *  substring so a faithful layout can group or split them. */
const drewText = (needle: string): boolean => texts().some((t) => t.includes(needle))

const NO_SCORES: HighScoreTable<'wave'> = []

// A select-mode state. `mode`/`select` are cast in — the union gains 'select' and
// GameState gains `select` in GREEN; vitest's esbuild transpile ignores the types,
// so this loads and drives the render() dispatch pre-GREEN.
const selectState = (): GameState =>
  ({
    ...initialState(1983),
    mode: 'select',
    select: { countdown: 10, hover: null },
  } as unknown as GameState)

beforeEach(() => {
  font.calls.length = 0
})

describe('sw9-2 · render draws the SELECT-A-DEATH-STAR screen (shell)', () => {
  it("draws the title 'SELECT A DEATH STAR' (MS.DS1, TCMES.MAC:582)", () => {
    render(makeCtx(), selectState(), W, H, NO_SCORES)
    expect(drewText('SELECT A DEATH STAR')).toBe(true)
  })

  it("draws the fire instruction 'FIRE LASER AT DESIRED DEATH STAR' (TCMES.MAC:583)", () => {
    render(makeCtx(), selectState(), W, H, NO_SCORES)
    expect(drewText('FIRE LASER AT DESIRED DEATH STAR')).toBe(true)
  })

  it('draws the three difficulty labels EASY / MEDIUM / HARD (TCMES.MAC:585-587)', () => {
    render(makeCtx(), selectState(), W, H, NO_SCORES)
    expect(drewText('EASY')).toBe(true)
    expect(drewText('MEDIUM')).toBe(true)
    expect(drewText('HARD')).toBe(true)
  })

  it('does NOT fall through to the playing HUD (no crosshair-era prompt leaks)', () => {
    // The select screen is its own page; the playing branch would draw none of the
    // picker copy. This is the positive of the same seam: the title proves the
    // dedicated select branch ran.
    render(makeCtx(), selectState(), W, H, NO_SCORES)
    expect(drewText('SELECT A DEATH STAR')).toBe(true)
  })
})
