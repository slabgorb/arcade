// src/core/target.ts
//
// Story jt8-1 (GREEN, Korben / Dev) — the enemy AGGRO subsystem: SELPLY and the
// TARPLY/TARTM state it reads (JOUSTRV4.SRC:4462-4520). The smart brains
// (enemy.ts, jt2-2) already seek a player's altitude; jt2 never told them WHICH
// player, nor protected a freshly-materialised knight. This module is that
// missing piece — a per-run global (two target slots + a spawn-grace timer each)
// that rides the sim exactly like IntelBudget/BaiterClock and answers, per enemy,
// "who do I hunt right now?".
//
// CORE: pure functions over plain data — no clock, no ambient entropy, no browser
// surface, no shell import (the jt1-7 purity scanner sweeps this file). Every
// constant carries its radix-cited anchor; the provenance is pinned by
// tests/target-source.test.ts + the JT81-* claims in docs/rom-study/claims/target.json.

/** What a smart brain sees of its quarry. Kept structurally identical to
 * enemy.ts's PlayerView so `selectTarget`'s result feeds `stepEnemy` directly. */
export interface PlayerView {
  /** The targeted player's whole-pixel Y (`PPOSY+1,X`). */
  readonly pixelY: number
  /**
   * jt8-2 — the targeted player's FLYX velocity index (`PVELX,X`,
   * RAMDEF.SRC:190). The horizontal-homing throttle (`BOLEVB`,
   * JOUSTRV4.SRC:3939-3940) compares the enemy's own index against this one, so
   * selection must carry it or the homing can never fire.
   */
  readonly velXIndex: number
}

/**
 * The global aggro state (RAMDEF.SRC:289-290,328-330). Two target slots, each a
 * player id (null = empty) with a grace timer counting down to the moment that
 * player becomes targetable.
 */
export interface TargetState {
  /** `TARPLY` — the primary targeted player id, or null when the slot is empty. */
  readonly tarply: number | null
  /** `TARPL2` — the secondary targeted player id, or null when empty. */
  readonly tarpl2: number | null
  /** `TARTM1` — grace frames left before the TARPLY player is targetable (>= 0). */
  readonly tartm1: number
  /** `TARTM2` — grace frames left before the TARPL2 player is targetable (>= 0). */
  readonly tartm2: number
}

/** A live player as a selection candidate: id + whole-pixel position, plus the
 * FLYX index `selectTarget` copies into the returned `PlayerView` (jt8-2). */
export interface TargetPlayer {
  readonly id: number
  readonly posX: number
  readonly pixelY: number
  /** jt8-2 — `PVELX,X`, the player's FLYX velocity index (RAMDEF.SRC:190). */
  readonly velXIndex: number
}

/** The enemy asking "who do I hunt?" — its whole-pixel position. */
export interface TargetSeeker {
  readonly posX: number
  readonly pixelY: number
}

/**
 * `TARTIM` = 90 — "1 1/2 SECOND OF DELAY BEFORE TARGETING PLAYER" (`LDA #90 / STA
 * TARTIM`, JOUSTRV4.SRC:959-960). The grace a newly-registered player gets before
 * an enemy may lock onto it. DECIMAL.
 */
export const TARTIM = 90

/**
 * A fresh aggro state — both slots empty, both timers 0 (the wave/game reset
 * `STD TARPLY / STD TARPL2`, JOUSTRV4.SRC:969-970). Pure.
 */
export function seedTargets(): TargetState {
  return { tarply: null, tarpl2: null, tartm1: 0, tartm2: 0 }
}

/**
 * Register a player into the first EMPTY slot with its grace timer armed to
 * `grace` (`STPLY1/2`: TARPLY if empty, else TARPL2; `LDA TARTIM / STA TARTMn`,
 * JOUSTRV4.SRC:4655-4665). A player registered with grace > 0 is not yet
 * targetable. Idempotent + non-lossy: an id ALREADY in a slot is left as-is (never
 * duplicated across both slots), and a third distinct id with both slots full is
 * refused rather than silently evicting the secondary — neither is reachable in
 * the 2-player game (the caller only registers a not-yet-slotted live player), but
 * the guards keep the pure contract honest. Pure — the argument is never mutated.
 */
