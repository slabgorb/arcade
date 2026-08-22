// plugins/battlezone/src/shell/controls.ts — sa1-5. battlezone's remappable
// control manifest + its binding store + overlay chrome.
//
// battlezone has NO clean key table (unlike the sibling games): shell/input.ts
// wove the arithmetic for TWO control schemes directly into `if (held('e'))
// left += 1`-style axis math, keyed on `e.key.toLowerCase()` characters. This
// manifest names every distinct control the old arithmetic read, one action
// per physical key the player could press, with defaults converted from the
// old character to the equivalent physical `e.code`:
//
//   old idOf: e.key.toLowerCase()      new default: e.code
//   ----------------------------      -----------------------
//   'e' (arcade left-tread fwd)    -> 'KeyE'
//   'd' (arcade left-tread back)   -> 'KeyD'
//   'i' (arcade right-tread fwd)   -> 'KeyI'
//   'k' (arcade right-tread back)  -> 'KeyK'
//   'arrowup' (friendly forward)   -> 'ArrowUp'
//   'arrowdown' (friendly back)    -> 'ArrowDown'
//   'arrowleft' (friendly pivot)   -> 'ArrowLeft'
//   'arrowright' (friendly pivot)  -> 'ArrowRight'
//   ' ' / 'f' (fire)               -> 'Space' / 'KeyF'
//   'shift' (fine-aim)             -> 'ShiftLeft' / 'ShiftRight'
//   'enter' / '1' (start, edge)    -> 'Enter' / 'Digit1'
//
// Both control schemes stay live and independently rebindable — a player can
// rebind the arcade dual-tread keys without touching the friendly arrow
// scheme, or vice versa; input.ts ORs whichever axis(es) are held.
import { makeBindingStore } from '@shared/controls-overlay'
import type { ControlManifest } from '@shared/keybind'

export const CONTROL_MANIFEST: ControlManifest = [
  // Arcade dual-tread (authentic cabinet muscle memory).
  { action: 'leftTreadFwd', label: 'LEFT TREAD FWD', defaults: ['KeyE'] },
  { action: 'leftTreadBack', label: 'LEFT TREAD BACK', defaults: ['KeyD'] },
  { action: 'rightTreadFwd', label: 'RIGHT TREAD FWD', defaults: ['KeyI'] },
  { action: 'rightTreadBack', label: 'RIGHT TREAD BACK', defaults: ['KeyK'] },
  // Friendly arrows (combined drive).
  { action: 'forward', label: 'FORWARD', defaults: ['ArrowUp'] },
  { action: 'back', label: 'BACK', defaults: ['ArrowDown'] },
  { action: 'pivotLeft', label: 'PIVOT LEFT', defaults: ['ArrowLeft'] },
  { action: 'pivotRight', label: 'PIVOT RIGHT', defaults: ['ArrowRight'] },
  // Shared controls.
  { action: 'fire', label: 'FIRE', defaults: ['Space', 'KeyF'] },
  { action: 'fineAim', label: 'FINE AIM', defaults: ['ShiftLeft', 'ShiftRight'] },
  { action: 'start', label: 'START', defaults: ['Enter', 'NumpadEnter', 'Digit1'] },
]
export const bindingStore = makeBindingStore('battlezone')
// Carried over from the old PAUSE_LINES card: battlezone's signature phosphor
// green (GLOW_GREEN, render.ts) and the bz2-5 0.72 dim.
export const CONTROLS_OVERLAY_OPTS = { color: '#33ff66', opacity: 0.72 } as const
