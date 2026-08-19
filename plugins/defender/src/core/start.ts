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
import { qualifiesForHighScore } from '@shared/highscore'
import { commitHighScore, stepInitials, type DefenderHighScore } from './highscore.js'

/** The df7-4 hall-of-fame initials entry, open only while a qualifying game-over score is
 *  being typed: the buffer built by the @shared name-entry stepper and the final score to
 *  commit once confirmed. `null` at every other moment. */
export interface NameEntry {
  readonly buffer: string
  readonly score: number
}

/** The wired cabinet state: the df7-1 phase plus the sim it drives, and (df7-4) the
 *  hall-of-fame board it carries and the initials entry in progress. `advancePhase` keeps
 *  the phase separate from `SimState` by design (phase.ts), so the wiring carries the
 *  pair — plus the board (loaded/persisted by the shell, preserved across the loop back to
 *  attract) and the name-entry sub-state (df7-4, Decision C). Every field is `readonly` —
 *  the reducers below return a fresh Session, never mutate one. */
export interface Session {
  readonly phase: Phase
  readonly sim: SimState
  readonly board: readonly DefenderHighScore[]
  readonly nameEntry: NameEntry | null
}

/** Boot the cabinet: it opens on the ATTRACT screen (not a bare running game), holding a
 *  fresh sim to render behind the demo. The self-playing attract driver is df7-3; here
 *  the sim is simply not stepped until play. The shell hands in the hall-of-fame `board` it
 *  loaded from one-origin localStorage (df5-6) — the pure core carries it so the render can
 *  show it and a qualifying game-over can commit to it. */
export function bootSession(rand: () => number, board: readonly DefenderHighScore[] = []): Session {
  return { phase: 'attract', sim: createSim(rand), board, nameEntry: null }
}

/** Advance the wired cabinet one frame. The phase moves through df7-1's `advancePhase`
 *  (CONSUMED, never re-decided here), and crossing the `setup -> play` edge RESEEDS a
 *  fresh game via `createSim(rand)` — the df5-8/df5-10/df5-3 seed (wave-1 attackers,
 *  ground humanoids, men=STARTING_MEN). Every other edge carries the current sim through
 *  untouched, so `rand` is drawn only on the reseed.
 *
 *  SCOPE — the `setup -> play` reseed is unconditional ON PURPOSE for df7-2, because the
 *  ONLY way to reach `setup` today is `attract -> setup` (a start-of-game): `main.ts`
 *  never supplies `playerDied`, so df7-1's death beat is unreachable and `death -> setup`
 *  (the RESPAWN edge phase.ts documents) never fires. When a later story wires
 *  `playerDied`, `setup` will also be entered on a respawn, where a full `createSim` would
 *  WRONGLY wipe score/wave/men — that story must give `Session`/`PhaseSignals` a
 *  start-vs-respawn discriminant and gate the reseed on it. (Recorded as a df7-2 Delivery
 *  Finding for the respawn story.) */
export function advanceStart(session: Session, signals: PhaseSignals, rand: () => number): Session {
  const advanced = advancePhase(session.phase, signals)

  // df7-4: an OPEN initials entry GATES the game-over -> attract timeout — the attract-return
  // must not steal the screen while the player is still entering initials (pac-man pm4's
  // entryOpen guard). Only game-over holds an entry, and it only exits to attract, so pinning
  // the phase back to game-over here is the whole gate.
  const phase = session.phase === 'game-over' && session.nameEntry !== null ? 'game-over' : advanced

  // The play -> game-over edge (df5-6 isGameOver men<0, CONSUMED): open the initials entry iff
  // the final score qualifies for the board. Computed HERE, at advanceStart's single exit for
  // this edge, so no branch can miss it (lang-review #14). Nothing is committed yet.
  if (session.phase === 'play' && phase === 'game-over') {
    const nameEntry: NameEntry | null = qualifiesForHighScore(session.board, session.sim.score)
      ? { buffer: '', score: session.sim.score }
      : null
    return { phase, sim: session.sim, board: session.board, nameEntry }
  }

  // The game-over -> attract loop-back (HALDIS, the mainline attract return): reseed a FRESH
  // attract game, keep the persisted board, close any entry. This edge is reachable only once
  // the entry gate above has cleared.
  if (session.phase === 'game-over' && phase === 'attract') {
    return { phase, sim: createSim(rand), board: session.board, nameEntry: null }
  }

  // Every other edge carries the sim/board/entry through untouched, except the df7-2
  // setup -> play RESEED (the fresh wave-1/humanoids/men seed). `rand` is drawn only on a reseed.
  const reseed = session.phase === 'setup' && phase === 'play'
  return { phase, sim: reseed ? createSim(rand) : session.sim, board: session.board, nameEntry: session.nameEntry }
}

/** Advance the open initials entry by one keypress, consuming df5-6's `stepInitials` (the
 *  @shared 3-char name-entry stepper). A no-op when no entry is open. */
export function stepSessionInitials(session: Session, key: string): Session {
  if (session.nameEntry === null) return session
  return { ...session, nameEntry: { ...session.nameEntry, buffer: stepInitials(session.nameEntry.buffer, key) } }
}

/** Confirm the entered initials: commit { initials, final score } to the board via df5-6's
 *  `commitHighScore` (the @shared insert, CONSUMED) and close the entry. A no-op when no entry
 *  is open. Closing the entry clears the gate so the game-over dwell can time out to attract. */
export function confirmSessionInitials(session: Session): Session {
  const entry = session.nameEntry
  if (entry === null) return session
  return {
    ...session,
    board: commitHighScore(session.board, { name: entry.buffer, score: entry.score }),
    nameEntry: null,
  }
}
