// plugins/defender/tests/pt1-20-control-hint.test.ts
//
// Story pt1-20 — RED phase (Leeloo / TEA). Playtest 2026-08-19: a player cannot tell how
// to fly or fire Defender. The bindings already exist and work (shell/input.ts: A/Left =
// reverse-facing, D/Right = thrust, W/S/Up/Down = vertical, Space/Enter = fire, RightShift =
// smart-bomb) — the GAP IS DISCOVERABILITY. This story draws an on-screen control hint so a
// first-time player learns the unintuitive reverse-to-turn scheme.
//
// Defender draws every screen in CORE (core/scene.ts composeFrame); shell/render.ts is a bare
// index blitter (the defender draw-in-core rule — see .session/pt1-20-session.md, memory
// `defender-raster-draw-lives-in-core-scene`). So the hint is composed in scene.ts. composeFrame
// today takes (state, w, h, hof?); it grows an OPTIONAL 5th arg `{ controlHint?: boolean }`. When
// `controlHint` is true, a hint line is drawn over the play field; every existing 3/4-arg caller
// is byte-for-byte unchanged. Core also exports `CONTROL_HINT` — the single source of truth for
// the hint text (core cannot import shell/input.ts, so the hint STRING lives in core and must be
// kept consistent with the bindings; that consistency is the Dev's contract, pinned here on the
// core side).
//
// BLACK-BOX over composeFrame (the df5-7/df7-4/df7-5 digest technique): this pins BEHAVIOUR — the
// hint reaches the frame, it is opt-in, it does not strobe, and its TEXT actually teaches the
// controls — never a layout constant or a private draw name. GREEN is free to choose position,
// colour and exact wording within the pinned contract.
//
// ─── WHY THIS IS RED ──────────────────────────────────────────────────────────────────
// composeFrame ignores any 5th argument today, so a frame composed WITH controlHint:true is
// byte-identical to one composed without → the digest-DIFFERS assertion fails now and passes once
// GREEN draws the hint. And `CONTROL_HINT` is not exported yet → the SSOT suite is red on import.

import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import type { Framebuffer } from '../src/core/framebuffer.js'
import { composeFrame, CONTROL_HINT } from '../src/core/scene.js'
import { createSim, type SimState } from '../src/core/sim.js'
import { assertNoFullFrameStrobe } from '../src/core/effects.js'
import { glyphForChar } from '../src/core/charset.js'

const LOGICAL_WIDTH = 292 // src/shell/render.ts LOGICAL_WIDTH — core takes it as an arg (df4-6/df5-7/df7-4 precedent)
const LOGICAL_HEIGHT = 240

/** Deterministic byte source (LCG) — the df3-6/df4-6/df5-7/df7-4 shape, no ambient entropy. */
function makeRand(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return (s >>> 16) & 0xff
  }
}

const digest = (fb: Framebuffer): string => createHash('sha256').update(fb.data).digest('hex').slice(0, 16)

/** A live PLAY-field state (not game-over) — composeFrame draws the play field the attract demo
 *  and a fresh game both show, which is where the hint overlay belongs. */
function playState(seed: number): SimState {
  return createSim(makeRand(seed))
}

/** A game-over state (df5-6 men<0) — composeFrame takes its end-screen early-return. */
function gameOverState(seed: number): SimState {
  return { ...createSim(makeRand(seed)), gameOver: true, score: 4242 }
}

