// tests/helpers/warpin-idle-contract.ts
//
// Story jt13-9 — the CONTRACT for the TREFF PHASE 2 idle colour-cycle, TEA-authored
// (Han Solo). This is the "WAIT FOR 1ST MOVE, OR TIME OUT" loop the ROM runs AFTER
// the 30-frame grow-in of phase 1 (src/core/warpin.ts, jt13-2) finishes and BEFORE
// PLYINT hands the bird to the brain. Descoped from jt13-2, which built only the
// grow-in and filed this as a follow-up (warpin.ts header, "the wait-for-first-move
// idle colour-cycle (:5805-5890) is a filed follow-up, not this module").
//
// ─── THE ROM, READ OFF THE WAIT LOOP (JOUSTRV4.SRC:5805-5871, verified) ───────
// After TREFF's grow-in, the full-size silhouette stands on its lit pad and colour-
// cycles through the owner/white/grey TREPL palette at an ACCELERATING cadence,
// until the player flaps/moves or the phase times out. Two interacting counters:
//
//   • PFEET — the "speed". `LDA #16*2 / STA PFEET,U` (:5810-5811) seeds it to 32;
//     `LSRA / STA PACCX,U` (:5812-5813) seeds PACCX to 16. Every time the PTIMUP
//     window expires, `LSR PFEET,U` (:5847) HALVES it, and `BEQ 50$` (:5848) ends
//     the phase (TIME OUT) once it reaches 0. So PFEET walks 32→16→8→4→2→1→0: five
//     live cadence values 16,8,4,2,1 (the 32 is halved to 16 on the very first
//     wake, because PTIMUP starts CLR at 0 and `DEC/BGT` fires immediately, :5816,
//     :5843-5844) then the sixth halving to 0 is the timeout.
//   • PACCX — the colour-step counter. `DEC PACCX,U` (:5862) each wake; on expiry
//     `INC PLANTZ,U` (:5864, advance the colour) and reload `PACCX = PFEET`
//     (:5865-5866). So the colour advances every PFEET wakes — the cadence
//     accelerates 16→8→4→2→1 as PFEET halves.
//   • PTIMUP — the speed-window timer. `LDA #75 / STA PTIMUP,U` (:5845-5846): each
//     cadence value is held for one 75-wake window before the next halving.
//   • PLANTZ — the colour index. `LDA #2 / STA PLANTZ,U` (:5814-5815) seeds it to 2;
//     it is read modulo the 8-entry TREPL table (`ANDB #$07`, :5874).
//   • FIRST MOVE — `LDD CURJOY` (:5831) then `BNE 51$` (:5841): any joystick input
//     leaves the loop early ("PLAYER/ENEMY WANTS TO FLAP"), killing the phase before
//     timeout. `PCNAP 1` (:5828) — one nap per wake.
//
// ─── THE PALETTE (TREPL1/2/3, JOUSTRV4.SRC:5581-5583) ────────────────────────
// Eight-entry colour tables, PLANTZ-indexed, selected per decision block (DTREFF):
//   TREPL1 (P1):  PL1 PL1 WHI PL1 PL1 GRY PL1 PL1   — owner=$5 yellow, flash white@2 grey@5
//   TREPL2 (P2):  PL2 PL2 WHI PL2 PL2 GRY PL2 PL2   — owner=$7 green,  flash white@2 grey@5
//   TREPL3 (emy): WHI WHI GRY WHI WHI GRY WHI WHI   — white base, grey@2 grey@5
// Modelled as colour ROLES: players share one 'owner'/'white'/'grey' shape (the
// owner nibble differs; TREPL1≡TREPL2 as roles); enemies are a distinct white/grey
// shape (GRY=$D is literally "LITE GREY FOR TRANSPORTER EFFECT", :58). The shell
// resolves 'owner' to the arrival's DCONST colour, exactly as paintWarpIn does.
//
// ─── CORE, LIKE warpin.ts ────────────────────────────────────────────────────
// Pure state on the ROM's own nap clock: no clock, no entropy, no browser surface,
// no shell import (the jt1-7 purity scanner sweeps src/core/). The RENDER of the
// colour-cycling silhouette is the shell's job; the WIRING — the sim opening the
// idle cycle when the grow-in's `done` fires and advancing it to its end — is pinned
// in warpin-idle-wiring-jt13-9.test.ts. This file is the pure state machine only.

/** Which TREPL table an arrival cycles through — a player (owner/white/grey) or an enemy (white/grey). */
export type IdleOwner = 'player' | 'enemy'

/** One colour ROLE in the TREPL cycle. The shell resolves 'owner' to the arrival's DCONST colour. */
export type IdleColour = 'owner' | 'white' | 'grey'

/** How the idle cycle stopped: still cycling, aborted by first move, or timed out (PFEET → 0). */
export type IdleEnd = 'active' | 'moved' | 'timed-out'

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

