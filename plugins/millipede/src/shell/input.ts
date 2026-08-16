// src/shell/input.ts
//
// Story ml10-4 (GREEN, Loki) — the shell-side mouse capture, mirroring centipede's
// shell/input.ts (cp1-5/cp2-2/cp2-8). This is the ONLY place raw device events are
// read; the pure trackball model (TBLMT / MOVE) stays in src/core/input.ts. Two
// duck-typed units, both taking a { addEventListener, removeEventListener } target
// so they are node-testable with no DOM (main.ts wires the real canvas/document):
//
//   • createMouseAdapter: pointer-lock 'mousemove' deltas (movementX/Y) aggregate
//     into a single {dh, dv} the frame drains once per sample(). Under pointer lock
//     the deltas are UNBOUNDED (the cursor never hits a screen edge), which is what
//     makes the mouse behave like the cabinet trackball.
//
//   • createPointerLock: click-to-lock + the two hardenings centipede's cp2-2 review
//     surfaced. R4 — canvas.requestPointerLock() returns a Promise that modern
//     browsers reject during the re-lock cooldown (Escape → immediate re-click); the
//     rejection is swallowed to an optional onReject sink (cp2-8) so request() never
//     rejects. R5 — an Escape-exit keeps the window focused, so 'blur' never fires and
//     the last accumulated delta would drive the gun forever; a pointerlockchange
//     listener invokes onExit on lock EXIT so the shell can clear that state.
//
// The pointer-lock path is only ever proven live by a HUMAN — headless browsers
// reject requestPointerLock outright — so these units cover the LOGIC and main.ts's
// click-to-lock + cursor-hide are the human smoke test (cannot be verified headless).

import type { GameState } from '../core/game-state'
import { stepInitials, insertHighScore, MILLI_INITIALS_LENGTH } from '../core/highscore'

interface EventTarget {
  addEventListener(type: string, listener: (event: Record<string, unknown>) => void): void
  removeEventListener(type: string, listener: (event: Record<string, unknown>) => void): void
}

/**
 * ml10-2 — one keystroke against the name-entry screen. Outside the 'entry' phase it
 * is inert (returns the SAME state). During 'entry': Enter with a FULL initials buffer
 * COMMITS — insert the { name, score } row into the ladder, clear the buffer and return
 * to attract; an incomplete Enter is inert. Any other key feeds the buffer through core
 * stepInitials (letter appends UPPERCASED to MILLI_INITIALS_LENGTH, Backspace deletes).
 * The mc7-3 shell reducer, bound to millipede's board; main.ts drives it from keydown and
 * persists when the committed ladder reference changes.
 */
export function nameEntryFromKey(key: string, state: GameState): GameState {
  if (state.phase !== 'entry') return state
  if (key === 'Enter') {
    if (state.initials.length !== MILLI_INITIALS_LENGTH) return state
    return {
      ...state,
      phase: 'attract',
      initials: '',
      highScores: insertHighScore(state.highScores, { name: state.initials, score: state.score }),
    }
  }
  return { ...state, initials: stepInitials(state.initials, key) }
}

/** A drained-per-frame trackball delta. Signs are set by `onMouseMove` below
 *  (negated horizontal, non-negated vertical — millipede's pre-extraction mapping). */
export interface MouseDelta {
  dh: number
  dv: number
}

export interface MouseAdapter {
  /** The accumulated delta since the last sample; sampling drains it to zero. */
  sample(): MouseDelta
  /** Clear the pending delta (the pointer-lock EXIT hook delegates to it). */
  reset(): void
  /** Detach every listener this adapter attached (the same fn refs it registered). */
  dispose(): void
}

export function createMouseAdapter(target: EventTarget): MouseAdapter {
  let dh = 0
  let dv = 0

  const onMouseMove = (e: Record<string, unknown>): void => {
    // Horizontal is NEGATED: the ROM trackball reads a higher PLAYH as further LEFT
    // (MILLI.MAC), so a rightward device push (+movementX) is a NEGATIVE dh for the
    // gun to track the mouse. Vertical is NOT negated — core stepPlayer COMP-reverses
    // V, so +movementY (mouse down) already lands as gun-down.
    dh -= Number(e.movementX ?? 0)
    dv += Number(e.movementY ?? 0)
  }
  const reset = (): void => {
    dh = 0
    dv = 0
  }

  target.addEventListener('mousemove', onMouseMove)

  return {
    sample(): MouseDelta {
      const delta = { dh, dv }
      dh = 0
      dv = 0
      return delta
    },
    reset,
    dispose(): void {
      target.removeEventListener('mousemove', onMouseMove)
    },
  }
}

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
  // The R4 rejection is still caught (request() never rejects), but its reason now
  // reaches this optional sink (cp2-8) instead of vanishing into a black hole.
  onReject?: (reason: unknown) => void,
): PointerLockController {
  const onPointerLockChange = (): void => {
    if (doc.pointerLockElement !== canvas) onExit()
  }
  doc.addEventListener('pointerlockchange', onPointerLockChange)

  return {
    async request(): Promise<void> {
      // "never rejects (R4)" must be universal: BOTH a rejected promise returned by
      // requestPointerLock() (re-lock cooldown) AND a SYNCHRONOUS throw from calling it
      // (the method unsupported/undefined on an older element) route to onReject and
      // resolve. A bare `.then(undefined, onReject)` catches only the former; the sync
      // throw would otherwise reject request()'s own async promise (ml10-4 review r1).
      try {
        const result = canvas.requestPointerLock()
        if (result && typeof (result as Promise<unknown>).then === 'function') {
          await result
        }
      } catch (reason) {
        onReject?.(reason)
      }
    },
    dispose(): void {
      doc.removeEventListener('pointerlockchange', onPointerLockChange)
    },
  }
}
