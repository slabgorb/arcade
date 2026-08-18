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
//     :5753-5757), WCY shifted so the FEET stay planted (:5763-5772) — it grows up.
//     (:5774-5783 is a separate WCLENY "not too long" clamp, not the feet shift.)
//   • TREFF2 (:5792-5803): `PCNAP 1  EFFECTS TIME` (one nap per frame), then
//     `DEC PFRAME / LBNE TREFF` — thirty iterations, PFRAME 30→0. (The ROM then runs
//     the unmodeled wait-for-first-move phase before PLYINT enables collisions.)
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
  /**
   * True once all thirty PFRAME frames have elapsed — the grow-in animation ends and
   * drawList stops overlaying the silhouette. NOT the moment collisions enable: in the
   * ROM the wait-for-first-move phase (:5805-5890) and then PLYINT (:5910) still follow,
   * both unmodeled here; in the clone collisions stay governed by `mat`'s window. Terminal.
   */
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

// ─── PHASE 2 — the TREFF "WAIT FOR 1ST MOVE, OR TIME OUT" idle colour-cycle ───
//
// Story jt13-9 (GREEN, Yoda). The wait loop the ROM runs AFTER the 30-frame grow-in
// above finishes and BEFORE PLYINT hands the bird to the brain (JOUSTRV4.SRC:5805-5871).
// The full-size silhouette stands on its lit pad and colour-cycles through the
// owner/white/grey TREPL palette at an ACCELERATING cadence until the arrival flaps/
// moves or the phase times out. Two interacting counters, read off the loop:
//
//   • PFEET (`speed`) — seeded 16*2=32 (`LDA #16*2 / STA PFEET,U`); halved to 16 on the
//     first wake (PTIMUP starts CLR at 0, so `DEC/BGT` fires immediately), then halved
//     each PTIMUP window: 32→16→8→4→2→1→0. `LSR PFEET / BEQ 50$` — reaching 0 is the
//     TIMEOUT.
//   • PACCX (`step`) — the colour-step counter, seeded PFEET>>1=16; `DEC PACCX` each
//     wake, and on expiry `INC PLANTZ` (advance the colour) and reload PACCX=PFEET. So
//     the colour advances every PFEET wakes — the cadence accelerates 16,8,4,2,1.
//   • PTIMUP (`windowNaps`) — the speed-window timer, reloaded to 75: each cadence value
//     is held one 75-nap window before the next halving.
//   • PLANTZ (`colourIndex`) — the colour index, seeded 2, read modulo the 8-entry TREPL
//     table.
//   • CURJOY — any joystick input (`moved`) leaves the loop early ("WANTS TO FLAP").
//
// Same purity contract as the grow-in: no clock, no entropy, no shell import. The RENDER
// resolves the 'owner' role to the arrival's colour (as paintWarpIn does); the sim opens
// this when WarpInState.done fires and advances it each frame (warpin-idle-wiring).

/** Which TREPL table an arrival cycles — a player (owner/white/grey) or an enemy (white/grey). */
export type IdleOwner = 'player' | 'enemy'

/** One colour ROLE in the TREPL cycle. The shell resolves 'owner' to the arrival's DCONST colour. */
export type IdleColour = 'owner' | 'white' | 'grey'

/** How the idle cycle stopped: still cycling, aborted by first move, or timed out (PFEET → 0). */
export type IdleEnd = 'active' | 'moved' | 'timed-out'

/**
 * 32 — PFEET seed: `LDA #16*2 / STA PFEET,U` (JOUSTRV4.SRC:5810-5811). Halved to 16 on
 * the first wake (PTIMUP starts CLR at 0), then once per speed window.
 */
export const IDLE_SPEED_INIT = 32

/** 16 — PACCX seed: `LSRA / STA PACCX,U` (JOUSTRV4.SRC:5812-5813), PFEET>>1. */
export const IDLE_STEP_INIT = 16

/** 2 — PLANTZ seed: `LDA #2 / STA PLANTZ,U` (JOUSTRV4.SRC:5814-5815), the starting colour index. */
export const IDLE_COLOUR_INDEX_INIT = 2

/** 75 — one speed window: `LDA #75 / STA PTIMUP,U` (JOUSTRV4.SRC:5845-5846). Each cadence value is held this long. */
export const IDLE_SPEED_WINDOW_NAPS = 75

/**
 * [16, 8, 4, 2, 1] — the live cadence values PFEET takes across its five windows (32
 * halves to 16 on wake 1, then 8, 4, 2, 1), each the colour-advance interval. The sixth
 * halving (1→0) is the timeout (`LSR PFEET / BEQ 50$`, :5847-5848).
 */
