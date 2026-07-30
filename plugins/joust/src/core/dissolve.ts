// src/core/dissolve.ts
//
// Story jt3-6 (GREEN, Julia) — the pterodactyl/baiter death DISSOLVE, a pure
// core state machine. When a ptero (or a baiter) dies it does NOT flash the
// interim poof: the death dispatch DEATH4 (JOUSTRV4.SRC:2941) routes through
// PTEKLL (:1369-1420), which — after the death dance — plays a three-frame ASH
// animation "ashes to ashes" (`LDA #3`, :1388; `LDD ASH1R`, :1390) over the
// CLIFER-decoded ASH frames, then erases the body (`JSR CPLYR` / `LDD #$1200`,
// :1414-1415).
//
// BOTH the wave-type ptero and the baiter enter the SAME PTEKLL path; the baiter
// branch (PCHASE != 0) only DECrements NBAIT (:1370-1372) before rejoining, so a
// single dissolve serves both, distinguished by the `baiter` flag.
//
// ─── THE NAP MODEL ───────────────────────────────────────────────────────────
// Each ASH frame is drawn, PCNAP 2, redrawn, PCNAP 6 (JOUSTRV4.SRC:1393-1399) =
// 2 + 6 = 8 naps held before advancing. The ROM's redraw of the same frame is a
// render artifact, not state, so this collapses the pair into a single 8-nap
// hold per frame (DISSOLVE_FRAME_NAPS).
//
// ─── THE SCORE EVENT IS jt3-4'S, AND STAYS THERE (AC-3) ──────────────────────
// The 1000-point kill event is `ptero.pteroScoreEvent` (jt3-4). The dissolve is
// the body's FATE, not the score: this module exports NO score event and must
// not re-emit one (ruling C — scoring accumulation is jt4-1's game.ts). The kill event still
// fires on the kill; the dissolve merely replaces the interim poof.
//
// ─── THE jt3-7 BOUNDARY ──────────────────────────────────────────────────────
// jt3-6 builds the dissolve STATE + the death->dissolve transition only. The
// spawned ptero/baiter is still INERT in the scheduler (frame.ts dispatches no
// dissolve step yet); stepping it from the process list and rendering its frames
// through ENTITY_RECORDS is jt3-7. These are pure state functions, exercised
// directly, not through stepFrame.
//
// This module is CORE: deterministic, no clock, no entropy, no browser surface,
// no shell import, no filesystem.

/**
 * 3 — the dissolve is a THREE-frame animation (`LDA #3` "3 FRAME ANIMATION",
 * JOUSTRV4.SRC:1388). Equals `expandAshFrames(ASH1R.bytes).length`.
 */
export const DISSOLVE_FRAME_COUNT = 3

/**
 * 8 — naps each ASH frame is held: the ROM draws the frame, PCNAP 2, redraws,
 * PCNAP 6 (JOUSTRV4.SRC:1393-1399) = 2 + 6 naps before advancing.
 */
export const DISSOLVE_FRAME_NAPS = 8

/**
 * The ptero/baiter death-dissolve state — a nap-driven walk through the ASH
 * animation frames, then removal.
 */
export interface DissolveState {
  /** The current ASH frame index (0 .. DISSOLVE_FRAME_COUNT-1). Indexes `expandAshFrames` 1:1. */
  frame: number
  /** Naps remaining on the current frame (the PCNAP 2+6 hold = DISSOLVE_FRAME_NAPS). */
  nap: number
  /** True once the three-frame sequence has finished — the body is removed. Terminal. */
  done: boolean
  /** A BAITER dissolve (PCHASE != 0): the PTEKLL path DECrements NBAIT for a baiter. */
  baiter: boolean
}

/**
 * Death -> dissolve. Both the wave-type ptero and the baiter enter the SAME
 * PTEKLL dissolve (NOT the interim poof), starting on ASH frame 0 with a full
 * nap hold. `opts.baiter` tags the PCHASE != 0 path. Emits NO score event. Pure.
 */
export function startDissolve(opts: { baiter?: boolean } = {}): DissolveState {
  return { frame: 0, nap: DISSOLVE_FRAME_NAPS, done: false, baiter: opts.baiter ?? false }
}

/**
 * One wake of the dissolve: decrement the current frame's nap; when it expires,
 * advance to the next ASH frame, or set `done` (removal) after the last frame.
 * Idempotent once `done`. Pure — returns a NEW state, never mutates its argument.
 */
export function stepDissolve(state: DissolveState): DissolveState {
  if (state.done) return { ...state }
  const nap = state.nap - 1
  if (nap > 0) return { ...state, nap }
  if (state.frame >= DISSOLVE_FRAME_COUNT - 1) {
    return { ...state, nap: 0, done: true }
  }
  return { ...state, frame: state.frame + 1, nap: DISSOLVE_FRAME_NAPS }
}
