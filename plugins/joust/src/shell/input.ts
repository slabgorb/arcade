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

import type { KeyMembership } from '@shared/held-keys'
import { resolveBindings, type BindingMap } from '@shared/keybind'
import { CONTROL_MANIFEST, bindingStore } from './controls'

/** Exactly what core accepts. */
export interface PlayerInput {
  dir: -1 | 0 | 1
  flap: boolean
  flapHeld: boolean
}

// sa1-5: the two players' left/right/flap defaults above are now
// CONTROL_MANIFEST's defaults (controls.ts, as p1Left/p1Right/p1Flap and
// p2Left/p2Right/p2Flap), and the live map below is resolved through
// @shared/keybind so a player's saved rebind (controls-overlay, wired in
// main.ts) overrides them. setBindings is the overlay's onChange hook — it
// swaps this module's live map in place.
let bindings: BindingMap = resolveBindings(CONTROL_MANIFEST, bindingStore.load())
export function setBindings(map: BindingMap): void {
  bindings = map
}

const any = (codes: readonly string[], held: KeyMembership): boolean => codes.some((code) => held.has(code))

function mapFrom(
  leftCodes: readonly string[],
  rightCodes: readonly string[],
  flapCodes: readonly string[],
  held: KeyMembership,
  prevFlap: boolean,
): PlayerInput {
  const left = any(leftCodes, held)
  const right = any(rightCodes, held)
  // The ROM's answer for both-at-once: neutral.
  const dir: -1 | 0 | 1 = left === right ? 0 : left ? -1 : 1
  const flapHeld = any(flapCodes, held)
  return { dir, flap: flapHeld && !prevFlap, flapHeld }
}

/**
 * @param held      key codes currently down
 * @param prevFlap  whether the flap key was down on the PREVIOUS frame — the
 *                  shell's edge memory, kept out here so this stays pure
 */
export function mapPlayer1(held: KeyMembership, prevFlap: boolean): PlayerInput {
  return mapFrom(bindings.p1Left, bindings.p1Right, bindings.p1Flap, held, prevFlap)
}

export function mapPlayer2(held: KeyMembership, prevFlap: boolean): PlayerInput {
  return mapFrom(bindings.p2Left, bindings.p2Right, bindings.p2Flap, held, prevFlap)
}
