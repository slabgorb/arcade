// tests/helpers/crumble-contract.ts
//
// Story jt11-7 — the CONTRACT for src/core/crumble.ts, TEA-authored (O'Brien).
// The CLFDES cliff-crumble animation (JOUSTRV4.SRC:4562-4599) — the visible
// transition a destructible cliff plays BETWEEN intact and gone. jt11-5 made a
// destroyed cliff vanish from physics and render (drawList filters
// BACKGROUND_RECORDS by arena.destroyedCliffs in sim.ts drawList); this story
// inserts the crumble in that gap, so the cliff SHAKES then throws DEBRIS before
// it disappears, instead of blinking out on the advance frame.
//
// ─── NOT THE FALSE FRIEND (the story's central warning) ──────────────────────
// dissolve.ts is the ptero/baiter DEATH ash animation (its own module header,
// PTEKLL → three ASH frames). It is a SEPARATE ROM routine and a separate body
// of state. CLFDES is its own routine (:4562-4599) with its own counts and
// naps, and shares NOTHING with the dissolve but the CLIFER blitter (a decoder,
// not the animation). crumble.ts is therefore a NEW module: it must not import
// DissolveState nor re-export the DISSOLVE_* constants (crumble-source pins this).
//
// ─── THE ROM, READ OFF CLFDES (JOUSTRV4.SRC:4562-4599) ───────────────────────
// The routine is a two-phase nap-driven sequence, `INPUT PFRAME-2,U = CLIFF TO
// DESTROY` (:4560), ending `JMP VSUCIDE` (:4599):
//
//   • PHASE 1 — SHAKE.  `LDA #5 / STA PFRAME,U`  → FIVE shakes ("number of
//     shakes to do", :4563-4564).  Each shake (loop `1$`, :4565-4574):
//        BCKYUP, `PCNAP 10` (:4567), BCKYUP, `LDA #$2A / STA WCDMA,X`
//        ("by altering the cliffs flavor", :4570-4571), `PCNAP 10` (:4572).
//     Two PCNAP 10 per shake = 20 naps held per shake — the two BCKYUP jerks
//     are the wobble; this collapses the pair into ONE 20-nap hold per shake,
//     exactly as dissolve collapsed its own draw+redraw 2+6 into 8.
//
//   • ERASE.  `JSR LOCCLR / PCNAP 2` (:4575-4576): the cliff image is cleared
//     and replaced with debris. The 2-nap blip is folded into the shake→debris
//     transition (documented, not a separate exported constant), the same way
//     dissolve folded its interim naps.
//
//   • PHASE 2 — DEBRIS.  `LDA #5 / STA PFRAME+2,U`  → FIVE debris frames ("where
//     there are five images", :4578-4580 — the FIRSTI image area).  Each frame
//     (loop `2$`, :4581-4597): `BSR CLIFER` (draw), `PCNAP 8` ("while we sleep a
//     little", :4594).  One PCNAP 8 per frame = 8 naps held per debris frame.
//     `BSR LOCCLR` (:4598) a final erase, then `JMP VSUCIDE` (:4599) — the cliff
//     is now gone (the jt11-5 end-state).
//
// Total held: 5×20 + 5×8 = 140 naps (the LOCCLR/PCNAP 2 erase folded in).
//
// ─── CORE, LIKE dissolve.ts ──────────────────────────────────────────────────
// This is PURE STATE — a nap counter walking phases, no clock, no entropy, no
// browser surface, no shell import (the jt1-7 purity scanner sweeps
// src/core/crumble.ts the moment it lands). The RENDER of the shaking cliff and
// the debris is the shell/sim's job through drawList (the dissolve precedent:
// dissolve.ts is pure state, paintDissolve/drawList render it). The VISIBLE
// wiring — a destroyed cliff surfacing its crumble through drawList before it
// disappears — is pinned in tests/crumble-wiring-jt11-7.test.ts against the
// public drawList boundary, not here.

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
   * (the WCLFTB order, arena-state.ts CLIFF_DESTRUCTION). Carried so drawList
   * knows WHICH background record is animating. Only the four destructible
   * cliffs ever crumble — CLIF3 and CLIF5 have no WBCLS bit (arena-state.ts CLIFF_DESTRUCTION).
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
 * The overlay op drawList emits WHILE a destroyed cliff is crumbling — a NEW
 * DrawOp kind, additive to the jt11-5 render. It does NOT re-add the cliff's
 * `kind:'arena'` records: WCLFEW clears those the instant the cliff is destroyed
 * (JOUSTRV4.SRC:2301-2325, jt11-5's `arena.destroyedCliffs` filter), and CLFDES
 * (:4562-4599) draws its shake/debris OVER that now-empty space. So jt11-5's
 * arena-op assertions are untouched — a `kind:'crumble'` op is invisible to a
 * `kind === 'arena'` filter — and the transition is what becomes visible.
 * The shell reads `phase`/`frame` to pick the visual (shake: the $2A-tinted
 * jittered silhouette; debris: the thrown frame).
 */
export interface CrumbleDrawOp {
  kind: 'crumble'
  /** The destructible cliff this overlay animates (CLIF1L/CLIF1R/CLIF2/CLIF4). */
  cliff: string
  /** Which CLFDES half is showing — the shell selects shake vs debris art. */
  phase: CrumblePhase
  /** The frame index within the phase (0 .. COUNT-1). */
  frame: number
}

export interface CrumbleModule {
  /**
   * 5 — the number of shakes (`LDA #5 / STA PFRAME,U` "number of shakes to do",
   * JOUSTRV4.SRC:4563-4564).
   */
  CRUMBLE_SHAKE_COUNT: number
  /**
   * 20 — naps each shake is held: two `PCNAP 10` per shake iteration
   * (JOUSTRV4.SRC:4567 & :4572), collapsed into one hold.
   */
  CRUMBLE_SHAKE_NAPS: number
  /**
   * 5 — the number of debris frames (`LDA #5 / STA PFRAME+2,U` "where there are
   * five images", JOUSTRV4.SRC:4578-4580 — the FIRSTI image area).
   */
  CRUMBLE_DEBRIS_FRAME_COUNT: number
  /**
   * 8 — naps each debris frame is held: one `PCNAP 8` per frame
   * ("while we sleep a little", JOUSTRV4.SRC:4594).
   */
  CRUMBLE_DEBRIS_FRAME_NAPS: number
  /**
   * $2A — the DMA "flavor" byte a shaking cliff is tinted with (`LDA #$2A /
   * STA WCDMA,X` "by altering the cliffs flavor", JOUSTRV4.SRC:4570-4571).
   */
  CRUMBLE_FLAVOR: number

  /**
   * Begin a cliff's CLFDES crumble on shake frame 0 with a full shake-nap hold,
   * NOT done — a five-then-five sequence, never a one-shot. `cliff` is the
   * destructible cliff being destroyed. Pure.
   */
  startCrumble(cliff: string): CrumbleState

  /**
   * One wake of the crumble — nap-driven: while the frame's nap has not expired,
   * hold; when it expires, advance to the next frame within the phase, cross
   * shake→debris after the last shake, or set `done` (removal) after the last
   * debris frame. Idempotent once `done`. Pure — never mutates its argument.
   */
  stepCrumble(state: CrumbleState): CrumbleState
}

/**
 * Load the not-yet-built crumble module with a self-describing failure (the
 * loadDissolve / loadPtero pattern). The specifier is assembled at runtime so
 * the bundler cannot resolve it statically and redden the whole FILE at
 * collection — RED today throws a clean "feature absent" per test.
 */
export async function loadCrumble(): Promise<CrumbleModule> {
  const specifier = ['..', '..', 'src', 'core', 'crumble.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<CrumbleModule>
    for (const fn of ['startCrumble', 'stepCrumble'] as const) {
      if (typeof mod[fn] !== 'function') throw new Error(`module has no \`${fn}\` export`)
    }
    for (const c of [
      'CRUMBLE_SHAKE_COUNT',
      'CRUMBLE_SHAKE_NAPS',
      'CRUMBLE_DEBRIS_FRAME_COUNT',
      'CRUMBLE_DEBRIS_FRAME_NAPS',
      'CRUMBLE_FLAVOR',
    ] as const) {
      if (mod[c] === undefined) throw new Error(`module has no \`${c}\` export`)
    }
    return mod as CrumbleModule
  } catch (e) {
    throw new Error(
      'crumble module not built yet — GREEN (Julia) creates joust/src/core/crumble.ts ' +
        'satisfying tests/helpers/crumble-contract.ts: the pure-core nap-driven CLFDES ' +
        'crumble state (startCrumble/stepCrumble, CRUMBLE_SHAKE_COUNT=5, CRUMBLE_SHAKE_NAPS=20, ' +
        'CRUMBLE_DEBRIS_FRAME_COUNT=5, CRUMBLE_DEBRIS_FRAME_NAPS=8, CRUMBLE_FLAVOR=0x2A) that a ' +
        'destructible cliff plays between intact and gone (JOUSTRV4.SRC:4562-4599). It is NOT ' +
        'the dissolve (that is the ptero/baiter ASH death) — a separate module, importing no ' +
        'DissolveState. Also wire it through drawList (crumble-wiring) and commit ' +
        `docs/rom-study/claims/crumble.json (JT117-*). (${(e as Error).message})`,
    )
  }
}
