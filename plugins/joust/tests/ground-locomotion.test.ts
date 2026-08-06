// tests/ground-locomotion.test.ts
//
// Story jt1-6 — RED phase (O'Brien / TEA). The three CORE obligations the
// jt1-5 review ruled onto this story.
//
// jt1-5 shipped `stepGround` as a stub: it selects `ORRUN_DELTAS[0]`
// unconditionally (src/core/flight.ts), which is the standstill entry, so
// forty frames of held direction move ZERO pixels where the ROM moves eighty.
// It was never called by a test, so nothing noticed. That is the whole reason
// this file exists — the fix and the test that would have caught it.
//
// ─── THE ANIMATION CYCLE, DERIVED ────────────────────────────────────────────
// `RUNR` (JOUSTRV4.SRC:7191-7196) decrements PFRAME and wraps to 4 at zero:
//
//     LDB PFRAME,U / BLE RUNRST / DECB / BGT RUNFRM / LDB #4
//
// so the phase cycles 4 → 3 → 2 → 1 → 4. `ORRUN` (:7185-7189) is indexed BY
// that phase, and its own comments name the transitions:
//
//     index 1  delta 3   "PFRAME 2 TO 1"
//     index 2  delta 2   "PFRAME 3 TO 2"
//     index 3  delta 1   "PFRAME 4 TO 3"
//     index 4  delta 2   "PFRAME 1 TO 4"
//
// One full cycle is 3 + 2 + 1 + 2 = 8 pixels per 4 frames — 2 px/frame. Forty
// held frames is exactly ten cycles: EIGHTY pixels. That number is derived from
// the table, not from the story text, and it is the assertion that has teeth.

import { describe, it, expect } from 'vitest'
import { loadFlight, type EntityState, type PlayerInput } from './helpers/flight-contract.js'
import { loadArena } from './helpers/arena-contract.js'

const RIGHT: PlayerInput = { dir: 1, flap: false, flapHeld: false }
const LEFT: PlayerInput = { dir: -1, flap: false, flapHeld: false }
const STILL: PlayerInput = { dir: 0, flap: false, flapHeld: false }

