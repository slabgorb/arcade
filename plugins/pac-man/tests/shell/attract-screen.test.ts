// tests/shell/attract-screen.test.ts
//
// Story pm4-9 (RED→GREEN) — the ATTRACT-only prompt painted over the pm4-8
// self-playing demo. pm4-8 made the maze play itself during `phase === 'attract'`;
// pm4-9 paints "PUSH START BUTTON" on top of it (pacman.asm:36b3) and lets pac-man
// join the lobby showcase.
//
// The HIGH SCORE readout is NOT an attract-only element — it is a permanent HUD
// element (top-centre, all phases). Its tests live in tests/shell/hud.test.ts. This
// suite covers only the attract-specific prompt + the accessibility guarantee.
//
// SEAM: `overlays.draw(ctx, game)` — the per-frame overlay call main.ts makes every
// frame. `overlays.draw` is the home of phase-gated screen text (GAME OVER / READY!),
// so the attract prompt lives there too. The mock-ctx harness mirrors overlays.test.ts.
//
// ACCESSIBILITY (binding, pm4-1): the boss has photosensitive epilepsy. The attract
// screen must never full-screen flash. AC-6 pins THAT (it does not forbid a blink).

import { describe, it, expect } from 'vitest'
import { createOverlays, type Overlays } from '../../src/shell/overlays'
import { createGameState, type GameState } from '../../src/core/game'
import { LOGICAL_W, LOGICAL_H } from '../../src/shell/layout'

interface RecordedCall {
  method: 'putImageData' | 'fillText' | 'fillRect'
  x: number
  y: number
  text?: string
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
    putImageData: (_img: { width: number; height: number; data: Uint8ClampedArray }, dx: number, dy: number) =>
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

/** fillRect calls covering (at least) the whole 224×288 logical buffer — a
 *  full-screen fill, the shape of the pm4-1 level-clear strobe. A bounded prompt
 *  never produces one. */
function fullScreenFills(ctx: ReturnType<typeof fakeCtx>): RecordedCall[] {
  return ctx.calls.filter(
    (c) => c.method === 'fillRect' && c.x <= 0 && c.y <= 0 && (c.w ?? 0) >= LOGICAL_W && (c.h ?? 0) >= LOGICAL_H,
  )
}

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

function textCalls(ctx: ReturnType<typeof fakeCtx>): string[] {
  return ctx.calls.filter((c) => c.method === 'fillText').map((c) => c.text ?? '')
}

/** A fresh cabinet in attract — `createGameState` boots into 'attract' (game.ts). */
function attractGame(): GameState {
  return createGameState(1)
}

/** Every distinct text string an overlay paints across a window of frames, joined
 *  with spaces (a window, not one frame, tolerates a blink; the join tolerates a
 *  split render). */
function textAcrossWindow(ov: Overlays, game: GameState, frames = 60): string {
  const seen = new Set<string>()
  for (let i = 0; i < frames; i++) {
    const ctx = fakeCtx()
    ov.draw(ctx, game)
    for (const t of textCalls(ctx)) seen.add(t)
  }
  return [...seen].join(' ')
}

/** Clears the latched READY! banner so a test isolates the attract prompt. */
function clearReady(ov: Overlays): void {
  ov.onEvents([{ type: 'dot-eaten', score: 10 }])
}

describe('pm4-9 attract prompt', () => {
  it('AC-1: paints "PUSH START BUTTON" during attract (pacman.asm:36b3)', () => {
    const ov = createOverlays()
    clearReady(ov)
    const text = textAcrossWindow(ov, attractGame())
    expect(text).toContain('PUSH START BUTTON')
  })

  // ── AC-6: accessibility — no full-screen strobe (binding, pm4-1) ─────────────
  it('AC-6: the attract screen paints NO full-screen fill across a long window', () => {
    const ov = createOverlays()
    clearReady(ov)
    const ctx = fakeCtx()
    for (let i = 0; i < 300; i++) ov.draw(ctx, attractGame())
    expect(fullScreenFills(ctx)).toEqual([])
  })

  it('AC-6: no high-luminance full-screen transition (strobe) during attract', () => {
    const ov = createOverlays()
    clearReady(ov)
    const ctx = fakeCtx()
    for (let i = 0; i < 300; i++) ov.draw(ctx, attractGame())
    const brightFullScreen = fullScreenFills(ctx).filter((c) => isHighLuminance(c.fillStyle))
    expect(brightFullScreen.length).toBe(0)
  })

  it('AC-6 negative control: the mock DOES catch a full-screen white fill (non-vacuous)', () => {
    const ctx = fakeCtx()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H)
    expect(fullScreenFills(ctx).length).toBe(1)
    expect(isHighLuminance(fullScreenFills(ctx)[0].fillStyle)).toBe(true)
  })

  // ── Phase-gating guard: the attract prompt must NOT leak into live play ──────
  it('guard: "PUSH START BUTTON" never appears while phase === "playing"', () => {
    const ov = createOverlays()
    clearReady(ov)
    const playing = createGameState(1)
    playing.phase = 'playing'
    const text = textAcrossWindow(ov, playing)
    expect(text).not.toContain('PUSH START BUTTON')
  })
})
