// plugins/missile-command/tests/render-field.test.ts
//
// Story mc1-2 — RED phase (Han Solo / TEA). AC2: the shell (`src/shell/render.ts`)
// paints the six cities and three bases at their cited positions, along the
// bottom band. Pure layout data lives in core/field.ts (field.test.ts); this
// file proves the shell actually CONSUMES it and puts nine marks on the canvas
// where they belong.
//
// ─── PIXELS ARE THE REVIEWER'S JOB; WIRING IS OURS ───────────────────────────
// AC2's real acceptance artefact is a screenshot at /missile-command/ showing
// the field along the bottom band — an owner/reviewer check no node test can
// make. What a node test CAN pin, without a real canvas, is (a) that drawFrame
// emits at least nine distinct marks in the bottom half of the surface, and
// (b) that render.ts imports the field data from core and references it on the
// paint path. Together they stop the two ways this silently goes wrong: a shell
// that draws nothing new, and a shell that hardcodes coordinates instead of
// consuming the cited core layout. The exact glyph and sub-pixel placement are
// deliberately NOT asserted — that is the screenshot's job.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// Today render.ts only clears the field to black (mc1-1). drawFrame draws no
// structures, so the "nine marks in the bottom band" test reddens; and render.ts
// imports nothing from core/field, so the wiring scan reddens. Both go green when
// Dev wires the field into the paint path.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { drawFrame } from '../src/shell/render.js'
import { createGame } from '../src/core/game.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// A canvas comfortably wider/taller than the cabinet's 8-bit coordinate space
// (H 0..255, V 0..222), so a faithful mapping lands inside it with room to spare.
const W = 256
const H = 231

// ─── A recording 2D context: no real canvas, just a call log ─────────────────
// Records every coordinate-bearing primitive. The first two numeric args of
// rect/fillRect/strokeRect/moveTo/lineTo/arc/ellipse are (x, y); fillText/
// strokeText are (text, x, y). Style setters are accepted and ignored.
interface Mark {
  op: string
  x: number
  y: number
  /** width, for spotting the full-canvas background clear. */
  w?: number
}

function recordingCtx(): { ctx: CanvasRenderingContext2D; marks: Mark[] } {
  const marks: Mark[] = []
  const xy =
    (op: string) =>
    (x: number, y: number, w?: number): void => {
      marks.push({ op, x, y, w })
    }
  const text =
    (op: string) =>
    (_t: string, x: number, y: number): void => {
      marks.push({ op, x, y })
    }
  const noop = (): void => {}
  const api: Record<string, unknown> = {
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    globalAlpha: 1,
    font: '',
    fillRect: xy('fillRect'),
    strokeRect: xy('strokeRect'),
    rect: xy('rect'),
    moveTo: xy('moveTo'),
    lineTo: xy('lineTo'),
    arc: xy('arc'),
    ellipse: xy('ellipse'),
    fillText: text('fillText'),
    strokeText: text('strokeText'),
    beginPath: noop,
    closePath: noop,
    fill: noop,
    stroke: noop,
    save: noop,
    restore: noop,
    translate: noop,
    scale: noop,
    setTransform: noop,
    clip: noop,
  }
  return { ctx: api as unknown as CanvasRenderingContext2D, marks }
}

/** Marks in the bottom half, excluding the full-canvas background clear. */
function bottomBandMarks(marks: Mark[]): Mark[] {
  return marks.filter((m) => {
    const isBackground = m.op === 'fillRect' && m.x === 0 && m.y === 0 && m.w === W
    return !isBackground && m.y > H / 2
  })
}

describe('AC2 — drawFrame paints the nine structures in the bottom band', () => {
  it('emits at least nine marks below the vertical midline', () => {
    const { ctx, marks } = recordingCtx()
    drawFrame(ctx, createGame(), W, H)
    const band = bottomBandMarks(marks)
    expect(
      band.length,
      'six cities + three bases = nine structures must be drawn in the bottom band',
    ).toBeGreaterThanOrEqual(9)
  })

  it('the nine structures occupy at least nine distinct horizontal columns', () => {
    // All nine source H values are distinct (cities 95,180,148,44,71,208; bases
    // 20,123,240), so a faithful field paints nine separate columns — not one
    // ground line masquerading as a field.
    const { ctx, marks } = recordingCtx()
    drawFrame(ctx, createGame(), W, H)
    const columns = new Set(bottomBandMarks(marks).map((m) => Math.round(m.x)))
    expect(columns.size, 'the field must span at least nine distinct H columns').toBeGreaterThanOrEqual(9)
  })

  it('every field mark lands inside the horizontal extent of the canvas', () => {
    const { ctx, marks } = recordingCtx()
    drawFrame(ctx, createGame(), W, H)
    for (const m of bottomBandMarks(marks)) {
      expect(m.x, `mark ${m.op} x=${m.x} is off-canvas`).toBeGreaterThanOrEqual(0)
      expect(m.x, `mark ${m.op} x=${m.x} is off-canvas`).toBeLessThanOrEqual(W)
    }
  })
})

describe('AC2 — render.ts consumes the cited field, it does not hardcode', () => {
  const renderSrc = readFileSync(join(root, 'src', 'shell', 'render.ts'), 'utf8')

  it('imports the field layout from core/field', () => {
    expect(
      renderSrc,
      'render.ts must import the field from core/field — the layout is core data, not a shell literal',
    ).toMatch(/from\s+['"][^'"]*core\/field(\.js)?['"]/)
  })

  it('references both CITIES and BASES on the paint path', () => {
    expect(renderSrc).toMatch(/\bCITIES\b/)
    expect(renderSrc).toMatch(/\bBASES\b/)
  })
})