export function registerPlayer(state: TargetState, playerId: number, grace: number): TargetState {
  if (state.tarply === playerId || state.tarpl2 === playerId) return state
  if (state.tarply === null) return { ...state, tarply: playerId, tartm1: grace }
  if (state.tarpl2 === null) return { ...state, tarpl2: playerId, tartm2: grace }
  return state
}

/** One frame off both grace timers, floored at 0 (`LDA TARTMn / BEQ / DEC TARTMn`
 * — the BEQ guards the floor so a 0 never wraps to 255, JOUSTRV4.SRC:4857-4862). Pure. */
export function tickTargetTimers(state: TargetState): TargetState {
  return {
    ...state,
    tartm1: state.tartm1 > 0 ? state.tartm1 - 1 : 0,
    tartm2: state.tartm2 > 0 ? state.tartm2 - 1 : 0,
  }
}

/**
 * Remove a player from the target slots on its death (JOUSTRV4.SRC:4746-4753). If
 * it is the primary, shift the secondary up (`TARPL2 -> TARPLY`, `TARTM2 ->
 * TARTM1`) and clear the secondary; if it is the secondary, clear the secondary;
 * a player in neither slot is a no-op (a death is only ever of a registered
 * target, so the ROM's unconditional `STD TARPL2` is only ever reached with the
 * secondary already the victim or just-shifted-empty). Pure.
 */
export function removeTarget(state: TargetState, playerId: number): TargetState {
  if (state.tarply === playerId) {
    return { tarply: state.tarpl2, tarpl2: null, tartm1: state.tartm2, tartm2: 0 }
  }
  if (state.tarpl2 === playerId) {
    return { ...state, tarpl2: null, tartm2: 0 }
  }
  return state
}

/** The single place a candidate becomes the view handed to a brain. Every return
 * path below funnels through here, so a field added to `PlayerView` cannot be
 * carried on one branch and silently dropped on another. */
function viewFor(p: TargetPlayer): PlayerView {
  return { pixelY: p.pixelY, velXIndex: p.velXIndex }
}

/** The `PlayerView` of a slot's player, or null when that id is not among the live
 * players this frame (the process left the list). */
function viewOf(id: number | null, players: readonly TargetPlayer[]): PlayerView | null {
  if (id === null) return null
  const p = players.find((q) => q.id === id)
  return p ? viewFor(p) : null
}

// ─── SELPLY's nearest-of-two metric, decoded byte-for-byte (jt9-24) ──────────
// The verified 6809 decode of JOUSTRV4.SRC:4476-4514. It is NOT a per-player
// distance: the X-axis store is dead code, so the choice reads ONLY the primary's
// Y and the secondary's X, compared across axes. See tests/target.test.ts (the
// `SELPLY nearest-of-two — the decoded :4476-4514 metric` suite) for the full
// instruction-level writeup and the verification (a faithful sim that fired the
// X store 0 times over 400k samples; a closed form matched over 2M inputs).

/**
 * The primary candidate's Y-distance byte — the metric SELPLY stores and later
 * reads for the PRIMARY (JOUSTRV4.SRC:4476-4480). `LDB PPOSY+1,X / SUBB
 * PPOSY+1,U / BLO / NEGB`: a one-byte gap, negated on the NO-borrow branch, so
 * the value is always `-(|Δy|) & 0xFF`. Larger byte = nearer; an EXACT match
 * reads as `$00` (NEGB(0)=0), the smallest byte — so a primary level with the
 * enemy looks maximally far. Only the low byte of Y (`PPOSY+1`) participates.
 */
