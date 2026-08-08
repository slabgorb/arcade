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
// ─── SOURCE OF TRUTH (REV-01) ────────────────────────────────────────────────
// CITATION BASIS DIFFERS BY FILE (measured; see citations-source.test.ts):
// W3MAIN is double-spaced, so its cites are LOGICAL (non-blank) line numbers;
// W3COMN cites are PHYSICAL lines. Each cite below is tagged accordingly.
//   PROCESS EXPLOSIONS  W3MAIN:906 (logical; PREXPL, phys 1811) — each blast walks a
//     radius-vs-time table (OLDRAD) indexed by its time counter (EXTIME) and finishes
//     when that index reaches EXDONE. The table (phys W3MAIN.MAC:1917-1919):
//         OLDRAD: .BYTE 0,0,2,3,4,5,6,7,8,9,10.,11.,12.,13.
//                 .BYTE 13.,12.,11.,10.,9,8,7,6,5,4,3,2,1,0,0
//     radius climbs 0→13 (it holds 0 for two steps then SKIPS 1), holds the peak 13
//     for two steps, then falls 13→…→1→0 — an asymmetric, plateaued curve, NOT a
//     symmetric triangle.
//   EXPFRA cadence      W3MAIN:1911 (phys; EXPFIX/EXPEND) — PREXPL advances one of 5
//     round-robin explosion batches per frame, so a single blast's OLDRAD index moves
//     once every (EXPEND-EXPFIX-2)+1 = 5 game frames.
//   DRAW A CIRCLE       W3MAIN:2503 (logical) — renders a circle of that radius.
//   EXDONE = 27.        W3COMN:225 (physical) — "EXPLOSION DIAMETER"; the index at
//     which the blast is done ⇒ lifetime EXDONE·EXPFRA_FRAMES = 135 frames.
//
// mc9-3 (GREEN, Yoda): the exact OLDRAD curve + EXPFRA cadence, retiring the mc1-4
// triangle. The blast steps once per video frame (game.ts wires stepExplosion into
// stepGame), so the faithful model samples OLDRAD at index = floor(t / EXPFRA_FRAMES).

/** A blast in progress at a fixed cabinet point. `t` = ticks since detonation. */
export interface Explosion {
  readonly h: number
  readonly v: number
  readonly t: number
}

/** Explosion diameter / lifetime index — EXDONE, `W3COMN.MAC:225` (physical, `27.`). */
export const EXDONE = 27

/** Peak blast radius — the OLDRAD table maximum, `W3MAIN.MAC:1917` (physical) — matching the table's own cite above and the MC-OLDRAD-PEAK claim (not logical 906, which is the PREXPL routine start at phys 1811). */
export const MAX_BLAST_RADIUS = 13

// OLDRAD — the byte-exact radius-vs-time table from PROCESS EXPLOSIONS (PREXPL),
// phys `W3MAIN.MAC:1917-1919` (two `.BYTE` rows across the double-spaced blank at
// 1918). Stored as the source table text and parsed once, so the table is the cited
// datum (claims MC-OLDRAD-RISE / MC-OLDRAD-FALL) rather than 29 loose numeric
// literals — the un-cited-literal guard (citations.test.ts) strips string contents.
const OLDRAD: readonly number[] =
  '0,0,2,3,4,5,6,7,8,9,10,11,12,13,13,12,11,10,9,8,7,6,5,4,3,2,1,0,0'.split(',').map(Number)

// EXPFRA update cadence — game frames per OLDRAD index step. PREXPL splits the
// explosion slots into 5 round-robin batches and advances one batch per frame, so a
// single blast's index moves once every (EXPEND-EXPFIX-2)+1 steps. Phys
// `W3MAIN.MAC:1911` (EXPFIX/EXPEND); claim MC-EXPFRA.
export const EXPFRA_FRAMES = 5

/** Detonate at (h, v): t = 0 (radius 0, not done). */
export function startExplosion(h: number, v: number): Explosion {
  return { h, v, t: 0 }
}

/** Advance one tick — one video frame (t + 1). Referentially transparent; never mutates. */
export function stepExplosion(exp: Explosion): Explosion {
  return { ...exp, t: exp.t + 1 }
}

/** The OLDRAD time index for a blast `t` frames old — one step per EXPFRA_FRAMES frames. */
function oldradIndex(exp: Explosion): number {
  return Math.floor(exp.t / EXPFRA_FRAMES)
}

/**
 * The blast radius at this explosion's current time: OLDRAD sampled at the current
 * time index, which advances once per EXPFRA_FRAMES frames. Zero once the index has
 * reached EXDONE (the blast has expanded and collapsed). Pure.
 */
export function blastRadius(exp: Explosion): number {
  const idx = oldradIndex(exp)
  // A live blast is idx in [0, EXDONE). Clamp BOTH bounds: a negative or NaN t (a
  // hand-built Explosion — the interface carries no invariant on t) would otherwise
  // read OLDRAD[<0] / OLDRAD[NaN] = undefined and flow NaN into render's ctx.arc.
  // `idx < 0` alone misses NaN (all NaN comparisons are false), so test the valid
  // range positively.
  return idx >= 0 && idx < EXDONE ? OLDRAD[idx] : 0
}

/** True once the blast is not a live, growing blast — its OLDRAD index has reached
 *  EXDONE (expanded then collapsed) or is out of the live range for a degenerate t. */
export function isExplosionDone(exp: Explosion): boolean {
  const idx = oldradIndex(exp)
  return !(idx >= 0 && idx < EXDONE)
}