function grounded(over: Partial<EntityState> = {}): EntityState {
  return {
    posX: 100,
    posY: 68 << 8,
    velXIndex: 0,
    velXFrac: 0,
    velY: 0,
    timeUp: 0,
    groundState: 'PLYBR',
    plantZ: 0,
    airborne: false,
    ...over,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OBLIGATION 1 — stepGround must actually move an entity.
// ─────────────────────────────────────────────────────────────────────────────
describe('obligation 1 — stepGround produces real locomotion', () => {
  it('EntityState carries an animation phase', async () => {
    // Without it there is nothing to index ORRUN_DELTAS by, which is exactly
    // how the stub ended up hard-coding element 0.
    const f = await loadFlight()
    const after = f.stepGround(grounded(), RIGHT)
    expect(
      (after as unknown as { animPhase?: number }).animPhase,
      'stepGround must maintain an animation phase',
    ).toBeTypeOf('number')
  })

  it('the phase cycles 4 → 3 → 2 → 1 → 4 (RUNR)', async () => {
    const f = await loadFlight()
    let s = grounded({ groundState: 'PLYCR' })
    const seen: number[] = []
    for (let i = 0; i < 9; i++) {
      s = f.stepGround(s, RIGHT)
      seen.push((s as unknown as { animPhase: number }).animPhase)
    }
    const cycle = seen.slice(-8)
    expect(cycle, 'two full descending cycles wrapping at 4').toEqual([4, 3, 2, 1, 4, 3, 2, 1])
  })

  it('forty held frames move ~80 pixels, not zero', async () => {
    // The regression the stub would have shipped. 8 px per 4-frame cycle × 10
    // cycles = 80. Tolerance is one cycle either side to allow for whichever
    // phase the state machine starts on.
    const f = await loadFlight()
    let s = grounded({ groundState: 'PLYCR', posX: 100 })
    for (let i = 0; i < 40; i++) s = f.stepGround(s, RIGHT)
    const travelled = s.posX - 100
    expect(travelled, 'a running mount must actually run').toBeGreaterThan(0)
    expect(travelled, 'roughly 80px — 2 px/frame from the ORRUN cycle').toBeGreaterThanOrEqual(72)
    expect(travelled).toBeLessThanOrEqual(88)
  })

  it('runs left as far as it runs right', async () => {
    const f = await loadFlight()
    let right = grounded({ groundState: 'PLYCR', posX: 100 })
    let left = grounded({ groundState: 'PLYCR', posX: 100 })
    for (let i = 0; i < 40; i++) {
      right = f.stepGround(right, RIGHT)
      left = f.stepGround(left, LEFT)
    }
    expect(right.posX - 100, 'symmetric locomotion').toBe(100 - left.posX)
  })

  it('standing still does not drift', async () => {
    const f = await loadFlight()
    let s = grounded({ groundState: 'PLYBR', posX: 100 })
    for (let i = 0; i < 40; i++) s = f.stepGround(s, STILL)
    expect(s.posX, 'a standing mount stays put').toBe(100)
  })

  it('indexes ORRUN_DELTAS by the phase rather than a constant', async () => {
    // The direct statement of the defect: if every frame used one delta, the
    // per-frame distances would all be equal. They must not be — the ROM's
    // gait is uneven (3,2,1,2), and that unevenness IS the animation.
    const f = await loadFlight()
    let s = grounded({ groundState: 'PLYCR', posX: 0 })
    const steps: number[] = []
    for (let i = 0; i < 8; i++) {
      const before = s.posX
      s = f.stepGround(s, RIGHT)
      steps.push(s.posX - before)
    }
    expect(new Set(steps).size, 'a constant delta means the phase is being ignored').toBeGreaterThan(1)
    expect([...new Set(steps)].sort(), 'the deltas come from ORRUN').toEqual(
      [...new Set(f.ORRUN_DELTAS.slice(1))].sort(),
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// OBLIGATION 2 — the velXIndex INVARIANT. Shape only.
// ─────────────────────────────────────────────────────────────────────────────
describe('obligation 2 — velXIndex stays even and in range', () => {
  // The premise that makes rejection-vs-saturation equivalence safe: PVELX is a
  // BYTE OFFSET into 2-byte FDB entries, so an odd index would address the
  // middle of a word and yield FLYX[undefined].
  //
  // The jt1-5 Reviewer REJECTED asserting what an odd index DOES, as actively
  // harmful — it would pin behaviour for a state the ROM cannot reach and
  // freeze an implementation detail. Only the invariant is asserted here: after
  // any operation, the index is even and within bounds.
  const invariant = (s: EntityState, max: number, where: string): void => {
    expect(Number.isInteger(s.velXIndex), `${where}: integral`).toBe(true)
    expect(Math.abs(s.velXIndex % 2), `${where}: even — PVELX is a 2-byte offset`).toBe(0)
    expect(Math.abs(s.velXIndex), `${where}: within ±${max}`).toBeLessThanOrEqual(max)
  }

  it('holds after every flap from every reachable index and direction', async () => {
    const f = await loadFlight()
    for (let idx = -8; idx <= 8; idx += 2) {
      for (const dir of [-1, 0, 1] as const) {
        const after = f.flap(
          { ...grounded({ airborne: true, velXIndex: idx }) },
          { dir, flap: true, flapHeld: true },
        )
        invariant(after, f.MAX_VEL_X_INDEX, `flap(${idx}, ${dir})`)
      }
    }
  })

  it('holds across a long mixed flight', async () => {
    const f = await loadFlight()
    let s = grounded({ airborne: true, velXIndex: 0 })
    for (let i = 0; i < 300; i++) {
      const dir = ((i % 3) - 1) as -1 | 0 | 1
      if (i % 5 === 0) s = f.flap(s, { dir, flap: true, flapHeld: true })
      s = f.stepFlight(s, { dir, flap: false, flapHeld: i % 2 === 0 })
      invariant(s, f.MAX_VEL_X_INDEX, `frame ${i}`)
    }
  })

  it('holds after takeoff, which seeds the index from the ground state', async () => {
    const f = await loadFlight()
    for (const st of Object.values(f.GROUND_STATES)) {
      const after = f.takeOff(grounded({ groundState: st.id, velXIndex: st.flyVel }))
      invariant(after, f.MAX_VEL_X_INDEX, `takeOff from ${st.id}`)
    }
  })

  it('every FLYX index the ladder defines is itself even and in range', async () => {
    const f = await loadFlight()
    for (let i = 0; i < f.FLYX.length; i++) {
      const idx = (i - 4) * 2
      expect(Math.abs(idx) % 2, `ladder slot ${i}`).toBe(0)
      expect(Math.abs(idx)).toBeLessThanOrEqual(f.MAX_VEL_X_INDEX)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// OBLIGATION 3 — the determinism script must tick PTIMUP.
// ─────────────────────────────────────────────────────────────────────────────
describe('obligation 3 — determinism includes flap decay', () => {
  // jt1-5's script never ticked PTIMUP, so every flap in the replay delivered
  // the same full-strength impulse and the decay path was never exercised by
  // the determinism proof at all.
  async function run(): Promise<{ trace: string[]; maxTimeUp: number }> {
    const f = await loadFlight()
    const arena = await loadArena()
    let s: EntityState = grounded({ airborne: true, posX: 280, posY: 45 << 8, velXIndex: 6, velY: -0x0300 })
    const trace: string[] = []
    let maxTimeUp = 0
    for (let i = 0; i < 300; i++) {
      const dir = ((i % 3) - 1) as -1 | 0 | 1
      const flapping = i % 6 === 0
      if (flapping) s = f.flap(s, { dir, flap: true, flapHeld: true })
      s = f.stepFlight(s, { dir, flap: false, flapHeld: flapping })
      s = { ...s, timeUp: f.tickTimeUp(s.timeUp) }
      maxTimeUp = Math.max(maxTimeUp, s.timeUp)
      s = { ...s, posX: arena.wrapX(s.posX) }
      const c = arena.applyCeiling(s.posY, s.velY)
      s = { ...s, posY: c.posY, velY: c.velY }
      trace.push(`${s.posX},${s.posY},${s.velXIndex},${s.velY},${s.timeUp}`)
    }
    return { trace, maxTimeUp }
  }

  it('reproduces bit-for-bit with PTIMUP in the replay', async () => {
    const a = await run()
    const b = await run()
    expect(a.trace).toEqual(b.trace)
  })

  it('and PTIMUP actually advances, so decay is exercised', async () => {
    // Without this the previous test would pass over a script where timeUp
    // never moved — which is precisely the gap being closed.
    const { maxTimeUp } = await run()
    expect(maxTimeUp, 'the script must age the flap').toBeGreaterThan(100)
  })

  it('flap strength visibly decays across the replay', async () => {
    const f = await loadFlight()
    const early = f.flap(grounded({ airborne: true, timeUp: 5, velY: 0 }), {
      dir: 0,
      flap: true,
      flapHeld: true,
    }).velY
    const late = f.flap(grounded({ airborne: true, timeUp: 250, velY: 0 }), {
      dir: 0,
      flap: true,
      flapHeld: true,
    }).velY
    expect(late, 'a late flap lifts less than an early one').toBeGreaterThan(early)
  })
})