export interface WarpInIdleModule {
  /** 32 — PFEET seed: `LDA #16*2 / STA PFEET,U` (JOUSTRV4.SRC:5810-5811). Halved to 16 on the first wake. */
  IDLE_SPEED_INIT: number
  /** 16 — PACCX seed: `LSRA / STA PACCX,U` (JOUSTRV4.SRC:5812-5813), PFEET>>1. */
  IDLE_STEP_INIT: number
  /** 2 — PLANTZ seed: `LDA #2 / STA PLANTZ,U` (JOUSTRV4.SRC:5814-5815), the starting colour index. */
  IDLE_COLOUR_INDEX_INIT: number
  /** 75 — one speed window: `LDA #75 / STA PTIMUP,U` (JOUSTRV4.SRC:5845-5846). Each cadence value is held this long. */
  IDLE_SPEED_WINDOW_NAPS: number
  /**
   * [16, 8, 4, 2, 1] — the live cadence values PFEET takes across its five windows
   * (32 halves to 16 on wake 1, then 8, 4, 2, 1), each the colour-advance interval.
   * The sixth halving (1→0) is the timeout (`LSR PFEET / BEQ 50$`, :5847-5848).
   */
  IDLE_CADENCE: readonly number[]
  /** 8 — the TREPL table length (`ANDB #$07`, :5874). */
  IDLE_SEQUENCE_LENGTH: number
  /** The player role shape — TREPL1≡TREPL2 (:5581-5582): owner,owner,white,owner,owner,grey,owner,owner. */
  IDLE_SEQUENCE_PLAYER: readonly IdleColour[]
  /** The enemy role shape — TREPL3 (:5583): white,white,grey,white,white,grey,white,white. */
  IDLE_SEQUENCE_ENEMY: readonly IdleColour[]

  /** Begin the idle cycle for an arrival: PFEET 32, PACCX 16, PLANTZ 2, window 0, not ended. Pure. */
  startIdleCycle(owner: IdleOwner): IdleCycleState

  /**
   * One wake of the idle cycle. `moved` is true when the player/enemy flaps or moves
   * this frame (CURJOY ≠ 0) — it aborts immediately (end 'moved'). Otherwise decrement
   * the speed window (halving PFEET on expiry; end 'timed-out' at 0) and the colour
   * step (advancing PLANTZ on expiry). Idempotent once ended. Pure — never mutates its
   * argument.
   */
  stepIdleCycle(state: IdleCycleState, moved: boolean): IdleCycleState

  /** The colour ROLE currently shown — the owner's sequence entry at `state.colourIndex & 7`. */
  idleColour(state: IdleCycleState): IdleColour
}

/**
 * Load the not-yet-built idle-cycle module with a self-describing failure (the
 * loadWarpIn pattern). The specifier is assembled at runtime so the bundler cannot
 * resolve it statically and redden the whole FILE at collection — RED today throws a
 * clean "feature absent" per test.
 */
export async function loadWarpInIdle(): Promise<WarpInIdleModule> {
  const specifier = ['..', '..', 'src', 'core', 'warpin.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<WarpInIdleModule>
    for (const fn of ['startIdleCycle', 'stepIdleCycle', 'idleColour'] as const) {
      if (typeof mod[fn] !== 'function') throw new Error(`module has no \`${fn}\` export`)
    }
    for (const c of [
      'IDLE_SPEED_INIT',
      'IDLE_STEP_INIT',
      'IDLE_COLOUR_INDEX_INIT',
      'IDLE_SPEED_WINDOW_NAPS',
      'IDLE_CADENCE',
      'IDLE_SEQUENCE_LENGTH',
      'IDLE_SEQUENCE_PLAYER',
      'IDLE_SEQUENCE_ENEMY',
    ] as const) {
      if (mod[c] === undefined) throw new Error(`module has no \`${c}\` export`)
    }
    return mod as WarpInIdleModule
  } catch (e) {
    throw new Error(
      'TREFF phase-2 idle colour-cycle not built yet — GREEN (Yoda) extends ' +
        'joust/src/core/warpin.ts satisfying tests/helpers/warpin-idle-contract.ts: the pure-core ' +
        'nap-driven wait-for-first-move state (startIdleCycle/stepIdleCycle/idleColour, ' +
        'IDLE_SPEED_INIT=32, IDLE_STEP_INIT=16, IDLE_COLOUR_INDEX_INIT=2, IDLE_SPEED_WINDOW_NAPS=75, ' +
        'IDLE_CADENCE=[16,8,4,2,1], the TREPL owner/white/grey palettes) that a full-size arrival ' +
        'cycles after the grow-in finishes and before PLYINT (JOUSTRV4.SRC:5805-5890). Open it when ' +
        'WarpInState.done fires, advance it in stepSim, and commit docs/rom-study/claims/warpin.json ' +
        `(JT139-*). (${(e as Error).message})`,
    )
  }
}
