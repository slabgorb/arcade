// tests/flight.test.ts
//
// Story jt1-5 — RED phase (O'Brien / TEA). The flight and ground model.
//
// Runs everywhere: no vendored tree, so CI exercises all of it. The
// transcription gate and the arena-consumption obligations are the companion
// suite, tests/flight-source.test.ts.
//
// ─── ALL TWELVE STORY ANCHORS VERIFIED BEFORE ANY TEST WAS WRITTEN ───────────
// jt1-4 shipped with five wrong anchors, so this epic reads the story as a
// hypothesis. jt1-5's are all correct — the first time in the epic. Two things
// the story does NOT say were found while checking, and both are traps that
// produce a plausible wrong implementation:
//
//   • FLYX's LABEL IS THE ZERO ENTRY. Four entries precede it and the index is
//     signed. Treating FLYX as element 0 breaks every leftward flight.
//   • X AND Y USE DIFFERENT POSITION FORMATS. Y is 8.8; X is 16-bit signed
//     PIXELS with the sub-pixel accumulator in the velocity (PVELX+2). Making
//     both 8.8 is the natural symmetry assumption and it is wrong.
//
// ─── THE FIXTURE RULE ────────────────────────────────────────────────────────
// tempest's wave/tube trap in spirit: a fixture that invents a convenient arena
// tests nothing. Landing tests drive the REAL platform table out of arena.ts
// and the REAL landing map out of the transcribed X/Y tables.

import { describe, it, expect } from 'vitest'
import { loadFlight, type EntityState, type PlayerInput } from './helpers/flight-contract.js'
import { loadArena } from './helpers/arena-contract.js'

const NEUTRAL: PlayerInput = { dir: 0, flap: false, flapHeld: false }
const HELD: PlayerInput = { dir: 0, flap: false, flapHeld: true }
const FLAP: PlayerInput = { dir: 0, flap: true, flapHeld: true }

