// plugins/missile-command/tests/mc6-7-pause-fire-gate.test.ts
//
// Story mc6-7 — gate player fire/input while the game is PAUSED. mc6-3 landed the
// PAUSE phase: `togglePause` (core/state.ts), the `stepGame` freeze branch, the
// `pauseFromKey` shell binding and the pause overlay. But mc6-3's Heimdall review
// filed a forward finding — the sim freeze is correct, yet the SHELL fire path is
// still ungated: `fireOrStart` (src/shell/input.ts) guards `entry`, `attract` and
// `over`, but NOT `pause`. So while paused a fire key (Z/X/C) falls straight through
// to `fireFromKey`, which spends a round, appends an ABM and emits a `launched`
// soundEvent — a missile launches under the pause overlay.
//
// ─── GROUND TRUTH ────────────────────────────────────────────────────────────
// The ROM's MAINLINE dispatches on STATE's sign: while STATE is S.PAUS it JSRs the
// PAUSE handler (its own routine, W3MAIN.MAC:615/:617), NOT PLAY — so ABMLAU (the
// launch path) never runs during pause. A paused frame advances only the display
// timer; no input spends ammo or queues a launch. mc6-7 makes the shell match that:
// `fireOrStart` (and the composed `keydownReducer` main.ts drives) must no-op when
// the phase is `'pause'`, exactly as it already does for `'entry'`.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// These assert against the REAL, existing `fireOrStart`/`keydownReducer` (both are
// built — mc6-3/mc7-3). Today they FIRE while paused, so the "launches nothing"
// expectations fail hard until Dev adds the `phase === 'pause'` guard. The CONTROL
// group proves the gate is real, not an inert board: the SAME fixture in `'play'`
// still launches. No new numeric constant, no new claim (shell-only, like mc6-3's
// pauseFromKey and mc7-3's entry fire-guard).

import { describe, it, expect } from 'vitest'
import { createPlayGame, type GameState } from '../src/core/game.js'
import { fireOrStart, keydownReducer } from '../src/shell/input.js'

// Z/X/C — the three base fire keys (fireKeyToBase, src/shell/input.ts). All three
// bases start alive with full ammo in createPlayGame(1), so each key genuinely fires
// in 'play' (the CONTROL) and each must be inert in 'pause' (the gate).
const FIRE_KEYS = ['z', 'x', 'c'] as const

/** A live, fire-ready mid-battle game frozen at 'pause': full ammo, cursor set, no
 *  ABMs in flight, quiet sound channel — so ANY launch during pause shows up as an
 *  added ABM, spent ammo, or a `launched` soundEvent. */
const paused = (): GameState => ({ ...createPlayGame(1), phase: 'pause', abms: [], soundEvents: [] })

/** The identical fixture, differing ONLY in phase — the live control. */
const playing = (): GameState => ({ ...createPlayGame(1), phase: 'play', abms: [], soundEvents: [] })

// ═════════════════════════════════════════════════════════════════════════════
// fireOrStart is inert while paused — no ammo, no ABM, no launch cue.
// ═════════════════════════════════════════════════════════════════════════════
describe('mc6-7 — fireOrStart no-ops while phase is pause', () => {
  it.each(FIRE_KEYS)(
    "a fire key '%s' during pause spends no ammo, launches no ABM, sounds nothing",
    (key) => {
      const before = paused()
      const after = fireOrStart(key, before)
      expect(after.abms, 'no ABM may launch while paused').toEqual(before.abms)
      expect(after.bases, 'no round may be spent while paused').toEqual(before.bases)
      expect(after.soundEvents, 'no launch/klaxon cue while paused').toEqual(before.soundEvents)
      expect(after.phase, 'the phase stays paused').toBe('pause')
    },
  )

  it('returns the paused state unchanged by value (the whole board is held)', () => {
    const before = paused()
    expect(fireOrStart('z', before)).toEqual(before)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// The COMPOSED seam main.ts actually drives on every keydown:
// pauseFromKey → nameEntryFromKey → fireOrStart. A paused fire key must reach none
// of the launch path. (test the seam the user invokes, not only the unit.)
// ═════════════════════════════════════════════════════════════════════════════
describe('mc6-7 (composed) — keydownReducer does not fire while paused', () => {
  it.each(FIRE_KEYS)("a fire key '%s' through keydownReducer while paused launches nothing", (key) => {
    const before = paused()
    const after = keydownReducer(key, before)
    expect(after.abms, 'no ABM may launch under the pause overlay').toEqual(before.abms)
    expect(after.bases, 'no round may be spent under the pause overlay').toEqual(before.bases)
    expect(after.soundEvents, 'no launch/klaxon cue under the pause overlay').toEqual(before.soundEvents)
    expect(after.phase, 'the phase stays paused').toBe('pause')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// CONTROL — the SAME board in 'play' DOES fire. Proves the gate above tests a real
// suppression, not an inert fixture that never fires in the first place.
// ═════════════════════════════════════════════════════════════════════════════
describe('mc6-7 CONTROL — the same board in play still fires (the gate is real)', () => {
  it.each(FIRE_KEYS)("a fire key '%s' in play launches an ABM and spends a round", (key) => {
    const before = playing()
    const after = fireOrStart(key, before)
    expect(after.abms.length, 'a live fire launches one ABM').toBe(before.abms.length + 1)
    expect(
      after.soundEvents.some((e) => e.type === 'launched'),
      'a live fire sounds the launch cue',
    ).toBe(true)
  })
})
