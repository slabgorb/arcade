// plugins/missile-command/src/shell/controls.ts — sa1-5. missile-command's
// remappable control manifest + its binding store + overlay chrome.
//
// missile-command is a trackball cabinet with THREE fire buttons: aiming is
// continuous mouse/crosshair input (untouched — this manifest governs no
// pointer input) and the only DISCRETE keyboard controls are the three
// keyboard fire-base keys (Z/X/C, mirroring the left/centre/right FIREMA
// switches, ABMLAU W3MAIN:606) and the '1' START-switch key that aborts name
// entry (isStartKey, MSTRT1). Defaults are the physical e.code equivalents of
// the input.ts literals they replace: 'z'->'KeyZ', 'x'->'KeyX', 'c'->'KeyC',
// '1'->'Digit1'. input.ts's codeToKey translates a resolved code BACK to the
// canonical 'z'/'x'/'c'/'1' key string the existing pure reducers (fireOrStart,
// keydownReducer, startAbortFromKey, ...) already understand — so THEIR
// signatures and their extensive existing test coverage stay untouched.
import { makeBindingStore } from '@shared/controls-overlay'
import type { ControlManifest } from '@shared/keybind'

export const CONTROL_MANIFEST: ControlManifest = [
  { action: 'fireLeft', label: 'FIRE LEFT BASE', defaults: ['KeyZ'] },
  { action: 'fireCentre', label: 'FIRE CENTRE BASE', defaults: ['KeyX'] },
  { action: 'fireRight', label: 'FIRE RIGHT BASE', defaults: ['KeyC'] },
  { action: 'start', label: 'START / ABORT ENTRY', defaults: ['Digit1'] },
]
export const bindingStore = makeBindingStore('missile-command')
// Carried over from the old drawPauseOverlay card (render.ts): functional HUD
// white, at 0.72 dim — the crosshair/HUD are not palette registers.
export const CONTROLS_OVERLAY_OPTS = { color: '#fff', opacity: 0.72 } as const
