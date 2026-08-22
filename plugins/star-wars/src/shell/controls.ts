// plugins/star-wars/src/shell/controls.ts — sa1-5. star-wars' remappable control
// manifest + its binding store + overlay chrome. Defaults are star-wars' historical
// keys (physical e.code); the store persists overrides to 'star-wars-keybinds'.
//
// The yoke (mouse aim + click) and the initials-entry letters/Backspace stay OUT
// of this manifest — they are analog / free-text input, not discrete rebindable
// controls, and input.ts leaves both paths untouched. Only the two discrete keys
// star-wars already reads — the fire trigger and the start edge — are covered.
import { makeBindingStore } from '@shared/controls-overlay'
import type { ControlManifest } from '@shared/keybind'

export const CONTROL_MANIFEST: ControlManifest = [
  { action: 'fire', label: 'FIRE', defaults: ['Space'] },
  { action: 'start', label: 'START', defaults: ['Enter', 'Digit1', 'Numpad1'] },
]
export const bindingStore = makeBindingStore('star-wars')
// Carried over from the old STAR_WARS_PAUSE card: green cockpit-HUD chrome, 0.72 dim.
export const CONTROLS_OVERLAY_OPTS = { color: '#00e600', opacity: 0.72 } as const
