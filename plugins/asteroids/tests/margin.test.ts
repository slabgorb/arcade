// tests/margin.test.ts
//
// Story A2-1 → sa1-1. The Asteroids world is a fixed 4:3 rectangle (WORLD_W x
// WORLD_H) that render() projects with a uniform *fit* scale
// (Math.min(w/WORLD_W, h/WORLD_H)) and centres on the canvas. That scale is the
// pure seam this module still owns: `fitScale`.
//
// The non-playable margin BARS that the centred fit leaves are no longer computed
// here — sa1-1 moved the surround into the shared @shared/cabinet module
// (`chromeRegions` + `drawCabinetChrome`), whose geometry is unit-tested in
// src/shared/tests/cabinet.test.ts and whose asteroids paint is verified in
// tests/margin-mask.render.test.ts. What remains testable HERE is that `fitScale`
// stays the ONE scale both the drawn world and the shared mask derive from — a
// PURE function of (w, h): no canvas, no state, no time. It is pinned via an
// INDEPENDENT oracle (`fit`, below) re-derived straight from the WORLD constants
// and the documented formula, so the test specifies the scale rather than echoing
// the implementation.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { WORLD_W, WORLD_H } from '../src/core/state'
import { fitScale } from '../src/shell/margin'

/** Independent oracle: the uniform fit scale of the 4:3 world into a w x h canvas —
 *  the same contract render()'s `view.scale` implements, expressed straight from
 *  the spec so it is not circular with fitScale's letterbox-derived form. */
const oracleScale = (w: number, h: number): number => Math.min(w / WORLD_W, h / WORLD_H)

describe('fitScale — the one uniform 4:3 fit scale', () => {
  it('pillarbox (canvas wider than 4:3): height limits the fit', () => {
    const W = 1600
    const H = 600
    // wider than 4:3 → h/WORLD_H is the binding constraint
    expect(fitScale(W, H)).toBeCloseTo(oracleScale(W, H), 9)
    expect(fitScale(W, H)).toBeCloseTo(H / WORLD_H, 9)
  })

  it('letterbox (canvas taller than 4:3): width limits the fit', () => {
    const W = 800
    const H = 1200
    expect(fitScale(W, H)).toBeCloseTo(oracleScale(W, H), 9)
    expect(fitScale(W, H)).toBeCloseTo(W / WORLD_W, 9)
  })

  it('exact 4:3 canvas: both constraints agree', () => {
    const W = WORLD_W * 3
    const H = WORLD_H * 3
    expect(fitScale(W, H)).toBeCloseTo(3, 9)
  })

  it('is deterministic and side-effect free', () => {
    expect(fitScale(1600, 600)).toBe(fitScale(1600, 600))
    expect(fitScale(800, 1200)).toBe(fitScale(800, 1200))
  })

  it('the fitted world never exceeds the canvas on either axis', () => {
    for (const [W, H] of [
      [1600, 600],
      [800, 1200],
      [1024, 768],
      [1920, 1080],
    ] as const) {
      const s = fitScale(W, H)
      expect(WORLD_W * s).toBeLessThanOrEqual(W + 1e-6)
      expect(WORLD_H * s).toBeLessThanOrEqual(H + 1e-6)
    }
  })
})

// ---- TS lang-review #1: no type-safety escapes --------------------------------

describe('margin.ts — introduces no type-safety escapes (TS lang-review #1)', () => {
  const SRC = fileURLToPath(new URL('../src/shell/margin.ts', import.meta.url))

  it('src/shell/margin.ts exists', () => {
    expect(existsSync(SRC), 'src/shell/margin.ts must exist').toBe(true)
  })

  it('uses no `as any` and no @ts-ignore', () => {
    expect(existsSync(SRC)).toBe(true)
    const src = readFileSync(SRC, 'utf8')
    expect(/\bas any\b/.test(src), 'margin.ts must not use `as any`').toBe(false)
    expect(/@ts-ignore/.test(src), 'margin.ts must not use @ts-ignore').toBe(false)
  })
})
