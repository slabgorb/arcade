// tests/shell/attract-screen.test.ts
//
// Story pm4-9 (RED) — the ATTRACT-SCREEN presentation over the pm4-8 self-playing
// demo. pm4-8 made the maze play itself during `phase === 'attract'`; pm4-9 paints
// the cabinet's attract text on top of it and lets pac-man join the lobby showcase.
//
// SEAM CHOICE (TEA/Leeloo): these tests drive `overlays.draw(ctx, game)` — the
// per-frame overlay call main.ts already makes every frame (main.ts render loop:
// `drawHud(...)` then `overlays.draw(...)`). `overlays.draw` is already the home of
// phase-gated full-screen text: it paints GAME OVER when `phase === 'game-over'`
// and READY! otherwise. The attract screen is the same shape — phase-gated screen
// text — so it belongs on the same seam. Dev MAY delegate to a helper (render.ts,
// a new module) as long as the per-frame `overlays.draw` produces the text while
// `phase === 'attract'`. The mock-ctx harness is lifted verbatim from
// overlays.test.ts (pm3-7/pm4-1) so both suites read the same way.
//
// ROM ground truth (verified against the vendored pacman.asm, the attract string-
// pointer table at 36a5): "HIGH SCORE" (pacman.asm:36a5), "PUSH START BUTTON"
// (pacman.asm:36b3). The single HIGH SCORE value lives in RAM at 4e88-4e8b and
// starts at 0 — Pac-Man has NO initials high-score LADDER in the ROM (the clone's
// initials table is a centipede-style clone-ism, game.ts:181), so this cabinet's
// attract HIGH SCORE shows the persisted top score (or 0), never a fabricated
// default — the ROM-honest ruling the boss confirmed at setup, and the same refusal
// @shared/highscore itself records ("fabricating a level would be the cabinet
// inventing a fact about a player's game").
//
// ACCESSIBILITY (binding, pm4-1): the boss has photosensitive epilepsy. Pac-Man's
// attract PUSH START BUTTON authentically BLINKS, which is fine — a small blinking
// glyph is not a seizure hazard. What is forbidden is a full-screen high-luminance
// flash. AC-6 below pins THAT and nothing more (it does not forbid the blink).

import { describe, it, expect } from 'vitest'
import { createOverlays, type Overlays } from '../../src/shell/overlays'
import { createGameState, type GameState, type PacHighScoreTable } from '../../src/core/game'
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

/** fillRect calls that cover (at least) the whole 224×288 logical buffer — a
 *  full-screen fill, the exact shape of the pm4-1 level-clear strobe. A bounded
 *  banner/popup or a small blinking glyph never produces one. */
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

/** A fresh cabinet in attract — `createGameState` already boots into 'attract'
 *  (game.ts:367). Returns `GameState` (not a narrowed literal) so assigning phase
 *  elsewhere never trips TS2367. `table` seeds the persisted high-score table. */
function attractGame(table: PacHighScoreTable = []): GameState {
  return createGameState(1, table)
}

/** Accumulate every distinct text string an overlay paints across a window of
 *  frames, joined with spaces. A window (not one frame) is used deliberately: the
 *  authentic PUSH START BUTTON blinks, so it may be absent on any single frame —
 *  the string must merely appear SOMEWHERE in the window. Joining with a space
 *  also tolerates a split render ("PUSH START" + "BUTTON"). */
function textAcrossWindow(ov: Overlays, game: GameState, frames = 60): string {
  const seen = new Set<string>()
  for (let i = 0; i < frames; i++) {
    const ctx = fakeCtx()
    ov.draw(ctx, game)
    for (const t of textCalls(ctx)) seen.add(t)
  }
  return [...seen].join(' ')
}

/** Clears the latched READY! banner (the demo eats dots during attract, firing
 *  dot-eaten) so a test isolates the attract screen from the READY! overlay —
 *  the same isolation overlays.test.ts uses for its popups. */
function clearReady(ov: Overlays): void {
  ov.onEvents([{ type: 'dot-eaten', score: 10 }])
}

describe('pm4-9 attract screen (RED)', () => {
  // ── AC-1: ROM-authentic attract text over the demo ──────────────────────────
  it('AC-1: paints "PUSH START BUTTON" during attract (pacman.asm:36b3)', () => {
    const ov = createOverlays()
    clearReady(ov)
    const text = textAcrossWindow(ov, attractGame())
    expect(text).toContain('PUSH START BUTTON')
  })

  it('AC-1: paints the "HIGH SCORE" label during attract (pacman.asm:36a5)', () => {
    const ov = createOverlays()
    clearReady(ov)
    const text = textAcrossWindow(ov, attractGame())
    expect(text).toContain('HIGH SCORE')
  })

  // ── AC-2: the HIGH SCORE value is the PERSISTED top score, never fabricated ──
  it('AC-2: shows the persisted top score as the HIGH SCORE value', () => {
    // Seed a table whose top entry scored 31415. The attract HIGH SCORE must show
    // that real number — proving it reads the persisted table, not a hard-coded 0
    // and not a fabricated default ladder (the ROM-honest ruling).
    const ov = createOverlays()
    clearReady(ov)
    const seeded: PacHighScoreTable = [{ name: 'ABC', score: 31415, level: 5 }]
    const text = textAcrossWindow(ov, attractGame(seeded))
    expect(text).toContain('31415')
  })

  it('AC-2: an empty table shows a real zero HIGH SCORE, not fabricated defaults', () => {
    // ROM-honest: with no scores yet the value is 0 (RAM 4e88-4e8b powers up 0).
    // A fabricated default ladder (invented initials/scores) would show some other
    // number here — this pins that nothing is invented.
    const ov = createOverlays()
    clearReady(ov)
    const text = textAcrossWindow(ov, attractGame([]))
    expect(text).toContain('HIGH SCORE')
    expect(text).not.toContain('31415') // no leftover/fabricated score
    // The 6-digit-blanked ROM display shows a single 0 for an empty high score.
    expect(/\b0\b/.test(text)).toBe(true)
  })

  // ── AC-6: accessibility — no full-screen strobe (binding, pm4-1) ─────────────
  it('AC-6: the attract screen paints NO full-screen fill across a long window', () => {
    const ov = createOverlays()
    clearReady(ov)
    const ctx = fakeCtx()
    // Far past any plausible blink period; a full-screen fill on ANY frame is the hazard.
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
    // Proves the two AC-6 assertions can fire — if the attract screen ever strobed
    // the whole buffer white, fullScreenFills + isHighLuminance would both catch it.
    const ctx = fakeCtx()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H)
    expect(fullScreenFills(ctx).length).toBe(1)
    expect(isHighLuminance(fullScreenFills(ctx)[0].fillStyle)).toBe(true)
  })

  // ── Phase-gating guard: the attract screen must NOT leak into live play ──────
  // Passes trivially today (nothing paints it anywhere); becomes load-bearing at
  // GREEN, keeping Dev honest that the attract text is gated to `phase === 'attract'`
  // and never overlaps the HUD during 'playing'. Mirrors pm4-8's never-self-exit guard.
  it('guard: "PUSH START BUTTON" never appears while phase === "playing"', () => {
    const ov = createOverlays()
    clearReady(ov)
    const playing = createGameState(1)
    playing.phase = 'playing'
    const text = textAcrossWindow(ov, playing)
    expect(text).not.toContain('PUSH START BUTTON')
  })
})
