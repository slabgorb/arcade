// src/core/events.ts
//
// Story ml6-2 — the core→shell EVENT vocabulary. Pure data: the discrete
// audio-relevant moments the simulation emits each frame, each mapping (in
// shell/audio.ts, via EVENT_SOUND) to one of the twelve CHAN sound slots
// (shell/sound-rom.ts EFFECT_NAMES). Mirrors centipede's core/events.ts.
//
// TWO LAWS (centipede's, and they are load-bearing):
//   • The events array is REBUILT every frame, never appended across frames —
//     a stale event re-fires forever and a replay test can never see it.
//   • ATTRACT IS SILENT — the attract branch clears the stream before returning.
//
// Sustained sounds (the marching train's feet, CHAN1) are edge-signalled as a
// `${voice}-start` / `${voice}-stop` PAIR, both mapping to the same cue; the
// shell turns the loop on at the start edge and off at the stop edge. Discrete
// hits (shot, kills, explosions, bonus-life) are one-shots.

/** Every core event kind. A runtime tuple (not just a type) so tests and the
 *  exhaustive EVENT_SOUND map can sweep the real list. */
export const EVENT_KINDS = [
  // ── one-shots ──────────────────────────────────────────────────────────
  'shot-fired', //     the player fires            → CHAN6 shot
  'mushroom-hit', //   a shot chips a mushroom      → CHAN2 explosion
  'segment-killed', // a millipede segment explodes → CHAN2 explosion
  'enemy-killed', //   any flier/crawler shot dead  → CHAN2 explosion
  'ddt-exploded', //   a DDT bomb detonates         → CHAN2 explosion
  'player-died', //    the player ship explodes     → CHAN10 player-explosion
  'bonus-life', //     an extra life awarded        → CHAN11 bonus-life
  // ── sustained voices: start/stop pairs, both edges drive the same cue ────
  'march-start', //    the train begins marching    → CHAN1 centipede feet
  'march-stop',
] as const

export type GameEventKind = (typeof EVENT_KINDS)[number]

/** A payload-free tagged event. Payload (which enemy, how many points) rides on
 *  the sim state; the audio seam needs only the kind. */
export interface GameEvent {
  readonly type: GameEventKind
}

export const event = (type: GameEventKind): GameEvent => ({ type })

/** The loop voices — the roots of the `-start`/`-stop` pairs. */
export type LoopVoice = 'march'

export function isLoopStart(kind: GameEventKind): boolean {
  return kind.endsWith('-start')
}

export function isLoopStop(kind: GameEventKind): boolean {
  return kind.endsWith('-stop')
}

/** The voice a loop edge drives, or null for a one-shot. */
export function loopVoiceOf(kind: GameEventKind): LoopVoice | null {
  if (isLoopStart(kind)) return kind.slice(0, -'-start'.length) as LoopVoice
  if (isLoopStop(kind)) return kind.slice(0, -'-stop'.length) as LoopVoice
  return null
}
