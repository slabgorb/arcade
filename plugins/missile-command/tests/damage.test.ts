// plugins/missile-command/tests/damage.test.ts
//
// Story mc3-2 — RED phase (Han Solo / TEA). AC1 + AC2 + AC3: the core damage
// mechanic as TWO PURE reducers in `src/core/damage.ts`. Core owns the geometry;
// the shell never decides who dies.
//
//   (a) killIcbmsInBlasts(icbms, explosions) → { survivors, killed }
//       An ICBM is destroyed when its HEAD (icbm.pos) lies within blastRadius(exp)
//       of any LIVE blast — the point-in-circle test against mc1's explosion.ts.
//       A finished / zero-radius blast kills nothing (even a head at its centre).
//
//   (b) resolveGroundImpacts(icbms, cities, bases) → { cities, bases, icbms }
//       An ARRIVED ICBM at a city/base target sets that structure alive=false and
//       is removed from the returned ICBM list; other structures are untouched; an
//       in-flight (not arrived) ICBM damages nothing and stays in the list.
//
// ─── GROUND TRUTH (REV-01 W3MAIN.MAC) ────────────────────────────────────────
//   MISSILE DAMAGE DETECTION & PROCESS — the per-tick sweep that tests each live
//     enemy warhead's head against every live blast circle and removes the ones
//     caught. mc3 models the SHAPE (point-in-circle vs the OLDRAD radius); the
//     exact per-frame cadence is later fidelity. No new claimed constant — the
//     radius comes from explosion.ts's already-cited MAX_BLAST_RADIUS.
//   DESTROY A CITY OR BASE — when an enemy warhead reaches a defended structure,
//     that city/base is destroyed. mc3 flips `alive` and drops the arrived ICBM.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// `src/core/damage.ts` does not exist yet. `loadDamage()` dynamic-imports it and
// throws a self-describing "not built yet" (never a bare module-resolution stack
// trace), so every behaviour test reddens for the FEATURE's absence, and the
// AC3 source-citation scan reddens on the missing file. Purity of the new module
// and its "no un-cited literal" obligation are guarded AUTOMATICALLY by the
// src/core sweeps in purity.test.ts / citations.test.ts the moment the file lands
// — this file does not re-assert them (it enforces the two ROUTINE names, the
// enforceable half of AC3).

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// Live sibling modules (mc1 + mc3-1, already GREEN) — build REAL fixtures so the
// contract is exercised against the actual types, not hand-rolled look-alikes.
import {
  blastRadius,
  startExplosion,
  stepExplosion,
  MAX_BLAST_RADIUS,
  type Explosion,
} from '../src/core/explosion.js'
import { launchIcbm, stepIcbm, type Icbm, type Vec } from '../src/core/icbm.js'
import { CITIES, BASES, createCities, createBases, type City, type Base } from '../src/core/field.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// ─── The contract GREEN (Yoda / Dev) implements: src/core/damage.ts ──────────

interface KillResult {
  /** ICBMs NOT caught by any live blast — returned untouched, in original order. */
  readonly survivors: readonly Icbm[]
  /** ICBMs destroyed this tick; `killed.length` is the kill count. */
  readonly killed: readonly Icbm[]
}

interface GroundResult {
  readonly cities: readonly City[]
  readonly bases: readonly Base[]
  /** The ICBMs still in flight — arrived (impacting) ICBMs are removed. */
  readonly icbms: readonly Icbm[]
}

interface DamageModule {
  killIcbmsInBlasts: (
    icbms: readonly Icbm[],
    explosions: readonly Explosion[],
  ) => KillResult
  resolveGroundImpacts: (
    icbms: readonly Icbm[],
    cities: readonly City[],
    bases: readonly Base[],
  ) => GroundResult
}

// Variable specifier + `/* @vite-ignore */` so `tsc --noEmit` (the release gate)
// stays green while damage.ts is still absent — the fleet idiom for a RED import
// of a not-yet-built module (icbm.test.ts / abm.test.ts / field.test.ts).
const DAMAGE_SPECIFIER = '../src/core/damage.js'

