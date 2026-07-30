// tests/helpers/arena-state-contract.ts
//
// Story jt3-2 — the CONTRACT for src/core/arena-state.ts, TEA-authored (Leeloo),
// plus the loader. Same seam pattern as jt1-4's arena-contract.ts: TEA states the
// shape and pins the behaviour; Dev (Julia) writes the module.
//
// ─── WHY A NEW MODULE, NOT AN EDIT TO arena.ts ───────────────────────────────
// jt1-5 FROZE and exported the arena: `PLATFORMS`, the Y-maps, `BACKGROUND_SURFACES`
// are `Object.freeze`d, and arena.ts is generated ("DO NOT HAND-EDIT", with one
// sanctioned jt3-1 retrofit). Arena destruction is a CORE STATE CHANGE driven by a
// wave EVENT — it must flow THROUGH the event into a MUTABLE arena-state seam, NOT
// by unfreezing the exported constants. So the mutable state lives in a new module
// that IMPORTS the frozen data and never writes through it.
//
// ─── THE ROM'S OWN TWO-TABLE SHAPE (the seam mirrors it) ─────────────────────
// The 1982 machine keeps the landing/collision bitmaps TWICE: an immutable ROM
// SOURCE (`LNDXS1`/`BCKXS1`) and a mutable RAM COPY (`LNDXD1`/`BCKXD1`). Cliff
// destruction CLEARS a cliff's bit from the RAM copy (WCLFEW, JOUSTRV4.SRC:2301-2325);
// creation copies the ROM bit back. That is exactly this seam: the frozen arena.ts
// exports are the ROM source (immutable baseline), and `ArenaState` is the RAM copy
// — which cliffs/bridge are currently gone. Semantics only (the jt2-1 ruling): no
// 256-byte RAM table is modelled, only WHAT the destruction MEANS.
//
// ─── SCOPE NOTE (documented for Dev + Reviewer) ──────────────────────────────
// jt1-5 transcribed the LNDYTB/BCKYTB *Y*-maps but NOT the LNDXTB/BCKXTB *X*-maps.
// The bridge's footing is an X-column fact (the CLIF5 landing bit $20 extended
// across the lava; LAVAB clears it column-by-column, JOUSTRV4.SRC:5258-5264). This
// seam therefore represents the bridge at the SURFACE/BIT granularity the frozen
// arena exposes — a latching `bridgeBurned` plus a bridge-span landing query — and
// does NOT re-derive the per-column X-map or the visible flame sweep. That
// transcription + the render sweep belong to the demo/render story (jt3-7).

import type { Platform, GroundOutcome, SourceAnchor } from './arena-contract.js'

export type { Platform, GroundOutcome, SourceAnchor }

/**
 * One destructible cliff's destruction record — transcribed from the WCLFTB
 * table (JOUSTRV4.SRC:2407-2414). On the wire each entry is
 * `FCB <statusBit>,<landingBit>,<backgroundBits>` followed by
 * `FDB <cliffPictureAddr>,<transporterAddr>`; this seam carries the three FCB
 * bytes (the geometry mutation) — the picture address drives the crumble
 * animation (CLFDES) and the transporter word disables a pad, both jt3-later.
 *
 * Only FOUR cliffs are destructible (WBCLS = WBCL1L+WBCL1R+WBCL2+WBCL4 = $F0);
 * CLIF3* and CLIF5 have no destruction bit and are never destroyed.
 */
