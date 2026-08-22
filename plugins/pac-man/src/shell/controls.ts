// plugins/pac-man/src/shell/controls.ts — sa1-5. pac-man's remappable control
// manifest + its binding store + overlay chrome. Defaults are pac-man's historical
// keys, translated from the old e.key.toLowerCase() literals (main.ts's DIR_KEYS
// + START_KEYS, pre-sa1-5) into physical e.code — behaviour-identical on QWERTY,
// and now correctly rebindable regardless of layout. The store persists overrides
// to 'pac-man-keybinds'.
import { makeBindingStore } from '@shared/controls-overlay'
import type { ControlManifest } from '@shared/keybind'

export const CONTROL_MANIFEST: ControlManifest = [
  { action: 'up', label: 'UP', defaults: ['ArrowUp', 'KeyW'] },
  { action: 'down', label: 'DOWN', defaults: ['ArrowDown', 'KeyS'] },
  { action: 'left', label: 'LEFT', defaults: ['ArrowLeft', 'KeyA'] },
  { action: 'right', label: 'RIGHT', defaults: ['ArrowRight', 'KeyD'] },
  // The old START_KEYS also included the legacy 'spacebar' e.key alias (some
  // older browsers reported it instead of ' ' for the space bar) — moot now
  // that binding is by physical code, which is unambiguous regardless of what
  // string a browser reports for e.key.
  { action: 'start', label: 'START', defaults: ['Space', 'Digit1', 'Digit5'] },
]
export const bindingStore = makeBindingStore('pac-man')
// Carried over from the old PAC_MAN_PAUSE card: pac-man's banner yellow, 0.72 dim.
export const CONTROLS_OVERLAY_OPTS = { color: '#ffff00', opacity: 0.72 } as const
