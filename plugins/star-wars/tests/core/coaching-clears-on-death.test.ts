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
    //
    // It is NOT expected to catch anything the sibling seat misses. The mechanism is worth
    // stating exactly, because the sentence that stood here stated it backwards (round-4 review
    // W2, confirmed by four parties) — and because the round-4 review's own prescribed
    // replacement, and the first attempt at it in round 5, were both wrong too, in the same
    // "reasoned rather than run" way. So this is the MEASURED version:
    //
    //   * `coaching.ts:53` is `if (s.mode !== 'playing') return null`; `coaching.ts:59` is
    //     `if (s.gameOver) return null`. The MODE check is unconditionally first.
    //   * This fixture sets both fields, so it returns at `:53` and never reaches `:59`.
    //   * Its sibling `killed` leaves the mode at `'playing'`, falls through `:53`, and is
    //     caught by `:59`.
    //   * MEASURED, not inferred — deleting `:53` reddens NOTHING, in this file or anywhere in
    //     the plugin's 2304 tests, because the only seat that reaches it also satisfies `:59`.
    //     Deleting `:59` reddens THREE seats in this file. So `:59` is covered and `:53` was
    //     not, which is the opposite of the guard order the retired sentence implied and is not
    //     what "reddens neither" would have told you either.
    //
    // What this control adds is production-faithfulness, not coverage — do not credit it with
    // more. The `:53` coverage gap it exposed is closed by the seat below, which reaches
    // `coachingFor` the way attract mode does rather than by faking a state.
    let s = killedAsShipped(coached())
    expect(s.mode, 'fixture: this is the literal shape sim.ts writes on the last life').toBe('gameover')
    for (let i = 0; i < 120; i++) s = stepGame(s, NO_INPUT, DT)
    expect(s.coaching, 'the hint must not outlive the run in the real shape either').toBeNull()
  })

  it('the mode guard is load-bearing on the ATTRACT path, which nothing exercised', () => {
    // Added at sw8-27 round 5, from a measurement the W2 rework forced: deleting
    // `coaching.ts:53` reddened not one of the plugin's 2304 tests. That guard is not
    // defensive — `stepGame`'s attract branch (`sim.ts:206-217`) returns through
    // `finalizeFrame`, and `finalizeFrame` re-derives `coaching` at `sim.ts:800`, so
    // `coachingFor` IS called with `mode: 'attract'` and `gameOver: false` on a live path. With
    // `:53` gone, the idle screen carries a flight hint. The gap was that every seat above
    // reaches `coachingFor` with `gameOver` already set, so `:59` covered for it.
    //
    // Driven through `stepGame` rather than by calling `coachingFor` directly, so it pins the
    // OBSERVABLE the way the rest of this file does and cannot pass on a state the game never
    // builds. The route is the cabinet's own: die, then press start on the game-over screen,
    // which `sim.ts:252-262` answers with `mode: 'attract', gameOver: false`. `initialState`
    // opens in `'playing'`, not in attract — the first attempt at this seat assumed otherwise
    // and its fixture guard is what said so.
    let s = killedAsShipped(coached())
    for (let i = 0; i < 5; i++) s = stepGame(s, NO_INPUT, DT)
    expect(s.mode, 'fixture: the run is over and holding').toBe('gameover')
    s = stepGame(s, { ...NO_INPUT, start: true }, DT)

    // The conditions that make `:53` the ONLY guard standing: the run is not over, and the wave
    // is 1, so neither `:59` nor the SC.FWV gate at `:61` can be what returns null here.
    expect(s.mode, 'fixture: start on the game-over screen returns to the attract screen').toBe('attract')
    expect(s.gameOver, 'fixture: and clears the flag in the same literal, so :59 lets this through').toBe(false)
    expect(s.wave, 'fixture: on wave 1, so the SC.FWV gate at :61 lets it through too').toBe(1)
    expect(s.phase, 'fixture: and in the space phase, which is the branch that returns a hint').toBe('space')

    expect(s.coaching, 'the idle screen is not being coached: the cabinet hints during PLAY').toBeNull()
    for (let i = 0; i < 120; i++) s = stepGame(s, NO_INPUT, DT)
    expect(s.mode, 'fixture: still attracting — the button was released').toBe('attract')
    expect(s.coaching, 'and it stays uncoached, frame after frame, the way the attract screen runs').toBeNull()
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
