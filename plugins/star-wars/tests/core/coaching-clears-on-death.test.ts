// tests/core/coaching-clears-on-death.test.ts
//
// sw7-10 REWORK RED — H-022: the coaching hint must not survive the player's death.
//
// WHY THIS FILE EXISTS (round-1 finding F3). `GameState.coaching`'s docstring promises
// the hint is "derived fresh every active-play step by `coachingFor` — never accumulated,
// so it cannot get stuck on screen." That claim is FALSE, and it was proven by probe, not
// by reading:
//
//   * `coaching` is a STORED field, re-derived in exactly one place — `finalizeFrame`.
//   * The game-over branch (`sim.ts:221`, `if (state.mode === 'gameover' || state.gameOver)`)
//     returns EARLY, so that one place never runs and whatever string was live at the
//     moment of death stays on the state untouched.
//   * `render.ts` draws whatever the state carries, so it goes on screen.
//
// Net: die on wave 1 and "SHOOT FIREBALLS" freezes on screen over a frozen battlefield,
// permanently, until the player presses start. Measured: 120 frames after death the hint
// is still set and `starfield[0]` is bit-identical. Dying on wave 1 is the COMMON case
// for the player the hint exists to help.
//
// This is the one round-1 finding that is a live behaviour defect rather than prose, so
// this suite is a TRUE RED — it fails against today's implementation.
//
// The fix is Dev's to choose (clear `coaching` on the game-over branch, or run the frame
// finalizer there too). These tests pin the OBSERVABLE, not the mechanism.
//
// == CORRECTED at sw8-27 round 2 (review finding R6) =================================
//
// The three bullets above used to open on a different mechanism: that production "signals
// death with `gameOver: true` while `mode` stays `'playing'`", citing `sim.ts:567`, `:937`,
// `:1185` and `:1344`, and asserting that NOTHING in `src/` ever assigns `mode: 'gameover'`
// — only test fixtures do.
//
// All of that is false, and none of the four line numbers landed on gameOver-related code
// (they were a `Set` construction, a docstring, a closing brace and an `events` field).
// `sim.ts` assigns `mode: lives <= 0 ? 'gameover' : …` at FOUR sites, each in the same
// object literal as its `gameOver:` sibling — so the two move together and the mode does
// not stay `'playing'`. The four sites are present in the monorepo import commit
// (`0070e26`), so the claim was already false before sw8-27 opened the file; whether it was
// false when sw7-10 wrote it is in the archived star-wars history, which this repo squashed.
//
// Nothing in the suite below changes, because the freeze never depended on the mode: it
// depends on the early return skipping the re-derivation, which is what the bullets now
// say. The mirror of this paragraph in `src/core/coaching.ts` is RED for Dev, guarded by
// `tests/audit/sw8-27-remediation.test.ts` — which also re-opens every `sim.ts:N` the
// paragraph cites, so the next stale anchor fails instead of being re-shifted.
import { describe, it, expect } from 'vitest'
import { initialState, type GameState } from '../../src/core/state'
import { stepGame } from '../../src/core/sim'
import { NO_INPUT } from '../../src/core/input'

const DT = 1 / 60

/** A first-wave space frame that has been stepped once, so a hint is live. */
function coached(): GameState {
  const s = stepGame(initialState(1983), NO_INPUT, DT)
  // Fixture guard: if this ever stops being true the suite below proves nothing.
  expect(s.mode, 'fixture: must be in active play').toBe('playing')
  expect(s.wave, 'fixture: the hint is first-wave only').toBe(1)
  expect(s.coaching, 'fixture: a first-wave space frame must carry a hint').toBeTruthy()
  return s
}

/** Death with the mode LEFT ALONE — deliberately NOT the shape production writes.
 *
 *  Production sets `mode: 'gameover'` in the same literal as `gameOver: true`, so this
 *  fixture is a state the game never actually reaches. That is the point, and the
 *  implication runs the safe way: with the mode still `'playing'` the only thing that can
 *  end the run is `gameOver`, so nothing below can pass because a mode check cleared the
 *  hint for it. A suite that clears here clears for production too. `killedAsShipped`
 *  is the control that proves the real shape is not somehow WORSE. */
function killed(s: GameState): GameState {
  return { ...s, lives: 0, gameOver: true }
}

/** Death exactly as `sim.ts` writes it — both fields, in one literal. */
function killedAsShipped(s: GameState): GameState {
  return { ...s, lives: 0, gameOver: true, mode: 'gameover' }
}

describe('sw7-10 F3 — the coaching hint clears when the run ends', () => {
  it('a dead player is not still being coached', () => {
    let s = killed(coached())
    for (let i = 0; i < 120; i++) s = stepGame(s, NO_INPUT, DT)
    expect(
      s.coaching,
      'the hint must not outlive the run — a dead pilot cannot SHOOT FIREBALLS',
    ).toBeNull()
  })

  it('clears on the very first step after death, not eventually', () => {
    const s = stepGame(killed(coached()), NO_INPUT, DT)
    expect(s.coaching, 'the hint must clear immediately, not linger for a frame').toBeNull()
  })

  it('CONTROL — and it clears for the shape production actually writes, mode included', () => {
    // Added at sw8-27 round 2 alongside R6. Every seat above kills with the mode left at
    // `'playing'`, which is not a state `sim.ts` produces — it writes `mode: 'gameover'` in
    // the same literal as `gameOver: true`. The conservative seat is the right default
    // (see `killed`), but a fixture production never writes needs a control that says so,
    // or the suite is a statement about a hypothetical state machine.
    let s = killedAsShipped(coached())
    expect(s.mode, 'fixture: this is the literal shape sim.ts writes on the last life').toBe('gameover')
    for (let i = 0; i < 120; i++) s = stepGame(s, NO_INPUT, DT)
    expect(s.coaching, 'the hint must not outlive the run in the real shape either').toBeNull()
  })

  it('the docstring promise holds: the hint is never ACCUMULATED across the death boundary', () => {
    // The specific failure shape: whatever string was live at the moment of death must not
    // be the string still sitting in state many frames later.
    const alive = coached()
    const stale = alive.coaching
    let s = killed(alive)
    for (let i = 0; i < 60; i++) s = stepGame(s, NO_INPUT, DT)
    expect(s.coaching, `the pre-death hint (${stale}) must not persist`).not.toBe(stale)
  })
})

describe('sw7-10 F3 — the game-over hold does not freeze the rest of the frame furniture', () => {
  it('the starfield keeps drifting while the run is over', () => {
    // Same root cause: the game-over branch skips `finalizeFrame`, so the sky stops dead.
    // The attract screen drifts and the cabinet never shows a frozen sky, so neither
    // should the end-of-run hold.
    let s = killed(coached())
    const before = JSON.stringify(s.starfield[0])
    for (let i = 0; i < 60; i++) s = stepGame(s, NO_INPUT, DT)
    expect(
      JSON.stringify(s.starfield[0]),
      'the WSSTAR field must not freeze when the run ends',
    ).not.toBe(before)
  })
})
