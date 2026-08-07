// tests/shell/glyphs.test.ts
//
// Story pm3-6 — pins the fruit and ghost-chain score-value sprite index MAPS
// (glyph-data.ts) and proves drawFruit/drawScoreSprite blit real 16x16
// sprites (pm3-5's SPRITES/spriteImageData path) instead of the pm1-8
// flat-square fruit placeholder. FRUIT_SPRITE/SCORE_SPRITE are AUTHORED
// classification records (see glyph-data.ts header) — this test pins their
// SHAPE (a valid index into the 64-entry SPRITES table, all 8 FruitTypes
// covered, the four ghost-chain values covered), not the visual correctness
// of any one pick — that is the controller's deferred visual check.

import { describe, it, expect } from 'vitest'
import { SPRITES } from '../../src/shell/sprite-data'
import { TILES } from '../../src/shell/tile-data'
import { HARDWARE_PALETTE, colourLookup } from '../../src/shell/palette-data'
import { FRUIT_SPRITE, SCORE_SPRITE } from '../../src/shell/glyph-data'
import { drawFruit, drawScoreSprite, drawScorePopup } from '../../src/shell/render'
import type { FruitType } from '../../src/core/level'

const ALL_FRUITS: readonly FruitType[] = [
  'cherry',
  'strawberry',
  'orange',
  'apple',
  'melon',
  'galaxian',
  'bell',
  'key',
]

interface RecordedCall {
  method: 'fillRect' | 'putImageData'
  x: number
  y: number
  w: number
  h: number
  data?: Uint8ClampedArray
}

interface FakeCtx {
  calls: RecordedCall[]
}

function fakeCtx(): CanvasRenderingContext2D & FakeCtx {
  const calls: RecordedCall[] = []
  return {
    calls,
    fillStyle: '',
    fillRect: (x: number, y: number, w: number, h: number) => calls.push({ method: 'fillRect', x, y, w, h }),
    putImageData: (img: { width: number; height: number; data: Uint8ClampedArray }, dx: number, dy: number) =>
      calls.push({ method: 'putImageData', x: dx, y: dy, w: img.width, h: img.height, data: img.data.slice() }),
    createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    clearRect: () => {},
    beginPath: () => {},
    arc: () => {},
    fill: () => {},
    moveTo: () => {},
    closePath: () => {},
    save: () => {},
    restore: () => {},
  } as unknown as CanvasRenderingContext2D & FakeCtx
}

function lastBlit(ctx: ReturnType<typeof fakeCtx>): RecordedCall {
  const puts = ctx.calls.filter((c: RecordedCall) => c.method === 'putImageData')
  expect(puts.length).toBeGreaterThan(0)
  return puts[puts.length - 1]
}

describe('FRUIT_SPRITE (pm3-6)', () => {
  it('covers all 8 FruitTypes, each mapping to a valid SPRITES index', () => {
    for (const fruit of ALL_FRUITS) {
      const index = FRUIT_SPRITE[fruit]
      expect(typeof index).toBe('number')
      expect(index).toBeGreaterThanOrEqual(0)
      expect(index).toBeLessThan(SPRITES.length)
    }
  })

  it('assigns a distinct sprite index to every fruit (no two fruits collide)', () => {
    const indices = ALL_FRUITS.map((fruit) => FRUIT_SPRITE[fruit])
    expect(new Set(indices).size).toBe(ALL_FRUITS.length)
  })
})

describe('SCORE_SPRITE (pm3-6)', () => {
  it('covers the four ghost-chain values (200/400/800/1600), each a valid SPRITES index', () => {
    for (const points of [200, 400, 800, 1600]) {
      const index = SCORE_SPRITE[points]
      expect(typeof index).toBe('number')
      expect(index).toBeGreaterThanOrEqual(0)
      expect(index).toBeLessThan(SPRITES.length)
    }
  })

  it('assigns a distinct sprite index to every ghost-chain value', () => {
    const indices = [200, 400, 800, 1600].map((points) => SCORE_SPRITE[points])
    expect(new Set(indices).size).toBe(4)
  })
})

