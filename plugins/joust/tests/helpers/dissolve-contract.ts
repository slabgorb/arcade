// tests/helpers/dissolve-contract.ts
//
// Story jt3-6 — the CONTRACT for src/core/dissolve.ts, TEA-authored (Leeloo).
// The same seam the epic has used since jt1-2: TEA states the module shape and
// pins the behaviour; Dev (Julia) writes the module + its committed JT36-*
// claims. The behaviour lives in tests/dissolve.test.ts; the CLIFER consumer
// trace + the INDEPENDENT decode re-derivation + claim coverage in
// tests/dissolve-source.test.ts.
//
// ─── WHAT jt3-6 ADDS (user ruling B — decode the ptero death NOW) ─────────────
// The pterodactyl's death DISSOLVE, as a pure core state machine (no clock, no
// entropy, no browser surface — the jt1-7 purity scanner sweeps src/core/
// dissolve.ts the moment it lands). Two halves:
//
//   • THE ASH DECODE lives in pictures.ts (AC-1 "decodes INTO pictures.ts"):
//     expandAsh / expandAshFrames, transcribed from CLIFER — the routine PTEASH
//     JMPs into (JOUSTRV4.SRC:1419 → 4604-4631), the consumer that ESTABLISHES
//     the run-length format open-questions §5 flagged "value/run pairs?". See
//     tests/helpers/pictures-contract.ts.
//
//   • THE DISSOLVE STATE lives HERE: the nap-driven three-frame animation
//     (LDA #3, JOUSTRV4.SRC:1400; the ASH frames drawn twice per frame with
//     PCNAP 2 + PCNAP 6, :1405,:1409) that the death dispatch DEATH4
//     (JOUSTRV4.SRC:2939-2947) drives through PTEKLL (:1363-1409). BOTH the
//     wave-type ptero AND the baiter route through the SAME PTEKLL path — the
//     baiter branch (PCHASE≠0) only DECrements NBAIT (:1370-1372) — so one
//     dissolve serves both, distinguished by the `baiter` flag.
//
// ─── THE SCORE EVENT IS jt3-4'S, AND STAYS THERE (AC-3) ──────────────────────
// The 1000-point kill event is `ptero.pteroScoreEvent` (jt3-4, DVALUE $10 via
// SCRHUN — DERIVED). The dissolve is the body's FATE, not the score: this module
// exports NO score event and must not re-emit one. The kill event STILL fires on
// the kill (jt3-4 owns it); the dissolve merely replaces the interim poof.
//
// ─── THE jt3-7 BOUNDARY ──────────────────────────────────────────────────────
// jt3-6 builds the dissolve STATE + the death→dissolve transition. The spawned
// ptero/baiter is still INERT in the scheduler (frame.ts dispatches no 'ptero'
// behaviour yet); FULL live scheduler integration — stepping the dissolve from
// the process list and rendering its frames — is jt3-7. So these are pure state
// functions, exercised directly, not through stepFrame.

/**
 * The ptero/baiter death-dissolve state — a nap-driven walk through the ASH
 * animation frames, then removal.
 */
export interface DissolveState {
  /**
   * The current ASH frame index (0 .. DISSOLVE_FRAME_COUNT-1) — the PTERA image
   * the render (jt3-7) draws this frame. Indexes `expandAshFrames` 1:1.
   */
  frame: number
  /** Naps remaining on the current frame (the PCNAP 2+6 hold = DISSOLVE_FRAME_NAPS). */
  nap: number
  /**
   * True once the three-frame sequence has finished — the body is removed
   * (JSR CPLYR / LDD #$1200 STD WCDMA, JOUSTRV4.SRC:1414-1415). Terminal.
   */
  done: boolean
  /**
   * A BAITER dissolve (PCHASE ≠ 0): the PTEKLL path DECrements NBAIT for a baiter
   * (JOUSTRV4.SRC:1370-1372), the plain wave-type ptero does not. Carried so the
   * scheduler wiring (jt3-7) can settle the baiter count on entry.
   */
  baiter: boolean
}

export interface DissolveModule {
  /**
   * 3 — the dissolve is a THREE-frame animation (LDA #3 "3 FRAME ANIMATION",
   * JOUSTRV4.SRC:1400). Must equal `expandAshFrames(ASH1R.bytes).length`.
   */
  DISSOLVE_FRAME_COUNT: number
  /**
   * 8 — naps each ASH frame is held: the ROM draws the frame, PCNAP 2, redraws,
   * PCNAP 6 (JOUSTRV4.SRC:1404-1409) = 2 + 6 naps before advancing.
   */
  DISSOLVE_FRAME_NAPS: number

  /**
   * Death → dissolve. Both the wave-type ptero and the baiter enter the SAME
   * PTEKLL dissolve (JOUSTRV4.SRC:1363-1409) — NOT the interim poof. Starts on
   * ASH frame 0 with a full nap hold. `opts.baiter` tags the PCHASE≠0 path.
   * Does NOT emit a score event — the 1000-point kill is jt3-4's and fires
   * independently. Pure.
   */
  startDissolve(opts?: { baiter?: boolean }): DissolveState

  /**
   * One wake of the dissolve — nap-driven: while the frame's nap has not expired,
   * hold the frame; when it expires, advance to the next ASH frame, or set `done`
   * (removal) after the last. Idempotent once `done`. Pure — never mutates its
   * argument.
   */
  stepDissolve(state: DissolveState): DissolveState
}

/**
 * Load the not-yet-built dissolve module with a self-describing failure (the
 * loadPtero / loadTroll pattern). The specifier is assembled at runtime so the
 * bundler cannot resolve it statically and redden the whole FILE at collection.
 *
 * RED today: src/core/dissolve.ts does not exist, so this throws a clean
 * "feature absent" per test, never a module-resolution stack trace.
 */
export async function loadDissolve(): Promise<DissolveModule> {
  const specifier = ['..', '..', 'src', 'core', 'dissolve.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<DissolveModule>
    for (const fn of ['startDissolve', 'stepDissolve'] as const) {
      if (typeof mod[fn] !== 'function') throw new Error(`module has no \`${fn}\` export`)
    }
    for (const c of ['DISSOLVE_FRAME_COUNT', 'DISSOLVE_FRAME_NAPS'] as const) {
      if (mod[c] === undefined) throw new Error(`module has no \`${c}\` export`)
    }
    return mod as DissolveModule
  } catch (e) {
    throw new Error(
      'dissolve module not built yet — GREEN (Julia) creates joust/src/core/dissolve.ts ' +
        'satisfying tests/helpers/dissolve-contract.ts: the nap-driven three-frame dissolve ' +
        'state (startDissolve/stepDissolve, DISSOLVE_FRAME_COUNT=3, DISSOLVE_FRAME_NAPS=8) that ' +
        'BOTH the ptero and the baiter (PTEKLL) enter on death, consuming the ASH frames ' +
        'expandAshFrames decodes in pictures.ts. It emits NO score event (jt3-4 owns the 1000). ' +
        `Also commit docs/rom-study/claims/dissolve.json (JT36-*). (${(e as Error).message})`,
    )
  }
}
