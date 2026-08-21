// plugins/centipede/src/shell/controls.ts — sa1-5. centipede's remappable
// control manifest + its binding store + overlay chrome. input.ts's keyboard
// path read e.key ('ArrowLeft'/'ArrowRight'/'ArrowUp'/'ArrowDown'/'d'/'D'/…/
// ' '/'Spacebar'/'Enter'), which is NOT what resolveBindings deals in —
// bindings are physical e.code fleet-wide, per @shared/keybind's Binding doc
// comment — so the defaults below are the e.code equivalents (KeyD/KeyA/KeyW/
// KeyS, Space) and input.ts's createKeyboardAdapter now matches on e.code
// instead of e.key.
//
// The TRACKBALL/MOUSE path (createMouseAdapter) is analog, not a discrete key
// — it carries no manifest entry and is untouched by this story.
import { makeBindingStore } from '@shared/controls-overlay'
import type { ControlManifest } from '@shared/keybind'

export const CONTROL_MANIFEST: ControlManifest = [
  { action: 'right', label: 'GUN RIGHT', defaults: ['ArrowRight', 'KeyD'] },
  { action: 'left', label: 'GUN LEFT', defaults: ['ArrowLeft', 'KeyA'] },
  { action: 'up', label: 'GUN UP', defaults: ['ArrowUp', 'KeyW'] },
  { action: 'down', label: 'GUN DOWN', defaults: ['ArrowDown', 'KeyS'] },
  { action: 'fire', label: 'FIRE', defaults: ['Space'] },
  // cp4-5: the keyboard port of the ROM's 1-player START button (START1,
  // CENTI4.MAC:833-836) — a separate control from the gun.
  { action: 'start', label: 'START', defaults: ['Enter'] },
]
export const bindingStore = makeBindingStore('centipede')
// Carried over from the old CENTIPEDE_PAUSE card in main.ts: a fixed bright
// neutral that reads over any wave's cycling palette, at 0.72 dim.
export const CONTROLS_OVERLAY_OPTS = { color: '#f4f4f4', opacity: 0.72 } as const
