// src/core/damage.ts
//
// Story mc3-2 (GREEN, Yoda) — the core damage mechanic as TWO PURE reducers.
// Core decides who dies; the shell only paints the result. The mirror pair of
// icbm.ts (motion): here the warheads MEET the blasts and the ground.
//
// PURE: plain arithmetic, no clock, no entropy, no browser surface, no shell
// import. The src/core purity sweep (tests/purity.test.ts) scans this file, and
// the citation sweep (tests/citations.test.ts) forbids any un-cited literal — so
// there are none: the blast radius comes from explosion.ts's already-cited
// MAX_BLAST_RADIUS, and both reducers use only trivial 0/1 arithmetic.
//
// ─── SOURCE OF TRUTH (REV-01 W3MAIN.MAC; double-spaced → logical cites) ───────
//   MISSILE DAMAGE DETECTION & PROCESS — each tick the game tests every live
//     enemy warhead's head against every live blast circle and destroys the ones
//     caught inside. mc3 models the SHAPE: point-in-circle of the head (icbm.pos)
//     against blastRadius(exp) from explosion.ts. A finished / zero-radius blast
//     covers nothing. The exact per-frame cadence is later fidelity.
//   DESTROY A CITY OR BASE — when an enemy warhead reaches a defended structure,
//     that city/base is destroyed. mc3 flips the structure's `alive` to false and
//     drops the arrived warhead from the live list.

import { blastRadius, type Explosion } from './explosion.js'
import { type Icbm, type Vec } from './icbm.js'
import { type City, type Base } from './field.js'

/** True when point `p` lies inside the LIVE circle of `exp`. A zero-radius
 *  (fresh or collapsed) blast covers nothing — even its own centre. */
function insideBlast(p: Vec, exp: Explosion): boolean {
  const r = blastRadius(exp)
  if (r <= 0) return false
  return Math.hypot(p.h - exp.h, p.v - exp.v) <= r
}

/** MISSILE DAMAGE DETECTION: partition ICBMs into those caught by any live blast
 *  and the untouched survivors (input order preserved). `killed.length` is the
 *  kill count. Pure — never mutates its inputs. */
export function killIcbmsInBlasts(
  icbms: readonly Icbm[],
  explosions: readonly Explosion[],
): { survivors: Icbm[]; killed: Icbm[] } {
  const survivors: Icbm[] = []
  const killed: Icbm[] = []
  for (const icbm of icbms) {
    if (explosions.some((exp) => insideBlast(icbm.pos, exp))) killed.push(icbm)
    else survivors.push(icbm)
  }
  return { survivors, killed }
}

/** Two positions coincide (a warhead's target vs a structure's cabinet coord). */
function samePos(a: Vec, b: Vec): boolean {
  return a.h === b.h && a.v === b.v
}

/** DESTROY A CITY OR BASE: an ARRIVED ICBM destroys the city/base at its target
 *  (sets `alive=false`, leaving every other field — a base's `ammo` — intact) and
 *  is removed from the returned ICBM list. In-flight ICBMs and unhit structures
 *  pass through untouched. Pure — never mutates its inputs. */
export function resolveGroundImpacts(
  icbms: readonly Icbm[],
  cities: readonly City[],
  bases: readonly Base[],
): { cities: City[]; bases: Base[]; icbms: Icbm[] } {
  let outCities: City[] = [...cities]
  let outBases: Base[] = [...bases]
  const survivors: Icbm[] = []
  for (const icbm of icbms) {
    if (!icbm.arrived) {
      survivors.push(icbm)
      continue
    }
    outCities = outCities.map((c) => (samePos(c.pos, icbm.target) ? { ...c, alive: false } : c))
    outBases = outBases.map((b) => (samePos(b.pos, icbm.target) ? { ...b, alive: false } : b))
  }
  return { cities: outCities, bases: outBases, icbms: survivors }
}
