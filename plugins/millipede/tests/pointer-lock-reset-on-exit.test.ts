// tests/pointer-lock-reset-on-exit.test.ts
//
// Story ml10-5 (RED / TEA) — a BEHAVIOURAL boot-harness pin for R5: main.ts wires the
// pointer-lock onExit callback to mouse.reset() (main.ts:66) so an Escape that drops the
// lock while the window keeps focus (no 'blur' fires) still clears the last accumulated
// trackball delta — otherwise the gun keeps drifting (runaway travel). ml10-4 pinned this
// only by a source-regex (`pointer-lock.test.ts` scans main.ts for `.reset(`), which stays
// GREEN even if the onExit wiring is deleted — the exact "built but dead" class the ml10
// epic exists to catch. This drives the REAL booted shell: acquire the lock, push a big
// delta, EXIT the lock, and assert the next stepped frame drains {dh:0, dv:0}.
//
// Observability (ml10-5): main.ts drains the mouse each frame (`const {dh,dv} =
// mouse.sample()`, main.ts:260) and — like the existing window.__sim tap (main.ts:276) —
// exposes the drained trackball on window.__trackball, which the harness reads via
// shell.lastTrackball(). This test is RED until GREEN (Loki) adds that one-line tap.
//
// With the tap present the pin also KILLS the reset-removal mutant: delete the onExit
// arg `() => mouse.reset()` (or its body) and the EXIT leaves the pending delta, so the
// drained frame reads {dh:-200, dv:120} instead of {dh:0, dv:0} and this test reddens.
// The unit-level equivalent (createMouseAdapter + createPointerLock wired by hand) is
// already covered in pointer-lock.test.ts; what was missing — and what this adds — is the
// proof that the *booted main.ts* actually wires onExit to the adapter's reset.

import { describe, it, expect, beforeAll } from 'vitest'
import { bootMillipedeShell, type ShellHarness } from './helpers/boot-shell'

describe('ml10-5 R5 — a pointer-lock EXIT resets the trackball (boot harness, behavioural)', () => {
  let shell: ShellHarness
  beforeAll(async () => {
    shell = await bootMillipedeShell()
  })

  it('a lock EXIT with no blur clears the pending delta → the next frame drains {dh:0, dv:0}', () => {
    // Acquire the lock, then accumulate a large trackball delta on `document` (where
    // pointer lock delivers movementX/Y). Do NOT step a frame yet — the delta is pending
    // in the mouse adapter, undrained.
    shell.setLockAcquired(true)
    shell.emit('document', 'pointerlockchange') // still locked → NOT an exit
    shell.emit('document', 'mousemove', { movementX: 200, movementY: 120 })

    // Escape drops the lock but the window keeps focus: no 'blur' fires. Only the
    // pointerlockchange → onExit → mouse.reset() wiring can clear the pending delta.
    shell.setLockAcquired(false)
    shell.emit('document', 'pointerlockchange') // EXIT

    // main.ts drains the (now-reset) accumulator into this frame's input and taps it.
    shell.frame(16)
    expect(
      shell.lastTrackball(),
      'onExit→mouse.reset() zeroed the pending delta; a WIRED exit drains {0,0}, a dead one drains the pushed delta',
    ).toEqual({ dh: 0, dv: 0 })
  })
})
