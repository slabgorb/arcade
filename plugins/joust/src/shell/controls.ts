// plugins/joust/src/shell/controls.ts — sa1-5. joust's remappable control
// manifest + its binding store + overlay chrome. Defaults are copied verbatim
// from input.ts's PLAYER_1/PLAYER_2 binding tables (already physical e.code —
// installHeldKeys/held-keys keys on e.code by default, joust never converts).
// Two players share the flap/left/right VERBS, so each gets its own action id
// (p1*/p2*) rather than a single shared one — the store persists overrides to
// 'joust-keybinds'.
import { makeBindingStore } from '@shared/controls-overlay'
import type { ControlManifest } from '@shared/keybind'
import { PALETTES } from '../core/pictures.js'
import { rgbaPalette } from './render.js'

export const CONTROL_MANIFEST: ControlManifest = [
  { action: 'p1Left', label: 'P1 LEFT', defaults: ['ArrowLeft'] },
  { action: 'p1Right', label: 'P1 RIGHT', defaults: ['ArrowRight'] },
  { action: 'p1Flap', label: 'P1 FLAP', defaults: ['Space'] },
  { action: 'p2Left', label: 'P2 LEFT', defaults: ['KeyA'] },
  { action: 'p2Right', label: 'P2 RIGHT', defaults: ['KeyD'] },
  { action: 'p2Flap', label: 'P2 FLAP', defaults: ['ShiftLeft'] },
]
export const bindingStore = makeBindingStore('joust')

// Carried over from the old JOUST_PAUSE card in main.ts: the P1-yellow COLOR1
// register (index 5), decoded from the transcribed palette (not an invented
// literal — the render denylist's rule applies here too), at 0.72 dim.
const colours = rgbaPalette(PALETTES.COLOR1)
const c = colours[5]
export const CONTROLS_OVERLAY_OPTS = { color: `rgb(${c.r} ${c.g} ${c.b})`, opacity: 0.72 } as const
