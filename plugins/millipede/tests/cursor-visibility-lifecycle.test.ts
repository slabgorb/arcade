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
// capture lifecycle and asserts the cursor's visibility at each state. It is RED on
// states (1) and (3) until GREEN brings millipede to mc parity: hide the cursor when
// capture is requested (the pointerdown handler), restore it on the lock-exit callback
// — NOT hidden forever from boot.
//
// Why all three states, not just the broken two: pinning "hidden while locked" as well
// box-canyons the fix. The lazy green — delete the boot `cursor='none'` line — would
// satisfy (1) and (3) but regress (2) (the cursor would never hide during play). Only
// the hide-on-capture + restore-on-exit shape passes all three, which is exactly the
// mc/centipede contract this story exists to make uniform. A source-regex would miss
// all of this (the ml10 epic's "built but dead" lesson — see pointer-lock-reset-on-
// exit.test.ts); the running shell is the only honest witness.

import { describe, it, expect, beforeAll } from 'vitest'
import { bootMillipedeShell, type ShellHarness } from './helpers/boot-shell'

// The OS cursor is "visible" whenever `canvas.style.cursor` is anything other than the
// hiding value 'none' (default '', 'auto', 'default', etc. all show a pointer).
const HIDDEN = 'none'

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

  it('(2) CAPTURING — requesting the lock (the play gesture) HIDES the cursor for the trackball', () => {
    // The play gesture: a canvas pointerdown requests the lock (main.ts:117). While the
    // trackball drives the gun the OS cursor must be hidden. This is the ONE state that
    // is (accidentally) correct today; the fix must keep it correct.
    shell.emit('canvas', 'pointerdown')
    expect(shell.pointerLockRequests(), 'the play gesture requested pointer lock').toBeGreaterThan(0)
    expect(
      shell.cursorStyle(),
      'while the pointer is captured for the trackball the OS cursor must be hidden',
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
})
