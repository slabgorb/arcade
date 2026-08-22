// plugins/asteroids/src/shell/controls.ts — sa1-5. asteroids' remappable control
// manifest + its binding store + overlay chrome. Defaults are asteroids' historical
// KEYS (physical e.code); the store persists overrides to 'asteroids-keybinds'.
import { makeBindingStore } from '@shared/controls-overlay'
import type { ControlManifest } from '@shared/keybind'

export const CONTROL_MANIFEST: ControlManifest = [
  { action: 'left', label: 'ROTATE LEFT', defaults: ['ArrowLeft', 'KeyA'] },
  { action: 'right', label: 'ROTATE RIGHT', defaults: ['ArrowRight', 'KeyD'] },
  { action: 'thrust', label: 'THRUST', defaults: ['ArrowUp', 'KeyW'] },
  { action: 'fire', label: 'FIRE', defaults: ['Space', 'KeyK'] },
  { action: 'hyperspace', label: 'HYPERSPACE', defaults: ['ArrowDown', 'KeyS', 'ShiftLeft', 'ShiftRight'] },
  { action: 'start', label: 'START', defaults: ['Enter', 'NumpadEnter', 'Space'] },
]
export const bindingStore = makeBindingStore('asteroids')
// Carried over from the old ASTEROIDS_PAUSE card: white vector chrome, 0.72 dim.
export const CONTROLS_OVERLAY_OPTS = { color: '#ffffff', opacity: 0.72 } as const
