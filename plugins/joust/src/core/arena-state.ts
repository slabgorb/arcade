// src/core/arena-state.ts
//
// Story jt3-2 (GREEN, Korben) — the MUTABLE per-run arena state: mid-game
// destruction (the wave-3 bridge burn + high-nibble cliff destruction) as a CORE
// state change driven by a wave EVENT. Pure functions over plain data — no clock,
// no entropy, no browser surface, no shell import (the jt1-7 purity scanner sweeps
// this file).
//
// ─── WHY A NEW MODULE, NOT AN EDIT TO arena.ts ───────────────────────────────
// jt1-5 FROZE and exported the arena (PLATFORMS, the Y-maps, BACKGROUND_SURFACES
// are Object.freeze'd; arena.ts is generated, "DO NOT HAND-EDIT"). Destruction is a
// CORE STATE CHANGE and it must flow THROUGH a wave event into a mutable seam, NOT
// by unfreezing the exported constants. So this module IMPORTS the frozen data and
// never writes through it.
//
// ─── THE ROM'S OWN TWO-TABLE SHAPE (this seam mirrors it) ────────────────────
// The 1982 machine keeps the landing/collision bitmaps TWICE: an immutable ROM
// SOURCE (LNDXS1/BCKXS1) and a mutable RAM COPY (LNDXD1/BCKXD1). Cliff destruction
// CLEARS a cliff's bit from the RAM copy (WCLFEW, JOUSTRV4.SRC:2301-2325); creation
// copies the ROM bit back. That is exactly this seam: arena.ts's frozen exports are
// the ROM source (immutable baseline), and ArenaState is the RAM copy — WHICH
// cliffs/bridge are currently gone. Semantics only (the jt2-1 ruling): no 256-byte
// RAM table is modelled, only WHAT the destruction MEANS.
//
// ─── TWO PERSISTENCE LAWS, BOTH LOAD-BEARING ─────────────────────────────────
//   • bridgeBurned LATCHES — the TBRIDGE countdown hits zero once and the bridge
//     stays gone (JOUSTRV4.SRC:1934-1938). applyWaveDestruction ORs the prior
//     state, so `wave >= 3` computed from scratch is NOT enough (the >= not === and
//     the re-arm traps). Burned stays burned.
//   • destroyedCliffs REFLECTS the current wave's status high nibble — a cliff
//     destroyed on one wave is REBUILT when a later wave's status drops its bit (the
//     WCLFEW create path, JOUSTRV4.SRC:2335-2368). Not cumulative.
//
// ─── SCOPE (documented for Dev + Reviewer, per TEA's design deviation) ───────
// jt1-5 transcribed the LNDYTB/BCKYTB Y-maps but NOT the LNDXTB/BCKXTB X-maps. The
// bridge's footing is an X-column fact (CLIF5's landing bit $20 extended across the
// lava; LAVAB clears it column-by-column, JOUSTRV4.SRC:5258-5264). This seam
// therefore represents the bridge at the SURFACE/BIT granularity the frozen arena
// exposes — a latching bridgeBurned plus a bridge-span landing query — and does NOT
// re-derive the per-column X-map or the visible flame sweep. That transcription +
// the render sweep belong to the demo/render story (jt3-7). The CLIF5 ISLAND stays
// intact through the burn; only the bridge SPAN loses footing.

import { BRIDGE_WAVE, groundOutcome } from './arena.js'
import type { GroundOutcome, SourceAnchor } from './arena.js'

export { BRIDGE_WAVE }
export type { GroundOutcome, SourceAnchor }

/**
 * `WBCLS EQU WBCL1L+WBCL1R+WBCL2+WBCL4` = $F0 (JOUSTRV4.SRC:2023, ANDA #WBCLS) —
 * the cliff nibble of a wave's status byte. Only these HIGH bits drive
 * destruction; the low nibble (type/persue) is never read here.
 */
const WBCLS = 0xf0

