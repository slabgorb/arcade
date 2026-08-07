// plugins/missile-command/tests/structures.test.ts
//
// Story mc3-1 — RED phase (Han Solo / TEA). AC3: field.ts gains the *stateful*
// structures the game mutates — a City that can die, a Base that can die and
// holds ammo — built from the same cited positions mc1 already exports. The
// positional constants (CITIES, BASES) and their claims are UNTOUCHED; render
// still reads them for layout. This story only APPENDS.
//
// ─── GROUND TRUTH (REV-01 W3COMN.MAC, single-spaced → physical cites) ─────────
//   MAXMIS = 10  W3COMN.MAC:29 (`MAXMIS=10.`, decimal override; claim MC-MAXMIS
//     already exists from mc2-1) — ABMs loaded per base at a fresh game.
//   NCITY = 6 / NMISBA = 3 fix the counts createCities/createBases must produce.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// CITIES / BASES exist (statically imported below — untouched). createCities,
// createBases and MAXMIS do NOT exist yet; `loadStruct()` dynamic-imports field.ts
// and throws a self-describing "not built yet" until GREEN appends them. The
// static import proves the pre-existing exports survive; the dynamic import
// proves the new ones arrive — so tsc (release gate) stays green meanwhile.

import { describe, it, expect } from 'vitest'
import { CITIES, BASES } from '../src/core/field.js'

/** A point in cabinet coordinates — matches field.ts FieldPos. */
interface FieldPos {
  readonly h: number
  readonly v: number
}
/** A city that can be destroyed (mc3). Position is the fixed cabinet coord. */
interface City {
  readonly pos: FieldPos
  readonly alive: boolean
}
/** A missile base: destroyable, and its ABM magazine. `ammo` starts at MAXMIS. */
interface Base {
  readonly pos: FieldPos
  readonly alive: boolean
  readonly ammo: number
}
interface StructMod {
  createCities: () => readonly City[]
  createBases: () => readonly Base[]
  MAXMIS: number
}

const STRUCT_SPECIFIER = '../src/core/field.js'
async function loadStruct(): Promise<StructMod> {
  const mod = (await import(/* @vite-ignore */ STRUCT_SPECIFIER)) as Partial<StructMod>
  if (
    typeof mod.createCities !== 'function' ||
    typeof mod.createBases !== 'function' ||
    typeof mod.MAXMIS !== 'number'
  ) {
    throw new Error(
      'field.ts stateful structures not built yet — GREEN (Yoda) APPENDS to src/core/field.ts: ' +
        'City{pos,alive} and Base{pos,alive,ammo} types, createCities() (one live City per CITIES ' +
        'entry, 6 live), createBases() (one live Base per BASES entry, 3 live, each ammo=MAXMIS), ' +
        'and `export const MAXMIS = 10` (W3COMN MAXMIS, claim MC-MAXMIS). Do NOT alter the existing ' +
        'CITIES/BASES/NCITY/NMISBA exports or their claims.',
    )
  }
  return mod as StructMod
}

describe('mc3-1 AC3 — the pre-existing cited field exports still stand (append-only)', () => {
  it('CITIES holds the 6 city positions and BASES the 3 base positions', () => {
    // A guard against a rewrite of the existing constants: createCities/createBases
    // must be BUILT ON these, not replace them.
    expect(CITIES.length).toBe(6)
    expect(BASES.length).toBe(3)
  })
})

describe('mc3-1 AC3 — createCities makes six live cities at the cited positions', () => {
  it('returns one live city per CITIES entry, at exactly those positions', async () => {
    const { createCities } = await loadStruct()
    const cities = createCities()
    expect(cities.length).toBe(CITIES.length) // 6
    expect(cities.length).toBe(6)
    cities.forEach((c, i) => {
      expect(c.alive, `city ${i} should start alive`).toBe(true)
      expect(c.pos, `city ${i} should sit at CITIES[${i}]`).toEqual(CITIES[i])
    })
  })

  it('every city starts alive (a fresh game is fully defended)', async () => {
    const { createCities } = await loadStruct()
    expect(createCities().every((c) => c.alive)).toBe(true)
  })
})

describe('mc3-1 AC3 — createBases makes three live bases each loaded with MAXMIS ammo', () => {
  it('MAXMIS is 10 (W3COMN MAXMIS, claim MC-MAXMIS)', async () => {
    expect((await loadStruct()).MAXMIS).toBe(10)
  })

  it('returns one live, fully-loaded base per BASES entry, at those positions', async () => {
    const { createBases, MAXMIS } = await loadStruct()
    const bases = createBases()
    expect(bases.length).toBe(BASES.length) // 3
    expect(bases.length).toBe(3)
    bases.forEach((b, i) => {
      expect(b.alive, `base ${i} should start alive`).toBe(true)
      expect(b.ammo, `base ${i} should start with MAXMIS ammo`).toBe(MAXMIS)
      expect(b.pos, `base ${i} should sit at BASES[${i}]`).toEqual(BASES[i])
    })
  })
})

describe('mc3-1 AC3 — the constructors are pure factories (no shared mutable state)', () => {
  it('two createCities() calls return equal-but-independent arrays', async () => {
    const { createCities } = await loadStruct()
    const a = createCities()
    const b = createCities()
    expect(a).toEqual(b) // same content
    expect(a).not.toBe(b) // a fresh array each call — no shared singleton to mutate
  })

  it('two createBases() calls return equal-but-independent arrays', async () => {
    const { createBases } = await loadStruct()
    const a = createBases()
    const b = createBases()
    expect(a).toEqual(b)
    expect(a).not.toBe(b)
  })
})
