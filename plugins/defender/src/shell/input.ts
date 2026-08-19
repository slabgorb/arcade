// plugins/defender/src/shell/input.ts
//
// Story df3-6 (GREEN) — the shell input adapter for Defender. The shell owns the PIA read
// (df3-3): main.ts installs a keyboard tracker via @shared/held-keys, and this pure mapper
// turns that held-key membership into the core's Input snapshot each tick. `reverse` is
// the RAW held bit — the one-press-one-flip debounce lives in the core (ship.stepReverse),
// so this carries no state and stays a pure function of the membership (joust's
// shell/input.ts precedent). The Input TYPE lives in core/sim.ts; the dependency runs
// shell → core, never the reverse.

import type { KeyMembership } from '@shared/held-keys'
import type { Input } from '../core/sim.js'

/** Key bindings per action. Each action is bound to a WASD key and an arrow/space
 *  alternative, so either scheme drives the ship. `thrust` accelerates in the facing
 *  direction; `reverse` flips the facing (debounced in the core). */
const BINDINGS: Readonly<Record<keyof Input, readonly string[]>> = {
  thrust: ['KeyD', 'ArrowRight'],
  reverse: ['KeyA', 'ArrowLeft'],
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  fire: ['Space', 'Enter'],
  // df5-7: the smart-bomb key (SBOMB) — a dedicated button, distinct from fire.
  smartBomb: ['KeyB', 'ShiftLeft'],
  // df6-1: hyperspace (HYPER) — the second emergency power, edge-debounced in the core
  // (like `reverse`). ShiftRight, not ShiftLeft, so it does not collide with smart bomb.
  hyperspace: ['KeyH', 'ShiftRight'],
}

/** Map the held-key set to the pure per-tick Input snapshot. */
export function mapInput(held: KeyMembership): Input {
  const anyHeld = (keys: readonly string[]): boolean => keys.some((k) => held.has(k))
  return {
    thrust: anyHeld(BINDINGS.thrust),
    reverse: anyHeld(BINDINGS.reverse),
    up: anyHeld(BINDINGS.up),
    down: anyHeld(BINDINGS.down),
    fire: anyHeld(BINDINGS.fire),
    smartBomb: anyHeld(BINDINGS.smartBomb),
    hyperspace: anyHeld(BINDINGS.hyperspace),
  }
}

// df7-2: the START / COIN control (ST1 *ONE PLAYER START, DEFA7.SRC:1100). Separate from
// the movement/fire bindings so it is inert during play — `Enter` for the intuitive
// keyboard "start", and `Digit1` for the arcade "1 PLAYER START" (MAME's P1-start key).
// The df7-1 machine reads this only in attract/game-over (advancePhase ignores it in
// play), so the `Enter` overlap with the fire binding is harmless: attract never fires.
const START_KEYS: readonly string[] = ['Enter', 'Digit1']

/** Is a start/coin button held this frame? Feeds `PhaseSignals.startRequested` — the
 *  attract -> setup start edge (df7-2). Pure, like `mapInput`; the shell reads it, the
 *  core decides what to do with it. */
export function startPressed(held: KeyMembership): boolean {
  return START_KEYS.some((k) => held.has(k))
}