/**
 * One destructible cliff's destruction record — transcribed from WCLFTB
 * (JOUSTRV4.SRC:2407-2414). On the wire each entry is
 * `FCB <statusBit>,<landingBit>,<backgroundBits>` followed by
 * `FDB <cliffPictureAddr>,<transporterAddr>`; this seam carries the three FCB
 * bytes (the geometry mutation). The picture address drives the crumble animation
 * (CLFDES) and the transporter word disables a pad — both jt3-later.
 *
 * Only FOUR cliffs are destructible (WBCLS = WBCL1L+WBCL1R+WBCL2+WBCL4 = $F0);
 * CLIF3* and CLIF5 have no destruction bit and are never destroyed.
 */
export interface CliffDestruction {
  /** 'CLIF1L' | 'CLIF1R' | 'CLIF2' | 'CLIF4' — WCLFTB record order. */
  cliff: string
  /** WSTATUS high-nibble bit: WBCL1L $10 / WBCL1R $20 / WBCL2 $40 / WBCL4 $80. */
  statusBit: number
  /**
   * LNDXTB landing bit cleared on destroy ($01 / $00 / $02 / $10). CLIF1R is $00
   * because it shares CLIF1L's merged ledge bit $01 (the LNDB0 pair).
   */
  landingBit: number
  /**
   * BCKXTB collision bit(s) cleared on destroy ($03 / $00 / $04 / $40). CLIF1L's
   * $03 = CLIF1L $01 | CLIF1R $02 — destroying the left ledge clears BOTH sides'
   * background collision; CLIF1R's own record is then a no-op ($00).
   */
  backgroundBits: number
  anchor: SourceAnchor
}

/**
 * The jt3-2 second-variant TRACE verdict (open-questions §5, AC-3), recorded as
 * DATA so the finding is machine-checked, not prose. Every cliff record has a
 * second FDB one scanline shorter with its collision pointer dropped
 * (JOUSTI.SRC:55/79/107). The destruction path was the PRIME SUSPECT consumer; the
 * jt3-2 trace FALSIFIED that — no game-code path references the shorter variant (no
 * `CLIFxx+8`), so it stays UNCONSUMED (open-questions §5 stands).
 */
export interface SecondVariantTrace {
  /** false — the destruction path does NOT consume the shorter variant. */
  consumedByDestruction: boolean
  /** false — no consumer found anywhere in JOUSTRV4.SRC. */
  consumerFound: boolean
  /** The cliffs whose record carries a one-scanline-shorter second variant. */
  cliffs: readonly string[]
  /** JOUSTI.SRC:54-55 — the CLIF1L record + its shorter variant. */
  anchor: SourceAnchor
}

/**
 * The mutable per-run arena state — the RAM copy the frozen exports mutate
 * THROUGH. Plain data (carriable on the sim like jt2-5's budget) so the reducer
 * stays pure. See the header for the two persistence laws.
 */
export interface ArenaState {
  /** The bridge solid-fill is gone (latching). */
  bridgeBurned: boolean
  /** Labels of cliffs currently destroyed (a subset of the four destructible). */
  destroyedCliffs: readonly string[]
  /** OR of destroyed cliffs' landing bits — vetoes a landing dispatch. */
  destroyedLandingBits: number
  /** OR of destroyed cliffs' background-collision bits. */
  destroyedBackgroundBits: number
}

/**
 * The four destructible cliffs, in WCLFTB order (JOUSTRV4.SRC:2407/2409/2411/2413).
 * Frozen — this is the immutable ROM datum; destruction lives in ArenaState.
 */
