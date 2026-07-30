// src/shell/input.ts
//
// Story jt1-6 (GREEN, Julia) — keyboard to the core input contract. SHELL: it
// owns the device, the key names and the edge detection; core sees only
// {dir, flap, flapHeld}.
//
// ─── BOTH DIRECTIONS HELD IS NEUTRAL ─────────────────────────────────────────
// The ROM normalises its two joystick bits with `ANDA #$03 / ASRA / SBCA #0`
// (JOUSTRV4.SRC:7261-7263), which maps raw 0 -> 0, 1 -> -1, 2 -> +1 and 3 -> 0.
// Holding LEFT and RIGHT together is therefore NEUTRAL, not "last pressed
// wins" — a shell that tracked press order would feel subtly different from the
// machine, and it is the kind of difference nobody can name afterwards.
//
// ─── FLAP IS AN EDGE, HELD IS A LEVEL ────────────────────────────────────────
// `flap` is true only on the frame the button goes released -> pressed: it
// applies the impulse once. `flapHeld` is the LEVEL, and it selects which
// gravity of the pair applies — wings down while held, wings up when released.
// Both are needed; neither substitutes for the other.

/** Exactly what core accepts. */
export interface PlayerInput {
  dir: -1 | 0 | 1
  flap: boolean
  flapHeld: boolean
}

/** One player's physical bindings. */
interface Binding {
  left: string
  right: string
  flap: string
}

/** Player 1: arrow keys and space. */
const PLAYER_1: Binding = { left: 'ArrowLeft', right: 'ArrowRight', flap: 'Space' }
/** Player 2: A / D and left shift — disjoint from P1 so neither steals keys. */
const PLAYER_2: Binding = { left: 'KeyA', right: 'KeyD', flap: 'ShiftLeft' }

function map(binding: Binding, held: ReadonlySet<string>, prevFlap: boolean): PlayerInput {
  const left = held.has(binding.left)
  const right = held.has(binding.right)
  // The ROM's answer for both-at-once: neutral.
  const dir: -1 | 0 | 1 = left === right ? 0 : left ? -1 : 1
  const flapHeld = held.has(binding.flap)
  return { dir, flap: flapHeld && !prevFlap, flapHeld }
}

/**
 * @param held      key codes currently down
 * @param prevFlap  whether the flap key was down on the PREVIOUS frame — the
 *                  shell's edge memory, kept out here so this stays pure
 */
export function mapPlayer1(held: ReadonlySet<string>, prevFlap: boolean): PlayerInput {
  return map(PLAYER_1, held, prevFlap)
}

export function mapPlayer2(held: ReadonlySet<string>, prevFlap: boolean): PlayerInput {
  return map(PLAYER_2, held, prevFlap)
}
