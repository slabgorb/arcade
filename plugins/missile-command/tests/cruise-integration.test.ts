// plugins/missile-command/tests/cruise-integration.test.ts
//
// Story mc5-3 — RED phase (Leeloo / TEA). Plan task 8 WIRING: cruise missiles
// released INTO stepGame against cruiseBudget, flown via stepAnyIcbm, and the live
// droneRequest signal read off the REAL game state. Keeps the sneaky Dev honest:
// the pure cruise reducer (cruise.test.ts) and the pure selector (drone-trigger.test.ts)
// can each be perfect and still be UNWIRED — a synthetic fixture certifies
// transcription, not liveness. This file OBSERVES the feature in an ordinary game
// run, with a CONTROL that proves the budget gate actually holds.
//
// ─── GROUND TRUTH (REV-01) ───────────────────────────────────────────────────
//   CRMWAV .BYTE 0,0,0,0,0,1,1,2,3,4,4,5,5,6,6,7,7,7,7 (W3MAIN.MAC:5723): the
//   per-wave cruise budget is 0 for waves 1..5 and first nonzero (1) at wave 6.
//   So: NO cruise may appear at wave 5 (the control); a cruise MUST appear once
//   the game is playing wave 6 (the liveness case). Waves are FORCED (re-pinned
//   each tick, the mc5-2 sputnik-integration idiom) so the observation is
//   deterministic and does not depend on a seed reaching wave 6 by luck.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// stepGame does not release cruise missiles yet and src/core/drone-trigger.ts does
// not exist. `loadDrone()` dynamic-imports the selector (string specifier +
// /* @vite-ignore */ so `tsc --noEmit` stays green while it is absent) and throws a
// self-describing "not built — RED"; the wave-6 run never produces a cruise until
// GREEN wires the release. game.js already ships (createGame/stepGame/GameState).

import { describe, it, expect } from 'vitest'
import { createGame, stepGame, type GameState } from '../src/core/game.js'

// Icbm has no `kind` field until GREEN; read it defensively so `tsc --noEmit` stays
// green at RED. A ballistic ICBM (absent kind) is never counted as cruise.
const hasCruise = (s: GameState): boolean =>
  s.icbms.some((i) => (i as { readonly kind?: string }).kind === 'cruise')

type DroneResult = 'sputnik' | 'cruise' | 'both' | null
interface DroneTriggerModule {
  droneRequest: (state: GameState) => DroneResult
}
const DRONE_SPEC = '../src/core/drone-trigger.js'
async function loadDrone(): Promise<DroneTriggerModule> {
  try {
    const mod = (await import(/* @vite-ignore */ DRONE_SPEC)) as Partial<DroneTriggerModule>
    if (typeof mod.droneRequest !== 'function') throw new Error('no `droneRequest` export')
    return mod as DroneTriggerModule
  } catch (e) {
    throw new Error(`drone-trigger.ts not built — RED. GREEN adds the pure droneRequest selector. (${(e as Error).message})`)
  }
}

const FRAMES = 8000 // a ceiling, not a target — the loops break the instant they observe

describe('mc5-3 task 8 — cruise released in stepGame (observed in play)', () => {
  it('CONTROL: a game held at wave 5 never spawns a cruise missile (CRMWAV[5]=0)', () => {
    // Re-pin wave 5 every tick so a wave-end cannot advance into wave 6 and leak a
    // cruise — the guard must observe the case it names (mc5-2 sputnik-control idiom).
    let s: GameState = { ...createGame(1984), wave: 5 }
    let sawCruise = false
    for (let i = 0; i < FRAMES; i++) {
      s = { ...stepGame(s), wave: 5 }
      if (hasCruise(s)) sawCruise = true
    }
    expect(sawCruise).toBe(false) // wave 5 is below the CRMWAV turn-on — no cruise allowed
  })

  it('LIVENESS: a game playing wave 6 releases at least one cruise missile', () => {
    let s: GameState = { ...createGame(1984), wave: 6 }
    let sawCruise = false
    for (let i = 0; i < FRAMES; i++) {
      s = { ...stepGame(s), wave: 6 } // hold wave 6 so the cruise budget keeps refilling
      if (hasCruise(s)) {
        sawCruise = true
        break
      }
    }
    expect(sawCruise).toBe(true) // stepGame must actually put a cruise on screen at wave 6
  })

  it('LIVENESS: droneRequest reads the REAL state — returns a cruise-inclusive kind once a cruise is aloft', async () => {
    const { droneRequest } = await loadDrone()
    let s: GameState = { ...createGame(1984), wave: 6 }
    let sawCruiseSignal = false
    for (let i = 0; i < FRAMES; i++) {
      s = { ...stepGame(s), wave: 6 }
      if (hasCruise(s)) {
        const d = droneRequest(s)
        // A cruise on screen ⇒ the selector reports 'cruise' (or 'both' if a plane is up).
        expect(d === 'cruise' || d === 'both').toBe(true)
        sawCruiseSignal = true
        break
      }
    }
    expect(sawCruiseSignal).toBe(true) // the drone contract fired against a live cruise
  })
})
