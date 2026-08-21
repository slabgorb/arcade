// plugins/defender/src/shell/controls.ts — sa1-5. defender's remappable
// control manifest + its binding store + overlay chrome. Defaults are copied
// verbatim from input.ts's old BINDINGS table — already physical e.code
// (installHeldKeys/held-keys keys on e.code by default; defender never
// converted from e.key), so no e.key -> e.code translation was needed here.
//
// The START/COIN control (Enter, Digit1 — df7-2) stays OUTSIDE this manifest,
// unchanged: it is read directly off the held-key set (startPressed), not
// through a bound action, matching joust's p1/p2 start-key precedent (those
// too are read raw, not through CONTROL_MANIFEST).
import { makeBindingStore } from '@shared/controls-overlay'
import type { ControlManifest } from '@shared/keybind'

export const CONTROL_MANIFEST: ControlManifest = [
  { action: 'thrust', label: 'THRUST', defaults: ['KeyD', 'ArrowRight'] },
  { action: 'reverse', label: 'REVERSE', defaults: ['KeyA', 'ArrowLeft'] },
  { action: 'up', label: 'UP', defaults: ['KeyW', 'ArrowUp'] },
  { action: 'down', label: 'DOWN', defaults: ['KeyS', 'ArrowDown'] },
  { action: 'fire', label: 'FIRE', defaults: ['Space', 'Enter'] },
  // df5-7: the smart-bomb key (SBOMB) — a dedicated button, distinct from fire.
  { action: 'smartBomb', label: 'SMART BOMB', defaults: ['KeyB', 'ShiftLeft'] },
  // df6-1: hyperspace (HYPER) — the second emergency power, edge-debounced in
  // the core (like `reverse`). ShiftRight, not ShiftLeft, so it does not
  // collide with smart bomb.
  { action: 'hyperspace', label: 'HYPERSPACE', defaults: ['KeyH', 'ShiftRight'] },
]
export const bindingStore = makeBindingStore('defender')
// Carried over from the old DEFENDER_PAUSE card in main.ts: the cabinet's
// cyan HUD/laser register, at 0.72 dim.
export const CONTROLS_OVERLAY_OPTS = { color: '#5ad1ff', opacity: 0.72 } as const
