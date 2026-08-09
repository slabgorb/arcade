// plugins/missile-command/tests/drone-trigger.test.ts
//
// Story mc5-3 — RED phase (Leeloo / TEA). Plan task 8: the `droneRequest(state)`
// SELECTOR — the pure contract that UNBLOCKS mc8-5. mc8's descending drone voice
// (src/core/drone.ts, DroneKind = 'sputnik'|'cruise'|'both') needs to know WHICH
// drone, if any, should sound each frame. That decision is a pure read of the game
// state: how many cruise missiles are on screen, and whether a Sputnik is aloft.
//
//   cruiseOnScreen = state.icbms.filter(i => i.kind === 'cruise').length
//   sputnikActive  = state.sputniks.length > 0
//     both present → 'both'   cruise only → 'cruise'   sputnik only → 'sputnik'
//     neither      → null   (the drone is silent)
//
// This is the TRUTH TABLE mc8-5 will consume. It is a pure function of two presence
// signals; the ROM's live-trigger is CRMONS (cruise-on-screen count, W3MAIN.MAC:271)
// + the plane flag — modelled here as the on-screen cruise/plane rosters. No numeric
// constant, so no claim; purity.test.ts sweeps the new module when it lands.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// `src/core/drone-trigger.ts` does not exist. `load()` dynamic-imports it (string
// specifier + /* @vite-ignore */ so `tsc --noEmit` stays green while it is absent)
// and throws a self-describing "not built — RED". The state is a MINIMAL literal
// shaped to exactly what the selector reads (icbms' kind + sputniks' length), so
// the test is decoupled from the rest of GameState — it pins the CONTRACT, not the
// wiring (that liveness is cruise-integration.test.ts).

import { describe, it, expect } from 'vitest'

/** Only the two fields droneRequest reads off each ICBM/plane matter to the contract. */
interface Kinded {
  readonly kind?: 'ballistic' | 'cruise'
}
interface DroneState {
  readonly icbms: readonly Kinded[]
  readonly sputniks: readonly unknown[]
}
type DroneResult = 'sputnik' | 'cruise' | 'both' | null

interface DroneTriggerModule {
  droneRequest: (state: DroneState) => DroneResult
}

const SPEC = '../src/core/drone-trigger.js'
async function load(): Promise<DroneTriggerModule> {
  try {
    const mod = (await import(/* @vite-ignore */ SPEC)) as Partial<DroneTriggerModule>
    if (typeof mod.droneRequest !== 'function') throw new Error('no `droneRequest` export')
    return mod as DroneTriggerModule
  } catch (e) {
    throw new Error(
      'drone-trigger.ts not built — RED. GREEN adds a PURE `droneRequest(state): ' +
        "DroneKind | null` to src/core/drone-trigger.ts: cruise-on-screen (kind==='cruise') + " +
        'sputnik-active (sputniks.length>0) → both|cruise|sputnik|null. No side effects, no clock. ' +
        `(${(e as Error).message})`,
    )
  }
}

const ballistic: Kinded = { kind: 'ballistic' }
const cruise: Kinded = { kind: 'cruise' }
const plane = {} // droneRequest only cares that a plane EXISTS (sputniks.length)

describe('mc5-3 task 8 — droneRequest truth table (the mc8-5 contract)', () => {
  it('covers all four presence cases', async () => {
    const { droneRequest } = await load()
    expect(droneRequest({ icbms: [ballistic], sputniks: [] })).toBeNull() // neither
    expect(droneRequest({ icbms: [cruise], sputniks: [] })).toBe('cruise') // cruise only
    expect(droneRequest({ icbms: [ballistic], sputniks: [plane] })).toBe('sputnik') // sputnik only
    expect(droneRequest({ icbms: [cruise], sputniks: [plane] })).toBe('both') // both
  })

  it('is null when the screen is empty (no icbms, no planes)', async () => {
    const { droneRequest } = await load()
    expect(droneRequest({ icbms: [], sputniks: [] })).toBeNull()
  })

  it('ONLY cruise-kind ICBMs count as cruise — a swarm of ballistics with a plane is sputnik-only', async () => {
    const { droneRequest } = await load()
    // Guards against a mutant that keys off icbms.length instead of the kind filter.
    expect(droneRequest({ icbms: [ballistic, ballistic, ballistic], sputniks: [plane] })).toBe('sputnik')
    expect(droneRequest({ icbms: [ballistic, ballistic, ballistic], sputniks: [] })).toBeNull()
  })

  it('multiple cruise missiles still resolve to a single kind (cruise / both)', async () => {
    const { droneRequest } = await load()
    expect(droneRequest({ icbms: [cruise, cruise], sputniks: [] })).toBe('cruise')
    expect(droneRequest({ icbms: [cruise, cruise, ballistic], sputniks: [plane, plane] })).toBe('both')
  })
})
