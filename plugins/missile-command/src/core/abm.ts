// src/core/abm.ts
//
// Story mc1-4 (GREEN, Yoda) — the player ABM as PURE core data: a missile that
// launches from a base, flies a STRAIGHT line to the crosshair at ~constant speed,
// and reports ARRIVAL when it reaches the target (where explosion.ts detonates a
// blast). Core owns the geometry; the shell (shell/input.ts) chooses WHICH base
// fires and hands its position in as `origin`.
//
// PURE: plain arithmetic, no clock, no entropy, no browser surface, no shell
// import. The src/core purity sweep (tests/purity.test.ts) scans this file.
//
// ─── SOURCE OF TRUTH (REV-01 W3MAIN.MAC; W3MAIN is double-spaced — logical cites)
//   LAUNCH ABMS             W3MAIN:606  (ABMLAU) — a fire launches a missile from
//     its base toward the cursor. Three fire switches, each its OWN base (FIREMA:
//     .BYTE MFIREL,MFIREC,MFIRER); the base choice is the shell's (input.ts).
//   UPDATE MISSILE POSITION W3MAIN:854  (UPDPOS) — each tick the head advances by a
//     constant velocity vector (ABCP += ABVE); returns "AT TARGET" once it reaches
//     the target array (ABTA). Straight line, constant step, arrival snap.
//   CALC MISSILE VELOCITY   W3MAIN:1640 (ABMVEL) — the step is the UNIT vector to
//     the target: ABVE = delta / totalDelta, so a farther target takes
//     proportionally more ticks. The ROM's 8.8 fixed-point DIVIDE is mc2 fidelity.
//   UPDATE MISSILE POSITION runs that unit step in a `BEGIN … DEC FASABM … MIEND`
//     loop. FASABM is loaded with `LDY I,2 ;DEFAULT IS SLOW (MOVE 2 DOTS)`
//     (W3MAIN.MAC:1661), but COND65's MIEND expands to `BPL <begin>` — it loops
//     while FASABM ≥ 0 — so the body runs FASABM+1 times: the head advances 3 dots
//     per frame (and 7, not 6, for the centre base's `LDY I,6` "MOVE FAST"). This is
//     the classic off-by-one that W3COMN's `IBLOOP/ABLOOP = <N-1>` exists to cancel
//     for array loops; FASABM deliberately does NOT use `-1`. So a player ABM moves
//     3 units/tick — faster than an ICBM (UPICBM moves it at most once per frame,
//     ≤ 1 unit/tick; see wave.ts) — so ABMs OUTRUN ICBMs at every wave. mc3 modelled
//     both at unit speed (a tie); mc4-1 restores the ROM's real ABM speed. (The
//     centre base's 7-dot speed is a per-base nuance left to a later story.)
//
// Owner ruling (2026-08-06): per-key specific base, source-faithful — this core has
// NO nearest-base logic; it flies from whatever `origin` the shell gives it.

/** A point in cabinet coordinates (V origin at the BOTTOM, as field.ts/cursor.ts). */
export interface Vec {
  readonly h: number
  readonly v: number
}

/** A player ABM in flight. The trail render.ts paints is `origin`→`pos`. */
export interface Abm {
  /** The launching base's position (fixed for the flight). */
  readonly origin: Vec
  /** The crosshair target the missile flies toward (fixed for the flight). */
  readonly target: Vec
  /** The missile head's current position; starts at `origin`. */
  readonly pos: Vec
  /** True once the head has reached the target (UPDPOS "AT TARGET"). */
  readonly arrived: boolean
}

// Cabinet units the head advances each tick — the ROM's default ABM speed. FASABM
// is loaded with 2 (`LDY I,2`, W3MAIN.MAC:1661) but the BEGIN…DEC FASABM…MIEND loop
// (COND65 MIEND = BPL, loops while ≥ 0) runs the unit step FASABM+1 = 3 times, so the
// head advances 3 dots/frame. Expressed as FASABM+1 so the derivation is explicit and
// the source literal 2 stays the cited value (both 2 and 1 are trivial-exempt from the
// un-cited-literal guard, so ABM_SPEED needs no separate claim — same as mc3 citing the
// ICBM unit speed by comment). (// lines, not /** */: the guard strips `//` per line but
// not multi-line block comments, so a line number in a JSDoc would leak past it.)
const FASABM = 2
export const ABM_SPEED = FASABM + 1

/** Launch from `origin` toward `target`: the head starts on the base, not yet arrived. */
export function launchAbm(origin: Vec, target: Vec): Abm {
  return { origin, target, pos: origin, arrived: false }
}

/**
 * Advance one tick: step the head ~ABM_SPEED units along the straight line toward
 * the target, snapping exactly to it on arrival (no overshoot). Idempotent once
 * arrived. Referentially transparent — returns a fresh Abm, never mutates.
 */
export function stepAbm(abm: Abm): Abm {
  if (abm.arrived) return abm

  const dh = abm.target.h - abm.pos.h
  const dv = abm.target.v - abm.pos.v
  const remaining = Math.hypot(dh, dv)

  // Within one step of the target (or already on it) → snap and mark arrived.
  if (remaining <= ABM_SPEED) {
    return { ...abm, pos: abm.target, arrived: true }
  }

  // Unit velocity toward the target (ABVE = delta / totalDelta), scaled by speed.
  const pos = {
    h: abm.pos.h + (dh / remaining) * ABM_SPEED,
    v: abm.pos.v + (dv / remaining) * ABM_SPEED,
  }
  return { ...abm, pos }
}