async function loadDamage(): Promise<DamageModule> {
  try {
    const mod = (await import(/* @vite-ignore */ DAMAGE_SPECIFIER)) as Partial<DamageModule>
    if (
      typeof mod.killIcbmsInBlasts !== 'function' ||
      typeof mod.resolveGroundImpacts !== 'function'
    ) {
      throw new Error('module has no `killIcbmsInBlasts`/`resolveGroundImpacts` export')
    }
    return mod as DamageModule
  } catch (e) {
    throw new Error(
      'damage core module not built yet — GREEN (Yoda) creates src/core/damage.ts, a PURE module ' +
        'with two reducers. killIcbmsInBlasts(icbms, explosions) returns {survivors, killed}: an ICBM ' +
        'is killed when its HEAD (icbm.pos) lies within blastRadius(exp) of ANY blast (point-in-circle ' +
        'vs explosion.ts); a zero-radius/finished blast kills nothing; survivors keep their order and ' +
        'are returned untouched. resolveGroundImpacts(icbms, cities, bases) returns {cities, bases, ' +
        'icbms}: an ARRIVED ICBM whose target matches a structure position flips that structure to ' +
        'alive=false and is dropped from the returned icbms; in-flight ICBMs and unhit structures are ' +
        'untouched. Cite MISSILE DAMAGE DETECTION and DESTROY A CITY OR BASE (W3MAIN). No clock, no ' +
        `entropy, no shell import, no new claimed literal (the sweeps guard it). (${(e as Error).message})`,
    )
  }
}

// ─── fixture builders (real modules, so the assertions read plainly) ─────────

/** Step an explosion n ticks forward. */
const stepN = (e: Explosion, n: number): Explosion => {
  let cur = e
  for (let i = 0; i < n; i++) cur = stepExplosion(cur)
  return cur
}

/** A blast at (h,v) stepped to its PEAK radius (blastRadius === MAX_BLAST_RADIUS). */
const peakBlast = (h: number, v: number): Explosion => {
  let e = startExplosion(h, v)
  // mc9-3: under the EXPFRA cadence the radius is FLAT within each 5-frame window, so
  // the old "next tick is larger" probe stops immediately at radius 0. Walk to the
  // exported MAX instead — cadence-robust, and still correct for the mc1-4 triangle.
  // Bounded so a blast that never peaks fails loudly rather than looping forever.
  for (let i = 0; blastRadius(e) < MAX_BLAST_RADIUS && i < 10000; i++) e = stepExplosion(e)
  return e
}

/** An ICBM whose HEAD sits exactly at p (launched from p; not stepped). */
const headAt = (p: Vec): Icbm => launchIcbm(p, { h: p.h, v: p.v - 50 })

/** An ICBM flown all the way to `target` so arrived=true and pos=target. */
const arrivedAt = (target: Vec): Icbm => {
  let i = launchIcbm({ h: target.h, v: target.v + 100 }, target)
  for (let n = 0; n < 5000 && !i.arrived; n++) i = stepIcbm(i)
  return i
}

/** An ICBM still in flight toward `target` (arrived=false). */
const inflightTo = (target: Vec): Icbm =>
  launchIcbm({ h: target.h, v: target.v + 100 }, target)

const asVec = (p: { h: number; v: number }): Vec => ({ h: p.h, v: p.v })

const CENTER: Vec = { h: 100, v: 100 }

// ═════════════════════════════════════════════════════════════════════════════
// AC1 — killIcbmsInBlasts: a live blast destroys the ICBMs whose heads it covers
// ═════════════════════════════════════════════════════════════════════════════

describe('mc3-2 AC1 — killIcbmsInBlasts destroys a head inside a live blast, spares one outside', () => {
  it('an ICBM head at the blast centre is destroyed (killed, not a survivor)', async () => {
    const { killIcbmsInBlasts } = await loadDamage()
    const blast = peakBlast(CENTER.h, CENTER.v)
    const inside = headAt(CENTER)
    const { survivors, killed } = killIcbmsInBlasts([inside], [blast])
    expect(killed).toContainEqual(inside)
    expect(survivors).toHaveLength(0)
  })

  it('an ICBM head well outside the blast radius survives (spared, not killed)', async () => {
    const { killIcbmsInBlasts } = await loadDamage()
    const blast = peakBlast(CENTER.h, CENTER.v)
    const r = blastRadius(blast)
    const outside = headAt({ h: CENTER.h, v: CENTER.v + r + 10 })
    const { survivors, killed } = killIcbmsInBlasts([outside], [blast])
    expect(survivors).toContainEqual(outside)
    expect(killed).toHaveLength(0)
  })

  it('splits a mixed list, counting the kills and returning the untouched survivors in order', async () => {
    const { killIcbmsInBlasts } = await loadDamage()
    const blast = peakBlast(CENTER.h, CENTER.v)
    const r = blastRadius(blast)
    const inside = headAt(CENTER)
    const a = headAt({ h: CENTER.h, v: CENTER.v + r + 20 })
    const b = headAt({ h: CENTER.h, v: CENTER.v + r + 40 })
    const { survivors, killed } = killIcbmsInBlasts([a, inside, b], [blast])
    expect(killed).toHaveLength(1) // the count
    expect(killed[0]).toEqual(inside)
    expect(survivors).toEqual([a, b]) // order preserved, only the caught one removed
  })
})

