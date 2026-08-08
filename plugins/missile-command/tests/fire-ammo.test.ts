// plugins/missile-command/tests/fire-ammo.test.ts
//
// Story mc3-5 — RED phase (Han Solo / TEA). AC2: ammo-gated firing. mc1-4's
// `input.ts` picks the base per fire key and launches an ABM unconditionally.
// mc3 gates it against the LIVE base state: a fire from a live base with ammo > 0
// appends one ABM (from that base to the crosshair, via core/abm.launchAbm) and
// decrements that base's ammo by 1; a fire from a destroyed base, or one at
// ammo 0, is a pure no-op (no ABM, ammo unchanged). The per-key→base mapping
// (Z/X/C → left/centre/right, fireKeyToBase) is preserved.
//
// ─── THE SEAM (a state→state handler, per the mc3 plan Task 9) ────────────────
// The gate needs the base's alive/ammo AND must spend a round, so unlike mc1-4's
// `launchFromKey(key, bases, target): Abm | null` (which only builds a missile),
// this is a reducer over the game state: `fireFromKey(key, state): GameState`.
// It reads state.bases[fireKeyToBase(key)] and state.cursor, and returns a new
// state with abms/bases updated (or the state unchanged). Pure — no mutation.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// `fireFromKey` does not exist on shell/input.ts yet, so the loader throws a
// self-describing "not built yet" and every test reddens for the FEATURE's
// absence, not a bare resolution stack trace. Green arrives when Dev adds the
// gated reducer to input.ts.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createGame, type GameState } from '../src/core/game.js'
import { fireKeyToBase } from '../src/shell/input.js'
import { launchAbm } from '../src/core/abm.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

interface FireModule {
  /** Fire the base `key` selects against state.cursor, gated on that base's
   *  alive/ammo. Returns the next GameState (unchanged for a no-op / non-fire key). */
  fireFromKey: (key: string, state: GameState) => GameState
}

// Variable specifier + `/* @vite-ignore */` so `tsc --noEmit` (the release gate)
// stays green while the new export is still absent — the fleet RED-import idiom.
const INPUT_SPECIFIER = '../src/shell/input.js'

async function loadFire(): Promise<FireModule> {
  try {
    const mod = (await import(/* @vite-ignore */ INPUT_SPECIFIER)) as Partial<FireModule>
    if (typeof mod.fireFromKey !== 'function') {
      throw new Error('shell/input.ts has no `fireFromKey` export')
    }
    return mod as FireModule
  } catch (e) {
    throw new Error(
      'ammo-gated fire seam not built yet — Dev adds to src/shell/input.ts: ' +
        'fireFromKey(key, state): GameState. Resolve base = state.bases[fireKeyToBase(key)]; ' +
        'for a non-fire key or when !base.alive or base.ammo === 0, return state UNCHANGED; ' +
        'otherwise return { ...state, abms: [...state.abms, launchAbm(base.pos, state.cursor)], ' +
        'bases: bases with that base ammo - 1 }. Pure — never mutate the input state. ' +
        `(${(e as Error).message})`,
    )
  }
}

// Aim somewhere unambiguous so the launched ABM's target is checkable.
const AIM = { h: 150, v: 150 }
const aiming = (s: GameState): GameState => ({ ...s, cursor: AIM })
const liveAmmo = (s: GameState): number => s.bases.reduce((n, b) => n + b.ammo, 0)

describe('AC2 — a live base with ammo fires: one ABM out, one round spent', () => {
  it('Z (left base) appends one ABM and drops base 0 ammo by exactly 1', async () => {
    const { fireFromKey } = await loadFire()
    const g = aiming(createGame(1))
    const before = g.bases[0].ammo
    const out = fireFromKey('z', g)
    expect(out.abms.length, 'exactly one ABM must be launched').toBe(g.abms.length + 1)
    expect(out.bases[0].ammo, 'the firing base spends one round').toBe(before - 1)
    expect(out.bases[0].alive, 'firing does not change the base alive flag').toBe(true)
  })

  it('the launched ABM flies from THAT base to the crosshair (core/abm.launchAbm)', async () => {
    const { fireFromKey } = await loadFire()
    const g = aiming(createGame(1))
    const out = fireFromKey('x', g) // centre base
    const launched = out.abms[out.abms.length - 1]
    expect(launched, 'a fire must append an ABM').toBeDefined()
    expect(launched).toEqual(launchAbm(g.bases[1].pos, g.cursor))
  })

  it('firing one base leaves the OTHER bases untouched', async () => {
    const { fireFromKey } = await loadFire()
    const g = aiming(createGame(1))
    const out = fireFromKey('z', g)
    expect(out.bases[1]).toEqual(g.bases[1])
    expect(out.bases[2]).toEqual(g.bases[2])
  })

  it('each key spends its OWN base (per-key→base mapping preserved)', async () => {
    const { fireFromKey } = await loadFire()
    const g = aiming(createGame(1))
    expect(fireKeyToBase('z')).toBe(0)
    expect(fireKeyToBase('x')).toBe(1)
    expect(fireKeyToBase('c')).toBe(2)
    for (const [key, idx] of [
      ['z', 0],
      ['x', 1],
      ['c', 2],
    ] as const) {
      const out = fireFromKey(key, g)
      expect(out.bases[idx].ammo, `${key} must spend base ${idx}`).toBe(g.bases[idx].ammo - 1)
      const others = [0, 1, 2].filter((i) => i !== idx)
      for (const o of others) expect(out.bases[o].ammo, `${key} must not touch base ${o}`).toBe(g.bases[o].ammo)
    }
  })
})