/** A minimal airborne entity. Callers override only what they are testing. */
function airborne(over: Partial<EntityState> = {}): EntityState {
  return {
    posX: 100,
    posY: 100 << 8,
    velXIndex: 0,
    velXFrac: 0,
    velY: 0,
    timeUp: 0,
    groundState: null,
    plantZ: 0,
    airborne: true,
    ...over,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — THE FLAP IMPULSE.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 — flap impulse decays with time aloft (ADDFLP)', () => {
  /** The ROM's arithmetic, stated once: ((PTIMUP × 96) >> 8) − 96. */
  const expectedDelta = (timeUp: number): number => ((timeUp * 96) >> 8) - 96

  it('gives the full −96 impulse from a standing start (PTIMUP 0)', async () => {
    const f = await loadFlight()
    const after = f.flap(airborne({ timeUp: 0, velY: 0 }), FLAP)
    expect(after.velY, 'a fresh flap is the strongest').toBe(-96)
    expect(after.velY).toBe(expectedDelta(0))
  })

  it('decays monotonically as PTIMUP grows', async () => {
    // The mechanic the whole game rests on: hovering costs you lift, so a
    // player who flaps continuously climbs worse than one who paces it.
    const f = await loadFlight()
    let previous = -Infinity
    for (const t of [0, 32, 64, 128, 200, 255]) {
      const delta = f.flap(airborne({ timeUp: t, velY: 0 }), FLAP).velY
      expect(delta, `PTIMUP ${t}`).toBe(expectedDelta(t))
      expect(delta, 'impulse must weaken (become less negative) as time aloft grows')
        .toBeGreaterThanOrEqual(previous)
      previous = delta
    }
  })

  it('is an ADDITION to existing velocity, not an assignment', async () => {
    const f = await loadFlight()
    const after = f.flap(airborne({ timeUp: 0, velY: 500 }), FLAP)
    expect(after.velY, 'falling at 500, flapping adds −96').toBe(500 - 96)
  })

  it('at maximum PTIMUP the impulse is nearly spent but still lifts', async () => {
    const f = await loadFlight()
    const delta = f.flap(airborne({ timeUp: 255, velY: 0 }), FLAP).velY
    expect(delta).toBe(expectedDelta(255))
    expect(delta, 'still upward, barely').toBeLessThan(0)
  })

  it('PTIMUP saturates at 255 rather than wrapping to 0 (AIRTIM)', async () => {
    // `INC / BNE / DEC` — the ROM explicitly refuses to wrap. Wrapping would
    // hand a fully-spent flapper a brand-new full-strength impulse.
    const f = await loadFlight()
    expect(f.tickTimeUp(0)).toBe(1)
    expect(f.tickTimeUp(254)).toBe(255)
    expect(f.tickTimeUp(255), 'saturate, never wrap').toBe(255)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — THE FLYX LADDER AND ITS REJECTION CLAMP.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 — the FLYX ladder', () => {
  /** 256 units = 1 px/frame. ±{2.0, 1.0, 0.5, 0.25, 0}. */
  const LADDER = [-0x0200, -0x0100, -0x0080, -0x0040, 0, 0x0040, 0x0080, 0x0100, 0x0200]

  it('is nine non-linear entries, ±{2.0, 1.0, 0.5, 0.25, 0} px/frame', async () => {
    const f = await loadFlight()
    expect(f.FLYX.length, 'indices −8,−6,−4,−2,0,2,4,6,8').toBe(9)
    expect(f.FLYX).toEqual(LADDER)
  })

  it('is stored in index order with zero in the MIDDLE, not at the start', async () => {
    // The trap: the FLYX label in the ROM sits on the ZERO entry, with four
    // entries before it, and the index is signed. A table stored
    // [0, 0.25, 0.5, 1, 2, …] is wrong for every leftward flight while reading
    // like a perfectly sensible ladder.
    const f = await loadFlight()
    expect(f.FLYX[0], 'index −8 is full speed LEFT').toBe(-0x0200)
    expect(f.FLYX[4], 'the middle entry is rest').toBe(0)
    expect(f.FLYX[8], 'index +8 is full speed RIGHT').toBe(0x0200)
  })

  it('is symmetric and doubles at each rung', async () => {
    const f = await loadFlight()
    for (let i = 0; i < 4; i++) {
      expect(f.FLYX[i], `rung ${i} mirrors rung ${8 - i}`).toBe(-f.FLYX[8 - i])
    }
    expect(f.FLYX[8] / f.FLYX[7]).toBe(2)
    expect(f.FLYX[7] / f.FLYX[6]).toBe(2)
    expect(f.FLYX[6] / f.FLYX[5]).toBe(2)
  })

  it('moves ±2 index per flap edge, and only on the edge', async () => {
    const f = await loadFlight()
    const right = f.flap(airborne({ velXIndex: 0 }), { dir: 1, flap: true, flapHeld: true })
    expect(right.velXIndex, 'joystick ×2').toBe(2)
    const left = f.flap(airborne({ velXIndex: 0 }), { dir: -1, flap: true, flapHeld: true })
    expect(left.velXIndex).toBe(-2)
    // Holding the stick without flapping must not steer.
    const drifting = f.stepFlight(airborne({ velXIndex: 2 }), { dir: -1, flap: false, flapHeld: false })
    expect(drifting.velXIndex, 'steering happens on the flap edge ONLY').toBe(2)
  })
})

describe('AC-1 — the clamp REJECTS the update, it does not saturate', () => {
  // The subtlest rule in the story. `CMPA #MAXVX / BGT ADXMX2` returns WITHOUT
  // storing, so an over-range result leaves the index completely unchanged. A
  // saturating implementation would pin it at ±8 — visibly similar, and wrong:
  // under rejection a player at +8 who flaps right STAYS at +8, and one at +6
  // who flaps right reaches +8, so the ladder's top rung is reachable only from
  // exactly one rung below.
  it('leaves the index untouched when a flap would exceed +8', async () => {
    const f = await loadFlight()
    const after = f.flap(airborne({ velXIndex: 8 }), { dir: 1, flap: true, flapHeld: true })
    expect(after.velXIndex, 'discarded, not saturated').toBe(8)
  })

  it('leaves the index untouched when a flap would exceed −8', async () => {
    const f = await loadFlight()
    const after = f.flap(airborne({ velXIndex: -8 }), { dir: -1, flap: true, flapHeld: true })
    expect(after.velXIndex).toBe(-8)
  })

  it('still allows a flap that lands exactly on the bound', async () => {
    const f = await loadFlight()
    expect(f.flap(airborne({ velXIndex: 6 }), { dir: 1, flap: true, flapHeld: true }).velXIndex).toBe(8)
    expect(f.flap(airborne({ velXIndex: -6 }), { dir: -1, flap: true, flapHeld: true }).velXIndex).toBe(
      -8,
    )
  })

  it('a rejected flap still delivers its VERTICAL impulse', async () => {
    // Rejection applies to the X index only — the flap still lifts. An
    // implementation that bailed out of the whole routine would make a
    // full-speed player unable to climb.
    const f = await loadFlight()
    const after = f.flap(airborne({ velXIndex: 8, timeUp: 0, velY: 0 }), {
      dir: 1,
      flap: true,
      flapHeld: true,
    })
    expect(after.velXIndex).toBe(8)
    expect(after.velY, 'the lift is unaffected by the X rejection').toBe(-96)
  })

  it('reversing away from the bound is always allowed', async () => {
    const f = await loadFlight()
    expect(f.flap(airborne({ velXIndex: 8 }), { dir: -1, flap: true, flapHeld: true }).velXIndex).toBe(6)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — THE GRAVITY PAIR (the glide mechanic).
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 — gravity is a pair selected by the flap button', () => {
  it('is 4 with the button HELD (wings down) and 8 released (wings up)', async () => {
    const f = await loadFlight()
    expect(f.GRAV, 'GRAV EQU 4, JOUSTRV4.SRC:952').toBe(4)
    expect(f.GRAVITY_WINGS_DOWN, 'no offset when held').toBe(4)
    expect(f.GRAVITY_WINGS_UP, 'GRAV + $04 offset when released').toBe(8)
  })

  it('the pair is GRAV and GRAV+4, not two independent constants', async () => {
    // The ROM adds an OFFSET of 0 or $04 to GRAV (`CLRB` / `LDB #$04`). Storing
    // 4 and 8 as unrelated numbers loses that, and a future GRAV change would
    // silently desynchronise them.
    const f = await loadFlight()
    expect(f.GRAVITY_WINGS_DOWN).toBe(f.GRAV)
    expect(f.GRAVITY_WINGS_UP).toBe(f.GRAV + 4)
  })

  it('holding the button halves the fall rate — this IS the glide', async () => {
    const f = await loadFlight()
    const held = f.stepFlight(airborne({ velY: 0 }), HELD)
    const released = f.stepFlight(airborne({ velY: 0 }), NEUTRAL)
    expect(held.velY, 'wings down').toBe(4)
    expect(released.velY, 'wings up').toBe(8)
    expect(released.velY, 'gliding is exactly half').toBe(held.velY * 2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — THE NEGATIVE CLAIMS. Both must stay ABSENT.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-2 — there is NO air drag', () => {
  it('horizontal speed persists indefinitely without flapping', async () => {
    // AC-2 verbatim. Joust has no horizontal damping at all: the FLYX index is
    // state, not a decaying velocity. A clone that "naturally" adds drag makes
    // the game feel right for one screen and wrong forever after.
    const f = await loadFlight()
    let s = airborne({ velXIndex: 8, posX: 0 })
    for (let i = 0; i < 600; i++) s = f.stepFlight(s, NEUTRAL)
    expect(s.velXIndex, 'ten seconds of coasting must not slow the bird').toBe(8)
  })

  it('travels the same distance in the second 100 frames as the first', async () => {
    // A stronger form: not just "the index is unchanged" but "the motion it
    // produces is unchanged". A drag term hidden in the integrator would leave
    // the index alone and still slow the bird.
    const f = await loadFlight()
    let s = airborne({ velXIndex: 4, posX: 0, velXFrac: 0 })
    const start = s.posX
    for (let i = 0; i < 100; i++) s = f.stepFlight(s, NEUTRAL)
    const first = s.posX - start
    const mid = s.posX
    for (let i = 0; i < 100; i++) s = f.stepFlight(s, NEUTRAL)
    expect(s.posX - mid, 'distance per 100 frames must not decay').toBe(first)
  })
})

describe('AC-2 — there is NO terminal velocity', () => {
  it('VY grows without bound while falling', async () => {
    // AC-2 verbatim. Gravity accumulates every frame with no cap; only the
    // floor and ceiling stop it.
    const f = await loadFlight()
    let s = airborne({ velY: 0 })
    const samples: number[] = []
    for (let i = 1; i <= 400; i++) {
      s = f.stepFlight(s, NEUTRAL)
      if (i % 100 === 0) samples.push(s.velY)
    }
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i], 'velocity must keep growing, never plateau').toBeGreaterThan(samples[i - 1])
    }
    expect(samples[samples.length - 1], 'far past any plausible terminal cap').toBeGreaterThan(
      100 * 8,
    )
  })

  it('accumulates gravity exactly linearly — no cap, no damping', async () => {
    const f = await loadFlight()
    let s = airborne({ velY: 0 })
    for (let i = 1; i <= 50; i++) {
      s = f.stepFlight(s, NEUTRAL)
      expect(s.velY, `frame ${i}`).toBe(i * 8)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — TAKEOFF vs WALK-OFF. Two distinct routines.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 — takeoff and walk-off differ', () => {
  it('a flap takeoff gets −$0080 AND a one-pixel lift (STFLY)', async () => {
    const f = await loadFlight()
    const grounded = airborne({ airborne: false, posY: 68 << 8, groundState: 'PLYBR' })
    const after = f.takeOff(grounded)
    expect(after.velY, 'initial Y velocity −$0080').toBe(-0x0080)
    expect(after.posY >> 8, 'DEC PPOSY+1 — one pixel up, out of the landing band').toBe(67)
    expect(after.airborne).toBe(true)
  })

  it('walking off an edge gets ZERO vertical velocity and no lift (STFALL)', async () => {
    // AC-2's closing clause, and the distinction that makes stepping off a
    // ledge feel different from jumping.
    const f = await loadFlight()
    const grounded = airborne({ airborne: false, posY: 68 << 8, groundState: 'PLYCR' })
    const after = f.walkOff(grounded)
    expect(after.velY, 'no downward velocity is carried into the fall').toBe(0)
    expect(after.posY >> 8, 'and no lift — the entity simply stops being supported').toBe(68)
    expect(after.airborne).toBe(true)
  })

  it('both clear the sub-pixel fractions', async () => {
    const f = await loadFlight()
    const dirty = airborne({ airborne: false, posY: (68 << 8) | 0xd0, velXFrac: 0xaa })
    for (const after of [f.takeOff(dirty), f.walkOff(dirty)]) {
      expect(after.posY & 0xff, 'CLR PPOSY+2').toBe(0)
      expect(after.velXFrac, 'CLR PPOSX+2').toBe(0)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — GROUND MOVEMENT.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 — the ground state machine', () => {
  it('carries the ORRUN per-frame deltas 0/3/2/1/2 and skid 2', async () => {
    const f = await loadFlight()
    expect(f.ORRUN_DELTAS, 'JOUSTRV4.SRC:7185-7189').toEqual([0, 3, 2, 1, 2])
    expect(f.SKID_DELTA, ':7242').toBe(2)
  })

  it('every state names transitions that exist', async () => {
    const f = await loadFlight()
    const ids = new Set(Object.keys(f.GROUND_STATES))
    const dangling: string[] = []
    for (const s of Object.values(f.GROUND_STATES)) {
      for (const t of [s.onMinus, s.onZero, s.onPlus]) if (!ids.has(t)) dangling.push(`${s.id} → ${t}`)
    }
    expect(dangling, 'a transition to a state that was never transcribed').toEqual([])
  })

  it('every state\'s flyVel is a legal FLYX index', async () => {
    // flyVel is handed straight to the ladder on takeoff, so an out-of-ladder
    // value would index off the end of the table.
    const f = await loadFlight()
    const legal = new Set([-8, -6, -4, -2, 0, 2, 4, 6, 8])
    const bad = Object.values(f.GROUND_STATES)
      .filter((s) => !legal.has(s.flyVel))
      .map((s) => `${s.id}: ${s.flyVel}`)
    expect(bad).toEqual([])
  })

  it('FRCONV maps landing speed to a ground state that exists', async () => {
    const f = await loadFlight()
    expect(f.FRCONV.length, 'stand + four speeds, JOUSTRV4.SRC:6253-6257').toBe(5)
    for (const id of f.FRCONV) expect(f.GROUND_STATES[id], `FRCONV names ${id}`).toBeDefined()
  })

  it('a skid records PLANTZ 2 for jt2\'s joust resolution', async () => {
    // Recorded now, consumed later: the skidding mount sits two pixels lower,
    // which decides who wins a joust. jt1-5 only has to carry it.
    const f = await loadFlight()
    expect(f.SKID_PLANT_Z, 'JOUSTRV4.SRC:6071-6072').toBe(2)
  })
})

describe('AC-4 — the input contract is device-agnostic', () => {
  it('accepts only −1, 0, +1 for direction', async () => {
    const f = await loadFlight()
    for (const dir of [-1, 0, 1] as const) {
      expect(() => f.flap(airborne(), { dir, flap: true, flapHeld: true })).not.toThrow()
    }
  })

  it('a rapid-flap script out-climbs a slow-flap script', async () => {
    // AC-4 verbatim, and the observable consequence of PTIMUP decay: flapping
    // every 4 frames beats flapping every 20 because each impulse is stronger
    // when PTIMUP is low... but PTIMUP only resets on LANDING, so the real
    // mechanic is that the rapid script simply gets more impulses in.
    const f = await loadFlight()
    const fly = (period: number): number => {
      let s = airborne({ posY: 150 << 8, velY: 0, timeUp: 0 })
      for (let i = 0; i < 120; i++) {
        const flapping = i % period === 0
        s = f.flap(s, { dir: 0, flap: flapping, flapHeld: flapping })
        s = f.stepFlight(s, { dir: 0, flap: false, flapHeld: flapping })
        s = { ...s, timeUp: f.tickTimeUp(s.timeUp) }
      }
      return s.posY
    }
    expect(fly(4), 'rapid flapping ends higher (smaller Y) than slow').toBeLessThan(fly(20))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — DETERMINISM, through the whole interaction set.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-3 — identical input scripts reproduce identical trajectories', () => {
  /** A scripted flight that provably crosses wrap, ceiling, landing and takeoff. */
  async function runScript(): Promise<{ trace: string[]; events: Set<string> }> {
    const f = await loadFlight()
    const arena = await loadArena()
    let s = airborne({ posX: 285, posY: 40 << 8, velXIndex: 8, velY: -0x0400 })
    const trace: string[] = []
    const events = new Set<string>()
    for (let i = 0; i < 400; i++) {
      const flapping = i % 7 === 0
      const dir = ((i % 3) - 1) as -1 | 0 | 1
      if (flapping) s = f.flap(s, { dir, flap: true, flapHeld: true })
      s = f.stepFlight(s, { dir, flap: false, flapHeld: flapping })

      const before = s.posX
      s = { ...s, posX: arena.wrapX(s.posX) }
      if (s.posX !== before) events.add('wrap')

      const ceil = arena.applyCeiling(s.posY, s.velY)
      if (ceil.bumped) events.add('ceiling')
      s = { ...s, posY: ceil.posY, velY: ceil.velY }

      const mask = f.groundMaskAt(s.posX, s.posY >> 8)
      const outcome = arena.groundOutcome(mask)
      if (outcome.kind === 'platform') {
        events.add('landing')
        s = f.land(s, outcome.platform)
        s = f.takeOff(s)
        events.add('takeoff')
      }
      trace.push(`${s.posX},${s.posY},${s.velXIndex},${s.velY}`)
    }
    return { trace, events }
  }

  it('reproduces bit-for-bit across runs', async () => {
    const a = await runScript()
    const b = await runScript()
    expect(a.trace).toEqual(b.trace)
  })

  it('and the script actually exercises wrap, ceiling, landing and takeoff', async () => {
    // Determinism over a script that never leaves open air proves nothing. AC-3
    // names four interactions; the script must reach all of them or the test is
    // decoration.
    const { events } = await runScript()
    for (const e of ['wrap', 'ceiling', 'landing', 'takeoff']) {
      expect(events.has(e), `the determinism script never exercised ${e}`).toBe(true)
    }
  })

  it('every step is a pure function of the state handed in', async () => {
    const f = await loadFlight()
    const s = airborne({ velXIndex: 4, velY: 300, timeUp: 40 })
    const frozen = JSON.stringify(s)
    f.stepFlight(s, HELD)
    f.flap(s, FLAP)
    expect(JSON.stringify(s), 'the module must not mutate the state it is given').toBe(frozen)
  })

  it('produces integral positions — no floating-point drift', async () => {
    // The ROM is integer arithmetic end to end. A single float division
    // anywhere makes bit-for-bit reproduction impossible the moment a
    // trajectory gets long enough.
    const f = await loadFlight()
    let s = airborne({ velXIndex: 6, velY: -300 })
    for (let i = 0; i < 200; i++) {
      s = f.stepFlight(s, i % 5 === 0 ? HELD : NEUTRAL)
      expect(Number.isInteger(s.posX), `posX at frame ${i}`).toBe(true)
      expect(Number.isInteger(s.posY), `posY at frame ${i}`).toBe(true)
      expect(Number.isInteger(s.velY), `velY at frame ${i}`).toBe(true)
      expect(Number.isInteger(s.velXFrac), `velXFrac at frame ${i}`).toBe(true)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PTIMUP ground transitions — added by the jt1-5 review REVERSAL. Both writes
// sit inside routines the story cited for other reasons, so the twelve-anchor
// check missed them: STLDIR (:6245-6246) sets 1, "MINIMUM DOWN TIME", not 0;
// STFALL (:6154) clears on walk-off, "NEEDS TO BE DONE". Claims JT5-045/046.
// ─────────────────────────────────────────────────────────────────────────────
describe('PTIMUP on ground transitions (review reversal — JT5-045/046)', () => {
  it('landing sets timeUp to 1 (the ROM minimum down time), not zero', async () => {
    const f = await loadFlight()
    const arena = await loadArena()
    const p137 = arena.PLATFORMS.find((pl) => pl.snapY === 137)
    if (!p137) throw new Error('no platform with snapY 137')
    const s = airborne({ velY: 512, timeUp: 200 })
    const landed = f.land(s, p137)
    expect(landed.timeUp, 'STLDIR is LDA #1 / STA PTIMUP — not CLR').toBe(1)
  })

  it('walk-off clears timeUp — a saturated glide must not weaken the next flap 96×', async () => {
    const f = await loadFlight()
    // Long glide: timeUp saturated at 255. Walk off, then flap.
    const glided = airborne({ airborne: false, groundState: 'stand', timeUp: 255 })
    const off = f.walkOff(glided)
    expect(off.timeUp, 'STFALL is CLR PTIMUP,U — "NEEDS TO BE DONE"').toBe(0)
    // The observable surface: the post-walk-off flap impulse is the FULL −96,
    // not ((255×96)>>8)−96 = −1.
    const flapped = f.flap(off, FLAP)
    expect(flapped.velY - off.velY, 'first flap after walk-off delivers −96').toBe(-96)
  })
})