export const CLIFF_DESTRUCTION: readonly CliffDestruction[] = Object.freeze([
  Object.freeze({ cliff: 'CLIF1L', statusBit: 0x10, landingBit: 0x01, backgroundBits: 0x03, anchor: { file: 'JOUSTRV4.SRC', startLine: 2407, endLine: 2407 } }),
  Object.freeze({ cliff: 'CLIF1R', statusBit: 0x20, landingBit: 0x00, backgroundBits: 0x00, anchor: { file: 'JOUSTRV4.SRC', startLine: 2409, endLine: 2409 } }),
  Object.freeze({ cliff: 'CLIF2', statusBit: 0x40, landingBit: 0x02, backgroundBits: 0x04, anchor: { file: 'JOUSTRV4.SRC', startLine: 2411, endLine: 2411 } }),
  Object.freeze({ cliff: 'CLIF4', statusBit: 0x80, landingBit: 0x10, backgroundBits: 0x40, anchor: { file: 'JOUSTRV4.SRC', startLine: 2413, endLine: 2413 } }),
])

/** The jt3-2 second-variant trace verdict (open-questions §5). */
export const SECOND_VARIANT_TRACE: SecondVariantTrace = Object.freeze({
  consumedByDestruction: false,
  consumerFound: false,
  cliffs: Object.freeze(['CLIF1L', 'CLIF1R', 'CLIF2']),
  anchor: { file: 'JOUSTI.SRC', startLine: 54, endLine: 55 },
})

/** Pristine state: bridge intact, nothing destroyed. */
export function initialArenaState(): ArenaState {
  return { bridgeBurned: false, destroyedCliffs: [], destroyedLandingBits: 0, destroyedBackgroundBits: 0 }
}

/**
 * Apply ONE wave's arena mutation — the wave EVENT. Pure: returns a NEW state,
 * never mutates the argument nor the frozen arena exports.
 *   • Burns the bridge once `wave >= BRIDGE_WAVE`, LATCHING (ORs the prior state).
 *   • Sets the destroyed cliffs to exactly those named in the status high nibble
 *     (`status & WBCLS`), REBUILDING any whose bit is now clear (the WCLFEW create
 *     path — destruction reflects the current wave, it is not cumulative).
 */
export function applyWaveDestruction(state: ArenaState, wave: number, status: number): ArenaState {
  const high = status & WBCLS
  const destroyed = CLIFF_DESTRUCTION.filter((c) => (high & c.statusBit) !== 0)
  return {
    bridgeBurned: state.bridgeBurned || wave >= BRIDGE_WAVE,
    destroyedCliffs: destroyed.map((c) => c.cliff),
    destroyedLandingBits: destroyed.reduce((m, c) => m | c.landingBit, 0),
    destroyedBackgroundBits: destroyed.reduce((m, c) => m | c.backgroundBits, 0),
  }
}

/**
 * Landing outcome against the MUTATED arena. The dispatch is arena.groundOutcome;
 * a landing whose bit belongs to a destroyed cliff is VETOED to airborne — the
 * entity falls where the cliff used to be. CLIF5 ($A0) is never destructible, so
 * the bottom island still lands here even after the bridge burns (only the bridge
 * SPAN loses footing — see bridgeGroundOutcome).
 */
export function groundOutcomeInState(state: ArenaState, mask: number): GroundOutcome {
  const outcome = groundOutcome(mask)
  if (outcome.kind === 'platform' && (outcome.platform.bit & state.destroyedLandingBits) !== 0) {
    return { kind: 'airborne' }
  }
  return outcome
}

/**
 * Landing outcome for an entity standing over the BRIDGE span. While intact the
 * bridge extends CLIF5's footing (landing bit $20) across the lava, so the entity
 * lands on the CLIF5 surface; once burned the footing is gone and the entity is
 * airborne — it drops into the lava (LAVAB clears the $20 bit across the bridge
 * columns, JOUSTRV4.SRC:5258-5264).
 */
export function bridgeGroundOutcome(state: ArenaState): GroundOutcome {
  if (state.bridgeBurned) return { kind: 'airborne' }
  return groundOutcome(0x20)
}

/**
 * Whether a BACKGROUND-collision bit (BCKXTB assignment) is still active. A
 * destroyed cliff's bit returns false — an entity that would have bounced off that
 * cliff's side no longer does.
 */
export function backgroundActive(state: ArenaState, bckBit: number): boolean {
  return (bckBit & state.destroyedBackgroundBits) === 0
}