describe('AC2 — a base that cannot fire is a pure no-op', () => {
  it('a base at ammo 0 fires nothing and stays at 0', async () => {
    const { fireFromKey } = await loadFire()
    const g0 = aiming(createGame(1))
    const g: GameState = { ...g0, bases: g0.bases.map((b, i) => (i === 1 ? { ...b, ammo: 0 } : b)) }
    const out = fireFromKey('x', g)
    expect(out.abms.length, 'an empty base launches no ABM').toBe(g.abms.length)
    expect(out.bases[1].ammo, 'ammo must stay 0, never go negative').toBe(0)
    expect(out.bases).toEqual(g.bases)
  })

  it('a destroyed base fires nothing and keeps its ammo', async () => {
    const { fireFromKey } = await loadFire()
    const g0 = aiming(createGame(1))
    const g: GameState = { ...g0, bases: g0.bases.map((b, i) => (i === 2 ? { ...b, alive: false } : b)) }
    const ammoBefore = g.bases[2].ammo
    const out = fireFromKey('c', g)
    expect(out.abms.length, 'a dead base launches no ABM').toBe(g.abms.length)
    expect(out.bases[2].alive).toBe(false)
    expect(out.bases[2].ammo, 'a dead base does not spend ammo').toBe(ammoBefore)
  })

  it('a non-fire key changes nothing', async () => {
    const { fireFromKey } = await loadFire()
    const g = aiming(createGame(1))
    for (const k of [' ', 'a', 'Enter', 'ArrowUp', 'q']) {
      const out = fireFromKey(k, g)
      expect(out.abms.length, `"${k}" must not launch`).toBe(g.abms.length)
      expect(out.bases, `"${k}" must not spend ammo`).toEqual(g.bases)
    }
  })
})

describe('AC2 — the magazine empties and then holds (economy end-to-end)', () => {
  it('firing a base more times than it has ammo spends exactly its ammo, no more', async () => {
    const { fireFromKey } = await loadFire()
    let g = aiming(createGame(1))
    const start = g.bases[0].ammo // MAXMIS
    const shots = start + 2 // two extra, past-empty, no-op shots
    for (let k = 0; k < shots; k++) g = fireFromKey('z', g)
    expect(g.bases[0].ammo, 'base 0 must bottom out at 0, not go negative').toBe(0)
    expect(g.abms.length, 'only `ammo` ABMs ever get launched').toBe(start)
  })

  it('fireFromKey does not mutate the state it was given (pure)', async () => {
    const { fireFromKey } = await loadFire()
    const g = aiming(createGame(1))
    const ammoBefore = g.bases[0].ammo
    const abmsBefore = g.abms.length
    const totalBefore = liveAmmo(g)
    fireFromKey('z', g)
    expect(g.bases[0].ammo, 'the input base ammo must be untouched').toBe(ammoBefore)
    expect(g.abms.length, 'the input abms array must be untouched').toBe(abmsBefore)
    expect(liveAmmo(g)).toBe(totalBefore)
  })
})

describe('AC2 — input.ts gates on core base state, it does not re-implement the flight', () => {
  const inputSrc = (): string => readFileSync(join(root, 'src', 'shell', 'input.ts'), 'utf8')

  it('still launches via core/abm.launchAbm (flight is core geometry)', () => {
    const src = inputSrc()
    expect(src).toMatch(/from\s+['"][^'"]*core\/abm(\.js)?['"]/)
    expect(src).toMatch(/\blaunchAbm\b/)
  })

  it('reads the base alive and ammo fields to gate the shot', () => {
    const src = inputSrc()
    expect(src, 'the gate must consult base.alive').toMatch(/\balive\b/)
    expect(src, 'the gate must consult base.ammo').toMatch(/\bammo\b/)
  })
})
