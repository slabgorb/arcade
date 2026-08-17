// src/core/warpin.ts
//
// Story jt13-2 (GREEN, Loki) — the TREFF transporter WARP-IN, a pure core state
// machine. When a player or enemy materialises on its pad the ROM does NOT pop it
// in opaque: GOTTR arms a thirty-frame PFRAME window and TREFF grows the bird as a
// solid owner-coloured silhouette UP out of a lit transporter, feet planted, before
// PLYINT hands it to the brain. jt2-6 built the materialisation WINDOW (the mat /
// collision timing); this module is the visible animation that window was missing.
//
// ─── NOT THE FALSE FRIENDS ───────────────────────────────────────────────────
// dissolve.ts is the ptero/baiter DEATH ash (PTEKLL). crumble.ts is the CLFDES
// cliff. The jt2-6 `Materialisation` type is the 120-nap COLLISION window, a demo-
// tuned clock. This is a SEPARATE body of state on the ROM's own 30-nap PFRAME
// clock, importing none of them — the birth end of a life, mirroring the pure
// phase+frame+nap+done shape of its death-side siblings.
//
// ─── THE ROM, READ OFF TREFF (JOUSTRV4.SRC:5726-5803) ────────────────────────
// `GOTTR` arms it: `LDA #30 / STA PFRAME,U` (:5726-5727) — the SAME 30 STAND_FRAMES
// already transcribes (in sim.ts, whose comment names this story). The loop:
//   • TREFF (:5733-5743): each nap constant-fills the transporter in the owner's
//     colour (`DCONST`, :5739). The bird is drawn only for `PFRAME <= 20`
//     (`CMPA #20`, :5742) — the first ten frames show only the lit pad.
//   • The Lantz special-effects block (:5750-5790): the standing bird's vertical
//     size WCLENY is derived from PFRAME (`COMA/ASRA/ANDA #$0F/EORA #$04`,
//     :5753-5757), WCY shifted so the FEET stay planted (:5763-5783) — it grows up.
//   • TREFF2 (:5792-5803): `PCNAP 1  EFFECTS TIME` (one nap per frame), then
//     `DEC PFRAME / LBNE TREFF` — thirty iterations, PFRAME 30→0, ending at PLYINT.
//
// This story builds PHASE 1 (the grow-in). The wait-for-first-move idle colour-
// cycle (:5805-5890) is a filed follow-up, not this module.
//
// CORE: deterministic, no clock, no entropy, no browser surface, no shell import
// (the jt1-7 purity scanner sweeps it). The RENDER of the silhouette + lit pad is
// the shell's job (render.paintWarpIn), fed by drawList — the dissolve precedent.

/**
 * 30 — the length of the TREFF window: `LDA #30 / STA PFRAME,U`
 * (JOUSTRV4.SRC:5726-5727), the SAME constant STAND_FRAMES transcribes. Thirty
 * PFRAME frames, one nap each, PFRAME 30→0.
 */
export const WARPIN_FRAME_COUNT = 30

/**
 * 1 — naps each PFRAME frame is held: `TREFF2  PCNAP 1  EFFECTS TIME`
 * (JOUSTRV4.SRC:5792), one nap per `DEC PFRAME` iteration.
 */
export const WARPIN_FRAME_NAPS = 1

/**
 * 20 — the PFRAME threshold below which the BIRD silhouette is drawn:
 * `LDA PFRAME,U / CMPA #20 / BGT TREFF2` (JOUSTRV4.SRC:5741-5743). While PFRAME
 * > 20 (the first ten frames) only the lit pad shows; the bird appears for
 * PFRAME <= 20. Against the ascending `frame`: the bird is visible once
 * `frame >= WARPIN_FRAME_COUNT - WARPIN_BIRD_VISIBLE_PFRAME`.
 */
export const WARPIN_BIRD_VISIBLE_PFRAME = 20

/**
 * A single arrival's TREFF warp-in — a nap-driven walk through the thirty PFRAME
 * frames while it stands materialising on its pad, then the effect ends (PLYINT).
 * Pure data, carried on the sim like DissolveState / CrumbleState.
 */
export interface WarpInState {
  /**
   * The frame index, ASCENDING 0 .. WARPIN_FRAME_COUNT-1. The ROM's PFRAME counts
   * DOWN 30→1, so `pframe = WARPIN_FRAME_COUNT - frame`: frame 0 ↔ PFRAME 30 (just
   * arrived, shortest), frame 29 ↔ PFRAME 1 (about to finish, full height). The
   * render derives the silhouette's height from this — taller as `frame` grows.
   */
  frame: number
  /** Naps remaining on the current frame (WARPIN_FRAME_NAPS — the ROM's PCNAP 1). */
  nap: number
  /** True once all thirty frames have elapsed — the effect ends and PLYINT runs. Terminal. */
  done: boolean
}

/**
 * Begin an arrival's TREFF warp-in on frame 0 (PFRAME 30) with a full nap hold,
 * NOT done. Both a re-materialising PLAYER and a wave ENEMY start the same
 * thirty-frame effect. Pure.
 */
export function startWarpIn(): WarpInState {
  return { frame: 0, nap: WARPIN_FRAME_NAPS, done: false }
}

/**
 * One wake of the warp-in — nap-driven: while the frame's nap has not expired,
 * hold; when it expires, advance to the next frame, or set `done` (the effect
 * ends, PLYINT) after the last. Idempotent once `done`. Pure — never mutates its
 * argument.
 */
export function stepWarpIn(state: WarpInState): WarpInState {
  if (state.done) return { ...state }
  const nap = state.nap - 1
  if (nap > 0) return { ...state, nap }
  if (state.frame >= WARPIN_FRAME_COUNT - 1) return { ...state, nap: 0, done: true }
  return { ...state, frame: state.frame + 1, nap: WARPIN_FRAME_NAPS }
}
