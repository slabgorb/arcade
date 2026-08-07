// plugins/missile-command/tests/state.test.ts
//
// Story mc3-3 — RED phase (Han Solo / TEA). Plan task 6. AC2: the minimal
// play->game-over phase machine as a PURE module `src/core/state.ts`.
//
//   type Phase = 'play' | 'over'
//   allCitiesDead(cities)    => true iff cities EXIST and every one is dead
//   nextPhase(phase, cities) => stays 'play' while any city lives; flips to
//                               'over' when all cities are dead; 'over' is TERMINAL
//
// ─── GROUND TRUTH ────────────────────────────────────────────────────────────
//   Missile Command ends the game when every defended city is destroyed. mc3
//   models only that transition; the full attract/setup/pause machine is mc6.
//   This module is pure LOGIC over mc3-1's City model (field.ts) — it introduces
//   no numeric game constant, so it carries no claim and the AC3 literal guard
//   finds nothing to cite in it.
//
// ─── DESIGN DECISION: allCitiesDead([]) === false (empty is NOT game-over) ────
//   `[].every(c => !c.alive)` is VACUOUSLY true, and this fleet has already been
//   burned by that exact shape (centipede: `segs:[]` read as a wave-clear because
//   `[].every()` is true). A zero-city list is a degenerate/uninitialised input,
//   never a game-over — createCities() always yields six. So the terminal state
//   requires cities to have EXISTED and all be dead. Logged as a Delivery Finding
//   so the Reviewer can weigh it; if rejected the fix is one clause, not a redesign.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// `src/core/state.ts` does not exist — loadState() throws self-describingly.
// Purity is guarded automatically by the src/core sweep the moment the file lands;
// this file pins the BEHAVIOUR (the transition table + terminality).

import { describe, it, expect } from 'vitest'
import { createCities, type City } from '../src/core/field.js'

// ─── The contract GREEN (Yoda / Dev) implements: src/core/state.ts ───────────
// Phase is a TYPE-only export (checked by tsc when the shell imports it); the
// runtime surface this file exercises is the two functions.
type Phase = 'play' | 'over'
interface StateModule {
  allCitiesDead: (cities: readonly City[]) => boolean
  nextPhase: (phase: Phase, cities: readonly City[]) => Phase
}

// Variable specifier + /* @vite-ignore */ so `tsc --noEmit` stays green while
// state.ts is still absent — the fleet idiom (damage/icbm/field.test.ts).
const STATE_SPECIFIER = '../src/core/state.js'

async function loadState(): Promise<StateModule> {
  try {
    const mod = (await import(/* @vite-ignore */ STATE_SPECIFIER)) as Partial<StateModule>
    if (typeof mod.allCitiesDead !== 'function' || typeof mod.nextPhase !== 'function') {
      throw new Error('module has no `allCitiesDead`/`nextPhase` export')
    }
    return mod as StateModule
  } catch (e) {
    throw new Error(
      'state core module not built yet — GREEN (Yoda) creates src/core/state.ts, a PURE module: ' +
        "export type Phase = 'play' | 'over'; allCitiesDead(cities) true iff the list is NON-EMPTY and " +
        "every city is dead (an EMPTY list is NOT all-dead — the centipede `[].every()` trap); " +
        "nextPhase(phase, cities) stays 'play' while any city lives, flips to 'over' when all cities are " +
        `dead, and 'over' is TERMINAL (never returns to 'play'). No clock, no entropy, no shell import. ` +
        `(${(e as Error).message})`,
    )
  }
}

// ─── fixtures from the REAL city model (mc3-1's field.ts), not look-alikes ────
const allAlive = (): readonly City[] => createCities()
const kill = (cities: readonly City[], ...idx: number[]): readonly City[] =>
  cities.map((c, i) => (idx.includes(i) ? { ...c, alive: false } : c))
const allDead = (): readonly City[] => allAlive().map((c) => ({ ...c, alive: false }))

// ═════════════════════════════════════════════════════════════════════════════
// AC2a — allCitiesDead
// ═════════════════════════════════════════════════════════════════════════════
describe('mc3-3 AC2 — allCitiesDead', () => {
  it('a fresh field of six live cities is NOT all dead', async () => {
    const { allCitiesDead } = await loadState()
    expect(allCitiesDead(allAlive())).toBe(false)
  })

  it('a single destroyed city is not yet all dead', async () => {
    const { allCitiesDead } = await loadState()
    expect(allCitiesDead(kill(allAlive(), 2))).toBe(false)
  })

  it('one lone survivor (five of six down) still is NOT all dead', async () => {
    const { allCitiesDead } = await loadState()
    expect(allCitiesDead(kill(allAlive(), 0, 1, 2, 3, 4))).toBe(false)
  })

  it('every city destroyed IS all dead', async () => {
    const { allCitiesDead } = await loadState()
    expect(allCitiesDead(allDead())).toBe(true)
  })

  it('an EMPTY city list is NOT all dead — no cities is not game-over (the centipede `[].every()` trap)', async () => {
    const { allCitiesDead } = await loadState()
    expect(allCitiesDead([])).toBe(false)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC2b — nextPhase transitions, and 'over' is terminal
// ═════════════════════════════════════════════════════════════════════════════
describe('mc3-3 AC2 — nextPhase transitions', () => {
  it("stays 'play' while all cities live", async () => {
    const { nextPhase } = await loadState()
    expect(nextPhase('play', allAlive())).toBe('play')
  })

  it("stays 'play' while even one city lives (five of six down)", async () => {
    const { nextPhase } = await loadState()
    expect(nextPhase('play', kill(allAlive(), 0, 1, 2, 3, 4))).toBe('play')
  })

  it("flips 'play' -> 'over' when the last city dies", async () => {
    const { nextPhase } = await loadState()
    expect(nextPhase('play', allDead())).toBe('over')
  })

  it("'over' stays 'over' when all cities are dead (terminal, the ordinary case)", async () => {
    const { nextPhase } = await loadState()
    expect(nextPhase('over', allDead())).toBe('over')
  })

  it("'over' NEVER returns to 'play', even handed a field of live cities (the anti-resurrect guard)", async () => {
    const { nextPhase } = await loadState()
    expect(nextPhase('over', allAlive())).toBe('over')
  })

  it("an empty field does NOT end a running game — 'play' stays 'play' (the `[].every()` trap again)", async () => {
    const { nextPhase } = await loadState()
    expect(nextPhase('play', [])).toBe('play')
  })

  it("returns only 'play' or 'over' — never an out-of-band phase, for any input", async () => {
    const { nextPhase } = await loadState()
    for (const cities of [allAlive(), kill(allAlive(), 0), allDead(), [] as readonly City[]]) {
      expect(['play', 'over']).toContain(nextPhase('play', cities))
      expect(['play', 'over']).toContain(nextPhase('over', cities))
    }
  })
})
