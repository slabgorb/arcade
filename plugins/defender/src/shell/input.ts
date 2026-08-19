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
  }
}
