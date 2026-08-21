// src/shell/input.ts
//
// Story bz1-4 — keyboard → tread-axis mapping. IO only: the pure core reads
// abstract tread axes (core/input.ts); this shell layer owns the device
// bindings. Two mappings ship, both feeding the same Input:
//   * Arcade (authentic cabinet muscle memory): E/D = left tread fwd/back,
//     I/K = right tread fwd/back — the dual-stick control the cabinet used.
//   * Friendly (arrow keys), for players without that muscle memory: Up/Down
//     drive both treads, Left/Right pivot — combined so Up+Left arcs.
// The cannon fires on Space (or F) — the cabinet's thumb trigger (bz1-5).
// Enter (or 1) starts a run (bz1-10) — EDGE-latched here, the sibling
// pendingStart pattern: one keydown becomes exactly one start:true frame, so
// a held key can never machine-gun the framing state machine.
// Hold Shift for fine-aim (bz2-4): a held precision modifier — the core scales
// the tank's yaw down for lining up a distant shot. Level-read like the treads.
//
// sa1-5: every one of the above is now a rebindable CONTROL_MANIFEST action
// (./controls.ts) resolved through @shared/keybind — the fleet-wide key
// rebinding story. battlezone had no clean key table (the arithmetic above was
// woven directly onto `e.key.toLowerCase()` characters), so this is a from-code
// reconstruction: each `held('x')` read below became `keys.any(bindings.action)`,
// keyed on the shared held-keys tracker's DEFAULT idOf (e.code) instead of the
// old idOf override — a rebind captures a physical code (@shared/controls-overlay),
// so the live read must key on the same axis or a captured code could never match.
//
// Not unit-tested (shell convention — this repo family verifies IO by running
// the game); the :5276 eyeball check covers the firing feel.

import type { Input } from '../core/input'
import { installHeldKeys, type HeldKeysHandle } from '@shared/held-keys'
import { resolveBindings, type BindingMap } from '@shared/keybind'
import { CONTROL_MANIFEST, bindingStore } from './controls'

export interface KeyboardTreads {
  /** The current tread axes, clamped to [-1, 1]. */
  read(): Input
}

// sa1-5: the live map, seeded from any persisted override and swapped in place
// by the controls overlay's onChange hook (main.ts) — the same pattern every
// sibling game's shell/input.ts follows.
let bindings: BindingMap = resolveBindings(CONTROL_MANIFEST, bindingStore.load())
export function setBindings(map: BindingMap): void {
  bindings = map
}

// SH4-2: this was a class owning its own `down` Set + keydown/keyup. Unwrapped
// to a factory (the host-helpers idiom) over the shared held-keys tracker.
// sa1-5: idOf is now the tracker's DEFAULT (e.code) — the old `e.key.toLowerCase()`
// override is dropped so a rebind (which captures a physical code) can match what
// is held. `target` is a REQUIRED seam: the old `= window` default was the mg1-5
// "fails OPEN" hazard (an optional injection point degrading to the real
// global). Blur now clears the held keys (new — the hand-rolled version never
// reset). The retained keydown keeps ONLY the start EDGE latch (one keydown =
// one start frame). `keys.uninstall()` is the disposer this closes over.
export function createKeyboardTreads(target: Window): KeyboardTreads {
  const keys: HeldKeysHandle = installHeldKeys(target)
  let pendingStart = false
  target.addEventListener('keydown', (e) => {
    // Edge, not level: only a fresh press (not a key-repeat) arms start.
    if (bindings.start.includes(e.code) && !e.repeat) pendingStart = true
  })

  return {
    read(): Input {
      let left = 0
      let right = 0

      // Arcade dual-tread: E/D left tread, I/K right tread.
      if (keys.any(bindings.leftTreadFwd)) left += 1
      if (keys.any(bindings.leftTreadBack)) left -= 1
      if (keys.any(bindings.rightTreadFwd)) right += 1
      if (keys.any(bindings.rightTreadBack)) right -= 1

      // Friendly arrow "drive": Up/Down both treads, Left/Right pivot.
      if (keys.any(bindings.forward)) {
        left += 1
        right += 1
      }
      if (keys.any(bindings.back)) {
        left -= 1
        right -= 1
      }
      if (keys.any(bindings.pivotLeft)) {
        left -= 1
        right += 1
      }
      if (keys.any(bindings.pivotRight)) {
        left += 1
        right -= 1
      }

      // Space (or F) fires the cannon; the latched start edge is consumed
      // here — true for exactly this one frame. Shift held = fine-aim (bz2-4),
      // a level read like the treads.
      const start = pendingStart
      pendingStart = false
      return {
        leftTread: clamp(left),
        rightTread: clamp(right),
        fire: keys.any(bindings.fire),
        start,
        fineAim: keys.any(bindings.fineAim),
      }
    },
  }
}

function clamp(v: number): number {
  return v < -1 ? -1 : v > 1 ? 1 : v
}
