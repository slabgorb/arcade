// src/shell/input.ts
//
// Story bz1-4 — keyboard → tread-axis mapping. IO only: the pure core reads
// abstract tread axes (core/input.ts); this shell layer owns the device
// bindings. Two mappings ship, both feeding the same Input:
//   * Arcade (authentic cabinet muscle memory): E/D = left tread fwd/back,
//     I/K = right tread fwd/back — the dual-stick control the cabinet used.
//   * Friendly (arrow keys), for players without that muscle memory: Up/Down
//     drive both treads, Left/Right pivot — combined so Up+Left arcs.
// The cannon fires on Space (or F) — the cabinet's thumb trigger (bz1-5).
// Enter (or 1) starts a run (bz1-10) — EDGE-latched here, the sibling
// pendingStart pattern: one keydown becomes exactly one start:true frame, so
// a held key can never machine-gun the framing state machine.
// Hold Shift for fine-aim (bz2-4): a held precision modifier — the core scales
// the tank's yaw down for lining up a distant shot. Level-read like the treads.
//
// Not unit-tested (shell convention — this repo family verifies IO by running
// the game); the :5276 eyeball check covers the firing feel.

import type { Input } from '../core/input'

export class KeyboardTreads {
  private readonly down = new Set<string>()
  private pendingStart = false

  constructor(target: Window = window) {
    target.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase()
      // Edge, not level: only a fresh press (not a key-repeat) arms start.
      if ((key === 'enter' || key === '1') && !e.repeat) this.pendingStart = true
      this.down.add(key)
    })
    target.addEventListener('keyup', (e) => this.down.delete(e.key.toLowerCase()))
  }

  private held(...keys: string[]): boolean {
    return keys.some((k) => this.down.has(k))
  }

  /** The current tread axes, clamped to [-1, 1]. */
  read(): Input {
    let left = 0
    let right = 0

    // Arcade dual-tread: E/D left tread, I/K right tread.
    if (this.held('e')) left += 1
    if (this.held('d')) left -= 1
    if (this.held('i')) right += 1
    if (this.held('k')) right -= 1

    // Friendly arrow "drive": Up/Down both treads, Left/Right pivot.
    if (this.held('arrowup')) {
      left += 1
      right += 1
    }
    if (this.held('arrowdown')) {
      left -= 1
      right -= 1
    }
    if (this.held('arrowleft')) {
      left -= 1
      right += 1
    }
    if (this.held('arrowright')) {
      left += 1
      right -= 1
    }

    // Space (' ') or F fires the cannon; the latched start edge is consumed
    // here — true for exactly this one frame. Shift held = fine-aim (bz2-4),
    // a level read like the treads.
    const start = this.pendingStart
    this.pendingStart = false
    return {
      leftTread: clamp(left),
      rightTread: clamp(right),
      fire: this.held(' ', 'f'),
      start,
      fineAim: this.held('shift'),
    }
  }
}

function clamp(v: number): number {
  return v < -1 ? -1 : v > 1 ? 1 : v
}
