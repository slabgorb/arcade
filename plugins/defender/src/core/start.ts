// src/core/start.ts
//
// Story df7-2 (GREEN, Korben Dallas / Dev) — the mc6-2 analog: the start-of-game seam
// that turns df7-1's PURE phase machine into a played start. df7-1 (core/phase.ts) gave
// us `advancePhase(phase, signals)` but nothing wires it; this module composes that
// dispatch with a df3 `createSim` RESEED so a start/coin action leaves the attract screen
// and boots a fresh, playable game.
//
// PURE (Decision A, epic df7 — pure-first / wired-after): entropy is INJECTED (`rand`),
// there is no clock and no rAF, and the reseed is a deterministic `createSim(rand)`. The
// SHELL (main.ts) owns the clock, the keyboard and the `rand` closure; it computes the
// `PhaseSignals` (startRequested from the start/coin key, setupComplete from its own
// setup cadence) and only draws from `rand` on the reseed edge. This file is covered by
// purity.test.ts's armed src/core sweep.
//
// THE ROM, CITED: the reseed models Defender's ST1 *ONE PLAYER START (DEFA7.SRC:1100,
// `ST1 LDA STATUS`) after its credit gate (DEFA7.SRC:1103, `LDA CREDIT` / BEQ ST1X — no
// credit, no start) falls through to `BSR START`. STARTING_MEN=3 is NSHIP (ROMC8.SRC:802,
// df5-3); the ground humanoids (df5-10) and the wave-1 WVTAB attackers (df5-8) come with
// the fresh `createSim`. df7-1 owns the mainline citations (df7-1-identity.test.ts); the
// credit gate is pinned by df7-2-identity.test.ts.

import { advancePhase, type Phase, type PhaseSignals } from './phase.js'
import { createSim, type SimState } from './sim.js'

/** The wired cabinet state: the df7-1 phase plus the sim it drives. `advancePhase` keeps
 *  the phase separate from `SimState` by design (phase.ts), so the wiring carries the
 *  pair. Both fields are `readonly` — the reducers below return a fresh Session, never
 *  mutate one. */
export interface Session {
  readonly phase: Phase
  readonly sim: SimState
}

/** Boot the cabinet: it opens on the ATTRACT screen (not a bare running game), holding a
 *  fresh sim to render behind the demo. The self-playing attract driver is df7-3; here
 *  the sim is simply not stepped until play. */
export function bootSession(rand: () => number): Session {
  return { phase: 'attract', sim: createSim(rand) }
}

/** Advance the wired cabinet one frame. The phase moves through df7-1's `advancePhase`
 *  (CONSUMED, never re-decided here), and crossing the `setup -> play` edge RESEEDS a
 *  fresh game via `createSim(rand)` — the df5-8/df5-10/df5-3 seed (wave-1 attackers,
 *  ground humanoids, men=STARTING_MEN). Every other edge carries the current sim through
 *  untouched, so `rand` is drawn only on the reseed. */
export function advanceStart(session: Session, signals: PhaseSignals, rand: () => number): Session {
  const phase = advancePhase(session.phase, signals)
  const reseed = session.phase === 'setup' && phase === 'play'
  return { phase, sim: reseed ? createSim(rand) : session.sim }
}
