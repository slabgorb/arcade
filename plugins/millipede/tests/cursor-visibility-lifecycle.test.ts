// tests/cursor-visibility-lifecycle.test.ts
//
// Story sa1-3 (RED / TEA, Tyr One-Handed) — CONSISTENT mouse-capture chrome across
// the fleet's three pointer-lock games (centipede, millipede, missile-command).
// The story: every game captures the pointer on the play gesture and RELEASES it on
// ESC, with uniform enter/exit semantics. The one enter/exit seam that is NOT
// uniform today is the OS cursor's visibility, and millipede is the outlier.
//
// The established, deliberate contract (its two peers already satisfy it):
//   • missile-command  — hides the cursor when the lock is taken and RESTORES it on
//                        lock EXIT: `canvas.style.cursor = ''` in the onExit callback
//                        (src/main.ts:105), `= 'none'` on capture (src/main.ts:116).
//                        Its comment: "the pointerlockchange listener restores the OS
//                        cursor on lock exit."
//   • centipede        — never sets `cursor: none` at all; the OS hides the cursor
//                        while pointer-locked and shows it again on exit. Cursor is
//                        therefore visible in attract and after ESC, hidden only under
//                        an active lock. Consistent end-state, reached by not fighting
//                        the platform.
//
// millipede breaks the contract in TWO of the three lifecycle states. It sets
// `canvas.style.cursor = 'none'` ONCE at boot (src/main.ts:65) and its pointer-lock
// onExit is `() => mouse.reset()` (src/main.ts:66) — which clears the trackball delta
// but never touches the cursor. So:
//   (1) in attract, BEFORE any capture, the cursor is already hidden — the player has
//       no visible pointer to aim at the canvas and click;
//   (3) after ESC drops the lock, the cursor STAYS hidden — the player is left with no
//       cursor at all until they blindly click to re-lock.
// Only state (2), hidden-while-locked, is correct today (and only because it is hidden
// unconditionally).
//
// This BEHAVIOURAL boot-harness pin drives the real booted main.ts through the whole
// capture lifecycle and asserts the cursor's visibility at each state. GREEN brings
// millipede to mc parity: hide the cursor only once the lock is CONFIRMED held (from
// request().then(), guarded by pointerLockElement === canvas — NOT synchronously on the
// gesture), restore it on the lock-exit callback, and never hide it from boot.
//
// FOUR states, because the hide must be gated on the lock actually being held:
//   (1) attract → visible   (2) lock CONFIRMED held → hidden   (3) ESC exit → restored
//   (4) REJECTED re-lock (R4 cooldown) → the lock is never acquired, so the guarded hide
//       must NOT fire and the cursor stays visible. This is the case review round 1
//       flagged: an UNGUARDED hide (hidden synchronously on the pointerdown gesture, before
//       request() resolves) leaves the cursor stuck hidden with no lock, because on a
//       swallowed rejection no pointerlockchange EXIT ever fires to restore it. missile-
//       command guards against exactly this (main.ts:110-117); state (4) pins the guard.
// Together the four states box-canyon the fix: the lazy "delete the boot cursor line" green
// regresses (2); a synchronous-optimistic hide regresses (4); only the lock-confirmed hide +
// restore-on-exit passes all four — the mc/centipede contract this story makes uniform. A
// source-regex would miss all of this (the ml10 epic's "built but dead" lesson — see
// pointer-lock-reset-on-exit.test.ts); the running shell is the only honest witness.

import { describe, it, expect, beforeAll } from 'vitest'
import { bootMillipedeShell, type ShellHarness } from './helpers/boot-shell'

// The OS cursor is "visible" whenever `canvas.style.cursor` is anything other than the
// hiding value 'none' (default '', 'auto', 'default', etc. all show a pointer).
const HIDDEN = 'none'

// The hide is now gated on the lock being CONFIRMED held, so it fires from
// `pointerLock.request().then(...)` — a microtask chain, not synchronously in the
// pointerdown handler. A macrotask tick flushes every pending microtask so the guarded
// hide (or, on a rejected re-lock, its correct absence) has resolved before we assert.
const flushMicrotasks = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

