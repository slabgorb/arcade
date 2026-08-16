// tests/beetle-quota.test.ts
//
// Story ml7-8 (AC4) — the beetle CONCURRENCY quota. beetleAllowed(score2) caps
// how many beetles may be alive AT ONCE: 1 below 90k, 2 below 250k, 3 after
// (MILLI.MAC:272-279, BT-14/15). The ml7-2 adapter (enemies/beetle.ts) already
// gates startBeetle on `counts.beetles === beetleAllowed(score2)`. This suite is
// a GREEN regression GUARD pinning that ceiling across a long spawn run so a
// future edit to the gate cannot silently overflow the field with beetles.
//
// NOTE (see the ml7-8 TEA Delivery Findings): the ROM's BEETLA as a DEPLETING
// per-wave budget (decrement per spawn at :288, reset each wave) is a SEPARATE
// quantity that the adapter does NOT persist — it recomputes `allowed` from the
// score every frame. That deeper threading is flagged for the architect, not
// pinned here; this guard covers only the concurrency ceiling AC4 states.

import { describe, it, expect } from 'vitest'
import { createRng } from '@shared/rng'
import type { EnemyView } from '../src/core/enemies/contract'
import { initBeetles, stepBeetles } from '../src/core/enemies/beetle'
import { beetleAllowed } from '../src/core/beetle'

/** An EnemyView with a live centipede (so the BEETL gate can open) and a live
 *  player, over an empty field; a fresh seeded rng each call. */
function view(over: Partial<EnemyView> = {}): EnemyView {
  return {
    frame: 0,
    score2: 0,
    player: { h: 0x40, v: 0x30, alive: true },
    centin: 4, // 0 < centin < 12 → BT-11/12 open
    hard: false,
    score1: 0,
    dead: 0,
    slow: 0,
    mushTop: 0,
    mush: 0,
    beetles: 0,
    rng: createRng(7),
    field: new Uint8Array(0x3c0),
    ...over,
  }
}

/** Live beetles in a slot band. */
const liveCount = (slots: ReadonlyArray<{ color: number }>): number =>
  slots.reduce((n, s) => (s.color !== 0 ? n + 1 : n), 0)

describe('ml7-8 AC4 — the concurrency ceiling is never exceeded', () => {
  it('keeps live beetles ≤ beetleAllowed(score2) across a long spawn run (score2 0 → cap 1)', () => {
    let slots = initBeetles()
    const cap = beetleAllowed(0)
    expect(cap, 'score2 0 caps at one beetle').toBe(1)
    let peak = 0
    // Drive 4000 frames so every BEETL spawn tick (FRAME & 0x7f == 0x37) fires
    // many times; the beetle keeps moving/exiting so slots churn.
    for (let f = 0; f < 4000; f++) {
      const r = stepBeetles(slots, view({ frame: f, score2: 0, centin: 4 }))
      slots = r.slots
      peak = Math.max(peak, liveCount(slots))
      expect(liveCount(slots), `frame ${f}: beetles exceeded the cap`).toBeLessThanOrEqual(cap)
    }
    // Non-vacuous: the run must actually have spawned at least one beetle.
    expect(peak, 'no beetle ever spawned — guard is vacuous').toBeGreaterThan(0)
  })

  it('raises the ceiling to 2 at score2 ≥ 0x09 (90k), still never exceeding it', () => {
    let slots = initBeetles()
    const cap = beetleAllowed(0x10)
    expect(cap, 'score2 0x10 caps at two beetles').toBe(2)
    let peak = 0
    for (let f = 0; f < 4000; f++) {
      const r = stepBeetles(slots, view({ frame: f, score2: 0x10, centin: 6 }))
      slots = r.slots
      peak = Math.max(peak, liveCount(slots))
      expect(liveCount(slots), `frame ${f}: beetles exceeded the cap`).toBeLessThanOrEqual(cap)
    }
    expect(peak, 'no beetle ever spawned — guard is vacuous').toBeGreaterThan(0)
  })

  it('does NOT spawn a beetle while the centipede is dead (DEAD==0 via centin 0, BT-11)', () => {
    // A control: with no centipede present the BEETL gate is shut, so the quota
    // is moot — no beetle appears regardless of the spawn tick.
    let slots = initBeetles()
    for (let f = 0; f < 300; f++) {
      slots = stepBeetles(slots, view({ frame: f, score2: 0, centin: 0 })).slots
    }
    expect(liveCount(slots), 'no centipede → no beetle').toBe(0)
  })
})
