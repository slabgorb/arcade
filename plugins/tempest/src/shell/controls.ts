// plugins/tempest/src/shell/controls.ts — sa1-5. tempest's remappable control
// manifest + its binding store + overlay chrome. input.ts's keyboard path read
// e.key ('ArrowLeft' / 'ArrowRight' / ' ' / 'Shift' / 'Enter'), which is NOT
// what resolveBindings deals in — bindings are physical e.code fleet-wide, per
// @shared/keybind's Binding doc comment — so the defaults below are the e.code
// equivalents (Space, ShiftLeft/ShiftRight) and input.ts's keydown/keyup
// handlers now match on e.code instead of e.key.
//
// The WHEEL (mousewheel spinner) is the cabinet's real control and is analog,
// not a discrete key — it carries no manifest entry and its listener in
// input.ts is untouched. The held-arrow keyboard path is a discrete KEY
// control even though its effect (a banked angular velocity) is continuous;
// what the manifest governs is which physical key sets leftHeld/rightHeld,
// not the displacement math built on top of it.
import { makeBindingStore } from '@shared/controls-overlay'
import type { ControlManifest } from '@shared/keybind'

export const CONTROL_MANIFEST: ControlManifest = [
  { action: 'left', label: 'ROTATE LEFT', defaults: ['ArrowLeft'] },
  { action: 'right', label: 'ROTATE RIGHT', defaults: ['ArrowRight'] },
  { action: 'fire', label: 'FIRE', defaults: ['Space'] },
  { action: 'zap', label: 'SUPERZAP', defaults: ['ShiftLeft', 'ShiftRight'] },
  { action: 'start', label: 'START', defaults: ['Enter'] },
]
export const bindingStore = makeBindingStore('tempest')
// Carried over from the old TEMPEST_PAUSE card in main.ts: the authentic 1981
// green BONUS/TIME face (#39ff14), at 0.72 dim.
export const CONTROLS_OVERLAY_OPTS = { color: '#39ff14', opacity: 0.72 } as const
