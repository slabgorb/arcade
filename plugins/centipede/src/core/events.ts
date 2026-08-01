// src/core/events.ts
//
// Story cp5-1 — the gameplay moments the simulation reports, as DATA.
//
// This module is the seam between the pure core and the shell's audio: the sim
// appends events to `SimState.events` while it steps, and the shell reads that
// array and plays cues. The core never receives a callback, never holds a
// reference to an audio engine and never learns whether anything is audible —
// which is what keeps `stepSim` a pure function of (state, input) and lets a
// fixed seed replay an identical event stream.
//
// ─── THE ARRAY IS REBUILT EVERY FRAME, NEVER APPENDED ACROSS FRAMES ──────────
// Each `stepSim` starts a fresh array. A stale event carried into the next
// frame would re-fire its cue forever and grow the array without bound, and —
// the reason it is worth a comment — a REPLAY TEST CANNOT SEE IT: both runs
// carry the same staleness, so the two streams still match. asteroids seeds
// `events: []` at every phase entry for the same reason
// (plugins/asteroids/src/core/sim.ts:179 "no gameplay-audio events in attract;
// never carry a stale frame's forward"). tests/audio-events.test.ts pins the
// rebuild separately from the replay for exactly this reason.
//
// ─── ATTRACT IS SILENT ───────────────────────────────────────────────────────
// `stepAttractDemo` (sim.ts) holds fire and runs a full playing frame, so the
// demo genuinely shoots, kills and dies. It clears the stream before returning:
// the lobby's attract screen must not play the whole game aloud.

/**
 * Every gameplay moment that carries a cue, as a runtime tuple.
 *
 * This is a VALUE, not just a type, on purpose. `SOUNDS`, `CHANNELS` and the
 * dispatch switch each have to cover every kind, and a coverage check written
 * against a hand-maintained list in a test agrees with itself forever while
 * this union drifts underneath it. Exporting the kinds lets
 * tests/audio-dispatch.test.ts sweep the real list, so adding a kind here
 * without a cue fails a test as well as the compiler.
 *
 * Order is the cabinet's rough mainloop order, then the sustained voices.
 */
export const EVENT_KINDS = [
  // ── one-shots ─────────────────────────────────────────────────────────────
  /** The gun launched a shot (RSHOT1 — `stepShot`'s rest→live transition). */
  'shot-fired',
  /** The shot took a bite out of a mushroom (OBSTAC's score). */
  'mushroom-destroyed',
  /** A centipede segment was killed (SHOOT's tail, CT-32/35/36). */
  'segment-killed',
  /** The spider was killed (SHOOT against motion-object slot 13). */
  'spider-killed',
  /** The flea was killed — its SECOND hit, the one that scores (:2169). */
  'flea-killed',
  /** The scorpion was killed (slot 12, 1000 points in one hit, SC-15). */
  'scorpion-killed',
  /** A plain head reached the bottom row and armed the factory (CT-23/89). */
  'head-reached-bottom',
  /** The gun was hit — PLAYEX (CT-52/53). */
  'player-died',
  /** DEAD==0: every segment killed, the between-wave pause is armed (CT-62). */
  'wave-cleared',
  /** SCORNG's tail awarded a life (:1989-1995 — the cue CHAN4 carries). */
  'bonus-life',

  // ── sustained voices: start/stop pairs, never repeated one-shots ───────────
  // Each pair drives one looping cue on its own channel. The shared engine
  // steals a channel on every new sound, so two loops sharing one voice would
  // silently cut each other off — tests/audio-dispatch.test.ts pins them apart.
  /** The centipede's marching tick, for as long as a wave is under way. */
  'march-start',
  'march-stop',
  /** The spider's presence, while it is on screen. */
  'spider-start',
  'spider-stop',
  /** The flea's descent, while it is falling. */
  'flea-start',
  'flea-stop',
  /** The scorpion's crossing, while it is on screen. */
  'scorpion-start',
  'scorpion-stop',
] as const

/** The discriminant: one of the kinds above, and nothing else. */
export type GameEventKind = (typeof EVENT_KINDS)[number]

/**
 * One gameplay moment.
 *
 * Deliberately payload-free. Every centipede cue is fully identified by its
 * kind — unlike asteroids, whose `explosion` carries a rock size because one
 * cue name serves four sounds. Adding a payload here would be inventing a
 * distinction the cabinet does not make.
 */
export interface GameEvent {
  readonly type: GameEventKind
}

/** Build one event. A helper only so the sim's push sites read as prose. */
export const event = (type: GameEventKind): GameEvent => ({ type })
