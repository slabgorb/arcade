// tests/shell/input.start-on-click.test.ts
//
// RED for pt1-10 — a mouse click on the start screen must start the game, the
// same as Enter (playtest 2026-08-19: "on the start screen a mouse click should
// start the game in addition to Enter").
//
// The start-input mapping is shell IO in `src/shell/input.ts`. `start` is a
// one-shot EDGE: the controller latches it and the core consumes it, acting on
// it only in attract/gameover (see the input.ts header comment). Today Enter /
// Digit1 / Numpad1 arm that edge, but a mouse press only sets `fire` (the yoke
// trigger) — so a click cannot start the game. That is the bug.
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

describe('pt1-10: a mouse click starts the game, same as Enter', () => {
  // Non-vacuity anchor: proves the fake window actually drives the latch. If this
  // ever fails, the RED case below is harness breakage, not the real defect.
  it('baseline — Enter arms the start edge through the stubbed window', () => {
    const input = createInputController(fakeCanvas())
    expect(input.sample().start).toBeFalsy() // nothing pressed yet
    win.dispatchEvent(keydown('Enter'))
    expect(input.sample().start).toBe(true)
  })

  // The story. RED today: pointerdown maps to `fire`, never to the start edge.
  it('a mouse click (pointerdown) arms the start edge, exactly like Enter', () => {
    const input = createInputController(fakeCanvas())
    win.dispatchEvent(new Event('pointerdown'))
    expect(input.sample().start).toBe(true)
  })

  // Regression guard (passes today): the click must STILL pull the trigger. The
  // fix adds a start edge to pointerdown; it must not drop the existing fire.
  it('the click still pulls the trigger — fire is unchanged', () => {
    const input = createInputController(fakeCanvas())
    win.dispatchEvent(new Event('pointerdown'))
    expect(input.sample().fire).toBe(true)
  })

  // The start edge is one-shot, like the Enter latch: a single click yields
  // exactly one start=true, then clears — so one click drives exactly one
  // attract->play transition, never a machine-gun of edges.
  it('one click yields exactly one start edge, then clears', () => {
    const input = createInputController(fakeCanvas())
    win.dispatchEvent(new Event('pointerdown'))
    expect(input.sample().start).toBe(true) // consumed here
    expect(input.sample().start).toBeFalsy() // no second edge from one click
  })
})