export const IDLE_CADENCE: readonly number[] = Object.freeze([16, 8, 4, 2, 1])

/** 8 — the TREPL table length (`ANDB #$07`, JOUSTRV4.SRC:5874). */
export const IDLE_SEQUENCE_LENGTH = 8

/**
 * The player role shape — TREPL1≡TREPL2 (JOUSTRV4.SRC:5581-5582): owner nibble with a
 * white flash at index 2 and a grey flash at index 5. The 'owner' role resolves to the
 * arrival's own colour (P1 yellow / P2 green).
 */
export const IDLE_SEQUENCE_PLAYER: readonly IdleColour[] = Object.freeze([
  'owner',
  'owner',
  'white',
  'owner',
  'owner',
  'grey',
  'owner',
  'owner',
])

/**
 * The enemy role shape — TREPL3 (JOUSTRV4.SRC:5583): a white base with grey flashes at
 * indices 2 and 5. An enemy has no distinct owner colour.
 */
export const IDLE_SEQUENCE_ENEMY: readonly IdleColour[] = Object.freeze([
  'white',
  'white',
  'grey',
  'white',
  'white',
  'grey',
  'white',
  'white',
])

/**
 * One arrival's TREFF phase-2 idle colour-cycle — a pure, nap-driven walk that begins
 * when the grow-in (WarpInState.done) finishes. Carried on the sim like WarpInState.
 */
export interface IdleCycleState {
  /** Which palette (TREPL table) this arrival cycles — 'player' or 'enemy'. */
  owner: IdleOwner
  /** PLANTZ — the colour index; the shown colour is the sequence entry at `colourIndex & 7`. */
  colourIndex: number
  /** PACCX — naps remaining before the colour advances; reloads to `speed` on expiry. */
  step: number
  /** PFEET — the current cadence; halves each window (32→16→…→1→0). Colour advances every `speed` naps. */
  speed: number
  /** PTIMUP — naps remaining in the current speed window before the next halving. */
  windowNaps: number
  /** Terminal once 'moved' or 'timed-out'. */
  end: IdleEnd
}

/**
 * Begin the idle cycle for an arrival: PFEET 32, PACCX 16, PLANTZ 2, an empty (CLR)
 * window, not ended. Both a re-materialising PLAYER and a wave ENEMY start it the same
 * way; only the palette differs. Pure.
 */
export function startIdleCycle(owner: IdleOwner): IdleCycleState {
  return {
    owner,
    colourIndex: IDLE_COLOUR_INDEX_INIT,
    step: IDLE_STEP_INIT,
    speed: IDLE_SPEED_INIT,
    windowNaps: 0,
    end: 'active',
  }
}

/**
 * One wake of the idle cycle. `moved` is true when the arrival flaps or moves this frame
 * (CURJOY ≠ 0) — it aborts immediately (end 'moved'). Otherwise decrement the speed
 * window (halving PFEET on expiry; end 'timed-out' at 0) and the colour step (advancing
 * PLANTZ on expiry, reloading PACCX=PFEET). Idempotent once ended. Pure — never mutates
 * its argument.
 */
export function stepIdleCycle(state: IdleCycleState, moved: boolean): IdleCycleState {
  if (state.end !== 'active') return { ...state }
  if (moved) return { ...state, end: 'moved' }

  // PTIMUP window (DEC PTIMUP / BGT): on expiry halve PFEET (LSR PFEET / BEQ 50$).
  let speed = state.speed
  let windowNaps = state.windowNaps - 1
  if (windowNaps <= 0) {
    speed = speed >> 1
    if (speed === 0) return { ...state, speed: 0, windowNaps: 0, end: 'timed-out' }
    windowNaps = IDLE_SPEED_WINDOW_NAPS
  }

  // PACCX colour step (DEC PACCX / BGT): on expiry INC PLANTZ, reload PACCX = PFEET.
  let step = state.step - 1
  let colourIndex = state.colourIndex
  if (step <= 0) {
    colourIndex += 1
    step = speed
  }

  return { ...state, speed, windowNaps, step, colourIndex, end: 'active' }
}

/** The colour ROLE currently shown — the owner's TREPL sequence entry at `colourIndex & 7`. */
export function idleColour(state: IdleCycleState): IdleColour {
  const seq = state.owner === 'enemy' ? IDLE_SEQUENCE_ENEMY : IDLE_SEQUENCE_PLAYER
  return seq[state.colourIndex % IDLE_SEQUENCE_LENGTH]
}
