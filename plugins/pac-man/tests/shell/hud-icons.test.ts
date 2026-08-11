// tests/shell/hud-icons.test.ts
//
// Story pm4-11 — the BOTTOM HUD band's AUTHENTIC icon rendering. pm4-9 drew the
// bottom band as `LIVES n` / `LEVEL n` fillText; pm4-11 replaces both with real
// 16x16 sprites, exactly as the arcade cabinet does:
//   • bottom-LEFT  — the reserve lives, as Pac-life sprites (reuse drawPacman)
//   • bottom-RIGHT — the level indicator, as a fruit row (reuse drawFruit): the
//                    most-recent up-to-7 levels' fruits, a sliding window.
// The top band (SCORE, HIGH SCORE) is pm4-9's and must stay untouched — that is
// pinned in hud.test.ts, not here.
//
// ROM ground truth (plugins/pac-man/reference/source/pacman.asm):
//   • Lives display, 2b41-2b62: `ld c,#05` bounds the slot loop and
//     `cp #06 / jr nc,#2b61` guards the draw path — AT MOST 5 life icons.
//   • Fruit display, 2bf0-2c41: `ld c,#07` (`; Fruit count`) plus the level>=8
//     branch (`sub #07`) that offsets the table by level-7 — a 7-wide sliding
//     window ENDING at the current level, so at most 7 fruit icons.
//   • Fruit-per-level SEQUENCE: core's levelRow(level).fruit, byte-cited to
//     pacman.asm:2b23-2b31 (cherry / strawberry / orange x2 / apple x2 /
//     melon x2 / galaxian x2 / bell x2 / key). We reuse it as the source of
//     truth here rather than re-transcribing the table.
//
// Over-cap note: the ROM's lives byte is DIP-capped so >5 is unreachable, and
// its >5 path erases rather than clamps. This clone clamps to 5 (min(lives,5))
// — the sensible faithful cap for a config that could exceed the arcade DIP —
// logged as a TEA design deviation.

import { describe, it, expect } from 'vitest'
import { drawHud, drawFruit } from '../../src/shell/render'
import { levelRow } from '../../src/core/level'
import type { FruitType } from '../../src/core/level'
import { LOGICAL_W, LOGICAL_H } from '../../src/shell/layout'

const SPRITE_PX = 16
const BOTTOM_BAND_MIN_Y = LOGICAL_H - 24 // rows 33-35 (y >= 264)
const MID_X = LOGICAL_W / 2 // 112 — bottom-left vs bottom-right split

interface Blit {
  x: number
  y: number
  w: number
  h: number
  data: Uint8ClampedArray
}
interface TextCall {
  text: string
  x: number
  y: number
}
interface FakeCtx {
  blits: Blit[]
  texts: TextCall[]
}

function fakeCtx(): CanvasRenderingContext2D & FakeCtx {
  const blits: Blit[] = []
  const texts: TextCall[] = []
  return {
    blits,
    texts,
    fillStyle: '',
    font: '',
    textBaseline: 'top',
    textAlign: 'start',
    fillText: (text: string, x: number, y: number) => texts.push({ text, x, y }),
    fillRect: () => {},
    createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: (img: { width: number; height: number; data: Uint8ClampedArray }, dx: number, dy: number) =>
      blits.push({ x: dx, y: dy, w: img.width, h: img.height, data: img.data.slice() }),
  } as unknown as CanvasRenderingContext2D & FakeCtx
}

// A blit belongs to the bottom HUD band if its top edge sits at/below the band
// start, allowing one sprite height of slack for drawPacman/drawFruit's tile
// centring (they blit at yPx + TILE_PX/2 - SPRITE_PX/2, i.e. 4px above the tile).
const inBottomBand = (b: Blit): boolean => b.y >= BOTTOM_BAND_MIN_Y - SPRITE_PX
const bottomBlits = (ctx: FakeCtx): Blit[] => ctx.blits.filter(inBottomBand)
const leftIcons = (ctx: FakeCtx): Blit[] => bottomBlits(ctx).filter((b) => b.x < MID_X)
const rightIcons = (ctx: FakeCtx): Blit[] => bottomBlits(ctx).filter((b) => b.x >= MID_X)

// The exact pixel data drawFruit blits for `fruit` — position-independent, so it
// identifies which fruit any recorded blit is, without re-transcribing sprite maps.
function fruitData(fruit: FruitType): Uint8ClampedArray {
  const ref = fakeCtx()
  drawFruit(ref, 0, 0, fruit)
  return ref.blits[ref.blits.length - 1].data
}
const sameData = (a: Uint8ClampedArray, b: Uint8ClampedArray): boolean =>
  a.length === b.length && a.every((v, i) => v === b[i])
const isFruit = (b: Blit, fruit: FruitType): boolean => sameData(b.data, fruitData(fruit))

