// plugins/defender/tests/df7-4-hall-of-fame-render.test.ts
//
// Story df7-4 — RED phase (Atia of the Julii / TEA). AC2: the hall-of-fame DISPLAY is
// rendered (HOFIN initials display, AMODE1.SRC:244) reading the df5-6 board; AC4: the
// hall-of-fame / name-entry presentation never full-frame strobes (Decision B / ADR-0005),
// colour by df2 palette INDEX only.
//
// Defender draws every screen in CORE (core/scene.ts composeFrame); shell/render.ts is a
// bare index blitter. So the HOF display is composed in scene.ts, and composeFrame — which
// today takes (state, w, h) and draws only df5-6's GAME OVER text from SimState — grows an
// OPTIONAL 4th arg carrying the board + in-progress initials. 3-arg callers (df3-6/df7-5)
// keep the plain GAME OVER screen unchanged; a 4th arg turns the game-over branch into the
// hall-of-fame screen.
//
// BLACK-BOX over composeFrame (the df5-7/df7-5 digest technique): this pins BEHAVIOUR — the
// board content reaches the frame, the in-progress initials reach the frame, nothing strobes
// — never a layout constant or a private draw name.
//
// ─── WHY THIS IS RED ──────────────────────────────────────────────────────────────────
// composeFrame ignores any 4th argument today (scene.ts:271 reads only `state`), so a frame
// composed WITH a board is byte-identical to one composed without → the digest-DIFFERS
// assertions fail now and pass once GREEN draws the HOF screen. (The no-strobe assertions
// are green-on-arrival SAFETY nets; each carries its non-vacuity companion — df7-5 precedent.)

import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import type { Framebuffer } from '../src/core/framebuffer.js'
import { composeFrame } from '../src/core/scene.js'
import { createSim, type SimState } from '../src/core/sim.js'
import { assertNoFullFrameStrobe } from '../src/core/effects.js'
import type { DefenderHighScore } from '../src/core/highscore.js'

const LOGICAL_WIDTH = 292 // src/shell/render.ts LOGICAL_WIDTH — core takes it as an arg (df4-6/df5-7/df7-5 precedent)
const LOGICAL_HEIGHT = 240

function makeRand(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return (s >>> 16) & 0xff
  }
}

const digest = (fb: Framebuffer): string => createHash('sha256').update(fb.data).digest('hex').slice(0, 16)

/** A game-over SimState (df5-6 men<0) — composeFrame's game-over branch is taken. */
function gameOverState(seed: number, score: number): SimState {
  return { ...createSim(makeRand(seed)), gameOver: true, score }
}

/** The df7-4 hall-of-fame render payload the 4th arg carries. */
type Hof = { board: readonly DefenderHighScore[]; nameEntry: { buffer: string; score: number } | null }
const BOARD_A: DefenderHighScore[] = [
  { name: 'ACE', score: 99_000 },
  { name: 'BEE', score: 50_000 },
]
const BOARD_B: DefenderHighScore[] = [
  { name: 'ZZZ', score: 11_111 },
  { name: 'YYY', score: 22_222 },
]