describe('pt1-20 — the control hint reaches the composed frame (discoverability fix)', () => {
  it('composeFrame with controlHint:true DIFFERS from the plain play frame (the hint is drawn)', () => {
    // The heart of the story: requesting the hint changes the frame. Today the 5th arg is ignored
    // → the two frames are byte-identical → RED. GREEN draws the hint line over the play field.
    const state = playState(3)
    const bare = composeFrame(state, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const withHint = composeFrame(state, LOGICAL_WIDTH, LOGICAL_HEIGHT, undefined, { controlHint: true })
    expect(
      digest(withHint),
      'composeFrame ignored controlHint — the control hint never reaches the frame; the player still sees no controls',
    ).not.toBe(digest(bare))
  })

  it('the hint is OPT-IN: controlHint:false (and the default) leave the play field UN-hinted', () => {
    // Play must not be permanently cluttered by the hint. controlHint defaults off, and false ==
    // default == the un-hinted play frame; only true adds the overlay. This trio pins opt-in:
    //   default === false  AND  true !== default.
    const state = playState(7)
    const bare = composeFrame(state, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const off = composeFrame(state, LOGICAL_WIDTH, LOGICAL_HEIGHT, undefined, { controlHint: false })
    const on = composeFrame(state, LOGICAL_WIDTH, LOGICAL_HEIGHT, undefined, { controlHint: true })
    expect(digest(off), 'controlHint:false must render the same frame as the default (hint is opt-in)').toBe(digest(bare))
    expect(digest(on), 'controlHint:true must differ from controlHint:false (the flag actually gates the hint)').not.toBe(
      digest(off),
    )
  })

  it('the hint does NOT leak onto the GAME OVER screen (overlay is play-field only)', () => {
    // The hint teaches live controls; the game-over end screen (early-return) must be untouched by
    // the flag. GREEN draws the hint only after the gameOver early-return.
    const state = gameOverState(9)
    const bare = composeFrame(state, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const withHint = composeFrame(state, LOGICAL_WIDTH, LOGICAL_HEIGHT, undefined, { controlHint: true })
    expect(
      digest(withHint),
      'controlHint changed the GAME OVER screen — the hint leaked past the end-screen early-return',
    ).toBe(digest(bare))
  })

  it('the hint overlay does not full-frame strobe (ADR-0005 / accessibility — a bounded overlay)', () => {
    // Safety net (green-on-arrival): the hint is a sparse text line, not a page invert. Its
    // non-vacuity companion below proves assertNoFullFrameStrobe can still reject a real strobe.
    const state = playState(11)
    const bare = composeFrame(state, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const withHint = composeFrame(state, LOGICAL_WIDTH, LOGICAL_HEIGHT, undefined, { controlHint: true })
    expect(() => assertNoFullFrameStrobe(bare.data, withHint.data)).not.toThrow()
  })

  it('non-vacuity: assertNoFullFrameStrobe DOES reject an actual full-frame strobe', () => {
    // Proves the guard above has teeth — a whole-frame white-fill of the hinted frame is rejected
    // (the df7-5 non-vacuity construction: an all-INDEX_MAX page-flash).
    const state = playState(11)
    const withHint = composeFrame(state, LOGICAL_WIDTH, LOGICAL_HEIGHT, undefined, { controlHint: true })
    const strobe = new Uint8Array(withHint.data.length).fill(0x0f)
    expect(() => assertNoFullFrameStrobe(withHint.data, strobe)).toThrow()
  })
})

describe('pt1-20 — CONTROL_HINT is the SSOT hint text and actually teaches the controls', () => {
  it('is a non-empty string', () => {
    expect(typeof CONTROL_HINT, 'CONTROL_HINT must be a string constant exported from core/scene.ts').toBe('string')
    expect(CONTROL_HINT.length, 'CONTROL_HINT must not be empty — an empty hint teaches nothing').toBeGreaterThan(0)
  })

  it('renders WITHOUT the invalid-char glyph — every character has a real charset glyph', () => {
    // The defender charset is A-Z, digits, space and ",:!?." — no arrows or slash (MESS0.SRC).
    // An unsupported char silently becomes '?' (TEXT7A) at runtime, so the hint would render as
    // garbage. Every non-space char of CONTROL_HINT must map to a real glyph.
    for (const ch of CONTROL_HINT) {
      if (ch === ' ') continue
      expect(glyphForChar(ch), `CONTROL_HINT char ${JSON.stringify(ch)} has no charset glyph — it renders as '?'`).toBeDefined()
    }
  })

  it('names the FIRE key (SPACE or ENTER) — the key input.ts binds to fire', () => {
    expect(
      CONTROL_HINT.toUpperCase(),
      'the hint must tell the player which key fires (input.ts binds Space/Enter)',
    ).toMatch(/\bSPACE\b|\bENTER\b/)
  })

  it('names the SMART-BOMB key (SHIFT) — the least-guessable binding', () => {
    expect(
      CONTROL_HINT.toUpperCase(),
      'the hint must tell the player which key drops the smart-bomb (input.ts binds RightShift)',
    ).toMatch(/\bSHIFT\b/)
  })

  it('names the THRUST and REVERSE actions — Defender’s unintuitive reverse-to-turn scheme', () => {
    const H = CONTROL_HINT.toUpperCase()
    expect(H, 'the hint must name THRUST — the forward control').toMatch(/THRUST/)
    expect(H, 'the hint must name REVERSE/TURN/FLIP — the reverse-to-turn scheme the story exists to explain').toMatch(
      /REVERSE|TURN|FLIP/,
    )
  })
})