describe('pm4-11 bottom HUD — lives as Pac-life sprites (bottom-left)', () => {
  it('draws one 16x16 sprite per life and no LIVES text', () => {
    const ctx = fakeCtx()
    drawHud(ctx, 1440, 0, 3, 1)
    const icons = leftIcons(ctx)
    expect(icons.length, 'three lives → three life icons').toBe(3)
    expect(icons.every((b) => b.w === SPRITE_PX && b.h === SPRITE_PX), 'each life icon is a real 16x16 sprite').toBe(true)
    expect(ctx.texts.some((t) => t.text.includes('LIVES')), 'the procedural "LIVES n" text is gone').toBe(false)
  })

  it('draws exactly 5 icons at the ROM cap boundary (lives = 5)', () => {
    const ctx = fakeCtx()
    drawHud(ctx, 0, 0, 5, 1)
    expect(leftIcons(ctx).length).toBe(5)
  })

  it('caps the life row at the ROM maximum of 5 — a game with 8 lives still shows 5, not 8', () => {
    const ctx = fakeCtx()
    drawHud(ctx, 0, 0, 8, 1)
    expect(leftIcons(ctx).length).toBe(5)
  })

  it('draws no life icons when lives is 0', () => {
    const ctx = fakeCtx()
    drawHud(ctx, 0, 0, 0, 1)
    expect(leftIcons(ctx).length).toBe(0)
  })
})

describe('pm4-11 bottom HUD — level indicator as a fruit row (bottom-right)', () => {
  it('draws a single cherry for a level-1 game and no LEVEL text', () => {
    const ctx = fakeCtx()
    drawHud(ctx, 0, 0, 3, 1)
    const fruits = rightIcons(ctx)
    expect(fruits.length, 'level 1 → one fruit').toBe(1)
    expect(isFruit(fruits[0], 'cherry'), 'level 1 fruit is a cherry').toBe(true)
    expect(ctx.texts.some((t) => t.text.includes('LEVEL')), 'the procedural "LEVEL n" text is gone').toBe(false)
  })

  it('shows the byte-cited fruit-per-level sequence for the levels reached (cherry, strawberry, orange at level 3)', () => {
    const ctx = fakeCtx()
    drawHud(ctx, 0, 0, 3, 3)
    const fruits = rightIcons(ctx)
    expect(fruits.length, 'level 3 → three fruits').toBe(3)
    for (const l of [1, 2, 3]) {
      const expected = levelRow(l).fruit.type
      expect(fruits.some((b) => isFruit(b, expected)), `level ${l}'s fruit (${expected}) must appear in the row`).toBe(true)
    }
  })

  it('caps the fruit row at the ROM maximum of 7 (a sliding window, not one per level reached)', () => {
    const ctx = fakeCtx()
    drawHud(ctx, 0, 0, 3, 10)
    expect(rightIcons(ctx).length).toBe(7)
  })

  it('ends the window at the current level and drops the oldest — level 13 shows the key, never the cherry', () => {
    const ctx = fakeCtx()
    drawHud(ctx, 0, 0, 3, 13)
    const fruits = rightIcons(ctx)
    expect(fruits.length).toBe(7)
    const current = levelRow(13).fruit.type // key
    expect(fruits.some((b) => isFruit(b, current)), 'the current level fruit (key) must be shown').toBe(true)
    expect(fruits.some((b) => isFruit(b, 'cherry')), 'the oldest fruit (cherry) has scrolled off the 7-wide window').toBe(false)
  })
})

describe('pm4-11 bottom HUD — placement & accessibility', () => {
  it('draws every HUD icon inside the bottom band, never bleeding onto the playfield', () => {
    const ctx = fakeCtx()
    drawHud(ctx, 999990, 31415, 5, 13)
    const bleeding = ctx.blits.filter((b) => !inBottomBand(b))
    expect(
      bleeding,
      `HUD icons bled out of the bottom band: ${JSON.stringify(bleeding.map((b) => ({ x: b.x, y: b.y })))}`,
    ).toEqual([])
  })

  it('introduces no full-screen flash — drawHud paints no full-canvas fillRect (pm4-1 accessibility)', () => {
    const rects: { w: number; h: number }[] = []
    const ctx = fakeCtx()
    // Overlay a fillRect recorder onto the fake ctx for this one assertion.
    ;(ctx as unknown as { fillRect: (x: number, y: number, w: number, h: number) => void }).fillRect = (
      _x: number,
      _y: number,
      w: number,
      h: number,
    ) => {
      rects.push({ w, h })
    }
    drawHud(ctx, 999990, 31415, 5, 13)
    const fullScreen = rects.filter((r) => r.w >= LOGICAL_W && r.h >= LOGICAL_H)
    expect(fullScreen, 'drawHud must never paint a full-canvas rectangle').toEqual([])
  })
})
