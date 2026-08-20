// tests/shell/input.start-on-click.test.ts
//
// pt1-10 — a mouse click on the start screen must start the game, the same as
// Enter (playtest 2026-08-19: "on the start screen a mouse click should start the
// game in addition to Enter").
//
// The click is CONTEXTUAL. The story says "in addition to Enter", so a click on
// attract must do EXACTLY what Enter does — arm the one-shot `start` edge and
// nothing more. Enter is not the fire trigger; a click IS. So the click must be
// spent on the start and must NOT also pull the trigger, or the same held button
// would blast through the SELECT-A-DEATH-STAR picker (whose confirm is `fire`).
// On every other screen a click is the trigger, unchanged.
//
// `createInputController` registers listeners on the global `window` and reads a
// `canvas`, neither of which exists in star-wars' `node` test env. We stub a
// minimal fake window (a bare EventTarget) and a fake canvas with the two members
// the controller touches — the same `vi.stubGlobal` approach
// tests/shell/audio.test.ts uses to fake Web Audio. Events are dispatched on the
// stubbed window so the real controller wiring runs; nothing here is a
// source-text match (lang-review #15/#26).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createInputController } from '../../src/shell/input'

// The controller only calls getBoundingClientRect() and reads clientWidth/Height.
function fakeCanvas(): HTMLCanvasElement {
  return {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    clientWidth: 100,
    clientHeight: 100,
  } as unknown as HTMLCanvasElement
}

// A keydown event carrying a `code`, as the handler reads it. `repeat` is left
// undefined (a fresh, non-OS-repeat press), matching a genuine first keydown.
function keydown(code: string): Event {
  const e = new Event('keydown')
  ;(e as unknown as { code: string }).code = code
  return e
}

let win: EventTarget
beforeEach(() => {
  win = new EventTarget()
  vi.stubGlobal('window', win)
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('pt1-10: a mouse click starts the game, contextually', () => {
  // Non-vacuity anchor: proves the fake window actually drives the latch. If this
  // fails, the click cases below are harness breakage, not the real defect.
  it('baseline — Enter arms the start edge through the stubbed window', () => {
    const input = createInputController(fakeCanvas())
    expect(input.sample('attract').start).toBeFalsy() // nothing pressed yet
    win.dispatchEvent(keydown('Enter'))
    expect(input.sample('attract').start).toBe(true)
  })

  // The story: a click on the start screen starts the game.
  it('a click on the attract screen arms the start edge, exactly like Enter', () => {
    const input = createInputController(fakeCanvas())
    win.dispatchEvent(new Event('pointerdown'))
    expect(input.sample('attract').start).toBe(true)
  })

  // "in addition to Enter" — no MORE than Enter. Enter does not fire, so the
  // click that starts must not fire either: its held button is spent on the start
  // and stays swallowed until released, so it cannot bleed into the picker.
  it('the attract click is spent on start — it does not also fire into the picker', () => {
    const input = createInputController(fakeCanvas())
    win.dispatchEvent(new Event('pointerdown'))
    expect(input.sample('attract').fire).toBe(false) // the start frame is not a fire
    // Same physical button still held as the core advances attract -> select:
    const inSelect = input.sample('select')
    expect(inSelect.fire).toBe(false) // still swallowed → picker is not auto-confirmed
    expect(inSelect.start).toBeFalsy() // one click is one start edge only
  })

  // Release, then a FRESH click in the picker is a real trigger — that is how the
  // player actually confirms a Death Star.
  it('after releasing, a fresh click in the picker fires (confirms), not swallowed', () => {
    const input = createInputController(fakeCanvas())
    win.dispatchEvent(new Event('pointerdown')) // starts the game on attract
    input.sample('attract')
    win.dispatchEvent(new Event('pointerup')) // release
    win.dispatchEvent(new Event('pointerdown')) // fresh press in the picker
    const s = input.sample('select')
    expect(s.fire).toBe(true)
    expect(s.start).toBeFalsy()
  })

  // Outside attract a click is ONLY the trigger — it never arms start (during play
  // a click must fire the guns, not restart anything).
  it('during play a click is the trigger, never a start', () => {
    const input = createInputController(fakeCanvas())
    win.dispatchEvent(new Event('pointerdown'))
    const s = input.sample('playing')
    expect(s.fire).toBe(true)
    expect(s.start).toBeFalsy()
  })

  // One-shot, like the Enter latch: one attract click yields exactly one start
  // edge, then clears — one click = one attract->select transition.
  it('one attract click yields exactly one start edge, then clears', () => {
    const input = createInputController(fakeCanvas())
    win.dispatchEvent(new Event('pointerdown'))
    expect(input.sample('attract').start).toBe(true) // consumed here
    expect(input.sample('attract').start).toBeFalsy() // no second edge from one click
  })
})
