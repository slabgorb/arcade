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

function imageCalls(ctx: ReturnType<typeof fakeCtx>): RecordedCall[] {
  return ctx.calls.filter((c) => c.method === 'putImageData')
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

  it('shows a score popup for a bounded window after a fruit-eaten event, then clears', () => {
    // Review fix (CRITICAL 1): this test used to fire ONLY the fruit-eaten
    // event and assert `ctx.calls.length > 0` — with the still-latched
    // READY! banner painting via fillText every draw, that assertion passed
    // even when the fruit popup itself silently drew nothing (drawScoreSprite
    // has no SCORE_SPRITE entry for any fruit value — 100/300/500/700/1000/
    // 2000/3000/5000 don't overlap the four ghost-chain values it covers).
    // Deleting the fruit-popup code path would NOT have reddened this test.
    // Fixed the same way as the ghost-eaten test above (clear READY! first)
    // AND made the assertion specific to the popup: a putImageData call,
    // not just "some call happened".
    const ov = createOverlays()
    ov.onEvents([{ type: 'dot-eaten', score: 10 }]) // clear READY! — isolate the popup
    ov.onEvents([{ type: 'fruit-eaten', fruit: 'cherry', points: 100 }])
    const ctx = fakeCtx()
    ov.draw(ctx, stubGame())
    expect(imageCalls(ctx).length).toBeGreaterThan(0) // the fruit popup itself drew something

    for (let i = 0; i < 200; i++) ov.draw(ctx, stubGame())
    const after = imageCalls(ctx).length
    ov.draw(ctx, stubGame())
    expect(imageCalls(ctx).length).toBe(after) // window elapsed — nothing more drawn
  })

  it('draws every fruit bonus value, not just cherry\'s 100', () => {
    // SCORE_SPRITE (glyph-data.ts) covers none of these — they all go
    // through drawScorePopup's tile-digit composition fallback
    // (drawScoreText, render.ts). Pinning all 8 catches a fallback that only
    // half-works (e.g. an off-by-one in the digit string that silently
    // drops a value).
    const fruitPoints = [100, 300, 500, 700, 1000, 2000, 3000, 5000]
    for (const points of fruitPoints) {
      const ov = createOverlays()
      ov.onEvents([{ type: 'dot-eaten', score: 10 }])
      ov.onEvents([{ type: 'fruit-eaten', fruit: 'cherry', points }])
      const ctx = fakeCtx()
      ov.draw(ctx, stubGame())
      expect(imageCalls(ctx).length).toBeGreaterThan(0)
    }
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

  it('resets on a game restart: GAME OVER clears and READY! returns for the new game', () => {
    // Review fix (CRITICAL 2): `overlays` is a single long-lived driver
    // across main.ts's whole session (never recreated on restart, unlike
    // GameState). Drive it to game-over, then simulate main.ts's own
    // restart path (`game = createGameState(...)`, a fresh GameState whose
    // `phase` starts 'playing') and confirm the banner un-latches and
    // READY! reappears — the same phase-poll self-heal `createAudioDriver`
    // already relies on (audio.ts's `themeArmed` re-arming on the
    // game-over -> playing edge).
    const ov = createOverlays()
    const gameOverState = createGameState(1)
    gameOverState.phase = 'game-over'
    ov.onEvents([{ type: 'game-over' }])
    const duringGameOver = fakeCtx()
    ov.draw(duringGameOver, gameOverState)
    expect(textCalls(duringGameOver)).toContain('GAME OVER')

    // main.ts's restart: `game = createGameState(Date.now(), highScoreTable)`
    // — a brand-new GameState, phase 'playing', never touching `overlays`.
    const freshGame = createGameState(2)
    const afterRestart = fakeCtx()
    ov.draw(afterRestart, freshGame)
    expect(textCalls(afterRestart)).not.toContain('GAME OVER')
    expect(textCalls(afterRestart)).toContain('READY!')
  })
})
