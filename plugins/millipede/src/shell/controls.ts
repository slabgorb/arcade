// plugins/millipede/src/shell/controls.ts — sa1-5. millipede's remappable
// control manifest + its binding store + overlay chrome, mirroring
// centipede's sibling adoption (commit a5aec2e9).
//
// millipede's ONLY discrete keyboard control is FIRE — movement is trackball/
// mouse only (shell/input.ts's createMouseAdapter + createPointerLock, sa1-3,
// left untouched by this story) and "start" is not a dedicated key: main.ts's
// keydown handler starts play on ANY key that is not the pause key and not
// mid name-entry, so there is nothing to bind there either.
//
// The old main.ts FIRE_KEYS set was keyed on e.key (' ', 'Spacebar', 'Enter',
// 'Control', 'z'/'Z', 'x'/'X', 'ArrowUp') — NOT what resolveBindings deals in
// (bindings are physical e.code fleet-wide, per @shared/keybind's Binding doc
// comment). The defaults below are that same key set converted to e.code,
// de-duplicated where two e.key values named the same physical key (' ' and
// 'Spacebar' both -> 'Space'; 'z'/'Z' -> 'KeyZ'; 'x'/'X' -> 'KeyX') and both
// physical Control keys kept ('Control' matched either).
import { makeBindingStore } from '@shared/controls-overlay'
import type { ControlManifest } from '@shared/keybind'

export const CONTROL_MANIFEST: ControlManifest = [
  {
    action: 'fire',
    label: 'FIRE',
    defaults: ['Space', 'Enter', 'ControlLeft', 'ControlRight', 'KeyZ', 'KeyX', 'ArrowUp'],
  },
]
export const bindingStore = makeBindingStore('millipede')
// Carried over from the old MILLIPEDE_PAUSE card in main.ts: this cabinet's
// own bright green at 0.72 dim (not battlezone's / centipede's colour).
export const CONTROLS_OVERLAY_OPTS = { color: '#7bff5a', opacity: 0.72 } as const
