// src/shell/input.ts
//
// Story cp1-5 (GREEN, Julia) — AC-4: the shell-side input adapters. Core owns
// the device-agnostic InputCounts contract (src/core/player.ts); this is the
// ONLY place raw device events are read. Two adapters produce the identical
// contract:
//   - createMouseAdapter: pointer-lock 'mousemove' deltas (movementX/Y)
//     aggregate into counts, drained on sample(); the real trackball's
//     hardware counters are read once per IRQ (240x/s, centiped.cpp:514) and
//     this shell aggregates per frame instead.
//   - createKeyboardAdapter: arrow/WASD keys SYNTHESIZE +/-KEY_COUNT (the
//     core TBLMT clamp limit) each frame a direction is held, so a held key
//     drives the gun at the ROM's max 4 px/frame once core halves it.
// Both take a duck-typed { addEventListener, removeEventListener } target —
// there is no DOM in the core test environment, and centipede's shell wires
// the real canvas/window at runtime.
//
// Story cp1-6 (GREEN, Julia) — CARRY-FORWARD (4): harden both adapters before
// main.ts wires the real window. A 'blur' handler clears held/pending state
// (a key held while the tab loses focus must not keep driving the gun
// forever — a lock-exit that keeps focus is covered separately, by the
// pointerlockchange listener below), and dispose() detaches every listener
// it attached using the SAME function references it registered with.

import { TBLMT_LIMIT, type InputCounts } from '../core/player'

export const KEY_COUNT = TBLMT_LIMIT

interface EventTarget {
  addEventListener(type: string, listener: (event: Record<string, unknown>) => void): void
  removeEventListener(type: string, listener: (event: Record<string, unknown>) => void): void
}

export interface InputAdapter {
  sample(): InputCounts
  /** Clear held/pending state (the blur handler and a pointer-lock exit both
   *  delegate to this, cp2-2 R5). */
  reset(): void
  /** Detach every listener this adapter attached (the same fn refs it registered). */
  dispose(): void
}

const FIRE_BUTTON = 0

export function createMouseAdapter(target: EventTarget): InputAdapter {
  let dh = 0
  let dv = 0
  let fire = false

  const onMouseMove = (e: Record<string, unknown>): void => {
    // cp2-14: both axes are ROM-signed here, in the shell, where the adapter
    // already owned the V sign. A POSITIVE count drives PLAYH toward 0xF4 — the
    // cabinet's LEFT edge (CENTI4.MAC:1505-1512) — so a rightward device push
    // is a NEGATIVE count, and core MOVE stays a byte-faithful `ADC PLAYH`.
    dh -= Number(e.movementX ?? 0)
    // Screen Y grows downward; the core contract is +dv = up.
    dv -= Number(e.movementY ?? 0)
  }
  const onMouseDown = (e: Record<string, unknown>): void => {
    if (e.button === FIRE_BUTTON) fire = true
  }
  const onMouseUp = (e: Record<string, unknown>): void => {
    if (e.button === FIRE_BUTTON) fire = false
  }
  const reset = (): void => {
    dh = 0
    dv = 0
    fire = false
  }
  const onBlur = (): void => {
    reset()
  }

  target.addEventListener('mousemove', onMouseMove)
  target.addEventListener('mousedown', onMouseDown)
  target.addEventListener('mouseup', onMouseUp)
  target.addEventListener('blur', onBlur)

  return {
    sample(): InputCounts {
      const counts = { dh, dv, fire }
      dh = 0
      dv = 0
      return counts
    },
    reset,
    dispose(): void {
      target.removeEventListener('mousemove', onMouseMove)
      target.removeEventListener('mousedown', onMouseDown)
      target.removeEventListener('mouseup', onMouseUp)
      target.removeEventListener('blur', onBlur)
    },
  }
}

