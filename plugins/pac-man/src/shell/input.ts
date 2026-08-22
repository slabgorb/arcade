// src/shell/input.ts
//
// sa1-5: the held-direction sampling + start/coin latch, extracted out of
// main.ts and now reading through @shared/keybind's resolveBindings so a
// player's saved rebind (the controls overlay, wired in main.ts) overrides
// pac-man's defaults. setBindings is the overlay's onChange hook — it swaps
// this module's live map in place.
//
// Pre-sa1-5 this tracked held keys by `e.key.toLowerCase()` (installHeldKeys'
// `idOf` override) because DIR_KEYS was keyed on lower-cased e.key literals
// ('arrowup', 'w', ...). Rebinding requires a PHYSICAL key (e.code), so the
// idOf override is dropped — installHeldKeys' default idOf is already `e.code`
// — and every held-check below now compares against bound codes instead.
// Behaviour-identical on a QWERTY layout, and correctly rebindable everywhere.
import { installHeldKeys } from '@shared/held-keys'
import { resolveBindings, type BindingMap } from '@shared/keybind'
import type { Dir } from '../core/actor'
import { CONTROL_MANIFEST, bindingStore } from './controls'

let bindings: BindingMap = resolveBindings(CONTROL_MANIFEST, bindingStore.load())
export function setBindings(map: BindingMap): void {
  bindings = map
}

const keys = installHeldKeys(window)

/** Newest-held-wins is unrecoverable from a Set alone (no press order), so this
 *  samples in a fixed priority order — up, down, left, right — good enough for
 *  a keyboard (a real joystick reports one direction at a time anyway; pacman's
 *  own `pending` latch is what makes an early turn "stick" until it opens). */
export function currentDir(): Dir {
  for (const action of ['up', 'down', 'left', 'right'] as const) {
    if (keys.any(bindings[action])) return action
  }
  return 'none'
}

// pm4-6: the start/coin latch. Set on a start-key press, consumed by the sim
// input in main.ts on the next sub-step, so exactly one `start: true` reaches
// `stepGame` per press. The core only acts on it in `attract` (advance ->
// ready + reseed); it is inert everywhere else, so no phase logic lives here.
let startPressed = false
window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (bindings.start.includes(e.code)) startPressed = true
})

/** Read and clear the start/coin latch — one `start: true` per key press. */
export function consumeStart(): boolean {
  const pressed = startPressed
  startPressed = false
  return pressed
}
