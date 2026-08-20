// tests/shell/render.select-hit-align.test.ts
//
// pt1-11 RED (shell) — the SELECT-A-DEATH-STAR hit region is offset LEFT of the
// drawn labels (playtest 2026-08-19: "you must hover to the LEFT of 'easy'").
//
// ROOT CAUSE (Architect, context-story-pt1-11): a SCALE mismatch between two maps
// of the same quantity.
//   * drawSelect (render.ts:1698-1699) draws each label at
//       x = w/2 + aim.x·(w·0.3),  y = h/2 − aim.y·(h·0.3)
//   * the shell's mouse→aim map (src/shell/input.ts:35-38) spans the FULL canvas:
//       aim.x = (px/w)·2 − 1,     aim.y = −((py/h)·2 − 1)
//   * the hit test (sim.ts:hoverFromAim) picks the nearest DEATH_STAR_CHOICES.aim
//     within SELECT_HIT_RADIUS = 0.18, in AIM units.
// Round-tripping a label's drawn pixel back through input.ts lands at aim·0.6, not
// aim: EASY drawn at (0.35w,0.59h) inverts to aim (−0.30,−0.18), which is 0.233
// from EASY's own (−0.5,−0.3) — outside 0.18, so hovering the label does NOT
// select it. (MEDIUM's error is 0.12, inside the radius, which is why only
// EASY/HARD feel broken — see the per-choice assertion below.)
//
// This suite is the missing coverage: the existing core suite
// (tests/core/select-death-star.test.ts) feeds choice.aim DIRECTLY, bypassing the
// pixel map, so it is green today and cannot see this bug. Here we go the whole
// way the player does: the PIXEL a label is drawn at, inverted through input.ts's
// own mapping, must select that same choice via the real sim hit test. It fails
// today for EASY and HARD; a draw/hit reconciliation through one shared mapping
// (the fix) makes the round-trip exact and turns it green — at every window shape.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '../../src/shell/render'
import { stepGame } from '../../src/core/sim'
import { NO_INPUT } from '../../src/core/input'
import { initialState, DEATH_STAR_CHOICES, type GameState } from '../../src/core/state'
import { hoverOf } from '../support/select'
import type { HighScoreTable } from '@shared/highscore'

// A degenerate glyph — one point at the glyph origin, zero width — so glowText's
// first moveTo lands on the label's ANCHOR (x,y) exactly (center align: ox = x − w/2
// = x when w = 0). That anchor is the pixel we invert back to an aim.
const font = vi.hoisted(() => {
  let lastText = ''
  const moves: { x: number; y: number; text: string }[] = []
  return {
    moves,
    peek() {
      return lastText
    },
    layoutText(text: string) {
      lastText = text.toUpperCase()
      return { strokes: [{ points: [{ x: 0, y: 0 }] }], width: 0 }
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

const NO_SCORES: HighScoreTable<'wave'> = []

/** A recording ctx whose moveTo tags each point with the most-recently laid-out
 *  text, so a label's draw anchor can be recovered by name. */
function makeCapturingCtx(w: number, h: number): CanvasRenderingContext2D {
  const target: Record<string | symbol, unknown> = { canvas: { width: w, height: h } }
  const proxy = new Proxy(target, {
    get(t, prop) {
      if (prop === 'measureText') return () => ({ width: 0 })
      if (prop === 'moveTo')
        return (x: number, y: number) => {
          font.moves.push({ x, y, text: font.peek() })
        }
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

/** A select-mode frame with no live hover (labels drawn in the resting colour). */
const selectState = (): GameState => ({
  ...initialState(1983),
  mode: 'select',
  select: { countdown: 10, hover: null },
})

/** The pixel drawSelect draws `label` at, captured from the first moveTo tagged
 *  with that label's text. */
function labelPixel(label: string): { x: number; y: number } {
  const hit = font.moves.find((m) => m.text === label)
  if (!hit) throw new Error(`label ${label} was never drawn`)
  return { x: hit.x, y: hit.y }
}

// The three window shapes AC1 names: square, wide, tall. The round-trip is exact
// at any aspect once draw and hit share one mapping, so all three must pass.
const SHAPES = [
  { name: 'square 600×600', w: 600, h: 600 },
  { name: 'wide 1024×576', w: 1024, h: 576 },
  { name: 'tall 540×960', w: 540, h: 960 },
]

beforeEach(() => {
  font.moves.length = 0
})

describe('pt1-11 · hovering a drawn difficulty label selects that difficulty (AC1)', () => {
  for (const shape of SHAPES) {
    describe(shape.name, () => {
      for (let i = 0; i < DEATH_STAR_CHOICES.length; i++) {
        const choice = DEATH_STAR_CHOICES[i]
        it(`the pixel '${choice.label}' is drawn at hovers '${choice.label}'`, () => {
          font.moves.length = 0
          render(makeCapturingCtx(shape.w, shape.h), selectState(), shape.w, shape.h, NO_SCORES)
          const px = labelPixel(choice.label)

          // Invert the drawn pixel through the SHELL's own mouse→aim mapping
          // (src/shell/input.ts:35-38), the exact transform a hovering mouse undergoes.
          const aimX = (px.x / shape.w) * 2 - 1
          const aimY = -((px.y / shape.h) * 2 - 1)

          // Drive the REAL sim hit test: a neutral (no-fire) select step reports
          // which choice the live aim hovers. Under the offset bug this is null
          // for EASY/HARD (the label's pixel maps outside SELECT_HIT_RADIUS).
          const stepped = stepGame(selectState(), { ...NO_INPUT, aimX, aimY }, 1 / 60)
          expect(hoverOf(stepped)).toBe(i)
        })
      }
    })
  }

  it("the drawn labels and the hit test agree for ALL three choices at once (no silent left/right bias)", () => {
    const { w, h } = SHAPES[1] // the wide shape, where the horizontal offset bites hardest
    font.moves.length = 0
    render(makeCapturingCtx(w, h), selectState(), w, h, NO_SCORES)
    const hovered = DEATH_STAR_CHOICES.map((choice) => {
      const px = labelPixel(choice.label)
      const aimX = (px.x / w) * 2 - 1
      const aimY = -((px.y / h) * 2 - 1)
      return hoverOf(stepGame(selectState(), { ...NO_INPUT, aimX, aimY }, 1 / 60))
    })
    expect(hovered).toEqual([0, 1, 2])
  })
})
