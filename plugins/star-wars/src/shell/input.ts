// src/shell/input.ts
//
// Maps physical devices into the core's Input. Mouse XY stands in for the
// cabinet's two-axis yoke; the left button / Space is the trigger.

import type { Input } from '../core/input'
import type { Mode } from '../core/state'
import { resolveBindings, type BindingMap } from '@shared/keybind'
import { CONTROL_MANIFEST, bindingStore } from './controls'

export interface InputController {
  // The current game mode is passed in so a mouse click can be CONTEXTUAL — see
  // the note in sample(). The loop already holds the state, so this is free.
  sample(mode: Mode): Input
}

// sa1-5: the codes below are now CONTROL_MANIFEST's defaults (controls.ts), and
// the live map is resolved through @shared/keybind so a player's saved rebind
// (the controls overlay, wired in main.ts) overrides them. setBindings is the
// overlay's onChange hook — it swaps this module's live map in place. The yoke
// (mouse aim + click) is analog and stays outside this map entirely.
let bindings: BindingMap = resolveBindings(CONTROL_MANIFEST, bindingStore.load())
export function setBindings(map: BindingMap): void {
  bindings = map
}

export function createInputController(canvas: HTMLCanvasElement): InputController {
  let aimX = 0
  let aimY = 0
  let pointerDown = false // left button / any pointer held → the yoke trigger
  let spaceDown = false // Space held → the yoke trigger (keyboard)
  // A pointerdown not yet interpreted by a sample. The click's MEANING depends on
  // the game mode, which is only known at sample time, so the handler records the
  // fresh press and sample() decides.
  let freshPointerPress = false
  // When a click on the attract screen is spent as "start", the SAME held button
  // must not also fire — otherwise the held click blasts straight through the
  // death-star picker into a run. Set on the attract click, cleared on release.
  let clickSpentOnStart = false
  // `start` is a one-shot edge (the start button / Enter / 1), latched on keydown
  // and cleared the next time the core samples it, so a single press fires exactly
  // one attract->select (or gameover->attract) transition.
  let pendingKeyStart = false

  window.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect()
    aimX = ((e.clientX - r.left) / r.width) * 2 - 1
    // +aimY is UP (the convention aimDirection and the render NDC both use), but
    // the pointer's Y grows downward — negate it, or pushing the yoke up would dive.
    aimY = -(((e.clientY - r.top) / r.height) * 2 - 1)
  })
  window.addEventListener('pointerdown', () => {
    pointerDown = true
    freshPointerPress = true
  })
  window.addEventListener('pointerup', () => {
    pointerDown = false
    clickSpentOnStart = false
  })
  window.addEventListener('keydown', (e) => {
    if (bindings.fire.includes(e.code)) spaceDown = true
    // Edge, not level: only a fresh press (never an OS key-repeat) arms start
    // (SH2-13, the battlezone latch discipline). With the typed initials entry
    // behind this same key, a repeat-armed latch would machine-gun start edges
    // into the entry screen.
    if (bindings.start.includes(e.code) && !e.repeat) {
      pendingKeyStart = true
    }
  })
  window.addEventListener('keyup', (e) => { if (bindings.fire.includes(e.code)) spaceDown = false })

  return {
    sample(mode: Mode): Input {
      // A mouse click is CONTEXTUAL (pt1-10). On the attract/title screen a fresh
      // click STARTS the game — exactly what Enter does, and nothing more: it
      // arms the start edge and is SPENT on it, so the same held button does not
      // also pull the trigger (a held click that both started AND fired would run
      // straight through the SELECT-A-DEATH-STAR picker). On every other screen a
      // click is just the yoke trigger, unchanged. Enter stays global — the core
      // gates it to the screens that consume start — and never doubles as fire, so
      // the keyboard path needs none of this.
      let clickStart = false
      if (freshPointerPress) {
        freshPointerPress = false
        if (mode === 'attract') {
          clickStart = true
          clickSpentOnStart = true
        }
      }
      const fire = spaceDown || (pointerDown && !clickSpentOnStart)
      // The aim inverts the render's projection, so it needs the same viewport
      // aspect the scene is drawn with (canvas CSS width / height).
      const aspect = canvas.clientHeight > 0 ? canvas.clientWidth / canvas.clientHeight : 1
      const start = pendingKeyStart || clickStart
      pendingKeyStart = false
      return { aimX, aimY, fire, aspect, start }
    },
  }
}