describe('sa1-3 — millipede cursor visibility across the capture lifecycle (boot harness, behavioural)', () => {
  let shell: ShellHarness
  beforeAll(async () => {
    // One boot per file: ESM memoises the module, so main.ts's side effects run once.
    // The lifecycle below is a single ordered sequence over that one booted shell.
    shell = await bootMillipedeShell()
  })

  it('(1) ATTRACT — before any capture, the cursor is VISIBLE so the player can see it to click', () => {
    // RED today: main.ts:65 sets `canvas.style.cursor = 'none'` at boot, so the cursor
    // is hidden the instant the shell mounts — before the player has captured anything.
    // mc & centipede both show the cursor here. GREEN must not hide it until capture.
    expect(
      shell.cursorStyle(),
      'in attract (no lock yet) the OS cursor must be visible — a hidden pointer leaves the player nothing to aim and click',
    ).not.toBe(HIDDEN)
  })

  it('(2) CAPTURING — the cursor hides only once the lock is CONFIRMED held', async () => {
    // The play gesture: a canvas pointerdown requests the lock. The hide is gated on the
    // lock actually being held (mc parity) — it fires from request().then() only when
    // document.pointerLockElement === canvas, NOT synchronously on the gesture. So drive a
    // real acquisition: request, mark the lock granted (the browser sets pointerLockElement
    // before request() resolves), flush the microtask, then assert hidden. Asserting BEFORE
    // the acquire would be the reject-unsafe shape this story's review rejected in round 1.
    shell.emit('canvas', 'pointerdown')
    expect(shell.pointerLockRequests(), 'the play gesture requested pointer lock').toBeGreaterThan(0)
    shell.setLockAcquired(true) // the lock is granted
    await flushMicrotasks() // let request().then() run against the held lock
    expect(
      shell.cursorStyle(),
      'once the lock is CONFIRMED held the OS cursor is hidden for the trackball',
    ).toBe(HIDDEN)
  })

  it('(3) RELEASE ON ESC — a lock EXIT with the window still focused RESTORES the cursor', () => {
    // Escape drops the lock but keeps window focus, so no 'blur' fires — the
    // pointerlockchange → onExit path is the ONLY thing that can restore the cursor.
    // Mirror mc's onExit `canvas.style.cursor = ''` (main.ts:105). RED today: millipede's
    // onExit is `() => mouse.reset()` and never touches the cursor, so it stays 'none'.
    shell.setLockAcquired(true)
    shell.emit('document', 'pointerlockchange') // still locked → NOT an exit
    expect(shell.cursorStyle(), 'still locked → cursor still hidden').toBe(HIDDEN)

    shell.setLockAcquired(false)
    shell.emit('document', 'pointerlockchange') // ESC EXIT
    expect(
      shell.cursorStyle(),
      'on ESC-release the OS cursor must return — a wired onExit restores it, the current mouse.reset()-only onExit leaves it hidden',
    ).not.toBe(HIDDEN)
  })

  it('(4) REJECTED RE-LOCK — a request that never acquires the lock leaves the cursor VISIBLE', async () => {
    // The mc-documented hazard (missile-command main.ts:110-112): request() resolves on a
    // SWALLOWED rejection too (the R4 re-lock cooldown — ESC then an immediate re-click), and
    // on that path the lock is never held and no pointerlockchange EXIT fires, so nothing else
    // could restore the cursor. An UNGUARDED hide would therefore leave the cursor stuck hidden
    // with no lock — the exact regression review round 1 rejected. The pointerLockElement guard
    // must keep the cursor visible. (State (3) left it visible; the lock is not acquired here —
    // no setLockAcquired(true) — so the guard sees pointerLockElement !== canvas.)
    expect(shell.cursorStyle(), 'precondition: the ESC exit above left the cursor visible').not.toBe(HIDDEN)
    shell.rejectNextLock() // the next requestPointerLock() rejects (cooldown)
    shell.emit('canvas', 'pointerdown')
    await flushMicrotasks() // request() swallows the rejection and resolves; its .then() runs
    expect(
      shell.cursorStyle(),
      'a rejected re-lock acquired no lock, so the guarded hide must not fire — the cursor stays visible',
    ).not.toBe(HIDDEN)
  })
})
