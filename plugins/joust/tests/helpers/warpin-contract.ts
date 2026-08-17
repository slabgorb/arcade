// tests/helpers/warpin-contract.ts
//
// Story jt13-2 — the CONTRACT for src/core/warpin.ts, TEA-authored (Tyr).
// The TREFF transporter warp-in: the visible spawn animation a player or enemy
// plays while it materialises on its pad. The materialisation WINDOW already
// exists (jt2-6: SimProcess.mat, beginMaterialise/stepMaterialise, the 120-nap
// collision-safe window); its VISUAL was never built — a spawning knight pops in
// fully opaque on frame 1. This module is that missing animation, mirroring the
// dissolve/crumble core-state precedent.
//
// ─── NOT THE FALSE FRIENDS ───────────────────────────────────────────────────
// • dissolve.ts is the ptero/baiter DEATH ash animation (PTEKLL → three ASH
//   frames). warpin is the opposite end of a life — a BIRTH, not a death.
// • crumble.ts is the CLFDES cliff destruction. Different routine, different ROM.
// • The `Materialisation` type in transporter.ts (jt2-6) is the COLLISION window
//   (napLeft/collisionsEnabled/end), a 120-nap DEMO-tuned clock — NOT this. This
//   module is a SEPARATE body of state on the ROM's own 30-nap PFRAME clock, and
//   imports no `Materialisation`.
//
// ─── THE ROM, READ OFF TREFF (JOUSTRV4.SRC:5726-5803, verified) ──────────────
// `GOTTR` arms the effect: `LDA #30 / STA PFRAME,U` (:5726-5727) — the SAME 30
// that STAND_FRAMES already transcribes (in sim.ts, :503-512 — whose comment names
// this story: "drawn lit on the pad, TREFF, :5734-5745; the render of that lit pad
// is a separate story"). Then the loop:
//
//   • TREFF (:5733-5743): every nap redraws the transporter cliff CONSTANT-FILLED
//     in the owner's colour (`LDB DCONST,Y  COLORED TRANSPORTER WHEN ACTIVE`,
//     :5739 — P1 yellow, P2 green, enemies white). The bird itself is drawn ONLY
//     while `PFRAME <= 20` (`LDA PFRAME,U / CMPA #20 / BGT TREFF2`, :5741-5743):
//     for the first ~10 naps (PFRAME 30→21) only the lit pad shows.
//   • The Lantz "PATCHED-IN SPECIAL EFFECTS" block (:5744-5790): the standing
//     bird's VERTICAL DMA size WCLENY is derived from PFRAME (`COMA "VERT SIZE" /
//     ASRA / ANDA #$0F / EORA #$04 / STA WCLENY,X`, :5753-5757), and WCY is
//     shifted (:5763-5783) so the FEET stay planted on the pad — the silhouette
//     grows UPWARD out of the transporter, short → full height.
//   • TREFF2 (:5792-5803): `PCNAP 1  EFFECTS TIME` (:5792) — one nap per PFRAME —
//     then `DEC PFRAME,U / LBNE TREFF` (:5802-5803): thirty iterations, PFRAME
//     30→0. On exit, `PLYINT` enables collisions (`LDA #$80 / ORA PID,U`,
//     :5923-5925) — the window's end.
//
// ─── SCOPE (jt13-2) ──────────────────────────────────────────────────────────
// This story builds PHASE 1 — the 30-nap TREFF grow-in (the "warp-in" the report
// is about). The subsequent "wait-for-first-move" idle colour-cycle (:5805-5890,
// the accelerating white/grey flash until the player flaps or times out) is a
// FURTHER fidelity layer, filed as a follow-up — NOT in this module.
//
// ─── CORE, LIKE dissolve.ts / crumble.ts ─────────────────────────────────────
// Pure state: a nap counter walking 30 frames, no clock, no entropy, no browser
// surface, no shell import (the jt1-7 purity scanner sweeps src/core/warpin.ts
// the moment it lands). The RENDER of the growing silhouette and the lit pad is
// the shell/sim's job through drawList + paintWarpIn (pinned in
// render-warpin-jt13-2.test.ts); the WIRING — a materialising player OR enemy
// surfacing its warp-in through drawList — is pinned in warpin-wiring-jt13-2.test.ts
// against the public drawList boundary, not here.