describe('drawFruit (pm3-6)', () => {
  it('blits a real 16x16 fruit sprite via putImageData, never the old flat square', () => {
    const ctx = fakeCtx()
    drawFruit(ctx, 3, 5, 'cherry')
    const call = lastBlit(ctx)
    expect(call.w).toBe(16)
    expect(call.h).toBe(16)
    expect(ctx.calls.some((c) => c.method === 'fillRect')).toBe(false)
  })

  it('blits a different sprite for a different fruit type', () => {
    const ctxCherry = fakeCtx()
    drawFruit(ctxCherry, 3, 5, 'cherry')
    const ctxKey = fakeCtx()
    drawFruit(ctxKey, 3, 5, 'key')

    const cherry = lastBlit(ctxCherry).data as Uint8ClampedArray
    const key = lastBlit(ctxKey).data as Uint8ClampedArray
    expect([...cherry]).not.toEqual([...key])
  })
})

describe('drawScoreSprite (pm3-6)', () => {
  it('blits a real 16x16 sprite via putImageData for a ghost-chain value', () => {
    const ctx = fakeCtx()
    drawScoreSprite(ctx, 40, 40, 200)
    const call = lastBlit(ctx)
    expect(call.w).toBe(16)
    expect(call.h).toBe(16)
  })

  it('blits a different sprite for a different score value', () => {
    const ctx200 = fakeCtx()
    drawScoreSprite(ctx200, 40, 40, 200)
    const ctx1600 = fakeCtx()
    drawScoreSprite(ctx1600, 40, 40, 1600)

    const a = lastBlit(ctx200).data as Uint8ClampedArray
    const b = lastBlit(ctx1600).data as Uint8ClampedArray
    expect([...a]).not.toEqual([...b])
  })
})

describe('drawScorePopup (pm3-7 review fix round 2 — digit-tile rotation)', () => {
  // TILES (tile-data.ts) is baked with NO rotation (tools/bake-graphics.mjs's
  // bakeTiles reads decodeTilePixel(rom, i, x, y) straight, unlike
  // bakeSprites's x'=y,y'=(15-x) correction) — fine for the maze, but the
  // digit glyphs at TILES[0..9] are stored for the ROT90 cabinet, so
  // drawScorePopup's fallback (drawScoreText, render.ts) must rotate each
  // digit tile 90° clockwise (x'=y, y'=(7-x), the 8x8 analogue of
  // bakeSprites's own correction) before blitting it, or a non-symmetric
  // digit like "2"/"3" renders sideways/garbled instead of upright. This
  // test re-derives the expected rotated pixels directly from TILES (the
  // same "fresh decode, assert byte-equality" style sprites.test.ts already
  // uses for SPRITES) so it fails if that rotation is ever missing, backwards
  // (CCW), or dropped by a future refactor — a test that only checked
  // "something was drawn" could not catch a sideways digit.
  function expectedRotatedDigitPixels(digit: number, colorCode: number): number[] {
    const src = TILES[digit]
    const out: number[] = []
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const rawX = y
        const rawY = 7 - x
        const pv = src[rawY * 8 + rawX]
        const [r, g, b] = HARDWARE_PALETTE[colourLookup(colorCode, pv)]
        out.push(r, g, b, 255)
      }
    }
    return out
  }

  it('draws the fruit-popup leading digit as the 90°-clockwise-rotated tile, not the raw unrotated one', () => {
    // 3000 (galaxian's bonus, level.ts) has no SCORE_SPRITE entry, so this
    // exercises drawScorePopup's tile-composition fallback. Its leading
    // digit, '3', is NOT rotation-symmetric (unlike '0') — an unrotated or
    // wrongly-rotated blit reads as "M"/garbage, not "3".
    const ctx = fakeCtx()
    drawScorePopup(ctx, 0, 0, 3000)
    const puts = ctx.calls.filter((c) => c.method === 'putImageData')
    expect(puts.length).toBe(4) // one 8x8 tile per digit: '3','0','0','0'
    const firstDigitBlit = puts[0]

    const DIGIT_COLOR_CODE = 15 // same constant render.ts anchors (colourLookup(15,3) = near-white)
    const expectedRotated = expectedRotatedDigitPixels(3, DIGIT_COLOR_CODE)
    expect([...(firstDigitBlit.data as Uint8ClampedArray)]).toEqual(expectedRotated)

    // The un-rotated raw TILES[3] pixels must NOT match — proves the test
    // would have caught the round-1 bug (drawScoreText blitting TILES[digit]
    // straight, producing a sideways glyph).
    const rawUnrotated: number[] = []
    for (let k = 0; k < TILES[3].length; k++) {
      const [r, g, b] = HARDWARE_PALETTE[colourLookup(DIGIT_COLOR_CODE, TILES[3][k])]
      rawUnrotated.push(r, g, b, 255)
    }
    expect([...(firstDigitBlit.data as Uint8ClampedArray)]).not.toEqual(rawUnrotated)
  })
})
