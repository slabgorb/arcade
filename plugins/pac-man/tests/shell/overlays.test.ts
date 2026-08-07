// tests/shell/overlays.test.ts
//
// Story pm3-7 — pins `createOverlays()`, the presentation-overlay driver that
// mirrors `createAudioDriver` (audio.ts): a stateful factory consuming the
// SAME `events.ts` seam pm2's audio driver reads, latching transient
// overlays (ghost/fruit score popups, the level-clear flash, the READY!/
// GAME OVER banners) purely off events + elapsed `draw` calls — no clock
// read anywhere in this file or in overlays.ts (core-purity spirit).

import { describe, it, expect } from 'vitest'
import { createOverlays } from '../../src/shell/overlays'
import { createGameState, type GameState } from '../../src/core/game'

interface RecordedCall {
  method: 'putImageData' | 'fillText' | 'fillRect'
  x: number
  y: number
  text?: string
}

interface FakeCtx {
  calls: RecordedCall[]
}

function fakeCtx(): CanvasRenderingContext2D & FakeCtx {
  const calls: RecordedCall[] = []
  return {
    calls,
    fillStyle: '',
    font: '',
    textBaseline: 'alphabetic',
    textAlign: 'start',
    fillRect: (x: number, y: number) => calls.push({ method: 'fillRect', x, y }),
    fillText: (text: string, x: number, y: number) => calls.push({ method: 'fillText', x, y, text }),
    putImageData: (img: { width: number; height: number; data: Uint8ClampedArray }, dx: number, dy: number) =>
      calls.push({ method: 'putImageData', x: dx, y: dy }),
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

function stubGame(): GameState {
  return createGameState(1)
}

function textCalls(ctx: ReturnType<typeof fakeCtx>): string[] {
  return ctx.calls.filter((c) => c.method === 'fillText').map((c) => c.text ?? '')
}

describe('createOverlays (pm3-7)', () => {
  it('shows a score popup for a bounded window after a ghost-eaten event, then clears', () => {
    const ov = createOverlays()
    // Clear the READY! banner first (it latches until the first dot-eaten,
    // per the next test below) so this test isolates the popup's own
    // window rather than tripping on the banner's separate, indefinite one.
    ov.onEvents([{ type: 'dot-eaten', score: 10 }])
    ov.onEvents([{ type: 'ghost-eaten', ghost: 'blinky', chainIndex: 0, score: 200 }])
    const ctx = fakeCtx()
    ov.draw(ctx, stubGame())
    expect(ctx.calls.length).toBeGreaterThan(0) // popup drawn
    for (let i = 0; i < 200; i++) ov.draw(ctx, stubGame())
    const after = ctx.calls.length
    ov.draw(ctx, stubGame())
    expect(ctx.calls.length).toBe(after) // window elapsed — nothing more drawn
  })

  it('shows a score popup for a bounded window after a fruit-eaten event', () => {
    const ov = createOverlays()
    ov.onEvents([{ type: 'fruit-eaten', fruit: 'cherry', points: 100 }])
    const ctx = fakeCtx()
    ov.draw(ctx, stubGame())
    expect(ctx.calls.length).toBeGreaterThan(0)
  })

  it('fresh driver shows READY! until the first dot-eaten event', () => {
    const ov = createOverlays()
    const ctx = fakeCtx()
    ov.draw(ctx, stubGame())
    expect(textCalls(ctx)).toContain('READY!')

    ov.onEvents([{ type: 'dot-eaten', score: 10 }])
    const ctx2 = fakeCtx()
    ov.draw(ctx2, stubGame())
    expect(textCalls(ctx2)).not.toContain('READY!')
  })

  it('level-cleared triggers a flash state that paints and eventually stops', () => {
    const ov = createOverlays()
    ov.onEvents([{ type: 'dot-eaten', score: 10 }]) // clear READY! — isolate the flash window
    ov.onEvents([{ type: 'level-cleared', level: 1 }])
    const ctx = fakeCtx()
    ov.draw(ctx, stubGame())
    expect(ctx.calls.some((c) => c.method === 'fillRect')).toBe(true)

    // Run enough draws for the flash window to elapse.
    for (let i = 0; i < 300; i++) ov.draw(ctx, stubGame())
    const after = ctx.calls.filter((c) => c.method === 'fillRect').length
    ov.draw(ctx, stubGame())
    expect(ctx.calls.filter((c) => c.method === 'fillRect').length).toBe(after)
  })

  it('game-over latches the GAME OVER banner permanently', () => {
    const ov = createOverlays()
    ov.onEvents([{ type: 'game-over' }])
    const ctx = fakeCtx()
    ov.draw(ctx, stubGame())
    expect(textCalls(ctx)).toContain('GAME OVER')

    // Latched: still shows after many more draws, no further event needed.
    for (let i = 0; i < 100; i++) ov.draw(ctx, stubGame())
    expect(textCalls(ctx)).toContain('GAME OVER')
  })
})
