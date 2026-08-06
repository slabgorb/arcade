// src/core/explosion.ts
//
// Story mc1-4 (GREEN, Yoda) — the detonation as PURE core data: the expanding-
// then-collapsing blast circle an arrived ABM leaves at the target. The radius
// starts at 0, GROWS to a maximum, then COLLAPSES back to 0 over deterministic
// ticks, at which point the blast is done. Core owns the geometry; render.ts
// (DRAW A CIRCLE) paints the circle.
//
// PURE: plain arithmetic, no clock, no entropy, no browser surface, no shell
// import. The src/core purity sweep (tests/purity.test.ts) scans this file.
//
// ─── SOURCE OF TRUTH (REV-01; W3MAIN double-spaced — logical cites) ───────────
//   PROCESS EXPLOSIONS  W3MAIN:906 (PREXPL) — each blast walks a radius-vs-time
//     table (OLDRAD) and finishes when its time index reaches EXDONE:
//         OLDRAD: .BYTE 0,0,2,3,4,5,6,7,8,9,10.,11.,12.,13.
//                 .BYTE 13.,12.,11.,10.,9,8,7,6,5,4,3,2,1,0,0
//     i.e. radius climbs 0→13 then falls 13→0 (peak 13).
//   DRAW A CIRCLE       W3MAIN:2503 — renders a circle of that radius.
//   EXDONE = 27.        W3COMN:225 — "EXPLOSION DIAMETER"; the lifetime. Diameter 27
//     ⇒ peak radius 13 == the OLDRAD maximum == (EXDONE-1)/2.
//
// Skeleton model: a symmetric triangle derived from the two cited constants — grow
// 0→MAX_BLAST_RADIUS then collapse →0 over LIFETIME = EXDONE-1 ticks. The exact
// OLDRAD per-tick curve and the EXPFRA update cadence are mc2 fidelity.

/** A blast in progress at a fixed cabinet point. `t` = ticks since detonation. */
export interface Explosion {
  readonly h: number
  readonly v: number
  readonly t: number
}

/** Explosion diameter / lifetime index — EXDONE, `W3COMN.MAC:225` (`27.`). */
export const EXDONE = 27

/** Peak blast radius — the OLDRAD table maximum, `W3MAIN.MAC:906`; = (EXDONE-1)/2. */
export const MAX_BLAST_RADIUS = 13

/** Ticks from detonation to full collapse: grow to the peak, then back to 0. */
const LIFETIME = EXDONE - 1 // 26 ticks; peak at MAX_BLAST_RADIUS (t = LIFETIME/2)

/** Detonate at (h, v): t = 0 (radius 0, not done). */
export function startExplosion(h: number, v: number): Explosion {
  return { h, v, t: 0 }
}

/** Advance one tick (t + 1). Referentially transparent — never mutates. */
export function stepExplosion(exp: Explosion): Explosion {
  return { ...exp, t: exp.t + 1 }
}

/**
 * The blast radius at this explosion's current time: 0 at detonation, rising to
 * MAX_BLAST_RADIUS at the midpoint, then falling back to 0 by LIFETIME. Zero once
 * finished. Pure.
 */
export function blastRadius(exp: Explosion): number {
  const t = exp.t
  if (t <= 0 || t >= LIFETIME) return 0
  return Math.min(t, LIFETIME - t)
}

/** True once the blast has expanded and collapsed back to nothing (t ≥ LIFETIME). */
export function isExplosionDone(exp: Explosion): boolean {
  return exp.t >= LIFETIME
}
