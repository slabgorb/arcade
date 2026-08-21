// plugins/red-baron/src/shell/input.ts
//
// sa1-5: the yoke's held-key sampling, extracted out of main.ts and now reading
// through @shared/keybind's resolveBindings so a player's saved rebind (the
// controls overlay, wired in main.ts) overrides red-baron's defaults.
// setBindings is the overlay's onChange hook — it swaps this module's live
// map in place.
//
// Pre-sa1-5 this tracked held keys by RAW `e.key` (installHeldKeys's `idOf`
// override) because CONTROL_KEYS listed literal characters ('a', 'A', 'd', 'D',
// ' ', ...) alongside the arrow-key names — every letter needed BOTH cases
// because Shift flips 'a' to 'A' in e.key. Rebinding requires a PHYSICAL key
// (e.code), so the idOf override is dropped — installHeldKeys' default idOf is
// already `e.code`, which has no case — and every held-check below now compares
// against bound codes instead. Behaviour-identical on a QWERTY layout, and
// correctly rebindable everywhere.
import { installHeldKeys, type HeldKeysHandle } from '@shared/held-keys'
import { resolveBindings, type BindingMap } from '@shared/keybind'
import { CONTROL_MANIFEST, bindingStore } from './controls'

let bindings: BindingMap = resolveBindings(CONTROL_MANIFEST, bindingStore.load())
export function setBindings(map: BindingMap): void {
  bindings = map
}

// Keys the browser would otherwise scroll the page with — the cabinet owns them.
const SCROLL_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'])

// SH4-2: the shared held-keys tracker replaces the hand-rolled Set +
// keydown/keyup. Default idOf (e.code) so the same physical key is tracked
// regardless of Shift/layout; arrows and Space preventDefault so they fly
// rather than scroll; blur clears the held set so a key does not stick across
// an alt-tab.
const keys: HeldKeysHandle = installHeldKeys(window, { preventDefaultFor: SCROLL_KEYS })

const axis = (pos: boolean, neg: boolean): number => (pos ? 1 : 0) - (neg ? 1 : 0)

/** The pilot's yoke sampled from the held physical keys, through the live rebound
 *  map: lateral turn (right positive), pitch (up positive), and whether fire is held. */
export function sampleYoke(): { turn: number; pitch: number; fireHeld: boolean } {
  return {
    turn: axis(keys.any(bindings.right), keys.any(bindings.left)),
    pitch: axis(keys.any(bindings.up), keys.any(bindings.down)),
    fireHeld: keys.any(bindings.fire),
  }
}