describe('mc3-2 AC1 — a finished / zero-radius blast kills nothing (the guard)', () => {
  it('a fresh blast (radius 0) does not kill a head sitting exactly at its centre', async () => {
    const { killIcbmsInBlasts } = await loadDamage()
    const fresh = startExplosion(CENTER.h, CENTER.v)
    expect(blastRadius(fresh)).toBe(0) // precondition: zero radius
    const { survivors, killed } = killIcbmsInBlasts([headAt(CENTER)], [fresh])
    expect(killed).toHaveLength(0)
    expect(survivors).toHaveLength(1)
  })

  it('a collapsed (finished) blast — radius back to 0 — also kills nothing at its centre', async () => {
    const { killIcbmsInBlasts } = await loadDamage()
    const done = stepN(startExplosion(CENTER.h, CENTER.v), 200)
    expect(blastRadius(done)).toBe(0) // precondition: expanded then collapsed to 0
    const { killed } = killIcbmsInBlasts([headAt(CENTER)], [done])
    expect(killed).toHaveLength(0)
  })
})

describe('mc3-2 AC1 — an ICBM is killed if it lies within ANY live blast', () => {
  it('a head covered by the second of two blasts is destroyed', async () => {
    const { killIcbmsInBlasts } = await loadDamage()
    const far = peakBlast(CENTER.h + 500, CENTER.v) // nowhere near the head
    const near = peakBlast(CENTER.h, CENTER.v) // covers the head
    const { killed } = killIcbmsInBlasts([headAt(CENTER)], [far, near])
    expect(killed).toHaveLength(1)
  })
})

