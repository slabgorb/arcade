// tests/shell/overlays.test.ts
//
// Story pm3-7 — pins `createOverlays()`, the presentation-overlay driver that
// mirrors `createAudioDriver` (audio.ts): a stateful factory consuming the
// SAME `events.ts` seam pm2's audio driver reads, latching transient
// overlays (ghost/fruit score popups and the READY!/GAME OVER banners)
// purely off events + elapsed `draw` calls — no clock read anywhere in this
// file or in overlays.ts (core-purity spirit). pm4-1 removed the level-clear
// flash for photosensitivity safety; AC1/AC2 below assert it stays ABSENT.

import { describe, it, expect } from 'vitest'
import { createOverlays } from '../../src/shell/overlays'
import { createGameState, type GameState } from '../../src/core/game'
import { LOGICAL_W, LOGICAL_H } from '../../src/shell/layout'

interface RecordedCall {
  method: 'putImageData' | 'fillText' | 'fillRect'
  x: number
  y: number
  text?: string
  // pm4-1: fillRect now records its full geometry + the fillStyle in effect at
  // call time, so a test can distinguish a small/dim overlay draw from a
  // full-screen high-luminance flash (the accessibility hazard being removed).
  w?: number
  h?: number
  fillStyle?: string
}

interface FakeCtx {
  calls: RecordedCall[]
}

function fakeCtx(): CanvasRenderingContext2D & FakeCtx {
  const calls: RecordedCall[] = []
  const ctx = {
    calls,
    fillStyle: '',
    font: '',
    textBaseline: 'alphabetic',
    textAlign: 'start',
    fillRect: (x: number, y: number, w: number, h: number) =>
      calls.push({ method: 'fillRect', x, y, w, h, fillStyle: String(ctx.fillStyle) }),
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
  return ctx
}

/** fillRect calls that cover (at least) the whole 224×288 logical buffer — i.e.
 *  a full-screen fill. The level-clear strobe pm4-1 removes was exactly this:
 *  `fillRect(0, 0, LOGICAL_W, LOGICAL_H)`. A bounded score-popup or banner never
 *  produces one. */
function fullScreenFills(ctx: ReturnType<typeof fakeCtx>): RecordedCall[] {
  return ctx.calls.filter(
    (c) => c.method === 'fillRect' && c.x <= 0 && c.y <= 0 && (c.w ?? 0) >= LOGICAL_W && (c.h ?? 0) >= LOGICAL_H,
  )
}

/** A hex colour is "bright" (high luminance) if its Rec.601 luma is high — the
 *  white strobe (#ffffff) is luma 255; a dim/dark hold colour is not. Any
 *  #RGB/#RRGGBB string parses; anything unparseable is treated as not-bright. */
function isHighLuminance(fillStyle: string | undefined): boolean {
  if (!fillStyle) return false
  const hex = fillStyle.trim().replace(/^#/, '')
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return false
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  const luma = 0.299 * r + 0.587 * g + 0.114 * b
  return luma >= 128
}

// pm4-9: `createGameState` boots into 'attract', and overlays now paints the
// attract SCREEN there (not READY!/popups). These tests exercise the popup and
// READY!/GAME OVER banner mechanics, which live in the 'playing'/'game-over'
// phases — so the stub is a PLAYING game. (The attract screen has its own suite,
// tests/shell/attract-screen.test.ts.)
function stubGame(): GameState {
  const g = createGameState(1)
  g.phase = 'playing'
  return g
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

  // ── pm4-1 [SAFETY]: the level-clear effect must never full-screen flash ──
  // The boss has photosensitive epilepsy. overlays.ts used to answer a
  // `level-cleared` event with `fillRect(0,0,LOGICAL_W,LOGICAL_H)` in solid
  // white, strobing ~3.75 Hz for ~96 frames. These tests pin its removal: a
  // level clear must produce NO full-screen fill (AC1) and NO high-luminance
  // full-screen transition at any frame of the window (AC2). Dev may remove the
  // effect entirely or keep a bounded, non-flashing hold — either satisfies
  // both, so this constrains the hazard, not the implementation.
  it('AC1: a level-cleared event paints no full-screen fill at all across the whole window', () => {
    const ov = createOverlays()
    ov.onEvents([{ type: 'dot-eaten', score: 10 }]) // clear READY! — isolate the level-clear window
    ov.onEvents([{ type: 'level-cleared', level: 1 }])
    const ctx = fakeCtx()
    // Draw far past any plausible hold window; a full-screen fill on ANY frame is the hazard.
    for (let i = 0; i < 300; i++) ov.draw(ctx, stubGame())
    expect(fullScreenFills(ctx)).toEqual([])
  })

  it('AC2: no high-luminance full-screen transition (strobe) survives after level-cleared', () => {
    const ov = createOverlays()
    ov.onEvents([{ type: 'dot-eaten', score: 10 }])
    ov.onEvents([{ type: 'level-cleared', level: 1 }])
    const ctx = fakeCtx()
    for (let i = 0; i < 300; i++) ov.draw(ctx, stubGame())
    const brightFullScreen = fullScreenFills(ctx).filter((c) => isHighLuminance(c.fillStyle))
    expect(brightFullScreen.length).toBe(0)
  })

  it('AC1 negative-control: the mock DOES catch a full-screen white fill (guards against a vacuous pass)', () => {
    // Proves the assertion above is not vacuous: a real full-screen white fill
    // is detected by both helpers. If overlays.ts ever reintroduced the strobe,
    // the two tests above would fire — this pins that they CAN.
    const ctx = fakeCtx()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H)
    expect(fullScreenFills(ctx).length).toBe(1)
    expect(isHighLuminance(fullScreenFills(ctx)[0].fillStyle)).toBe(true)
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
    // restart path (`game = createGameState(...)`, a fresh GameState) and
    // confirm the banner un-latches and READY! reappears — the same phase-poll
    // self-heal the driver relies on. pm4-6 UPDATE: createGameState now boots
    // into 'attract', so the restart edge is 'game-over' -> 'attract' (not
    // -> 'playing'); the self-heal fires on 'game-over' -> ANY other phase.
    const ov = createOverlays()
    const gameOverState = createGameState(1)
    gameOverState.phase = 'game-over'
    ov.onEvents([{ type: 'game-over' }])
    const duringGameOver = fakeCtx()
    ov.draw(duringGameOver, gameOverState)
    expect(textCalls(duringGameOver)).toContain('GAME OVER')

    // main.ts's restart: `game = createGameState(Date.now(), highScoreTable)`
    // — a brand-new GameState, which now boots into 'attract', never touching
    // `overlays`. The un-latch fires on leaving 'game-over'. pm4-9: a restart lands
    // in ATTRACT (the self-playing demo), so the driver shows the ATTRACT SCREEN
    // (PUSH START BUTTON), not READY! — READY! belongs to the pre-play 'ready' phase.
    const freshGame = createGameState(2)
    const afterRestart = fakeCtx()
    ov.draw(afterRestart, freshGame)
    expect(textCalls(afterRestart)).not.toContain('GAME OVER')
    expect(textCalls(afterRestart)).toContain('PUSH START BUTTON')
  })
})