describe('df7-4 AC2 — the hall-of-fame table is rendered from the df5-6 board (HOFIN, AMODE1.SRC:244)', () => {
  it('composeFrame draws the HOF screen when a board is supplied on game-over (differs from the bare GAME OVER frame)', () => {
    // The plain 3-arg game-over frame is df5-6's GAME OVER text; the 4th arg turns it into
    // the hall-of-fame display. Today the 4th arg is ignored → digests MATCH → RED.
    const state = gameOverState(3, 50_000)
    const bare = composeFrame(state, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const withBoard = composeFrame(state, LOGICAL_WIDTH, LOGICAL_HEIGHT, { board: BOARD_A, nameEntry: null } satisfies Hof)
    expect(
      digest(withBoard),
      'composeFrame ignored the hall-of-fame board — the HOFIN display never reaches the game-over frame',
    ).not.toBe(digest(bare))
  })

  it('the RENDERED table reflects the board CONTENT — two different boards produce two different frames', () => {
    // Not just "some overlay appears" (that a hardcoded banner would satisfy, lang-review
    // #18): the frame must depend on the board's initials/scores. Two boards → two frames.
    const state = gameOverState(4, 50_000)
    const a = composeFrame(state, LOGICAL_WIDTH, LOGICAL_HEIGHT, { board: BOARD_A, nameEntry: null } satisfies Hof)
    const b = composeFrame(state, LOGICAL_WIDTH, LOGICAL_HEIGHT, { board: BOARD_B, nameEntry: null } satisfies Hof)
    expect(digest(a), 'the hall-of-fame render does not read the board rows — it draws the same pixels for any board').not.toBe(digest(b))
  })

  it('the IN-PROGRESS initials reach the frame — the buffer being typed is drawn (HOFIN entry line)', () => {
    // While a qualifying score enters initials, the current buffer must be visible. Same
    // board, different in-progress buffer → different frame. RED until GREEN draws the entry line.
    const state = gameOverState(5, 50_000)
    const empty = composeFrame(state, LOGICAL_WIDTH, LOGICAL_HEIGHT, { board: BOARD_A, nameEntry: { buffer: '', score: 50_000 } } satisfies Hof)
    const typed = composeFrame(state, LOGICAL_WIDTH, LOGICAL_HEIGHT, { board: BOARD_A, nameEntry: { buffer: 'AB', score: 50_000 } } satisfies Hof)
    expect(digest(typed), 'the initials being entered are not drawn — the player sees no cursor/letters as they type').not.toBe(digest(empty))
  })

  it('the 3-arg call still renders the df5-6 GAME OVER / final-score screen (reads state.score, not a constant)', () => {
    // Back-compat with teeth: growing composeFrame must not disturb df3-6/df7-5's 3-arg calls.
    // A same-args self-comparison would only prove determinism (a tautology for a pure fn); instead
    // pin BEHAVIOUR — the 3-arg game-over branch (drawGameOverScreen) writes state.score, so two
    // different final scores must produce different frames. This reddens if the 3-arg path
    // regressed to a constant or to the score-independent HOF screen (mutation-tested).
    const lowScore = composeFrame(gameOverState(6, 12_345), LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const highScore = composeFrame(gameOverState(6, 99_999), LOGICAL_WIDTH, LOGICAL_HEIGHT)
    expect(
      digest(lowScore),
      'the 3-arg game-over frame no longer varies with the final score — the df5-6 GAME OVER screen regressed',
    ).not.toBe(digest(highScore))
  })
})

describe('df7-4 AC2 — the HOF display is drawn by palette INDEX only (no invented colour)', () => {
  it('every cell of the hall-of-fame frame is a valid palette index 0..15', () => {
    // AC4/df2: "colour by df2 palette index only". An index > 15 would decode as CRAM[i&0x0f],
    // a colour the palette never named. Guards the NEW HOF-screen draw (the df7-5 bezel precedent).
    const fb = composeFrame(gameOverState(7, 50_000), LOGICAL_WIDTH, LOGICAL_HEIGHT, {
      board: BOARD_A,
      nameEntry: { buffer: 'A', score: 50_000 },
    } satisfies Hof)
    let worst = 0
    for (let i = 0; i < fb.data.length; i++) if (fb.data[i] > worst) worst = fb.data[i]
    expect(worst, `a hall-of-fame cell holds palette index ${worst} > 15 — a colour the CRAM never named`).toBeLessThanOrEqual(15)
  })
})

describe('df7-4 AC4 — the hall-of-fame / name-entry presentation never full-frame strobes (ADR-0005, Decision B)', () => {
  it('opening the initials entry over the HOF screen is a bounded change, not a page invert', () => {
    // Same board; the entry line appears. That delta must not read as a full-frame luminance
    // flip. (A safety net: green-on-arrival while the delta is empty; meaningful once GREEN
    // draws the entry line. Its bite is the non-vacuity companion below.)
    const state = gameOverState(8, 50_000)
    const idle = composeFrame(state, LOGICAL_WIDTH, LOGICAL_HEIGHT, { board: BOARD_A, nameEntry: null } satisfies Hof)
    const entering = composeFrame(state, LOGICAL_WIDTH, LOGICAL_HEIGHT, { board: BOARD_A, nameEntry: { buffer: 'A', score: 50_000 } } satisfies Hof)
    expect(() => assertNoFullFrameStrobe(idle.data, entering.data)).not.toThrow()
  })

  it('the transition from the live play field to the hall-of-fame screen is not a full-frame strobe', () => {
    // The largest transition in the flow: a play frame → the hall-of-fame screen. A whole-frame
    // white-fill or 4-bit invert here would be the exact photosensitivity hazard ADR-0005 bars.
    const play = composeFrame(createSim(makeRand(9)), LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const hof = composeFrame(gameOverState(9, 50_000), LOGICAL_WIDTH, LOGICAL_HEIGHT, { board: BOARD_A, nameEntry: null } satisfies Hof)
    expect(() => assertNoFullFrameStrobe(play.data, hof.data)).not.toThrow()
  })

  it('non-vacuity: assertNoFullFrameStrobe DOES reject an actual full-frame strobe', () => {
    // Guards the two safety nets above — if the guard accepted everything, they would prove nothing.
    const base = composeFrame(gameOverState(10, 50_000), LOGICAL_WIDTH, LOGICAL_HEIGHT, { board: BOARD_A, nameEntry: null } satisfies Hof)
    const strobe = new Uint8Array(base.data.length).fill(0x0f)
    expect(() => assertNoFullFrameStrobe(base.data, strobe)).toThrow()
  })

  it('the hall-of-fame frame is deterministic — same inputs render identical pixels twice (no flicker)', () => {
    const args = [gameOverState(11, 50_000), LOGICAL_WIDTH, LOGICAL_HEIGHT, { board: BOARD_A, nameEntry: { buffer: 'AB', score: 50_000 } } satisfies Hof] as const
    expect(digest(composeFrame(...args))).toBe(digest(composeFrame(...args)))
  })
})
