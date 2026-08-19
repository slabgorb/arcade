// src/core/phase.ts
//
// Story df7-1 (GREEN, Korben Dallas / Dev) — the pure cabinet phase machine, the
// ROOT of epic df7 (df7-2..7 all wire into it). It is the Defender analogue of
// pac-man's `phase.ts` (pm4-5) and missile-command's `state.ts` (mc6-1): a `Phase`
// union and a pure MAINLINE dispatch `advancePhase(phase, signals) -> Phase`, fed
// boolean signals a caller computes from frame-count timers and the sim.
//
// DECISION A (epic df7, RULED — pure-first / wired-after): this module is a PURE
// transition function — no clock, no rAF, no entropy, seeded. It CONSUMES df5-6's
// isGameOver(men<0, endgame.ts, DEFA7.SRC:1394/1423) as the play->death/game-over
// edge; it does NOT re-implement or re-decide game-over. The shell drives it; there
// is no per-phase tick here (purity.test.ts's armed src/core sweep covers this file).
//
// CONSTANT-FREE BY DESIGN (mirrors pm4-5): no cadence lives here. The setup->play
// start cadence (df7-2), the attract auto-player (df7-3) and the game-over->attract
// timeout (df7-4) each own their frame constants and wire this machine into the sim.
// So df7-1 introduces no numeric constant and changes no runtime behaviour.
//
// THE ROM MAINLINE, CITED (all lines from tool output; byte-verified as claims by
// df7-1-identity.test.ts under the df1-1 gate). The Defender mainline dispatches the
// STATUS-word start states and the block-1 attract/hall/game-over entries:
//   ST1    one-player start       DEFA7.SRC:1100  (ST1  LDA STATUS)
//   ST2    two-player start       DEFA7.SRC:1112  (ST2  LDA STATUS)
//   HALLOF hall-of-fame entry     AMODE1.SRC:119  (HALLOF JSR GNCIDE)
//   HALDIS attract / HOF display  AMODE1.SRC:377  (HALDIS CLR HSRFLG; reached HALL13
//                                 JMP HALDIS "ATTRACT MODE NOW", AMODE1.SRC:230)
//   GAMEOV game over              ROMF8.SRC:339   (GAMEOV ORCC #$90)

/** The six cabinet phases, in lifecycle order — a runtime enumeration of the `Phase`
 *  union. Test-facing oracle: read by the phase tests to check the union's members
 *  and by callers that iterate phases; no side effect. */
export const PHASES = ['attract', 'setup', 'play', 'pause', 'death', 'game-over'] as const

/** A cabinet phase: attract demo, per-game/per-ship setup, live play, the modal
 *  pause aside, the death beat, and the game-over screen. */
export type Phase = (typeof PHASES)[number]

/** The events that can move the machine on a given frame. All optional: an empty bag
 *  means "nothing happened, hold this phase". A caller computes these from the
 *  frame-count timers and the sim. `readonly` makes the "advancePhase mutates
 *  nothing" contract a COMPILE-TIME guarantee, not just the runtime one the
 *  frozen-input test checks — a pure-input DTO is never written. */
export interface PhaseSignals {
  /** attract: a start or coin was pressed (df7-2/3 feed the real input; ST1/ST2). */
  readonly startRequested?: boolean
  /** setup: the start-of-game / respawn setup has elapsed (df7-2 owns the cadence). */
  readonly setupComplete?: boolean
  /** play: a pause was requested (the modal [pause] aside). */
  readonly pauseRequested?: boolean
  /** pause: play was resumed. */
  readonly resumeRequested?: boolean
  /** play: the player's ship died this frame. */
  readonly playerDied?: boolean
  /** play: the RESULT of df5-6 isGameOver(men<0) — CONSUMED, not recomputed here. On
   *  a death it decides game-over (true) vs the survivable death beat (false). */
  readonly gameOver?: boolean
  /** death: the death-beat animation has elapsed (df7-x owns the window). */
  readonly deathComplete?: boolean
  /** game-over: the attract-return timeout has elapsed (df7-4 owns the constant). */
  readonly overTimeout?: boolean
}

/** The MAINLINE dispatch: given the current phase and this frame's signals, return
 *  the next phase. Pure — reads only its arguments, mutates nothing, touches no clock
 *  or RNG. The cabinet loop is attract -> setup -> play -> [pause] -> death -> setup
 *  (respawn) -> ... -> game-over -> attract.
 *
 *  In `play`, a death takes precedence over a pause request on the same frame (you
 *  cannot pause into a death); the death's men<0 result (df5-6 isGameOver, passed as
 *  `gameOver`) chooses game-over over the survivable death beat. */
export function advancePhase(phase: Phase, signals: PhaseSignals): Phase {
  switch (phase) {
    case 'attract':
      return signals.startRequested ? 'setup' : 'attract'
    case 'setup':
      return signals.setupComplete ? 'play' : 'setup'
    case 'play':
      if (signals.playerDied) return signals.gameOver ? 'game-over' : 'death'
      if (signals.pauseRequested) return 'pause'
      return 'play'
    case 'pause':
      return signals.resumeRequested ? 'play' : 'pause'
    case 'death':
      return signals.deathComplete ? 'setup' : 'death'
    case 'game-over':
      return signals.overTimeout ? 'attract' : 'game-over'
  }
}
