// tests/core/sw10-3-trench-native-basis.test.ts
//
// Story sw10-3 — RED. Migrate the TRENCH phase to the ROM-native world basis
// (sw10-1 AC#2's remaining phase). This suite pins the NATIVE-BASIS CONTRACT the
// trench sim, generators and render must satisfy. It is the discriminating spec
// the inherited 13 red files (trench-*/exhaust-port-*/port-arming) cannot supply
// on their own: those encode game OUTCOMES (a run clears, a torpedo arms, the
// death-knell fires) that are INVARIANT under a coordinate-basis change, so they
// are equally red under "old lens" and "old trench basis" and a Dev could green
// them by reverting sw10-1's lens instead of migrating the trench. These teeth
// cannot — each one is false against the OLD trench basis and true only once the
// trench carries depth/right/up on the native axes.
//
// THE NATIVE BASIS (frozen by sw10-1, `basis.ts`; toNative([x,y,z]) = [-z, x, y]):
//   index 0 = DEPTH   (+X, forward; a fresh port is far ahead at +depth and
//                       scrolls DOWN toward 0 at the cockpit)
//   index 1 = RIGHT   (+Y, the lateral yoke axis)
//   index 2 = UP      (+Z, the vertical yoke axis; the eye is seated at +up)
//
// The OLD trench basis this replaces: index 0 = lateral, index 1 = height,
// index 2 = depth (negative ahead, scrolling UP toward 0). See sim.ts stepTrench
// (port/obstacle scroll `pos[2] + SCROLL`, despawn `pos[2] > 0`) and the OLD-basis
// sibling assertions in trench-obstacles.test.ts ("...pos[2]", "pos z > 0") that
// Dev must sweep in lockstep with this migration.
//
// The aim/eye SUPPORT layer (tests/support/aim.ts: eyeOf/aimAt/FIRE_AT_PORT) was
// ALREADY migrated to native by sw10-1 — it inverts the authentic lens in native
// coordinates. That is precisely why the trench suites are red today: a native
// aim fed to an old-basis sim does not line up. Making the sim native is what
// re-aligns them.
//
// tsc stays green: every symbol below already exists; only the ASSERTED axis is
// new. No new production export is referenced.

import { describe, it, expect } from 'vitest'
import { initialState, EXHAUST_PORT_DISTANCE, TRENCH_SCROLL_SPEED, type GameState } from '../../src/core/state'
import { stepGame, enterPhase } from '../../src/core/sim'
import { NO_INPUT, type Input } from '../../src/core/input'
import { trenchChannel, TRENCH_FAR, TRENCH_HALF_W, TRENCH_WALL_H } from '../../src/core/trench-channel'
import type { Vec3 } from '@shared/math3d'
import * as RenderModule from '../../src/shell/render'

/** One real 60fps frame. */
const FRAME = 1 / 60

/** A steppable trench run with a controlled obstacle/port set (everything else
 *  fresh from the trench-entry chain). */
const trench = (over: Partial<GameState>): GameState => ({ ...enterPhase(initialState(), 'trench'), ...over })

// ---------------------------------------------------------------------------
// AC#1 — the trench SIM carries depth/right/up on the native indices
// ---------------------------------------------------------------------------

describe('sw10-3 AC#1 — trench sim scroll runs down NATIVE depth (index 0)', () => {
  it('an obstacle ahead scrolls its native depth (pos[0]) DOWN toward the cockpit, not its pos[2]', () => {
    // Old sim scrolls pos[2] up and despawns on pos[2] > 0, so a native-seated
    // obstacle at [depth, 0, 0] is despawned in one step (pos[2] := SCROLL*dt > 0).
    const s0 = trench({ trenchObstacles: [{ kind: 'square', pos: [TRENCH_FAR / 2, 0, 0] }] })
    const s1 = stepGame(s0, NO_INPUT, FRAME)

    expect(s1.trenchObstacles).toHaveLength(1) // still downrange — NOT despawned
    const o = s1.trenchObstacles[0]
    expect(o.pos[0]).toBeCloseTo(TRENCH_FAR / 2 - TRENCH_SCROLL_SPEED * FRAME, 3) // native depth closes
    expect(o.pos[2]).toBeCloseTo(0, 6) // native up is untouched by the scroll
  })

  it('despawns on the native depth boundary (pos[0] < 0), keeping obstacles still ahead', () => {
    // Two obstacles: one just past the cockpit in native depth, one far ahead.
    // Native despawn (pos[0] < 0) drops the first, keeps the second. Old despawn
    // (pos[2] > 0) drops BOTH (each gets pos[2] := SCROLL*dt > 0).
    const s0 = trench({
      trenchObstacles: [
        { kind: 'square', pos: [-1, 0, 0] }, // already past the cockpit plane
        { kind: 'square', pos: [TRENCH_FAR / 2, 0, 0] }, // still downrange
      ],
    })
    const s1 = stepGame(s0, NO_INPUT, FRAME)

    expect(s1.trenchObstacles).toHaveLength(1)
    expect(s1.trenchObstacles[0].pos[0]).toBeGreaterThan(0) // the survivor is the one ahead
  })

  it('the exhaust port scrolls its native depth (pos[0]) toward the cockpit', () => {
    const s0 = trench({ exhaustPort: { pos: [EXHAUST_PORT_DISTANCE, 0, 0] }, trenchObstacles: [] })
    const s1 = stepGame(s0, NO_INPUT, FRAME)

    expect(s1.exhaustPort).not.toBeNull()
    expect(s1.exhaustPort!.pos[0]).toBeCloseTo(EXHAUST_PORT_DISTANCE - TRENCH_SCROLL_SPEED * FRAME, 3)
  })
})

