// plugins/red-baron/src/shell/controls.ts — sa1-5. red-baron's remappable
// control manifest + its binding store + overlay chrome.
//
// Defaults are red-baron's historical yoke, translated from the old CONTROL_KEYS
// / readInput literals (main.ts, pre-sa1-5) into physical e.code:
//
//   old e.key literal(s)        action    new e.code default(s)
//   ------------------------    ------    ---------------------------
//   'ArrowLeft', 'a', 'A'       left      ['ArrowLeft', 'KeyA']
//   'ArrowRight', 'd', 'D'      right     ['ArrowRight', 'KeyD']
//   'ArrowUp', 'w', 'W'         up        ['ArrowUp', 'KeyW']
//   'ArrowDown', 's', 'S'       down      ['ArrowDown', 'KeyS']
//   ' ' (Space)                 fire      ['Space']
//
// The old table carried both letter cases only because it tracked `e.key`
// (shift flips 'a' to 'A'); a physical code has no case, so each pair collapses
// to one entry — behaviour-identical on QWERTY, and now correctly rebindable
// regardless of layout. The store persists overrides to 'red-baron-keybinds'.
import { makeBindingStore } from '@shared/controls-overlay'
import type { ControlManifest } from '@shared/keybind'

export const CONTROL_MANIFEST: ControlManifest = [
  { action: 'left', label: 'TURN LEFT', defaults: ['ArrowLeft', 'KeyA'] },
  { action: 'right', label: 'TURN RIGHT', defaults: ['ArrowRight', 'KeyD'] },
  { action: 'up', label: 'CLIMB', defaults: ['ArrowUp', 'KeyW'] },
  { action: 'down', label: 'DIVE', defaults: ['ArrowDown', 'KeyS'] },
  { action: 'fire', label: 'FIRE', defaults: ['Space'] },
]
export const bindingStore = makeBindingStore('red-baron')
// Carried over from the old RED_BARON_PAUSE card: red-baron's cabinet green, 0.72 dim.
export const CONTROLS_OVERLAY_OPTS = { color: '#33ff66', opacity: 0.72 } as const
