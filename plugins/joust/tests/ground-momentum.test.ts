// tests/ground-momentum.test.ts
//
// Story jt11-3 — RED phase (TEA). Ground must arrest momentum.
//
// ─── THE DEFECT ──────────────────────────────────────────────────────────────
// `velXIndex` (PVELX, the FLYX ladder index) survives land → ground → takeoff
// untouched: `land()` reads it to pick the FRCONV ground state but never writes
// it, `stepGround()` moves by ORRUN deltas and never touches it, and `takeOff()`
// restores it verbatim. Land at full speed, skid to a dead stop, flap — and the
// bird launches at the speed it LANDED at. The ground arrests nothing.
//
// ─── THE ROM MECHANISM, MEASURED ─────────────────────────────────────────────
// The story title says "takeOff() derives velXIndex … signed by facing", but the
// ROM does not put the write in STFLY — STFLY (JOUSTRV4.SRC:6123-6135) never
// touches PVELX. The GROUND LOOP maintains it. Every position update runs
//
//     UPDNO2  …  LDX PSTATE,U
//                LDA 6,X          UPDATE FICTISIOUS VELX FOR BUMPING
//                STA PVELX,U                        (JOUSTRV4.SRC:5997-6001)
//     …          LDA PFACE,U / BPL PL2RIT / NEG PVELX,U        (:6005-6008)
//
// — PVELX = the CURRENT state row's FLYVEL byte (the `STATE` macro's 7th
// operand, :7160-7175), negated when facing left. Takeoff then "inherits it
// verbatim" CORRECTLY, because the ground loop has already parked the right
// value there. This is also the only factoring that satisfies the story's own
// constraints (pure core, flight.ts only, frame.ts callers unchanged): `facing`
// reaches flight.ts through `stepGround` alone. So these tests pin:
//
//   AC-1  land() seeds the reset: velXIndex := the landed FRCONV rung's flyVel
//         (selection still by the INCOMING index — order matters).
//   AC-2  stepGround() maintains it: velXIndex := the new state row's flyVel,
//         negated for a left-facing mount (the UPDNO2 write, above).
//   AC-3  end to end, in frame.ts's call order (ground step, then takeoff):
//         a landed-and-stopped bird launches at REST; a running bird launches
//         at its rung's speed signed by facing — never at the previous
//         flight's airspeed.
//
// Every expected value below is DERIVED from the GROUND_STATES table at run
// time, never transcribed — mutating a row's flyVel reddens these tests.

import { describe, it, expect } from 'vitest'
import { loadFlight, type EntityState, type PlayerInput } from './helpers/flight-contract.js'
import { loadArena } from './helpers/arena-contract.js'

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
    animPhase: 0,
    ...over,
  }
}

function airborne(over: Partial<EntityState> = {}): EntityState {
  return grounded({ airborne: true, groundState: null, velY: 512, timeUp: 20, ...over })
}

