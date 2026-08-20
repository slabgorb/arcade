// plugins/defender/tests/pt1-29-hud-highscore-smartbomb.test.ts
//
// Story pt1-29 — RED phase (O'Brien / TEA). The defender in-play HUD is missing two readouts
// the 2026-08-20 render audit flagged:
//   1. the IN-PLAY HIGH SCORE — today the high score appears only on the game-over hall-of-fame
//      screen (drawHallOfFame), never during live play. drawHud writes score/men/wave only.
//   2. the SMART-BOMB STOCK — state.smartBombs (sim.ts) is tracked but drawn NOWHERE.
//
// Defender draws every screen in CORE (core/scene.ts composeFrame; shell/render.ts is a bare
// framebuffer→canvas blit — memory `defender-raster-draw-lives-in-core-scene`), so both readouts
// are composed in drawHud inside scene.ts. This suite is BLACK-BOX over composeFrame (the
// df5-7/df7-5/pt1-20 digest technique): it pins BEHAVIOUR — a readout reaches the frame, is drawn
// by palette INDEX, is stable and non-strobing — never an internal constant, layout or export name.
//
// SMART-BOMB stock reads the EXISTING state.smartBombs (no new plumbing): two states differing
// only in smartBombs must produce DIFFERENT frames. The HIGH SCORE is NOT on SimState (the sim's
// CMOS ledger holds coins only — cmos.ts); the persisted board lives in the shell. So — exactly as
// pt1-20 threaded the control hint — composeFrame grows an OPTIONAL `highScore` field on its 5th
// `options` arg, decoupled from the game-over `hof` payload (which gates the hall-of-fame screen).
//
// RED now: drawHud ignores state.smartBombs, and composeFrame ignores options.highScore, so each
// pair of frames below is byte-identical → the digests MATCH → the not.toBe assertions fail.

import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import type { Framebuffer } from '../src/core/framebuffer.js'
import { composeFrame } from '../src/core/scene.js'
import { createSim, type SimState } from '../src/core/sim.js'
import { assertNoFullFrameStrobe } from '../src/core/effects.js'

const LOGICAL_WIDTH = 292 // src/shell/render.ts LOGICAL_WIDTH — core takes it as an arg (df5-7/df7-5/pt1-20 precedent)
const LOGICAL_HEIGHT = 240

/** Deterministic byte source (LCG) — the df3-6/df4-6/df5-7/df7-5/pt1-20 shape, no ambient entropy. */
function makeRand(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return (s >>> 16) & 0xff
  }
}

const digest = (fb: Framebuffer): string => createHash('sha256').update(fb.data).digest('hex').slice(0, 16)

/** A live PLAY-field state (not game-over) — where the in-play HUD is drawn (drawHud runs after
 *  composeFrame's game-over early-return). */
function playState(seed: number): SimState {
  return createSim(makeRand(seed))
}

/** A game-over state (df5-6 men<0) — composeFrame takes its end-screen early-return, so drawHud
 *  (and both new readouts) must NOT run. Used to prove neither readout leaks onto the end screen. */
function gameOverState(seed: number): SimState {
  return { ...createSim(makeRand(seed)), gameOver: true, score: 4242 }
}

// ─── AC1 — the SMART-BOMB stock reaches the HUD (state.smartBombs → pixels) ────────────
describe('pt1-29 AC1 — the smart-bomb stock is drawn on the in-play HUD', () => {
  it('composeFrame CHANGES when only state.smartBombs differs — the stock figure paints', () => {
    // Isolate smartBombs exactly as df7-5 isolates the wave: two states identical but for the
    // smart-bomb count. drawHud writes score/men/wave only and nothing else in composeFrame reads
    // state.smartBombs, so today the digests MATCH → RED. GREEN draws the stock in the HUD.
    const base = playState(2)
    const stocked: SimState = { ...base, smartBombs: base.smartBombs + 5 }
    expect(
      digest(composeFrame(stocked, LOGICAL_WIDTH, LOGICAL_HEIGHT)),
      'composeFrame ignored state.smartBombs — the smart-bomb stock never reaches the HUD',
    ).not.toBe(digest(composeFrame(base, LOGICAL_WIDTH, LOGICAL_HEIGHT)))
  })

  it('a depleted stock (0) renders DIFFERENTLY from a full stock — the readout tracks the value', () => {
    // Not merely "some smartBombs draw something": the figure must reflect the count, so 0 and a
    // stocked cabinet differ. Guards a GREEN that drew a fixed icon regardless of the number.
    const empty: SimState = { ...playState(6), smartBombs: 0 }
    const full: SimState = { ...playState(6), smartBombs: 4 }
    expect(
      digest(composeFrame(full, LOGICAL_WIDTH, LOGICAL_HEIGHT)),
      'the smart-bomb readout did not change between 0 and 4 in stock',
    ).not.toBe(digest(composeFrame(empty, LOGICAL_WIDTH, LOGICAL_HEIGHT)))
  })

  it('the stock does NOT leak onto the GAME OVER screen (drawn only in live play)', () => {
    // drawHud runs after composeFrame's game-over early-return, so smartBombs must not touch the
    // end screen. Changing it on a game-over state leaves the frame identical.
    const base = gameOverState(8)
    const stocked: SimState = { ...base, smartBombs: base.smartBombs + 3 }
    expect(
      digest(composeFrame(stocked, LOGICAL_WIDTH, LOGICAL_HEIGHT)),
      'the smart-bomb stock leaked onto the GAME OVER screen',
    ).toBe(digest(composeFrame(base, LOGICAL_WIDTH, LOGICAL_HEIGHT)))
  })
})