function primaryYMetric(pixelY: number, seekerY: number): number {
  const py = pixelY & 0xff
  const uy = seekerY & 0xff
  const dy = (py - uy) & 0xff // SUBB — a byte subtract
  return py >= uy ? (-dy & 0xff) : dy // BLO skips NEGB on borrow (py < uy)
}

/**
 * The low byte SELPLY leaves in register B for the SECONDARY candidate — the low
 * byte of its 16-bit X-metric (JOUSTRV4.SRC:4481-4510). `LDD PPOSX,Y / SUBD
 * PPOSX,U` then, on the NO-borrow branch, `COMA / COMB / ADDD #-1` — a negate
 * that carries a −2 bias, NOT a plain two's-complement. The metric's high byte is
 * always $FF/$FE, so the `TSTA / BNE SPRLOX` guard (:4487-4488) NEVER stores it;
 * it stays in B and is exactly what the final compare reads.
 */
function secondaryXLowByte(posX: number, seekerX: number): number {
  const sx = posX & 0xffff
  const ux = seekerX & 0xffff
  const dx = (sx - ux) & 0xffff // SUBD — a 16-bit subtract
  const xmetric = sx >= ux ? (((~dx & 0xffff) + 0xffff) & 0xffff) : dx // COMA/COMB/ADDD #-1 vs keep
  return xmetric & 0xff
}

/**
 * SELPLY's final decision (JOUSTRV4.SRC:4512-4515): `CMPB 1,S / BLO SPN3PL`.
 * Register B holds the SECONDARY's X low byte; `1,S` is the PRIMARY's stored
 * Y-metric. `BLO` is a STRICT less-than, so the primary is kept only when its
 * byte is strictly greater (nearer); an exact tie falls through to `SPN2PL LDX
 * TARPL2` — the secondary.
 */
function selplyKeepsPrimary(seeker: TargetSeeker, primary: TargetPlayer, secondary: TargetPlayer): boolean {
  return secondaryXLowByte(secondary.posX, seeker.posX) < primaryYMetric(primary.pixelY, seeker.pixelY)
}

/** Of two targetable candidates, SELPLY's decoded nearest-of-two pick
 * (JOUSTRV4.SRC:4476-4514); an exact tie favours the SECONDARY. When only one of
 * the slot ids is still among the live players, that one is returned. */
function nearer(
  seeker: TargetSeeker,
  players: readonly TargetPlayer[],
  primaryId: number,
  secondaryId: number,
): PlayerView | null {
  const primary = players.find((q) => q.id === primaryId)
  const secondary = players.find((q) => q.id === secondaryId)
  if (primary && secondary) {
    return selplyKeepsPrimary(seeker, primary, secondary) ? viewFor(primary) : viewFor(secondary)
  }
  if (primary) return viewFor(primary)
  if (secondary) return viewFor(secondary)
  return null
}

/**
 * `SELPLY` (JOUSTRV4.SRC:4462-4520): the PlayerView of the player this enemy hunts,
 * or null when nobody is targetable. A player is targetable only once its grace
 * timer is 0; with the primary in grace the secondary is tried; with both
 * targetable the decoded SELPLY :4476-4514 metric chooses one (`nearer`). Pure.
 */
export function selectTarget(
  state: TargetState,
  seeker: TargetSeeker,
  players: readonly TargetPlayer[],
): PlayerView | null {
  const { tarply, tarpl2, tartm1, tartm2 } = state
  if (tarply === null) return null // `LDX TARPLY / BEQ SPNONE` (:4462-4463)
  if (tartm1 !== 0) {
    // Primary still in grace — take the secondary iff IT is out of grace (:4464-4470).
    return tarpl2 !== null && tartm2 === 0 ? viewOf(tarpl2, players) : null
  }
  // Primary targetable; the secondary joins only if it too is out of grace (:4472-4475).
  if (tarpl2 !== null && tartm2 === 0) return nearer(seeker, players, tarply, tarpl2)
  return viewOf(tarply, players)
}