export interface CliffDestruction {
  /** 'CLIF1L' | 'CLIF1R' | 'CLIF2' | 'CLIF4' — the WCLFTB record order. */
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
 * DATA so the finding is machine-checked rather than prose. Every cliff record
 * has a second FDB one scanline shorter with its collision pointer dropped
 * (JOUSTI.SRC:55/79/107 et al.). The destruction path was the PRIME SUSPECT
 * consumer; the jt3-2 trace FALSIFIED that — no game-code path references the
 * shorter variant (no `CLIFxx+8`), so it stays unconsumed.
 */
export interface SecondVariantTrace {
  /** false — the destruction path does NOT consume the shorter variant. */
  consumedByDestruction: boolean
  /** false — open-questions §5 stands: no consumer found anywhere in JOUSTRV4.SRC. */
  consumerFound: boolean
  /** The cliffs whose record carries a one-scanline-shorter second variant. */
  cliffs: readonly string[]
  /** JOUSTI.SRC:54-55 — the CLIF1L record + its shorter variant. */
  anchor: SourceAnchor
}

/**
 * The mutable per-run arena state — the seam jt1-5's frozen exports mutate
 * THROUGH. Plain data (battlezone's "durable word" style) so the reducer stays
 * pure and the state is carriable on the sim (like the budget on GameState).
 *
 * TWO different persistence laws, and pinning both is the point:
 *   • `bridgeBurned` LATCHES — the TBRIDGE countdown hits zero once and the
 *     bridge stays gone (JOUSTRV4.SRC:1934-1938). Burned stays burned.
 *   • `destroyedCliffs` REFLECTS the current wave's status high nibble — a cliff
 *     destroyed on one wave is REBUILT when a later wave's status drops its bit
 *     (the WCLFEW create path, JOUSTRV4.SRC:2335-2368). Not cumulative.
 */
export interface ArenaState {
  /** The bridge solid-fill is gone (latching). */
  bridgeBurned: boolean
  /** Labels of cliffs currently destroyed (a subset of the four destructible). */
  destroyedCliffs: readonly string[]
  /** OR of destroyed cliffs' landing bits — subtracted from a landing mask. */
  destroyedLandingBits: number
  /** OR of destroyed cliffs' background-collision bits. */
  destroyedBackgroundBits: number
}

export interface ArenaStateModule {
  /** The four destructible cliffs, in WCLFTB order. */
  CLIFF_DESTRUCTION: readonly CliffDestruction[]

  /** 3 — TBRIDGE, the wave the bridge burns on (re-exported / imported from arena). */
  BRIDGE_WAVE: number

  /** The jt3-2 second-variant trace verdict. */
  SECOND_VARIANT_TRACE: SecondVariantTrace

  /** Pristine state: bridge intact, nothing destroyed. */
  initialArenaState(): ArenaState

  /**
   * Apply ONE wave's arena mutation — the wave EVENT. Pure: returns a NEW state,
   * never mutates the argument nor the frozen arena exports.
   *   • Burns the bridge once `wave >= BRIDGE_WAVE` (latching — once true, stays).
   *   • Sets the destroyed cliffs to exactly those named in the status high
   *     nibble (`status & $F0`), REBUILDING any whose bit is now clear.
   */
  applyWaveDestruction(state: ArenaState, wave: number, status: number): ArenaState

  /**
   * Landing outcome against the MUTATED arena. A landing whose bit belongs to a
   * destroyed cliff yields `{ kind: 'airborne' }` — the entity falls where the
   * cliff used to be. Otherwise identical to arena.groundOutcome(mask).
   *
   * NOTE: this is the CLIFF path. The CLIF5 ISLAND is never destructible, so a
   * CLIF5 mask ($A0) still lands here even after the bridge burns — only the
   * bridge SPAN loses footing (see bridgeGroundOutcome).
   */
  groundOutcomeInState(state: ArenaState, mask: number): GroundOutcome

  /**
   * Landing outcome for an entity standing over the BRIDGE span. While intact the
   * bridge extends CLIF5's footing (landing bit $20) across the lava, so the
   * entity lands on the CLIF5 surface; once burned the footing is gone and the
   * entity is `{ kind: 'airborne' }` — it drops into the lava (LAVAB clears the
   * $20 bit across the bridge columns, JOUSTRV4.SRC:5258-5264).
   */
  bridgeGroundOutcome(state: ArenaState): GroundOutcome

  /**
   * Whether a BACKGROUND-collision bit (BCKXTB assignment) is still active. A
   * destroyed cliff's bit returns false — an entity that would have bounced off
   * that cliff's side no longer does.
   */
  backgroundActive(state: ArenaState, bckBit: number): boolean
}

export async function loadArenaState(): Promise<ArenaStateModule> {
  const specifier = ['..', '..', 'src', 'core', 'arena-state.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<ArenaStateModule>
    if (!Array.isArray(mod.CLIFF_DESTRUCTION)) throw new Error('module has no `CLIFF_DESTRUCTION` export')
    if (typeof mod.applyWaveDestruction !== 'function') {
      throw new Error('module has no `applyWaveDestruction` export')
    }
    if (typeof mod.initialArenaState !== 'function') {
      throw new Error('module has no `initialArenaState` export')
    }
    return mod as ArenaStateModule
  } catch (e) {
    throw new Error(
      'arena-state module not built yet — GREEN (Julia) creates joust/src/core/arena-state.ts ' +
        `satisfying tests/helpers/arena-state-contract.ts. (${(e as Error).message})`,
    )
  }
}
