// tests/shell/sprites.test.ts
//
// Story pm3-5 — pins the MAME `spritelayout` decode of the 16x16 sprite ROM
// (pacman.5f, pm3-1's citation-gated reference/graphics/) and proves
// drawPacman/drawGhost blit real sprite pixels — a chomp frame that changes
// with the animation phase, a frightened body, an eaten eyes-only body —
// instead of the pm1-8 placeholder circles.

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { decodeSpritePixel } from '../../src/shell/gfx-rom'
import { SPRITES } from '../../src/shell/sprite-data'
import { drawPacman, drawGhost } from '../../src/shell/render'
import type { Ghost } from '../../src/core/ghost'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const rom = new Uint8Array(readFileSync(join(root, 'reference', 'graphics', 'pacman.5f')))

// Same 90°-rotation-corrected row-major assembly as tools/bake-graphics.mjs's
// bakeSprites (see that function's header for WHY: decodeSpritePixel's raw
// (x,y) is MAME's spritelayout coordinate verbatim, but this ROM's images
// come out screen-upright only after this correction — verified empirically
// by pupil-position analysis on the ghost-body sprites, not asserted from
// MAME source, since MAME's own screen-rotate config is not part of what
// pm3-1 vendored/cited).
function freshDecodeSprite(index: number): Uint8Array {
  return Uint8Array.from({ length: 256 }, (_, k) => {
    const x = k % 16
    const y = (k / 16) | 0
    return decodeSpritePixel(rom, index, y, 15 - x)
  })
}

describe('sprite decode (pm3-5)', () => {
  it('decodes 64 sprites, every pixel a 2-bit value', () => {
    expect(SPRITES.length).toBe(64)
    for (const s of SPRITES) {
      expect(s.length).toBe(256)
      for (const px of s) {
        expect(px).toBeGreaterThanOrEqual(0)
        expect(px).toBeLessThanOrEqual(3)
      }
    }
  })

  it('the baked sprites equal a fresh decode of the vendored ROM', () => {
    const fresh = Array.from({ length: 64 }, (_, i) => freshDecodeSprite(i))
    expect(SPRITES.map((s) => [...s])).toEqual(fresh.map((s) => [...s]))
  })
})

// Same recording-fake shape as tests/shell/tiles.test.ts: tag each call by
// which ctx method produced it, and record putImageData's pixel bytes so a
// test can assert not just "a blit happened" but "a DIFFERENT blit happened".
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

function makeGhost(id: Ghost['id'], dir: Ghost['actor']['dir'] = 'right'): Ghost {
  return { id, actor: { xPx: 40, yPx: 40, dir, pending: 'none' } }
}

function lastBlit(ctx: ReturnType<typeof fakeCtx>): RecordedCall {
  const puts = ctx.calls.filter((c: RecordedCall) => c.method === 'putImageData')
  expect(puts.length).toBeGreaterThan(0)
  return puts[puts.length - 1]
}

describe('drawPacman animation (pm3-5)', () => {
  it('blits a real 16x16 sprite via putImageData, never the old circle arc', () => {
    const ctx = fakeCtx()
    drawPacman(ctx, 40, 40, 'right', 0)
    const call = lastBlit(ctx)
    expect(call.w).toBe(16)
    expect(call.h).toBe(16)
  })

  it('picks a different chomp frame across the animation phase (same direction)', () => {
    const ctxA = fakeCtx()
    drawPacman(ctxA, 40, 40, 'right', 0)
    const ctxB = fakeCtx()
    drawPacman(ctxB, 40, 40, 'right', 1)

    const a = lastBlit(ctxA).data as Uint8ClampedArray
    const b = lastBlit(ctxB).data as Uint8ClampedArray
    expect([...a]).not.toEqual([...b])
  })

  it('picks a different frame for a different direction (same phase)', () => {
    const ctxRight = fakeCtx()
    drawPacman(ctxRight, 40, 40, 'right', 1)
    const ctxDown = fakeCtx()
    drawPacman(ctxDown, 40, 40, 'down', 1)

    const right = lastBlit(ctxRight).data as Uint8ClampedArray
    const down = lastBlit(ctxDown).data as Uint8ClampedArray
    expect([...right]).not.toEqual([...down])
  })
})

describe('drawGhost sprite modes (pm3-5)', () => {
  it('chase mode blits a 16x16 sprite', () => {
    const ctx = fakeCtx()
    drawGhost(ctx, makeGhost('blinky'), 'chase', 0)
    const call = lastBlit(ctx)
    expect(call.w).toBe(16)
    expect(call.h).toBe(16)
  })

  it('frightened blits the frightened body, distinct from chase', () => {
    const chaseCtx = fakeCtx()
    drawGhost(chaseCtx, makeGhost('blinky'), 'chase', 0)
    const frightCtx = fakeCtx()
    drawGhost(frightCtx, makeGhost('blinky'), 'frightened', 0)

    const chase = lastBlit(chaseCtx).data as Uint8ClampedArray
    const fright = lastBlit(frightCtx).data as Uint8ClampedArray
    expect([...chase]).not.toEqual([...fright])
  })

  it('the flash phase differs from the plain frightened body', () => {
    const frightCtx = fakeCtx()
    drawGhost(frightCtx, makeGhost('blinky'), 'frightened', 0)
    const flashCtx = fakeCtx()
    drawGhost(flashCtx, makeGhost('blinky'), 'flash', 0)

    const fright = lastBlit(frightCtx).data as Uint8ClampedArray
    const flash = lastBlit(flashCtx).data as Uint8ClampedArray
    expect([...fright]).not.toEqual([...flash])
  })

  it('eaten blits eyes-only: distinct from chase, and mostly transparent', () => {
    const chaseCtx = fakeCtx()
    drawGhost(chaseCtx, makeGhost('blinky'), 'chase', 0)
    const eatenCtx = fakeCtx()
    drawGhost(eatenCtx, makeGhost('blinky'), 'eaten', 0)

    const chase = lastBlit(chaseCtx).data as Uint8ClampedArray
    const eaten = lastBlit(eatenCtx).data as Uint8ClampedArray
    expect([...chase]).not.toEqual([...eaten])

    // Eyes-only should paint far fewer opaque pixels than the full body —
    // the ghost's body-ink plane is transparent in this mode (see file
    // header: colour 0 AND the body pixel value are both skipped).
    let chaseOpaque = 0
    let eatenOpaque = 0
    for (let i = 3; i < chase.length; i += 4) if (chase[i] !== 0) chaseOpaque++
    for (let i = 3; i < eaten.length; i += 4) if (eaten[i] !== 0) eatenOpaque++
    expect(eatenOpaque).toBeLessThan(chaseOpaque)
  })

  it('eaten eyes track the ghost travel direction (left differs from right)', () => {
    const rightCtx = fakeCtx()
    drawGhost(rightCtx, makeGhost('blinky', 'right'), 'eaten', 0)
    const leftCtx = fakeCtx()
    drawGhost(leftCtx, makeGhost('blinky', 'left'), 'eaten', 0)

    const right = lastBlit(rightCtx).data as Uint8ClampedArray
    const left = lastBlit(leftCtx).data as Uint8ClampedArray
    expect([...right]).not.toEqual([...left])
  })
})
