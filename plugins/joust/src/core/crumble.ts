// src/core/crumble.ts
//
// Story jt11-7 (GREEN, Julia) — the CLFDES cliff-crumble, a pure core state
// machine. When a wave destroys a destructible cliff the ROM does NOT blink it
// out: CLFDES (JOUSTRV4.SRC:4562-4599) plays the cliff SHAKING then throwing
// DEBRIS in the gap between intact and gone. jt11-5 made a destroyed cliff vanish
// from physics and render (drawList filters BACKGROUND_RECORDS by
// arena.destroyedCliffs); this module is the animation that fills that gap.
//
// ─── NOT THE FALSE FRIEND ─────────────────────────────────────────────────────
// dissolve.ts is the ptero/baiter DEATH ash animation (PTEKLL → three ASH
// frames). It is a SEPARATE ROM routine and a separate body of state; it shares
// only the CLIFER blitter (a decoder, not the animation). This module imports no
// DissolveState and carries the CLFDES counts, not the dissolve's.
//
// ─── CLFDES, READ OFF THE ROUTINE (JOUSTRV4.SRC:4562-4599) ────────────────────
// A two-phase nap-driven sequence, `INPUT PFRAME-2,U = CLIFF TO DESTROY` (:4560),
// ending `JMP VSUCIDE` (:4599):
//
//   • SHAKE.  `LDA #5 / STA PFRAME,U` → FIVE shakes ("number of shakes to do",
//     :4563-4564). Each shake (loop `1$`, :4565-4574): BCKYUP, `PCNAP 10`
//     (:4567), BCKYUP, `LDA #$2A / STA WCDMA,X` ("by altering the cliffs flavor",
//     :4570-4571), `PCNAP 10` (:4572). Two PCNAP 10 per shake = 20 naps held —
//     the two BCKYUP jerks are the wobble; the pair collapses into ONE 20-nap
//     hold, exactly as dissolve collapsed its own 2+6 draw+redraw into 8.
//
//   • ERASE.  `JSR LOCCLR / PCNAP 2` (:4575-4576): the cliff image is cleared,
//     replaced with debris. The 2-nap blip is folded into the shake→debris
//     transition (not a separate constant), as dissolve folded its interim naps.
//
//   • DEBRIS.  `LDA #5 / STA PFRAME+2,U` → FIVE debris frames ("where there are
//     five images", :4578-4580 — the FIRSTI image area). Each frame (loop `2$`,
//     :4581-4597): `BSR CLIFER` draw, `PCNAP 8` ("while we sleep a little",
//     :4594). One PCNAP 8 per frame = 8 naps held. `BSR LOCCLR` (:4598) a final
//     erase, then `JMP VSUCIDE` (:4599) — the cliff is gone (the jt11-5 end-state).
//
// Total held: 5×20 + 5×8 = 140 naps.
//
// This module is CORE: deterministic, no clock, no entropy, no browser surface,
// no shell import, no filesystem. The RENDER of the shaking cliff and the debris
// is the sim/shell's job through drawList (the dissolve precedent: dissolve.ts is
// pure state, drawList/paintDissolve render it).

/**
 * 5 — the number of shakes (`LDA #5 / STA PFRAME,U` "number of shakes to do",
 * JOUSTRV4.SRC:4563-4564).
 */
export const CRUMBLE_SHAKE_COUNT = 5

/**
 * 20 — naps each shake is held: two `PCNAP 10` per shake iteration
 * (JOUSTRV4.SRC:4567 & :4572), collapsed into one hold.
 */
export const CRUMBLE_SHAKE_NAPS = 20

/**
 * 5 — the number of debris frames (`LDA #5 / STA PFRAME+2,U` "where there are
 * five images", JOUSTRV4.SRC:4578-4580 — the FIRSTI image area).
 */
export const CRUMBLE_DEBRIS_FRAME_COUNT = 5

/**
 * 8 — naps each debris frame is held: one `PCNAP 8` per frame ("while we sleep a
 * little", JOUSTRV4.SRC:4594).
 */
export const CRUMBLE_DEBRIS_FRAME_NAPS = 8

/**
 * $2A — the DMA "flavor" byte a shaking cliff is tinted with (`LDA #$2A /
 * STA WCDMA,X` "by altering the cliffs flavor", JOUSTRV4.SRC:4570-4571).
 */
export const CRUMBLE_FLAVOR = 0x2a

/** Which half of CLFDES a crumble is currently in. */
export type CrumblePhase = 'shake' | 'debris'

/**
 * A single destructible cliff's CLFDES crumble — a nap-driven walk through the
 * five shakes, then the five debris frames, then removal. Pure data, carriable
 * on the sim like the DissolveState is.
 */
export interface CrumbleState {
  /**
   * The destructible cliff crumbling: 'CLIF1L' | 'CLIF1R' | 'CLIF2' | 'CLIF4'
   * (the WCLFTB order, arena-state.ts CLIFF_DESTRUCTION). Only the four
   * destructible cliffs ever crumble — CLIF3 and CLIF5 have no WBCLS bit.
   */
  cliff: string
  /** 'shake' first (five wobbles), then 'debris' (five thrown frames). */
  phase: CrumblePhase
  /** The frame index WITHIN the current phase (0 .. COUNT-1 for that phase). */
  frame: number
  /** Naps remaining on the current frame (SHAKE_NAPS in shake, DEBRIS_FRAME_NAPS in debris). */
  nap: number
  /** True once the debris phase's last frame has elapsed — the cliff is gone. Terminal. */
  done: boolean
}

/**
 * Begin a cliff's CLFDES crumble on shake frame 0 with a full shake-nap hold,
 * NOT done — a five-then-five sequence, never a one-shot. Pure.
 */
export function startCrumble(cliff: string): CrumbleState {
  return { cliff, phase: 'shake', frame: 0, nap: CRUMBLE_SHAKE_NAPS, done: false }
}

/**
 * One wake of the crumble — nap-driven: while the frame's nap has not expired,
 * hold; when it expires, advance to the next frame within the phase, cross
 * shake→debris after the last shake, or set `done` (removal) after the last
 * debris frame. Idempotent once `done`. Pure — returns a NEW state, never
 * mutates its argument.
 */
export function stepCrumble(state: CrumbleState): CrumbleState {
  if (state.done) return { ...state }
  const nap = state.nap - 1
  if (nap > 0) return { ...state, nap }
  if (state.phase === 'shake') {
    if (state.frame < CRUMBLE_SHAKE_COUNT - 1) {
      return { ...state, frame: state.frame + 1, nap: CRUMBLE_SHAKE_NAPS }
    }
    // the erase (LOCCLR / PCNAP 2) folds into the hand-off to the debris phase
    return { ...state, phase: 'debris', frame: 0, nap: CRUMBLE_DEBRIS_FRAME_NAPS }
  }
  if (state.frame < CRUMBLE_DEBRIS_FRAME_COUNT - 1) {
    return { ...state, frame: state.frame + 1, nap: CRUMBLE_DEBRIS_FRAME_NAPS }
  }
  return { ...state, nap: 0, done: true }
}