describe('mc3-2 AC1 — killIcbmsInBlasts is pure and total (no mutation, handles empties)', () => {
  it('does not mutate the ICBMs it is given', async () => {
    const { killIcbmsInBlasts } = await loadDamage()
    const blast = peakBlast(CENTER.h, CENTER.v)
    const icbm = headAt(CENTER)
    const snapshot = JSON.parse(JSON.stringify(icbm))
    killIcbmsInBlasts([icbm], [blast])
    expect(icbm).toEqual(snapshot)
  })

  it('no explosions → every ICBM survives, nothing killed', async () => {
    const { killIcbmsInBlasts } = await loadDamage()
    const { survivors, killed } = killIcbmsInBlasts([headAt(CENTER)], [])
    expect(survivors).toHaveLength(1)
    expect(killed).toHaveLength(0)
  })

  it('no ICBMs → empty survivors and empty killed', async () => {
    const { killIcbmsInBlasts } = await loadDamage()
    const blast = peakBlast(CENTER.h, CENTER.v)
    expect(killIcbmsInBlasts([], [blast])).toEqual({ survivors: [], killed: [] })
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC2 — resolveGroundImpacts: an arrived ICBM destroys the city/base at its target
// ═════════════════════════════════════════════════════════════════════════════

describe('mc3-2 AC2 — an ARRIVED ICBM destroys the city at its target and is removed', () => {
  it('flips that one city to alive=false, leaves the rest alive, and drops the ICBM', async () => {
    const { resolveGroundImpacts } = await loadDamage()
    const cities = createCities()
    const bases = createBases()
    const hit = arrivedAt(asVec(CITIES[2]))
    expect(hit.arrived).toBe(true) // fixture precondition

    const out = resolveGroundImpacts([hit], cities, bases)

    expect(out.cities).toHaveLength(cities.length) // no structure added/removed
    expect(out.cities[2].alive).toBe(false)
    out.cities.forEach((c, i) => {
      if (i !== 2) expect(c.alive, `city ${i} should be untouched`).toBe(true)
    })
    expect(out.bases.every((b) => b.alive)).toBe(true) // bases untouched
    expect(out.icbms).toHaveLength(0) // arrived ICBM removed
  })
})

describe('mc3-2 AC2 — an ARRIVED ICBM destroys the base at its target and is removed', () => {
  it('flips that one base to alive=false, preserves its ammo, leaves cities alive, drops the ICBM', async () => {
    const { resolveGroundImpacts } = await loadDamage()
    const cities = createCities()
    const bases = createBases()
    const ammoBefore = bases[1].ammo
    const hit = arrivedAt(asVec(BASES[1]))

    const out = resolveGroundImpacts([hit], cities, bases)

    expect(out.bases).toHaveLength(bases.length)
    expect(out.bases[1].alive).toBe(false)
    expect(out.bases[1].ammo, 'destroying a base does not silently zero its ammo').toBe(ammoBefore)
    out.bases.forEach((b, i) => {
      if (i !== 1) expect(b.alive, `base ${i} should be untouched`).toBe(true)
    })
    expect(out.cities.every((c) => c.alive)).toBe(true)
    expect(out.icbms).toHaveLength(0)
  })
})

describe('mc3-2 AC2 — an in-flight (not arrived) ICBM damages nothing and stays in the list', () => {
  it('a warhead still en route to a city leaves every structure alive and remains', async () => {
    const { resolveGroundImpacts } = await loadDamage()
    const cities = createCities()
    const bases = createBases()
    const flying = inflightTo(asVec(CITIES[0]))
    expect(flying.arrived).toBe(false) // fixture precondition

    const out = resolveGroundImpacts([flying], cities, bases)

    expect(out.cities.every((c) => c.alive)).toBe(true)
    expect(out.bases.every((b) => b.alive)).toBe(true)
    expect(out.icbms).toContainEqual(flying) // still in flight
    expect(out.icbms).toHaveLength(1)
  })
})

describe('mc3-2 AC2 — a mixed volley: arrived ICBMs impact, the in-flight one flies on', () => {
  it('kills the two targeted structures and keeps only the in-flight ICBM', async () => {
    const { resolveGroundImpacts } = await loadDamage()
    const cities = createCities()
    const bases = createBases()
    const hitCity = arrivedAt(asVec(CITIES[0]))
    const flying = inflightTo(asVec(CITIES[1]))
    const hitBase = arrivedAt(asVec(BASES[0]))

    const out = resolveGroundImpacts([hitCity, flying, hitBase], cities, bases)

    expect(out.cities[0].alive).toBe(false)
    expect(out.cities[1].alive).toBe(true) // only in-flight toward it
    expect(out.bases[0].alive).toBe(false)
    expect(out.icbms).toHaveLength(1)
    expect(out.icbms[0]).toEqual(flying)
  })
})

describe('mc3-2 AC2 — resolveGroundImpacts is pure and total (no mutation, handles empties)', () => {
  it('does not mutate the input cities/bases/icbms arrays or their elements', async () => {
    const { resolveGroundImpacts } = await loadDamage()
    const cities = createCities()
    const bases = createBases()
    const citiesSnap = JSON.parse(JSON.stringify(cities))
    const basesSnap = JSON.parse(JSON.stringify(bases))
    resolveGroundImpacts([arrivedAt(asVec(CITIES[0]))], cities, bases)
    expect(cities, 'input cities mutated').toEqual(citiesSnap)
    expect(bases, 'input bases mutated').toEqual(basesSnap)
  })

  it('no ICBMs → structures unchanged, no impacts', async () => {
    const { resolveGroundImpacts } = await loadDamage()
    const cities = createCities()
    const bases = createBases()
    const out = resolveGroundImpacts([], cities, bases)
    expect(out.cities.every((c) => c.alive)).toBe(true)
    expect(out.bases.every((b) => b.alive)).toBe(true)
    expect(out.icbms).toHaveLength(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC3 — damage.ts carries its W3MAIN source citations (the enforceable half)
// ═════════════════════════════════════════════════════════════════════════════

describe('mc3-2 AC3 — damage.ts names the two W3MAIN routines it models', () => {
  // A source-of-truth comment must name both routines. Purity and the
  // no-un-cited-literal rule are enforced elsewhere (purity.test.ts /
  // citations.test.ts sweep src/core automatically); this pins the ROUTINE names.
  const damageSrc = (): string => readFileSync(join(root, 'src', 'core', 'damage.ts'), 'utf8')

  it('cites MISSILE DAMAGE DETECTION — the blast-vs-warhead sweep it models', () => {
    expect(damageSrc(), 'must name the damage-detection routine').toMatch(
      /MISSILE DAMAGE DETECTION/,
    )
  })

  it('cites DESTROY A CITY OR BASE — the ground-impact routine it models', () => {
    expect(damageSrc(), 'must name the structure-destruction routine').toMatch(
      /DESTROY A CITY OR BASE/,
    )
  })

  it('names its source module W3MAIN', () => {
    expect(damageSrc(), 'must cite W3MAIN').toMatch(/W3MAIN/)
  })
})
