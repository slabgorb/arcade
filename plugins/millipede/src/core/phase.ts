// src/core/phase.ts
//
// ml7-1 — the pure Millipede cabinet phase machine (the pm4-5 model:
// plugins/pac-man/src/core/phase.ts; missile-command's mc6-1 state.ts is the
// analogue skeleton). It is the pure MAINLINE dispatch that the ROM's attract
// state machine keys off: the mainline READS the MODE/state and branches, and each
// transition WRITES it. `advancePhase` is that read-branch-and-write expressed as a
// pure function of the current phase and a set of boolean signals a caller derives
// from frame-count timers and the sim — so this module is clock-free, entropy-free
// and, by design, CONSTANT-FREE: no cadence lives here. It introduces no numeric
// game constant, so it carries no dossier claim (like missile-command's state.ts).
//
// The attract phase keys off MLATR's MODE handling:
//   • ATTRACT MODE ACTION       — MLATR.MAC:21   (the MODEFF dispatcher on MODE)
//   • MODE FE, INITIALIZATION    — MLATR.MAC:126  (INITFE)
//   • MODE FF (attract execute)  — MLATR.MAC:313  (BOXSFF)
// (ROM line numbers live in // comments, never JSDoc — the purity / citation
// scanners strip // but not /** */.)
//
// UNWIRED by design: nothing here touches stepGame, render, audio, or input. The
// side effects each edge triggers, and the frame constants that time them, belong
// to the stories that own them — the frame loop + input + render/audio wiring and
// the ml6 sound driver are ml7-2; the HUD is ml7-3; the accessibility gate (no
// full-screen strobe/flash on any transition — the owner has photosensitive
// epilepsy) is ml7-4, which slots freeze/fade into these edges. ml7-1 changes no
// runtime; it just defines the machine those stories wire in.

/** The five cabinet phases, in lifecycle order. The single runtime list of the
 *  `GamePhase` union — iterate this rather than re-typing the string literals. */
export type GamePhase = 'attract' | 'play' | 'death' | 'game-over' | 'entry'

export const PHASES: readonly GamePhase[] = ['attract', 'play', 'death', 'game-over', 'entry'] as const

/** The events that can move the machine on a given frame. All optional: an empty
 *  bag means "nothing happened, hold this phase". A caller computes these from the
 *  frame-count timers and the sim. `readonly` fields make the "advancePhase mutates
 *  nothing" contract a COMPILE-TIME guarantee, not just the runtime one the
 *  frozen-input test checks — a pure-input DTO is never written. */
export interface PhaseSignals {
  /** attract: a start or coin was pressed (ml7-2 feeds the real input). */
  readonly startRequested?: boolean
  /** play: the player lost a life this frame. */
  readonly playerDied?: boolean
  /** play: lives remaining AFTER the death is applied (decides death vs game-over).
   *  Absent is read as none left — never a stuck death loop. */
  readonly livesRemaining?: number
  /** death: the death-animation hold has elapsed; respawn to play (ml7-2 owns the window). */
  readonly deathExpired?: boolean
  /** game-over: the final score qualifies for the high-score ladder — the caller
   *  computes this from `qualifiesForHighScore` (core/highscore.ts). Routes to name entry. */
  readonly scoreQualifies?: boolean
  /** game-over: the attract-return timeout has elapsed (ml7-2 owns the constant). */
  readonly overExpired?: boolean
  /** entry: the initials were committed, name entry is done. */
  readonly entryComplete?: boolean
}

/** The MAINLINE dispatch: given the current phase and this frame's signals, return
 *  the next phase. Pure — reads only its arguments, mutates nothing, touches no
 *  clock or RNG (mirrors the ROM's read-branch-and-write on the attract MODE byte).
 *
 *  In `game-over`, a qualifying score takes precedence over the attract-return
 *  timeout on the same frame, so a player who earned a spot on the ladder is never
 *  skipped past name entry. */
export function advancePhase(phase: GamePhase, signals: PhaseSignals): GamePhase {
  switch (phase) {
    case 'attract':
      return signals.startRequested ? 'play' : 'attract'
    case 'play':
      if (signals.playerDied) return (signals.livesRemaining ?? 0) > 0 ? 'death' : 'game-over'
      return 'play'
    case 'death':
      return signals.deathExpired ? 'play' : 'death'
    case 'game-over':
      if (signals.scoreQualifies) return 'entry'
      return signals.overExpired ? 'attract' : 'game-over'
    case 'entry':
      return signals.entryComplete ? 'attract' : 'entry'
  }
}