// ─── AC2 — the IN-PLAY HIGH SCORE reaches the HUD (options.highScore → pixels) ──────────
describe('pt1-29 AC2 — the in-play high score is drawn on the HUD', () => {
  it('composeFrame with a high score DIFFERS from the plain play frame (the figure is drawn)', () => {
    // composeFrame ignores any options.highScore today, so the frame WITH a high score is
    // byte-identical to the plain frame → RED. GREEN reads options.highScore and paints it in the
    // HUD by palette index, like score/men/wave.
    const state = playState(3)
    const bare = composeFrame(state, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const withHi = composeFrame(state, LOGICAL_WIDTH, LOGICAL_HEIGHT, undefined, { highScore: 123450 })
    expect(
      digest(withHi),
      'composeFrame ignored options.highScore — the in-play high score never reaches the HUD',
    ).not.toBe(digest(bare))
  })

  it('the readout tracks the VALUE — two different high scores render differently', () => {
    // Guards a GREEN that drew a fixed label regardless of the number: the digits must reflect the
    // score passed in.
    const state = playState(9)
    const lo = composeFrame(state, LOGICAL_WIDTH, LOGICAL_HEIGHT, undefined, { highScore: 5000 })
    const hi = composeFrame(state, LOGICAL_WIDTH, LOGICAL_HEIGHT, undefined, { highScore: 987650 })
    expect(digest(hi), 'the high-score readout did not change with the value').not.toBe(digest(lo))
  })

  it('the high score does NOT leak onto the GAME OVER screen (the hall-of-fame owns it there)', () => {
    // options.highScore is a live-play overlay; the end screen has its own score display and the
    // hall-of-fame board. Passing highScore on a game-over state must not change the end screen.
    const state = gameOverState(4)
    const bare = composeFrame(state, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const withHi = composeFrame(state, LOGICAL_WIDTH, LOGICAL_HEIGHT, undefined, { highScore: 654320 })
    expect(
      digest(withHi),
      'options.highScore leaked past composeFrame\'s game-over early-return onto the end screen',
    ).toBe(digest(bare))
  })
})

// ─── Cross-cutting: palette-index only, deterministic, no strobe (df2 / ADR-0005) ──────
describe('pt1-29 — the new HUD readouts are index-drawn, stable and non-strobing', () => {
  it('every cell of the HUD frame stays 0..15 — the readouts use palette INDICES, no invented colour', () => {
    // An index > 15 decodes as CRAM[i&0x0f], a colour the palette never named. Guards the NEW HUD
    // text (green today; rejects a readout drawn with an out-of-range index).
    const state: SimState = { ...playState(5), smartBombs: 3 }
    const fb = composeFrame(state, LOGICAL_WIDTH, LOGICAL_HEIGHT, undefined, { highScore: 314159 })
    let worst = 0
    for (let i = 0; i < fb.data.length; i++) if (fb.data[i] > worst) worst = fb.data[i]
    expect(worst, `a HUD cell holds palette index ${worst} > 15 — a colour the CRAM never named`).toBeLessThanOrEqual(15)
  })

  it('the same state + options render identically twice — no per-frame flicker (ADR-0005)', () => {
    // The whole draw is a pure function of (state, options): same input → same indices out. A
    // readout that flickered frame-to-frame would break determinism here (and strobe for the
    // photosensitive owner — memory `pacman-epilepsy-no-flash`).
    const state: SimState = { ...playState(11), smartBombs: 2 }
    const opts = { highScore: 77770 }
    expect(digest(composeFrame(state, LOGICAL_WIDTH, LOGICAL_HEIGHT, undefined, opts))).toBe(
      digest(composeFrame(state, LOGICAL_WIDTH, LOGICAL_HEIGHT, undefined, opts)),
    )
  })

  it('the HUD readouts are a bounded overlay, never a full-frame strobe (ADR-0005, Decision B)', () => {
    // Adding the high score + a bumped smart-bomb stock is a SMALL text overlay on the play field,
    // never a whole-screen luminance flip. assertNoFullFrameStrobe must accept the delta.
    const base = playState(13)
    const plain = composeFrame(base, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const loud = composeFrame(
      { ...base, smartBombs: base.smartBombs + 5 },
      LOGICAL_WIDTH,
      LOGICAL_HEIGHT,
      undefined,
      { highScore: 999990 },
    )
    expect(() => assertNoFullFrameStrobe(plain.data, loud.data)).not.toThrow()
  })
})