/**
 * A single arrival's TREFF warp-in — a nap-driven walk through the thirty PFRAME
 * frames while it stands materialising on its pad, then removal of the effect
 * (PLYINT). Pure data, carriable on the sim like DissolveState / CrumbleState.
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

export interface WarpInModule {
  /**
   * 30 — the length of the TREFF window: `LDA #30 / STA PFRAME,U`
   * (JOUSTRV4.SRC:5726-5727), the SAME constant STAND_FRAMES transcribes. Thirty
   * PFRAME frames, one nap each, PFRAME 30→0.
   */
  WARPIN_FRAME_COUNT: number
  /**
   * 1 — naps each PFRAME frame is held: `TREFF2  PCNAP 1  EFFECTS TIME`
   * (JOUSTRV4.SRC:5792), one nap per `DEC PFRAME` iteration.
   */
  WARPIN_FRAME_NAPS: number
  /**
   * 20 — the PFRAME threshold below which the BIRD silhouette is drawn: `LDA
   * PFRAME,U / CMPA #20 / BGT TREFF2` (JOUSTRV4.SRC:5741-5743). While PFRAME > 20
   * (the first ten frames) only the lit pad shows; the bird appears for PFRAME
   * <= 20 (the last twenty). Expressed against `frame`: the bird is visible once
   * `frame >= WARPIN_FRAME_COUNT - WARPIN_BIRD_VISIBLE_PFRAME`.
   */
  WARPIN_BIRD_VISIBLE_PFRAME: number

  /**
   * Begin an arrival's TREFF warp-in on frame 0 (PFRAME 30) with a full nap hold,
   * NOT done. Both a re-materialising PLAYER and a wave ENEMY start the same
   * thirty-frame effect. Pure.
   */
  startWarpIn(): WarpInState

  /**
   * One wake of the warp-in — nap-driven: while the frame's nap has not expired,
   * hold; when it expires, advance to the next frame, or set `done` (the effect
   * ends, PLYINT) after the last. Idempotent once `done`. Pure — never mutates
   * its argument.
   */
  stepWarpIn(state: WarpInState): WarpInState
}

/**
 * Load the not-yet-built warpin module with a self-describing failure (the
 * loadDissolve / loadCrumble pattern). The specifier is assembled at runtime so
 * the bundler cannot resolve it statically and redden the whole FILE at
 * collection — RED today throws a clean "feature absent" per test.
 */
export async function loadWarpIn(): Promise<WarpInModule> {
  const specifier = ['..', '..', 'src', 'core', 'warpin.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<WarpInModule>
    for (const fn of ['startWarpIn', 'stepWarpIn'] as const) {
      if (typeof mod[fn] !== 'function') throw new Error(`module has no \`${fn}\` export`)
    }
    for (const c of [
      'WARPIN_FRAME_COUNT',
      'WARPIN_FRAME_NAPS',
      'WARPIN_BIRD_VISIBLE_PFRAME',
    ] as const) {
      if (mod[c] === undefined) throw new Error(`module has no \`${c}\` export`)
    }
    return mod as WarpInModule
  } catch (e) {
    throw new Error(
      'warpin module not built yet — GREEN (Julia) creates joust/src/core/warpin.ts ' +
        'satisfying tests/helpers/warpin-contract.ts: the pure-core nap-driven TREFF warp-in ' +
        'state (startWarpIn/stepWarpIn, WARPIN_FRAME_COUNT=30, WARPIN_FRAME_NAPS=1, ' +
        'WARPIN_BIRD_VISIBLE_PFRAME=20) that a player OR enemy plays while it materialises on ' +
        'its transporter pad (JOUSTRV4.SRC:5726-5803). It is NOT the dissolve (ptero/baiter ' +
        'death ASH) nor the crumble (CLFDES cliff) nor the jt2-6 Materialisation collision ' +
        'window — a separate module, importing none of them. Also carry it on SimProcess.warpIn ' +
        'for BOTH spawn paths, surface it through drawList (warpin-wiring), paint it with ' +
        'render.paintWarpIn (render-warpin), and commit docs/rom-study/claims/warpin.json ' +
        `(JT132-*). (${(e as Error).message})`,
    )
  }
}