const RIGHT_KEYS = new Set(['ArrowRight', 'd', 'D'])
const LEFT_KEYS = new Set(['ArrowLeft', 'a', 'A'])
const UP_KEYS = new Set(['ArrowUp', 'w', 'W'])
const DOWN_KEYS = new Set(['ArrowDown', 's', 'S'])
const FIRE_KEYS = new Set([' ', 'Spacebar'])
// cp4-5: the keyboard port of the ROM's 1-player START button (START1,
// CENTI4.MAC:833-836). Enter is the arcade "start / insert" key; the sim's
// game-loop machine reads InputCounts.start to leave attract / restart from
// game-over. A separate control from the gun — movement keys never raise it.
const START_KEYS = new Set(['Enter'])

export function createKeyboardAdapter(target: EventTarget): InputAdapter {
  const held = new Set<string>()

  const onKeyDown = (e: Record<string, unknown>): void => {
    held.add(String(e.key))
  }
  const onKeyUp = (e: Record<string, unknown>): void => {
    held.delete(String(e.key))
  }
  const reset = (): void => {
    held.clear()
  }
  const onBlur = (): void => {
    reset()
  }

  target.addEventListener('keydown', onKeyDown)
  target.addEventListener('keyup', onKeyUp)
  target.addEventListener('blur', onBlur)

  const any = (keys: Set<string>): boolean => {
    for (const k of held) if (keys.has(k)) return true
    return false
  }

  return {
    sample(): InputCounts {
      const right = any(RIGHT_KEYS)
      const left = any(LEFT_KEYS)
      const up = any(UP_KEYS)
      const down = any(DOWN_KEYS)
      return {
        // cp2-14: right is the NEGATIVE ROM count (it drives PLAYH toward 0x0B,
        // the cabinet's RIGHT edge) — the keyboard mirror of the mouse sign.
        dh: (left ? KEY_COUNT : 0) - (right ? KEY_COUNT : 0),
        dv: (up ? KEY_COUNT : 0) - (down ? KEY_COUNT : 0),
        fire: any(FIRE_KEYS),
        start: any(START_KEYS), // cp4-5: START1 port (attract → play, game-over → restart)
      }
    },
    reset,
    dispose(): void {
      target.removeEventListener('keydown', onKeyDown)
      target.removeEventListener('keyup', onKeyUp)
      target.removeEventListener('blur', onBlur)
    },
  }
}

// Story cp2-2 (GREEN, Julia) — R4/R5 carry-forwards from the cp1-6 review.
// R4: canvas.requestPointerLock() returns a Promise that modern browsers
// reject during the re-lock cooldown (Escape → immediate re-click); the
// rejection must be swallowed. R5: an Escape-exit keeps the window focused,
// so 'blur' never fires and held gun state (dh/fire) drifts forever — a
// pointerlockchange listener must clear it on lock EXIT.

interface LockTarget {
  requestPointerLock(): unknown
}

interface LockDoc {
  pointerLockElement: unknown
  addEventListener(type: string, listener: (event: Record<string, unknown>) => void): void
  removeEventListener(type: string, listener: (event: Record<string, unknown>) => void): void
}

export interface PointerLockController {
  /** Request pointer lock; the returned promise never rejects (R4). */
  request(): Promise<void>
  /** Detach the pointerlockchange listener this controller wired. */
  dispose(): void
}

export function createPointerLock(
  canvas: LockTarget,
  doc: LockDoc,
  onExit: () => void,
  // cp2-8: narrows the R4 black-hole swallow — a rejection is still caught
  // (request() never rejects), but its reason now reaches this optional sink
  // instead of vanishing.
  onReject?: (reason: unknown) => void,
): PointerLockController {
  const onPointerLockChange = (): void => {
    if (doc.pointerLockElement !== canvas) onExit()
  }
  doc.addEventListener('pointerlockchange', onPointerLockChange)

  return {
    async request(): Promise<void> {
      const result = canvas.requestPointerLock()
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        await (result as Promise<unknown>).then(undefined, (reason) => {
          onReject?.(reason)
        })
      }
    },
    dispose(): void {
      doc.removeEventListener('pointerlockchange', onPointerLockChange)
    },
  }
}
