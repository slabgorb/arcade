// tests/target-wiring.test.ts
//
// Story jt8-1 — RED phase (Leeloo / TEA). AC-4: the WIRING. The aggro subsystem
// is inert until a smart enemy actually RECEIVES its target — today
// `frame.ts:265` steps every enemy as `stepEnemy(enemy)` with no player, so the
// vertical-seek branch (`enemy.ts` smartDecision) can never fire. This test pins
// the observable that proves the seam is closed: a promoted bounder placed BELOW
// a targetable player flaps UP toward it.
//
// THE DISCRIMINATOR (deterministic, no dynamics guesswork):
//   • flap's first impulse is −96 (`flight.ts:262`, timeUp 1), GRAV is tiny — so
//     a bounder that SEEKS an above-player flaps and its velY goes NEGATIVE.
//   • an UNWIRED bounder gets `player = null`, so smartDecision never takes the
//     seek-up branch; with velY starting at 0 and below the 0x100 down-brake it
//     never flaps — gravity only, velY stays >= 0 (it sinks).
//   So `min(velY) < 0` over a few frames is TRUE wired, FALSE unwired.
//
// RED today: `loadTarget()` throws (src/core/target.ts absent), so the fixture
// cannot even be built — a clean feature-absent red. GREEN (Korben) builds the
// aggro core AND threads `selectTarget` into the enemy step so the seek fires.
//
// TEA CONTRACT DECISION: the aggro state rides the sim (`DemoSim`) as `targets`,
// the same carried-field seat `budget` already occupies — that is the object
// `stepFrame` receives, so the enemy step can reach it. If Dev seats it
// elsewhere, this fixture is where the change surfaces.

import { describe, it, expect, beforeAll } from 'vitest'
import { createWaveDemo, stepDemo, type DemoProcess, type DemoState } from '../src/core/demo.js'
import type { EntityState, PlayerInput } from '../src/core/flight.js'
import { loadTarget, type TargetModule, type TargetState } from './helpers/target-contract.js'

const SEED = 0x1a2b_3c4d
const NEUTRAL: PlayerInput = { dir: 0, flap: false, flapHeld: false }

let T: TargetModule
beforeAll(async () => {
  T = await loadTarget()
})

/** An airborne flight entity at a whole-pixel (x, y), velocities zero. */
function airborneAt(posX: number, pixelY: number): EntityState {
  return {
    posX,
    posY: pixelY << 8,
    velXIndex: 0,
    velXFrac: 0,
    velY: 0,
    timeUp: 1,
    groundState: null,
    plantZ: 0,
    airborne: true,
    animPhase: 0,
  }
}

/** Player 1, airborne HIGH (small pixelY = up). */
function playerAbove(): DemoProcess {
  return {
    id: 1,
    cls: 'primary',
    nap: 1,
    period: 1,
    kind: 'player',
    entity: airborneAt(50, 60),
    facing: 1,
    mount: 'ostrich',
  }
}

/** A PROMOTED bounder (pchase 1, boundr brain) airborne BELOW the player, and far
 * enough in X that the two never joust. */
function promotedBounderBelow(): DemoProcess {
  return {
    id: 0x100,
    cls: 'secondary',
    nap: 1,
    period: 1,
    kind: 'enemy',
    enemy: {
      entity: airborneAt(200, 120),
      facing: 1,
      pchase: 1,
      brain: 'boundr',
      decision: 'boundr',
    },
    enemyType: 'bounder',
    collisionEnabled: true,
  }
}

function theEnemy(demo: DemoState): DemoProcess | undefined {
  return demo.sim.processes.find((p) => p.kind === 'enemy')
}

describe('AC-4 — a smart enemy flaps toward a targetable player once the target is wired', () => {
  it('a promoted bounder below a targetable player gains upward velocity (velY < 0)', () => {
    const base = createWaveDemo(SEED)
    // Player 1 is registered and OUT of grace (targetable): grace 0.
    const targets: TargetState = T.registerPlayer(T.seedTargets(), 1, 0)
    // Craft a two-process sim: the above-player and the below-bounder, plus the
    // aggro state on the carried `targets` seat.
    const crafted: DemoState = {
      ...base,
      sim: { ...base.sim, processes: [playerAbove(), promotedBounderBelow()], targets },
    }

    let demo = crafted
    let minVelY = Number.POSITIVE_INFINITY
    let stayedAirborne = true
    for (let f = 0; f < 6; f++) {
      demo = stepDemo(demo, { 1: NEUTRAL })
      const enemy = theEnemy(demo)
      expect(enemy, 'the bounder must survive the window (no joust)').toBeDefined()
      const e = enemy?.enemy?.entity
      if (!e) break
      if (!e.airborne) stayedAirborne = false
      minVelY = Math.min(minVelY, e.velY)
    }

    // Guard the fixture: if the bounder landed, the coordinates were wrong, not
    // the wiring — surface that distinctly.
    expect(stayedAirborne, 'the bounder must stay airborne to seek — fixture guard').toBe(true)
    // The wiring proof: it flapped UP toward the player it can now see.
    expect(minVelY, 'a wired bounder seeks the above-player and flaps up (velY < 0)').toBeLessThan(0)
  })
})