/** The facing-relative transition rule stepGround documents (jt2-9). */
function expectedNext(
  states: Awaited<ReturnType<typeof loadFlight>>['GROUND_STATES'],
  id: string,
  dir: -1 | 0 | 1,
  facing: -1 | 1,
): string {
  const row = states[id]
  return dir === 0 ? row.onZero : dir === facing ? row.onPlus : row.onMinus
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — land() resets velXIndex to the landed rung's flyVel.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt11-3 AC-1 — landing writes the landed rung\'s flyVel into velXIndex', () => {
  it('every legal incoming index lands with velXIndex = its FRCONV rung\'s flyVel', async () => {
    const f = await loadFlight()
    const arena = await loadArena()
    const platform = arena.PLATFORMS.find((pl) => pl.snapY === 137)
    if (!platform) throw new Error('no platform with snapY 137')

    for (let v = -8; v <= 8; v += 2) {
      const landed = f.land(airborne({ velXIndex: v }), platform)
      // Control (existing behavior): the FRCONV selection is made from the
      // INCOMING index. If the reset happened first, every landing would
      // select from the already-reset value and this would misroute.
      const rungId = f.FRCONV[Math.min(Math.abs(v) / 2, f.FRCONV.length - 1)]
      expect(landed.groundState, `FRCONV selection for incoming ${v}`).toBe(rungId)
      // The new write: the landed rung's own flyVel — derived, not transcribed.
      expect(
        landed.velXIndex,
        `landing at ${v} must reset velXIndex to ${rungId}'s flyVel — ` +
          'the previous flight\'s airspeed must not survive touchdown',
      ).toBe(f.GROUND_STATES[rungId].flyVel)
    }
  })

  it('a leftward landing drops the sign: the reset is the rung magnitude', async () => {
    // The rung rows carry unsigned FLYVEL bytes; the sign belongs to facing and
    // is reapplied by the ground step (AC-2), exactly as the ROM's NEG PVELX
    // does. −6 in must come out as PLYER's flyVel (+6), not −6.
    const f = await loadFlight()
    const arena = await loadArena()
    const platform = arena.PLATFORMS.find((pl) => pl.snapY === 137)
    if (!platform) throw new Error('no platform with snapY 137')
    const landed = f.land(airborne({ velXIndex: -6 }), platform)
    expect(landed.groundState).toBe('PLYER')
    expect(landed.velXIndex).toBe(f.GROUND_STATES.PLYER.flyVel)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — stepGround() maintains velXIndex: the UPDNO2 write.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt11-3 AC-2 — the ground step maintains velXIndex from the state row', () => {
  it('facing right: after one step, velXIndex is the NEW state row\'s flyVel', async () => {
    const f = await loadFlight()
    for (const st of Object.values(f.GROUND_STATES)) {
      for (const dir of [-1, 0, 1] as const) {
        // Seed a stale full-speed flight index to prove it is OVERWRITTEN.
        const before = grounded({ groundState: st.id, velXIndex: -8 })
        const after = f.stepGround(before, { dir, flap: false, flapHeld: false }, 1)
        const nextId = expectedNext(f.GROUND_STATES, st.id, dir, 1)
        expect(
          after.velXIndex,
          `${st.id} + dir ${dir} facing right → ${nextId}: LDA 6,X / STA PVELX (UPDNO2)`,
        ).toBe(f.GROUND_STATES[nextId].flyVel)
      }
    }
  })

  it('facing left: same magnitude, negated — the ROM\'s NEG PVELX', async () => {
    const f = await loadFlight()
    for (const st of Object.values(f.GROUND_STATES)) {
      for (const dir of [-1, 0, 1] as const) {
        const before = grounded({ groundState: st.id, velXIndex: 8 })
        const after = f.stepGround(before, { dir, flap: false, flapHeld: false }, -1)
        const nextId = expectedNext(f.GROUND_STATES, st.id, dir, -1)
        const flyVel = f.GROUND_STATES[nextId].flyVel
        const want = flyVel === 0 ? 0 : -flyVel
        expect(
          after.velXIndex,
          `${st.id} + dir ${dir} facing left → ${nextId}: negated flyVel`,
        ).toBe(want)
        // PVELX is an integer byte in the ROM; there is no −0. A bare
        // `flyVel * facing` leaks Object.is-visible −0 into every standing
        // left-facing frame and into serialized replay fixtures. Normalize.
        expect(Object.is(after.velXIndex, -0), 'no negative zero').toBe(false)
      }
    }
  })

  it('a stale flight index does not survive a single ground frame', async () => {
    // The tightest statement of the defect at unit level: a standing bird
    // carrying its old flight airspeed sheds it on the very next ground step.
    const f = await loadFlight()
    const after = f.stepGround(grounded({ groundState: 'PLYBR', velXIndex: -8 }), STILL, 1)
    expect(after.velXIndex, 'PLYBR (standing) writes flyVel 0 over the stale −8').toBe(0)
  })

  it('the maintained index keeps the ladder invariant: even, within ±MAX', async () => {
    // The facing-less legacy call (enemies) is NOT pinned to a sign here — the
    // story scopes the player path, and the enemy caller threads no facing.
    // Whatever the implementation writes must still be a legal FLYX index.
    const f = await loadFlight()
    for (const st of Object.values(f.GROUND_STATES)) {
      for (const dir of [-1, 0, 1] as const) {
        const after = f.stepGround(
          grounded({ groundState: st.id, velXIndex: 6 }),
          { dir, flap: false, flapHeld: false },
        )
        expect(Number.isInteger(after.velXIndex), `${st.id}/${dir}: integral`).toBe(true)
        expect(Math.abs(after.velXIndex % 2), `${st.id}/${dir}: even`).toBe(0)
        expect(Math.abs(after.velXIndex), `${st.id}/${dir}: in range`).toBeLessThanOrEqual(
          f.MAX_VEL_X_INDEX,
        )
      }
    }
  })

  it('an airborne entity (no ground state) is untouched — control', async () => {
    const f = await loadFlight()
    const s = airborne({ velXIndex: -8 })
    const after = f.stepGround(s, STILL, 1)
    expect(after.velXIndex, 'stepGround must remain a no-op while airborne').toBe(-8)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — end to end, in frame.ts's order: ground step, then takeoff.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt11-3 AC-3 — launch speed is the ground rung\'s, never the old flight\'s', () => {
  it('THE BUG: land fast-left, skid to a stand, flap — and launch at REST', async () => {
    const f = await loadFlight()
    const arena = await loadArena()
    const platform = arena.PLATFORMS.find((pl) => pl.snapY === 137)
    if (!platform) throw new Error('no platform with snapY 137')

    // Land flying full-speed left. FRCONV routes |−8| to the top run rung.
    let s = f.land(airborne({ velXIndex: -8 }), platform)
    expect(s.groundState).toBe('PLYFR')

    // Facing left, push RIGHT (against facing) — the onMinus skid chain.
    // Derived walk of the table: PLYFR→PLYIR→PLYJR→PLYKR→PLYLR→PLYMR→PLYBR,
    // six steps to a stand. The deceleration ladder velXIndex must ride down
    // with it (each value the new rung's flyVel, negated for the left facing).
    const seen: number[] = []
    const wantLadder: number[] = []
    let id = 'PLYFR'
    for (let i = 0; i < 10 && id !== 'PLYBR'; i++) {
      id = f.GROUND_STATES[id].onMinus
      const flyVel = f.GROUND_STATES[id].flyVel
      wantLadder.push(flyVel === 0 ? 0 : -flyVel)
      s = f.stepGround(s, { dir: 1, flap: false, flapHeld: false }, -1)
      seen.push(s.velXIndex)
    }
    expect(id, 'the skid chain must reach a stand within ten steps').toBe('PLYBR')
    expect(seen, 'velXIndex rides the deceleration ladder down').toEqual(wantLadder)

    // The flap frame, in stepPlayerEntity's order: ground step, then takeOff.
    s = f.stepGround(s, { dir: 0, flap: true, flapHeld: true }, -1)
    const launched = f.takeOff(s)
    expect(
      launched.velXIndex,
      'a bird that skidded to a stand launches at rest — the −8 it LANDED at must be gone',
    ).toBe(0)
  })

  it('a running takeoff launches at the rung speed, signed by facing', async () => {
    const f = await loadFlight()
    // Left-facing mount running in PLYDR; stick neutral holds the rung.
    let s = grounded({ groundState: 'PLYDR', velXIndex: 8, animPhase: 2 })
    s = f.stepGround(s, STILL, -1)
    expect(s.groundState).toBe('PLYDR')
    const want = -f.GROUND_STATES.PLYDR.flyVel
    expect(s.velXIndex, 'the ground frame parks −flyVel for the left facing').toBe(want)

    const launched = f.takeOff(s)
    expect(launched.velXIndex, 'STFLY inherits PVELX verbatim — the rung speed').toBe(want)
  })

  it('takeOff still performs STFLY\'s other writes — control', async () => {
    // The fix must not disturb what STFLY does do: VY = −$0080, the 1-pixel
    // lift out of the landing band, cleared fraction, airborne, no ground state.
    const f = await loadFlight()
    const s = f.stepGround(grounded({ groundState: 'PLYBR', posY: 137 << 8 }), STILL, 1)
    const launched = f.takeOff(s)
    expect(launched.velY).toBe(f.TAKEOFF_VEL_Y)
    expect(launched.posY).toBe((137 - 1) << 8)
    expect(launched.velXFrac).toBe(0)
    expect(launched.airborne).toBe(true)
    expect(launched.groundState).toBeNull()
  })

  it('landing at speed and flapping straight off keeps the momentum — the arrest is the SKID\'s', async () => {
    // The counter-case that keeps the fix honest: Joust's ground only arrests
    // what the player skids away. Land running left, flap on the very next
    // frame — the launch is at the LANDED rung's speed (left), not at rest.
    const f = await loadFlight()
    const arena = await loadArena()
    const platform = arena.PLATFORMS.find((pl) => pl.snapY === 137)
    if (!platform) throw new Error('no platform with snapY 137')

    let s = f.land(airborne({ velXIndex: -6 }), platform)
    expect(s.groundState).toBe('PLYER')
    s = f.stepGround(s, { dir: 0, flap: true, flapHeld: true }, -1)
    const launched = f.takeOff(s)
    expect(
      launched.velXIndex,
      'a touch-and-go launch keeps the landed rung\'s speed, signed by facing',
    ).toBe(-f.GROUND_STATES.PLYER.flyVel)
  })
})
