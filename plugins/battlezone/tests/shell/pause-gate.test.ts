// tests/shell/pause-gate.test.ts
//
// Story bz2-5 — RED phase (Furiosa / TEA). The pause feature, as pure logic the
// shell can drive without a browser. The playtest flagged two gaps: no pause and
// no on-screen control indicator (epic bz2). This pins the deterministic HEART
// of pause — key recognition, the toggle, and the frozen-frame guarantee — so
// the DOM wiring in main.ts (an Escape keydown → togglePaused → stepUnlessPaused
// + the overlay draws) is the only part left to the live playtest (bz2-6), per
// the epic's "the shell IO is verified by running the game" convention.
//
// WHY A NEW MODULE (src/shell/pause.ts): the freeze must be provably transparent
// to the pure core (AC5 — "does not mutate core simulation; resume continues
// deterministically"). That is a property of a function, not of main.ts's rAF
// loop, so the loop gate is extracted to one pure, testable seam. It lives in
// src/shell — NOT src/core — because pause is a shell/loop concern; the epic's
// non-negotiable is that the core sim stays pure and never learns it was paused.
// The core-purity sweep (which scans src/core only) therefore stays green, and
// stepGame/GameState gain no pause field.
//
// CONTRACT (the seam Dev implements to turn this GREEN):
//   INITIAL_PAUSED: boolean              — the cabinet boots into play (false)
//   isPauseKey(key: string): boolean     — true only for the (lowercased) Escape
//                                           key; the shell lowercases before
//                                           calling (KeyboardTreads convention)
//   togglePaused(paused): boolean        — a fresh Escape flips pause ↔ resume
//   stepUnlessPaused(game, input, dt, paused): GameState
//                                        — paused  → the SAME state, untouched
//                                          (frozen: no advance, no mutation)
//                                        — active  → whatever stepGame returns
import { describe, it, expect } from 'vitest'
import { INITIAL_PAUSED, isPauseKey, togglePaused, stepUnlessPaused } from '../../src/shell/pause'
import { initGame } from '../../src/core/state'
import { stepGame } from '../../src/core/sim'
import type { Input } from '../../src/core/input'

const DT = 1 / 60

describe('bz2-5 — isPauseKey: only Escape pauses', () => {
  it('recognises the (lowercased) Escape key — AC1', () => {
    // KeyboardTreads lowercases every key before dispatch, so 'Escape' arrives
    // here as 'escape'. That is the one key the pause gate answers to.
    expect(isPauseKey('escape'), "'escape' must be the pause key").toBe(true)
  })

  it('ignores every movement / fire / start key (a mis-keyed pause is unfair)', () => {
    // The paranoid edge: 'e' is the left-tread key and 'esc' is NOT the DOM key
    // name — neither may be mistaken for 'escape' via a prefix/substring slip,
    // or driving forward (or a fat-fingered chord) would freeze the game.
    const notPause = ['e', 'd', 'i', 'k', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'f', 'enter', '1', 'esc', '']
    for (const key of notPause) {
      expect(isPauseKey(key), `"${key}" must NOT pause the game`).toBe(false)
    }
  })
})

describe('bz2-5 — togglePaused: Escape flips pause ↔ resume', () => {
  it('boots unpaused and toggles in BOTH directions — AC1 + AC3', () => {
    // Boot into play, not into a frozen screen.
    expect(INITIAL_PAUSED, 'the cabinet must boot into play, not frozen').toBe(false)
    // First Escape pauses…
    const paused = togglePaused(INITIAL_PAUSED)
    expect(paused, 'first Escape pauses (AC1)').toBe(true)
    // …a second Escape resumes (a toggle, not a one-way latch — AC3).
    const resumed = togglePaused(paused)
    expect(resumed, 'second Escape resumes (AC3)').toBe(false)
  })
})

describe('bz2-5 — stepUnlessPaused: a paused frame freezes the sim', () => {
  // Get a real run underway so the drive input actually matters (attract ignores
  // the player and autopilots) — pausing MID-PLAY is the behaviour under test.
  const boot = initGame(0xbeef)
  const started = stepGame(boot, { leftTread: 0, rightTread: 0, fire: false, start: true }, DT)
  const drive: Input = { leftTread: 1, rightTread: -1, fire: true } // pivoting + firing

  it('precondition: a run is underway (not attract)', () => {
    expect(started.mode, 'start input should have begun a run').toBe('playing')
  })

  it('while paused, returns the prior state UNTOUCHED — no advance, no mutation (AC1 + AC5)', () => {
    const next = stepUnlessPaused(started, drive, DT, true)
    // Same reference ⇒ the sim did not step and nothing was mutated: stepGame
    // always builds a fresh object, so an advanced/mutated result could never be
    // reference-identical to the input.
    expect(next, 'a paused frame must not advance the sim').toBe(started)
    expect(next.modeAge, 'paused time must not accrue into the sim clock').toBe(started.modeAge)
  })

  it('while active, advances exactly as stepGame would (AC5 — resume is normal play)', () => {
    const next = stepUnlessPaused(started, drive, DT, false)
    expect(next, 'an active frame must step the sim').not.toBe(started)
    expect(next, 'an active frame must delegate to the pure core step').toStrictEqual(
      stepGame(started, drive, DT),
    )
  })

  it('is transparent: pausing then resuming continues deterministically (AC5)', () => {
    // Hold pause for several frames — the sim must be byte-identical throughout…
    let held = started
    for (let i = 0; i < 5; i++) held = stepUnlessPaused(held, drive, DT, true)
    expect(held, 'no paused frame may advance the sim').toBe(started)
    // …then resume: one active step must equal stepping ONCE from the moment we
    // paused. The pause is invisible to the core — no drift, no skipped work.
    const resumed = stepUnlessPaused(held, drive, DT, false)
    expect(resumed, 'resume must continue as if the pause never happened').toStrictEqual(
      stepGame(started, drive, DT),
    )
  })
})