describe('sw10-3 AC#1 — the pilot yoke drives trenchView on the native right/up axes', () => {
  const delta = (a: Vec3, b: Vec3): Vec3 => [b[0] - a[0], b[1] - a[1], b[2] - a[2]]

  it('lateral yoke (aimX) moves native RIGHT (index 1), leaving native DEPTH (index 0) at rest', () => {
    const s0 = trench({ trenchObstacles: [], exhaustPort: null })
    const right: Input = { ...NO_INPUT, aimX: 1 }
    const d = delta(s0.trenchView, stepGame(s0, right, FRAME).trenchView)

    expect(d[1]).not.toBe(0) // the lateral yoke lands on native RIGHT...
    expect(d[0]).toBe(0) // ...not on the native DEPTH axis (old sim moved index 0)
  })

  it('vertical yoke (aimY) moves native UP (index 2), leaving native DEPTH (index 0) at rest', () => {
    const s0 = trench({ trenchObstacles: [], exhaustPort: null })
    const up: Input = { ...NO_INPUT, aimY: 1 }
    const d = delta(s0.trenchView, stepGame(s0, up, FRAME).trenchView)

    expect(d[2]).not.toBe(0) // the vertical yoke lands on native UP...
    expect(d[0]).toBe(0) // ...not on the native DEPTH axis
  })
})

// ---------------------------------------------------------------------------
// AC#2 — generators and render emit native coordinates
// ---------------------------------------------------------------------------

describe('sw10-3 AC#2 — the trench channel generator spans native DEPTH (index 0)', () => {
  it('trenchChannel runs from the cockpit (depth 0) to TRENCH_FAR along index 0, with walls on right/up', () => {
    const verts = trenchChannel(0).vertices
    const depths = verts.map((v) => v[0])
    expect(Math.max(...depths)).toBeCloseTo(TRENCH_FAR, 6) // far cap on native depth...
    expect(Math.min(...depths)).toBeCloseTo(0, 6) // ...cockpit end at depth 0 (old put ±HALF_W here)

    // The channel cross-section lives on the native right/up axes.
    const rights = verts.map((v) => Math.abs(v[1]))
    const ups = verts.map((v) => v[2])
    expect(Math.max(...rights)).toBeCloseTo(TRENCH_HALF_W, 6) // walls at ±HALF_W on native RIGHT
    expect(Math.max(...ups)).toBeCloseTo(TRENCH_WALL_H, 6) // wall top on native UP
  })
})

describe('sw10-3 AC#2 — render.trenchPlacement emits the port on native DEPTH (index 0)', () => {
  it('the no-port default seats the port far ahead on native depth (index 0), not on index 2', () => {
    const place = RenderModule.trenchPlacement(trench({ exhaustPort: null }))
    expect(place.port[0]).toBeCloseTo(EXHAUST_PORT_DISTANCE, 6) // depth on index 0 (old: 0 here)
    expect(place.port[2]).toBeCloseTo(0, 6) // native up, not the old -EXHAUST_PORT_DISTANCE depth
  })

  it('the floor plane tracks the live port on the native depth axis', () => {
    const state = trench({ exhaustPort: { pos: [EXHAUST_PORT_DISTANCE, 0, 0] } })
    const place = RenderModule.trenchPlacement(state)
    expect(place.floor[0]).toBeCloseTo(place.port[0], 6) // floor depth reads index 0 (old: floor = [0,0,port[2]])
  })
})
